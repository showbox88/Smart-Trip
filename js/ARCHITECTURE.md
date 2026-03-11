# Smart Trip Modular Architecture | 项目模块化架构说明

此文档描述了 Smart Trip 应用的 ES Module 模块化结构与数据流。

## 📁 目录结构

```
Smat Trip/
├── index.html              # 主入口，DOM 结构 + Modal 模板
├── style.css               # 全局样式（毛玻璃特效、动画、排版）
├── i18n/                   # 国际化语言包
│   ├── en.json             # 英文翻译
│   └── zh.json             # 中文翻译
├── server.py               # Python 轻量 REST API 后端（本地模式）
│
└── js/                     # 模块化 JavaScript 源码
    ├── main.js             # 总入口：初始化流程 + 全局 window 桥接
    ├── state.js            # 全局状态管理
    ├── api.js              # 统一 API 网关（USE_CLOUD_BACKEND 开关）
    ├── supabase_api.js     # Supabase 云端实现（认证/数据库/Storage）
    ├── local_api.js        # 本地 Python 后端实现
    ├── constants.js        # 常量定义（地点分类图标映射）
    ├── utils.js            # 通用工具函数（日期、格式化、货币、温度）
    ├── maps.js             # Google Maps 生命周期 + Routes v2 路线计算
    ├── ARCHITECTURE.md     # 本文件
    │
    └── ui/
        ├── i18n.js         # 国际化引擎：loadLanguage() + t()
        ├── render.js       # 核心渲染引擎（renderApp + 局部更新）
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
            └── ux.js           # Modal 弹窗、时间/费用选择器、拖拽排序、侧栏导航
```

## 🔗 模块详细说明

### 核心层 (`js/`)

| 文件 | 导出 | 功能描述 |
|------|------|----------|
| `state.js` | `state`, `editState`, `setEditingContext` | 全局状态对象 + Modal 编辑上下文管理 |
| `api.js` | `loadData`, `saveData`, `deleteTripById`, `uploadImage`, `deleteImages` | 统一 API 网关，通过 `USE_CLOUD_BACKEND` 切换后端 |
| `supabase_api.js` | — | Supabase 实现：认证 + trips 表 + user_settings 表 + Storage |
| `constants.js` | `PLACE_CATEGORY_MAP`, `getCategoryFromTypes` | 地点分类图标映射（餐厅🍴、机场✈️等） |
| `utils.js` | `formatDistance`, `formatDuration`, `formatCurrency`, `formatTemp`, `calculateDays`, `formatDate` | 工具函数（支持单位/语言切换） |
| `maps.js` | `initRealMap`, `setGoogleMapsReady`, `toggleMapDarkMode`, `computeTransitData` | 地图初始化 + 图钉 + 路线计算 + 暗色切换 |
| `main.js` | — | DOMContentLoaded 三段初始化（语言→loadData→语言二次校正→renderApp），50+ window 桥接 |

### 国际化层 (`js/ui/i18n.js`)

| 函数 | 说明 |
|------|------|
| `loadLanguage(code)` | 异步加载 `i18n/{code}.json`，写入 `state.settings.language` |
| `t(key)` | 支持 `'dashboard.categories.餐饮'` 嵌套 key 查询，未知 key 返回原始 key 字符串 |

### 表现层 (`js/ui/templates/`)

| 文件 | 导出函数 | 功能描述 |
|------|----------|----------|
| `auth.js` | `getLoginHTML` | 登录页 HTML |
| `dashboard.js` | `getDashboardHTML`, `getTripGridHTML` | 行程看板（含空状态 + 新建按钮） |
| `itinerary.js` | `getTripHTML`, `getDayHTML`, `getTimelineItemHTML`, `injectNewStopToDOM` | 行程详情页、天数区块、时间线卡片 |

### 逻辑层 (`js/ui/handlers/`)

| 文件 | 核心功能 |
|------|----------|
| `auth.js` | `handleAuthSubmit`, `handleGoogleLogin`, `handleLogout`, `goDashboard` |
| `trips.js` | `createNewTrip`（默认今天日期）, `openTrip`, `deleteTrip`（含图片清理）, `saveTripMetadata` |
| `stops.js` | `addDay`, `deleteDay`, `saveStop`, `deleteStop`, `autoAddStop`（Google Places）、住宿管理 `openStayInfoModal`/`saveStayInfo` |
| `search.js` | `handleSearchInput`（Places Autocomplete）, `searchImages`（loremflickr, 支持中文关键词）, `searchGoogleStopImages` |
| `ux.js` | 所有 Modal 管理、`openEditTripModal`（行程编辑 + 封面图自动搜索）、`openExpenseModal`（费用分类全本地化）、时间选择器、拖拽排序、侧栏折叠 |

## 🔄 数据流

```
用户点击 HTML
    ↓
main.js window 桥接函数
    ↓
handlers/*.js 业务逻辑
    ↓
修改 state.js 数据 → api.js saveData() / deleteTripById() 持久化
    ↓
render.js renderApp() 或 局部 DOM 更新（避免页面闪烁）
    ↓
maps.js 联动更新地图图钉与路线
```

## 🌐 初始化流程 (main.js DOMContentLoaded)

```
1. 读取 localStorage 'smart-trip-lang' → loadLanguage(cachedLang)
   （快速获得即时语言包，避免白屏）

2. 等待 Supabase SDK → loadData()
   - getSession() → 获取用户 session
   - 查询 user_settings → updateState({ user, settings })
   - 查询 trips 表 → updateState({ trips })

3. 对比 state.settings.language 与 cachedLang
   - 若不同 → 重新 loadLanguage(userLang)
   - 将 userLang 写入 localStorage（下次冷启动即时生效）

4. renderApp() — 所有数据 + 语言包已就绪
```

## 🗄️ Supabase 数据结构

| 表/Bucket | 结构 | 说明 |
|---|---|---|
| `trips` | `id, user_id, title, thumb, trip_data (JSONB)` | 每行程独立一行，`trip_data` 存完整 JSON |
| `user_settings` | `id (= user.id), settings (JSONB)` | 每用户一行，存语言/单位/货币偏好 |
| `trip-media` (Storage) | 按文件名存储 | 封面图 + 站点图，删除行程时自动清理 |

## 🚀 升级指南

1. **新增功能**：在 `handlers/` + `templates/` 创建新文件 → 在 `main.js` 导入并 `window.xxx = ...` 桥接
2. **新增翻译 key**：同时更新 `i18n/en.json` 和 `i18n/zh.json`，使用 `t('section.key')` 调用
3. **修改样式**：`style.css` 调整，HTML 结构在 `templates/` 中修改
4. **新增 API**：`supabase_api.js` 添加函数 → `api.js` 网关暴露 → `main.js` 桥接（如需全局访问）

---
*Updated 2026-03-11 by Antigravity AI Assistant.*
