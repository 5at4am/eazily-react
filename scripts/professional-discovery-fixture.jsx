// Browser-only fixture. It is not imported by the production application.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProfessionalProfile from '../src/features/services/ProfessionalProfile.jsx';
import '../src/styles/index.css';
import '../src/components/customer-navigation.css';
import '../src/features/services/professional-profile.css';
import '../src/features/services/professional-profile-sticky.css';

const service = { categoryId: 'manpower', serviceName: 'AC Service' };

const sampleImage = index => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="390"><rect width="520" height="390" fill="#${['ede7ff', 'e4f0ff', 'ffe9df', 'e2f7ee'][index]}"/><text x="260" y="205" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#4b3a7a">Past work ${index + 1}</text></svg>`)}`;

const vendor = {
  id: 'fixture-vendor-0001',
  partner_id: 'fixture-partner-0001',
  partner_role: 'professional',
  display_name: 'Rahul Sharma',
  business_name: 'Sharma Appliance Care',
  specialisation: 'Air-conditioner service and repair',
  selected_service: 'AC Service',
  service_names: ['AC Service'],
  prices: { 'AC Service': 499 },
  starting_price: 499,
  pricing_type: 'Fixed Price',
  visiting_charge: 0,
  description: 'Doorstep air-conditioner service with a 30-day workmanship warranty.',
  languages: ['Hindi', 'English'],
  qualifications: ['ITI Refrigeration', 'Manufacturer service training'],
  review_count: 4,
  rating: 4.8,
  experience_years: 6,
  completed_jobs: 120,
  expected_response_minutes: 20,
  available_now: true,
  availability: 'Available today',
  coverage: ['Bhopal'],
  city: 'Bhopal',
  document_verified_at: '2026-10-01T00:00:00Z',
  cancellation_policy: 'Free cancellation before the professional starts travelling.',
  portfolio_media: [sampleImage(0), sampleImage(1), sampleImage(2), sampleImage(3)],
};

function ProfileFixture() {
  const [booked, setBooked] = useState(false);
  const [notice, notify] = useState('');
  const [open, setOpen] = useState(true);
  return <div className="phone-shell peazily-ui"><div className="user-app-root">
    <main className="screen service-experience user-art-service">
      <header className="topbar"><h1>AC Service</h1></header>
      <div className="experience-body" />
      {open && <ProfessionalProfile
        vendor={vendor}
        service={service}
        vendors={[]}
        policy={{ cancellation_policy: vendor.cancellation_policy }}
        saved={false}
        onSave={() => notify('save')}
        onBook={() => setBooked(true)}
        onMessage={() => notify('message')}
        onVendor={() => {}}
        notify={notify}
        onClose={() => setOpen(false)}
      />}
      <div id="fixture-state">{booked ? 'BOOKED' : 'not-booked'}{notice}</div>
    </main>
    <nav className="bottom-nav customer-nav" aria-label="Main navigation">
      {['Home', 'Explore', 'Messages', 'Videos', 'Profile'].map(item => <button type="button" className="nav-item" key={item}><span className="nav-icon" /><span className="nav-label">{item}</span></button>)}
    </nav>
  </div></div>;
}

export { ProfileFixture };

createRoot(document.getElementById('root')).render(<ProfileFixture />);
