import { memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import HotelLine from './HotelLine';
import DeleteConfirm from './DeleteConfirm';

const TRANSPORT_CONFIG = {
  FLIGHT: { icon: 'flight',          label: '飞机', color: '#4FC3F7', mapLabel: 'Flight' },
  TRAIN:  { icon: 'train',           label: '火车', color: '#9E9E9E', mapLabel: 'Train'  },
  BUS:    { icon: 'directions_bus',  label: '大巴', color: '#FF8F00', mapLabel: 'Bus'    },
  SHIP:   { icon: 'directions_boat', label: '轮船', color: '#1E88E5', mapLabel: 'Ship'   },
};

export { TRANSPORT_CONFIG };

export default memo(function TransportCard({ stop, dayId, dayColor, onDelete, onEdit, inHotelStay }) {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const { layoutVariant } = useTheme();
  const isClean = layoutVariant === 'clean';
  const cfg = TRANSPORT_CONFIG[stop.transportType] || TRANSPORT_CONFIG.FLIGHT;
  const isHovered = state.hoveredStopId === stop.id;

  return (
    <div
      className={`timeline-item note-item id-${stop.id}`}
      style={{ position: 'relative', marginBottom: '0.75rem' }}
    >
      {/* Timeline dot — bubble icon in clean, filled+glow in glass */}
      {isClean ? (
        <div style={{
          position: 'absolute',
          left: 'var(--timeline-line-x)',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--md-sys-color-surface-container-lowest)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: `${cfg.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: cfg.color }}>{cfg.icon}</span>
          </div>
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          left: 'var(--timeline-line-x)',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: cfg.color,
          border: '2px solid var(--md-sys-color-surface)',
          boxShadow: `0 0 0 3px ${cfg.color}44`,
          zIndex: 2,
          transition: 'all 0.3s ease',
        }} />
      )}

      {inHotelStay && <HotelLine />}

      {/* Card container — same margin as NoteCard */}
      <div
        className="note-list-card-container"
        style={{ marginLeft: 'var(--card-margin-l)' }}
      >
        <div
          onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
          onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
          onClick={() => onEdit?.(stop, dayId)}
          style={{
            background: isHovered
              ? (isClean ? 'var(--md-sys-color-surface-container-low)' : 'rgba(255,255,255,0.04)')
              : (isClean ? 'var(--md-sys-color-surface-container-lowest)' : '#0a0c10'),
            border: '1px dashed var(--md-sys-color-outline)',
            borderColor: isHovered ? cfg.color : (isClean ? 'var(--md-sys-color-outline-variant)' : 'rgba(255,255,255,0.05)'),
            borderRadius: '0.75rem',
            padding: '0.65rem 1rem',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.25s',
            transform: isHovered ? 'translateX(4px)' : 'none',
            boxShadow: isHovered
              ? (isClean ? '0 4px 12px rgba(0,0,0,0.08)' : '0 20px 40px rgba(0,0,0,0.6)')
              : (isClean ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'),
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Drag handles — same as NoteCard */}
          <div className="drag-handle left-handle">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
          </div>
          <div className="drag-handle right-handle">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
          </div>

          <DeleteConfirm onDelete={() => onDelete?.(dayId, stop.id)} />

          {/* Type icon */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: `${cfg.color}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: cfg.color }}>{cfg.icon}</span>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: cfg.color }}>
                {cfg.label}
              </span>
              {stop.tripNumber && (
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', padding: '1px 6px' }}>
                  {stop.tripNumber}
                </span>
              )}
              {stop.carrier && (
                <span style={{ fontSize: '0.76rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {stop.carrier}
                </span>
              )}
            </div>

            {(stop.departureTime || stop.arrivalTime) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                {stop.departureTime && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                    {stop.departureTime}
                  </span>
                )}
                {stop.departureTime && stop.arrivalTime && (
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--st-color-text-muted)' }}>arrow_forward</span>
                )}
                {stop.arrivalTime && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                    {stop.arrivalTime}
                    {stop.arrivalNextDay && <span style={{ fontSize: '0.68rem', color: cfg.color, marginLeft: '2px' }}>+1天</span>}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.73rem', color: 'var(--st-color-text-muted)', marginTop: '2px' }}>
                {t('transport.tap_to_add') || '点击添加详情'}
              </div>
            )}
          </div>

          {/* Ticket photo thumbnail */}
          {stop.attachments?.length > 0 && (
            <div style={{ width: 36, height: 36, borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--md-sys-color-outline)' }}
              onClick={e => e.stopPropagation()}>
              <img src={stop.attachments[0].url} alt="ticket" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
