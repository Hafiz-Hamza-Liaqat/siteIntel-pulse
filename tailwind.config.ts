import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0B1220",
          card: "#111C35",
          surface: "#17233A",
          surfaceHover: "#1E2D4A",
          border: "#243456",
          borderSubtle: "#1B2A47",
          text: "#F8FAFC",
          textMuted: "#94A3B8",
          teal: "#0F9D91",
          tealLight: "#14B8A6",
          tealDark: "#0B736B",
          cyan: "#06B6D4",
        },
        status: {
          pass: "#10B981",
          passBg: "rgba(16, 185, 129, 0.12)",
          warning: "#F59E0B",
          warningBg: "rgba(245, 158, 11, 0.12)",
          fail: "#EF4444",
          failBg: "rgba(239, 68, 68, 0.12)",
          info: "#38BDF8",
          infoBg: "rgba(56, 189, 248, 0.12)",
          unknown: "#64748B",
          unknownBg: "rgba(100, 116, 139, 0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
