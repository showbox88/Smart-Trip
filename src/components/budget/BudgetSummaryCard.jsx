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
