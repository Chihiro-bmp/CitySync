// ─── CitySync Design Tokens ───────────────────────────────────────────────────
// Usage: import { tokens, utilities, statusColors, fonts, navItems } from '../theme';

export const fonts = {
  display: "'Barlow Condensed', sans-serif",
  ui:      "'Outfit', sans-serif",
  mono:    "'IBM Plex Mono', monospace",
  rajdhani: "'Rajdhani', sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
  dm:      "'DM Sans', sans-serif",
};

export const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Outfit:wght@300;400;500&family=Rajdhani:wght@600;700&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');`;

export const tokens = {
  dark: {
    bg:           '#0E0E0E',
    bgCard:       '#151515',
    bgHover:      '#1A1A1A',
    sidebar:      '#0A0A0A',
    sidebarHover: '#121212',
    sidebarActive:'#181818',
    border:       'rgba(255,255,255,0.06)',
    text:         '#E8E8E8',
    textSub:      'rgba(232,232,232,0.46)',
    textMuted:    'rgba(232,232,232,0.22)',
    primary:      '#CCFF00', // Lime
    primaryHover: '#B8E600',
    success:      '#CCFF00',
    warning:      '#FF9900',
    danger:       '#FF3B30',
    overlay:      'rgba(6,6,6,0.76)',
    lime:         '#CCFF00',
    orange:       '#FF9900',
    cyan:         '#00D4FF',
  },
};
// Alias dark as light so any remaining light refs don't break immediately
tokens.light = tokens.dark;

export const utilities = {
  electricity: { label: 'Electricity', gradient: 'linear-gradient(135deg,#F5A623,#FF5733)', glow: 'rgba(245,166,35,0.35)',  tag: 'electricity' },
  water:       { label: 'Water',       gradient: 'linear-gradient(135deg,#00C4FF,#0057B8)', glow: 'rgba(0,180,255,0.3)',   tag: 'water'       },
  gas:         { label: 'Gas',         gradient: 'linear-gradient(135deg,#FF4E6A,#C2003F)', glow: 'rgba(255,78,106,0.3)', tag: 'gas'         },
  payment:     { label: 'Payment',     gradient: 'linear-gradient(135deg,#7C5CFC,#3B6FFF)', glow: 'rgba(124,92,252,0.3)', tag: 'payment'     },
  complaint:   { label: 'Complaints',  gradient: 'linear-gradient(135deg,#FF9A3C,#FFD93D)', glow: 'rgba(255,154,60,0.3)', tag: 'complaint'   },
};

export const paymentMethods = {
  bank:           { grad: 'linear-gradient(135deg,#3B6FFF,#2952D9)', glow: 'rgba(59,111,255,0.25)' },
  mobile_banking: { grad: 'linear-gradient(135deg,#E91E8C,#FF5C8A)', glow: 'rgba(233,30,140,0.25)' },
  google_pay:     { grad: 'linear-gradient(135deg,#4285F4,#34A853)', glow: 'rgba(66,133,244,0.25)' },
};

export const statusColors = {
  Active:       { lb:'#DCFCE7', lc:'#16A34A', db:'#0D2E1A', dc:'#4ADE80' },
  Pending:      { lb:'#FEF9C3', lc:'#B45309', db:'#2D1F07', dc:'#FBBF24' },
  Resolved:     { lb:'#DBEAFE', lc:'#1D4ED8', db:'#0C1F45', dc:'#60A5FA' },
  Overdue:      { lb:'#FEE2E2', lc:'#B91C1C', db:'#2D0C0C', dc:'#F87171' },
  Assigned:     { lb:'#F3E8FF', lc:'#7E22CE', db:'#200D38', dc:'#C084FC' },
  Disconnected: { lb:'#F1F5F9', lc:'#475569', db:'#111827', dc:'#64748B' },
  Inactive:     { lb:'#E2E8F0', lc:'#64748B', db:'#0F172A', dc:'#94A3B8' },
  Connected:    { lb:'#DCFCE7', lc:'#16A34A', db:'#0D2E1A', dc:'#4ADE80' },
  Suspended:    { lb:'#FEE2E2', lc:'#B91C1C', db:'#2D0C0C', dc:'#F87171' },
  'In Progress':{ lb:'#EEF2FF', lc:'#4338CA', db:'#1E1B4B', dc:'#818CF8' },
  'Under Review': { lb:'#EEF2FF', lc:'#4338CA', db:'#1E1B4B', dc:'#818CF8' },
  Approved:       { lb:'#DCFCE7', lc:'#16A34A', db:'#0D2E1A', dc:'#4ADE80' },
  Rejected:       { lb:'#FEE2E2', lc:'#B91C1C', db:'#2D0C0C', dc:'#F87171' },
};

export const radii = { sm:8, md:10, lg:12, xl:16, '2xl':20, full:9999 };

