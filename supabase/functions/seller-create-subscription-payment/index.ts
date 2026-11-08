import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('EAZILY_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean);
function cors(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': allowedOrigins.length ? (allowedOrigins.includes(origin) ? origin : 'null') : '*',
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'vary': 'Origin',
  };
}
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) });

Deno.serve(async req => {
  if (Deno.env.get('EAZILY_FINANCIAL_PROVIDERS_ENABLED') !== 'true') return new Response('Financial providers are disabled', { status: 503 });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('authorization') || '';
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(req, { error: 'Sign in required' }, 401);

    let body: { requestId?: string };
    try { body = await req.json(); } catch { return json(req, { error: 'Invalid request body' }, 400); }
    if (typeof body.requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.requestId)) return json(req, { error: 'Invalid subscription request' }, 400);

    const clientId = Deno.env.get('CASHFREE_CLIENT_ID'), clientSecret = Deno.env.get('CASHFREE_CLIENT_SECRET');
    const base = Deno.env.get('CASHFREE_BASE_URL');
    if (!clientId || !clientSecret || !['https://sandbox.cashfree.com', 'https://api.cashfree.com'].includes(base || '')) {
      return json(req, { error: 'Official subscription payment provider is not configured' }, 503);
    }
    const phone = (user.phone || '').replace(/[\s()+-]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      return json(req, { error: 'Add and verify a phone number before starting checkout' }, 409);
    }

    const admin = createClient(url, service);
    const { data: request, error: prepareError } = await admin.rpc('prepare_seller_subscription_gateway', {
      p_request: body.requestId, p_customer: user.id,
    });
    if (prepareError || !request?.amountPaise) return json(req, { error: prepareError?.message || 'Subscription request could not be prepared' }, 409);

    const { data: existing, error: existingError } = await admin.rpc('get_seller_subscription_checkout', { p_request: body.requestId });
    if (existingError) return json(req, { error: 'Existing checkout requires reconciliation; retry shortly' }, 503);
    if (existing?.paymentSessionId) return json(req, { paymentSessionId: existing.paymentSessionId, mode: existing.mode });

    const orderId = `eazs_${body.requestId.replaceAll('-', '').toLowerCase()}`;
    const endpoint = `${base}/pg/orders`;
    const headers = { 'content-type': 'application/json', 'x-api-version': '2025-01-01', 'x-client-id': clientId, 'x-client-secret': clientSecret, 'x-idempotency-key': body.requestId };
    const createResponse = await fetch(endpoint, {
      method: 'POST', headers,
      body: JSON.stringify({
        order_id: orderId, order_amount: Number(request.amountPaise) / 100, order_currency: 'INR',
        customer_details: { customer_id: user.id, customer_phone: phone, ...(user.email ? { customer_email: user.email } : {}) },
        order_meta: { notify_url: `${url}/functions/v1/cashfree-webhook` },
        order_note: `Eazily ${request.planName} monthly membership`,
      }),
    });
    let provider: { payment_session_id?: string };
    try { provider = await createResponse.json(); } catch { return json(req, { error: 'Provider response requires reconciliation; retry this checkout' }, 502); }
    if (createResponse.status === 409) {
      const recovered = await fetch(`${endpoint}/${orderId}`, { headers });
      try { provider = await recovered.json(); } catch { return json(req, { error: 'Existing provider checkout could not be restored' }, 502); }
      if (!recovered.ok) return json(req, { error: 'Existing provider checkout could not be restored' }, 502);
    } else if (!createResponse.ok) {
      return json(req, { error: 'Provider checkout could not be created. Retry with the same request.' }, 502);
    }
    if (!provider.payment_session_id) return json(req, { error: 'Provider did not return a payment session' }, 502);

    const mode = base.includes('sandbox') ? 'sandbox' : 'production';
    const { data: checkout, error: storeError } = await admin.rpc('store_seller_subscription_checkout', {
      p_request: body.requestId, p_order: orderId, p_session: provider.payment_session_id, p_mode: mode,
    });
    if (storeError || !checkout?.paymentSessionId) return json(req, { error: 'Checkout needs reconciliation. Retry this request shortly.' }, 503);
    return json(req, { paymentSessionId: checkout.paymentSessionId, mode: checkout.mode });
  } catch {
    return json(req, { error: 'Subscription checkout is temporarily unavailable' }, 503);
  }
});
