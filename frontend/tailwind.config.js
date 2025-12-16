/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ML-themed colors
        'ml-blue': {
          50: '#e6f4ff',
          100: '#bae0ff',
          200: '#91caff',
          300: '#69b1ff',
          400: '#4096ff',
          500: '#1677ff',
          600: '#0958d9',
          700: '#003eb3',
          800: '#002c8c',
          900: '#001d66',
        },
        'ml-red': {
          50: '#fff1f0',
          100: '#ffccc7',
          200: '#ffa39e',
          300: '#ff7875',
          400: '#ff4d4f',
          500: '#f5222d',
          600: '#cf1322',
          700: '#a8071a',
          800: '#820014',
          900: '#5c0011',
        },
        'ml-gold': {
          50: '#fffbe6',
          100: '#fff1b8',
          200: '#ffe58f',
          300: '#ffd666',
          400: '#ffc53d',
          500: '#faad14',
          600: '#d48806',
          700: '#ad6800',
          800: '#874d00',
          900: '#613400',
        },
        'ml-dark': {
          50: '#f5f5f5',
          100: '#e8e8e8',
          200: '#d9d9d9',
          300: '#bfbfbf',
          400: '#8c8c8c',
          500: '#595959',
          600: '#434343',
          700: '#262626',
          800: '#1f1f1f',
          900: '#141414',
        },
      },
      backgroundImage: {
        'ml-gradient': 'linear-gradient(135deg, #1a1c2e 0%, #2d1b4e 50%, #1a2744 100%)',
        'draft-blue': 'linear-gradient(180deg, rgba(22, 119, 255, 0.1) 0%, rgba(22, 119, 255, 0.05) 100%)',
        'draft-red': 'linear-gradient(180deg, rgba(245, 34, 45, 0.1) 0%, rgba(245, 34, 45, 0.05) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(22, 119, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 119, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
