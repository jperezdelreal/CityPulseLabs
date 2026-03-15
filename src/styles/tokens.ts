/**
 * Design tokens for BiciCoruña
 * Color palette, typography, spacing, and component styles
 */

export const colors = {
  // Brand colors (A Coruña coastal theme)
  primary: '#0D9A5E', // Bike green (sustainable/eco)
  primaryDark: '#0A7647',
  primaryLight: '#1ECC6F',

  secondary: '#0066CC', // Ocean blue
  secondaryDark: '#004699',
  secondaryLight: '#3385FF',

  // Station availability status
  availability: {
    good: '#10B981', // Green (>50% bikes available)
    limited: '#F59E0B', // Amber (25-50% bikes available)
    empty: '#EF4444', // Red (<25% bikes available)
    full: '#EF4444', // Red (no docks available)
    offline: '#9CA3AF', // Gray (station offline)
  },

  // Route visualization
  route: {
    bike: '#0D9A5E', // Solid green for bike segments
    walk: '#0066CC', // Dashed blue for walk segments
  },

  // Neutral palette
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
  },

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0066CC',

  // Dark mode
  dark: {
    bg: '#1F2937',
    surface: '#111827',
    text: '#F3F4F6',
    muted: '#9CA3AF',
  },
};

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, sans-serif',
    mono: '"Menlo", "Monaco", monospace',
  },
  fontSize: {
    xs: ['12px', { lineHeight: '1.5rem' }],
    sm: ['14px', { lineHeight: '1.5rem' }],
    base: ['16px', { lineHeight: '1.5rem' }],
    lg: ['18px', { lineHeight: '1.75rem' }],
    xl: ['20px', { lineHeight: '1.75rem' }],
    '2xl': ['24px', { lineHeight: '2rem' }],
    '3xl': ['30px', { lineHeight: '2.25rem' }],
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
};

export const breakpoints = {
  sm: '640px', // Mobile
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

export const borderRadius = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
};

export const transitions = {
  fast: '150ms',
  base: '250ms',
  slow: '350ms',
};
