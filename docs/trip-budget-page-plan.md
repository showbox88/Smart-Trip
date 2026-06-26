# 行程开销与预算页 实现 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 Smart Trip 加一个单 trip 的只读「开销与预算」看板页,从 trip 卡片入口进入;因 cockpit `:8446` 的 Smart Trip tab 是 `:8451` 的 iframe,两处自动同步可见。

**Architecture:** 纯函数 `buildBudgetReport` 做 §4 聚合(可单测);`pbAdapter` 加载 `budgets` 并提供 `getPbBudgetReport`;`useBudgetReport` hook 打开页面时 force 重拉;`BudgetPage` + 3 个纯展示子组件渲染;trip 卡片菜单加一个 `payments` 入口跳 `/budget/:tripId`。

**Tech Stack:** React 18 + react-router-dom + Vite + PocketBase JS SDK + vitest(已在 repo)。所有金额用 `amount_usd`。

**设计依据:** [`docs/trip-budget-page-spec.md`](./trip-budget-page-spec.md)

**前置:** 分支 `feature/trip-budget`(已建,基于 `feature/pb-datasource`)。本地联调需先开 PB 隧道(`start-pb.bat`:`ssh -N -L 8090:127.0.0.1:8090 dashboard-server`)。

---

## 文件清单

| 动作 | 文件 | 职责 |
|---|---|---|
| 建 | `src/utils/budgetReport.js` | 纯函数:聚合 + 颜色阈值 |
| 建 | `src/utils/budgetReport.test.js` | vitest 单测 |
| 改 | `src/adapters/pbAdapter.js` | loadPbData 加拉 budgets;导出 `getPbBudgetReport` |
| 建 | `src/hooks/useBudgetReport.js` | hook:mount force 重拉 → report |
| 建 | `src/components/budget/BudgetSummaryCard.jsx` | 顶部三数字 + 整体进度条 |
| 建 | `src/components/budget/CategoryRow.jsx` | 单分类行 |
| 建 | `src/components/budget/SpendDonut.jsx` | 花费占比环形图 |
| 建 | `src/pages/BudgetPage.jsx` | 路由页装配 |
| 改 | `src/App.jsx` | 加 `/budget/:tripId` 路由 |
| 改 | `src/components/dashboard/card-styles/shared.jsx` | `MenuBtn` 加预算按钮(覆盖 9 个紧凑样式) |
| 改 | `src/components/dashboard/TripCard.jsx` | 大卡 + blossom 列表卡菜单加按钮;透传 `onOpenBudget` |
| 改 | `src/components/shared/TripCardMenu.jsx` | 手机 Hero 菜单加按钮 |
| 改 | `src/components/itinerary/mobile/MobileItineraryView.jsx` | 传 `onOpenBudget` |
| 改 | `src/i18n/zh.json` / `src/i18n/en.json` | 文案 |

> 不碰 `src/components/dashboard/CompactCardStyles.jsx`(已确认无人 import,死代码)。

---

## Task 1: 纯聚合函数 `buildBudgetReport` + 单测(TDD)

**Files:**
- Create: `src/utils/budgetReport.js`
- Test: `src/utils/budgetReport.test.js`

- [ ] **Step 1: 写失败测试**

