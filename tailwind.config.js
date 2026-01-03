/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores según mockups
        matcha: {
          50: '#d4e8d4',
          100: '#b8ddc6',
          200: '#9dd2b8',
          300: '#6faa6f',
          400: '#5a8f5a',
          500: '#5a8f5a', // Matcha principal
          600: '#4a7a4a',
          700: '#3a653a',
          800: '#2a502a',
          900: '#1a3a1a',
        },
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
        green: {
          50: '#d4e8d4',
          100: '#b8ddc6',
          200: '#9dd2b8',
          300: '#6faa6f',
          400: '#5a8f5a',
          500: '#5a8f5a',
          600: '#4a7a4a',
          700: '#3a653a',
          800: '#2a502a',
          900: '#1a3a1a',
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


