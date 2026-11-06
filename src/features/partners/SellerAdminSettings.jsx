import { useEffect, useState } from 'react';
import { Field } from '../../components/Ui.jsx';
import { readRows, requireBackend, rpc } from '../../services/experience.js';
import { useRealtime } from '../../lib/realtime.jsx';

const percentageFields = [
  ['lower_markup_bps', 'Standard markup rate', 'Markup applied to eligible service charges. Confirm the rate with the pricing owner.'],
  ['upper_markup_bps', 'Higher-value markup rate', 'Markup applied above the platform pricing threshold.'],
  ['below_100_bps', 'Markup for services below ₹100', 'Required for Professional pricing under the current pricing calculation.'],
  ['seller_tax_bps', 'Tax rate on vendor amount', 'Enter 0 only if the approved tax policy says no tax applies.'],
  ['customer_tax_bps', 'Tax rate on customer charges', 'Enter 0 only if the approved tax policy says no tax applies.'],
  ['fee_tax_bps', 'Tax rate on platform fee', 'Enter 0 only if the approved tax policy says no tax applies.'],
  ['consultant_share_bps', 'Consultant payout share', 'Applies to consultant pricing; other roles may not use this value.'],
];
const requiredKeys = ['lower_markup_bps', 'upper_markup_bps', 'seller_tax_bps', 'customer_tax_bps', 'fee_tax_bps', 'separate_fee_paise', 'include_visiting', 'include_additional'];
const showPercent = value => value === null || value === undefined ? '' : Number(value) / 100;

