import { colors, typography, spacing, breakpoints, shadows, borderRadius, transitions } from './src/styles/tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: colors.primary, // #0D9A5E
          600: '#16A34A',
          700: colors.primaryDark, // #0A7647
          800: '#15803D',
          900: '#166534',
        },
        secondary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: colors.secondary, // #0066CC
          600: '#2563EB',
          700: colors.secondaryDark, // #004699
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Status colors for station availability
        available: colors.availability.good,
        limited: colors.availability.limited,
        unavailable: colors.availability.empty,
        offline: colors.availability.offline,
      },
      fontFamily: {
        sans: typography.fontFamily.sans,
        mono: typography.fontFamily.mono,
      },
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      spacing,
      screens: {
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
      },
      boxShadow: shadows,
      borderRadius,
      transitionDuration: transitions,
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        spin: 'spin 1s linear infinite',
        fadeIn: 'fadeIn 300ms ease-in',
        slideUp: 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
