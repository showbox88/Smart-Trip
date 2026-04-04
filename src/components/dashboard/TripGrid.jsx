import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import TripCard from './TripCard';
import TripAlbumGrid from './TripAlbumGrid';

export default function TripGrid({ trips, onAddTrip, onEdit, onShare }) {
  const { state } = useApp();
  const { t } = useI18n();
  const isList = state.dashboardView === 'list';
  const isAlbum = state.dashboardView === 'album';

  if (isAlbum) {
    return <TripAlbumGrid trips={trips} onAddTrip={onAddTrip} onEdit={onEdit} onShare={onShare} />;
  }


  return (
    <div className="trip-grid" style={isList ? { display: 'block' } : {}}>
      {trips.map(trip => (
        <TripCard key={trip.id} trip={trip} isList={isList} onEdit={onEdit} onShare={onShare} />
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
  );
}
