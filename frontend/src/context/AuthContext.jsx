import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const initialised           = useRef(false);

  // ── Boot: check for existing session on mount ──
  // We use a ref guard so this only fires once.
  // State is set inside async callbacks (not synchronously)
  // which satisfies the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Use a microtask so the state update is not synchronous
      Promise.resolve().then(() => setLoading(false));
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}