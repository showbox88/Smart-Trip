/**
 * useTheme Hook
 *
 * Consumer hook for the ThemeContext.
 *
 * Usage:
 *   const { currentTheme, themeId, layoutVariant, setTheme, resetTheme } = useTheme();
 */

import { useContext, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() must be used within a <ThemeProvider>');
  }

  const layoutVariant = useMemo(
    () => ctx.currentTheme?.layout?.variant || 'glass',
    [ctx.currentTheme?.layout?.variant]
  );

  const layout = useMemo(
    () => ctx.currentTheme?.layout || {},
    [ctx.currentTheme?.layout]
  );

  return useMemo(() => ({
    ...ctx,
    layoutVariant,
    layout,
  }), [ctx, layoutVariant, layout]);
}
