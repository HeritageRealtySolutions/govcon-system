import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import Municipal from './pages/Municipal';
import Pricing from './pages/Pricing';
import Pipeline from './pages/Pipeline';
import Proposals from './pages/Proposals';
import CompanySetup from './pages/CompanySetup';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/opportunities', label: 'Federal Bids' },
  { to: '/municipal', label: 'Municipal' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/proposals', label: 'Proposals' },
  { to: '/setup', label: 'Company' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50">
          <div className="max-w-screen-2xl mx-auto px-6 flex items-center h-14 gap-2">
            <div className="flex items-center gap-2 mr-8">
              <div className="w-7 h-7 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-slate-900 font-black text-xs">GC</span>
              </div>
              <span className="text-white font-bold text-base tracking-tight">Lumen Bid Intelligence</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {NAV.map(n => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-screen-2xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/municipal" element={<Municipal />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/proposals" element={<Proposals />} />
            <Route path="/setup" element={<CompanySetup />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
