import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { getCountryCode } from '../../data/countryCodeMap';
import emergencyData from '../../data/emergencyNumbers.json';
import EmergencyNumbers from './EmergencyNumbers';
import EmergencyNearby from './EmergencyNearby';
import EmergencyEmbassy from './EmergencyEmbassy';

async function getPosition() {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    });
  }
}

const TAB_KEYS = [
  { key: 'numbers', icon: 'call',            i18nKey: 'emergency.tab_numbers' },
  { key: 'nearby',  icon: 'local_hospital',  i18nKey: 'emergency.tab_nearby'  },
  { key: 'embassy', icon: 'account_balance', i18nKey: 'emergency.tab_embassy' },
];

export default function EmergencyModal({ onClose }) {
  const { state } = useApp();
  const { t } = useI18n();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('numbers');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [detectStatus, setDetectStatus] = useState('');
  const [closing, setClosing] = useState(false);

  // Detect country from trip or GPS
  useEffect(() => {
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

    let cancelled = false;
    setDetectStatus('Locating...');

    (async () => {
      try {
        const { latitude: lat, longitude: lng } = await getPosition();
        if (cancelled) return;
        setDetectStatus('Detecting country...');
        const resp = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await resp.json();
        if (cancelled) return;
        const countryCode = data.countryCode;
        const countryName = data.countryName;
        if (countryCode && emergencyData[countryCode]) {
          setDetectStatus('');
          setSelectedCountry({ name: countryName, code: countryCode, lat, lng });
        } else {
          setDetectStatus(countryCode ? `${countryName} not in database` : 'Could not detect country');
        }
      } catch (err) {
        if (err.code === 1) setDetectStatus('GPS permission denied');
        else if (err.code === 3) setDetectStatus('GPS timeout');
        else setDetectStatus('GPS unavailable');
      }
    })();

    return () => { cancelled = true; };
  }, [location.pathname, state.trips]);

  const animateClose = (cb) => {
    setClosing(true);
    setTimeout(() => { cb?.(); onClose(); }, 260);
  };

  const nationality = state.settings?.nationality || null;

  const countryOptions = Object.entries(emergencyData)
    .map(([code, data]) => ({ code, name: data.country }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
      <style>{`
        @keyframes sosFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sosFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes sosSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes sosSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => animateClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          animation: closing ? 'sosFadeOut .25s ease forwards' : 'sosFadeIn .2s ease forwards',
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          width: '100%', maxWidth: 420, margin: '0 auto',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          background: '#F2F2F7',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
          zIndex: 9001,
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          animation: closing ? 'sosSlideDown .25s ease forwards' : 'sosSlideUp .3s cubic-bezier(.32,1.15,.6,1) forwards',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C7C7CC' }} />
        </div>

        {/* ═══ Header Card ═══ */}
        <div style={{
          margin: '0 16px 12px', padding: '14px 16px',
          background: '#fff', borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#FF3B30' }}>sos</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#FF3B30' }}>Emergency</div>
              {selectedCountry ? (
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#8E8E93',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                  {selectedCountry.name}
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#007AFF',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_location</span>
                  {t('emergency.select_country_label') || 'Select Country'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detection status */}
        {detectStatus && (
          <div style={{
            margin: '0 16px 8px', padding: '8px 14px', borderRadius: 12,
            background: '#fff', fontSize: 12, fontWeight: 500,
            color: detectStatus.includes('denied') || detectStatus.includes('unavailable') || detectStatus.includes('timeout')
              ? '#FF3B30' : '#007AFF',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {detectStatus.includes('denied') || detectStatus.includes('unavailable') ? 'error' : 'sync'}
            </span>
            {detectStatus}
          </div>
        )}

        {/* Country picker */}
        {showCountryPicker && (
          <div style={{
            margin: '0 16px 12px', background: '#fff', borderRadius: 16,
            overflow: 'hidden', maxHeight: 280, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            {tripCountries.length > 0 && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase',
                  padding: '12px 16px 6px', letterSpacing: 0.3,
                }}>
                  {t('emergency.trip_destinations') || 'Trip Destinations'}
                </div>
                {tripCountries.map(c => (
                  <button
                    key={c.code}
                    onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: selectedCountry?.code === c.code ? '#FFF5F5' : '#fff',
                      borderBottom: '0.5px solid #F2F2F7',
                      fontSize: 14, fontWeight: selectedCountry?.code === c.code ? 700 : 500,
                      color: selectedCountry?.code === c.code ? '#FF3B30' : '#1C1C1E',
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ fontSize: 12, color: '#8E8E93' }}>{c.code}</span>
                  </button>
                ))}
                <div style={{ height: 1, background: '#E5E5EA', margin: '0 16px' }} />
              </>
            )}
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase',
              padding: '12px 16px 6px', letterSpacing: 0.3,
            }}>
              {t('emergency.all_countries') || 'All Countries'}
            </div>
            {countryOptions.map(c => (
              <button
                key={c.code}
                onClick={() => { setSelectedCountry({ ...c, lat: null, lng: null }); setShowCountryPicker(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: selectedCountry?.code === c.code ? '#FFF5F5' : '#fff',
                  borderBottom: '0.5px solid #F2F2F7',
                  fontSize: 14, fontWeight: selectedCountry?.code === c.code ? 700 : 400,
                  color: selectedCountry?.code === c.code ? '#FF3B30' : '#1C1C1E',
                }}
              >
                <span>{c.name}</span>
                <span style={{ fontSize: 12, color: '#8E8E93' }}>{c.code}</span>
              </button>
            ))}
          </div>
        )}

        {/* ═══ Tab Bar ═══ */}
        <div style={{
          display: 'flex', margin: '0 16px 12px',
          background: '#fff', borderRadius: 12, padding: 3,
        }}>
          {TAB_KEYS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 5, padding: '10px 4px', border: 'none', cursor: 'pointer',
                  borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: isActive ? '#FF3B30' : 'transparent',
                  color: isActive ? '#fff' : '#8E8E93',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 2px 8px rgba(255,59,48,0.25)' : 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
                <span>{t(tab.i18nKey)}</span>
              </button>
            );
          })}
        </div>

        {/* ═══ Content ═══ */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          margin: '0 16px 16px', padding: '16px',
          background: '#fff', borderRadius: 16,
        }}>
          {activeTab === 'numbers' && (
            <EmergencyNumbers countryName={selectedCountry?.name} countryCode={selectedCountry?.code} />
          )}
          {activeTab === 'nearby' && (
            <EmergencyNearby position={null} fallbackLat={selectedCountry?.lat} fallbackLng={selectedCountry?.lng} />
          )}
          {activeTab === 'embassy' && (
            <EmergencyEmbassy countryName={selectedCountry?.name} countryCode={selectedCountry?.code} nationality={nationality} />
          )}
        </div>
      </div>
    </>
  );
}
