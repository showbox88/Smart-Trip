/**
 * CityInfoModal — Centered modal showing cuisine or attractions for a city.
 * iOS-style card with list of items (dishes / landmarks).
 */

import { FONT } from './mobileStyles';

export default function CityInfoModal({ cityModal, setCityModal, cityInfo, cityInfoLoading }) {
  if (!cityModal) return null;

  const liveInfo = cityInfo?.[cityModal.city];
  const cuisineData = liveInfo?.cuisine;
  const attractionsData = liveInfo?.attractions;
  const isCuisine = cityModal.type === 'cuisine';
  const items = isCuisine ? (cuisineData?.items || []) : (attractionsData || []);
  const introText = isCuisine ? cuisineData?.intro : '';

  const renderCard = (item, idx) => {
    const name = typeof item === 'string' ? item : item.name;
    const desc = typeof item === 'string' ? '' : (item.desc || '');
    const img = typeof item === 'string' ? '' : (item.image || '');
    return (
      <div key={idx} style={{
        display: 'flex', gap: 10, padding: 10,
        background: '#F8F8FA', borderRadius: 14, overflow: 'hidden',
      }}>
        {img ? (
          <img src={img} alt={name} style={{
            width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
            background: '#E5E5EA',
          }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 10, flexShrink: 0,
            background: isCuisine ? 'linear-gradient(135deg,#FF9500,#FF6B35)' : 'linear-gradient(135deg,#007AFF,#5856D6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>
              {isCuisine ? 'lunch_dining' : 'location_on'}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', fontFamily: FONT }}>{name}</span>
          {desc && (
            <span style={{
              fontSize: 12, color: '#8E8E93', fontFamily: FONT, lineHeight: 1.4,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{desc}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={() => setCityModal(null)}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: 360, maxHeight: '70vh',
        background: '#fff', borderRadius: 20,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F2F2F7', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#007AFF' }}>
              {isCuisine ? 'restaurant' : 'tour'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000', fontFamily: FONT }}>
                {isCuisine ? 'Local Cuisine' : 'Attractions'}
              </h3>
              <span style={{ fontSize: 12, color: '#8E8E93' }}>{cityModal.city}</span>
            </div>
          </div>
          <button onClick={() => setCityModal(null)} style={{
            background: '#F2F2F7', border: 'none', borderRadius: '50%',
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8E8E93' }}>close</span>
          </button>
        </div>
        {/* Content */}
        <div style={{ padding: '14px 18px 20px', overflowY: 'auto', flex: 1 }}>
          {cityInfoLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
              <span style={{ fontSize: 14, color: '#8E8E93', fontFamily: FONT }}>Loading...</span>
            </div>
          ) : (
            <>
              {introText && (
                <p style={{
                  margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#3C3C43',
                  fontFamily: FONT, paddingBottom: 12, borderBottom: '1px solid #F2F2F7',
                }}>{introText}</p>
              )}
              {items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(renderCard)}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#8E8E93', fontFamily: FONT }}>
                  {isCuisine ? 'No cuisine information available.' : 'No attractions data available.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
