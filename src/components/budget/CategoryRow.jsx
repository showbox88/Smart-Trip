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
