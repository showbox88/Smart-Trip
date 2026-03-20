# 地图切换器与行程交互升级 — 2026-03-20 (Session 2)

> **scope**: 地图源切换（Google/Dark/Night）、行程单头部重排、相册清晰度优化、数据自动同步
> **branch**: `feature/map-switcher-and-ux`
> **files changed**: `App.jsx`, `MapView.jsx`, `AlbumsView.jsx`, `DayHeader.jsx`

---

## 1. 地图多源切换系统 (Map Provider Switcher)

### 新增功能
- **四合一地图源**：在 Trip Archive 地图中集成了悬浮切换组件，支持：
  - **Dark Mode (Carto)**：原有的极简深色地图。
  - **Google Roadmap**：标准的 Google 路线图。
  - **Google Satellite Hybrid**：高精度卫星图，带地标和道路名称。
  - **Google Night (Custom)**：通过 CSS 滤镜实现的 Google 深色模式，保持了地图的细节且更护眼。
- **平滑切换**：切换图层时保持当前的缩放级别和地图中心点，轨迹线（Route）无缝覆盖。

---

## 2. 行程单 (Itinerary) 视觉与数据增强

### 改进点
- **日历头部重排**：为了防止遮挡后面的内容，将“Day 1”、“日期”和“星期几”改为了 **三行居中排列** 模式。
- **数据汇总展示**：现在在折叠的 Day Header 区域，可以直接看到该日的 **Stop 总数** 和 **当日总开销**（自动汇总汇总消费）。
- **色彩防重复**：将 `DAY_COLORS` 扩展至 7 种，确保一周之内的日期呈现不重样的颜色。

---

## 3. 相册 (Albums/Gallery) 全面清晰化

### 改进点
- **图片去模糊**：移除了 Gallery 整体布局的 `backdrop-blur-3xl` 遮罩效果，提升整体观感。
- **封面亮度提升**：移除了覆盖在相册封面上的全屏梯度遮影 (`trip-card-gradient`)。现在相册封面呈现 **原图真实亮度和清晰度**，仅在底部的文字区域保留极细微的保护性背景。
- **背景优化**：将相册页面的背景色从极黑改为 **Slate-900 (蓝黑)**，增强视觉通透感。

---

## 4. 智能数据同步 (Automation)

- **城市信息自动沉淀**：同步 Smart Trip 数据时，会自动将行程中的城市添加到右键菜单的城市数据库中，避免重复录入。
- **照片城市属性关联**：当一张照片被归类到某个 Event 时，其 `city` 属性会自动同步为该 Event 的所属城市，大大简化了后期整理工作。

---

## 5. Google Login (OAuth) 授权登录支持

### 新增功能
- **一键授权登录**：启用了 Google OAuth 授权。用户可以通过点击 Google 按钮快速登录，无需输入密码。
- **头像自动同步**：登录后，系统会自动提取 Google 账号的个人头像，并显示在右上角的导航栏及 Trip Archive 的用户中心。
- **用户信息集成**：系统会自动记录 Google 提供的 `full_name` 作为用户昵称，并在个人中心显示完整。
- **架构升级**：更新了 `useAuth` 钩子，支持 OAuth 回调处理策略，并增强了用户元数据的提取逻辑。

---

## 6. 文件变动统计

| 模块 | 主要文件 |
|------|---------|
| **Auth** | `AuthForm.jsx`, `useAuth.js` |
| **Nav & Profile** | `Navbar.jsx`, `App.jsx` (archive) |
| **Route Sync** | `ArchivePage.jsx` |

---
*Generated 2026-03-20 by AntiGravity*
