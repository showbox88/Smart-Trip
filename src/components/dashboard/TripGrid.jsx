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
      <div className="trip-card-placeholder" onClick={onAddTrip} style={{ cursor: 'pointer' }}>
        <div className="placeholder-icon">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_location_alt</span>
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{t('dashboard.placeholder_title') || 'No trips yet?'}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>{t('dashboard.placeholder_desc') || 'Click to start planning!'}</p>
      </div>
    </div>
  );
}
