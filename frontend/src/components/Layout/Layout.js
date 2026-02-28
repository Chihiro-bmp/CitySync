import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { tokens, getTimePalette } from '../../theme';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AIAssistant from '../AIAssistant';

const SIDEBAR_FULL      = 240;
const SIDEBAR_COLLAPSED = 68;
const NAVBAR_HEIGHT     = 64;

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();
  const { user }   = useAuth();
  const t       = tokens[isDark ? 'dark' : 'light'];
  const palette = getTimePalette();
  const tp      = isDark ? palette.dark : palette.light;

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;
  const showAI = user?.role === 'consumer' || user?.role === 'employee';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: tp.bg,
      transition: 'background 0.6s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow — subtle time-of-day atmosphere */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', inset:0, background: tp.orb1 }} />
        {tp.orb2 !== 'none' && <div style={{ position:'absolute', inset:0, background: tp.orb2 }} />}
      </div>

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main area */}
      <div style={{
        marginLeft: sidebarWidth,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <Navbar sidebarWidth={sidebarWidth} />

        <main style={{
          flex: 1,
          marginTop: NAVBAR_HEIGHT,
          padding: '32px 28px',
          maxWidth: '100%',
        }}>
          {children}
        </main>
      </div>

      {showAI && <AIAssistant role={user.role} />}
    </div>
  );
};

export default Layout;