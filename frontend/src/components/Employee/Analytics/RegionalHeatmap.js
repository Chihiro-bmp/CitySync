import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapPin, Zap, Droplet, Flame, AlertCircle, Clock } from 'lucide-react';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const TABS       = ['revenue', 'productivity', 'regions'];
const TAB_LABELS = { revenue: 'Revenue', productivity: 'Productivity', regions: 'Regions' };

// ─── Mock data ────────────────────────────────────────────────────────────────
const regions = [
  { id: 1, name: 'Motijheel',    electricity: 1234, water: 892,  gas: 345, status: 'Available',  pending: 12, complaints: 3  },
  { id: 2, name: 'Gulshan',      electricity: 1567, water: 1234, gas: 0,   status: 'Limited',    pending: 15, complaints: 7  },
  { id: 3, name: 'Dhanmondi',    electricity: 2103, water: 1876, gas: 542, status: 'Overloaded',  pending: 28, complaints: 14 },
  { id: 4, name: 'Mirpur',       electricity: 987,  water: 765,  gas: 234, status: 'Available',  pending: 6,  complaints: 2  },
  { id: 5, name: 'Uttara',       electricity: 1345, water: 1120, gas: 0,   status: 'Limited',    pending: 18, complaints: 9  },
  { id: 6, name: 'Mohammadpur',  electricity: 876,  water: 654,  gas: 321, status: 'Available',  pending: 8,  complaints: 4  },
  { id: 7, name: 'Tejgaon',      electricity: 1780, water: 1320, gas: 890, status: 'Overloaded',  pending: 34, complaints: 19 },
  { id: 8, name: 'Banani',       electricity: 1102, water: 890,  gas: 210, status: 'Available',  pending: 9,  complaints: 5  },
  { id: 9, name: 'Rampura',      electricity: 643,  water: 512,  gas: 0,   status: 'Available',  pending: 4,  complaints: 1  },
];

const statusCfg = {
  Available:  { color: '#44ff99', bg: 'rgba(68,255,153,0.08)',  stripe: '#44ff99' },
  Limited:    { color: '#FF9900', bg: 'rgba(255,153,0,0.08)',   stripe: '#FF9900' },
  Overloaded: { color: '#FF5757', bg: 'rgba(255,87,87,0.08)',   stripe: '#FF5757' },
};

const fmtNum = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ─── Region Card ─────────────────────────────────────────────────────────────
const RegionCard = ({ region, onClick }) => {
  const cfg = statusCfg[region.status] || statusCfg.Available;

  return (
    <div
      onClick={onClick}
      className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden cursor-pointer hover:border-white/[0.12] transition-all hover:scale-[1.01] animate-fade-in group"
    >
      {/* Status stripe */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.stripe}, ${cfg.stripe}60, transparent)` }} />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${cfg.stripe}15` }}>
              <MapPin size={15} style={{ color: cfg.stripe }} />
            </div>
            <div>
              <div className="font-outfit text-sm font-semibold text-txt leading-none">{region.name}</div>
              <div className="font-mono text-[9px] text-muted mt-0.5 uppercase tracking-wider">Region</div>
            </div>
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded-lg"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {region.status}
          </span>
        </div>

        {/* Connection counts */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Zap size={12} className="text-elec" />
            <span className="font-barlow text-base font-bold text-txt leading-none">{fmtNum(region.electricity)}</span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Elec</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Droplet size={12} className="text-water" />
            <span className="font-barlow text-base font-bold text-txt leading-none">{fmtNum(region.water)}</span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Water</span>
          </div>
          <div className="flex flex-col items-center gap-1 bg-white/[0.03] rounded-xl p-2.5">
            <Flame size={12} className="text-gas" />
            <span className="font-barlow text-base font-bold" style={{ color: region.gas === 0 ? 'rgba(232,232,232,0.2)' : '#E8E8E8' }}>
              {region.gas === 0 ? '—' : fmtNum(region.gas)}
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Gas</span>
          </div>
        </div>

        {/* Pending + Complaints */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
            <Clock size={11} className="text-status-warning flex-shrink-0" />
            <span className="font-mono text-[9px] text-muted flex-1">Pending</span>
            <span className="font-barlow text-sm font-bold" style={{ color: region.pending > 20 ? '#FF9900' : '#E8E8E8' }}>
              {region.pending}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
            <AlertCircle size={11} className="text-status-error flex-shrink-0" />
            <span className="font-mono text-[9px] text-muted flex-1">Open</span>
            <span className="font-barlow text-sm font-bold" style={{ color: region.complaints > 10 ? '#FF5757' : '#E8E8E8' }}>
              {region.complaints}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Summary bar ─────────────────────────────────────────────────────────────
const counts = {
  available:  regions.filter(r => r.status === 'Available').length,
  limited:    regions.filter(r => r.status === 'Limited').length,
  overloaded: regions.filter(r => r.status === 'Overloaded').length,
};

// ─── Component ────────────────────────────────────────────────────────────────
const RegionalHeatmap = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: grain }} />

      <div className="relative z-10 space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">Employee Portal</div>
            <h1 className="font-outfit text-2xl font-semibold text-txt tracking-tight">Regional Overview</h1>
            <p className="font-outfit text-sm text-sub mt-1">Capacity status and service load across all regions</p>
          </div>
          <div className="flex gap-1 bg-card border-0.5 border-white/[0.07] rounded-xl p-1 w-fit">
            {TABS.map(tab => (
              <button key={tab} onClick={() => navigate(`/employee/analytics/${tab}`)}
                className={`px-4 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
                  tab === 'regions' ? 'bg-white/[0.08] text-txt' : 'text-muted hover:text-sub'
                }`}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Available',  count: counts.available,  color: '#44ff99' },
            { label: 'Limited',    count: counts.limited,    color: '#FF9900' },
            { label: 'Overloaded', count: counts.overloaded, color: '#FF5757' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
              <div className="w-2 h-8 rounded-full" style={{ background: color, opacity: 0.7 }} />
              <div>
                <div className="font-barlow text-2xl font-bold text-txt leading-none">{count}</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Regions',      value: regions.length,                                           icon: Map     },
            { label: 'Elec Connections',   value: regions.reduce((s, r) => s + r.electricity, 0).toLocaleString(), icon: Zap     },
            { label: 'Water Connections',  value: regions.reduce((s, r) => s + r.water, 0).toLocaleString(),       icon: Droplet },
            { label: 'Gas Connections',    value: regions.reduce((s, r) => s + r.gas, 0).toLocaleString(),         icon: Flame   },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl p-4">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted mb-1">{label}</div>
              <div className="font-barlow text-2xl font-bold text-txt">{value}</div>
            </div>
          ))}
        </div>

        {/* Region grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map(r => (
            <RegionCard
              key={r.id}
              region={r}
              onClick={() => navigate(`/employee/regions`)}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default RegionalHeatmap;
