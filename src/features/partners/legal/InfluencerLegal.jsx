import { useEffect, useState } from 'react';
import { Sheet } from '../../../components/Ui.jsx';
import Icon from '../../../components/Icon.jsx';
import { isSupabaseConfigured } from '../../../lib/supabase.js';
import { acceptInfluencerTerms, getInfluencerLegalDocuments, getInfluencerTermsAcceptance } from '../../../services/partners.js';
import { influencerLegalDocuments, influencerTerms } from './influencerLegal.js';
import './influencer-legal.css';

function lineType(line) {
  if (/^EAZILY\s+[–-]/.test(line)) return 'h1';
  if (/^\d+\.\s+[A-Z]/.test(line)) return 'h2';
  if (/^\d+\.\d+\s+/.test(line)) return 'h3';
  if (/^(Effective Date|Last Updated):/.test(line)) return 'meta';
  if (/^(Company|Platform|Registered Address|Email|Privacy Email|Support|Support Number|Website|Grievance Contact|Grievance Officer|Grievance Email):/.test(line)) return 'contact';
  return 'p';
}

export function LegalDocument({ document }) {
  const lines = document.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return <article className="influencer-legal-document" aria-labelledby={`legal-title-${document.key}`}>
    <span className="legal-version">Document ID: {document.documentId} · Version {document.version}</span>
    {lines.map((line, index) => {
      const type = lineType(line);
      if (type === 'h1') return <h1 id={`legal-title-${document.key}`} key={index}>{line}</h1>;
      if (type === 'h2') return <h2 key={index}>{line}</h2>;
      if (type === 'h3') return <h3 key={index}>{line}</h3>;
      if (type === 'meta') return <p className="legal-date" key={index}>{line}</p>;
      if (type === 'contact') return <p className="legal-contact" key={index}>{line}</p>;
      return <p key={index}>{line}</p>;
    })}
  </article>;
}

const legalRow = (documents, documentKey) => documents?.find(row => row.document_key === influencerLegalDocuments[documentKey]?.documentId);
const testOnlyDocument = document => {
  if (!document) return false;
  return /^test-only-/i.test(String(document.version || '')) || /^TEST ONLY/i.test(String(document.title || ''));
};

export function InfluencerLegalModal({ documentKey, onClose, acceptance, documents }) {
  const [state, setState] = useState({ loading: Boolean(isSupabaseConfigured && !documents), rows: documents || [], error: '' });
  useEffect(() => {
    let active = true;
    if (documents) { setState({ loading: false, rows: documents, error: '' }); return () => { active = false; }; }
    if (!isSupabaseConfigured) { setState({ loading: false, rows: [], error: '' }); return () => { active = false; }; }
    getInfluencerLegalDocuments().then(rows => { if (active) setState({ loading: false, rows, error: '' }); })
      .catch(error => { if (active) setState({ loading: false, rows: [], error: error.message }); });
    return () => { active = false; };
  }, [documents]);
  const row = legalRow(state.rows, documentKey);
  const document = row
    ? { key: documentKey, documentId: row.document_key, version: row.version, content: row.content }
    : !isSupabaseConfigured ? influencerLegalDocuments[documentKey] : null;
  if (!influencerLegalDocuments[documentKey]) return null;
  return <Sheet className="influencer-legal-sheet" onClose={onClose}>
    {state.loading && <p role="status">Loading published policy…</p>}
    {document && !row && <p className="testing-notice" role="status"><b>Draft preview only.</b> This document is not published or approved. Do not use it as a real policy.</p>}
    {row && testOnlyDocument(row) && <p className="testing-notice" role="status"><b>Test-only policy.</b> This is not approved legal text and is for testing only. Replace it before real users register.</p>}
    {document ? <LegalDocument document={document} /> : !state.loading && <p className="inline-error" role="alert">{state.error ? `The published policy could not be loaded: ${state.error}` : 'This policy is not published. Registration cannot be completed until both Influencer policies are published.'}</p>}
    {documentKey === 'terms' && acceptance && <AcceptanceDetails acceptance={acceptance} />}
    <button type="button" className="btn btn-outline legal-close-button" onClick={onClose}>Close</button>
  </Sheet>;
}

function AcceptanceDetails({ acceptance }) {
  return <section className="influencer-acceptance-record" aria-label="Digital acceptance details">
    <h2>Digital acceptance</h2>
    <p><b>Accepted version:</b> {acceptance.version}</p>
    <p><b>Server-recorded date:</b> {new Date(acceptance.recorded_at).toLocaleString('en-IN')}</p>
  </section>;
}

