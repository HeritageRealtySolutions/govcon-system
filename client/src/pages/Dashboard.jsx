import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, authFetch } from '../utils/api';

function StatCard({ label, value, sub, icon, trend }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1.5">{sub}</p>}
    </div>
  );
}

function Badge({ status }) {
  const styles = {
    identified:  'bg-gray-100 text-gray-600',
    qualifying:  'bg-blue-50 text-blue-700',
    bidding:     'bg-amber-50 text-amber-700',
    submitted:   'bg-purple-50 text-purple-700',
    awarded:     'bg-emerald-50 text-emerald-700',
    lost:        'bg-red-50 text-red-600',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
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
        .filter(o => o.response_deadline && new Date(o.response_deadline) <= cutoff && new Date(o.response_deadline) >= new Date())
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
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 text-xl font-bold">Command Center</h2>
          <p className="text-gray-500 text-sm mt-0.5">{today} · 8(a) Federal & Municipal Contracting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncFederal} disabled={syncing}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            {syncing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Syncing...</> : '⟳ Sync Federal Bids'}
          </button>
          <button onClick={() => nav('/municipal')}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Submit a Bid
          </button>
        </div>
      </div>

      {syncMsg   && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">{syncMsg}</div>}
      {syncError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">Error: {syncError}</div>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Opportunities" value={totalOpps || 0}                        icon="📋" sub="federal + municipal" />
        <StatCard label="Hot Leads"           value={oppStats?.hot_leads || 0}              icon="🔥" sub="score ≥ 70" />
        <StatCard label="Active Pipeline"     value={pipeStats?.total_pipeline?.count || 0} icon="⚡" sub={pipeValue ? `${fmt(pipeValue)} total value` : 'no bids tracked'} />
        <StatCard label="Win Rate"            value={`${pipeStats?.win_rate || 0}%`}         icon="🏆" sub={`${pipeStats?.awarded?.count || 0} awards · ${fmt(pipeStats?.awarded?.value)} won`} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-semibold text-sm">⏰ Upcoming Deadlines — Next 14 Days</h3>
            <button onClick={() => nav('/opportunities')} className="text-gray-500 hover:text-gray-900 text-xs font-medium transition-colors">View all →</button>
          </div>
          {deadlines.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">No deadlines in the next 14 days</p>
              <button onClick={syncFederal} className="mt-3 text-gray-900 text-xs font-semibold hover:underline">Sync federal bids to populate</button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {deadlines.map(d => {
                const days = Math.ceil((new Date(d.response_deadline) - new Date()) / 86400000);
                return (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 ${
                      days <= 3  ? 'bg-red-50 text-red-600 border border-red-200' :
                      days <= 7  ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <span className="text-base leading-none font-bold">{days}</span>
                      <span className="text-[9px] uppercase tracking-wide">days</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-medium truncate">{d.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Due {new Date(d.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {d.agency && ` · ${d.agency}`}
                      </p>
                    </div>
                    {d.bid_score && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        d.bid_score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>{d.bid_score}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pipeline summary */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-gray-900 font-semibold text-sm">📊 Pipeline Status</h3>
            <button onClick={() => nav('/pipeline')} className="text-gray-500 hover:text-gray-900 text-xs font-medium transition-colors">View →</button>
          </div>
          {!(pipeStats?.counts?.length) ? (
            <div className="px-5 py-12 text-center">
              <p className="text-gray-400 text-sm">No bids in pipeline yet</p>
              <button onClick={() => nav('/municipal')} className="mt-3 text-gray-900 text-xs font-semibold hover:underline">Submit your first bid</button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 px-5 py-1">
              {(pipeStats.counts || []).map(c => (
                <li key={c.status} className="flex items-center justify-between py-3">
                  <Badge status={c.status} />
                  <div className="flex items-center gap-3">
                    {c.value > 0 && <span className="text-gray-400 text-xs">{fmt(c.value)}</span>}
                    <span className="bg-gray-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{c.count}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-100 px-5 py-4 space-y-1.5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Quick Actions</p>
            {[
              { label: '📋 Browse Federal Bids', path: '/opportunities' },
              { label: '💰 Pricing Intelligence', path: '/pricing' },
              { label: '✍️ Generate Proposal',   path: '/proposals' },
              { label: '⚙️ Company Profile',     path: '/setup' },
            ].map(a => (
              <button key={a.path} onClick={() => nav(a.path)}
                className="w-full text-left text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-xs font-medium px-3 py-2 rounded-lg transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
