import type { Config } from 'tailwindcss'

// Tokens are defined as space-separated RGB channels on :root (see index.css)
// and referenced here through rgb(... / <alpha-value>) so Tailwind's opacity
// modifiers (e.g. bg-primary/90) keep working.
const t = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Spec tokens ----
        surface: {
          DEFAULT: t('--surface'),
          sidebar: t('--surface-sidebar'),
          muted: t('--surface-muted'),
        },
        track: t('--track'),
        border: {
          DEFAULT: t('--border'),
          subtle: t('--border-subtle'),
        },
        tertiary: t('--text-tertiary'),
        success: {
          DEFAULT: t('--success'),
          bg: t('--success-bg'),
        },
        danger: t('--danger'),

        // ---- Back-compat aliases (existing components) mapped to spec tokens ----
        background: t('--surface'),
        foreground: t('--text'),
        input: t('--border'),
        ring: t('--text'),
        card: {
          DEFAULT: t('--surface'),
          foreground: t('--text'),
        },
        muted: {
          DEFAULT: t('--surface-muted'),
          foreground: t('--text-secondary'),
        },
        // Primary = the spec's dark --accent (primary buttons, selected pills/toggles).
        primary: {
          DEFAULT: t('--accent'),
          foreground: t('--surface'),
          hover: t('--accent-hover'),
        },
        secondary: {
          DEFAULT: t('--surface'),
          foreground: t('--text'),
        },
        // Tailwind `accent` stays a LIGHT hover surface so existing
        // hover:bg-accent usages don't turn dark.
        accent: {
          DEFAULT: t('--surface-muted'),
          foreground: t('--text'),
        },
        destructive: {
          DEFAULT: t('--danger'),
          foreground: t('--surface'),
        },
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '12px',
        '2xl': '16px',
        full: '999px',
      },
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
