import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon } from '../../Icons';
import { BarChart, LineChart } from '../Charts';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };
const PERIODS   = ['3 months', '6 months', '12 months'];

// ── helpers ───────────────────────────────────────────────────────────────────
const sortKey  = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; };
const monthKey = (d) => new Date(d).toLocaleDateString('en-GB', { month:'short', year:'2-digit' });
const dayKey   = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
const dayLabel = (d) => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

// Group readings into sorted monthly buckets
const groupByMonth = (readings) => {
  const map = {};
  readings.forEach(u => {
    const sk  = sortKey(u.time_to);
    const lbl = monthKey(u.time_to);
    if (!map[sk]) map[sk] = { label: lbl, value: 0, sk };
    map[sk].value += parseFloat(u.units_logged || 0);
  });
  return Object.values(map).sort((a, b) => a.sk.localeCompare(b.sk));
};

// Group readings into daily buckets for a specific YYYY-MM
const groupByDay = (readings, monthSk) => {
  const inMonth = readings.filter(u => sortKey(u.time_to) === monthSk);
  if (inMonth.length === 0) return [];

  // If we only have 1 reading for the whole month, distribute evenly across days
  const map = {};
  inMonth.forEach(u => {
    const from  = new Date(u.time_from);
    const to    = new Date(u.time_to);
    const days  = Math.max(1, Math.round((to - from) / 86400000));
    const daily = parseFloat(u.units_logged || 0) / days;
    for (let i = 0; i < days; i++) {
      const d  = new Date(from);
      d.setDate(d.getDate() + i);
      const sk = dayKey(d);
      if (!map[sk]) map[sk] = { label: dayLabel(d), value: 0, sk };
      map[sk].value += daily;
    }
  });
  return Object.values(map)
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(d => ({ ...d, value: parseFloat(d.value.toFixed(2)) }));
};

