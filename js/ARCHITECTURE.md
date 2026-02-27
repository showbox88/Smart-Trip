# Smart Trip Modular Architecture | 项目模块化架构说明

此文档描述了 Smart Trip 应用的 ES Module 模块化结构。通过这种设计，应用的功能被拆分为独立的逻辑块，便于维护、升级和多 AI/协作开发。

## 📁 目录结构

```
Smat Trip/
├── index.html              # 主入口，DOM 结构 + Modal 模板
├── style.css               # 全局样式（毛玻璃特效、动画、排版）
├── db.json                 # 本地 JSON 数据库（Git 同步）
├── server.py               # Python 轻量 REST API 后端
├── app.js.old              # 模块化前的原始单文件（参考备份）
├── README.md               # 项目说明
│
└── js/                     # 模块化 JavaScript 源码
    ├── main.js             # 总入口：初始化 + 全局 window 桥接
    ├── state.js            # 全局状态管理
    ├── api.js              # 后端 API 通信（loadData / saveData）
    ├── constants.js        # 常量定义（地点分类图标映射 + getCategoryFromTypes）
    ├── utils.js            # 通用工具函数（日期计算、格式化）
    ├── maps.js             # Google Maps 生命周期管理 + 暗色模式切换
    ├── ARCHITECTURE.md     # 本文件
    │
    └── ui/
        ├── render.js       # 核心渲染引擎（renderApp + updateNavLinks）
        │
        ├── templates/      # HTML 模板生成器（纯函数，返回 HTML 字符串）
        │   ├── auth.js         # 登录页模板
        │   ├── dashboard.js    # 行程列表看板模板
        │   └── itinerary.js    # 行程详情页 + 天数 + 时间线卡片模板
        │
        └── handlers/       # 事件处理器（业务逻辑）
            ├── auth.js         # 登录/登出处理
            ├── trips.js        # 行程 CRUD + 元数据保存
            ├── stops.js        # 目的地/笔记/清单 CRUD + Google Places 自动添加
            ├── search.js       # 地点搜索自动补全 + 封面图搜索
            └── ux.js           # 交互效果（Modal 弹窗、拖拽排序、时间/费用选择器、侧栏导航）
```

## 🔗 模块详细说明

### 核心层 (`js/`)

| 文件 | 导出 | 功能描述 |
|------|------|----------|
| `state.js` | `state`, `editState`, `setEditingContext` | 全局状态对象 + Modal 编辑上下文管理 |
| `api.js` | `loadData`, `saveData` | 与 `server.py` 的 REST API 通信 |
| `constants.js` | `PLACE_CATEGORY_MAP`, `getCategoryFromTypes` | 地点分类图标映射（餐厅🍴、机场✈️等） |
| `utils.js` | `calculateDays`, `formatDate`, `generateId` | 日期差计算、日期格式化 |
| `maps.js` | `initRealMap`, `setGoogleMapsReady`, `toggleMapDarkMode` | 地图初始化、图钉管理、暗色模式切换 |
| `main.js` | — | 入口：DOMContentLoaded 初始化、40+ window 桥接、全局错误处理、全局点击监听 |

### 表现层 (`js/ui/templates/`)

| 文件 | 导出函数 | 功能描述 |
|------|----------|----------|
| `auth.js` | `getLoginHTML` | 登录页 HTML |
| `dashboard.js` | `getDashboardHTML` | 行程列表看板（含空状态 + 新建按钮） |
| `itinerary.js` | `getTripHTML`, `getDayHTML`, `getTimelineItemHTML`, `getDay`, `injectNewStopToDOM` | 行程详情页、天数区块、时间线卡片（地点/笔记/清单）、DOM 注入 |

### 逻辑层 (`js/ui/handlers/`)

| 文件 | 核心功能 |
|------|----------|
| `auth.js` | `handleLogin`, `handleLoginKey`, `goDashboard`, `startPlanning` |
| `trips.js` | `createNewTrip`, `openTrip`, `deleteTrip`, `shareTrip`, `toggleMenu`, `saveTripMetadata` |
| `stops.js` | `addDay`, `deleteDay`, `saveStop`, `deleteStop`, `autoAddStop`（Google Places API）、笔记/清单 CRUD、DOM 注入避免闪烁 |
| `search.js` | `handleSearchInput`（自动补全）、`handleSearchKeyDown`（键盘导航）、`handleDropdownClick`、`searchImages`（封面图）、`selectImage` |
| `ux.js` | Modal 管理、`openEditTripModal`（行程编辑）、`openEditModal`（目的地编辑）、时间选择器、费用弹窗、拖拽排序（仅重绘受影响 Day）、侧栏折叠/导航 |

## 🔄 数据流

```
用户点击 HTML
    ↓
main.js window 桥接函数
    ↓
handlers/*.js 业务逻辑
    ↓
修改 state.js 数据 → api.js saveData() 持久化
    ↓
render.js renderApp() 或 局部 DOM 更新（避免页面闪烁）
    ↓
maps.js 联动更新地图图钉
```

## 🚀 升级指南

1. **新增功能**：在 `handlers/` + `templates/` 创建新文件 → 在 `main.js` 导入并 `window.xxx = ...` 桥接
2. **修改样式**：`style.css` 调整，HTML 结构在 `templates/` 中修改
3. **新增 API**：在 `server.py` 添加路由，`api.js` 添加对应函数

---
*Updated 2026-02-27 by Antigravity AI Assistant.*
