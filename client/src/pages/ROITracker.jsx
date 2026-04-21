import React, { useEffect, useState } from 'react';
import { BASE_URL, authFetch } from '../utils/api';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M` : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ROIBadge({ roi, status }) {
  if (status === 'awarded' && roi > 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">WON +{roi}%</span>;
  if (status === 'lost') return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Loss</span>;
  if (roi > 200) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">+{roi}% ROI</span>;
  if (roi > 0)   return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">+{roi}% ROI</span>;
  if (roi === 0) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">No data</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">{roi}%</span>;
}

const inputCls = "bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-900 text-xs focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors";

export default function ROITracker() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try { const r = await authFetch(`${BASE_URL}/api/intelligence/roi`); setData(await r.json()); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startEdit(item) {
    setEditing(item.id);
    setEditForm({ hours_spent: item.hours_spent || 0, hourly_rate: item.hourly_rate || 150, win_probability: item.win_probability || 25 });
  }

  async function saveEdit(id) {
    setSaving(true);
    await authFetch(`${BASE_URL}/api/intelligence/roi/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    });
    setEditing(null); await load(); setSaving(false);
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-gray-900 text-xl font-bold">Bid ROI Tracker</h2>
        <p className="text-gray-500 text-sm mt-0.5">Track time spent per bid vs contract value — know your true cost per awarded dollar</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"/></div>
      ) : (
        <>
          {data?.totals && (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              {[
                { label: 'Total Bids',     value: data.totals.total_bids },
                { label: 'Total Bid Cost', value: fmt(data.totals.total_bid_cost) },
                { label: 'Revenue Won',    value: fmt(data.totals.total_revenue) },
                { label: 'Cost Per Award', value: fmt(data.totals.cost_per_award) },
                { label: 'Overall ROI',    value: `${data.totals.overall_roi || 0}%` },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-4 py-4 shadow-sm">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-500">
            <strong className="text-gray-700">How this works:</strong> Enter hours spent and your hourly rate. Awarded bids use 100% probability, lost bids use 0%. Active bids use your estimated win probability.
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-semibold text-sm">Bid Breakdown</h3>
              <p className="text-gray-400 text-xs mt-0.5">Click Edit to enter hours and win probability per bid</p>
            </div>

            {(!data?.items || data.items.length === 0) ? (
              <div className="py-16 text-center">
                <p className="text-gray-400 text-sm">No bids in pipeline yet</p>
                <p className="text-gray-300 text-xs mt-1">Add bids from the Submit a Bid page to track ROI</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Bid','Status','Hours','Rate/hr','Bid Cost','Contract Value','Win %','Expected Value','ROI','Action'].map(h => (
                        <th key={h} className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.items.map(item => (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-gray-900 font-medium text-sm max-w-xs truncate">{item.title}</p>
                            <p className="text-gray-400 text-xs">{item.agency}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                              item.status === 'awarded'   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              item.status === 'submitted' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              item.status === 'lost'      ? 'bg-red-50 text-red-600 border-red-200' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>{item.status}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-sm">{item.hours_spent || 0}h</td>
                          <td className="px-4 py-3 text-gray-700 text-sm">${item.hourly_rate || 150}</td>
                          <td className="px-4 py-3 text-amber-700 text-sm font-medium">{fmt(item.bid_cost)}</td>
                          <td className="px-4 py-3 text-gray-700 text-sm">{fmt(item.contract_value)}</td>
                          <td className="px-4 py-3 text-gray-700 text-sm">
                            {item.status === 'awarded' ? '100%' : item.status === 'lost' ? '0%' : `${item.win_probability}%`}
                          </td>
                          <td className="px-4 py-3 text-blue-700 text-sm font-medium">{fmt(item.expected_value)}</td>
                          <td className="px-4 py-3"><ROIBadge roi={item.roi_percent} status={item.status} /></td>
                          <td className="px-4 py-3">
                            <button onClick={() => startEdit(item)}
                              className="text-gray-900 hover:text-black text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors">Edit</button>
                          </td>
                        </tr>
                        {editing === item.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={10} className="px-5 py-4">
                              <div className="flex items-end gap-4 flex-wrap">
                                {[
                                  { label: 'Hours Spent', key: 'hours_spent', width: 100 },
                                  { label: 'Rate ($/hr)',  key: 'hourly_rate',  width: 100 },
                                  { label: 'Win Prob (%)', key: 'win_probability', width: 100 },
                                ].map(f => (
                                  <div key={f.key}>
                                    <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{f.label}</label>
                                    <input type="number" className={inputCls} style={{ width: f.width }}
                                      value={editForm[f.key]} onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))} />
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(item.id)} disabled={saving}
                                    className="bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditing(null)}
                                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">Cancel</button>
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
