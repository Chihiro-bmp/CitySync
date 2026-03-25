import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, statusColors, utilities } from '../../theme';
import { ConnectionIcon, ElectricityIcon, WaterIcon, GasIcon } from '../../Icons';
import NewApplicationModal from './NewApplicationModal';

// ── Util icon map ─────────────────────────────────────────────────────────────
const UTIL_ICONS = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Pending', 'Under Review', 'Approved', 'Connected'];
const stepIndex = (status) => {
  if (status === 'Pending')      return 0;
  if (status === 'Under Review') return 1;
  if (status === 'Approved')     return 2;
  if (status === 'Connected')    return 3;
  if (status === 'Rejected')     return -1;
  return 0;
};

const StatusTimeline = ({ status, t, isDark }) => {
  const current = stepIndex(status);
  const rejected = status === 'Rejected';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 14 }}>
      {STEPS.map((step, i) => {
        const done    = !rejected && i <= current;
        const active  = !rejected && i === current;
        const isLast  = i === STEPS.length - 1;

        return (
          <React.Fragment key={step}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: rejected && i === 0
                  ? '#EF4444'
                  : done
                    ? 'linear-gradient(135deg,#3B6FFF,#00C4FF)'
                    : (isDark ? '#1A2235' : '#E8ECF5'),
                border: `2px solid ${active ? '#3B6FFF' : done ? 'transparent' : (isDark ? '#2A3550' : '#C4CADB')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 0 3px rgba(59,111,255,0.2)' : 'none',
                transition: 'all 0.3s',
                flexShrink: 0,
              }}>
                {rejected && i === 0 ? (
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✕</span>
                ) : done ? (
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                ) : null}
              </div>
              <span style={{ fontSize: 10, color: done ? t.primary : t.textMuted, fontFamily: fonts.mono, whiteSpace: 'nowrap', fontWeight: done ? 600 : 400 }}>
                {rejected && i === 0 ? 'Rejected' : step}
              </span>
            </div>
            {!isLast && (
              <div style={{ flex: 1, height: 2, background: done && !rejected && i < current ? 'linear-gradient(90deg,#3B6FFF,#00C4FF)' : (isDark ? '#1A2235' : '#E8ECF5'), margin: '0 4px', marginBottom: 20, minWidth: 20, transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Application card ──────────────────────────────────────────────────────────
const AppCard = ({ app, t, isDark }) => {
  const utilKey = app.utility_type?.toLowerCase();
  const util    = utilities[utilKey] || utilities.electricity;
  const Icon    = UTIL_ICONS[utilKey]  || ConnectionIcon;
  const sc      = statusColors[app.status] || statusColors['Pending'];

  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
      padding: 20, transition: 'box-shadow 0.18s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${util.glow}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: util.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${util.glow}`, flexShrink: 0 }}>
            <Icon size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, textTransform: 'capitalize' }}>{app.utility_type} Connection</div>
            <div style={{ fontSize: 11, color: t.textSub, fontFamily: fonts.mono }}>{app.utility_name} · {new Date(app.application_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 100, background: isDark ? sc.db : sc.lb, color: isDark ? sc.dc : sc.lc }}>
            {app.status}
          </span>
          {app.priority !== 'Normal' && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: isDark ? '#2D1F07' : '#FEF9C3', color: isDark ? '#FBBF24' : '#B45309', fontFamily: fonts.mono }}>
              {app.priority}
            </span>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 0', borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, marginBottom: 12 }}>
        {[
          { label: 'Type',    val: app.requested_connection_type },
          { label: 'Address', val: (app.address + (app.region_name ? `, ${app.region_name}` : '')) },
          app.review_date   && { label: 'Reviewed',  val: new Date(app.review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
          app.approval_date && { label: 'Approved',  val: new Date(app.approval_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
          app.reviewed_by_name && { label: 'Reviewed By', val: app.reviewed_by_name },
        ].filter(Boolean).map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: t.textMuted, fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Progress timeline */}
      <StatusTimeline status={app.status} t={t} isDark={isDark} />
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Pending', 'Under Review', 'Approved', 'Connected', 'Rejected'];

const ConnectionApplications = () => {
  const { authFetch } = useAuth();
  const { isDark }    = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [success, setSuccess]     = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/consumer/applications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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

  const filtered = filter === 'All' ? apps : apps.filter(a => a.status === filter);

  const statCards = [
    { label: 'Total',        val: apps.length,                                         grad: 'linear-gradient(135deg,#3B6FFF,#00C4FF)', glow: 'rgba(59,111,255,0.25)' },
    { label: 'Pending',      val: apps.filter(a => a.status === 'Pending').length,      grad: 'linear-gradient(135deg,#F5A623,#FF6B00)', glow: 'rgba(245,166,35,0.25)' },
    { label: 'Approved',     val: apps.filter(a => a.status === 'Approved').length,     grad: 'linear-gradient(135deg,#22C55E,#16A34A)', glow: 'rgba(34,197,94,0.25)'  },
    { label: 'Connected',    val: apps.filter(a => a.status === 'Connected').length,    grad: 'linear-gradient(135deg,#7C5CFC,#3B6FFF)', glow: 'rgba(124,92,252,0.25)' },
  ];

  return (
    <div style={{ fontFamily: fonts.ui }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: t.primary, fontFamily: fonts.mono, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Connections</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, letterSpacing: '-0.4px', marginBottom: 4 }}>My Applications</h1>
          <p style={{ fontSize: 14, color: t.textSub }}>Apply for new utility connections and track your application status</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,111,255,0.3)', whiteSpace: 'nowrap' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Application
        </button>
      </div>

      {success && (
        <div style={{ padding: '13px 18px', borderRadius: 12, marginBottom: 20, background: isDark ? '#0D2E1A' : '#DCFCE7', border: `1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize: 13, fontWeight: 500 }}>
          ✓ Application submitted successfully! We'll review it shortly.
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 13, padding: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: card.grad, opacity: 0.12, filter: 'blur(12px)' }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.4px', marginBottom: 2 }}>{card.val}</div>
            <div style={{ fontSize: 12, color: t.textSub }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 16px', borderRadius: 100, border: `1.5px solid ${filter === f ? t.primary : t.border}`, background: filter === f ? (isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF') : 'transparent', color: filter === f ? t.primary : t.textSub, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
            {f}
            {f !== 'All' && <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.7 }}>{apps.filter(a => a.status === f).length}</span>}
          </button>
        ))}
      </div>

      {/* Application cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 220, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`, animation: 'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: t.textMuted }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: isDark ? '#0D1525' : '#F1F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ConnectionIcon size={28} color={t.textMuted} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>
            {filter === 'All' ? 'No applications yet' : `No ${filter.toLowerCase()} applications`}
          </div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>
            {filter === 'All' ? 'Submit your first connection application to get started' : 'Try a different filter'}
          </div>
          {filter === 'All' && (
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,111,255,0.3)' }}>
              Submit First Application
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {filtered.map(app => <AppCard key={app.application_id} app={app} t={t} isDark={isDark} />)}
        </div>
      )}

      {showModal && <NewApplicationModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} t={t} isDark={isDark} />}
    </div>
  );
};

export default ConnectionApplications;