import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Zap, Droplet, Flame, TrendingUp, TrendingDown } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const UTILITY_CONFIG = {
  electricity: { label: 'Electricity', color: '#CCFF00', Icon: Zap },
  water:       { label: 'Water',       color: '#00D4FF', Icon: Droplet },
  gas:         { label: 'Gas',         color: '#FF9900', Icon: Flame },
};

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Data helpers ──────────────────────────────────────────────────────────────
/** Group raw usage rows into { 'YYYY-MM': { total, label } } sorted ascending */
const groupByMonth = (rows) => {
  const map = {};
  rows.forEach(r => {
    const d = new Date(r.time_to);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { key, label: MONTH_ABBR[d.getMonth()], total: 0, cost: 0 };
    map[key].total += parseFloat(r.units_logged || 0);
    map[key].cost  += parseFloat(r.cost || 0);
  });
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
};

const calculateUtilityBreakdown = (data) => {
  const totals = { electricity: 0, water: 0, gas: 0 };
  data.forEach(r => {
    const tag = r.utility_tag;
    if (totals[tag] !== undefined) totals[tag] += parseFloat(r.units_logged || 0);
  });
  return Object.entries(UTILITY_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: Math.round(totals[key] * 10) / 10,
    color: cfg.color,
  })).filter(d => d.value > 0);
};

const prepareComparisonData = (data, selectedUtility, period) => {
  const filtered = data.filter(r => r.utility_tag === selectedUtility);
  const months = groupByMonth(filtered);
  const current  = months.slice(-period);
  const previous = months.slice(-period * 2, -period);
  const len = Math.max(current.length, previous.length);
  return Array.from({ length: len }, (_, i) => ({
    month:    (current[i]  || previous[i] || {}).label || '',
    current:  current[i]  ? Math.round(current[i].total  * 10) / 10 : null,
    previous: previous[i] ? Math.round(previous[i].total * 10) / 10 : null,
  }));
};

const prepareMonthlyData = (data, selectedUtility, period) => {
  const filtered = data.filter(r => r.utility_tag === selectedUtility);
  const months = groupByMonth(filtered);
  return months.slice(-period).map(m => ({
    month: m.label,
    value: Math.round(m.total * 10) / 10,
    cost:  Math.round(m.cost  * 10) / 10,
  }));
};

const calcTrend = (compData) => {
  const cur  = compData.reduce((s, d) => s + (d.current  || 0), 0);
  const prev = compData.reduce((s, d) => s + (d.previous || 0), 0);
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
};

// ── Sub-components ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div style={{
      backgroundColor: '#111111',
      border: '0.5px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
      minWidth: '120px',
    }}>
      <p style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        color: 'rgba(232, 232, 232, 0.65)',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}>
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: index < payload.length - 1 ? '6px' : '0'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: entry.color,
          }} />
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '13px',
            color: '#E8E8E8',
          }}>
            {entry.name}: <strong>{entry.value.toFixed(2)}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

const PeriodToggle = ({ period, setPeriod }) => (
  <div className="flex gap-2">
    {[3, 6, 12].map(p => (
      <button
        key={p}
        onClick={() => setPeriod(p)}
        className={`px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.08em] transition-all border-0.5 ${
          period === p
            ? 'bg-elec/10 border-elec/40 text-elec'
            : 'bg-transparent border-white/[0.07] text-muted hover:text-sub'
        }`}
      >
        {p}M
      </button>
    ))}
  </div>
);

const ChartCard = ({ accentColor, title, right, children }) => (
  <div className="relative z-10 bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
    <div className="h-[1.5px] rounded-t-2xl" style={{ background: accentColor + '73' }} />
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  </div>
);

