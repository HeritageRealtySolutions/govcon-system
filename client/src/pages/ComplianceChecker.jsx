import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#EF4444' : '#6B7280';
  const label = score >= 80 ? 'Compliant' : score >= 60 ? 'Needs Work' : score >= 40 ? 'At Risk' : 'Non-Compliant';
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="10" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${score * 2.638} 263.8`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: 'bg-red-50 text-red-700 border-red-200',
    high:     'bg-orange-50 text-orange-700 border-orange-200',
    medium:   'bg-amber-50 text-amber-700 border-amber-200',
    low:      'bg-blue-50 text-blue-700 border-blue-200',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${styles[severity] || styles.low}`}>{severity}</span>;
}

const textAreaCls = "w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 text-sm leading-relaxed resize-y focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";
const inputCls    = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

export default function ComplianceChecker() {
  const [title, setTitle]               = useState('');
  const [solText, setSolText]           = useState('');
  const [propText, setPropText]         = useState('');
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [history, setHistory]           = useState([]);
  const [activeTab, setActiveTab]       = useState('check');
  const [expandedSec, setExpandedSec]   = useState('missing');

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      const r = await authFetch(`${BASE_URL}/api/compliance/history`);
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch {}
  }

  async function runCheck() {
    if (!solText.trim()) { setError('Paste the solicitation text first'); return; }
    if (!propText.trim()) { setError('Paste your proposal draft first'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await authFetch(`${BASE_URL}/api/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, solicitation_text: solText, proposal_text: propText }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setResult(d); loadHistory(); }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function loadCheck(id) {
    try {
      const r = await authFetch(`${BASE_URL}/api/compliance/history/${id}`);
      const d = await r.json();
      if (d.result) { setResult(d.result); setActiveTab('check'); }
    } catch {}
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">FAR/DFARS Compliance Checker</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          Paste your solicitation and proposal — AI checks compliance, flags missing requirements, and identifies risky language
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-xl p-1 w-fit">
        {[
          { id: 'check',   label: '🔍 Run Check' },
          { id: 'history', label: `📋 History (${history.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}>{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'check' && (
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Bid Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Electrical Renovation - USACE Jackson District" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Solicitation Text
                  <span className="text-gray-400 normal-case font-normal ml-1">— paste Section L, M, or full RFP</span>
                </label>
                <textarea rows={12} value={solText} onChange={e => setSolText(e.target.value)}
                  placeholder="Paste the full solicitation text here — including evaluation criteria (Section M) and proposal instructions (Section L)..."
                  className={textAreaCls} />
              </div>
              <div>
                <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Your Proposal Draft
                  <span className="text-gray-400 normal-case font-normal ml-1">— paste full draft</span>
                </label>
                <textarea rows={12} value={propText} onChange={e => setPropText(e.target.value)}
                  placeholder="Paste your proposal draft here — cover letter, technical approach, management plan, past performance, pricing narrative..."
                  className={textAreaCls} />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <div className="flex items-center gap-4">
              <button onClick={runCheck} disabled={loading || !solText.trim() || !propText.trim()}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Analyzing...</>
                  : '🔍 Run Compliance Check'
                }
              </button>
              {loading && <p className="text-gray-400 text-sm">Gemini is analyzing your proposal against solicitation requirements...</p>}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Score + Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-8">
                  <ScoreRing score={result.compliance_score || 0} />
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-semibold mb-2">Compliance Summary</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{result.summary}</p>

                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      {[
                        { label: 'Requirements Met',   value: result.covered_requirements?.length || 0,  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                        { label: 'Missing',            value: result.missing_requirements?.length || 0,  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'     },
                        { label: 'Risky Language',     value: result.risky_language?.length || 0,        color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
                        { label: 'FAR/DFARS Flags',    value: result.far_flags?.length || 0,             color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} border ${s.border} rounded-lg px-3 py-2`}>
                          <p className="text-gray-500 text-xs">{s.label}</p>
                          <p className={`${s.color} text-lg font-bold`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority fixes */}
              {result.priority_fixes?.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-sm mb-3">⚡ Priority Fixes — Do These First</h3>
                  <ol className="space-y-2">
                    {result.priority_fixes.map((fix, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-300">
                        <span className="bg-white/10 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {fix}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Detail sections */}
              {[
                {
                  key: 'missing',
                  title: `❌ Missing Requirements (${result.missing_requirements?.length || 0})`,
                  border: 'border-red-200', bg: 'bg-red-50',
                  content: result.missing_requirements?.length > 0 ? (
                    <div className="space-y-3">
                      {result.missing_requirements.map((req, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-gray-900 font-medium text-sm">{req.requirement}</p>
                            <SeverityBadge severity={req.severity} />
                          </div>
                          <p className="text-gray-500 text-xs leading-relaxed"><strong className="text-gray-700">Fix:</strong> {req.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No missing requirements — all criteria addressed ✓</p>,
                },
                {
                  key: 'risky',
                  title: `⚠ Risky Language (${result.risky_language?.length || 0})`,
                  border: 'border-amber-200', bg: 'bg-amber-50',
                  content: result.risky_language?.length > 0 ? (
                    <div className="space-y-3">
                      {result.risky_language.map((item, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Flagged Text</p>
                          <p className="text-red-700 text-sm font-mono bg-red-50 rounded px-2 py-1 mb-2">"{item.text}"</p>
                          <p className="text-gray-600 text-xs mb-2"><strong>Issue:</strong> {item.issue}</p>
                          <p className="text-gray-600 text-xs"><strong className="text-emerald-700">Suggestion:</strong> {item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No risky language detected ✓</p>,
                },
                {
                  key: 'far',
                  title: `📋 FAR/DFARS Flags (${result.far_flags?.length || 0})`,
                  border: 'border-blue-200', bg: 'bg-blue-50',
                  content: result.far_flags?.length > 0 ? (
                    <div className="space-y-2">
                      {result.far_flags.map((flag, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${
                            flag.status === 'met'     ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            flag.status === 'not_met' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {flag.status === 'met' ? '✓ MET' : flag.status === 'not_met' ? '✗ NOT MET' : '? UNCLEAR'}
                          </span>
                          <div>
                            <p className="text-gray-900 text-xs font-semibold">{flag.clause}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{flag.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No FAR/DFARS flags identified</p>,
                },
                {
                  key: 'covered',
                  title: `✅ Covered Requirements (${result.covered_requirements?.length || 0})`,
                  border: 'border-emerald-200', bg: 'bg-emerald-50',
                  content: result.covered_requirements?.length > 0 ? (
                    <div className="space-y-2">
                      {result.covered_requirements.map((req, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-start gap-3">
                          <span className="text-emerald-600 font-bold text-sm flex-shrink-0">✓</span>
                          <div>
                            <p className="text-gray-900 text-sm">{req.requirement}</p>
                            {req.section && <p className="text-gray-400 text-xs mt-0.5">Found in: {req.section}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">No covered requirements mapped</p>,
                },
              ].map(section => (
                <div key={section.key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedSec(expandedSec === section.key ? null : section.key)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <h3 className="text-gray-900 font-semibold text-sm">{section.title}</h3>
                    <span className="text-gray-400 text-sm">{expandedSec === section.key ? '▲' : '▼'}</span>
                  </button>
                  {expandedSec === section.key && (
                    <div className="px-5 pb-5">{section.content}</div>
                  )}
                </div>
              ))}

              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <h3 className="text-emerald-700 font-semibold text-sm mb-3">💪 Proposal Strengths</h3>
                  <ul className="space-y-1.5">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-semibold text-sm">Compliance Check History</h3>
          </div>
          {history.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-gray-400 text-sm">No compliance checks yet</p>
              <p className="text-gray-300 text-xs mt-1">Run your first check to see history here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Title','Score','Date','Action'].map(h => (
                    <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 text-sm font-medium">{h.title || 'Untitled Check'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${
                        h.compliance_score >= 80 ? 'text-emerald-700' :
                        h.compliance_score >= 60 ? 'text-amber-700' : 'text-red-700'
                      }`}>{h.compliance_score}/100</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(h.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => loadCheck(h.id)}
                        className="text-gray-900 hover:text-black text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