export default function SellerAdminSettings({ notify }) {
  const { revision } = useRealtime();
  const [rules, setRules] = useState([]), [plans, setPlans] = useState([]), [config, setConfig] = useState(null), [audit, setAudit] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [nextRules, nextPlans, configs, nextAudit] = await Promise.all([
        readRows('seller_pricing_rules', q => q.order('version', { ascending: false })),
        readRows('seller_plans'), readRows('seller_subscription_config'), rpc('admin_seller_finance'),
      ]);
      setRules(nextRules); setPlans(nextPlans); setConfig(configs[0]); setAudit(nextAudit || []);
    } catch (loadError) { setError(loadError.message); }
  }

  useEffect(() => { load(); }, [revision]);

  async function save(table, row, newVersion = false) {
    if (busy) return;
    setBusy(true);
    try {
      const db = requireBackend();
      let result;
      if (newVersion) {
        const { id: _id, ...next } = row;
        const roleVersions = rules.filter(rule => rule.role === row.role).map(rule => Number(rule.version));
        result = await db.from(table).insert({ ...next, version: Math.max(0, ...roleVersions) + 1 });
      } else result = await db.from(table).update(row).eq('id', row.id);
      if (result.error) throw result.error;
      notify(newVersion ? 'New pricing rule version saved' : 'Configuration saved');
      await load();
    } catch (saveError) { notify(saveError.message); }
    finally { setBusy(false); }
  }

  async function applyConfirmedPricing() {
    if (busy) return;
    setBusy(true);
    try {
      await rpc('admin_enable_confirmed_seller_pricing');
      await load();
      notify('Confirmed pricing policy enabled for all partner roles.');
    } catch (applyError) { notify(applyError.message); }
    finally { setBusy(false); }
  }

  function updateRule(ruleId, key, value, scale = 1) {
    const stored = value === '' ? null : Math.round(Number(value) * scale);
    setRules(current => current.map(rule => rule.id === ruleId ? { ...rule, [key]: stored } : rule));
  }

  return <section className="admin-panel"><h2>Seller subscription and pricing configuration</h2>{error && <p role="alert">{error}</p>}
    {config && <form onSubmit={event => { event.preventDefault(); save('seller_subscription_config', config); }}><h3>Subscription launch</h3>
      <label><input type="checkbox" checked={config.enabled} onChange={event => setConfig({ ...config, enabled: event.target.checked })} /> Enable subscription configuration</label>
      <label><input type="checkbox" checked={Boolean(config.rollout_enabled)} onChange={event => setConfig({ ...config, rollout_enabled: event.target.checked })} /> Enable entitlement rollout after verification</label>
      <label><input type="checkbox" checked={Boolean(config.payment_checkout_enabled)} onChange={event => setConfig({ ...config, payment_checkout_enabled: event.target.checked })} /> Enable official subscription checkout only after provider/webhook verification</label>
      <Field label="Legacy launch date (not used for partner timelines)" type="datetime-local" value={config.launch_at ? config.launch_at.slice(0, 16) : ''} onChange={event => setConfig({ ...config, launch_at: event.target.value ? new Date(event.target.value).toISOString() : null })} />
      <Field label="Trial days" type="number" min="0" value={config.trial_days} onChange={event => setConfig({ ...config, trial_days: Number(event.target.value) })} />
      <label><input type="checkbox" checked={config.restrict_new_bookings} onChange={event => setConfig({ ...config, restrict_new_bookings: event.target.checked })} /> Restrict new bookings after trial/plan expiry; preserve accepted work</label>
      <button disabled={busy}>Save launch configuration</button>
    </form>}
    {plans.map((plan, index) => <form key={plan.id} onSubmit={event => { event.preventDefault(); save('seller_plans', plan); }}><h3>{plan.name}</h3>
      <Field label="Standard monthly price (₹)" type="number" min="0.01" step="0.01" value={Number(plan.standard_paise) / 100} onChange={event => setPlans(rows => rows.map((row, i) => i === index ? { ...row, standard_paise: Math.round(Number(event.target.value) * 100) } : row))} />
      <Field label="Founder monthly price (₹)" type="number" min="0.01" step="0.01" value={Number(plan.founder_paise) / 100} onChange={event => setPlans(rows => rows.map((row, i) => i === index ? { ...row, founder_paise: Math.round(Number(event.target.value) * 100) } : row))} />
      <label><input type="checkbox" checked={plan.enabled} onChange={event => setPlans(rows => rows.map((row, i) => i === index ? { ...row, enabled: event.target.checked } : row))} /> Plan enabled after benefits and fulfillment are ready</label>
      <button disabled={busy}>Save plan</button>
    </form>)}
    {rules.filter((rule, index) => rules.findIndex(item => item.role === rule.role) === index).map(rule => <form key={rule.id} onSubmit={event => {
      event.preventDefault();
      const missing = requiredKeys.filter(key => rule[key] === null || rule[key] === undefined || rule[key] === '');
      if (rule.role === 'professional' && (rule.below_100_bps === null || rule.below_100_bps === undefined)) missing.push('below_100_bps');
      if (missing.length) { notify(`Complete the pricing fields before saving: ${missing.join(', ')}.`); return; }
      save('seller_pricing_rules', rule, true);
    }}>
      <h3>{rule.role === 'professional' ? 'Professional customer pricing' : `${rule.role} customer pricing`} · current version {rule.version}</h3>
      <p>Set these values from the approved pricing policy. Percentage fields are shown as percentages; fee amounts are shown in rupees. Do not guess tax or fee values. Saving creates a new version; it does not rewrite past quotes.</p>
      <div className="form-grid">{percentageFields.filter(([key]) => key !== 'below_100_bps' || rule.role === 'professional').map(([key, label, hint]) => <Field key={key} label={label} hint={hint} type="number" min="0" max="100" step="0.01" required={key !== 'below_100_bps' || rule.role === 'professional'} value={showPercent(rule[key])} onChange={event => updateRule(rule.id, key, event.target.value, 100)} />)}</div>
      <Field label="Additional platform fee (₹)" hint="Enter 0 if the approved policy has no separate fee." type="number" min="0" step="0.01" required value={rule.separate_fee_paise == null ? '' : Number(rule.separate_fee_paise) / 100} onChange={event => updateRule(rule.id, 'separate_fee_paise', event.target.value, 100)} />
      <Field label="Include vendor visiting charge in markup calculation?" hint="This controls how markup is calculated, not whether the customer can be charged for a visit." as="select" options={['', 'true', 'false']} value={rule.include_visiting == null ? '' : String(rule.include_visiting)} required onChange={event => setRules(rows => rows.map(item => item.id === rule.id ? { ...item, include_visiting: event.target.value === '' ? null : event.target.value === 'true' } : item))} />
      <Field label="Include vendor additional charge in markup calculation?" hint="This controls how markup is calculated, not whether the customer can be charged for an extra." as="select" options={['', 'true', 'false']} value={rule.include_additional == null ? '' : String(rule.include_additional)} required onChange={event => setRules(rows => rows.map(item => item.id === rule.id ? { ...item, include_additional: event.target.value === '' ? null : event.target.value === 'true' } : item))} />
      <label><input type="checkbox" checked={Boolean(rule.enabled)} onChange={event => setRules(rows => rows.map(item => item.id === rule.id ? { ...item, enabled: event.target.checked } : item))} /> Activate this rule version for new quotes</label>
      <button disabled={busy}>Save as new pricing version</button>
    </form>)}
    <section aria-label="Apply standard pricing policy">
      <p>Only use the standard policy action if the policy owner has confirmed that its published rates and zero-fee/tax settings apply to every role.</p>
      <button type="button" disabled={busy || !['professional', 'influencer', 'consultant'].every(role => rules.some(rule => rule.role === role))} onClick={applyConfirmedPricing}>Apply confirmed standard pricing policy to all roles</button>
    </section>
    <p className="policy-note">Pricing is versioned. Existing customer quotes keep their saved calculation; new quotes use the latest enabled version. The standard-policy action above affects all partner roles.</p>
    <h3>Pricing and payment reconciliation</h3>{audit.map(quote => <details key={quote.id}><summary>{quote.orderId} · v{quote.version} · {quote.status}</summary><pre>{JSON.stringify(quote, null, 2)}</pre></details>)}{!audit.length && <p>No seller quotes yet.</p>}
  </section>;
}
