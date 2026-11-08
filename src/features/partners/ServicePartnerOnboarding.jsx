import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Sheet } from '../../components/Ui.jsx';
import Icon from '../../components/Icon.jsx';
import { canonicalCatalogService, catalog } from '../../data/catalog.js';
import { partnerRoles } from '../../data/partners.js';
import { isSupabaseConfigured } from '../../lib/supabase.js';
import { getServicePartnerLegalDocuments, saveApplication, submitServicePartnerApplication } from '../../services/partners.js';
import MediaUpload from './MediaUpload.jsx';
import { LegalDocument } from './legal/InfluencerLegal.jsx';
import { SERVICE_REGISTRATION_TEST_SKIP_ENABLED } from './serviceRegistrationConfig.js';
import './service-partner-onboarding.css';
import { IN_APP_BACK_EVENT } from '../../lib/nativeShell.js';
import { draftServiceBio, suggestedSkills, uniqueSkills } from './serviceSkillSuggestions.js';
import { lookupIfsc, lookupPincode, useLookup } from './registrationLookups.js';
import { LookupHint, PresetChips } from './RegistrationAssist.jsx';
import { confirmedEmail } from '../../auth/policy.js';

const VERSION = 'service-registration-2026-09-14';
const groups = catalog.find(item => item.id === 'manpower').groups;
const titles = ['Aapki Jaankari / Your Details', 'Aapki Dukaan / Shop Details', 'Aap Kya Kaam Karte Hain? / Your Services', 'Kaam Ki Preferences / Work Preferences', 'Payment Details / Bank Details', 'Documents & Final Submit / Documents Aur Jama Karein'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const referrals = ['', 'Referral', 'Instagram', 'WhatsApp', 'YouTube', 'Facebook', 'Google', 'Eazily Team', 'Friend', 'Other'];
const today = new Date().toISOString().slice(0, 10);
const isTestPolicy = row => Boolean(row) && (/^test-only-/i.test(String(row.version || '')) || /^TEST ONLY/i.test(String(row.title || '')));

function normalize(existing, account) {
  const saved = existing?.details || {};
  let selections = Array.isArray(saved.serviceSelections) ? saved.serviceSelections : [];
  if (!selections.length && saved.services?.length) {
    selections = saved.services.flatMap(service => {
      const serviceName = canonicalCatalogService(service);
      const group = groups.find(item => item.label === saved.category && item.items.includes(serviceName)) || groups.find(item => item.items.includes(serviceName));
      return group ? [{ categoryId: group.id, categoryLabel: group.label, serviceId: serviceName, serviceName }] : [];
    });
  }
  selections = selections.flatMap(selection => {
    const serviceName = canonicalCatalogService(selection.serviceName || selection.serviceId);
    const group = groups.find(item => item.items.includes(serviceName));
    return group ? [{ categoryId: group.id, categoryLabel: group.label, serviceId: serviceName, serviceName }] : [];
  });
  return {
    language: 'English',
    stage: saved.serviceRegistrationVersion === VERSION ? Math.min(Number(saved.stage || 0), 5) : 0,
    name: saved.name || account?.profile?.full_name || '',
    verifiedEmail: confirmedEmail(account?.user),
    dateOfBirth: saved.dateOfBirth || '', email: confirmedEmail(account?.user),
    locationPermission: saved.locationPermission || '', latitude: saved.latitude, longitude: saved.longitude,
    businessName: saved.businessName || '', shopOwnership: ['Owned', 'Rented'].includes(saved.shopOwnership) ? saved.shopOwnership : '',
    address: saved.address || '', locality: saved.locality || '', city: saved.city || account?.profile?.city || '', state: saved.state || '', pinCode: saved.pinCode || '', landmark: saved.landmark || '', referralSource: saved.referralSource || '', referralOther: saved.referralOther || '',
    serviceSelections: selections, experienceYears: saved.experienceYears ?? '', experienceMonths: saved.experienceMonths ?? '', workerCount: saved.workerCount ?? (saved.workStyle === 'Alone' ? 0 : ''),
    skills: uniqueSkills(Array.isArray(saved.skills) ? saved.skills : []), bio: typeof saved.bio === 'string' ? saved.bio : '',
    servicePlace: saved.servicePlace || '', serviceAreas: saved.serviceAreas || '', workingDays: saved.workingDays || [], sameTiming: saved.sameTiming !== false, openingTime: saved.openingTime || '', closingTime: saved.closingTime || '', dailyTimings: saved.dailyTimings || {},
    accountHolder: saved.accountHolder || '', accountNumber: saved.accountNumber || '', accountConfirmation: saved.accountConfirmation || '', ifsc: saved.ifsc || '', bankName: saved.bankName || '',
    aadhaar: saved.aadhaar || [], pan: saved.pan || [], gumasta: saved.gumasta || [], gumastaHelp: Boolean(saved.gumastaHelp), ownerShopMedia: saved.ownerShopMedia || [], udyam: saved.udyam || [],
    termsAccepted: false, serviceRegistrationVersion: VERSION,
  };
}

function payload(values, legal, submit = false) {
  const first = values.serviceSelections[0];
  const years = Number(values.experienceYears || 0), months = Number(values.experienceMonths || 0), workers = Number(values.workerCount || 0);
  const travels = ['At the customer’s location', 'Both'].includes(values.servicePlace);
  return {
    ...values,
    category: first?.categoryLabel || '',
    serviceCategories: [...new Set(values.serviceSelections.map(item => item.categoryId))],
    services: [...new Set(values.serviceSelections.map(item => item.serviceName))],
    experience: `${years} year${years === 1 ? '' : 's'} ${months} month${months === 1 ? '' : 's'}`,
    workStyle: workers === 0 ? 'Alone' : 'Team', workerCount: workers,
    serviceAreas: travels ? values.serviceAreas : '',
    dailyTimings: values.sameTiming ? {} : values.dailyTimings,
    verifiedEmail: values.verifiedEmail,
    serviceRegistrationVersion: VERSION,
    consent: submit ? {
      termsAccepted: true,
      informationAccurate: true,
      terms: { documentId: legal.terms.document_key, version: legal.terms.version },
      privacy: { documentId: legal.privacy.document_key, version: legal.privacy.version },
    } : undefined,
  };
}

export default function ServicePartnerOnboarding({ existing, account, notify, onDone, onBack }) {
  const [values, setValues] = useState(() => normalize(existing, account));
  const [application, setApplication] = useState(existing || null);
  const [stage, setStage] = useState(() => normalize(existing, account).stage);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [legalRows, setLegalRows] = useState([]);
  const [legalLoading, setLegalLoading] = useState(Boolean(isSupabaseConfigured));
  const [legalError, setLegalError] = useState('');
  const [legalReload, setLegalReload] = useState(0);
  const [openDocument, setOpenDocument] = useState(null);
  const lock = useRef(false);
  // The verified address comes from managed Auth confirmation.
  const accountEmail = confirmedEmail(account?.user);
  useEffect(() => {
    // Clear stale verification when the Auth email changes.
    setValues(current => current.verifiedEmail === accountEmail ? current : { ...current, verifiedEmail: accountEmail, email: accountEmail });
    if (!accountEmail) return;
    setErrors(current => current.verifiedEmail ? { ...current, verifiedEmail: '' } : current);
  }, [accountEmail]);
  const legal = useMemo(() => ({
    terms: legalRows.find(row => row.document_key === 'eazily-service-partner-terms'),
    privacy: legalRows.find(row => row.document_key === 'eazily-service-partner-privacy-policy'),
  }), [legalRows]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLegalLoading(false);
      return undefined;
    }
    let active = true;
    setLegalLoading(true);
    setLegalError('');
    getServicePartnerLegalDocuments()
      .then(rows => {
        if (!active) return;
        setLegalRows(rows);
        if (rows.some(row => row.document_key === 'eazily-service-partner-terms') && rows.some(row => row.document_key === 'eazily-service-partner-privacy-policy')) {
          setErrors(current => current.legal ? { ...current, legal: '' } : current);
        }
        setLegalError('');
      })
      .catch(error => {
        if (!active) return;
        setLegalRows([]);
        setLegalError(error.message || 'Published policies could not be loaded.');
      })
      .finally(() => { if (active) setLegalLoading(false); });
    return () => { active = false; };
  }, [notify, legalReload]);
  const reloadLegal = () => setLegalReload(value => value + 1);
  useEffect(() => {
    const back = event => {
      event.detail.handled = true;
      if (stage > 0) setStage(current => current - 1);
      else onBack();
    };
    window.addEventListener(IN_APP_BACK_EVENT, back);
    return () => window.removeEventListener(IN_APP_BACK_EVENT, back);
  }, [stage, onBack]);

  function update(name, value) { setValues(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); }
  async function persist(nextStage = stage, exit = false) {
    setBusy(true);
    try {
      const details = payload({ ...values, stage: nextStage }, legal, false);
      const result = isSupabaseConfigured ? await saveApplication('professional', details, false) : { id: application?.id || 'testing-professional', role: 'professional', status: 'draft', details, testing: true };
      setApplication(result); setValues(current => ({ ...current, stage: nextStage }));
      notify(isSupabaseConfigured ? 'Draft saved' : 'Testing draft saved for this session only. It is not a completed registration.');
      if (exit) onDone(result, { completed: false, submitted: false, draft: true, exit: true });
      return result;
    } catch (error) { notify(error.message); return null; }
    finally { setBusy(false); }
  }
  async function continueStep() {
    const nextErrors = validate(stage, values, legal);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { document.querySelector('.service-registration [aria-invalid=true]')?.focus(); return notify(Object.values(nextErrors)[0]); }
    const next = Math.min(5, stage + 1);
    if (await persist(next)) { setStage(next); window.scrollTo(0, 0); }
  }
  async function skipForTesting() {
    if (!SERVICE_REGISTRATION_TEST_SKIP_ENABLED || isSupabaseConfigured || busy) return;
    if (stage >= 5) return;
    const next = stage + 1;
    if (await persist(next)) { setErrors({}); setStage(next); window.scrollTo(0, 0); }
  }
  async function submit(event) {
    event.preventDefault();
    const stages = isSupabaseConfigured ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];
    const invalidStage = stages.find(step => Object.keys(validate(step, values, legal)).length);
    const nextErrors = invalidStage === undefined ? {} : validate(invalidStage, values, legal);
    setErrors(nextErrors);
    if (invalidStage !== undefined) { setStage(invalidStage); setTimeout(() => document.querySelector('.service-registration [aria-invalid=true]')?.focus(), 0); return notify(Object.values(nextErrors)[0]); }
    if (!isSupabaseConfigured) return notify('Live registration is unavailable because email verification and backend submission are not configured. Your form data remains on this page. Use Save & Exit to keep a testing draft.');
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const result = await submitServicePartnerApplication(payload({ ...values, stage: 5 }, legal, true));
      setApplication(result);
      const opened = await onDone(result, { completed: true, submitted: true, draft: false });
      if (opened !== false) notify('Registration submit ho gaya! Aapki details verification ke liye bhej di gayi hain.');
    } catch (error) { notify(error.message); }
    finally { lock.current = false; setBusy(false); }
  }

  return <main className="partner-onboarding role-professional service-registration" style={{ '--role': partnerRoles.professional.colour, '--role-bg': partnerRoles.professional.background }}>
    <header className="partner-simple-header service-registration-header"><button type="button" className="icon-btn" onClick={stage ? () => setStage(stage - 1) : onBack} aria-label="Go back"><Icon name="arrowLeft" /></button><div className="service-header-copy"><div className="service-header-meta"><span className="service-brand-name">eazily</span><span className="service-role-label">Service Partner</span><span className="service-step-count">Step {stage + 1} of 6</span><span className={`application-state ${application?.status || 'draft'}`}>{application?.status === 'draft' ? 'Draft saved' : application ? application.status.replaceAll('_', ' ') : 'Draft'}</span></div><h1>{titles[stage]}</h1></div><span className="language-indicator" aria-label="Interface language: English">EN</span></header>
    <div className="registration-progress" role="progressbar" aria-valuemin={1} aria-valuemax={6} aria-valuenow={stage + 1} aria-label={`Step ${stage + 1} of 6`}>{titles.map((title, index) => <i key={title} className={index < stage ? 'done' : index === stage ? 'current' : ''} />)}</div>
    <section className="partner-form-card">{application?.review_notes && <div className="safety-card"><b>Changes requested</b><p>{application.review_notes}</p></div>}
      {!isSupabaseConfigured && <p className="testing-notice" role="status">Local testing only. Drafts stay in this browser session and are lost on refresh. Complete registration cannot submit without live email verification and the backend.</p>}
      <form onSubmit={submit} noValidate>
        <ServiceStep stage={stage} values={values} update={update} setValues={setValues} errors={errors} notify={notify} legal={legal} legalLoading={legalLoading} legalError={legalError} reloadLegal={reloadLegal} openLegal={setOpenDocument} onEdit={setStage} />
        {SERVICE_REGISTRATION_TEST_SKIP_ENABLED && !isSupabaseConfigured && stage < 5 && <div className="service-registration-test-skip"><small>Testing only</small><button type="button" className="btn btn-outline" disabled={busy} onClick={skipForTesting}>Skip for now</button></div>}
        <div className="registration-actions"><button type="button" className="link" disabled={busy} onClick={() => persist(stage, true)}>Save &amp; Exit</button>{stage > 0 && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setStage(stage - 1)}>Back</button>}{stage < 5 ? <button type="button" className="btn btn-primary" disabled={busy} onClick={continueStep}>Continue</button> : <button className="btn btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Complete registration'}</button>}</div>
      </form>
    </section>
    {openDocument && <ServiceLegalModal row={legal[openDocument]} type={openDocument} loading={legalLoading} error={legalError} onRetry={reloadLegal} onClose={() => setOpenDocument(null)} />}
  </main>;
}

