/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF3C00",
        ink: "#000000",
        success: "#22C55E",
        danger: "#EF4444",
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ['"Barlow"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
