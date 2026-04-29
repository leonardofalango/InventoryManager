/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#dd0e0e",
        accentHover: "#c00d0d",
        textPrimary: "#f7fafc",
        textSecondary: "#d1d5db",
        textAccent: "#ffffff",
      },
    },
  },
  plugins: [],
};
