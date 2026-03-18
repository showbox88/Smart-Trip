# Smart Trip × Trip Archive 双联合并计划书

> **状态**: 规划阶段 (Planning)
> **日期**: 2026-03-17
> **分支**: 待创建 `feature/archive-integration`

---

## 1. 项目背景

### 两个独立应用
| | Smart Trip | Trip Archive |
|---|---|---|
| **定位** | 旅行**规划** (出发前) | 旅行照片**归档** (回来后) |
| **技术栈** | React 18 + Vite + Context API + 原生 CSS | React 19 + Vite 8 + Tailwind 4 + Framer Motion |
| **数据层** | Supabase 云端 (trips, stops, expenses) | 本地 JSON + File System Access API + IndexedDB |
| **路由** | React Router | 无路由, state 驱动 (appMode) |
| **认证** | Supabase Auth | 无 |
| **地图** | Google Maps 深度集成 | 无 |
| **源码位置** | `C:\Users\showb\Desktop\Smart Trip\Smart-Trip\react-app\` | `C:\Users\showb\Desktop\Trip-Photo-Archive\` |

### 目标
合并为**统一旅行生命周期平台**: 规划 → 执行 → 归档

---

## 2. 核心设计原则

### 2.1 双向独立运行 (Dual Independence)
- **Smart Trip 可以独立运行**：不安装 Archive 模块，行程规划功能不受影响
- **Trip Archive 可以独立运行**：不连接 Smart Trip，照片整理功能完全可用
- **任一方可选择"接入"对方**：通过 adapter 层建立关联

### 2.2 数据归属明确 (Data Ownership)
- **Supabase 拥有**: trip 元数据、stops、expenses、用户认证 (Smart Trip 负责)
- **本地 JSON 拥有**: 照片元数据、event-photo 关联、thumbnail 缓存 (Archive 负责)
- **不做全量同步**: 只在关联点交换必要数据

### 2.3 一个行程 = 一个照片文件夹 (强制约束)
- Archive 自动扫描文件夹，一个子文件夹 = 一个 trip
- 不允许多行程混在一个文件夹（太混乱）
- 这是大多数用户的自然使用习惯

---

## 3. 数据关联模型

```
Supabase (云端 - Smart Trip 拥有)          Local (本地 - Archive 拥有)
┌──────────────────────────┐              ┌──────────────────────────┐
│ trips                     │              │ trip_database.json       │
│   trip_id ─────────────────────────────→│   trips[]                │
│   title, dates, stage     │              │     trip_id (共享ID)     │
│                           │              │     title, folder_path   │
│ days[]                    │              │                          │
│   stops[]                 │              │   events[]               │
│     stop_id ───────────────────────────→│     event_id (=stop_id)  │
│     location, time, price │              │     photos[], city       │
│     expenses              │←── sync ────│     spending             │
└──────────────────────────┘              │                          │
                                          │   photos[]               │
                                          │     file_name, event_id  │
                                          │     EXIF, thumbnail(IDB) │
                                          └──────────────────────────┘
```

### ID 关联规则
- `Smart Trip trip.id` = `Archive trip.trip_id` (建立关联时写入)
- `Smart Trip stop.id` = `Archive event.event_id` (归类照片时关联)
- 费用双向同步: Archive 补全的 spending → 写回 Supabase stop.price

### 关联时机
1. **自动**: 用户在 Smart Trip 点"进入相册"时，如果 Archive 已扫描到同名 trip，自动匹配
2. **手动**: 用户在 Archive 右键 trip → "关联 Smart Trip 行程" → 选择列表

---

## 4. 用户工作流

### 4.1 完整生命周期
```
[Smart Trip] 规划行程 → 添加地点/时间/消费
    ↓ 出发旅行
    ↓ 回到家
[用户] 把旅行照片放入文件夹 (一个行程一个文件夹)
    ↓
[Archive] 自动扫描 → 生成 trip → 用户右键照片归类 event
    ↓ event 自动关联 Smart Trip 的 stop
[Archive] 补全消费信息 → 同步回 Supabase
    ↓
[Smart Trip] 点"进入相册" → 浏览 events + 照片 (只读模式)
```

### 4.2 纯 Archive 用户 (不用 Smart Trip)
```
[用户] 打开 Archive → 选择照片文件夹
[Archive] 自动扫描 → 生成 trips
[用户] 右键归类照片 → 创建 events → 添加消费/城市/评分
    → 完全独立运行，无需登录，无需网络
```

### 4.3 Smart Trip 用户查看相册
```
[Smart Trip] 仪表盘 → 点击某行程 → "进入相册" 按钮
    → 切换到 Archive 浏览模式 (该 trip 的 events + 照片)
    → 不是编辑模式，是查看/回忆模式
