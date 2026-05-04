import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '236116', label: '236116 — Multifamily Construction' },
  { value: '236115', label: '236115 — Single-Family Construction' },
  { value: '236220', label: '236220 — Commercial Construction' },
  { value: '237310', label: '237310 — Highway/Bridge' },
  { value: '333120', label: '333120 — Construction Machinery Mfg' },
  { value: '532412', label: '532412 — Equipment Rental' },
  { value: '541320', label: '541320 — Landscape Architecture' },
  { value: '561730', label: '561730 — Landscaping' },
];

function fmt(n) {
  if (!n) return '—';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

// Cache for repeated URL extractions in same session
const extractionCache = new Map();

export default function QuickAddWidget() {
  const [open, setOpen]               = useState(false);
  const [step, setStep]               = useState('input'); // input | preview | success
  const [input, setInput]             = useState('');
  const [extracted, setExtracted]     = useState(null);
  const [extracting, setExtracting]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [savedBid, setSavedBid]       = useState(null);
  const [recent, setRecent]           = useState([]);
  const [addToPipeline, setAddToPipeline] = useState(true);
  const inputRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open && step === 'input') {
      setTimeout(() => inputRef.current?.focus(), 50);
      loadRecent();
    }
    return () => clearTimeout(closeTimeoutRef.current);
  }, [open, step]);

  async function loadRecent() {
    try {
      const r = await authFetch(`${BASE_URL}/api/quick-add/recent`);
      const d = await r.json();
      setRecent(Array.isArray(d) ? d : []);
    } catch {}
  }

  function reset() {
    setStep('input');
    setInput('');
    setExtracted(null);
    setError('');
    setSavedBid(null);
  }

  function close() {
    setOpen(false);
    closeTimeoutRef.current = setTimeout(reset, 300);
  }

  const extract = useCallback(async () => {
    if (!input.trim() || extracting) return;
    const cacheKey = input.trim();
    if (extractionCache.has(cacheKey)) {
      setExtracted(extractionCache.get(cacheKey));
      setStep('preview');
      return;
    }
    setExtracting(true); setError('');
    try {
      const r = await authFetch(`${BASE_URL}/api/quick-add/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: cacheKey }),
      });
      const d = await r.json();
      if (d.error) {
        setError(d.error);
      } else {
        extractionCache.set(cacheKey, d);
        setExtracted(d);
        setStep('preview');
      }
    } catch (e) { setError(e.message); }
    setExtracting(false);
  }, [input, extracting]);

  async function save() {
    if (!extracted?.title?.trim()) { setError('Title required'); return; }
    setSaving(true); setError('');
    try {
      const r = await authFetch(`${BASE_URL}/api/quick-add/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid: extracted, addToPipeline }),
      });
      const d = await r.json();
      if (d.error) {
        setError(d.error);
      } else {
        setSavedBid(d.bid);
        setStep('success');
        loadRecent();
        // Auto-close success state after 2.5s
        closeTimeoutRef.current = setTimeout(close, 2500);
      }
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  function updateField(key, value) {
    setExtracted(e => ({ ...e, [key]: value }));
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-30 w-14 h-14 bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        aria-label="Quick Add Bid"
        title="Quick Add Bid (⌘K)">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={close} />

          {/* Panel */}
          <div className="relative w-full max-w-xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-gray-900 font-bold text-base">⚡ Quick Add Bid</h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {step === 'input'   && 'Paste URL, full text, or solicitation #'}
                  {step === 'preview' && 'Review extracted info before saving'}
                  {step === 'success' && 'Added to pipeline'}
                </p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* INPUT STEP */}
            {step === 'input' && (
              <div className="flex-1 overflow-y-auto p-5">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') extract(); }}
                  placeholder="https://sam.gov/opp/...&#10;&#10;Or paste full bid text here&#10;&#10;Or solicitation number"
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm leading-relaxed resize-none focus:outline-none focus:border-gray-900 focus:bg-white focus:ring-1 focus:ring-gray-900/10 transition-all" />

                <div className="flex items-center justify-between mt-3">
                  <p className="text-gray-400 text-xs">
                    <kbd className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-mono">⌘ Enter</kbd> to extract
                  </p>
                  <button onClick={extract} disabled={!input.trim() || extracting}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                    {extracting
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Extracting...</>
                      : '⚡ Extract'
                    }
                  </button>
                </div>

                {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

                {/* Recent additions */}
                {recent.length > 0 && (
                  <div className="mt-6">
                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Recently Added</p>
                    <div className="space-y-1.5">
                      {recent.map(r => (
                        <div key={r.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            r.bid_score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                            r.bid_score >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>{r.bid_score || 0}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 text-xs font-medium truncate">{r.title}</p>
                            <p className="text-gray-400 text-[10px] truncate">{r.agency || 'No agency'}</p>
                          </div>
                          {r.response_deadline && (
                            <span className="text-gray-400 text-[10px] flex-shrink-0">
                              {new Date(r.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PREVIEW STEP */}
            {step === 'preview' && extracted && (
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                  ✓ Extracted — review below and edit any fields before saving
                </div>

                <div>
                  <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Title *</label>
                  <input value={extracted.title || ''} onChange={e => updateField('title', e.target.value)} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Agency</label>
                    <input value={extracted.agency || ''} onChange={e => updateField('agency', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">NAICS</label>
                    <select value={extracted.naics_code || '236220'} onChange={e => updateField('naics_code', e.target.value)} className={inputCls}>
                      {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Deadline</label>
                    <input type="date" value={extracted.response_deadline || ''} onChange={e => updateField('response_deadline', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Est. Value ($)</label>
                    <input type="number" value={extracted.estimated_value || ''} onChange={e => updateField('estimated_value', e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Set-Aside</label>
                    <select value={extracted.set_aside_type || ''} onChange={e => updateField('set_aside_type', e.target.value)} className={inputCls}>
                      <option value="">None</option>
                      <option value="8AN">8(a)</option>
                      <option value="SBA">SBA</option>
                      <option value="SDVOSBC">SDVOSBC</option>
                      <option value="WOSB">WOSB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Bid #</label>
                    <input value={extracted.bid_number || ''} onChange={e => updateField('bid_number', e.target.value)} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Description</label>
                  <textarea rows={3} value={extracted.description || ''} onChange={e => updateField('description', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm leading-relaxed resize-y focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors" />
                </div>

                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input type="checkbox" checked={addToPipeline} onChange={e => setAddToPipeline(e.target.checked)}
                    className="w-4 h-4 accent-gray-900" />
                  <span className="text-sm text-gray-700">Also add to Pipeline (Reviewing stage)</span>
                </label>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

                <div className="flex items-center gap-2 pt-2">
                  <button onClick={() => setStep('input')} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    ← Back
                  </button>
                  <button onClick={save} disabled={saving || !extracted.title?.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                    {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving...</> : '💾 Save & Add to Pipeline'}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS STEP */}
            {step === 'success' && savedBid && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-gray-900 font-bold mb-1">Added to Pipeline</h4>
                <p className="text-gray-500 text-sm">{savedBid.title}</p>
                {savedBid.bid_score >= 70 && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                    🔥 Hot Lead — Score {savedBid.bid_score}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button onClick={reset} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Add Another
                  </button>
                  <button onClick={close} className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
