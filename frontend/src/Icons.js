// ─── CitySync Custom SVG Icons ────────────────────────────────────────────────
// All icons are hand-crafted SVGs. Use size and color props to control them.
// Usage: import { ElectricityIcon, WaterIcon, NavIcons } from '../Icons';

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

export const ConnectionIcon = ({ size = 20, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z"/>
    <path d="M17 21v-2"/>
    <path d="M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10"/>
    <path d="M21 21v-2"/>
    <path d="M3 5V3"/>
    <path d="M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z"/>
    <path d="M7 5V3"/>
  </svg>
);

export const ApplicationIcon = ({ size = 20, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
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

// ── Payment Method Icons ─────────────────────────────────────────────────────
export const BankTransferIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12h6v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MobileBankingIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="1.8"/>
    <circle cx="12" cy="17" r="1" fill={color}/>
  </svg>
);

export const GooglePayIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Utility icon map (key matches utility tag) ────────────────────────────────
export const UtilityIcons = {
  electricity: ElectricityIcon,
  water:       WaterIcon,
  gas:         GasIcon,
  payment:     PaymentIcon,
  complaint:   ComplaintIcon,
};

// ── Re-exports from Lucide React ─────────────────────────────────────────────
export {
  Check,
  CheckCircle,
  X,
  Plus,
  Zap,
  Droplets,
  Flame,
  FileText,
  Inbox,
} from 'lucide-react';

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
  application: ApplicationIcon,
};