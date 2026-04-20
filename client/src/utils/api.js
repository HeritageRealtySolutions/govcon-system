export const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('lumen_token');
}

export function setToken(token, refreshToken, expiresAt) {
  localStorage.setItem('lumen_token', token);
  localStorage.setItem('lumen_refresh_token', refreshToken);
  localStorage.setItem('lumen_expires_at', expiresAt);
}

export function clearToken() {
  localStorage.removeItem('lumen_token');
  localStorage.removeItem('lumen_refresh_token');
  localStorage.removeItem('lumen_expires_at');
}

export function isTokenExpired() {
  const expiresAt = localStorage.getItem('lumen_expires_at');
  if (!expiresAt) return true;
  return Date.now() / 1000 > parseInt(expiresAt) - 60;
}

export async function refreshToken() {
  const refresh = localStorage.getItem('lumen_refresh_token');
  if (!refresh) return false;
  try {
    const r = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const d = await r.json();
    if (d.token) {
      setToken(d.token, d.refresh_token, d.expires_at);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function authFetch(url, options = {}) {
  if (isTokenExpired()) {
    const ok = await refreshToken();
    if (!ok) {
      clearToken();
      window.location.href = '/login';
      return;
    }
  }
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}
