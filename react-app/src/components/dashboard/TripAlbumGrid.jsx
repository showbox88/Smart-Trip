import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useArchiveSync } from '../../hooks/useArchiveSync';
import { useApp } from '../../context/AppContext';

function AlbumCard({ trip, archiveDb, getThumbnail, rootHandle }) {
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
       const tripPhotos = archiveDb.photos.filter(p => p.trip_id === aTrip.trip_id);
       if (tripPhotos.length > 0) coverId = tripPhotos[0].file_name;
    }

    if (!coverId) return;

    let objectUrl = null;

    async function loadCover() {
      // Try local file handle first (if archive folder is connected)
      if (rootHandle) {
        try {
          // coverId is a relative path like "FolderName/photo.jpg"
          const parts = coverId.replace(/\\/g, '/').split('/').filter(Boolean);
          let dir = rootHandle;
          for (let i = 0; i < parts.length - 1; i++) {
            dir = await dir.getDirectoryHandle(parts[i]);
          }
          const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
          const file = await fileHandle.getFile();
          objectUrl = URL.createObjectURL(file);
          setImgUrl(objectUrl);
          return;
        } catch {
          // fall through to thumbnail
        }
      }
      // Fallback: stored thumbnail in IndexedDB
      const dataUrl = await getThumbnail(coverId);
      if (dataUrl) setImgUrl(dataUrl);
    }

    loadCover();

    return () => {
      if (objectUrl) {
        const urlToRevoke = objectUrl;
        setTimeout(() => URL.revokeObjectURL(urlToRevoke), 3000);
      }
    };
  }, [archiveDb, trip, getThumbnail, rootHandle]);

  const stopsCount = trip.days ? trip.days.reduce((acc, day) => acc + (day.stops?.length || 0), 0) : 0;
  
  const hasLocalImg = !!imgUrl;
  const src = imgUrl || trip.thumb;

  return (
    <div
      className="trip-card"
      onClick={() => navigate(`/archive?tripTitle=${encodeURIComponent(trip.title)}`)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
        height: '320px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '20px',
        border: hasLocalImg ? 'none' : undefined,
        background: hasLocalImg ? 'none' : undefined,
        backdropFilter: hasLocalImg ? 'none' : undefined,
      }}
    >
      {/* Full-bleed image — no blur bg, no dim when local */}
      <img
        src={src}
        loading="lazy"
        alt={trip.title}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          display: 'block',
        }}
      />
      {/* Gradient only at the bottom for text readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: hasLocalImg
          ? 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)'
          : 'linear-gradient(180deg, rgba(8,14,19,0) 0%, rgba(8,14,19,0.5) 50%, rgba(8,14,19,0.95) 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

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
  const { archiveDb, isLinked, getThumbnail, syncToArchive, rootHandle } = useArchiveSync();
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
          <AlbumCard key={trip.id} trip={trip} archiveDb={archiveDb} getThumbnail={getThumbnail} rootHandle={rootHandle} />
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
