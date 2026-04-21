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

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

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
      const url = agency ? `${BASE_URL}/api/pricing/${naics}/${encodeURIComponent(agency)}` : `${BASE_URL}/api/pricing/${naics}`;
      const r = await authFetch(url);
      const d = await r.json();
      if (d.error) setError(d.error); else setData(d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function runEstimate() {
    setEstLoading(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/proposals/estimate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: { naics_code: naics, estimated_value: data?.avg_award || 0 } }),
      });
      setEstimate(await r.json());
    } catch (e) { setError(e.message); }
    setEstLoading(false);
  }

  const naicsLabel = NAICS_OPTIONS.find(o => o.value === naics)?.label || naics;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Pricing Intelligence</h2>
        <p className="text-gray-500 text-sm mt-0.5">USASpending.gov · 3 years of federal award data</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-gray-900 font-semibold text-sm mb-4">Historical Award Lookup</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-56">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
            <select value={naics} onChange={e => { setNaics(e.target.value); setData(null); setEstimate(null); }} className={inputCls}>
              {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Agency <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
            <input value={agency} onChange={e => setAgency(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()} placeholder="e.g. Department of Defense" className={inputCls} />
          </div>
          <button onClick={lookup} disabled={loading}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Loading...</> : '🔍 Look Up Awards'}
          </button>
        </div>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
      </div>

      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-900 font-semibold">{naicsLabel}{agency ? ` · ${agency}` : ''}</h3>
              <p className="text-gray-400 text-xs mt-0.5">{data.award_count?.toLocaleString() || 0} federal awards · 2022–2025</p>
            </div>
            {data.award_count > 0 && (
              <button onClick={runEstimate} disabled={estLoading}
                className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {estLoading ? <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin inline-block"/>Calculating...</> : '💰 Run Cost Estimate'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Average Award', value: fmt(data.avg_award),  icon: '📊' },
              { label: 'Minimum Award', value: fmt(data.min_award),  icon: '⬇️' },
              { label: 'Maximum Award', value: fmt(data.max_award),  icon: '⬆️' },
              { label: 'Total Awards',  value: data.award_count?.toLocaleString() || 0, icon: '📋' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
                  <span className="text-base">{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">$</div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Competitive Bid Range</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Based on <strong className="text-white">{data.award_count?.toLocaleString()}</strong> awards{agency ? ` from ${agency}` : ''}, bid between{' '}
                  <strong className="text-white text-base">{fmt(data.avg_award * 0.85)}</strong> and{' '}
                  <strong className="text-white text-base">{fmt(data.avg_award * 1.05)}</strong> to be competitive.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {[
                    { label: 'Aggressive (85%)',    value: fmt(data.avg_award * 0.85), color: 'text-blue-300' },
                    { label: 'Midpoint (95%)',      value: fmt(data.avg_award * 0.95), color: 'text-white' },
                    { label: 'Conservative (105%)', value: fmt(data.avg_award * 1.05), color: 'text-amber-300' },
                  ].map(t => (
                    <div key={t.label} className="bg-white/10 rounded-lg px-3 py-2">
                      <p className="text-gray-400 text-xs">{t.label}</p>
                      <p className={`${t.color} font-bold text-sm mt-0.5`}>{t.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {data.top5?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h4 className="text-gray-900 font-semibold text-sm">Top Award Recipients</h4>
                <p className="text-gray-400 text-xs mt-0.5">Your competition for {naicsLabel} contracts</p>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">#</th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Recipient</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Award Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Array.isArray(data.top5) ? data.top5 : JSON.parse(data.top5 || '[]')).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-xs font-bold">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-700 text-sm">{r.name}</td>
                      <td className="px-5 py-3 text-right"><span className="text-gray-900 font-bold text-sm">{fmt(r.amount)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-gray-600 font-medium">Select a NAICS code and look up awards</p>
          <p className="text-gray-400 text-sm mt-1">See what agencies actually paid for similar work</p>
        </div>
      )}
    </div>
  );
}
