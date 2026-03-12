# Smart Trip | 智能旅行规划

Smart Trip 是一款以用户体验为核心的旅行规划应用，深度集成 Google Maps、Supabase 云端服务及全面国际化支持，为用户提供沉浸式的旅行规划体验。

## 🌟 核心功能亮点

### 1. 用户认证与设置持久化
- **Supabase 云端认证**：Email/Password 注册登录，Session 自动恢复。
- **设置持久化**：语言、货币、距离、温度单位保存至云端，登录后自动加载并应用。
- **冷启动优化**：语言偏好缓存至 `localStorage`，下次打开无需等待云端响应即可立即显示正确语言。

### 2. 全自动国际化 (i18n)
- **中英双语**：全站 UI 完全国际化，无任何硬编码中文。
- **动态切换**：设置页一键切换语言，所有界面元素即时同步更新。
- **分类翻译**：费用类别（航班、餐饮、购物等）在英文界面正确显示英文。

### 3. 智能仪表盘中心
- **多维度筛选**：按行程状态（全部/进行中/计划中/已完成）实时过滤。
- **视图切换**：网格视图与列表视图无缝切换。
- **真实费用统计**：看板卡片显示所有站点累计支出。

### 4. 行程管理
- **智能默认值**：新建行程时，入住日期默认为今天，退房日期默认为5天后。
- **封面图默认关键词**：中文用"旅行"，英文用"Trip"，展示相关旅行图片。
- **完整级联删除**：删除行程时自动清理 Supabase Storage 上的所有关联图片（封面 + 站点图）。

### 5. 行程详情引擎
- **侧边栏**：折叠/展开、鼠标跟随底光效果、点击天数快速跳转。
- **时间轴**：连续垂直虚线时间轴，住宿期内自动绘制贯穿订阅线。
- **拖拽排序**：支持任意拖拽重排，边缘自动滚动。

### 6. 智能交通计算引擎
- **Google Routes v2 API**：实时计算驾车/步行路程与时长。
- **Bug 修复**：正确解析 API 返回的 `"1234s"` 字符串格式，彻底解决"永远在计算中"问题。
- **优雅降级**：坐标无效时显示"暂无数据"而非永久 Loading 状态。

### 7. 酒店住宿管理
- **入住/退房卡片**：自动创建 Check-in/Check-out 事件。
- **跨天连线**：住宿期间自动绘制贯穿连线（不被天数标题中断）。
- **交通提示**：每天行程自动显示从酒店出发 / 返回酒店的距离与时间。

### 8. Google Maps 深度集成
- **主题化渲染**：仅显示当前选中天的路线，颜色与天数主题色同步。
- **POI 搜索**：地图顶部集成分类快捷搜索，支持一键添加到行程。
- **悬停信息窗**：双栏排版（地点信息 + 实拍图），酒店卡片展示住宿详情。
- **日夜切换**：☀️/🌙 两种地图风格实时切换。

### 9. 费用追踪
- **12 类图标选择器**：航班、住宿、餐饮、购物、交通、活动、汽油、杂货等。
- **完全本地化**：选择分类后按当前语言显示翻译名称。
- **付款人/分摊**：支持查看付款人与分摊信息。

### 10. 极致 UX
- **毛玻璃美学 (Glassmorphism)**：全站深度采用背景模糊与半透明边框。
- **零闪烁局部渲染**：切换视图时仅更新受影响的 DOM 区域。
- **智能预约时间选择器**：支持 24 小时制物理惯性滚轮及 Google 营业时间休息日红色智能预警。
- **Google Places 换图**：集成 Google Places Photo API，支持直接替换实拍图。


## 📂 项目结构

```
Smat Trip/
├── index.html              # 主入口文件
├── style.css               # 全局样式
├── i18n/                   # 国际化语言包
│   ├── en.json             # 英文
│   └── zh.json             # 中文
├── server.py               # 本地 Python REST API 后端（备用）
│
└── js/                     # ES Module 模块化源码
    ├── main.js             # 总入口 + 全局桥接 + 初始化流程
    ├── state.js            # 全局状态管理
    ├── api.js              # 统一 API 网关（云端/本地切换）
    ├── supabase_api.js     # Supabase 云端实现
    ├── local_api.js        # 本地 Python 后端实现
    ├── constants.js        # 地点分类常量
    ├── utils.js            # 工具函数（日期、格式化、货币等）
    ├── maps.js             # Google Maps + 路线计算
    ├── ARCHITECTURE.md     # 详细模块架构说明
    └── ui/
        ├── i18n.js         # 国际化函数 t() + loadLanguage()
        ├── render.js       # 核心渲染引擎
        ├── templates/      # HTML 模板生成器
        │   ├── auth.js
        │   ├── dashboard.js
        │   └── itinerary.js
        └── handlers/       # 事件处理器
            ├── auth.js
            ├── trips.js
            ├── stops.js
            ├── search.js
            └── ux.js
```

*详见 [js/ARCHITECTURE.md](./js/ARCHITECTURE.md) 获取完整模块说明与数据流图。*

## 🚀 快速启动

### 云端模式（推荐）
直接访问部署地址，使用 Email/Password 注册登录即可。

### 本地开发模式
1. 启动本地后端服务：
   ```bash
   python server.py
   ```
   服务将在 `http://localhost:8000` 启动。

2. 打开浏览器访问 `http://localhost:8000`。

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| 认证 & 数据库 | Supabase (PostgreSQL + Auth) |
| 文件存储 | Supabase Storage (`trip-media` bucket) |
| 地图 | Google Maps JavaScript API + Routes v2 REST API |
| 日历 | Flatpickr |
| 本地后端 (备用) | Python 3 `http.server` |
| 国际化 | 自研 JSON-based i18n 引擎 |

---
*Created with ♥ by Antigravity AI Assistant. Last updated: 2026-03-11*
