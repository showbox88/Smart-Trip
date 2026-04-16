# Smart Trip — 代码架构索引

> 重构后的完整文件结构与职责说明，用于未来修改时快速定位代码。
> 最后更新：2026-04-16（Phase 1-6 重构完成后）

---

## 顶层结构

```
src/
├── App.jsx                    # 路由 + 全局 Provider 包装
├── main.jsx                   # 应用入口
├── index.css                  # 全局样式入口（已迁至 styles/index.css）
│
├── components/                # UI 组件（按领域分目录）
├── context/                   # React Context（全局状态）
├── hooks/                     # 自定义 Hooks
├── pages/                     # 页面级组件（路由终点）
├── styles/                    # 全局 CSS 文件
├── theme/                     # 主题系统（色彩 / 布局变体）
├── utils/                     # 纯工具函数（无 React 依赖）
├── data/                      # 静态数据（国家代码映射等）
└── lib/                       # 第三方库封装（Supabase client）
```

---

## 1. Pages — 路由终点

每个页面对应一个路由，通常很薄，组合多个组件。

| 文件 | 路由 | 职责 |
|------|------|------|
| `pages/LoginPage.jsx` | `/login` | 登录/注册入口 |
| `pages/DashboardPage.jsx` | `/` | 行程列表、样式选择器 |
| `pages/TripPageV2.jsx` | `/trip-v2/:id` | V2 行程详情（主视图） |
| `pages/DayPage.jsx` | `/day/:tripId/:dayId` | 单日视图 |
| `pages/TodayPage.jsx` | `/today` | 今日打卡页 |
| `pages/CalendarPage.jsx` | `/calendar` | 日历视图 |
| `pages/MapPage.jsx` | `/map` | 独立地图浏览页 |
| `pages/SharedTripPage.jsx` | `/shared/:token` | 公开分享链接 |
| `pages/AdminPage.jsx` | `/admin` | 管理后台（API 监控/清理/修复） |

---

## 2. Components — UI 组件

### 2.1 `components/itinerary/` — 行程编辑核心（最大模块）

**桌面端主视图链条：**
```
ItineraryView              # 顶层容器，持有 useTripEditor 实例
  ├── TripHeader           # 顶部标题栏（标题、日期、图片、预算）
  ├── TripSidebar          # 左侧缩略导航（日期跳转、拖拽排序）
  └── DaySection           # 单日容器（下含多个 card 类型）
        ├── DayHeader      # 日期头部（日期、颜色、折叠）
        ├── AddStopRow     # 插入行（加地点/笔记/列表/交通/活动）
        ├── StopCard       # 地点卡片（主要内容卡，800+ 行）
        │     ├── HotelLine            # 酒店连线视觉
        │     ├── TransitInfo          # 交通信息展示
        │     ├── PlanBPanel           # 备选方案面板
        │     ├── PhotoSheet           # 照片附件面板
        │     ├── PrivateNoteSheet     # 私密笔记面板
        │     └── PhotoPickerDropdown  # 照片选择器
        ├── NoteCard       # 笔记卡
        ├── ListCard       # 清单卡
        └── TransportCard  # 交通卡
```

**重要组件：**

| 文件 | 行数 | 职责 |
|------|------|------|
| `ItineraryView.jsx` | 576 | 顶层容器；调用 `useTripEditor()`，通过 `EditOperationsProvider` 注入所有编辑回调 |
| `DaySection.jsx` | 357 | 单日卡片容器；14 个 props（重构前 37+） |
| `StopCard.jsx` | 802 | 地点卡片；使用 `useStopCardState` 和 `useEditOperations` |
| `TripHeader.jsx` | 437 | 顶部标题栏；blossom 主题 CSS 已提取 |
| `TripSidebar.jsx` | 236 | 侧边栏；CSS 已提取 |
| `DayHeader.jsx` | 332 | 日期头部；CSS 已提取 |
| `MapPanel.jsx` | 1255 | 地图面板（路线绘制已提取到 `utils/mapRouteDrawing.js`） |
| `MapInfoPanel.jsx` | ~900 | 地图点击地点详情弹窗 |
| `TransitInfo.jsx` | — | 交通步骤展示（使用 `transitHelpers`） |
| `AddStopRow.jsx` | — | 插入操作行；支持 props 覆盖 context 默认值 |

