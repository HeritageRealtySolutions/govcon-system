import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const STATES = [
  { code: 'MS', name: 'Mississippi' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'TN', name: 'Tennessee' },
];

const NAICS_LABELS = {
  '238210': 'Electrical', '238220': 'Plumbing/HVAC', '238160': 'Roofing',
  '561730': 'Landscaping', '236220': 'General Construction',
};

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ScoreBadge({ score }) {
  const cls = score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-100 text-gray-500 border-gray-200';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cls}`}>{score}</span>;
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return <span className="text-gray-300 text-xs">—</span>;
  const days = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  const cls  = days <= 3 ? 'text-red-600 font-bold' : days <= 7 ? 'text-red-500' : days <= 14 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div>
      <span className={`text-xs ${cls}`}>{new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      {days >= 0 && <span className={`block text-xs ${cls} opacity-70`}>{days}d left</span>}
    </div>
  );
}

const inputCls = "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

export default function SLEDBids() {
  const [bids, setBids]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });
  const [filters, setFilters]   = useState({ state: '', naics: '', min_score: '' });
  const [search, setSearch]     = useState('');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.state)     p.set('state', filters.state);
      if (filters.naics)     p.set('naics', filters.naics);
      if (filters.min_score) p.set('min_score', filters.min_score);

      const [bidsRes, statsRes] = await Promise.all([
        authFetch(`${BASE_URL}/api/sled?${p}`).then(r => r.json()),
        authFetch(`${BASE_URL}/api/sled/stats`).then(r => r.json()),
      ]);
      setBids(Array.isArray(bidsRes) ? bidsRes : []);
      setStats(statsRes);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [filters]);

  async function sync() {
    setSyncing(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/sled/sync`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        showToast(`✓ Synced — ${d.total_saved} bids saved across ${Object.keys(d.by_state || {}).length} states`);
        await load();
      } else {
        showToast(d.error || 'Sync failed', 'error');
      }
    } catch (e) { showToast(e.message, 'error'); }
    setSyncing(false);
  }

  async function addToPipeline(e, bid) {
    e.stopPropagation();
    try {
      const r = await authFetch(`${BASE_URL}/api/sled/${bid.id}/pipeline`, { method: 'POST' });
      const d = await r.json();
      showToast(d.already_exists ? 'Already in pipeline' : '✓ Added to pipeline');
    } catch (e) { showToast(e.message, 'error'); }
  }

  const filtered = bids.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.title?.toLowerCase().includes(q) || b.agency?.toLowerCase().includes(q);
  });

  const hasFilter = filters.state || filters.naics || filters.min_score || search;

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 text-xl font-bold">State & Local Bids</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            MS · TX · FL · GA · TN — less competition than federal, great for building past performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">{filtered.length} bids</span>
          <button onClick={sync} disabled={syncing}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {syncing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Syncing...</> : '⟳ Sync State Portals'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>{toast.msg}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total SLED Bids', value: stats.total || 0 },
            { label: 'Hot Leads (70+)',  value: stats.hot || 0 },
            { label: 'Expiring 14 Days',value: stats.expiring || 0 },
            { label: 'States Active',    value: (stats.by_state || []).length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* State breakdown */}
      {stats?.by_state?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATES.map(s => {
            const stateData = stats.by_state?.find(b => b.state === s.code);
            const count = stateData?.count || 0;
            return (
              <button key={s.code}
                onClick={() => setFilters(f => ({ ...f, state: f.state === s.code ? '' : s.code }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  filters.state === s.code
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-900'
                }`}>
                {s.name}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  filters.state === s.code ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <input type="text" placeholder="Search title or agency..." value={search}
            onChange={e => setSearch(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <select value={filters.naics} onChange={e => setFilters(f => ({ ...f, naics: e.target.value }))} className={inputCls}>
          <option value="">All NAICS</option>
          {Object.entries(NAICS_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{code} — {label}</option>
          ))}
        </select>
        <input type="number" placeholder="Min Score" value={filters.min_score}
          onChange={e => setFilters(f => ({ ...f, min_score: e.target.value }))} className={`${inputCls} w-28`} />
        {hasFilter && (
          <button onClick={() => { setFilters({ state: '', naics: '', min_score: '' }); setSearch(''); }}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3">
        <p className="text-blue-700 text-xs font-semibold mb-1">📋 About State Portal Data</p>
        <p className="text-gray-500 text-xs">State portals have varying API access. Some states return full data, others require manual verification. Always confirm details on the source portal before bidding. SLED bids typically have 30-50% less competition than comparable federal bids.</p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <p className="text-3xl mb-3">🏛️</p>
          <p className="text-gray-500 text-sm">{hasFilter ? 'No bids match your filters' : 'No state bids yet'}</p>
          {!hasFilter && (
            <button onClick={sync} className="mt-3 text-gray-900 text-sm font-semibold hover:underline">
              Click Sync State Portals to pull live bids
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Score','Title','State','Agency','NAICS','Value','Deadline','Actions'].map(h => (
                    <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(bid => (
                  <React.Fragment key={bid.id}>
                    <tr className={`hover:bg-gray-50 cursor-pointer transition-colors ${expanded === bid.id ? 'bg-gray-50' : ''}`}
                      onClick={() => setExpanded(expanded === bid.id ? null : bid.id)}>
                      <td className="px-4 py-3"><ScoreBadge score={bid.bid_score || 0} /></td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-900 font-medium text-sm line-clamp-1">{bid.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{bid.source_portal}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">{bid.state}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-32 truncate">{bid.agency || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{bid.naics_code}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 text-sm font-medium">{fmt(bid.estimated_value)}</td>
                      <td className="px-4 py-3"><DeadlineBadge deadline={bid.response_deadline} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={e => addToPipeline(e, bid)}
                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                            + Track
                          </button>
                          {bid.source_url && (
                            <a href={bid.source_url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                              View ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === bid.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            {[
                              { label: 'Bid Number',  value: bid.bid_number || '—' },
                              { label: 'Contact',     value: bid.contact_name || '—' },
                              { label: 'Email',       value: bid.contact_email || '—' },
                              { label: 'Source',      value: bid.source_portal || '—' },
                            ].map(f => (
                              <div key={f.label}>
                                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{f.label}</p>
                                <p className="text-gray-700 text-xs mt-1 break-all">{f.value}</p>
                              </div>
                            ))}
                          </div>
                          {bid.description && (
                            <p className="text-gray-600 text-sm leading-relaxed mb-3">{bid.description.substring(0, 400)}{bid.description.length > 400 ? '...' : ''}</p>
                          )}
                          <div className="flex gap-2">
                            <button onClick={e => addToPipeline(e, bid)}
                              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                              + Add to Pipeline
                            </button>
                            {bid.source_url && (
                              <a href={bid.source_url} target="_blank" rel="noopener noreferrer"
                                className="bg-gray-900 hover:bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                                View on Portal ↗
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
