import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import {
  ElectricityIcon, WaterIcon, GasIcon,
  PaymentIcon, ComplaintIcon, BillIcon, UsageIcon
} from '../../Icons';

// ── Utility icon map ──────────────────────────────────────────────────────────
const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

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
      <div style={{ fontSize:11, color:'#4ADE80', fontFamily:fonts.mono, background:'rgba(34,197,94,0.1)', padding:'3px 8px', borderRadius:100 }}>
        Active
      </div>
    </div>

    <div style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.5px', marginBottom:4 }}>{value}</div>
    <div style={{ fontSize:13, fontWeight:500, color:t.text, marginBottom:2 }}>{label}</div>
    <div style={{ fontSize:12, color:t.textSub }}>{sub}</div>
  </div>
);

// ── Bill Row ──────────────────────────────────────────────────────────────────
const BillRow = ({ bill, isDark, t }) => {
  const util = utilities[bill.utility_tag] || utilities.electricity;
  const Icon = UtilIcons[bill.utility_tag] || ElectricityIcon;
  const status = statusColors[bill.status] || statusColors['Pending'];

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:`1px solid ${t.border}` }}>
      <div style={{ width:34, height:34, borderRadius:10, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${util.glow}`, flexShrink:0 }}>
        <Icon size={16} color="#fff" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:t.text }}>{util.label}</div>
        <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>{bill.period}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:600, color:t.text, fontFamily:fonts.ui }}>৳ {bill.amount}</div>
        <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:100, background: isDark ? status.db : status.lb, color: isDark ? status.dc : status.lc }}>
          {bill.status}
        </span>
      </div>
    </div>
  );
};

// ── Mini usage bar ────────────────────────────────────────────────────────────
const UsageBar = ({ label, used, total, gradient, glow, t }) => {
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:500, color:t.text }}>{label}</span>
        <span style={{ fontSize:12, color:t.textSub, fontFamily:fonts.mono }}>{used} / {total} units</span>
      </div>
      <div style={{ height:7, borderRadius:100, background: t.border, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:100, background:gradient, width:`${pct}%`, boxShadow:`0 0 8px ${glow}`, transition:'width 0.6s ease' }} />
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const ConsumerDashboard = () => {
  const { user, authFetch } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [connections, setConnections] = useState([]);
  const [bills, setBills]             = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [connRes, billRes] = await Promise.all([
        authFetch(`/api/consumer/connections`),
        authFetch(`/api/consumer/bills?limit=5`),
      ]);
      const connData = await connRes.json();
      const billData = await billRes.json();
      if (!connRes.ok) throw new Error(connData.error);
      if (!billRes.ok) throw new Error(billData.error);
      setConnections(connData);
      setBills(billData);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalDue      = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const overdueBills  = bills.filter(b => b.status === 'Overdue');
  const activeConn    = connections.filter(c => c.connection_status === 'Connected');

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
          Consumer Portal
        </div>
        <h1 style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>
          Good {getGreeting()}, {user?.firstName} 👋
        </h1>
        <p style={{ fontSize:14, color:t.textSub }}>
          Here's an overview of your utility connections and billing.
        </p>
      </div>

      {/* ── Overdue alert ── */}
      {overdueBills.length > 0 && (
        <div style={{
          padding:'14px 18px', borderRadius:12, marginBottom:24,
          background: isDark ? '#2D0C0C' : '#FEF2F2',
          border:`1px solid ${isDark ? '#F8717133' : '#FCA5A5'}`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: isDark ? '#F87171' : '#B91C1C' }}>
                {overdueBills.length} overdue {overdueBills.length === 1 ? 'bill' : 'bills'}
              </div>
              <div style={{ fontSize:12, color: isDark ? '#F8717199' : '#DC2626' }}>
                Please pay before disconnection
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/consumer/bills')} style={{ padding:'8px 16px', borderRadius:8, border:'none', background: isDark ? '#F87171' : '#EF4444', color:'#fff', fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
            Pay Now
          </button>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        <StatCard
          label="Total Due"
          value={`৳ ${totalDue.toLocaleString()}`}
          sub="Across all connections"
          gradient={utilities.payment.gradient}
          glow={utilities.payment.glow}
          Icon={PaymentIcon}
          onClick={() => navigate('/consumer/bills')}
          t={t}
        />
        <StatCard
          label="Active Connections"
          value={activeConn.length}
          sub="Electricity, water, gas"
          gradient="linear-gradient(135deg,#3B6FFF,#00C4FF)"
          glow="rgba(59,111,255,0.3)"
          Icon={BillIcon}
          onClick={() => navigate('/consumer/connections')}
          t={t}
        />
        <StatCard
          label="Bills This Month"
          value={bills.length}
          sub="View full history"
          gradient={utilities.complaint.gradient}
          glow={utilities.complaint.glow}
          Icon={UsageIcon}
          onClick={() => navigate('/consumer/bills')}
          t={t}
        />
        <StatCard
          label="Complaints"
          value="0 open"
          sub="No active complaints"
          gradient={utilities.complaint.gradient}
          glow={utilities.complaint.glow}
          Icon={ComplaintIcon}
          onClick={() => navigate('/consumer/complaints')}
          t={t}
        />
      </div>

      {/* ── Bottom grid — recent bills + usage ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>

        {/* Recent bills */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Recent Bills</div>
            <button onClick={() => navigate('/consumer/bills')} style={{ fontSize:12, color:t.primary, background:'none', border:'none', cursor:'pointer', fontFamily:fonts.ui, fontWeight:500 }}>
              View all →
            </button>
          </div>
          {bills.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:t.textMuted, fontSize:13 }}>
              No bills yet
            </div>
          ) : (
            bills.slice(0, 5).map((bill, i) => (
              <BillRow key={i} bill={bill} isDark={isDark} t={t} />
            ))
          )}
        </div>

        {/* Usage summary */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Usage This Month</div>
            <button onClick={() => navigate('/consumer/usage')} style={{ fontSize:12, color:t.primary, background:'none', border:'none', cursor:'pointer', fontFamily:fonts.ui, fontWeight:500 }}>
              Details →
            </button>
          </div>

          {connections.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:t.textMuted, fontSize:13 }}>
              No active connections
            </div>
          ) : (
            <>
              {connections.find(c => c.utility_tag === 'electricity') && (
                <UsageBar label="Electricity" used={connections.find(c => c.utility_tag === 'electricity')?.units_used || 0} total={500} gradient={utilities.electricity.gradient} glow={utilities.electricity.glow} t={t} />
              )}
              {connections.find(c => c.utility_tag === 'water') && (
                <UsageBar label="Water" used={connections.find(c => c.utility_tag === 'water')?.units_used || 0} total={300} gradient={utilities.water.gradient} glow={utilities.water.glow} t={t} />
              )}
              {connections.find(c => c.utility_tag === 'gas') && (
                <UsageBar label="Gas" used={connections.find(c => c.utility_tag === 'gas')?.units_used || 0} total={200} gradient={utilities.gas.gradient} glow={utilities.gas.glow} t={t} />
              )}
            </>
          )}

          {/* My connections list */}
          <div style={{ marginTop:20, paddingTop:18, borderTop:`1px solid ${t.border}` }}>
            <div style={{ fontSize:13, fontWeight:600, color:t.text, marginBottom:12 }}>My Connections</div>
            {connections.length === 0 ? (
              <div style={{ fontSize:12, color:t.textMuted }}>No connections found</div>
            ) : (
              connections.map((conn, i) => {
                const util = utilities[conn.utility_tag] || utilities.electricity;
                const Icon = UtilIcons[conn.utility_tag] || ElectricityIcon;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 6px ${util.glow}`, flexShrink:0 }}>
                      <Icon size={13} color="#fff" />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:t.text }}>{util.label}</div>
                      <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>ID: {conn.connection_id}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:100, background: conn.connection_status === 'Connected' ? (isDark ? '#0D2E1A' : '#DCFCE7') : (isDark ? '#2D0C0C' : '#FEE2E2'), color: conn.connection_status === 'Connected' ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#F87171' : '#B91C1C') }}>
                      {conn.connection_status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
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

export default ConsumerDashboard;