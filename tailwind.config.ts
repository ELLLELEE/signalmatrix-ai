import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090f",
        panel: "#111827",
        line: "#253045",
        mint: "#41d6a3",
        amber: "#f8bf4c",
        rose: "#fb7185",
        cyan: "#38bdf8"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(65,214,163,0.22), 0 20px 70px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
