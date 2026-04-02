/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#F8F7FF',
          100: '#F0EEFF',
          200: '#E0DBFF',
          300: '#C4B5FD',
        },
        primary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          light: '#8B5CF6',
          50: '#F5F3FF',
        },
        sidebar: '#1E1B2E',
      },
    },
  },
  plugins: [],
};
