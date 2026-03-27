import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { BarChart3, Users, Clock, ChevronUp, ChevronDown } from 'lucide-react';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const TABS       = ['revenue', 'productivity', 'regions'];
const TAB_LABELS = { revenue: 'Revenue', productivity: 'Productivity', regions: 'Regions' };
const ACCENT     = '#CCFF00';

// ─── Mock data ────────────────────────────────────────────────────────────────
const workers = [
  { id: 1, name: 'Kamal Ahmed',     region: 'Motijheel',  complaints: 23, avg_hours: 18.4, readings: 156 },
  { id: 2, name: 'Rahim Hassan',    region: 'Gulshan',    complaints: 19, avg_hours: 22.1, readings: 142 },
  { id: 3, name: 'Farhan Islam',    region: 'Dhanmondi',  complaints: 17, avg_hours: 20.3, readings: 134 },
  { id: 4, name: 'Nasrin Begum',    region: 'Mirpur',     complaints: 15, avg_hours: 24.6, readings: 128 },
  { id: 5, name: 'Shakil Hossain', region: 'Motijheel',  complaints: 14, avg_hours: 25.1, readings: 121 },
  { id: 6, name: 'Mizan Rahman',   region: 'Gulshan',    complaints: 12, avg_hours: 28.3, readings: 115 },
  { id: 7, name: 'Jahanara Khatun',region: 'Uttara',     complaints: 11, avg_hours: 31.2, readings: 98  },
  { id: 8, name: 'Ariful Hoque',   region: 'Dhanmondi',  complaints: 9,  avg_hours: 35.4, readings: 87  },
  { id: 9, name: 'Sadia Islam',    region: 'Mirpur',     complaints: 8,  avg_hours: 38.0, readings: 76  },
  { id: 10,name: 'Tariq Ahmed',    region: 'Uttara',     complaints: 6,  avg_hours: 41.2, readings: 65  },
];

const perfHistory = {
  1:  [{ m: 'Oct', v: 18 }, { m: 'Nov', v: 20 }, { m: 'Dec', v: 21 }, { m: 'Jan', v: 22 }, { m: 'Feb', v: 21 }, { m: 'Mar', v: 23 }],
  2:  [{ m: 'Oct', v: 13 }, { m: 'Nov', v: 15 }, { m: 'Dec', v: 16 }, { m: 'Jan', v: 17 }, { m: 'Feb', v: 18 }, { m: 'Mar', v: 19 }],
  3:  [{ m: 'Oct', v: 12 }, { m: 'Nov', v: 13 }, { m: 'Dec', v: 15 }, { m: 'Jan', v: 15 }, { m: 'Feb', v: 16 }, { m: 'Mar', v: 17 }],
  4:  [{ m: 'Oct', v: 10 }, { m: 'Nov', v: 12 }, { m: 'Dec', v: 13 }, { m: 'Jan', v: 14 }, { m: 'Feb', v: 14 }, { m: 'Mar', v: 15 }],
  5:  [{ m: 'Oct', v: 9  }, { m: 'Nov', v: 11 }, { m: 'Dec', v: 12 }, { m: 'Jan', v: 13 }, { m: 'Feb', v: 13 }, { m: 'Mar', v: 14 }],
  6:  [{ m: 'Oct', v: 8  }, { m: 'Nov', v: 9  }, { m: 'Dec', v: 10 }, { m: 'Jan', v: 11 }, { m: 'Feb', v: 11 }, { m: 'Mar', v: 12 }],
  7:  [{ m: 'Oct', v: 7  }, { m: 'Nov', v: 8  }, { m: 'Dec', v: 9  }, { m: 'Jan', v: 10 }, { m: 'Feb', v: 10 }, { m: 'Mar', v: 11 }],
  8:  [{ m: 'Oct', v: 6  }, { m: 'Nov', v: 7  }, { m: 'Dec', v: 7  }, { m: 'Jan', v: 8  }, { m: 'Feb', v: 8  }, { m: 'Mar', v: 9  }],
  9:  [{ m: 'Oct', v: 5  }, { m: 'Nov', v: 5  }, { m: 'Dec', v: 6  }, { m: 'Jan', v: 7  }, { m: 'Feb', v: 7  }, { m: 'Mar', v: 8  }],
  10: [{ m: 'Oct', v: 3  }, { m: 'Nov', v: 4  }, { m: 'Dec', v: 5  }, { m: 'Jan', v: 5  }, { m: 'Feb', v: 5  }, { m: 'Mar', v: 6  }],
};

const regions = ['All', ...Array.from(new Set(workers.map(w => w.region)))];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border-0.5 border-white/[0.07] rounded-xl p-3 shadow-2xl">
      <p className="font-mono text-[9px] text-muted uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="font-barlow font-bold text-base" style={{ color: p.color }}>{p.value}</span>
          <span className="font-mono text-[10px] text-muted">{p.name}</span>
        </div>
      ))}
    </div>
  );
};

const SortIcon = ({ col, active, dir }) => {
  if (!active) return <div className="w-3 h-3 opacity-20"><ChevronUp size={12} /></div>;
  return dir === 'asc' ? <ChevronUp size={12} className="text-elec" /> : <ChevronDown size={12} className="text-elec" />;
};