```

---

## 5. 技术实施计划

### Phase 1: 代码整合 + 路由 (低复杂度)
- [ ] 将 Archive `src/` 复制到 `react-app/src/archive/`
- [ ] `react-app` 安装 Archive 依赖 (Tailwind, Framer Motion, @tanstack/react-virtual, etc.)
- [ ] 配置 Tailwind 与现有 CSS 共存
- [ ] React Router 添加 `/archive` 路由
- [ ] Archive 组件调整 import 路径
- [ ] 验证: Archive 作为子路由可以独立渲染

### Phase 2: 统一导航 (低复杂度)
- [ ] Navbar 添加 "旅行相册" / "Photo Archive" tab
- [ ] 仪表盘 trip 卡片添加 "进入相册" 按钮 (仅限 Completed 状态)
- [ ] Archive 添加 "返回规划" 导航
- [ ] i18n: 新增 archive 相关翻译键

### Phase 3: Adapter 关联层 (中等复杂度)
- [ ] 创建 `react-app/src/adapter/tripLink.js`:
  ```javascript
  linkTrips(subaseTripId, archiveTripId)  // 建立关联
  unlinkTrips(tripId)                       // 解除关联
  getLinkedArchiveTrip(smartTripId)         // 查询关联的 Archive trip
  getLinkedSmartTrip(archiveTripId)         // 查询关联的 Smart Trip
  ```
- [ ] 关联映射表存储: Supabase `trip_links` 表 + 本地 JSON 双写
- [ ] Smart Trip 的 stop → Archive 的 event 自动映射 (同名/同位置匹配)

### Phase 4: 费用同步 (中等复杂度)
- [ ] Archive event.spending 变更 → 写入 Supabase stop.price
- [ ] Smart Trip stop.price 变更 → 写入本地 JSON event.spending
- [ ] 冲突解决: 以最后修改时间为准 (last-write-wins)

### Phase 5: 样式渐进统一 (持续进行)
- [ ] 新代码全部用 Tailwind
- [ ] `variables.css` 设计令牌映射到 `tailwind.config.js` theme.extend
- [ ] 现有原生 CSS 正常共存，不急于迁移
- [ ] 逐步迁移高频修改的组件

### Phase 6: Archive 独立构建保留 (低复杂度)
- [ ] Vite 配置多入口: `main.jsx` (完整版) + `archive-standalone.jsx` (独立版)
- [ ] 独立版不包含 Smart Trip 路由、Supabase、Google Maps
- [ ] 独立版可以单独部署为一个纯本地 web app

---

## 6. 文件结构 (合并后)

```
react-app/src/
├── components/          # Smart Trip 组件 (现有)
│   ├── itinerary/
│   ├── modals/
│   ├── layout/
│   └── ...
├── archive/             # Trip Archive 模块 (新增)
│   ├── components/      # Archive 组件 (从 Trip-Photo-Archive 迁入)
│   │   ├── VirtualGrid.jsx
│   │   ├── PhotoCard.jsx
│   │   ├── Lightbox.jsx
│   │   ├── CollectionCard.jsx
│   │   ├── ContextMenu.jsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useFileSystemAccess.js
│   │   ├── useContextMenu.js
│   │   └── useObjectUrl.js
│   ├── utils/
│   │   ├── idb.js
│   │   ├── exifUtils.js
│   │   └── thumbnailUtils.js
│   └── ArchiveApp.jsx   # Archive 入口组件 (原 App.jsx 重命名)
├── adapter/             # 双联适配层 (新增)
│   └── tripLink.js
├── context/
├── hooks/
├── styles/
├── i18n/
└── pages/
    ├── ItineraryPage.jsx
    └── ArchivePage.jsx  # 路由 /archive → 渲染 ArchiveApp
```

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| File System Access API 仅 Chromium | Safari/Firefox 用户无法使用 Archive | 明确标注浏览器要求; 未来可考虑 OPFS fallback |
| React 18 vs 19 差异 | Archive 用 React 19 特性可能不兼容 | 检查是否用了 19-only API (use, Actions); 必要时降级 |
| Tailwind + 原生 CSS 冲突 | 样式互相污染 | Tailwind prefix 配置; 原生 CSS 使用 BEM/scoped |
| 双数据源一致性 | Supabase 和本地 JSON 的 trip 数据可能不一致 | Adapter 层做最终一致性检查; last-write-wins 策略 |
| 换电脑/清缓存 | IndexedDB thumbnails 丢失 | trip_database.json 在照片文件夹内，重新选文件夹即可恢复 |

---

## 8. 前置条件

在开始合并之前，需要完成:
- [x] Smart Trip react-app 行程核心功能稳定 (拖拽、时间选择器、卡片系统)
- [ ] Smart Trip react-app 已知 bug 全部修复
- [ ] Trip Archive 当前版本功能稳定
- [ ] 确认 React 18/19 兼容性

---

## 9. 如何在新对话中恢复上下文

在新的 Claude Code 对话中，发送:
```
请阅读 docs/MERGE_PLAN.md 了解我们的合并计划
```
或
```
请检查你的 memory 了解项目背景
```
Claude Code 的 memory 系统会自动加载 `MEMORY.md` 索引，其中包含:
- `project_merge_plan.md` — 合并架构概要
- `user_profile.md` — 用户偏好

---

*Created 2026-03-17 | Smart Trip × Trip Archive Merge Plan v1*