**Plan B 子模块：**
- `PlanBPanel.jsx` — 备选面板容器
- `PlanBCard.jsx` — 单个备选卡
- `PlanBSearchBar.jsx` — 备选搜索栏

**其他辅助：**
- `HotelLine.jsx` / `HotelStayLine.jsx` — 酒店连线视觉
- `StopImage.jsx` — 图片组件
- `NearbyCheckinPanel.jsx` — 附近打卡面板
- `TodayScheduleModal.jsx` — 今日行程弹窗
- `DeleteConfirm.jsx` — 删除确认
- `MapSearchBox.jsx` — 地图搜索框
- `TransportCardModal.jsx` — 交通详情弹窗

### 2.2 `components/itinerary/mobile/` — 移动端视图

移动端有独立的视图组件，从 MobileItineraryView (原 1721 行) 拆分：

| 文件 | 职责 |
|------|------|
| `MobileItineraryView.jsx` (420) | 移动端主视图容器 |
| `MobileHero.jsx` | Hero 轮播图 |
| `MobileDayStrip.jsx` | 日期选择条 |
| `MobileStopRow.jsx` | 站点行渲染 |
| `CityInfoModal.jsx` | 城市信息弹窗 |
| `mobileStyles.js` | 共享样式常量（FONT, HBTN 等） |

### 2.3 `components/dashboard/` — 仪表板

| 文件 | 职责 |
|------|------|
| `TripGrid.jsx` | 网格布局行程卡片 |
| `TripAlbumGrid.jsx` | 相册风格网格 |
| `TripCard.jsx` | 单个行程卡（完整版） |
| `BudgetSummary.jsx` | 预算总结 |
| `DashboardFilters.jsx` | 状态筛选 |
| `CompactStylePicker.jsx` (147) | 紧凑卡片样式选择器（CSS 已提取） |
| `CompactCardStyles.jsx` | 老版单文件（已拆分，保留以防回退） |
| `card-styles/` | 11 种紧凑卡变体（每个独立文件） |

**`card-styles/` 目录：**
```
card-styles/
├── index.js              # Barrel file，导出所有变体 map
├── shared.jsx            # 共享 MenuBtn + baseCard 常量
├── SakuraCard.jsx        # 樱花风
├── MinimalCard.jsx       # 极简
├── PolaroidCard.jsx      # 拍立得
├── BoardingPassCard.jsx  # 登机牌
├── MagazineCard.jsx      # 杂志
├── HankoCard.jsx         # 印章
├── PostcardCard.jsx      # 明信片
├── LuggageTagCard.jsx    # 行李牌
└── FilmStripCard.jsx     # 胶片
```

### 2.4 `components/modals/` — 模态弹窗

| 文件 | 职责 |
|------|------|
| `TripEditModal.jsx` (789) | 行程元数据编辑（标题/日期/图片/气候/关联） |
| `ConfirmModal.jsx` | 通用确认 |
| `DayEditModal.jsx` | 单日编辑 |
| `StopEditModal.jsx` | 站点编辑 |
| `ActivityDetailModal.jsx` | 活动详情 |
| `ExpenseModal.jsx` | 费用记录 |
| `ShareModal.jsx` | 分享链接 |
| `StayInfoModal.jsx` | 酒店入住信息 |
| `TimePickerModal.jsx` | 时间选择器 |
| `trip-edit/blossomModalCSS.js` | Blossom 主题模态 CSS |

### 2.5 `components/layout/` — 布局外壳

| 文件 | 职责 |
|------|------|
| `Navbar.jsx` | 顶部导航栏 |
| `BottomNav.jsx` | 移动端底部导航 |
| `ProfilePanel.jsx` | 个人资料抽屉 |

### 2.6 其他领域

