import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '',       label: 'All NAICS Codes' },
  { value: '238210', label: '238210 — Electrical' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — Construction' },
];

function fmt(v) { return v ? `$${(v / 1000).toFixed(0)}K` : null; }

function ScoreBadge({ score }) {
  const cls = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-100 text-gray-500 border-gray-200';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{score}</span>;
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return <span className="text-gray-300 text-xs">—</span>;
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  const cls = days <= 3 ? 'text-red-600 font-bold' : days <= 7 ? 'text-red-500' : days <= 14 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div>
      <span className={`text-xs ${cls}`}>{deadline.split('T')[0]}</span>
      {days >= 0 && <span className={`block text-xs ${cls} opacity-70`}>{days}d left</span>}
    </div>
  );
}

const inputCls = "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

export default function Opportunities() {
  const [opps, setOpps]         = useState([]);
  const [filters, setFilters]   = useState({ naics: '', set_aside: '', min_score: '' });
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });
  const [syncing, setSyncing]   = useState(false);
  const nav = useNavigate();

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3000); }

  function load() {
    const p = new URLSearchParams();
    if (filters.naics)     p.set('naics', filters.naics);
    if (filters.set_aside) p.set('set_aside', filters.set_aside);
    if (filters.min_score) p.set('min_score', filters.min_score);
    authFetch(`${BASE_URL}/api/opportunities?${p}`).then(r => r.json()).then(d => setOpps(Array.isArray(d) ? d : [])).catch(() => {});
  }
  useEffect(load, [filters]);

  async function syncFederal() {
    setSyncing(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/opportunities/sync`);
      const d = await r.json();
      if (d.error) showToast(d.error, 'error');
      else { showToast(`✓ ${d.saved} new opportunities saved`); load(); }
    } catch (e) { showToast(e.message, 'error'); }
    setSyncing(false);
  }

  async function addToPipeline(e, opp) {
    e.stopPropagation();
    const r = await authFetch(`${BASE_URL}/api/pipeline`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opp.id }),
    });
    const d = await r.json();
    showToast(d.already_exists ? 'Already in pipeline' : '✓ Added to pipeline');
  }

  const filtered  = opps.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.title?.toLowerCase().includes(q) || o.agency?.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q);
  });
  const hotCount  = opps.filter(o => o.bid_score >= 70).length;
  const hasFilter = filters.naics || filters.set_aside || filters.min_score || search;

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 text-xl font-bold">Federal Opportunities</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            SAM.gov · 8(a) & Small Business set-asides
            {hotCount > 0 && <span className="ml-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full">🔥 {hotCount} hot</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">{filtered.length} results</span>
          <button onClick={syncFederal} disabled={syncing}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {syncing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Syncing...</> : '⟳ Sync SAM.gov'}
          </button>
        </div>
      </div>

      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>{toast.msg}</div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input type="text" placeholder="Search title, agency, description..." value={search}
            onChange={e => setSearch(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <select value={filters.naics} onChange={e => setFilters(f => ({ ...f, naics: e.target.value }))} className={`${inputCls} min-w-44`}>
          {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.set_aside} onChange={e => setFilters(f => ({ ...f, set_aside: e.target.value }))} className={`${inputCls} min-w-36`}>
          <option value="">All Set-Asides</option>
          <option value="8AN">8(a)</option>
          <option value="SBA">Small Business</option>
          <option value="SBP">SBA Set-Aside</option>
          <option value="WOSB">WOSB</option>
        </select>
        <input type="number" placeholder="Min Score" value={filters.min_score}
          onChange={e => setFilters(f => ({ ...f, min_score: e.target.value }))} className={`${inputCls} w-28`} />
        {hasFilter && (
          <button onClick={() => { setFilters({ naics: '', set_aside: '', min_score: '' }); setSearch(''); }}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Score','Title','Agency','NAICS','Set-Aside','Value','Deadline','Actions'].map(h => (
                  <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(o => (
                <React.Fragment key={o.id}>
                  <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${expanded === o.id ? 'bg-gray-50' : ''}`}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    <td className="px-4 py-3"><ScoreBadge score={o.bid_score} /></td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-gray-900 font-medium text-sm line-clamp-1">{o.title}</p>
                      {o.solicitation_number && <p className="text-gray-400 text-xs font-mono mt-0.5">{o.solicitation_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 text-xs max-w-[160px] truncate">{o.agency}</p>
                      {o.city && <p className="text-gray-400 text-xs mt-0.5">{o.city}{o.state ? `, ${o.state}` : ''}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{o.naics_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.set_aside_type
                        ? <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 rounded-full">{o.set_aside_type}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 text-sm font-medium">
                        {fmt(o.estimated_value_min) || '—'}
                        {o.estimated_value_max && o.estimated_value_max !== o.estimated_value_min ? `–${fmt(o.estimated_value_max)}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3"><DeadlineBadge deadline={o.response_deadline} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => addToPipeline(e, o)}
                          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          + Track
                        </button>
                        <button onClick={e => { e.stopPropagation(); nav('/proposals'); }}
                          className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          ✦ Proposal
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {[
                            { label: 'Solicitation #', value: o.solicitation_number },
                            { label: 'Contact',        value: o.contact_name },
                            { label: 'Email',          value: o.contact_email },
                            { label: 'Location',       value: [o.city, o.state].filter(Boolean).join(', ') },
                          ].map(f => (
                            <div key={f.label}>
                              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{f.label}</p>
                              <p className="text-gray-700 text-xs mt-1">{f.value || '—'}</p>
                            </div>
                          ))}
                        </div>
                        {o.description && <p className="text-gray-600 text-sm leading-relaxed">{o.description.substring(0, 600)}{o.description.length > 600 ? '...' : ''}</p>}
                        <div className="flex gap-2 mt-4">
                          <button onClick={e => addToPipeline(e, o)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">+ Add to Pipeline</button>
                          <button onClick={() => nav('/proposals')} className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">✦ Generate Proposal</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-16 text-center">
                  <p className="text-gray-400 text-sm">{hasFilter ? 'No opportunities match your filters' : 'No opportunities yet'}</p>
                  <p className="text-gray-300 text-xs mt-1">{hasFilter ? 'Try clearing filters' : 'Click Sync SAM.gov to pull live federal bids'}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
