import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // GoToStudio palette — token NAMES kept so the whole app reskins at once.
        // paper = surfaces (page bg / cards), ink = teal text, teal = primary,
        // sunset = gold secondary, leaf = success, clay = muted labels.
        paper: {
          DEFAULT: "#eef6f2", // mint page background
          50: "#ffffff",      // white glass cards
          100: "#eef6f2",
          200: "#dce8e3",     // soft mint border
          300: "#c3d8d1",
        },
        ink: {
          DEFAULT: "#00403f", // deep teal text
          soft: "#3f6b6b",    // muted teal
          muted: "#6b8f8f",
        },
        leaf: {
          DEFAULT: "#1b9e5f", // success green
          dark: "#15803d",
        },
        clay: {
          DEFAULT: "#5f8a8a", // muted teal-gray labels/kickers
          dark: "#3f6b6b",
        },
        teal: {
          accent: "#0e9aa0", // vivid teal for icons / active states
          dark: "#006a6a",   // primary brand teal
        },
        sunset: {
          DEFAULT: "#e2b203", // gold secondary accent
          dark: "#c28800",
        },
      },
      fontFamily: {
        hand: ["var(--font-hand)", "cursive"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      rotate: {
        "1.5": "1.5deg",
        "-1.5": "-1.5deg",
      },
    },
  },
  plugins: [],
};
export default config;
