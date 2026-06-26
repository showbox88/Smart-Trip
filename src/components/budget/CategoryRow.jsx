import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { statusColor } from '../../utils/budgetReport';

/** 单分类:名称 + 预算/已花/剩余 + 进度条 + 百分比;点头部展开明细 */
export default function CategoryRow({ row, settings, t }) {
  const { category, budget, spent, remaining, usedPct, unbudgeted, items = [] } = row;
  const [open, setOpen] = useState(false);
  const pct = usedPct === null ? 0 : Math.min(usedPct, 1) * 100;
  const color = statusColor(usedPct);

  return (
    <div style={{ background: 'var(--md-sys-color-surface-container-low)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      {/* 头部 — 点击展开/收起 */}
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--st-color-text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>chevron_right</span>
          {category}
        </span>
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

      {open && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: 8 }}>
          {items.length === 0
            ? <div style={{ fontSize: '0.78rem', color: 'var(--st-color-text-muted)', textAlign: 'center', padding: '6px 0' }}>{t('budget.no_spend')}</div>
            : items.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem', padding: '6px 0',
                  borderBottom: i < items.length - 1 ? '1px solid var(--md-sys-color-surface-container-highest)' : 'none',
                }}>
                  <span style={{ color: 'var(--st-color-text-muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{it.date || '—'}</span>
                  <span style={{ flex: 1, minWidth: 0, color: 'var(--md-sys-color-on-surface)', wordBreak: 'break-word' }}>
                    {it.isRefund && <span style={{ color: '#10b981', fontWeight: 700, marginRight: 4 }}>{t('budget.refund')}</span>}
                    {it.description || '—'}
                  </span>
                  <span style={{ flexShrink: 0, fontWeight: 600, color: it.isRefund ? '#10b981' : 'var(--md-sys-color-on-surface)' }}>
                    {it.isRefund ? '−' : ''}{formatCurrency(it.amountUsd, settings)}
                  </span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
