import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, authFetch } from '../utils/api';

const COLUMNS = [
  { key: 'reviewing',  label: 'Reviewing',  dot: 'bg-blue-500',   border: 'border-t-blue-500'   },
  { key: 'bidding',    label: 'Bidding',    dot: 'bg-amber-500',  border: 'border-t-amber-500'  },
  { key: 'submitted',  label: 'Submitted',  dot: 'bg-purple-500', border: 'border-t-purple-500' },
  { key: 'awarded',    label: 'Awarded',    dot: 'bg-emerald-500',border: 'border-t-emerald-500'},
  { key: 'lost',       label: 'Lost',       dot: 'bg-red-400',    border: 'border-t-red-400'    },
];

function fmt(n) {
  if (!n) return null;
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

function PipelineCard({ item, onUpdate, onGenerateProposal }) {
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState({ status: item.status, notes: item.notes || '', proposed_price: item.proposed_price || '', award_amount: item.award_amount || '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = { ...form };
    if (form.status === 'awarded' && form.award_amount) payload.awarded = 1;
    await authFetch(`${BASE_URL}/api/pipeline/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    setSaving(false); setOpen(false); onUpdate();
  }

  async function remove() {
    if (!confirm('Remove from pipeline?')) return;
    await authFetch(`${BASE_URL}/api/pipeline/${item.id}`, { method: 'DELETE' });
    onUpdate();
  }

  const deadline  = item.deadline?.split('T')[0];
  const daysLeft  = deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;

  return (
    <div className={`bg-white border rounded-xl p-3.5 mb-2 shadow-sm hover:shadow-md transition-shadow ${
      item.status === 'awarded' ? 'border-emerald-200' : item.status === 'lost' ? 'border-gray-200 opacity-60' : 'border-gray-200'
    }`}>
      <p className="text-gray-900 text-xs font-semibold leading-snug mb-1 line-clamp-2">
        {item.title || `Opportunity #${item.opportunity_id}`}
      </p>
      {item.agency && <p className="text-gray-400 text-xs truncate mb-2">{item.agency}</p>}

      <div className="flex items-center justify-between mb-2">
        {item.bid_score != null ? (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${
            item.bid_score >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            item.bid_score >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-gray-100 text-gray-500 border-gray-200'
          }`}>{item.bid_score}</span>
        ) : <span />}
        {daysLeft !== null && <span className={`text-xs font-medium ${
          daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-red-500' : daysLeft <= 14 ? 'text-amber-600' : 'text-gray-400'
        }`}>{daysLeft >= 0 ? `${daysLeft}d left` : 'Overdue'}</span>}
      </div>

      {item.proposed_price && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-gray-900 text-xs font-bold">{fmt(item.proposed_price)}</span>
          {item.award_amount && <span className="text-emerald-600 text-xs font-bold">→ {fmt(item.award_amount)}</span>}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{open ? '▲ Close' : '▼ Edit'}</button>
        <button onClick={() => onGenerateProposal(item)} className="text-xs text-gray-900 hover:text-black font-medium ml-auto">✦ Proposal</button>
        <button onClick={remove} className="text-xs text-gray-300 hover:text-red-500 transition-colors">✕</button>
      </div>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
          <div>
            <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Stage</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Proposed Price ($)</label>
            <input type="number" className={inputCls} placeholder="0" value={form.proposed_price} onChange={e => setForm(f => ({ ...f, proposed_price: e.target.value }))} />
          </div>
          {form.status === 'awarded' && (
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Award Amount ($)</label>
              <input type="number" className={inputCls} placeholder="0" value={form.award_amount} onChange={e => setForm(f => ({ ...f, award_amount: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Notes</label>
            <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Strategy, contacts, issues..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setOpen(false)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
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
    authFetch(`${BASE_URL}/api/pipeline`).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {});
    authFetch(`${BASE_URL}/api/pipeline/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }
  useEffect(load, []);

  const byStatus   = COLUMNS.reduce((acc, col) => { acc[col.key] = items.filter(i => i.status === col.key); return acc; }, {});
  const totalValue = items.filter(i => i.status !== 'lost').reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Bid Pipeline</h2>
        <p className="text-gray-500 text-sm mt-0.5">Track every bid from discovery to award</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Tracked',        value: stats?.total_pipeline?.count || 0, sub: `${items.length} bids` },
          { label: 'Active Pipeline Value', value: fmt(totalValue) || '$0',           sub: 'excluding lost' },
          { label: 'Win Rate',             value: `${stats?.win_rate || 0}%`,         sub: `${stats?.awarded?.count || 0} awards` },
          { label: 'Revenue Won',          value: fmt(stats?.awarded?.value) || '$0', sub: 'total awarded' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Stage pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {COLUMNS.map(col => {
          const colItems = byStatus[col.key] || [];
          const colValue = colItems.reduce((s, i) => s + (parseFloat(i.proposed_price) || 0), 0);
          return (
            <div key={col.key} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-shrink-0 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className="text-gray-600 text-xs font-medium">{col.label}</span>
              <span className="bg-gray-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{colItems.length}</span>
              {colValue > 0 && <span className="text-gray-400 text-xs">{fmt(colValue)}</span>}
            </div>
          );
        })}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key} className={`border-t-2 ${col.border} bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-48`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h3 className="text-gray-600 font-semibold text-xs uppercase tracking-wider">{col.label}</h3>
              <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{byStatus[col.key]?.length || 0}</span>
            </div>
            {byStatus[col.key]?.map(item => (
              <PipelineCard key={item.id} item={item} onUpdate={load} onGenerateProposal={() => nav('/proposals')} />
            ))}
            {!byStatus[col.key]?.length && (
              <div className="border border-dashed border-gray-300 rounded-lg py-8 text-center">
                <p className="text-gray-300 text-xs">Empty</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
