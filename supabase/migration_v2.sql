-- ============================================
-- Smat Trip v2 Migration
-- Day-Centric Architecture
-- ============================================

-- 1. trips 表（行程元数据，移除 trip_data）
-- 注意：旧的 trips 表保留不动，新建干净的结构
-- 测试阶段直接用新表，不迁移旧数据

CREATE TABLE IF NOT EXISTS trips (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title       TEXT,
  thumb       TEXT,
  start_date  DATE,
  end_date    DATE,
  settings    JSONB DEFAULT '{}',
  share_token TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their trips" ON trips;
CREATE POLICY "Users own their trips" ON trips
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. days_v2 表（天的原子数据）
CREATE TABLE IF NOT EXISTS days_v2 (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date        DATE NOT NULL,
  title       TEXT,
  color       TEXT DEFAULT '#5b7a99',
  stops_data  JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE days_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their days" ON days_v2;
CREATE POLICY "Users own their days" ON days_v2
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. trip_days 关联表（多对多）
CREATE TABLE IF NOT EXISTS trip_days (
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id      TEXT NOT NULL REFERENCES days_v2(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, day_id)
);

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their trip_days" ON trip_days;
CREATE POLICY "Users own their trip_days" ON trip_days
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
        AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
        AND trips.user_id = auth.uid()
    )
  );
