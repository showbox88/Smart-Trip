/**
 * Semantic Color Constants
 *
 * Maps domain concepts to CSS variable references.
 * Use these in components instead of hardcoding hex colors.
 *
 * Usage:
 *   import { STATUS_COLORS } from '@/theme/semanticColors';
 *   style={{ color: STATUS_COLORS.ongoing }}
 */

// ── Trip Status Colors ────────────────────────────────────
export const STATUS_COLORS = {
  ongoing:  'var(--st-color-status-ongoing)',
  upcoming: 'var(--st-color-status-upcoming)',
  soon:     'var(--st-color-status-soon)',
  passed:   'var(--st-color-status-passed)',
};

// ── Transit Mode Colors ───────────────────────────────────
export const TRANSIT_COLORS = {
  flight: 'var(--st-color-transit-flight)',
  train:  'var(--st-color-transit-train)',
  bus:    'var(--st-color-transit-bus)',
  ship:   'var(--st-color-transit-ship)',
  drive:  'var(--st-color-transit-drive)',
  walk:   'var(--st-color-transit-walk)',
};

// ── Hotel Colors ──────────────────────────────────────────
export const HOTEL_COLORS = {
  checkin:  'var(--st-color-hotel-checkin)',
  checkout: 'var(--st-color-hotel-checkout)',
  line:     'var(--st-color-hotel-line)',
};

// ── POI Category Colors ───────────────────────────────────
export const CATEGORY_COLORS = {
  food:       'var(--st-color-category-food)',
  attraction: 'var(--st-color-category-attraction)',
  nature:     'var(--st-color-category-nature)',
  shopping:   'var(--st-color-category-shopping)',
};

// ── M3 Core (convenience shortcuts) ───────────────────────
export const M3 = {
  primary:          'var(--md-sys-color-primary)',
  primaryContainer: 'var(--md-sys-color-primary-container)',
  onPrimary:        'var(--md-sys-color-on-primary)',
  secondary:        'var(--md-sys-color-secondary)',
  tertiary:         'var(--md-sys-color-tertiary)',
  error:            'var(--md-sys-color-error)',
  surface:          'var(--md-sys-color-surface)',
  surfaceVariant:   'var(--md-sys-color-surface-variant)',
  onSurface:        'var(--md-sys-color-on-surface)',
  onSurfaceVariant: 'var(--md-sys-color-on-surface-variant)',
  outline:          'var(--md-sys-color-outline)',
  outlineVariant:   'var(--md-sys-color-outline-variant)',
  textMuted:        'var(--st-color-text-muted)',
};