function ServiceStep({ stage, values, update, setValues, errors, notify, legal, legalLoading, legalError, reloadLegal, openLegal, onEdit }) {
  const field = (name, label, props = {}) => <div key={name}><Field label={label} value={values[name] ?? ''} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} onChange={event => update(name, event.target.value)} {...props} />{errors[name] && <p id={`${name}-error`} className="inline-error" role="alert">{errors[name]}</p>}</div>;
  if (stage === 0) return <ServiceDetails values={values} update={update} field={field} errors={errors} notify={notify} />;
  if (stage === 1) return <ShopDetails values={values} update={update} field={field} errors={errors} />;
  if (stage === 2) return <ServiceSelection values={values} setValues={setValues} update={update} field={field} errors={errors} />;
  if (stage === 3) return <WorkPreferences values={values} update={update} field={field} errors={errors} />;
  if (stage === 4) return <BankDetails values={values} update={update} field={field} errors={errors} />;
  return <DocumentsAndReview values={values} setValues={setValues} update={update} errors={errors} legal={legal} legalLoading={legalLoading} legalError={legalError} reloadLegal={reloadLegal} openLegal={openLegal} onEdit={onEdit} />;
}

function ServiceDetails({ values, update, field, errors, notify }) {
  function locate() {
    if (!navigator.geolocation) { update('locationPermission', 'unavailable'); return notify('Location is unavailable. Enter your address manually in Step 2.'); }
    navigator.geolocation.getCurrentPosition(position => {
      setLocation(position.coords.latitude, position.coords.longitude);
      notify('Location captured. Confirm your address in Step 2.');
    }, () => { update('locationPermission', 'denied'); notify('Location was not available. Continue with manual address entry in Step 2.'); }, { enableHighAccuracy: false, timeout: 10000 });
  }
  function setLocation(latitude, longitude) { update('latitude', latitude); update('longitude', longitude); update('locationPermission', 'granted'); }
  return <><p className="step-intro">Apni basic details batayein.</p>{field('name', 'Full name', { required: true })}{values.verifiedEmail ? <div><Field label="Verified email address" value={values.verifiedEmail} readOnly aria-invalid={Boolean(errors.verifiedEmail)} />{errors.verifiedEmail && <p className="inline-error" role="alert">{errors.verifiedEmail}</p>}<small className="field-help registration-lookup found"><Icon name="check" size={14} />Confirmed by your Google or email sign-in.</small></div> : <p className="inline-error" role="alert">Sign in with Google or verify your email code before submitting.</p>}{field('dateOfBirth', 'Date of birth', { type: 'date', max: today, required: true })}<section className="registration-subcard"><h3>Location</h3><p>Location can suggest your service area. Permission is requested only after you tap the button.</p><button type="button" className="btn btn-outline" onClick={locate}>Use my current location</button>{values.locationPermission && <small>Status: {values.locationPermission}. You can enter or correct the full address in Step 2.</small>}{values.locationPermission === 'granted' && <button type="button" className="link" onClick={() => { update('latitude', undefined); update('longitude', undefined); update('locationPermission', ''); }}>Clear detected location</button>}</section></>;
}

