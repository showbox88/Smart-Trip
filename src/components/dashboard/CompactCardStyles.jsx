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
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '3px', padding: '1rem 1.1rem',
      background: 'var(--md-sys-color-surface-container-lowest)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      minHeight: '170px', display: 'flex', flexDirection: 'column',
      backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 18px, rgba(131,75,88,0.04) 18px, rgba(131,75,88,0.04) 19px)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) rotate(0.3deg)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(131,75,88,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.06)'; }}
    >
      {/* 右上邮票 */}
      <div style={{ position: 'absolute', top: '0.7rem', right: '0.75rem',
        width: '42px', height: '52px',
        background: 'var(--md-sys-color-primary-container)',
        border: '2px dashed var(--md-sys-color-surface-container-lowest)',
        outline: '1px solid var(--md-sys-color-primary)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'var(--md-sys-color-on-primary-container)',
        transform: 'rotate(3deg)' }}>
        <div style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1, fontFamily: 'ui-serif, Georgia, serif' }}>
          {duration}
        </div>
        <div style={{ fontSize: '0.38rem', fontWeight: 800, letterSpacing: '0.1em', marginTop: '1px' }}>DAYS</div>
      </div>

      {/* 左上 Greetings */}
      <div style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'var(--md-sys-color-primary)', fontFamily: 'ui-serif, Georgia, serif',
        marginBottom: '0.1rem' }}>
        Greetings from
      </div>

      {/* 标题 — 手写体感 */}
      <h4 style={{ fontFamily: '"Caveat", "Kalam", "Bradley Hand", ui-serif, Georgia, serif',
        fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-0.01em',
        margin: '0 0 0.45rem', color: 'var(--md-sys-color-primary)',
        lineHeight: 1.05, paddingRight: '55px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {trip.title}
      </h4>

      {/* 圆形邮戳 */}
      <div style={{ position: 'absolute', top: '4.2rem', right: '0.8rem',
        width: '54px', height: '54px', borderRadius: '50%',
        border: '1.5px solid var(--md-sys-color-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--md-sys-color-primary)', opacity: 0.55, transform: 'rotate(-8deg)',
        fontSize: '0.4rem', fontWeight: 800, letterSpacing: '0.08em',
        textAlign: 'center', lineHeight: 1.15 }}>
        ✦ {status.label}<br />{stopsCount} STOPS
      </div>

      {/* 水平线 */}
      <div style={{ height: '1px', background: 'var(--md-sys-color-outline-variant)', margin: '0.1rem 0 0.4rem' }} />

      <div style={{ fontSize: '0.7rem', color: 'var(--md-sys-color-on-surface-variant)',
        fontFamily: '"Caveat", cursive', fontWeight: 500, lineHeight: 1.3, paddingRight: '70px' }}>
        {trip.startDate} — {trip.endDate}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px dashed var(--md-sys-color-outline-variant)', paddingTop: '0.4rem' }}>
        <span style={{ fontSize: '0.52rem', fontWeight: 900, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7 }}>
          POSTAGE · PAID
        </span>
        <span style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--md-sys-color-on-surface)',
          fontFamily: 'ui-serif, Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(totalCost, settings)}
        </span>
        <div>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20 }} />
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
  const { trip, duration, totalCost, status, stopsCount, settings, formatCurrency, t, onOpen, onMenuToggle, menuOpen, setMenuOpen, onEdit, onShare, onDelete } = p;
  const sprockets = Array.from({ length: 9 });
  return (
    <div onClick={onOpen} style={{
      ...baseCard, borderRadius: '6px', padding: 0,
      background: 'var(--md-sys-color-on-surface)',
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
      minHeight: '180px', display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 18px 36px rgba(0,0,0,0.22)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'; }}
    >
      {/* 顶部齿孔条 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '18px', padding: '0 6px', flexShrink: 0 }}>
        {sprockets.map((_, i) => (
          <div key={i} style={{ width: '10px', height: '7px', borderRadius: '1.5px',
            background: 'var(--md-sys-color-surface-container-lowest)' }} />
        ))}
      </div>

      {/* 画面区 */}
      <div style={{ flex: 1, background: 'var(--md-sys-color-primary-container)',
        margin: '0 6px', borderRadius: '2px', padding: '0.75rem 0.9rem',
        display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* 对角装饰条纹 */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(135deg, transparent 0, transparent 20px, rgba(255,255,255,0.07) 20px, rgba(255,255,255,0.07) 40px)',
          pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          position: 'relative', marginBottom: '0.4rem' }}>
          <div style={{ fontSize: '0.48rem', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--md-sys-color-on-primary-container)', fontFamily: 'ui-monospace, monospace', opacity: 0.75 }}>
            ▶ FRAME · {String(trip.id || '0').slice(-3).padStart(3, '0')} / {status.label}
          </div>
          <MenuBtn {...{ menuOpen, onMenuToggle, setMenuOpen, onEdit, onShare, onDelete, trip, t, size: 20,
            color: 'var(--md-sys-color-on-primary-container)', bg: 'rgba(255,255,255,0.2)' }} />
        </div>

        <h4 style={{ position: 'relative', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.03em',
          margin: '0 0 0.25rem', color: 'var(--md-sys-color-on-primary-container)', lineHeight: 1.08,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.title}
        </h4>
        <div style={{ position: 'relative', fontSize: '0.62rem', fontWeight: 700,
          color: 'var(--md-sys-color-on-primary-container)', opacity: 0.75,
          fontFamily: 'ui-monospace, monospace', marginBottom: '0.6rem' }}>
          {trip.startDate} → {trip.endDate}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{
            fontSize: '2rem', fontWeight: 900, lineHeight: 0.85, letterSpacing: '-0.05em',
            color: 'var(--md-sys-color-on-primary-container)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {String(duration).padStart(2, '0')}
            <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.15em', marginLeft: '6px', opacity: 0.8 }}>
              DAYS · {stopsCount} STOPS
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 900,
            color: 'var(--md-sys-color-on-primary-container)',
            fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totalCost, settings)}
          </div>
        </div>
      </div>

      {/* 底部齿孔条 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '18px', padding: '0 6px', flexShrink: 0 }}>
        {sprockets.map((_, i) => (
          <div key={i} style={{ width: '10px', height: '7px', borderRadius: '1.5px',
            background: 'var(--md-sys-color-surface-container-lowest)' }} />
        ))}
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
