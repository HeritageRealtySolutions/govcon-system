import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

const COLUMNS = [
  { key: 'reviewing', label: 'Reviewing', dot: 'bg-blue-400', border: 'border-t-blue-500' },
  { key: 'bidding', label: 'Bidding', dot: 'bg-yellow-400', border: 'border-t-yellow-500' },
  { key: 'submitted', label: 'Submitted', dot: 'bg-purple-400', border: 'border-t-purple-500' },
  { key: 'awarded', label: 'Awarded', dot: 'bg-green-400', border: 'border-t-green-500' },
  { key: 'lost', label: 'Lost', dot: 'bg-red-500', border: 'border-t-red-600' },
];

function fmt(n) {
  if (!n) return null;
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function PipelineCard({ item, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    status: item.status,
    notes: item.notes || '',
    proposed_price: item.proposed_price || '',
    award_amount: item.award_amount || '',
  });

  async function save() {
    const payload = { ...form };
    if (form.status === 'awarded' && form.award_amount) payload.awarded = 1;
    await fetch(`${BASE_URL}/api/pipeline/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setOpen(false);
    onUpdate();
  }

  const deadline = item.deadline?.split('T')[0];
  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;
  const deadlineColor = daysLeft !== null
    ? daysLeft <= 7 ? 'text-red-400' : daysLeft <= 14 ? 'text-yellow-400' : 'text-slate-400'
    : 'text-slate-500';

  return (
    <div className="bg-slate-700/60 border border-slate-600 rounded-xl p-3.5 mb-2.5 hover:border-slate-500 transition-colors">
      <p className="text-slate-200 text-xs font-semibold leading-snug mb-1.5 line-clamp-2">
        {item.title || `Opportunity ${item.opportunity_id}`}
      </p>
      {item.agency && <p className="text-slate-500 text-xs truncate mb-1.5">{item.agency}</p>}
      <div className="flex items-center justify-between">
        {item.proposed_price
          ? <span className="text-green-400 text-xs font-semibold">{fmt(item.proposed_price)}</span>
          : <span className="text-slate-600 text-xs">No price set</span>}
        {deadline && (
          <span className={`text-xs ${deadlineColor}`}>
            {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d` : 'Past'}
          </span>
        )}
      </div>
      {item.bid_score != null && (
        <div className="mt-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            item.bid_score >= 70 ? 'bg-green-900 text-green-300 border-green-700' :
            item.bid_score >= 40 ? 'bg-yellow-900 text-yellow-300 border-yellow-700' :
            'bg-slate-700 text-slate-400 border-slate-600'}`}>
            Score: {item.bid_score}
          </span>
        </div>
      )}

      <button onClick={() => setOpen(o => !o)}
        className="mt-2.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
        {open ? 'Close ▲' : 'Edit ▼'}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-600 space-y-2.5">
          <div>
            <label className="label">Move to Stage</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="input text-xs py-1.5">
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Proposed Price ($)</label>
            <input type="number" className="input text-xs py-1.5" placeholder="0"
              value={form.proposed_price} onChange={e => setForm(f => ({ ...f, proposed_price: e.target.value }))} />
          </div>
          {form.status === 'awarded' && (
            <div>
              <label className="label">Award Amount ($)</label>
              <input type="number" className="input text-xs py-1.5" placeholder="0"
                value={form.award_amount} onChange={e => setForm(f => ({ ...f, award_amount: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input text-xs py-1.5 resize-none" placeholder="Add notes..."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-xs py-1.5 px-3">Save</button>
            <button onClick={() => setOpen(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);

  function load() {
    fetch(`${BASE_URL}/api/pipeline`).then(r => r.json()).then(setItems).catch(() => {});
    fetch(`${BASE_URL}/api/pipeline/stats`).then(r => r.json()).then(setPipeStats).catch(() => {});
  }
  function setPipeStats(d) { setStats(d); }

  useEffect(load, []);

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = items.filter(i => i.status === col.key);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bid Pipeline</h1>
        <p className="text-slate-400 text-sm mt-1">Track every bid from discovery to award</p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Tracked', value: stats.total_pipeline?.count || 0, color: 'text-white' },
            { label: 'Pipeline Value', value: fmt(stats.total_pipeline?.value) || '$0', color: 'text-yellow-400' },
            { label: 'Win Rate', value: `${stats.win_rate || 0}%`, color: 'text-green-400' },
            { label: 'Awards YTD', value: fmt(stats.awarded?.value) || '$0', color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key}
            className={`bg-slate-800 border border-slate-700 border-t-2 ${col.border} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h3 className="text-slate-300 font-semibold text-sm">{col.label}</h3>
              <span className="ml-auto bg-slate-700 text-slate-300 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {byStatus[col.key]?.length || 0}
              </span>
            </div>
            <div>
              {byStatus[col.key]?.map(item => (
                <PipelineCard key={item.id} item={item} onUpdate={load} />
              ))}
              {!byStatus[col.key]?.length && (
                <p className="text-slate-600 text-xs text-center py-6 border border-dashed border-slate-700 rounded-lg">
                  Empty
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="mt-4 text-center py-8">
          <p className="text-slate-500 text-sm">No bids in pipeline yet.</p>
          <p className="text-slate-600 text-xs mt-1">Add opportunities from the Federal Bids or Municipal pages.</p>
        </div>
      )}
    </div>
  );
}
