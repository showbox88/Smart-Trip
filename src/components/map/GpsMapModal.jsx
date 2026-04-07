import { useEffect, useRef, useState } from 'react';

/**
 * GpsMapModal — Full-screen map showing user's current GPS location.
 * Used when Map tab is clicked outside of a trip context.
 */
export default function GpsMapModal({ onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const [status, setStatus] = useState('locating'); // locating | ready | error
  const [errorMsg, setErrorMsg] = useState('');

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.classList.add('gpsmap-visible');
    });
  }, []);

  const handleClose = () => {
    if (overlayRef.current) overlayRef.current.classList.remove('gpsmap-visible');
    setTimeout(onClose, 220);
  };

  useEffect(() => {
    let cancelled = false;

    const initMap = async (lat, lng) => {
      if (cancelled) return;

      // Wait for Google Maps to be ready
      const waitForMaps = () => new Promise((resolve) => {
        if (window.google?.maps) return resolve();
        const check = setInterval(() => {
          if (window.google?.maps) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 8000);
      });

      await waitForMaps();
      if (cancelled || !mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      mapInstanceRef.current = map;

      // Blue pulsing dot for current location
      new window.google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#1565C0',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        title: 'Your Location',
      });

      setStatus('ready');
    };

    const getLocation = async () => {
      try {
        // Try Capacitor Geolocation first
        let lat, lng;
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          await Geolocation.requestPermissions();
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback to browser geolocation
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 12000, maximumAge: 60000,
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
        if (!cancelled) await initMap(lat, lng);
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          if (err.code === 1) setErrorMsg('Location permission denied');
          else if (err.code === 3) setErrorMsg('GPS timeout — try again');
          else setErrorMsg('Unable to get location');
        }
      }
    };

    getLocation();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <style>{gpsMapCSS}</style>
      <div ref={overlayRef} className="gpsmap-overlay">
        {/* Header */}
        <div className="gpsmap-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#1565C0' }}>my_location</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>My Location</span>
          </div>
          <button className="gpsmap-close" onClick={handleClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Map container */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Locating overlay */}
          {status === 'locating' && (
            <div className="gpsmap-status-overlay">
              <span className="material-symbols-outlined gpsmap-spin" style={{ fontSize: 36, color: '#1565C0' }}>
                my_location
              </span>
              <p style={{ margin: '0.75rem 0 0', fontWeight: 600 }}>Locating...</p>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className="gpsmap-status-overlay">
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#D32F2F', opacity: 0.6 }}>
                location_off
              </span>
              <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {errorMsg}
              </p>
              <button
                onClick={() => { setStatus('locating'); setErrorMsg(''); }}
                style={{
                  marginTop: '0.75rem', padding: '0.5rem 1.25rem',
                  background: '#1565C0', color: '#fff', border: 'none',
                  borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const gpsMapCSS = `
  .gpsmap-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    background: var(--md-sys-color-surface, #fff);
    opacity: 0;
    transform: translateY(100%);
    transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1);
  }
  .gpsmap-overlay.gpsmap-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .gpsmap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
    flex-shrink: 0;
  }
  .gpsmap-close {
    width: 32px; height: 32px; border-radius: 50%;
    border: none;
    background: var(--md-sys-color-surface-container, #eee);
    color: var(--md-sys-color-on-surface-variant, #666);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .gpsmap-close:hover { background: #FFEBEE; color: #D32F2F; }
  .gpsmap-status-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: var(--md-sys-color-surface, #fff);
    color: var(--md-sys-color-on-surface-variant, #666);
  }
  @keyframes gpsmap-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.15); }
  }
  .gpsmap-spin {
    animation: gpsmap-pulse 1.4s ease-in-out infinite;
  }
`;
