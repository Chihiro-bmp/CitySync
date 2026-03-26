/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0E0E0E',
        lime: '#CCFF00',
        orange: '#FF9900',
        cyan: '#00D4FF',
        txt: '#E8E8E8',
        muted: 'rgba(232, 232, 232, 0.36)',
      },
      fontFamily: {
        barlow: ["'Barlow Condensed'", "sans-serif"],
        rajdhani: ["'Rajdhani'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
        jetbrains: ["'JetBrains Mono'", "monospace"],
        outfit: ["'Outfit'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
}