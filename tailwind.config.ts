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
        paper: {
          DEFAULT: "#f4ecd8",
          50: "#fbf8ef",
          100: "#f4ecd8",
          200: "#e8d9b4",
          300: "#d4be8e",
        },
        ink: {
          DEFAULT: "#2c2417",
          soft: "#5a4b32",
          muted: "#8a7b5f",
        },
        leaf: {
          DEFAULT: "#8a9a5b",
          dark: "#6b7a3f",
        },
        clay: {
          DEFAULT: "#8b6f47",
          dark: "#6a5535",
        },
        teal: {
          accent: "#1aa49a",
          dark: "#118a82",
        },
        sunset: {
          DEFAULT: "#e67e22",
          dark: "#c2691b",
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
