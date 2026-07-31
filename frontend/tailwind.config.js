/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        linkedin: {
          blue: '#0a66c2',
          hover: '#004182',
          light: '#e8f0fe',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#090d16',
        },
      },
    },
  },
  plugins: [],
};
