import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';

const CATEGORIES = [
  { id: 'all',         icon: 'apps',              type: null,                          label_key: 'map.checkin_cat_all' },
  { id: 'dining',      icon: 'restaurant',         type: 'restaurant',                  label_key: 'map.category_dining' },
  { id: 'cafe',        icon: 'local_cafe',         type: 'cafe',                        label_key: 'map.checkin_cat_cafe' },
  { id: 'attractions', icon: 'museum',             type: 'tourist_attraction',          label_key: 'map.category_attractions' },
  { id: 'shopping',    icon: 'shopping_bag',       type: 'shopping_mall',               label_key: 'map.checkin_cat_shopping' },
  { id: 'lodging',     icon: 'hotel',              type: 'lodging',                     label_key: 'map.category_lodging' },
];

const RADIUS = 500; // metres

/**
 * NearbyCheckinPanel
 *
 * 底部滑出面板，显示 GPS 附近 500m 内的推荐地点。
 * 仅在 isDayMode（今日打卡）下使用。
 *
 * Props:
 *   mapInstance      — Google Maps 实例
 *   userLocation     — { lat, lng } 当前 GPS 位置
 *   existingPlaceIds — string[]，已打卡的 placeId（用于标记已添加）
 *   onAddPlace       — (placeId) => void，用户选择打卡
 *   onClose          — () => void
 */
export default function NearbyCheckinPanel({ mapInstance, userLocation, existingPlaceIds = [], onAddPlace, onClose }) {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState('all');
  const [places, setPlaces]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const serviceRef = useRef(null);

  // 搜索附近地点
  const searchNearby = useCallback((categoryId) => {
    const mapsApi = globalThis.google;
    if (!mapInstance || !mapsApi?.maps?.places || !userLocation) return;

    if (!serviceRef.current) {
      serviceRef.current = new mapsApi.maps.places.PlacesService(mapInstance);
    }

    setLoading(true);
    setPlaces([]);

    const cat = CATEGORIES.find(c => c.id === categoryId);
    const request = {
      location: new mapsApi.maps.LatLng(userLocation.lat, userLocation.lng),
      radius: RADIUS,
      ...(cat?.type ? { type: cat.type } : {}),
    };

    serviceRef.current.nearbySearch(request, (results, status) => {
      setLoading(false);
      if (status === mapsApi.maps.places.PlacesServiceStatus.OK && results?.length) {
        setPlaces(results.slice(0, 20));
      } else {
        setPlaces([]);
      }
    });
  }, [mapInstance, userLocation]);

  // 切换分类时重新搜索
  useEffect(() => {
    searchNearby(activeCategory);
  }, [activeCategory, searchNearby]);

  const handleAdd = useCallback(async (placeId) => {
    if (!placeId || addingId) return;
    setAddingId(placeId);
    try {
      await onAddPlace?.(placeId);
    } finally {
      setAddingId(null);
    }
  }, [onAddPlace, addingId]);

  const isAdded = (placeId) => existingPlaceIds.includes(placeId);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'var(--bg-deep, #0d0f14)',
        borderTop: '1px solid var(--glass-border)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        maxHeight: '55vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: '#4285f4', fontSize: '20px' }}>my_location</span>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>
            {t('map.nearby_checkin') || '附近打卡'}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
            {RADIUS}m
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>keyboard_arrow_down</span>
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.25rem', overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '20px', border: 'none',
              background: activeCategory === cat.id ? 'var(--accent-primary, #3b82f6)' : 'rgba(255,255,255,0.07)',
              color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{cat.icon}</span>
            {t(cat.label_key) || cat.label_key.split('_').pop()}
          </button>
        ))}
      </div>

      {/* Place list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 0.75rem 1rem' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '2rem', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <span style={{ fontSize: '0.9rem' }}>{t('common.loading') || '加载中...'}</span>
          </div>
        )}

        {!loading && places.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('map.no_nearby') || '附近暂无结果'}
          </div>
        )}

        {!loading && places.map((place) => {
          const placeId = place.place_id;
          const added = isAdded(placeId);
          const isAdding = addingId === placeId;
          const rating = place.rating;
          const dist = place.distance; // may be undefined from nearbySearch

          return (
            <div
              key={placeId}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 0.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: added ? 0.55 : 1,
              }}
            >
              {/* Place photo / icon */}
              <div style={{
                width: '46px', height: '46px', borderRadius: '10px', flexShrink: 0,
                background: place.photos?.[0]
                  ? `url(${place.photos[0].getUrl({ maxWidth: 80 })}) center/cover`
                  : 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!place.photos?.[0] && (
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', opacity: 0.3 }}>place</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {place.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                  {rating && (
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                      ★ {rating.toFixed(1)}
                    </span>
                  )}
                  {place.vicinity && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {place.vicinity}
                    </span>
                  )}
                </div>
              </div>

              {/* Add button */}
              <button
                onClick={() => !added && handleAdd(placeId)}
                disabled={added || isAdding}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: added ? 'rgba(255,255,255,0.07)' : 'var(--accent-primary, #3b82f6)',
                  color: added ? 'var(--text-muted)' : 'white',
                  fontSize: '0.8rem', fontWeight: 700,
                  cursor: added ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'all 0.2s',
                  minWidth: '60px', justifyContent: 'center',
                }}
              >
                {isAdding ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                ) : added ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
                    {t('map.checkin_added') || '已打卡'}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                    {t('map.checkin_add') || '打卡'}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
