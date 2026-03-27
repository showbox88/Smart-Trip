import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import MapInfoPanel from './MapInfoPanel';
import MapSearchBox from './MapSearchBox';
import NearbyCheckinPanel from './NearbyCheckinPanel';
import { getTripStayMap, isHotelStop } from '../../utils/stayHelpers';

const TRAVEL_MODE_MAP = { 'DRIVE': 'DRIVING', 'WALK': 'WALKING' };

async function fetchAndDrawRoute(routePath, color, mapInstance, travelMode = 'DRIVE') {
  try {
    if (typeof google === 'undefined') return [];
    const { Route } = await google.maps.importLibrary('routes');
    const origin = routePath[0];
    const dest = routePath[routePath.length - 1];
    const intermediates = routePath.slice(1, -1).slice(0, 25).map(p => ({
      location: new google.maps.LatLng(Number(p.lat), Number(p.lng))
    }));

    const googleMode = TRAVEL_MODE_MAP[travelMode] || 'DRIVING';

    const { routes } = await Route.computeRoutes({
      origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
      destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
      travelMode: googleMode,
      intermediates,
      fields: ['path'],
    });

    if (!routes?.[0]) return [];

    const isWalk = travelMode === 'WALK';
    const polylines = routes[0].createPolylines();
    polylines.forEach(p => {
      p.setOptions({
        strokeColor: color,
        strokeOpacity: isWalk ? 0 : 0.8,
        strokeWeight: isWalk ? 3 : 4,
        ...(isWalk ? {
          icons: [{
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 },
            offset: '0',
            repeat: '12px',
          }],
        } : {}),
      });
      p.setMap(mapInstance);
    });
    return polylines;
  } catch (err) {
    console.warn('[MapPanel] Routes API failed:', err?.message || err);
    return [];
  }
}

