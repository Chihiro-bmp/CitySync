/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: '#0E0E0E',
        card: '#111111',
        card2: '#141414',

        // Legacy (keep for existing components)
        lime: '#CCFF00',
        orange: '#FF9900',
        cyan: '#00D4FF',

        // Text
        txt: '#E8E8E8',
        sub: 'rgba(232,232,232,0.45)',
        muted: 'rgba(232,232,232,0.25)',

        // Legacy muted
        // (kept as-is for backward compat)

        // Utility accents
        elec: '#CCFF00',
        water: '#00D4FF',
        gas: '#FF9900',

        // Status
        'status-active': '#44ff99',
        'status-warning': '#FF9900',
        'status-error': '#FF5757',
      },
      fontFamily: {
        barlow: ["'Barlow Condensed'", "sans-serif"],
        rajdhani: ["'Rajdhani'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
        jetbrains: ["'JetBrains Mono'", "monospace"],
        outfit: ["'Outfit'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
      },
      borderWidth: {
        '0.5': '0.5px',
      },
      backdropBlur: {
        glass: '20px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