`src/utils/budgetReport.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildBudgetReport, statusColor } from './budgetReport';

// 综合逻辑用例:退款、未列预算、跨 trip 隔离
const data = {
  budgets: [
    { trip: 'T', category: '机票', amount_usd: 3080, sort_order: 1 },
    { trip: 'T', category: '住宿', amount_usd: 3712, sort_order: 3 },
    { trip: 'OTHER', category: '机票', amount_usd: 999, sort_order: 1 },
  ],
  expenses: [
    { trip: 'T', expense_category: '机票', amount_usd: 1112.94, type: '支出' },
    { trip: 'T', expense_category: '机票', amount_usd: 667.25, type: '支出' },
    { trip: 'T', expense_category: '住宿', amount_usd: 200, type: '支出' },
    { trip: 'T', expense_category: '住宿', amount_usd: 50, type: '退款' },
    { trip: 'T', expense_category: '餐饮', amount_usd: 80, type: '支出' }, // 未列预算
    { trip: 'OTHER', expense_category: '机票', amount_usd: 9999, type: '支出' },
  ],
};

describe('buildBudgetReport', () => {
  const r = buildBudgetReport(data, 'T');
  const byCat = Object.fromEntries(r.categories.map(c => [c.category, c]));

  it('按分类聚合预算与花费,退款减、跨 trip 隔离', () => {
    expect(byCat['机票'].budget).toBe(3080);
    expect(byCat['机票'].spent).toBeCloseTo(1780.19, 2);
    expect(byCat['机票'].remaining).toBeCloseTo(1299.81, 2);
    expect(byCat['机票'].usedPct).toBeCloseTo(0.578, 3);
    expect(byCat['住宿'].spent).toBe(150); // 200 - 50 退款
  });

  it('未列预算分类:budget=0、usedPct=null、unbudgeted=true、排最后', () => {
    expect(byCat['餐饮'].budget).toBe(0);
    expect(byCat['餐饮'].usedPct).toBeNull();
    expect(byCat['餐饮'].unbudgeted).toBe(true);
    expect(r.categories[r.categories.length - 1].category).toBe('餐饮');
  });

  it('总计正确', () => {
    expect(r.totalBudget).toBe(6792);          // 3080 + 3712
    expect(r.totalSpent).toBeCloseTo(2010.19, 2); // 1780.19 + 150 + 80
    expect(r.totalRemaining).toBeCloseTo(4781.81, 2);
  });
});

describe('buildBudgetReport — spec 验收数字', () => {
  const real = {
    budgets: [
      { trip: 'X', category: '机票', amount_usd: 3080, sort_order: 1 },
      { trip: 'X', category: '城际交通', amount_usd: 257, sort_order: 2 },
      { trip: 'X', category: '住宿', amount_usd: 3712, sort_order: 3 },
      { trip: 'X', category: '餐饮', amount_usd: 2520, sort_order: 4 },
      { trip: 'X', category: '城内交通', amount_usd: 910, sort_order: 5 },
      { trip: 'X', category: '景点·导游·杂费', amount_usd: 960, sort_order: 6 },
    ],
    expenses: [
      { trip: 'X', expense_category: '机票', amount_usd: 1112.94, type: '支出' },
      { trip: 'X', expense_category: '机票', amount_usd: 667.25, type: '支出' },
    ],
  };
  it('预算 11439 / 已花 1780.19 / 剩余 9658.81', () => {
    const r = buildBudgetReport(real, 'X');
    expect(r.totalBudget).toBe(11439);
    expect(r.totalSpent).toBeCloseTo(1780.19, 2);
    expect(r.totalRemaining).toBeCloseTo(9658.81, 2);
  });
});

describe('statusColor', () => {
  it('绿 <80% / 黄 80-100% / 红 >100% / null 未列预算', () => {
    expect(statusColor(0.5)).toBe('#10b981');
    expect(statusColor(0.85)).toBe('#f59e0b');
    expect(statusColor(1.2)).toBe('#ef4444');
    expect(statusColor(null)).toBe('var(--md-sys-color-outline)');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- budgetReport`
Expected: FAIL（`Failed to resolve import './budgetReport'` 或函数未定义)

- [ ] **Step 3: 写实现**

`src/utils/budgetReport.js`:

