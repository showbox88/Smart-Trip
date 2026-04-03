/**
 * Default Theme — Dark Glassmorphism
 *
 * This is the canonical default theme for Smart Trip.
 * It serves as:
 *   1. Fallback when no theme is loaded
 *   2. DB seed for the system default theme
 *   3. Template for user-created themes (all keys must be present)
 *
 * Schema follows Material Design 3 naming conventions.
 */

export const SCHEMA_VERSION = 2;

export const DEFAULT_THEME = {
  schemaVersion: SCHEMA_VERSION,
  name: 'Dark Glassmorphism',
  description: 'Default Smart Trip dark theme with frosted glass effects',
  author: 'system',

  colors: {
    // ── Primary ──
    'primary':                  '#3c83f6',
    'primary-container':        '#004c6a',
    'primary-dim':              '#2563eb',
    'primary-fixed':            '#2db7f2',
    'primary-fixed-dim':        '#05a9e3',
    'on-primary':               '#003549',
    'on-primary-container':     '#c4e7ff',
    'on-primary-fixed':         '#001e2d',
    'on-primary-fixed-variant': '#004c6a',

    // ── Secondary ──
    'secondary':                  '#ff8c42',
    'secondary-container':        '#504500',
    'secondary-dim':              '#e0742e',
    'secondary-fixed':            '#fcdf46',
    'secondary-fixed-dim':        '#e0c42e',
    'on-secondary':               '#373100',
    'on-secondary-container':     '#ffe070',
    'on-secondary-fixed':         '#211b00',
    'on-secondary-fixed-variant': '#504500',

    // ── Tertiary ──
    'tertiary':                  '#10b981',
    'tertiary-container':        '#005048',
    'tertiary-dim':              '#059669',
    'tertiary-fixed':            '#91feef',
    'tertiary-fixed-dim':        '#4ce0d1',
    'on-tertiary':               '#003731',
    'on-tertiary-container':     '#b0fff0',
    'on-tertiary-fixed':         '#00201c',
    'on-tertiary-fixed-variant': '#005048',

    // ── Error ──
    'error':                '#ef4444',
    'error-container':      '#93000a',
    'error-dim':            '#dc2626',
    'on-error':             '#690005',
    'on-error-container':   '#ffdad6',

    // ── Surface ──
    'surface':                    '#0d111b',
    'surface-variant':            '#1e293b',
    'surface-dim':                '#0a0e17',
    'surface-bright':             '#2a3548',
    'surface-tint':               '#3c83f6',
    'surface-container':          '#141927',
    'surface-container-low':      '#111520',
    'surface-container-high':     '#1e293b',
    'surface-container-lowest':   '#080b12',
    'surface-container-highest':  '#283343',

    // ── On-Surface & Background ──
    'on-surface':         '#f8fafc',
    'on-surface-variant': '#cbd5e1',
    'background':         '#0d111b',
    'on-background':      '#f8fafc',

    // ── Outline ──
    'outline':         'rgba(255, 255, 255, 0.08)',
    'outline-variant': 'rgba(255, 255, 255, 0.04)',

    // ── Inverse ──
    'inverse-surface':    '#e2e8f0',
    'inverse-on-surface': '#1e293b',
    'inverse-primary':    '#006286',
  },

  extended: {
    glass: {
      bg:   'rgba(255, 255, 255, 0.03)',
      nav:  'rgba(13, 17, 27, 0.8)',
      blur: 'blur(12px)',
    },
    shadow: {
      premium: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    },
    status: {
      ongoing:  '#3b82f6',
      upcoming: '#10b981',
      soon:     '#f59e0b',
      passed:   '#94a3b8',
    },
    transit: {
      flight: '#4FC3F7',
      train:  '#9E9E9E',
      bus:    '#FF8F00',
      ship:   '#1E88E5',
      drive:  '#3b82f6',
      walk:   '#10b981',
    },
    hotel: {
      checkin:  '#22c55e',
      checkout: '#ef4444',
      line:     '#f59e0b',
    },
    category: {
      food:       '#f97316',
      attraction: '#8b5cf6',
      nature:     '#10b981',
      shopping:   '#ec4899',
    },
    textMuted:        '#94a3b8',
    timelineDefault:  '#5b7a99',
  },

  typography: {
    headline: "'Manrope', 'Plus Jakarta Sans', sans-serif",
    body:     "'Manrope', 'Plus Jakarta Sans', 'Noto Sans SC', sans-serif",
    label:    "'Lexend', 'Plus Jakarta Sans', sans-serif",
  },

  shape: {
    cornerMedium:     '1rem',
    cornerLarge:      '2rem',
    cornerExtraLarge: '3rem',
    cornerFull:       '9999px',
  },

  // ── Layout Variant ──
  layout: {
    variant: 'glass',
    card: {
      flip:      true,
      elevation: 'none',
      backdrop:  true,
    },
    timeline: {
      dotSize:   '8px',
      dotStyle:  'filled',
      lineStyle: 'dashed',
      lineWidth: '2px',
    },
    transit: {
      display: 'collapsible',
    },
    navigation: {
      position: 'top',
      style:    'glass',
    },
    header: {
      style:    'sticky-bar',
      showHero: false,
    },
  },
};
