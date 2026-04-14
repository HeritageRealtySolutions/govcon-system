import React, { useEffect, useState, useRef } from 'react';
import { BASE_URL } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — General Construction' },
];

const EMPTY = {
  title: '', agency: '', city: '', naics_code: '238210', posted_date: '',
  response_deadline: '', estimated_value: '', description: '',
  contact_email: '', contact_name: '', bid_number: ''
};

const INTAKE_TABS = [
  { id: 'url',    label: '🔗 Paste URL',      desc: 'Any government portal link' },
  { id: 'pdf',    label: '📎 Upload Document', desc: 'PDF, PNG, or JPG' },
  { id: 'text',   label: '📋 Paste Text',      desc: 'Copy/paste bid details' },
  { id: 'manual', label: '✏️ Manual Entry',    desc: 'Type it in yourself' },
];

const STATUS_COLORS = {
  identified: 'bg-slate-700 text-slate-300 border-slate-600',
  qualifying:  'bg-blue-900/50 text-blue-300 border-blue-700',
  bidding:     'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  submitted:   'bg-purple-900/50 text-purple-300 border-purple-700',
  awarded:     'bg-green-900/50 text-green-300 border-green-700',
  lost:        'bg-red-900/50 text-red-300 border-red-700',
};

export default function Municipal() {
  const [bids, setBids]           = useState([]);
  const [form, setForm]           = useState(EMPTY);
  const [toast, setToast]         = useState({ msg: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('url');
  const [urlInput, setUrlInput]   = useState('');
  const [textInput, setTextInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 5000);
  }

  function load() {
    fetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(setBids).catch(() => {});
  }
  useEffect(load, []);

  // AI extraction from URL or pasted text
  async function extractFromSource(source, type) {
    setExtracting(true);
    setExtracted(null);
    try {
      const r = await fetch(`${BASE_URL}/api/municipal/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, type })
      });
      const d = await r.json();
      if (d.extracted) {
        setExtracted(d.extracted);
        setForm(prev => ({ ...prev, ...d.extracted }));
        showToast('✓ Bid details extracted — review and confirm below');
      } else {
        showToast(d.error || 'Extraction failed — try manual entry', 'error');
      }
    } catch (e) {
      showToast('Could not reach server', 'error');
    }
    setExtracting(false);
  }

  async function submitForm(e) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch(`${BASE_URL}/api/municipal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const d = await r.json();
    if (d.id) {
      showToast(`✓ Bid saved — Score: ${d.bid_score}`);
      setForm(EMPTY);
      setExtracted(null);
      setUrlInput('');
      setTextInput('');
      load();
    } else showToast('Error saving bid', 'error');
    setSaving(false);
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name.replace(/\.[^/.]+$/, ''));
    const r = await fetch(`${BASE_URL}/api/municipal/upload`, { method: 'POST', body: fd });
    const d = await r.json();
    if (d.extracted) {
      setExtracted(d.extracted);
      setForm(prev => ({ ...prev, ...d.extracted }));
      showToast('✓ Document parsed — review and confirm below');
    } else if (d.id) {
      showToast(`✓ Uploaded — ID: ${d.id}`);
      load();
    } else showToast('Upload failed', 'error');
    setUploading(false);
  }

  async function deleteBid(id) {
    if (!confirm('Delete this bid?')) return;
    await fetch(`${BASE_URL}/api/municipal/${id}`, { method: 'DELETE' });
    load();
  }

  const f = key => ({
    value: form[key],
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value }))
  });

  const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";
  const labelCls = "block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Submit a Bid</h1>
        <p className="text-slate-400 text-sm mt-1">
          Paste a URL, upload a document, or enter manually — AI extracts the details automatically
        </p>
      </div>

      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error'
            ? 'bg-red-900/40 border-red-700/60 text-red-300'
            : 'bg-green-900/40 border-green-600/60 text-green-300'
        }`}>{toast.msg}</div>
      )}

      {/* Intake Method Tabs */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="grid grid-cols-4 border-b border-slate-700/60">
          {INTAKE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 text-left transition-colors border-r border-slate-700/60 last:border-r-0 ${
                activeTab === tab.id
                  ? 'bg-green-600/10 border-b-2 border-b-green-500'
                  : 'hover:bg-slate-700/40'
              }`}
            >
              <div className={`text-sm font-semibold ${activeTab === tab.id ? 'text-green-300' : 'text-slate-300'}`}>
                {tab.label}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">{tab.desc}</div>
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* URL INTAKE */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Bid / Solicitation URL</label>
                <div className="flex gap-3">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="https://sam.gov/opp/... or any government portal URL"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                  />
                  <button
                    onClick={() => extractFromSource(urlInput, 'url')}
                    disabled={!urlInput.trim() || extracting}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {extracting
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Extracting...</>
                      : '⚡ Extract Details'
                    }
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Works with SAM.gov, state procurement portals, city websites, and most government bid pages
                </p>
              </div>
            </div>
          )}

          {/* PDF UPLOAD */}
          {activeTab === 'pdf' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); uploadFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
              className={`min-h-52 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-green-500 bg-green-900/20'
                  : 'border-slate-600 hover:border-slate-400 hover:bg-slate-700/20'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin" />
                  <span className="text-slate-300 text-sm font-medium">Parsing document...</span>
                  <span className="text-slate-500 text-xs">AI is extracting bid details</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center px-8">
                  <div className="text-5xl">📎</div>
                  <div>
                    <p className="text-slate-200 font-semibold text-sm">Drop your bid document here</p>
                    <p className="text-slate-500 text-xs mt-1">PDF, PNG, JPG — max 10MB</p>
                  </div>
                  <span className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                    Browse Files
                  </span>
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
            onChange={e => uploadFile(e.target.files[0])} />

          {/* PASTE TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Paste Bid Details</label>
                <textarea
                  rows={8}
                  className={`${inputCls} resize-none`}
                  placeholder="Paste the full text of the bid solicitation, RFP, or email you received. AI will extract the title, agency, scope, deadline, value, and contact information automatically."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                />
              </div>
              <button
                onClick={() => extractFromSource(textInput, 'text')}
                disabled={!textInput.trim() || extracting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {extracting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Extracting...</>
                  : '⚡ Extract Details'
                }
              </button>
            </div>
          )}

          {/* MANUAL ENTRY (tab only — form below always visible after extraction) */}
          {activeTab === 'manual' && (
            <p className="text-slate-400 text-sm">Fill in the form below manually.</p>
          )}
        </div>
      </div>

      {/* Extracted Summary Banner */}
      {extracted && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-green-400 text-xl mt-0.5">✓</span>
          <div>
            <p className="text-green-300 font-semibold text-sm">Details extracted — review and save below</p>
            <p className="text-slate-400 text-xs mt-1">
              AI parsed: <span className="text-white">{extracted.title || 'title'}</span>
              {extracted.agency && <> · <span className="text-white">{extracted.agency}</span></>}
              {extracted.response_deadline && <> · Due <span className="text-white">{extracted.response_deadline}</span></>}
              {extracted.estimated_value && <> · <span className="text-white">${Number(extracted.estimated_value).toLocaleString()}</span></>}
            </p>
          </div>
        </div>
      )}

      {/* Review & Save Form — always visible */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {extracted ? '📝 Review Extracted Details' : '📝 Bid Details'}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {extracted ? 'Confirm or edit before saving' : 'Enter bid information'}
            </p>
          </div>
          {extracted && (
            <button onClick={() => { setExtracted(null); setForm(EMPTY); }}
              className="text-slate-500 hover:text-slate-300 text-xs">
              Clear
            </button>
          )}
        </div>

        <form onSubmit={submitForm} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Bid Title *</label>
            <input required className={inputCls} placeholder="e.g. City Hall Electrical Upgrade" {...f('title')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Agency / Issuer *</label>
              <input required className={inputCls} placeholder="City of Jackson" {...f('agency')} />
            </div>
            <div>
              <label className={labelCls}>City / Location</label>
              <input className={inputCls} placeholder="Jackson, MS" {...f('city')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>NAICS Code</label>
              <select className={inputCls} {...f('naics_code')}>
                {NAICS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Bid / RFP Number</label>
              <input className={inputCls} placeholder="RFP-2026-001" {...f('bid_number')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Posted Date</label>
              <input type="date" className={inputCls} {...f('posted_date')} />
            </div>
            <div>
              <label className={labelCls}>Deadline *</label>
              <input type="date" required className={inputCls} {...f('response_deadline')} />
            </div>
            <div>
              <label className={labelCls}>Estimated Value ($)</label>
              <input type="number" className={inputCls} placeholder="250000" {...f('estimated_value')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Name</label>
              <input className={inputCls} placeholder="John Smith" {...f('contact_name')} />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input type="email" className={inputCls} placeholder="john@city.gov" {...f('contact_email')} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Scope of Work / Description</label>
            <textarea rows={4} className={`${inputCls} resize-none`}
              placeholder="Full scope of work, technical requirements, and any special conditions..."
              {...f('description')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Saving...</>
                : '💾 Save Bid to Pipeline'
              }
            </button>
            <button type="button" onClick={() => { setForm(EMPTY); setExtracted(null); }}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors">
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Bids Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Submitted Bids</h2>
          <span className="bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{bids.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/40">
              <tr>
                {['Score','Title','Agency','Value','Deadline','Status','Action'].map(h => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {bids.map(b => (
                <tr key={b.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                      b.bid_score >= 70 ? 'bg-green-900/50 text-green-300 border-green-700' :
                      b.bid_score >= 40 ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' :
                      'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>{b.bid_score}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium text-sm max-w-xs truncate">{b.title}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{b.agency}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    {b.estimated_value ? `$${(b.estimated_value / 1000).toFixed(0)}K` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-yellow-400 text-xs">{b.response_deadline?.split('T')[0] || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[b.status] || STATUS_COLORS.identified}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteBid(b.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {bids.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <p className="text-slate-500 text-sm">No bids submitted yet</p>
                    <p className="text-slate-600 text-xs mt-1">Use the intake tools above to add your first bid</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
