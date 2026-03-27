import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AIAssistant from '../AIAssistant';
import ConsumerHeader from './ConsumerHeader';
import FloatingNavRail from '../Employee/Shared/FloatingNavRail';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const isConsumer   = user?.role === 'consumer';
  const isEmployee   = user?.role === 'employee';
  const sidebarWidth = collapsed ? 68 : 240;

  const showAI = user?.role === 'consumer' || user?.role === 'employee';

  // margin: consumer=0, employee=80px (rail 56px + 12px left offset + 12px gap), others=sidebarWidth
  const marginLeft = isConsumer ? 0 : isEmployee ? 80 : sidebarWidth;

  return (
    <div className="flex min-h-screen bg-bg relative overflow-hidden transition-colors duration-500">

      {/* Navigation */}
      {isEmployee ? (
        <FloatingNavRail />
      ) : !isConsumer ? (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      ) : null}

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col transition-all duration-300 min-w-0 relative z-10"
        style={{ marginLeft }}
      >
        {isConsumer ? (
          <ConsumerHeader />
        ) : !isEmployee ? (
          <Navbar sidebarWidth={sidebarWidth} />
        ) : null}

        <main className={`flex-1 p-6 md:p-8 max-w-full ${isConsumer ? 'mt-20' : isEmployee ? 'mt-4' : 'mt-16'}`}>
          {children}
        </main>
      </div>

      {showAI && <AIAssistant role={user.role} />}
    </div>
  );
};

export default Layout;
