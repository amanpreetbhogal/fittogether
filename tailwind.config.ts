import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#141414",
        surface: "#1E1E1E",
        "surface-2": "#252525",
        accent: "#E8002D",
        "accent-hover": "#C4001F",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A0A0A0",
        border: "#2A2A2A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
