import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const AvatarContext = createContext(null);

export const AvatarProvider = ({ children }) => {
  const { authFetch, isAuthenticated } = useAuth();
  const [avatar, setAvatar] = useState(null);

  // Fetch avatar once on login
  const loadAvatar = useCallback(async () => {
    if (!isAuthenticated) { setAvatar(null); return; }
    try {
      const res  = await authFetch('/api/consumer/profile');
      if (!res.ok) return;
      const data = await res.json();
      setAvatar(data.avatar_b64 || null);
    } catch {
      // non-consumer roles won't have this endpoint — silently ignore
    }
  }, [isAuthenticated, authFetch]);

  useEffect(() => { loadAvatar(); }, [loadAvatar]);

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = () => {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error('useAvatar must be inside <AvatarProvider>');
  return ctx;
};