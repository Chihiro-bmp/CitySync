// ─── CitySync Design Tokens ───────────────────────────────────────────────────
// Usage: import { tokens, utilities, statusColors, fonts, navItems } from '../theme';

export const fonts = {
  display: "'Syne', sans-serif",
  ui:      "'Outfit', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

export const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Syne:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');`;

export const tokens = {
  light: {
    bg:           '#F5F6FA',
    bgCard:       '#FFFFFF',
    bgHover:      '#F0F4FF',
    sidebar:      '#0B0F1C',
    sidebarHover: '#151C30',
    sidebarActive:'#1E2840',
    border:       '#E4E8F0',
    text:         '#0D1B2A',
    textSub:      '#5A6A7A',
    textMuted:    '#94A3B8',
    primary:      '#3B6FFF',
    primaryHover: '#2952D9',
    success:      '#22C55E',
    warning:      '#F5A623',
    danger:       '#EF4444',
    overlay:      'rgba(0,0,0,0.4)',
  },
  dark: {
    bg:           '#080C18',
    bgCard:       '#0F1628',
    bgHover:      '#1A2235',
    sidebar:      '#060914',
    sidebarHover: '#0D1425',
    sidebarActive:'#132040',
    border:       '#1A2235',
    text:         '#EEF2FF',
    textSub:      '#7A8BA0',
    textMuted:    '#3D4F66',
    primary:      '#4D7DFF',
    primaryHover: '#6B95FF',
    success:      '#22C55E',
    warning:      '#F5A623',
    danger:       '#EF4444',
    overlay:      'rgba(0,0,0,0.65)',
  },
};

export const utilities = {
  electricity: { label: 'Electricity', gradient: 'linear-gradient(135deg,#F5A623,#FF5733)', glow: 'rgba(245,166,35,0.35)',  tag: 'electricity' },
  water:       { label: 'Water',       gradient: 'linear-gradient(135deg,#00C4FF,#0057B8)', glow: 'rgba(0,180,255,0.3)',   tag: 'water'       },
  gas:         { label: 'Gas',         gradient: 'linear-gradient(135deg,#FF4E6A,#C2003F)', glow: 'rgba(255,78,106,0.3)', tag: 'gas'         },
  payment:     { label: 'Payment',     gradient: 'linear-gradient(135deg,#7C5CFC,#3B6FFF)', glow: 'rgba(124,92,252,0.3)', tag: 'payment'     },
  complaint:   { label: 'Complaints',  gradient: 'linear-gradient(135deg,#FF9A3C,#FFD93D)', glow: 'rgba(255,154,60,0.3)', tag: 'complaint'   },
};

export const statusColors = {
  Active:       { lb:'#DCFCE7', lc:'#16A34A', db:'#0D2E1A', dc:'#4ADE80' },
  Pending:      { lb:'#FEF9C3', lc:'#B45309', db:'#2D1F07', dc:'#FBBF24' },
  Resolved:     { lb:'#DBEAFE', lc:'#1D4ED8', db:'#0C1F45', dc:'#60A5FA' },
  Overdue:      { lb:'#FEE2E2', lc:'#B91C1C', db:'#2D0C0C', dc:'#F87171' },
  Assigned:     { lb:'#F3E8FF', lc:'#7E22CE', db:'#200D38', dc:'#C084FC' },
  Disconnected: { lb:'#F1F5F9', lc:'#475569', db:'#111827', dc:'#64748B' },
  Connected:    { lb:'#DCFCE7', lc:'#16A34A', db:'#0D2E1A', dc:'#4ADE80' },
  Suspended:    { lb:'#FEE2E2', lc:'#B91C1C', db:'#2D0C0C', dc:'#F87171' },
  'In Progress':{ lb:'#EEF2FF', lc:'#4338CA', db:'#1E1B4B', dc:'#818CF8' },
};

export const radii = { sm:8, md:10, lg:12, xl:16, '2xl':20, full:9999 };

export const shadows = {
  card:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
  cardDark:'0 1px 3px rgba(0,0,0,0.3),  0 4px 16px rgba(0,0,0,0.2)',
  primary: '0 4px 14px rgba(59,111,255,0.3)',
};

export const navItems = {
  consumer: [
    { label:'Dashboard',  path:'/consumer/dashboard',  icon:'home'      },
    { label:'My Bills',   path:'/consumer/bills',      icon:'bill'      },
    { label:'Payments',   path:'/consumer/payments',   icon:'payment'   },
    { label:'Usage',      path:'/consumer/usage',      icon:'usage'     },
    { label:'Complaints', path:'/consumer/complaints', icon:'complaint' },
    { label:'Profile',    path:'/consumer/profile',    icon:'profile'   },
  ],
  field_worker: [
    { label:'Dashboard',   path:'/field-worker/dashboard', icon:'home'    },
    { label:'My Jobs',     path:'/field-worker/jobs',      icon:'jobs'    },
    { label:'Log Reading', path:'/field-worker/readings',  icon:'meter'   },
    { label:'Profile',     path:'/field-worker/profile',   icon:'profile' },
  ],
  employee: [
    { label:'Dashboard',    path:'/employee/dashboard',     icon:'home'       },
    { label:'Regions',      path:'/employee/regions',       icon:'region'     },
    { label:'Connections',  path:'/employee/connections',   icon:'connection' },
    { label:'Consumers',    path:'/employee/consumers',     icon:'profile'    },
    { label:'Tariffs',      path:'/employee/tariffs',       icon:'bill'       },
    { label:'Complaints',   path:'/employee/complaints',    icon:'complaint'  },
    { label:'Field Workers',path:'/employee/field-workers', icon:'jobs'       },
    { label:'Analytics',    path:'/employee/analytics',     icon:'usage'      },
  ],
};