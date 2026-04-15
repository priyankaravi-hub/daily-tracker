/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FDF8F0',
          100: '#F5E6CC',
          200: '#E8D4A8',
          300: '#DBBC85',
          400: '#C9A96A',
          500: '#B8944F',
          600: '#9A7A3E',
          700: '#7C6232',
          800: '#5E4A26',
          900: '#40321A',
        },
        navy: {
          50: '#F8F9FC',
          100: '#E2E5EB',
          200: '#C5CAD6',
          300: '#8891A5',
          400: '#5C657A',
          500: '#374151',
          600: '#1F2937',
          700: '#182033',
          800: '#141C2B',
          900: '#111827',
          950: '#0B1120',
        },
        accent: {
          50: '#FDF8F0',
          100: '#F5E6CC',
          200: '#E8D4A8',
          300: '#DBBC85',
          400: '#C9A96A',
          500: '#B8944F',
          600: '#9A7A3E',
          700: '#7C6232',
          800: '#5E4A26',
          900: '#40321A',
        },
        success: '#51cf66',
        warning: '#fcc419',
        danger: '#ff6b6b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(201, 169, 106, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(201, 169, 106, 0.6)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}
