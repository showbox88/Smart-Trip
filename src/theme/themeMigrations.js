/**
 * Theme Schema Migrations
 *
 * When the token schema evolves (new tokens added, renamed, etc.),
 * migration functions upgrade older theme JSON objects to the latest schema.
 *
 * Each migration function takes a theme object and returns the upgraded version.
 */

import { SCHEMA_VERSION } from './themeDefaults';

/**
 * Registry of migration functions.
 * Key = source version, value = function that upgrades to next version.
 */
/** Default glass layout — injected into v1 themes during migration */
const DEFAULT_GLASS_LAYOUT = {
  variant: 'glass',
  card:       { flip: true, elevation: 'none', backdrop: true },
  timeline:   { dotSize: '8px', dotStyle: 'filled', lineStyle: 'dashed', lineWidth: '2px' },
  transit:    { display: 'collapsible' },
  navigation: { position: 'top', style: 'glass' },
  header:     { style: 'sticky-bar', showHero: false },
};

const migrations = {
  // v1 → v2: add layout variant system
  1: (theme) => ({
    ...theme,
    schemaVersion: 2,
    layout: theme.layout || { ...DEFAULT_GLASS_LAYOUT },
  }),
};

/**
 * Migrate a theme from its current schema version to the latest.
 * Returns the migrated theme (or the original if already up to date).
 *
 * @param {object} theme - Theme JSON with schemaVersion
 * @returns {{ theme: object, migrated: boolean }}
 */
export function migrateTheme(theme) {
  let current = { ...theme };
  let migrated = false;
  const startVersion = current.schemaVersion || 1;

  for (let v = startVersion; v < SCHEMA_VERSION; v++) {
    const migrateFn = migrations[v];
    if (migrateFn) {
      current = migrateFn(current);
      migrated = true;
    } else {
      // No migration defined for this version step — just bump version
      current.schemaVersion = v + 1;
    }
  }

  return { theme: current, migrated };
}
