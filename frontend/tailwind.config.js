/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      colors: {
        indigo: {
          50: '#eef5ff',
          100: '#d8e8ff',
          200: '#b9d8ff',
          300: '#89beff',
          400: '#509bff',
          500: '#1A73E8', // User Requested Brand Button Color
          600: '#1A73E8', 
          700: '#155cb0', // Elegant Hover bg Color
          800: '#114a8f',
          900: '#0c102b', // Brand Deep Navy
          950: '#0c102b',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        'glow-primary': '0 0 20px 0 rgba(26, 115, 232, 0.15)',
        'brand': '0 8px 16px -2px rgba(26, 115, 232, 0.22)',
        'brand-hover': '0 12px 20px -2px rgba(26, 115, 232, 0.32)',
      }
    },
  },
  plugins: [],
}
