import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { PLACE_CATEGORY_MAP } from '../../utils/tripHelpers';
import { useMapPlaceDetails } from '../../hooks/useMapPlaceDetails';
import { useLightboxGallery } from '../../hooks/useLightboxGallery';
import { useFavorites } from '../../hooks/useFavorites';
import { getIsTouch } from '../../hooks/useDeviceType';

function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ color: 'var(--st-color-category-food)', fontSize: '0.9rem', letterSpacing: '1px' }}>
      {'*'.repeat(full)}{half ? '+' : ''}{'*'.repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function getCategoryLabel(place, t) {
  if (!place?.types?.length) return null;
  for (const type of place.types) {
    if (PLACE_CATEGORY_MAP[type]) return t(PLACE_CATEGORY_MAP[type].labelKey);
  }
  return place.types[0]?.replace(/_/g, ' ') || null;
}

function renderAddress(address) {
  if (!address) return null;
  if (address.includes(',')) {
    const parts = address.split(',');
    return (
      <>
        <div style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 700, marginBottom: '2px' }}>{parts[0].trim()}</div>
        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>{parts.slice(1).join(',').trim()}</div>
      </>
    );
  }
  const match = address.match(/(.*?[甯傚尯鐢烘潙])(.*)/);
  if (match) {
    return (
      <>
        <div style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 700, marginBottom: '2px' }}>{match[1]}</div>
        <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>{match[2]}</div>
      </>
    );
  }
  return address;
}

