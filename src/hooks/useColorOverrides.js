/**
 * useColorOverrides
 *
 * Manages three distinct color states for theme customization:
 *  - presetColors  : original values from the active preset (reset target)
 *  - liveOverrides : real-time user edits applied to CSS, not yet saved
 *  - savedOverrides: explicitly saved by user — persisted to localStorage (cache)
 *                    AND Supabase profiles.theme_overrides (source of truth)
 *
 * On mount: loads from localStorage instantly, then syncs from Supabase if userId provided.
 * On save:  writes to both localStorage and Supabase.
 * On reset: clears both localStorage and Supabase.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PRESET_THEMES } from '../theme/presetThemes';
import { fetchThemeOverrides, saveThemeOverrides } from '../theme/themeStorage';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'st-color-overrides';

export const EDITABLE_COLORS = [
  { key: 'primary',           cssVar: '--md-sys-color-primary',           label: 'Primary' },
  { key: 'secondary',         cssVar: '--md-sys-color-secondary',         label: 'Secondary' },
  { key: 'tertiary',          cssVar: '--md-sys-color-tertiary',          label: 'Tertiary' },
  { key: 'background',        cssVar: '--md-sys-color-background',        label: 'Background' },
  { key: 'surface-container', cssVar: '--md-sys-color-surface-container', label: 'Surface' },
];

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function persistSaved(o) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
}
function setCssVar(cssVar, value) {
  document.documentElement.style.setProperty(cssVar, value);
}
function removeCssVar(cssVar) {
  document.documentElement.style.removeProperty(cssVar);
}
function applyOverridesToCss(overrides) {
  for (const { key, cssVar } of EDITABLE_COLORS) {
    if (overrides[key]) setCssVar(cssVar, overrides[key]);
  }
}

export function useColorOverrides(themeId, applyPresetFn, userId) {
  const [savedOverrides, setSavedOverrides] = useState(loadSaved);
  const [liveOverrides, setLiveOverrides] = useState(loadSaved);

  const presetColors = useMemo(() => {
    const preset = PRESET_THEMES.find(p => p.id === themeId);
    if (!preset) return {};
    const colors = preset.theme.colors || {};
    const result = {};
    for (const { key } of EDITABLE_COLORS) {
      result[key] = colors[key] || null;
    }
    return result;
  }, [themeId]);

  // On mount: apply localStorage cache immediately, then sync from Supabase
  useEffect(() => {
    const cached = loadSaved();
    applyOverridesToCss(cached);

    if (!userId) return;
    fetchThemeOverrides(supabase, userId).then((remote) => {
      if (!remote || !Object.keys(remote).length) return;
      // Remote is source of truth — update cache and apply
      persistSaved(remote);
      applyOverridesToCss(remote);
      setSavedOverrides(remote);
      setLiveOverrides(remote);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // When themeId changes: reload saved overrides and re-apply
  useEffect(() => {
    const saved = loadSaved();
    applyOverridesToCss(saved);
    setLiveOverrides(saved);
    setSavedOverrides(saved);
  }, [themeId]);

  // Change a color in real-time (no save)
  const handleColorChange = useCallback((colorDef, value) => {
    setCssVar(colorDef.cssVar, value);
    setLiveOverrides(prev => ({ ...prev, [colorDef.key]: value }));
  }, []);

  // Save current live overrides to localStorage + Supabase
  const handleSave = useCallback(() => {
    persistSaved(liveOverrides);
    setSavedOverrides(liveOverrides);
    if (userId) {
      saveThemeOverrides(supabase, userId, liveOverrides);
    }
  }, [liveOverrides, userId]);

  // Reset: clear everything and restore original preset colors
  const handleReset = useCallback(() => {
    for (const { cssVar } of EDITABLE_COLORS) removeCssVar(cssVar);
    const preset = PRESET_THEMES.find(p => p.id === themeId);
    if (preset && applyPresetFn) applyPresetFn(preset.id, preset.theme);
    setLiveOverrides({});
    setSavedOverrides({});
    persistSaved({});
    if (userId) {
      saveThemeOverrides(supabase, userId, {});
    }
  }, [themeId, applyPresetFn, userId]);

  const getCurrentColor = useCallback((colorDef) => {
    if (liveOverrides[colorDef.key]) return liveOverrides[colorDef.key];
    if (presetColors[colorDef.key]) return presetColors[colorDef.key];
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(colorDef.cssVar).trim();
    if (computed.startsWith('#') && computed.length >= 4) return computed;
    return '#888888';
  }, [liveOverrides, presetColors]);

  const hasUnsaved = JSON.stringify(liveOverrides) !== JSON.stringify(savedOverrides);
  const hasAnyChange = EDITABLE_COLORS.some(({ key }) =>
    (liveOverrides[key] && liveOverrides[key] !== presetColors[key]) ||
    (savedOverrides[key] && savedOverrides[key] !== presetColors[key])
  );

  return {
    liveOverrides,
    savedOverrides,
    presetColors,
    handleColorChange,
    handleSave,
    handleReset,
    getCurrentColor,
    hasUnsaved,
    hasAnyChange,
  };
}
