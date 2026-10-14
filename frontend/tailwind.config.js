/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta verde: #0F2A1D · #375534 · #6B9071 · #AEC3B0 · #E3EED4
        // brand = color de marca y acciones principales (600 = #375534)
        brand: {
          50: '#F3F8EA',
          100: '#E3EED4',
          200: '#CBDCC9',
          300: '#AEC3B0',
          400: '#8CAA8F',
          500: '#6B9071',
          600: '#375534',
          700: '#2B4429',
          800: '#1D3524',
          900: '#0F2A1D',
        },
        // ink = superficies, bordes y texto, en verdes de la misma paleta
        ink: {
          50: '#F3F7EC',
          100: '#E3EED4',
          200: '#CFDCC7',
          300: '#AEC3B0',
          400: '#7D9582',
          500: '#566E5A',
          600: '#425A46',
          700: '#2E4533',
          800: '#1B3325',
          900: '#0F2A1D',
        },
        // LEDs del locker (mismos colores que el prototipo físico)
        led: {
          free: '#2f7dff',
          busy: '#e5484d',
          service: '#f5a524',
          ok: '#17a56b',
        },
      },
      boxShadow: {
        pop: '0 12px 32px -8px rgb(15 42 29 / 0.35)',
      },
      keyframes: {
        'slide-in': {
          '0%': { opacity: 0, transform: 'translateX(16px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'led-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.35 },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.22s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'led-pulse': 'led-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
