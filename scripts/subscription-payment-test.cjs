// Local PGlite regression for request -> checkout -> signed-webhook activation.
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');

(async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,phone text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create function auth.role() returns text language sql stable as $$select current_setting('test.jwt_role',true)$$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
      alter default privileges in schema public grant all on sequences to authenticated,anon,service_role;`);
    for (const name of ['schema','experience','wallet','partners','operations','seller_subscriptions','seller_pricing','seller_posting','seller_workspace','seller_finance_extensions','seller_hardening','seller_gateway','seller_subscriptions_v2']) {
      await db.exec(readFileSync(`supabase/${name}.sql`, 'utf8'));
    }
    await db.exec(readFileSync('supabase/seller_subscription_payments.sql', 'utf8'));
    await db.exec('grant usage on schema eazily_private to service_role');
    await db.exec('grant all on all tables in schema public to service_role');

    const seller = randomUUID(), outsider = randomUUID(), partner = randomUUID();
    for (const id of [seller, outsider]) await db.query('insert into auth.users(id,phone) values($1,$2)', [id, id]);
    await db.query(`insert into partner_applications(id,customer_id,role,status,submitted_at,reviewed_at,details)
      values($1,$2,'professional','approved',now(),now(),'{}')`, [partner, seller]);
    await db.exec(`update seller_subscription_config set rollout_enabled=true,payment_checkout_enabled=true;
      update seller_plans set enabled=true;
      update seller_subscriptions set approval_date_missing=false,approval_started_at=now(),founder_ends_at=now()+interval '30 days',trial_ends_at=now()+interval '5 days' where partner_id='${partner}'`);
    const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
    const asUser = async id => { await db.exec('reset role'); await db.query('select set_config($1,$2,false)', ['test.uid', id]); await db.query("select set_config('test.jwt_role','authenticated',false)"); await db.exec('set role authenticated'); };

    await asUser(outsider);
    await assert.rejects(db.query('select request_seller_subscription($1,$2,$3)', [partner, 'pre', randomUUID()]), /Approved workspace access required/);
    await asUser(seller);
    const key = randomUUID();
    const request = await scalar('select to_jsonb(r) from request_seller_subscription($1,$2,$3) r', [partner, 'pre', key]);
    assert.equal(request.status, 'requested');
    assert.equal(Number(request.price_paise), 29900);
    assert.equal((await scalar('select status from seller_subscriptions where partner_id=$1', [partner])), 'trial', 'Creating a payment request grants no membership');
    await assert.rejects(db.query('select request_seller_subscription($1,$2,$3)', [partner, 'pro', randomUUID()]), /already in progress/);

    await db.exec('reset role'); await db.query("select set_config('test.jwt_role','service_role',false)"); await db.exec('set role service_role');
    const prepared = await scalar('select prepare_seller_subscription_gateway($1,$2)', [request.id, seller]);
    assert.equal(prepared.amountPaise, 29900);
    assert.equal((await scalar('select status from seller_subscription_requests where id=$1', [request.id])), 'pending');
    const order = `eazs_${request.id.replaceAll('-', '')}`;
    const stored = await scalar('select store_seller_subscription_checkout($1,$2,$3,$4)', [request.id, order, 'session-secret', 'sandbox']);
    assert.equal(stored.paymentSessionId, 'session-secret');
    assert.equal((await scalar('select get_seller_subscription_checkout($1)', [request.id])).paymentSessionId, 'session-secret');
    await assert.rejects(db.query('select record_verified_seller_subscription_payment($1,$2,$3,$4,$5)', [request.id, order, 'cashfree:wrong', 29901, 'INR']), /amount or state mismatch/);
    assert.equal((await scalar('select status from seller_subscriptions where partner_id=$1', [partner])), 'trial', 'Wrong provider amount cannot activate access');
    await db.query('select record_verified_seller_subscription_payment($1,$2,$3,$4,$5)', [request.id, order, 'cashfree:payment-1', 29900, 'INR']);
    const beforeDuplicate = await scalar('select current_period_end from seller_subscriptions where partner_id=$1', [partner]);
    await db.query('select record_verified_seller_subscription_payment($1,$2,$3,$4,$5)', [request.id, order, 'cashfree:payment-1', 29900, 'INR']);
    const subscription = await scalar('select to_jsonb(s) from seller_subscriptions s where partner_id=$1', [partner]);
    assert.equal(subscription.status, 'active');
    assert.equal(subscription.plan_id, 'pre');
    assert.equal(new Date(subscription.current_period_end).toISOString(), new Date(beforeDuplicate).toISOString(), 'Duplicate webhook cannot extend membership twice');
    assert.equal((await scalar('select status from seller_subscription_requests where id=$1', [request.id])), 'paid');
    assert.ok(subscription.current_period_end);

    await db.exec('reset role'); await asUser(seller);
    const retry = await scalar('select to_jsonb(r) from request_seller_subscription($1,$2,$3) r', [partner, 'pro', randomUUID()]);
    await db.exec('reset role'); await db.query("select set_config('test.jwt_role','service_role',false)"); await db.exec('set role service_role');
    await scalar('select prepare_seller_subscription_gateway($1,$2)', [retry.id, seller]);
    const retryOrder = `eazs_${retry.id.replaceAll('-', '')}`;
    await scalar('select store_seller_subscription_checkout($1,$2,$3,$4)', [retry.id, retryOrder, 'session-retry', 'sandbox']);
    await db.query('select fail_seller_subscription_payment($1,$2)', [retry.id, retryOrder]);
    assert.equal((await scalar('select status from seller_subscription_requests where id=$1', [retry.id])), 'failed');
    assert.equal((await scalar('select status from seller_subscriptions where partner_id=$1', [partner])), 'active', 'Failed renewal does not revoke current paid access');
    await assert.rejects(db.query('select record_verified_seller_subscription_payment($1,$2,$3,$4,$5)', [retry.id, retryOrder, 'cashfree:failed-request', Number(retry.price_paise), 'USD']), /amount or state mismatch/);
    console.log('PASS: subscription checkout ownership, idempotent request, provider session storage, exact amount/currency validation, webhook-only activation, duplicate delivery, and failed renewal handling.');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
