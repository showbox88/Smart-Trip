# Smart Trip 与 Trip-Photo-Archive 项目合并分析与实施计划

## 1. 合并愿景与挑战分析 (Goal Description)

本项目旨在将“行程规划引擎”（Smart Trip，基于 Vanilla JS）与“智能照片归档系统”（Trip-Photo-Archive，基于 React）深度融合，构建一个**规划与回忆闭环**的超级旅行应用。

### 核心设计原则：Smart Trip 为主，Photo Archive 为辅（大屏限定）
- **真理源 (Source of Truth)**：Smart Trip 的云端数据库 (Supabase) 作为核心数据源。
- **数据结构风险规避**：Smart Trip 现有的 `trip_data` 是一个深度嵌套的 JSON Blob。合并初期（Phase 1）采用“导出扁平化接口 (Flat Export Bridge)”以供照片关联使用。最终目标是执行 SQL Migration，将其拆分为真正的关系型表（`trips`, `days`, `stops`），以确保照片与 Stop 绑定的健壮性。
- **混合型数据与平台限制守卫 (Platform Guard)**：行程规划数据保持云端实时，而本地照片墙依赖 File System Access API。**注意：该 API 仅支持 Chromium 桌面端。** 因此架构需要内置能力检测（`if (!('showDirectoryPicker' in window))`），在移动端/Safari 上提供降级的“只读云端回忆模式”。
- **卡片万物论 (Events = Any Card)**：
   - **Trip (Smart Trip)** === **Trip (Photo Archive)**：行程容器。
   - **地址卡片 (Address / POI)** === **地点事件**。
   - **笔记卡片 (Note)** === **自由事件**：非常适合作为“无地标风景照”或“路上碎片抓拍”的容器。
   - **清单卡片 (List)** === **合集事件**。

---

## 2. 深入探讨与功能联动规划 (Proposed Concept & Integration)

### 2.1 数据库结构统一 (Schema Unification)

核心表结构需要重组为统一的 JSON/数据库概念：
- `trips`：共享同一张表，包含旅行目的地、日期。
- `events / locations`：**地址卡片即事件**。原有的 `Smart Trip` 地址条目（`id`, `place_name`, `lat`, `lng`, `google_place_id`）将直接与 `Photo Archive` 中的 `Event`（`event_id`, `title`, `city`, `category`）打通。可以采用同一个 `id`。
- `photos`：将原有的关联 `event_id` 指向具体的 Smart Trip 地址卡片 ID。

### 2.2 极致的全自动归档交互 (Zero-Friction Archiving)

> [!TIP]
> **交互哲学：尽量消除手动输入，让数据流动起来。**
> 当卡片成为照片的文件夹，我们要在同一界面实现前所未有的「拖拽式规划体验」。

1. **自动化的元数据回填 (Metadata Auto-Fill)**
   - **消除手动操作**：当照片被归类到一个“地址卡片”或“归档卡片”下时，引擎将自动用卡片本身的信息填充照片的数据库条目。
   - **API 联动**：如果该卡片是通过 Google Maps API 创建的（如“卢浮宫”），系统将自动把 Google Places 返回的 City、业务 Category、甚至卡片的 Rating 全部注入到这批照片的源信息中。

2. **双轨视图架构与拖拉拽归档 (Drag & Drop Synergy)**
   - 在桌面端的“回忆专属 Tab”下，左侧展开 Smart Trip 的核心**行程时间轴**，右侧展开**未分发照片墙**。
   - **“未归档”缓冲区设计**：引入所有照片默认进入“未归档 (Unarchived)” 的宽容机制。用户体验上，并不是要求每次立刻归类，而是系统按 EXIF 时间自动将照片分配到对应的 Day 中，用户再随意将其拖拽（Drag and Drop）到左侧该日内的具体“地址卡”或“笔记卡”上。未拖拽的照片静静躺在缓冲区，绝不构成心理负担。

