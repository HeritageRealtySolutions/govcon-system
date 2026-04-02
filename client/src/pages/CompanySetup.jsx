import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const EMPTY = {
  company_name: '', owner_name: '', uei_number: '', cage_code: '', ein: '',
  address: '', city: '', state: 'MS', zip: '', phone: '', email: '', website: '',
  certifications: '8(a), Small Business, Black-Owned',
  naics_codes: '238210,238220,238160,561730,236220',
  bonding_capacity: '', years_in_business: '', employee_count: '',
};

function FieldGroup({ label, children }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-wider border-b border-slate-700 pb-3">{label}</h2>
      {children}
    </div>
  );
}

export default function CompanySetup() {
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/company`).then(r => r.json()).then(d => {
      if (d) { setForm({ ...EMPTY, ...d }); setLoaded(true); }
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    const r = await fetch(`${BASE_URL}/api/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.id) { setSaved(true); setTimeout(() => setSaved(false), 4000); }
  }

  const f = (key, type = 'text') => ({
    type,
    value: form[key] || '',
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Company Profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          {loaded
            ? '✓ Profile loaded — update fields as needed'
            : 'Complete your profile before generating proposals — this data populates every AI draft'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <FieldGroup label="Business Identity">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company Name *</label>
              <input required className="input" placeholder="ABC Electric LLC" {...f('company_name')} />
            </div>
            <div>
              <label className="label">Owner / Principal</label>
              <input className="input" placeholder="John Smith" {...f('owner_name')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">UEI Number</label>
              <input className="input font-mono" placeholder="ABC123456789" {...f('uei_number')} />
            </div>
            <div>
              <label className="label">CAGE Code</label>
              <input className="input font-mono" placeholder="1ABC2" {...f('cage_code')} />
            </div>
            <div>
              <label className="label">EIN</label>
              <input className="input font-mono" placeholder="XX-XXXXXXX" {...f('ein')} />
            </div>
          </div>
        </FieldGroup>

        <FieldGroup label="Contact & Address">
          <div>
            <label className="label">Street Address</label>
            <input className="input" placeholder="123 Main Street" {...f('address')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" placeholder="Jackson" {...f('city')} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" placeholder="MS" {...f('state')} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input className="input" placeholder="39201" {...f('zip')} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="(601) 555-0100" {...f('phone')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="info@company.com" {...f('email')} />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" placeholder="www.company.com" {...f('website')} />
            </div>
          </div>
        </FieldGroup>

        <FieldGroup label="Certifications & Capabilities">
          <div>
            <label className="label">Certifications <span className="text-slate-500">(comma separated)</span></label>
            <input className="input" {...f('certifications')} />
            <p className="text-slate-500 text-xs mt-1">e.g. 8(a), Small Business, Black-Owned, MBE, DBE</p>
          </div>
          <div>
            <label className="label">NAICS Codes <span className="text-slate-500">(comma separated)</span></label>
            <input className="input font-mono" {...f('naics_codes')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Bonding Capacity ($)</label>
              <input type="number" className="input" placeholder="2000000" {...f('bonding_capacity', 'number')} />
            </div>
            <div>
              <label className="label">Years in Business</label>
              <input type="number" className="input" placeholder="10" {...f('years_in_business', 'number')} />
            </div>
            <div>
              <label className="label">Employees</label>
              <input type="number" className="input" placeholder="25" {...f('employee_count', 'number')} />
            </div>
          </div>
        </FieldGroup>

        <div className="flex items-center gap-4 pt-1">
          <button type="submit" className="btn-primary px-8 py-2.5 text-base">
            Save Profile
          </button>
          {saved && (
            <span className="text-green-400 text-sm font-medium">✓ Profile saved successfully</span>
          )}
        </div>
      </form>
    </div>
  );
}
