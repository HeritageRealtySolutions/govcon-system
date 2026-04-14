import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../utils/api';

const COLUMNS = [
  { key: 'reviewing',  label: 'Reviewing',  dot: 'bg-blue-400',   border: 'border-t-blue-500',   bg: 'bg-blue-500/5'   },
  { key: 'bidding',    label: 'Bidding',    dot: 'bg-yellow-400', border: 'border-t-yellow-500', bg: 'bg-yellow-500/5' },
  { key: 'submitted',  label: 'Submitted',  dot: 'bg-purple-400', border: 'border-t-purple-500', bg: 'bg-purple-500/5' },
  { key: 'awarded',    label: 'Awarded',    dot: 'bg-green-400',  border: 'border-t-green-500',  bg: 'bg-green-500/5'  },
  { key: 'lost',       label: 'Lost',       dot: 'bg-red-500',    border: 'border-t-red-600',    bg: 'bg-red-500/5'    },
];

function fmt(n) {
  if (!n) return null;
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function PipelineCard({ item, onUpdate, onGenerateProposal }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    status:         item.status,
    notes:          item.notes || '',
    proposed_price: item.proposed_price || '',
    award_amount:   item.award_amount || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = { ...form };
    if (form.status === 'awarded' && form.award_amount) payload.awarded = 1;
    await fetch(`${BASE_URL}/api/pipeline/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setOpen(false);
    onUpdate();
  }

  async function remove() {
    if (!confirm('Remove from pipeline?')) return;
    await fetch(`${BASE_URL}/api/pipeline/${item.id}`, { method: 'DELETE' });
    onUpdate();
  }

  const deadline  = item.deadline?.split('T')[0];
  const daysLeft  = deadline
    ? Math.ceil((new Date(deadline) - new Date()) / 86400000)
    : null;
  const deadlineColor = daysLeft !== null
    ? daysLeft <= 3  ? 'text-red-400 font-bold'
    : daysLeft <= 7  ? 'text-red-400'
    : daysLeft <= 14 ? 'text-yellow-400'
    : 'text-slate-500'
    : 'text-slate-600';

  const inputCls = "w-full bg-slate-900/80 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors";

  return (
    <div className={`bg-slate-800/80 border rounded-xl p-3.5 mb-2.5 transition-all hover:border-slate-500 ${
      item.status === 'awarded' ? 'border-green-700/50' :
      item.status === 'lost'    ? 'border-red-900/50 opacity-70' :
      'border-slate-700'
    }`}>
      {/* Title */}
      <p className="text-slate-200 text-xs font-semibold leading-snug mb-1.5 line-clamp-2">
        {item.title || `Opportunity #${item.opportunity_id}`}
      </p>

      {/* Agency */}
      {item.agency && (
        <p className="text-slate-500 text-xs truncate mb-2">{item.agency}</p>
      )}

      {/* Score + Deadline row */}
      <div className="flex items-center justify-between mb-2">
        {item.bid_score != null ? (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${
            item.bid_score >= 70 ? 'bg-green-900/60 text-green-300 border-green-700/60' :
            item.bid_score >= 40 ? 'bg-yellow-900/60 text-yellow-300 border-yellow-700/60' :
            'bg-slate-700 text-slate-400 border-slate-600'
          }`}>{item.bid_score}</span>
        ) : <span />}
        {deadline && daysLeft !== null && (
          <span className={`text-xs ${deadlineColor}`}>
            {daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue'}
          </span>
        )}
      </div>

      {/* Price */}
      {item.proposed_price ? (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-green-400 text-xs font-bold">{fmt(item.proposed_price)}</span>
          <span className="text-slate-600 text-xs">bid</span>
          {item.award_amount && (
            <span className="text-green-300 text-xs font-bold ml-1">→ {fmt(item.award_amount)} awarded</span>
          )}
        </div>
      ) : null}

      {/* Notes preview */}
      {item.notes && !open && (
        <p className="text-slate-600 text-xs line-clamp-1 mb-2 italic">{item.notes}</p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-700/60">
        <button onClick={() => setOpen(o => !o)}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
          {open ? '▲ Close' : '▼ Edit'}
        </button>
        <button onClick={() => onGenerateProposal(item)}
          className="text-xs text-green-400 hover:text-green-300 font-medium transition-colors ml-auto">
          ✦ Proposal
        </button>
        <button onClick={remove}
          className="text-xs text-slate-600 hover:text-red-400 transition-colors">
          ✕
        </button>
      </div>

      {/* Edit panel */}
      {open && (
        <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2.5">
          <div>
            <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Stage</label>
            <select value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className={inputCls}>
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Proposed Price ($)</label>
            <input type="number" className={inputCls} placeholder="0"
              value={form.proposed_price}
              onChange={e => setForm(f => ({ ...f, proposed_price: e.target.value }))} />
          </div>

          {form.status === 'awarded' && (
            <div>
              <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Award Amount ($)</label>
              <input type="number" className={inputCls} placeholder="0"
                value={form.award_amount}
                onChange={e => setForm(f => ({ ...f, award_amount: e.target.value }))} />
            </div>
          )}

          <div>
            <label className="block text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Notes</label>
            <textarea rows={3} className={`${inputCls} resize-none`}
              placeholder="Strategy, contacts, issues..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              {saving
                ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block"/>Saving</>
                : 'Save'
              }
            </button>
            <button onClick={() => setOpen(false)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const nav = useNavigate();

  function load() {
    fetch(`${BASE_URL}/api/pipeline`).then(r => r.json()).then(setItems).catch(() => {});
    fetch(`${BASE_URL}/api/pipeline/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }

  useEffect(load, []);

  function handleGenerateProposal(item) {
    // Navigate to proposals page — in a future pass we'll pass the item as state
    nav('/proposals');
  }

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = items.filter(i => i.status === col.key);
    return acc;
  }, {});

  const totalValue = items
    .filter(i => i.status !== 'lost')
    .reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bid Pipeline</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track every bid from discovery to award</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Tracked',
            value: stats?.total_pipeline?.count || 0,
            sub: `${items.length} bids`,
            color: 'text-white',
            bg: 'border-slate-600',
          },
          {
            label: 'Active Pipeline Value',
            value: fmt(totalValue) || '$0',
            sub: 'excluding lost',
            color: 'text-yellow-400',
            bg: 'border-yellow-700/30',
          },
          {
            label: 'Win Rate',
            value: `${stats?.win_rate || 0}%`,
            sub: `${stats?.awarded?.count || 0} awards`,
            color: 'text-green-400',
            bg: 'border-green-700/30',
          },
          {
            label: 'Revenue Won',
            value: fmt(stats?.awarded?.value) || '$0',
            sub: 'total awarded value',
            color: 'text-green-400',
            bg: 'border-green-700/30',
          },
        ].map(s => (
          <div key={s.label} className={`bg-slate-800/60 border ${s.bg} rounded-xl px-4 py-4`}>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-600 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Stage summary bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COLUMNS.map(col => {
          const colItems = byStatus[col.key] || [];
          const colValue = colItems.reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);
          return (
            <div key={col.key} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-slate-400 text-xs font-medium">{col.label}</span>
              <span className="bg-slate-700 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {colItems.length}
              </span>
              {colValue > 0 && (
                <span className="text-slate-500 text-xs">{fmt(colValue)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key}
            className={`border border-slate-700/60 border-t-2 ${col.border} ${col.bg} rounded-xl p-3 min-h-48`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h3 className="text-slate-300 font-semibold text-xs uppercase tracking-wider">{col.label}</h3>
              <span className="ml-auto bg-slate-700/80 text-slate-300 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {byStatus[col.key]?.length || 0}
              </span>
            </div>

            {byStatus[col.key]?.map(item => (
              <PipelineCard
                key={item.id}
                item={item}
                onUpdate={load}
                onGenerateProposal={handleGenerateProposal}
              />
            ))}

            {!byStatus[col.key]?.length && (
              <div className="border border-dashed border-slate-700/60 rounded-lg py-8 text-center">
                <p className="text-slate-700 text-xs">Empty</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-6">
          <p className="text-slate-500 text-sm">No bids in pipeline yet</p>
          <p className="text-slate-600 text-xs mt-1">
            Add opportunities from Federal Bids or Submit a Bid
          </p>
        </div>
      )}
    </div>
  );
}
