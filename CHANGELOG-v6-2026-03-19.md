# Bug 修复 & 地图浮窗白天模式修复 — 2026-03-19

> **scope**: 地图添加地址卡自动滚动、地图 tooltip 白天模式图片反色
> **branch**: `refactor/itinerary-v3-core`
> **files changed**: 2 files

---

## 1. 修复：地图添加地址卡后不自动跳转到新卡片 (`ItineraryView.jsx`)

### 问题描述

从地图面板点击"添加到行程"后，新添加的地址卡不会自动滚动到可视区域。

### 根因分析

两个原因叠加导致：

1. **目标天被折叠** — `DaySection` 在 `isCollapsed=true` 时不渲染子组件（`{!isCollapsed && (...)}`），`scrollToNewStop` 通过 `document.querySelector` 找不到新卡片的 DOM 元素，静默失败。
2. **重试次数不足** — `scrollToNewStop` 仅重试 20 帧（约 330ms）。`addStopFromPlace` 涉及 Google Places API 请求 + 路线计算 + 图片上传等异步操作，渲染延迟可能超过 330ms。

### 修复方案

- `handleMapAddToDay` 和 `handleAddStop` 在调用 `addStopFromPlace` 前，先 `setCollapsedDays(prev => ({ ...prev, [dayId]: false }))` 展开目标天
- `scrollToNewStop` 重试上限从 20 帧提升到 60 帧（约 1 秒），确保异步操作完成后仍能找到元素

---

## 2. 修复：白天模式地图 tooltip 图片颜色反转 (`MapPanel.jsx`)

### 问题描述

地图切换到白天模式（☀️）后，鼠标悬浮地标泡泡弹出的信息浮窗中，图片和颜色全部反转。夜间模式正常。

### 根因分析

地图的夜间模式通过对 `mapRef` 容器应用 `filter: invert(100%) hue-rotate(180deg)` 实现。tooltip 作为 `AdvancedMarkerElement` 的子元素会被一起反转，因此 tooltip 上也应用了相同的 `filter: invert(100%) hue-rotate(180deg)` 作为**反向抵消**。

问题在于：这个抵消 filter 是**硬编码**的，不管 `darkMode` 是 true 还是 false 都会生效。

- **夜间模式** (`darkMode=true`)：地图 invert + tooltip invert = 抵消 ✅ 正常
- **白天模式** (`darkMode=false`)：地图无 filter + tooltip invert = 图片被反转 ❌ 异常

### 修复方案

将两处 tooltip 的 filter 从硬编码改为条件判断：

```js
// 之前（始终反转）
'filter:invert(100%) hue-rotate(180deg);'

// 之后（仅夜间模式反转）
darkMode ? 'filter:invert(100%) hue-rotate(180deg);' : ''
```

涉及两处：
- **行程地标 tooltip**（stop markers）— 第 230 行附近
- **搜索分类 tooltip**（category search markers）— 第 552 行附近

两处 `useEffect` 的依赖数组均已包含 `darkMode`，切换模式时 markers 会自动重建，filter 值随之更新。

---

## 3. 文件变动统计

| 文件 | 改动说明 |
|------|---------|
| `react-app/src/components/itinerary/ItineraryView.jsx` | **FIX**: 添加地址卡前自动展开目标天 + scrollToNewStop 重试 20→60 帧 |
| `react-app/src/components/itinerary/MapPanel.jsx` | **FIX**: tooltip counter-inversion filter 改为仅在 darkMode 时生效 |

---
*Generated 2026-03-19 on branch `refactor/itinerary-v3-core`*
