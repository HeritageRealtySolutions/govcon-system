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

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

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

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 4000); }
  function loadBids() { authFetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(d => setBids(Array.isArray(d) ? d : [])).catch(() => {}); }
  useEffect(() => { loadBids(); }, []);
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function extractFromUrl() {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/municipal/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
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
      const r = await authFetch(`${BASE_URL}/api/municipal/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: pasteText }) });
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
      const r = await fetch(`${BASE_URL}/api/municipal/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
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
      const r = await authFetch(`${BASE_URL}/api/municipal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Submit a Bid</h2>
        <p className="text-gray-500 text-sm mt-0.5">Add any bid — paste a URL, upload a PDF, paste text, or enter manually</p>
      </div>

      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>{toast.msg}</div>
      )}

      {/* Intake tabs */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'url',    label: '🔗 URL' },
          { id: 'upload', label: '📄 PDF' },
          { id: 'paste',  label: '📋 Paste Text' },
          { id: 'manual', label: '✏️ Manual' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'url' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-gray-900 font-semibold text-sm">Extract from URL</h3>
          <p className="text-gray-500 text-xs">Paste any bid portal URL and AI will extract the key fields automatically.</p>
          <div className="flex gap-3">
            <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && extractFromUrl()}
              placeholder="https://procurement.example.gov/bid/12345" className={inputCls} />
            <button onClick={extractFromUrl} disabled={loading || !url.trim()}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors whitespace-nowrap">
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Extracting...</> : '⚡ Extract'}
            </button>
          </div>
          <p className="text-gray-400 text-xs">Requires Anthropic API key</p>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-gray-900 font-semibold text-sm">Upload PDF / Image</h3>
          <label htmlFor="bid-file" className="block border-2 border-dashed border-gray-300 hover:border-gray-900 rounded-xl p-8 text-center cursor-pointer transition-colors">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} className="hidden" id="bid-file" />
            <p className="text-3xl mb-3">📄</p>
            <p className="text-gray-700 text-sm font-medium">{file ? file.name : 'Click to select PDF or image'}</p>
            <p className="text-gray-400 text-xs mt-1">PDF, PNG, JPG supported</p>
          </label>
          {file && (
            <button onClick={uploadFile} disabled={loading}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Parsing...</> : '⚡ Parse Document'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-gray-900 font-semibold text-sm">Paste Bid Text</h3>
          <textarea rows={10} value={pasteText} onChange={e => setPasteText(e.target.value)}
            placeholder="Paste the full bid text here..."
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm leading-relaxed resize-y focus:outline-none focus:border-gray-900" />
          <button onClick={extractFromText} disabled={loading || !pasteText.trim()}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Extracting...</> : '⚡ Extract Fields'}
          </button>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-5">
          <h3 className="text-gray-900 font-semibold text-sm">Bid Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'title',            label: 'Title *',              placeholder: 'Bid title',            type: 'text' },
              { key: 'agency',           label: 'Agency / Entity',      placeholder: 'Issuing agency',       type: 'text' },
              { key: 'bid_number',       label: 'Bid / Sol. Number',    placeholder: 'Bid number',           type: 'text' },
              { key: 'response_deadline',label: 'Response Deadline',    placeholder: '',                     type: 'date' },
              { key: 'estimated_value',  label: 'Estimated Value ($)',  placeholder: '0',                    type: 'number' },
              { key: 'contact_name',     label: 'Contact Name',         placeholder: 'Contracting officer',  type: 'text' },
              { key: 'contact_email',    label: 'Contact Email',        placeholder: 'officer@agency.gov',   type: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setField(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
              </div>
            ))}
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
              <select value={form.naics_code} onChange={e => setField('naics_code', e.target.value)} className={inputCls}>
                {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Source URL</label>
              <input value={form.source_url} onChange={e => setField('source_url', e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Description / Scope</label>
              <textarea rows={4} value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="Scope of work, requirements, specifications..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-y" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Internal Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)}
                placeholder="Strategy notes, contacts, concerns..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-y" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={saveBid} disabled={saving}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
              {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</> : '💾 Save Bid'}
            </button>
            <button onClick={() => setForm(EMPTY_FORM)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">Clear</button>
          </div>
        </div>
      )}

      {bids.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-900 font-semibold text-sm">Submitted Bids</h3>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{bids.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {bids.map(bid => (
              <div key={bid.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <button onClick={() => setExpandedId(expandedId === bid.id ? null : bid.id)} className="text-left flex-1 min-w-0">
                    <p className="text-gray-900 font-medium text-sm truncate">{bid.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{bid.agency || '—'} · {bid.naics_code}</p>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {bid.estimated_value && <span className="text-gray-900 text-xs font-bold">{fmt(bid.estimated_value)}</span>}
                    {bid.response_deadline && <span className="text-gray-400 text-xs">{bid.response_deadline.split('T')[0]}</span>}
                    <button onClick={() => deleteBid(bid.id)} className="text-gray-300 hover:text-red-500 text-xs transition-colors">✕</button>
                  </div>
                </div>
                {expandedId === bid.id && bid.description && (
                  <p className="text-gray-500 text-xs mt-3 leading-relaxed">{bid.description.substring(0, 400)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
