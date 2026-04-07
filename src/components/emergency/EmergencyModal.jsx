import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getCountryCode } from '../../data/countryCodeMap';
import emergencyData from '../../data/emergencyNumbers.json';
import EmergencyNumbers from './EmergencyNumbers';
import EmergencyNearby from './EmergencyNearby';
import EmergencyEmbassy from './EmergencyEmbassy';

const TABS = [
  { key: 'numbers', icon: 'call', label: 'Emergency', labelZh: '紧急电话' },
  { key: 'nearby', icon: 'local_hospital', label: 'Nearby', labelZh: '附近' },
  { key: 'embassy', icon: 'account_balance', label: 'Embassy', labelZh: '大使馆' },
];

/**
 * Full-screen emergency info modal.
 * Auto-detects country from active trip destinations or allows manual selection.
 */
export default function EmergencyModal({ onClose }) {
  const { state } = useApp();
  const location = useLocation();
  const overlayRef = useRef(null);
  const [activeTab, setActiveTab] = useState('numbers');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [detectStatus, setDetectStatus] = useState('');

  // Try to detect country: 1) from Trip destinations  2) from GPS reverse geocoding
  useEffect(() => {
    // 1. Check if we're on a trip page
    const tripMatch = location.pathname.match(/\/trip-v2\/(.+)/);
    if (tripMatch && state.trips) {
      const tripId = tripMatch[1];
      const trip = state.trips.find(t =>
        t.id === tripId || t._realTripId === tripId || t.id === `v2-trip-${tripId}`
      );
      if (trip?.settings?.destinations?.length) {
        const dest = trip.settings.destinations[0];
        const code = getCountryCode(dest.country);
        if (code && emergencyData[code]) {
          setSelectedCountry({ name: dest.country, code, lat: dest.lat, lng: dest.lng });
          return;
        }
      }
    }

    // 2. No trip context — try GPS + reverse geocoding
    if (!navigator.geolocation) {
      setDetectStatus('Step 1 FAIL: navigator.geolocation not available');
      return;
    }

    let cancelled = false;
    setDetectStatus('Step 1: Requesting GPS...');

    // Wait for Google Maps core API to be loaded
    const waitForGoogleMaps = () => new Promise((resolve) => {
      if (window.google?.maps) { resolve(true); return; }
      const prev = window._dispatchGoogleMapsReady;
      window._dispatchGoogleMapsReady = () => {
        if (prev) prev();
        resolve(true);
      };
      const interval = setInterval(() => {
        if (window.google?.maps) { clearInterval(interval); resolve(true); }
      }, 200);
      setTimeout(() => { clearInterval(interval); resolve(false); }, 8000);
    });

    (async () => {
      try {
        // Step 1: Get GPS position
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000,
          });
        });

        if (cancelled) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        setDetectStatus(`Step 2: GPS OK (${lat.toFixed(4)}, ${lng.toFixed(4)}), waiting for Maps API...`);

        // Step 2: Wait for Google Maps API
        const mapsReady = await waitForGoogleMaps();
        if (cancelled) return;
        if (!mapsReady || !window.google?.maps) {
          setDetectStatus('Step 2 FAIL: Google Maps API timeout');
          return;
        }
        setDetectStatus(`Step 3: Maps API ready, geocoding (${lat.toFixed(4)}, ${lng.toFixed(4)})...`);

        // Step 3: Reverse geocode
        let countryCode = null;
        let countryName = null;
        let debugLog = `GPS: ${lat.toFixed(4)},${lng.toFixed(4)}`;

        // 3a: Try Google Maps Geocoder
        if (window.google.maps.Geocoder) {
          try {
            const geocoder = new google.maps.Geocoder();
            const response = await geocoder.geocode({ location: { lat, lng } });
            const results = response?.results || response;
            debugLog += ` | 3a: ${results?.length || 0} results`;
            if (results?.length) {
              // Search all results for country component
              for (const result of results) {
                const types = (result.types || []).join(',');
                const comp = (result.address_components || []).find(c =>
                  (c.types || []).includes('country')
                );
                if (comp) {
                  countryCode = comp.short_name;
                  countryName = comp.long_name;
                  debugLog += ` → ${countryName}(${countryCode})`;
                  break;
                }
              }
              if (!countryCode) {
                // Show first result's types for debugging
                const firstTypes = results[0]?.types?.join(',') || 'none';
                const firstComps = (results[0]?.address_components || []).map(c => c.short_name).join('/');
                debugLog += ` noCountry types=${firstTypes} comps=${firstComps}`;
              }
            }
          } catch (geoErr) {
            debugLog += ` | 3a ERR: ${geoErr.message}`;
          }
        } else {
          debugLog += ' | 3a: no Geocoder class';
        }

        // 3b: REST API fallback
        if (!countryCode) {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
          if (!apiKey) {
            debugLog += ' | 3b: no API key';
          } else {
            try {
              const resp = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
              );
              const data = await resp.json();
              debugLog += ` | 3b: status=${data.status} ${data.results?.length || 0}results`;
              if (data.error_message) {
                debugLog += ` err=${data.error_message}`;
              }
              if (data.status === 'OK' && data.results?.length) {
                for (const result of data.results) {
                  const comp = (result.address_components || []).find(c =>
                    (c.types || []).includes('country')
                  );
                  if (comp) {
                    countryCode = comp.short_name;
                    countryName = comp.long_name;
                    debugLog += ` → ${countryName}(${countryCode})`;
                    break;
                  }
                }
              }
            } catch (restErr) {
              debugLog += ` | 3b ERR: ${restErr.message}`;
            }
          }
        }

        if (cancelled) return;

        // Step 4: Set country
        if (countryCode && emergencyData[countryCode]) {
          setDetectStatus(`OK: ${countryName} (${countryCode})`);
          setSelectedCountry({ name: countryName, code: countryCode, lat, lng });
        } else {
          setDetectStatus(debugLog);
        }
      } catch (err) {
        setDetectStatus(`FAIL: ${err.code ? 'GPS error code=' + err.code + ' ' : ''}${err.message || String(err)}`);
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, state.trips]);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.classList.add('sos-modal-visible');
    });
  }, []);

  const handleClose = () => {
    if (overlayRef.current) overlayRef.current.classList.remove('sos-modal-visible');
    setTimeout(onClose, 200);
  };

  // Get nationality from settings
  const nationality = state.settings?.nationality || null;

  // Build country list for manual picker
  const countryOptions = Object.entries(emergencyData)
    .map(([code, data]) => ({ code, name: data.country }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get all destination countries from all trips for quick switching
  const tripCountries = [];
  if (state.trips) {
    const seen = new Set();
    for (const trip of state.trips) {
      for (const dest of (trip.settings?.destinations || [])) {
        const code = getCountryCode(dest.country);
        if (code && !seen.has(code)) {
          seen.add(code);
          tripCountries.push({ name: dest.country, code, lat: dest.lat, lng: dest.lng });
        }
      }
    }
  }

  return (
    <>
      <style>{sosModalCSS}</style>
      <div ref={overlayRef} className="sos-modal-overlay" onClick={handleClose}>
        <div className="sos-modal-shell" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="sos-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#D32F2F' }}>sos</span>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#D32F2F' }}>Emergency</div>
                {selectedCountry && (
                  <button
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant, #666)',
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                    {selectedCountry.name}
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
                  </button>
                )}
                {!selectedCountry && (
                  <button
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                      fontSize: '0.78rem', fontWeight: 600, color: '#1565C0',
                      display: 'flex', alignItems: 'center', gap: '3px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_location</span>
                    Select country
                  </button>
                )}
              </div>
            </div>
            <button className="sos-close-btn" onClick={handleClose} aria-label="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Debug: GPS detection status */}
          {detectStatus && (
            <div style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.65rem',
              fontFamily: 'monospace',
              lineHeight: 1.4,
              color: detectStatus.startsWith('OK') ? '#2E7D32' : (detectStatus.includes('ERR') || detectStatus.includes('FAIL') ? '#D32F2F' : '#1565C0'),
              background: detectStatus.startsWith('OK') ? '#E8F5E9' : (detectStatus.includes('ERR') || detectStatus.includes('FAIL') ? '#FFEBEE' : '#E3F2FD'),
              borderBottom: '1px solid var(--md-sys-color-outline-variant, #e0e0e0)',
              wordBreak: 'break-all',
            }}>
              {detectStatus}
            </div>
          )}

          {/* Country picker dropdown */}
          {showCountryPicker && (
            <div className="sos-country-picker">
              {/* Quick access: trip destinations */}
              {tripCountries.length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant, #888)', textTransform: 'uppercase', padding: '0.4rem 0.75rem', letterSpacing: '0.04em' }}>
                    Trip Destinations
                  </div>
                  {tripCountries.map(c => (
                    <button
                      key={c.code}
                      className={`sos-country-option ${selectedCountry?.code === c.code ? 'active' : ''}`}
                      onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                    >
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{c.code}</span>
                    </button>
                  ))}
                  <div style={{ borderBottom: '1px solid var(--md-sys-color-outline-variant, #ddd)', margin: '0.3rem 0.75rem' }} />
                </>
              )}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant, #888)', textTransform: 'uppercase', padding: '0.4rem 0.75rem', letterSpacing: '0.04em' }}>
                All Countries
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {countryOptions.map(c => (
                  <button
                    key={c.code}
                    className={`sos-country-option ${selectedCountry?.code === c.code ? 'active' : ''}`}
                    onClick={() => { setSelectedCountry({ ...c, lat: null, lng: null }); setShowCountryPicker(false); }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="sos-tab-bar">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`sos-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                <span>{tab.labelZh}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="sos-modal-content">
            {activeTab === 'numbers' && (
              <EmergencyNumbers
                countryName={selectedCountry?.name}
                countryCode={selectedCountry?.code}
              />
            )}
            {activeTab === 'nearby' && (
              <EmergencyNearby
                position={null}
                fallbackLat={selectedCountry?.lat}
                fallbackLng={selectedCountry?.lng}
              />
            )}
            {activeTab === 'embassy' && (
              <EmergencyEmbassy
                countryName={selectedCountry?.name}
                countryCode={selectedCountry?.code}
                nationality={nationality}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── SOS Modal Scoped CSS ── */
const sosModalCSS = `
  .sos-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .sos-modal-overlay.sos-modal-visible {
    opacity: 1;
  }

  .sos-modal-shell {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    background: var(--md-sys-color-surface, #fff);
    border-radius: 1.5rem 1.5rem 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .sos-modal-visible .sos-modal-shell {
    transform: translateY(0);
  }

  /* Desktop: centered modal */
  @media (min-width: 769px) {
    .sos-modal-overlay {
      align-items: center;
    }
    .sos-modal-shell {
      border-radius: 1.5rem;
      max-height: 80vh;
      transform: translateY(16px) scale(0.97);
    }
    .sos-modal-visible .sos-modal-shell {
      transform: translateY(0) scale(1);
    }
  }

  .sos-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
  }

  .sos-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--md-sys-color-surface-container, #eee);
    color: var(--md-sys-color-on-surface-variant, #666);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .sos-close-btn:hover {
    background: #FFEBEE;
    color: #D32F2F;
  }

  .sos-country-picker {
    background: var(--md-sys-color-surface-container-low, #f5f5f5);
    border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
    padding: 0.5rem 0;
  }
  .sos-country-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 0.82rem;
    color: var(--md-sys-color-on-surface, #333);
    transition: background 0.15s;
    text-align: left;
  }
  .sos-country-option:hover {
    background: var(--md-sys-color-surface-container, #e8e8e8);
  }
  .sos-country-option.active {
    background: #FFEBEE;
    color: #D32F2F;
    font-weight: 700;
  }

  .sos-tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
  }
  .sos-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.7rem 0.5rem;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #888);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }
  .sos-tab:hover {
    color: var(--md-sys-color-on-surface, #333);
    background: var(--md-sys-color-surface-container-low, #f8f8f8);
  }
  .sos-tab.active {
    color: #D32F2F;
    border-bottom-color: #D32F2F;
  }

  .sos-modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.25rem 1.5rem;
  }
  .sos-modal-content::-webkit-scrollbar { width: 4px; }
  .sos-modal-content::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
`;
