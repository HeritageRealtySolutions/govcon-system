import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_LABELS = {
  '238210': 'Electrical', '238220': 'Plumbing / HVAC', '238160': 'Roofing',
  '561730': 'Landscaping', '236220': 'General Construction',
};

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const URGENCY = {
  critical: { label: 'CRITICAL', cls: 'bg-red-50 text-red-700 border-red-200',       bar: 'border-l-red-500',    days: '≤30d' },
  high:     { label: 'HIGH',     cls: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'border-l-orange-500', days: '31-60d' },
  medium:   { label: 'MEDIUM',   cls: 'bg-amber-50 text-amber-700 border-amber-200',  bar: 'border-l-amber-500',  days: '61-90d' },
  watch:    { label: 'WATCH',    cls: 'bg-blue-50 text-blue-700 border-blue-200',     bar: 'border-l-blue-400',   days: '91-180d' },
};

const inputCls = "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

export default function Recompetes() {
  const [recompetes, setRecompetes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('all');
  const [naicsFilter, setNaicsFilter] = useState('all');

  async function load() {
    setLoading(true);
    try { const r = await authFetch(`${BASE_URL}/api/intelligence/recompetes`); const d = await r.json(); setRecompetes(Array.isArray(d) ? d : []); } catch {}
    setLoading(false);
  }

  async function refresh() {
    setRefreshing(true);
    try { await authFetch(`${BASE_URL}/api/intelligence/recompetes/refresh`, { method: 'POST' }); await load(); } catch {}
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = recompetes.filter(r => {
    if (filter !== 'all' && r.urgency !== filter) return false;
    if (naicsFilter !== 'all' && r.naics_code !== naicsFilter) return false;
    return true;
  });

  const counts = {
    all: recompetes.length,
    critical: recompetes.filter(r => r.urgency === 'critical').length,
    high:     recompetes.filter(r => r.urgency === 'high').length,
    medium:   recompetes.filter(r => r.urgency === 'medium').length,
    watch:    recompetes.filter(r => r.urgency === 'watch').length,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 text-xl font-bold">Recompete Alerts</h2>
          <p className="text-gray-500 text-sm mt-0.5">Federal contracts ending in 180 days — prime positioning windows</p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          {refreshing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Refreshing...</> : '⟳ Refresh Data'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <p className="text-amber-700 text-sm font-semibold mb-1">⚠ Verify on SAM.gov before acting</p>
        <p className="text-gray-500 text-xs">Data from USASpending.gov. Some contracts are extended via modifications. Use these as leads — always confirm on SAM.gov before committing resources.</p>
      </div>

      {/* Urgency summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'critical', label: 'Critical (≤30d)' },
          { key: 'high',     label: 'High (31-60d)' },
          { key: 'medium',   label: 'Medium (61-90d)' },
          { key: 'watch',    label: 'Watch (91-180d)' },
        ].map(tier => {
          const u = URGENCY[tier.key];
          return (
            <button key={tier.key} onClick={() => setFilter(tier.key)}
              className={`bg-white border border-gray-200 ${filter === tier.key ? 'ring-2 ring-gray-900' : ''} rounded-xl px-4 py-4 text-left hover:shadow-md transition-all shadow-sm`}>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{tier.label}</p>
              <p className="text-2xl font-bold text-gray-900">{counts[tier.key] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div>
          <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Urgency</label>
          <select value={filter} onChange={e => setFilter(e.target.value)} className={inputCls}>
            <option value="all">All ({counts.all})</option>
            <option value="critical">Critical ({counts.critical})</option>
            <option value="high">High ({counts.high})</option>
            <option value="medium">Medium ({counts.medium})</option>
            <option value="watch">Watch ({counts.watch})</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS</label>
          <select value={naicsFilter} onChange={e => setNaicsFilter(e.target.value)} className={inputCls}>
            <option value="all">All NAICS</option>
            {Object.entries(NAICS_LABELS).map(([code, label]) => <option key={code} value={code}>{code} — {label}</option>)}
          </select>
        </div>
        {(filter !== 'all' || naicsFilter !== 'all') && (
          <button onClick={() => { setFilter('all'); setNaicsFilter('all'); }}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors">Clear</button>
        )}
        <span className="ml-auto text-gray-400 text-sm">{filtered.length} results</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-gray-400 text-sm">No recompetes match your filters</p>
          {recompetes.length === 0 && <button onClick={refresh} className="mt-3 text-gray-900 text-sm font-semibold hover:underline">Click Refresh to pull data from USASpending</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const u = URGENCY[r.urgency] || URGENCY.watch;
            return (
              <div key={r.award_id || r.id}
                className={`bg-white border border-gray-200 border-l-4 ${u.bar} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${u.cls}`}>{u.label}</span>
                      <span className="text-gray-400 text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{r.naics_code}</span>
                      <span className="text-gray-400 text-xs">{NAICS_LABELS[r.naics_code]}</span>
                    </div>
                    <h3 className="text-gray-900 font-semibold text-sm line-clamp-2">{r.title || 'Untitled contract'}</h3>
                    <p className="text-gray-400 text-xs mt-1">{r.agency}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-400 text-xs">Ends in</p>
                    <p className={`text-2xl font-bold ${
                      r.days_remaining <= 30 ? 'text-red-600' : r.days_remaining <= 60 ? 'text-orange-600' :
                      r.days_remaining <= 90 ? 'text-amber-600' : 'text-blue-600'
                    }`}>{r.days_remaining}<span className="text-sm font-medium ml-1">days</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Incumbent',  value: r.incumbent || '—' },
                    { label: 'Award Value',value: fmt(r.award_amount) },
                    { label: 'Start Date', value: r.start_date ? new Date(r.start_date).toLocaleDateString() : '—' },
                    { label: 'End Date',   value: r.end_date   ? new Date(r.end_date).toLocaleDateString()   : '—' },
                  ].map(f => (
                    <div key={f.label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-gray-400 text-xs">{f.label}</p>
                      <p className="text-gray-700 text-xs font-medium mt-0.5 truncate">{f.value}</p>
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
