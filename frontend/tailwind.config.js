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
        // Verde MALHÚ (#395941): color de marca y de las acciones principales
        brand: {
          50: '#f2f7f4',
          100: '#e3ede5',
          200: '#c7dccc',
          300: '#a1c4aa',
          400: '#72a77f',
          500: '#52845f',
          600: '#395941',
          700: '#2e4834',
          800: '#233828',
          900: '#1b2c20',
        },
        // Verde oscuro / tierra cálida: superficies, bordes y texto (acompaña el verde de marca)
        ink: {
          50: '#f6f5f2',
          100: '#eae7e0',
          200: '#d6d1c5',
          300: '#b3ac9b',
          400: '#8c8371',
          500: '#6b6455',
          600: '#514c40',
          700: '#3c382f',
          800: '#282520',
          900: '#1a1814',
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
        pop: '0 12px 32px -8px rgb(22 28 36 / 0.28)',
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
