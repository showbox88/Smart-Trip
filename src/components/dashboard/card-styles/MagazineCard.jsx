import { MenuBtn, baseCard } from './shared';

export function MagazineCard(p) {
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '6px', padding: '1rem 1.1rem 0.9rem',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      borderTop: '4px solid var(--md-sys-color-primary)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      minHeight: '170px', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(131,75,88,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        paddingBottom: '0.35rem', marginBottom: '0.7rem' }}>
        <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.3em',
          textTransform: 'uppercase', color: 'var(--md-sys-color-primary)' }}>
          THE WANDERER
        </div>
        <div style={{ fontSize: '0.46rem', fontWeight: 700, letterSpacing: '0.15em',
          color: 'var(--md-sys-color-on-surface-variant)', fontFamily: 'ui-serif, Georgia, serif' }}>
          VOL · {String(trip.id || '0').slice(-2).padStart(2, '0')} / {(trip.startDate || '').slice(0, 4) || '—'}
        </div>
        <div style={{ marginLeft: '0.3rem' }}>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20 }} />
        </div>
      </div>

      <h4 style={{
        fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
        fontSize: '1.55rem', fontWeight: 900, fontStyle: 'italic',
        letterSpacing: '-0.025em', lineHeight: 1.02,
        margin: '0 0 0.4rem', color: 'var(--md-sys-color-on-surface)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {trip.title}
      </h4>

      <div style={{ fontSize: '0.66rem', fontWeight: 500, fontStyle: 'italic',
        color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.4,
        fontFamily: 'ui-serif, Georgia, serif', marginBottom: '0.75rem' }}>
        {duration} days · {stopsCount} stops · {status.label.toLowerCase()}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '0.45rem' }}>
        <div>
          <div style={{ fontSize: '0.44rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7 }}>
            Date
          </div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'ui-serif, Georgia, serif',
            color: 'var(--md-sys-color-on-surface)' }}>
            {trip.startDate}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.44rem', fontWeight: 800, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7 }}>
            Price
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 900, fontFamily: 'ui-serif, Georgia, serif',
            color: 'var(--md-sys-color-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totalCost, settings)}
          </div>
        </div>
      </div>
    </div>
  );
}
