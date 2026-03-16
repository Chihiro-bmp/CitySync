import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities } from '../../theme';
import { getTableOverview } from '../../services/api';
import {
  ElectricityIcon, WaterIcon, GasIcon,
  PaymentIcon, ComplaintIcon, BillIcon, UsageIcon
} from '../../Icons';

// ── Stat Card ─────────────────────────────────────────────────────────────────
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
    {/* Gradient corner blob */}
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await getTableOverview();
      const st = {};
      res.data.tables.forEach(t => st[t.name] = t.count);
      setStats(st);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Skeleton loading ───────────────────────────────────────────────────────
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
          Employee Portal
        </div>
        <h1 style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>
          Good {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p style={{ fontSize:14, color:t.textSub }}>
          Here's an overview of the CitySync system operations.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard
          label="Consumers"
          value={stats.consumer || 0}
          sub="Registered users"
          gradient="linear-gradient(135deg,#3B6FFF,#00C4FF)"
          glow="rgba(59,111,255,0.3)"
          Icon={UsageIcon}
          onClick={() => navigate('/employee/consumers')}
          t={t}
        />
        <StatCard
          label="Active Connections"
          value={stats.connection || 0}
          sub="Across all regions"
          gradient={utilities.water.gradient}
          glow={utilities.water.glow}
          Icon={WaterIcon}
          onClick={() => navigate('/employee/connections')}
          t={t}
        />
        <StatCard
          label="Field Workers"
          value={stats.field_worker || 0}
          sub="Active personnel"
          gradient={utilities.gas.gradient}
          glow={utilities.gas.glow}
          Icon={ElectricityIcon}
          onClick={() => navigate('/employee/field-workers')}
          t={t}
        />
        <StatCard
          label="Complaints"
          value={stats.complaint || 0}
          sub="Total submitted"
          gradient={utilities.complaint.gradient}
          glow={utilities.complaint.glow}
          Icon={ComplaintIcon}
          onClick={() => navigate('/employee/complaints')}
          t={t}
        />
        <StatCard
          label="Bills Issued"
          value={stats.bill_document || 0}
          sub="Total billing cycles"
          gradient={utilities.payment.gradient}
          glow={utilities.payment.glow}
          Icon={BillIcon}
          t={t}
        />
         <StatCard
          label="Payments"
          value={stats.payment || 0}
          sub="Successful transactions"
          gradient="linear-gradient(135deg, #10B981, #059669)"
          glow="rgba(16,185,129,0.3)"
          Icon={PaymentIcon}
          t={t}
        />
      </div>
      
      {/* ── Quick Actions ── */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
        <div style={{ fontSize:15, fontWeight:600, color:t.text, marginBottom:18 }}>Quick Links</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/employee/applications')} style={{ padding:'10px 16px', borderRadius:8, border:`1px solid ${t.border}`, background: 'transparent', color:t.primary, fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
            Review Applications
            </button>
            <button onClick={() => navigate('/employee/tariffs')} style={{ padding:'10px 16px', borderRadius:8, border:`1px solid ${t.border}`, background: 'transparent', color:t.primary, fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
            Manage Tariffs
            </button>
            <button onClick={() => navigate('/employee/regions')} style={{ padding:'10px 16px', borderRadius:8, border:`1px solid ${t.border}`, background: 'transparent', color:t.primary, fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
            Manage Regions
            </button>
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

export default EmployeeDashboard;