```js
/**
 * 行程预算聚合 — 纯函数,无 IO,可单测。
 * 全部金额只用 amount_usd(已含汇率)。
 * 见 docs/trip-budget-page-spec.md §4。
 */

const TYPE_REFUND = '退款';

/**
 * @param {{budgets:Array, expenses:Array}} data  全量(未按 trip 过滤)
 * @param {string} tripId
 */
export function buildBudgetReport(data, tripId) {
  const budgets = (data?.budgets || []).filter(b => b.trip === tripId);
  const expenses = (data?.expenses || []).filter(e => e.trip === tripId);

  const budgetByCategory = {};
  const sortByCategory = {};
  for (const b of budgets) {
    const cat = b.category || '其他';
    budgetByCategory[cat] = (budgetByCategory[cat] || 0) + (parseFloat(b.amount_usd) || 0);
    const so = Number.isFinite(b.sort_order) ? b.sort_order : 9999;
    if (!(cat in sortByCategory) || so < sortByCategory[cat]) sortByCategory[cat] = so;
  }

  const spentByCategory = {};
  for (const e of expenses) {
    const cat = e.expense_category || '其他';
    const amt = parseFloat(e.amount_usd) || 0;
    spentByCategory[cat] = (spentByCategory[cat] || 0) + (e.type === TYPE_REFUND ? -amt : amt);
  }

  const allCats = new Set([...Object.keys(budgetByCategory), ...Object.keys(spentByCategory)]);
  const categories = [...allCats].map(cat => {
    const budget = budgetByCategory[cat] || 0;
    const spent = spentByCategory[cat] || 0;
    const unbudgeted = !(cat in budgetByCategory);
    return {
      category: cat,
      budget,
      spent,
      remaining: budget - spent,
      usedPct: budget > 0 ? spent / budget : null,
      unbudgeted,
      sortOrder: unbudgeted ? 9999 : (sortByCategory[cat] ?? 9999),
    };
  });
  categories.sort((a, b) => a.sortOrder - b.sortOrder || a.category.localeCompare(b.category));

  const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);

  return {
    categories,
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    overallUsedPct: totalBudget > 0 ? totalSpent / totalBudget : null,
  };
}

/** 进度条/百分比配色:绿<80% 黄80-100% 红>100% null=未列预算 */
export function statusColor(usedPct) {
  if (usedPct === null || usedPct === undefined) return 'var(--md-sys-color-outline)';
  if (usedPct > 1) return '#ef4444';
  if (usedPct >= 0.8) return '#f59e0b';
  return '#10b981';
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- budgetReport`
Expected: PASS（全绿)

- [ ] **Step 5: 提交**

```bash
git add src/utils/budgetReport.js src/utils/budgetReport.test.js
git commit -m "feat(budget): pure buildBudgetReport aggregation + status colors + tests"
```

---

## Task 2: pbAdapter 加载 budgets + `getPbBudgetReport`

**Files:**
- Modify: `src/adapters/pbAdapter.js`(`loadPbData` 约 17-39 行;文件尾部加导出)

- [ ] **Step 1: 在 `loadPbData` 的 Promise.all 加拉 budgets**

把现有(约 17-22 行):

```js
  const [trips, days, stops, expenses] = await Promise.all([
    pb.collection('trips').getFullList({ sort: '-created' }),
    pb.collection('days').getFullList({ sort: 'date' }),
    pb.collection('stops').getFullList({ expand: 'location', sort: 'date' }),
    pb.collection('expenses').getFullList({ sort: 'date' }),
  ]);
```

改为:

```js
  const [trips, days, stops, expenses, budgets] = await Promise.all([
    pb.collection('trips').getFullList({ sort: '-created' }),
    pb.collection('days').getFullList({ sort: 'date' }),
    pb.collection('stops').getFullList({ expand: 'location', sort: 'date' }),
    pb.collection('expenses').getFullList({ sort: 'date' }),
    pb.collection('budgets').getFullList({ sort: 'sort_order' }),
  ]);
```

并把缓存赋值行(约 38 行):

```js
  _cache = { trips, days, stops, expenses, stopsByDayId, expensesByStopId };
```

改为:

```js
  _cache = { trips, days, stops, expenses, budgets, stopsByDayId, expensesByStopId };
```

- [ ] **Step 2: 文件顶部 import 纯函数**

在 `src/adapters/pbAdapter.js` 顶部现有 import 区(约 1-3 行)后加:

```js
import { buildBudgetReport } from '../utils/budgetReport';
```

- [ ] **Step 3: 文件末尾加查询接口**

在 `src/adapters/pbAdapter.js` 末尾追加:

