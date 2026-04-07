import { useState, useEffect } from 'react';
import { useEmergencyNearby } from '../../hooks/useEmergencyNearby';
import { useI18n } from '../../context/I18nContext';

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Tab 2: Nearby emergency services — hospitals, pharmacies, police stations.
 */
export default function EmergencyNearby({ position, fallbackLat, fallbackLng }) {
  const { t } = useI18n();
  const [activeType, setActiveType] = useState('hospital');
  const [gpsPos, setGpsPos] = useState(position || null);
  const [gpsError, setGpsError] = useState(null);

  const SERVICE_TYPES = [
    { key: 'hospital', icon: 'local_hospital', label: t('emergency.hospital'),       color: '#D32F2F' },
    { key: 'pharmacy', icon: 'local_pharmacy',  label: t('emergency.pharmacy'),       color: '#2E7D32' },
    { key: 'police',   icon: 'local_police',    label: t('emergency.police_station'), color: '#1565C0' },
  ];

  // Try to get GPS if no position provided
  useEffect(() => {
    if (position) {
      setGpsPos(position);
      return;
    }
    if (fallbackLat && fallbackLng) {
      setGpsPos({ lat: fallbackLat, lng: fallbackLng });
    }
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        setGpsError(err.message);
        // Use fallback coordinates if GPS fails
        if (fallbackLat && fallbackLng) setGpsPos({ lat: fallbackLat, lng: fallbackLng });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, [position, fallbackLat, fallbackLng]);

  const { results, loading, error, fromCache, refresh } = useEmergencyNearby(activeType, gpsPos);

  const activeConfig = SERVICE_TYPES.find(s => s.key === activeType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Service type filter chips */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {SERVICE_TYPES.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveType(s.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              padding: '0.55rem 0.5rem',
              borderRadius: '0.75rem',
              border: activeType === s.key ? `1.5px solid ${s.color}` : '1.5px solid var(--md-sys-color-outline-variant, #ccc)',
              background: activeType === s.key ? `${s.color}15` : 'transparent',
              color: activeType === s.key ? s.color : 'var(--md-sys-color-on-surface-variant, #666)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.icon}</span>
            {s.labelZh}
          </button>
        ))}
      </div>

      {/* Status bar */}
      {(loading || error || fromCache || gpsError) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant, #888)',
          padding: '0.3rem 0',
        }}>
          {loading && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>progress_activity</span>
              {t('emergency.searching')}
            </>
          )}
          {fromCache && !loading && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cloud_off</span>
              {t('emergency.cached')}
            </>
          )}
          {(error || gpsError) && !loading && (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#D32F2F' }}>warning</span>
              {gpsError || error}
            </>
          )}
        </div>
      )}

      {/* Results list */}
      {!loading && results.length === 0 && !error && gpsPos && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>{activeConfig.icon}</span>
          <p style={{ fontSize: '0.85rem' }}>{t('emergency.no_results').replace('{type}', activeConfig.label.toLowerCase())}</p>
        </div>
      )}

      {!gpsPos && !loading && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>location_off</span>
          <p style={{ fontSize: '0.85rem' }}>{t('emergency.location_unavailable')}</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('emergency.location_hint')}</p>
        </div>
      )}

      {results.map(r => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0.85rem 1rem',
            background: 'var(--md-sys-color-surface-container-low, #f5f5f5)',
            borderRadius: '0.85rem',
            borderLeft: `3px solid ${activeConfig.color}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #333)' }}>
                {r.name}
              </span>
              {r.isOpen !== null && (
                <span style={{
                  fontSize: '0.65rem', fontWeight: 600,
                  color: r.isOpen ? '#2E7D32' : '#C62828',
                  background: r.isOpen ? '#E8F5E9' : '#FFEBEE',
                  padding: '1px 6px', borderRadius: '4px',
                }}>
                  {r.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant, #666)', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
              {r.distance != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: activeConfig.color, fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>directions_walk</span>
                  {formatDistance(r.distance)}
                </span>
              )}
              {r.rating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#F9A825' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>star</span>
                  {r.rating}
                </span>
              )}
            </div>
          </div>

          {/* Call button */}
          {r.phone ? (
            <a
              href={`tel:${r.phone}`}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: activeConfig.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, alignSelf: 'center',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
              title={r.phone}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>call</span>
            </a>
          ) : (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--md-sys-color-outline-variant, #aaa)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, alignSelf: 'center',
                textDecoration: 'none',
              }}
              title="Open in Maps"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>map</span>
            </a>
          )}
        </div>
      ))}

      {/* Refresh button */}
      {gpsPos && !loading && (
        <button
          onClick={refresh}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.6rem', border: '1px dashed var(--md-sys-color-outline-variant, #ccc)',
            borderRadius: '0.75rem', background: 'transparent',
            color: 'var(--md-sys-color-on-surface-variant, #666)',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          {t('emergency.refresh')}
        </button>
      )}
    </div>
  );
}
