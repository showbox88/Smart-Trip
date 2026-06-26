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
