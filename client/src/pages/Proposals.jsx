import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const TPL_NAMES = [
  { key: 'technical_approach',  label: 'Technical Approach' },
  { key: 'past_performance',    label: 'Past Performance' },
  { key: 'management_approach', label: 'Management Approach' },
  { key: 'company_profile',     label: 'Company Profile' },
];

const STATUS_COLORS = {
  draft:     'bg-slate-700 text-slate-300 border-slate-600',
  review:    'bg-blue-900/50 text-blue-300 border-blue-700',
  submitted: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  awarded:   'bg-green-900/50 text-green-300 border-green-700',
  lost:      'bg-red-900/50 text-red-300 border-red-700',
};

function fmt(n) { if (!n) return '—'; return '$' + Number(n).toLocaleString(); }

function ProposalSection({ title, children, accent, collapsible = false }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border overflow-hidden ${accent ? 'bg-green-950/40 border-green-700/50' : 'bg-slate-800/60 border-slate-700/60'}`}>
      <button onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left ${collapsible ? 'hover:bg-slate-700/30 transition-colors' : ''}`}>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-green-400' : 'text-slate-400'}`}>{title}</h3>
        {collapsible && <span className={`text-slate-500 text-xs transition-transform ${open ? '' : 'rotate-180'}`}>▲</span>}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function Proposals() {
  const [opps, setOpps]               = useState([]);
  const [municipal, setMunicipal]     = useState([]);
  const [history, setHistory]         = useState([]);
  const [source, setSource]           = useState('federal');
  const [selected, setSelected]       = useState('');
  const [result, setResult]           = useState(null);
  const [estimate, setEstimate]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [estimating, setEstimating]   = useState(false);
  const [error, setError]             = useState('');
  const [templates, setTemplates]     = useState({});
  const [editingTpl, setEditingTpl]   = useState(null);
  const [tplContent, setTplContent]   = useState('');
  const [tplSaved, setTplSaved]       = useState(false);
  const [activeTab, setActiveTab]     = useState('generate');

  useEffect(() => {
    authFetch(`${BASE_URL}/api/opportunities`).then(r => r.json()).then(d => setOpps(Array.isArray(d) ? d : [])).catch(() => {});
    authFetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(d => setMunicipal(Array.isArray(d) ? d : [])).catch(() => {});
    authFetch(`${BASE_URL}/api/proposals/templates/all`).then(r => r.json()).then(setTemplates).catch(() => {});
    loadHistory();
  }, []);

  function loadHistory() {
    authFetch(`${BASE_URL}/api/proposals`).then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
  }

  const list        = source === 'federal' ? opps : municipal;
  const selectedOpp = list.find(o => String(o.id) === String(selected));

  async function getEstimate() {
    if (!selectedOpp) return;
    setEstimating(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: selectedOpp }),
      });
      const d = await r.json();
      setEstimate(d);
    } catch (e) { setError(e.message); }
    setEstimating(false);
  }

  async function generate() {
    if (!selectedOpp) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: selectedOpp }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setResult(d); setEstimate(d.cost_estimate); loadHistory(); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await authFetch(`${BASE_URL}/api/proposals/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadHistory();
  }

  async function loadProposal(id) {
    const r = await authFetch(`${BASE_URL}/api/proposals/${id}`);
    const d = await r.json();
    if (d.proposal_data) { setResult(d.proposal_data); setEstimate(d.cost_estimate); setActiveTab('generate'); }
  }

  async function saveTpl() {
    await authFetch(`${BASE_URL}/api/proposals/templates/${editingTpl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tplContent }),
    });
    setTemplates(t => ({ ...t, [editingTpl]: tplContent }));
    setTplSaved(true);
    setTimeout(() => setTplSaved(false), 3000);
  }

  const inputCls = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Proposals</h1>
        <p className="text-slate-400 text-sm mt-1">Generate complete proposals with cost calculations from any opportunity</p>
      </div>

      <div className="flex gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 w-fit">
        {[
          { id: 'generate', label: '✍️ Generate' },
          { id: 'history',  label: `📋 History (${history.length})` },
          { id: 'templates',label: '📝 Templates' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4">Select Opportunity</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Source</label>
                <select value={source}
                  onChange={e => { setSource(e.target.value); setSelected(''); setResult(null); setEstimate(null); }}
                  className={`${inputCls} w-44`}>
                  <option value="federal">Federal (SAM.gov)</option>
                  <option value="municipal">Municipal / Submitted</option>
                </select>
              </div>
              <div className="flex-1 min-w-72">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Opportunity</label>
                <select value={selected}
                  onChange={e => { setSelected(e.target.value); setResult(null); setEstimate(null); }}
                  className={inputCls}>
                  <option value="">Choose an opportunity...</option>
                  {list.map(o => <option key={o.id} value={o.id}>{o.title?.substring(0, 80)}</option>)}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={getEstimate} disabled={!selected || estimating}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-600">
                  {estimating ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Calculating...</> : '💰 Cost Estimate'}
                </button>
                <button onClick={generate} disabled={!selected || loading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Generating...</> : '✦ Generate Full Proposal'}
                </button>
              </div>
            </div>
            {error && <div className="mt-4 bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
            {loading && (
              <div className="mt-4 bg-slate-700/40 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 border-2 border-slate-500 border-t-green-400 rounded-full animate-spin inline-block"/>
                  <span className="text-slate-300 text-sm">Claude is writing your proposal — cover letter, technical approach, management plan, past performance, pricing...</span>
                </div>
              </div>
            )}
          </div>

          {estimate && estimate.labor_lines && (
            <ProposalSection title="💰 Cost Estimate & Bid Calculation" accent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Labor',       value: fmt(estimate.total_labor) },
                    { label: 'Materials',         value: fmt(estimate.material_cost) },
                    { label: 'Subcontractors',    value: fmt(estimate.subcontractor) },
                    { label: 'Overhead & Profit', value: fmt((estimate.overhead || 0) + (estimate.profit || 0)) },
                  ].map(c => (
                    <div key={c.label} className="bg-slate-900/60 rounded-lg px-3 py-3">
                      <p className="text-slate-500 text-xs">{c.label}</p>
                      <p className="text-white font-bold text-lg mt-0.5">{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-green-900/20 border border-green-700/40 rounded-lg px-5 py-4">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recommended Bid Range</p>
                    <p className="text-white text-sm mt-0.5">{fmt(estimate.bid_range_low)} – {fmt(estimate.bid_range_high)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Bid</p>
                    <p className="text-green-400 text-3xl font-bold">{fmt(estimate.total_bid)}</p>
                  </div>
                </div>
              </div>
            </ProposalSection>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-white font-semibold">Generated Proposal</h2>
                <span className="bg-green-900/40 text-green-300 border border-green-700/40 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Saved · ID #{result.proposal_id}
                </span>
              </div>
              <ProposalSection title="Cover Letter" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.cover_letter}</p>
              </ProposalSection>
              <ProposalSection title="Executive Summary" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.executive_summary}</p>
              </ProposalSection>
              <ProposalSection title="Technical Approach" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.technical_approach}</p>
              </ProposalSection>
              <ProposalSection title="Management Approach" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.management_approach}</p>
              </ProposalSection>
              <ProposalSection title="Past Performance" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.past_performance}</p>
              </ProposalSection>
              <ProposalSection title="Price Narrative" collapsible>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.price_narrative}</p>
              </ProposalSection>
              <ProposalSection title="Key Differentiators">
                <ul className="space-y-2.5">
                  {(result.differentiators || []).map((d, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </ProposalSection>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl px-5 py-4">
                <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">⚠ Internal — Win Strategy Note</p>
                <p className="text-slate-300 text-sm leading-relaxed">{result.win_strategy}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/60">
            <h2 className="text-white font-semibold text-sm">Proposal History</h2>
            <p className="text-slate-500 text-xs mt-0.5">All generated proposals — click Load to reload</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/40">
                <tr>
                  {['#','Title','Agency','Value','Status','Created','Actions'].map(h => (
                    <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {history.map(p => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">#{p.id}</td>
                    <td className="px-4 py-3 text-slate-200 text-sm font-medium max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{p.agency || '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{fmt(p.estimated_value)}</td>
                    <td className="px-4 py-3">
                      <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border bg-transparent cursor-pointer ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                        {['draft','review','submitted','awarded','lost'].map(s => (
                          <option key={s} value={s} className="bg-slate-800 text-white">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => loadProposal(p.id)}
                        className="text-green-400 hover:text-green-300 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-green-900/30 transition-colors">
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={7} className="py-14 text-center">
                    <p className="text-slate-500 text-sm">No proposals generated yet</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/60">
            <h2 className="text-white font-semibold text-sm">Base Templates</h2>
            <p className="text-slate-500 text-xs mt-0.5">AI uses these as context — fill in with your real company details</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TPL_NAMES.map(t => (
                <button key={t.key}
                  onClick={() => { setEditingTpl(t.key); setTplContent(templates[t.key] || ''); setTplSaved(false); }}
                  className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    editingTpl === t.key
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {editingTpl && (
              <div className="space-y-3">
                <textarea rows={12} value={tplContent} onChange={e => setTplContent(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:border-green-500"
                  placeholder={`Enter your ${editingTpl.replace(/_/g, ' ')} content here...`} />
                <div className="flex items-center gap-3">
                  <button onClick={saveTpl}
                    className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Save Template
                  </button>
                  <button onClick={() => setEditingTpl(null)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                    Close
                  </button>
                  {tplSaved && <span className="text-green-400 text-sm font-medium">✓ Saved</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
