import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from './ThemeContext';
import { tokens, fonts } from '../../theme';
import { SunIcon, MoonIcon, ChevronIcon } from '../../Icons';

// Derive a readable page title from the current path
const getPageTitle = (pathname) => {
  const segment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  return segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const Navbar = ({ sidebarWidth }) => {
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const t = tokens[isDark ? 'dark' : 'light'];

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: sidebarWidth,
      right: 0,
      height: 64,
      background: isDark
        ? 'rgba(8,12,24,0.85)'
        : 'rgba(245,246,250,0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${t.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      zIndex: 40,
      transition: 'left 0.25s ease, background 0.35s',
    }}>

      {/* ── Page title ── */}
      <div>
        <h1 style={{
          fontFamily: fonts.ui,
          fontSize: 17,
          fontWeight: 600,
          color: t.text,
          letterSpacing: '-0.2px',
          margin: 0,
        }}>
          {pageTitle}
        </h1>
      </div>

      {/* ── Right controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Dark/Light toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px 7px 8px',
            borderRadius: 100,
            border: `1px solid ${t.border}`,
            background: isDark ? '#0F1628' : '#fff',
            cursor: 'pointer',
            color: t.textSub,
            fontSize: 13,
            fontFamily: fonts.ui,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: isDark
              ? 'linear-gradient(135deg,#F5A623,#FFD200)'
              : 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isDark
              ? '0 2px 8px rgba(245,166,35,0.4)'
              : '0 2px 8px rgba(59,111,255,0.35)',
            flexShrink: 0,
          }}>
            {isDark ? <SunIcon size={13} /> : <MoonIcon size={13} />}
          </div>
          {isDark ? 'Light' : 'Dark'}
        </button>

        {/* User avatar chip */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '6px 12px 6px 6px',
            borderRadius: 100,
            border: `1px solid ${t.border}`,
            background: isDark ? '#0F1628' : '#fff',
            cursor: 'default',
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: fonts.ui,
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: fonts.ui, fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 9, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {user.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;