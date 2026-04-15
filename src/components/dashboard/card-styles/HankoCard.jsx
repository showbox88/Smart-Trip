import { MenuBtn, baseCard } from './shared';

export function HankoCard(p) {
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '2px', padding: '1rem 1.1rem 1rem 1.6rem',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      borderLeft: '6px solid var(--md-sys-color-primary)',
      boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
      minHeight: '170px', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(131,75,88,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '50px', height: '50px',
        borderRadius: '50%', border: '2.5px solid var(--md-sys-color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        color: 'var(--md-sys-color-primary)', transform: 'rotate(-6deg)',
        background: 'var(--md-sys-color-surface-container-lowest)' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
          {duration}
        </div>
        <div style={{ fontSize: '0.42rem', fontWeight: 800, letterSpacing: '0.15em', marginTop: '1px' }}>
          DAYS
        </div>
      </div>

      <div style={{ position: 'absolute', top: '0.5rem', right: '4.3rem' }}>
        <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20 }} />
      </div>

      <div style={{ position: 'absolute', left: '0.45rem', top: '1rem', bottom: '1rem',
        writingMode: 'vertical-rl', fontSize: '0.44rem', fontWeight: 800, letterSpacing: '0.4em',
        color: 'var(--md-sys-color-primary)', opacity: 0.6, textTransform: 'uppercase' }}>
        {status.label} · {stopsCount} STOPS
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '60px' }}>
        <div style={{ fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, marginBottom: '4px' }}>
          — {t('dashboard.destination') || 'Destination'}
        </div>
        <h4 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.03em',
          margin: '0 0 0.5rem', color: 'var(--md-sys-color-on-surface)', lineHeight: 1.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.title}
        </h4>
        <div style={{ width: '32px', height: '2px', background: 'var(--md-sys-color-primary)', marginBottom: '0.55rem' }} />
        <div style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 500,
          fontFamily: 'ui-serif, Georgia, serif', fontStyle: 'italic' }}>
          {trip.startDate} — {trip.endDate}
        </div>
      </div>

      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--md-sys-color-primary)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>
        {formatCurrency(totalCost, settings)}
      </div>
    </div>
  );
}
