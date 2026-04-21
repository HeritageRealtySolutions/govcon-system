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
  const cls =
    score >= 70 ? 'bg-green-900/60 text-green-300 border-green-700' :
    score >= 40 ? 'bg-yellow-900/60 text-yellow-300 border-yellow-700' :
                  'bg-slate-700 text-slate-400 border-slate-600';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{score}</span>;
}

function StatusPill({ status }) {
  const styles = {
    new:       'bg-blue-900/50 text-blue-300 border-blue-700',
    reviewing: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    pipeline:  'bg-green-900/50 text-green-300 border-green-700',
    passed:    'bg-slate-700 text-slate-400 border-slate-600',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${styles[status] || styles.new}`}>
      {status}
    </span>
  );
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return <span className="text-slate-600 text-xs">—</span>;
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  const cls =
    days <= 3  ? 'text-red-400 font-bold' :
    days <= 7  ? 'text-red-400' :
    days <= 14 ? 'text-yellow-400' :
                 'text-slate-400';
  return (
    <div>
      <span className={`text-xs ${cls}`}>{deadline.split('T')[0]}</span>
      {days >= 0 && <span className={`block text-xs ${cls} opacity-70`}>{days}d left</span>}
    </div>
  );
}

export default function Opportunities() {
  const [opps, setOpps]         = useState([]);
  const [filters, setFilters]   = useState({ naics: '', set_aside: '', min_score: '' });
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });
  const [syncing, setSyncing]   = useState(false);
  const nav = useNavigate();

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  }

  function load() {
    const p = new URLSearchParams();
    if (filters.naics)     p.set('naics', filters.naics);
    if (filters.set_aside) p.set('set_aside', filters.set_aside);
    if (filters.min_score) p.set('min_score', filters.min_score);
    authFetch(`${BASE_URL}/api/opportunities?${p}`)
      .then(r => r.json()).then(d => setOpps(Array.isArray(d) ? d : [])).catch(() => {});
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opp.id }),
    });
    const d = await r.json();
    showToast(d.already_exists ? 'Already in pipeline' : '✓ Added to pipeline');
  }

  function goProposal(e) {
    e.stopPropagation();
    nav('/proposals');
  }

  const filtered = opps.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.title?.toLowerCase().includes(q) ||
      o.agency?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  });

  const hotCount  = opps.filter(o => o.bid_score >= 70).length;
  const hasFilter = filters.naics || filters.set_aside || filters.min_score || search;
  const inputCls  = "bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Federal Opportunities</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            SAM.gov · 8(a) & Small Business set-asides
            {hotCount > 0 && (
              <span className="ml-2 bg-green-900/40 text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-700/40">
                🔥 {hotCount} hot
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            {filtered.length} results
          </span>
          <button onClick={syncFederal} disabled={syncing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {syncing
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Syncing...</>
              : '⟳ Sync SAM.gov'
            }
          </button>
        </div>
      </div>

      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error'
            ? 'bg-red-900/40 border-red-700/60 text-red-300'
            : 'bg-green-900/40 border-green-600/60 text-green-300'
        }`}>{toast.msg}</div>
      )}

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input type="text" placeholder="Search title, agency, description..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={`${inputCls} w-full`} />
        </div>
        <select value={filters.naics}
          onChange={e => setFilters(f => ({ ...f, naics: e.target.value }))}
          className={`${inputCls} min-w-44`}>
          {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.set_aside}
          onChange={e => setFilters(f => ({ ...f, set_aside: e.target.value }))}
          className={`${inputCls} min-w-36`}>
          <option value="">All Set-Asides</option>
          <option value="8AN">8(a)</option>
          <option value="SBA">Small Business</option>
          <option value="SBP">SBA Set-Aside</option>
          <option value="WOSB">WOSB</option>
        </select>
        <input type="number" placeholder="Min Score" value={filters.min_score}
          onChange={e => setFilters(f => ({ ...f, min_score: e.target.value }))}
          className={`${inputCls} w-28`} />
        {hasFilter && (
          <button onClick={() => { setFilters({ naics: '', set_aside: '', min_score: '' }); setSearch(''); }}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/60 border-b border-slate-700/60">
              <tr>
                {['Score','Title','Agency','NAICS','Set-Aside','Value','Deadline','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filtered.map(o => (
                <React.Fragment key={o.id}>
                  <tr className={`hover:bg-slate-700/30 cursor-pointer transition-colors ${expanded === o.id ? 'bg-slate-700/20' : ''}`}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                    <td className="px-4 py-3"><ScoreBadge score={o.bid_score} /></td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-slate-200 font-medium text-sm line-clamp-1">{o.title}</p>
                      {o.solicitation_number && <p className="text-slate-600 text-xs font-mono mt-0.5">{o.solicitation_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-400 text-xs max-w-[160px] truncate">{o.agency}</p>
                      {o.city && <p className="text-slate-600 text-xs mt-0.5">{o.city}{o.state ? `, ${o.state}` : ''}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-300 font-mono text-xs bg-slate-700/60 px-1.5 py-0.5 rounded">{o.naics_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.set_aside_type
                        ? <span className="bg-purple-900/50 text-purple-300 border border-purple-700/60 text-xs px-2 py-0.5 rounded-full">{o.set_aside_type}</span>
                        : <span className="text-slate-600 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-slate-300 text-sm font-medium">
                        {fmt(o.estimated_value_min) || '—'}
                        {o.estimated_value_max && o.estimated_value_max !== o.estimated_value_min ? `–${fmt(o.estimated_value_max)}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3"><DeadlineBadge deadline={o.response_deadline} /></td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={e => addToPipeline(e, o)}
                          className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          + Track
                        </button>
                        <button onClick={goProposal}
                          className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          ✦ Proposal
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr className="bg-slate-900/40">
                      <td colSpan={9} className="px-6 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {[
                            { label: 'Solicitation #', value: o.solicitation_number },
                            { label: 'Contact',        value: o.contact_name },
                            { label: 'Email',          value: o.contact_email },
                            { label: 'Location',       value: [o.city, o.state].filter(Boolean).join(', ') },
                          ].map(f => (
                            <div key={f.label}>
                              <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">{f.label}</p>
                              <p className="text-slate-300 text-xs mt-1">{f.value || '—'}</p>
                            </div>
                          ))}
                        </div>
                        {o.description && (
                          <p className="text-slate-400 text-sm leading-relaxed">
                            {o.description.substring(0, 600)}{o.description.length > 600 ? '...' : ''}
                          </p>
                        )}
                        <div className="flex gap-2 mt-4">
                          <button onClick={e => addToPipeline(e, o)}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            + Add to Pipeline
                          </button>
                          <button onClick={goProposal}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                            ✦ Generate Proposal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <p className="text-slate-500 text-sm">{hasFilter ? 'No opportunities match your filters' : 'No opportunities yet'}</p>
                    <p className="text-slate-600 text-xs mt-1">{hasFilter ? 'Try clearing filters' : 'Click Sync SAM.gov to pull live federal bids'}</p>
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
