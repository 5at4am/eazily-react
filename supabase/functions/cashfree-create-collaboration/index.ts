import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async req => {
  if (Deno.env.get('EAZILY_FINANCIAL_PROVIDERS_ENABLED') !== 'true') return new Response('Financial providers are disabled', { status: 503 });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('authorization') || '';
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, service);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Sign in required' }, 401);

  let body: { postId?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request body' }, 400); }
  if (typeof body.postId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.postId)) return json({ error: 'A valid collaboration is required' }, 400);

  const { data: config } = await admin.from('partner_config').select('*').single();
  if (!config?.cashfree_enabled) return json({ error: 'Cashfree checkout is not enabled' }, 503);
  const { data: post } = await admin.from('partner_posts').select('*,partner_applications!inner(*)').eq('id', body.postId).eq('role', 'influencer').eq('status', 'published').single();
  if (!post) return json({ error: 'Published collaboration not found' }, 404);

  // The unique partial index closes the concurrent-request race; this lookup
  // handles ordinary retries and recovers a provider order after a lost response.
  const { data: existingOrder } = await admin.from('partner_orders').select('*')
    .eq('customer_id', user.id).eq('role', 'influencer')
    .in('status', ['pending_payment', 'awaiting_acceptance', 'accepted', 'active'])
    .contains('details', { collaborationPostId: post.id }).maybeSingle();

  if (existingOrder && existingOrder.status !== 'pending_payment') {
    return json({ error: 'This collaboration already has an active order' }, 409);
  }

  let order = existingOrder;
  let snapshot = existingOrder?.details?.checkoutSnapshot;
  if (order) {
    const { data: existingCheckout, error } = await admin.from('cashfree_collaborations')
      .select('payment_session_id,customer_total,platform_fee,partner_payout,initial_release,security_hold')
      .eq('order_id', order.id).maybeSingle();
    if (error) return json({ error: 'Existing checkout requires reconciliation' }, 503);
    if (existingCheckout?.payment_session_id) {
      return json({ orderId: order.id, paymentSessionId: existingCheckout.payment_session_id, breakdown: {
        customerTotal: Number(existingCheckout.customer_total), platformFee: Number(existingCheckout.platform_fee),
        partnerPayout: Number(existingCheckout.partner_payout), initialRelease: Number(existingCheckout.initial_release),
        securityHold: Number(existingCheckout.security_hold), reviewWindowHours: config.influencer_review_window_hours,
      } });
    }
    if (!snapshot) return json({ error: 'Existing checkout snapshot is missing; reconciliation required' }, 503);
  } else {
    const { data: price, error: priceError } = await admin.rpc('get_published_post_price', { p_post: post.id });
    if (priceError || !price?.totalPaise || !price?.sellerBasePaise) return json({ error: priceError?.message || 'A valid published price is unavailable' }, 409);
    const customerTotal = Number(price.totalPaise) / 100;
    const fee = Number(price.markupPaise || 0) / 100;
    const payout = Number(price.sellerBasePaise) / 100;
    const initial = Math.round(payout * Number(config.influencer_initial_release_percent)) / 100;
    const hold = payout - initial;
    snapshot = {
      customerTotal, fee, payout, initial, hold,
      vendorId: post.partner_applications.details.cashfreeVendorId,
      price: { ruleId: price.ruleId, version: price.version, basePaise: price.sellerBasePaise, markupPaise: price.markupPaise, customerTotalPaise: price.totalPaise },
    };
    const { data: inserted, error: orderError } = await admin.from('partner_orders').insert({
      partner_id: post.partner_id, customer_id: user.id, role: 'influencer', title: post.details.title,
      status: 'pending_payment',
      details: { ...post.details, collaborationPostId: post.id, priceSnapshot: snapshot.price, checkoutSnapshot: snapshot },
      deadline: post.details.deadline || null,
    }).select().single();
    if (orderError) {
      if (orderError.code === '23505') return json({ error: 'Checkout is already being created; retry shortly' }, 409);
      return json({ error: 'Could not create collaboration checkout' }, 400);
    }
    order = inserted;
  }

  const cashfreeOrderId = `eazily_${order.id.replaceAll('-', '')}`;
  const cf = await fetch(`${Deno.env.get('CASHFREE_BASE_URL') || 'https://sandbox.cashfree.com'}/pg/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-version': '2025-01-01',
      'x-client-id': Deno.env.get('CASHFREE_CLIENT_ID')!, 'x-client-secret': Deno.env.get('CASHFREE_CLIENT_SECRET')!,
      'x-idempotency-key': order.id,
    },
    body: JSON.stringify({
      order_id: cashfreeOrderId, order_amount: snapshot.customerTotal, order_currency: 'INR',
      customer_details: { customer_id: user.id, customer_phone: user.phone, customer_email: user.email || post.details.email || 'payments@eazily.invalid' },
      order_meta: { notify_url: `${url}/functions/v1/cashfree-webhook` },
      order_note: `Prepaid collaboration: ${order.title}`,
    }),
  });
  let payload;
  try { payload = await cf.json(); } catch { return json({ error: 'Provider response requires reconciliation; retry this checkout' }, 502); }
  if (!cf.ok || typeof payload.payment_session_id !== 'string' || !payload.payment_session_id) {
    // Do not delete the reservation: the provider may have accepted the request
    // before the connection failed. A retry uses the same order ID/idempotency key.
    return json({ error: 'Provider checkout is not confirmed; retry this checkout' }, 502);
  }

  const { error: collaborationError } = await admin.from('cashfree_collaborations').upsert({
    order_id: order.id, cashfree_order_id: cashfreeOrderId, payment_session_id: payload.payment_session_id,
    payment_status: 'pending', customer_total: snapshot.customerTotal, partner_payout: snapshot.payout,
    platform_fee: snapshot.fee, initial_release: snapshot.initial, security_hold: snapshot.hold,
    cashfree_vendor_id: snapshot.vendorId,
  }, { onConflict: 'order_id', ignoreDuplicates: true });
  if (collaborationError) return json({ error: 'Checkout requires reconciliation; retry this checkout' }, 503);

  const { data: saved } = await admin.from('cashfree_collaborations').select('payment_session_id')
    .eq('order_id', order.id).maybeSingle();
  if (!saved?.payment_session_id) return json({ error: 'Checkout requires reconciliation; retry this checkout' }, 503);
  return json({ orderId: order.id, paymentSessionId: saved.payment_session_id, breakdown: {
    customerTotal: snapshot.customerTotal, platformFee: snapshot.fee, partnerPayout: snapshot.payout,
    initialRelease: snapshot.initial, securityHold: snapshot.hold, reviewWindowHours: config.influencer_review_window_hours,
  } });
});
