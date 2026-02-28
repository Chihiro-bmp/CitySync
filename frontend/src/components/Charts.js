import React, { useState } from 'react';
import { fonts } from '../theme';

// ─── DONUT CHART ──────────────────────────────────────────────────────────────
export const DonutChart = ({ segments, size = 180, thickness = 44, label, sublabel, t }) => {
  const [hovered, setHovered] = useState(null);
  const GAP    = 3;
  const r      = (size - thickness) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const circum = 2 * Math.PI * r;
  const total  = segments.reduce((s, g) => s + g.value, 0);

  if (total === 0) return (
    <div style={{ width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:13 }}>No data</div>
  );

  let offset = 0;
  const slices = segments.map((seg, i) => {
    const pct   = seg.value / total;
    const dash  = Math.max(0, pct * circum - GAP);
    const gap   = circum - dash;
    const slice = { ...seg, dash, gap, offset, pct, index: i };
    offset += pct * circum;
    return slice;
  });

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1A2235" strokeWidth={thickness} />
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color}
            strokeWidth={hovered === i ? thickness + 5 : thickness}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            style={{ transition:'stroke-width 0.2s, filter 0.2s', cursor:'pointer', filter: hovered === i ? `drop-shadow(0 0 8px ${s.color}99)` : 'none' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        {hov ? (
          <>
            <div style={{ fontSize:20, fontWeight:700, color:hov.color, fontFamily:fonts.ui, letterSpacing:'-0.4px', lineHeight:1 }}>{hov.value}</div>
            <div style={{ fontSize:11, color:'#7A8BA0', marginTop:4, fontFamily:fonts.ui, textAlign:'center', maxWidth:80 }}>{hov.label}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:fonts.ui, letterSpacing:'-0.5px', lineHeight:1 }}>{label}</div>
            {sublabel && <div style={{ fontSize:11, color:'#7A8BA0', marginTop:4, fontFamily:fonts.mono, textAlign:'center' }}>{sublabel}</div>}
          </>
        )}
      </div>
    </div>
  );
};

// ─── LEGEND ───────────────────────────────────────────────────────────────────
export const ChartLegend = ({ segments, t }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:10, justifyContent:'center' }}>
    {segments.map((s, i) => (
      <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:12, height:12, borderRadius:3, background:s.color, flexShrink:0 }} />
        <div style={{ flex:1, fontSize:13, color:t.textSub }}>{s.label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:t.text, fontFamily:fonts.ui }}>{s.value}</div>
        <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, width:36, textAlign:'right' }}>{s.pct ? `${Math.round(s.pct*100)}%` : ''}</div>
      </div>
    ))}
  </div>
);

