import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '236116', label: '236116 — Multifamily Construction' },
  { value: '236115', label: '236115 — Single-Family Construction' },
  { value: '236220', label: '236220 — Commercial Construction' },
  { value: '237310', label: '237310 — Highway/Bridge Construction' },
  { value: '333120', label: '333120 — Construction Machinery Mfg' },
  { value: '532412', label: '532412 — Equipment Rental' },
  { value: '541320', label: '541320 — Landscape Architecture' },
  { value: '561730', label: '561730 — Landscaping Services' },
];

const EMPTY = {
  company_name: '', owner_name: '', uei_number: '', cage_code: '', ein: '',
  address: '', city: '', state: '', zip: '', phone: '', email: '', website: '',
  poc_name: '', poc_title: '', poc_phone: '', poc_email: '',
  certifications: 'Small Business, Black-Owned, MBE',
  primary_naics: '236220', all_naics: '236116,236115,236220,237310,333120,532412,541320,561730',
  bonding_capacity: '', years_in_business: '', employee_count: '',
  capabilities_narrative: '', past_performance: '',
};

function completionPct(p) {
  const fields = ['company_name','uei_number','cage_code','bonding_capacity','years_in_business','address','phone','email','poc_name'];
  return Math.round(fields.filter(f => p[f] && String(p[f]).trim()).length / fields.length * 100);
}

function missingFields(p) {
  const labels = {
    company_name:      'Company Name',
    uei_number:        'UEI Number',
    cage_code:         'CAGE Code',
    bonding_capacity:  'Bonding Capacity',
    years_in_business: 'Years in Business',
    address:           'Address',
    phone:             'Phone',
    email:             'Email',
    poc_name:          'Point of Contact',
  };
  return Object.entries(labels).filter(([k]) => !p[k] || !String(p[k]).trim()).map(([,v]) => v);
}

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

