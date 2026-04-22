import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import logoImg from '../IMG_1447-removebg-preview.PNG';
import Dashboard from './pages/Dashboard';
import Opportunities from './pages/Opportunities';
import Municipal from './pages/Municipal';
import Pricing from './pages/Pricing';
import Pipeline from './pages/Pipeline';
import Proposals from './pages/Proposals';
import CompanySetup from './pages/CompanySetup';
import Intelligence from './pages/Intelligence';
import ROITracker from './pages/ROITracker';
import Recompetes from './pages/Recompetes';
import AgencyTracker from './pages/AgencyTracker';
import { getToken, clearToken, BASE_URL } from './utils/api';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { to: '/', end: true, label: 'Dashboard', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      )},
      { to: '/opportunities', label: 'Federal Bids', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      )},
      { to: '/recompetes', label: 'Recompetes', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )},
      { to: '/municipal', label: 'Submit a Bid', highlight: true, icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      )},
      { to: '/pipeline', label: 'Pipeline', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
      )},
      { to: '/proposals', label: 'Proposals', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      )},
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/pricing', label: 'Pricing Intel', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
      )},
      { to: '/intelligence', label: 'Market Intel', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z" /></svg>
      )},
      { to: '/agencies', label: 'Agency Tracker', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      )},
      { to: '/roi', label: 'ROI Tracker', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )},
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/setup', label: 'Company Profile', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      )},
    ],
  },
];

function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (d.token) {
        sessionStorage.setItem('lumen_token', d.token);
        sessionStorage.setItem('lumen_refresh_token', d.refresh_token);
        sessionStorage.setItem('lumen_expires_at', d.expires_at);
        onLogin(d.user);
      } else {
        setError(d.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error — please try again');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl">
            <img src={logoImg} alt="Lumen Capital" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-gray-900 text-2xl font-bold tracking-tight">Lumen Bid Intelligence</h1>
          <p className="text-gray-500 text-sm mt-1.5">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-xs font-semibold uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors" />
            </div>
            <div>
              <label className="block text-gray-700 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 transition-colors" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors mt-1">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Lumen Capital LLC · 8(a) Certified · Internal Use Only
        </p>
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout, collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-black flex flex-col transition-all duration-200 sticky top-0 h-screen z-30`}>
      <div className={`flex items-center h-16 border-b border-white/10 px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
          <img src={logoImg} alt="Lumen Capital" className="w-7 h-7 object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight tracking-wide">LUMEN</div>
            <div className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">Bid Intelligence</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : item.highlight
                          ? 'text-white border border-white/20 hover:bg-white/10'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`
                  }>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-2">
        {!collapsed && user && (
          <div className="bg-white/5 rounded-lg px-3 py-2">
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
            <p className="text-white text-xs font-semibold truncate mt-0.5">Lumen Capital LLC</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"/>
              <span className="text-emerald-400 text-[10px] font-medium">8(a) Certified</span>
            </div>
          </div>
        )}
        {!collapsed && (
          <button onClick={onLogout}
            className="w-full text-gray-500 hover:text-red-400 text-xs py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left px-3">
            Sign Out
          </button>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-white text-xs py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function AppLayout({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const allItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentLabel = allItems.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label ?? 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={user} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-20">
          <div className="flex-1 min-w-0">
            <h1 className="text-gray-900 font-semibold text-base leading-tight">{currentLabel}</h1>
            <p className="text-gray-400 text-xs mt-0.5">Lumen Capital LLC · Government Contracting System</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
              Live
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/recompetes"    element={<Recompetes />} />
            <Route path="/municipal"     element={<Municipal />} />
            <Route path="/pipeline"      element={<Pipeline />} />
            <Route path="/pricing"       element={<Pricing />} />
            <Route path="/proposals"     element={<Proposals />} />
            <Route path="/intelligence"  element={<Intelligence />} />
            <Route path="/agencies"      element={<AgencyTracker />} />
            <Route path="/roi"           element={<ROITracker />} />
            <Route path="/setup"         element={<CompanySetup />} />
            <Route path="*"              element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppInner() {
  const [user, setUser]         = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    fetch(`${BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); else clearToken(); })
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <img src={logoImg} alt="Lumen Capital" className="w-11 h-11 object-contain" />
          </div>
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;
  return <AppLayout user={user} onLogout={() => { clearToken(); setUser(null); }} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
