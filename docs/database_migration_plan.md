# Smart Trip 数据库底座重构规划 (Phase B)

为了从根本上解决 Smart Trip 目前 `trip_data` 作为巨大 JSONB blob 存储导致的数据不透明、难以做关联外键的问题，并为下阶段完全整合 `Trip-Photo-Archive` 铺平道路，我们需要执行一次极度严谨的 **SQL 范式拆解行动 (Database Schema Migration)**。

本计划将完全在 Smart Trip 现有的技术栈上操作（不引入 React），确保数据大盘稳固之后再进行上层建筑的换代。

---

## 1. 目标 Schema 设计 (The 4-Table Normalized Architecture)

我们将弃用现有的嵌套 JSON blob，将其拆分为 4 张核心关系表：

### 1.1 `trips` (行程主表)
*负责行程的元数据与宏观状态。*
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key 关联 `auth.users`)
- `title` (String, 行程名称)
- `startDate` (Date)
- `endDate` (Date)
- `thumb` (String, 封面图 URL 或基于关键词匹配的本地/在线链接)
- `status` (String/Enum, 例如：`ongoing`, `planned`, `completed`)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### 1.2 `days` (行程天数表)
*每一个行程下的具体天，拥有独立的排序和颜色主题。*
- `id` (UUID, Primary Key)
- `trip_id` (UUID, Foreign Key 关联 `trips.id` ON DELETE CASCADE)
- `title` (String, 可选的天名称，例如 "Day 1" 或 "巴黎深度游")
- `date` (Date, 该天的实际日历日期)
- `color` (String, 该天在地图上显示的十六进制颜色，如 `#FF5733`)
- `sort_order` (Integer, 必须字段，确保天数的正确排序)

### 1.3 `stops` (站点/打卡事件表 - 未来直接作为 Photo Archive 的 Event 外键)
*行程中具体的地点、笔记、清单或住宿事件，也是未来挂载照片的最核心容器。*
- `id` (UUID, Primary Key)
- `day_id` (UUID, Foreign Key 关联 `days.id` ON DELETE CASCADE)
- `type` (String, 指示卡片类型，例如 `'location'`, `'note'`, `'list'`, `'hotel_checkin'`)
- `location` (String, 地点名称 / 笔记简述)
- `lat` (Float, 经度)
- `lng` (Float, 纬度)
- `placeId` (String, Google Places API 的标识符)
- `category` (String, 场所分类，例如 `'museum'`, `'restaurant'`)
- `categoryIcon` (String, 保存对应的 Emoji，例如 '🏛️')
- `rating` (Float, 打卡评分)
- `photo` (String, Google Places 照片引用名)
- `time` (String, 设定的营业时间/活动时间)
- `period` (String, 预估停留期，如 "2小时")
- `price` (String/Float, 预估费用)
- `note` (Text, 长文本笔记内容)
- `desc` (Text, 地点补充描述)
- `address` (Text, 完整街道地址)
- `phone` (String, 联系电话)
- `stayId` (String, 住宿绑定关联 ID)
- `transitMode` (String, 交通偏好：'DRIVE', 'WALK', 'TRANSIT')
- `sort_order` (Integer, 必须字段，由于解除 JSON 数组索引依赖，此字段代表当天的真实排列顺序)

### 1.4 `stop_transits` (路程边缘表)
*用于记录 `stops` 之间由 Google Routes v2 算出来的路网缓存数据，解决无意义的重复计算问题。*
- `id` (UUID, Primary Key)
- `from_stop_id` (UUID, Foreign Key 关联 `stops.id` ON DELETE CASCADE)
- `to_stop_id` (UUID, Foreign Key 关联 `stops.id` ON DELETE CASCADE)  *(通常是同一 `day_id` 内连续的两个 `sort_order` 的 stops)*
- `duration` (String, 文本形式如 "15 分钟")
- `distance` (String, 文本形式如 "5.2 km")
- `durationSeconds` (Integer, 内部排序/比较用的纯秒数)
- `distanceMeters` (Integer, 内部比较用的纯米数)

