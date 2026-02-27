# Project Structure & Architecture | 项目架构说明

本项目采用经典的前后端分离架构（本地化实现），旨在提供极致的交互性能与数据可靠性。

## 🏗️ 架构概览

### 1. 前端层 (Frontend)
- **技术栈**: Vanilla JS, CSS3 (Glassmorphism), HTML5.
- **核心逻辑 (`app.js`)**:
  - **状态管理**: 维护全局 `state` 对象，包含用户信息、当前视图、所有行程数据。
  - **渲染引擎**: `renderApp` 函数根据当前状态动态生成 DOM。组件化思想实现（如 `getDayHTML`, `getTripHTML`）。
  - **Google Maps 集成**: 负责地图初始化、Marker 管理、以及调用 Places Service 获取地点详情（包含 `types` 映射）。
  - **UX 增强**: 处理键盘事件（搜索框导航）、双击保存、弹窗交互等。

### 2. 后端服务层 (Backend Service)
- **核心文件 (`server.py`)**:
  - 一个轻量级的 Python HTTPServer 扩展。
  - **API 支持**:
    - `GET /data`: 从 `db.json` 读取最新的行程数据。
    - `POST /data`: 将前端提交的最新全量 `state` 写入 `db.json`。
  - **跨域支持 (CORS)**: 允许本地前端文件通过 JavaScript 进行数据交互。

### 3. 数据存储层 (Data Layer)
- **核心文件 (`db.json`)**:
  - 存储 JSON 格式的结构化数据。
  - **Schema 特性**:
    - `trips`: 行程列表，包含日期、封面 (Thumb)、分类 (Category) 等元数据。
    - `days`: 每一天包含多个 `stops`（地点、笔记、清单）。
    - `stops`: 存储地点坐标 (Lat/Lng)、照片、联系方式及 **分类图标 (categoryIcon)**。

## 📍 集成与依赖

| 依赖/服务 | 用途 | 备注 |
| :--- | :--- | :--- |
| **Google Maps JS API** | 地图渲染、POI 搜索 | 需要 `libraries=places` |
| **Flatpickr** | 日历与日期选择 | 轻量级、无依赖 |
| **LoremFlickr / Unsplash** | 封面图片随机生成 | 替换了高额成本的 Google Photos |
| **Outfit / Noto Sans SC** | Google 字体库 | 提升跨平台排版美感 |

## 🛠️ 地点分类对应表 (Category Logic)

系统通过分析 Google Places API 返回的详细 `types` 数组，匹配第一个有效的业务分类标签。
- `restaurant`, `cafe` -> 🍴 / ☕
- `airport`, `train_station` -> ✈️ / 🚆
- `lodging` -> 🏨
- `museum`, `art_gallery` -> 🏛️ / 🎨
- `park`, `zoo` -> 🌳 / 🦁

---
*Created by Antigravity AI Assistant.*
