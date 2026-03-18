# Itinerary V3 Core Refactor — 2026-03-17

> **scope**: 行程核心交互重构 — 拖拽系统、时间选择器、卡片样式、营业时间预警
> **branch**: `refactor/itinerary-v3-core`
> **files changed**: 17 files, +606 / -261 lines

---

## 1. 跨天拖拽排序系统 (Cross-Day Drag & Drop)

### 1.1 全新 Pointer Events 拖拽引擎 (`useTimelineDrag.js` — NEW)

**旧方案**: HTML5 Drag API，仅支持同一天内排序，无法跨天拖拽。
**新方案**: 基于 Pointer Events API 的自定义拖拽系统。

- **扁平列表模型**: 所有天的卡片视为单一有序列表，通过 `querySelectorAll('[data-drag-id]')` 统一管理
- **30% 重叠阈值**: 拖拽卡片与目标卡片重叠 30% 时触发 iOS 风格位移动画
- **CSS Transform 位移**: 非拖拽卡片使用 `translateY()` 实现 GPU 加速的平滑让位动画
- **setPointerCapture**: 跨元素追踪指针位置，确保拖拽不会因指针离开元素而中断
- **5px 拖拽阈值**: `handlePointerDown` 不立即触发拖拽，而是在 `handlePointerMove` 中检测超过 5px 后才提交拖拽状态，保留子元素的正常点击事件

### 1.2 空天占位符 (Phantom Drop Targets)

**问题**: 没有行程的天无法接收拖拽的卡片。
**方案**: 为空天渲染幽灵占位元素 `data-drag-id="__empty_<dayId>"`，拖拽系统识别 `__empty_` 前缀后将卡片插入该天的开头。

### 1.3 拖拽状态提升 (`ItineraryView.jsx` → `DaySection.jsx`)

- `useTimelineDrag` hook 在 `ItineraryView` 级别调用，`timelineRef` 挂载到整个时间线容器
- 拖拽相关 props (`draggingStopId`, `onDragPointerDown`, `onDragPointerMove`, `onDragPointerUp`) 透传给每个 `DaySection`
- 每个卡片包装器携带 `data-drag-id={stop.id}` + `data-drag-day={day.id}` + `touchAction: 'none'`

### 1.4 moveStop 修正 (`useTripEditor.js`)

**Bug**: `afterStopId == null` 时错误使用 `push()`（追加到末尾），应使用 `unshift()`（插入到开头）。

---

## 2. 时间选择器优化 (TimePicker Overhaul)

### 2.1 蓝色选中条对齐修复

**问题**: 父容器设置了 `flex: 1`，导致高度超出 260px 而滚动容器固定 260px，蓝色高亮条位置偏移。
**修复**: 移除 `flex: 1`，固定父容器布局。

### 2.2 滚动性能优化 (O(n) → O(1))

**旧方案**: 每次滚动事件对 48 个时间项执行 `getBoundingClientRect()`，无节流，直接 `setSelectedIdx` 触发完整重渲染。
**新方案**:
- **O(1) 数学计算**: 通过 `scrollTop` + 固定 `ITEM_HEIGHT(84px)` 直接计算中心项索引
- **rAF 节流**: `requestAnimationFrame` 确保每帧最多处理一次
- **60ms 防抖**: `setTimeout` 防抖状态更新，避免高频重渲染
- **GPU 动画**: 选中项使用 `transform: scale(1.45)` 替代 `fontSize` 变化，利用 GPU 合成层

### 2.3 日期显示星期 (Weekday Label)

橘黄色日期徽章下方显示对应星期（如 "Wednesday"），关门日时星期文字变红色。

---

## 3. 营业时间 & 关门预警系统 (Opening Hours & Closed-Day Alerts)

### 3.1 TimePicker 内部预警

- **关门行标红**: `openingHours` 中包含 "Closed" 的行显示为 `#ef4444` 红色
- **当天高亮**: 当前星期几的行加粗 + 橙色左边框 + 背景高亮
- **关门 + 当天**: 红色左边框 + 红色背景
- **顶部警告横幅**: 当 stop 所在星期几匹配关门日时，显示红色脉冲动画警告 "This place is Closed on {weekday}!"

### 3.2 StopCard 外部预警

- **红色边框**: 卡片边框变为 `rgba(239,68,68,0.35)` 红色
- **脉冲警告条**: 卡片内顶部显示 "今天休息!" / "Closed today!" 红色警告，带 `pulse-border` 呼吸动画
- **星期计算**: `DaySection` 根据 `trip.startDate + dayIndex` 计算 `dayWeekdayIdx`，传递给 `StopCard`

### 3.3 时区 Bug 修复

**问题**: `DaySection` 使用 `new Date("YYYY-MM-DD")`（ISO 格式，UTC 解析），`ItineraryView` 使用 `.replace(/-/g, '/')`（本地时区解析）。在 UTC 以西时区，UTC 午夜解析导致 `getDay()` 返回前一天的星期。
**修复**: 统一使用 `.replace(/-/g, '/')` 强制本地时区解析。

---

## 4. 卡片样式统一 & 组件增强

### 4.1 StopCard 重构

- 全新富卡片布局：填充式彩色 pin 图标 + 序号、地址行、备注占位、底部芯片组
- 图片缩略图可点击更换，Portal 渲染照片选择下拉
- Hover 效果：`translateX(4px)` 位移 + 阴影加深 + 边框高亮
- 删除确认弹出框（非 `window.confirm`）

### 4.2 NoteCard & ListCard

- 透明玻璃效果背景，日色左边框
- NoteCard: `contentEditable` 实时编辑
- ListCard: 勾选/取消、添加/删除项、hover 显示删除按钮

### 4.3 AddStopRow 增强

- 搜索框 + 笔记/清单快捷按钮
- 支持 `afterStopId` 内联插入（transit 卡片之间）
- `autoFocus` + `onClose` 支持

### 4.4 ExpenseModal 增强

- 费用分类图标选择器
- 金额输入 + 备注字段

---

## 5. 其他改动

| 文件 | 改动说明 |
|------|---------|
| `base.css` | 新增 `@keyframes pulse-border` 呼吸脉冲动画 |
| `itinerary.css` | 简化拖拽 CSS：`.timeline-item-wrapper` + `.dragging`，移除旧 `.drop-indicator` |
| `en.json` / `zh.json` | 新增 `closed_today`, `add_note_btn`, `add_list`, `note_placeholder`, `add_item` 等 i18n 键 |
| `Navbar.jsx` | 微调样式 |
| `TripHeader.jsx` | 样式调整 |

---

## 架构关键决策

| 决策 | 理由 |
|------|------|
| Pointer Events 替代 HTML5 Drag | 精确光标追踪 + CSS Transform 动画 + 跨天支持 |
| 拖拽状态提升至 ItineraryView | 跨天拖拽需要全局视角，DaySection 只负责渲染 |
| 扁平列表 `[data-drag-id]` | 统一查询所有卡片，不区分天边界 |
| 延迟 preventDefault | 保留子元素（time chip, photo, expense）点击事件 |
| `.replace(/-/g, '/')` 日期解析 | 强制本地时区，避免 UTC 解析的跨天偏移 |
| rAF + debounce 双层节流 | 滚动性能：rAF 限帧率，debounce 限 React 重渲染 |

---
*Generated 2026-03-17 on branch `refactor/itinerary-v3-core`*
