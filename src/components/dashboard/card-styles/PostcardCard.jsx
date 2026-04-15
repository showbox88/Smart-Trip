import { MenuBtn, baseCard } from './shared';

export function PostcardCard(p) {
  const { trip, duration, stopsCount, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;

  const stampPhoto = (Array.isArray(trip.stopPhotos) && trip.stopPhotos[0]) || trip.thumb || null;

  const destination = (
    (Array.isArray(trip.cities) && trip.cities[0])
    || (trip.title || 'WORLD').split(/[ ,·—-]/)[0]
    || 'WORLD'
  ).toUpperCase().slice(0, 10);

  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const pm = (() => {
    if (!trip.startDate) return { m: '', d: '', y: '' };
    const x = new Date(trip.startDate);
    if (Number.isNaN(x.getTime())) return { m: '', d: '', y: '' };
    return { m: MONTHS[x.getMonth()], d: x.getDate(), y: x.getFullYear() };
  })();

  const airmailStripe = `repeating-linear-gradient(
    135deg,
    #b8624c 0 10px,
    #fbf5e5 10px 20px,
    #3a5a8a 20px 30px,
    #fbf5e5 30px 40px
  )`;
  const BORDER_W = 11;

  return (
    <div onClick={onOpen} style={{
      ...baseCard,
      position: 'relative',
      borderRadius: '4px',
      padding: 0,
      aspectRatio: '16 / 10',
      minHeight: '210px',
      background: `
        radial-gradient(ellipse at 15% 0%, rgba(255,255,255,0.85) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 100%, rgba(235,210,180,0.5) 0%, transparent 58%),
        linear-gradient(162deg, #fbf5e5 0%, #f5ecd3 55%, #ebdfbb 100%)
      `,
      border: '1px solid rgba(90,60,30,0.22)',
      boxShadow: `
        0 1px 2px rgba(0,0,0,0.06),
        0 10px 26px rgba(90,60,30,0.18),
        0 24px 54px rgba(90,60,30,0.1),
        inset 0 1px 0 rgba(255,255,255,0.8)
      `,
      overflow: 'hidden',
      transform: 'rotate(-0.4deg)',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'rotate(0.35deg) translateY(-5px)';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.06),
          0 20px 40px rgba(90,60,30,0.24),
          0 40px 80px rgba(90,60,30,0.14),
          inset 0 1px 0 rgba(255,255,255,0.8)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'rotate(-0.4deg)';
        e.currentTarget.style.boxShadow = `
          0 1px 2px rgba(0,0,0,0.06),
          0 10px 26px rgba(90,60,30,0.18),
          0 24px 54px rgba(90,60,30,0.1),
          inset 0 1px 0 rgba(255,255,255,0.8)`;
      }}
    >
      {/* Paper texture noise */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='pp'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0 0.08 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23pp)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'multiply',
        opacity: 0.55,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Airmail border stripes — top, bottom, left, right */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${BORDER_W}px`, background: airmailStripe, opacity: 0.5, borderBottom: '1px solid rgba(90,60,30,0.18)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${BORDER_W}px`, background: airmailStripe, opacity: 0.5, borderTop: '1px solid rgba(90,60,30,0.18)', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${BORDER_W}px`, background: airmailStripe, opacity: 0.5, borderRight: '1px solid rgba(90,60,30,0.18)', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${BORDER_W}px`, background: airmailStripe, opacity: 0.5, borderLeft: '1px solid rgba(90,60,30,0.18)', zIndex: 1 }} />

      {/* Main content grid */}
      <div style={{
        position: 'absolute',
        top: `${BORDER_W}px`, bottom: `${BORDER_W}px`,
        left: `${BORDER_W}px`, right: `${BORDER_W}px`,
        display: 'grid',
        gridTemplateColumns: '1fr minmax(120px, 42%)',
        gap: '14px',
        padding: '14px 16px 12px',
        zIndex: 2,
      }}>
        {/* Left column — text content */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <div style={{
            fontFamily: '"Playfair Display", "DM Serif Display", Georgia, serif',
            fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.34em',
            color: '#2e1f0a', textTransform: 'uppercase',
            textShadow: '0 1px 0 rgba(255,255,255,0.65)',
            flexShrink: 0, lineHeight: 1,
          }}>POST&nbsp;·&nbsp;CARD</div>
          <div style={{ height: '1.6px', width: '40px', background: 'linear-gradient(90deg, #2e1f0a 0%, transparent 100%)', opacity: 0.6, marginTop: '3px', marginBottom: '2px', flexShrink: 0 }} />
          <div style={{
            fontFamily: 'ui-serif, Georgia, serif', fontSize: '0.46rem', fontWeight: 700, letterSpacing: '0.3em',
            color: '#7a5226', textTransform: 'uppercase', opacity: 0.7, flexShrink: 0, lineHeight: 1.2,
          }}>via air mail · par avion</div>

          <div style={{
            marginTop: '10px', fontFamily: '"Caveat", "Kalam", cursive', fontSize: '0.82rem',
            color: '#6a4828', opacity: 0.9, lineHeight: 1, flexShrink: 0,
            textShadow: '0 1px 0 rgba(255,255,255,0.55)',
          }}>Greetings from…</div>
          <h4 style={{
            margin: '2px 0 0',
            fontFamily: '"Caveat", "Kalam", "Bradley Hand", "Marker Felt", cursive',
            fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.005em',
            color: 'var(--md-sys-color-primary)',
            transform: 'rotate(-1deg)', transformOrigin: 'left top',
            textShadow: '0 1px 0 rgba(255,255,255,0.6)',
            flexShrink: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', wordBreak: 'break-word',
          }}>{trip.title}</h4>

          <div style={{ flex: '1 1 auto', minHeight: '6px' }} />

          <div style={{ flexShrink: 0, paddingTop: '8px', borderTop: '1px dashed rgba(90,60,30,0.34)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontFamily: '"Caveat", "Kalam", cursive', fontSize: '0.88rem', color: '#5a3c20',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15,
            }}>
              <span style={{ fontWeight: 600 }}>{trip.startDate}</span>
              <span style={{ opacity: 0.5, margin: '0 5px' }}>→</span>
              <span style={{ fontWeight: 600 }}>{trip.endDate}</span>
              <span style={{ opacity: 0.4, margin: '0 5px' }}>·</span>
              <span style={{ opacity: 0.82 }}>{stopsCount}&nbsp;stops</span>
            </div>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.2em',
              color: '#7a5226', opacity: 0.75, textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>POSTAGE · PAID</div>
          </div>
        </div>

        {/* Right column — stamp + postmark */}
        <div style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>
          {/* Stamp */}
          <div style={{
            position: 'absolute', top: '0', right: '2%', height: '80%', aspectRatio: '4 / 5', maxWidth: '96%',
            padding: '6%', background: '#fffdf5',
            outline: '1px solid rgba(90,60,30,0.22)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.18), 0 10px 22px rgba(0,0,0,0.12), 0 18px 40px rgba(90,60,30,0.1)',
            transform: 'rotate(3deg)', zIndex: 3,
          }}>
            {/* Perforations */}
            {(() => {
              const PERF_H = 13;
              const PERF_V = 16;
              const perfStyle = {
                position: 'absolute', width: '8px', height: '8px', borderRadius: '50%',
                background: '#f5ecd3',
                boxShadow: 'inset 0 0 0 0.6px rgba(90,60,30,0.18), 0 0 0 0.5px rgba(255,255,255,0.8)',
                pointerEvents: 'none', zIndex: 5,
              };
              return (
                <>
                  {Array.from({ length: PERF_H }).map((_, i) => {
                    const pct = (i / (PERF_H - 1)) * 100;
                    return (<div key={`pt-${i}`} style={{ ...perfStyle, top: 0, left: `${pct}%`, transform: 'translate(-50%, -50%)' }} />);
                  })}
                  {Array.from({ length: PERF_H }).map((_, i) => {
                    const pct = (i / (PERF_H - 1)) * 100;
                    return (<div key={`pb-${i}`} style={{ ...perfStyle, bottom: 0, left: `${pct}%`, transform: 'translate(-50%, 50%)' }} />);
                  })}
                  {Array.from({ length: PERF_V }).map((_, i) => {
                    const pct = (i / (PERF_V - 1)) * 100;
                    return (<div key={`pl-${i}`} style={{ ...perfStyle, left: 0, top: `${pct}%`, transform: 'translate(-50%, -50%)' }} />);
                  })}
                  {Array.from({ length: PERF_V }).map((_, i) => {
                    const pct = (i / (PERF_V - 1)) * 100;
                    return (<div key={`pr-${i}`} style={{ ...perfStyle, right: 0, top: `${pct}%`, transform: 'translate(50%, -50%)' }} />);
                  })}
                </>
              );
            })()}
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              background: stampPhoto
                ? `url('${stampPhoto}') center/cover no-repeat`
                : 'linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-primary-container) 100%)',
              overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,230,200,0.18) 0%, transparent 45%, rgba(60,30,20,0.4) 100%)', mixBlendMode: 'overlay', pointerEvents: 'none' }} />
              <div style={{
                position: 'absolute', right: '6%', bottom: '5%', padding: '1px 7px 2px',
                background: 'rgba(20,12,4,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
                borderRadius: '2px', fontSize: '1.15rem', fontWeight: 900, color: '#fffbe8',
                fontFamily: 'ui-serif, Georgia, serif', lineHeight: 1, letterSpacing: '-0.01em',
                textShadow: '0 1px 3px rgba(0,0,0,0.95)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>{duration}¢</div>
            </div>
          </div>

          {/* Postmark SVG */}
          <svg viewBox="0 0 280 100" preserveAspectRatio="xMidYMid meet" style={{
            position: 'absolute', bottom: '4%', left: '0%', width: '102%', opacity: 0.68,
            transform: 'rotate(-13deg)', transformOrigin: '18% 75%', pointerEvents: 'none',
            zIndex: 4, overflow: 'visible', mixBlendMode: 'multiply', filter: 'blur(0.15px)',
          }}>
            <defs>
              <path id={`pmTop-${trip.id}`} d="M 22 58 A 32 32 0 0 1 78 58" fill="none" />
            </defs>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#3a1f12" strokeWidth="2.6" strokeOpacity="0.78" />
            <circle cx="50" cy="50" r="33" fill="none" stroke="#3a1f12" strokeWidth="0.9" strokeOpacity="0.62" />
            <text fill="#3a1f12" fillOpacity="0.88" fontSize="9" fontWeight="900" letterSpacing="1.4" fontFamily='"Playfair Display", ui-serif, Georgia, serif'>
              <textPath href={`#pmTop-${trip.id}`} startOffset="50%" textAnchor="middle">★ {destination} ★</textPath>
            </text>
            <line x1="24" y1="44" x2="76" y2="44" stroke="#3a1f12" strokeWidth="0.7" strokeOpacity="0.55" />
            <line x1="24" y1="64" x2="76" y2="64" stroke="#3a1f12" strokeWidth="0.7" strokeOpacity="0.55" />
            <text x="50" y="58" textAnchor="middle" fill="#3a1f12" fillOpacity="0.9" fontSize="11" fontWeight="900" fontFamily='ui-serif, Georgia, "Times New Roman", serif' letterSpacing="0.2">{pm.m}&nbsp;{pm.d}</text>
            <text x="50" y="74" textAnchor="middle" fill="#3a1f12" fillOpacity="0.85" fontSize="6.2" fontWeight="900" letterSpacing="1.6" fontFamily='ui-monospace, "SFMono-Regular", monospace'>{pm.y}</text>
            {[18, 30, 42, 54, 66, 78].map((y) => (
              <path key={`kb-${y}`} d={`M 94 ${y} Q 117 ${y - 5} 140 ${y} T 186 ${y} T 232 ${y} T 278 ${y}`}
                fill="none" stroke="#3a1f12" strokeWidth="2.6" strokeOpacity="0.72" strokeLinecap="round" />
            ))}
          </svg>

          {/* Total cost pill + menu */}
          <div style={{ position: 'absolute', bottom: 0, right: '2%', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 5 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'baseline', padding: '2px 10px 3px',
              background: 'linear-gradient(180deg, var(--md-sys-color-primary) 0%, #6d3548 100%)',
              color: 'var(--md-sys-color-on-primary)', borderRadius: '2px',
              fontFamily: 'ui-serif, Georgia, serif', fontSize: '0.8rem', fontWeight: 900,
              letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 1px 3px rgba(131,75,88,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
              textShadow: '0 1px 1px rgba(0,0,0,0.25)',
            }}>{formatCurrency(totalCost, settings)}</div>
            <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20,
              color: '#5a3c20', bg: 'rgba(90,60,30,0.1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
