import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities } from '../../theme';
import { ComplaintIcon, UsageIcon, ElectricityIcon } from '../../Icons';

// ── Stat Card (same as ConsumerDashboard) ─────────────────────────────────────
const StatCard = ({ label, value, sub, gradient, glow, Icon, onClick, t }) => (
  <div onClick={onClick} style={{
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 16,
    padding: 20,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.18s, box-shadow 0.18s',
    position: 'relative',
    overflow: 'hidden',
  }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${glow}`; }}}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{ position:'absolute', top:-20, right:-20, width:90, height:90, borderRadius:'50%', background:gradient, opacity:0.12, filter:'blur(20px)', pointerEvents:'none' }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 12px ${glow}`, flexShrink:0 }}>
        <Icon size={20} color="#fff" />
      </div>
    </div>
    <div style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.5px', marginBottom:4 }}>{value}</div>
    <div style={{ fontSize:13, fontWeight:500, color:t.text, marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:12, color:t.textSub }}>{sub}</div>
  </div>
);

// ── Job Row ───────────────────────────────────────────────────────────────────
const JobRow = ({ job, isDark, t, onNavigate }) => {
  const statusCfg = {
    Resolved:    { bg: isDark ? '#0D2E1A' : '#DCFCE7', c: isDark ? '#4ADE80' : '#16A34A' },
    'In Progress':{ bg: isDark ? '#0F172A' : '#DBEAFE', c: isDark ? '#60A5FA' : '#2563EB' },
    Pending:     { bg: isDark ? '#422006' : '#FEF3C7', c: isDark ? '#FBBF24' : '#D97706' },
  }[job.status] || { bg: '#eee', c: '#333' };

  return (
    <div
      onClick={onNavigate}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:`1px solid ${t.border}`, cursor:'pointer' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      <div style={{ width:34, height:34, borderRadius:10, background: utilities.complaint.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${utilities.complaint.glow}`, flexShrink:0 }}>
        <ComplaintIcon size={16} color="#fff" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:t.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {job.consumer_first_name} {job.consumer_last_name}
        </div>
        <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>
          #{job.complaint_id} · {new Date(job.complaint_date).toLocaleDateString()}
        </div>
      </div>
      <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:100, background: statusCfg.bg, color: statusCfg.c, whiteSpace:'nowrap' }}>
        {job.status}
      </span>
    </div>
  );
};

// ── Connection Row ────────────────────────────────────────────────────────────
const ConnectionRow = ({ conn, t, isDark }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
    <div style={{ width:28, height:28, borderRadius:8, background: utilities.electricity.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 6px ${utilities.electricity.glow}`, flexShrink:0 }}>
      <ElectricityIcon size={13} color="#fff" />
    </div>
    <div style={{ flex:1 }}>
      <div style={{ fontSize:12, fontWeight:500, color:t.text }}>{conn.consumer_first_name} {conn.consumer_last_name}</div>
      <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>{conn.house_num}, {conn.street_name} · {conn.utility_name}</div>
    </div>
    <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:100, background: isDark ? '#0D2E1A' : '#DCFCE7', color: isDark ? '#4ADE80' : '#16A34A' }}>
      Active
    </span>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const FieldWorkerDashboard = () => {
  const { user, authFetch } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [jobs, setJobs]             = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobRes, connRes] = await Promise.all([
          authFetch('/api/fieldworker/jobs'),
          authFetch('/api/fieldworker/connections'),
        ]);
        const jobData  = await jobRes.json();
        const connData = await connRes.json();
        setJobs(Array.isArray(jobData.data)  ? jobData.data  : []);
        setConnections(Array.isArray(connData.data) ? connData.data : []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const pendingJobs  = jobs.filter(j => j.status === 'Pending').length;
  const inProgress   = jobs.filter(j => j.status === 'In Progress').length;
  const resolvedJobs = jobs.filter(j => j.status === 'Resolved').length;
  const urgentJobs   = jobs.filter(j => j.status !== 'Resolved');

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height:100, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:fonts.ui }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>
          Field Worker Portal
        </div>
        <h1 style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>
          Good {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p style={{ fontSize:14, color:t.textSub }}>
          Here's an overview of your assigned jobs and meter readings.
        </p>
      </div>

      {/* ── Urgent jobs alert ── */}
      {inProgress > 0 && (
        <div style={{
          padding:'14px 18px', borderRadius:12, marginBottom:24,
          background: isDark ? '#0F172A' : '#EFF6FF',
          border:`1px solid ${isDark ? '#1D4ED8' : '#BFDBFE'}`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>🔧</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: isDark ? '#60A5FA' : '#1D4ED8' }}>
                {inProgress} job{inProgress > 1 ? 's' : ''} in progress
              </div>
              <div style={{ fontSize:12, color: isDark ? '#93C5FD' : '#3B82F6' }}>
                Update status when complete
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/field-worker/jobs')} style={{ padding:'8px 16px', borderRadius:8, border:'none', background: isDark ? '#3B82F6' : '#2563EB', color:'#fff', fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
            View Jobs
          </button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard
          label="Pending Jobs"
          value={pendingJobs}
          sub="Awaiting action"
          gradient={utilities.complaint.gradient}
          glow={utilities.complaint.glow}
          Icon={ComplaintIcon}
          onClick={() => navigate('/field-worker/jobs')}
          t={t}
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          sub="Currently active"
          gradient="linear-gradient(135deg,#3B6FFF,#00C4FF)"
          glow="rgba(59,111,255,0.3)"
          Icon={UsageIcon}
          onClick={() => navigate('/field-worker/jobs')}
          t={t}
        />
        <StatCard
          label="Resolved"
          value={resolvedJobs}
          sub="Completed jobs"
          gradient="linear-gradient(135deg,#10B981,#059669)"
          glow="rgba(16,185,129,0.3)"
          Icon={ComplaintIcon}
          onClick={() => navigate('/field-worker/jobs')}
          t={t}
        />
        <StatCard
          label="Connections in Region"
          value={connections.length}
          sub="Available for readings"
          gradient={utilities.electricity.gradient}
          glow={utilities.electricity.glow}
          Icon={ElectricityIcon}
          onClick={() => navigate('/field-worker/readings')}
          t={t}
        />
      </div>

      {/* ── Bottom grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>

        {/* Recent jobs */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Recent Jobs</div>
            <button onClick={() => navigate('/field-worker/jobs')} style={{ fontSize:12, color:t.primary, background:'none', border:'none', cursor:'pointer', fontFamily:fonts.ui, fontWeight:500 }}>
              View all →
            </button>
          </div>
          {urgentJobs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:t.textMuted, fontSize:13 }}>
              No active jobs 🎉
            </div>
          ) : (
            urgentJobs.slice(0, 5).map(job => (
              <JobRow key={job.complaint_id} job={job} isDark={isDark} t={t} onNavigate={() => navigate('/field-worker/jobs')} />
            ))
          )}
        </div>

        {/* Connections in region */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:600, color:t.text }}>My Region Connections</div>
            <button onClick={() => navigate('/field-worker/readings')} style={{ fontSize:12, color:t.primary, background:'none', border:'none', cursor:'pointer', fontFamily:fonts.ui, fontWeight:500 }}>
              Log Reading →
            </button>
          </div>

          {connections.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:t.textMuted, fontSize:13 }}>
              No active connections in your region
            </div>
          ) : (
            connections.slice(0, 6).map((conn, i) => (
              <ConnectionRow key={i} conn={conn} t={t} isDark={isDark} />
            ))
          )}

          {connections.length > 6 && (
            <button onClick={() => navigate('/field-worker/readings')} style={{ width:'100%', marginTop:8, padding:'9px', borderRadius:8, border:`1px solid ${t.border}`, background:'transparent', color:t.primary, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer' }}>
              +{connections.length - 6} more connections
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default FieldWorkerDashboard;