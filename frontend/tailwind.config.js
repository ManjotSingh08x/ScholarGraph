/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', 
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: '#39FF14',
        scholarBlue: '#2563eb',
      },
    },
  },
  plugins: [],
}