function FavoritesTab({ favorites, loading, trip, onSelectPlace, onAddToDay, onToggleFavorite, t }) {
  if (loading) {
    return <div style={{ color: 'var(--st-color-text-muted)', textAlign: 'center', padding: '2rem' }}>{t('common.loading')}</div>;
  }
  if (!favorites.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--st-color-text-muted)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px', display: 'block', opacity: 0.4 }}>favorite_border</span>
        <div style={{ fontSize: '0.85rem' }}>{t('map.favorites_empty') || '还没有收藏，心形按钮点一下就能保存'}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {favorites.map((fav) => (
        <div
          key={fav.place_id}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '8px 10px', cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onClick={() => onSelectPlace(fav.place_id)}
        >
          {/* Thumbnail */}
          <div style={{ width: 48, height: 48, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1e293b' }}>
            {fav.photo_url
              ? <img src={fav.photo_url} alt={fav.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#475569' }}>place</span>
                </div>
            }
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name || fav.place_id}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--st-color-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {fav.category && <span>{fav.category}</span>}
              {fav.rating && <span style={{ color: 'var(--st-color-status-soon)' }}>★ {fav.rating}</span>}
            </div>
          </div>
          {/* Add to trip */}
          <button
            onClick={e => { e.stopPropagation(); onAddToDay(fav.place_id, e.currentTarget); }}
            title={t('map.add_to_itinerary') || '添加到行程'}
            style={{ background: 'var(--md-sys-color-primary-container)', border: '1px solid var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary-container)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            + {t('map.trip') || '行程'}
          </button>
          {/* Unfavorite */}
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(fav.place_id, fav); }}
            title={t('map.unfavorite') || '取消收藏'}
            style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-error)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export default function MapInfoPanel({ placeId, onClose, onAddToDay, onSelectPlace, isDayMode = false, dayId = null }) {
  const { t } = useI18n();
  const { state } = useApp();
  const userId = state.user?.id || null;
  const [activeTab, setActiveTab] = useState('about');
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [pickerTargetPlaceId, setPickerTargetPlaceId] = useState(null); // for favorites list day picker
  const [mutableAddedDays, setMutableAddedDays] = useState(new Set());
  useEffect(() => { setMutableAddedDays(new Set()); }, [placeId]);
  const [dayPickerPos, setDayPickerPos] = useState({ top: 0, left: 0 });
  const [hoverHours, setHoverHours] = useState(false);
  const [hoursPos, setHoursPos] = useState({ bottom: 0, left: 0 });
  const addBtnRef = useRef(null);
  const hoursTriggerRef = useRef(null);

  const { favorites, loading: favLoading, isFavorited, toggleFavorite } = useFavorites(userId);

  const trip = state.trips.find((tr) => tr.id === state.activeTripId);
  const { place, loading, matchedStop, addedDays, photos, reviews, fallbackPhotoUrl } = useMapPlaceDetails(trip, placeId);
  const photoUrls = useMemo(() => {
    if (photos.length > 0) {
      return photos.map((photoItem) => photoItem.getURI({ maxWidth: 2400, maxHeight: 1800 }));
    }
    return fallbackPhotoUrl ? [fallbackPhotoUrl] : [];
  }, [photos, fallbackPhotoUrl]);
  const {
    zoomedPhotoIdx,
    prevPhotoIdx,
    isAnimating,
    swipedRef,
    handlePhotoClick,
    nextPhoto,
    prevPhoto,
    closeLightbox,
    resetGallery,
  } = useLightboxGallery(photoUrls);

  const effectiveAddedDays = useMemo(() => {
    const next = new Set(addedDays);
    mutableAddedDays.forEach((dayId) => next.add(dayId));
    return next;
  }, [addedDays, mutableAddedDays]);

  const photo = photoUrls[0] || null;
  const category = place ? getCategoryLabel(place, t) : null;
  const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || getIsTouch());

  const handleAddToDay = useCallback(async (dayId) => {
    const targetId = pickerTargetPlaceId || placeId;
    setShowDayPicker(false);
    setPickerTargetPlaceId(null);
    try {
      await onAddToDay?.(dayId, targetId);
      if (targetId === placeId) setMutableAddedDays((prev) => new Set([...prev, dayId]));
    } catch (err) {
      console.error('[MapInfoPanel] add failed:', err);
    }
  }, [onAddToDay, placeId, pickerTargetPlaceId]);

  const openDayPicker = useCallback((targetPid, btnEl) => {
    const el = btnEl || addBtnRef.current;
    if (!showDayPicker && el) {
      const rect = el.getBoundingClientRect();
      setDayPickerPos({ bottom: window.innerHeight - rect.top + 8, left: rect.left });
    }
    setPickerTargetPlaceId(targetPid || null);
    setShowDayPicker((value) => !value);
  }, [showDayPicker]);

  const openHoursPopover = useCallback(() => {
    if (hoursTriggerRef.current) {
      const rect = hoursTriggerRef.current.getBoundingClientRect();
      setHoursPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
    setHoverHours(true);
  }, []);

  const closePanel = useCallback(() => {
    resetGallery();
    setActiveTab('about');
    onClose();
  }, [onClose, resetGallery]);

  return (
    <div
      id="map-info-panel"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        minHeight: '350px', maxHeight: '60vh', background: 'var(--md-sys-color-surface-container)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--md-sys-color-outline-variant)',
        display: 'flex', flexDirection: 'column', zIndex: 2000,
        fontFamily: 'var(--md-sys-typescale-body-font)',
        color: 'var(--md-sys-color-on-surface)',
        overflow: 'visible',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 1.5rem', height: '50px', position: 'relative', borderBottom: '1px solid var(--md-sys-color-outline-variant)' }}>
        <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
          {['about', 'reviews', 'photos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                color: activeTab === tab ? 'var(--md-sys-color-on-surface)' : 'var(--st-color-text-muted)',
                fontWeight: 700,
                padding: '14px 0',
                borderBottom: activeTab === tab ? '2px solid var(--st-color-category-food)' : '2px solid transparent',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'about' ? t('map.tab_about') : tab === 'reviews' ? t('map.tab_reviews') : t('map.tab_photos')}
            </button>
          ))}
          {/* Favorites tab */}
          <button
            onClick={() => setActiveTab('favorites')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem',
              color: activeTab === 'favorites' ? 'var(--md-sys-color-error)' : 'var(--st-color-text-muted)',
              fontWeight: 700,
              padding: '14px 0',
              borderBottom: activeTab === 'favorites' ? '2px solid var(--md-sys-color-error)' : '2px solid transparent',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
            {t('map.tab_favorites') || '收藏'}
            {favorites.length > 0 && (
              <span style={{ fontSize: '0.65rem', background: 'var(--md-sys-color-error)', color: 'white', borderRadius: '10px', padding: '0 5px', lineHeight: '16px', fontWeight: 800 }}>
                {favorites.length}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={closePanel}
          style={{ background: 'none', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {showDayPicker && createPortal(
          <div style={{
            position: 'fixed',
            bottom: dayPickerPos.bottom,
            left: dayPickerPos.left,
            background: 'var(--md-sys-color-surface-container-high)',
            border: '1px solid var(--md-sys-color-outline-variant)', borderRadius: '10px',
            minWidth: '220px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            padding: '4px 0', zIndex: 9999,
          }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--md-sys-color-outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{t('map.select_date') || 'Add to Day'}</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {trip?.days?.map((day, idx) => {
                const isAdded = effectiveAddedDays.has(day.id);
                return (
                  <div
                    key={day.id}
                    onClick={() => handleAddToDay(day.id)}
                    style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'center', cursor: 'pointer',
                      background: isAdded ? 'rgba(16,185,129,0.06)' : 'transparent',
                      transition: 'background 0.2s', borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = isAdded ? 'rgba(16,185,129,0.06)' : 'transparent'; }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: day.color || 'var(--st-color-category-food)', marginRight: '12px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isAdded ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-on-surface)', flex: 1 }}>{t('itinerary.day_label')}{idx + 1}{t('itinerary.day_suffix')}</span>
                    <span style={{ fontSize: '0.75rem', color: isAdded ? 'var(--md-sys-color-tertiary)' : 'var(--st-color-text-muted)', marginRight: isAdded ? '6px' : 0 }}>{day.date ? new Date(day.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                    {isAdded && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-tertiary)' }}>check_circle</span>}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}

        <div className="poi-content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--st-color-text-muted)' }}>{t('common.loading')}</div>
          ) : place && (
            <>
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  ref={addBtnRef}
                  onClick={() => {
                    // 日模式（DayPage 地图）：天就是当前这天，直接添加，不弹日期选择器
                    if (isDayMode && dayId) { handleAddToDay(dayId); return; }
                    openDayPicker(null, addBtnRef.current);
                  }}
                  style={{
                    background: 'var(--md-sys-color-primary)', color: 'white', border: 'none', borderRadius: '8px',
                    padding: '0.4rem 14px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 3px 10px rgba(60, 131, 246, 0.25)',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span style={{ fontSize: '1rem' }}>+</span> {t('map.add_to_itinerary')}
                </button>

                {/* Heart / favorite button */}
                <button
                  onClick={() => {
                    const snap = place ? {
                      name: place.displayName,
                      address: place.formattedAddress,
                      photoUrl: photoUrls[0] || null,
                      rating: place.rating,
                      category: getCategoryLabel(place, t),
                      lat: place.location?.lat?.(),
                      lng: place.location?.lng?.(),
                    } : {};
                    toggleFavorite(placeId, snap);
                  }}
                  title={isFavorited(placeId) ? (t('map.unfavorite') || '取消收藏') : (t('map.favorite') || '收藏')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: isFavorited(placeId) ? 'var(--md-sys-color-error)' : 'var(--st-color-text-muted)', transition: 'color 0.2s' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: isFavorited(placeId) ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
              </div>

              {activeTab === 'about' && (
                <div className="poi-about-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div className="poi-info-content" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--md-sys-color-on-surface)', lineHeight: 1.1 }}>
                        {place.displayName}
                      </h1>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {category && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--md-sys-color-surface-container-high)', padding: '3px 8px', borderRadius: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--st-color-text-muted)' }}>restaurant</span>
                            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.7rem', fontWeight: 700 }}>{category}</span>
                          </div>
                        )}

                        {place.rating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(249,115,22,0.08)', padding: '3px 8px', borderRadius: '5px' }}>
                            <span style={{ color: 'var(--st-color-category-food)', fontSize: '13px' }}>*</span>
                            <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 800, fontSize: '0.8rem' }}>{place.rating}</span>
                            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.65rem' }}>({place.userRatingCount})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                      {place.formattedAddress && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--st-color-category-food)', fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>location_on</span>
                          <div style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: 1.4 }}>
                            {renderAddress(place.formattedAddress)}
                          </div>
                        </div>
                      )}

                      {place.internationalPhoneNumber && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)', fontSize: '16px', flexShrink: 0 }}>call</span>
                          <a href={`tel:${place.internationalPhoneNumber}`} style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                            {place.internationalPhoneNumber}
                          </a>
                        </div>
                      )}

                      {place.websiteURI && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-tertiary)', fontSize: '16px', flexShrink: 0 }}>public</span>
                          <a href={place.websiteURI} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-tertiary)', fontWeight: 700, textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {place.websiteURI.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ height: '1px', background: 'var(--md-sys-color-outline-variant)', margin: '1rem 0' }} />

                    {place.regularOpeningHours?.weekdayDescriptions && (
                      <div
                        ref={hoursTriggerRef}
                        style={{ position: 'relative', marginBottom: '1.2rem' }}
                        onMouseEnter={openHoursPopover}
                        onMouseLeave={() => setHoverHours(false)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'help' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--st-color-status-soon)' }}>schedule</span>
                          <span style={{ color: 'var(--md-sys-color-on-surface)', fontSize: '0.85rem', fontWeight: 700 }}>
                            {place.regularOpeningHours.weekdayDescriptions[new Date().getDay()] || 'Business Hours'}
                          </span>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)' }}>expand_less</span>
                        </div>

                        {hoverHours && createPortal(
                          <div style={{
                            position: 'fixed',
                            bottom: hoursPos.bottom,
                            left: hoursPos.left,
                            zIndex: 9999,
                            background: 'var(--md-sys-color-surface-container-high)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--md-sys-color-outline-variant)',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                            display: 'grid',
                            gap: '10px',
                            minWidth: '240px',
                          }}>
                            {place.regularOpeningHours.weekdayDescriptions.map((desc, i) => {
                              const splitIdx = desc.indexOf(': ');
                              const dayStr = splitIdx > -1 ? desc.substring(0, splitIdx) : desc;
                              const hoursStr = splitIdx > -1 ? desc.substring(splitIdx + 2) : '';
                              const isToday = i === new Date().getDay();
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', fontSize: '0.78rem', color: isToday ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-on-surface-variant)' }}>
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

                    {matchedStop?.time && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'var(--md-sys-color-surface-container-high)', borderRadius: '8px',
                        padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--st-color-category-food)' }}>event_note</span>
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
                        border: '4px solid var(--md-sys-color-outline-variant)',
                        transition: 'transform 0.3s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--md-sys-color-surface-container-high)', borderRadius: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)', lineHeight: 1 }}>{place.rating || '-'}</div>
                      <div style={{ margin: '0.4rem 0' }}><StarRating rating={place.rating} /></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)' }}>{place.userRatingCount || 0} {t('map.tab_reviews') || 'Reviews'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const val = reviews.filter((review) => Math.round(review.rating) === stars).length;
                        const pct = reviews.length > 0 ? (val / reviews.length) * 100 : 0;
                        return (
                          <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--st-color-text-muted)', minWidth: '10px' }}>{stars}</span>
                            <div style={{ flex: 1, height: '4px', background: 'var(--md-sys-color-outline-variant)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct || (stars <= (place.rating || 0) ? 80 - (5 - stars) * 15 : 20)}%`, height: '100%', background: 'var(--st-color-category-food)', borderRadius: '2px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {reviews.map((review, i) => (
                    <div key={i} style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant)', paddingBottom: '0.8rem', marginBottom: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--md-sys-color-surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--md-sys-color-on-surface-variant)' }}>
                          {review.authorAttribution?.displayName?.[0] || 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>{review.authorAttribution?.displayName}</span>
                          <div style={{ marginTop: '4px' }}><StarRating rating={review.rating} /></div>
                        </div>
                      </div>
                      <p style={{ margin: 0, color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                        {typeof review.text === 'object' ? review.text?.text : review.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'photos' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {photoUrls.length > 0 ? photoUrls.slice(0, 15).map((photoSrc, i) => (
                    <div
                      key={i}
                      onClick={() => handlePhotoClick(i)}
                      style={{ aspectRatio: '1.5', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', background: 'var(--md-sys-color-surface-container-high)' }}
                    >
                      <img src={photoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )) : null}
                </div>
              )}
            </>
          )}

          {/* ── Favorites tab — shown regardless of selected place ── */}
          {activeTab === 'favorites' && (
            <FavoritesTab
              favorites={favorites}
              loading={favLoading}
              trip={trip}
              onSelectPlace={(pid) => { onSelectPlace?.(pid); setActiveTab('about'); }}
              onAddToDay={(pid, btnEl) => {
                if (isDayMode && dayId) { onAddToDay?.(dayId, pid); return; }
                openDayPicker(pid, btnEl);
              }}
              onToggleFavorite={toggleFavorite}
              t={t}
            />
          )}
        </div>

        {zoomedPhotoIdx !== null && createPortal(
          <div
            onClick={() => {
              if (!swipedRef.current) closeLightbox();
            }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.95)', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', backdropFilter: 'blur(20px)',
              touchAction: 'none',
            }}
          >
            <button
              style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={closeLightbox}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>close</span>
            </button>

            {!isMobileDevice && (
              <button
                onClick={prevPhoto}
                style={{ position: 'absolute', left: '40px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_left</span>
              </button>
            )}

            <div style={{ position: 'relative', width: '85vw', height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {prevPhotoIdx !== null && isAnimating && (
                <img
                  key={`prev-${prevPhotoIdx}`}
                  src={photoUrls[prevPhotoIdx]}
                  style={{
                    position: 'absolute', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                    borderRadius: '8px',
                    animation: 'galleryFadeOut 0.6s forwards 0.12s',
                    zIndex: 100002,
                  }}
                />
              )}

              <img
                key={`curr-${zoomedPhotoIdx}`}
                src={photoUrls[zoomedPhotoIdx]}
                style={{
                  position: 'absolute', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                  borderRadius: '8px', boxShadow: '0 30px 90px rgba(0,0,0,0.8)',
                  animation: isAnimating && prevPhotoIdx !== null ? 'galleryFadeIn 0.6s forwards' : 'none',
                  opacity: isAnimating && prevPhotoIdx !== null ? 0 : 1,
                  zIndex: 100003,
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  draggable: false,
                }}
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
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
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>chevron_right</span>
              </button>
            )}

            <div style={{ position: 'absolute', bottom: '40px', color: 'white', fontSize: '1rem', fontWeight: 600, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: '20px' }}>
              {zoomedPhotoIdx + 1} / {photoUrls.length}
            </div>

            {photoUrls.length > 1 && (
              <div className="lightbox-dots-indicator" style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'none', gap: '6px', alignItems: 'center' }}>
                {photoUrls.slice(0, 15).map((_, i) => (
                  <div key={i} style={{
                    width: i === zoomedPhotoIdx ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: i === zoomedPhotoIdx ? 'white' : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
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
