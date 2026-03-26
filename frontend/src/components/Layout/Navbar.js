import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAvatar } from '../../context/AvatarContext';

const getPageTitle = (pathname) => {
  const segment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  return segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const Navbar = ({ sidebarWidth }) => {
  const { user } = useAuth();
  const { avatar } = useAvatar();
  const location = useLocation();

  const pageTitle = getPageTitle(location.pathname);

  return (
    <nav 
        className="fixed top-0 right-0 h-20 z-40 flex items-center justify-between px-10 transition-all duration-500 ease-in-out font-outfit bg-bg/80 backdrop-blur-xl border-b border-white/5"
        style={{ left: sidebarWidth }}
    >
      {/* Page Title */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-tight text-txt">{pageTitle}</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
           <div className="w-1 h-1 rounded-full bg-lime animate-pulse"></div>
           <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-txt/30">System Operational</span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Search / Notifications could go here, but for now just profile */}
        
        {user && (
          <div className="flex items-center gap-4 pl-6 border-l border-white/5">
            <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-txt leading-none mb-1">{user.firstName} {user.lastName}</p>
               <p className="text-[9px] font-mono text-lime/60 uppercase tracking-widest">{user.role?.replace('_', ' ')}</p>
            </div>
            
            <div className="relative group cursor-pointer">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 active:scale-95 shadow-lg shadow-black/20">
                    {avatar ? (
                        <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <span className="text-xs font-bold text-txt/40">
                             {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-lime border-2 border-bg rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;