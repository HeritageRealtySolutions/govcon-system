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

const inputCls = "bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400';
  const textColor = score >= 70 ? 'text-emerald-700' : score >= 50 ? 'text-amber-700' : 'text-red-600';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

export default function Intelligence() {
  const [activeTab, setActiveTab]         = useState('naics');
  const [naicsScores, setNaicsScores]     = useState([]);
  const [competitors, setCompetitors]     = useState([]);
  const [selectedNaics, setSelectedNaics] = useState('238210');
  const [loadingNaics, setLoadingNaics]   = useState(false);
  const [loadingComp, setLoadingComp]     = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  const headers = { Authorization: `Bearer ${sessionStorage.getItem('lumen_token') || localStorage.getItem('lumen_token')}` };

  useEffect(() => { loadNaicsScores(); }, []);
  useEffect(() => { if (activeTab === 'competitors') loadCompetitors(selectedNaics); }, [activeTab, selectedNaics]);

  async function loadNaicsScores() {
    setLoadingNaics(true);
    try { const r = await authFetch(`${BASE_URL}/api/intelligence/naics-scores`); const d = await r.json(); setNaicsScores(Array.isArray(d) ? d : []); } catch {}
    setLoadingNaics(false);
  }

  async function refreshNaicsScores() {
    setRefreshing(true);
    try {
      const r = await authFetch(`${BASE_URL}/api/intelligence/naics-scores/refresh`, { method: 'POST' });
      const d = await r.json();
      if (d.scores) setNaicsScores(d.scores);
    } catch {}
    setRefreshing(false);
  }

  async function loadCompetitors(naicsCode) {
    setLoadingComp(true);
    try { const r = await authFetch(`${BASE_URL}/api/intelligence/competitors/${naicsCode}`); const d = await r.json(); setCompetitors(Array.isArray(d) ? d : []); } catch {}
    setLoadingComp(false);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Market Intelligence</h2>
        <p className="text-gray-500 text-sm mt-0.5">NAICS performance scoring and competitor analysis</p>
      </div>

      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'naics', label: '📊 NAICS Scoring' },
          { id: 'competitors', label: '🎯 Competitor Tracking' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'naics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">Scored by market volume, avg award size, and competition. Higher = better opportunity.</p>
            <button onClick={refreshNaicsScores} disabled={refreshing}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {refreshing ? <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin inline-block"/>Refreshing...</> : '⟳ Refresh Scores'}
            </button>
          </div>

          {loadingNaics ? (
            <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/></div>
          ) : naicsScores.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No scores yet</p>
              <button onClick={refreshNaicsScores} className="mt-3 text-gray-900 text-sm font-semibold hover:underline">Click Refresh to score your NAICS codes</button>
            </div>
          ) : (
            <div className="space-y-3">
              {naicsScores.map((s, i) => (
                <div key={s.naics_code} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-gray-900 text-white' : i === 1 ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div>
                          <span className="text-gray-900 font-semibold">{s.naics_description || NAICS_LABELS[s.naics_code]}</span>
                          <span className="text-gray-400 text-xs font-mono ml-2">{s.naics_code}</span>
                        </div>
                        <div className="flex-shrink-0 w-40"><ScoreBar score={s.score || 0} /></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Contract Volume', value: `${s.contract_volume || 0} awards` },
                          { label: 'Avg Award Size',  value: fmt(s.avg_award_size) },
                          { label: 'Total Market',    value: fmt(s.total_market_value) },
                          { label: 'Competition',     value: `${s.competition_pool || 0} companies` },
                        ].map(stat => (
                          <div key={stat.label} className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-gray-400 text-xs">{stat.label}</p>
                            <p className="text-gray-900 font-semibold text-sm mt-0.5">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      {i === 0 && (
                        <div className="mt-3 bg-gray-900 rounded-lg px-3 py-2">
                          <p className="text-white text-xs font-medium">⭐ Top priority — focus your bidding resources here first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'competitors' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">NAICS Code</label>
              <select value={selectedNaics} onChange={e => setSelectedNaics(e.target.value)} className={inputCls}>
                {Object.entries(NAICS_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => loadCompetitors(selectedNaics)} disabled={loadingComp}
              className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors mt-6">
              {loadingComp ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Loading...</> : '🔍 Pull Competitors'}
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-xs text-gray-500">
            Pulling top 10 companies winning {NAICS_LABELS[selectedNaics]} contracts from USASpending.gov (2022–2025, set-aside awards)
          </div>

          {loadingComp ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin inline-block mb-3"/>
                <p className="text-gray-400 text-sm">Pulling competitor data from USASpending...</p>
              </div>
            </div>
          ) : competitors.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No competitor data yet</p>
              <p className="text-gray-300 text-xs mt-1">Click "Pull Competitors" to load</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-semibold text-sm">Top Competitors — {NAICS_LABELS[selectedNaics]}</h3>
                  <p className="text-gray-400 text-xs mt-0.5">These companies are winning the contracts you're bidding on</p>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{competitors.length} companies</span>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Rank','Company','Awards','Avg Award','Total Won','Top Agencies'].map(h => (
                      <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {competitors.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-gray-900 text-white' : i === 1 ? 'bg-gray-600 text-white' : i === 2 ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium text-sm">{c.company_name}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{c.award_count}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{fmt(c.avg_award)}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold text-sm">{fmt(c.total_award_amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.top_agencies || []).slice(0, 2).map((a, j) => (
                            <span key={j} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded truncate max-w-28">{a}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-gray-400 text-xs">Study their SAM.gov profiles for past performance, bonding, and 8(a) positioning strategies.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
