import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const ELEC  = '#CCFF00';
const WATER = '#00D4FF';
const GAS   = '#FF9900';

const TABS = ['revenue', 'productivity', 'regions'];
const TAB_LABELS = { revenue: 'Revenue', productivity: 'Productivity', regions: 'Regions' };

// ─── Mock data ────────────────────────────────────────────────────────────────
const revenueData = {
  monthly: [
    { period: 'Jan', electricity: 450000, water: 320000, gas: 180000 },
    { period: 'Feb', electricity: 480000, water: 340000, gas: 195000 },
    { period: 'Mar', electricity: 520000, water: 360000, gas: 210000 },
    { period: 'Apr', electricity: 505000, water: 375000, gas: 202000 },
    { period: 'May', electricity: 545000, water: 390000, gas: 225000 },
    { period: 'Jun', electricity: 590000, water: 410000, gas: 235000 },
  ],
  quarterly: [
    { period: 'Q1 24', electricity: 1450000, water: 1020000, gas: 585000 },
    { period: 'Q2 24', electricity: 1640000, water: 1175000, gas: 662000 },
    { period: 'Q3 24', electricity: 1780000, water: 1260000, gas: 715000 },
    { period: 'Q4 24', electricity: 1950000, water: 1390000, gas: 790000 },
  ],
  yearly: [
    { period: '2022', electricity: 4200000, water: 3100000, gas: 1800000 },
    { period: '2023', electricity: 5100000, water: 3800000, gas: 2200000 },
    { period: '2024', electricity: 6820000, water: 4845000, gas: 2752000 },
  ],
  breakdown: [
    { name: 'Electricity', value: 55, color: ELEC },
    { name: 'Water',       value: 30, color: WATER },
    { name: 'Gas',         value: 15, color: GAS },
  ],
  losses: {
    unpaid_total: 125000,
    trend: 'increasing',
    trend_pct: 8.3,
    top_regions: [
      { name: 'Motijheel', rate: 12.5 },
      { name: 'Gulshan',   rate: 8.3 },
      { name: 'Dhanmondi', rate: 6.7 },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1000000 ? `৳${(n / 1000000).toFixed(2)}M`
  : n >= 1000  ? `৳${(n / 1000).toFixed(0)}K`
  : `৳${n}`;

// ─── Dark Tooltip ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border-0.5 border-white/[0.07] rounded-xl p-3 shadow-2xl">
      <p className="font-mono text-[9px] text-muted uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="font-mono text-[10px] text-sub">{p.name}:</span>
          <span className="font-barlow font-bold text-sm" style={{ color: p.color }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, sub, accentColor, trend }) => (
  <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-5 flex flex-col gap-3">
    <div className="h-[1.5px] w-full rounded-full" style={{ background: `linear-gradient(90deg, ${accentColor}60, transparent)` }} />
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="font-barlow text-3xl font-bold text-txt leading-none">{value}</span>
        {sub && <span className="font-mono text-[10px] text-sub">{sub}</span>}
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
        <Icon size={18} style={{ color: accentColor }} />
      </div>
    </div>
    {trend && (
      <div className="flex items-center gap-1.5">
        {trend.dir === 'up'
          ? <TrendingUp size={13} className="text-status-error" />
          : <TrendingDown size={13} className="text-status-active" />
        }
        <span className="font-mono text-[10px]" style={{ color: trend.dir === 'up' ? '#FF5757' : '#44ff99' }}>
          {trend.pct}% vs last period
        </span>
      </div>
    )}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const RevenueAnalytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('monthly');
  const [donutActive, setDonutActive] = useState(null);

  const chartData = revenueData[period];
  const totals = chartData.reduce(
    (acc, d) => ({ electricity: acc.electricity + d.electricity, water: acc.water + d.water, gas: acc.gas + d.gas }),
    { electricity: 0, water: 0, gas: 0 }
  );
  const grandTotal = totals.electricity + totals.water + totals.gas;

  return (
    <div className="relative">
      {/* Grain */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: grain }} />

      <div className="relative z-10 space-y-6">

        {/* Header + sub-tabs */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">Employee Portal</div>
            <h1 className="font-outfit text-2xl font-semibold text-txt tracking-tight">Revenue Analytics</h1>
            <p className="font-outfit text-sm text-sub mt-1">Financial performance across all utility types</p>
          </div>
          <div className="flex gap-1 bg-card border-0.5 border-white/[0.07] rounded-xl p-1 w-fit">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => navigate(`/employee/analytics/${tab}`)}
                className={`px-4 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                  tab === 'revenue'
                    ? 'bg-white/[0.08] text-txt'
                    : 'text-muted hover:text-sub'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={DollarSign} label="Total Revenue" value={fmt(grandTotal)} sub="all utilities" accentColor="#E8E8E8" trend={{ dir: 'down', pct: 4.2 }} />
          <MetricCard icon={TrendingUp} label="Electricity" value={fmt(totals.electricity)} sub="this period" accentColor={ELEC} trend={{ dir: 'up', pct: 6.1 }} />
          <MetricCard icon={TrendingUp} label="Water" value={fmt(totals.water)} sub="this period" accentColor={WATER} trend={{ dir: 'down', pct: 2.8 }} />
          <MetricCard icon={TrendingUp} label="Gas" value={fmt(totals.gas)} sub="this period" accentColor={GAS} trend={{ dir: 'up', pct: 3.4 }} />
        </div>

        {/* Chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Revenue trend */}
          <div className="lg:col-span-2 bg-card border-0.5 border-white/[0.07] rounded-2xl p-5">
            <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-1">Revenue Trends</div>
                <div className="font-outfit text-base font-semibold text-txt">By Utility Type</div>
              </div>
              <div className="flex gap-1 bg-bg border-0.5 border-white/[0.05] rounded-lg p-0.5">
                {['monthly', 'quarterly', 'yearly'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-md font-mono text-[9px] uppercase tracking-wider transition-all ${
                      period === p ? 'bg-white/[0.08] text-txt' : 'text-muted hover:text-sub'
                    }`}
                  >
                    {p === 'monthly' ? 'Mo' : p === 'quarterly' ? 'Qtr' : 'Yr'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 35 }}>
                <defs>
                  {[['elec', ELEC], ['water', WATER], ['gas', GAS]].map(([id, color]) => (
                    <linearGradient key={id} id={`rev-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 5" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="electricity" name="Electricity" stroke={ELEC}  strokeWidth={2} fill="url(#rev-elec)"  dot={false} activeDot={{ r: 5, fill: ELEC,  stroke: '#111', strokeWidth: 1.5 }} />
                <Area type="monotone" dataKey="water"       name="Water"       stroke={WATER} strokeWidth={2} fill="url(#rev-water)" dot={false} activeDot={{ r: 5, fill: WATER, stroke: '#111', strokeWidth: 1.5 }} />
                <Area type="monotone" dataKey="gas"         name="Gas"         stroke={GAS}   strokeWidth={2} fill="url(#rev-gas)"   dot={false} activeDot={{ r: 5, fill: GAS,   stroke: '#111', strokeWidth: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex gap-5 justify-center mt-3">
              {[['Electricity', ELEC], ['Water', WATER], ['Gas', GAS]].map(([name, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-5 h-0.5 rounded" style={{ background: color }} />
                  <span className="font-mono text-[10px] text-sub">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown donut */}
          <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-5 flex flex-col">
            <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-5" />
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-1">Revenue Breakdown</div>
            <div className="font-outfit text-base font-semibold text-txt mb-5">By Utility</div>

            <div className="flex flex-col items-center gap-6 flex-1 justify-center">
              <div style={{ position: 'relative', width: 160, height: 160 }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={revenueData.breakdown}
                    cx={80} cy={80}
                    innerRadius={50} outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                    onMouseEnter={(_, i) => setDonutActive(i)}
                    onMouseLeave={() => setDonutActive(null)}
                  >
                    {revenueData.breakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={donutActive === null || donutActive === i ? 1 : 0.35} style={{ cursor: 'pointer', outline: 'none' }} />
                    ))}
                  </Pie>
                </PieChart>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  {donutActive !== null ? (
                    <>
                      <span className="font-barlow text-2xl font-bold" style={{ color: revenueData.breakdown[donutActive].color }}>
                        {revenueData.breakdown[donutActive].value}%
                      </span>
                      <span className="font-mono text-[9px] text-muted mt-1">{revenueData.breakdown[donutActive].name}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-barlow text-2xl font-bold text-txt">100%</span>
                      <span className="font-mono text-[9px] text-muted mt-1">Total</span>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full space-y-2.5">
                {revenueData.breakdown.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: seg.color }} />
                    <span className="font-outfit text-xs text-sub flex-1">{seg.name}</span>
                    <span className="font-barlow text-sm font-bold text-txt">{seg.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loss Analysis */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-5">
          <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-5" />
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={14} className="text-status-error" />
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">Loss Analysis</div>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <span className="font-barlow text-4xl font-bold text-txt leading-none">{fmt(revenueData.losses.unpaid_total)}</span>
                <div className="flex items-center gap-1 pb-1">
                  <TrendingUp size={12} className="text-status-error" />
                  <span className="font-mono text-[10px] text-status-error">+{revenueData.losses.trend_pct}%</span>
                </div>
              </div>
              <span className="font-outfit text-sm text-sub">Unpaid bills total · trend is {revenueData.losses.trend}</span>
            </div>

            <div className="sm:w-64">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-3">Top Regions by Default Rate</div>
              <div className="space-y-2">
                {revenueData.losses.top_regions.map((region, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted w-4">{i + 1}.</span>
                    <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-status-error" style={{ width: `${(region.rate / 15) * 100}%`, opacity: 0.7 }} />
                    </div>
                    <span className="font-outfit text-xs text-sub w-20">{region.name}</span>
                    <span className="font-barlow text-sm font-bold text-status-error">{region.rate}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RevenueAnalytics;
