import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('citysync_token');
    const savedUser = localStorage.getItem('citysync_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('citysync_token');
        localStorage.removeItem('citysync_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('citysync_token', tokenValue);
    localStorage.setItem('citysync_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('citysync_token');
    localStorage.removeItem('citysync_user');
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      if (res.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
      return res;
    },
    [token, logout]
  );

  const isAuthenticated = !!user && !!token;
  const isConsumer    = user?.role === 'consumer';
  const isFieldWorker = user?.role === 'field_worker';
  const isEmployee    = user?.role === 'employee';

  const getHomePath = useCallback((role) => {
    switch (role) {
      case 'employee':     return '/employee/dashboard';
      case 'field_worker': return '/field-worker/dashboard';
      case 'consumer':
      default:             return '/consumer/dashboard';
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, authFetch,
      isAuthenticated,
      isConsumer, isFieldWorker, isEmployee,
      getHomePath,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;