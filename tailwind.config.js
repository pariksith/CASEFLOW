/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f8f8f8",
          100: "#efefef",
          200: "#e1e1e1",
          300: "#c8c8c8",
          400: "#a8a8a8",
          500: "#7f7f7f",
          600: "#5f5f5f",
          700: "#474747",
          800: "#2d2d2d",
          900: "#151515",
        },
        legal: {
          gold: "#3f3f46",
          cream: "#fafafa",
          dark: "#09090b",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
