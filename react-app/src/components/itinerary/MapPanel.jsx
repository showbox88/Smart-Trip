import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import MapInfoPanel from './MapInfoPanel';
import MapSearchBox from './MapSearchBox';

async function fetchAndDrawRoute(routePath, color, mapInstance) {
  try {
    if (typeof google === 'undefined') return [];
    const { Route } = await google.maps.importLibrary('routes');
    const origin = routePath[0];
    const dest = routePath[routePath.length - 1];
    const intermediates = routePath.slice(1, -1).slice(0, 25).map(p => ({
      location: new google.maps.LatLng(Number(p.lat), Number(p.lng))
    }));

    const { routes } = await Route.computeRoutes({
      origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
      destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
      travelMode: 'DRIVING',
      intermediates,
      fields: ['path'],
    });

    if (!routes?.[0]) return [];

    const polylines = routes[0].createPolylines();
    polylines.forEach(p => {
      p.setOptions({ strokeColor: color, strokeOpacity: 0.8, strokeWeight: 4 });
      p.setMap(mapInstance);
    });
    return polylines;
  } catch (err) {
    console.warn('[MapPanel] Routes API failed:', err?.message || err);
    return [];
  }
}

const MapPanel = forwardRef(function MapPanel({ onAddToDay, focusDayIds = [] }, ref) {
  const { state } = useApp();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const markerMapRef = useRef(new Map()); // stopId → marker for O(1) lookup
  const categoryMarkersRef = useRef([]);
  const polylinesRef = useRef([]);
  const hasInitialFitRef = useRef(null); // stores tripId
  const prevHoveredRef = useRef(null); // track previous hovered stopId
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
        categoryMarkersRef.current.forEach(m => m.map = null);
        categoryMarkersRef.current = [];
      }
    });
  }, [mapReady]);

  // Handle Dark Mode
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.style.filter = darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
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
    if (!mapInstanceRef.current || !activeTrip) return;

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

    // Build stay map for connection logic
    const staysMap = new Map();
    activeTrip.days.forEach(day => {
      day.stops.forEach(stop => {
        if (stop.stayId) {
          if (!staysMap.has(stop.stayId)) {
            staysMap.set(stop.stayId, { id: stop.stayId, cin: null, cout: null });
          }
          const stay = staysMap.get(stop.stayId);
          if (stop.type === 'hotel_checkin') stay.cin = { ...stop, dayId: day.id, _dayDate: day.date || '' };
          if (stop.type === 'hotel_checkout') stay.cout = { ...stop, dayId: day.id, _dayDate: day.date || '' };
        }
      });
    });

    const dayIndexMap = new Map(activeTrip.days.map((d, i) => [d.id, i]));
    const routeJobs = [];

    // 只渲染 focusDayIds 对应的天
    const daysToRender = activeTrip.days.filter(day => (focusDayIds || []).includes(day.id));
    daysToRender.forEach(day => {
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
            const cin = stay?.cin;
            const cout = stay?.cout;

            // Compute nights
            let nights = '';
            if (cin?._dayDate && cout?._dayDate) {
              const d1 = new Date(cin._dayDate.replace(/-/g, '/'));
              const d2 = new Date(cout._dayDate.replace(/-/g, '/'));
              if (!isNaN(d1) && !isNaN(d2)) nights = Math.round((d2 - d1) / 86400000);
            } else if (cin && cout) {
              // Estimate from day indices
              const cinIdx = dayIndexMap.get(cin.dayId) ?? 0;
              const coutIdx = dayIndexMap.get(cout.dayId) ?? 0;
              nights = coutIdx - cinIdx;
            }

            const cinDateStr = cin?._dayDate || cin?.date || '';
            const cinTimeStr = cin?.time ? `${cin.time}${cin.period ? ' ' + cin.period : ''}` : '';
            const coutDateStr = cout?._dayDate || cout?.date || '';
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
            tooltipHtml = `
              <div style="flex:1; padding:14px 16px; display:flex; flex-direction:column; justify-content:space-between; min-width:180px;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:12px;">
                    <span style="font-size:15px; font-weight:800; color:white; overflow:hidden; text-overflow:ellipsis;">${maxName}</span>
                    <div style="display:flex; align-items:center; gap:4px; color:rgba(255,255,255,0.55); font-size:12px; font-weight:600;">
                      <span class="material-symbols-outlined" style="font-size:14px">${stop.categoryIcon || 'place'}</span>
                      <span>${catLabel}</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:6px; color:rgba(255,255,255,0.6); font-size:12.5px; line-height:1.3;">
                    <span class="material-symbols-outlined" style="font-size:15px; color:#f97316; margin-top:1px;">location_on</span>
                    <div style="white-space:normal; overflow:hidden;">${formatAddressHTML(stop.address || stop.location || '')}</div>
                  </div>
                </div>
                ${stop.time ? `
                <div style="margin-top:12px; background:rgba(255,255,255,0.12); color:white; padding:4px 12px; border-radius:8px; font-size:12px; font-weight:800; width:fit-content;">
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
      if (dayStay && day.showReturnRoute && dayStay.cin.lat) {
        const lastStop = day.stops[day.stops.length - 1];
        if (!(lastStop && (lastStop.type === 'hotel_checkin' || lastStop.type === 'hotel_checkout'))) {
          routePath.push({ lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) });
        }
      }

      // Draw route: fetch real route from Routes API, fall back to straight line
      if (routePath.length >= 2) {
        const color = dayColor;
        const mapInst = mapInstanceRef.current;

        // Collect async jobs — old polylines cleared after ALL days resolve
        routeJobs.push((async () => {
          try {
            const realPolylines = await fetchAndDrawRoute(routePath, color, mapInst);
            if (realPolylines.length > 0 && mapInstanceRef.current) {
              polylinesRef.current.push(...realPolylines);
            } else {
              const fallbackPoly = new google.maps.Polyline({
                path: routePath,
                strokeColor: color,
                strokeOpacity: 0.35,
                strokeWeight: 3,
                map: mapInst,
              });
              polylinesRef.current.push(fallbackPoly);
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
      mapInstanceRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      if (markersRef.current.length === 1) {
        setTimeout(() => mapInstanceRef.current.setZoom(15), 100);
      }
    }
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

    const currentZoom = map.getZoom();
    const targetZoom = 16;
    if (currentZoom < targetZoom) {
      let zoom = currentZoom;
      const smoothZoom = () => {
        if (zoom >= targetZoom) return;
        zoom = Math.min(zoom + 0.5, targetZoom);
        map.setZoom(zoom);
        requestAnimationFrame(smoothZoom);
      };
      setTimeout(smoothZoom, 300);
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
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; min-width:160px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
              <span style="font-size:15px; font-weight:800; color:white; overflow:hidden; text-overflow:ellipsis;">${maxName}</span>
            </div>
            <div style="display:flex; gap:6px; color:rgba(255,255,255,0.6); font-size:12px; line-height:1.3;">
              <span class="material-symbols-outlined" style="font-size:15px; color:#f97316; margin-top:1px;">location_on</span>
              <div style="white-space:normal; overflow:hidden;">${formatAddressHTML(place.formatted_address || place.vicinity || '')}</div>
            </div>
          </div>
          ${place.rating ? `
          <div style="display:flex; align-items:center; gap:4px; margin-top:10px;">
            <span style="color:#f97316; font-size:14px;">★</span>
            <span style="color:white; font-weight:700; font-size:13px;">${place.rating}</span>
            <span style="color:rgba(255,255,255,0.45); font-size:12px;">(${place.user_ratings_total || 0})</span>
          </div>` : ''}
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
});

export default MapPanel;
