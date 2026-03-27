import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import NewApplicationModal from './NewApplicationModal';
import { X, Check, Inbox } from '../../Icons';

const STEPS = ['Pending', 'Review', 'Approved', 'Ready'];
const stepIndex = (status) => {
  if (status === 'Pending')      return 0;
  if (status === 'Under Review') return 1;
  if (status === 'Approved')     return 2;
  if (status === 'Connected')    return 3;
  if (status === 'Rejected')     return -1;
  return 0;
};

const StatusTimeline = ({ status }) => {
  const current = stepIndex(status);
  const rejected = status === 'Rejected';

  return (
    <div className="flex items-center gap-0 mt-6 relative px-2">
      {STEPS.map((step, i) => {
        const done    = !rejected && i <= current;
        const active  = !rejected && i === current;
        const isLast  = i === STEPS.length - 1;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <div 
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  rejected && i === 0 ? 'bg-red-500 border-red-500' :
                  done ? 'bg-lime border-lime' : 'bg-white/5 border-white/10'
                } ${active ? 'ring-4 ring-lime/20 scale-110' : ''}`}
              >
                {rejected && i === 0 ? (
                  <X size={10} className="text-bg" strokeWidth={3} />
                ) : done ? (
                  <Check size={10} className="text-bg" strokeWidth={3} />
                ) : null}
              </div>
              <span className={`text-[9px] font-mono uppercase tracking-widest ${done ? 'text-lime' : 'text-txt/20'}`}>
                {rejected && i === 0 ? 'Failed' : step}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-[1px] -mt-6 mx-2 transition-all duration-700 ${done && !rejected && i < current ? 'bg-lime shadow-[0_0_8px_rgba(204,255,0,0.4)]' : 'bg-white/5'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const AppCard = ({ app }) => {
  const utilKey = (app.utility_type || 'electricity').toLowerCase();
  
  const statusColors = {
    'Pending': 'text-orange bg-orange/10 border-orange/20',
    'Under Review': 'text-cyan bg-cyan/10 border-cyan/20',
    'Approved': 'text-lime bg-lime/10 border-lime/20',
    'Connected': 'text-lime bg-lime/10 border-lime/20',
    'Rejected': 'text-red-500 bg-red-500/10 border-red-500/20'
  };

  const utilStyles = {
    electricity: 'text-lime',
    water: 'text-cyan',
    gas: 'text-orange'
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all duration-300 group relative overflow-hidden font-dm">
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-[0.03] pointer-events-none bg-${utilKey === 'electricity' ? 'lime' : utilKey === 'water' ? 'cyan' : 'orange'}`}></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-rajdhani text-xl font-bold tracking-tight text-txt capitalize">{app.utility_type}</h3>
            <span className="text-[10px] text-txt/20 font-mono tracking-widest uppercase">ID: #{app.application_id}</span>
          </div>
          <p className="text-txt/40 text-xs font-mono">{app.utility_name} · {new Date(app.application_date).toLocaleDateString()}</p>
        </div>
        <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${statusColors[app.status] || 'text-txt/40 bg-white/5 border-white/10'}`}>
          {app.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-white/5 my-4">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-txt/30 mb-1">Service Type</p>
          <p className="text-xs font-medium text-txt/80">{app.requested_connection_type}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-txt/30 mb-1">Priority</p>
          <p className={`text-xs font-bold ${app.priority === 'High' ? 'text-orange' : app.priority === 'Urgent' ? 'text-red-500' : 'text-txt/60'}`}>
            {app.priority}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[9px] font-mono uppercase tracking-widest text-txt/30 mb-1">Service Address</p>
          <p className="text-xs font-medium text-txt/80 truncate">{app.address}, {app.region_name}</p>
        </div>
      </div>

      <StatusTimeline status={app.status} />
    </div>
  );
};

const ConnectionApplications = () => {
  const { authFetch } = useAuth();
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess]     = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/consumer/applications');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setApps(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleSuccess = () => {
    setShowModal(false);
    setSuccess(true);
    fetchApps();
    setTimeout(() => setSuccess(false), 4000);
  };

  const filters = ['All', 'Pending', 'Under Review', 'Approved', 'Connected', 'Rejected'];
  const filtered = filter === 'All' ? apps : apps.filter(a => a.status === filter);

  return (
    <div className="max-w-[1200px] mx-auto font-dm pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="font-rajdhani text-4xl font-bold tracking-tight text-txt mb-2">My Applications</h1>
          <p className="text-txt/40 text-sm font-dm">Track and manage your utility connection requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-lime text-bg font-bold px-8 py-4 rounded-2xl transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-lime/10"
        >
          New Connection Application
        </button>
      </div>

      {success && (
        <div className="mb-8 p-4 rounded-2xl bg-lime/10 border border-lime/20 text-lime text-sm animate-fade-in flex items-center gap-3">
           <Check size={16} className="shrink-0" /> Application submitted successfully!
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all whitespace-nowrap border ${
              filter === f 
                ? 'bg-lime text-bg border-lime font-bold' 
                : 'bg-white/5 text-txt/30 border-white/5 hover:border-white/10 hover:text-txt/60'
            }`}
          >
            {f} {f !== 'All' && <span className="ml-1 opacity-50">({apps.filter(a => a.status === f).length})</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-3xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 bg-white/[0.01] border border-dashed border-white/5 rounded-[40px]">
           <div className="flex justify-center mb-6 text-txt/10"><Inbox size={60} /></div>
           <p className="text-txt/40 text-lg mb-2 tracking-tight">No applications found</p>
           <p className="text-txt/20 text-xs uppercase tracking-widest font-mono">Try a different filter or submit a new request</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(app => <AppCard key={app.application_id} app={app} />)}
        </div>
      )}

      {showModal && <NewApplicationModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  );
};

export default ConnectionApplications;