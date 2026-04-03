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
const migrations = {
  // Example for future use:
  // 1: (theme) => {
  //   // v1 → v2: add new token "accent-hover"
  //   return {
  //     ...theme,
  //     schemaVersion: 2,
  //     colors: {
  //       ...theme.colors,
  //       'accent-hover': theme.colors.primary || '#2563eb',
  //     },
  //   };
  // },
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