| 目录 | 职责 |
|------|------|
| `auth/` | 登录表单 |
| `climate/` | 气候卡片 / 目的地输入 |
| `common/` | 通用组件（加载/颜色选择/主题切换/调试） |
| `emergency/` | 紧急 SOS（按钮/弹窗/附近/领事馆/电话） |
| `map/` | GPS 地图模态 |
| `today/` | 今日打卡卡片 |
| `shared/` | 跨视图共享（TripCardMenu） |

---

## 3. Context — 全局状态

| 文件 | 职责 | Provider 位置 |
|------|------|-------------|
| `AppContext.jsx` | 全局应用状态（用户/行程列表/设置/主题） | `App.jsx` 顶层 |
| `I18nContext.jsx` | 国际化 `t()` 函数 | `App.jsx` 顶层 |
| `EditOperationsContext.jsx` | 行程编辑回调（25+ 操作） | `ItineraryView` / `MobileItineraryView` |

**关键设计：** `EditOperationsContext` 是 Phase 4 的产物，消除了 DaySection → Card 链路上 30+ props 的层层传递。消费者用 `useEditOperations()` 直接获取所需回调。

---

## 4. Hooks — 自定义 Hooks

### 4.1 `hooks/trip-editor/` — useTripEditor 子 hooks

`useTripEditor.js` (124 行 facade) 组合以下 7 个子 hooks：

| 子 Hook | 行数 | 职责 |
|---------|------|------|
| `useTripCrud.js` | ~300 | 核心 CRUD：addDay, deleteDay, deleteStop, updateStop, moveStop 等 |
| `useTripContent.js` | ~100 | 内容项：addNote, addList, updateNote 等 |
| `useTripTransit.js` | ~160 | 交通计算：computeTransitData, toggleTransitMode |
| `useTripPlaceAdd.js` | ~200 | 地点添加（Google Places API 集成） |
| `useTripPlanB.js` | 198 | Plan B：addPlanBAlternative, swapPlanB |
| `useTripStay.js` | 63 | 住宿：saveStayInfo |
| `useTripMetadata.js` | 52 | 元数据：updateTripMetadata |

**重要：** `useTripEditor.js` 是 facade 模式——调用方的 API 完全不变，内部组合各子 hooks。

### 4.2 顶层 Hooks

**数据层：**
- `useAuth.js` — Supabase 认证
- `useTrips.js` / `useTripsV2.js` — 行程 CRUD（V1/V2）
- `useDays.js` — days_v2 表操作
- `useArchiveSync.js` — 本地 localStorage ↔ 云端同步

**UI 状态：**
- `useStopCardState.js` (156) — StopCard 的 11+ useState 封装
- `useItineraryUIState.js` — 行程视图 UI 状态
- `useSidebarDrag.js` — 侧边栏拖拽
- `useSidebarGlow.js` — 侧边栏光晕动画
- `useTimelineDrag.js` — 时间线拖拽
- `useLightboxGallery.js` — 照片灯箱

**功能：**
- `useCheckIn.js` / `useGpsCheckin.js` — 打卡
- `useFavorites.js` — 收藏
- `useClimateData.js` — 气候数据
- `useCityInfo.js` — 城市信息
- `useStopSearch.js` — 地点搜索
- `useMapPlaceDetails.js` — 地图地点详情
- `useNearbyRecommend.js` — 附近推荐
- `useEmergencyNearby.js` — SOS 附近
- `useStayInfoForm.js` — 酒店信息表单
- `useColorOverrides.js` — 颜色覆盖
- `useDeviceType.js` — 设备类型检测

---

## 5. Utils — 纯工具函数

| 文件 | 职责 |
|------|------|
| `formatters.js` | 日期/时间/货币/时长格式化（Phase 1 合并） |
| `categoryHelpers.js` | 分类图标映射 + hotel 检测（Phase 1 新建） |
| `transitHelpers.js` | 交通模式图标 + 路线时长计算 |
| `activityHelpers.js` | 活动图标 + 标签 + 时长 |
| `mapRouteDrawing.js` | 地图路线绘制（Phase 2D 从 MapPanel 提取） |
| `tripHelpers.js` | 行程通用工具（地点类型映射等） |
| `tripFactory.js` | 新行程数据工厂 |
| `tripEditorHelpers.js` | 编辑器辅助函数 |
| `dayHelpers.js` | 日期处理 |
| `stayHelpers.js` | 酒店入住计算 |
| `climateApi.js` / `cityInfoApi.js` | 外部 API 封装 |
| `googleMapsLoader.js` | Google Maps JS 加载器 |
| `routeCache.js` | 路线计算缓存 |
| `apiGuard.js` | API 调用限流 |
| `uploadHelpers.js` | 图片上传 |
| `geolocation.js` | GPS 定位 |
| `admin.js` | 管理员判定 |

