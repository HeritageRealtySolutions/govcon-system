import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '', label: 'All NAICS Codes' },
  { value: '238210', label: '238210 — Electrical' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — Construction' },
];

function ScoreBadge({ score }) {
  if (score >= 70) return <span className="badge-score-hot">{score}</span>;
  if (score >= 40) return <span className="badge-score-warm">{score}</span>;
  return <span className="badge-score-cold">{score}</span>;
}

function StatusPill({ status }) {
  const styles = {
    new: 'bg-blue-900/50 text-blue-300 border-blue-700',
    reviewing: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    pipeline: 'bg-green-900/50 text-green-300 border-green-700',
    passed: 'bg-slate-700 text-slate-400 border-slate-600',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${styles[status] || styles.new}`}>
      {status}
    </span>
  );
}

function fmt(v) { return v ? `$${(v / 1000).toFixed(0)}K` : '—'; }

export default function Opportunities() {
  const [opps, setOpps] = useState([]);
  const [filters, setFilters] = useState({ naics: '', set_aside: '', min_score: '' });
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState('');

  function load() {
    const p = new URLSearchParams();
    if (filters.naics) p.set('naics', filters.naics);
    if (filters.set_aside) p.set('set_aside', filters.set_aside);
    if (filters.min_score) p.set('min_score', filters.min_score);
    fetch(`${BASE_URL}/api/opportunities?${p}`).then(r => r.json()).then(setOpps).catch(() => {});
  }

  useEffect(load, [filters]);

  async function addToPipeline(e, opp) {
    e.stopPropagation();
    const r = await fetch(`${BASE_URL}/api/pipeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunity_id: opp.id }) });
    const d = await r.json();
    setToast(d.already_exists ? 'Already in pipeline' : '✓ Added to pipeline');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Federal Opportunities</h1>
          <p className="text-slate-400 text-sm mt-1">SAM.gov • 8(a) &amp; Small Business set-asides</p>
        </div>
        <span className="bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1 rounded-full">{opps.length} results</span>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap gap-3">
        <select value={filters.naics} onChange={e => setFilters(f => ({ ...f, naics: e.target.value }))}
          className="input w-auto min-w-48">
          {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.set_aside} onChange={e => setFilters(f => ({ ...f, set_aside: e.target.value }))}
          className="input w-auto min-w-40">
          <option value="">All Set-Asides</option>
          <option value="8AN">8(a)</option>
          <option value="SBA">Small Business</option>
          <option value="SBP">SBA Set-Aside</option>
          <option value="WOSB">WOSB</option>
        </select>
        <input type="number" placeholder="Min Score" value={filters.min_score}
          onChange={e => setFilters(f => ({ ...f, min_score: e.target.value }))}
          className="input w-32" />
        {(filters.naics || filters.set_aside || filters.min_score) && (
          <button onClick={() => setFilters({ naics: '', set_aside: '', min_score: '' })} className="btn-secondary text-xs">Clear</button>
        )}
      </div>

      {toast && (
        <div className="mb-4 bg-green-900/50 border border-green-600 text-green-300 text-sm px-4 py-2.5 rounded-lg">{toast}</div>
      )}

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="table-header">Score</th>
              <th className="table-header">Title</th>
              <th className="table-header">Agency</th>
              <th className="table-header">NAICS</th>
              <th className="table-header">Set-Aside</th>
              <th className="table-header">Value</th>
              <th className="table-header">Deadline</th>
              <th className="table-header">Status</th>
              <th className="table-header">Action</th>
            </tr>
          </thead>
          <tbody>
            {opps.map(o => (
              <React.Fragment key={o.id}>
                <tr className="hover:bg-slate-700/40 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  <td className="table-cell"><ScoreBadge score={o.bid_score} /></td>
                  <td className="table-cell max-w-xs">
                    <span className="text-slate-200 font-medium line-clamp-1">{o.title}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-slate-400 text-xs max-w-xs block truncate">{o.agency}</span>
                  </td>
                  <td className="table-cell"><span className="text-slate-300 font-mono text-xs">{o.naics_code}</span></td>
                  <td className="table-cell">
                    {o.set_aside_type ? (
                      <span className="bg-purple-900/50 text-purple-300 border border-purple-700 text-xs px-2 py-0.5 rounded-full">{o.set_aside_type}</span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="table-cell text-slate-300 whitespace-nowrap">
                    {fmt(o.estimated_value_min)}{o.estimated_value_max && o.estimated_value_max !== o.estimated_value_min ? `–${fmt(o.estimated_value_max)}` : ''}
                  </td>
                  <td className="table-cell">
                    {o.response_deadline ? (
                      <span className={`text-xs font-medium ${
                        Math.ceil((new Date(o.response_deadline) - new Date()) / 86400000) <= 7 ? 'text-red-400' :
                        Math.ceil((new Date(o.response_deadline) - new Date()) / 86400000) <= 14 ? 'text-yellow-400' :
                        'text-slate-400'}`}>
                        {o.response_deadline.split('T')[0]}
                      </span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="table-cell"><StatusPill status={o.status} /></td>
                  <td className="table-cell">
                    <button onClick={e => addToPipeline(e, o)}
                      className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                      + Pipeline
                    </button>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr className="bg-slate-900/60">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-xs">
                        <div><span className="text-slate-500">Solicitation</span><p className="text-slate-300 mt-0.5">{o.solicitation_number || '—'}</p></div>
                        <div><span className="text-slate-500">Contact</span><p className="text-slate-300 mt-0.5">{o.contact_name || '—'}</p></div>
                        <div><span className="text-slate-500">Email</span><p className="text-slate-300 mt-0.5">{o.contact_email || '—'}</p></div>
                        <div><span className="text-slate-500">Location</span><p className="text-slate-300 mt-0.5">{o.city ? `${o.city}, ` : ''}{o.state || '—'}</p></div>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed">{o.description?.substring(0, 400)}{o.description?.length > 400 ? '...' : ''}</p>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {opps.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <p className="text-slate-500 text-sm">No opportunities found.</p>
                  <p className="text-slate-600 text-xs mt-1">Sync federal bids from the Dashboard to populate this list.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
