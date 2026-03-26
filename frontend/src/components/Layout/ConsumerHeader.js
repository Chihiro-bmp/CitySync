import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useAvatar } from '../../context/AvatarContext';
import { navItems } from '../../theme';
import api from '../../services/api';

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const ConsumerHeader = () => {
  const { user, logout } = useAuth();
  const { avatar } = useAvatar();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const items = navItems.consumer || [];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch initial
    api.get('/notifications').then(res => setNotifications(res.data)).catch(console.error);

    // Socket.io connection
    const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';
    const socket = io(backendUrl);
    
    socket.emit('join', user.userId);
    
    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d) ? ts : d.toLocaleString();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 h-20 z-40 flex items-center justify-between px-10 transition-all duration-500 ease-in-out font-outfit bg-bg/80 backdrop-blur-xl border-b border-white/5"
    >
      {/* Logo */}
      <button
        type="button"
        onClick={() => navigate('/consumer/dashboard')}
        className="font-barlow text-2xl font-bold tracking-tight text-txt flex-shrink-0"
        aria-label="Go to dashboard"
      >
        City<span className="text-lime">Sync</span>
      </button>

      {/* Nav links */}
      <nav className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`text-[10px] font-mono uppercase tracking-[0.06em] whitespace-nowrap px-2 py-1 rounded-lg transition-all ${
                active
                  ? 'text-lime bg-white/5 border border-lime/10'
                  : 'text-txt/40 hover:text-txt hover:bg-white/[0.02] hover:border hover:border-white/[0.03]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-4 pl-6 border-l border-white/5 flex-shrink-0">
        <div className="relative group" ref={dropdownRef}>
          <button
            type="button"
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center cursor-pointer transition-transform shadow-lg shadow-black/20 ${
              showDropdown ? 'bg-white/10 border-white/20 scale-105' : 'bg-white/5 border-white/10 hover:scale-105 active:scale-95'
            }`}
            aria-label="Notifications"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className="text-txt/60 w-5 h-5 flex items-center justify-center">
              <BellIcon />
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange border-2 border-bg" />
            )}
          </button>

          {/* Dropdown Panel */}
          {showDropdown && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-[300px] bg-[#0E0E0E]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="py-3 px-3.5 flex items-center justify-between border-b border-white/[0.06]">
                <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-muted">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="font-mono text-[8.5px] text-lime/50 cursor-pointer tracking-wider uppercase hover:text-lime transition-colors">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto w-full no-scrollbar flex flex-col">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-txt/40 font-mono text-[10px] uppercase tracking-widest">
                    All caught up
                  </div>
                ) : (
                  notifications.slice(0, 5).map(notif => (
                    <div key={notif.notification_id} className="flex items-start gap-2.5 px-3.5 py-2.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${notif.dot_color} ${!notif.is_read ? 'opacity-100' : 'opacity-30'}`} />
                      <div className="flex-1">
                        <div className={`text-[11.5px] leading-[1.45] mb-1 font-outfit ${!notif.is_read ? 'text-txt/90' : 'text-txt/60'}`}>
                          {notif.message}
                        </div>
                        <div className="font-mono text-[9px] text-txt/30 tracking-wider">
                          {formatTime(notif.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div
                className="py-2.5 px-3.5 font-mono text-[9px] tracking-widest uppercase text-txt/40 text-center cursor-pointer hover:text-lime transition-colors border-t border-white/[0.04]"
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/consumer/notifications');
                }}
              >
                View all notifications →
              </div>
            </div>
          )}
        </div>

        {user && (
          <>
            <div className="relative group">
              <button
                type="button"
                onClick={() => navigate('/consumer/profile')}
                className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 active:scale-95 shadow-lg shadow-black/20 cursor-pointer"
                aria-label="Open profile"
              >
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span className="text-xs font-bold text-txt/40">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </span>
                )}
              </button>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-lime border-2 border-bg rounded-full" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex text-[13px] font-bold tracking-tight text-red-500/70 hover:text-red-500 transition-colors px-2 py-1 rounded-lg"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default ConsumerHeader;
