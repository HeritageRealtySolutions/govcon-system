import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import Municipal from './pages/Municipal';
import Pricing from './pages/Pricing';
import Pipeline from './pages/Pipeline';
import Proposals from './pages/Proposals';
import CompanySetup from './pages/CompanySetup';

const NAV = [
  {
    to: '/',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/opportunities',
    label: 'Federal Bids',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/municipal',
    label: 'Submit a Bid',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
    highlight: true,
  },
  {
    to: '/pipeline',
    label: 'Pipeline',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    to: '/proposals',
    label: 'Proposals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    to: '/pricing',
    label: 'Pricing Intel',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/setup',
    label: 'Company',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
const location = useLocation();
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 flex">

        {/* SIDEBAR */}
        <aside
          className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-200 sticky top-0 h-screen`}
        >
          {/* Logo */}
          <div className={`flex items-center h-16 border-b border-slate-800 px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-slate-900 font-black text-xs">LB</span>
            </div>
            {!collapsed && (
              <div>
                <div className="text-white font-bold text-sm leading-tight">Lumen Bid</div>
                <div className="text-green-400 text-xs font-medium">Intelligence</div>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {!collapsed && (
              <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 mb-2">
                Main Menu
              </p>
            )}
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                  ${isActive
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                    : n.highlight
                    ? 'text-green-400 hover:bg-green-600/10 hover:text-green-300 border border-green-700/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <span className="flex-shrink-0">{n.icon}</span>
                {!collapsed && <span className="truncate">{n.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Collapse Toggle + Footer */}
          <div className="border-t border-slate-800 p-3 space-y-3">
            {!collapsed && (
              <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                <p className="text-slate-400 text-xs">Account</p>
                <p className="text-white text-xs font-semibold truncate">Lumen Capital LLC</p>
                <p className="text-green-400 text-xs">8(a) Certified</p>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white text-xs py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center px-6 gap-4 sticky top-0 z-40">
            <div className="flex-1">
              <h1 className="text-white font-semibold text-base">
                {NAV.find(n => n.to === location.pathname)?.label ?? 'Dashboard'}
              </h1>
              <p className="text-slate-500 text-xs">Lumen Capital LLC · Government Contracting System</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-green-900/30 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full border border-green-700/40">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                Live
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 overflow-auto">
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
      </div>
    </BrowserRouter>
  );
}