// ─── Time-based ambient gradients ─────────────────────────────────────────────
// Returns a palette based on current hour — used in Layout as page background
export const getTimePalette = () => {
  const h = new Date().getHours();

  const palettes = {
    // 00–04 Midnight — deep cool indigo
    midnight: {
      label: 'Midnight',
      light: {
        bg:   'linear-gradient(160deg, #E8EAFF 0%, #EEF0FB 30%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 20% 0%,  rgba(99,102,241,0.10) 0%, transparent 60%)',
        orb2: 'radial-gradient(ellipse at 80% 10%, rgba(139,92,246,0.07) 0%, transparent 55%)',
      },
      // Single centered top halo — indigo tint, barely visible
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 80% 35% at 50% -5%, rgba(110,115,255,0.09) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
    // 05–07 Dawn — warm peach / rose sunrise
    dawn: {
      label: 'Dawn',
      light: {
        bg:   'linear-gradient(160deg, #FFF0E8 0%, #FDEEF4 30%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 15% 0%,  rgba(251,146,60,0.13)  0%, transparent 55%)',
        orb2: 'radial-gradient(ellipse at 75% 5%,  rgba(244,114,182,0.09) 0%, transparent 50%)',
      },
      // Warm amber halo bleeding in from top — like first light
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 70% 30% at 50% -5%, rgba(255,160,80,0.08) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
    // 08–11 Morning — fresh sky blue
    morning: {
      label: 'Morning',
      light: {
        bg:   'linear-gradient(160deg, #E0EEFF 0%, #EBF4FF 30%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 25% 0%,  rgba(59,111,255,0.10) 0%, transparent 55%)',
        orb2: 'radial-gradient(ellipse at 70% 8%,  rgba(0,196,255,0.08)  0%, transparent 50%)',
      },
      // Cool blue halo — crisp daylight
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 75% 32% at 50% -5%, rgba(80,140,255,0.09) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
    // 12–16 Afternoon — bright golden white
    afternoon: {
      label: 'Afternoon',
      light: {
        bg:   'linear-gradient(160deg, #FFFBEA 0%, #FFF8E1 25%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 30% 0%,  rgba(245,166,35,0.11) 0%, transparent 55%)',
        orb2: 'radial-gradient(ellipse at 75% 5%,  rgba(251,191,36,0.08) 0%, transparent 50%)',
      },
      // Neutral-warm halo — bright overhead sun, almost white
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 80% 30% at 50% -5%, rgba(200,185,140,0.07) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
    // 17–19 Evening — warm amber / purple dusk
    evening: {
      label: 'Evening',
      light: {
        bg:   'linear-gradient(160deg, #FFF0E6 0%, #F9EDF8 30%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 20% 0%,  rgba(239,68,68,0.08)  0%, transparent 55%)',
        orb2: 'radial-gradient(ellipse at 80% 5%,  rgba(168,85,247,0.09) 0%, transparent 50%)',
      },
      // Purple-rose halo — golden hour fading to dusk
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 75% 32% at 50% -5%, rgba(180,90,200,0.08) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
    // 20–23 Night — deep violet
    night: {
      label: 'Night',
      light: {
        bg:   'linear-gradient(160deg, #EDE8FF 0%, #F1EDFB 30%, #F5F6FA 65%)',
        orb1: 'radial-gradient(ellipse at 25% 0%,  rgba(139,92,246,0.10) 0%, transparent 55%)',
        orb2: 'radial-gradient(ellipse at 70% 8%,  rgba(99,102,241,0.07) 0%, transparent 50%)',
      },
      // Soft violet halo — city glow at night
      dark: {
        bg:   '#080C18',
        orb1: 'radial-gradient(ellipse 78% 30% at 50% -5%, rgba(130,100,255,0.08) 0%, transparent 100%)',
        orb2: 'none',
      },
    },
  };

  if      (h >= 0  && h < 5)  return palettes.midnight;
  else if (h >= 5  && h < 8)  return palettes.dawn;
  else if (h >= 8  && h < 12) return palettes.morning;
  else if (h >= 12 && h < 17) return palettes.afternoon;
  else if (h >= 17 && h < 20) return palettes.evening;
  else                         return palettes.night;
};

export const shadows = {
  card:    '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
  cardDark:'0 1px 3px rgba(0,0,0,0.3),  0 4px 16px rgba(0,0,0,0.2)',
  primary: '0 4px 14px rgba(59,111,255,0.3)',
};

export const navItems = {
  consumer: [
    { label:'Dashboard',    path:'/consumer/dashboard',     icon:'home'       },
    { label:'Connections',  path:'/consumer/connections',   icon:'connection' },
    { label:'My Bills',     path:'/consumer/bills',         icon:'bill'       },
    { label:'Usage',        path:'/consumer/usage',         icon:'usage'      },
    { label:'Applications', path:'/consumer/applications',  icon:'application' },
    { label:'Complaints',   path:'/consumer/complaints',    icon:'complaint'  },
    { label:'Profile',      path:'/consumer/profile',       icon:'profile'    },
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
    { label:'Applications', path:'/employee/applications',  icon:'application'},
    { label:'Complaints',   path:'/employee/complaints',    icon:'complaint'  },
    { label:'Field Workers',path:'/employee/field-workers', icon:'jobs'       },
  ],
};