const UtilityTab = ({ utilKey, active, onClick }) => {
  const { label, color, Icon } = UTILITY_CONFIG[utilKey];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-all ${
        active
          ? 'border-white/20 text-txt'
          : 'border-white/[0.07] text-muted hover:text-sub'
      }`}
      style={active ? { background: color + '18', borderColor: color + '66' } : {}}
    >
      <Icon size={12} style={{ color: active ? color : undefined }} />
      {label}
    </button>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-64 bg-card border-0.5 border-white/[0.07] rounded-2xl animate-pulse" />
    ))}
  </div>
);

// ── DonutChart ────────────────────────────────────────────────────────────────
const DonutChart = ({ data, accentColor }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  const hovered = activeIndex !== null ? data[activeIndex] : null;
  const centerValue = hovered
    ? `${((hovered.value / total) * 100).toFixed(1)}%`
    : Math.round(total).toLocaleString();
  const centerLabel = hovered ? hovered.name : 'total';
  const centerColor = hovered ? hovered.color : '#E8E8E8';

  return (
    <ChartCard accentColor={accentColor} title="Utility Breakdown">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sub font-mono text-[10px]">No data available</div>
      ) : (
        <div className="flex items-center gap-8">
          <div style={{ width: 200, height: 200, flexShrink: 0 }}>
            <PieChart width={200} height={200}>
              <Pie
                data={data}
                cx={100} cy={100}
                innerRadius={60} outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === i ? 1 : 0.3}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                  />
                ))}
              </Pie>
              <text x={100} y={100} textAnchor="middle" dominantBaseline="central">
                <tspan
                  x={100} dy="-6"
                  style={{ fontFamily: 'Outfit', fontSize: hovered ? 20 : 18, fill: centerColor, fontWeight: 600, transition: 'all 0.2s' }}
                >
                  {centerValue}
                </tspan>
                <tspan
                  x={100} dy="18"
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, fill: 'rgba(232,232,232,0.45)', textTransform: 'uppercase' }}
                >
                  {centerLabel}
                </tspan>
              </text>
            </PieChart>
          </div>
          <div className="flex flex-col gap-3">
            {data.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 transition-opacity duration-200"
                style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.4 }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-sub">{entry.name}</p>
                  <p className="font-outfit text-sm text-txt font-semibold">{entry.value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
};

// ── ComparisonLineChart ───────────────────────────────────────────────────────
const ComparisonLineChart = ({ data, period, setPeriod, color }) => {
  const trend = calcTrend(data);
  return (
    <ChartCard
      accentColor={color}
      title="Period Comparison"
      right={
        <div className="flex items-center gap-3">
          {trend !== null && (
            <span className={`flex items-center gap-1 font-mono text-[10px] ${trend < 0 ? 'text-status-active' : 'text-status-warning'}`}>
              {trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          <PeriodToggle period={period} setPeriod={setPeriod} />
        </div>
      }
    >
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-sub font-mono text-[10px]">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <YAxis stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
  type="monotone"
  dataKey="previous"
  stroke="rgba(232,232,232,0.25)"
  strokeWidth={1.5}
  strokeDasharray="5 5"
  dot={false}
  activeDot={{
    r: 4,
    fill: 'rgba(232,232,232,0.5)',
  }}
  animationDuration={600}
  animationEasing="ease-out"
  connectNulls={true}
/>
            <Line
  type="monotone"
  dataKey="current"
  stroke={color}
  strokeWidth={2.5}
  dot={false}
  activeDot={{
    r: 6,
    fill: color,
    stroke: '#111',
    strokeWidth: 2,
  }}
  animationDuration={600}
  animationEasing="ease-out"
  connectNulls={true}
/>
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

// ── MonthlyBarChart ───────────────────────────────────────────────────────────
const MonthlyBarChart = ({ data, period, setPeriod, color, unit }) => (
  <ChartCard
    accentColor={color}
    title="Monthly Breakdown"
    right={<PeriodToggle period={period} setPeriod={setPeriod} />}
  >
    {data.length === 0 ? (
      <div className="flex items-center justify-center h-[280px] text-sub font-mono text-[10px]">No data available</div>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="month" stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(232,232,232,0.45)" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} unit={unit ? ` ${unit}` : ''} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar
            name={`Usage (${unit || 'units'})`}
            dataKey="value"
            fill={color}
            activeBar={{ fill: color, fillOpacity: 0.75, radius: [4, 4, 0, 0] }}
            radius={[4, 4, 0, 0]}
            animationDuration={500}
            animationEasing="ease-out"
            animationBegin={0}
          />
        </BarChart>
      </ResponsiveContainer>
    )}
  </ChartCard>
);

// ── Main component ────────────────────────────────────────────────────────────
const UsageHistory = () => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [selectedUtility, setSelectedUtility] = useState('electricity');
  const [period, setPeriod] = useState(6);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);
        const res  = await authFetch('/api/consumer/usage?granularity=month');
        const data = await res.json();
        setUsageData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch usage data:', err);
        setUsageData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchUsageData();
  }, []);

  if (loading) return <LoadingSkeleton />;

  const activeColor = UTILITY_CONFIG[selectedUtility].color;
  const activeUnit  = usageData.find(r => r.utility_tag === selectedUtility)?.unit_of_measurement || '';

  const breakdownData  = calculateUtilityBreakdown(usageData);
  const comparisonData = prepareComparisonData(usageData, selectedUtility, period);
  const monthlyData    = prepareMonthlyData(usageData, selectedUtility, period);

  return (
    <div className="space-y-6">
      {/* Grain texture */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-outfit text-2xl font-semibold text-txt mb-2">Usage History</h2>
          <p className="font-outfit text-sm text-sub">Track your consumption patterns</p>
        </div>

        {/* Utility tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.keys(UTILITY_CONFIG).map(key => (
            <UtilityTab
              key={key}
              utilKey={key}
              active={selectedUtility === key}
              onClick={() => setSelectedUtility(key)}
            />
          ))}
        </div>

        <div className="space-y-6">
          <DonutChart data={breakdownData} accentColor={activeColor} />
          <ComparisonLineChart data={comparisonData} period={period} setPeriod={setPeriod} color={activeColor} />
          <MonthlyBarChart data={monthlyData} period={period} setPeriod={setPeriod} color={activeColor} unit={activeUnit} />
        </div>
      </div>
    </div>
  );
};

export default UsageHistory;
