-- ============================================================
-- Smart Trip — Theme Engine Migration
-- Creates tables for user-customizable theme system
-- ============================================================

-- ── Themes table ──────────────────────────────────────────
-- Stores theme definitions (JSON token objects)
CREATE TABLE IF NOT EXISTS themes (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  theme_data     JSONB NOT NULL,
  is_public      BOOLEAN DEFAULT false,
  preview_colors JSONB,  -- { primary, surface, onSurface } for gallery thumbnails
  fork_of        UUID REFERENCES themes(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── User Theme Library ────────────────────────────────────
-- Tracks which themes a user has saved/favorited
CREATE TABLE IF NOT EXISTS user_theme_library (
  user_id  UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, theme_id)
);

-- ── Add active_theme_id to profiles ──────────────────────
-- (If profiles table doesn't exist yet, this will fail gracefully)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_theme_id UUID REFERENCES themes(id) ON DELETE SET NULL;

-- ── Row Level Security ───────────────────────────────────

ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_theme_library ENABLE ROW LEVEL SECURITY;

-- Anyone can read public themes; authors can read their own
CREATE POLICY "themes_select" ON themes
  FOR SELECT USING (is_public = true OR auth.uid() = author_id);

-- Authors can insert their own themes
CREATE POLICY "themes_insert" ON themes
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can update their own themes
CREATE POLICY "themes_update" ON themes
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own themes
CREATE POLICY "themes_delete" ON themes
  FOR DELETE USING (auth.uid() = author_id);

-- Users manage their own library
CREATE POLICY "theme_library_select" ON user_theme_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "theme_library_insert" ON user_theme_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "theme_library_delete" ON user_theme_library
  FOR DELETE USING (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_themes_author ON themes(author_id);
CREATE INDEX IF NOT EXISTS idx_themes_public ON themes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_theme_library_user ON user_theme_library(user_id);

-- ── Auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW
  EXECUTE FUNCTION update_themes_updated_at();
