import React, { useState, useRef, useEffect } from 'react';
import { fonts } from '../theme';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart as RechartsBar, Bar, Cell,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

// ─── DESIGN TOKENS (permanent dark) ──────────────────────────────────────────
const D = {
  bg:       '#151515',
  card:     '#151515',
  border:   'rgba(255,255,255,0.05)',
  borderHi: 'rgba(255,255,255,0.10)',
  grid:     'rgba(255,255,255,0.04)',
  track:    'rgba(255,255,255,0.06)',
  txt:      '#E8E8E8',
  sub:      'rgba(232,232,232,0.40)',
  muted:    'rgba(232,232,232,0.20)',
  tooltip:  'rgba(16,16,16,0.96)',
};

// Helper: extract hex colors from CSS gradient string
const extractGradientColors = (grad) => {
  const colors = grad?.match(/#[0-9A-Fa-f]{6}/g) || ['#CCFF00', '#CCFF00'];
  return { start: colors[0], end: colors[1] || colors[0] };
};

// ─── SHARED DARK TOOLTIP ──────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: D.tooltip,
      border: `0.5px solid ${D.border}`,
      borderRadius: 8,
      padding: '6px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
    }}>
      {label && (
        <div style={{ fontSize: 9, color: D.muted, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4, letterSpacing: '0.06em' }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
          <span style={{
            color: p.color,
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 14, fontWeight: 700,
          }}>
            {p.value} {unit}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── COUNT-UP ─────────────────────────────────────────────────────────────────
export const CountUp = ({ target, decimals = 0, duration = 1400, suffix = '', color, style = {} }) => {
  const [val, setVal] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(eased * target);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return (
    <span style={{ color, ...style }}>
      {val.toFixed(decimals)}{suffix}
    </span>
  );
};

// ─── ARC PROGRESS ─────────────────────────────────────────────────────────────
export const ArcProgress = ({
  current, previous, color, label, unit = '', size = 160, thickness = 10, animated = true, t,
}) => {
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const duration = 1200;

  const ratio   = previous > 0 ? Math.min(current / previous, 1.5) : (current > 0 ? 1 : 0);
  const pct     = Math.round((current / (previous || current || 1)) * 100);
  const delta   = previous > 0 ? pct - 100 : null;

  const sweep   = 240;
  const startDeg = 150;
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - thickness * 2 - 8) / 2;

  const degToRad = (d) => (d * Math.PI) / 180;
  const arcPoint = (deg) => ({
    x: cx + r * Math.cos(degToRad(deg)),
    y: cy + r * Math.sin(degToRad(deg)),
  });

  const arcPath = (sweepAngle) => {
    if (sweepAngle <= 0) return '';
    const clamp = Math.min(sweepAngle, 359.99);
    const s = arcPoint(startDeg);
    const e = arcPoint(startDeg + clamp);
    const large = clamp > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const trackPath = arcPath(sweep);

  const deltaColor = delta === null ? color
    : delta <= 0  ? '#44ff99'
    : delta <= 15 ? '#FF9900'
    : '#FF5757';

  useEffect(() => {
    if (!animated) { setProgress(ratio); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased * ratio);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [ratio, animated]);

  const fillAngle = progress * sweep;
  const fillPath  = arcPath(fillAngle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          <path d={trackPath} fill="none" stroke={D.track} strokeWidth={thickness} strokeLinecap="round" />
          {fillPath && (
            <path d={fillPath} fill="none" stroke={color} strokeWidth={thickness}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
          )}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingTop: 8,
        }}>
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: size * 0.22, fontWeight: 800,
            color: D.txt, lineHeight: 1, letterSpacing: '-0.5px',
          }}>
            <CountUp target={current} decimals={current % 1 !== 0 ? 1 : 0} duration={1200} color={D.txt} />
          </div>
          <div style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: size * 0.09, color: D.sub,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2,
          }}>{unit}</div>
          {delta !== null && (
            <div style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: size * 0.09, fontWeight: 500,
              color: deltaColor, marginTop: 4,
              letterSpacing: '0.04em',
            }}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}%
            </div>
          )}
        </div>
      </div>
      {label && (
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: D.muted, textAlign: 'center',
        }}>{label}</div>
      )}
    </div>
  );
};

// ─── DONUT CHART (recharts) ────────────────────────────────────────────────────
export const DonutChart = ({ segments, size = 180, thickness = 12, label, sublabel, animated = true, t }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const total = segments.reduce((s, g) => s + g.value, 0);

  if (total === 0) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.muted, fontSize: 13 }}>No data</div>
  );

  const outerR = size / 2 - 6;
  const innerR = outerR - thickness;
  const hov = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <PieChart width={size} height={size}>
        <Pie
          data={segments}
          cx={size / 2}
          cy={size / 2}
          innerRadius={innerR}
          outerRadius={outerR}
          dataKey="value"
          paddingAngle={2}
          strokeWidth={0}
          isAnimationActive={animated}
          animationBegin={0}
          animationDuration={900}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {segments.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color}
              opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
              style={{ cursor: 'pointer', outline: 'none' }}
            />
          ))}
        </Pie>
      </PieChart>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {hov ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: hov.color, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.3px', lineHeight: 1 }}>{hov.value}</div>
            <div style={{ fontSize: 10, color: D.sub, marginTop: 4, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', maxWidth: 80, letterSpacing: '0.06em' }}>{hov.label}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.5px', lineHeight: 1, color: D.txt }}>{label}</div>
            {sublabel && <div style={{ fontSize: 10, color: D.muted, marginTop: 4, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', letterSpacing: '0.08em' }}>{sublabel}</div>}
          </>
        )}
      </div>
    </div>
  );
};

