import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        thai: ["var(--font-sarabun)", "system-ui", "sans-serif"],
        heading: ["var(--font-cinzel)", "var(--font-sarabun)", "serif"],
      },
      colors: {
        slate: {
          50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4",
          400: "#a3a3a3", 500: "#888888", 600: "#626262", 700: "#3a3a3a",
          800: "#292929", 900: "#171717", 950: "#090909",
        },
        amber: {
          50: "#ffffff", 100: "#fafafa", 200: "#f5f5f5", 300: "#eeeeee",
          400: "#e5e5e5", 500: "#ffffff", 600: "#d4d4d4", 700: "#a3a3a3",
          800: "#737373", 900: "#404040", 950: "#171717",
        },
        sky: { 300: "#e5e5e5", 400: "#d4d4d4", 500: "#a3a3a3", 600: "#737373", 900: "#262626", 950: "#111111" },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        gold: {
          400: "#f6c453",
          500: "#e5a93b",
          600: "#c78627",
        },
        crimson: {
          500: "#e53e3e",
          600: "#c53030",
          700: "#9b2c2c",
          900: "#501717",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