```js
/** 某 trip 的预算报告(force 时强制重拉,见 spec §2 刷新策略) */
export async function getPbBudgetReport(tripId, force = false) {
  const { budgets, expenses } = await loadPbData(force);
  return buildBudgetReport({ budgets, expenses }, tripId);
}
```

- [ ] **Step 4: 确认无破坏(已有测试 + lint)**

Run: `npm test && npm run lint`
Expected: 现有测试仍 PASS;lint 无新增错误。

- [ ] **Step 5: 提交**

```bash
git add src/adapters/pbAdapter.js
git commit -m "feat(budget): load budgets in pbAdapter + getPbBudgetReport"
```

---

## Task 3: `useBudgetReport` hook

**Files:**
- Create: `src/hooks/useBudgetReport.js`

- [ ] **Step 1: 写实现**

`src/hooks/useBudgetReport.js`:

```js
import { useState, useEffect } from 'react';
import { getPbBudgetReport } from '../adapters/pbAdapter';

/**
 * 某 trip 的开销/预算报告。
 * 进入页面时 force 重拉一次(spec §2:不上 realtime,打开即拉最新)。
 */
export function useBudgetReport(tripId) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    getPbBudgetReport(tripId, true)
      .then(r => { if (alive) { setReport(r); setLoading(false); } })
      .catch(e => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
  }, [tripId]);

  return { report, loading, error };
}
```

- [ ] **Step 2: 确认编译(构建)**

Run: `npm run build`
Expected: 构建成功(无 import 解析错误)。

- [ ] **Step 3: 提交**

```bash
git add src/hooks/useBudgetReport.js
git commit -m "feat(budget): useBudgetReport hook (force refetch on open)"
```

---

## Task 4: 展示子组件(SummaryCard / CategoryRow / SpendDonut)

**Files:**
- Create: `src/components/budget/BudgetSummaryCard.jsx`
- Create: `src/components/budget/CategoryRow.jsx`
- Create: `src/components/budget/SpendDonut.jsx`

- [ ] **Step 1: 顶部汇总卡**

`src/components/budget/BudgetSummaryCard.jsx`:

```jsx
import { formatCurrency } from '../../utils/formatters';
import { statusColor } from '../../utils/budgetReport';

/** 顶部:预算 / 已花 / 剩余 三大数字 + 整体进度条(>100% 红) */
export default function BudgetSummaryCard({ report, settings, t }) {
  const { totalBudget, totalSpent, totalRemaining, overallUsedPct } = report;
  const pct = overallUsedPct === null ? 0 : Math.min(overallUsedPct, 1) * 100;
  const over = overallUsedPct !== null && overallUsedPct > 1;
  const barColor = statusColor(overallUsedPct);

  const Stat = ({ label, value, color }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--st-color-text-muted)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'var(--md-sys-color-on-surface)' }}>{value}</div>
    </div>
  );

  return (
    <section style={{ background: 'var(--md-sys-color-surface-container)', borderRadius: 16, padding: '18px 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Stat label={t('budget.total_budget')} value={formatCurrency(totalBudget, settings)} />
        <Stat label={t('budget.total_spent')} value={formatCurrency(totalSpent, settings)} />
        <Stat label={t('budget.remaining')} value={formatCurrency(totalRemaining, settings)} color={over ? '#ef4444' : '#10b981'} />
      </div>
      <div style={{ height: 10, borderRadius: 6, background: 'var(--md-sys-color-surface-container-highest)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.3s' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--st-color-text-muted)', textAlign: 'right' }}>
        {overallUsedPct === null ? '—' : `${Math.round(overallUsedPct * 100)}%`}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 分类行**

`src/components/budget/CategoryRow.jsx`:

```jsx
import { formatCurrency } from '../../utils/formatters';
import { statusColor } from '../../utils/budgetReport';

