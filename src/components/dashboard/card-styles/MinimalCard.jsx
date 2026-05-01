import { MenuBtn, baseCard } from './shared';

export function MinimalCard(p) {
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '8px', padding: '1.1rem 1.2rem 1rem',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      boxShadow: 'none',
      minHeight: '170px', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(131,75,88,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--md-sys-color-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
          color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'ui-monospace, monospace' }}>
          №&nbsp;{String(trip.id || '0').slice(-3).padStart(3, '0')}&nbsp;/&nbsp;{status.label}
        </div>
        <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20 }} />
      </div>

      <h4 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.03em',
        margin: '0 0 0.25rem', color: 'var(--md-sys-color-on-surface)', lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {trip.title}
      </h4>
      <div style={{ fontSize: '0.7rem', fontWeight: 500,
        color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '1rem' }}>
        {trip.startDate} – {trip.endDate}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem',
        borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '0.55rem' }}>
        {[
          { label: 'DAYS', val: String(duration).padStart(2, '0'), highlight: true },
          { label: 'STOPS', val: String(stopsCount).padStart(2, '0') },
          { label: 'COST', val: formatCurrency(totalCost, settings) },
        ].map((m, i) => (
          <div key={i} style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--md-sys-color-outline-variant)',
            paddingLeft: i === 0 ? 0 : '0.5rem' }}>
            <div style={{ fontSize: '0.42rem', fontWeight: 800, letterSpacing: '0.2em',
              color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '2px',
              fontFamily: 'ui-monospace, monospace' }}>{m.label}</div>
            <div style={{ fontSize: m.label === 'COST' ? '0.82rem' : '1.05rem',
              fontWeight: 800, letterSpacing: '-0.02em',
              color: m.highlight ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface)',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
