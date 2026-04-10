/**
 * 9 个精心设计的 Compact TripCard 样式变体
 * 每个组件接收统一的 props：
 *   { trip, duration, stopsCount, totalCost, status, currency,
 *     menuOpen, onOpen, onMenuToggle, onEdit, onShare, onDelete,
 *     isBlossom, t, settings, formatCurrency }
 *
 * 所有配色均使用 MD3 主题 tokens（primary / primary-container / surface 等），
 * 永远不会与 Blossom 或其他主题冲突。
 */

// ═══════════════════════════════════════════════════════════════════════
// 通用菜单按钮（所有样式共享）
// ═══════════════════════════════════════════════════════════════════════
function MenuBtn({ menuOpen, onMenuToggle, onEdit, onShare, onDelete, trip, t, size = 22, color, bg = 'transparent', setMenuOpen }) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="menu-dots" onClick={onMenuToggle} style={{
        background: bg, border: 'none', borderRadius: '50%',
        width: `${size}px`, height: `${size}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color || 'var(--md-sys-color-on-surface-variant)',
        cursor: 'pointer', fontSize: `${Math.max(14, size - 7)}px`,
        transition: 'background 0.15s',
      }}>⋮</button>
      {menuOpen && (
        <div className="menu-dropdown" style={{ right: 0, top: `${size + 4}px`, transform: 'none', zIndex: 100, display: 'flex' }}>
          <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
          </button>
          <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
          </button>
          <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={onDelete}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

const baseCard = {
  position: 'relative',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
};

// ═══════════════════════════════════════════════════════════════════════
// 1. SAKURA — 樱花水印（精致五瓣花 + 柔光渐变）
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// 2. BOARDING PASS — 登机牌票根
// ═══════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════
// 3. POLAROID — 专业级宝丽来（真实相纸比例 · 厚边框 · 胶片滤镜）
// ═══════════════════════════════════════════════════════════════════════
export function PolaroidCard(p) {
  const { trip, duration, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard,
      borderRadius: '2px',
      /* 真实宝丽来 SX-70 相纸比例：顶/左/右中等边，底部厚边 */
      padding: '24px 24px 0 24px',
      /* 相纸纸质纹理 — 柔和的米白渐变 + 细微噪点 */
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
      {/* 相纸纸纹噪点叠层 — SVG noise */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.15 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'multiply',
        opacity: 0.6,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }} />

      {/* 胶带 — 半透明和纸胶带质感 */}
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

      {/* ═══════ 照片区 — 略宽于正方形（1.06:1），缩小视觉占比 ═══════ */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1.06 / 1',
        flexShrink: 0,
        /* 照片外的 2px 深色压痕 */
        boxShadow: `
          0 0 0 1px rgba(60,40,20,0.35),
          0 2px 8px rgba(30,20,10,0.25),
          inset 0 0 0 1px rgba(255,255,255,0.4)
        `,
        background: '#1a1814',
        overflow: 'hidden',
      }}>
        {/* 图片层 — 带胶片滤镜 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: trip.thumb
            ? `url('${trip.thumb}') center/cover no-repeat`
            : 'linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface-container-high) 100%)',
          backgroundColor: '#2a2420',
          /* 胶片色彩：轻微降饱和 + 偏黄 + 柔对比 */
          filter: 'saturate(0.88) contrast(1.05) sepia(0.08) brightness(0.98)',
        }} />

        {/* 暖色胶片色调叠层 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,220,160,0.08) 0%, transparent 40%, rgba(80,30,20,0.15) 100%)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />

        {/* 四角渐晕（vignette）*/}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 130%)',
          pointerEvents: 'none',
        }} />

        {/* 照片内阴影 — 边缘压痕 */}
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

        {/* 顶部柔光（像快门开启的刹那）*/}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* 状态 badge — 左上角，像贴的小标签 */}
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

        {/* 菜单 — 右上角 */}
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 24,
            color: '#fff', bg: 'rgba(20,15,10,0.55)' }} />
        </div>
      </div>

      {/* ═══════ 底部厚白边 — 手写区（普通 flex child，稳定布局）═══════ */}
      <div style={{
        flexShrink: 0,
        padding: '18px 6px 22px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* 标题 — 手写体 */}
        <h4 style={{
          fontSize: '1.15rem',
          fontFamily: '"Caveat", "Kalam", "Bradley Hand", "Marker Felt", "Segoe Script", cursive',
          fontWeight: 600,
          letterSpacing: '0.005em',
          margin: 0,
          color: '#2e241c',  /* 深墨蓝灰，像钢笔迹 */
          transform: 'rotate(-0.8deg)',
          transformOrigin: 'left center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
          paddingBottom: '2px',
          textShadow: '0 1px 0 rgba(255,255,255,0.5)',
        }}>
          {trip.title}
        </h4>

        {/* 日期 · 天数 · 预算 — 一行 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: '"Caveat", "Kalam", cursive',
          fontSize: '0.82rem',
          lineHeight: 1.25,
          color: '#5a4a3e',
          transform: 'rotate(-0.4deg)',
          transformOrigin: 'left center',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{
              fontWeight: 800,
              color: 'var(--md-sys-color-primary)',
              fontSize: '0.98rem',
              letterSpacing: '-0.01em',
            }}>
              {duration}
            </span>
            <span style={{ opacity: 0.75 }}>days</span>
            <span style={{ opacity: 0.35, margin: '0 3px' }}>·</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{trip.startDate}</span>
          </span>
          <span style={{
            fontWeight: 800,
            color: 'var(--md-sys-color-primary)',
            fontSize: '0.92rem',
            fontFamily: '"Caveat", cursive',
          }}>
            {formatCurrency(totalCost, settings)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 4. MAGAZINE — 编辑式大字排版
// ═══════════════════════════════════════════════════════════════════════
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
      {/* Header 刊名 */}
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

      {/* 主标题 — 编辑式大字 */}
      <h4 style={{
        fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
        fontSize: '1.55rem', fontWeight: 900, fontStyle: 'italic',
        letterSpacing: '-0.025em', lineHeight: 1.02,
        margin: '0 0 0.4rem', color: 'var(--md-sys-color-on-surface)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {trip.title}
      </h4>

      {/* Dek / 副标题 */}
      <div style={{ fontSize: '0.66rem', fontWeight: 500, fontStyle: 'italic',
        color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.4,
        fontFamily: 'ui-serif, Georgia, serif', marginBottom: '0.75rem' }}>
        {duration} days · {stopsCount} stops · {status.label.toLowerCase()}
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer: byline + price */}
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

// ═══════════════════════════════════════════════════════════════════════
// 5. HANKO — 日式印章 / 极简垂直
// ═══════════════════════════════════════════════════════════════════════
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
      {/* 右上圆印 */}
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

      {/* 垂直文字装饰 */}
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

// ═══════════════════════════════════════════════════════════════════════
// 6. POSTCARD — 明信片 + 邮戳
// ═══════════════════════════════════════════════════════════════════════
export function PostcardCard(p) {
  const { trip, duration, stopsCount, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;

  // ── 邮票图:首选第一张 stop 照片,退而求其次 trip.thumb ──
  const stampPhoto = (Array.isArray(trip.stopPhotos) && trip.stopPhotos[0]) || trip.thumb || null;

  // ── 邮戳目的地:第一座城市,否则用标题前缀 ──
  const destination = (
    (Array.isArray(trip.cities) && trip.cities[0])
    || (trip.title || 'WORLD').split(/[ ,·—-]/)[0]
    || 'WORLD'
  ).toUpperCase().slice(0, 10);

  // ── 邮戳日期 ──
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const pm = (() => {
    if (!trip.startDate) return { m: '', d: '', y: '' };
    const x = new Date(trip.startDate);
    if (Number.isNaN(x.getTime())) return { m: '', d: '', y: '' };
    return { m: MONTHS[x.getMonth()], d: x.getDate(), y: x.getFullYear() };
  })();

  // ── Airmail 四边斜纹 —— 经典红/白/蓝三色信封边框 ──
  const airmailStripe = `repeating-linear-gradient(
    135deg,
    #b8624c 0 10px,
    #fbf5e5 10px 20px,
    #3a5a8a 20px 30px,
    #fbf5e5 30px 40px
  )`;
  const BORDER_W = 11;   // 四边彩条宽度

  return (
    <div onClick={onOpen} style={{
      ...baseCard,
      position: 'relative',
      borderRadius: '4px',
      padding: 0,
      /* 横向信封比例 — 宽胜于高 */
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
      {/* 纸纹噪点 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='pp'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0 0.08 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23pp)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'multiply',
        opacity: 0.55,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ═══════════ 四边 Airmail 彩条 ═══════════ */}
      {/* 上 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: `${BORDER_W}px`,
        background: airmailStripe, opacity: 0.5,
        borderBottom: '1px solid rgba(90,60,30,0.18)', zIndex: 1,
      }} />
      {/* 下 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: `${BORDER_W}px`,
        background: airmailStripe, opacity: 0.5,
        borderTop: '1px solid rgba(90,60,30,0.18)', zIndex: 1,
      }} />
      {/* 左 */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: `${BORDER_W}px`,
        background: airmailStripe, opacity: 0.5,
        borderRight: '1px solid rgba(90,60,30,0.18)', zIndex: 1,
      }} />
      {/* 右 */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: `${BORDER_W}px`,
        background: airmailStripe, opacity: 0.5,
        borderLeft: '1px solid rgba(90,60,30,0.18)', zIndex: 1,
      }} />

      {/* ═══════════ 主内容区 — 横向网格 ═══════════ */}
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
        {/* ═══════════ 左栏 — 文字内容 ═══════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          minWidth: 0, minHeight: 0,
        }}>
          {/* ─── POST · CARD 压印 ─── */}
          <div style={{
            fontFamily: '"Playfair Display", "DM Serif Display", Georgia, serif',
            fontSize: '0.68rem', fontWeight: 900,
            letterSpacing: '0.34em',
            color: '#2e1f0a',
            textTransform: 'uppercase',
            textShadow: '0 1px 0 rgba(255,255,255,0.65)',
            flexShrink: 0,
            lineHeight: 1,
          }}>
            POST&nbsp;·&nbsp;CARD
          </div>
          <div style={{
            height: '1.6px', width: '40px',
            background: 'linear-gradient(90deg, #2e1f0a 0%, transparent 100%)',
            opacity: 0.6,
            marginTop: '3px', marginBottom: '2px',
            flexShrink: 0,
          }} />
          <div style={{
            fontFamily: 'ui-serif, Georgia, serif',
            fontSize: '0.46rem', fontWeight: 700,
            letterSpacing: '0.3em',
            color: '#7a5226',
            textTransform: 'uppercase',
            opacity: 0.7,
            flexShrink: 0,
            lineHeight: 1.2,
          }}>
            via air mail · par avion
          </div>

          {/* ─── Greetings + 标题 ─── */}
          <div style={{
            marginTop: '10px',
            fontFamily: '"Caveat", "Kalam", cursive',
            fontSize: '0.82rem',
            color: '#6a4828',
            opacity: 0.9,
            lineHeight: 1,
            flexShrink: 0,
            textShadow: '0 1px 0 rgba(255,255,255,0.55)',
          }}>
            Greetings from…
          </div>
          <h4 style={{
            margin: '2px 0 0',
            fontFamily: '"Caveat", "Kalam", "Bradley Hand", "Marker Felt", cursive',
            fontSize: '1.5rem',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.005em',
            color: 'var(--md-sys-color-primary)',
            transform: 'rotate(-1deg)',
            transformOrigin: 'left top',
            textShadow: '0 1px 0 rgba(255,255,255,0.6)',
            flexShrink: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}>
            {trip.title}
          </h4>

          {/* ── flex spacer ── */}
          <div style={{ flex: '1 1 auto', minHeight: '6px' }} />

          {/* ─── 底部虚线分隔 ─── */}
          <div style={{
            flexShrink: 0,
            paddingTop: '8px',
            borderTop: '1px dashed rgba(90,60,30,0.34)',
            display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            {/* 日期行 */}
            <div style={{
              fontFamily: '"Caveat", "Kalam", cursive',
              fontSize: '0.88rem',
              color: '#5a3c20',
              whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.15,
            }}>
              <span style={{ fontWeight: 600 }}>{trip.startDate}</span>
              <span style={{ opacity: 0.5, margin: '0 5px' }}>→</span>
              <span style={{ fontWeight: 600 }}>{trip.endDate}</span>
              <span style={{ opacity: 0.4, margin: '0 5px' }}>·</span>
              <span style={{ opacity: 0.82 }}>{stopsCount}&nbsp;stops</span>
            </div>

            {/* POSTAGE PAID 标签 — 单独一行(价格 pill 已移到右栏底部对齐邮票) */}
            <div style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.2em',
              color: '#7a5226', opacity: 0.75,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              POSTAGE · PAID
            </div>
          </div>
        </div>

        {/* ═══════════ 右栏 — 邮票 + 邮戳 ═══════════ */}
        <div style={{
          position: 'relative',
          minWidth: 0, minHeight: 0,
        }}>
          {/* ══ 邮票本体 — 略偏右上,底部留出价格 pill 空间 ══ */}
          <div style={{
            position: 'absolute',
            top: '0', right: '2%',
            height: '80%',
            aspectRatio: '4 / 5',
            maxWidth: '96%',
            padding: '6%',
            background: '#fffdf5',
            outline: '1px solid rgba(90,60,30,0.22)',
            boxShadow: `
              0 3px 6px rgba(0,0,0,0.18),
              0 10px 22px rgba(0,0,0,0.12),
              0 18px 40px rgba(90,60,30,0.1)
            `,
            transform: 'rotate(3deg)',
            zIndex: 3,
          }}>
            {/* ── 穿孔齿边:四边各一排小圆孔 ── */}
            {(() => {
              const PERF_H = 13;
              const PERF_V = 16;
              const perfStyle = {
                position: 'absolute',
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: '#f5ecd3',
                boxShadow: 'inset 0 0 0 0.6px rgba(90,60,30,0.18), 0 0 0 0.5px rgba(255,255,255,0.8)',
                pointerEvents: 'none',
                zIndex: 5,
              };
              return (
                <>
                  {Array.from({ length: PERF_H }).map((_, i) => {
                    const pct = (i / (PERF_H - 1)) * 100;
                    return (
                      <div key={`pt-${i}`} style={{
                        ...perfStyle,
                        top: 0, left: `${pct}%`,
                        transform: 'translate(-50%, -50%)',
                      }} />
                    );
                  })}
                  {Array.from({ length: PERF_H }).map((_, i) => {
                    const pct = (i / (PERF_H - 1)) * 100;
                    return (
                      <div key={`pb-${i}`} style={{
                        ...perfStyle,
                        bottom: 0, left: `${pct}%`,
                        transform: 'translate(-50%, 50%)',
                      }} />
                    );
                  })}
                  {Array.from({ length: PERF_V }).map((_, i) => {
                    const pct = (i / (PERF_V - 1)) * 100;
                    return (
                      <div key={`pl-${i}`} style={{
                        ...perfStyle,
                        left: 0, top: `${pct}%`,
                        transform: 'translate(-50%, -50%)',
                      }} />
                    );
                  })}
                  {Array.from({ length: PERF_V }).map((_, i) => {
                    const pct = (i / (PERF_V - 1)) * 100;
                    return (
                      <div key={`pr-${i}`} style={{
                        ...perfStyle,
                        right: 0, top: `${pct}%`,
                        transform: 'translate(50%, -50%)',
                      }} />
                    );
                  })}
                </>
              );
            })()}

            <div style={{
              position: 'relative',
              width: '100%', height: '100%',
              background: stampPhoto
                ? `url('${stampPhoto}') center/cover no-repeat`
                : 'linear-gradient(135deg, var(--md-sys-color-primary) 0%, var(--md-sys-color-primary-container) 100%)',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
            }}>
              {/* 邮票色调 */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(255,230,200,0.18) 0%, transparent 45%, rgba(60,30,20,0.4) 100%)',
                mixBlendMode: 'overlay',
                pointerEvents: 'none',
              }} />
              {/* 邮资 — 右下角 */}
              <div style={{
                position: 'absolute',
                right: '6%', bottom: '5%',
                padding: '1px 7px 2px',
                background: 'rgba(20,12,4,0.55)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                borderRadius: '2px',
                fontSize: '1.15rem', fontWeight: 900,
                color: '#fffbe8',
                fontFamily: 'ui-serif, Georgia, serif',
                lineHeight: 1,
                letterSpacing: '-0.01em',
                textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {duration}¢
              </div>
            </div>
          </div>

          {/* ══ 圆形邮戳 — 覆盖邮票左下角 ══ */}
          <div style={{
            position: 'absolute',
            bottom: '6%', left: '2%',
            width: '44%',
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            border: '2px solid var(--md-sys-color-primary)',
            boxShadow: 'inset 0 0 0 4px transparent, inset 0 0 0 6px var(--md-sys-color-primary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--md-sys-color-primary)',
            opacity: 0.55,
            transform: 'rotate(-12deg)',
            fontFamily: 'ui-monospace, "SFMono-Regular", monospace',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 4,
            lineHeight: 1,
          }}>
            <div style={{ fontSize: '0.5rem', fontWeight: 900, letterSpacing: '0.14em' }}>
              ✦&nbsp;{destination}&nbsp;✦
            </div>
            <div style={{
              fontSize: '0.95rem', fontWeight: 900,
              margin: '3px 0 2px',
              fontFamily: 'ui-serif, Georgia, serif',
              letterSpacing: '0.01em',
            }}>
              {pm.m}&nbsp;{pm.d}
            </div>
            <div style={{ fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.12em' }}>
              {pm.y}
            </div>
            {/* 取消线 */}
            <div style={{
              position: 'absolute', top: '50%', left: '-20%', right: '-50%',
              height: '1.3px', background: 'var(--md-sys-color-primary)', opacity: 0.55,
              transform: 'translateY(-7px)',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '-20%', right: '-50%',
              height: '1.3px', background: 'var(--md-sys-color-primary)', opacity: 0.55,
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: '-20%', right: '-50%',
              height: '1.3px', background: 'var(--md-sys-color-primary)', opacity: 0.55,
              transform: 'translateY(7px)',
            }} />
          </div>

          {/* ══ 总消费 pill + 菜单 — 右下角,与邮票右边缘对齐 ══ */}
          <div style={{
            position: 'absolute',
            bottom: 0, right: '2%',
            display: 'flex', alignItems: 'center', gap: '6px',
            zIndex: 5,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'baseline',
              padding: '2px 10px 3px',
              background: 'linear-gradient(180deg, var(--md-sys-color-primary) 0%, #6d3548 100%)',
              color: 'var(--md-sys-color-on-primary)',
              borderRadius: '2px',
              fontFamily: 'ui-serif, Georgia, serif',
              fontSize: '0.8rem', fontWeight: 900,
              letterSpacing: '0.01em',
              fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 1px 3px rgba(131,75,88,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
              textShadow: '0 1px 1px rgba(0,0,0,0.25)',
            }}>
              {formatCurrency(totalCost, settings)}
            </div>
            <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20,
              color: '#5a3c20', bg: 'rgba(90,60,30,0.1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 7. MINIMAL — 瑞士极简网格
// ═══════════════════════════════════════════════════════════════════════
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

      {/* 3 列 metric 网格 */}
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

// ═══════════════════════════════════════════════════════════════════════
// 8. LUGGAGE TAG — 行李牌（带孔 + 绳）
// ═══════════════════════════════════════════════════════════════════════
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
      {/* 顶部孔 */}
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
        width: '16px', height: '16px', borderRadius: '50%',
        background: 'var(--md-sys-color-surface)',
        border: '2px solid var(--md-sys-color-primary)' }} />
      {/* 绳子 */}
      <div style={{ position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
        width: '2px', height: '12px', background: 'var(--md-sys-color-primary)' }} />

      {/* 虚线内框 */}
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

// ═══════════════════════════════════════════════════════════════════════
// 9. FILMSTRIP — 胶片条
// ═══════════════════════════════════════════════════════════════════════
export function FilmStripCard(p) {
  const { trip, duration, stopsCount, totalCost, status, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;

  // ── 收集 trip 里所有 stop 的照片 ───────────────────────────
  // v2 架构：normalizeTripRow 已把所有 stop 照片汇总到 trip.stopPhotos
  // 兜底：如果是旧版 trip 结构（有 days），再从 days→stops 里捞
  const allPhotos = Array.isArray(trip.stopPhotos) ? trip.stopPhotos.slice() : [];
  if (allPhotos.length === 0 && trip.days) {
    trip.days.forEach(d => {
      d.stops?.forEach(s => { if (s.photo) allPhotos.push(s.photo); });
    });
  }
  // 抽样策略：
  //   ≥4 张 → 均匀抽 4 张
  //   1–3 张 → 真实照片 + 剩余帧为"未曝光"（null）
  //   0 张 → 若有封面图则单张显示在第 1 帧，其余未曝光；无封面图则全部未曝光
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

  // 帧号（真实 35mm 胶卷编号样式：21 · 21A · 22 · 22A）
  const tripSeed = (trip.id ? String(trip.id).charCodeAt(0) : 21);
  const startFrame = 18 + (tripSeed % 18); // 18-35 之间
  const frameNumbers = [
    `${startFrame}`,
    `${startFrame}A`,
    `${startFrame + 1}`,
    `${startFrame + 1}A`,
  ];

  const sprocketCount = 22;
  const sprockets = Array.from({ length: sprocketCount });

  // 未曝光帧的背景 —— 真实 35mm 胶卷未拍摄部分的暗棕色
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
      {/* ═══════════ 胶片条主体 ═══════════ */}
      <div style={{
        position: 'relative',
        background: `
          linear-gradient(180deg, #0d0805 0%, #1a1108 8%, #1a1108 92%, #0d0805 100%)
        `,
        padding: '7px 9px 6px',
        flexShrink: 0,
      }}>
        {/* 胶片噪点/划痕 overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.82 0 0 0 0 0.55 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'screen',
          opacity: 0.35,
          pointerEvents: 'none',
        }} />

        {/* ─── 顶部齿孔条 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '2px', height: '9px', padding: '0 2px', position: 'relative',
        }}>
          {sprockets.map((_, i) => (
            <div key={`ts-${i}`} style={{
              flex: '1 1 auto', height: '6px',
              background: '#f6ecd6', borderRadius: '1.5px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)',
            }} />
          ))}
        </div>

        {/* ─── 顶部刻印：KODAK GOLD 200 / 类型标 ─── */}
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

        {/* ─── 4 帧画面 ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '3px',
          margin: '2px 0 2px',
          position: 'relative',
        }}>
          {framePhotos.map((src, i) => {
            const isExposed = !!src;
            return (
              <div key={`f-${i}`} style={{
                position: 'relative',
                aspectRatio: '3 / 2',
                background: isExposed
                  ? `#000 url('${src}') center/cover no-repeat`
                  : unexposedBg,
                borderRadius: '0.5px',
                overflow: 'hidden',
                boxShadow: isExposed
                  ? 'inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 0 12px rgba(0,0,0,0.45)'
                  : 'inset 0 0 0 1px rgba(0,0,0,0.8), inset 0 1px 3px rgba(0,0,0,0.6), inset 0 0 18px rgba(0,0,0,0.55)',
              }}>
                {/* 已曝光：胶片色调 + 四角渐晕 */}
                {isExposed && (
                  <>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(180deg, rgba(255,200,120,0.1) 0%, transparent 40%, rgba(60,20,10,0.22) 100%)',
                      mixBlendMode: 'overlay',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 130%)',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}

                {/* 未曝光：居中的虚线"UNEXPOSED"水印 */}
                {!isExposed && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.4rem', fontWeight: 900, letterSpacing: '0.18em',
                      color: 'rgba(242,168,58,0.38)',
                      textTransform: 'uppercase',
                      transform: 'rotate(-8deg)',
                      border: '1px dashed rgba(242,168,58,0.3)',
                      padding: '1px 4px',
                      borderRadius: '1px',
                    }}>—&thinsp;EMPTY&thinsp;—</div>
                  </div>
                )}

                {/* 帧号 — 右下角小标（未曝光时变暗） */}
                <div style={{
                  position: 'absolute', bottom: 1, right: 2,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.4rem', fontWeight: 900, letterSpacing: '0.06em',
                  color: isExposed ? '#f2a83a' : 'rgba(242,168,58,0.45)',
                  textShadow: '0 0 2px rgba(0,0,0,0.9)',
                }}>{frameNumbers[i]}</div>

                {/* 首帧左上三角（仅已曝光） */}
                {i === 0 && isExposed && (
                  <div style={{
                    position: 'absolute', top: 2, left: 2,
                    fontSize: '0.38rem', fontWeight: 900, color: '#f2a83a',
                    fontFamily: 'ui-monospace, monospace',
                    textShadow: '0 0 2px rgba(0,0,0,0.9)',
                  }}>▶</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── 底部刻印：曝光数据 / 菜单 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '10px', padding: '0 3px', position: 'relative',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.44rem', fontWeight: 900, letterSpacing: '0.18em',
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

        {/* ─── 底部齿孔条 ─── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '2px', height: '9px', padding: '0 2px', marginTop: '2px', position: 'relative',
        }}>
          {sprockets.map((_, i) => (
            <div key={`bs-${i}`} style={{
              flex: '1 1 auto', height: '6px',
              background: '#f6ecd6', borderRadius: '1.5px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)',
            }} />
          ))}
        </div>

        {/* 菜单按钮 — 悬浮在胶片条右上 */}
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 5 }}>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t,
            size: 20, color: '#f6ecd6', bg: 'rgba(0,0,0,0.55)' }} />
        </div>
      </div>

      {/* ═══════════ 信息面板 — 米白纸板 ═══════════ */}
      <div style={{
        position: 'relative',
        flex: '1 1 auto',
        padding: '10px 14px 12px',
        background: `
          radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.7) 0%, transparent 60%),
          linear-gradient(165deg, #f8efd9 0%, #f1e4c4 100%)
        `,
        borderTop: '1px solid rgba(60,40,20,0.15)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: '4px',
        overflow: 'hidden',
      }}>
        {/* 纸纹噪点 */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'multiply',
          opacity: 0.5,
          pointerEvents: 'none',
        }} />

        {/* eyebrow: 日期范围 — 等宽小字 */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          fontSize: '0.52rem', fontWeight: 800, letterSpacing: '0.22em',
          color: '#7a5a2a', textTransform: 'uppercase',
        }}>
          <span>
            <span style={{ color: '#b8624c' }}>●</span>&nbsp;
            {trip.startDate} → {trip.endDate}
          </span>
          <span style={{ color: '#7a5a2a', opacity: 0.7 }}>
            {duration}D · {stopsCount}ST
          </span>
        </div>

        {/* 标题 — 衬线 display */}
        <h4 style={{
          position: 'relative',
          margin: 0,
          fontSize: '1.15rem',
          fontWeight: 900,
          letterSpacing: '-0.015em',
          lineHeight: 1.15,
          color: '#1c1308',
          fontFamily: '"Playfair Display", "DM Serif Display", Georgia, "Times New Roman", serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textShadow: '0 1px 0 rgba(255,255,255,0.6)',
        }}>
          {trip.title}
        </h4>

        {/* 底行：预算 pill + roll 编号 */}
        <div style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '1px',
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.18em',
            color: '#7a5a2a', textTransform: 'uppercase', opacity: 0.85,
          }}>
            ROLL&nbsp;№&nbsp;{String(trip.id || '000').slice(-3).padStart(3, '0')}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'baseline', gap: '3px',
            padding: '2px 9px 3px',
            background: 'linear-gradient(180deg, #2a1c10 0%, #1a1108 100%)',
            color: '#f2a83a',
            borderRadius: '2px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            {formatCurrency(totalCost, settings)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 样式注册表