const MapPanel = forwardRef(function MapPanel({ onAddToDay, focusDayIds = [], isDayMode = false, dayId = null, existingPlaceIds = [] }, ref) {
  const { state } = useApp();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const markerMapRef = useRef(new Map()); // stopId → marker for O(1) lookup
  const categoryMarkersRef = useRef([]);
  const polylinesRef = useRef([]);
  const prevHoveredRef = useRef(null); // track previous hovered stopId
  const prevFocusDayIdsRef = useRef([]); // track previous focusDayIds to avoid redundant fitBounds
  const [mapReady, setMapReady] = useState(!!window.googleMapsReady);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const selectedPlaceIdRef = useRef(null);
  const lastCloseTimeRef = useRef(0);
  const mapClickListenerRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const locationAccuracyRef = useRef(null);
  const locationDotRef = useRef(null);
  const [locating, setLocating] = useState(false);
  const renderDebounceRef = useRef(null);
  const [gpsToast, setGpsToast] = useState(null);
  const [showLocPrompt, setShowLocPrompt] = useState(false);
  // v2 day mode
  const [userLocation, setUserLocation] = useState(null);       // { lat, lng }
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);

  useEffect(() => {
    selectedPlaceIdRef.current = selectedPlaceId;
  }, [selectedPlaceId]);

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

    const isMobile = window.innerWidth < 768;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 35.6895, lng: 139.6917 },
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
      zoomControl: !isMobile,
      gestureHandling: 'greedy',
    });

    // Click on map POI → show info panel
    mapClickListenerRef.current = mapInstanceRef.current.addListener('click', (e) => {
      if (e.placeId) {
        e.stop();
        setSelectedPlaceId(e.placeId);
      } else {
        if (selectedPlaceIdRef.current) {
          // Just close info panel on map click
          setSelectedPlaceId(null);
          lastCloseTimeRef.current = Date.now();
        } else {
          // Ignore ghost clicks right after closing
          if (Date.now() - lastCloseTimeRef.current < 500) return;
          
          setSelectedPlaceId(null);
          // 移除点击地图空白处清空大头针的逻辑，防止误点导致坐标消失
        }
      }
    });
  }, [mapReady]);

  // Handle Dark Mode
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.style.filter = darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
    // Counter-invert the location dot so it stays blue regardless of dark mode
    if (locationDotRef.current) {
      locationDotRef.current.style.filter = darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
  }, [darkMode]);

  // 地址换行辅助函数 (用于 Google Maps Tooltip HTML 拼串)
  const formatAddressHTML = (addr) => {
    if (!addr) return '';
    if (addr.includes(',')) {
      const idx = addr.indexOf(',');
      return `<div style="color:white; font-weight:700;">${addr.substring(0, idx).trim()}</div>
              <div style="font-size:11px; opacity:0.6; margin-top:2px;">${addr.substring(idx + 1).trim()}</div>`;
    }
    const splitMatch = addr.match(/(.*?[省市区县])(.*)/);
    if (splitMatch) {
      return `<div style="color:white; font-weight:700;">${splitMatch[1]}</div>
              <div style="font-size:11px; opacity:0.6; margin-top:2px;">${splitMatch[2]}</div>`;
    }
    return addr;
  };

  // Render Markers and Routes
  useEffect(() => {
    if (renderDebounceRef.current) clearTimeout(renderDebounceRef.current);
    if (!mapInstanceRef.current || !activeTrip) return;

    renderDebounceRef.current = setTimeout(() => {

    // Snapshot old elements — will be cleared AFTER new ones are drawn to avoid flash
    const oldMarkers = markersRef.current.slice();
    const oldPolylines = polylinesRef.current.slice();
    markersRef.current = [];
    markerMapRef.current = new Map();
    polylinesRef.current = [];

    // 如果没有展开的天（全部折叠），清除所有标记和路线，直接返回
    if (!focusDayIds || focusDayIds.length === 0) {
      requestAnimationFrame(() => {
        oldMarkers.forEach(m => m.map = null);
        oldPolylines.forEach(p => p.setMap(null));
      });
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    let hasCoords = false;

    const staysMap = getTripStayMap(activeTrip);

    const dayIndexMap = new Map(activeTrip.days.map((d, i) => [d.id, i]));
    const routeJobs = [];

    // 只渲染 focusDayIds 对应的天
    const daysToRender = activeTrip.days.filter(day => (focusDayIds || []).includes(day.id));
    daysToRender.forEach(day => {
      const dayColor = day.color || '#5b7a99';
      // routePath entries: { lat, lng, transitMode } — transitMode = mode FROM this point TO the next
      const routePath = [];

      // 1. Hotel Connection Logic (Prepend)
      const dIdx = dayIndexMap.get(day.id);
      const dayStay = Array.from(staysMap.values()).find((stay) => {
        if (!stay.checkinStop || !stay.checkoutStop) return false;
        const cinIdx = dayIndexMap.get(stay.checkinStop._dayId);
        const coutIdx = dayIndexMap.get(stay.checkoutStop._dayId);
        return cinIdx !== undefined && coutIdx !== undefined && dIdx >= cinIdx && dIdx <= coutIdx;
      });

      if (
        dayStay &&
        dayStay.checkinStop?.lat &&
        (dayStay.checkinStop._dayId !== day.id || dayStay.checkoutStop?._dayId === day.id)
      ) {
        // Skip prepend if first stop IS the hotel
        const firstStop = day.stops[0];
        if (!(firstStop && isHotelStop(firstStop))) {
          const cin = dayStay.checkinStop;
          const cout = dayStay.checkoutStop;
          const firstPlainStop = day.stops.find(s => !isHotelStop(s) && s.type !== 'note' && s.type !== 'list' && s.lat && s.lng);
          const hotelToFirstMode = firstPlainStop?.transitModeFromHotel || 'DRIVE';
          const hotelPos = { lat: Number(cin.lat), lng: Number(cin.lng), transitMode: hotelToFirstMode };
          routePath.push(hotelPos);
          bounds.extend(hotelPos);
          hasCoords = true;

          // Build ambient hotel marker for days departing from this hotel
          const hContent = document.createElement('div');
          hContent.className = 'custom-marker';
          hContent.style.cssText = 'width:36px;height:44px;cursor:pointer;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);transform-origin:bottom center;position:relative;opacity:0.82;';
          hContent.innerHTML = `<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6));"><path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="#f97316" stroke="white" stroke-width="2"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="18" font-weight="900" font-family="Arial,sans-serif">H</text></svg>`;

          const hTooltip = document.createElement('div');
          hTooltip.style.cssText = [
            'position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);',
            'background:rgba(20,24,38,0.97);border-radius:14px;overflow:hidden;',
            'padding:0;pointer-events:none;white-space:nowrap;',
            'box-shadow:0 10px 40px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,box-shadow 0.2s;',
            'font-family:inherit;min-width:340px;border:1px solid rgba(255,255,255,0.1);display:flex;z-index:3000;',
            darkMode ? 'filter:invert(100%) hue-rotate(180deg);' : '',
          ].join('');

          let hNights = '';
          if (cin._dayDate && cout?._dayDate) {
            const d1 = new Date(cin._dayDate.replace(/-/g, '/'));
            const d2 = new Date(cout._dayDate.replace(/-/g, '/'));
            if (!isNaN(d1) && !isNaN(d2)) hNights = Math.round((d2 - d1) / 86400000);
          } else if (cin && cout) {
            hNights = (dayIndexMap.get(cout._dayId) ?? 0) - (dayIndexMap.get(cin._dayId) ?? 0);
          }
          const fmtDate = (raw) => { if (!raw) return ''; const d = new Date(raw.replace(/-/g, '/')); return isNaN(d) ? raw : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
          const cinDateStr = fmtDate(cin._dayDate || cin.date || '');
          const cinTimeStr = cin.time ? `${cin.time}${cin.period ? ' ' + cin.period : ''}` : '';
          const coutDateStr = fmtDate(cout?._dayDate || cout?.date || '');
          const coutTimeStr = cout?.time ? `${cout.time}${cout.period ? ' ' + cout.period : ''}` : '';
          const hRating = cin.rating || '';
          const hPrice = cin.price && parseFloat(cin.price) > 0 ? `$${parseFloat(cin.price).toFixed(2)}` : '$0.00';
          const hName = (cin.location || '').length > 36 ? cin.location.slice(0, 36) + '…' : (cin.location || '');

          hTooltip.innerHTML = `
            <div style="flex:1;padding:16px 16px 14px;display:flex;flex-direction:column;gap:10px;min-width:200px;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span style="font-size:15px;font-weight:800;color:white;flex:1;overflow:hidden;text-overflow:ellipsis;">${hName}</span>
                  <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.08);border-radius:6px;padding:2px 8px;flex-shrink:0;">
                    <span class="material-symbols-outlined" style="font-size:13px;color:rgba(255,255,255,0.6);">bed</span>
                    <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.04em;">Stay</span>
                    ${hRating ? `<span style="color:#f59e0b;font-size:12px;margin-left:4px;">★</span><span style="color:white;font-weight:700;font-size:12px;">${hRating}</span>` : ''}
                  </div>
                </div>
                ${cinDateStr ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12.5px;"><span class="material-symbols-outlined" style="font-size:14px;color:#22c55e;">login</span><span style="color:rgba(255,255,255,0.5);width:72px;font-weight:600;">Check-in:</span><span style="color:rgba(255,255,255,0.85);font-weight:600;">${cinDateStr}</span>${cinTimeStr ? `<span style="color:#22c55e;font-weight:700;margin-left:auto;">${cinTimeStr}</span>` : ''}</div>` : ''}
                ${coutDateStr ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12.5px;"><span class="material-symbols-outlined" style="font-size:14px;color:#ef4444;">logout</span><span style="color:rgba(255,255,255,0.5);width:72px;font-weight:600;">Check-out:</span><span style="color:rgba(255,255,255,0.85);font-weight:600;">${coutDateStr}</span>${coutTimeStr ? `<span style="color:#ef4444;font-weight:700;margin-left:auto;">${coutTimeStr}</span>` : ''}</div>` : ''}
                ${cin.address ? `<div style="display:flex;gap:6px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.3;margin-bottom:4px;"><span class="material-symbols-outlined" style="font-size:14px;color:#f97316;margin-top:1px;flex-shrink:0;">location_on</span><div style="white-space:normal;overflow:hidden;">${formatAddressHTML(cin.address)}</div></div>` : ''}
              </div>
              <div style="display:flex;gap:8px;margin-top:2px;">
                ${hNights !== '' ? `<div style="background:#f59e0b;color:#1a1200;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;">${hNights} Night${hNights !== 1 ? 's' : ''}</div>` : ''}
                <div style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#22c55e;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;">${hPrice}</div>
              </div>
            </div>
            ${cin.photo ? `<div style="width:130px;align-self:stretch;flex-shrink:0;overflow:hidden;"><img src="${cin.photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.display='none'"/></div>` : ''}
          `;

          hContent.appendChild(hTooltip);
          hContent.addEventListener('mouseenter', () => { hTooltip.style.opacity = '1'; hContent.style.transform = 'scale(1.25) translateY(-4px)'; hContent.style.opacity = '1'; hMarker.zIndex = 9999; });
          hContent.addEventListener('mouseleave', () => { hTooltip.style.opacity = '0'; hContent.style.transform = 'scale(1) translateY(0)'; hContent.style.opacity = '0.82'; hMarker.zIndex = null; });

          const hMarker = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: hotelPos,
            title: cin.location,
            content: hContent,
          });
          if (cin.placeId) {
            hMarker.addEventListener('gmp-click', () => setSelectedPlaceId(cin.placeId));
            hContent.onclick = (e) => { e.stopPropagation(); setSelectedPlaceId(cin.placeId); };
          }
          markersRef.current.push(hMarker);
        }
      }

      let locationIdx = 0;
      day.stops.forEach(stop => {
        const isLoc = !stop.type || stop.type === 'location';
        const isHotel = isHotelStop(stop);

        if ((isLoc || isHotel) && stop.lat && stop.lng) {
          const pos = { lat: Number(stop.lat), lng: Number(stop.lng), transitMode: stop.transitMode || 'DRIVE' };
          if (isNaN(pos.lat) || isNaN(pos.lng)) return;

          routePath.push(pos);
          bounds.extend(pos);
          hasCoords = true;

          // Create Marker
          const markerColor = isHotel ? '#f97316' : dayColor;
          const label = isHotel ? 'H' : (locationIdx + 1);
          if (isLoc) locationIdx++;

          const content = document.createElement('div');
          content.className = 'custom-marker';

          if (isHotel) {
            content.style.cssText = `
              width: 36px; height: 44px;
              cursor: pointer;
              transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
              transform-origin: bottom center;
              position: relative;
            `;
            content.innerHTML = `
              <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.6));">
                <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="#f97316" stroke="white" stroke-width="2"/>
                <text x="18" y="24" text-anchor="middle" fill="white" font-size="18" font-weight="900" font-family="Arial,sans-serif">H</text>
              </svg>
            `;
          } else {
            content.style.cssText = `
              width: 32px; height: 40px;
              cursor: pointer;
              transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
              transform-origin: bottom center;
              position: relative;
            `;
            content.innerHTML = `
              <svg width="32" height="40" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="${markerColor}" stroke="white" stroke-width="2"/>
                <circle cx="18" cy="18" r="10" fill="#1a2235" opacity="0.9"/>
                <text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="900" font-family="Arial">${label}</text>
              </svg>
            `;
          }

          // Premium Hover tooltip
          const tooltip = document.createElement('div');
          const maxName = stop.location?.length > 36 ? stop.location.slice(0, 36) + '…' : (stop.location || '');
          const catLabel = stop.category ? (t(stop.category) !== stop.category ? t(stop.category) : stop.category) : t('map.place_default');

          tooltip.style.cssText = [
            'position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);',
            'background:rgba(20,24,38,0.97);border-radius:14px;overflow:hidden;',
            'padding:0;pointer-events:none;white-space:nowrap;',
            'box-shadow:0 10px 40px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,box-shadow 0.2s;',
            'font-family:inherit;min-width:340px;border:1px solid rgba(255,255,255,0.1);',
            'display:flex;z-index:3000;',
            darkMode ? 'filter:invert(100%) hue-rotate(180deg);' : '',
          ].join('');

          let tooltipHtml;

          if (isHotel && stop.stayId) {
            // Find stay info
            const stay = staysMap.get(stop.stayId);
            const cin = stay?.checkinStop;
            const cout = stay?.checkoutStop;

            // Compute nights
            let nights = '';
            if (cin?._dayDate && cout?._dayDate) {
              const d1 = new Date(cin._dayDate.replace(/-/g, '/'));
              const d2 = new Date(cout._dayDate.replace(/-/g, '/'));
              if (!isNaN(d1) && !isNaN(d2)) nights = Math.round((d2 - d1) / 86400000);
            } else if (cin && cout) {
              // Estimate from day indices
              const cinIdx = dayIndexMap.get(cin._dayId) ?? 0;
              const coutIdx = dayIndexMap.get(cout._dayId) ?? 0;
              nights = coutIdx - cinIdx;
            }

            const rawCinDate = cin?._dayDate || cin?.date || '';
            const cinDateStr = rawCinDate ? (() => { const d = new Date(rawCinDate.replace(/-/g, '/')); return isNaN(d) ? rawCinDate : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : '';
            const cinTimeStr = cin?.time ? `${cin.time}${cin.period ? ' ' + cin.period : ''}` : '';
            const rawCoutDate = cout?._dayDate || cout?.date || '';
            const coutDateStr = rawCoutDate ? (() => { const d = new Date(rawCoutDate.replace(/-/g, '/')); return isNaN(d) ? rawCoutDate : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : '';
            const coutTimeStr = cout?.time ? `${cout.time}${cout.period ? ' ' + cout.period : ''}` : '';
            const rating = stop.rating || '';
            const phone = stop.phone || '';
            const price = stop.price && parseFloat(stop.price) > 0 ? `$${parseFloat(stop.price).toFixed(2)}` : '$0.00';

            tooltipHtml = `
              <div style="flex:1; padding:16px 16px 14px; display:flex; flex-direction:column; gap:10px; min-width:200px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:15px; font-weight:800; color:white; flex:1; overflow:hidden; text-overflow:ellipsis;">${maxName}</span>
                    <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.08); border-radius:6px; padding:2px 8px; flex-shrink:0;">
                      <span class="material-symbols-outlined" style="font-size:13px; color:rgba(255,255,255,0.6);">bed</span>
                      <span style="font-size:11px; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.04em;">Stay</span>
                      ${rating ? `<span style="color:#f59e0b; font-size:12px; margin-left:4px;">★</span><span style="color:white; font-weight:700; font-size:12px;">${rating}</span>` : ''}
                    </div>
                  </div>
                  ${cinDateStr ? `
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; font-size:12.5px;">
                    <span class="material-symbols-outlined" style="font-size:14px; color:#22c55e;">login</span>
                    <span style="color:rgba(255,255,255,0.5); width:72px; font-weight:600;">Check-in:</span>
                    <span style="color:rgba(255,255,255,0.85); font-weight:600;">${cinDateStr}</span>
                    ${cinTimeStr ? `<span style="color:#22c55e; font-weight:700; margin-left:auto;">${cinTimeStr}</span>` : ''}
                  </div>` : ''}
                  ${coutDateStr ? `
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:12.5px;">
                    <span class="material-symbols-outlined" style="font-size:14px; color:#ef4444;">logout</span>
                    <span style="color:rgba(255,255,255,0.5); width:72px; font-weight:600;">Check-out:</span>
                    <span style="color:rgba(255,255,255,0.85); font-weight:600;">${coutDateStr}</span>
                    ${coutTimeStr ? `<span style="color:#ef4444; font-weight:700; margin-left:auto;">${coutTimeStr}</span>` : ''}
                  </div>` : ''}
                  ${stop.address ? `
                  <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.3; margin-bottom:4px;">
                    <span class="material-symbols-outlined" style="font-size:14px; color:#f97316; margin-top:1px; flex-shrink:0;">location_on</span>
                    <div style="white-space:normal; overflow:hidden;">${formatAddressHTML(stop.address)}</div>
                  </div>` : ''}
                  ${phone ? `
                  <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.4;">
                    <span class="material-symbols-outlined" style="font-size:14px; color:#3b82f6; flex-shrink:0;">call</span>
                    <span>${phone}</span>
                  </div>` : ''}
                </div>
                <div style="display:flex; gap:8px; margin-top:2px;">
                  ${nights !== '' ? `<div style="background:#f59e0b; color:#1a1200; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:700;">${nights} Night${nights !== 1 ? 's' : ''}</div>` : ''}
                  <div style="background:rgba(34,197,94,0.15); border:1px solid rgba(34,197,94,0.3); color:#22c55e; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:700;">${price}</div>
                </div>
              </div>
            `;
          } else {
            const rating = stop.rating || '';
            const phone = stop.phone || '';
            
            tooltipHtml = `
              <div style="flex:1; padding:16px 16px 14px; display:flex; flex-direction:column; gap:10px; min-width:220px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:15px; font-weight:800; color:white; flex:1; overflow:hidden; text-overflow:ellipsis;">${maxName}</span>
                    <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.08); border-radius:6px; padding:2px 8px; flex-shrink:0;">
                      <span class="material-symbols-outlined" style="font-size:13px; color:rgba(255,255,255,0.6);">${stop.categoryIcon || 'place'}</span>
                      <span style="font-size:11px; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.04em;">${catLabel}</span>
                      ${rating ? `<span style="color:#f59e0b; font-size:12px; margin-left:4px;">★</span><span style="color:white; font-weight:700; font-size:12px;">${rating}</span>` : ''}
                    </div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.3;">
                      <span class="material-symbols-outlined" style="font-size:14px; color:#f97316; margin-top:1px; flex-shrink:0;">location_on</span>
                      <div style="white-space:normal; overflow:hidden;">${formatAddressHTML(stop.address || stop.location || '')}</div>
                    </div>
                    ${phone ? `
                    <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.4;">
                      <span class="material-symbols-outlined" style="font-size:14px; color:#3b82f6; flex-shrink:0;">call</span>
                      <span>${phone}</span>
                    </div>` : ''}
                  </div>
                </div>
                ${stop.time ? `
                <div style="background:rgba(255,255,255,0.12); color:white; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:800; width:fit-content;">
                  ${stop.time} ${stop.period || ''}
                </div>` : ''}
              </div>
            `;
          }

          if (stop.photo) {
            tooltipHtml += `
              <div style="width:${isHotel ? '130px' : '110px'}; align-self:stretch; flex-shrink:0; overflow:hidden; ${isHotel ? '' : 'border-radius:0 12px 12px 0;'}">
                <img src="${stop.photo}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'" />
              </div>
            `;
          }

          tooltip.innerHTML = tooltipHtml;
          content.appendChild(tooltip);

          content.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateX(-50%) scale(1)';
            content.style.transform = 'scale(1.25) translateY(-4px)';
            marker.zIndex = 9999;
          });
          content.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateX(-50%) scale(0.95)';
            content.style.transform = 'scale(1) translateY(0)';
            marker.zIndex = null;
          });

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: pos,
            title: stop.location,
            content: content,
          });

          // Store ID for hover sync
          marker.stopId = stop.id;
          marker.stopPlaceId = stop.placeId || null;

          // Click marker → open info panel for that place
          const stopPlaceId = stop.placeId;
          if (stopPlaceId) {
            marker.addEventListener('gmp-click', () => setSelectedPlaceId(stopPlaceId));
            content.onclick = (e) => { e.stopPropagation(); setSelectedPlaceId(stopPlaceId); };
          }

          markersRef.current.push(marker);
          if (stop.id) markerMapRef.current.set(stop.id, marker);
        }
      });

      // 2. Hotel Connection Logic (Append)
      if (dayStay && day.showReturnRoute && dayStay.checkinStop?.lat) {
        const lastStop = day.stops[day.stops.length - 1];
        if (!(lastStop && isHotelStop(lastStop))) {
          routePath.push({ lat: Number(dayStay.checkinStop.lat), lng: Number(dayStay.checkinStop.lng) });
        }
      }

      // Draw route: split routePath into segments by transitMode, draw each separately
      if (routePath.length >= 2) {
        const color = dayColor;
        const mapInst = mapInstanceRef.current;

        // Split routePath into segments where each segment has a uniform transitMode.
        // Edge i→i+1 uses routePath[i].transitMode (the departure point's mode).
        // Segments share boundary points so polylines connect without gaps.
        const segments = [];
        let segStart = 0;
        for (let i = 0; i < routePath.length - 1; i++) {
          const curMode = routePath[i].transitMode || 'DRIVE';
          const nextMode = i + 1 < routePath.length - 1 ? (routePath[i + 1].transitMode || 'DRIVE') : null;
          // Close segment when the next edge has a different mode, or we've reached the last edge
          if (nextMode !== curMode || i === routePath.length - 2) {
            segments.push({ path: routePath.slice(segStart, i + 2), mode: curMode });
            segStart = i + 1;
          }
        }

        // Collect async jobs — old polylines cleared after ALL days resolve
        routeJobs.push((async () => {
          try {
            for (const seg of segments) {
              if (seg.path.length < 2) continue;
              const realPolylines = await fetchAndDrawRoute(seg.path, color, mapInst, seg.mode);
              if (realPolylines.length > 0 && mapInstanceRef.current) {
                polylinesRef.current.push(...realPolylines);
              } else {
                const isWalk = seg.mode === 'WALK';
                const fallbackPoly = new google.maps.Polyline({
                  path: seg.path,
                  strokeColor: color,
                  strokeOpacity: isWalk ? 0.6 : 0.35,
                  strokeWeight: isWalk ? 2 : 3,
                  map: mapInst,
                  ...(isWalk ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '12px' }] } : {}),
                });
                polylinesRef.current.push(fallbackPoly);
              }
            }
          } catch (err) {
            console.warn('[MapPanel] route fetch failed:', err);
          }
        })());
      }
    });

    // Remove old markers on next animation frame so new ones are already painted
    requestAnimationFrame(() => {
      oldMarkers.forEach(m => m.map = null);
    });

    // Remove old polylines only after all new routes are drawn
    Promise.all(routeJobs).then(() => {
      oldPolylines.forEach(p => p.setMap(null));
    });

    if (hasCoords) {
      // 每次切换展开天时都自动 fit 视野
      // BUG FIX: 如果当前正处于选中某个地点的详情状态，或者 focusDayIds 引用变化但内容没变，不要强制 fitBounds
      const prevIds = prevFocusDayIdsRef.current || [];
      const currentIds = focusDayIds || [];
      const idsChanged = prevIds.length !== currentIds.length || prevIds.some((id, i) => id !== currentIds[i]);
      
      if (!selectedPlaceId && idsChanged) {
        mapInstanceRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
        if (markersRef.current.length === 1) {
          setTimeout(() => mapInstanceRef.current.setZoom(15), 100);
        }
      }
      prevFocusDayIdsRef.current = currentIds;
    }
    }, 100); // debounce — batch rapid successive updates into one render
    return () => clearTimeout(renderDebounceRef.current);
  }, [activeTrip, focusDayIds, mapReady, t, darkMode]);

  // Handle Hover Synchronization — O(1) via markerMapRef
  useEffect(() => {
    if (!mapReady) return;
    const prev = prevHoveredRef.current;
    const next = state.hoveredStopId;
    if (prev === next) return;

    // Un-hover previous
    if (prev) {
      const marker = markerMapRef.current.get(prev);
      const content = marker?.content;
      if (content) {
        content.style.transform = 'scale(1)';
        content.style.zIndex = 'auto';
        content.querySelector('path')?.setAttribute('stroke-width', '2');
      }
    }
    // Hover next
    if (next) {
      const marker = markerMapRef.current.get(next);
      const content = marker?.content;
      if (content) {
        content.style.transform = 'scale(1.2) translateY(-4px)';
        content.style.zIndex = '1000';
        content.querySelector('path')?.setAttribute('stroke-width', '4');
      }
    }
    prevHoveredRef.current = next;
  }, [state.hoveredStopId, mapReady]);

  // Expose focusStop method via ref (no state change = no re-render = no flash)
  const focusStop = useCallback((stopId) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markerMapRef.current.get(stopId) || markersRef.current.find(m => m.stopId === stopId);
    if (!marker?.position) return;

    const pos = marker.position;
    const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
    const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;

    map.panTo({ lat, lng });

    // BUG FIX: Offset the center by ~150px downwards so the marker moves UP
    // This ensures it appears in the top visible half of the map, above the info panel (350px+).
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panBy(0, 160); 
      }
    }, 50);

    const currentZoom = map.getZoom();
    const targetZoom = 16;
    if (currentZoom < targetZoom) {
      let zoom = currentZoom;
      const smoothZoom = () => {
        if (!mapInstanceRef.current) return;
        if (zoom >= targetZoom) return;
        zoom = Math.min(zoom + 0.8, targetZoom);
        mapInstanceRef.current.setZoom(zoom);
        requestAnimationFrame(smoothZoom);
      };
      setTimeout(smoothZoom, 350);
    }

    // Pulse marker
    const content = marker.content;
    if (content) {
      content.style.transition = 'transform 0.3s ease';
      content.style.transform = 'scale(1.4) translateY(-6px)';
      content.style.zIndex = '1000';
      setTimeout(() => {
        content.style.transform = 'scale(1)';
        content.style.zIndex = 'auto';
      }, 1000);
    }
  }, []);

  const focusAndOpen = useCallback((stopId) => {
    focusStop(stopId);
    const marker = markersRef.current.find(m => m.stopId === stopId);
    if (marker?.stopPlaceId) {
      setSelectedPlaceId(marker.stopPlaceId);
    }
  }, [focusStop]);

  const handleCategoryResults = useCallback((results, icon = 'place') => {
    // Clear previous category markers
    categoryMarkersRef.current.forEach(m => m.map = null);
    categoryMarkersRef.current = [];

    if (!results?.length || !mapInstanceRef.current) return;

    results.forEach(place => {
      if (!place.geometry?.location) return;

      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);transform-origin:bottom center;';

      const pin = document.createElement('div');
      pin.style.cssText = [
        'width:36px;height:36px;background:#f97316;',
        'border-radius:50% 50% 50% 0;transform:rotate(-45deg);',
        'border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.5);',
        'display:flex;align-items:center;justify-content:center;',
        'transition:transform 0.15s,box-shadow 0.15s;',
      ].join('');

      const iconEl = document.createElement('span');
      iconEl.className = 'material-symbols-outlined';
      iconEl.style.cssText = 'font-size:15px;color:white;transform:rotate(45deg);user-select:none;';
      iconEl.textContent = icon;

      pin.appendChild(iconEl);
      content.appendChild(pin);

      // Premium Hover Tooltip (Light Glass)
      const maxName = place.name?.length > 32 ? place.name.slice(0, 32) + '…' : (place.name || '');
      const photo = place.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 150 });
      
      const label = document.createElement('div');
      label.style.cssText = [
        'position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%) scale(0.95);',
        'background:rgba(20,24,38,0.97);border-radius:12px;overflow:hidden;',
        'padding:14px 16px;pointer-events:none;white-space:nowrap;',
        'box-shadow:0 10px 40px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,transform 0.2s;',
        'font-family:inherit;min-width:300px;border:1px solid rgba(255,255,255,0.1);',
        'display:flex;gap:16px;z-index:3000;transform-origin:bottom center;',
        darkMode ? 'filter:invert(100%) hue-rotate(180deg);' : '',
      ].join('');

      let tooltipHtml = `
        <div style="flex:1; padding:16px 16px 14px; display:flex; flex-direction:column; gap:10px; min-width:220px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span style="font-size:15px; font-weight:800; color:white; flex:1; overflow:hidden; text-overflow:ellipsis;">${maxName}</span>
              ${place.rating ? `
              <div style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.08); border-radius:6px; padding:2px 8px; flex-shrink:0;">
                <span style="color:#f59e0b; font-size:12px;">★</span>
                <span style="color:white; font-weight:700; font-size:12px;">${place.rating}</span>
                <span style="color:rgba(255,255,255,0.45); font-size:11px;">(${place.user_ratings_total || 0})</span>
              </div>` : ''}
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.3;">
                <span class="material-symbols-outlined" style="font-size:14px; color:#f97316; margin-top:1px; flex-shrink:0;">location_on</span>
                <div style="white-space:normal; overflow:hidden;">${formatAddressHTML(place.formatted_address || place.vicinity || '')}</div>
              </div>
              ${place.international_phone_number || place.national_phone_number ? `
              <div style="display:flex; gap:6px; color:rgba(255,255,255,0.55); font-size:12px; line-height:1.4;">
                <span class="material-symbols-outlined" style="font-size:14px; color:#3b82f6; flex-shrink:0;">call</span>
                <span>${place.international_phone_number || place.national_phone_number}</span>
              </div>` : ''}
            </div>
          </div>
        </div>
      `;

      if (photo) {
        tooltipHtml += `
          <div style="width:100px; height:75px; border-radius:10px; overflow:hidden; flex-shrink:0;">
            <img src="${photo}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'" />
          </div>
        `;
      }

      label.innerHTML = tooltipHtml;
      content.style.position = 'relative';
      content.appendChild(label);

      content.onmouseenter = () => {
        content.style.transform = 'scale(1.25) translateY(-4px)';
        pin.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
        label.style.opacity = '1';
        label.style.transform = 'translateX(-50%) scale(1)';
        marker.zIndex = 9999;
      };
      content.onmouseleave = () => {
        content.style.transform = 'scale(1) translateY(0)';
        pin.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        label.style.opacity = '0';
        label.style.transform = 'translateX(-50%) scale(0.95)';
        marker.zIndex = null;
      };

      const placeId = place.place_id;
      content.onclick = (e) => {
        e.stopPropagation();
        setSelectedPlaceId(placeId);
      };

      let marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: place.geometry.location,
        title: place.name,
        content,
      });
      marker.addEventListener('gmp-click', (e) => {
        e.stop?.();
        setSelectedPlaceId(placeId);
      });
      categoryMarkersRef.current.push(marker);
    });
  }, [darkMode]);

  useImperativeHandle(ref, () => ({ focusStop, focusAndOpen }), [focusStop, focusAndOpen]);

  const showGpsToast = useCallback((type, msg) => {
    setGpsToast({ type, msg });
    setTimeout(() => setGpsToast(null), 4000);
  }, []);

  const placeLocationMarker = useCallback(async (lat, lng, accuracy) => {
    const latlng = { lat, lng };

    // Remove previous marker / circle
    if (locationMarkerRef.current) {
      locationMarkerRef.current.map = null;
      locationMarkerRef.current = null;
    }
    if (locationAccuracyRef.current) {
      locationAccuracyRef.current.setMap(null);
      locationAccuracyRef.current = null;
    }

    // Blue dot — use mix-blend-mode so dark-mode CSS filter doesn't invert it
    const dot = document.createElement('div');
    dot.style.cssText = `
      width:20px;height:20px;border-radius:50%;
      background:#4285f4;border:3px solid white;
      box-shadow:0 2px 8px rgba(66,133,244,0.7);
      position:relative;
    `;
    // Counter-invert so dark mode doesn't flip the dot color
    dot.style.filter = darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    locationDotRef.current = dot;

    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:20px;height:20px;border-radius:50%;
      background:rgba(66,133,244,0.4);
      animation:gps-pulse 1.8s ease-out infinite;
    `;
    dot.appendChild(pulse);

    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    locationMarkerRef.current = new AdvancedMarkerElement({
      map: mapInstanceRef.current,
      position: latlng,
      content: dot,
      title: 'My Location',
      zIndex: 9999,
    });

    if (accuracy < 5000) {
      locationAccuracyRef.current = new google.maps.Circle({
        map: mapInstanceRef.current,
        center: latlng,
        radius: accuracy,
        strokeColor: '#4285f4',
        strokeOpacity: 0.25,
        strokeWeight: 1,
        fillColor: '#4285f4',
        fillOpacity: 0.07,
      });
    }

    mapInstanceRef.current.panTo(latlng);
    mapInstanceRef.current.setZoom(16);
  }, [darkMode]);

  const doGeolocate = useCallback(() => {
    setLocating(true);
    // Force high accuracy on mobile, as low accuracy Wi-Fi lookup can hang
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await placeLocationMarker(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        } catch (err) {
          console.error('[GPS] placement error:', err);
          showGpsToast('error', '无法在地图上标记位置');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        console.warn('[GPS] code', err.code, err.message);
        const msgs = {
          1: '位置权限被拒绝，请在浏览器或系统设置中允许',
          2: '无法获取位置，请检查设备定位是否已开启',
          3: '定位超时，请移至开阔地带重试',
        };
        showGpsToast('error', msgs[err.code] || '定位失败，请稍后再试');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [placeLocationMarker, showGpsToast]);

  // isDayMode: 地图 ready 后自动定位，并记录 userLocation 用于打卡面板
  useEffect(() => {
    if (!isDayMode || !mapReady || !mapInstanceRef.current) return;

    const autoLocate = async () => {
      if (!navigator.geolocation) return;
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

      try {
        const perm = navigator.permissions ? await navigator.permissions.query({ name: 'geolocation' }) : null;
        const state = perm?.state;

        const doLocate = () => {
          setLocating(true);
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                await placeLocationMarker(lat, lng, accuracy);
                setUserLocation({ lat, lng });
                setShowCheckinPanel(true);
              } catch (e) {
                console.warn('[MapPanel] autoLocate marker error:', e);
              } finally {
                setLocating(false);
              }
            },
            (err) => {
              setLocating(false);
              console.warn('[MapPanel] autoLocate error:', err.code);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        };

        if (state === 'granted') {
          doLocate();
        } else if (state !== 'denied') {
          // 显示自定义提示，用户允许后定位并展示打卡面板
          setShowLocPrompt(true);
        }
      } catch {
        // permissions API 不支持，直接尝试
        setShowLocPrompt(true);
      }
    };

    autoLocate();
  }, [isDayMode, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocate = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    // Reject HTTP connections (unless localhost) for geolocation
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      showGpsToast('error', '定位功能需要 HTTPS 连接或本地环境');
      return;
    }

    if (!navigator.geolocation) {
      showGpsToast('error', '当前浏览器不支持定位功能');
      return;
    }

    // Re-center if marker already placed
    if (locationMarkerRef.current) {
      const pos = locationMarkerRef.current.position;
      mapInstanceRef.current.panTo(pos);
      mapInstanceRef.current.setZoom(16);
      return;
    }

    // Check existing permission state — skip prompt if already granted or explicitly denied
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'granted') {
          doGeolocate();
          return;
        } else if (perm.state === 'denied') {
          showGpsToast('error', '定位已被拒绝，请到浏览器设置中开启');
          return;
        }
      }
    } catch { /* browser doesn't support permissions API */ }

    // Show custom prompt before triggering browser dialog
    setShowLocPrompt(true);
  }, [doGeolocate, showGpsToast]);

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
            onCategoryResults={(results, icon) => handleCategoryResults(results, icon)}
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

        {mapReady && (
          <button
            id="map-gps-btn"
            onClick={handleLocate}
            title="我的位置"
            className={locating ? 'locating' : ''}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
              {locating ? 'gps_not_fixed' : 'my_location'}
            </span>
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

        {gpsToast && (
          <div style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: gpsToast.type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(66,133,244,0.92)',
            color: 'white', padding: '10px 18px', borderRadius: '24px',
            fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 2001, display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'gps-toast-in 0.25s ease',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
              {gpsToast.type === 'error' ? 'location_off' : 'my_location'}
            </span>
            {gpsToast.msg}
          </div>
        )}

        {showLocPrompt && (
          <div
            className="modal-overlay active"
            onClick={() => setShowLocPrompt(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: 'rgba(18,24,38,0.97)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '28px 24px 20px',
                width: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(66,133,244,0.15)',
                border: '1.5px solid rgba(66,133,244,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4285f4' }}>
                  my_location
                </span>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
                  Smart Trip 想要访问<br />您的位置
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  位置信息将用于在地图上标记您的当前所在地，不会被储存或分享。
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    setShowLocPrompt(false);
                    if (isDayMode) {
                      // 定位后同时记录坐标用于打卡面板
                      setLocating(true);
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          try {
                            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                            await placeLocationMarker(lat, lng, accuracy);
                            setUserLocation({ lat, lng });
                            setShowCheckinPanel(true);
                          } finally {
                            setLocating(false);
                          }
                        },
                        () => setLocating(false),
                        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                      );
                    } else {
                      doGeolocate();
                    }
                  }}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '12px',
                    background: '#4285f4', border: 'none', color: 'white',
                    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  允许
                </button>
                <button
                  onClick={() => setShowLocPrompt(false)}
                  style={{
                    width: '100%', padding: '11px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  不允许
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedPlaceId && (
          <MapInfoPanel
            placeId={selectedPlaceId}
            onClose={() => {
              setSelectedPlaceId(null);
              lastCloseTimeRef.current = Date.now();
            }}
            onAddToDay={onAddToDay}
          />
        )}

        {/* 打卡面板：isDayMode 且已定位时显示 */}
        {isDayMode && showCheckinPanel && userLocation && mapInstanceRef.current && (
          <NearbyCheckinPanel
            mapInstance={mapInstanceRef.current}
            userLocation={userLocation}
            existingPlaceIds={existingPlaceIds}
            onAddPlace={async (placeId) => {
              if (dayId) await onAddToDay?.(dayId, placeId, true); // true = useNow，记录实时打卡时间
            }}
            onClose={() => setShowCheckinPanel(false)}
          />
        )}
      </div>
    </section>
  );
});

export default MapPanel;
