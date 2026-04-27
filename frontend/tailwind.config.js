/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        head: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        green: {
          50:  '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a',
          700: '#15803d', 800: '#166534', 900: '#14532d',
        },
        earth: {
          50:  '#fefce8', 100: '#fef9c3', 200: '#fef08a',
          400: '#facc15', 500: '#eab308', 600: '#ca8a04',
          800: '#713f12', 900: '#422006',
        },
        stone: {
          50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4',
          300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c',
          600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917',
        },
        rust: { DEFAULT: '#c2410c', light: '#fed7aa', dark: '#7c2d12' },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
