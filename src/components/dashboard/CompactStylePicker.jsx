import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import { formatCurrency } from '../../utils/formatters';
import { COMPACT_STYLES } from './card-styles';

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
      {/* compact picker CSS loaded via src/styles/compact-picker.css */}

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