function ShopDetails({ values, update, field, errors }) {
  const pin = useLookup(lookupPincode, /^\d{6}$/.test(values.pinCode) ? values.pinCode : '');
  const filled = useRef({});
  useEffect(() => {
    if (pin.status !== 'found') return;
    // Fill only empty fields or values this lookup filled earlier; typed values are never replaced.
    ['city', 'state'].forEach(name => {
      if (pin.result[name] && (!values[name] || values[name] === filled.current[name])) { filled.current[name] = pin.result[name]; update(name, pin.result[name]); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin.status, pin.result]);
  return <><p className="step-intro">Apni dukaan aur address ki jaankari dein. Suggested details can always be corrected.</p>{field('businessName', 'Shop or business name', { required: true })}{field('shopOwnership', 'Shop ownership', { as: 'select', options: ['', 'Owned', 'Rented'], required: true })}<section className="registration-subcard"><h3>Shop address</h3><div><Field label="PIN code" value={values.pinCode} inputMode="numeric" autoComplete="postal-code" maxLength={6} required aria-invalid={Boolean(errors.pinCode)} aria-describedby={errors.pinCode ? 'pinCode-error' : 'pinCode-lookup'} onChange={event => update('pinCode', event.target.value.replace(/\D/g, '').slice(0, 6))} />{errors.pinCode && <p id="pinCode-error" className="inline-error" role="alert">{errors.pinCode}</p>}<LookupHint id="pinCode-lookup" state={pin} idle="Enter your 6-digit PIN first — city and state fill automatically." found={result => `${result.city}, ${result.state} — city and state filled. You can edit them.`} notFound="PIN not found. Enter city and state manually." /></div>{field('address', 'Address', { required: true, autoComplete: 'street-address' })}{field('locality', 'Area / locality', { required: true, list: pin.result?.localities?.length ? 'service-pin-localities' : undefined })}{pin.result?.localities?.length > 0 && <datalist id="service-pin-localities">{pin.result.localities.map(name => <option key={name} value={name} />)}</datalist>}{field('city', 'City', { required: true })}{field('state', 'State', { required: true })}{field('landmark', 'Landmark — Optional')}</section>{field('referralSource', 'How did you hear about Eazily? — Optional', { as: 'select', options: referrals })}{values.referralSource === 'Other' && field('referralOther', 'Please specify — Optional')}</>;
}

function ServiceSelection({ values, setValues, update, field, errors }) {
  const [active, setActive] = useState(values.serviceSelections[0]?.categoryId || groups[0].id);
  const [search, setSearch] = useState('');
  const group = groups.find(item => item.id === active) || groups[0];
  const shown = group.items.filter(item => item.toLowerCase().includes(search.trim().toLowerCase()));
  function toggle(service) {
    setValues(current => {
      const exists = current.serviceSelections.some(item => item.categoryId === group.id && item.serviceId === service);
      return { ...current, serviceSelections: exists ? current.serviceSelections.filter(item => !(item.categoryId === group.id && item.serviceId === service)) : [...current.serviceSelections, { categoryId: group.id, categoryLabel: group.label, serviceId: service, serviceName: service }] };
    });
  }
  return <><p className="step-intro">Choose every service you provide. You can select services from more than one category.</p><Field label="Search services" value={search} onChange={event => setSearch(event.target.value)} placeholder="Electrician, AC Service…" /><div className="service-category-grid">{groups.map(item => <button type="button" className={active === item.id ? 'selected' : ''} aria-pressed={active === item.id} key={item.id} onClick={() => setActive(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</div><section className="registration-subcard"><h3>{group.label}</h3><div className="service-check-grid">{shown.map(service => { const selected = values.serviceSelections.some(item => item.categoryId === group.id && item.serviceId === service); return <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected} key={service} onClick={() => toggle(service)}>{service}<Icon name={selected ? 'check' : 'plus'} size={16} /></button>; })}</div>{!shown.length && <p>No matching services in this category.</p>}</section>{errors.serviceSelections && <p className="inline-error" role="alert">{errors.serviceSelections}</p>}<div className="selected-service-chips" aria-label="Selected services">{values.serviceSelections.map(item => <button type="button" key={`${item.categoryId}-${item.serviceId}`} onClick={() => toggleFromChip(item, setValues)}>{item.serviceName}<Icon name="close" size={14} /></button>)}</div><div className="experience-inputs">{field('experienceYears', 'Experience — Years', { type: 'number', inputMode: 'numeric', min: 0, max: 80, required: true })}{field('experienceMonths', 'Additional months', { type: 'number', inputMode: 'numeric', min: 0, max: 11, required: true })}</div>{field('workerCount', 'Workers besides you', { type: 'number', inputMode: 'numeric', min: 0, required: true })}<label className="consent"><input type="checkbox" checked={Number(values.workerCount) === 0} onChange={event => update('workerCount', event.target.checked ? 0 : '')} /> I work alone — 0 workers</label><SkillsAndBio values={values} setValues={setValues} update={update} field={field} activeCategoryId={active} /></>;
}

function SkillsAndBio({ values, setValues, update, field, activeCategoryId }) {
  const [skillInput, setSkillInput] = useState('');
  const confirmed = values.skills || [];
  const suggestions = suggestedSkills(values.serviceSelections, activeCategoryId)
    .filter(skill => !confirmed.some(item => item.toLocaleLowerCase() === skill.toLocaleLowerCase()));

  function addSkill(value) {
    const skill = value.trim().replace(/\s+/g, ' ');
    if (!skill) return;
    setValues(current => ({ ...current, skills: uniqueSkills([...(current.skills || []), skill]) }));
    setSkillInput('');
  }

  return <>
    <section className="registration-subcard service-skills-section">
      <h3>Skills &amp; sub-services</h3>
      <p>Suggestions only. Add the skills you actually do; this does not select or publish another service.</p>
      <div className="service-skill-suggestions" aria-label="Suggested skills">{suggestions.map(skill => <button type="button" key={skill} onClick={() => addSkill(skill)} aria-label={`Add ${skill}`}><Icon name="plus" size={15} />{skill}</button>)}</div>
      <b className="form-label">Your confirmed skills</b>
      <div className="service-confirmed-skills" aria-label="Confirmed skills">{confirmed.length ? confirmed.map(skill => <button type="button" key={skill} aria-label={`Remove ${skill}`} onClick={() => setValues(current => ({ ...current, skills: current.skills.filter(item => item !== skill) }))}>{skill}<Icon name="close" size={15} /></button>) : <small className="field-help">No skills added yet.</small>}</div>
      <label className="field-wrap"><span className="form-label">Add your own skill</span><span className="service-skill-entry"><input className="field" value={skillInput} maxLength={50} placeholder="Type a skill you actually provide" onChange={event => setSkillInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addSkill(skillInput); } }} /><button type="button" className="btn btn-outline" onClick={() => addSkill(skillInput)}>Add</button></span></label>
    </section>
    <section className="registration-subcard service-bio-section">
      <div className="service-bio-heading"><h3>Professional bio</h3><button type="button" className="btn btn-outline" disabled={!values.serviceSelections.length} onClick={() => update('bio', draftServiceBio(values))}>Auto-fill Bio</button></div>
      <p>Uses only your name, selected categories, entered experience and confirmed skills. You can edit every word.</p>
      {field('bio', 'Bio - optional', { as: 'textarea', maxLength: 500, placeholder: 'Write a short introduction about your work.' })}
    </section>
  </>;
}

function toggleFromChip(item, setValues) { setValues(current => ({ ...current, serviceSelections: current.serviceSelections.filter(selected => !(selected.categoryId === item.categoryId && selected.serviceId === item.serviceId)) })); }

function WorkPreferences({ values, update, field, errors }) {
  const travels = ['At the customer’s location', 'Both'].includes(values.servicePlace);
  function toggleDay(day) { update('workingDays', values.workingDays.includes(day) ? values.workingDays.filter(item => item !== day) : [...values.workingDays, day]); }
  const sameDays = list => values.workingDays.length === list.length && list.every(day => values.workingDays.includes(day));
  const hourPresets = [['9 AM – 7 PM', '09:00', '19:00'], ['10 AM – 8 PM', '10:00', '20:00'], ['8 AM – 6 PM', '08:00', '18:00']];
  const setHours = (open, close) => () => { update('openingTime', open); update('closingTime', close); };
  return <><p className="step-intro">Tell us when and where you usually work. These preferences do not make your profile Online or approved.</p>{field('servicePlace', 'Where do you provide the service?', { as: 'select', options: ['', 'At my shop', 'At the customer’s location', 'Both'], required: true })}{travels && field('serviceAreas', 'Service areas / localities', { as: 'textarea', placeholder: 'For example: Arera Colony, MP Nagar', required: true })}<section className="registration-subcard"><h3>Working days</h3><PresetChips label="Quick pick" options={[['Mon–Sat', () => update('workingDays', days.slice(0, 6)), sameDays(days.slice(0, 6))], ['All 7 days', () => update('workingDays', [...days]), sameDays(days)], ['Mon–Fri', () => update('workingDays', days.slice(0, 5)), sameDays(days.slice(0, 5))]]} /><div className="day-chips">{days.map(day => <button type="button" aria-pressed={values.workingDays.includes(day)} className={values.workingDays.includes(day) ? 'selected' : ''} key={day} onClick={() => toggleDay(day)}>{day.slice(0, 3)}</button>)}</div>{errors.workingDays && <p className="inline-error" role="alert">{errors.workingDays}</p>}</section><label className="consent"><input type="checkbox" checked={values.sameTiming} onChange={event => update('sameTiming', event.target.checked)} /> Same timing for all selected days</label>{values.sameTiming ? <><PresetChips label="Common hours" options={hourPresets.map(([text, open, close]) => [text, setHours(open, close), values.openingTime === open && values.closingTime === close])} /><div className="experience-inputs">{field('openingTime', 'Opening time', { type: 'time', required: true })}{field('closingTime', 'Closing time', { type: 'time', required: true })}</div></> : <div className="daily-timings">{values.workingDays.map(day => <div key={day}><b>{day}</b><input aria-label={`${day} opening time`} type="time" value={values.dailyTimings[day]?.open || ''} onChange={event => update('dailyTimings', { ...values.dailyTimings, [day]: { ...values.dailyTimings[day], open: event.target.value } })} /><input aria-label={`${day} closing time`} type="time" value={values.dailyTimings[day]?.close || ''} onChange={event => update('dailyTimings', { ...values.dailyTimings, [day]: { ...values.dailyTimings[day], close: event.target.value } })} /></div>)}{errors.dailyTimings && <p className="inline-error" role="alert">{errors.dailyTimings}</p>}</div>}<p className="policy-note">Prices, descriptions and promotional media can be added later through the existing Create Service flow.</p></>;
}

function BankDetails({ values, update, field, errors }) {
  const bank = useLookup(lookupIfsc, /^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifsc || '') ? values.ifsc : '');
  const filledBank = useRef('');
  useEffect(() => {
    if (bank.status !== 'found' || !bank.result.bank) return;
    if (!values.bankName || values.bankName === filledBank.current) { filledBank.current = bank.result.bank; update('bankName', bank.result.bank); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank.status, bank.result]);
  return <><p className="step-intro">Aapki service payments ke liye bank details.</p><p className="policy-note">These private details are not shown on your public Service Partner profile. Format checks do not mean the account is verified.</p>{field('accountHolder', 'Account holder’s name', { required: true })}{values.name && values.accountHolder !== values.name && <button type="button" className="link registration-inline-action" onClick={() => update('accountHolder', values.name)}>Use my name: {values.name}</button>}{field('accountNumber', 'Bank account number', { inputMode: 'numeric', autoComplete: 'off', required: true, onChange: event => update('accountNumber', event.target.value.replace(/\D/g, '')) })}{field('accountConfirmation', 'Re-enter account number', { inputMode: 'numeric', autoComplete: 'off', required: true, onChange: event => update('accountConfirmation', event.target.value.replace(/\D/g, '')) })}{errors.accountMatch && <p className="inline-error" role="alert">{errors.accountMatch}</p>}{field('ifsc', 'IFSC code', { autoCapitalize: 'characters', maxLength: 11, required: true, onChange: event => update('ifsc', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')) })}<LookupHint id="ifsc-lookup" state={bank} idle="Enter the IFSC — the bank name fills automatically." found={result => `${result.bank}${result.branch ? ` · ${result.branch} branch` : ''}${result.city ? `, ${result.city}` : ''}`} notFound="IFSC not found. Check the code or enter the bank name manually." />{field('bankName', 'Bank name', { required: true })}</>;
}

function DocumentsAndReview({ values, setValues, update, errors, legal, legalLoading, legalError, reloadLegal, openLegal, onEdit }) {
  const upload = (name, label, help, required = false, photo = false) => <section className="document-upload-card" key={name}><div><h3>{label} <span>{required ? 'Required' : 'Optional'}</span></h3><p>{help}</p></div><MediaUpload role="professional" label="Choose file" documents={!photo} photosOnly={photo} single autoUpload documentCamera value={values[name]} onChange={change => setValues(current => ({ ...current, [name]: typeof change === 'function' ? change(current[name] || []) : change }))} />{errors[name] && <p className="inline-error" role="alert">{errors[name]}</p>}</section>;
  const masked = values.accountNumber ? `•••• ${values.accountNumber.slice(-4)}` : 'Not entered';
  const missingDocuments = [!legal.terms && 'Service Partner Terms & Conditions', !legal.privacy && 'Service Partner Privacy Policy'].filter(Boolean);
  const policiesAvailable = missingDocuments.length === 0;
  const testPolicies = [legal.terms, legal.privacy].some(isTestPolicy);
  return <><p className="step-intro">Upload the required documents, then review your details before submitting.</p><h2 className="upload-group-title">Identity</h2>{upload('aadhaar', 'Aadhaar', 'Identity document used by the existing private verification process.', true)}{upload('pan', 'PAN', 'PAN image or PDF for private verification.', true)}<h2 className="upload-group-title">Shop</h2>{upload('gumasta', 'Gumasta / Shop Registration', 'Upload the shop registration document, or request help below.', !values.gumastaHelp)}<label className="consent"><input type="checkbox" checked={values.gumastaHelp} onChange={event => update('gumastaHelp', event.target.checked)} /> I need help with Gumasta / Shop Registration</label>{upload('ownerShopMedia', 'Owner with shop photo', 'A clear JPG or PNG showing the owner with the shop.', false, true)}<h2 className="upload-group-title">Additional documents</h2>{upload('udyam', 'MSME / Udyam certificate', 'Add this only if available.', false)}<section className="registration-review"><h2>Review Your Details</h2>{[['Your details', 0, `${values.name} · ${values.verifiedEmail} · ${values.dateOfBirth}`], ['Shop details', 1, `${values.businessName} · ${values.address}, ${values.locality}, ${values.city}, ${values.state} ${values.pinCode}`], ['Services', 2, values.serviceSelections.map(item => item.serviceName).join(', ')], ['Skills', 2, values.skills?.length ? values.skills.join(', ') : 'Not added'], ['Bio', 2, values.bio || 'Not added'], ['Work preferences', 3, `${values.servicePlace} · ${values.workingDays.join(', ')}`], ['Bank details', 4, `${values.accountHolder} · ${masked} · ${values.ifsc} · Not verified`]].map(([title, stage, text]) => <div className="review-line" key={title}><div><b>{title}</b><p>{text}</p></div><button type="button" className="link" onClick={() => onEdit(stage)}>Edit</button></div>)}</section><section className="service-legal-links" aria-busy={legalLoading || undefined}><button type="button" className="link" aria-describedby={!legal.terms ? 'service-policy-status' : undefined} onClick={() => openLegal('terms')}>Service Partner Terms &amp; Conditions</button><button type="button" className="link" aria-describedby={!legal.privacy ? 'service-policy-status' : undefined} onClick={() => openLegal('privacy')}>Service Partner Privacy Policy</button>{legalLoading && <p id="service-policy-status" className="policy-note" role="status">Checking published Service Partner policies…</p>}{!legalLoading && legalError && <p id="service-policy-status" className="inline-error" role="alert">Published policies could not be loaded: {legalError} <button type="button" className="link" onClick={reloadLegal}>Retry</button></p>}{!legalLoading && !legalError && missingDocuments.length > 0 && <p id="service-policy-status" className="inline-error" role="alert"><strong>Policies not published:</strong> {missingDocuments.join(' and ')}. Registration cannot be submitted until {missingDocuments.length === 2 ? 'both approved policies are' : 'the approved policy is'} published with a version and effective date. Tap the policy name above to see its status.</p>}{!legalLoading && !legalError && policiesAvailable && testPolicies && <p className="testing-notice" role="status"><strong>Test-only policies are active.</strong> Both documents are marked for internal testing and must be replaced with approved legal text before real users register.</p>}</section><label className="consent" data-blocked={!policiesAvailable || legalLoading || undefined}><input type="checkbox" required checked={values.termsAccepted} aria-disabled={!policiesAvailable || legalLoading || undefined} aria-invalid={Boolean(errors.termsAccepted || errors.legal)} aria-describedby={errors.termsAccepted ? 'service-policy-acceptance-error' : errors.legal ? 'service-policy-legal-error' : !policiesAvailable && !legalLoading ? 'service-policy-acceptance-help' : undefined} onClick={event => { if (!policiesAvailable || legalLoading) { event.preventDefault(); openLegal(!legal.terms ? 'terms' : 'privacy'); } }} onChange={event => update('termsAccepted', event.target.checked)} /> I agree to Eazily’s Service Partner Terms &amp; Conditions and acknowledge the Privacy Policy.</label>{!legalLoading && !policiesAvailable && <p id="service-policy-acceptance-help" className="policy-note">Acceptance is unavailable until both Service Partner policies are published. Tap the box for details, then retry after publication.</p>}{errors.legal && <p id="service-policy-legal-error" className="inline-error" role="alert">{errors.legal}</p>}{errors.termsAccepted && <p id="service-policy-acceptance-error" className="inline-error" role="alert">{errors.termsAccepted}</p>}</>;
}

function ServiceLegalModal({ row, type, loading, error, onRetry, onClose }) {
  const label = type === 'terms' ? 'Service Partner Terms & Conditions' : type === 'privacy' ? 'Service Partner Privacy Policy' : 'Service Partner policies';
  if (row) {
    const document = { key: type, documentId: row.document_key, version: row.version, content: row.content };
    return <Sheet className="influencer-legal-sheet service-legal-sheet" onClose={onClose}>
      {isTestPolicy(row) && <p className="testing-notice" role="status"><strong>Test-only policy.</strong> This is not an approved legal document. Replace it with authorised legal text before real users register.</p>}
      <LegalDocument document={document} />
      <button type="button" className="btn btn-outline legal-close-button" onClick={onClose}>Close</button>
    </Sheet>;
  }
  return <Sheet className="influencer-legal-sheet service-legal-sheet" onClose={onClose}>
    <article className="influencer-legal-document" aria-labelledby={`legal-title-${type}`}>
      <h1 id={`legal-title-${type}`}>{label}</h1>
      {loading ? <p role="status">Checking published policies…</p> : <>
        <p className="testing-notice">This policy is not published yet.</p>
        <p>Service Partner registration cannot be submitted until the approved document is published with a version and effective date. No acceptance has been recorded.</p>
        {type === 'missing' && <p>Both the Service Partner Terms &amp; Conditions and the Service Partner Privacy Policy must be published.</p>}
        {error && <p className="inline-error" role="alert">The policy check failed: {error}</p>}
        <button type="button" className="btn btn-outline" onClick={onRetry}>Check again</button>
      </>}
    </article>
    <button type="button" className="btn btn-outline legal-close-button" onClick={onClose}>Close</button>
  </Sheet>;
}

function validate(stage, values, legal) {
  const errors = {};
  const required = (name, message) => { if (!String(values[name] ?? '').trim()) errors[name] = message; };
  if (stage === 0) { required('name', 'Enter your full name.'); if (!values.verifiedEmail) errors.verifiedEmail = 'A verified email address is required from the signed-in account.'; required('dateOfBirth', 'Enter your date of birth.'); if (values.dateOfBirth && values.dateOfBirth > today) errors.dateOfBirth = 'Date of birth cannot be in the future.'; if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.email = 'Enter a valid email address or leave it blank.'; }
  if (stage === 1) { ['businessName', 'shopOwnership', 'address', 'locality', 'city', 'state', 'pinCode'].forEach(name => required(name, `Complete ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}.`)); if (values.pinCode && !/^\d{6}$/.test(values.pinCode)) errors.pinCode = 'Enter a valid 6-digit PIN code.'; }
  if (stage === 2) { if (!values.serviceSelections.length) errors.serviceSelections = 'Select at least one service.'; if (values.experienceYears === '' || Number(values.experienceYears) < 0) errors.experienceYears = 'Enter years of experience, using 0 if less than one year.'; if (values.experienceMonths === '' || Number(values.experienceMonths) < 0 || Number(values.experienceMonths) > 11) errors.experienceMonths = 'Enter additional months from 0 to 11.'; if (values.workerCount === '' || Number(values.workerCount) < 0) errors.workerCount = 'Enter workers besides you, using 0 if you work alone.'; }
  if (stage === 3) { required('servicePlace', 'Choose where you provide services.'); if (['At the customer’s location', 'Both'].includes(values.servicePlace)) required('serviceAreas', 'Enter the localities you travel to.'); if (!values.workingDays.length) errors.workingDays = 'Select at least one working day.'; if (values.sameTiming) { required('openingTime', 'Choose an opening time.'); required('closingTime', 'Choose a closing time.'); if (values.openingTime && values.closingTime && values.openingTime >= values.closingTime) errors.closingTime = 'Closing time must be after opening time.'; } else if (values.workingDays.some(day => !values.dailyTimings[day]?.open || !values.dailyTimings[day]?.close || values.dailyTimings[day].open >= values.dailyTimings[day].close)) errors.dailyTimings = 'Enter a valid opening and closing time for every selected day.'; }
  if (stage === 4) { ['accountHolder', 'accountNumber', 'accountConfirmation', 'ifsc', 'bankName'].forEach(name => required(name, `Complete ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}.`)); if (values.accountNumber && !/^\d{6,18}$/.test(values.accountNumber)) errors.accountNumber = 'Enter a 6–18 digit bank account number.'; if (values.accountNumber !== values.accountConfirmation) errors.accountMatch = 'The bank account numbers do not match.'; if (values.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifsc)) errors.ifsc = 'Enter a valid 11-character IFSC code.'; }
  if (stage === 5) { if (!values.aadhaar.length) errors.aadhaar = 'Upload Aadhaar and wait for upload confirmation.'; if (!values.pan.length) errors.pan = 'Upload PAN and wait for upload confirmation.'; if (!values.gumasta.length && !values.gumastaHelp) errors.gumasta = 'Upload Gumasta or choose the help option.'; if (!legal.terms || !legal.privacy) errors.legal = 'Published Service Partner policies are required before submission.'; else if (!values.termsAccepted) errors.termsAccepted = 'Accept the Service Partner Terms and acknowledge the Privacy Policy.'; }
  return errors;
}
