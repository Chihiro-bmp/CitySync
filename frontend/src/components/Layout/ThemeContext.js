import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Use 'dark' as the only mode
  const [mode] = useState('dark');

  useEffect(() => {
    localStorage.setItem('citysync_theme', 'dark');
    document.body.setAttribute('data-theme', 'dark');
    // Ensure dark class is on html for tailwind darkMode: 'class'
    document.documentElement.classList.add('dark');
  }, []);

  const toggle = () => {
    console.warn('Theme toggle is disabled. CitySync is now dark only.');
  };
  
  const isDark = true;

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