# Cloud Media & Cascading Delete — 2026-03-18

> **scope**: 图片云端存储、本地上传集成、级联删除清理、Vite 代理修复
> **branch**: `feature/cloud-media-upload`
> **files changed**: 5 files, +150 / -20 lines

---

## 1. Supabase Cloud Media 集成 (Supabase Storage)

### 1.1 统一上传工具 (`uploadHelpers.js` — NEW)

为了保持系统架构的一致性，将图片存储从本地 Python 服务器转向 Supabase Storage 云端。

- **uploadToSupabase**: 支持 File 对象直接上传至 `trip-media` bucket，自动生成唯一文件名（时间戳 + 哈希）。
- **deleteFilesFromSupabase**: 支持通过文件名列表从 Storage 中批量清理文件。

### 1.2 本地图片上传功能 (`StopCard.jsx`, `TripEditModal.jsx`)

在现有的照片更换逻辑中无缝集成了本地上传能力：

- **行程封面**: 在搜索建议下方新增“本地上传”按钮，支持自定义行程封面。
- **站点照片**: 在卡片照片选择下拉框顶部新增“本地上传”，支持用户上传实拍图或收据。
- **自动预览**: 上传成功后立即获取 Public URL 并更新 UI，实现零延迟反馈。

---

## 2. 完整级联删除逻辑 (Cascading Delete)

### 2.1 存储空间自动清理 (`useTrips.js`)

**问题**: 之前删除行程仅删除数据库记录，导致 Supabase Storage 产生大量孤立（Orphaned）图片文件。
**方案**: 在 `deleteTrip` 钩子中引入级联清理逻辑：

1. **资源识别**: 预先从行程及其所有站点中提取所有属于 `trip-media` 的云端图片路径。
2. **异步清理**: 在删除数据库记录前，调用 `deleteFilesFromSupabase` 批量移除这些文件。
3. **数据库同步**: 确保存储空间清理后再提交数据库删除，保证数据一致性。

---

## 3. 开发环境优化 (Dev Environment Fixes)

### 3.1 Vite 代理配置 (`vite.config.js`)

**问题**: 前端 Vite 开发服务器（5173 端口）无法直接访问后端 Python API（8000 端口），导致本地上传报 404 错误。
**修复**: 添加 `server.proxy` 配置：

- `/api` 转发至 `http://localhost:8000`
- `/uploads` 转发至 `http://localhost:8000`（兼容旧有本地存储方案）

---

## 4. 文件变动统计

| 文件 | 改动说明 |
|------|---------|
| `react-app/src/utils/uploadHelpers.js` | **NEW**: 增加 Supabase Storage 交互逻辑 |
| `react-app/src/hooks/useTrips.js` | **MODIFY**: 实现删除行程时的图片级联清理 |
| `react-app/src/components/itinerary/StopCard.jsx` | **MODIFY**: 照片选择器集成本地上传按钮 |
| `react-app/src/components/modals/TripEditModal.jsx` | **MODIFY**: 行程编辑集成封面上传功能 |
| `react-app/vite.config.js` | **MODIFY**: 添加后端 API 代理设置 |

---
*Generated 2026-03-18 on branch `feature/cloud-media-upload`*