/** 单分类:名称 + 预算/已花/剩余 + 进度条 + 百分比 */
export default function CategoryRow({ row, settings, t }) {
  const { category, budget, spent, remaining, usedPct, unbudgeted } = row;
  const pct = usedPct === null ? 0 : Math.min(usedPct, 1) * 100;
  const color = statusColor(usedPct);

  return (
    <div style={{ background: 'var(--md-sys-color-surface-container-low)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface)' }}>{category}</span>
        {unbudgeted
          ? <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b' }}>{t('budget.unbudgeted')}</span>
          : <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>{Math.round(usedPct * 100)}%</span>}
      </div>
      <div style={{ height: 8, borderRadius: 5, background: 'var(--md-sys-color-surface-container-highest)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--st-color-text-muted)' }}>
        <span>{t('budget.budget')} {formatCurrency(budget, settings)}</span>
        <span>{t('budget.spent')} {formatCurrency(spent, settings)}</span>
        <span style={{ color: remaining < 0 ? '#ef4444' : undefined }}>{t('budget.remaining')} {formatCurrency(remaining, settings)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 花费占比环形图**

`src/components/budget/SpendDonut.jsx`:

```jsx
import { formatCurrency } from '../../utils/formatters';

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b', '#a3e635'];

/** 各分类 spent / totalSpent 环形图(只取 spent>0) */
export default function SpendDonut({ report, settings, t }) {
  const slices = report.categories
    .filter(c => c.spent > 0)
    .map((c, i) => ({ label: c.category, value: c.spent, color: PALETTE[i % PALETTE.length] }));
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return <div style={{ color: 'var(--st-color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>{t('budget.no_spend')}</div>;
  }

  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <g transform="rotate(-90 75 75)">
            {slices.map(s => {
              const frac = s.value / total;
              const dash = `${frac * C} ${C}`;
              const el = (
                <circle key={s.label} cx="75" cy="75" r={R} fill="none" stroke={s.color}
                  strokeWidth="22" strokeDasharray={dash} strokeDashoffset={-acc * C} />
              );
              acc += frac;
              return el;
            })}
          </g>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slices.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{s.label}</span>
              <span style={{ color: 'var(--st-color-text-muted)' }}>
                {Math.round((s.value / total) * 100)}% · {formatCurrency(s.value, settings)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 构建确认**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/components/budget/
git commit -m "feat(budget): summary card / category row / spend donut components"
```

---

## Task 5: `BudgetPage` + 路由

**Files:**
- Create: `src/pages/BudgetPage.jsx`
- Modify: `src/App.jsx`(import 区 + Routes 区)

- [ ] **Step 1: 页面**

`src/pages/BudgetPage.jsx`:

```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useBudgetReport } from '../hooks/useBudgetReport';
import BudgetSummaryCard from '../components/budget/BudgetSummaryCard';
import CategoryRow from '../components/budget/CategoryRow';
import SpendDonut from '../components/budget/SpendDonut';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function BudgetPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { t } = useI18n();
  const { report, loading, error } = useBudgetReport(tripId);

  const trip = (state.tripsV2 || []).find(x => x.id === tripId);
  const settings = state.settings;

  if (loading) return <LoadingSpinner message={t('budget.loading')} />;
  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', color: 'var(--st-color-text-muted)' }}>
        {t('budget.load_error')}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="menu-dots" style={{
          background: 'var(--md-sys-color-surface-container-high)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--md-sys-color-on-surface)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip?.title || t('budget.title')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)' }}>{t('budget.subtitle')}</div>
        </div>
      </div>

      <BudgetSummaryCard report={report} settings={settings} t={t} />
      <SpendDonut report={report} settings={settings} t={t} />
      <div>
        {report.categories.map(row => (
          <CategoryRow key={row.category} row={row} settings={settings} t={t} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 注册路由**

`src/App.jsx` import 区(现有约 13 行 `import TodayPage ...` 后)加:

```jsx
import BudgetPage from './pages/BudgetPage';
```

`src/App.jsx` Routes 区,在 `<Route path="/day/:date" ... />`(约 60 行)后加一行:

```jsx
          <Route path="/budget/:tripId" element={<BudgetPage />} />
```

- [ ] **Step 3: 构建确认**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add src/pages/BudgetPage.jsx src/App.jsx
git commit -m "feat(budget): BudgetPage + /budget/:tripId route"
```

---

## Task 6: trip 卡片入口(3 个菜单面)

入口图标 `payments`,点击跳 `/budget/:tripId`。

**Files:**
- Modify: `src/components/dashboard/card-styles/shared.jsx`(`MenuBtn`)
- Modify: `src/components/dashboard/TripCard.jsx`
- Modify: `src/components/shared/TripCardMenu.jsx`
- Modify: `src/components/itinerary/mobile/MobileItineraryView.jsx`

- [ ] **Step 1: 共享 `MenuBtn` 加预算按钮(覆盖 9 个紧凑样式)**

`src/components/dashboard/card-styles/shared.jsx`,把 `MenuBtn` 的签名加 `onOpenBudget`:

```jsx
export function MenuBtn({ menuOpen, onMenuToggle, onEdit, onShare, onDelete, onOpenBudget, trip, t, size = 22, color, bg = 'transparent', setMenuOpen }) {
```

并在 dropdown 里 `edit` 按钮**之前**插入(即 `{menuOpen && (...)}` 内、第一个 `<button>` 前):

```jsx
          <button title={t('itinerary.view_budget') || 'Budget'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenBudget?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
          </button>
```

- [ ] **Step 2: TripCard 透传 + 自身两处菜单加按钮**

`src/components/dashboard/TripCard.jsx`:

(a) 在 `handleOpen`(约 47 行 `const handleOpen = () => navigate(...)`)后加:

```jsx
  const handleOpenBudget = (e) => { if (e) e.stopPropagation(); setMenuOpen(false); navigate(`/budget/${trip.id}`); };
```

(b) compact 分支 `<StyleComp ... />`(约 69-86 行),在 `onDelete={handleDelete}` 后加一行 prop:

```jsx
        onOpenBudget={handleOpenBudget}
```

(c) blossom 列表卡菜单(约 122-133 行),在 `edit` 按钮前插入:

```jsx
                <button title={t('itinerary.view_budget') || 'Budget'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleOpenBudget(e); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                </button>
```

(d) 大卡菜单(文件末尾 `{menuOpen && (...)}`,约 291-301 行),在 `edit` 按钮前插入:

```jsx
          <button title={t('itinerary.view_budget') || 'Budget'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleOpenBudget(e); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
          </button>
```

- [ ] **Step 3: 手机 Hero 菜单(TripCardMenu)加按钮 + 传 prop**

`src/components/shared/TripCardMenu.jsx`,签名加 `onOpenBudget`:

```jsx
export default function TripCardMenu({
  open, onToggle, onEdit, onShare, onDelete, onOpenBudget, t,
  triggerStyle, dropdownStyle, triggerIcon,
}) {
```

在 dropdown 的 `edit` 按钮(约 40-45 行)前插入:

```jsx
          <button
            title={t('itinerary.view_budget') || 'Budget'}
            onClick={(e) => { e.stopPropagation(); onOpenBudget?.(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
          </button>
```

`src/components/itinerary/mobile/MobileItineraryView.jsx`,该文件已有 `const nav = useNavigate()`(约 39 行),当前行程变量为 `trip`(第 258 行 `trip={trip}`)。给 `<TripCardMenu ...>`(约 263-272 行)加一行 prop(放在 `onDelete={doDelete}` 后,约 268 行):

```jsx
            onOpenBudget={() => nav(`/budget/${trip.id}`)}
```

- [ ] **Step 4: 构建确认**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/components/dashboard/card-styles/shared.jsx src/components/dashboard/TripCard.jsx src/components/shared/TripCardMenu.jsx src/components/itinerary/mobile/MobileItineraryView.jsx
git commit -m "feat(budget): payments entry button in trip card menus -> /budget/:tripId"
```

---

## Task 7: i18n 文案

**Files:**
- Modify: `src/i18n/zh.json`
- Modify: `src/i18n/en.json`

> 两文件均 4 空格缩进。`itinerary` / `dashboard` 等为顶层 key。

- [ ] **Step 1: 加 `itinerary.view_budget` + 顶层 `budget` 块**

`src/i18n/zh.json`:在 `itinerary` 块里加一项 `"view_budget": "预算"`;并在顶层(与 `dashboard` 同级)加:

```json
    "budget": {
        "title": "开销与预算",
        "subtitle": "本行程预算与实际花费",
        "total_budget": "预算",
        "total_spent": "已花",
        "remaining": "剩余",
        "budget": "预算",
        "spent": "已花",
        "unbudgeted": "未列预算",
        "no_spend": "暂无花费",
        "loading": "加载预算...",
        "load_error": "预算数据加载失败"
    },
```

`src/i18n/en.json`:在 `itinerary` 块加 `"view_budget": "Budget"`;并加顶层同级:

```json
    "budget": {
        "title": "Expenses & Budget",
        "subtitle": "Budget vs. actual spend for this trip",
        "total_budget": "Budget",
        "total_spent": "Spent",
        "remaining": "Remaining",
        "budget": "Budget",
        "spent": "Spent",
        "unbudgeted": "Unbudgeted",
        "no_spend": "No spending yet",
        "loading": "Loading budget...",
        "load_error": "Failed to load budget data"
    },
```

> JSON 注意:新块前后逗号要合法(顶层最后一个块不能有尾逗号)。

- [ ] **Step 2: 验证 JSON 合法 + 构建**

Run: `node -e "require('./src/i18n/zh.json');require('./src/i18n/en.json');console.log('json ok')" && npm run build`
Expected: 打印 `json ok` 且构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/i18n/zh.json src/i18n/en.json
git commit -m "feat(budget): i18n strings (zh/en)"
```

---

## Task 8: 全量测试 + 本地手测 + 部署

- [ ] **Step 1: 跑全部单测 + lint**

Run: `npm test && npm run lint`
Expected: 全绿。

- [ ] **Step 2: 本地联调(需 PB 隧道)**

```bash
# 终端 A:开隧道(start-pb.bat 内容)
ssh -N -L 8090:127.0.0.1:8090 dashboard-server
# 终端 B:
npm run dev:pb
```

手测项(对照 spec §8):
- Dashboard 紧凑卡 ⋮ 菜单出现 `payments` 图标 → 点击进 `/budget/<id>`。
- 大卡 ⋮ 菜单同样有入口。
- 目标 trip `ixvlz1i98en2d7l`:顶部 预算 $11,439.00 / 已花 $1,780.19 / 剩余 $9,658.81;机票分类约 58%。
- 切到另一个 trip 的入口 → 数字不串。
- 窄屏(DevTools 手机视图)单列布局正常。

- [ ] **Step 3: 部署(用户确认后)**

> 用户偏好分阶段部署 + 手动验证,**此步等用户点头再做**。

```bash
npm run build:pb-vm
scp -r dist/* dashboard-server:/home/dev/smat-trip/dist/
ssh dashboard-server 'ls -la /home/dev/smat-trip/dist/assets | head'
```

验证:cockpit `:8446` 的 Smart Trip tab 里,从 trip 卡入口能打开预算页、数字与本地一致。

- [ ] **Step 4: 合并(用户确认后)**

按 Smart-Trip 工作约定:feature 分支测试全绿后并入 `feature/pb-datasource`。

---

## 自查覆盖(spec → task 映射)

| spec 节 | 实现 task |
|---|---|
| §2 范围(只读/重拉/路由) | T2 重拉、T5 路由、全程只读 |
| §3 访问(superuser token,不改权限) | 无需改 PB(沿用现有 `pb`) |
| §4 计算逻辑 | T1 纯函数 + 测试 |
| §5 架构模块 | T1-T5 |
| §6 两处入口 | T6(4 个文件覆盖紧凑/大卡/列表/手机 Hero) |
| §7 UI | T4 子组件 + T5 页面 |
| §8 验收 | T1 单测断言 + T8 手测 |
| §9 不做项 | 全程未引入快速记账/realtime/预算编辑 |