export function InfluencerLegalCenter({ application, notify }) {
  const [open, setOpen] = useState(null);
  const [acceptance, setAcceptance] = useState(null);
  const [documents, setDocuments] = useState([]);
  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return undefined;
    Promise.all([application?.id ? getInfluencerTermsAcceptance(application.id) : Promise.resolve(null), getInfluencerLegalDocuments()])
      .then(([record, rows]) => { if (active) { setAcceptance(record); setDocuments(rows); } })
      .catch(error => notify?.(error.message));
    return () => { active = false; };
  }, [application?.id, notify]);
  const terms = legalRow(documents, 'terms'), privacy = legalRow(documents, 'privacy');
  return <section className="influencer-legal-center">
    <h2>Legal</h2>
    <p>Read the legal documents that apply to the Influencer Service Provider interface.</p>
    {documents.some(testOnlyDocument) && <p className="testing-notice" role="status"><b>Test-only policies are active.</b> These documents are not approved for real users.</p>}
    <button type="button" className="profile-menu-row" onClick={() => setOpen('terms')}><span className="profile-menu-icon"><Icon name="clipboard" size={19} /></span><span><b>{terms?.title || 'Influencer Terms & Conditions'}</b><small>{terms ? `Version ${terms.version} · Published` : 'Not published'}</small></span><Icon name="chevronRight" size={18} /></button>
    <button type="button" className="profile-menu-row" onClick={() => setOpen('privacy')}><span className="profile-menu-icon"><Icon name="shield" size={19} /></span><span><b>{privacy?.title || 'Influencer Privacy Policy'}</b><small>{privacy ? `Version ${privacy.version} · Published` : 'Not published'}</small></span><Icon name="chevronRight" size={18} /></button>
    {acceptance && <AcceptanceDetails acceptance={acceptance} />}
    {open && <InfluencerLegalModal documentKey={open} onClose={() => setOpen(null)} acceptance={acceptance} documents={documents} />}
  </section>;
}

export function InfluencerTermsGate({ application, notify, children }) {
  const [state, setState] = useState({ loading: Boolean(isSupabaseConfigured), acceptance: null, documents: [], error: '' });
  const [agreed, setAgreed] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !application?.id) {
      setState({ loading: false, acceptance: null, documents: [], error: '' });
      return undefined;
    }
    Promise.all([getInfluencerTermsAcceptance(application.id), getInfluencerLegalDocuments()])
      .then(([acceptance, documents]) => {
        if (!active) return;
        const hasBoth = Boolean(legalRow(documents, 'terms') && legalRow(documents, 'privacy'));
        setState({ loading: false, acceptance: hasBoth ? acceptance : null, documents, error: hasBoth ? '' : 'Published Influencer Terms and Privacy Policy are required.' });
      })
      .catch(error => { if (active) setState({ loading: false, acceptance: null, documents: [], error: error.message }); });
    return () => { active = false; };
  }, [application?.id]);

  if (!isSupabaseConfigured || !application?.id || state.acceptance) return children;
  if (state.loading) return <main className="partner-onboarding role-influencer influencer-terms-gate"><section className="partner-form-card"><p role="status">Checking your Influencer Terms acceptance…</p></section></main>;
  const terms = legalRow(state.documents, 'terms'), privacy = legalRow(state.documents, 'privacy');
  const testOnly = [terms, privacy].some(testOnlyDocument);

  async function accept(event) {
    event.preventDefault();
    if (!agreed || !accurate) {
      setState(current => ({ ...current, error: 'You must explicitly accept the Influencer Terms & Conditions and confirm your information before continuing.' }));
      return;
    }
    setBusy(true);
    setState(current => ({ ...current, error: '' }));
    try {
      const acceptance = await acceptInfluencerTerms(application.id);
      setState({ loading: false, acceptance, error: '' });
      notify?.('Influencer Terms accepted');
    } catch (error) {
      setState(current => ({ ...current, error: error.message }));
    } finally {
      setBusy(false);
    }
  }

  return <main className="partner-onboarding role-influencer influencer-terms-gate">
    <section className="partner-form-card">
      <span className="application-state pending">Action required</span>
      <h1>Updated Influencer Terms</h1>
      <p>Read and accept version {influencerTerms.version} to continue to the Influencer workspace. This requirement applies only to Influencers.</p>
      {testOnly && <p className="testing-notice" role="status"><b>Test-only policies are active.</b> These documents are not approved legal text. Do not use them for real users.</p>}
      {state.error && <p className="inline-error" role="alert">{state.error}</p>}
      <div className="legal-actions">
        <button type="button" className="btn btn-outline" onClick={() => setOpen('terms')}>Read {terms?.title || 'Influencer Terms & Conditions'}</button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen('privacy')}>Read {privacy?.title || 'Influencer Privacy Policy'}</button>
      </div>
      <form onSubmit={accept}>
        <label className="consent"><input type="checkbox" checked={agreed} onChange={event => { setAgreed(event.target.checked); setState(current => ({ ...current, error: '' })); }} /> I have read and agree to the Eazily Influencer Terms &amp; Conditions.</label>
        <label className="consent"><input type="checkbox" checked={accurate} onChange={event => { setAccurate(event.target.checked); setState(current => ({ ...current, error: '' })); }} /> I confirm that my supplied information is accurate.</label>
        {state.error && <p className="inline-error" role="alert">{state.error}</p>}
        <button className="btn btn-primary" disabled={busy || !terms || !privacy}>{busy ? 'Saving acceptance…' : 'Accept and continue'}</button>
      </form>
      {open && <InfluencerLegalModal documentKey={open} onClose={() => setOpen(null)} documents={state.documents} />}
    </section>
  </main>;
}
