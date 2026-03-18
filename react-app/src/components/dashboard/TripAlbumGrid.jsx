import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useArchiveSync } from '../../hooks/useArchiveSync';
import { useApp } from '../../context/AppContext';

function AlbumCard({ trip, archiveDb, getThumbnail }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [imgUrl, setImgUrl] = useState(null);

  // Attempt to find cover photo from Archive DB
  useEffect(() => {
    if (!archiveDb) return;
    const aTrip = archiveDb.trips.find(t => t.title === trip.title || t.folder_name === trip.title);
    if (!aTrip) return;

    let coverId = aTrip.cover_photo_id;
    if (!coverId && archiveDb.photos) {
       // fallback to first photo of this trip
       const tripPhotos = archiveDb.photos.filter(p => p.trip_id === aTrip.trip_id);
       if (tripPhotos.length > 0) coverId = tripPhotos[0].file_name;
    }

    if (coverId) {
       getThumbnail(coverId).then(dataUrl => {
          if (dataUrl) {
            setImgUrl(dataUrl);
          }
       });
    }

    return () => {
       // Data URLs don't need revoke
    };
  }, [archiveDb, trip, getThumbnail]);

  const stopsCount = trip.days ? trip.days.reduce((acc, day) => acc + (day.stops?.length || 0), 0) : 0;
  
  return (
    <div 
      className="trip-card" 
      onClick={() => navigate(`/archive?tripTitle=${encodeURIComponent(trip.title)}`)}
      style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', height: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}
    >
      <div 
        className="thumb-blur-bg" 
        style={{ backgroundImage: `url('${imgUrl || trip.thumb}')`, opacity: 0.8, filter: 'brightness(0.6)' }} 
      />
      {imgUrl ? (
        <img className="thumb-main-img" src={imgUrl} loading="lazy" alt={trip.title} style={{ objectFit: 'cover' }} />
      ) : (
        <img className="thumb-main-img" src={trip.thumb} loading="lazy" alt={trip.title} style={{ objectFit: 'cover' }} />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,14,19,0) 0%, rgba(8,14,19,0.5) 50%, rgba(8,14,19,0.95) 100%)', zIndex: 1, pointerEvents: 'none' }}></div>
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        {trip.startDate && (
          <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '4px', letterSpacing: '0.1em' }}>
            {trip.startDate}
          </p>
        )}
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
          {trip.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
            {stopsCount} {t('itinerary.stops_count')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TripAlbumGrid({ trips, onAddTrip }) {
  const { archiveDb, isLinked, getThumbnail, syncToArchive } = useArchiveSync();
  const { t } = useI18n();

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '16px 20px', borderRadius: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
            {t('app.albums.title') || 'Trip Archive Albums'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isLinked ? "本地相册已链接" : "未链接本地相册，点击任意相册进行配置"}
          </p>
        </div>
      </div>

      <div className="trip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {trips.map(trip => (
          <AlbumCard key={trip.id} trip={trip} archiveDb={archiveDb} getThumbnail={getThumbnail} />
        ))}
        <div className="trip-card-placeholder" onClick={onAddTrip} style={{ cursor: 'pointer', height: '320px' }}>
          <div className="placeholder-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_photo_alternate</span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>{t('dashboard.placeholder_title') || 'New Album'}</h3>
        </div>
      </div>
    </div>
  );
}
