import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';

function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ color: '#f97316', fontSize: '0.9rem', letterSpacing: '1px' }}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function getTodayHours(place) {
  try {
    const periods = place.regularOpeningHours?.weekdayDescriptions;
    if (!periods) return null;
    const day = new Date().getDay(); // 0=Sun
    const idx = day === 0 ? 6 : day - 1;
    return periods[idx] || null;
  } catch { return null; }
}

function getCategoryLabel(place) {
  if (!place.types?.length) return null;
  const map = {
    restaurant: '餐厅', cafe: '咖啡馆', lodging: '住宿', tourist_attraction: '景点',
    museum: '博物馆', park: '公园', shopping_mall: '购物中心', store: '商店',
    bar: '酒吧', hospital: '医院', airport: '机场', transit_station: '交通站',
    gas_station: '加油站', night_club: '夜店', movie_theater: '影院',
    amusement_park: '游乐园', art_gallery: '画廊', bakery: '烘焙坊',
  };
  for (const t of place.types) {
    if (map[t]) return map[t];
  }
  return place.types[0]?.replace(/_/g, ' ') || null;
}

export default function MapInfoPanel({ placeId, onClose, onAddToDay }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [adding, setAdding] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [zoomedPhotoIdx, setZoomedPhotoIdx] = useState(null);
  const [prevPhotoIdx, setPrevPhotoIdx] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [addedDays, setAddedDays] = useState(new Set());

  const trip = state.trips.find(tr => tr.id === state.activeTripId);

  // Keyboard navigation for full-screen photo gallery
  useEffect(() => {
    if (zoomedPhotoIdx === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextPhoto();
      else if (e.key === 'ArrowLeft') prevPhoto();
      else if (e.key === 'Escape') setZoomedPhotoIdx(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedPhotoIdx]); // Re-bind when zoomedPhotoIdx changes to ensure handlers use fresh state

  // Pre-load adjacent photos for smooth transition
  useEffect(() => {
    if (zoomedPhotoIdx === null || !place?.photos?.length) return;
    
    const preloadIdxs = [
      (zoomedPhotoIdx + 1) % place.photos.length,
      (zoomedPhotoIdx - 1 + place.photos.length) % place.photos.length
    ];

    preloadIdxs.forEach(idx => {
      const img = new Image();
      img.src = place.photos[idx].getURI({ maxWidth: 2400, maxHeight: 1800 });
    });
  }, [zoomedPhotoIdx, place?.photos]);

  // Compute which days already have this place
  useEffect(() => {
    if (!trip || !placeId) return;
    const days = new Set();
    trip.days.forEach(day => {
      if (day.stops.some(s => s.placeId === placeId)) days.add(day.id);
    });
    setAddedDays(days);
  }, [trip, placeId]);

  // Fetch place details
  useEffect(() => {
    if (!placeId || typeof google === 'undefined') return;
    setLoading(true);
    setPlace(null);
    setZoomedPhotoIdx(null);
    setPrevPhotoIdx(null);
    setActiveTab('about');

    (async () => {
      try {
        const { Place } = await google.maps.importLibrary('places');
        const p = new Place({ id: placeId });
        await p.fetchFields({
          fields: [
            'displayName', 'formattedAddress', 'rating', 'userRatingCount',
            'types', 'photos', 'regularOpeningHours',
            'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteURI',
            'reviews', 'location',
          ],
        });
        setPlace(p);
      } catch (err) {
        console.error('[MapInfoPanel] fetchFields failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [placeId]);

  const handleAddToDay = async (dayId) => {
    setShowDayPicker(false);
    setAdding(true);
    try {
      await onAddToDay?.(dayId, placeId);
      setAddedDays(prev => new Set([...prev, dayId]));
    } catch (err) {
      console.error('[MapInfoPanel] add failed:', err);
    } finally {
      setAdding(false);
    }
  };

  const handlePhotoClick = (idx) => {
    setPrevPhotoIdx(null);
    setZoomedPhotoIdx(idx);
  };

  const transitionToPhoto = (nextIdx) => {
    if (nextIdx === zoomedPhotoIdx) return;
    setPrevPhotoIdx(zoomedPhotoIdx);
    setZoomedPhotoIdx(nextIdx);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setPrevPhotoIdx(null);
    }, 800); // Animation duration + buffer
  };

  const nextPhoto = (e) => {
    e?.stopPropagation();
    if (zoomedPhotoIdx === null) return;
    const nextIdx = (zoomedPhotoIdx + 1) % photos.length;
    transitionToPhoto(nextIdx);
  };

  const prevPhoto = (e) => {
    e?.stopPropagation();
    if (zoomedPhotoIdx === null) return;
    const prevIdx = (zoomedPhotoIdx - 1 + photos.length) % photos.length;
    transitionToPhoto(prevIdx);
  };

  const photos = place?.photos || [];
  const photo = photos[0] ? photos[0].getURI({ maxWidth: 680, maxHeight: 420 }) : null;
  const todayHours = place ? getTodayHours(place) : null;
  const category = place ? getCategoryLabel(place) : null;
  const reviews = place?.reviews || [];

  return (
    <div
      id="map-info-panel"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '350px', background: 'rgba(13, 17, 27, 0.98)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', zIndex: 2000,
        fontFamily: 'var(--font-main, inherit)',
        color: 'white',
        overflow: 'visible' // CRITICAL: Allow Day Picker to pop out
      }}
    >
      {/* Header with Tabs and Close */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '50px', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {['about', 'reviews', 'photos'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                color: activeTab === tab ? 'white' : '#64748b',
                fontWeight: 700,
                padding: '14px 0',
                borderBottom: activeTab === tab ? '2px solid #f97316' : '2px solid transparent',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'about' ? t('map.tab_about') : tab === 'reviews' ? t('map.tab_reviews') : t('map.tab_photos')}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'visible', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Day Picker Overlay - Moved out of scrollable area to prevent clipping */}
        {showDayPicker && (
          <div style={{ 
            position: 'absolute', bottom: 'calc(100% - 40px)', left: '1rem', 
            background: '#1a1e26',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            minWidth: '220px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            padding: '4px 0', zIndex: 3000
          }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>{t('map.select_date') || 'Add to Day'}</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {trip?.days?.map((day, idx) => (
                <div 
                  key={day.id}
                  onClick={() => handleAddToDay(day.id)}
                  style={{ 
                    padding: '10px 14px', display: 'flex', alignItems: 'center', cursor: 'pointer',
                    background: 'transparent', transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.02)'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: day.color || '#f97316', marginRight: '12px' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', flex: 1 }}>{t('itinerary.day_label')} {idx+1}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>{t('common.loading')}</div>
          ) : place && (
            <>
              {/* Add to Trip Button */}
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  onClick={() => setShowDayPicker(v => !v)}
                  style={{ 
                    background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '8px', 
                    padding: '0.4rem 14px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    boxShadow: '0 3px 10px rgba(60, 131, 246, 0.25)',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ fontSize: '1rem' }}>+</span> {t('map.add_to_itinerary')}
                </button>
              </div>

            {activeTab === 'about' && (
              <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ margin: '0 0 0.1rem', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>{place.displayName}</h1>
                  <p style={{ margin: '0 0 0.4rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>{category}</p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <span style={{ color: '#f97316', fontWeight: 800, fontSize: '0.85rem' }}>{place.rating}</span>
                    <StarRating rating={place.rating} />
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({place.userRatingCount} reviews)</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ color: '#f97316', fontSize: '16px' }}>location_on</span>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>{place.formattedAddress}</span>
                    </div>
                    {todayHours && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#f97316', fontSize: '16px' }}>schedule</span>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{todayHours}</span>
                      </div>
                    )}
                    {place.internationalPhoneNumber && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#f97316', fontSize: '16px' }}>call</span>
                        <span style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>{place.internationalPhoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {photo && (
                  <div 
                    onClick={() => handlePhotoClick(0)}
                    style={{ width: '280px', height: '180px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 25px rgba(0,0,0,0.5)', alignSelf: 'center', cursor: 'pointer' }}
                  >
                    <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Review Summary Dashboard */}
                <div style={{ 
                  display: 'flex', gap: '2rem', padding: '1rem', 
                  background: 'rgba(255,255,255,0.03)', borderRadius: '12px', 
                  alignItems: 'center', flexWrap: 'wrap' 
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{place.rating || '—'}</div>
                    <div style={{ margin: '0.4rem 0' }}><StarRating rating={place.rating} /></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{place.userRatingCount || 0} {t('map.tab_reviews') || 'Reviews'}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[5, 4, 3, 2, 1].map(stars => {
                      const val = reviews.filter(r => Math.round(r.rating) === stars).length;
                      const pct = reviews.length > 0 ? (val / reviews.length) * 100 : 0;
                      return (
                        <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '10px' }}>{stars}</span>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct || (stars <= (place.rating || 0) ? 80 - (5-stars)*15 : 20)}%`, height: '100%', background: '#f97316', borderRadius: '2px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {reviews.map((r, i) => (
                  <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                        {r.authorAttribution?.displayName?.[0] || 'U'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>{r.authorAttribution?.displayName}</span>
                        <div style={{ marginTop: '4px' }}><StarRating rating={r.rating} /></div>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      {typeof r.text === 'object' ? r.text?.text : r.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'photos' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {photos.slice(0, 15).map((p, i) => (
                  <div 
                    key={i} 
                    onClick={() => handlePhotoClick(i)}
                    style={{ aspectRatio: '1.5', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', background: '#1e293b' }}
                  >
                    <img src={p.getURI({ maxWidth: 400, maxHeight: 400 })} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {zoomedPhotoIdx !== null && createPortal(
        <div 
          onClick={() => setZoomedPhotoIdx(null)}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', zIndex: 99999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '2rem', backdropFilter: 'blur(20px)'
          }}
        >
          {/* Close Button Top Right */}
          <button 
            style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setZoomedPhotoIdx(null)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>close</span>
          </button>

          {/* Navigation Arrows */}
          <button 
            onClick={prevPhoto}
            style={{ position: 'absolute', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_left</span>
          </button>
          
          <div style={{ position: 'relative', width: '85vw', height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Background Image (Old) */}
            {prevPhotoIdx !== null && isAnimating && (
              <img 
                key={`prev-${prevPhotoIdx}`}
                src={photos[prevPhotoIdx].getURI({ maxWidth: 2400, maxHeight: 1800 })} 
                style={{ 
                  position: 'absolute', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', 
                  borderRadius: '8px', 
                  animation: 'galleryFadeOut 0.6s forwards 0.12s',
                  zIndex: 100002
                }} 
              />
            )}

            {/* Foreground Image (New) */}
            <img 
              key={`curr-${zoomedPhotoIdx}`}
              src={photos[zoomedPhotoIdx].getURI({ maxWidth: 2400, maxHeight: 1800 })} 
              style={{ 
                position: 'absolute', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', 
                borderRadius: '8px', boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
                animation: isAnimating && prevPhotoIdx !== null ? 'galleryFadeIn 0.6s forwards' : 'none',
                opacity: (isAnimating && prevPhotoIdx !== null) ? 0 : 1,
                zIndex: 100003
              }} 
              onClick={e => e.stopPropagation()}
            />
            
            <style>{`
              @keyframes galleryFadeIn {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
              }
              @keyframes galleryFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
              }
            `}</style>
          </div>

          <button 
            onClick={nextPhoto}
            style={{ position: 'absolute', right: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_right</span>
          </button>

          {/* Counter Overlay */}
          <div style={{ position: 'absolute', bottom: '40px', color: 'white', fontSize: '1rem', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: '20px' }}>
            {zoomedPhotoIdx + 1} / {photos.length}
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}
