import { MenuBtn, baseCard } from './shared';

export function LuggageTagCard(p) {
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '14px 14px 14px 14px',
      background: 'var(--md-sys-color-primary-container)',
      border: '2px solid var(--md-sys-color-primary)',
      boxShadow: '0 6px 18px rgba(131,75,88,0.12)',
      minHeight: '180px', display: 'flex', flexDirection: 'column',
      padding: '1.3rem 1.1rem 0.9rem 1.1rem',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) rotate(1deg)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(131,75,88,0.22)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 18px rgba(131,75,88,0.12)'; }}
    >
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'var(--md-sys-color-surface)',
        border: '2px solid var(--md-sys-color-primary)' }} />
      <div style={{ position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
        width: '2px', height: '12px', background: 'var(--md-sys-color-primary)' }} />
      <div style={{ position: 'absolute', inset: '6px',
        border: '1.5px dashed var(--md-sys-color-on-primary-container)',
        borderRadius: '10px', opacity: 0.35, pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}>
        <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 22,
          color: 'var(--md-sys-color-on-primary-container)', bg: 'rgba(255,255,255,0.2)' }} />
      </div>

      <div style={{ textAlign: 'center', marginTop: '0.15rem' }}>
        <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.3em',
          color: 'var(--md-sys-color-on-primary-container)', opacity: 0.75,
          fontFamily: 'ui-monospace, monospace', marginBottom: '0.35rem' }}>
          ✈ LUGGAGE · TAG
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <h4 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em',
          margin: '0 0 0.3rem', color: 'var(--md-sys-color-on-primary-container)',
          lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 0.3rem' }}>
          {trip.title}
        </h4>
        <div style={{ fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.05em',
          color: 'var(--md-sys-color-on-primary-container)', opacity: 0.8,
          fontFamily: 'ui-monospace, monospace', marginBottom: '0.5rem' }}>
          {trip.startDate} → {trip.endDate}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
          {[
            { l: 'DAYS', v: duration },
            { l: 'STOPS', v: stopsCount },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'var(--md-sys-color-surface-container-lowest)',
              borderRadius: '6px', padding: '3px 10px',
              fontSize: '0.6rem', fontWeight: 800,
              color: 'var(--md-sys-color-primary)',
              fontFamily: 'ui-monospace, monospace', letterSpacing: '0.05em',
            }}>
              {m.v} {m.l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderTop: '1.5px dashed var(--md-sys-color-on-primary-container)',
        paddingTop: '0.35rem', marginTop: '0.5rem', opacity: 0.95 }}>
        <span style={{ fontSize: '0.48rem', fontWeight: 900, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--md-sys-color-on-primary-container)',
          fontFamily: 'ui-monospace, monospace' }}>
          {status.label}
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: 900,
          color: 'var(--md-sys-color-on-primary-container)',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {formatCurrency(totalCost, settings)}
        </span>
      </div>
    </div>
  );
}
