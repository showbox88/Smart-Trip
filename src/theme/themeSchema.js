/**
 * Theme Schema Validation
 *
 * Validates theme JSON before saving to DB or applying.
 * Ensures all required M3 color tokens are present and values are safe.
 */

import { SCHEMA_VERSION } from './themeDefaults';

// All 35 required M3 color keys
const REQUIRED_COLOR_KEYS = [
  'primary', 'primary-container', 'primary-dim',
  'on-primary', 'on-primary-container',
  'secondary', 'secondary-container', 'secondary-dim',
  'on-secondary', 'on-secondary-container',
  'tertiary', 'tertiary-container', 'tertiary-dim',
  'on-tertiary', 'on-tertiary-container',
  'error', 'error-container', 'error-dim',
  'on-error', 'on-error-container',
  'surface', 'surface-variant', 'surface-dim', 'surface-bright', 'surface-tint',
  'surface-container', 'surface-container-low', 'surface-container-high',
  'surface-container-lowest', 'surface-container-highest',
  'on-surface', 'on-surface-variant',
  'background', 'on-background',
  'outline', 'outline-variant',
  'inverse-surface', 'inverse-on-surface', 'inverse-primary',
];

// CSS color value patterns (safe values only)
const COLOR_PATTERNS = [
  /^#[0-9a-fA-F]{3,8}$/,                           // hex
  /^rgba?\(\s*\d+/,                                  // rgb/rgba
  /^hsla?\(\s*\d+/,                                  // hsl/hsla
];

// Dangerous patterns (XSS prevention)
const DANGEROUS_PATTERNS = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /<script/i,
  /import\s/i,
];

/**
 * Validate a single CSS value string for safety
 */
function isValidCSSValue(value) {
  if (typeof value !== 'string') return false;
  if (value.length > 500) return false;
  return !DANGEROUS_PATTERNS.some(p => p.test(value));
}

/**
 * Validate a color value
 */
function isValidColor(value) {
  if (typeof value !== 'string') return false;
  if (!isValidCSSValue(value)) return false;
  return COLOR_PATTERNS.some(p => p.test(value));
}

/**
 * Validate a theme JSON object
 * @param {object} theme - Theme object to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTheme(theme) {
  const errors = [];

  // Schema version
  if (!theme.schemaVersion) {
    errors.push('Missing schemaVersion');
  } else if (theme.schemaVersion > SCHEMA_VERSION) {
    errors.push(`Unsupported schema version: ${theme.schemaVersion} (max: ${SCHEMA_VERSION})`);
  }

  // Name
  if (!theme.name || typeof theme.name !== 'string') {
    errors.push('Missing or invalid theme name');
  } else if (theme.name.length > 100) {
    errors.push('Theme name too long (max 100 chars)');
  }

  // Colors
  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push('Missing colors object');
  } else {
    for (const key of REQUIRED_COLOR_KEYS) {
      if (!theme.colors[key]) {
        errors.push(`Missing required color: ${key}`);
      } else if (!isValidColor(theme.colors[key])) {
        errors.push(`Invalid color value for "${key}": ${theme.colors[key]}`);
      }
    }
  }

  // Extended (optional but validated if present)
  if (theme.extended) {
    validateExtended(theme.extended, errors);
  }

  // Typography (optional)
  if (theme.typography) {
    for (const [key, value] of Object.entries(theme.typography)) {
      if (!isValidCSSValue(value)) {
        errors.push(`Invalid typography value for "${key}"`);
      }
    }
  }

  // Shape (optional)
  if (theme.shape) {
    for (const [key, value] of Object.entries(theme.shape)) {
      if (!isValidCSSValue(value)) {
        errors.push(`Invalid shape value for "${key}"`);
      }
    }
  }

  // Layout (optional but validated if present)
  if (theme.layout) {
    validateLayout(theme.layout, errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate extended tokens (status, transit, hotel, etc.)
 */
function validateExtended(extended, errors) {
  const nestedGroups = ['glass', 'shadow', 'status', 'transit', 'hotel', 'category'];
  for (const group of nestedGroups) {
    if (extended[group] && typeof extended[group] === 'object') {
      for (const [key, value] of Object.entries(extended[group])) {
        if (!isValidCSSValue(value)) {
          errors.push(`Invalid extended.${group}.${key} value`);
        }
      }
    }
  }
  // Validate flat string values
  if (extended.textMuted && !isValidCSSValue(extended.textMuted)) {
    errors.push('Invalid extended.textMuted value');
  }
  if (extended.timelineDefault && !isValidCSSValue(extended.timelineDefault)) {
    errors.push('Invalid extended.timelineDefault value');
  }
}

// ── Layout Variant Validation ──
const VALID_LAYOUT_VARIANTS = ['glass', 'clean', 'mobile'];
const VALID_ELEVATIONS = ['none', 'sm', 'md'];
const VALID_DOT_STYLES = ['filled', 'hollow'];
const VALID_LINE_STYLES = ['dashed', 'solid'];
const VALID_TRANSIT_DISPLAYS = ['collapsible', 'inline'];
const VALID_NAV_POSITIONS = ['top', 'bottom'];
const VALID_NAV_STYLES = ['glass', 'flat'];
const VALID_HEADER_STYLES = ['sticky-bar', 'transparent', 'hero'];

function validateLayout(layout, errors) {
  if (layout.variant && !VALID_LAYOUT_VARIANTS.includes(layout.variant)) {
    errors.push(`Invalid layout.variant: "${layout.variant}" (expected: ${VALID_LAYOUT_VARIANTS.join(', ')})`);
  }
  if (layout.card) {
    if (layout.card.elevation && !VALID_ELEVATIONS.includes(layout.card.elevation)) {
      errors.push(`Invalid layout.card.elevation: "${layout.card.elevation}"`);
    }
  }
  if (layout.timeline) {
    if (layout.timeline.dotStyle && !VALID_DOT_STYLES.includes(layout.timeline.dotStyle)) {
      errors.push(`Invalid layout.timeline.dotStyle: "${layout.timeline.dotStyle}"`);
    }
    if (layout.timeline.lineStyle && !VALID_LINE_STYLES.includes(layout.timeline.lineStyle)) {
      errors.push(`Invalid layout.timeline.lineStyle: "${layout.timeline.lineStyle}"`);
    }
    if (layout.timeline.dotSize && !isValidCSSValue(layout.timeline.dotSize)) {
      errors.push('Invalid layout.timeline.dotSize value');
    }
    if (layout.timeline.lineWidth && !isValidCSSValue(layout.timeline.lineWidth)) {
      errors.push('Invalid layout.timeline.lineWidth value');
    }
  }
  if (layout.transit) {
    if (layout.transit.display && !VALID_TRANSIT_DISPLAYS.includes(layout.transit.display)) {
      errors.push(`Invalid layout.transit.display: "${layout.transit.display}"`);
    }
  }
  if (layout.navigation) {
    if (layout.navigation.position && !VALID_NAV_POSITIONS.includes(layout.navigation.position)) {
      errors.push(`Invalid layout.navigation.position: "${layout.navigation.position}"`);
    }
    if (layout.navigation.style && !VALID_NAV_STYLES.includes(layout.navigation.style)) {
      errors.push(`Invalid layout.navigation.style: "${layout.navigation.style}"`);
    }
  }
  if (layout.header) {
    if (layout.header.style && !VALID_HEADER_STYLES.includes(layout.header.style)) {
      errors.push(`Invalid layout.header.style: "${layout.header.style}"`);
    }
  }
}

export { REQUIRED_COLOR_KEYS };
