/* eslint-disable react-refresh/only-export-components */
// Browser fixture for the Service Partner final step. Only the legal-document
// query is replaced; the real registration screen, consent UI and modal run.
import { createRoot } from 'react-dom/client';
import ServicePartnerOnboarding from '../src/features/partners/ServicePartnerOnboarding.jsx';
import '../src/styles.css';
import '../src/experience.css';
import '../src/partner.css';

const USER = {
  id: 'legal-fixture-user',
  email: 'partner@example.invalid',
  email_confirmed_at: '2026-10-23T10:00:00Z',
  app_metadata: { provider: 'email' },
};
const ACCOUNT = {
  user: USER,
  profile: { id: USER.id, full_name: 'Fixture Service Partner', email: USER.email, city: 'Bhopal', account_status: 'active' },
  applications: [],
  roles: ['customer'],
  staff: null,
  isAdmin: false,
  assessments: {},
};
const DETAILS = {
  stage: 5,
  serviceRegistrationVersion: 'service-registration-2026-09-14',
  language: 'English',
  name: 'Fixture Service Partner',
  dateOfBirth: '1990-01-02',
  businessName: 'Fixture Repairs',
  shopOwnership: 'Rented',
  address: 'Sample Market',
  locality: 'MP Nagar',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pinCode: '462011',
  serviceSelections: [{ categoryId: 'home-property', categoryLabel: 'Home & Property', serviceId: 'Electrician', serviceName: 'Electrician' }],
  experienceYears: 4,
  experienceMonths: 3,
  workerCount: 0,
  skills: [],
  bio: 'Fixture bio',
  servicePlace: 'Both',
  serviceAreas: 'MP Nagar',
  workingDays: ['Monday'],
  sameTiming: true,
  openingTime: '09:00',
  closingTime: '18:00',
  dailyTimings: {},
  accountHolder: 'Fixture Service Partner',
  accountNumber: '0012345678',
  accountConfirmation: '0012345678',
  ifsc: 'SBIN0001234',
  bankName: 'Sample Bank',
  aadhaar: [{ path: 'fixture/aadhaar.pdf', name: 'aadhaar.pdf' }],
  pan: [{ path: 'fixture/pan.pdf', name: 'pan.pdf' }],
  gumasta: [],
  gumastaHelp: true,
  ownerShopMedia: [],
  udyam: [],
};

window.__legalCalls = 0;
window.__legalRows = [];

export async function getServicePartnerLegalDocuments() {
  window.__legalCalls += 1;
  return window.__legalRows;
}
export async function saveApplication(role, details) {
  return { id: 'fixture-application', role, status: 'draft', details };
}
export async function submitServicePartnerApplication() {
  throw new Error('Submission is not part of this fixture');
}

function App() {
  return <div className="phone-shell">
    <ServicePartnerOnboarding
      account={ACCOUNT}
      existing={{ id: 'fixture-application', role: 'professional', status: 'draft', details: DETAILS }}
      notify={message => { window.__toasts = [...(window.__toasts || []), message]; }}
      onDone={() => {}}
      onBack={() => {}}
    />
  </div>;
}

if (typeof document !== 'undefined' && document.getElementById('root')) createRoot(document.getElementById('root')).render(<App />);
