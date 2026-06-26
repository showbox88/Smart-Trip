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
    { trip: 'T', expense_category: '餐饮', amount_usd: 80, type: '支出' },
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
    expect(byCat['住宿'].spent).toBe(150);
  });

  it('未列预算分类:budget=0、usedPct=null、unbudgeted=true、排最后', () => {
    expect(byCat['餐饮'].budget).toBe(0);
    expect(byCat['餐饮'].usedPct).toBeNull();
    expect(byCat['餐饮'].unbudgeted).toBe(true);
    expect(r.categories[r.categories.length - 1].category).toBe('餐饮');
  });

  it('总计正确', () => {
    expect(r.totalBudget).toBe(6792);
    expect(r.totalSpent).toBeCloseTo(2010.19, 2);
    expect(r.totalRemaining).toBeCloseTo(4781.81, 2);
  });

  it('每个分类带 items 明细(amountUsd/isRefund),退款标记正确', () => {
    expect(byCat['机票'].items).toHaveLength(2);
    expect(byCat['住宿'].items).toHaveLength(2);
    const refund = byCat['住宿'].items.find(i => i.isRefund);
    expect(refund.amountUsd).toBe(50);
    expect(byCat['餐饮'].items.map(i => i.amountUsd)).toEqual([80]);
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
