/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores para cafetería
        matcha: {
          50: '#f0f7f0',
          100: '#d9ede0',
          200: '#b8ddc6',
          300: '#8cc5a3',
          400: '#5fa67a',
          500: '#3d8b5f', // Matcha principal
          600: '#2d6f4c',
          700: '#25593e',
          800: '#204834',
          900: '#1c3c2c',
        },
        coffee: {
          50: '#faf7f4',
          100: '#f4ede4',
          200: '#e7d9c8',
          300: '#d6bfa3',
          400: '#c19f7a',
          500: '#a67f5a', // Café principal
          600: '#8b6647',
          700: '#71513a',
          800: '#5d4330',
          900: '#4d3828',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
      },
    },
  },
  plugins: [],
}

