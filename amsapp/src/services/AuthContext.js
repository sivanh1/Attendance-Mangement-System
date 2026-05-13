import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { storage } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const val = await storage.getItem('user');
        if (val) setUser(JSON.parse(val));
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login/', { username, password });

    await storage.setItem('access_token', res.data.access);
    await storage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const register = async (username, password, password2) => {
    const res = await api.post('/api/auth/register/', { username, password, password2 });

    await storage.setItem('access_token', res.data.access);
    await storage.setItem('user', JSON.stringify(res.data.user));

    setUser(res.data.user);
  };

  const logout = async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);