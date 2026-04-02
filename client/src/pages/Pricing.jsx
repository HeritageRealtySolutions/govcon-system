import React, { useState } from 'react';
import { BASE_URL } from '../utils/api';

const NAICS_OPTIONS = [
  { value: '238210', label: '238210 — Electrical Contractors' },
  { value: '238220', label: '238220 — Plumbing / HVAC' },
  { value: '238160', label: '238160 — Roofing' },
  { value: '561730', label: '561730 — Landscaping' },
  { value: '236220', label: '236220 — Commercial Construction' },
];

function fmt(n) {
  if (!n) return '—';
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function BigStat({ label, value, color = 'text-green-400' }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function Pricing() {
  const [naics, setNaics] = useState('238210');
  const [agency, setAgency] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function lookup() {
    setLoading(true); setError(''); setData(null);
    try {
      const url = agency
        ? `${BASE_URL}/api/pricing/${naics}/${encodeURIComponent(agency)}`
        : `${BASE_URL}/api/pricing/${naics}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Historical Pricing Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">Powered by USASpending.gov — last 3 years of federal award data</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-56">
            <label className="label">NAICS Code</label>
            <select value={naics} onChange={e => setNaics(e.target.value)} className="input">
              {NAICS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="label">Agency Name <span className="text-slate-500">(optional)</span></label>
            <input value={agency} onChange={e => setAgency(e.target.value)}
              placeholder="e.g. Department of Defense"
              className="input" />
          </div>
          <button onClick={lookup} disabled={loading} className="btn-primary self-end">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : 'Look Up Pricing'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <BigStat label="Average Award" value={fmt(data.avg_award)} color="text-green-400" />
            <BigStat label="Minimum Award" value={fmt(data.min_award)} color="text-blue-400" />
            <BigStat label="Maximum Award" value={fmt(data.max_award)} color="text-yellow-400" />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Awards Analyzed</p>
            <p className="text-5xl font-bold text-white">{data.award_count?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-green-950 border border-green-700 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">$</div>
              <div>
                <h3 className="text-green-400 font-semibold mb-1">Bid Recommendation</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Based on <strong className="text-white">{data.award_count}</strong> similar awards, bid between{' '}
                  <strong className="text-green-400">{fmt(data.avg_award * 0.85)}</strong> and{' '}
                  <strong className="text-green-400">{fmt(data.avg_award * 1.05)}</strong> to be competitive.
                </p>
                <p className="text-slate-500 text-xs mt-1.5">Range = 85%–105% of historical average (set-aside awards, 2022–2025)</p>
              </div>
            </div>
          </div>

          {data.top5?.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h3 className="text-slate-200 font-semibold">Top Award Recipients</h3>
              </div>
              <table className="w-full">
                <thead className="bg-slate-900/60">
                  <tr>
                    <th className="table-header">Recipient</th>
                    <th className="table-header text-right">Award Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top5.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="table-cell text-slate-300">{r.name}</td>
                      <td className="table-cell text-right text-green-400 font-semibold">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
