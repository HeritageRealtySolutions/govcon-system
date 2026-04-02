import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../utils/api';

function StatCard({ label, value, sub, accent = 'green' }) {
  const accents = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex flex-col gap-2">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className={`text-4xl font-bold ${accents[accent]}`}>{value}</span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <h2 className="text-slate-200 font-semibold text-sm mb-4 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [oppStats, setOppStats] = useState(null);
  const [pipeStats, setPipeStats] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    fetch(`${BASE_URL}/api/opportunities/stats`).then(r => r.json()).then(setOppStats).catch(() => {});
    fetch(`${BASE_URL}/api/pipeline/stats`).then(r => r.json()).then(setPipeStats).catch(() => {});
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);
    fetch(`${BASE_URL}/api/opportunities`).then(r => r.json()).then(data => {
      const soon = (data || []).filter(o =>
        o.response_deadline &&
        new Date(o.response_deadline) <= cutoff &&
        new Date(o.response_deadline) >= new Date()
      );
      setDeadlines(soon.slice(0, 6));
    }).catch(() => {});
  }, []);

  async function syncFederal() {
    setSyncing(true); setSyncMsg(''); setSyncError('');
    try {
      const r = await fetch(`${BASE_URL}/api/opportunities/sync`);
      const d = await r.json();
      if (d.error) setSyncError(d.error);
      else { setSyncMsg(`✓ ${d.saved} new opportunities saved (${d.total} found)`); fetch(`${BASE_URL}/api/opportunities/stats`).then(r => r.json()).then(setOppStats); }
    } catch (e) { setSyncError(e.message); }
    setSyncing(false);
  }

  const totalOpps = (oppStats?.counts || []).reduce((s, c) => s + c.count, 0);
  const pipeValue = pipeStats?.total_pipeline?.value;
  const fmt = n => n ? `$${(n / 1000).toFixed(0)}K` : '$0';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Lumen Bid Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">8(a) Federal &amp; Municipal Opportunity Tracker</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Opportunities" value={totalOpps || 0} accent="blue" sub="federal + municipal" />
        <StatCard label="Hot Leads (Score ≥70)" value={oppStats?.hot_leads || 0} accent="green" sub="high-priority bids" />
        <StatCard
          label="Active Pipeline"
          value={pipeStats?.total_pipeline?.count || 0}
          accent="yellow"
          sub={pipeValue ? `${fmt(pipeValue)} total value` : 'no bids tracked'}
        />
        <StatCard
          label="Win Rate"
          value={`${pipeStats?.win_rate || 0}%`}
          accent="purple"
          sub={`${pipeStats?.awarded?.count || 0} awards • ${fmt(pipeStats?.awarded?.value)} won`}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SectionCard title="Upcoming Deadlines — Next 14 Days">
          {deadlines.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No upcoming deadlines</p>
          ) : (
            <ul className="space-y-2">
              {deadlines.map(d => {
                const days = Math.ceil((new Date(d.response_deadline) - new Date()) / 86400000);
                return (
                  <li key={d.id} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-slate-300 text-sm truncate max-w-xs">{d.title}</span>
                    <span className={`text-xs font-semibold ml-3 px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      days <= 7 ? 'text-red-300 bg-red-900/40 border-red-700' :
                      days <= 14 ? 'text-yellow-300 bg-yellow-900/40 border-yellow-700' :
                      'text-slate-300 bg-slate-700 border-slate-600'
                    }`}>{days}d left</span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Pipeline by Status">
          {!(pipeStats?.counts?.length) ? (
            <p className="text-slate-500 text-sm py-4 text-center">No pipeline data yet</p>
          ) : (
            <div className="space-y-2">
              {(pipeStats.counts || []).map(c => (
                <div key={c.status} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <span className="text-slate-400 text-sm capitalize">{c.status}</span>
                  <span className="bg-slate-700 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={syncFederal} disabled={syncing} className="btn-primary flex items-center gap-2">
          {syncing ? (
            <><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Syncing...</>
          ) : '⟳ Sync Federal Bids'}
        </button>
        <button onClick={() => nav('/municipal')} className="btn-secondary">+ Add Municipal Bid</button>
        <button onClick={() => nav('/pipeline')} className="btn-secondary">View Pipeline</button>
        <button onClick={() => nav('/opportunities')} className="btn-secondary">Browse Opportunities</button>
      </div>
      {syncMsg && <p className="mt-3 text-sm text-green-400 font-medium">{syncMsg}</p>}
      {syncError && <p className="mt-3 text-sm text-red-400">{syncError}</p>}
    </div>
  );
}