---

## 6. Theme — 主题系统

| 文件 | 职责 |
|------|------|
| `index.js` | 对外 API 导出 |
| `useTheme.js` | Hook：读取当前主题 |
| `ThemeContext.jsx` | Provider |
| `presetThemes.js` | 预设主题列表（blossom, clean, default 等） |
| `semanticColors.js` | 语义色（primary, surface 等） |
| `themeDefaults.js` | 默认值 |
| `themeSchema.js` | 主题数据结构 |
| `themeStorage.js` | localStorage 持久化 |
| `themeMigrations.js` | 旧版本数据迁移 |
| `themeUtils.js` | 颜色运算 |
| `tokens.css` | CSS 设计 token（--md-sys-color-* 等） |

---

## 7. Styles — 全局 CSS

### 入口与核心
| 文件 | 用途 |
|------|------|
| `index.css` | 主入口（按顺序 import 所有 CSS） |
| `variables.css` | CSS 变量 |
| `base.css` | 基础样式（body, html, reset） |
| `components.css` | 通用组件样式 |
| `layout.css` | 布局 |
| `layout-variants.css` | 布局变体（clean vs glass） |
| `utilities.css` | **工具类**（Phase 6 新建：.flex-center/.flex-col/.text-truncate 等） |

### 领域 CSS
| 文件 | 覆盖范围 |
|------|----------|
| `itinerary.css` | 行程视图 |
| `maps.css` | 地图 |
| `calendar.css` | 日历 |
| `auth.css` | 登录 |
| `planb.css` | Plan B 面板 |
| `blossom.css` | **Blossom 主题**（Phase 5A 从 DayHeader/TripHeader/TripSidebar 提取） |
| `mobile-itinerary.css` | **移动端行程**（Phase 5A 从 MobileItineraryView 提取） |
| `compact-picker.css` | **紧凑样式选择器**（Phase 5A 从 CompactStylePicker 提取） |
| `admin.css` | **管理后台**（Phase 6 从 AdminPage 提取） |

### 响应式
| 文件 | 范围 |
|------|------|
| `responsive/desktop.css` | `min-width: 1101px` |
| `responsive/tablet.css` | `901px - 1100px` |
| `responsive/mobile.css` | `max-width: 900px` |

---

## 8. 关键架构模式

### 8.1 编辑操作 Context 模式
```jsx
// ItineraryView 创建 editOps
const editOps = useMemo(() => ({
  onDeleteStop, onAddNote, onAddList, /* ...25 个回调 */
}), [/* deps */]);

<EditOperationsProvider value={editOps}>
  <DaySection day={day} dayIndex={i} /* 只传必要 props */ />
</EditOperationsProvider>

// 子组件消费
const { onDeleteStop, onAddNote } = useEditOperations();
```

### 8.2 useTripEditor Facade 模式
```js
export function useTripEditor(tripId) {
  // 核心基础设施
  const { applyUpdate, withTripUpdate } = /* ... */;

  // 组合子 hooks
  const crud = useTripCrud(withTripUpdate, ...);
  const content = useTripContent(withTripUpdate, ...);
  const transit = useTripTransit(trip, state, ...);
  // ...

  // 返回统一 API（调用方不感知拆分）
  return { ...crud, ...content, ...transit, /* ... */ };
}
```

### 8.3 卡片样式 Barrel 导出
```js
// card-styles/index.js
import { SakuraCard } from './SakuraCard';
import { MinimalCard } from './MinimalCard';
// ...
export const COMPACT_STYLES = [
  { id: 'sakura', label: '樱花', component: SakuraCard },
  { id: 'minimal', label: '极简', component: MinimalCard },
  // ...
];
```

