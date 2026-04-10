import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import TripCard from './TripCard';
import TripAlbumGrid from './TripAlbumGrid';
import CompactStylePicker from './CompactStylePicker';

export default function TripGrid({ trips, onAddTrip, onEdit, onShare }) {
  const { state } = useApp();
  const { t } = useI18n();
  const isList = state.dashboardView === 'list';
  const isAlbum = state.dashboardView === 'album';
  const isCompact = state.dashboardView === 'compact';
  const [pickerOpen, setPickerOpen] = useState(false);

  if (isAlbum) {
    return <TripAlbumGrid trips={trips} onAddTrip={onAddTrip} onEdit={onEdit} onShare={onShare} />;
  }


  return (
    <div style={{ position: 'relative' }}>
    {isCompact && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setPickerOpen(true)}
          title={t('dashboard.pick_compact_style') || 'Pick Compact Card Style'}
          aria-label={t('dashboard.pick_compact_style') || 'Pick Compact Card Style'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--md-sys-color-surface-container-lowest)',
            color: 'var(--md-sys-color-primary)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: '50%',
            width: '36px', height: '36px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(131,75,88,0.08)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--md-sys-color-primary-container)';
            e.currentTarget.style.color = 'var(--md-sys-color-on-primary-container)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--md-sys-color-surface-container-lowest)';
            e.currentTarget.style.color = 'var(--md-sys-color-primary)';
            e.currentTarget.style.transform = '';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>palette</span>
        </button>
      </div>
    )}
    <div className={`trip-grid${isCompact ? ' trip-grid--compact' : ''}`} style={isList ? { display: 'block' } : {}}>
      <style>{`
        .trip-grid--compact {
          display: grid !important;
          gap: 1rem !important;
          align-items: start !important;     /* 避免卡片被拉伸到同一行高 */
          grid-auto-rows: min-content !important;
          /* Default (web / desktop): auto responsive based on width */
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
        }
        .trip-grid--compact > * { align-self: start !important; }
        /* Compact 模式下让占位卡和 trip 卡同高 */
        .trip-grid--compact > .trip-card-placeholder {
          min-height: 170px !important;
          height: 170px !important;
          padding: 1rem !important;
        }
        .trip-grid--compact > .trip-card-placeholder .placeholder-icon {
          width: 44px !important;
          height: 44px !important;
          margin-bottom: 0.4rem !important;
        }
        .trip-grid--compact > .trip-card-placeholder .placeholder-icon .material-symbols-outlined {
          font-size: 24px !important;
        }
        .trip-grid--compact > .trip-card-placeholder h3 {
          font-size: 0.95rem !important;
          margin: 0 !important;
        }
        .trip-grid--compact > .trip-card-placeholder p {
          font-size: 0.72rem !important;
          margin-top: 0.25rem !important;
          line-height: 1.35 !important;
          max-width: 220px !important;
        }
        /* Mobile — 1 per row */
        @media (max-width: 599px) {
          .trip-grid--compact { grid-template-columns: 1fr !important; }
        }
        /* Tablet portrait — 2 per row */
        @media (min-width: 600px) and (max-width: 1100px) and (orientation: portrait) {
          .trip-grid--compact { grid-template-columns: repeat(2, 1fr) !important; }
        }
        /* Tablet landscape — 3 per row */
        @media (min-width: 600px) and (max-width: 1100px) and (orientation: landscape) {
          .trip-grid--compact { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} isList={isList} isCompact={isCompact} onEdit={onEdit} onShare={onShare} />
      ))}
      <div className="trip-card-placeholder" onClick={onAddTrip} style={{ cursor: 'pointer', ...(isList ? { minHeight: '100px' } : {}) }}>
        {isList ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="placeholder-icon" style={{ marginBottom: 0, marginRight: '0.75rem', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_location_alt</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', margin: 0 }}>{t('dashboard.placeholder_title') || 'No trips yet?'}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--st-color-text-muted)', margin: '0.25rem 0 0' }}>{t('dashboard.placeholder_desc') || 'Click to start planning!'}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="placeholder-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_location_alt</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>{t('dashboard.placeholder_title') || 'No trips yet?'}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--st-color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>{t('dashboard.placeholder_desc') || 'Click to start planning!'}</p>
          </>
        )}
      </div>
    </div>
    <CompactStylePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
