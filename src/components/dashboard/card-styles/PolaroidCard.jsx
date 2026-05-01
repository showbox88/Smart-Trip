import { MenuBtn, baseCard } from './shared';

export function PolaroidCard(p) {
  const { trip, duration, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard,
      borderRadius: '2px',
      padding: '24px 24px 0 24px',
      background: `
        radial-gradient(ellipse at 30% 15%, rgba(255,255,255,0.85) 0%, transparent 55%),
        linear-gradient(165deg, #fdfaf1 0%, #f9f2e2 55%, #f4ead5 100%)
      `,
      border: '1px solid rgba(70,55,35,0.12)',
      boxShadow: `
        0 1px 2px rgba(0,0,0,0.08),
        0 8px 24px rgba(30,20,10,0.18),
        0 20px 48px rgba(30,20,10,0.12),
        inset 0 1px 0 rgba(255,255,255,0.9),
        inset 0 -1px 0 rgba(0,0,0,0.05)
      `,
      display: 'flex', flexDirection: 'column',
      transform: 'rotate(-1.4deg)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'rotate(0.2deg) translateY(-7px)';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.08),
          0 18px 40px rgba(30,20,10,0.28),
          0 30px 70px rgba(30,20,10,0.18),
          inset 0 1px 0 rgba(255,255,255,0.9),
          inset 0 -1px 0 rgba(0,0,0,0.05)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'rotate(-1.4deg)';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.08),
          0 8px 24px rgba(30,20,10,0.18),
          0 20px 48px rgba(30,20,10,0.12),
          inset 0 1px 0 rgba(255,255,255,0.9),
          inset 0 -1px 0 rgba(0,0,0,0.05)`;
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.15 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'multiply',
        opacity: 0.6,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }} />
      <div style={{
        position: 'absolute', top: '-11px', left: '50%',
        transform: 'translateX(-50%) rotate(-2.5deg)',
        width: '72px', height: '22px',
        background: 'linear-gradient(180deg, rgba(254,182,196,0.65) 0%, rgba(254,182,196,0.45) 100%)',
        backdropFilter: 'blur(1px)',
        boxShadow: '0 2px 5px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4)',
        backgroundImage: `
          linear-gradient(180deg, rgba(254,182,196,0.55), rgba(254,182,196,0.35)),
          repeating-linear-gradient(90deg, transparent 0 4px, rgba(255,255,255,0.25) 4px 5px)
        `,
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.06 / 1',
        flexShrink: 0,
        boxShadow: `
          0 0 0 1px rgba(60,40,20,0.35),
          0 2px 8px rgba(30,20,10,0.25),
          inset 0 0 0 1px rgba(255,255,255,0.4)
        `,
        background: '#1a1814',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: trip.thumb
            ? `url('${trip.thumb}') center/cover no-repeat`
            : 'linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface-container-high) 100%)',
          backgroundColor: '#2a2420',
          filter: 'saturate(0.88) contrast(1.05) sepia(0.08) brightness(0.98)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,220,160,0.08) 0%, transparent 40%, rgba(80,30,20,0.15) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 130%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          boxShadow: `
            inset 0 0 0 1px rgba(0,0,0,0.5),
            inset 0 3px 12px rgba(0,0,0,0.35),
            inset 0 -4px 14px rgba(0,0,0,0.28),
            inset 3px 0 10px rgba(0,0,0,0.18),
            inset -3px 0 10px rgba(0,0,0,0.18)
          `,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(20,15,10,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: '#fff',
          fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          padding: '3px 9px 3px 7px', borderRadius: '2px',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff',
            boxShadow: '0 0 6px rgba(255,255,255,0.9)' }} />
          {status.label}
        </div>
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 24,
            color: '#fff', bg: 'rgba(20,15,10,0.55)' }} />
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        padding: '20px 8px 24px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        gap: '10px',
        position: 'relative',
        zIndex: 2,
      }}>
        <h4 style={{
          fontSize: '1.65rem',
          fontFamily: '"Caveat", "Kalam", "Bradley Hand", "Marker Felt", "Segoe Script", cursive',
          fontWeight: 700,
          letterSpacing: '0.005em',
          margin: 0,
          color: '#2e241c',
          transform: 'rotate(-0.8deg)',
          transformOrigin: 'left center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.25,
          paddingBottom: '2px',
          textShadow: '0 1px 0 rgba(255,255,255,0.5)',
        }}>
          {trip.title}
        </h4>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: '"Caveat", "Kalam", cursive',
          fontSize: '1.15rem',
          lineHeight: 1.25,
          color: '#5a4a3e',
          transform: 'rotate(-0.4deg)',
          transformOrigin: 'left center',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden' }}>
            <span style={{
              fontWeight: 800,
              color: 'var(--md-sys-color-primary)',
              fontSize: '1.35rem',
              letterSpacing: '-0.01em',
            }}>
              {duration}
            </span>
            <span style={{ opacity: 0.78 }}>days</span>
            <span style={{ opacity: 0.35, margin: '0 4px' }}>·</span>
            <span style={{
              fontWeight: 800,
              color: 'var(--md-sys-color-primary)',
              fontSize: '1.35rem',
              letterSpacing: '-0.01em',
            }}>
              {p.stopsCount}
            </span>
            <span style={{ opacity: 0.78 }}>stops</span>
          </span>
          <span style={{
            fontWeight: 800,
            color: 'var(--md-sys-color-primary)',
            fontSize: '1.25rem',
            fontFamily: '"Caveat", cursive',
            whiteSpace: 'nowrap',
          }}>
            {formatCurrency(totalCost, settings)}
          </span>
        </div>
      </div>
    </div>
  );
}
