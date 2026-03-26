import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { navItems } from '../../theme';

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside 
        className={`fixed left-0 top-0 bottom-0 z-50 bg-bg border-r border-white/5 transition-all duration-500 ease-in-out flex flex-col font-outfit overflow-hidden ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Logo Section */}
      <div className={`h-24 flex items-center border-b border-white/5 px-6 shrink-0 ${collapsed ? 'justify-center' : 'justify-start gap-4'}`}>
        <div 
            onClick={onToggle}
            className="w-10 h-10 rounded-2xl bg-lime flex items-center justify-center cursor-pointer shadow-lg shadow-lime/10 transition-transform active:scale-90 shrink-0"
        >
          <span className="text-bg text-xl font-bold">C</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in flex flex-col">
            <span className="font-barlow text-xl font-bold tracking-tight text-txt leading-none">City<span className="text-lime">Sync</span></span>
            <span className="text-[9px] font-mono text-txt/30 uppercase tracking-widest mt-1">{user?.role?.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 relative group ${
                active 
                  ? 'bg-white/5 text-lime' 
                  : 'text-txt/40 hover:bg-white/[0.02] hover:text-txt/80'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime rounded-r-full" />
              )}
              
              <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 text-txt/20'}`}>
                {/* Fallback icon if none provided by comp */}
                <div className="w-5 h-5 border border-current rounded-md opacity-40"></div>
              </div>

              {!collapsed && (
                <span className={`text-[13.5px] font-bold tracking-tight animate-fade-in ${active ? 'text-txt' : ''}`}>
                    {item.label}
                </span>
              )}

              {collapsed && !active && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-bg border border-white/10 rounded-xl text-[10px] uppercase font-mono tracking-widest text-lime opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-2xl">
                      {item.label}
                  </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Logout Section */}
      <div className="p-4 border-t border-white/5 shrink-0 bg-white/[0.01]">
        {!collapsed && user && (
            <div className="px-4 py-4 rounded-3xl bg-white/[0.02] border border-white/5 mb-4 animate-fade-in">
                <p className="text-xs font-bold text-txt mb-0.5 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] font-mono text-txt/20 uppercase tracking-widest">{user.role}</p>
            </div>
        )}
        
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all group ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-5 h-5 transition-transform group-hover:scale-110">
             <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
          {!collapsed && <span className="text-[13.5px] font-bold tracking-tight">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;