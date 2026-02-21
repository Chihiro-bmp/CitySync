// ─── CitySync Custom SVG Icons ────────────────────────────────────────────────
// All icons are hand-crafted SVGs. Use size and color props to control them.
// Usage: import { ElectricityIcon, WaterIcon, NavIcons } from '../Icons';

const iconBase = (size, viewBox, children) => ({
  width: size, height: size, viewBox, fill: 'none',
});

export const ElectricityIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
      fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round"/>
  </svg>
);

export const WaterIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C12 2 5 9.5 5 14.5C5 18.09 8.13 21 12 21C15.87 21 19 18.09 19 14.5C19 9.5 12 2 12 2Z"
      fill={color} opacity="0.9"/>
    <path d="M8.5 15.5C8.5 15.5 9 18 12 18"
      stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const GasIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3C12 3 8 7 8 11C8 11 10 9 11 9C11 9 9 13 9 16C9 18.76 10.34 21 12 21C13.66 21 15 18.76 15 16C15 13 13 9 13 9C14 9 16 11 16 11C16 7 12 3 12 3Z"
      fill={color}/>
    <ellipse cx="12" cy="18.5" rx="2" ry="1.2" fill="rgba(255,255,255,0.25)"/>
  </svg>
);

export const PaymentIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="3" fill={color} opacity="0.15" stroke={color} strokeWidth="1.5"/>
    <path d="M2 9H22" stroke={color} strokeWidth="2"/>
    <rect x="5" y="13" width="5" height="2" rx="1" fill={color}/>
    <rect x="14" y="13" width="5" height="2" rx="1" fill={color} opacity="0.5"/>
  </svg>
);

export const ComplaintIcon = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 13.85 2.5 15.58 3.37 17.07L2 22L6.93 20.63C8.42 21.5 10.15 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
      fill={color} opacity="0.15" stroke={color} strokeWidth="1.5"/>
    <path d="M12 7V13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="16" r="1" fill={color}/>
  </svg>
);

// ── Navigation Icons ──────────────────────────────────────────────────────────

export const HomeIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 9L12 3L21 9V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9Z"
      fill={color} opacity="0.9"/>
  </svg>
);

export const BillIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M8 7H16M8 11H16M8 15H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const UsageIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 20L8 14L12 16L16 10L20 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 4V20H20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ProfileIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M4 20C4 17 7.58 15 12 15C16.42 15 20 17 20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

export const JobsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="14" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M9 13L11 15L15 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MeterIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M12 12L15.5 8.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="1.5" fill={color}/>
    <path d="M7 17.5A7 7 0 0 1 17 17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

export const RegionIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
      stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.5" fill="none"/>
  </svg>
);

export const ConnectionIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="5"  cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="19" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/>
    <path d="M8 12H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
  </svg>
);

export const MoonIcon = ({ size = 18, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill={color}/>
  </svg>
);

export const SunIcon = ({ size = 18, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="5" fill={color}/>
    <line x1="12" y1="1"    x2="12" y2="3"    stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="21"   x2="12" y2="23"   stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="1"  y1="12" x2="3"  y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const LogoutIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5C4.45 21 4 20.55 4 20V4C4 3.45 4.45 3 5 3H9" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 17L21 12L16 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12H9" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ChevronIcon = ({ size = 16, color = 'currentColor', direction = 'right' }) => {
  const rotate = { right: 0, down: 90, left: 180, up: 270 }[direction] || 0;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${rotate}deg)`, transition: 'transform 0.2s' }}>
      <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ── Utility icon map (key matches utility tag) ────────────────────────────────
export const UtilityIcons = {
  electricity: ElectricityIcon,
  water:       WaterIcon,
  gas:         GasIcon,
  payment:     PaymentIcon,
  complaint:   ComplaintIcon,
};

// ── Nav icon map (key matches navItems icon string) ───────────────────────────
export const NavIcons = {
  home:       HomeIcon,
  bill:       BillIcon,
  payment:    PaymentIcon,
  usage:      UsageIcon,
  complaint:  ComplaintIcon,
  profile:    ProfileIcon,
  jobs:       JobsIcon,
  meter:      MeterIcon,
  region:     RegionIcon,
  connection: ConnectionIcon,
};