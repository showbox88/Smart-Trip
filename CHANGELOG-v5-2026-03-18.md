# UI 细节优化 & 多语言系统重构 — 2026-03-18

> **scope**: 地图浮窗、侧边栏导航高亮、多语言下拉、关闭提醒条宽度
> **branch**: `refactor/itinerary-v3-core`
> **files changed**: 6 files

---

## 1. 多语言系统重构 — 自动检测 + 下拉选择

### 1.1 I18nContext 自动扫描语言文件 (`I18nContext.jsx`)

**之前**: 每增加一种语言需要手动在代码里 `import` 并注册。
**现在**: 使用 Vite `import.meta.glob` 自动扫描 `src/i18n/*.json`，有几个文件就自动注册几种语言。

- 每个 JSON 文件顶部新增 `_meta.label` 字段（如 `"中文"`、`"English"`）作为显示名称
- 语言顺序：`zh` → `en` → 其余按字母排序
- `availableLanguages` 暴露给所有组件使用

**新增语言只需两步**：创建 `src/i18n/xx.json` + 在文件顶部加 `"_meta": { "label": "显示名" }`，无需改任何代码。

### 1.2 Navbar 语言切换改为下拉列表 (`Navbar.jsx`)

**之前**: 只是一个"切换到另一种语言"的按钮（zh ↔ en 二选一）。
**现在**: 展开式下拉列表，当前语言显示 ✓ 勾选标记，支持任意数量语言。

---

## 2. 侧边栏导航高亮修复 (`ItineraryView.jsx`, `layout.css`)

### 2.1 点击高亮不更新问题

**根因**: `activeDayId` 直接读取 `trip.activeDayId`（数据库字段），点击侧边栏只滚动页面，未更新该值。
**修复**: 引入本地 `activeDayIdLocal` state，点击时立即更新，优先级高于数据库字段。

### 2.2 滚动自动跟踪

新增 `IntersectionObserver`，用户手动滚动时自动检测当前视口内的天，实时同步侧边栏高亮。

### 2.3 收起状态无高亮效果

**根因**: CSS 规则 `.sidebar.collapsed li` 设置了 `border-left: none !important`，覆盖了 active 的左边线样式。
**修复**: 收起状态改用 `box-shadow: inset` 边框 + 半透明背景色标识 active 项。
展开状态的 active 背景也从纯黑 `#1a1c1e` 改为半透明彩色，与天的颜色联动。

---

## 3. "今日关闭"提醒条宽度修复 (`StopCard.jsx`)

**问题**: "Closed today!" 红色提醒条横跨整个卡片宽度，视觉上过于突兀。
**修复**:
- `display: flex` → `display: inline-flex`（内容自适应宽度）
- 父容器为 `flex-direction: column`，追加 `alignSelf: 'flex-start'` 防止被拉伸

---

## 4. 文件变动统计

| 文件 | 改动说明 |
|------|---------|
| `react-app/src/context/I18nContext.jsx` | **REWRITE**: 改用 `import.meta.glob` 自动扫描语言文件 |
| `react-app/src/i18n/zh.json` | **MODIFY**: 新增 `_meta.label` 字段 |
| `react-app/src/i18n/en.json` | **MODIFY**: 新增 `_meta.label` 字段 |
| `react-app/src/components/layout/Navbar.jsx` | **MODIFY**: 语言切换改为下拉列表 |
| `react-app/src/components/itinerary/ItineraryView.jsx` | **MODIFY**: 侧边栏高亮 state + IntersectionObserver |
| `react-app/src/styles/layout.css` | **MODIFY**: 修复收起/展开状态 active 样式 |
| `react-app/src/components/itinerary/StopCard.jsx` | **MODIFY**: 关闭提醒条改为内容自适应宽度 |

---
*Generated 2026-03-18 on branch `refactor/itinerary-v3-core`*
