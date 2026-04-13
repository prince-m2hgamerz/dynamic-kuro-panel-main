import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Bebas Neue", "Orbitron", "sans-serif"],
        heading: ["Orbitron", "sans-serif"],
        sans: ["General Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["Fragment Mono", "monospace"],
        "general-sans": ["General Sans", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // GTA VI Neon colors
        neon: {
          pink: "#ff1b8d",
          cyan: "#00f0ff",
          orange: "#ff6b2b",
          purple: "#8000ff",
          yellow: "#ffcc00",
        },
        // Vice City palette
        vice: {
          sunset: "#ff6b2b",
          palm: "#1a0a20",
          ocean: "#00f0ff",
          flamingo: "#ff1b8d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "neon-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(330 100% 55% / 0.4), 0 0 40px hsl(330 100% 55% / 0.2)" 
          },
          "50%": { 
            boxShadow: "0 0 30px hsl(330 100% 55% / 0.6), 0 0 60px hsl(330 100% 55% / 0.4)" 
          },
        },
        "glow-wave": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "palm-sway": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-in-left": "slide-in-left 0.3s ease-out forwards",
        shimmer: "shimmer 3s linear infinite",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "glow-wave": "glow-wave 4s ease infinite",
        float: "float 6s ease-in-out infinite",
        "palm-sway": "palm-sway 8s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gta-sunset": "linear-gradient(180deg, hsl(280 60% 15%) 0%, hsl(300 50% 20%) 20%, hsl(330 60% 35%) 40%, hsl(20 80% 50%) 60%, hsl(40 90% 60%) 80%, hsl(45 95% 70%) 100%)",
        "gta-night": "linear-gradient(180deg, hsl(270 60% 8%) 0%, hsl(280 50% 12%) 30%, hsl(300 40% 18%) 60%, hsl(330 50% 25%) 100%)",
        "neon-gradient": "linear-gradient(135deg, #ff1b8d 0%, #8000ff 50%, #00f0ff 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
