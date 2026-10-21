/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0f1b2d', 700: '#33425b', 500: '#5b6b84', 300: '#a9b4c6', 100: '#e8ecf3', 50: '#f5f7fb' },
        brand: { 50: '#eef4ff', 100: '#dbe7ff', 500: '#2f6bff', 600: '#1f55e0', 700: '#1a44b8' },
        saffron: { 50: '#fff6e8', 500: '#f08a00', 600: '#c96f00' },
        ok: { 50: '#e9f8ef', 600: '#14804a' },
        bad: { 50: '#fdecec', 600: '#c62828' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        deva: ['"Noto Sans Devanagari"', '"Mangal"', '"Nirmala UI"', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(15,27,45,.06), 0 8px 24px rgba(15,27,45,.06)' },
    },
  },
  plugins: [],
};
