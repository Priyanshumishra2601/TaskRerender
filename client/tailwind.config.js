/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(60,64,67,0.08), 0 2px 8px rgba(60,64,67,0.06)",
        card: "0 1px 3px rgba(60,64,67,0.12), 0 4px 12px rgba(60,64,67,0.08)",
      },
    },
  },
  plugins: [],
};