// ═══════════════════════════════════════════════════════════════════════
export const COMPACT_STYLES = [
  { id: 'sakura',        label: '樱花水印',   labelEn: 'Sakura',        component: SakuraCard },
  { id: 'boarding-pass', label: '登机牌',     labelEn: 'Boarding Pass', component: BoardingPassCard },
  { id: 'polaroid',      label: '宝丽来',     labelEn: 'Polaroid',      component: PolaroidCard },
  { id: 'magazine',      label: '杂志编辑',   labelEn: 'Magazine',      component: MagazineCard },
  { id: 'hanko',         label: '日式印章',   labelEn: 'Hanko',         component: HankoCard },
  { id: 'postcard',      label: '明信片',     labelEn: 'Postcard',      component: PostcardCard },
  { id: 'minimal',       label: '瑞士极简',   labelEn: 'Minimal',       component: MinimalCard },
  { id: 'luggage-tag',   label: '行李牌',     labelEn: 'Luggage Tag',   component: LuggageTagCard },
  { id: 'filmstrip',     label: '胶片条',     labelEn: 'Film Strip',    component: FilmStripCard },
];

export function getCompactStyleComponent(id) {
  return (COMPACT_STYLES.find(s => s.id === id) || COMPACT_STYLES[0]).component;
}
