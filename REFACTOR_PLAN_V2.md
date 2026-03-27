# 模块化地基架构重构方案 v2.0（定稿）

## 核心理念

> **Day（天）是客观事实，Trip（行程）是过滤器。**

- **Day**：记录某天真实发生的一切。全局唯一（每个用户每天只有一条记录）。可以独立存在，不依赖任何 Trip。
- **Trip**：只是一个标签/容器，记录"包含哪些天"，不存储任何行程内容。
- **关联**：多对多。同一天可以属于多个 Trip（如"欧洲大旅行"和"巴黎专项"同时包含7月1日），同一个 Trip 包含多个 Day。

---

## 1. 数据库 Schema（定稿）

### `trips` 表（行程元数据）
```sql
CREATE TABLE trips (
  id          TEXT PRIMARY KEY,        -- trip-{timestamp}
  user_id     UUID NOT NULL REFERENCES auth.users,
  title       TEXT,
  thumb       TEXT,                    -- 封面图 URL
  start_date  DATE,
  end_date    DATE,
  settings    JSONB,                   -- { currency, unitDistance, unitTemp, language }
  share_token TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their trips" ON trips USING (auth.uid() = user_id);
```

### `days_v2` 表（天的原子数据）
```sql
CREATE TABLE days_v2 (
  id          TEXT PRIMARY KEY,        -- day-{timestamp}
  user_id     UUID NOT NULL REFERENCES auth.users,
  date        DATE NOT NULL,
  title       TEXT,                    -- "Day 1" 或用户自定义
  color       TEXT,                    -- 时间线颜色
  stops_data  JSONB,                   -- stops 数组（保持现有结构不变）
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)                -- 每个用户每天全局唯一
);

ALTER TABLE days_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their days" ON days_v2 USING (auth.uid() = user_id);
```

### `trip_days` 关联表（多对多）
```sql
CREATE TABLE trip_days (
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id      TEXT NOT NULL REFERENCES days_v2(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, day_id)
);

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their trip_days" ON trip_days
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid())
  );
```

---

## 2. 与现有代码的对照

| 现有架构 | 新架构 |
|---|---|
| `trips.trip_data` (整个 trip 的 JSONB) | 废弃 |
| `trip.days[]` 数组 | `days_v2` 表，每行一天 |
| `trip.settings` | `trips.settings` (独立字段) |
| `trip.activeDayId` | 纯前端状态，不持久化 |
| 无 | `trip_days` 关联表 |

---

## 3. Stops 数据结构（不变）

`days_v2.stops_data` 保持现有 Stop 对象结构，无需修改：
```json
[
  {
    "id": "s1234567",
    "type": "location",
    "location": "埃菲尔铁塔",
    "lat": 48.8584,
    "lng": 2.2945,
    "time": "09:00",
    "period": "AM",
    "photo": "...",
    "transitToNext": { "duration": "30 mins", "distance": "2.1 km" }
  }
]
```

---

## 4. 新增功能：随心打卡

用户无需预先建立行程，直接对当天打卡：
1. 点击"随心打卡"按钮
2. App 根据 GPS 推荐附近店铺
3. 用户选择后，自动创建/更新当天的 `days_v2` 记录，记录时间和地址卡
4. 用户回家后，建立 Trip，选择日期范围，系统提示将这些天关联到该 Trip

---

## 5. 实施路径

### 第一阶段：数据库基础设施
- [ ] 创建 Git 分支 `feature/day-centric-refactor`
- [ ] 编写 SQL 脚本，创建 `days_v2` 和 `trip_days` 表及 RLS 策略
- [ ] 在 Supabase 执行，验证表结构

### 第二阶段：核心 Hook 重构
- [ ] 新建 `useDays` hook：负责 `days_v2` 的 CRUD（按日期读取、写入、更新 stops）
- [ ] 新建 `useTripDays` hook：负责 `trip_days` 关联的增删查
- [ ] 重构 `useTrips`：移除 `trip_data` 相关逻辑，改为读写 `trips` 元数据
- [ ] 重构 `useTripEditor`：将数据源从 AppContext 的 trip 对象改为 `useDays`
- [ ] 重构 `AppContext`：`trips` 只存元数据，days 独立管理

### 第三阶段：UI 适配（外观不变）
- [ ] `ItineraryView`：数据来源改为 `useDays`，渲染逻辑不变
- [ ] `DashboardPage`：Trip 列表逻辑适配新数据结构
- [ ] Hotel Stay 跨天查询：从 `trip_days` 关联的所有 days 中扫描 stayId

### 第四阶段：随心打卡入口
- [ ] Dashboard 新增"随心打卡"按钮
- [ ] GPS 定位 + Google Places 推荐
- [ ] 自动创建当天 `days_v2` 记录
- [ ] 建立 Trip 时，提示关联已有 days

---

## 6. 风险点

| 风险 | 对策 |
|---|---|
| Hotel Stay 跨天（stayId 关联） | 加载 Trip 时一次性拉取所有关联 days，在内存中用 buildStayGroups() 处理 |
| 性能：Trip 详情需要多次查询 | 用 Supabase `join` 一次查询 trips + trip_days + days_v2 |
| 测试阶段数据 | 现有数据不迁移，直接在新表添加测试数据 |

---

## 附：数据查询示例

```javascript
// 加载一个 Trip 的所有 days（含 stops）
const { data } = await supabase
  .from('trip_days')
  .select(`
    day_id,
    days_v2 (
      id, date, title, color, stops_data
    )
  `)
  .eq('trip_id', tripId)
  .order('days_v2(date)');
```
