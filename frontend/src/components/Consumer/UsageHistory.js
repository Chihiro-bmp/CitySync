import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon } from '../../Icons';
import { BarChart, LineChart, DonutChart, ChartLegend, CountUp } from '../Charts';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };
// const PERIODS   = ['3 months', '6 months', '12 months'];
const PERIODS = [3, 6, 12];
const PERIOD_LABELS = { 3: '3 months', 6: '6 months', 12: '12 months' };

// ── helpers ───────────────────────────────────────────────────────────────────
// const sortKey  = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; };
// const monthKey = (d) => new Date(d).toLocaleDateString('en-GB', { month:'short', year:'2-digit' });
// const dayKey   = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
// const dayLabel = (d) => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

// Transform backend usage rows into chart-friendly buckets.
// Works for both 'month' and 'day' granularity.
const transformUsageForChart = (granularity, readings) => {
  if (!readings || readings.length === 0) return [];
  if (granularity === 'day') {
    return readings.map(r => ({
      label: r.day_name || r.month_name || r.label,
      value: parseFloat(r.units_logged || 0),
      sk: r.day || r.month || (r.day_name && r.day_name) || r.label,
    }));
  }
  // month
  return readings.map(r => ({
    label: r.month_name || r.day_name || r.label,
    value: parseFloat(r.units_logged || 0),
    sk: r.month || r.day || r.label,
  }));
};

