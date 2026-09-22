import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AuthContext = createContext(null);

// Tracks the signed-in client account (if any) for the whole app. Talks to
// the /api/account/* routes, which use their own session cookie separate
// from the admin panel's — a client and an admin can be logged in
// simultaneously in the same browser without interfering with each other.
export function AuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/account/me`, { credentials: 'include' });
      if (!res.ok) {
        setClient(null);
        return;
      }
      const data = await res.json();
      setClient(data.client);
    } catch {
      setClient(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/api/account/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not sign in.');
    setClient(data.client);
    return data.client;
  }, []);

  const register = useCallback(async ({ email, password, name, phone }) => {
    const res = await fetch(`${API_BASE}/api/account/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not create your account.');
    setClient(data.client);
    return data.client;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/api/account/logout`, { method: 'POST', credentials: 'include' });
    setClient(null);
  }, []);

  return (
    <AuthContext.Provider value={{ client, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
