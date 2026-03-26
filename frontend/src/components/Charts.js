import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fonts } from '../theme';

// ─── DESIGN TOKENS (permanent dark) ──────────────────────────────────────────
const D = {
  bg:       '#151515',
  card:     '#151515',
  border:   'rgba(255,255,255,0.05)',
  borderHi: 'rgba(255,255,255,0.10)',
  grid:     'rgba(255,255,255,0.02)',
  track:    'rgba(255,255,255,0.04)',
  txt:      '#E8E8E8',
  sub:      'rgba(232,232,232,0.40)',
  muted:    'rgba(232,232,232,0.20)',
  tooltip:  'rgba(16,16,16,0.94)',
};

// ─── COUNT-UP ─────────────────────────────────────────────────────────────────
// Animates a number from 0 to `target` on mount.
// Props: target (number), decimals (int=0), duration (ms=1400), suffix (string=''), color (css string)
export const CountUp = ({ target, decimals = 0, duration = 1400, suffix = '', color, style = {} }) => {
  const [val, setVal] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
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
// A thin single-arc gauge. Shows current value vs previous value as a % arc.
// Props:
//   current   — number (this period's value)
//   previous  — number (last period's value, used as 100% baseline)
//   color     — accent color string
//   label     — string shown below the arc
//   unit      — string (e.g. 'kWh', 'm³')
//   size      — px (default 160)
//   thickness — px (default 10)
//   animated  — bool (default true)
//   t         — theme tokens (optional, falls back to D)
export const ArcProgress = ({
  current, previous, color, label, unit = '', size = 160, thickness = 10, animated = true, t,
}) => {
  const [progress, setProgress] = useState(0);
  const raf = useRef(null);
  const duration = 1200;

  // Ratio: current vs previous. Cap at 150% visually.
  const ratio   = previous > 0 ? Math.min(current / previous, 1.5) : (current > 0 ? 1 : 0);
  const pct     = Math.round((current / (previous || current || 1)) * 100);
  const delta   = previous > 0 ? pct - 100 : null;

  // Arc geometry — 240° sweep (from 150° to 390°, i.e. bottom-left to bottom-right)
  const sweep   = 240;
  const startDeg = 150;
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - thickness * 2 - 8) / 2;
  const circum = 2 * Math.PI * r;

  const degToRad = (d) => (d * Math.PI) / 180;
  const arcPoint = (deg) => ({
    x: cx + r * Math.cos(degToRad(deg)),
    y: cy + r * Math.sin(degToRad(deg)),
  });

  // Build arc path from startDeg sweeping `sweepAngle` degrees
  const arcPath = (sweepAngle) => {
    if (sweepAngle <= 0) return '';
    const clamp = Math.min(sweepAngle, 359.99);
    const s = arcPoint(startDeg);
    const e = arcPoint(startDeg + clamp);
    const large = clamp > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  // Track path (full 240°)
  const trackPath = arcPath(sweep);

  // Delta color
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
          {/* Track */}
          <path d={trackPath} fill="none" stroke={D.track} strokeWidth={thickness}
            strokeLinecap="round" />
          {/* Fill */}
          {fillPath && (
            <path d={fillPath} fill="none" stroke={color} strokeWidth={thickness}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
          )}
        </svg>
        {/* Center text */}
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

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
export const DonutChart = ({ segments, size = 180, thickness = 12, label, sublabel, animated = true, t }) => {
  const [hovered, setHovered]   = useState(null);
  const [drawPct, setDrawPct]   = useState(animated ? 0 : 1);
  const raf = useRef(null);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      setDrawPct(1 - Math.pow(1 - p, 3));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [animated]);

  const GAP    = 3;
  const r      = (size - thickness) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const circum = 2 * Math.PI * r;
  const total  = segments.reduce((s, g) => s + g.value, 0);

  if (total === 0) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.muted, fontSize: 13 }}>No data</div>
  );

  let offset = 0;
  const slices = segments.map((seg, i) => {
    const pct   = seg.value / total;
    const dash  = Math.max(0, pct * circum * drawPct - GAP);
    const gap   = circum - dash;
    const slice = { ...seg, dash, gap, offset: offset * drawPct, pct, index: i };
    offset += pct * circum;
    return slice;
  });

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={D.track} strokeWidth={thickness} />
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color}
            strokeWidth={hovered === i ? thickness + 2 : thickness}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            style={{
              transition: 'stroke-width 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
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

// ─── LINE CHART ───────────────────────────────────────────────────────────────
export const LineChart = ({ lines, unit = 'units', height = 220, curved = false }) => {
  const [hovered, setHovered] = useState(null);

  if (!lines || lines.length === 0 || lines[0].points.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px 0', color: D.muted, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>No data</div>;
  }

  const allVals = lines.flatMap(l => l.points.map(p => p.value));
  const maxVal  = Math.max(...allVals, 1);
  const labels  = lines[0].points.map(p => p.label);
  const W       = 600;
  const H       = height;
  const PAD     = { top: 24, right: 16, bottom: 32, left: 44 };
  const innerW  = W - PAD.left - PAD.right;
  const innerH  = H - PAD.top - PAD.bottom;

  const xPos = (i) => PAD.left + (i / (labels.length - 1 || 1)) * innerW;
  const yPos = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  const pathFor = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (!curved) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.value)}`).join(' ');
    return pts.map((p, i) => {
      if (i === 0) return `M ${xPos(i)} ${yPos(p.value)}`;
      const x1 = xPos(i - 0.5);
      return `C ${x1} ${yPos(pts[i - 1].value)}, ${x1} ${yPos(p.value)}, ${xPos(i)} ${yPos(p.value)}`;
    }).join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p));

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          {lines.map((line, li) => (
            <linearGradient key={li} id={`lcgrad-${li}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={line.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={line.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
              stroke={D.grid} strokeWidth={1} strokeDasharray="4 5" />
            <text x={PAD.left - 8} y={yPos(v) + 4} textAnchor="end"
              fontSize={10} fill={D.muted} fontFamily="IBM Plex Mono, monospace">{v}</text>
          </g>
        ))}

        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle"
            fontSize={10} fill={D.muted} fontFamily="IBM Plex Mono, monospace">{l}</text>
        ))}

        {/* Area + line + dots */}
        {lines.map((line, li) => {
          const pts = line.points;
          const areaPath = `${pathFor(pts)} L ${xPos(pts.length - 1)} ${yPos(0)} L ${xPos(0)} ${yPos(0)} Z`;
          return (
            <g key={li}>
              <path d={areaPath} fill={`url(#lcgrad-${li})`} />
              <path d={pathFor(pts)} fill="none" stroke={line.color}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 2px 5px ${line.color}44)` }} />
              {pts.map((p, pi) => {
                const isHov = hovered?.lineIdx === li && hovered?.pointIdx === pi;
                return (
                  <circle key={pi} cx={xPos(pi)} cy={yPos(p.value)}
                    r={isHov ? 6 : 3.5}
                    fill={line.color} stroke={D.bg} strokeWidth={1.5}
                    style={{ cursor: 'pointer', transition: 'r 0.15s', filter: isHov ? `drop-shadow(0 0 6px ${line.color})` : 'none' }}
                    onMouseEnter={() => setHovered({ lineIdx: li, pointIdx: pi })}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered && (() => {
          const line = lines[hovered.lineIdx];
          const pt   = line.points[hovered.pointIdx];
          const dotX = xPos(hovered.pointIdx);
          const dotY = yPos(pt.value);
          const bW = 84; const bH = 32; const gap = 10;
          const ty = dotY - gap - bH < PAD.top ? dotY + gap : dotY - gap - bH;
          const bx = Math.max(PAD.left, Math.min(dotX - bW / 2, W - PAD.right - bW));
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={bx} y={ty} width={bW} height={bH} rx={6}
                fill={D.tooltip} stroke={D.border} strokeWidth={0.5}
                style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.4))' }} />
              <text x={bx + bW / 2} y={ty + 13} textAnchor="middle"
                fontSize={10} fontWeight="700" fill={line.color} fontFamily="Barlow Condensed, sans-serif" letterSpacing="0.1">
                {pt.value} {unit}
              </text>
              <text x={bx + bW / 2} y={ty + 25} textAnchor="middle"
                fontSize={8} fill={D.muted} fontFamily="IBM Plex Mono, monospace">
                {line.label.split(' ')[0]} · {pt.label}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
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

// ─── BAR CHART ────────────────────────────────────────────────────────────────
export const BarChart = ({ data, gradient, glow, unit, onBarClick, activeBar }) => {
  const [hovered, setHovered]       = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const chartRef = useRef(null);

  if (!data || data.length === 0) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: D.muted, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>No usage data</div>
  );

  const buildTicks = (maxVal) => {
    const count = 5;
    const safe  = Math.max(Number(maxVal) || 0, 4);
    const step  = Math.max(1, Math.ceil(safe / (count - 1)));
    const top   = step * (count - 1);
    return Array.from({ length: count }, (_, i) => i * step);
  };

  const dataMax  = Math.max(...data.map(d => Number(d.value) || 0), 0);
  const yTicks   = buildTicks(dataMax);
  const axisMax  = yTicks[yTicks.length - 1] || 1;

  const handleEnter = (i, e) => {
    setHovered(i);
    if (chartRef.current) {
      const cr = chartRef.current.getBoundingClientRect();
      const br = e.currentTarget.getBoundingClientRect();
      setTooltipPos({ x: br.left + br.width / 2 - cr.left, y: br.top - cr.top });
    }
  };

  return (
    <div ref={chartRef} style={{ position: 'relative' }}>
      {/* Tooltip */}
      {hovered !== null && tooltipPos && (
        <div style={{
          position: 'absolute', top: tooltipPos.y - 44, left: tooltipPos.x,
          transform: 'translateX(-50%)',
          background: D.tooltip, border: `0.5px solid ${D.border}`,
          borderRadius: 8, padding: '5px 12px',
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
          color: D.txt, whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 999,
        }}>
          <span style={{ color: glow, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700 }}>
            {data[hovered].value}
          </span>
          {' '}{unit}{onBarClick ? ' · click to drill in' : ''}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Y axis */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 28, paddingRight: 10, minWidth: 38 }}>
          {[...yTicks].reverse().map(v => (
            <div key={v} style={{ fontSize: 10, color: D.muted, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right' }}>{v}</div>
          ))}
        </div>

        {/* Bars area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(p => (
            <div key={p} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, borderTop: `1px dashed ${D.grid}`, pointerEvents: 'none' }} />
          ))}

          <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 4, position: 'relative', zIndex: 1 }}>
            {data.map((d, i) => {
              const pct = axisMax > 0 ? (d.value / axisMax) * 100 : 0;
              const lit = hovered === i || activeBar === d.label;
              return (
                <div key={i}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: onBarClick ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => handleEnter(i, e)}
                  onMouseLeave={() => { setHovered(null); setTooltipPos(null); }}
                  onClick={(e) => { e.stopPropagation(); onBarClick && onBarClick(d, e); }}
                >
                  <div style={{
                    width: '100%',
                    borderRadius: '4px 4px 0 0',
                    height: d.value > 0 ? `${Math.max(pct, 2)}%` : '0%',
                    background: lit ? gradient : D.track,
                    boxShadow: lit ? `0 0 16px ${glow}55` : 'none',
                    outline: activeBar === d.label ? `1.5px solid ${glow}` : 'none',
                    transition: 'all 0.2s ease',
                  }} />
                </div>
              );
            })}
          </div>

          {/* X labels */}
          <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
            {data.map((d, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', fontSize: 10,
                color: (hovered === i || activeBar === d.label) ? glow : D.muted,
                fontFamily: 'IBM Plex Mono, monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 0.15s',
              }}>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};