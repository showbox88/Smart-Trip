# 侧边栏光晕效果修复 & 地图 Tooltip 白天模式修复 — 2026-03-19

> **scope**: 侧边栏鼠标光晕跟随、地图 tooltip 白天模式图片反色、地图添加卡片自动滚动
> **branch**: `refactor/itinerary-v3-core`
> **files changed**: 4 files

---

## 1. 侧边栏光晕效果重写 (`useSidebarGlow.js`)

### 问题描述

折叠侧边栏后，鼠标光晕效果有三个 bug：
1. **不跟随鼠标** — 光晕始终停在顶部
2. **选中天闪烁** — 鼠标移动时 active 项目反复闪烁
3. **亮度不足** — 光晕效果过于微弱，视觉上不明显

### 根因分析

**Bug 1（不跟随）**：dot 元素没有设置 `position:absolute` 和坐标，全部堆叠在 layer 的 `top:0 left:0`，`boxShadow` 永远从顶部发光。即便后来加了坐标，`centerY` 存的是相对 sidebar 的偏移量，但比较时用的是 `clientY`（视口坐标），两套坐标系混用。

**Bug 2（闪烁）**：active 常亮光晕和 hover 跟随光晕共用同一个 dot 元素，`cssText` 每帧覆写整个 style 后再追加 `boxShadow`，两种状态互相覆盖产生闪烁。

**Bug 3（不亮）**：光晕参数保守，`blur/spread/alpha` 值过小。

### 修复方案

完全重写 `useSidebarGlow`：

- **双 dot 架构**：每个 nav item 使用两个独立元素：
  - `activeDot` — 专门负责选中天的常亮光晕，颜色取天的 `--active-color` CSS 变量
  - `hoverDot` — 专门负责鼠标接近时的跟随光晕
  - 两者互不干扰，彻底消除闪烁
- **坐标一致性**：`applyGlow` 每帧直接调用 `item.getBoundingClientRect()` 取视口坐标，定位时减去 `sidebarRect` 换算为 sidebar 相对坐标，`pointerY` 比较时用视口坐标，保证两套坐标不混用
- **亮度提升**：
  - hover 最强时：`blur 52px / spread 24px / alpha 0.90`（原来 40px / 16px / 0.80）
  - active 常亮：`blur 28px / spread 14px`，带天颜色色调
- **简化架构**：去掉复杂的 cache 体系，改为 `buildLayer()` 重建 DOM、`applyGlow()` 只做计算，逻辑更清晰

---

## 2. 地图 Tooltip 白天模式图片颜色反转修复 (`MapPanel.jsx`)

### 问题描述

地图切换到白天模式（☀️）后，鼠标悬浮地标泡泡弹出的信息浮窗中，图片和颜色全部反转。夜间模式正常。

### 根因分析

地图夜间模式通过对 `mapRef` 容器应用 `filter: invert(100%) hue-rotate(180deg)` 实现暗色效果。tooltip 作为 `AdvancedMarkerElement` 子元素会被一起反转，所以 tooltip 上也应用了相同 filter 作为**反向抵消**。

这个抵消 filter 是硬编码的，不管 `darkMode` 状态如何都会生效：

- **夜间模式**：地图 invert + tooltip invert = 抵消 ✅
- **白天模式**：地图无 filter + tooltip invert = 图片反色 ❌

涉及两处：行程地标 tooltip 和搜索分类 tooltip。

### 修复方案

```js
// 之前（硬编码，始终反转）
'filter:invert(100%) hue-rotate(180deg);'

// 之后（仅夜间模式时反转）
darkMode ? 'filter:invert(100%) hue-rotate(180deg);' : ''
```

两处 `useEffect` 依赖数组均已包含 `darkMode`，切换模式时 markers 自动重建，filter 随之更新。

---

## 3. 地图添加地址卡后不自动滚动修复 (`ItineraryView.jsx`)

### 问题描述

从地图面板点击"添加到行程"后，新卡片不会自动滚动到可视区域。

### 根因分析

1. **目标天被折叠** — `DaySection` 折叠时不渲染子组件，`scrollToNewStop` 找不到新卡片 DOM 元素
2. **重试次数不足** — 仅重试 20 帧（约 330ms），`addStopFromPlace` 涉及多个异步操作可能超时

### 修复

- 添加前先展开目标天：`setCollapsedDays(prev => ({ ...prev, [dayId]: false }))`
- `scrollToNewStop` 重试上限 20 → 60 帧（约 1 秒）

---

## 4. 文件变动统计

| 文件 | 改动说明 |
|------|---------|
| `react-app/src/hooks/useSidebarGlow.js` | **REWRITE**: 双 dot 架构，修复跟随/闪烁/亮度三个 bug |
| `react-app/src/components/itinerary/MapPanel.jsx` | **FIX**: tooltip counter-inversion filter 改为仅在 darkMode 时生效 |
| `react-app/src/components/itinerary/ItineraryView.jsx` | **FIX**: 添加卡片前自动展开目标天 + 滚动重试 20→60 帧 |
| `react-app/src/components/itinerary/DeleteConfirm.jsx` | **NEW**: 提取为共享组件 |

---
*Generated 2026-03-19 on branch `refactor/itinerary-v3-core`*
