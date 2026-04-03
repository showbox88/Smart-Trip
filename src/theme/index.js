/**
 * Theme System — Barrel Export
 *
 * Import everything from '@/theme' or '../theme'
 */

export { ThemeProvider, ThemeContext } from './ThemeContext';
export { useTheme } from './useTheme';
export { DEFAULT_THEME, SCHEMA_VERSION } from './themeDefaults';
export { validateTheme, REQUIRED_COLOR_KEYS } from './themeSchema';
export { applyTheme, clearTheme, getPreviewColors, deepMerge } from './themeUtils';
export { migrateTheme } from './themeMigrations';
export { STATUS_COLORS, TRANSIT_COLORS, HOTEL_COLORS, CATEGORY_COLORS, M3 } from './semanticColors';
export { PRESET_THEMES, OCEAN, SAKURA, FOREST, EMBER, MIDNIGHT, CLEAN, BLOSSOM } from './presetThemes';
export {
  getCachedTheme,
  setCachedTheme,
  clearCachedTheme,
  fetchActiveThemeId,
  fetchThemeById,
  saveActiveThemeId,
  saveTheme,
  fetchPublicThemes,
} from './themeStorage';
