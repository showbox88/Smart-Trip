# 行程开销与预算页 — 设计 spec

> 状态:设计已与用户确认(2026-06-26),待出实现 plan。
> 分支:`feature/trip-budget`(基于部署分支 `feature/pb-datasource`)。

## 1. 目标

给 Smart Trip 加一个**单 trip 的开销与预算看板**:选定一个行程,看到每个分类的
「预算 / 已花 / 剩余 / 占比」,以及全程总预算 / 总花费 / 总剩余。移动端优先。

数据来自现有 PocketBase 实例(`budgets` + `expenses` 两个集合)。看板是
**只读视图**(v1),通过现有 trip 卡片上的入口进入。

### 为什么做进 Smart Trip(而非独立站点)

cockpit(`:8446`)里的 "Smart Trip" tab 是一个 `<iframe src=…:8451>`,直接嵌
独立 Smart Trip(`:8451`)。两者是**同一个 app**。所以预算页做进 Smart Trip
一次,独立 `:8451` 与 cockpit tab **两处自动同步可见**,无需在 cockpit / PD 侧
另加 iframe。

## 2. 范围(v1 决策)

| 决策点 | 选择 | 理由 |
|---|---|---|
| 加账 | **只读看板**,不带页内快速记账 | Smart Trip 已有 `ExpenseModal` 可在 stop 上加账;YAGNI |
| 刷新 | **打开页面时 force 重拉** budgets+expenses | 与现有全量拉取+缓存架构一致;"记完账再看预算"场景下数据总是新的。不上 PB realtime 订阅 |
| 入口 | trip 卡片操作簇加一个 `payments` 图标 | 见 §6 |
| 路由 | `/budget/:tripId`(trip 从 URL 来) | iframe 可直达;不做 `/budget` 无 id 自动跳 Ongoing(YAGNI) |
| 金额 | 一律用 `amount_usd` | 已含汇率,不用原币相加 |

## 3. 数据访问(无需改 PB 权限)

`budgets` / `expenses` 的 `listRule/viewRule` 为 `null`(仅 admin 可读)。但
Smart Trip 的 `pb` 客户端本来就带 **superuser 注入 token**(`server.js`
`PB_INJECT_TOKEN` / 登录网关返回 10 年期 `PB_TOKEN`),读这两个集合不受
listRule 限制。**因此不需要改 PB 的访问规则。**

### 集合参考(已核对 2026-06-26)

`budgets`(`pbc_1308224162`):
- `trip`(relation → trips,maxSelect 1)— 外键
- `category`(select 单选,10 值:机票 / 城际交通 / 城内交通 / 住宿 / 餐饮 /
  景点·导游·杂费 / 购物/日用 / 门票 / 代付 / 其他)
- `amount_usd`(number,required)— 预算金额,统一美元,**所有计算用这个**
- `sort_order`(number)— 展示排序
- `note`(editor)— 分类明细拆解(展示用)
- `currency` / `amount_original`(当前都是 USD,v1 不用)

`expenses`(`pbc_1691921218`)相关字段:
- `amount_usd`(已折算美元)
- `type`(select:`支出` / `退款`)— **退款从花费里减**
- `expense_category`(select,与 budgets.category 对齐)
- `trip`(relation → trips)

PB 日期格式:`"2026-10-25 00:00:00.000Z"` → 前端 `.slice(0,10)` 取
`"2026-10-25"`(沿用 `pbAdapter.pbDate`)。

## 4. 核心计算逻辑(纯函数)

对选定的 `tripId`,纯函数 `buildBudgetReport({ budgets, expenses }, tripId)`:

1. **预算**:`budgets` 中 `trip === tripId`,按 `category` 汇总 `amount_usd`
   → `budgetByCategory`。
2. **花费**:`expenses` 中 `trip === tripId`,按 `expense_category` 汇总
   `amount_usd`,`type==='支出'` 加、`type==='退款'` 减 → `spentByCategory`。
3. **每分类**(分类 = budget ∪ expense 两侧并集):
   - `budget = budgetByCategory[cat] || 0`
   - `spent = spentByCategory[cat] || 0`
   - `remaining = budget - spent`
   - `usedPct = budget > 0 ? spent / budget : null`(无预算 → 标「未列预算」)
   - 排序:有预算的按 `sort_order`,只在 expense 出现的(未列预算)排在后面
4. **总计**:`totalBudget = Σ budget`、`totalSpent = Σ spent`、
   `totalRemaining = totalBudget - totalSpent`、
   `overallUsedPct = totalBudget > 0 ? totalSpent / totalBudget : null`
