import { useCallback, useEffect, useState } from 'react';
import { readRows, rpc } from '../../services/experience.js';
import { openSubscriptionCheckout } from '../../services/paymentCheckout.js';
import { SUBSCRIPTION_PLANS, benefitIsActive, leadQuotaNote } from '../../lib/subscriptions.js';
import { translate as t } from '../../lib/translate.js';
import { useRealtime } from '../../lib/realtime.jsx';

const money = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(paise || 0) / 100);
const moneyDate = value => value ? new Date(value).toLocaleDateString('en-IN') : 'Not available';

export default function SubscriptionPanel({ application, notify, onSupport }) {
  const { revision } = useRealtime();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const [configs, plans, subscriptions, requests] = await Promise.all([
        readRows('seller_subscription_config'),
        readRows('seller_plans'),
        readRows('seller_subscriptions', q => q.eq('partner_id', application.id)),
        readRows('seller_subscription_requests', q => q.eq('partner_id', application.id).order('created_at', { ascending: false })),
      ]);
      setData({ config: configs[0], plans, subscription: subscriptions[0], requests });
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [application.id]);

  useEffect(() => { refresh(); }, [refresh, revision]);

  async function checkout(requestId) {
    if (busyId) return;
    setBusyId(requestId);
    try {
      await openSubscriptionCheckout(requestId);
      await refresh();
    } catch (checkoutError) {
      notify(checkoutError.message || 'Checkout could not start. Your request is saved; retry it below.');
      await refresh();
    } finally {
      setBusyId('');
    }
  }

  async function request(plan) {
    if (busyId) return;
    const key = crypto.randomUUID();
    setBusyId(key);
    try {
      const result = await rpc('request_seller_subscription', { p_partner: application.id, p_plan: plan.id, p_key: key });
      setData(current => current && ({ ...current, requests: [result, ...current.requests.filter(row => row.id !== result.id)] }));
      await openSubscriptionCheckout(result.id);
      await refresh();
    } catch (requestError) {
      notify(requestError.message || 'Payment could not start. No membership was activated.');
      await refresh();
    } finally {
      setBusyId('');
    }
  }

  if (error && !data) return <section className="seller-panel"><p role="alert">{error}</p><button type="button" className="btn btn-outline" onClick={refresh}>Retry</button></section>;
  if (!data) return <p role="status">{t('Loading…')}</p>;

  const { config, subscription } = data;
  const approved = application.status === 'approved';
  const trialEnd = subscription?.trial_ends_at;
  const founderEnd = subscription?.founder_ends_at;
  const timelineKnown = approved && Boolean(subscription?.approval_started_at && trialEnd && founderEnd) && !subscription?.approval_date_missing;
  const inTrial = timelineKnown && Date.now() < Date.parse(trialEnd);
  const inFounder = timelineKnown && !inTrial && Date.now() < Date.parse(founderEnd);
  const active = subscription?.status === 'active' && subscription.current_period_end && Date.parse(subscription.current_period_end) > Date.now();
  const status = !approved ? 'Pending approval' : !timelineKnown ? 'Dates being updated' : active ? 'Active membership' : inTrial ? 'Free Trial' : inFounder ? 'Founder pricing window' : 'Expired';
  const serverPlans = data.plans.length > 0;
  const eligibilityKnown = timelineKnown && serverPlans;
  const plans = serverPlans ? data.plans : SUBSCRIPTION_PLANS.map(plan => ({ id: plan.id, name: plan.name, standard_paise: plan.monthlyPrice * 100, founder_paise: plan.founderPrice * 100, benefits: plan.benefits, monthly_leads: 0, enabled: false }));
  const currentPrice = inTrial || inFounder ? 'founder_paise' : 'standard_paise';
  const canRequest = eligibilityKnown && config?.rollout_enabled && config?.payment_checkout_enabled;
  const pendingRequest = data.requests.find(row => ['requested', 'pending'].includes(row.status));

  return <section className="seller-panel">
    <h2>{t('Subscription')}</h2>
    <section className="subscription-status-card">
      <b>{t(status)}</b>
      {!approved ? <p>Your free trial starts after approval. Exact dates appear once recorded.</p>
        : !timelineKnown ? <><p>Subscription dates are not confirmed yet.</p><button type="button" className="link" onClick={onSupport}>Contact support</button></>
          : <><p>Trial ends: {moneyDate(trialEnd)}</p><p>Founder pricing ends: {moneyDate(founderEnd)}</p>{subscription?.current_period_end && <p>Current paid period ends: {moneyDate(subscription.current_period_end)}</p>}</>}
    </section>
    {!canRequest && <p className="subscription-test-banner">Official subscription checkout is unavailable. No payment can be collected or membership activated here.</p>}
    <details className="subscription-details">
      <summary>Membership, renewal and tax details</summary>
      <p>Membership is separate from partner verification and does not change booking charges, GST, payouts, or Influencer security holds.</p>
      <p>Payments cover one month. There is no automatic renewal: membership expires at the end of the paid period unless you make another confirmed payment.</p>
      <p>Membership benefits, promoted placement, and paid priority only apply when explicitly marked active in the plan details.</p>
    </details>
    {!eligibilityKnown && <p className="policy-note">Pricing eligibility is unavailable; comparison prices are not a payable amount.</p>}
    {pendingRequest && <section className="subscription-status-card" role="status">
      <b>Payment not confirmed</b><p>Your membership remains unchanged until Cashfree confirms payment. You can safely resume the same checkout.</p>
      <button type="button" className="btn btn-primary" disabled={!canRequest || Boolean(busyId)} onClick={() => checkout(pendingRequest.id)}>
        {busyId === pendingRequest.id ? 'Opening secure checkout…' : 'Resume secure checkout'}
      </button>
    </section>}
    {error && <p role="alert">{error}</p>}
    <div className="subscription-plan-grid">
      {plans.map(plan => {
        const isPendingPlan = pendingRequest?.plan_id === plan.id;
        return <article className="partner-list-card subscription-plan-card" key={plan.id}>
          <h3>{plan.name}</h3>
          {eligibilityKnown ? <b>{money(plan[currentPrice])} / {t('month')}</b>
            : <div className="subscription-price-comparison"><span>Founder: {money(plan.founder_paise)}</span><span>Standard: {money(plan.standard_paise)}</span></div>}
          {inTrial && <span className="subscription-founder-label">After free trial, until {moneyDate(founderEnd)}</span>}
          {inFounder && <span className="subscription-founder-label">Founder launch price</span>}
          <p>{(plan.benefits || []).map(benefit => <span className="subscription-benefit" key={benefit}>{t(benefit)}{benefitIsActive(benefit) ? '' : ' · planned, not active'}</span>)}</p>
          <p className="policy-note">{leadQuotaNote(plan)}</p>
          <button type="button" className="btn btn-primary" disabled={!canRequest || !plan.enabled || Boolean(pendingRequest) || Boolean(busyId)} onClick={() => request(plan)}>
            {isPendingPlan ? 'Resume the pending payment above' : `Pay for one month · ${eligibilityKnown ? money(plan[currentPrice]) : ''}`}
          </button>
        </article>;
      })}
    </div>
    <p className="policy-note">Cancellation is not needed for this one-time monthly payment. There is no auto-renewal; do not pay again unless you want another month.</p>
    <h3>{t('Payment History')}</h3>
    {data.requests.map(row => <p key={row.id}>{row.plan_id.toUpperCase()} · {money(row.price_paise)} · {t(row.status)}{row.paid_at ? ` · Paid ${moneyDate(row.paid_at)}` : ''}</p>)}
    {!data.requests.length && <p>{t('No subscription payments yet')}</p>}
  </section>;
}