// ─── LINE CHART ───────────────────────────────────────────────────────────────
export const LineChart = ({ lines, t, isDark, unit = 'units', height = 200 }) => {
  const [hovered, setHovered] = useState(null);

  if (!lines || lines.length === 0 || lines[0].points.length === 0) {
    return <div style={{ textAlign:'center', padding:'48px 0', color:t.textMuted, fontSize:13 }}>No comparison data</div>;
  }

  const allVals = lines.flatMap(l => l.points.map(p => p.value));
  const maxVal  = Math.max(...allVals, 1);
  const labels  = lines[0].points.map(p => p.label);
  const W       = 600;
  const H       = height;
  const PAD     = { top:24, right:16, bottom:32, left:44 };
  const innerW  = W - PAD.left - PAD.right;
  const innerH  = H - PAD.top  - PAD.bottom;

  const xPos = (i) => PAD.left + (i / (labels.length - 1 || 1)) * innerW;
  const yPos = (v) => PAD.top  + innerH - (v / maxVal) * innerH;

  const bezierFor = (pts) => {
    if (pts.length < 2) return `M ${xPos(0)} ${yPos(pts[0]?.value || 0)}`;
    return pts.map((p, i) => {
      if (i === 0) return `M ${xPos(i)} ${yPos(p.value)}`;
      const x1 = xPos(i - 0.5);
      const x2 = xPos(i - 0.5);
      return `C ${x1} ${yPos(pts[i-1].value)}, ${x2} ${yPos(p.value)}, ${xPos(i)} ${yPos(p.value)}`;
    }).join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p));

  return (
    <div style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible' }}>
        {/* Grid */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
              stroke={isDark ? '#1A2235' : '#E4E8F0'} strokeWidth={1} strokeDasharray="4 4" />
            <text x={PAD.left - 8} y={yPos(v) + 4} textAnchor="end"
              fontSize={10} fill={t.textMuted} fontFamily={fonts.mono}>{v}</text>
          </g>
        ))}

        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle"
            fontSize={10} fill={t.textMuted} fontFamily={fonts.mono}>{l}</text>
        ))}

        {/* Lines + areas */}
        {lines.map((line, li) => {
          const pts = line.points;
          const areaPath = `${bezierFor(pts)} L ${xPos(pts.length-1)} ${yPos(0)} L ${xPos(0)} ${yPos(0)} Z`;
          return (
            <g key={li}>
              <defs>
                <linearGradient id={`grad-${li}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={line.color} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={line.color} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#grad-${li})`} />
              <path d={bezierFor(pts)} fill="none" stroke={line.color}
                strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ filter:`drop-shadow(0 2px 4px ${line.color}44)` }} />
              {pts.map((p, pi) => {
                const isHov = hovered?.lineIdx === li && hovered?.pointIdx === pi;
                return (
                  <circle key={pi} cx={xPos(pi)} cy={yPos(p.value)} r={isHov ? 7 : 4}
                    fill={line.color} stroke={isDark ? '#0F1628' : '#fff'} strokeWidth={2}
                    style={{ cursor:'pointer', transition:'r 0.15s', filter: isHov ? `drop-shadow(0 0 6px ${line.color})` : 'none' }}
                    onMouseEnter={() => setHovered({ lineIdx: li, pointIdx: pi })}
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Tooltip — flips below dot when near top of chart */}
        {hovered && (() => {
          const line  = lines[hovered.lineIdx];
          const pt    = line.points[hovered.pointIdx];
          const dotX  = xPos(hovered.pointIdx);
          const dotY  = yPos(pt.value);
          const boxW  = 90;
          const boxH  = 32;
          const GAP   = 10;
          // Flip below when too close to top
          const above = dotY - GAP - boxH;
          const below = dotY + GAP;
          const ty    = above < PAD.top ? below : above;
          const bx    = Math.max(PAD.left, Math.min(dotX - boxW / 2, W - PAD.right - boxW));
          return (
            <g style={{ pointerEvents:'none' }}>
              <rect x={bx} y={ty} width={boxW} height={boxH} rx={7}
                fill={isDark ? '#1A2235' : '#fff'}
                stroke={isDark ? '#2A3550' : '#E4E8F0'} strokeWidth={1}
                style={{ filter:'drop-shadow(0 2px 10px rgba(0,0,0,0.18))' }} />
              <text x={bx + boxW/2} y={ty + 13} textAnchor="middle"
                fontSize={12} fontWeight="600" fill={line.color} fontFamily={fonts.ui}>
                {pt.value} {unit}
              </text>
              <text x={bx + boxW/2} y={ty + 26} textAnchor="middle"
                fontSize={9} fill={t.textMuted} fontFamily={fonts.mono}>
                {line.label.split(' ')[0]} · {pt.label}
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8, flexWrap:'wrap' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:24, height:3, borderRadius:2, background:line.color }} />
            <span style={{ fontSize:12, color:t.textSub, fontFamily:fonts.ui }}>{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── BAR CHART ────────────────────────────────────────────────────────────────
// Supports onClick on bars for drill-down
export const BarChart = ({ data, gradient, glow, unit, t, isDark, onBarClick, activeBar }) => {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 0', color:t.textMuted, fontSize:13 }}>No usage data</div>
  );
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', gap:0 }}>
        {/* Y axis */}
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', paddingBottom:28, paddingRight:10, minWidth:40 }}>
          {[max, Math.round(max*0.75), Math.round(max*0.5), Math.round(max*0.25), 0].map(v => (
            <div key={v} style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textAlign:'right' }}>{v}</div>
          ))}
        </div>
        {/* Bars */}
        <div style={{ flex:1, position:'relative' }}>
          {[0,25,50,75,100].map(p => (
            <div key={p} style={{ position:'absolute', left:0, right:0, top:`${p}%`, borderTop:`1px dashed ${isDark ? '#1A2235' : '#E4E8F0'}`, pointerEvents:'none' }} />
          ))}
          <div style={{ display:'flex', alignItems:'flex-end', height:200, gap:5, position:'relative', zIndex:1 }}>
            {data.map((d, i) => {
              const pct    = (d.value / max) * 100;
              const isHov  = hovered === i;
              const isAct  = activeBar === d.label;
              const lit    = isHov || isAct;
              return (
                <div key={i}
                  style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', position:'relative', cursor: onBarClick ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onBarClick && onBarClick(d)}
                >
                  {isHov && (
                    <div style={{ position:'absolute', bottom:'100%', marginBottom:6, background: isDark ? '#1A2235' : '#fff', border:`1px solid ${t.border}`, borderRadius:8, padding:'5px 10px', fontSize:12, color:t.text, fontFamily:fonts.mono, whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', zIndex:10, transform:'translateX(-50%)', left:'50%' }}>
                      {d.value} {unit}{onBarClick ? ' — click to drill in' : ''}
                    </div>
                  )}
                  <div style={{ width:'100%', borderRadius:'5px 5px 0 0', height:`${Math.max(pct,2)}%`, background: lit ? gradient : (isDark ? 'rgba(255,255,255,0.06)' : '#E8ECF5'), boxShadow: lit ? `0 0 14px ${glow}` : 'none', transition:'all 0.2s', outline: isAct ? `2px solid ${glow}` : 'none' }} />
                </div>
              );
            })}
          </div>
          {/* X labels */}
          <div style={{ display:'flex', gap:5, marginTop:6 }}>
            {data.map((d, i) => (
              <div key={i} style={{ flex:1, textAlign:'center', fontSize:10, color: (hovered === i || activeBar === d.label) ? t.primary : t.textMuted, fontFamily:fonts.mono, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color 0.15s' }}>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};