5. **花费占比**(环形图):各分类 `spent / totalSpent`。

纯函数无 IO、可单测。输出形状(示意):

```js
{
  categories: [{ category, budget, spent, remaining, usedPct, unbudgeted }],
  totalBudget, totalSpent, totalRemaining, overallUsedPct,
}
```

## 5. 架构与模块

```
pbAdapter.loadPbData()         ← Promise.all 里加拉 budgets(全量,缓存)
       │
buildBudgetReport(data,tripId) ← 纯函数,§4 聚合(可单测)
       │
useBudgetReport(tripId)        ← hook:mount 时 force 重拉 → 返回 report
       │
BudgetPage.jsx                 ← 路由页,装配 UI
   ├─ <BudgetSummaryCard>      ← 顶部三数字 + 整体进度条
   ├─ <CategoryRow> × N        ← 分类明细行(预算/已花/剩余/进度条/百分比)
   └─ <SpendDonut>             ← 花费占比环形图
```

- `pbAdapter.js`:`loadPbData` 的 `Promise.all` 加
  `pb.collection('budgets').getFullList({ sort: 'sort_order' })`;缓存对象加
  `budgets` 字段。新增导出纯函数 `buildBudgetReport`。
- 新 hook `src/hooks/useBudgetReport.js`:接收 `tripId`,mount 时
  `loadPbData(true)` force 重拉,`buildBudgetReport`,返回
  `{ report, loading, error }`。
- 新页面 `src/pages/BudgetPage.jsx`:`useParams()` 取 `tripId`,调 hook,渲染。
- 子组件放 `src/components/budget/`(SummaryCard / CategoryRow / SpendDonut),
  各自单一职责、纯展示(props in,无副作用)。
- `App.jsx` 加 `<Route path="/budget/:tripId" element={<BudgetPage />} />`。

## 6. 两处入口

在现有 edit/share/delete 操作簇里加一个 `payments`(账单)Material 图标,点击
`onOpenBudget(trip)` → `navigate('/budget/' + trip.id)`。三处共改:

- `src/components/dashboard/CompactCardStyles.jsx`(紧凑卡行内按钮)
- `src/components/shared/TripCardMenu.jsx`(大卡 / MobileHero 的 ⋮ 下拉)
- `src/components/dashboard/card-styles/shared.jsx`(完整卡操作簇)

新 prop `onOpenBudget(trip)` 从 `TripCard.jsx` / `MobileHero` 透传到
`DashboardPage`,在 DashboardPage 里 `useNavigate()` 实现跳转。

## 7. UI(移动优先,单列)

- **顶部汇总卡**:全程 **预算 / 已花 / 剩余** 三大数字 + 整体进度条
  (`overallUsedPct`,>100% 变红)。
- **分类明细**:每分类一行/卡——预算、已花、剩余、进度条、已用百分比。
  颜色状态:绿 `<80%`、黄 `80–100%`、红 `>100%`(超支);「未列预算」分类
  单独样式标注。
- **花费占比环形图**:各分类 spent / totalSpent,hover/tap 显示金额与百分比。
- 数字千分位;复用 Smart Trip 现有 theme token 与 `formatCurrency`。

## 8. 测试与验收

**单测**(vitest,repo 已有):对 `buildBudgetReport` 用现网数据断言——

目标 trip `ixvlz1i98en2d7l`:
- 预算 6 行合计 **11,439**(机票3080 / 城际257 / 城内910 / 住宿3712 /
  餐饮2520 / 景点·导游·杂费960)
- 已录 expenses 2 笔(均 `支出`,`机票`):LY9DJ 1112.94 + 8KOIMS 667.25
  = **1780.19**
- 断言:机票 预算 3080 / 已花 1780.19 / 剩余 1299.81;
  总计 预算 11439 / 已花 1780.19 / 剩余 9658.81;机票 usedPct ≈ 57.8%
- 边界:`退款` 正确减;只在 expense 出现、budget 无的分类标「未列预算」不报错;
  切换不同 trip 数据互不串。

**手测**:cockpit `:8446` 的 Smart Trip tab 里,从 trip 卡入口能打开预算页、
数字与上面一致、切 trip 不串、窄屏布局正常。

## 9. 不做(v1 范围外)

- 页内快速记账(走现有 ExpenseModal)
- PB realtime 订阅(打开页面重拉即可)
- `/budget` 无 id 自动跳 Ongoing 行程
- 非美元行程(`amount_original` / `currency` 换算)
- 预算编辑(增删改 budgets 行)
