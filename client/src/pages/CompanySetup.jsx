import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical Contractors' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing Contractors' },
  { value: '561730', label: '561730 — Landscaping Services' },
  { value: '236220', label: '236220 — General Construction' },
];

const EMPTY = {
  company_name: '', owner_name: '', uei_number: '', cage_code: '', ein: '',
  address: '', city: '', state: '', zip: '', phone: '', email: '', website: '',
  poc_name: '', poc_title: '', poc_phone: '', poc_email: '',
  certifications: '8(a), Small Business, Black-Owned, MBE',
  primary_naics: '238210', all_naics: '238210,238220,238160,561730,236220',
  bonding_capacity: '', years_in_business: '', employee_count: '',
  capabilities_narrative: '', past_performance: '',
};

function completionPct(profile) {
  const fields = ['company_name','uei_number','cage_code','bonding_capacity','years_in_business','address','phone','email','poc_name'];
  const filled = fields.filter(f => profile[f] && String(profile[f]).trim());
  return Math.round((filled.length / fields.length) * 100);
}

function missingFields(profile) {
  const labels = {
    company_name: 'Company Name', uei_number: 'UEI Number', cage_code: 'CAGE Code',
    bonding_capacity: 'Bonding Capacity', years_in_business: 'Years in Business',
    address: 'Address', phone: 'Phone', email: 'Email', poc_name: 'Point of Contact',
  };
  return Object.entries(labels)
    .filter(([k]) => !profile[k] || !String(profile[k]).trim())
    .map(([, v]) => v);
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
      .then(d => {
        if (d && d.company_name) setProfile({ ...EMPTY, ...d });
      })
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
  const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Profile</h1>
          <p className="text-slate-400 text-sm mt-1">This data populates every AI-generated proposal — keep it accurate and complete</p>
        </div>
        <button onClick={() => setPreview(p => !p)}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          {preview ? '✕ Close Preview' : '👁 AI Preview'}
        </button>
      </div>

      {/* Completion tracker */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-300 text-sm font-semibold">Profile Completeness</span>
          <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missing.map(m => (
              <span key={m} className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">Missing: {m}</span>
            ))}
          </div>
        )}
        {pct < 60 && (
          <p className="text-yellow-400 text-xs mt-3 font-medium">
            ⚠ Profile below 60% — AI proposals will lack company-specific details. Complete this before generating proposals.
          </p>
        )}
        {pct >= 80 && (
          <p className="text-green-400 text-xs mt-3 font-medium">✓ Profile is comprehensive — AI proposals will be well-personalized</p>
        )}
      </div>

      {/* AI Preview */}
      {preview && (
        <div className="bg-slate-900/60 border border-green-700/40 rounded-xl p-5 font-mono text-xs text-slate-400 space-y-1">
          <p className="text-green-400 font-bold text-xs uppercase tracking-wider mb-3">What the AI sees when generating your proposals:</p>
          <p><span className="text-slate-500">Company:</span> <span className="text-white">{profile.company_name || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">Owner:</span> <span className="text-white">{profile.owner_name || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">UEI:</span> <span className="text-white">{profile.uei_number || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">CAGE:</span> <span className="text-white">{profile.cage_code || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">Certifications:</span> <span className="text-white">{profile.certifications || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">Primary NAICS:</span> <span className="text-white">{profile.primary_naics}</span></p>
          <p><span className="text-slate-500">Bonding:</span> <span className="text-white">{profile.bonding_capacity ? `$${Number(profile.bonding_capacity).toLocaleString()}` : '[BLANK]'}</span></p>
          <p><span className="text-slate-500">Years:</span> <span className="text-white">{profile.years_in_business || '[BLANK]'}</span></p>
          <p><span className="text-slate-500">POC:</span> <span className="text-white">{profile.poc_name || '[BLANK]'} · {profile.poc_title || '[BLANK]'}</span></p>
        </div>
      )}

      {/* Form sections */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">🏢 Business Identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'company_name', label: 'Company Name *', placeholder: 'Lumen Capital LLC' },
            { key: 'owner_name',   label: 'Owner / Principal', placeholder: 'Marlon Frizell' },
            { key: 'uei_number',   label: 'UEI Number', placeholder: '12 character UEI' },
            { key: 'cage_code',    label: 'CAGE Code', placeholder: '5 character CAGE' },
            { key: 'ein',          label: 'EIN', placeholder: 'XX-XXXXXXX' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={profile[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">📍 Contact & Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'address', label: 'Street Address', placeholder: '123 Main St', span: 2 },
            { key: 'city',    label: 'City',    placeholder: 'Jackson' },
            { key: 'state',   label: 'State',   placeholder: 'MS' },
            { key: 'zip',     label: 'ZIP',     placeholder: '39201' },
            { key: 'phone',   label: 'Phone',   placeholder: '(601) 555-0100' },
            { key: 'email',   label: 'Email',   placeholder: 'contact@lumencapital.com' },
            { key: 'website', label: 'Website', placeholder: 'https://lumencapital.com' },
          ].map(f => (
            <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={profile[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">👤 Point of Contact for Proposals</h2>
        <p className="text-slate-500 text-xs -mt-3">This person is named in proposal cover letters and submission headers</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'poc_name',  label: 'Full Name',  placeholder: 'Marlon Frizell' },
            { key: 'poc_title', label: 'Title',      placeholder: 'CEO / Principal' },
            { key: 'poc_phone', label: 'POC Phone',  placeholder: '(601) 555-0100' },
            { key: 'poc_email', label: 'POC Email',  placeholder: 'marlon@lumencapital.com' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
              <input value={profile[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">🏆 Certifications & Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Certifications</label>
            <input value={profile.certifications} onChange={e => set('certifications', e.target.value)}
              placeholder="8(a), Small Business, Black-Owned, MBE, DBE" className={inputCls} />
            <p className="text-slate-600 text-xs mt-1">Comma separated</p>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Primary NAICS</label>
            <select value={profile.primary_naics} onChange={e => set('primary_naics', e.target.value)} className={inputCls}>
              {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">All NAICS Codes</label>
            <input value={profile.all_naics} onChange={e => set('all_naics', e.target.value)}
              placeholder="238210,238220,238160" className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Bonding Capacity ($) <span className="text-slate-600 normal-case font-normal">Critical for federal bids</span></label>
            <input type="number" value={profile.bonding_capacity} onChange={e => set('bonding_capacity', e.target.value)}
              placeholder="500000" className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Years in Business</label>
            <input type="number" value={profile.years_in_business} onChange={e => set('years_in_business', e.target.value)}
              placeholder="5" className={inputCls} />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Employees</label>
            <input type="number" value={profile.employee_count} onChange={e => set('employee_count', e.target.value)}
              placeholder="10" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Capabilities Narrative</label>
            <textarea rows={4} value={profile.capabilities_narrative} onChange={e => set('capabilities_narrative', e.target.value)}
              placeholder="Describe your company's core capabilities, equipment, workforce, and competitive advantages..."
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 resize-y" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Past Performance Summary</label>
            <textarea rows={4} value={profile.past_performance} onChange={e => set('past_performance', e.target.value)}
              placeholder="List 3-5 past projects: agency name, contract value, scope, completion date, POC..."
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 resize-y" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</> : '💾 Save Profile'}
        </button>
        {saved && <span className="text-green-400 font-medium">✓ Profile saved successfully</span>}
      </div>
    </div>
  );
}
