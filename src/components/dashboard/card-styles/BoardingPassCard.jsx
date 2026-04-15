import { MenuBtn, baseCard } from './shared';

export function BoardingPassCard(p) {
  const { trip, duration, stopsCount, status, totalCost, settings, formatCurrency, t, isBlossom, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '18px',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      minHeight: '170px', display: 'flex',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) rotate(-0.25deg)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(131,75,88,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, transparent 45%), linear-gradient(315deg, var(--md-sys-color-primary-container) 0%, transparent 60%)',
        opacity: isBlossom ? 0.35 : 0.18, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--md-sys-color-primary)' }} />

      <div style={{ flex: 1, minWidth: 0, padding: '1.05rem 1rem 0.9rem 1.1rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '0.55rem' }}>
          <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.22em',
            color: 'var(--md-sys-color-primary)', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            lineHeight: 1.2, borderLeft: '2px solid var(--md-sys-color-primary)', paddingLeft: '6px' }}>
            BOARDING<br />PASS · {String(trip.id || '').slice(-4).toUpperCase().padStart(4, '0')}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 22 }} />
          </div>
        </div>
        <div style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          opacity: 0.55, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '2px' }}>
          {t('dashboard.destination') || 'Destination'}
        </div>
        <h4 style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.08,
          margin: '0 0 0.5rem', color: 'var(--md-sys-color-on-surface)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.title}
        </h4>
        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-end', marginBottom: 'auto',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
          <div>
            <div style={{ fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.15em',
              color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, marginBottom: '1px' }}>DEPART</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>{trip.startDate || '—'}</div>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--md-sys-color-primary)', transform: 'translateY(-2px)' }}>→</div>
          <div>
            <div style={{ fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.15em',
              color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, marginBottom: '1px' }}>RETURN</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>{trip.endDate || '—'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.55rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.52rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em',
            padding: '3px 8px', color: 'var(--md-sys-color-primary)',
            border: '1.5px solid var(--md-sys-color-primary)', borderRadius: '3px',
            transform: 'rotate(-2deg)' }}>
            ✦ {status.label}
          </span>
          <span style={{ fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.65,
            fontFamily: 'ui-monospace, monospace' }}>
            · {stopsCount} {t('itinerary.stops_count') || 'stops'}
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', width: '1px', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px',
          borderRadius: '50%', background: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline-variant)', zIndex: 3 }} />
        <div style={{ position: 'absolute', top: '14px', bottom: '14px', left: 0,
          borderLeft: '1.5px dashed var(--md-sys-color-outline-variant)' }} />
        <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px',
          borderRadius: '50%', background: 'var(--md-sys-color-surface)',
          border: '1px solid var(--md-sys-color-outline-variant)', zIndex: 3 }} />
      </div>

      <div style={{ width: '92px', flexShrink: 0, padding: '1.05rem 0.7rem 0.9rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(180deg, transparent 0%, rgba(131,75,88,0.04) 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.46rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, marginBottom: '2px',
            fontFamily: 'ui-monospace, monospace' }}>DAYS</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.05em',
            color: 'var(--md-sys-color-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {String(duration).padStart(2, '0')}
          </div>
        </div>
        <div style={{ width: '24px', height: '1px', background: 'var(--md-sys-color-outline-variant)', margin: '0.35rem 0' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.44rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, marginBottom: '2px',
            fontFamily: 'ui-monospace, monospace' }}>TOTAL</div>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--md-sys-color-on-surface)',
            letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {formatCurrency(totalCost, settings)}
          </div>
        </div>
      </div>
    </div>
  );
}
