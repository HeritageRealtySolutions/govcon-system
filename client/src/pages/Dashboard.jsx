import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, authFetch } from '../utils/api';

function StatCard({ label, value, sub, accent = 'green', icon }) {
  const styles = {
    green:  { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
    blue:   { text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  };
  const s = styles[accent];
  return (
    <div className={`bg-slate-800/60 border ${s.border} rounded-xl p-5 flex flex-col gap-3 hover:bg-slate-800 transition-colors`}>
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
          <span className={`text-base ${s.text}`}>{icon}</span>
        </div>
      </div>
      <span className={`text-3xl font-bold ${s.text}`}>{value}</span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  );
}

const STATUS_COLORS = {
  identified:  'bg-slate-700 text-slate-300',
  qualifying:  'bg-blue-900/50 text-blue-300',
  bidding:     'bg-yellow-900/50 text-yellow-300',
  submitted:   'bg-purple-900/50 text-purple-300',
  awarded:     'bg-green-900/50 text-green-300',
  lost:        'bg-red-900/50 text-red-300',
};

function Badge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[status] || 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [oppStats, setOppStats]   = useState(null);
  const [pipeStats, setPipeStats] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [syncing, setSyncing]     = useState(false);
  const [syncMsg, setSyncMsg]     = useState('');
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    authFetch(`${BASE_URL}/api/opportunities/stats`).then(r => r.json()).then(setOppStats).catch(() => {});
    authFetch(`${BASE_URL}/api/pipeline/stats`).then(r => r.json()).then(setPipeStats).catch(() => {});
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 14);
    authFetch(`${BASE_URL}/api/opportunities`).then(r => r.json()).then(data => {
      const soon = (Array.isArray(data) ? data : [])
        .filter(o => o.response_deadline &&
          new Date(o.response_deadline) <= cutoff &&
          new Date(o.response_deadline) >= new Date())
        .sort((a, b) => new Date(a.response_deadline) - new Date(b.response_deadline));
      setDeadlines(soon.slice(0, 8));
    }).catch(() => {});
  }, []);

  async function syncFederal() {
    setSyncing(true); setSyncMsg(''); setSyncError('');
    try {
      const r = await authFetch(`${BASE_URL}/api/opportunities/sync`);
      const d = await r.json();
      if (d.error) setSyncError(d.error);
      else {
        setSyncMsg(`✓ ${d.saved} new opportunities saved (${d.total} found)`);
        authFetch(`${BASE_URL}/api/opportunities/stats`).then(r => r.json()).then(setOppStats);
      }
    } catch (e) { setSyncError(e.message); }
    setSyncing(false);
  }

  const totalOpps = (oppStats?.counts || []).reduce((s, c) => s + c.count, 0);
  const pipeValue = pipeStats?.total_pipeline?.value;
  const fmt       = n => n ? `$${(n / 1000).toFixed(0)}K` : '$0';
  const today     = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-slate-400 text-sm mt-0.5">{today} · 8(a) Federal & Municipal Contracting</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={syncFederal} disabled={syncing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {syncing
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Syncing...</>
              : '⟳ Sync Federal Bids'}
          </button>
          <button onClick={() => nav('/municipal')}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-green-300 hover:text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-green-700/40">
            + Submit a Bid
          </button>
        </div>
      </div>

      {syncMsg   && <div className="bg-green-900/30 border border-green-700/50 text-green-300 text-sm px-4 py-3 rounded-lg">{syncMsg}</div>}
      {syncError && <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">Error: {syncError}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Opportunities" value={totalOpps || 0}                        accent="blue"   icon="📋" sub="federal + municipal" />
        <StatCard label="Hot Leads"           value={oppStats?.hot_leads || 0}              accent="green"  icon="🔥" sub="score ≥ 70" />
        <StatCard label="Active Pipeline"     value={pipeStats?.total_pipeline?.count || 0} accent="yellow" icon="⚡" sub={pipeValue ? `${fmt(pipeValue)} total value` : 'no bids tracked'} />
        <StatCard label="Win Rate"            value={`${pipeStats?.win_rate || 0}%`}         accent="purple" icon="🏆" sub={`${pipeStats?.awarded?.count || 0} awards · ${fmt(pipeStats?.awarded?.value)} won`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/60 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
            <h2 className="text-white font-semibold text-sm">⏰ Upcoming Deadlines — Next 14 Days</h2>
            <button onClick={() => nav('/opportunities')} className="text-green-400 hover:text-green-300 text-xs font-medium">View all →</button>
          </div>
          {deadlines.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-slate-500 text-sm">No deadlines in the next 14 days</p>
              <button onClick={syncFederal} className="mt-3 text-green-400 text-xs hover:underline">Sync federal bids to populate</button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/40">
              {deadlines.map(d => {
                const days = Math.ceil((new Date(d.response_deadline) - new Date()) / 86400000);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 ${
                      days <= 3 ? 'bg-red-900/60 text-red-300' :
                      days <= 7 ? 'bg-yellow-900/60 text-yellow-300' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      <span className="text-lg leading-none">{days}</span>
                      <span className="text-[9px] uppercase tracking-wide">days</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{d.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Due {new Date(d.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {d.agency && ` · ${d.agency}`}
                      </p>
                    </div>
                    {d.bid_score && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        d.bid_score >= 70 ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>{d.bid_score}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
            <h2 className="text-white font-semibold text-sm">📊 Pipeline Status</h2>
            <button onClick={() => nav('/pipeline')} className="text-green-400 hover:text-green-300 text-xs font-medium">View →</button>
          </div>
          {!(pipeStats?.counts?.length) ? (
            <div className="px-5 py-10 text-center">
              <p className="text-slate-500 text-sm">No bids in pipeline yet</p>
              <button onClick={() => nav('/municipal')} className="mt-3 text-green-400 text-xs hover:underline">Submit your first bid</button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/40 px-5 py-2">
              {(pipeStats.counts || []).map(c => (
                <li key={c.status} className="flex items-center justify-between py-3">
                  <Badge status={c.status} />
                  <div className="flex items-center gap-3">
                    {c.value > 0 && <span className="text-slate-500 text-xs">{fmt(c.value)}</span>}
                    <span className="bg-slate-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{c.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="px-5 py-4 border-t border-slate-700/60 space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Quick Actions</p>
            {[
              { label: '📋 Browse Federal Bids', path: '/opportunities' },
              { label: '💰 Pricing Intelligence', path: '/pricing' },
              { label: '✍️ Generate Proposal',   path: '/proposals' },
              { label: '⚙️ Company Profile',     path: '/setup' },
            ].map(a => (
              <button key={a.path} onClick={() => nav(a.path)}
                className="w-full text-left text-slate-300 hover:text-white hover:bg-slate-700/60 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
