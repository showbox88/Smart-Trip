import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { PLACE_CATEGORY_MAP } from '../../utils/tripHelpers';

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


function getCategoryLabel(place, t) {
  if (!place.types?.length) return null;
  for (const type of place.types) {
    if (PLACE_CATEGORY_MAP[type]) return t(PLACE_CATEGORY_MAP[type].labelKey);
  }
  return place.types[0]?.replace(/_/g, ' ') || null;
}

export default function MapInfoPanel({ placeId, onClose, onAddToDay }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [zoomedPhotoIdx, setZoomedPhotoIdx] = useState(null);
  const [prevPhotoIdx, setPrevPhotoIdx] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [addedDays, setAddedDays] = useState(new Set());
  const [dayPickerPos, setDayPickerPos] = useState({ top: 0, left: 0 });
  const [hoverHours, setHoverHours] = useState(false);
  const [hoursPos, setHoursPos] = useState({ bottom: 0, left: 0 });
  const addBtnRef = useRef(null);
  const hoursTriggerRef = useRef(null);

  const trip = state.trips.find(tr => tr.id === state.activeTripId);

  // Find the stop in the trip that matches this placeId (for time display)
  const matchedStop = trip?.days?.flatMap(d => d.stops).find(s => s.placeId === placeId);

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
    try {
      await onAddToDay?.(dayId, placeId);
      setAddedDays(prev => new Set([...prev, dayId]));
    } catch (err) {
      console.error('[MapInfoPanel] add failed:', err);
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

  const swipedRef = useRef(false);
  // Refs to access current values inside the touch event closure
  const zoomedPhotoIdxRef = useRef(zoomedPhotoIdx);
  const photosRef = useRef([]);
  useEffect(() => { zoomedPhotoIdxRef.current = zoomedPhotoIdx; });
  useEffect(() => { photosRef.current = photos; });

  // Detect mobile by viewport width (touch laptops should still show desktop arrows)
  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;

  // Native touch event listeners for reliable mobile swipe in the lightbox
  const lightboxOpen = zoomedPhotoIdx !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    let startX = null;
    let startY = null;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swipedRef.current = false;
    };

    const onTouchEnd = (e) => {
      if (startX === null || !e.changedTouches.length) return;
      const dx = startX - e.changedTouches[0].clientX;
      const dy = Math.abs(startY - e.changedTouches[0].clientY);
      startX = null;
      startY = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        swipedRef.current = true;
        const curIdx = zoomedPhotoIdxRef.current;
        const len = photosRef.current.length;
        if (curIdx === null || len === 0) return;
        const newIdx = dx > 0
          ? (curIdx + 1) % len
          : (curIdx - 1 + len) % len;
        if (newIdx !== curIdx) {
          setPrevPhotoIdx(curIdx);
          setZoomedPhotoIdx(newIdx);
          setIsAnimating(true);
          setTimeout(() => { setIsAnimating(false); setPrevPhotoIdx(null); }, 800);
        }
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [lightboxOpen]);

  const photos = place?.photos || [];
  const photo = photos[0] ? photos[0].getURI({ maxWidth: 680, maxHeight: 420 }) : null;
  const category = place ? getCategoryLabel(place, t) : null;
  const reviews = place?.reviews || [];

  return (
    <div
      id="map-info-panel"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        minHeight: '350px', maxHeight: '60vh', background: 'rgba(13, 17, 27, 0.98)',
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

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Day Picker via Portal to escape overflow:hidden */}
        {showDayPicker && createPortal(
          <div style={{
            position: 'fixed',
            bottom: dayPickerPos.bottom,
            left: dayPickerPos.left,
            background: '#1a1e26',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            minWidth: '220px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            padding: '4px 0', zIndex: 9999
          }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>{t('map.select_date') || 'Add to Day'}</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {trip?.days?.map((day, idx) => {
                const isAdded = addedDays.has(day.id);
                return (
                  <div
                    key={day.id}
                    onClick={() => handleAddToDay(day.id)}
                    style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'center', cursor: 'pointer',
                      background: isAdded ? 'rgba(16,185,129,0.06)' : 'transparent',
                      transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.02)'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.06)' : 'transparent'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: day.color || '#f97316', marginRight: '12px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAdded ? '#10b981' : 'white', flex: 1 }}>{t('itinerary.day_label')}{idx+1}{t('itinerary.day_suffix')}</span>
                    <span style={{ fontSize: '0.75rem', color: isAdded ? '#10b981' : '#64748b', marginRight: isAdded ? '6px' : 0 }}>{day.date}</span>
                    {isAdded && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10b981' }}>check_circle</span>}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}

        {/* Scrollable Content Area */}
        <div className="poi-content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>{t('common.loading')}</div>
          ) : place && (
            <>
              {/* Add to Trip Button */}
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  ref={addBtnRef}
                  onClick={() => {
                    if (!showDayPicker && addBtnRef.current) {
                      const rect = addBtnRef.current.getBoundingClientRect();
                      setDayPickerPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
                    }
                    setShowDayPicker(v => !v);
                  }}
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
              <div className="poi-about-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div className="poi-info-content" style={{ flex: 1, minWidth: 0 }}>
                  {/* Compact Header: Name + Category + Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white', lineHeight: 1.1 }}>
                      {place.displayName}
                    </h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {category && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '5px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#94a3b8' }}>restaurant</span>
                          <span style={{ color: '#cbd5e1', fontSize: '0.7rem', fontWeight: 700 }}>{category}</span>
                        </div>
                      )}
                      
                      {place.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(249,115,22,0.08)', padding: '3px 8px', borderRadius: '5px' }}>
                          <span style={{ color: '#f97316', fontSize: '13px' }}>★</span>
                          <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem' }}>{place.rating}</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>({place.userRatingCount})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vertical Details List: Address -> Phone -> Website */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                    {place.formattedAddress && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span className="material-symbols-outlined" style={{ color: '#f97316', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>location_on</span>
                        <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                          {(() => {
                            const addr = place.formattedAddress;
                            // Western: Street, City, ...
                            if (addr.includes(',')) {
                              const parts = addr.split(',');
                              return (
                                <>
                                  <div style={{ color: 'white', fontWeight: 700, marginBottom: '2px' }}>{parts[0].trim()}</div>
                                  <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>{parts.slice(1).join(',').trim()}</div>
                                </>
                              );
                            }
                            // Asian: StateCityWard...
                            const match = addr.match(/(.*?[市区町村])(.*)/);
                            if (match) {
                              return (
                                <>
                                  <div style={{ color: 'white', fontWeight: 700, marginBottom: '2px' }}>{match[1]}</div>
                                  <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>{match[2]}</div>
                                </>
                              );
                            }
                            return addr;
                          })()}
                        </div>
                      </div>
                    )}

                    {place.internationalPhoneNumber && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '16px', flexShrink: 0 }}>call</span>
                        <a href={`tel:${place.internationalPhoneNumber}`} style={{ fontSize: '0.82rem', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>
                          {place.internationalPhoneNumber}
                        </a>
                      </div>
                    )}
                    
                    {place.websiteURI && (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '16px', flexShrink: 0 }}>public</span>
                        <a href={place.websiteURI} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700, textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {place.websiteURI.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '1rem 0' }} />

                  {/* Business Hours Timetable */}
                  {place.regularOpeningHours?.weekdayDescriptions && (
                    <div 
                      ref={hoursTriggerRef}
                      style={{ position: 'relative', marginBottom: '1.2rem' }}
                      onMouseEnter={() => {
                        if (hoursTriggerRef.current) {
                          const rect = hoursTriggerRef.current.getBoundingClientRect();
                          setHoursPos({
                            bottom: window.innerHeight - rect.top + 8,
                            left: rect.left
                          });
                        }
                        setHoverHours(true);
                      }}
                      onMouseLeave={() => setHoverHours(false)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'help' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>schedule</span>
                        <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
                          {place.regularOpeningHours.weekdayDescriptions[new Date().getDay()] || 'Business Hours'}
                        </span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>expand_less</span>
                      </div>

                      {/* Floating full timetable (UPWARDS via Portal) */}
                      {hoverHours && createPortal(
                        <div style={{
                          position: 'fixed',
                          bottom: hoursPos.bottom,
                          left: hoursPos.left,
                          zIndex: 9999,
                          background: 'rgba(23, 27, 41, 0.98)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                          display: 'grid',
                          gap: '10px',
                          minWidth: '240px'
                        }}>
                          {place.regularOpeningHours.weekdayDescriptions.map((desc, i) => {
                            const splitIdx = desc.indexOf(': ');
                            const dayStr = splitIdx > -1 ? desc.substring(0, splitIdx) : desc;
                            const hoursStr = splitIdx > -1 ? desc.substring(splitIdx + 2) : '';
                            const isToday = i === new Date().getDay();
                            return (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.78rem', color: isToday ? 'white' : 'rgba(255,255,255,0.6)' }}>
                                <span style={{ fontWeight: isToday ? 800 : 500 }}>{dayStr}</span>
                                <span style={{ fontWeight: isToday ? 800 : 600 }}>{hoursStr}</span>
                              </div>
                            );
                          })}
                        </div>,
                        document.body
                      )}
                    </div>
                  )}

                  {/* Itinerary Scheduled Time */}
                  {matchedStop?.time && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(255,255,255,0.08)', borderRadius: '8px',
                      padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800, color: 'white'
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#f97316' }}>event_note</span>
                      {t('itinerary.scheduled_time') || 'Scheduled'}: {matchedStop.time} {matchedStop.period || ''}
                    </div>
                  )}
                </div>

                {photo && (
                  <div
                    className="poi-photo-aside"
                    onClick={() => handlePhotoClick(0)}
                    style={{ 
                      flex: 1,
                      height: '240px', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.6)', 
                      cursor: 'pointer', 
                      border: '4px solid rgba(255,255,255,0.08)', 
                      transition: 'transform 0.3s ease' 
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.01)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
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
          onClick={() => {
            if (!swipedRef.current) setZoomedPhotoIdx(null);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', backdropFilter: 'blur(20px)',
            touchAction: 'none'
          }}
        >
          {/* Close Button Top Right */}
          <button 
            style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setZoomedPhotoIdx(null)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>close</span>
          </button>

          {/* Navigation Arrows — desktop only, mobile uses swipe */}
          {!isMobileDevice && (
          <button
            onClick={prevPhoto}
            style={{ position: 'absolute', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_left</span>
          </button>
          )}
          
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
                zIndex: 100003,
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                draggable: false
              }}
              onClick={e => e.stopPropagation()}
              onDragStart={e => e.preventDefault()}
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

          {!isMobileDevice && (
          <button
            onClick={nextPhoto}
            style={{ position: 'absolute', right: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_right</span>
          </button>
          )}

          {/* Counter Overlay */}
          <div style={{ position: 'absolute', bottom: '40px', color: 'white', fontSize: '1rem', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: '20px' }}>
            {zoomedPhotoIdx + 1} / {photos.length}
          </div>

          {/* Mobile swipe dots indicator */}
          {photos.length > 1 && (
            <div className="lightbox-dots-indicator" style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'none', gap: '6px', alignItems: 'center' }}>
              {photos.slice(0, 15).map((_, i) => (
                <div key={i} style={{
                  width: i === zoomedPhotoIdx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === zoomedPhotoIdx ? 'white' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.3s ease',
                  flexShrink: 0
                }} />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}
