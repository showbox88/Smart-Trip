/**
 * Theme Storage Layer
 *
 * Handles localStorage caching and Supabase sync for theme persistence.
 * localStorage is used for instant load (no FOUC).
 * Supabase is the source of truth for cross-device sync.
 */

const LS_THEME_KEY = 'st-active-theme';
const LS_THEME_ID_KEY = 'st-active-theme-id';

// ── localStorage helpers ──────────────────────────────────

/**
 * Get cached theme from localStorage
 * @returns {{ themeId: string|null, theme: object|null }}
 */
export function getCachedTheme() {
  try {
    const themeId = localStorage.getItem(LS_THEME_ID_KEY);
    const raw = localStorage.getItem(LS_THEME_KEY);
    const theme = raw ? JSON.parse(raw) : null;
    return { themeId, theme };
  } catch {
    return { themeId: null, theme: null };
  }
}

/**
 * Cache theme to localStorage for instant load on next visit
 * @param {string} themeId
 * @param {object} theme
 */
export function setCachedTheme(themeId, theme) {
  try {
    localStorage.setItem(LS_THEME_ID_KEY, themeId);
    localStorage.setItem(LS_THEME_KEY, JSON.stringify(theme));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Clear cached theme from localStorage
 */
export function clearCachedTheme() {
  try {
    localStorage.removeItem(LS_THEME_KEY);
    localStorage.removeItem(LS_THEME_ID_KEY);
  } catch {
    // ignore
  }
}

// ── Supabase helpers ──────────────────────────────────────

/**
 * Fetch user's active theme ID from profiles table
 * @param {object} supabase - Supabase client
 * @param {string} userId
 * @returns {string|null} theme ID
 */
export async function fetchActiveThemeId(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('active_theme_id')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return data.active_theme_id;
  } catch {
    return null;
  }
}

/**
 * Fetch theme data by ID from themes table
 * @param {object} supabase - Supabase client
 * @param {string} themeId
 * @returns {object|null} theme JSON
 */
export async function fetchThemeById(supabase, themeId) {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, theme_data, schema_version')
      .eq('id', themeId)
      .single();
    if (error || !data) return null;
    return data.theme_data;
  } catch {
    return null;
  }
}

/**
 * Save user's active theme selection to Supabase
 * @param {object} supabase - Supabase client
 * @param {string} userId
 * @param {string} themeId
 */
export async function saveActiveThemeId(supabase, userId, themeId) {
  try {
    await supabase
      .from('profiles')
      .update({ active_theme_id: themeId })
      .eq('id', userId);
  } catch {
    // silently fail — localStorage cache serves as fallback
  }
}

/**
 * Save a new theme to the themes table
 * @param {object} supabase
 * @param {object} params - { authorId, name, description, themeData, isPublic }
 * @returns {{ id: string }|null}
 */
export async function saveTheme(supabase, { authorId, name, description, themeData, isPublic = false }) {
  try {
    const { data, error } = await supabase
      .from('themes')
      .insert({
        author_id: authorId,
        name,
        description,
        schema_version: themeData.schemaVersion || 1,
        theme_data: themeData,
        is_public: isPublic,
        preview_colors: {
          primary: themeData.colors?.primary,
          surface: themeData.colors?.surface,
          onSurface: themeData.colors?.['on-surface'],
        },
      })
      .select('id')
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch user's saved color overrides from profiles table
 * @param {object} supabase
 * @param {string} userId
 * @returns {object} e.g. { primary: '#adc6ff', background: '#0d1324' }
 */
export async function fetchThemeOverrides(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('theme_overrides')
      .eq('id', userId)
      .single();
    if (error || !data) return {};
    return data.theme_overrides || {};
  } catch {
    return {};
  }
}

/**
 * Save user's color overrides to profiles table
 * @param {object} supabase
 * @param {string} userId
 * @param {object} overrides - e.g. { primary: '#adc6ff' }
 */
export async function saveThemeOverrides(supabase, userId, overrides) {
  try {
    await supabase
      .from('profiles')
      .upsert({ id: userId, theme_overrides: overrides }, { onConflict: 'id' });
  } catch {
    // silently fail — localStorage cache serves as fallback
  }
}

/**
 * Fetch all public themes (for theme gallery)
 * @param {object} supabase
 * @param {number} limit
 * @returns {Array}
 */
export async function fetchPublicThemes(supabase, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('id, name, description, preview_colors, author_id, created_at')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data;
  } catch {
    return [];
  }
}
