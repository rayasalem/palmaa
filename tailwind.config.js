/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        palma: {
          primary: '#E10600',
          primaryHover: '#C20500',
          primaryLight: '#FFF5F5',
          primaryMuted: '#FEE2E2',
          navy: '#1E293B',
          darkNavy: '#0F172A',
          text: '#334155',
          muted: '#64748B',
          soft: '#F8FAFC',
          border: '#E2E8F0',
          accent: '#E10600',
          green: '#059669',
          success: '#059669',
          warning: '#D97706',
          error: '#DC2626'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)',
        'card': '0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.02)',
        'card-hover': '0 10px 25px -5px rgba(0,0,0,0.06), 0 4px 6px -2px rgba(0,0,0,0.03)',
        'glow': '0 0 0 1px rgba(225,6,0,0.05), 0 4px 14px -2px rgba(225,6,0,0.12)',
        'input': '0 0 0 3px rgba(225,6,0,0.08)',
        'inner-soft': 'inset 0 1px 2px 0 rgba(0,0,0,0.03)'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      }
    },
  },
  plugins: [],
}
