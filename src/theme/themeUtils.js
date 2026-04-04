/**
 * Theme Utilities
 *
 * Core functions for applying theme JSON → CSS custom properties
 * and generating preview data.
 */

import { DEFAULT_THEME } from './themeDefaults';

/**
 * Deep merge two objects (target wins over source for conflicts)
 */
function deepMerge(source, target) {
  const result = { ...source };
  for (const key of Object.keys(target)) {
    if (
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      source[key] &&
      typeof source[key] === 'object'
    ) {
      result[key] = deepMerge(source[key], target[key]);
    } else if (target[key] !== undefined) {
      result[key] = target[key];
    }
  }
  return result;
}

/**
 * Apply a theme JSON to the document root as CSS custom properties.
 * Missing tokens are filled from DEFAULT_THEME to prevent broken styles.
 *
 * @param {object} theme - Theme JSON object
 */
export function applyTheme(theme) {
  const merged = deepMerge(DEFAULT_THEME, theme);
  const root = document.documentElement;

  // ── M3 Color tokens ──
  if (merged.colors) {
    for (const [key, value] of Object.entries(merged.colors)) {
      root.style.setProperty(`--md-sys-color-${key}`, value);
    }
  }

  // ── Extended: Glass ──
  if (merged.extended?.glass) {
    root.style.setProperty('--st-glass-bg', merged.extended.glass.bg);
    root.style.setProperty('--st-glass-nav', merged.extended.glass.nav);
    root.style.setProperty('--st-glass-blur', merged.extended.glass.blur);
  }

  // ── Extended: Shadow ──
  if (merged.extended?.shadow) {
    root.style.setProperty('--st-shadow-premium', merged.extended.shadow.premium);
  }

  // ── Extended: Status ──
  if (merged.extended?.status) {
    for (const [key, value] of Object.entries(merged.extended.status)) {
      root.style.setProperty(`--st-color-status-${key}`, value);
    }
  }

  // ── Extended: Transit ──
  if (merged.extended?.transit) {
    for (const [key, value] of Object.entries(merged.extended.transit)) {
      root.style.setProperty(`--st-color-transit-${key}`, value);
    }
  }

  // ── Extended: Hotel ──
  if (merged.extended?.hotel) {
    for (const [key, value] of Object.entries(merged.extended.hotel)) {
      root.style.setProperty(`--st-color-hotel-${key}`, value);
    }
  }

  // ── Extended: Category ──
  if (merged.extended?.category) {
    for (const [key, value] of Object.entries(merged.extended.category)) {
      root.style.setProperty(`--st-color-category-${key}`, value);
    }
  }

  // ── Extended: Misc ──
  if (merged.extended?.textMuted) {
    root.style.setProperty('--st-color-text-muted', merged.extended.textMuted);
  }
  if (merged.extended?.timelineDefault) {
    root.style.setProperty('--st-color-timeline-default', merged.extended.timelineDefault);
  }

  // ── Typography ──
  if (merged.typography) {
    root.style.setProperty('--md-sys-typescale-headline-font', merged.typography.headline);
    root.style.setProperty('--md-sys-typescale-body-font', merged.typography.body);
    root.style.setProperty('--md-sys-typescale-label-font', merged.typography.label);
  }

  // ── Shape ──
  if (merged.shape) {
    root.style.setProperty('--md-sys-shape-corner-medium', merged.shape.cornerMedium);
    root.style.setProperty('--md-sys-shape-corner-large', merged.shape.cornerLarge);
    root.style.setProperty('--md-sys-shape-corner-extra-large', merged.shape.cornerExtraLarge);
    root.style.setProperty('--md-sys-shape-corner-full', merged.shape.cornerFull);
  }

  // ── Layout Variant ──
  const layout = merged.layout || {};
  const variant = layout.variant || 'glass';
  root.setAttribute('data-layout', variant);

  // ── Theme ID (for theme-specific CSS scoping) ──
  if (merged.name) {
    root.setAttribute('data-theme-id', merged.name.toLowerCase());
  }

  // Timeline tokens
  if (layout.timeline) {
    root.style.setProperty('--st-timeline-dot-size', layout.timeline.dotSize || '8px');
    root.style.setProperty('--st-timeline-dot-style', layout.timeline.dotStyle || 'filled');
    root.style.setProperty('--st-timeline-line-style', layout.timeline.lineStyle || 'dashed');
    root.style.setProperty('--st-timeline-line-width', layout.timeline.lineWidth || '2px');
  }

  // Card tokens
  if (layout.card) {
    root.style.setProperty('--st-card-elevation', layout.card.elevation || 'none');
  }
}

/**
 * Remove all theme custom properties from the document root
 * (restores to CSS-file-defined defaults)
 */
export function clearTheme() {
  const root = document.documentElement;
  const style = root.style;

  // Remove all --md-sys-* and --st-* inline properties
  const propsToRemove = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop.startsWith('--md-sys-') || prop.startsWith('--st-')) {
      propsToRemove.push(prop);
    }
  }
  propsToRemove.forEach(prop => style.removeProperty(prop));

  // Remove layout attribute
  root.removeAttribute('data-layout');
}

/**
 * Extract preview colors from a theme (for gallery thumbnails)
 * @param {object} theme
 * @returns {{ primary: string, surface: string, onSurface: string, secondary: string }}
 */
export function getPreviewColors(theme) {
  return {
    primary:   theme.colors?.primary   || DEFAULT_THEME.colors.primary,
    surface:   theme.colors?.surface   || DEFAULT_THEME.colors.surface,
    onSurface: theme.colors?.['on-surface'] || DEFAULT_THEME.colors['on-surface'],
    secondary: theme.colors?.secondary || DEFAULT_THEME.colors.secondary,
  };
}

export { deepMerge };