const StatPill = ({ label, value, sub, t }) => (
  <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:'16px 18px' }}>
    <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:600, color:t.text, letterSpacing:'-0.3px', fontFamily:fonts.ui }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:t.textSub, marginTop:3 }}>{sub}</div>}
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const UsageHistory = () => {
  const { authFetch } = useAuth();
  const { isDark }    = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [activeTab,  setActiveTab]  = useState('electricity');
  const [period,     setPeriod]     = useState('6 months');
  const [usage,      setUsage]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [barOffset,  setBarOffset]  = useState(0);   // for bar chart pagination
  const [drillMonth, setDrillMonth] = useState(null); // { sk, label } for daily drill-down

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/consumer/usage');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsage(data);
      if (Array.isArray(data) && data.length > 0) setActiveTab(data[0].utility_tag);
    } catch (err) { console.error(err); }
    finally      { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  // Reset drill + offset when tab/period changes
  useEffect(() => { setDrillMonth(null); setBarOffset(0); }, [activeTab, period]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const monthCount = period === '3 months' ? 3 : period === '6 months' ? 6 : 12;
  const filtered   = usage.filter(u => u.utility_tag === activeTab);
  const monthArr   = groupByMonth(filtered);

  // Bar chart pagination: slice a window of monthCount from the full array
  const maxOffset    = Math.max(0, monthArr.length - monthCount);
  const windowStart  = Math.max(0, monthArr.length - monthCount - barOffset);
  const windowEnd    = Math.max(monthCount, monthArr.length - barOffset);
  const visibleMonths = monthArr.slice(windowStart, windowEnd);
  const chartData    = visibleMonths.map(m => ({ label: m.label, value: Math.round(m.value) }));

  // Line chart always uses the LAST N months for comparison
  const allMonths  = monthArr.slice(-monthCount);
  const prevMonths = monthArr.slice(-(monthCount * 2), -monthCount);

  // Daily drill-down data
  const drillData = drillMonth ? groupByDay(filtered, drillMonth.sk) : [];

  // Fuzzy-match utility tag to theme key
  const resolveUtil = (tag) => {
    if (!tag) return utilities.electricity;
    if (utilities[tag]) return utilities[tag];
    const k = Object.keys(utilities).find(k => tag.includes(k) || k.includes(tag));
    return utilities[k] || utilities.electricity;
  };
  const util = resolveUtil(activeTab);
  const Icon = UtilIcons[activeTab] || UtilIcons.electricity;

  const lineData = [
    {
      label: `Current (${period})`,
      color: util.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF',
      points: allMonths.map(m => ({ label: m.label, value: Math.round(m.value) })),
    },
    {
      label: `Previous (${period})`,
      color: isDark ? '#2A3550' : '#C4CADB',
      points: prevMonths.length
        ? prevMonths.map((m, i) => ({ label: allMonths[i]?.label || m.label, value: Math.round(m.value) }))
        : allMonths.map(m => ({ label: m.label, value: 0 })),
    },
  ];

  const totalUnits  = filtered.reduce((s, u) => s + parseFloat(u.units_logged || 0), 0);
  const avgUnits    = filtered.length ? (totalUnits / filtered.length).toFixed(1) : 0;
  const lastReading = filtered[0];
  const unitLabel   = lastReading?.unit_of_measurement || 'units';

  const lastTwo = allMonths.slice(-2);
  const trend   = lastTwo.length === 2
    ? ((lastTwo[1].value - lastTwo[0].value) / (lastTwo[0].value || 1) * 100).toFixed(1)
    : null;

  // Shared nav button style
  const navBtn = (disabled) => ({
    padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`,
    background: disabled ? 'transparent' : (isDark ? t.bgHover : '#F0F4FF'),
    color: disabled ? t.textMuted : t.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize:14, lineHeight:1, transition:'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ fontFamily:fonts.ui }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Consumption</div>
        <h1 style={{ fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>Usage History</h1>
        <p style={{ fontSize:14, color:t.textSub }}>Monitor and compare your utility consumption over time</p>
      </div>

      {/* Tabs + period picker */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:22 }}>
        <div style={{ display:'flex', gap:10 }}>
          {[...new Set(usage.map(u => u.utility_tag))].map(tab => {
            const u   = resolveUtil(tab);
            const Ic  = UtilIcons[tab] || UtilIcons.electricity;
            const active = tab === activeTab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:12, border:`1.5px solid ${active ? 'transparent' : t.border}`, background: active ? u.gradient : (isDark ? t.bgCard : '#fff'), cursor:'pointer', transition:'all 0.2s', boxShadow: active ? `0 4px 14px ${u.glow}` : 'none' }}>
                <Ic size={15} color={active ? '#fff' : t.textSub} />
                <span style={{ fontSize:13, fontWeight:500, color: active ? '#fff' : t.textSub, textTransform:'capitalize' }}>{tab}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding:'6px 14px', borderRadius:100, border:`1.5px solid ${period === p ? t.primary : t.border}`, background: period === p ? (isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF') : 'transparent', color: period === p ? t.primary : t.textSub, fontSize:12, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:180, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : (
        <>
          {/* Stat pills */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12, marginBottom:20 }}>
            <StatPill label="Total Usage"   value={`${Math.round(totalUnits)}`}  sub={unitLabel}            t={t} />
            <StatPill label="Avg / Read"    value={`${avgUnits}`}                sub="Units per reading"    t={t} />
            <StatPill label="Readings"      value={filtered.length}              sub="Total meter reads"    t={t} />
            <StatPill label="Monthly Trend" value={trend !== null ? `${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}%` : '—'} sub="vs previous month" t={t} />
          </div>

          {/* Period comparison line chart */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:24, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Period Comparison</div>
                <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>Current {period} vs previous {period} — hover points for detail</div>
              </div>
              {trend !== null && (
                <div style={{ padding:'5px 14px', borderRadius:100, fontSize:13, fontWeight:600, background: parseFloat(trend) > 0 ? (isDark ? '#2D0C0C' : '#FEE2E2') : (isDark ? '#0D2E1A' : '#DCFCE7'), color: parseFloat(trend) > 0 ? (isDark ? '#F87171' : '#B91C1C') : (isDark ? '#4ADE80' : '#16A34A') }}>
                  {parseFloat(trend) > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
                </div>
              )}
            </div>
            <LineChart lines={lineData} t={t} isDark={isDark} unit={unitLabel} height={220} />
          </div>

          {/* Monthly breakdown bar chart */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:24, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Monthly Breakdown</div>
                <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>
                  {drillMonth
                    ? <>Showing daily distribution for <strong style={{ color:t.text }}>{drillMonth.label}</strong></>
                    : 'Click any bar to drill into daily usage'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {/* Drill-down back button */}
                {drillMonth && (
                  <button onClick={() => setDrillMonth(null)} style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`, background: isDark ? t.bgHover : '#F0F4FF', color:t.primary, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                    ← Back to months
                  </button>
                )}
                {/* Prev / Next navigation (only in month view) */}
                {!drillMonth && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button disabled={barOffset >= maxOffset} onClick={() => setBarOffset(o => Math.min(o + monthCount, maxOffset))} style={navBtn(barOffset >= maxOffset)}>←</button>
                    <span style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, minWidth:80, textAlign:'center' }}>
                      {visibleMonths[0]?.label} – {visibleMonths[visibleMonths.length-1]?.label}
                    </span>
                    <button disabled={barOffset <= 0} onClick={() => setBarOffset(o => Math.max(0, o - monthCount))} style={navBtn(barOffset <= 0)}>→</button>
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 13px', borderRadius:100, background: isDark ? '#0A1020' : '#F8FAFF', border:`1px solid ${t.border}` }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:util.gradient }} />
                  <span style={{ fontSize:12, color:t.textSub, fontFamily:fonts.mono, textTransform:'capitalize' }}>{activeTab}</span>
                </div>
              </div>
            </div>

            {drillMonth ? (
              drillData.length === 0
                ? <div style={{ textAlign:'center', padding:'48px 0', color:t.textMuted, fontSize:13 }}>No data for {drillMonth.label}</div>
                : <BarChart
                    data={drillData.map(d => ({ label: d.label, value: d.value }))}
                    gradient={util.gradient} glow={util.glow}
                    unit={unitLabel} t={t} isDark={isDark}
                  />
            ) : (
              <BarChart
                data={chartData}
                gradient={util.gradient} glow={util.glow}
                unit={unitLabel} t={t} isDark={isDark}
                activeBar={null}
                onBarClick={(d) => {
                  const m = visibleMonths.find(m => m.label === d.label);
                  if (m) setDrillMonth({ sk: m.sk, label: m.label });
                }}
              />
            )}
          </div>

          {/* Reading log table */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${util.glow}` }}>
                <Icon size={15} color="#fff" />
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:t.text }}>Meter Reading Log</div>
              <div style={{ marginLeft:'auto', fontSize:12, color:t.textMuted, fontFamily:fonts.mono }}>{filtered.length} records</div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background: isDark ? '#0D1525' : '#F8FAFF' }}>
                  {['Period', 'Units Logged', 'From', 'To'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 16px', color:t.textMuted, fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:`1px solid ${t.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign:'center', padding:'40px', color:t.textMuted, fontSize:13 }}>No readings for {activeTab}</td></tr>
                  : filtered.map((u, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${t.border}` }}>
                      <td style={{ padding:'12px 16px', color:t.textSub, fontFamily:fonts.mono, fontSize:12 }}>
                        {new Date(u.time_from).toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – {new Date(u.time_to).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ padding:'12px 16px', fontWeight:600, color:t.text }}>{Math.round(u.units_logged)} <span style={{ fontSize:11, color:t.textMuted, fontWeight:400 }}>{u.unit_of_measurement}</span></td>
                      <td style={{ padding:'12px 16px', color:t.textSub, fontFamily:fonts.mono, fontSize:12 }}>{new Date(u.time_from).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td>
                      <td style={{ padding:'12px 16px', color:t.textSub, fontFamily:fonts.mono, fontSize:12 }}>{new Date(u.time_to).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default UsageHistory;