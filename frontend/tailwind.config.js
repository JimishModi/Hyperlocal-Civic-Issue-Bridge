/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Primary: Deep Navy ── */
        primary: {
          DEFAULT: '#091426',
          container: '#1e293b',
          fixed: '#d8e3fb',
          'fixed-dim': '#bcc7de',
        },
        /* ── Secondary: Emerald Green ── */
        secondary: {
          DEFAULT: '#006c49',
          container: '#6cf8bb',
        },
        /* ── Tertiary: Warning Amber ── */
        tertiary: {
          DEFAULT: '#201100',
          container: '#3c2300',
        },
        /* ── Surface system ── */
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#cbdbf5',
          bright: '#f8f9ff',
          container: {
            lowest: '#ffffff',
            low: '#eff4ff',
            DEFAULT: '#e5eeff',
            high: '#dce9ff',
            highest: '#d3e4fe',
          },
          variant: '#d3e4fe',
          tint: '#545f73',
        },
        /* ── On-colors (text/icon on top of the above) ── */
        'on-primary': '#ffffff',
        'on-primary-container': '#8590a6',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00714d',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#45474c',
        'on-background': '#0b1c30',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        /* ── Outline ── */
        outline: {
          DEFAULT: '#75777d',
          variant: '#c5c6cd',
        },
        /* ── Inverse ── */
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        'inverse-primary': '#bcc7de',
        /* ── Error ── */
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        /* ── Background ── */
        background: '#f8f9ff',

        /* ── Accent shortcuts from design system ── */
        accent: {
          green: '#10B981',
          amber: '#F59E0B',
          navy: '#1E293B',
          slate: '#64748B',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        'edge': '1.25rem',    /* 20px edge margin */
        'gutter': '1rem',     /* 16px gutter */
        'stack-sm': '0.5rem', /* 8px */
        'stack-md': '1rem',   /* 16px */
        'stack-lg': '2rem',   /* 32px */
      },
      maxWidth: {
        'app': '448px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(30, 41, 59, 0.04)',
        'elevated': '0 8px 32px rgba(30, 41, 59, 0.08)',
        'chat': '0 -4px 24px rgba(30, 41, 59, 0.12)',
      },
    },
  },
  plugins: [],
}
