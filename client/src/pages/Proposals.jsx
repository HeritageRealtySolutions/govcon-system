import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const TPL_NAMES = [
  { key: 'technical_approach',  label: 'Technical Approach' },
  { key: 'past_performance',    label: 'Past Performance' },
  { key: 'management_approach', label: 'Management Approach' },
  { key: 'company_profile',     label: 'Company Profile' },
];

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-600 border-gray-200',
  review:    'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  awarded:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost:      'bg-red-50 text-red-600 border-red-200',
};

function fmt(n) { if (!n) return '—'; return '$' + Number(n).toLocaleString(); }

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

function Section({ title, children, accent, collapsible = false }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm ${accent ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      <button onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left ${collapsible ? 'hover:bg-gray-50 transition-colors' : ''}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-gray-300' : 'text-gray-500'}`}>{title}</h3>
        {collapsible && <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function Proposals() {
  const [opps, setOpps]             = useState([]);
  const [municipal, setMunicipal]   = useState([]);
  const [history, setHistory]       = useState([]);
  const [source, setSource]         = useState('federal');
  const [selected, setSelected]     = useState('');
  const [result, setResult]         = useState(null);
  const [estimate, setEstimate]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [error, setError]           = useState('');
  const [templates, setTemplates]   = useState({});
  const [editingTpl, setEditingTpl] = useState(null);
  const [tplContent, setTplContent] = useState('');
  const [tplSaved, setTplSaved]     = useState(false);
  const [activeTab, setActiveTab]   = useState('generate');

  useEffect(() => {
    authFetch(`${BASE_URL}/api/opportunities`).then(r => r.json()).then(d => setOpps(Array.isArray(d) ? d : [])).catch(() => {});
    authFetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(d => setMunicipal(Array.isArray(d) ? d : [])).catch(() => {});
    authFetch(`${BASE_URL}/api/proposals/templates/all`).then(r => r.json()).then(setTemplates).catch(() => {});
    loadHistory();
  }, []);

  function loadHistory() {
    authFetch(`${BASE_URL}/api/proposals`).then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }

  const list = source === 'federal' ? opps : municipal;
  const selectedOpp = list.find(o => String(o.id) === String(selected));

  async function getEstimate() {
    if (!selectedOpp) return;
    setEstimating(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/estimate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity: selectedOpp }),
      });
      setEstimate(await r.json());
    } catch (e) { setError(e.message); }
    setEstimating(false);
  }

  async function generate() {
    if (!selectedOpp) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity: selectedOpp }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setResult(d); setEstimate(d.cost_estimate); loadHistory(); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await authFetch(`${BASE_URL}/api/proposals/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    loadHistory();
  }

  async function saveTpl() {
    await authFetch(`${BASE_URL}/api/proposals/templates/${editingTpl}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: tplContent }),
    });
    setTemplates(t => ({ ...t, [editingTpl]: tplContent }));
    setTplSaved(true); setTimeout(() => setTplSaved(false), 3000);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Proposals</h2>
        <p className="text-gray-500 text-sm mt-0.5">Generate complete proposals with cost calculations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'generate',  label: '✍️ Generate' },
          { id: 'history',   label: `📋 History (${history.length})` },
          { id: 'templates', label: '📝 Templates' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-gray-900 font-semibold text-sm mb-4">Select Opportunity</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Source</label>
                <select value={source} onChange={e => { setSource(e.target.value); setSelected(''); setResult(null); setEstimate(null); }} className={`${inputCls} w-44`}>
                  <option value="federal">Federal (SAM.gov)</option>
                  <option value="municipal">Municipal / Submitted</option>
                </select>
              </div>
              <div className="flex-1 min-w-72">
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Opportunity</label>
                <select value={selected} onChange={e => { setSelected(e.target.value); setResult(null); setEstimate(null); }} className={inputCls}>
                  <option value="">Choose an opportunity...</option>
                  {list.map(o => <option key={o.id} value={o.id}>{o.title?.substring(0, 80)}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={getEstimate} disabled={!selected || estimating}
                  className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  {estimating ? <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin inline-block"/>Calculating...</> : '💰 Estimate'}
                </button>
                <button onClick={generate} disabled={!selected || loading}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Generating...</> : '✦ Generate Proposal'}
                </button>
              </div>
            </div>
            {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          </div>

          {estimate?.labor_lines && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-4">💰 Cost Estimate</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Labor',       value: fmt(estimate.total_labor) },
                  { label: 'Materials',         value: fmt(estimate.material_cost) },
                  { label: 'Subcontractors',    value: fmt(estimate.subcontractor) },
                  { label: 'Overhead & Profit', value: fmt((estimate.overhead || 0) + (estimate.profit || 0)) },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-lg px-3 py-3">
                    <p className="text-gray-400 text-xs">{c.label}</p>
                    <p className="text-gray-900 font-bold text-base mt-0.5">{c.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-gray-900 rounded-lg px-5 py-4">
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Bid Range</p>
                  <p className="text-white text-sm mt-0.5">{fmt(estimate.bid_range_low)} – {fmt(estimate.bid_range_high)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Bid</p>
                  <p className="text-white text-3xl font-bold">{fmt(estimate.total_bid)}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-gray-900 font-semibold">Generated Proposal</h3>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">Saved · #{result.proposal_id}</span>
              </div>
              {[
                { title: 'Cover Letter',       content: result.cover_letter },
                { title: 'Executive Summary',  content: result.executive_summary },
                { title: 'Technical Approach', content: result.technical_approach },
                { title: 'Management Approach',content: result.management_approach },
                { title: 'Past Performance',   content: result.past_performance },
                { title: 'Price Narrative',    content: result.price_narrative },
              ].map(s => (
                <Section key={s.title} title={s.title} collapsible>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
                </Section>
              ))}
              <Section title="Key Differentiators">
                <ul className="space-y-2">
                  {(result.differentiators || []).map((d, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700"><span className="text-emerald-600 font-bold flex-shrink-0">✓</span>{d}</li>
                  ))}
                </ul>
              </Section>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">⚠ Internal — Win Strategy Note</p>
                <p className="text-gray-700 text-sm leading-relaxed">{result.win_strategy}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-semibold text-sm">Proposal History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['#','Title','Agency','Value','Status','Created','Actions'].map(h => (
                    <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">#{p.id}</td>
                    <td className="px-4 py-3 text-gray-900 text-sm font-medium max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{p.agency || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">{fmt(p.estimated_value)}</td>
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border bg-transparent cursor-pointer ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                        {['draft','review','submitted','awarded','lost'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button className="text-gray-900 hover:text-black text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors">Load</button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={7} className="py-14 text-center text-gray-400 text-sm">No proposals generated yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-semibold text-sm">Base Templates</h3>
            <p className="text-gray-400 text-xs mt-0.5">AI uses these as context — fill in with your real company details</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TPL_NAMES.map(t => (
                <button key={t.key} onClick={() => { setEditingTpl(t.key); setTplContent(templates[t.key] || ''); setTplSaved(false); }}
                  className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    editingTpl === t.key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}>{t.label}
                </button>
              ))}
            </div>
            {editingTpl && (
              <div className="space-y-3">
                <textarea rows={10} value={tplContent} onChange={e => setTplContent(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:border-gray-900"
                  placeholder={`Enter your ${editingTpl.replace(/_/g, ' ')} here...`} />
                <div className="flex items-center gap-3">
                  <button onClick={saveTpl} className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Save Template</button>
                  <button onClick={() => setEditingTpl(null)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Close</button>
                  {tplSaved && <span className="text-emerald-600 text-sm font-medium">✓ Saved</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
