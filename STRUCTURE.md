# Project Structure & Architecture | 项目架构说明

本项目采用现代化的 ES Module 模块化架构，旨在提供清晰的代码组织、极致的交互性能与数据可靠性。

## 🏗️ 架构概览

### 1. 前端层 (Frontend - `js/`)
- **技术栈**: Vanilla JS (ES Modules), CSS3 (Glassmorphism), HTML5.
- **入口 (`main.js`)**: 负责初始化、全局错误处理、以及将模块化函数桥接到 `window` 对象以便 HTML 属性调用。
- **状态管理 (`state.js`)**: 维护全局 `state` 对象（用户信息、行程数据）及编辑上下文 (`editState`)。
- **UI 渲染 (`ui/`)**:
    - **渲染引擎 (`render.js`)**: 控制整体应用的视图切换与局部 DOM 更新。
    - **模板系统 (`templates/`)**: 纯函数组件，生成登录、看板及行程详情的 HTML。内置**侧边栏状态控制**逻辑，支持宽窄视图无缝切换。
- **样式系统 (`css/`)**:
    - **变量与基础 (`variables.css`, `base.css`)**: 定义设计系统令牌与重置样式。
    - **组件化 (`components.css`)**: 封装卡片、按钮、模态框等 UI 单元。
    - **响应式模块 (`css/responsive/`)**:
        - `desktop.css`: 1101px+ 宽屏优化。
        - `tablet.css`: 901px-1100px 平板模式。
        - `mobile.css`: 900px 以下移动端模式（含视图切换逻辑）。
    - **按需激活**: 在 `index.html` 中通过 `media` 属性实现 CSS 模块的物理隔离加载，彻底解耦多端排版逻辑。
- **地图集成 (`maps.js`)**: 封装 Google Maps 生命周期、Marker 管理及 POI 详情面板。
- **业务逻辑 (`handlers/`)**: 处理认证、行程管理、地点搜索及极致的 UX 交互。包含**高精度路程汇总正则引擎**，负责处理异构路程数据的清洗与累加。

### 2. 后端服务层 (Backend Service)
- **核心文件 (`server.py`)**:
    - 基于 Python `http.server` 的轻量级 REST API。
    - **API 支持**:
        - `GET /api/data`: 读取 `db.json` 全量数据。
        - `POST /api/save`: 全量保存 `state` 到 `db.json`。
        - `POST /api/upload-image`: 本地缓存远程图片。
        - `POST /api/upload-local`: 通过 Base64 上传并转存本地物理文件。
        - `POST /api/delete-image`: 删除指定的本地缓存图片。
        - `GET /api/cleanup-images`: 管理员功能，清理孤立的图片资源。

### 3. 数据存储层 (Data Layer)
- **核心文件 (`db.json`)**:
    - 存储 JSON 格式的结构化数据，支持 Git 同步。
    - **Schema 结构**: `user`, `trips`, `activeTripId` 等核心状态字段。

### 4. React 前端层 (Frontend - `react-app/`)

> **分支**: `refactor/itinerary-v3-core` — 行程核心的 React 重构版本

- **技术栈**: React 18 + Vite, Context API, CSS Modules (Glassmorphism)
- **入口**: `src/pages/` 路由页面，`src/App.jsx` 顶层路由配置

#### 状态管理
- **`context/AppContext`**: 全局状态 (当前行程、用户信息、UI 状态如 `hoveredStopId`)
- **`context/I18nContext`**: 国际化上下文，支持 `t('key')` 模板调用

#### 自定义 Hooks (`src/hooks/`)
| Hook | 职责 |
|------|------|
| `useTripEditor.js` | 行程 CRUD：addStop / deleteStop / updateStop / moveStop / addDay / updateDay |
| `useTimelineDrag.js` | 跨天 Pointer Events 拖拽系统，30% 重叠阈值 + CSS Transform 位移动画 |
| `useTrips.js` | 行程列表查询 & 缓存 |
| `useStopSearch.js` | Google Places 搜索 + 防抖 |
| `useSidebarGlow.js` | 侧边栏鼠标跟随光晕效果 |
| `useAuth.js` | Supabase 认证状态管理 |

#### 行程组件树 (`src/components/itinerary/`)
```
ItineraryView                    ← 行程主视图，挂载 timelineRef，管理拖拽/模态框状态
├── TripHeader                   ← 行程标题、日期、封面
├── TripSidebar                  ← 天数导航侧栏
├── MapPanel                     ← Google Maps 集成
│   ├── MapSearchBox             ← 地图搜索控件
│   └── MapInfoPanel             ← POI 悬停信息面板
└── DaySection[]                 ← 每日时间线容器
    ├── DayHeader                ← 天标题、主题色、折叠控制
    ├── StopCard[]               ← 地点卡片（含关门预警、拖拽、照片选择）
    ├── NoteCard[]               ← 笔记卡片（contentEditable）
    ├── ListCard[]               ← 清单卡片（勾选/增删项）
    ├── TransitInfo              ← 交通信息（驾车/步行）
    ├── HotelStayLine            ← 酒店住宿连线
    └── AddStopRow               ← 添加地点/笔记/清单入口
```

#### 模态框 (`src/components/modals/`)
| 组件 | 功能 |
|------|------|
| `TimePickerModal` | 时间滚轮选择器，含营业时间对照 & 关门预警 |
| `ExpenseModal` | 费用录入，12 类图标分类选择 |
| `DayEditModal` | 日期调整 |
| `TripEditModal` | 行程元数据编辑 |
| `StopEditModal` | 地点详情编辑 |
| `ConfirmModal` | 通用确认弹框 |

#### 样式系统 (`src/styles/`)
- `variables.css` — 设计令牌（颜色、字体、间距）
- `base.css` — 重置 + 全局动画 (`pulse-border`)
- `itinerary.css` — 时间线、卡片、拖拽样式
- `components.css` — 按钮、输入框、标签
- `maps.css` — 地图面板
- `layout.css` — 布局框架
- `responsive/` — desktop / tablet / mobile 物理隔离

#### 数据流: 拖拽排序
```
PointerDown → 记录起始位置 (不 preventDefault)
    ↓ 移动 > 5px
PointerMove → setPointerCapture → initDrag (快照所有卡片 rect)
    ↓
updateDrag → translateY 拖拽卡片 + 30% 重叠检测 → 位移其他卡片
    ↓
PointerUp → finishDrag → 计算 targetDayId + afterStopId → moveStop()
```

---

## 📍 集成与依赖

| 依赖/服务 | 用途 | 备注 |
| :--- | :--- | :--- |
| **Google Maps API** | 地图渲染、POI 自定义快速搜索控件、路由计算 | 使用 `AdvancedMarkerElement` |
| **Flatpickr** | 日历与日期选择 | 修改后的 Dark 主题 |
| **Routes API** | 智能路网绘制 | 按天绘制专属主题色路线 |

---
*详见 [js/ARCHITECTURE.md](./js/ARCHITECTURE.md) 获取更底层开发细节。*

## 🛠️ 地点分类对应表 (Category Logic)

系统通过分析 Google Places API 返回的详细 `types` 数组，匹配第一个有效的业务分类标签。
- `restaurant`, `cafe` -> 🍴 / ☕
- `airport`, `train_station` -> ✈️ / 🚆
- `lodging` -> 🏨
- `museum`, `art_gallery` -> 🏛️ / 🎨
*Updated 2026-03-15 by Antigravity AI Assistant.*
