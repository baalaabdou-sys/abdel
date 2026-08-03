import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF7F1",
        surface: "#FFFDFC",
        espresso: "#2B1B13",
        coffee: "#523426",
        gold: "#C5902D",
        "gold-dark": "#A97418",
        muted: "#81766D",
        border: "#E8DDD0",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(43, 27, 19, 0.15)",
        card: "0 6px 20px -8px rgba(43, 27, 19, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
