import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — General Construction' },
];

const EMPTY_FORM = {
  title: '', agency: '', naics_code: '238210', bid_number: '',
  response_deadline: '', estimated_value: '', description: '',
  contact_name: '', contact_email: '', source_url: '', notes: '',
};

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Municipal() {
  const [activeTab, setActiveTab]   = useState('url');
  const [bids, setBids]             = useState([]);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [url, setUrl]               = useState('');
  const [pasteText, setPasteText]   = useState('');
  const [file, setFile]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState({ msg: '', type: 'success' });
  const [expandedId, setExpandedId] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
  }

  function loadBids() {
    authFetch(`${BASE_URL}/api/municipal`)
      .then(r => r.json())
      .then(d => setBids(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  useEffect(() => { loadBids(); }, []);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function extractFromUrl() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/municipal/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const d = await r.json();
      if (d.error) showToast(d.error, 'error');
      else { setForm({ ...EMPTY_FORM, ...d }); setActiveTab('manual'); showToast('✓ Fields extracted — review and save'); }
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }

  async function extractFromText() {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/municipal/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      });
      const d = await r.json();
      if (d.error) showToast(d.error, 'error');
      else { setForm({ ...EMPTY_FORM, ...d }); setActiveTab('manual'); showToast('✓ Fields extracted — review and save'); }
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }

  async function uploadFile() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = sessionStorage.getItem('lumen_token') || localStorage.getItem('lumen_token');
      const r = await fetch(`${BASE_URL}/api/municipal/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const d = await r.json();
      if (d.error) showToast(d.error, 'error');
      else { setForm({ ...EMPTY_FORM, ...d }); setActiveTab('manual'); showToast('✓ File parsed — review and save'); }
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }

  async function saveBid() {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/municipal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.error) showToast(d.error, 'error');
      else { showToast('✓ Bid saved'); setForm(EMPTY_FORM); loadBids(); setActiveTab('url'); }
    } catch (e) { showToast(e.message, 'error'); }
    setSaving(false);
  }

  async function deleteBid(id) {
    if (!confirm('Delete this bid?')) return;
    await authFetch(`${BASE_URL}/api/municipal/${id}`, { method: 'DELETE' });
    loadBids();
  }

  const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submit a Bid</h1>
        <p className="text-slate-400 text-sm mt-1">Add any bid — paste a URL, upload a PDF, paste text, or enter manually</p>
      </div>

      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error' ? 'bg-red-900/40 border-red-700/60 text-red-300' : 'bg-green-900/40 border-green-600/60 text-green-300'
        }`}>{toast.msg}</div>
      )}

      <div className="flex gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 w-fit">
        {[
          { id: 'url',    label: '🔗 URL' },
          { id: 'upload', label: '📄 PDF' },
          { id: 'paste',  label: '📋 Paste Text' },
          { id: 'manual', label: '✏️ Manual' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'url' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Extract from URL</h2>
          <p className="text-slate-500 text-xs">Paste any bid portal URL and AI will extract the key fields automatically.</p>
          <div className="flex gap-3">
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && extractFromUrl()}
              placeholder="https://procurement.example.gov/bid/12345" className={inputCls} />
            <button onClick={extractFromUrl} disabled={loading || !url.trim()}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors whitespace-nowrap">
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Extracting...</> : '⚡ Extract'}
            </button>
          </div>
          <p className="text-slate-600 text-xs">Requires Anthropic API key · Works on most government procurement portals</p>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Upload PDF / Image</h2>
          <p className="text-slate-500 text-xs">Upload a bid document and AI will extract the key fields.</p>
          <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-green-600 transition-colors">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])}
              className="hidden" id="bid-file" />
            <label htmlFor="bid-file" className="cursor-pointer">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-slate-300 text-sm font-medium">{file ? file.name : 'Click to select PDF or image'}</p>
              <p className="text-slate-600 text-xs mt-1">PDF, PNG, JPG supported</p>
            </label>
          </div>
          {file && (
            <button onClick={uploadFile} disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Parsing...</> : '⚡ Parse Document'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Paste Bid Text</h2>
          <p className="text-slate-500 text-xs">Paste the bid description, scope of work, or any bid text and AI will extract the fields.</p>
          <textarea rows={10} value={pasteText} onChange={e => setPasteText(e.target.value)}
            placeholder="Paste the full bid text here..."
            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm leading-relaxed resize-y focus:outline-none focus:border-green-500" />
          <button onClick={extractFromText} disabled={loading || !pasteText.trim()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Extracting...</> : '⚡ Extract Fields'}
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-5">
          <h2 className="text-white font-semibold text-sm">Bid Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Bid title" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Agency / Entity</label>
              <input value={form.agency} onChange={e => setField('agency', e.target.value)} placeholder="Issuing agency" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
              <select value={form.naics_code} onChange={e => setField('naics_code', e.target.value)} className={inputCls}>
                {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Bid / Solicitation Number</label>
              <input value={form.bid_number} onChange={e => setField('bid_number', e.target.value)} placeholder="Bid number" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Response Deadline</label>
              <input type="date" value={form.response_deadline} onChange={e => setField('response_deadline', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Estimated Value ($)</label>
              <input type="number" value={form.estimated_value} onChange={e => setField('estimated_value', e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => setField('contact_name', e.target.value)} placeholder="Contracting officer" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Contact Email</label>
              <input type="email" value={form.contact_email} onChange={e => setField('contact_email', e.target.value)} placeholder="officer@agency.gov" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Source URL</label>
              <input value={form.source_url} onChange={e => setField('source_url', e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Description / Scope</label>
              <textarea rows={4} value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="Scope of work, requirements, specifications..."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 resize-y" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Internal Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
                placeholder="Strategy notes, contacts, concerns..."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 resize-y" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={saveBid} disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</> : '💾 Save Bid'}
            </button>
            <button onClick={() => setForm(EMPTY_FORM)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {bids.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Submitted Bids</h2>
            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">{bids.length}</span>
          </div>
          <div className="divide-y divide-slate-700/40">
            {bids.map(bid => (
              <div key={bid.id} className="px-5 py-4 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button onClick={() => setExpandedId(expandedId === bid.id ? null : bid.id)}
                      className="text-left w-full">
                      <p className="text-slate-200 font-medium text-sm truncate">{bid.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{bid.agency || '—'} · {bid.naics_code}</p>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {bid.estimated_value && <span className="text-green-400 text-xs font-bold">{fmt(bid.estimated_value)}</span>}
                    {bid.response_deadline && (
                      <span className="text-slate-500 text-xs">{bid.response_deadline.split('T')[0]}</span>
                    )}
                    <button onClick={() => deleteBid(bid.id)} className="text-slate-600 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                </div>
                {expandedId === bid.id && bid.description && (
                  <p className="text-slate-500 text-xs mt-3 leading-relaxed">{bid.description.substring(0, 400)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
