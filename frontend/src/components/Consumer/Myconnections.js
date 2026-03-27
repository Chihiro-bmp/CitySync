import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, statusColors } from '../../theme';
import { ConnectionIcon, Plus, Zap, Flame, Droplets } from '../../Icons';

const UTIL_CONFIG = {
  electricity: { Icon: Zap,      color: '#CCFF00', gradient: 'linear-gradient(135deg,#CCFF00,#99CC00)', glow: 'rgba(204,255,0,0.25)'  },
  water:       { Icon: Droplets, color: '#00D4FF', gradient: 'linear-gradient(135deg,#00D4FF,#0099BB)', glow: 'rgba(0,212,255,0.25)'  },
  gas:         { Icon: Flame,    color: '#FF9900', gradient: 'linear-gradient(135deg,#FF9900,#CC7700)', glow: 'rgba(255,153,0,0.25)'  },
};

// ── Connection Card ───────────────────────────────────────────────────────────
const ConnectionCard = ({ conn, t, isDark, onOpen }) => {
  const utilKey = conn.utility_tag;
  const util    = UTIL_CONFIG[utilKey] || UTIL_CONFIG.electricity;
  const Icon    = util.Icon;
  const sc      = statusColors[conn.connection_status] || statusColors['Inactive'];
  const connectionName = conn.connection_name || conn.utility_name;

  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
      padding: 22, position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.18s',
    }}
      role="button"
      tabIndex={0}
      aria-label={`Open details for connection ${conn.connection_id}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 6px 24px ${util.glow}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Glow blob */}
      <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:util.gradient, opacity:0.08, filter:'blur(24px)', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:13, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 12px ${util.glow}`, flexShrink:0 }}>
            <Icon size={20} color="#000" />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:t.text, textTransform:'capitalize' }}>{connectionName}</div>
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:100, background:isDark ? sc.db : sc.lb, color:isDark ? sc.dc : sc.lc }}>
          {conn.connection_status}
        </span>
      </div>

      {/* Details grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px' }}>
        {[
          { label:'Type',          val: conn.connection_type   },
          { label:'Payment',       val: conn.payment_type      },
          { label:'Since',         val: conn.connection_date ? new Date(conn.connection_date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—' },
          { label:'This Month',    val: `${parseFloat(conn.units_used||0).toFixed(1)} ${conn.unit_of_measurement}` },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:13, fontWeight:500, color:t.text }}>{item.val || '—'}</div>
          </div>
        ))}
      </div>

      {/* Address footer */}
      <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:7 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, color:t.textMuted }}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 019.5 9 2.5 2.5 0 0112 6.5 2.5 2.5 0 0114.5 9 2.5 2.5 0 0112 11.5z" fill="currentColor"/>
        </svg>
        <span style={{ fontSize:12, color:t.textSub }}>
          {conn.house_num}, {conn.street_name}, {conn.region_name}
        </span>
      </div>

      <div style={{ marginTop:14, display:'flex', justifyContent:'flex-end' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{
            border:'none',
            borderRadius:8,
            padding:'7px 10px',
            cursor:'pointer',
            fontSize:12,
            fontWeight:600,
            fontFamily:fonts.ui,
            background:'rgba(204,255,0,0.08)',
            color:t.primary,
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Connected', 'Active', 'Suspended', 'Disconnected', 'Pending'];

const MyConnections = () => {
  const { authFetch }  = useAuth();
  const { isDark }     = useTheme();
  const navigate       = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [connections, setConnections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('All');

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/consumer/connections');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnections(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const filtered = filter === 'All' ? connections : connections.filter(c => (c.connection_status || '').toLowerCase() === filter.toLowerCase());

  const statCards = [
    { label:'Total',       val: connections.length,                                                                                         grad:'linear-gradient(135deg,#3B6FFF,#00C4FF)', glow:'rgba(59,111,255,0.25)'  },
    { label:'Active',      val: connections.filter(c => ['active','connected'].includes((c.connection_status || '').toLowerCase())).length, grad:'linear-gradient(135deg,#22C55E,#16A34A)', glow:'rgba(34,197,94,0.25)'   },
    { label:'Suspended',   val: connections.filter(c => (c.connection_status || '').toLowerCase() === 'suspended').length,                  grad:'linear-gradient(135deg,#F5A623,#FF6B00)', glow:'rgba(245,166,35,0.25)'  },
    { label:'Disconnected',val: connections.filter(c => (c.connection_status || '').toLowerCase() === 'disconnected').length,               grad:'linear-gradient(135deg,#EF4444,#B91C1C)', glow:'rgba(239,68,68,0.25)'   },
  ];

  return (
    <div style={{ fontFamily:fonts.ui }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:24 }}>
        <div>
          <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Utilities</div>
          <h1 style={{ fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>My Connections</h1>
          <p style={{ fontSize:14, color:t.textSub }}>All your utility connections and their current status</p>
        </div>
        <button
          onClick={() => navigate('/consumer/applications')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:12, border:'none', background:'#CCFF00', color:'#0E0E0E', fontSize:14, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer', boxShadow:'0 4px 16px rgba(204,255,0,0.25)', whiteSpace:'nowrap' }}
        >
          <Plus size={16} /> New Connection
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:22 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-16, right:-16, width:60, height:60, borderRadius:'50%', background:card.grad, opacity:0.12, filter:'blur(12px)' }} />
            <div style={{ fontSize:26, fontWeight:700, color:t.text, letterSpacing:'-0.4px', marginBottom:2 }}>{card.val}</div>
            <div style={{ fontSize:12, color:t.textSub }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'7px 16px', borderRadius:100, border:`1.5px solid ${filter===f ? t.primary : t.border}`, background:filter===f ? 'rgba(204,255,0,0.08)' : 'transparent', color:filter===f ? t.primary : t.textSub, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
            {f}
            {f !== 'All' && <span style={{ marginLeft:5, fontSize:11, opacity:0.7 }}>{connections.filter(c => (c.connection_status || '').toLowerCase() === f.toLowerCase()).length}</span>}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:240, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', color:t.textMuted }}>
          <div style={{ width:64, height:64, borderRadius:18, background:isDark?'#0D1525':'#F1F5FF', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <ConnectionIcon size={28} color={t.textMuted} />
          </div>
          <div style={{ fontSize:15, fontWeight:500, color:t.textSub, marginBottom:6 }}>
            {filter === 'All' ? 'No connections yet' : `No ${filter.toLowerCase()} connections`}
          </div>
          <div style={{ fontSize:13, marginBottom:20 }}>
            {filter === 'All' ? 'Apply for a new utility connection to get started' : 'Try a different filter'}
          </div>
          {filter === 'All' && (
            <button onClick={() => navigate('/consumer/applications')}
              style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'#CCFF00', color:'#0E0E0E', fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer', boxShadow:'0 4px 14px rgba(204,255,0,0.25)' }}>
              Apply for Connection
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
          {filtered.map(conn => (
            <ConnectionCard
              key={conn.connection_id}
              conn={conn}
              t={t}
              isDark={isDark}
              onOpen={() => navigate(`/consumer/connections/${conn.connection_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyConnections;