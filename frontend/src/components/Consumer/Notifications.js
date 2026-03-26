import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d) ? ts : d.toLocaleString();
  };

  return (
    <div className="pt-28 pb-20 px-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-barlow text-3xl font-bold tracking-tight text-txt mb-1">
            Notifications
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Stay updated on your utilities
          </p>
        </div>
        <button
          className="font-mono text-[9px] text-lime/50 hover:text-lime transition-colors tracking-widest uppercase cursor-pointer bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
          onClick={markAllRead}
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-bg/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-txt/40 font-mono text-[10px] uppercase tracking-widest">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-txt/40 font-mono text-[10px] uppercase tracking-widest">
            No active notifications
          </div>
        ) : (
          notifications.map((notif, idx) => (
            <div
              key={notif.notification_id || Math.random()}
              className={`flex items-start gap-4 p-5 cursor-pointer transition-colors hover:bg-white/[0.03] ${
                idx !== notifications.length - 1 ? 'border-b border-white/[0.04]' : ''
              } ${!notif.is_read ? 'bg-white/[0.01]' : 'opacity-70'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${notif.dot_color}`} />
              <div className="flex-1">
                <div className="text-[13px] text-txt/90 leading-relaxed mb-1.5 font-outfit">
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
    </div>
  );
};

export default Notifications;
