import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const EMPTY = {
  company_name: '', owner_name: '', uei_number: '', cage_code: '', ein: '',
  address: '', city: '', state: 'MS', zip: '', phone: '', email: '', website: '',
  certifications: '8(a), Small Business, Black-Owned',
  naics_codes: '238210,238220,238160,561730,236220',
  bonding_capacity: '', years_in_business: '', employee_count: '',
  poc_name: '', poc_title: '', poc_phone: '', poc_email: '',
  primary_naics: '238210',
};

const COMPLETION_FIELDS = [
  { key: 'company_name',    label: 'Company Name',     weight: 15 },
  { key: 'uei_number',      label: 'UEI Number',       weight: 15 },
  { key: 'cage_code',       label: 'CAGE Code',        weight: 10 },
  { key: 'certifications',  label: 'Certifications',   weight: 10 },
  { key: 'bonding_capacity',label: 'Bonding Capacity', weight: 15 },
  { key: 'years_in_business',label: 'Years in Business',weight: 10 },
  { key: 'address',         label: 'Address',          weight: 5  },
  { key: 'phone',           label: 'Phone',            weight: 5  },
  { key: 'email',           label: 'Email',            weight: 5  },
  { key: 'poc_name',        label: 'Point of Contact', weight: 10 },
];

function completionScore(form) {
  const earned = COMPLETION_FIELDS
    .filter(f => form[f.key] && String(form[f.key]).trim())
    .reduce((s, f) => s + f.weight, 0);
  return Math.min(earned, 100);
}

