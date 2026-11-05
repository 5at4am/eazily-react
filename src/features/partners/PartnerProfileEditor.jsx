import { useState } from 'react';
import { Field } from '../../components/Ui.jsx';
import Icon from '../../components/Icon.jsx';
import { partnerRoles } from '../../data/partners.js';
import { translate as t } from '../../lib/translate.js';
import { updatePartnerProfile } from '../../services/partners.js';

const fields = {
  professional: [['businessName', 'Business name'], ['name', 'Contact name'], ['city', 'City'], ['bio', 'About your work', 'textarea']],
  influencer: [['creatorName', 'Creator name'], ['city', 'City'], ['category', 'Main content category'], ['bio', 'About your content', 'textarea']],
  consultant: [['name', 'Name'], ['city', 'City'], ['specialisation', 'Specialisation'], ['bio', 'About your practice', 'textarea']],
};

export default function PartnerProfileEditor({ role, application, notify, onDone, onBack }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields[role].map(([key]) => [key, application?.details?.[key] || ''])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = role === 'professional' ? 'Edit service profile' : role === 'influencer' ? 'Edit creator profile' : 'Edit consultant profile';
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await updatePartnerProfile(role, values);
      notify('Profile updated');
      await onDone();
    } catch (cause) {
      setError(cause.message || 'Your profile could not be saved. Try again.');
    } finally { setBusy(false); }
  }
  return <main className="partner-profile-editor">
    <header className="partner-profile-editor-head">
      <button type="button" className="btn btn-outline" onClick={onBack}><Icon name="arrowLeft" size={18} /> {t('Back')}</button>
      <span>{t(partnerRoles[role].label)}</span>
    </header>
    <form className="partner-profile-editor-form" onSubmit={save}>
      <div><p className="partner-profile-editor-eyebrow">{t('Your public details')}</p><h1>{t(title)}</h1><p className="partner-profile-editor-intro">{t('Update the details customers and partners see. Your approval, documents, payment details, consent and assessments are not changed here.')}</p></div>
      <div className="partner-profile-editor-fields">{fields[role].map(([key, label, as]) => <Field key={key} label={t(label)} as={as || 'input'} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />)}</div>
      {error && <p className="inline-error" role="alert">{t(error)}</p>}
      <div className="partner-profile-editor-actions"><button type="button" className="btn btn-outline" onClick={onBack} disabled={busy}>{t('Cancel')}</button><button type="submit" className="btn btn-primary" disabled={busy}>{t(busy ? 'Saving…' : 'Save profile')}</button></div>
    </form>
  </main>;
}
