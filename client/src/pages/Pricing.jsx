import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, authFetch } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical Contractors' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — Commercial Construction' },
];

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, sub, color = 'text-green-400', icon }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-600 text-xs mt-1.5">{sub}</p>}
    </div>
  );
}

export default function Pricing() {
  const [naics, setNaics]           = useState('238210');
  const [agency, setAgency]         = useState('');
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [estimate, setEstimate]     = useState(null);
  const [estLoading, setEstLoading] = useState(false);
  const nav = useNavigate();

  async function lookup() {
    setLoading(true); setError(''); setData(null);
    try {
      const url = agency
        ? `${BASE_URL}/api/pricing/${naics}/${encodeURIComponent(agency)}`
        : `${BASE_URL}/api/pricing/${naics}`;
      const r = await authFetch(url);
      const d = await r.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function runEstimate() {
    setEstLoading(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: { naics_code: naics, estimated_value: data?.avg_award || 0 } }),
      });
      const d = await r.json();
      setEstimate(d);
    } catch (e) { setError(e.message); }
    setEstLoading(false);
  }

  const inputCls  = "w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-colors";
  const naicsLabel = NAICS_OPTIONS.find(o => o.value === naics)?.label || naics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">USASpending.gov · 3 years of federal award data · Cross-reference your cost estimate</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Historical Award Lookup</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-56">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
            <select value={naics} onChange={e => { setNaics(e.target.value); setData(null); setEstimate(null); }} className={inputCls}>
              {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">Agency <span className="text-slate-600 normal-case">(optional)</span></label>
            <input value={agency} onChange={e => setAgency(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="e.g. Department of Defense" className={inputCls} />
          </div>
          <button onClick={lookup} disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Loading...</> : '🔍 Look Up Awards'}
          </button>
        </div>
        {error && <div className="mt-4 bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
      </div>

      {data && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">{naicsLabel}{agency ? ` · ${agency}` : ''}</h2>
              <p className="text-slate-500 text-xs mt-0.5">Based on {data.award_count?.toLocaleString() || 0} federal awards · 2022–2025</p>
            </div>
            {data.award_count > 0 && (
              <button onClick={runEstimate} disabled={estLoading}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-slate-600">
                {estLoading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Calculating...</> : '💰 Run Cost Estimate'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Average Award"  value={fmt(data.avg_award)}   sub="historical mean"    color="text-green-400"  icon="📊" />
            <StatCard label="Minimum Award"  value={fmt(data.min_award)}   sub="floor observed"     color="text-blue-400"   icon="⬇️" />
            <StatCard label="Maximum Award"  value={fmt(data.max_award)}   sub="ceiling observed"   color="text-yellow-400" icon="⬆️" />
            <StatCard label="Total Awards"   value={data.award_count?.toLocaleString() || 0} sub="contracts analyzed" color="text-white" icon="📋" />
          </div>

          <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">$</div>
              <div className="flex-1">
                <h3 className="text-green-300 font-semibold mb-2">Competitive Bid Range</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Based on <strong className="text-white">{data.award_count?.toLocaleString()}</strong> awards{agency ? ` from ${agency}` : ''}, bid between{' '}
                  <strong className="text-green-400 text-base">{fmt(data.avg_award * 0.85)}</strong> and{' '}
                  <strong className="text-green-400 text-base">{fmt(data.avg_award * 1.05)}</strong> to be competitive.
                </p>
                <div className="flex flex-wrap gap-4 mt-3">
                  {[
                    { label: 'Aggressive (85%)',    value: fmt(data.avg_award * 0.85), color: 'text-blue-400' },
                    { label: 'Midpoint (95%)',      value: fmt(data.avg_award * 0.95), color: 'text-green-400' },
                    { label: 'Conservative (105%)', value: fmt(data.avg_award * 1.05), color: 'text-yellow-400' },
                  ].map(t => (
                    <div key={t.label} className="bg-slate-900/60 rounded-lg px-3 py-2">
                      <p className="text-slate-500 text-xs">{t.label}</p>
                      <p className={`${t.color} font-bold text-sm mt-0.5`}>{t.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {data.top5?.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/60">
                <h3 className="text-white font-semibold text-sm">Top Award Recipients</h3>
                <p className="text-slate-500 text-xs mt-0.5">Your competition — companies winning {naicsLabel} contracts</p>
              </div>
              <table className="w-full">
                <thead className="bg-slate-900/40">
                  <tr>
                    <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">#</th>
                    <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Recipient</th>
                    <th className="text-right text-slate-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Award Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {(Array.isArray(data.top5) ? data.top5 : JSON.parse(data.top5 || '[]')).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-5 py-3 text-slate-600 text-xs font-bold">{i + 1}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{r.name}</td>
                      <td className="px-5 py-3 text-right"><span className="text-green-400 font-bold text-sm">{fmt(r.amount)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl py-16 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-slate-400 font-medium">Select a NAICS code and look up awards</p>
          <p className="text-slate-600 text-sm mt-1">See what agencies actually paid for similar work</p>
        </div>
      )}
    </div>
  );
}