### 8.4 Props 覆盖 Context 模式（AddStopRow）
```jsx
function AddStopRow({ onAddNote: onAddNoteProp, ...rest }) {
  const ops = useEditOperations();
  const onAddNote = onAddNoteProp || ops.onAddNote;
  // 默认走 context，特殊场景可通过 prop 覆盖
}
```

---

## 9. 常见修改场景索引

### "要修改站点卡片的显示"
→ `components/itinerary/StopCard.jsx`（UI）
→ `hooks/useStopCardState.js`（状态逻辑）

### "要添加新的编辑操作"
1. 在对应子 hook 添加实现：`hooks/trip-editor/useTripCrud.js` 等
2. 在 `useTripEditor.js` facade 导出
3. 在 `ItineraryView.jsx` 的 `editOps` 对象添加
4. 消费者用 `useEditOperations()` 调用

### "要新增一种紧凑卡片样式"
1. 创建 `components/dashboard/card-styles/MyNewCard.jsx`
2. 在 `card-styles/index.js` 注册到 `COMPACT_STYLES` 数组

### "要改全局样式变量"
→ `theme/tokens.css`（设计 token）
→ `styles/variables.css`（CSS 变量）

### "要修改响应式布局"
→ `styles/responsive/{desktop,tablet,mobile}.css`

### "要改行程编辑的保存逻辑"
→ `hooks/useTripEditor.js` 中的 `scheduleCloudSave` / `applyUpdate`

### "要添加新的工具函数"
→ `utils/` 下对应领域文件，避免在组件内定义

### "要修改地图路线绘制"
→ `utils/mapRouteDrawing.js`（纯函数）
→ `components/itinerary/MapPanel.jsx`（调用方）

### "要添加移动端独特 UI"
→ `components/itinerary/mobile/` 下创建新组件
→ 在 `MobileItineraryView.jsx` 组合

---

## 10. 文件规模基线（重构后）

**最大文件 TOP 10：**
1. `components/itinerary/MapPanel.jsx` — 1255 行
2. `components/itinerary/MapInfoPanel.jsx` — ~900 行
3. `components/itinerary/StopCard.jsx` — 802 行
4. `components/modals/TripEditModal.jsx` — 789 行
5. `pages/AdminPage.jsx` — ~900 行
6. `components/itinerary/ItineraryView.jsx` — 576 行
7. `components/itinerary/TripHeader.jsx` — 437 行
8. `components/itinerary/mobile/MobileItineraryView.jsx` — 420 行
9. `components/itinerary/DaySection.jsx` — 357 行
10. `components/itinerary/DayHeader.jsx` — 332 行

**Hook 与 Util：** 均小于 350 行，useTripEditor facade 仅 124 行。

---

## 11. 构建产物规模

- **JS bundle**: 1,184 KB（gzip 307 KB）
- **CSS bundle**: 94 KB（gzip 16 KB）
- Phase 5A+6 将 ~1000 行嵌入 CSS 从 JS 移至 CSS 文件（提升缓存效率）

---

## 附：重构历史

完整重构分 6 个阶段，提交记录：
```
2ca1892  Phase 1: 合并重复工具函数
c9435ae  Phase 2A: 从 StopCard 提取 3 个面板子组件
41e8fb7  Phase 2B+2C: 拆分 MobileItineraryView & CompactCardStyles
6c11709  Phase 2D+2E: 提取 MapPanel 路线工具 & TripEditModal CSS
1127747  Phase 3+4: 拆分 useTripEditor 7 子 hooks + EditOperationsContext
be2d73b  Phase 5A: 提取嵌入 <style> 到 CSS 文件
d240896  Phase 6: CSS 工具类 + AdminPage 内联样式迁移
```

**刻意跳过的项：**
- Phase 5B（统一断点）：`767px / 768px` 与 `900px / 1100px` 在不同场景有意为之
- Phase 5C（减少 !important）：需要 mobile-first CSS 重写，风险高收益低
- Phase 6C（rgba→token）：544 个 rgba 值大多是有意的透明度，不适合统一
