/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        mystic: {
          950: '#08020D',
          900: '#0F0518',
          800: '#1A0B2E',
          700: '#2D1B4E',
          600: '#432C7A',
          500: '#5B3EA8',
          400: '#7652D6',
          300: '#9E7CEC',
          200: '#C4A7FF',
          100: '#E0D4FF',
          50:  '#F2ECFF'
        },
        gold: {
          400: '#FFD700',
          500: '#DAA520',
          600: '#B8860B',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
  },
  plugins: [],
}