3. **双语系统的统一集成 (i18n Merge)**
   - Smart Trip 现成成熟的 `t()` 函数与语言包将包装为 React Context 辐射全局。

---

## 3. 安全修订的渐进实施策略 (The A -> C -> B Route)

为了规避巨大的前期数据改动风险，我们采纳了最安全的 A -> C -> B 执行顺位：先跑通连接、再验证数据可用性、最后才动底层存储结构。

### **Phase 0: 零代码准备 (Route A - 跑通连接)**
- **任务**：在 Trip-Photo-Archive 的 Vite 项目中安装 `@supabase/supabase-js`。
- 将 Smart Trip 的 `supabase_api.js` 移植为 `src/utils/supabase.js`。验证在 React 项目中能纯跑通登录和拉取行程序列。

### **Phase 1: 数据桥接过渡期 (Route C - 验证可用性)**
- **避坑指北**：不要在此阶段对线上 `trip_data` 进行真实拆表，因为这会导致现网代码立刻崩溃且不可调试。
- **任务**：建立 `useSmartTripData.js` Hook。从 Supabase 拉取旧版的 `trip_data` JSONB Blob，**纯前端层面**解析扁平化出纯 `stops` 列表（包含 id, name, category, sort_order）。让沉重的归档界面暂时消费这个动态生成的“假名表”。

### **Phase 1.5: 数据底座前置设计 (Route B 蓝图规划)**
- **任务**：编写出 SQL Migration 脚本和目标 Schema 拆解预案，**但暂不执行**。将其封存于 `docs/database_migration_plan.md`，等待后续按键触发。

### **Phase 2: 渐进式前端重构与整合入口 (Unified SPA)**
- **任务**：利用 `react-router-dom` 布局统一入口：
  - `/` -> 全局面板 Dashboard（复刻 Smart Trip）。
  - `/trip/:id` -> React 版的行程主视图（将 Smart Trip 的 `render.js` 逐步转写为 JSX）。
  - `/trip/:id/archive` -> 提供**强有力的 API 平台限制能力守卫**。通过路由拦截不支持 `showDirectoryPicker` 的机型 (移动端/Safari)，将其降级为只读回忆模块。
  ```jsx
  // 伪代码：照片模块的能力检测守卫
  if (!('showDirectoryPicker' in window)) {
    return <CloudOnlyMemories tripId={id} />;  // 降级为只读云端回忆
  }
  return <LocalArchiveView tripId={id} />;
  ```

### **Phase 3: 终极 SQL 拆表与新旧切换 (The Finale)**
- **任务**：在由 Phase 2 构建出来的全新 React 版本的应用稳定后，此时执行 Phase 1.5 的 SQL Migration 脚本。
- **操作**：把长久存在的庞大 JSONB blob 彻底拆解为实打实的关系表 (`days` 和 `stops` 并具备自己的 `sort_order` 和 RLS 跨表校验)。
- 全站正式切换读写逻辑（废弃 JSON 解析策略），随即下线旧版 Vanilla JS 代码，双项目顺利合体闭环。

---

## 4. 落地与执行确认

当前蓝图已完全吸收您的专业架构设计：
- 通过“未归档缓冲区”及“笔记卡通配符”打造轻松的收纳体验。
- 通过“导出过渡 -> React 重写 -> 最终 SQL 拆分”保证项目不停飞迁移。

请指示我们立刻开始执行哪一步骤？

- **[选项 A] 开始 Phase 0**：立刻在 React 项目库里安装 Supabase，移植并跑通 `supabase_api.js`。
- **[选项 B] 数据底座前置**：先不管 React 代码，先干最硬的骨头。出具 SQL Migration 脚本，指导如何在 Supabase 层面把现有的那个巨大 JSON Blob 拆为严谨的 `Days` 与 `Stops` 的关系表。
- **[选项 C] 编写 `useSmartTripData` Hook**：展示具体怎么把旧版嵌套数据铺平成可被照片系统关联的扁平对象列表。
