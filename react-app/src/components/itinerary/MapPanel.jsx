import { useEffect, useRef, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import MapInfoPanel from './MapInfoPanel';
import MapSearchBox from './MapSearchBox';

const MAPS_API_KEY = 'AIzaSyCmUAhTA7jDkeC4A3R3BtF8QyiNOr0uD8k';

async function fetchRoutePolyline(routePath) {
  try {
    const origin = routePath[0];
    const dest = routePath[routePath.length - 1];
    const intermediates = routePath.slice(1, -1).map(p => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } }
    }));
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        intermediates: intermediates.slice(0, 25),
        travelMode: 'DRIVE',
      }),
    });
    const data = await res.json();
    if (!data.routes?.[0]?.polyline?.encodedPolyline) return null;
    return google.maps.geometry.encoding.decodePath(data.routes[0].polyline.encodedPolyline);
  } catch (err) {
    console.error('[MapPanel] fetchRoutePolyline failed:', err);
    return null;
  }
}

export default function MapPanel({ onAddToDay }) {
  const { state } = useApp();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const hasInitialFitRef = useRef(null); // stores tripId
  const [mapReady, setMapReady] = useState(!!window.googleMapsReady);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const mapClickListenerRef = useRef(null);

  const activeTrip = useMemo(() => {
    return state.trips.find(t => t.id === state.activeTripId);
  }, [state.trips, state.activeTripId]);

  // Subscribe to global readiness
  useEffect(() => {
    if (window.googleMapsReady) {
      setMapReady(true);
      return;
    }

    const checkReady = () => {
      if (window.googleMapsReady) {
        setMapReady(true);
      } else {
        requestAnimationFrame(checkReady);
      }
    };

    // Also set a global dispatcher for faster updates
    window._dispatchGoogleMapsReady = () => setMapReady(true);

    checkReady();
  }, []);

  // Initialize Map Instance + click listener
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 35.6895, lng: 139.6917 },
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    // Click on map POI → show info panel
    mapClickListenerRef.current = mapInstanceRef.current.addListener('click', (e) => {
      if (e.placeId) {
        e.stop();
        setSelectedPlaceId(e.placeId);
      } else {
        setSelectedPlaceId(null);
      }
    });
  }, [mapReady]);

  // Handle Dark Mode
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.style.filter = darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
  }, [darkMode]);

  // Render Markers and Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !activeTrip) return;

    // Clear old elements
    markersRef.current.forEach(m => m.map = null);
    markersRef.current = [];
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    // Build stay map for connection logic
    const staysMap = new Map();
    activeTrip.days.forEach(day => {
      day.stops.forEach(stop => {
        if (stop.stayId) {
          if (!staysMap.has(stop.stayId)) {
            staysMap.set(stop.stayId, { id: stop.stayId, cin: null, cout: null });
          }
          const stay = staysMap.get(stop.stayId);
          if (stop.type === 'hotel_checkin') stay.cin = { ...stop, dayId: day.id };
          if (stop.type === 'hotel_checkout') stay.cout = { ...stop, dayId: day.id };
        }
      });
    });

    const dayIndexMap = new Map(activeTrip.days.map((d, i) => [d.id, i]));

    activeTrip.days.forEach(day => {
      const dayColor = day.color || '#5b7a99';
      const routePath = [];

      // 1. Hotel Connection Logic (Prepend)
      const dIdx = dayIndexMap.get(day.id);
      const dayStay = Array.from(staysMap.values()).find(s => {
        if (!s.cin || !s.cout) return false;
        const cinIdx = dayIndexMap.get(s.cin.dayId);
        const coutIdx = dayIndexMap.get(s.cout.dayId);
        return cinIdx !== undefined && coutIdx !== undefined && dIdx >= cinIdx && dIdx <= coutIdx;
      });

      if (dayStay && dayStay.cin.lat && (dayStay.cin.dayId !== day.id || dayStay.cout.dayId === day.id)) {
        // Skip prepend if first stop IS the hotel
        const firstStop = day.stops[0];
        if (!(firstStop && (firstStop.type === 'hotel_checkin' || firstStop.type === 'hotel_checkout'))) {
          routePath.push({ lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) });
        }
      }

      let locationIdx = 0;
      day.stops.forEach(stop => {
        const isLoc = !stop.type || stop.type === 'location';
        const isHotel = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';

        if ((isLoc || isHotel) && stop.lat && stop.lng) {
          const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
          if (isNaN(pos.lat) || isNaN(pos.lng)) return;

          routePath.push(pos);
          bounds.extend(pos);
          hasCoords = true;

          // Create Marker
          const markerColor = isHotel ? '#f97316' : dayColor;
          const label = isHotel ? '🏨' : (locationIdx + 1);
          if (isLoc) locationIdx++;

          const content = document.createElement('div');
          content.className = 'custom-marker';
          content.style.cssText = `
            width: 32px; height: 40px;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            transition: transform 0.2s;
          `;
          content.innerHTML = `
            <svg width="32" height="40" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="${markerColor}" stroke="white" stroke-width="2"/>
              <circle cx="18" cy="18" r="10" fill="#1a2235" opacity="0.9"/>
              <text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="900" font-family="Arial">${label}</text>
            </svg>
          `;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: pos,
            title: stop.location,
            content: content,
          });

          // Store ID for hover sync
          marker.stopId = stop.id;

          // Click marker → open info panel for that place
          const stopPlaceId = stop.placeId;
          if (stopPlaceId) {
            marker.addEventListener('gmp-click', () => setSelectedPlaceId(stopPlaceId));
            content.onclick = (e) => { e.stopPropagation(); setSelectedPlaceId(stopPlaceId); };
          }

          markersRef.current.push(marker);
        }
      });

      // 2. Hotel Connection Logic (Append)
      if (dayStay && day.showReturnRoute && dayStay.cin.lat) {
        const lastStop = day.stops[day.stops.length - 1];
        if (!(lastStop && (lastStop.type === 'hotel_checkin' || lastStop.type === 'hotel_checkout'))) {
          routePath.push({ lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) });
        }
      }

      // Draw route: fetch encoded polyline from Routes API, fall back to straight line
      if (routePath.length >= 2) {
        const color = dayColor;
        const mapInst = mapInstanceRef.current;
        // Straight-line fallback immediately
        const fallbackPoly = new google.maps.Polyline({
          path: routePath,
          strokeColor: color,
          strokeOpacity: 0.35,
          strokeWeight: 3,
          strokeDash: [4, 4],
          map: mapInst,
        });
        polylinesRef.current.push(fallbackPoly);

        // Async: replace with real route polyline
        (async () => {
          try {
            const decodedPath = await fetchRoutePolyline(routePath, color);
            if (!decodedPath || !mapInstanceRef.current) return;
            fallbackPoly.setMap(null);
            const realPoly = new google.maps.Polyline({
              path: decodedPath,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: mapInstanceRef.current,
            });
            polylinesRef.current.push(realPoly);
          } catch (_) { /* keep fallback */ }
        })();
      }
    });

    if (hasCoords) {
      const shouldFit = hasInitialFitRef.current !== activeTrip.id;
      if (shouldFit) {
        mapInstanceRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
        hasInitialFitRef.current = activeTrip.id;
        if (markersRef.current.length === 1) {
          setTimeout(() => mapInstanceRef.current.setZoom(15), 100);
        }
      }
    }
  }, [activeTrip, mapReady, t]);

  // Handle Hover Synchronization
  useEffect(() => {
    if (!mapReady) return;
    markersRef.current.forEach(marker => {
      const content = marker.content;
      if (!content) return;
      
      const isHovered = marker.stopId === state.hoveredStopId;
      if (isHovered) {
        content.style.transform = 'scale(1.2) translateY(-4px)';
        content.style.zIndex = '1000';
        content.querySelector('path')?.setAttribute('stroke-width', '4');
      } else {
        content.style.transform = 'scale(1)';
        content.style.zIndex = 'auto';
        content.querySelector('path')?.setAttribute('stroke-width', '2');
      }
    });
  }, [state.hoveredStopId, mapReady]);

  return (
    <section className="map-view">
      <div
        className="map-placeholder"
        id="mock-map-container"
        style={{ position: 'relative', overflow: 'hidden', background: '#eaebd8', width: '100%', height: '100%' }}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {mapReady && mapInstanceRef.current && (
          <MapSearchBox 
            mapInstance={mapInstanceRef.current} 
            onPlaceSelect={(id) => setSelectedPlaceId(id)}
          />
        )}
        
        {mapReady && (
          <button
            id="map-dark-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? t('map.toggle_day') : t('map.toggle_night')}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        )}

        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', zIndex: 10 }}>
            <div style={{ textAlign: 'center', color: '#666', opacity: 0.5 }}>
              <span style={{ fontSize: '3rem' }}>🗺️</span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('common.loading') || 'Loading Maps...'}</p>
            </div>
          </div>
        )}

        {selectedPlaceId && (
          <MapInfoPanel 
            placeId={selectedPlaceId} 
            onClose={() => setSelectedPlaceId(null)}
            onAddToDay={onAddToDay}
          />
        )}
      </div>
    </section>
  );
}