// Simple in-memory cache for month usage keyed by connection_id or 'all'
const MONTH_USAGE_CACHE = {};
// Simple per-connection cache for daily (drill) usage keyed by connection_id -> monthSk
const DRILL_USAGE_CACHE = {};
// Maximum number of past months to cache per connection (exclude current month)
const MAX_DRILL_CACHE_MONTHS = 3; // configurable



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

  const [activeTab,  setActiveTab]  = useState(null);
  // const [period,     setPeriod]     = useState('6 months');
  const [period,     setPeriod]     = useState(6);
  // Separate states to decouple bar (month) and line series
  const [monthUsage, setMonthUsage] = useState([]);
  const [allMonthUsage, setAllMonthUsage] = useState([]); // All data for pie chart
  const [lineUsage,  setLineUsage]  = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [barOffset,  setBarOffset]  = useState(0);   // for bar chart pagination
  const [drillMonth, setDrillMonth] = useState(null); // { sk, label } for daily drill-down
  const [showPrev,   setShowPrev]   = useState(false); // toggle previous period line in chart (default: unchecked)

  const normalizeUsage = (s = {}) => ({
    month: s.month || s.day,
    month_name: s.month_name || s.day_name,
    day: s.day,
    day_name: s.day_name,
    units_logged: s.units_logged,
    cost: s.cost,
    unit_of_measurement: s.unit_of_measurement,

    // preserve raw in case you need other fields later
    __raw: s,
  });

  // Fetch usage optionally scoped to a connection name. If `connection` is omitted,
  // fallback to the legacy endpoint that returns all usage records.
  // Reusable fetch function for both month/day granularity.
  // setTo: 'usage' (month UI), 'line' (line-only), 'both', or 'drill' (usage becomes day rows)
  const fetchUsageData = useCallback(async (granularity = 'month', monthSk = null, connection_id = '', setTo = 'usage') => {
    if (granularity === 'month') setLoading(true);
    try {
      let url = `/api/consumer/usage?granularity=${encodeURIComponent(granularity)}`;
      if (monthSk) url += `&month=${encodeURIComponent(monthSk)}`;
      if (connection_id) url += `&connection_id=${encodeURIComponent(connection_id)}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch usage');

      const normalized = data.map(normalizeUsage);
          // cache month granularity results for reuse
          if (granularity === 'month') {
            const key = connection_id || 'all';
            MONTH_USAGE_CACHE[key] = normalized;
          }
      if (setTo === 'usage') setMonthUsage(normalized);
      else if (setTo === 'line') setLineUsage(normalized);
      else if (setTo === 'both') { setMonthUsage(normalized); setLineUsage(normalized); }
      else if (setTo === 'drill') setMonthUsage(normalized);
      else if (setTo === 'all') setAllMonthUsage(normalized);

      return data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authFetch]);


  // Fetch available connections (tags/names). If the endpoint is missing or
  // returns nothing, fall back to the previous behaviour of fetching all usage.
  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/consumer/connections');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(c => ({ id: c.connection_id, name: c.connection_name, utility: c.utility_tag, unit: c.unit_of_measurement }));
          setConnections(mapped);
          setActiveTab(prev => prev ?? mapped[0].id);
          
          // Also fetch all usage for the pie chart
          fetchUsageData('month', null, '', 'all');
          return;
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch connections');
      }
    } catch (err) {
      console.error(err);
      await fetchUsageData('month', null, '', 'both');
    } finally {
      setLoading(false);
    }
  }, [authFetch, fetchUsageData]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  // When activeTab changes, fetch usage for that connection (if connections list exists)
  useEffect(() => {
    // If we have a connections list, always fetch per-connection usage when
    // the user switches tabs. This ensures fresh data on every selection.
    if (connections && connections.length > 0 && activeTab) {
      fetchUsageData('month', null, activeTab, 'both');
    }
  }, [activeTab, connections, fetchUsageData]);

  // Reset drill + offset when tab/period changes
  useEffect(() => { setDrillMonth(null); setBarOffset(0); }, [activeTab, period]);

  // ── Derived data ────────────────────────────────────────────────────────────
  // const monthCount = period === '3 months' ? 3 : period === '6 months' ? 6 : 12;
  const monthCount = period; // since we switched to numeric periods
  const filtered   = connections && connections.length > 0
    ? monthUsage // when fetching per-connection, `monthUsage` already scoped to activeTab
    : monthUsage.filter(u => u.connection_name === activeTab); // legacy: filter full dataset
  // Active tab name (used for display & theme matching). When using connections
  // API the `activeTab` state holds the id, so derive the name for UI.
  const activeName = (connections && connections.length > 0)
    ? (connections.find(c => c.id === activeTab)?.name || activeTab)
    : activeTab;
  const activeUtility = (connections && connections.length > 0)
    ? (connections.find(c => c.id === activeTab)?.utility || null)
    : null;
  const monthArr   = transformUsageForChart('month', filtered);

  // Bar chart pagination: slice a window of monthCount from the full array
  const maxOffset    = Math.max(0, monthArr.length - monthCount);
  const windowStart  = Math.max(0, monthArr.length - monthCount - barOffset);
  const windowEnd    = Math.max(monthCount, monthArr.length - barOffset);
  const visibleMonths = monthArr.slice(windowStart, windowEnd);
  const chartData    = visibleMonths.map(m => ({ label: m.label, value: Math.round(m.value) }));

  // Line chart always uses the LAST N months for comparison
  // Line chart uses its own independent series (`lineUsage`)
  const lineMonthArr = transformUsageForChart('month', lineUsage);
  const allMonths  = lineMonthArr.slice(-monthCount);
  const prevMonths = lineMonthArr.slice(-(monthCount * 2), -monthCount);

  // Daily drill-down data (when drilled, `usage` contains day rows)
  const drillData = drillMonth ? transformUsageForChart('day', monthUsage) : [];

  // Fuzzy-match utility tag to theme key
  const resolveUtil = (tag) => {
    if (!tag) return utilities.electricity;
    const key = Object.keys(utilities).find(k => tag.includes(k) || k.includes(tag)) || 'electricity';
    const base = utilities[key];

    // Mute colors for UsageHistory
    const muteGrad = (grad) => grad.replace(/([0-9A-Fa-f]{6})/g, (m) => {
      // Very simple way to "tone down": reduce brightness/saturation by shifting the color
      // But a better way is to just use fixed muted colors if we want precision.
      // Let's use a simpler mapping for "muted" version.
      return m; 
    });

    const mutedColors = {
      electricity: { grad: 'linear-gradient(135deg,#D69E2E,#B7791F)', glow: 'rgba(214,158,46,0.1)' }, // Muted Gold/Amber
      water:       { grad: 'linear-gradient(135deg,#5A67D8,#3C366B)', glow: 'rgba(90,103,216,0.1)' },  // Deep Indigo
      gas:         { grad: 'linear-gradient(135deg,#38A169,#276749)', glow: 'rgba(56,161,105,0.1)' }, // Muted Green
    };

    const muted = mutedColors[key] || { grad: base.gradient, glow: base.glow };

    return { ...base, gradient: muted.grad, glow: muted.glow };
  };
  const util = resolveUtil(activeUtility);
  const Icon = UtilIcons[activeUtility] || UtilIcons.electricity;

  const currentSeries = {
      label: `Current (${period})`,
      color: util.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF',
      points: allMonths.map(m => ({ label: m.label, value: Math.round(m.value) })),
    };

  const previousSeries = {
      label: `Previous (${period})`,
      color: isDark ? '#2A3550' : '#C4CADB',
      points: prevMonths.length
        ? prevMonths.map((m) => ({ label: m.label, value: Math.round(m.value) }))
        : allMonths.map(m => ({ label: m.label, value: 0 })),
    };

  const lineData = showPrev ? [currentSeries, previousSeries] : [currentSeries];

  // const lineData = [
  //   {
  //     label: `Current (${period})`,
  //     color: util.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF',
  //     points: allMonths.map(m => ({ label: m.label, value: Math.round(m.value) })),
  //   },
  //   {
  //     label: `Previous (${period})`,
  //     color: isDark ? '#2A3550' : '#C4CADB',
  //     points: prevMonths.length
  //       ? prevMonths.map((m) => ({ label: m.label, value: Math.round(m.value) }))
  //       : allMonths.map(m => ({ label: m.label, value: 0 })),
  //   },
  // ];

  const totalUnits  = filtered.reduce((s, u) => s + parseFloat(u.units_logged || 0), 0);
  const avgUnits    = filtered.length ? (totalUnits / filtered.length).toFixed(1) : 0;
  const unitLabel = (connections && connections.length > 0)
    ? connections.find(c => c.id === activeTab)?.unit
    : undefined;
  // const lastReading = filtered[0];
  // const unitLabel = connectionUnit ?? lastReading?.unit_of_measurement ?? 'units';

  const lastTwo = allMonths.slice(-2);
  const trend   = lastTwo.length === 2
    ? ((lastTwo[1].value - lastTwo[0].value) / (lastTwo[0].value || 1) * 100).toFixed(1)
    : null;

  // Pie chart calculation (all utilities distribution)
  const utilityTotals = allMonthUsage.reduce((acc, curr) => {
    const raw = curr.__raw;
    const uTag = raw.utility_tag || 'electricity';
    acc[uTag] = (acc[uTag] || 0) + parseFloat(curr.units_logged || 0);
    return acc;
  }, {});

  const pieSegments = Object.entries(utilityTotals).map(([tag, value]) => {
    const u = resolveUtil(tag);
    return {
      tag, // keep tag for selection logic
      label: u.label,
      value: Math.round(value),
      color: u.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF',
      pct: value / (Object.values(utilityTotals).reduce((a,b)=>a+b, 0) || 1)
    };
  }).sort((a,b) => b.value - a.value);

  const selectedSegment = pieSegments.find(s => s.tag === activeUtility) || pieSegments[0];

  const totalAllUnits = Object.values(utilityTotals).reduce((a,b)=>a+b, 0);

  // Shared nav button style
  const navBtn = (disabled) => ({
    padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`,
    background: disabled ? 'transparent' : (isDark ? t.bgHover : '#F0F4FF'),
    color: disabled ? t.textMuted : t.text,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize:14, lineHeight:1, transition:'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  });

  // Handle bar click (drill into daily data). Moved out of JSX for clarity.
  const handleBarClick = async (d, e) => {
    try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch (err) {}
    const m = visibleMonths.find(m => m.label === d.label);
    if (!m) return;
    const monthSk = m.sk; // expected YYYY-MM

    // determine current month SK to avoid caching current data
    const now = new Date();
    const currentSk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const isCurrentMonth = monthSk === currentSk;

    if (!isCurrentMonth) {
      const connCache = DRILL_USAGE_CACHE[activeTab] || {};
      const cached = connCache[monthSk];
      if (cached) {
        setMonthUsage(cached);
        setDrillMonth({ sk: monthSk, label: m.label });
        return;
      }
    }

    const resp = await fetchUsageData('day', monthSk, activeTab, 'drill');
    if (!resp) return;

    if (!isCurrentMonth) {
      DRILL_USAGE_CACHE[activeTab] = DRILL_USAGE_CACHE[activeTab] || {};
      DRILL_USAGE_CACHE[activeTab][monthSk] = resp.map(normalizeUsage);
      const keys = Object.keys(DRILL_USAGE_CACHE[activeTab]).sort();
      if (keys.length > MAX_DRILL_CACHE_MONTHS) {
        const removeCount = keys.length - MAX_DRILL_CACHE_MONTHS;
        for (let i = 0; i < removeCount; i++) {
          delete DRILL_USAGE_CACHE[activeTab][keys[i]];
        }
      }
    }

    setDrillMonth({ sk: monthSk, label: m.label });
  };

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
          {(connections && connections.length > 0 ? connections : []).map(tab => {
            const tabId = typeof tab === 'object' ? tab.id : tab;
            const tabName = typeof tab === 'object' ? tab.name : tab;
            const tabUtility = typeof tab === 'object' ? tab.utility : null;
            const u   = resolveUtil(tabUtility || tabName);
            const Ic  = UtilIcons[tabUtility || tabName] || UtilIcons.electricity;
            const active = tabId === activeTab;
            return (
              <button type="button" key={tabId} onClick={() => setActiveTab(tabId)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:12, border:`1.5px solid ${active ? 'transparent' : t.border}`, background: active ? u.gradient : (isDark ? t.bgCard : '#fff'), cursor:'pointer', transition:'all 0.2s', boxShadow: active ? `0 4px 14px ${u.glow}` : 'none' }}>
                <Ic size={15} color={active ? '#fff' : t.textSub} />
                <span style={{ fontSize:13, fontWeight:500, color: active ? '#fff' : t.textSub, textTransform:'capitalize' }}>{tabName}</span>
              </button>
            );
          })}
        </div>
        {connections && connections.length > 0 && (
          <div style={{ display:'flex', gap:6 }}>
            {PERIODS.map(p => (
              <button type="button" key={p} onClick={() => setPeriod(p)} style={{ padding:'6px 14px', borderRadius:100, border:`1.5px solid ${period === p ? t.primary : t.border}`, background: period === p ? 'rgba(204,255,0,0.08)' : 'transparent', color: period === p ? t.primary : t.textSub, fontSize:12, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:180, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : (
        <>
          {/* 1. Comparison Pie Chart */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:24, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:t.text }}>Utility Usage Mix</div>
                <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>Total consumption across all active services</div>
              </div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:fonts.display, color:t.text }}>
                {Math.round(totalAllUnits).toLocaleString()} Total Units
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:48, flexWrap:'wrap' }}>
              <DonutChart 
                segments={pieSegments} 
                size={190} 
                thickness={10} 
                label={Math.round(selectedSegment?.pct * 100 || 0) + '%'} 
                sublabel={selectedSegment?.label || 'Selected'} 
                t={t} 
              />
              <ChartLegend segments={pieSegments} t={t} />
            </div>
          </div>

          {/* 2. Stat Pills with CountUp */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:12, marginBottom:20 }}>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Total Usage</div>
              <div style={{ fontSize:22, fontWeight:600, color:t.text, letterSpacing:'-0.3px', fontFamily:fonts.ui }}>
                <CountUp target={Math.round(totalUnits)} />
              </div>
              <div style={{ fontSize:11, color:t.textSub, marginTop:3 }}>{unitLabel}</div>
            </div>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Avg / Read</div>
              <div style={{ fontSize:22, fontWeight:600, color:t.text, letterSpacing:'-0.3px', fontFamily:fonts.ui }}>
                <CountUp target={parseFloat(avgUnits)} decimals={1} />
              </div>
              <div style={{ fontSize:11, color:t.textSub, marginTop:3 }}>Units per reading</div>
            </div>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Readings</div>
              <div style={{ fontSize:22, fontWeight:600, color:t.text, letterSpacing:'-0.3px', fontFamily:fonts.ui }}>
                <CountUp target={filtered.length} />
              </div>
              <div style={{ fontSize:11, color:t.textSub, marginTop:3 }}>Total meter reads</div>
            </div>
            <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Monthly Trend</div>
              <div style={{ fontSize:22, fontWeight:600, color: trend !== null ? (parseFloat(trend) > 0 ? '#F87171' : '#4ADE80') : t.text, letterSpacing:'-0.3px', fontFamily:fonts.ui }}>
                {trend !== null && (trend > 0 ? '↑ ' : '↓ ')}
                <CountUp target={Math.abs(parseFloat(trend || 0))} decimals={1} />
                %
              </div>
              <div style={{ fontSize:11, color:t.textSub, marginTop:3 }}>vs previous month</div>
            </div>
          </div>

          {/* 3. Period comparison line chart */}
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
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
              <label style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:t.textSub, cursor:'pointer' }}>
                <input type="checkbox" checked={showPrev} onChange={e => setShowPrev(e.target.checked)} style={{ width:14, height:14 }} />
                <span>Show previous months</span>
              </label>
            </div>
          </div>

          {/* 4. Monthly breakdown bar chart */}
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
                {drillMonth && (
                  <button type="button" onClick={() => {
                    const cached = MONTH_USAGE_CACHE[activeTab] || MONTH_USAGE_CACHE['all'];
                    if (cached) {
                      setMonthUsage(cached);
                      setDrillMonth(null);
                    } else {
                      fetchUsageData('month', null, activeTab, 'usage').then(() => setDrillMonth(null));
                    }
                  }} style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${t.border}`, background: isDark ? t.bgHover : '#F0F4FF', color:t.primary, cursor:'pointer', fontSize:12, fontWeight:500 }}>
                    ← Back to months
                  </button>
                )}
                {!drillMonth && (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button type="button" disabled={barOffset >= maxOffset} onClick={() => setBarOffset(o => Math.min(o + monthCount, maxOffset))} style={navBtn(barOffset >= maxOffset)}>←</button>
                    <span style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, minWidth:80, textAlign:'center' }}>
                      {visibleMonths[0]?.label} – {visibleMonths[visibleMonths.length-1]?.label}
                    </span>
                    <button type="button" disabled={barOffset <= 0} onClick={() => setBarOffset(o => Math.max(0, o - monthCount))} style={navBtn(barOffset <= 0)}>→</button>
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 13px', borderRadius:100, background: isDark ? '#0A1020' : '#F8FAFF', border:`1px solid ${t.border}` }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:util.gradient }} />
                  <span style={{ fontSize:12, color:t.textSub, fontFamily:fonts.mono, textTransform:'capitalize' }}>{activeName}</span>
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
                onBarClick={(d, e) => handleBarClick(d, e)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UsageHistory;