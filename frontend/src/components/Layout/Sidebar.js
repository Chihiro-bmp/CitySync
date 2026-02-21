import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from './ThemeContext';
import { tokens, navItems, fonts } from '../../theme';
import { NavIcons, LogoutIcon, ChevronIcon } from '../../Icons';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 68;

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div style={{
      width,
      minHeight: '100vh',
      background: t.sidebar,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 50,
      transition: 'width 0.25s ease',
      borderRight: `1px solid rgba(255,255,255,0.04)`,
      overflow: 'hidden',
    }}>

      {/* ── Logo ── */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        minHeight: 68,
      }}>
        {/* Logo mark */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59,111,255,0.35)',
          cursor: 'pointer',
        }} onClick={onToggle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9L12 3L21 9V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9Z" fill="#fff"/>
          </svg>
        </div>

        {/* Wordmark — hidden when collapsed */}
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
              CitySync
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, color: '#334466', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {user?.role?.replace('_', ' ')}
            </div>
          </div>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map((item) => {
          const active = isActive(item.path);
          const IconComp = NavIcons[item.icon];

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '11px 0' : '11px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 2,
                background: active
                  ? `linear-gradient(135deg, rgba(59,111,255,0.18), rgba(0,196,255,0.08))`
                  : 'transparent',
                transition: 'background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = isDark ? '#0D1425' : '#151C30'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Active indicator bar */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 3px 3px 0',
                  background: 'linear-gradient(180deg,#3B6FFF,#00C4FF)',
                }} />
              )}

              {IconComp && (
                <IconComp
                  size={18}
                  color={active ? '#4D7DFF' : '#4A5C78'}
                />
              )}

              {!collapsed && (
                <span style={{
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#fff' : '#4A5C78',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s',
                }}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── User + Logout ── */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* User info */}
        {!collapsed && user && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            marginBottom: 8,
          }}>
            <div style={{ fontFamily: fonts.ui, fontSize: 13, fontWeight: 600, color: '#8A9BBF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.firstName} {user.lastName}
            </div>
            <div style={{ fontFamily: fonts.mono, fontSize: 10, color: '#334466', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {user.role?.replace('_', ' ')}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '11px 0' : '11px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogoutIcon size={18} color="#4A5C78" />
          {!collapsed && (
            <span style={{ fontFamily: fonts.ui, fontSize: 14, fontWeight: 400, color: '#4A5C78' }}>
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;