*(索引规则：基于 `from_stop_id` 和 `to_stop_id` 建立唯一联合索引，避免重复插入)*

---

## 2. 实施步骤二：SQL Migration 脚本编写

我们将在 Supabase 的 SQL Editor 里执行一次迁移脚本，主要包含：
1. **创建上述 4 张新表**。
2. **启用行级安全策略 (RLS - Row Level Security)**：
   - 设定基于 `user_id` 的访问控制：`CREATE POLICY "Users can only see and edit their own trips" ON trips FOR ALL USING (auth.uid() = user_id);`
   - 为子表 (`days`, `stops`) 配置级联验证规则，例如 `CHECK (EXISTS (SELECT 1 FROM trips WHERE trips.id = days.trip_id AND trips.user_id = auth.uid()))`。由于拆出 `days` 和 `stops` 后这两张新表没有直接的 `user_id`，必须通过这种 JOIN 形式来验证权限，否则上线后用户将无法查到自己的详情数据。

---

## 3. 实施步骤三：一次性数据清洗与迁移脚本 (Data Migration Script)

由于这是对现有在线用户数据的无损切割，建议编写一个临时的 Node.js 脚本 (运行在本地或通过 Deno 部署给 Supabase Edge Function 发送请求)：

1. **读取全量旧数据**：通过 Supabase 把现有带大 Blob (`trip_data`) 的 Trips 全部拉取到内存。
2. **拆解并转换格式**：
   - 解析每一行的 `trip_data` JSONB。
   - 提取 `days` 数组插入到 `days` 表，保留原来的 UUID。
   - 遍历 `days` 下挂载的 `items`，清洗字段后插入 `stops` 表。
3. **批量写入新表**：使用 Supabase 批量插入 (Bulk Insert) 的能力写入拆分后的新范式数据。
4. *(可选测试)*：在新表查询并比对旧表的记录总数，确保零数据丢失。

---

## 4. 实施步骤四：Smart Trip `supabase_api.js` 重写

迁移数据后，我们需要立**改写且仅改写** Smart Trip 前端的网关接口 `js/supabase_api.js`，完全透明地对上层建筑（`state.js` 和 `render.js`）屏蔽底层的表变化。

1. **`loadData()` 改造**：
   - 现在的 `loadData()` 是读一行大 Blob。
   - 改写后：使用 Supabase 的关联嵌套查询 (Joined Response) 机制。
   ```javascript
   // 伪代码演示 Supabase 的内建多表 Join (GraphQL 类似的语法)
   const { data, error } = await supabase
       .from('trips')
       .select(`
           *,
           days (
               *,
               stops (*)
           )
       `)
       .eq('user_id', user.id);
   ```
   - 拿到新格式数据后，在前端构建回 `state.js` 原本习惯消费的 `trip_data` 对象树结构。这样不用修改任何 `render.js` 视图层的渲染代码。

2. **`saveData()` 改造**：
   - 改为对 `trips`、`days`、`stops` 触发表级 Update/Upsert (基于 UUID 主键检测差异后写入)。对于被在图形界面删除掉的元素，要执行对应子表的 Delete。

## 5. 向后兼容落地策略 (Backward Compatibility)
**在 React 版完全替代前，绝不能直接废弃原有的 `trip_data` Blob。** 我们必须采用安全的平稳过渡：
- 在 Phase 3 SQL 拆表执行时，原 Vanilla JS 版 Smart Trip 若仍在服役，其 `loadData()` 会因找不到 JSON Blob 立即崩溃。
- **解决方案**：SQL Migration 真正执行的节点，应当是在最新的 React 版（已支持拆分表的读写）全部重构完成并准备上线的那一天。同时，下线旧有的 Vanilla JS 路由入口，实现无缝切换的软着陆。

---

> [!CAUTION] 
> 由于我们采用了“前端 API 桥接防腐层”策略（即在 `loadData/saveData` 进行拦截并拼装对象树），**Phase B 的整个过程不需要也不应当去修改 Smart Trip 核心视图层（`main.js`, `render.js`）的庞大代码！** 
> 这样我们将用最小的心智负担换取最硬核的数据库升级。
