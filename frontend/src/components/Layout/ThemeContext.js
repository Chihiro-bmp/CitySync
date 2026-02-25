import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('citysync_theme') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('citysync_theme', mode);
    // Set data-theme on body so CSS can style native elements (selects, scrollbars)
    document.body.setAttribute('data-theme', mode);
  }, [mode]);

  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light');
  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ mode, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};