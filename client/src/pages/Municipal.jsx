import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — Construction' },
];

const EMPTY = {
  title: '', agency: '', city: '', naics_code: '238210', posted_date: '',
  response_deadline: '', estimated_value: '', description: '',
  contact_email: '', contact_name: '', bid_number: ''
};

export default function Municipal() {
  const [bids, setBids] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
  }

  function load() {
    fetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(setBids).catch(() => {});
  }
  useEffect(load, []);

  async function submitForm(e) {
    e.preventDefault();
    const r = await fetch(`${BASE_URL}/api/municipal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    });
    const d = await r.json();
    if (d.id) { showToast(`✓ Bid saved — Score: ${d.bid_score}`); setForm(EMPTY); load(); }
    else showToast('Error saving bid', 'error');
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name.replace(/\.[^/.]+$/, ''));
    fd.append('agency', '');
    const r = await fetch(`${BASE_URL}/api/municipal/upload`, { method: 'POST', body: fd });
    const d = await r.json();
    if (d.id) { showToast(`✓ Uploaded — ID: ${d.id}`); load(); }
    else showToast('Upload failed', 'error');
    setUploading(false);
  }

  async function deleteBid(id) {
    if (!confirm('Delete this bid?')) return;
    await fetch(`${BASE_URL}/api/municipal/${id}`, { method: 'DELETE' });
    load();
  }

  const f = key => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Municipal Bids</h1>
        <p className="text-slate-400 text-sm mt-1">Manually enter or upload bid documents received via email</p>
      </div>

      {toast.msg && (
        <div className={`mb-5 text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error'
            ? 'bg-red-900/40 border-red-700 text-red-300'
            : 'bg-green-900/40 border-green-600 text-green-300'
        }`}>{toast.msg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Manual Entry */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-slate-200 font-semibold mb-5">Manual Bid Entry</h2>
          <form onSubmit={submitForm} className="space-y-3">
            <div>
              <label className="label">Bid Title *</label>
              <input required className="input" placeholder="e.g. City Hall Roof Replacement" {...f('title')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Agency *</label><input required className="input" placeholder="City of Jackson" {...f('agency')} /></div>
              <div><label className="label">City</label><input className="input" placeholder="Jackson" {...f('city')} /></div>
            </div>
            <div>
              <label className="label">NAICS Code</label>
              <select className="input" {...f('naics_code')}>
                {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Posted Date</label><input type="date" className="input" {...f('posted_date')} /></div>
              <div><label className="label">Deadline *</label><input type="date" required className="input" {...f('response_deadline')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Est. Value ($)</label><input type="number" className="input" placeholder="250000" {...f('estimated_value')} /></div>
              <div><label className="label">Bid Number</label><input className="input" placeholder="RFP-2026-001" {...f('bid_number')} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Contact Name</label><input className="input" {...f('contact_name')} /></div>
              <div><label className="label">Contact Email</label><input type="email" className="input" {...f('contact_email')} /></div>
            </div>
            <div>
              <label className="label">Scope of Work</label>
              <textarea rows={3} className="input resize-none" placeholder="Describe the work required..." {...f('description')} />
            </div>
            <button type="submit" className="btn-primary w-full mt-1">Save Bid</button>
          </form>
        </div>

        {/* Upload */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col">
          <h2 className="text-slate-200 font-semibold mb-5">Upload Bid Document</h2>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); uploadFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            className={`flex-1 min-h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragOver
                ? 'border-green-500 bg-green-900/20'
                : 'border-slate-600 hover:border-slate-400 hover:bg-slate-700/30'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin" />
                <span className="text-slate-400 text-sm">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center px-6">
                <div className="text-4xl">📎</div>
                <p className="text-slate-300 font-medium text-sm">Drag &amp; drop a file here</p>
                <p className="text-slate-500 text-xs">PDF, PNG, or JPG — max 10MB</p>
                <span className="btn-secondary mt-2 pointer-events-none">Browse Files</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
            onChange={e => uploadFile(e.target.files[0])} />
          <p className="text-slate-500 text-xs mt-3">After uploading, edit the record in the table below to add full details.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-slate-200 font-semibold">Municipal Bids</h2>
          <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full">{bids.length}</span>
        </div>
        <table className="w-full">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="table-header">Score</th>
              <th className="table-header">Title</th>
              <th className="table-header">Agency</th>
              <th className="table-header">Value</th>
              <th className="table-header">Deadline</th>
              <th className="table-header">Status</th>
              <th className="table-header">Action</th>
            </tr>
          </thead>
          <tbody>
            {bids.map(b => (
              <tr key={b.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="table-cell">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    b.bid_score >= 70 ? 'bg-green-900 text-green-300 border-green-700' :
                    b.bid_score >= 40 ? 'bg-yellow-900 text-yellow-300 border-yellow-700' :
                    'bg-slate-700 text-slate-300 border-slate-600'}`}>{b.bid_score}</span>
                </td>
                <td className="table-cell"><span className="text-slate-200 font-medium">{b.title}</span></td>
                <td className="table-cell text-slate-400">{b.agency}</td>
                <td className="table-cell text-slate-300">
                  {b.estimated_value ? `$${(b.estimated_value / 1000).toFixed(0)}K` : '—'}
                </td>
                <td className="table-cell">
                  <span className="text-yellow-400 text-xs">{b.response_deadline?.split('T')[0] || '—'}</span>
                </td>
                <td className="table-cell">
                  <span className="bg-blue-900/50 text-blue-300 border border-blue-700 text-xs px-2 py-0.5 rounded-full capitalize">{b.status}</span>
                </td>
                <td className="table-cell">
                  <button onClick={() => deleteBid(b.id)} className="btn-danger">Delete</button>
                </td>
              </tr>
            ))}
            {bids.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-slate-500 text-sm">No municipal bids yet. Add one using the form above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
