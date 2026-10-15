import colors from 'tailwindcss/colors'

// Los tonos de la marca salen de variables CSS (src/marcas/<marca>/paleta.css),
// así cada marca pinta la app con su paleta sin tocar las clases.
const variable = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`
const escala = (nombre, tonos) =>
  Object.fromEntries(tonos.map((t) => [t, variable(`${nombre}-${t}`)]))

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Paleta cerrada: lo que no está aquí no genera clases, para que no se
    // vuelvan a colar tonos casi iguales (slate junto a gray, yellow junto a amber).
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: colors.white,
      black: colors.black,
      gray: colors.gray,
      red: colors.red,
      amber: colors.amber,
      blue: colors.blue,
      purple: colors.purple,
      marca: escala('marca', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
      // Fondo del sidebar y del login
      oscuro: escala('oscuro', [700, 800, 900]),
      acento: {
        DEFAULT: variable('acento'),
        claro: variable('acento-claro'),
      },
    },
    extend: {
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
