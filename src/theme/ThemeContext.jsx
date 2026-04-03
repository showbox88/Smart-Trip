/**
 * ThemeContext — React Context + Provider for theme management
 *
 * Provides:
 *   - currentTheme: active theme JSON object
 *   - themeId: active theme ID (or 'default')
 *   - isLoading: whether theme is being fetched from Supabase
 *   - setTheme(id): switch to a different theme by ID
 *   - applyCustomTheme(json): apply a theme JSON directly (preview/custom)
 *   - resetTheme(): revert to default
 */

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_THEME } from './themeDefaults';
import { validateTheme } from './themeSchema';
import { applyTheme, clearTheme } from './themeUtils';
import {
  getCachedTheme,
  setCachedTheme,
  clearCachedTheme,
  fetchActiveThemeId,
  fetchThemeById,
  saveActiveThemeId,
} from './themeStorage';
import { PRESET_THEMES } from './presetThemes';

export const ThemeContext = createContext(null);

/** Look up a preset theme by its short ID (e.g. 'ocean', 'clean') */
function findPresetById(id) {
  return PRESET_THEMES.find(p => p.id === id);
}

/** Fire-and-forget: persist preset theme to Supabase themes table */
async function persistPresetToSupabase(supabase, userId, themeJson) {
  try {
    // Reuse a single "_user_active" row per user
    const { data: existing } = await supabase
      .from('themes')
      .select('id')
      .eq('author_id', userId)
      .eq('name', '_user_active')
      .maybeSingle();

    let dbId;
    if (existing) {
      await supabase.from('themes')
        .update({ theme_data: themeJson, schema_version: themeJson.schemaVersion || 2 })
        .eq('id', existing.id);
      dbId = existing.id;
    } else {
      const { data } = await supabase.from('themes')
        .insert({
          author_id: userId,
          name: '_user_active',
          description: 'User active theme preference',
          schema_version: themeJson.schemaVersion || 2,
          theme_data: themeJson,
          is_public: false,
        })
        .select('id')
        .single();
      dbId = data?.id;
    }
    if (dbId) saveActiveThemeId(supabase, userId, dbId);
  } catch {
    // silently fail — localStorage cache serves as fallback
  }
}

export function ThemeProvider({ children, supabase, userId }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Synchronous: read from localStorage to prevent FOUC
    const { theme } = getCachedTheme();
    if (theme) {
      const { valid } = validateTheme(theme);
      if (valid) return theme;
    }
    return DEFAULT_THEME;
  });

  const [themeId, setThemeId] = useState(() => {
    const { themeId: cached } = getCachedTheme();
    return cached || 'default';
  });

  const [isLoading, setIsLoading] = useState(false);

  // Apply theme on initial mount (from cache or default)
  useEffect(() => {
    applyTheme(currentTheme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync with Supabase when user is authenticated
  useEffect(() => {
    if (!supabase || !userId) return;

    let cancelled = false;

    async function syncFromSupabase() {
      setIsLoading(true);
      try {
        const remoteThemeId = await fetchActiveThemeId(supabase, userId);
        if (cancelled || !remoteThemeId || remoteThemeId === themeId) return;

        const remoteTheme = await fetchThemeById(supabase, remoteThemeId);
        if (cancelled || !remoteTheme) return;

        const { valid } = validateTheme(remoteTheme);
        if (!valid) return;

        applyTheme(remoteTheme);
        setCurrentTheme(remoteTheme);
        setThemeId(remoteThemeId);
        setCachedTheme(remoteThemeId, remoteTheme);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    syncFromSupabase();
    return () => { cancelled = true; };
  }, [supabase, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch to a theme by ID (fetch from Supabase)
  const setThemeById = useCallback(async (newThemeId) => {
    if (!supabase) return;

    setIsLoading(true);
    try {
      const themeData = await fetchThemeById(supabase, newThemeId);
      if (!themeData) return;

      const { valid, errors } = validateTheme(themeData);
      if (!valid) {
        console.warn('[Theme] Invalid theme:', errors);
        return;
      }

      applyTheme(themeData);
      setCurrentTheme(themeData);
      setThemeId(newThemeId);
      setCachedTheme(newThemeId, themeData);

      // Persist selection to Supabase
      if (userId) {
        saveActiveThemeId(supabase, userId, newThemeId);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId]);

  // Apply a theme JSON directly (for preview or custom themes)
  const applyCustomTheme = useCallback((themeJson) => {
    const { valid, errors } = validateTheme(themeJson);
    if (!valid) {
      console.warn('[Theme] Invalid custom theme:', errors);
      return false;
    }
    applyTheme(themeJson);
    setCurrentTheme(themeJson);
    setThemeId('custom');
    setCachedTheme('custom', themeJson);
    return true;
  }, []);

  // Apply a preset theme by ID — persists to localStorage + Supabase
  const applyPresetTheme = useCallback((presetId, themeJson) => {
    const { valid, errors } = validateTheme(themeJson);
    if (!valid) {
      console.warn('[Theme] Invalid preset theme:', errors);
      return false;
    }
    applyTheme(themeJson);
    setCurrentTheme(themeJson);
    setThemeId(presetId);
    setCachedTheme(presetId, themeJson);

    // Persist to Supabase in background
    if (supabase && userId) {
      persistPresetToSupabase(supabase, userId, themeJson);
    }
    return true;
  }, [supabase, userId]);

  // Reset to default theme
  const resetTheme = useCallback(() => {
    clearTheme();
    applyTheme(DEFAULT_THEME);
    setCurrentTheme(DEFAULT_THEME);
    setThemeId('default');
    clearCachedTheme();

    if (supabase && userId) {
      saveActiveThemeId(supabase, userId, null);
    }
  }, [supabase, userId]);

  const value = useMemo(() => ({
    currentTheme,
    themeId,
    isLoading,
    setTheme: setThemeById,
    applyCustomTheme,
    applyPresetTheme,
    resetTheme,
  }), [currentTheme, themeId, isLoading, setThemeById, applyCustomTheme, applyPresetTheme, resetTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
