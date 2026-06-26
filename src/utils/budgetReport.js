/**
 * 行程预算聚合 — 纯函数,无 IO,可单测。
 * 全部金额只用 amount_usd(已含汇率)。
 * 见 docs/trip-budget-page-spec.md §4。
 */

const TYPE_REFUND = '退款';

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
  const itemsByCategory = {};
  for (const e of expenses) {
    const cat = e.expense_category || '其他';
    const amt = parseFloat(e.amount_usd) || 0;
    spentByCategory[cat] = (spentByCategory[cat] || 0) + (e.type === TYPE_REFUND ? -amt : amt);
    (itemsByCategory[cat] ||= []).push({
      date: e.date ? String(e.date).slice(0, 10) : '',
      description: e.description || '',
      amountUsd: amt,
      isRefund: e.type === TYPE_REFUND,
    });
  }
  // 每个分类内按日期升序
  for (const cat in itemsByCategory) {
    itemsByCategory[cat].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
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
      items: itemsByCategory[cat] || [],
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
