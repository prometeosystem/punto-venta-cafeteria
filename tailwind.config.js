// Verde de la marca, derivado del pino del login y el sidebar. green y emerald
// apuntan a la misma escala para que no se cuele el verde brillante de Tailwind.
const verde = {
  50: '#eef4ef',
  100: '#e4efe6',
  200: '#c9dccb',
  300: '#a3c4ab',
  400: '#6f9a7b',
  500: '#3d6b4f',
  600: '#2c5342',
  700: '#24463a',
  800: '#1d3a2f',
  900: '#16291f',
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matcha: verde,
        green: verde,
        emerald: verde,
        coffee: {
          50: '#f5f0e8',
          100: '#e8ddd0',
          200: '#d4c4a8',
          300: '#b89a7a',
          400: '#8b6f47', // Café principal
          500: '#8b6f47',
          600: '#6d5638',
          700: '#4f3f29',
          800: '#2d2318', // Café oscuro
          900: '#1a150d',
        },
        // Verde oscuro del login, usado en el sidebar
        pino: {
          700: '#2a3a2d',
          800: '#1a241c',
          900: '#121a14',
        },
      },
      // Esquinas más rectas que la escala por defecto de Tailwind
      borderRadius: {
        DEFAULT: '0.1875rem',
        md: '0.25rem',
        lg: '0.3125rem',
        xl: '0.375rem',
        '2xl': '0.5rem',
        '3xl': '0.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
      },
    },
  },
  plugins: [],
}


