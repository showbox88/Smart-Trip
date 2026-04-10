import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { COMPACT_STYLES } from './CompactCardStyles';

/**
 * Compact Card 样式选择器 — 全屏 modal，9 宫格预览
 * 目标：不需要滚动，一屏显示全部 9 个样式。
 * 适配：手机 / 平板竖屏 / 平板横屏 / 桌面宽屏
 */
export default function CompactStylePicker({ open, onClose }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const { themeId, layoutVariant } = useTheme();
  const isBlossom = themeId === 'blossom' || (layoutVariant === 'clean' && themeId !== 'clean');

  if (!open) return null;

  const sampleTrip = {
    id: 'preview-001',
    title: t('dashboard.preview_trip_title') || 'Kyoto Spring Journey',
    startDate: '2026-04-01',
    endDate: '2026-04-07',
    status: 'ongoing',
  };
  const previewProps = {
    trip: sampleTrip,
    duration: 7,
    stopsCount: 12,
    totalCost: 3280,
    status: { label: t('common.ongoing') || 'Ongoing', cls: 'status-ongoing' },
    settings: state.settings,
    formatCurrency,
    t,
    isBlossom,
    menuOpen: false,
    setMenuOpen: () => {},
    onOpen: () => {},
    onMenuToggle: (e) => e.stopPropagation(),
    onEdit: () => {},
    onShare: () => {},
    onDelete: (e) => e.stopPropagation(),
  };

  const handleSelect = (id) => {
    dispatch({ type: 'SET_COMPACT_CARD_STYLE', payload: id });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .compact-picker-modal {
          animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
          background: var(--md-sys-color-surface);
          border-radius: 20px;
          border: 1px solid var(--md-sys-color-outline-variant);
          box-shadow: 0 24px 60px rgba(0,0,0,0.3);
          width: 96vw;
          max-width: 1320px;
          height: 95vh;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0.9rem 1.1rem 0.9rem;
          /* default preview scale — tuned per breakpoint below */
          --preview-scale: 0.82;
        }
        /* ── Header ── */
        .picker-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.7rem;
          margin-bottom: 0.7rem;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
        }
        .picker-header-title {
          font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em;
          margin: 0; color: var(--md-sys-color-on-surface);
        }
        .picker-header-eyebrow {
          font-size: 0.5rem; font-weight: 900; letter-spacing: 0.25em;
          text-transform: uppercase; color: var(--md-sys-color-primary);
          font-family: ui-monospace, monospace; margin-bottom: 2px;
        }
        .picker-header-sub {
          font-size: 0.7rem; font-weight: 500; margin-top: 2px;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* ── Grid ── */
        .compact-picker-grid {
          flex: 1 1 auto;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(0, 1fr));
          gap: 0.55rem;
          overflow: hidden;
        }

        /* ── Tile ── */
        .picker-tile {
          position: relative;
          padding: 0.45rem 0.55rem 0.5rem;
          border-radius: 12px;
          background: var(--md-sys-color-surface-container);
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .picker-tile:hover {
          background: var(--md-sys-color-surface-container-high);
          transform: translateY(-1px);
        }
        .picker-tile.selected {
          border-color: var(--md-sys-color-primary);
          background: var(--md-sys-color-primary-container);
          box-shadow: 0 0 0 3px rgba(131,75,88,0.15), 0 8px 22px rgba(131,75,88,0.14);
        }
        .picker-tile-label {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 0.35rem;
          gap: 6px;
        }
        .picker-tile-title {
          font-size: 0.78rem; font-weight: 800; letter-spacing: -0.01em;
          color: var(--md-sys-color-on-surface);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .picker-tile-sub {
          font-size: 0.52rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--md-sys-color-on-surface-variant);
          opacity: 0.7; font-family: ui-monospace, monospace;
        }
        .picker-tile-check {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 900; flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(131,75,88,0.3);
        }

        /* ── Preview — scale to fit ── */
        .picker-preview-wrap {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .picker-preview-inner {
          position: absolute;
          top: 0; left: 0;
          width: calc(100% / var(--preview-scale));
          transform-origin: top left;
          transform: scale(var(--preview-scale));
        }

        /* ── Footer ── */
        .picker-footer {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
          padding-top: 0.6rem;
          margin-top: 0.6rem;
          border-top: 1px solid var(--md-sys-color-outline-variant);
        }

        /* ═══════════ 响应式断点 ═══════════ */
        /* 桌面宽屏 ≥ 1400px */
        @media (min-width: 1400px) {
          .compact-picker-modal { --preview-scale: 0.92; padding: 1rem 1.25rem; }
          .compact-picker-grid { gap: 0.7rem; }
          .picker-tile { padding: 0.6rem 0.7rem 0.65rem; border-radius: 14px; }
          .picker-tile-title { font-size: 0.88rem; }
        }
        /* 桌面 1100-1400px */
        @media (min-width: 1100px) and (max-width: 1399px) {
          .compact-picker-modal { --preview-scale: 0.82; }
        }
        /* 平板横屏 900-1099px（带横屏特征：宽 > 高）*/
        @media (max-width: 1099px) and (orientation: landscape) {
          .compact-picker-modal { --preview-scale: 0.7; padding: 0.7rem 0.9rem; }
          .compact-picker-grid { gap: 0.45rem; }
          .picker-header-title { font-size: 1rem; }
          .picker-header-sub { display: none; }
          .picker-tile { padding: 0.35rem 0.45rem 0.45rem; border-radius: 10px; }
          .picker-tile-title { font-size: 0.72rem; }
        }
        /* 平板竖屏 600-1099px */
        @media (min-width: 600px) and (max-width: 1099px) and (orientation: portrait) {
          .compact-picker-modal { --preview-scale: 0.78; }
          .compact-picker-grid { gap: 0.6rem; }
          .picker-header-sub { display: none; }
        }
        /* 矮屏幕（高 < 750px），进一步缩小 */
        @media (max-height: 750px) {
          .compact-picker-modal { --preview-scale: 0.62; padding: 0.6rem 0.85rem; }
          .compact-picker-grid { gap: 0.4rem; }
          .picker-header { padding-bottom: 0.45rem; margin-bottom: 0.45rem; }
          .picker-header-title { font-size: 0.95rem; }
          .picker-header-eyebrow { display: none; }
          .picker-header-sub { display: none; }
          .picker-footer { padding-top: 0.4rem; margin-top: 0.4rem; }
          .picker-tile { padding: 0.3rem 0.4rem 0.4rem; }
          .picker-tile-title { font-size: 0.68rem; }
          .picker-tile-label { margin-bottom: 0.25rem; }
        }
        /* 手机 < 600px — 退化为 2 列可滚动 */
        @media (max-width: 599px) {
          .compact-picker-modal {
            height: auto; max-height: 94vh; overflow-y: auto;
            --preview-scale: 0.72;
          }
          .compact-picker-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: auto;
            gap: 0.5rem;
            overflow: visible;
          }
          .picker-preview-wrap { height: 130px; }
          .picker-header-sub { display: none; }
        }
      `}</style>

      <div className="compact-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="picker-header">
          <div style={{ minWidth: 0 }}>
            <div className="picker-header-eyebrow">✦ COMPACT CARD STYLE</div>
            <h2 className="picker-header-title">
              {t('dashboard.pick_compact_style') || '选择小卡片风格'}
            </h2>
            <div className="picker-header-sub">
              {t('dashboard.pick_compact_desc') || '9 款精心设计的风格，点击预览并选择'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--md-sys-color-surface-container-high)',
              border: 'none', borderRadius: '50%',
              width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--md-sys-color-on-surface)',
              flexShrink: 0,
            }}
            title="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Grid 9 预览 */}
        <div className="compact-picker-grid">
          {COMPACT_STYLES.map((style, idx) => {
            const isSelected = state.compactCardStyle === style.id;
            const StyleComp = style.component;
            return (
              <div
                key={style.id}
                className={`picker-tile ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(style.id)}
              >
                <div className="picker-tile-label">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="picker-tile-sub">№ {String(idx + 1).padStart(2, '0')}</div>
                    <div className="picker-tile-title">{style.label}</div>
                  </div>
                  {isSelected && <div className="picker-tile-check">✓</div>}
                </div>
                <div className="picker-preview-wrap">
                  <div className="picker-preview-inner">
                    <StyleComp {...previewProps} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="picker-footer">
          <div style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-on-surface-variant)',
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('dashboard.current_style') || 'Current'}:&nbsp;
            <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 800 }}>
              {(COMPACT_STYLES.find(s => s.id === state.compactCardStyle) || COMPACT_STYLES[0]).label}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
              border: 'none', borderRadius: '18px',
              padding: '0.45rem 1.2rem',
              fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.02em',
              cursor: 'pointer', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(131,75,88,0.25)',
            }}
          >
            {t('common.done') || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
