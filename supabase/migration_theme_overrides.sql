-- ── Theme Color Overrides ────────────────────────────────
-- Adds per-user color customization storage to the profiles table.
-- theme_overrides is a JSONB map of CSS variable keys → hex values,
-- e.g. { "primary": "#adc6ff", "background": "#0d1324" }

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme_overrides JSONB NOT NULL DEFAULT '{}';
