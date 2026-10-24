/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: { 'slide-down': { from: { transform: 'translateY(-120%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } } },
      animation: { 'slide-down': 'slide-down 400ms ease-out' },
    },
  },
  plugins: [],
};
