import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { tokens } from '../../theme';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AIAssistant from '../AIAssistant';

const SIDEBAR_FULL      = 240;
const SIDEBAR_COLLAPSED = 68;
const NAVBAR_HEIGHT     = 64;

/**
 * Layout — wraps every authenticated page.
 *
 * Usage in App.js:
 *   <Route path="/consumer/*" element={
 *     <ProtectedRoute roles={['consumer']}>
 *       <Layout>
 *         <Routes>
 *           <Route path="dashboard" element={<ConsumerDashboard />} />
 *           ...
 *         </Routes>
 *       </Layout>
 *     </ProtectedRoute>
 *   } />
 */
const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { isDark } = useTheme();
  const { user }   = useAuth();
  const t = tokens[isDark ? 'dark' : 'light'];

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL;

  // Show AI assistant for consumer and employee roles only
  const showAI = user?.role === 'consumer' || user?.role === 'employee';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: t.bg, transition: 'background 0.35s' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main area — offset by sidebar width */}
      <div style={{
        marginLeft: sidebarWidth,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.25s ease',
        minWidth: 0,
      }}>
        <Navbar sidebarWidth={sidebarWidth} />

        {/* Page content */}
        <main style={{
          flex: 1,
          marginTop: NAVBAR_HEIGHT,
          padding: '32px 28px',
          maxWidth: '100%',
        }}>
          {children}
        </main>
      </div>

      {/* AI Assistant — floats above all content */}
      {showAI && <AIAssistant role={user.role} />}
    </div>
  );
};

export default Layout;