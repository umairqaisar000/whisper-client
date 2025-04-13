import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        customGreen: {
          light: '#b3ffab',
          DEFAULT: '#00ff00',
          dark: '#00cc00'
        },
        customBlue: {
          light: '#99ccff',
          DEFAULT: '#3399ff',
          dark: '#0066cc'
        },
        customGray: {
          light: '#111827',
          DEFAULT: '#374151',
          dark: '#1F2937'
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in-out': 'fadeInOut 2s ease-in-out',
      },
      keyframes: {
        fadeInOut: {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
} satisfies Config;
