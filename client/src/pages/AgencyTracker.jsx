import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const TIER = {
  strong:     { label: '⭐ STRONG',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Double down here' },
  building:   { label: '🌱 BUILDING',   cls: 'bg-blue-50 text-blue-700 border-blue-200',         desc: 'Emerging relationship' },
  struggling: { label: '⚠ STRUGGLING', cls: 'bg-red-50 text-red-600 border-red-200',             desc: 'Bid without wins' },
  new:        { label: '🆕 NEW',        cls: 'bg-gray-100 text-gray-600 border-gray-200',        desc: 'Limited history' },
};

export default function AgencyTracker() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  async function load() {
    setLoading(true);
    try { const r = await authFetch(`${BASE_URL}/api/intelligence/agencies`); setData(await r.json()); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const agencies = data?.agencies || [];
  const summary  = data?.summary  || {};
  const filtered = filter === 'all' ? agencies : agencies.filter(a => a.tier === filter);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Agency Relationship Tracker</h2>
        <p className="text-gray-500 text-sm mt-0.5">Every agency you've bid on, ranked by performance</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/></div>
      ) : agencies.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <p className="text-3xl mb-3">🏛️</p>
          <p className="text-gray-400 text-sm">No agency data yet</p>
          <p className="text-gray-300 text-xs mt-1">Submit bids from the Pipeline page to start tracking</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'all',        label: 'Total Agencies', value: summary.total_agencies || 0 },
              { key: 'strong',     label: '⭐ Strong',      value: summary.strong_relationships || 0 },
              { key: 'building',   label: '🌱 Building',    value: summary.building || 0 },
              { key: 'struggling', label: '⚠ Struggling',  value: summary.struggling || 0 },
            ].map(s => (
              <button key={s.key} onClick={() => setFilter(s.key)}
                className={`bg-white border border-gray-200 ${filter === s.key ? 'ring-2 ring-gray-900' : ''} rounded-xl px-4 py-4 text-left hover:shadow-md transition-all shadow-sm`}>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 font-semibold text-sm">{filter === 'all' ? 'All Agencies' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tier`}</h3>
                <p className="text-gray-400 text-xs mt-0.5">Sorted by revenue won</p>
              </div>
              {filter !== 'all' && <button onClick={() => setFilter('all')} className="text-gray-400 hover:text-gray-900 text-xs">Clear filter</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Agency','Tier','Bids','Wins','Win Rate','Revenue Won','Avg Win','Recommendation'].map(h => (
                      <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(a => {
                    const tier = TIER[a.tier] || TIER.new;
                    return (
                      <tr key={a.agency} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-medium text-sm">{a.agency}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{tier.desc}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${tier.cls}`}>{tier.label}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-sm font-medium">{a.bids}</td>
                        <td className="px-4 py-3 text-emerald-700 text-sm font-medium">{a.wins}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${a.win_rate >= 30 ? 'text-emerald-700' : a.win_rate >= 15 ? 'text-amber-700' : 'text-red-600'}`}>{a.win_rate}%</span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-semibold text-sm">{fmt(a.total_won)}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{fmt(a.avg_win_amount)}</td>
                        <td className="px-4 py-3">
                          {a.tier === 'strong'     && <span className="text-emerald-600 text-xs font-medium">✓ Double down</span>}
                          {a.tier === 'building'   && <span className="text-blue-600 text-xs font-medium">↗ Keep pursuing</span>}
                          {a.tier === 'struggling' && <span className="text-red-500 text-xs font-medium">⏸ Reassess strategy</span>}
                          {a.tier === 'new'        && <span className="text-gray-400 text-xs">— Build history</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-gray-400 text-xs">
                <strong className="text-gray-600">Tier logic:</strong>{' '}
                Strong = 3+ wins & 30%+ win rate · Building = 1+ win · Struggling = 3+ bids, 0 wins · New = &lt;3 bids
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
