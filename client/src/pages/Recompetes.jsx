import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const NAICS_LABELS = {
  '238210': 'Electrical',
  '238220': 'Plumbing / HVAC',
  '238160': 'Roofing',
  '561730': 'Landscaping',
  '236220': 'General Construction',
};

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getToken() {
  return sessionStorage.getItem('lumen_token') || localStorage.getItem('lumen_token');
}

const URGENCY_STYLES = {
  critical: { label: '🔴 CRITICAL', cls: 'bg-red-900/60 text-red-300 border-red-700',       bg: 'border-l-red-500' },
  high:     { label: '🟠 HIGH',     cls: 'bg-orange-900/60 text-orange-300 border-orange-700', bg: 'border-l-orange-500' },
  medium:   { label: '🟡 MEDIUM',   cls: 'bg-yellow-900/60 text-yellow-300 border-yellow-700', bg: 'border-l-yellow-500' },
  watch:    { label: '🔵 WATCH',    cls: 'bg-blue-900/60 text-blue-300 border-blue-700',     bg: 'border-l-blue-500' },
};

export default function Recompetes() {
  const [recompetes, setRecompetes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('all');
  const [naicsFilter, setNaicsFilter] = useState('all');

  const headers = { Authorization: `Bearer ${getToken()}` };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/recompetes`, { headers });
      const d = await r.json();
      setRecompetes(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await fetch(`${BASE_URL}/api/intelligence/recompetes/refresh`, { method: 'POST', headers });
      await load();
    } catch (e) { console.error(e); }
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = recompetes.filter(r => {
    if (filter !== 'all' && r.urgency !== filter) return false;
    if (naicsFilter !== 'all' && r.naics_code !== naicsFilter) return false;
    return true;
  });

  const counts = {
    all:      recompetes.length,
    critical: recompetes.filter(r => r.urgency === 'critical').length,
    high:     recompetes.filter(r => r.urgency === 'high').length,
    medium:   recompetes.filter(r => r.urgency === 'medium').length,
    watch:    recompetes.filter(r => r.urgency === 'watch').length,
  };

  const inputCls = "bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 transition-colors";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recompete Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Federal contracts in your NAICS codes ending in the next 180 days — prime positioning windows
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          {refreshing
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Refreshing...</>
            : '⟳ Refresh Data'
          }
        </button>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-5 py-4">
        <p className="text-yellow-300 text-sm font-semibold mb-1">⚠ Verify on SAM.gov before acting</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Data pulled from USASpending.gov. Some contracts are extended via modifications or are open-ended IDVs.
          Use these alerts as leads — always confirm the actual recompete status on SAM.gov before committing bid resources.
        </p>
      </div>

      {/* Urgency summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'critical', label: 'Critical (≤30d)', color: 'text-red-400',    border: 'border-red-700/40' },
          { key: 'high',     label: 'High (31-60d)',   color: 'text-orange-400', border: 'border-orange-700/40' },
          { key: 'medium',   label: 'Medium (61-90d)', color: 'text-yellow-400', border: 'border-yellow-700/40' },
          { key: 'watch',    label: 'Watch (91-180d)', color: 'text-blue-400',   border: 'border-blue-700/40' },
        ].map(tier => (
          <button key={tier.key} onClick={() => setFilter(tier.key)}
            className={`bg-slate-800/60 border ${tier.border} ${filter === tier.key ? 'ring-2 ring-green-500' : ''}
              rounded-xl px-4 py-4 text-left hover:border-slate-500 transition-all`}>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{tier.label}</p>
            <p className={`text-2xl font-bold ${tier.color}`}>{counts[tier.key] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div>
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Urgency</label>
          <select value={filter} onChange={e => setFilter(e.target.value)} className={inputCls}>
            <option value="all">All Urgencies ({counts.all})</option>
            <option value="critical">Critical ({counts.critical})</option>
            <option value="high">High ({counts.high})</option>
            <option value="medium">Medium ({counts.medium})</option>
            <option value="watch">Watch ({counts.watch})</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
          <select value={naicsFilter} onChange={e => setNaicsFilter(e.target.value)} className={inputCls}>
            <option value="all">All NAICS Codes</option>
            {Object.entries(NAICS_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{code} — {label}</option>
            ))}
          </select>
        </div>
        {(filter !== 'all' || naicsFilter !== 'all') && (
          <button onClick={() => { setFilter('all'); setNaicsFilter('all'); }}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-slate-500 text-sm">{filtered.length} results</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl py-16 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-400 text-sm">No recompetes match your filters</p>
          {recompetes.length === 0 && (
            <button onClick={refresh} className="mt-3 text-green-400 text-sm hover:underline">
              Click Refresh to pull recompetes from USASpending
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const style = URGENCY_STYLES[r.urgency] || URGENCY_STYLES.watch;
            return (
              <div key={r.award_id || r.id}
                className={`bg-slate-800/60 border border-slate-700/60 border-l-4 ${style.bg} rounded-xl p-5 hover:border-slate-600 transition-colors`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${style.cls}`}>
                        {style.label}
                      </span>
                      <span className="text-slate-600 text-xs font-mono bg-slate-700/60 px-1.5 py-0.5 rounded">
                        {r.naics_code}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {NAICS_LABELS[r.naics_code] || r.naics_code}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-sm line-clamp-2">
                      {r.title || 'Untitled contract'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">{r.agency}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-slate-500 text-xs">Ends in</p>
                    <p className={`text-2xl font-bold ${
                      r.days_remaining <= 30 ? 'text-red-400' :
                      r.days_remaining <= 60 ? 'text-orange-400' :
                      r.days_remaining <= 90 ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>{r.days_remaining}<span className="text-sm font-medium ml-1">days</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Incumbent',    value: r.incumbent || '—' },
                    { label: 'Award Value',  value: fmt(r.award_amount) },
                    { label: 'Start Date',   value: r.start_date ? new Date(r.start_date).toLocaleDateString() : '—' },
                    { label: 'End Date',     value: r.end_date   ? new Date(r.end_date).toLocaleDateString() : '—' },
                  ].map(f => (
                    <div key={f.label} className="bg-slate-900/40 rounded-lg px-3 py-2">
                      <p className="text-slate-500 text-xs">{f.label}</p>
                      <p className="text-slate-200 text-xs font-medium mt-0.5 truncate">{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
