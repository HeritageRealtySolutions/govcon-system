import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const TPL_NAMES = [
  { key: 'technical_approach', label: 'Technical Approach' },
  { key: 'past_performance', label: 'Past Performance' },
  { key: 'management_approach', label: 'Management Approach' },
  { key: 'company_profile', label: 'Company Profile' },
];

function Section({ title, children, accent = false }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-green-950 border-green-700' : 'bg-slate-800 border-slate-700'}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${accent ? 'text-green-400' : 'text-slate-400'}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Proposals() {
  const [opps, setOpps] = useState([]);
  const [municipal, setMunicipal] = useState([]);
  const [source, setSource] = useState('federal');
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState({});
  const [editingTpl, setEditingTpl] = useState(null);
  const [tplContent, setTplContent] = useState('');
  const [tplSaved, setTplSaved] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/opportunities`).then(r => r.json()).then(setOpps).catch(() => {});
    fetch(`${BASE_URL}/api/municipal`).then(r => r.json()).then(setMunicipal).catch(() => {});
    fetch(`${BASE_URL}/api/proposals/templates`).then(r => r.json()).then(setTemplates).catch(() => {});
  }, []);

  const list = source === 'federal' ? opps : municipal;
  const selectedOpp = list.find(o => String(o.id) === String(selected));

  async function generate() {
    if (!selectedOpp) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch(`${BASE_URL}/api/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity: selectedOpp }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else setResult(d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function saveTpl() {
    await fetch(`${BASE_URL}/api/proposals/templates/${editingTpl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tplContent }),
    });
    setTemplates(t => ({ ...t, [editingTpl]: tplContent }));
    setTplSaved(true);
    setTimeout(() => setTplSaved(false), 3000);
  }

  function exportText() {
    if (!result || !selectedOpp) return;
    const lines = [
      `PROPOSAL DRAFT`,
      `Opportunity: ${selectedOpp.title}`,
      `Agency: ${selectedOpp.agency}`,
      `NAICS: ${selectedOpp.naics_code}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '', '═══════════════════════════════════════',
      '', 'EXECUTIVE SUMMARY',
      '───────────────────────────────────────',
      result.executive_summary || '',
      '', 'TECHNICAL APPROACH',
      '───────────────────────────────────────',
      result.technical_approach || '',
      '', 'KEY DIFFERENTIATORS',
      '───────────────────────────────────────',
      ...(result.differentiators || []).map(d => `  • ${d}`),
      '', 'PRICING RECOMMENDATION',
      '───────────────────────────────────────',
      `  Suggested Bid: $${result.pricing_recommendation?.suggested_bid?.toLocaleString() || '—'}`,
      `  Rationale: ${result.pricing_recommendation?.rationale || ''}`,
      '', 'PAST PERFORMANCE ANGLE',
      '───────────────────────────────────────',
      result.past_performance_angle || '',
      '', '═══════════════════════════════════════',
      '', 'BASE TEMPLATES',
      '', '[ Technical Approach ]', templates.technical_approach || '',
      '', '[ Management Approach ]', templates.management_approach || '',
      '', '[ Past Performance ]', templates.past_performance || '',
      '', '[ Company Profile ]', templates.company_profile || '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `proposal_${selectedOpp.title?.substring(0, 30).replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Proposal Generator</h1>
        <p className="text-slate-400 text-sm mt-1">AI-powered draft generation using Claude — template-first approach</p>
      </div>

      {/* Generator Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Source</label>
            <select value={source} onChange={e => { setSource(e.target.value); setSelected(''); setResult(null); }}
              className="input w-40">
              <option value="federal">Federal (SAM.gov)</option>
              <option value="municipal">Municipal</option>
            </select>
          </div>
          <div className="flex-1 min-w-64">
            <label className="label">Select Opportunity</label>
            <select value={selected} onChange={e => { setSelected(e.target.value); setResult(null); }}
              className="input">
              <option value="">Choose an opportunity...</option>
              {list.map(o => (
                <option key={o.id} value={o.id}>{o.title?.substring(0, 75)}</option>
              ))}
            </select>
          </div>
          <button onClick={generate} disabled={!selected || loading} className="btn-primary self-end">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : '✦ Generate Draft'}
          </button>
          {result && (
            <button onClick={exportText} className="btn-secondary self-end">↓ Export .txt</button>
          )}
        </div>
        {error && (
          <div className="mt-3 bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-2.5 rounded-lg">{error}</div>
        )}
      </div>

      {/* Proposal Output */}
      {result && (
        <div className="space-y-4 mb-8">
          <Section title="Executive Summary">
            <p className="text-slate-300 text-sm leading-relaxed">{result.executive_summary}</p>
          </Section>

          <Section title="Technical Approach">
            <p className="text-slate-300 text-sm leading-relaxed">{result.technical_approach}</p>
          </Section>

          <Section title="Key Differentiators">
            <ul className="space-y-2">
              {(result.differentiators || []).map((d, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Pricing Recommendation" accent={true}>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-4xl font-bold text-green-400">
                ${result.pricing_recommendation?.suggested_bid?.toLocaleString() || '—'}
              </span>
              <span className="text-slate-400 text-sm">suggested bid</span>
            </div>
            <p className="text-slate-400 text-sm">{result.pricing_recommendation?.rationale}</p>
          </Section>

          <Section title="Past Performance Angle">
            <p className="text-slate-300 text-sm leading-relaxed">{result.past_performance_angle}</p>
          </Section>
        </div>
      )}

      {/* Template Editor */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h2 className="text-slate-200 font-semibold">Base Templates</h2>
          <p className="text-slate-500 text-xs mt-0.5">These are merged with AI output to form the complete proposal</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {TPL_NAMES.map(t => (
              <button
                key={t.key}
                onClick={() => { setEditingTpl(t.key); setTplContent(templates[t.key] || ''); setTplSaved(false); }}
                className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  editingTpl === t.key
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {editingTpl && (
            <div>
              <textarea
                rows={10}
                value={tplContent}
                onChange={e => setTplContent(e.target.value)}
                className="input font-mono text-xs leading-relaxed resize-y"
              />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={saveTpl} className="btn-primary">Save Template</button>
                <button onClick={() => setEditingTpl(null)} className="btn-secondary">Close</button>
                {tplSaved && <span className="text-green-400 text-sm font-medium">✓ Saved</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
