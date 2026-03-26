import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AIAssistant from '../AIAssistant';
import ConsumerHeader from './ConsumerHeader';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user }   = useAuth();

  const isConsumer = user?.role === 'consumer';
  const sidebarWidth = collapsed ? 68 : 240;
  const showAI = user?.role === 'consumer' || user?.role === 'employee';

  return (
    <div className="flex min-h-screen bg-bg relative overflow-hidden transition-colors duration-500">
      {/* Sidebar (hidden for consumer; nav moves to header) */}
      {!isConsumer && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300 min-w-0 relative z-10"
        style={{ marginLeft: isConsumer ? 0 : sidebarWidth }}
      >
        {isConsumer ? (
          <ConsumerHeader />
        ) : (
          <Navbar sidebarWidth={sidebarWidth} />
        )}

        <main className={`flex-1 p-6 md:p-8 max-w-full ${isConsumer ? 'mt-20' : 'mt-16'}`}>
          {children}
        </main>
      </div>

      {showAI && <AIAssistant role={user.role} />}
    </div>
  );
};

export default Layout;