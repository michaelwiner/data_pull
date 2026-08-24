import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-assistant)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#12151c",
          muted: "#5b6472",
          faint: "#8b94a3",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f4f6fa",
          raised: "#ffffff",
        },
        line: "#e3e7ee",
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6ef5",
          600: "#2b56d4",
          700: "#2244ab",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,21,28,.06), 0 4px 16px rgba(18,21,28,.06)",
      },
    },
  },
  plugins: [],
};

export default config;
