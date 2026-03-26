# 地址卡翻转高度修复 — 2026-03-26 (patch)

> **scope**: 3D 翻转卡片背面溢出修复  
> **files changed**: `itinerary.css`

---

## 问题描述

内容较少的紧凑型地址卡（如只有地点名、无备注）在翻转后，背面的 2×2 功能图标网格会超出原卡片高度边界，视觉溢出。

## 根本原因

- `.stop-card-inner` 使用 `height: 100%` 被动继承父容器高度
- 父容器高度由**正面内容**撑开（最短约 120px）
- 背面 `.rich-stop-card-back` 的 `height: 100%` 因此只有 120px
- 2×2 图标网格（`height: 100%` on grid）被压缩到同等高度，导致溢出或显示异常
- 原 `min-height: 200px` 不足以容纳完整的 2 行图标布局（实际需要约 280px）

## 修复方案

| 元素 | 原来 | 修复后 |
|------|------|--------|
| `.stop-card-container` | `min-height: 200px` | `min-height: 280px` |
| `.stop-card-inner` | `height: 100%`（被动） | `display: flex; min-height: 280px`（主动） |
| `.rich-stop-card-front` | `min-height: inherit` | `flex: 1`（填满 inner） |
| `.rich-stop-card-back` | `height: 100%; min-height: 200px` | `height: 100%; min-height: 280px; box-sizing: border-box` |
| `.back-content-grid` | `height: 100%` | `flex: 1`（不再依赖父高） |

## 效果

- 所有地址卡（新旧）翻转后背面高度统一不低于 280px
- 内容丰富的卡片（高度 > 280px）不受影响，正常扩展
- 2×2 图标网格始终有足够空间居中展示

---

## 模块文件清单

| 模块 | 文件 |
|------|------|
| **行程样式** | `src/styles/itinerary.css` |
