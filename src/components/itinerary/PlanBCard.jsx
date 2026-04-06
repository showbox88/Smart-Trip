import { memo } from 'react';
import { useI18n } from '../../context/I18nContext';

/**
 * PlanBCard — A single alternative place card inside PlanBPanel.
 *
 * Two modes:
 *   - saved:        shows Swap + Delete buttons (for user-saved alternatives)
 *   - recommendation: shows Add button (for nearby suggestions)
 */
export default memo(function PlanBCard({
  place,
  mode = 'saved',       // 'saved' | 'recommendation'
  onSwap,
  onRemove,
  onAdd,
}) {
  const { t } = useI18n();

  return (
    <div className="planb-card">
      {/* Photo */}
      {place.photo ? (
        <img className="planb-card-photo" src={place.photo} alt={place.location} loading="lazy" />
      ) : (
        <div className="planb-card-photo-placeholder">
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>location_on</span>
        </div>
      )}

      {/* Info */}
      <div className="planb-card-info">
        <div className="planb-card-name" title={place.location}>{place.location}</div>
        <div className="planb-card-meta">
          {place.rating > 0 && (
            <span className="planb-card-rating">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>star</span>
              {place.rating.toFixed(1)}
            </span>
          )}
          {place.category && (
            <span style={{ textTransform: 'capitalize' }}>{place.category}</span>
          )}
        </div>
        {place.address && (
          <div className="planb-card-meta" style={{ marginTop: '1px' }}>
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px',
              display: 'inline-block',
            }}>
              {place.address}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="planb-card-actions">
        {mode === 'saved' ? (
          <>
            <button className="planb-btn planb-btn-swap" onClick={() => onSwap?.(place.id)} title={t('planb.swap') || 'Swap'}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>swap_horiz</span>
            </button>
            <button className="planb-btn planb-btn-delete" onClick={() => onRemove?.(place.id)} title={t('planb.remove') || 'Remove'}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
            </button>
          </>
        ) : (
          <button className="planb-btn planb-btn-add" onClick={() => onAdd?.(place)}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
            {t('planb.add_short') || 'Add'}
          </button>
        )}
      </div>
    </div>
  );
});