// ─── Component ────────────────────────────────────────────────────────────────
const ProductivityDashboard = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState('All');
  const [sortCol, setSortCol] = useState('complaints');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedWorker, setSelectedWorker] = useState(workers[0]);

  const filtered = useMemo(() =>
    region === 'All' ? workers : workers.filter(w => w.region === region),
  [region]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filtered, sortCol, sortDir]);

  const top10 = [...workers].sort((a, b) => b.complaints - a.complaints).slice(0, 10);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const histData = perfHistory[selectedWorker.id] || [];

  const COLS = [
    { key: 'name',       label: 'Name',              numeric: false },
    { key: 'region',     label: 'Region',             numeric: false },
    { key: 'complaints', label: 'Resolved',           numeric: true  },
    { key: 'avg_hours',  label: 'Avg Res. Time (h)',  numeric: true  },
    { key: 'readings',   label: 'Readings',           numeric: true  },
  ];

  return (
    <div className="relative">
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: grain }} />

      <div className="relative z-10 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">Employee Portal</div>
            <h1 className="font-outfit text-2xl font-semibold text-txt tracking-tight">Productivity</h1>
            <p className="font-outfit text-sm text-sub mt-1">Field worker performance metrics — this month</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-card border-0.5 border-white/[0.07] rounded-xl p-1">
              {TABS.map(tab => (
                <button key={tab} onClick={() => navigate(`/employee/analytics/${tab}`)}
                  className={`px-4 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                    tab === 'productivity' ? 'bg-white/[0.08] text-txt' : 'text-muted hover:text-sub'
                  }`}>
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            {/* Region filter */}
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="bg-card border-0.5 border-white/[0.07] rounded-xl px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-sub outline-none focus:border-white/[0.15] cursor-pointer"
            >
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users,   label: 'Field Workers', value: filtered.length },
            { icon: BarChart3, label: 'Total Resolved', value: filtered.reduce((s, w) => s + w.complaints, 0) },
            { icon: Clock,   label: 'Avg Res. Time',  value: `${(filtered.reduce((s, w) => s + w.avg_hours, 0) / (filtered.length || 1)).toFixed(1)}h` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-4">
              <div className="h-[1.5px] w-full rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${ACCENT}50, transparent)` }} />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-elec/10">
                  <Icon size={15} className="text-elec" />
                </div>
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</div>
                  <div className="font-barlow text-2xl font-bold text-txt leading-none mt-0.5">{value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart + trend row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top workers bar */}
          <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-5">
            <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-5" />
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-1">Top Performers</div>
            <div className="font-outfit text-base font-semibold text-txt mb-5">Complaints Resolved This Month</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top10.map(w => ({ name: w.name.split(' ')[0], value: w.complaints }))} margin={{ top: 0, right: 0, bottom: 20, left: 10 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="4 5" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" name="Resolved" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                  {top10.map((w, i) => (
                    <Cell
                      key={i}
                      fill={selectedWorker.id === w.id ? ACCENT : 'rgba(255,255,255,0.07)'}
                      style={{ cursor: 'pointer', filter: selectedWorker.id === w.id ? `drop-shadow(0 0 8px ${ACCENT}66)` : 'none' }}
                      onClick={() => setSelectedWorker(w)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Worker trend */}
          <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-5">
            <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-5" />
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-1">6-Month Trend</div>
                <div className="font-outfit text-base font-semibold text-txt">{selectedWorker.name}</div>
                <div className="font-mono text-[10px] text-muted mt-0.5">{selectedWorker.region}</div>
              </div>
              <select
                value={selectedWorker.id}
                onChange={e => setSelectedWorker(workers.find(w => w.id === Number(e.target.value)))}
                className="bg-bg border-0.5 border-white/[0.05] rounded-lg px-2 py-1.5 font-mono text-[10px] text-sub outline-none focus:border-white/[0.12] cursor-pointer"
              >
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={histData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 5" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(232,232,232,0.25)', fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Line type="monotone" dataKey="v" name="Resolved" stroke={ACCENT} strokeWidth={2}
                  dot={{ fill: ACCENT, stroke: '#111', strokeWidth: 1.5, r: 4 }}
                  activeDot={{ r: 6, fill: ACCENT, stroke: '#111', strokeWidth: 1.5, style: { filter: `drop-shadow(0 0 6px ${ACCENT})` } }}
                  isAnimationActive animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sortable table */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/[0.05]">
            <div className="h-[1.5px] w-full rounded-full bg-white/[0.06] mb-4" />
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted mb-1">All Workers</div>
            <div className="font-outfit text-base font-semibold text-txt">Performance Table</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.numeric && handleSort(col.key)}
                      className={`px-5 py-3 text-left font-mono text-[9px] uppercase tracking-wider text-muted ${col.numeric ? 'cursor-pointer hover:text-sub transition-colors' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.numeric && <SortIcon col={col.key} active={sortCol === col.key} dir={sortDir} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((w, i) => (
                  <tr
                    key={w.id}
                    onClick={() => setSelectedWorker(w)}
                    className={`border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.02] ${selectedWorker.id === w.id ? 'bg-elec/[0.04]' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center font-barlow text-sm font-bold text-sub">
                          {w.name[0]}
                        </div>
                        <span className="font-outfit text-sm text-txt">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[10px] text-sub bg-white/[0.04] rounded-md px-2 py-0.5">{w.region}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-barlow text-base font-bold" style={{ color: i < 3 ? ACCENT : '#E8E8E8' }}>{w.complaints}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-mono text-[11px] ${w.avg_hours <= 20 ? 'text-status-active' : w.avg_hours <= 28 ? 'text-status-warning' : 'text-status-error'}`}>
                        {w.avg_hours}h
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-barlow text-base font-bold text-sub">{w.readings}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductivityDashboard;