// ─── LEGEND ───────────────────────────────────────────────────────────────────
export const ChartLegend = ({ segments }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
    {segments.map((s, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 12, color: D.sub, fontFamily: 'Outfit, sans-serif' }}>{s.label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: D.txt, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '-0.2px' }}>{s.value}</div>
        <div style={{ fontSize: 10, color: D.muted, fontFamily: 'IBM Plex Mono, monospace', width: 36, textAlign: 'right' }}>{s.pct ? `${Math.round(s.pct * 100)}%` : ''}</div>
      </div>
    ))}
  </div>
);

// ─── LINE CHART (recharts AreaChart) ─────────────────────────────────────────
export const LineChart = ({ lines, unit = 'units', height = 220, curved = false }) => {
  if (!lines || lines.length === 0 || lines[0].points.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px 0', color: D.muted, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>No data</div>;
  }

  const labels = lines[0].points.map(p => p.label);
  const chartData = labels.map((lbl, i) => {
    const obj = { label: lbl };
    lines.forEach(l => { obj[l.label] = l.points[i]?.value ?? 0; });
    return obj;
  });

  const TooltipContent = ({ active, payload, label }) => (
    <DarkTooltip active={active} payload={payload} label={label} unit={unit} />
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
          <defs>
            {lines.map((line, i) => (
              <linearGradient key={i} id={`lc-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={line.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={line.color} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 5" stroke={D.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: D.muted, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: D.muted, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<TooltipContent />} cursor={{ stroke: D.borderHi, strokeWidth: 1, strokeDasharray: '4 4' }} />
          {lines.map((line, i) => (
            <Area
              key={i}
              type={curved ? 'monotone' : 'linear'}
              dataKey={line.label}
              stroke={line.color}
              strokeWidth={2}
              fill={`url(#lc-grad-${i})`}
              dot={{ fill: line.color, stroke: D.bg, strokeWidth: 1.5, r: 3.5 }}
              activeDot={{ r: 6, fill: line.color, stroke: D.bg, strokeWidth: 1.5, style: { filter: `drop-shadow(0 0 6px ${line.color})` } }}
              isAnimationActive={true}
              animationDuration={900}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 2, borderRadius: 2, background: line.color }} />
            <span style={{ fontSize: 11, color: D.sub, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── BAR CHART (recharts) ─────────────────────────────────────────────────────
export const BarChart = ({ data, gradient, glow, unit, onBarClick, activeBar }) => {
  const [hovered, setHovered] = useState(null);
  const gradId = useRef(`bg-bar-${Math.random().toString(36).slice(2)}`).current;

  if (!data || data.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: D.muted, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>No usage data</div>
  );

  const chartData = data.map(d => ({ name: d.label, value: Number(d.value) || 0 }));
  const { start, end } = extractGradientColors(gradient);

  const TooltipContent = ({ active, payload, label: lbl }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{
        background: D.tooltip, border: `0.5px solid ${D.border}`,
        borderRadius: 8, padding: '5px 12px',
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
        color: D.txt, whiteSpace: 'nowrap',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'none',
      }}>
        <span style={{ color: start, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>
          {payload[0].value}
        </span>
        {' '}{unit}{onBarClick ? ' · click to drill in' : ''}
      </div>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={228}>
        <RechartsBar
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 20, left: 38 }}
          barCategoryGap="20%"
          onClick={(barData) => onBarClick && onBarClick({ label: barData.name, value: barData.value })}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={start} stopOpacity="0.9" />
              <stop offset="100%" stopColor={end}   stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 5" stroke={D.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: D.muted, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: D.muted, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            content={<TooltipContent />}
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={700}
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            {chartData.map((entry, i) => {
              const isLit = hovered === i || activeBar === entry.name;
              return (
                <Cell
                  key={i}
                  fill={isLit ? `url(#${gradId})` : D.track}
                  style={{
                    filter: isLit && glow ? `drop-shadow(0 0 8px ${glow})` : 'none',
                    cursor: onBarClick ? 'pointer' : 'default',
                    transition: 'filter 0.2s',
                    outline: activeBar === entry.name ? `1.5px solid ${start}` : 'none',
                  }}
                />
              );
            })}
          </Bar>
        </RechartsBar>
      </ResponsiveContainer>
    </div>
  );
};
