import React, { useEffect, useState } from 'react';
import { BASE_URL } from '../utils/api';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(2)}M`
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getToken() {
  return sessionStorage.getItem('lumen_token') || localStorage.getItem('lumen_token');
}

function ROIBadge({ roi, status }) {
  if (status === 'lost')
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-700">Loss</span>;
  if (status === 'awarded' && roi > 0)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-900/60 text-green-300 border border-green-700">WON +{roi}%</span>;
  if (roi > 200)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-900/60 text-green-300 border border-green-700">+{roi}% ROI</span>;
  if (roi > 0)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700">+{roi}% ROI</span>;
  if (roi === 0)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">No data</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-700">{roi}%</span>;
}

export default function ROITracker() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const headers = {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/intelligence/roi`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(item) {
    setEditing(item.id);
    setEditForm({
      hours_spent:     item.hours_spent || 0,
      hourly_rate:     item.hourly_rate || 150,
      win_probability: item.win_probability || 25,
    });
  }

  async function saveEdit(id) {
    setSaving(true);
    await fetch(`${BASE_URL}/api/intelligence/roi/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    await load();
    setSaving(false);
  }

  const inputCls = "bg-slate-900/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-green-500 transition-colors";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bid ROI Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track time spent per bid vs contract value — know your true cost per awarded dollar
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-slate-600 border-t-green-500 rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {data?.totals && (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                { label: 'Total Bids',     value: data.totals.total_bids,            color: 'text-white' },
                { label: 'Total Bid Cost', value: fmt(data.totals.total_bid_cost),    color: 'text-yellow-400' },
                { label: 'Revenue Won',    value: fmt(data.totals.total_revenue),     color: 'text-green-400' },
                { label: 'Cost Per Award', value: fmt(data.totals.cost_per_award),    color: 'text-blue-400' },
                { label: 'Overall ROI',    value: `${data.totals.overall_roi || 0}%`, color: data.totals.overall_roi > 0 ? 'text-green-400' : 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-4">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-5 py-4 text-sm text-slate-400">
            <strong className="text-white">How this works:</strong> Enter hours spent on each bid and your hourly rate.
            The system calculates your bid cost, multiplies contract value by win probability (or actual outcome for awarded/lost bids),
            and shows your ROI. Over time this tells you which bid types are actually worth your time.
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/60">
              <h2 className="text-white font-semibold text-sm">Bid Breakdown</h2>
              <p className="text-slate-500 text-xs mt-0.5">Click Edit on any bid to enter hours and win probability</p>
            </div>

            {(!data?.items || data.items.length === 0) ? (
              <div className="py-16 text-center">
                <p className="text-slate-500 text-sm">No bids in pipeline yet</p>
                <p className="text-slate-600 text-xs mt-1">Add bids from the Submit a Bid page to track ROI</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/40">
                    <tr>
                      {['Bid','Status','Hours','Rate/hr','Bid Cost','Contract Value','Win %','Expected Value','ROI','Action'].map(h => (
                        <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {data.items.map(item => (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-slate-200 font-medium text-sm max-w-xs truncate">{item.title}</p>
                            <p className="text-slate-500 text-xs">{item.agency}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                              item.status === 'awarded'  ? 'bg-green-900/50 text-green-300 border-green-700' :
                              item.status === 'submitted'? 'bg-purple-900/50 text-purple-300 border-purple-700' :
                              item.status === 'lost'     ? 'bg-red-900/50 text-red-300 border-red-700' :
                              'bg-slate-700 text-slate-300 border-slate-600'
                            }`}>{item.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{item.hours_spent || 0}h</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">${item.hourly_rate || 150}</td>
                          <td className="px-4 py-3 text-yellow-400 text-sm font-medium">{fmt(item.bid_cost)}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{fmt(item.contract_value)}</td>
                          <td className="px-4 py-3 text-slate-300 text-sm">
                            {item.status === 'awarded' ? '100%' : item.status === 'lost' ? '0%' : `${item.win_probability}%`}
                          </td>
                          <td className="px-4 py-3 text-blue-400 text-sm font-medium">{fmt(item.expected_value)}</td>
                          <td className="px-4 py-3"><ROIBadge roi={item.roi_percent} status={item.status} /></td>
                          <td className="px-4 py-3">
                            <button onClick={() => startEdit(item)}
                              className="text-green-400 hover:text-green-300 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-green-900/30 transition-colors">
                              Edit
                            </button>
                          </td>
                        </tr>

                        {editing === item.id && (
                          <tr className="bg-slate-900/60">
                            <td colSpan={10} className="px-5 py-4">
                              <div className="flex items-end gap-4 flex-wrap">
                                <div>
                                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Hours Spent</label>
                                  <input type="number" className={inputCls} style={{ width: 100 }}
                                    value={editForm.hours_spent}
                                    onChange={e => setEditForm(f => ({ ...f, hours_spent: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Your Rate ($/hr)</label>
                                  <input type="number" className={inputCls} style={{ width: 100 }}
                                    value={editForm.hourly_rate}
                                    onChange={e => setEditForm(f => ({ ...f, hourly_rate: e.target.value }))} />
                                </div>
                                <div>
                                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Win Probability (%)</label>
                                  <input type="number" min="0" max="100" className={inputCls} style={{ width: 100 }}
                                    value={editForm.win_probability}
                                    onChange={e => setEditForm(f => ({ ...f, win_probability: e.target.value }))} />
                                  <p className="text-slate-600 text-xs mt-1">Ignored if status is awarded/lost</p>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(item.id)} disabled={saving}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditing(null)}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
