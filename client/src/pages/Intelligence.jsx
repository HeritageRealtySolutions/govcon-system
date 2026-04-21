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

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${
        score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
      }`}>{score}</span>
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

  const headers = { Authorization: `Bearer ${getToken()}` };

  useEffect(() => { loadNaicsScores(); }, []);

  useEffect(() => {
    if (activeTab === 'competitors') loadCompetitors(selectedNaics);
  }, [activeTab, selectedNaics]);

  async function loadNaicsScores() {
    setLoadingNaics(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/naics-scores`, { headers });
      const d = await r.json();
      setNaicsScores(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    setLoadingNaics(false);
  }

  async function refreshNaicsScores() {
    setRefreshing(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/naics-scores/refresh`, {
        method: 'POST', headers
      });
      const d = await r.json();
      if (d.scores) setNaicsScores(d.scores);
    } catch (e) { console.error(e); }
    setRefreshing(false);
  }

  async function loadCompetitors(naicsCode) {
    setLoadingComp(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/competitors/${naicsCode}`, { headers });
      const d = await r.json();
      setCompetitors(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); }
    setLoadingComp(false);
  }

  const inputCls = "bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Market Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">NAICS performance scoring and competitor analysis</p>
      </div>

      <div className="flex gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl p-1 w-fit">
        {[
          { id: 'naics',       label: '📊 NAICS Scoring' },
          { id: 'competitors', label: '🎯 Competitor Tracking' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'naics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Scored by market volume, avg award size, and competition. Higher = better opportunity.
            </p>
            <button onClick={refreshNaicsScores} disabled={refreshing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {refreshing
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Refreshing...</>
                : '⟳ Refresh Scores'
              }
            </button>
          </div>

          {loadingNaics ? (
            <div className="flex items-center justify-center py-20">
              <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin"/>
            </div>
          ) : naicsScores.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl py-16 text-center">
              <p className="text-slate-400 text-sm">No scores yet</p>
              <button onClick={refreshNaicsScores} className="mt-3 text-green-400 text-sm hover:underline">
                Click Refresh to score your NAICS codes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {naicsScores.map((s, i) => (
                <div key={s.naics_code}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-green-600 text-white' :
                      i === 1 ? 'bg-blue-600 text-white' :
                      'bg-slate-700 text-slate-300'
                    }`}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div>
                          <span className="text-white font-semibold">{s.naics_description || NAICS_LABELS[s.naics_code]}</span>
                          <span className="text-slate-500 text-xs font-mono ml-2">{s.naics_code}</span>
                        </div>
                        <div className="flex-shrink-0 w-48">
                          <ScoreBar score={s.score || 0} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                        {[
                          { label: 'Contract Volume',  value: s.contract_volume || 0, suffix: ' awards' },
                          { label: 'Avg Award Size',   value: fmt(s.avg_award_size), suffix: '' },
                          { label: 'Total Market',     value: fmt(s.total_market_value), suffix: '' },
                          { label: 'Competition Pool', value: s.competition_pool || 0, suffix: ' companies' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-slate-900/40 rounded-lg px-3 py-2">
                            <p className="text-slate-500 text-xs">{stat.label}</p>
                            <p className="text-white font-semibold text-sm mt-0.5">
                              {stat.value}{stat.suffix}
                            </p>
                          </div>
                        ))}
                      </div>
                      {i === 0 && (
                        <div className="mt-3 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2">
                          <p className="text-green-300 text-xs font-medium">
                            ⭐ Top priority — focus your bidding resources here first
                          </p>
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
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                NAICS Code
              </label>
              <select value={selectedNaics}
                onChange={e => setSelectedNaics(e.target.value)}
                className={inputCls}>
                {Object.entries(NAICS_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => loadCompetitors(selectedNaics)} disabled={loadingComp}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors mt-6">
              {loadingComp
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Loading...</>
                : '🔍 Pull Competitors'
              }
            </button>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 text-xs text-slate-500">
            Pulling top 10 companies winning {NAICS_LABELS[selectedNaics]} contracts from USASpending.gov (2022–2025, set-aside awards)
          </div>

          {loadingComp ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin inline-block mb-3"/>
                <p className="text-slate-400 text-sm">Pulling competitor data from USASpending...</p>
              </div>
            </div>
          ) : competitors.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl py-16 text-center">
              <p className="text-slate-400 text-sm">No competitor data yet</p>
              <p className="text-slate-600 text-xs mt-1">Click "Pull Competitors" to load</p>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold text-sm">
                    Top Competitors — {NAICS_LABELS[selectedNaics]}
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5">
                    These companies are winning the contracts you're bidding on
                  </p>
                </div>
                <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  {competitors.length} companies
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/40">
                    <tr>
                      {['Rank','Company','Awards','Avg Award','Total Won','Top Agencies'].map(h => (
                        <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {competitors.map((c, i) => (
                      <tr key={c.id || i} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-yellow-500 text-slate-900' :
                            i === 1 ? 'bg-slate-400 text-slate-900' :
                            i === 2 ? 'bg-orange-700 text-white' :
                            'bg-slate-700 text-slate-400'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-200 font-medium text-sm">{c.company_name}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{c.award_count}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{fmt(c.avg_award)}</td>
                        <td className="px-4 py-3">
                          <span className="text-green-400 font-semibold text-sm">{fmt(c.total_award_amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(c.top_agencies || []).slice(0, 2).map((a, j) => (
                              <span key={j} className="text-xs bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded truncate max-w-32">
                                {a}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-slate-700/60 bg-slate-900/20">
                <p className="text-slate-600 text-xs">
                  Study their SAM.gov profiles for past performance, bonding, and 8(a) positioning strategies.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
