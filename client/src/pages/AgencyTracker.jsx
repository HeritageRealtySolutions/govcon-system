import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getToken() {
  return sessionStorage.getItem('lumen_token') || localStorage.getItem('lumen_token');
}

const TIER_STYLES = {
  strong:     { label: '⭐ STRONG',     cls: 'bg-green-900/60 text-green-300 border-green-700',     desc: 'Double down here' },
  building:   { label: '🌱 BUILDING',   cls: 'bg-blue-900/60 text-blue-300 border-blue-700',       desc: 'Emerging relationship' },
  struggling: { label: '⚠ STRUGGLING', cls: 'bg-red-900/60 text-red-300 border-red-700',           desc: 'Bid without wins' },
  new:        { label: '🆕 NEW',        cls: 'bg-slate-700 text-slate-300 border-slate-600',       desc: 'Limited history' },
};

export default function AgencyTracker() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  const headers = { Authorization: `Bearer ${getToken()}` };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/agencies`, { headers });
      const d = await r.json();
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const agencies  = data?.agencies || [];
  const summary   = data?.summary || {};
  const filtered  = filter === 'all' ? agencies : agencies.filter(a => a.tier === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agency Relationship Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">
          Every agency you've bid on, ranked by performance — know where to double down and where you're wasting time
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin"/>
        </div>
      ) : agencies.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl py-16 text-center">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-slate-400 text-sm">No agency data yet</p>
          <p className="text-slate-600 text-xs mt-1">Submit bids from the Pipeline page to start tracking agency performance</p>
        </div>
      ) : (
        <>
          {/* Summary tiers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => setFilter('all')}
              className={`bg-slate-800/60 border border-slate-700/60 ${filter === 'all' ? 'ring-2 ring-green-500' : ''}
                rounded-xl px-4 py-4 text-left hover:border-slate-500 transition-all`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Agencies</p>
              <p className="text-2xl font-bold text-white">{summary.total_agencies || 0}</p>
            </button>
            <button onClick={() => setFilter('strong')}
              className={`bg-slate-800/60 border border-green-700/40 ${filter === 'strong' ? 'ring-2 ring-green-500' : ''}
                rounded-xl px-4 py-4 text-left hover:border-green-600 transition-all`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">⭐ Strong</p>
              <p className="text-2xl font-bold text-green-400">{summary.strong_relationships || 0}</p>
            </button>
            <button onClick={() => setFilter('building')}
              className={`bg-slate-800/60 border border-blue-700/40 ${filter === 'building' ? 'ring-2 ring-green-500' : ''}
                rounded-xl px-4 py-4 text-left hover:border-blue-600 transition-all`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">🌱 Building</p>
              <p className="text-2xl font-bold text-blue-400">{summary.building || 0}</p>
            </button>
            <button onClick={() => setFilter('struggling')}
              className={`bg-slate-800/60 border border-red-700/40 ${filter === 'struggling' ? 'ring-2 ring-green-500' : ''}
                rounded-xl px-4 py-4 text-left hover:border-red-600 transition-all`}>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">⚠ Struggling</p>
              <p className="text-2xl font-bold text-red-400">{summary.struggling || 0}</p>
            </button>
          </div>

          {/* Agency table */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold text-sm">
                  {filter === 'all' ? 'All Agencies' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tier`}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Sorted by revenue won, then by total bids
                </p>
              </div>
              {filter !== 'all' && (
                <button onClick={() => setFilter('all')}
                  className="text-slate-400 hover:text-white text-xs">Clear filter</button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/40">
                  <tr>
                    {['Agency','Tier','Bids','Wins','Win Rate','Revenue Won','Avg Win','Active','Status'].map(h => (
                      <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {filtered.map(a => {
                    const tier = TIER_STYLES[a.tier] || TIER_STYLES.new;
                    return (
                      <tr key={a.agency} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-slate-200 font-medium text-sm">{a.agency}</p>
                          <p className="text-slate-600 text-xs mt-0.5">{tier.desc}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${tier.cls}`}>
                            {tier.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm font-medium">{a.bids}</td>
                        <td className="px-4 py-3 text-green-400 text-sm font-medium">{a.wins}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${
                            a.win_rate >= 30 ? 'text-green-400' :
                            a.win_rate >= 15 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>{a.win_rate}%</span>
                        </td>
                        <td className="px-4 py-3 text-green-400 text-sm font-semibold">{fmt(a.total_won)}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{fmt(a.avg_win_amount)}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{a.active + a.submitted}</td>
                        <td className="px-4 py-3">
                          {a.tier === 'strong' && <span className="text-green-400 text-xs">✓ Double down</span>}
                          {a.tier === 'building' && <span className="text-blue-400 text-xs">↗ Keep pursuing</span>}
                          {a.tier === 'struggling' && <span className="text-red-400 text-xs">⏸ Reassess</span>}
                          {a.tier === 'new' && <span className="text-slate-500 text-xs">— New</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-700/60 bg-slate-900/20">
              <p className="text-slate-600 text-xs">
                <strong className="text-slate-400">Tier logic:</strong>{' '}
                Strong = 3+ wins &amp; 30%+ win rate · Building = 1+ win · Struggling = 3+ bids, 0 wins · New = &lt;3 bids
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
