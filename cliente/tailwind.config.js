/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // Tag colors are chosen at runtime from TAG_COLOR_PALETTE (tagColors.js) and
  // interpolated into `bg-${color}` class names, which Tailwind's static
  // scanner can't see — safelist keeps these classes in the generated CSS.
  safelist: [
    "bg-blue-500", "bg-purple-500", "bg-red-500", "bg-green-500", "bg-yellow-500", "bg-orange-500",
    "bg-pink-500", "bg-indigo-500", "bg-cyan-500", "bg-gray-700", "bg-red-600", "bg-stone-500",
    "bg-emerald-600", "bg-red-700", "bg-teal-500", "bg-lime-600", "bg-amber-600", "bg-violet-600",
    "bg-rose-600", "bg-sky-600",
  ],
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