// Section defined OUTSIDE CompanySetup to prevent remount on every keystroke
function Section({ icon, title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
      <h3 className="text-gray-900 font-semibold text-sm flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  );
}

export default function CompanySetup() {
  const [profile, setProfile] = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    authFetch(`${BASE_URL}/api/company`)
      .then(r => r.json())
      .then(d => { if (d?.company_name) setProfile({ ...EMPTY, ...d }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key, val) { setProfile(p => ({ ...p, [key]: val })); }

  async function save() {
    setSaving(true); setSaved(false);
    try {
      const r = await authFetch(`${BASE_URL}/api/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const d = await r.json();
      if (d.error) alert(d.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  const pct     = completionPct(profile);
  const missing = missingFields(profile);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 text-xl font-bold">Company Profile</h2>
          <p className="text-gray-500 text-sm mt-0.5">This data populates every AI-generated proposal — keep it accurate</p>
        </div>
        <button onClick={() => setPreview(p => !p)}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {preview ? '✕ Close Preview' : '👁 AI Preview'}
        </button>
      </div>

      {/* Completion tracker */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-700 text-sm font-semibold">Profile Completeness</span>
          <span className={`text-sm font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missing.map(m => (
              <span key={m} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Missing: {m}</span>
            ))}
          </div>
        )}
        {pct < 60 && <p className="text-amber-600 text-xs mt-3 font-medium">⚠ Profile below 60% — complete before generating proposals</p>}
        {pct >= 80 && <p className="text-emerald-600 text-xs mt-3 font-medium">✓ Profile is comprehensive</p>}
      </div>

      {/* AI Preview */}
      {preview && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 font-mono text-xs space-y-1.5">
          <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-3">What the AI sees when generating proposals:</p>
          {[
            ['Company',        profile.company_name],
            ['Owner',          profile.owner_name],
            ['UEI',            profile.uei_number],
            ['CAGE',           profile.cage_code],
            ['Certifications', profile.certifications],
            ['Primary NAICS',  profile.primary_naics],
            ['Bonding',        profile.bonding_capacity ? `$${Number(profile.bonding_capacity).toLocaleString()}` : ''],
            ['Years',          profile.years_in_business],
            ['POC',            `${profile.poc_name} · ${profile.poc_title}`],
          ].map(([k, v]) => (
            <p key={k}>
              <span className="text-gray-500">{k}:</span>{' '}
              <span className={v?.trim() ? 'text-white' : 'text-red-400'}>{v?.trim() || '[BLANK]'}</span>
            </p>
          ))}
        </div>
      )}

      {/* Business Identity */}
      <Section icon="🏢" title="Business Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'company_name', label: 'Company Name *', placeholder: 'Lumen Capital LLC' },
            { key: 'owner_name',   label: 'Owner / Principal', placeholder: 'Marlon Malbry' },
            { key: 'uei_number',   label: 'UEI Number', placeholder: '12 character UEI' },
            { key: 'cage_code',    label: 'CAGE Code', placeholder: '5 character CAGE' },
            { key: 'ein',          label: 'EIN', placeholder: 'XX-XXXXXXX' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input
                value={profile[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Contact & Address */}
      <Section icon="📍" title="Contact & Address">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Street Address</label>
            <input value={profile.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" className={inputCls} />
          </div>
          {[
            { key: 'city',    label: 'City',    placeholder: 'Jackson' },
            { key: 'state',   label: 'State',   placeholder: 'MS' },
            { key: 'zip',     label: 'ZIP',     placeholder: '39201' },
            { key: 'phone',   label: 'Phone',   placeholder: '(601) 555-0100' },
            { key: 'email',   label: 'Email',   placeholder: 'contact@lumencapital.com' },
            { key: 'website', label: 'Website', placeholder: 'https://lumencapital.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={profile[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </Section>

      {/* Point of Contact */}
      <Section icon="👤" title="Point of Contact for Proposals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'poc_name',  label: 'Full Name',  placeholder: 'Marlon Malbry' },
            { key: 'poc_title', label: 'Title',      placeholder: 'CEO / Principal' },
            { key: 'poc_phone', label: 'Phone',      placeholder: '(601) 555-0100' },
            { key: 'poc_email', label: 'Email',      placeholder: 'marlon@lumencapital.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={profile[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </Section>

      {/* Certifications & Capabilities */}
      <Section icon="🏆" title="Certifications & Capabilities">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Certifications <span className="text-gray-400 normal-case font-normal">— comma separated</span>
            </label>
            <input
              value={profile.certifications}
              onChange={e => set('certifications', e.target.value)}
              placeholder="Small Business, Black-Owned, MBE, DBE"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Primary NAICS</label>
            <select value={profile.primary_naics} onChange={e => set('primary_naics', e.target.value)} className={inputCls}>
              {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">All NAICS Codes</label>
            <input
              value={profile.all_naics}
              onChange={e => set('all_naics', e.target.value)}
              placeholder="236220,237310,561730"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Bonding Capacity ($)</label>
            <input
              type="number"
              value={profile.bonding_capacity}
              onChange={e => set('bonding_capacity', e.target.value)}
              placeholder="500000"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Years in Business</label>
            <input
              type="number"
              value={profile.years_in_business}
              onChange={e => set('years_in_business', e.target.value)}
              placeholder="5"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Employees</label>
            <input
              type="number"
              value={profile.employee_count}
              onChange={e => set('employee_count', e.target.value)}
              placeholder="10"
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Capabilities Narrative</label>
            <textarea
              rows={4}
              value={profile.capabilities_narrative}
              onChange={e => set('capabilities_narrative', e.target.value)}
              placeholder="Describe your company's core capabilities, equipment, workforce, and competitive advantages..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-y"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Past Performance Summary</label>
            <textarea
              rows={4}
              value={profile.past_performance}
              onChange={e => set('past_performance', e.target.value)}
              placeholder="List 3-5 past projects: agency name, contract value, scope, completion date, POC..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-y"
            />
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-4 pb-6">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</>
            : '💾 Save Profile'
          }
        </button>
        {saved && <span className="text-emerald-600 font-medium text-sm">✓ Profile saved successfully</span>}
      </div>
    </div>
  );
}
