import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    authAPI.me()
      .then(res => setUser(res.data.user))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, refresh_token, user: profile } = res.data;
    localStorage.setItem('access_token',  access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setUser(profile);
    return profile;
  }, []);

  const signup = useCallback(async (full_name, email, password, role) => {
    const res = await authAPI.signup({ full_name, email, password, role });
    const { access_token, refresh_token, user: profile } = res.data?.session
      ? { access_token: res.data.session.access_token, refresh_token: res.data.session.refresh_token, user: res.data.user }
      : { access_token: null, refresh_token: null, user: res.data.user };
    if (access_token) {
      localStorage.setItem('access_token',  access_token);
      localStorage.setItem('refresh_token', refresh_token);
      setUser(profile);
    }
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (_) {}
    localStorage.clear();
    setUser(null);
  }, []);

  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAdmin, isManager, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};