function FieldGroup({ label, icon, children }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/60 flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h2 className="text-white font-semibold text-sm">{label}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

export default function CompanySetup() {
  const [form, setForm]   = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/company`).then(r => r.json()).then(d => {
      if (d && d.company_name) { setForm({ ...EMPTY, ...d }); setLoaded(true); }
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch(`${BASE_URL}/api/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.id || d.success) {
      setSaved(true);
      setLoaded(true);
      setTimeout(() => setSaved(false), 4000);
    }
    setSaving(false);
  }

  const f = (key, type = 'text') => ({
    type,
    value: form[key] || '',
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  });

  const score       = completionScore(form);
  const scoreColor  = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const barColor    = score >= 80 ? 'bg-green-500'   : score >= 50 ? 'bg-yellow-500'   : 'bg-red-500';
  const missingFields = COMPLETION_FIELDS.filter(f => !form[f.key] || !String(form[f.key]).trim());

  const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";
  const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Profile</h1>
          <p className="text-slate-400 text-sm mt-1">
            This data populates every AI-generated proposal — keep it accurate and complete
          </p>
        </div>
        <button
          onClick={() => setPreview(p => !p)}
          className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        >
          {preview ? 'Hide Preview' : '👁 AI Preview'}
        </button>
      </div>

      {/* Completion Score */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-semibold text-sm">Profile Completeness</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Higher completion = better AI proposals
            </p>
          </div>
          <span className={`text-3xl font-bold ${scoreColor}`}>{score}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Missing fields */}
        {missingFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map(f => (
              <span key={f.key}
                className="text-xs bg-slate-700/60 text-slate-400 border border-slate-600/60 px-2 py-0.5 rounded-full">
                Missing: {f.label}
              </span>
            ))}
          </div>
        )}

        {score === 100 && (
          <p className="text-green-400 text-sm font-medium">✓ Profile complete — AI has everything it needs</p>
        )}
      </div>

      {/* AI Preview */}
      {preview && (
        <div className="bg-slate-900/60 border border-green-700/30 rounded-xl p-5">
          <h3 className="text-green-400 text-xs font-bold uppercase tracking-wider mb-3">
            What the AI sees when generating your proposals
          </h3>
          <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
{`Company: ${form.company_name || '[missing]'}
Owner: ${form.owner_name || '[missing]'}
UEI: ${form.uei_number || '[missing]'} | CAGE: ${form.cage_code || '[missing]'}
Certifications: ${form.certifications || '[missing]'}
Bonding Capacity: ${form.bonding_capacity ? '$' + Number(form.bonding_capacity).toLocaleString() : '[missing]'}
Years in Business: ${form.years_in_business || '[missing]'}
Employees: ${form.employee_count || '[missing]'}
Primary NAICS: ${form.primary_naics || '[missing]'}
NAICS Codes: ${form.naics_codes || '[missing]'}
Location: ${[form.city, form.state, form.zip].filter(Boolean).join(', ') || '[missing]'}
POC: ${form.poc_name || '[missing]'} — ${form.poc_email || '[missing]'}`}
          </pre>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">

        {/* Business Identity */}
        <FieldGroup label="Business Identity" icon="🏢">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company Name *</label>
              <input required className={inputCls} placeholder="Lumen Capital LLC" {...f('company_name')} />
            </div>
            <div>
              <label className={labelCls}>Owner / Principal</label>
              <input className={inputCls} placeholder="Marlon Smith" {...f('owner_name')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>UEI Number</label>
              <input className={`${inputCls} font-mono`} placeholder="ABC123456789" {...f('uei_number')} />
            </div>
            <div>
              <label className={labelCls}>CAGE Code</label>
              <input className={`${inputCls} font-mono`} placeholder="1ABC2" {...f('cage_code')} />
            </div>
            <div>
              <label className={labelCls}>EIN</label>
              <input className={`${inputCls} font-mono`} placeholder="XX-XXXXXXX" {...f('ein')} />
            </div>
          </div>
        </FieldGroup>

        {/* Contact & Address */}
        <FieldGroup label="Contact & Address" icon="📍">
          <div>
            <label className={labelCls}>Street Address</label>
            <input className={inputCls} placeholder="123 Main Street" {...f('address')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>City</label>
              <input className={inputCls} placeholder="Jackson" {...f('city')} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input className={inputCls} placeholder="MS" {...f('state')} />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input className={inputCls} placeholder="39201" {...f('zip')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} placeholder="(601) 555-0100" {...f('phone')} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} placeholder="info@lumencapital.com" {...f('email')} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} placeholder="www.lumencapital.com" {...f('website')} />
            </div>
          </div>
        </FieldGroup>

        {/* Point of Contact */}
        <FieldGroup label="Point of Contact for Proposals" icon="👤">
          <p className="text-slate-500 text-xs -mt-1">
            This person is named in proposal cover letters and submission headers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} placeholder="Marlon Smith" {...f('poc_name')} />
            </div>
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} placeholder="Principal / CEO" {...f('poc_title')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>POC Phone</label>
              <input className={inputCls} placeholder="(601) 555-0100" {...f('poc_phone')} />
            </div>
            <div>
              <label className={labelCls}>POC Email</label>
              <input type="email" className={inputCls} placeholder="marlon@lumencapital.com" {...f('poc_email')} />
            </div>
          </div>
        </FieldGroup>

        {/* Certifications & Capabilities */}
        <FieldGroup label="Certifications & Capabilities" icon="🏆">
          <div>
            <label className={labelCls}>Certifications</label>
            <input className={inputCls} {...f('certifications')} />
            <p className="text-slate-600 text-xs mt-1">Comma separated — e.g. 8(a), Small Business, Black-Owned, MBE, DBE</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Primary NAICS</label>
              <select className={inputCls} value={form.primary_naics || '238210'}
                onChange={e => setForm(p => ({ ...p, primary_naics: e.target.value }))}>
                <option value="238210">238210 — Electrical</option>
                <option value="238220">238220 — Plumbing / HVAC</option>
                <option value="238160">238160 — Roofing</option>
                <option value="561730">561730 — Landscaping</option>
                <option value="236220">236220 — General Construction</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>All NAICS Codes</label>
              <input className={`${inputCls} font-mono`} {...f('naics_codes')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Bonding Capacity ($)</label>
              <input type="number" className={inputCls} placeholder="2000000" {...f('bonding_capacity', 'number')} />
              <p className="text-slate-600 text-xs mt-1">Critical for federal bids</p>
            </div>
            <div>
              <label className={labelCls}>Years in Business</label>
              <input type="number" className={inputCls} placeholder="5" {...f('years_in_business', 'number')} />
            </div>
            <div>
              <label className={labelCls}>Employees</label>
              <input type="number" className={inputCls} placeholder="10" {...f('employee_count', 'number')} />
            </div>
          </div>
        </FieldGroup>

        {/* Save */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</>
              : '💾 Save Profile'
            }
          </button>
          {saved && (
            <span className="text-green-400 text-sm font-medium">✓ Profile saved successfully</span>
          )}
          {loaded && !saved && (
            <span className="text-slate-500 text-xs">Last saved profile loaded</span>
          )}
        </div>
      </form>
    </div>
  );
}
