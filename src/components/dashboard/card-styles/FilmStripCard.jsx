import { MenuBtn, baseCard } from './shared';

export function FilmStripCard(p) {
  const { trip, duration, stopsCount, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;

  const allPhotos = Array.isArray(trip.stopPhotos) ? trip.stopPhotos.slice() : [];
  if (allPhotos.length === 0 && trip.days) {
    trip.days.forEach(d => {
      d.stops?.forEach(s => { if (s.photo) allPhotos.push(s.photo); });
    });
  }
  const FRAME_COUNT = 4;
  const pickEvenly = (arr, n) => {
    if (arr.length === 0) return [];
    if (arr.length <= n) return [...arr];
    return Array.from({ length: n }, (_, i) => arr[Math.floor((i * arr.length) / n)]);
  };
  let framePhotos;
  if (allPhotos.length >= FRAME_COUNT) {
    framePhotos = pickEvenly(allPhotos, FRAME_COUNT);
  } else if (allPhotos.length > 0) {
    framePhotos = [...allPhotos, ...Array(FRAME_COUNT - allPhotos.length).fill(null)];
  } else if (trip.thumb) {
    framePhotos = [trip.thumb, null, null, null];
  } else {
    framePhotos = [null, null, null, null];
  }

  const tripSeed = (trip.id ? String(trip.id).charCodeAt(0) : 21);
  const startFrame = 18 + (tripSeed % 18);
  const frameNumbers = [
    `${startFrame}`,
    `${startFrame}A`,
    `${startFrame + 1}`,
    `${startFrame + 1}A`,
  ];

  const sprocketCount = 22;
  const sprockets = Array.from({ length: sprocketCount });

  const unexposedBg = `
    repeating-linear-gradient(135deg,
      rgba(255,255,255,0.018) 0 6px,
      transparent 6px 12px),
    radial-gradient(ellipse at center, #2a1d12 0%, #160e07 70%, #0a0604 100%)
  `;

  return (
    <div onClick={onOpen} style={{
      ...baseCard,
      borderRadius: '4px',
      padding: 0,
      background: '#f6ecd6',
      boxShadow: `
        0 1px 2px rgba(0,0,0,0.08),
        0 10px 26px rgba(20,12,4,0.18),
        0 22px 48px rgba(20,12,4,0.10)
      `,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.08),
          0 20px 44px rgba(20,12,4,0.28),
          0 36px 80px rgba(20,12,4,0.18)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.08),
          0 10px 26px rgba(20,12,4,0.18),
          0 22px 48px rgba(20,12,4,0.10)`;
      }}
    >
      {/* Film strip body */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #0d0805 0%, #1a1108 8%, #1a1108 92%, #0d0805 100%)',
        padding: '7px 9px 6px',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.82 0 0 0 0 0.55 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'screen', opacity: 0.35, pointerEvents: 'none',
        }} />

        {/* Top sprockets */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px', height: '9px', padding: '0 2px', position: 'relative' }}>
          {sprockets.map((_, i) => (
            <div key={`ts-${i}`} style={{ flex: '1 1 auto', height: '6px', background: '#f6ecd6', borderRadius: '1.5px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)' }} />
          ))}
        </div>

        {/* Top imprint: KODAK GOLD 200 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '10px', marginTop: '2px', padding: '0 3px',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          fontSize: '0.44rem', fontWeight: 900, letterSpacing: '0.22em',
          color: '#f2a83a', textTransform: 'uppercase', position: 'relative',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#f2a83a' }}>★</span>
            <span>KODAK&nbsp;GOLD&nbsp;200</span>
            <span style={{ color: '#d9cfb8', opacity: 0.55 }}>→</span>
            <span style={{ color: '#d9cfb8' }}>{(trip.title || 'TRIP').slice(0, 10).toUpperCase()}</span>
          </span>
          <span style={{ color: '#d9cfb8', letterSpacing: '0.18em', opacity: 0.75 }}>
            {status.label?.toUpperCase?.() || 'ROLL'}
          </span>
        </div>

        {/* 4 frames */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', margin: '2px 0 2px', position: 'relative' }}>
          {framePhotos.map((src, i) => {
            const isExposed = !!src;
            return (
              <div key={`f-${i}`} style={{
                position: 'relative', aspectRatio: '3 / 2',
                background: isExposed ? `#000 url('${src}') center/cover no-repeat` : unexposedBg,
                borderRadius: '0.5px', overflow: 'hidden',
                boxShadow: isExposed
                  ? 'inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 12px rgba(0,0,0,0.45)'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.8), inset 0 1px 3px rgba(0,0,0,0.6), inset 0 0 18px rgba(0,0,0,0.55)',
              }}>
                {isExposed && (
                  <>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,200,120,0.1) 0%, transparent 40%, rgba(60,20,10,0.22) 100%)', mixBlendMode: 'overlay', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 130%)', pointerEvents: 'none' }} />
                  </>
                )}
                {!isExposed && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace', fontSize: '0.4rem', fontWeight: 900, letterSpacing: '0.18em',
                      color: 'rgba(242,168,58,0.38)', textTransform: 'uppercase', transform: 'rotate(-8deg)',
                      border: '1px dashed rgba(242,168,58,0.3)', padding: '1px 4px', borderRadius: '1px',
                    }}>—&thinsp;EMPTY&thinsp;—</div>
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 1, right: 2,
                  fontFamily: 'ui-monospace, monospace', fontSize: '0.4rem', fontWeight: 900, letterSpacing: '0.06em',
                  color: isExposed ? '#f2a83a' : 'rgba(242,168,58,0.45)',
                  textShadow: '0 0 2px rgba(0,0,0,0.9)',
                }}>{frameNumbers[i]}</div>
                {i === 0 && isExposed && (
                  <div style={{
                    position: 'absolute', top: 2, left: 2, fontSize: '0.38rem', fontWeight: 900, color: '#f2a83a',
                    fontFamily: 'ui-monospace, monospace', textShadow: '0 0 2px rgba(0,0,0,0.9)',
                  }}>▶</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom imprint */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '10px', padding: '0 3px', position: 'relative',
          fontFamily: 'ui-monospace, monospace', fontSize: '0.44rem', fontWeight: 900, letterSpacing: '0.18em',
          color: '#d9cfb8', opacity: 0.8,
        }}>
          <span>
            <span style={{ color: '#f2a83a' }}>▲</span>&nbsp;
            f/5.6&nbsp;&nbsp;1/250s&nbsp;&nbsp;ISO&nbsp;200
          </span>
          <span style={{ color: '#f2a83a', letterSpacing: '0.22em' }}>
            {frameNumbers.join(' · ')}
          </span>
        </div>

        {/* Bottom sprockets */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px', height: '9px', padding: '0 2px', marginTop: '2px', position: 'relative' }}>
          {sprockets.map((_, i) => (
            <div key={`bs-${i}`} style={{ flex: '1 1 auto', height: '6px', background: '#f6ecd6', borderRadius: '1.5px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)' }} />
          ))}
        </div>

        {/* Menu button */}
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 5 }}>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t,
            size: 20, color: '#f6ecd6', bg: 'rgba(0,0,0,0.55)' }} />
        </div>
      </div>

      {/* Info panel */}
      <div style={{
        position: 'relative', flex: '1 1 auto', padding: '10px 14px 12px',
        background: `
          radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.7) 0%, transparent 60%),
          linear-gradient(165deg, #f8efd9 0%, #f1e4c4 100%)
        `,
        borderTop: '1px solid rgba(60,40,20,0.15)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'multiply', opacity: 0.5, pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.22em', color: '#7a5a2a', textTransform: 'uppercase',
        }}>
          <span>
            <span style={{ color: '#b8624c' }}>●</span>&nbsp;
            {trip.startDate} → {trip.endDate}
          </span>
          <span style={{ color: '#7a5a2a', opacity: 0.7 }}>{duration}D · {stopsCount}ST</span>
        </div>

        <h4 style={{
          position: 'relative', margin: 0, fontSize: '1.15rem', fontWeight: 900,
          letterSpacing: '-0.015em', lineHeight: 1.15, color: '#1c1308',
          fontFamily: '"Playfair Display", "DM Serif Display", Georgia, "Times New Roman", serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 0 rgba(255,255,255,0.6)',
        }}>{trip.title}</h4>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1px' }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.18em',
            color: '#7a5a2a', textTransform: 'uppercase', opacity: 0.85,
          }}>ROLL&nbsp;№&nbsp;{String(trip.id || '000').slice(-3).padStart(3, '0')}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'baseline', gap: '3px',
            padding: '2px 9px 3px',
            background: 'linear-gradient(180deg, #2a1c10 0%, #1a1108 100%)',
            color: '#f2a83a', borderRadius: '2px',
            fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>{formatCurrency(totalCost, settings)}</div>
        </div>
      </div>
    </div>
  );
}
