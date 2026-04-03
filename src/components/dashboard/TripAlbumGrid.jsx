import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useArchiveSync } from '../../hooks/useArchiveSync';

function AlbumCard({ trip, archiveTrip, archiveDb, getThumbnail, rootHandle }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [imgUrl, setImgUrl] = useState(null);

  // Attempt to find cover photo from Archive DB
  useEffect(() => {
    if (!archiveDb || !archiveTrip) return;

    let coverId = archiveTrip.cover_photo_id;
    if (!coverId && archiveDb.photos) {
       const tripPhotos = archiveDb.photos.filter(p => p.trip_id === archiveTrip.trip_id);
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
  }, [archiveDb, archiveTrip, getThumbnail, rootHandle]);

  const eventCount = archiveDb?.events?.filter(e => String(e.trip_id) === String(archiveTrip.trip_id)).length || 0;
  const photoCount = archiveDb?.photos?.filter(p => String(p.trip_id) === String(archiveTrip.trip_id)).length || 0;

  const hasLocalImg = !!imgUrl;
  const src = imgUrl || trip.thumb;

  return (
    <div
      className="trip-card"
      onClick={() => navigate(`/archive?tripId=${encodeURIComponent(trip.id)}`)}
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
          <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--md-sys-color-primary)', marginBottom: '4px', letterSpacing: '0.1em' }}>
            {trip.startDate}
          </p>
        )}
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '8px', lineHeight: 1.2 }}>
          {trip.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
            {eventCount} {t('itinerary.stops_count')}
          </span>
          {photoCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>photo_library</span>
              {photoCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TripAlbumGrid({ trips }) {
  const { archiveDb, isLinked, getThumbnail, syncToArchive, initAndSync, rootHandle } = useArchiveSync();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [initing, setIniting] = useState(false);

  // Only show trips that have a matching album in archive DB
  const albumTrips = trips.filter(trip =>
    archiveDb?.trips?.some(at => String(at.trip_id) === String(trip.id))
  );

  const handleManageClick = async () => {
    if (isLinked) {
      // Linked but no albums synced yet — run sync before navigating
      if (albumTrips.length === 0 && trips.length > 0) {
        setIniting(true);
        try {
          await syncToArchive(trips, { silent: true });
        } catch (e) {
          console.warn('Quick sync failed, navigating anyway', e);
        } finally {
          setIniting(false);
        }
      }
      navigate('/archive');
      return;
    }
    // Not linked yet: pick folder, sync data, then navigate
    setIniting(true);
    try {
      const ok = await initAndSync(trips);
      if (ok) navigate('/archive');
    } finally {
      setIniting(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--st-glass-bg)', border: '1px solid var(--md-sys-color-outline)', padding: '16px 20px', borderRadius: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
            {t('app.albums.title') || 'Local Memories'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--st-color-text-muted)' }}>
            {isLinked ? t('app.albums.linked') : t('app.albums.not_linked')}
          </p>
        </div>
        <button
          onClick={handleManageClick}
          disabled={initing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--md-sys-color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: initing ? 'wait' : 'pointer',
            transition: 'opacity 0.2s',
            opacity: initing ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!initing) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={e => { if (!initing) e.currentTarget.style.opacity = '1'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{initing ? 'sync' : 'photo_library'}</span>
          {initing ? (t('common.loading') || 'Loading...') : (t('app.albums.manage') || 'Manage Photos')}
        </button>
      </div>

      {albumTrips.length > 0 ? (
        <div className="trip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {albumTrips.map(trip => {
            const archiveTrip = archiveDb.trips.find(at => String(at.trip_id) === String(trip.id));
            return (
              <AlbumCard key={trip.id} trip={trip} archiveTrip={archiveTrip} archiveDb={archiveDb} getThumbnail={getThumbnail} rootHandle={rootHandle} />
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--st-color-text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block', opacity: 0.4 }}>photo_library</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '4px' }}>
            {t('app.albums.empty') || 'No albums yet'}
          </p>
          <p style={{ fontSize: '0.8rem' }}>
            {t('app.albums.empty_hint') || 'Go to photo management to sync your trips'}
          </p>
        </div>
      )}
    </div>
  );
}
