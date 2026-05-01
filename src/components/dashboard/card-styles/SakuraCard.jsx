import { MenuBtn, baseCard } from './shared';

export function SakuraCard(p) {
  const { trip, duration, status, totalCost, settings, formatCurrency, t, isBlossom, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  const Sakura = ({ size, opacity, rotation = 0, style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ position: 'absolute', pointerEvents: 'none', opacity, transform: `rotate(${rotation}deg)`, ...style }}>
      <defs>
        <radialGradient id={`pg-${size}-${rotation}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="var(--md-sys-color-primary-container)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--md-sys-color-primary)" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      {[0, 72, 144, 216, 288].map(deg => (
        <path key={deg} transform={`rotate(${deg} 50 50)`} fill={`url(#pg-${size}-${rotation})`}
          d="M50 10 C58 10 66 18 64 30 C62 38 56 46 50 54 C44 46 38 38 36 30 C34 18 42 10 50 10 Z" />
      ))}
      <circle cx="50" cy="50" r="5" fill="var(--md-sys-color-primary)" opacity="0.7" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <line key={deg} x1="50" y1="46" x2="50" y2="50" transform={`rotate(${deg} 50 50)`}
          stroke="var(--md-sys-color-primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      ))}
    </svg>
  );
  const wOp = isBlossom ? 1 : 0.45;

  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '22px', padding: '1.1rem 1.25rem 1rem',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
      minHeight: '170px', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(131,75,88,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'; }}
    >
      <div style={{ position: 'absolute', top: '-50%', right: '-50%', width: '150%', height: '150%',
        background: 'radial-gradient(circle at center, var(--md-sys-color-primary-container) 0%, transparent 55%)',
        opacity: isBlossom ? 0.35 : 0.15, pointerEvents: 'none' }} />
      <Sakura size={130} opacity={0.14 * wOp} rotation={18} style={{ top: '-38px', right: '-32px' }} />
      <Sakura size={58} opacity={0.1 * wOp} rotation={-25} style={{ bottom: '-12px', right: '35%' }} />
      <Sakura size={28} opacity={0.12 * wOp} rotation={42} style={{ bottom: '28%', left: '-6px' }} />
      <Sakura size={14} opacity={0.18 * wOp} rotation={60} style={{ top: '30%', right: '22%' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent, var(--md-sys-color-primary-container) 30%, var(--md-sys-color-primary) 70%, transparent)', opacity: 0.8 }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.65rem', minHeight: '22px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.56rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.14em', padding: '3px 9px 3px 7px', borderRadius: '4px',
            background: 'var(--md-sys-color-surface-container)', color: 'var(--md-sys-color-primary)',
            border: '1px solid var(--md-sys-color-outline-variant)' }}>
            <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--md-sys-color-primary)', boxShadow: '0 0 6px var(--md-sys-color-primary)' }} />
            {status.label}
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 24 }} />
          </div>
        </div>
        <h4 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.028em', margin: '0 0 0.35rem',
          color: 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
          {trip.title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--md-sys-color-on-surface-variant)',
          fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.9rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)' }}>event</span>
          {trip.startDate} — {trip.endDate}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.35rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)',
            borderRadius: '20px', padding: '5px 13px', fontSize: '0.73rem', fontWeight: 800,
            boxShadow: '0 2px 8px rgba(131,75,88,0.15), inset 0 1px 0 rgba(255,255,255,0.4)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
            {duration} {t('itinerary.days')}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.52rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.14em',
              color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '2px', opacity: 0.75 }}>
              {t('dashboard.total_expenses') || 'Budget'}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--md-sys-color-on-surface)',
              letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalCost, settings)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
