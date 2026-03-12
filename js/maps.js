import { state } from './state.js';
import { renderApp } from './ui/render.js';
import { formatDate, formatDistance, formatDuration, formatCurrency } from './utils.js';
import { t } from './ui/i18n.js';

const MAPS_API_KEY = 'AIzaSyCmUAhTA7jDkeC4A3R3BtF8QyiNOr0uD8k';

// --- Routes REST API helpers (replaces deprecated DirectionsService) ---
async function fetchRouteDuration(origin, dest, travelMode = 'DRIVE') {
    try {
        const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': MAPS_API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
                destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
                travelMode: travelMode
            })
        });
        const data = await res.json();
        if (!data.routes || !data.routes[0]) {
            console.warn('[routes] API returned no routes. Response:', JSON.stringify(data).slice(0, 300));
            return null;
        }
        const route = data.routes[0];
        // Routes v2 API returns duration as a string like "1234s" — strip the trailing 's'
        const durationStr = route.duration || '0s';
        const seconds = parseInt(durationStr.toString().replace(/[^0-9]/g, ''), 10);
        const meters = route.distanceMeters;

        return {
            duration: formatDuration(seconds),
            distance: formatDistance(meters),
            durationSeconds: seconds,
            distanceMeters: meters
        };
    } catch (err) {
        console.error('[routes] fetchRouteDuration failed:', err);
        return null;
    }
}

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
                'X-Goog-FieldMask': 'routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
                origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
                destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
                intermediates: intermediates.slice(0, 25),
                travelMode: 'DRIVE'
            })
        });
        const data = await res.json();
        if (!data.routes?.[0]?.polyline?.encodedPolyline) return null;
        return google.maps.geometry.encoding.decodePath(data.routes[0].polyline.encodedPolyline);
    } catch (err) {
        console.error('[routes] fetchRoutePolyline failed:', err);
        return null;
    }
}

export let googleMapInstance = null;
export let googleMapMarkers = [];
export let googleMapsReady = false;
let mapDarkMode = true;
let hoverInfoWindow = null;

function showMarkerHoverInfo(stop, marker, trip) {
    if (!googleMapInstance) return;
    const isHotel = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
    if (!hoverInfoWindow) {
        hoverInfoWindow = new google.maps.InfoWindow({
            disableAutoPan: true
        });
    }

    // Theme definition based on map mode
    const theme = mapDarkMode ? {
        bg: '#0d111b',       // Deep navy/black from address card
        title: '#ffffff',
        text: '#ffffff',
        muted: '#94a3b8',
        border: 'rgba(255,255,255,0.1)',
        // Chips
        timeBg: 'rgba(88, 80, 236, 0.15)',
        timeText: '#a5b4fc',
        priceBg: 'rgba(34, 197, 94, 0.15)',
        priceText: '#4ade80',
        accentBg: 'rgba(249, 115, 22, 0.15)',
        accentText: '#fb923c'
    } : {
        bg: '#ffffff',
        title: '#0f172a',
        text: '#334155',
        muted: '#64748b',
        border: '#f1f5f9',
        // Chips
        timeBg: '#f5f3ff',     // Light purple bg
        timeText: '#5b21b6',   // Deep purple text
        priceBg: '#f0fdf4',    // Light green bg
        priceText: '#15803d',  // Deep green text
        accentBg: '#fff7ed',   // Light orange bg
        accentText: '#c2410c'  // Deep orange text
    };

    // Calculate smart positioning
    let yOffset = -10; // Default: above
    try {
        const bounds = googleMapInstance.getBounds();
        const pos = marker.getPosition();
        if (bounds && pos) {
            const latRange = bounds.getNorthEast().lat() - bounds.getSouthWest().lat();
            const threshold = bounds.getNorthEast().lat() - (latRange * 0.4);
            if (pos.lat() > threshold) {
                yOffset = 50; // Below the marker
            }
        }
    } catch (e) { /* Silent catch */ }

    hoverInfoWindow.setOptions({
        pixelOffset: new google.maps.Size(0, yOffset),
        disableAutoPan: true
    });

    const reverseFilter = mapDarkMode ? 'filter: invert(1) hue-rotate(180deg);' : '';
    const displayType = stop.category ? t('dashboard.categories.' + stop.category) : (isHotel ? t('dashboard.categories.住宿') : t('dashboard.categories.地点'));
    
    // Choose icon based on type: comparison should be against raw data keys (Chinese)
    let categoryIcon = 'restaurant';
    if (isHotel) categoryIcon = 'hotel';
    else if (stop.category === '购物' || stop.category === 'Shopping') categoryIcon = 'shopping_bag';
    else if (stop.category === '景点' || stop.category === 'Attractions') categoryIcon = 'attractions';
    else if (stop.category === '餐饮' || stop.category === 'Dining') categoryIcon = 'restaurant';

    // Hotel logic: find pair and calculate stay
    let stayInfo = null;
    if (isHotel) {
        const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, day: d })));
        const cin = allStops.find(s => s.stayId === stop.stayId && s.type === 'hotel_checkin');
        const cout = allStops.find(s => s.stayId === stop.stayId && s.type === 'hotel_checkout');
        if (cin && cout) {
            const cinIdx = trip.days.findIndex(d => d.id === cin.day.id);
            const coutIdx = trip.days.findIndex(d => d.id === cout.day.id);
            stayInfo = {
                cin: { date: cin.day.date, time: cin.time },
                cout: { date: cout.day.date, time: cout.time },
                nights: Math.max(0, coutIdx - cinIdx),
                price: cin.price || stop.price || 0
            };
        }
    }

    // Dynamic Font Size for title to prevent pushing other elements
    const titleLength = stop.location.length;
    let titleFontSize = '1.4rem';
    if (titleLength > 18) titleFontSize = '1.1rem';
    else if (titleLength > 12) titleFontSize = '1.25rem';

    const popupHeight = isHotel ? '250px' : 'auto';
    let contentStr = `<div style="display: flex; width: 560px; min-height: 160px; height: ${popupHeight}; font-family: 'Plus Jakarta Sans', sans-serif; background: ${theme.bg}; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); overflow: hidden; ${reverseFilter}">`;

    // 1. Info Side (Left)
    contentStr += `
        <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; min-width: 0;">
            <!-- Header Row: Name + Category + Rating -->
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <div style="flex: 1; min-width: 0; font-weight: 800; font-size: ${titleFontSize}; color: ${theme.title}; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${stop.location}</div>
                <div style="display: flex; align-items: center; gap: 4px; color: ${theme.muted}; font-size: 0.85rem; flex-shrink: 0;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">${categoryIcon}</span>
                    <span style="font-weight: 500;">${displayType}</span>
                </div>
                ${stop.rating ? `<span style="font-size: 0.95rem; color: #f97316; font-weight: 800; flex-shrink: 0;">★ ${stop.rating}</span>` : ''}
            </div>

            ${isHotel && stayInfo ? `
                <!-- Hotel Details -->
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px; color: ${theme.text}; font-size: 0.9rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #6366f1;">login</span>
                        <span style="color: #ffffff; width: 90px; white-space: nowrap;">${t('map.checkin')}:</span>
                        <span style="font-weight: 600;"><span style="display: inline-block; width: 125px;">${formatDate(stayInfo.cin.date)}</span> <span style="color: #4ade80; font-size: 0.8rem;">${stayInfo.cin.time}</span></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #f43f5e;">logout</span>
                        <span style="color: #ffffff; width: 90px; white-space: nowrap;">${t('map.checkout')}:</span>
                        <span style="font-weight: 600;"><span style="display: inline-block; width: 125px;">${formatDate(stayInfo.cout.date)}</span> <span style="color: #f43f5e; font-size: 0.8rem;">${stayInfo.cout.time}</span></span>
                    </div>
                    ${stop.address ? `
                    <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 4px; border-top: 1px solid ${theme.border}; padding-top: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #f97316;">location_on</span>
                        <span style="opacity: 0.8; font-size: 0.85rem; line-height: 1.4;">${stop.address}</span>
                    </div>` : ''}
                </div>
            ` : `
                <!-- Address Line (Normal stop) -->
                ${stop.address ? `
                <div style="display: flex; align-items: flex-start; gap: 8px; margin-top: 8px; color: ${theme.text}; font-size: 0.9rem;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #f97316;">location_on</span>
                    <div style="line-height: 1.4; opacity: 0.9;">${stop.address}</div>
                </div>` : ''}
            `}

            <!-- Phone Line -->
            ${stop.phone ? `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; color: ${theme.text}; font-size: 0.9rem;">
                <span class="material-symbols-outlined" style="font-size: 18px; color: #f97316;">call</span>
                <span style="font-weight: 500; opacity: 0.9;">${stop.phone}</span>
            </div>` : ''}

            <!-- Bottom Row: Chips -->
            <div style="display: flex; gap: 10px; margin-top: auto; padding-top: 15px;">
                ${isHotel && stayInfo ? `
                    <div style="padding: 5px 14px; border-radius: 6px; background: ${theme.accentBg}; color: ${theme.accentText}; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center;">
                        ${stayInfo.nights} ${t('map.nights')}
                    </div>
                    <div style="padding: 5px 14px; border-radius: 6px; background: ${theme.priceBg}; color: ${theme.priceText}; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center;">
                        ${formatCurrency(parseFloat(stayInfo.price))}
                    </div>
                ` : `
                    <div style="padding: 5px 14px; border-radius: 6px; background: ${theme.timeBg}; color: ${theme.timeText}; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center;">
                        ${stop.time} ${stop.period === 'AM' ? t('common.am') : t('common.pm')}
                    </div>
                    ${stop.price && stop.price !== '0' ? `
                    <div style="padding: 5px 14px; border-radius: 6px; background: ${theme.priceBg}; color: ${theme.priceText}; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center;">
                        ${formatCurrency(parseFloat(stop.price))}
                    </div>` : ''}
                `}
            </div>
        </div>`;

    // 2. Image Side (Right Side - FULL FILL)
    if (stop.photo) {
        let photoUrl = stop.photo;
        if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('/') && !photoUrl.startsWith('./')) {
            photoUrl = '/uploads/' + photoUrl;
        }
        const finalPhoto = photoUrl || `https://picsum.photos/seed/${stop.id}/500/500`;

        contentStr += `
            <div style="width: 180px; height: 100%; flex-shrink: 0; overflow: hidden; position: relative;">
                <img src="${finalPhoto}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='https://picsum.photos/seed/${stop.id}/500/500'; this.onerror=null;">
                <!-- Subtle overlay to blend if needed -->
                <div style="position: absolute; inset: 0; background: linear-gradient(to right, rgba(0,0,0,0.1), transparent 20%); pointer-events: none;"></div>
            </div>`;
    }

    contentStr += `</div>`;

    contentStr += `</div>`;

    hoverInfoWindow.setContent(contentStr);
    hoverInfoWindow.open({
        anchor: marker,
        map: googleMapInstance,
        shouldFocus: false
    });
}

const DARK_STYLES = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export function setGoogleMapsReady(ready) {
    googleMapsReady = ready;
    window.googleMapsReady = ready;
}

export function toggleMapDarkMode() {
    mapDarkMode = !mapDarkMode;
    const mapDiv = document.getElementById('real-map');
    const btn = document.getElementById('map-dark-toggle');
    if (mapDiv) {
        mapDiv.style.filter = mapDarkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
    if (btn) {
        btn.innerText = mapDarkMode ? '☀️' : '🌙';
        btn.title = mapDarkMode ? t('map.toggle_day') : t('map.toggle_night');
    }
}

export function initRealMap() {
    const debugEl = document.getElementById('map-debug-status');
    if (!googleMapsReady || typeof google === 'undefined') return;

    const mapDiv = document.getElementById('real-map');
    if (!mapDiv) return;

    // Reset instance if div was recreated by a full render
    if (googleMapInstance && mapDiv.childElementCount === 0) {
        googleMapInstance = null;
    }

    if (!googleMapInstance) {
        googleMapInstance = new google.maps.Map(mapDiv, {
            center: { lat: 35.6895, lng: 139.6917 },
            zoom: 12,
            mapId: 'DEMO_MAP_ID',
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'greedy'
        });
    }

    // Apply dark mode overlay via CSS safely
    const targetFilter = mapDarkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    if (mapDiv.style.filter !== targetFilter) {
        mapDiv.style.filter = targetFilter;
    }

    if (window._mapRefreshing) return;
    window._mapRefreshing = true;

    requestAnimationFrame(() => {
        window._mapRefreshing = false;
        try {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            if (!trip) return;

            // Simple diffing: prevent full rebuild if nothing relevant changed
            const currentPinsCount = trip.days.reduce((acc, d) => acc + (d.stops ? d.stops.length : 0), 0);
            const collapsedKey = trip.days.map(d => (state.collapsedDays && state.collapsedDays[d.id] ? 'C' : 'E')).join('');
            const stateKey = `${trip.id}-${currentPinsCount}-${mapDarkMode}-${collapsedKey}`;
            
            if (window._lastMapStateKey === stateKey && googleMapMarkers.length > 0) {
                return;
            }
            window._lastMapStateKey = stateKey;

            // Clear old markers and polylines first
            if (googleMapMarkers) {
                googleMapMarkers.forEach(m => { if (m) m.map = null; });
            }
            googleMapMarkers = [];
            if (window._mapRouteRenderers) {
                window._mapRouteRenderers.forEach(r => { if (r) r.setMap(null); });
            }
            window._mapRouteRenderers = [];

            const bounds = new google.maps.LatLngBounds();
            let hasValidPins = false;
            let totalPins = 0;

        trip.days.forEach(day => {
            // Skip collapsed days
            if (state.collapsedDays && state.collapsedDays[day.id]) return;
            if (!day.stops) return;

            // --- Hotel Logic Detection for routePath ---
            const allStopsWithDays = trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id })));
            const staysMap = new Map();
            allStopsWithDays.forEach(s => {
                if (s.stayId) {
                    if (!staysMap.get(s.stayId)) staysMap.set(s.stayId, { id: s.stayId, cin: null, cout: null });
                    const stay = staysMap.get(s.stayId);
                    if (s.type === 'hotel_checkin') stay.cin = s;
                    if (s.type === 'hotel_checkout') stay.cout = s;
                }
            });

            const dIdx = trip.days.findIndex(d => d.id === day.id);
            const dayStay = Array.from(staysMap.values()).find(s => {
                if (!s.cin || !s.cout) return false;
                const cinIdx = trip.days.findIndex(d => d.id === s.cin.dayId);
                const coutIdx = trip.days.findIndex(d => d.id === s.cout.dayId);
                return dIdx >= cinIdx && dIdx <= coutIdx;
            });

            let pinCount = 0;
            const dayColor = day.color || '#5b7a99';
            const routePath = []; // collect ordered positions for this day's polyline

            // Get valid physical stops for this day
            const physicalStops = day.stops.filter(stop => {
                const isLocation = stop.type === 'location' || !stop.type;
                const isHotelType = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
                return (isLocation || isHotelType) && stop.location && stop.lat !== undefined && stop.lng !== undefined;
            });

            // 1. Prepend hotel if departing AND the first stop is NOT the hotel itself
            const isBetween = dayStay && dayStay.cin.dayId !== day.id && dayStay.cout.dayId !== day.id;
            const isCoutOnly = dayStay && dayStay.cout.dayId === day.id && dayStay.cin.dayId !== day.id;
            if ((isBetween || isCoutOnly) && dayStay.cin.lat !== undefined) {
                const hotelPos = { lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) };
                const firstPhysical = physicalStops[0];
                const isFirstPhysicalHotel = firstPhysical && (firstPhysical.type === 'hotel_checkin' || firstPhysical.type === 'hotel_checkout');

                if (!isFirstPhysicalHotel) {
                    routePath.push(hotelPos);
                }
            }

            day.stops.forEach((stop) => {
                const isLocation = stop.type === 'location' || !stop.type;
                const isHotelType = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';

                if (!isLocation && !isHotelType) return;
                if (!stop.location) return;

                if (isLocation) {
                    pinCount++;
                }
                totalPins++;

                if (stop.lat !== undefined && stop.lng !== undefined) {
                    const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
                    if (isNaN(pos.lat) || isNaN(pos.lng)) return;

                    const markerIcon = isHotelType ? 'H' : pinCount;
                    const markerColor = isHotelType ? '#f97316' : dayColor;
                    const iconColor = '#ffffff';

                    const markerContent = document.createElement('div');
                    markerContent.style.cssText = `
                        width: 36px; height: 44px;
                        cursor: pointer;
                        transition: transform 0.2s;
                        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
                        display: block;
                    `;
                    markerContent.innerHTML = `<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
                        <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="${markerColor}" stroke="white" stroke-width="1.5" opacity="0.95" style="pointer-events: auto;"/>
                        <circle cx="18" cy="18" r="11" fill="#1a2235" opacity="0.9" style="pointer-events: none;"/>
                        <text x="18" y="24" text-anchor="middle" fill="${iconColor}" font-size="15" font-weight="900" font-family="Arial, sans-serif" style="pointer-events: none;">${markerIcon}</text>
                    </svg>`;

                    markerContent.onmouseenter = () => {
                        markerContent.style.transform = 'scale(1.2) translateY(-4px)';
                        showMarkerHoverInfo(stop, marker, trip);
                    };
                    markerContent.onmouseleave = () => {
                        markerContent.style.transform = 'scale(1) translateY(0)';
                        if (hoverInfoWindow) hoverInfoWindow.close();
                    };

                    markerContent.onclick = (e) => {
                        e.stopPropagation();
                        if (stop.placeId) window._openPlacePanel(stop.placeId);
                        else window.openLocationInMapPanel(stop.location, stop.lat, stop.lng);
                    };

                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        position: pos,
                        map: googleMapInstance,
                        title: stop.location,
                        content: markerContent
                    });

                    marker.addEventListener('gmp-click', () => {
                        if (stop.placeId) window._openPlacePanel(stop.placeId);
                        else window.openLocationInMapPanel(stop.location, stop.lat, stop.lng);
                    });

                    googleMapMarkers.push(marker);
                    bounds.extend(pos);
                    routePath.push(pos);
                    hasValidPins = true;
                }
            });

            // 2. Append hotel if returning AND the last stop is NOT the hotel itself
            // NEW: Only if showReturnRoute is enabled
            const isCinOnly = dayStay && dayStay.cin.dayId === day.id && dayStay.cout.dayId !== day.id;
            const isSameDayStay = dayStay && dayStay.cin.dayId === day.id && dayStay.cout.dayId === day.id;
            if ((isBetween || isCinOnly || isSameDayStay) && dayStay.cin.lat !== undefined && day.showReturnRoute) {
                const hotelPos = { lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) };
                const lastPhysical = physicalStops[physicalStops.length - 1];
                const isLastPhysicalHotel = lastPhysical && (lastPhysical.type === 'hotel_checkin' || lastPhysical.type === 'hotel_checkout');

                if (!isLastPhysicalHotel) {
                    routePath.push(hotelPos);
                }
            }

            // Draw driving route via Routes REST API specifically for this day
            if (routePath.length >= 2) {
                console.log(`[maps] Fetching route for day ${day.id} with ${routePath.length} points.`);
                fetchRoutePolyline(routePath).then(path => {
                    if (!path) {
                        console.warn(`[maps] No path returned for day ${day.id}`);
                        return;
                    }
                    console.log(`[maps] Rendering polyline for day ${day.id}, color: ${dayColor}`);
                    const polyline = new google.maps.Polyline({
                        path: path,
                        strokeColor: dayColor,
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                        map: googleMapInstance
                    });

                    if (!window._mapRouteRenderers) window._mapRouteRenderers = [];
                    window._mapRouteRenderers.push(polyline);
                }).catch(err => {
                    console.error(`[maps] Route fetch error for day ${day.id}:`, err);
                });
            } else {
                console.log(`[maps] Day ${day.id} has ${routePath.length} points, skipping route (needs >= 2).`);
            }
        });

        if (hasValidPins) {
            googleMapInstance.fitBounds(bounds);
            if (debugEl) debugEl.innerText = t('map.status_ready').replace('{count}', totalPins);
            if (googleMapMarkers.length === 1) {
                setTimeout(() => { if (googleMapInstance) googleMapInstance.setZoom(15); }, 200);
            }
        } else {
            if (debugEl) debugEl.innerText = t('map.status_ready').replace('{count}', 0);
        }

        // --- Custom Search Control Injection ---
        initMapSearchControl(googleMapInstance);

        // Map click → show place info panel
        googleMapInstance.addListener('click', async (e) => {
            if (!e.placeId) {
                closeMapInfoPanel();
                return;
            }
            e.stop(); // prevent default Google infowindow
            window._openPlacePanel(e.placeId);
        });

    } catch (e) {
        console.error("initRealMap failed:", e);
        if (debugEl) debugEl.innerText = "Map Status: ERROR - " + e.message;
    }
    });
}

// --- Map Custom Search Control ---
function initMapSearchControl(mapInstance) {
    if (mapInstance.controls[google.maps.ControlPosition.TOP_LEFT].getLength() > 0) {
        mapInstance.controls[google.maps.ControlPosition.TOP_LEFT].clear();
    }

    const controlWrapper = document.createElement('div');
    controlWrapper.style.margin = '10px';
    controlWrapper.style.position = 'relative';
    controlWrapper.style.zIndex = '1000'; // above map layers but below some modals

    const searchInputWrapper = document.createElement('div');
    searchInputWrapper.style.display = 'flex';
    searchInputWrapper.style.alignItems = 'center';
    searchInputWrapper.style.background = '#fff';
    searchInputWrapper.style.borderRadius = '24px'; // match mockup rounded style
    searchInputWrapper.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    searchInputWrapper.style.padding = '0 12px';
    searchInputWrapper.style.width = '320px'; // a bit wider
    searchInputWrapper.style.height = '48px';
    searchInputWrapper.style.boxSizing = 'border-box';

    const searchIcon = document.createElement('div');
    // Using a clear bold search icon
    searchIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
    searchIcon.style.display = 'flex';
    searchIcon.style.alignItems = 'center';
    searchIcon.style.marginRight = '8px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = t('map.search_placeholder');
    searchInput.style.border = 'none';
    searchInput.style.outline = 'none';
    searchInput.style.flex = '1';
    searchInput.style.fontSize = '16px';
    searchInput.style.background = 'transparent';
    searchInput.style.color = '#333';

    const clearBtn = document.createElement('div');
    clearBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    clearBtn.style.cssText = `
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: background 0.2s;
        margin-left: 4px;
    `;
    clearBtn.onmouseenter = () => clearBtn.style.background = '#f0f0f0';
    clearBtn.onmouseleave = () => clearBtn.style.background = 'transparent';
    clearBtn.onclick = (e) => {
        e.stopPropagation();
        searchInput.value = '';
        searchInput.focus();
        clearBtn.style.display = 'none';
        renderDefaultCategories();
        dropdown.style.display = 'block';
    };

    searchInputWrapper.appendChild(searchIcon);
    searchInputWrapper.appendChild(searchInput);
    searchInputWrapper.appendChild(clearBtn);

    // Dropdown Panel
    const dropdown = document.createElement('div');
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '56px';
    dropdown.style.left = '0';
    dropdown.style.width = '100%';
    dropdown.style.background = '#fff';
    dropdown.style.borderRadius = '12px';
    dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    dropdown.style.overflow = 'hidden';
    dropdown.style.fontFamily = 'var(--font-primary)';

    const categories = [
        { label: t('map.category_dining'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>', type: ['restaurant', 'cafe', 'fast_food', 'bakery', 'coffee_shop', 'sandwich_shop', 'steak_house', 'american_restaurant', 'chinese_restaurant', 'pizza_restaurant', 'seafood_restaurant'] },
        { label: t('map.category_attractions'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>', type: ['tourist_attraction', 'museum', 'park', 'national_park', 'historical_landmark', 'amusement_center', 'aquarium', 'art_gallery'] },
        { label: t('map.category_gas'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11C16.17 7 15.5 8.22 15.5 9.61c0 2.54 1.95 4.62 4.45 4.86V20h2v-5.5h-2.5V9.61c0-1.01-.48-1.92-1.22-2.5l.38-.38-.34-.5-1 1M12 10H6v4h6v-4m0-6H6c-1.1 0-2 .9-2 2v14h8V4z"/></svg>', type: ['gas_station'] },
        { label: t('map.category_charging'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 11l-3 6v-4h-2l3-6v4h2z M17 3H7c-1.1 0-2 .9-2 2v16h14V5c0-1.1-.9-2-2-2zm0 16H7V5h10v14z"/></svg>', type: ['electric_vehicle_charging_station'] },
        { label: t('map.category_lodging'), icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>', type: ['lodging', 'hotel', 'motel', 'bed_and_breakfast', 'resort_hotel', 'hostel', 'guest_house'] }
    ];

    // --- Autocomplete Logic ---
    let AutocompleteSuggestion = null;
    let AutocompleteSessionToken = null;
    let sessionToken = null;
    let predictions = [];
    let selectedIndex = -1;

    async function ensureServices() {
        if (!AutocompleteSuggestion) {
            const lib = await google.maps.importLibrary('places');
            AutocompleteSuggestion = lib.AutocompleteSuggestion;
            AutocompleteSessionToken = lib.AutocompleteSessionToken;
            sessionToken = new AutocompleteSessionToken();
        }
    }

    function renderDefaultCategories() {
        dropdown.innerHTML = '';
        selectedIndex = -1;
        categories.forEach((cat, idx) => {
            const item = document.createElement('div');
            item.className = 'search-dropdown-item';
            item.style.padding = '12px 16px';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.cursor = 'pointer';
            item.style.color = '#333';
            item.style.fontSize = '15px';
            item.style.borderBottom = idx < categories.length - 1 ? '1px solid #f0f0f0' : 'none';
            item.style.transition = 'background 0.2s';
            item.innerHTML = `<span style="display:flex; justify-content:center; align-items:center; width:24px;">${cat.icon}</span> <span>${cat.label}</span>`;
            
            item.onmousedown = (e) => {
                e.preventDefault(); // Prevent input blur
                searchInput.value = cat.label;
                dropdown.style.display = 'none';
                triggerMapSearch(cat.label, cat.type);
            };
            item.onmouseenter = () => {
                updateSelectedIndex(idx);
            };
            dropdown.appendChild(item);
        });
    }

    function renderPredictions(preds) {
        dropdown.innerHTML = '';
        predictions = preds || [];
        selectedIndex = -1;

        if (predictions.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        predictions.forEach((pred, idx) => {
            const item = document.createElement('div');
            item.className = 'search-dropdown-item';
            item.style.padding = '12px 16px';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.cursor = 'pointer';
            item.style.color = '#333';
            item.style.fontSize = '14px';
            item.style.borderBottom = idx < predictions.length - 1 ? '1px solid #f0f0f0' : 'none';
            
            const icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
            item.innerHTML = `<span style="flex-shrink:0;">${icon}</span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${pred.description}</span>`;
            
            item.onmousedown = (e) => {
                e.preventDefault(); // Prevent input blur
                searchInput.value = pred.structured_formatting.main_text;
                dropdown.style.display = 'none';
                triggerMapSearch(pred.description, null, pred.place_id);
            };
            item.onmouseenter = () => {
                updateSelectedIndex(idx);
            };
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    }

    function updateSelectedIndex(index) {
        const items = dropdown.querySelectorAll('.search-dropdown-item');
        items.forEach(it => {
            it.style.background = 'transparent';
        });
        selectedIndex = index;
        if (items[selectedIndex]) {
            items[selectedIndex].style.background = '#f0f4ff';
        }
    }

    async function handleInput() {
        const val = searchInput.value.trim();
        if (!val) {
            renderDefaultCategories();
            return;
        }

        await ensureServices();
        const request = {
            input: val,
            sessionToken: sessionToken,
            locationBias: mapInstance.getBounds() || undefined
        };

        try {
            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
            // Map suggestions to the prediction format we used before
            const preds = (suggestions || []).map(s => ({
                description: s.placePrediction.text.toString(),
                place_id: s.placePrediction.placeId,
                structured_formatting: {
                    main_text: s.placePrediction.mainText.toString()
                }
            }));
            renderPredictions(preds);
        } catch (e) {
            console.error("Autocomplete error:", e);
        }
    }

    renderDefaultCategories();

    searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value ? 'flex' : 'none';
        handleInput();
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-dropdown-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            dropdown.style.display = 'block';
            let next = selectedIndex + 1;
            if (next >= items.length) next = 0;
            updateSelectedIndex(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            let next = selectedIndex - 1;
            if (next < 0) next = items.length - 1;
            updateSelectedIndex(next);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = dropdown.querySelector('.search-dropdown-item[style*="background: rgb(240, 244, 255)"]'); // Check highlit item
            if (selectedIndex >= 0 && items[selectedIndex]) {
                // Manually trigger the selection logic since click() on mousedown-bound items can be weird
                const isPrediction = predictions.length > 0;
                if (isPrediction) {
                    const pred = predictions[selectedIndex];
                    searchInput.value = pred.structured_formatting.main_text;
                    triggerMapSearch(pred.description, null, pred.place_id);
                } else {
                    const cat = categories[selectedIndex];
                    searchInput.value = cat.label;
                    triggerMapSearch(cat.label, cat.type);
                }
                dropdown.style.display = 'none';
                searchInput.blur();
            } else {
                dropdown.style.display = 'none';
                triggerMapSearch(searchInput.value);
                searchInput.blur();
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    controlWrapper.appendChild(searchInputWrapper);
    controlWrapper.appendChild(dropdown);

    // Toggle logic
    let hideTimeout;
    searchInput.addEventListener('focus', () => {
        clearTimeout(hideTimeout);
        if (searchInput.value) {
            clearBtn.style.display = 'flex';
        }
        if (!searchInput.value.trim()) {
            renderDefaultCategories();
        }
        dropdown.style.display = 'block';
    });

    searchInput.addEventListener('blur', () => {
        hideTimeout = setTimeout(() => { dropdown.style.display = 'none'; }, 250);
    });

    mapInstance.controls[google.maps.ControlPosition.TOP_LEFT].push(controlWrapper);
}

// Global search function
window._searchMarkers = window._searchMarkers || [];

window._panToWithOffset = function (location) {
    if (!googleMapInstance || !location) return;
    googleMapInstance.panTo(location);
    // After panning, shift by 1/4 of map height down so marker moves to center of top visible half
    const mapDiv = document.getElementById('real-map');
    if (mapDiv) {
        setTimeout(() => {
            const offset = mapDiv.offsetHeight / 4;
            googleMapInstance.panBy(0, offset);
        }, 100);
    }
};

window.triggerMapSearch = async function (query, typeRestraint = null, placeId = null) {
    if (!googleMapInstance || !query.trim()) return;

    if (placeId) {
        // Clear previous search marked pins
        if (window._searchMarkers) {
            window._searchMarkers.forEach(m => { if (m) m.map = null; });
            window._searchMarkers = [];
        }

        // If we have a direct placeId from autocomplete, we just add the marker and center
        // window._openPlacePanel(placeId); // Disabled per user request: only open on marker click

        // Also center the map on it and add a marker
        try {
            const { Place } = await google.maps.importLibrary('places');
            const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
            const place = new Place({ id: placeId });
            await place.fetchFields({ fields: ['location', 'displayName'] });
            
            if (place.location) {
                window._panToWithOffset(place.location);
                googleMapInstance.setZoom(15);

                const markerContent = document.createElement('div');
                markerContent.style.cssText = `
                    width: 42px; height: 42px;
                    background: #f97316;
                    border: 3px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.6);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    animation: markerPulse 2s infinite;
                `;
                markerContent.innerHTML = `
                    <style>
                        @keyframes markerPulse {
                            0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
                            70% { box-shadow: 0 0 0 15px rgba(249, 115, 22, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                        }
                    </style>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="pointer-events: none;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                `;

                markerContent.onmouseenter = () => markerContent.style.transform = 'scale(1.2)';
                markerContent.onmouseleave = () => markerContent.style.transform = 'scale(1)';

                markerContent.onclick = (e) => {
                    e.stopPropagation();
                    window._openPlacePanel(placeId);
                };

                const marker = new AdvancedMarkerElement({
                    position: place.location,
                    map: googleMapInstance,
                    title: (place.displayName?.text || place.displayName?.toString()) || query,
                    content: markerContent
                });

                marker.addEventListener("gmp-click", () => {
                    window._openPlacePanel(placeId);
                });

                window._searchMarkers.push(marker);
            }
        } catch(e) {
            console.error("Error placing marker for Place ID:", e);
        }
        return;
    }

    const debugEl = document.getElementById('map-debug-status');
    if (debugEl) debugEl.innerText = `Map Status: Searching for ${query}...`;

    try {
        const { Place } = await google.maps.importLibrary('places');

        const searchRequest = {
            fields: ['id', 'location', 'displayName'],
            language: state.settings.language === 'zh' ? 'zh-CN' : 'en-US',
            maxResultCount: 20 // Max out the results to give user the full picture
        };

        // If it's an array of underlying types (clicked from dropdown), use a smart fallback.
        // Google's modern searchByText only supports ONE includedType.
        // We will use the most primary type from the list as the includedType, 
        // and include ALL types as a space-separated string in the textQuery to ensure coverage.
        if (Array.isArray(typeRestraint)) {
            // Priority type to use as the hard filter
            searchRequest.includedType = typeRestraint[0]; 
            // Broaden the search by including keywords for all sub-types (hotel motel LODGING etc)
            searchRequest.textQuery = `${query} ${typeRestraint.join(' ')}`;
        } else {
            searchRequest.textQuery = query;
        }

        // Add strict location restriction based on current map view bounds
        if (googleMapInstance.getBounds()) {
            searchRequest.locationRestriction = googleMapInstance.getBounds();
        }

        const { places } = await Place.searchByText(searchRequest);

        // Clear previous search marked pins
        window._searchMarkers.forEach(m => {
            if (m) m.map = null;
        });
        window._searchMarkers = [];

        if (places && places.length > 0) {
            const bounds = new google.maps.LatLngBounds();

            places.forEach(place => {
                const markerContent = document.createElement('div');
                markerContent.style.cssText = `
                    width: 32px; height: 32px;
                    background: #f97316;
                    border: 2px solid white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                `;
                markerContent.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" style="pointer-events: none;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
                
                markerContent.onmouseenter = () => markerContent.style.transform = 'scale(1.25)';
                markerContent.onmouseleave = () => markerContent.style.transform = 'scale(1)';

                markerContent.onclick = (e) => {
                    e.stopPropagation();
                    window._openPlacePanel(place.id);
                };

                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: place.location,
                    map: googleMapInstance,
                    title: place.displayName || query,
                    content: markerContent
                });

                // Clicking the marker opens the side info panel natively
                marker.addEventListener("gmp-click", () => {
                    window._openPlacePanel(place.id);
                });

                window._searchMarkers.push(marker);
                bounds.extend(place.location);
            });

            const mapDiv = document.getElementById('real-map');
            const padding = mapDiv ? { bottom: mapDiv.offsetHeight / 2 + 20, top: 60, left: 60, right: 60 } : 50;
            googleMapInstance.fitBounds(bounds, padding);
            if (debugEl) debugEl.innerText = t('map.status_found').replace('{count}', places.length);

            // window._openPlacePanel(firstPlace.id); // Disabled per user request: only open on marker click
        } else {
            if (debugEl) debugEl.innerText = t('map.status_no_results').replace('{query}', query);
        }
    } catch (err) {
        console.error("Map search error:", err);
        if (debugEl) debugEl.innerText = `Map Status: Search Error`;
    }
}

// Function to programmatically open the map info panel for a location (e.g. from itinerary card click)
window.openLocationInMapPanel = async function (query, lat, lng) {
    if (!googleMapInstance || !query) return;

    const debugEl = document.getElementById('map-debug-status');
    if (debugEl) debugEl.innerText = `Map Status: Loading info for ${query}...`;

    try {
        const { Place } = await google.maps.importLibrary('places');
        const searchRequest = {
            textQuery: query,
            fields: ['id', 'displayName', 'formattedAddress', 'rating', 'userRatingCount', 'types', 'photos', 'priceLevel', 'regularOpeningHours', 'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteURI', 'reviews', 'location'],
            language: state.settings.language === 'zh' ? 'zh-CN' : 'en-US',
            maxResultCount: 3
        };

        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
            searchRequest.locationBias = new google.maps.LatLng(Number(lat), Number(lng));
        }

        const { places } = await Place.searchByText(searchRequest);

        if (places && places.length > 0) {
            let bestPlace = places[0];
            if (lat && lng) {
                let minDist = Infinity;
                places.forEach(p => {
                    if (p.location) {
                        const plat = p.location.lat();
                        const plng = p.location.lng();
                        const dist = Math.pow(plat - Number(lat), 2) + Math.pow(plng - Number(lng), 2);
                        if (dist < minDist) {
                            minDist = dist;
                            bestPlace = p;
                        }
                    }
                });
            }

            if (bestPlace.location) {
                window._panToWithOffset(bestPlace.location);
            }
            // Trigger native map info panel explicitly with the resolved place data
            window._openPlacePanel(bestPlace.id);

            if (debugEl) debugEl.innerText = `Map Status: Showing ${bestPlace.displayName || query}`;
        } else {
            console.warn("No place resolved for:", query);
            if (debugEl) debugEl.innerText = `Map Status: No detailed info found for ${query}`;
            if (lat && lng) {
                window._panToWithOffset({ lat: Number(lat), lng: Number(lng) });
            }
        }
    } catch (err) {
        console.error('[map-search] Failed to open location in map panel:', err);
        if (debugEl) debugEl.innerText = "Map Status: Error retrieving place info";
    }
};

// Centralized helper to fetch place data and show the info panel
window._openPlacePanel = async function (placeId) {
    console.log('[_openPlacePanel] Request for ID:', placeId);
    if (!placeId) {
        console.warn('[_openPlacePanel] Aborted: No placeId provided.');
        return;
    }
    try {
        const { Place } = await google.maps.importLibrary('places');
        const place = new Place({ id: placeId });
        await place.fetchFields({ 
            fields: [
                'displayName', 'formattedAddress', 'rating', 'userRatingCount', 
                'types', 'photos', 'priceLevel', 'regularOpeningHours', 
                'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteURI', 
                'reviews', 'location', 'viewport'
            ] 
        });
        await showMapInfoPanel(place, placeId);
    } catch (err) {
        console.warn('[_openPlacePanel] fetchFields failed:', err);
    }
};

// --- Map Info Panel ---
async function showMapInfoPanel(place, placeId) {
    closeMapInfoPanel();
    const mapDiv = document.getElementById('real-map');
    const containerDiv = document.getElementById('mock-map-container');
    if (!mapDiv || !containerDiv) return;

    const { state } = await import('./state.js');

    const panel = document.createElement('div');
    panel.id = 'map-info-panel';

    // Horizontal layout: height=50%-14px of map, width auto-calculated from right:65px
    panel.classList.add('map-info-panel-active');
    // Minimal inline styles to allow CSS overrides
    panel.style.cssText = `
        display:flex; flex-direction:column; overflow:hidden; font-family:var(--font-main, inherit);
    `;

    // Store photos globally for lightbox access
    // Robust Coordinate Extraction
    let lat = null, lng = null;
    const loc = place.location || (place.geometry && place.geometry.location);
    if (loc) {
        lat = (typeof loc.lat === 'function') ? loc.lat() : (typeof loc.latitude === 'number' ? loc.latitude : loc.lat);
        lng = (typeof loc.lng === 'function') ? loc.lng() : (typeof loc.longitude === 'number' ? loc.longitude : loc.lng);
    }
    
    // Generate Street View URL as a secondary fallback
    let streetViewUrl = '';
    if (lat !== null && lng !== null && !isNaN(lat)) {
        streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${lat},${lng}&fov=90&key=${MAPS_API_KEY}`;
    }
    
    // Process main photos
    window._currentPlacePhotos = [];
    if (place.photos && place.photos.length > 0) {
        try {
            window._currentPlacePhotos = place.photos.map(p => typeof p.getURI === 'function' ? p.getURI({ maxWidth: 1200 }) : p.url).filter(Boolean);
        } catch (e) {
            console.warn("Failed to get photo URIs:", e);
        }
    }
    
    // Prioritize Actual Photos > Street View > Placeholder
    let photo = '';
    const placeholderUrl = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop`;

    if (window._currentPlacePhotos.length > 0) {
        photo = window._currentPlacePhotos[0];
    } else if (streetViewUrl) {
        photo = streetViewUrl;
        window._currentPlacePhotos = [streetViewUrl];
    }
 
    if (!photo) photo = placeholderUrl;

    const displayNameText = (typeof place.displayName === 'object' && place.displayName !== null) ? (place.displayName.text || place.displayName.toString()) : (place.displayName || t('map.unknown_place'));
    const formattedAddrText = place.formattedAddress || t('map.unknown_address');

    const stars = (place.rating !== undefined && place.rating !== null) ? place.rating.toFixed(1) : '';
    const ratingNum = place.rating || 0;
    const starsStr = '★'.repeat(Math.round(ratingNum)) + '☆'.repeat(5 - Math.round(ratingNum));

    // Reviews Summary and HTML
    // Compute rating distribution if reviews exist
    const totalReviews = place.reviews?.length || 0;
    const ratingCounts = [0, 0, 0, 0, 0, 0]; // index 1-5
    if (totalReviews > 0) {
        place.reviews.forEach(r => {
            const rating = Math.round(r.rating) || 0;
            if (rating >= 1 && rating <= 5) ratingCounts[rating]++;
        });
    }
    // Build rating summary HTML (overall average and bars)
    let ratingSummaryHtml = '';
    if (totalReviews > 0) {
        const avgRating = place.rating ? place.rating.toFixed(1) : '0';
        ratingSummaryHtml = `
        <div style="text-align:center;margin-bottom:1rem;">
            <div style="font-size:1.5rem;font-weight:600;">${avgRating} ★</div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:0.5rem;">
                ${[5, 4, 3, 2, 1].map(star => {
            const count = ratingCounts[star];
            const perc = totalReviews ? (count / totalReviews * 100).toFixed(0) : 0;
            return `
                    <div style="display:flex;align-items:center;">
                        <span style="width:30px;font-size:0.85rem;">${star}★</span>
                        <div style="flex:1;background:#444;border-radius:4px;height:8px;margin:0 8px;position:relative;">
                            <div style="background:#ffb400;width:${perc}%;height:100%;border-radius:4px;"></div>
                        </div>
                        <span style="width:30px;font-size:0.85rem;">${count}</span>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }
    // Default placeholder if no reviews
    let reviewsHtml = `<div style="color:var(--text-secondary);text-align:center;padding:1rem;">${t('map.no_reviews')}</div>`;
    if (place.reviews && place.reviews.length > 0) {
        reviewsHtml = place.reviews.map(r => `
            <div style="border-bottom:1px solid var(--glass-border); padding-bottom:1rem; margin-bottom:1rem;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    ${r.authorURI ? `<img src="${r.authorPhotoURI}" style="width:28px;height:28px;border-radius:50%;">` : '<div style="width:28px;height:28px;border-radius:50%;background:#5b7a99;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div>'}
                    <span style="font-weight:600;font-size:0.9rem;">${r.authorAttribution?.displayName || t('map.anonymous_user')}</span>
                    <span style="color:#f4b942;font-size:0.8rem;margin-left:auto;">${'★'.repeat(r.rating || 5)}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;">${r.text || ''}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">${r.relativePublishTimeDescription || ''}</div>
            </div>`).join('');
    }
    // Prepend rating summary if it exists
    if (ratingSummaryHtml) reviewsHtml = ratingSummaryHtml + reviewsHtml;

    // Photos HTML with lightbox support
    let photosHtml = `<div style="color:var(--text-secondary);text-align:center;padding:1rem;width:100%;">${t('map.no_photos')}</div>`;
    if (window._currentPlacePhotos.length > 0) {
        photosHtml = window._currentPlacePhotos.map((url, idx) => {
            return `
            <div style="aspect-ratio:1; border-radius:8px; overflow:hidden; background:#2a3441; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'" onclick="openPhotoLightbox(${idx})">
                <img src="${url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none'">
            </div>`;
        }).join('');
    }

    // Process Price and Type
    const priceLevels = ['免费', '$', '$$', '$$$', '$$$$'];
    const priceText = place.priceLevel !== undefined && place.priceLevel !== null && place.priceLevel >= 0 ? priceLevels[place.priceLevel] || '$$' : '';
    const priceHtml = priceText ? `<span style="font-weight:bold; color:var(--text-primary); font-size:0.85rem; margin-right:4px;">${priceText}</span>` : '';

    let placeType = place.types?.[0] ? place.types[0].replace(/_/g, ' ') : '';
    const typeHtml = placeType ? `<span style="color:var(--text-secondary); font-size:0.85rem; text-transform:capitalize;">${placeType}</span>` : '';

    // Opening hours today
    let todayHours = '';
    if (place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions) {
        const d = new Date().getDay();
        const adjustedDay = d === 0 ? 6 : d - 1; // Google maps weekdayDescriptions is Monday=0, Sunday=6
        todayHours = place.regularOpeningHours.weekdayDescriptions[adjustedDay] || '';
    }

    // Build day options for custom dropdown
    const activeTrip = state.trips.find(t => t.id === state.activeTripId);
    let selectedDayId = activeTrip?.activeDayId || (activeTrip?.days?.[0]?.id);
    let selectedDay = activeTrip?.days?.find(d => d.id === selectedDayId);

    let dropdownOptionsHtml = '';
    if (activeTrip && activeTrip.days && activeTrip.days.length > 0) {
        if (!selectedDay) selectedDay = activeTrip.days[0];

        dropdownOptionsHtml = activeTrip.days.map((d, dIdx) => {
            const dColor = d.color || '#5b7a99';
            const dayTitle = d.title || (t('itinerary.day_label') + (dIdx + 1) + (t('itinerary.day_suffix') === 'itinerary.day_suffix' ? '' : t('itinerary.day_suffix')));
            // Added white-space: nowrap and adjusted font sizes to ensure one-line display
            return `
                <div class="global-map-day-option" data-value="${d.id}" data-title="${dayTitle}" style="padding: 0.6rem 1rem; display:flex; align-items:center; cursor:pointer; border-bottom: 1px solid var(--glass-border); white-space:nowrap;" onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.05))'" onmouseout="this.style.background='transparent'">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dColor}; margin-right: 10px; flex-shrink:0;"></div>
                    <span style="color:var(--text-primary); font-size:0.9rem; font-weight:600; margin-right: 16px;">${dayTitle}</span>
                    <span style="color:var(--text-secondary); font-size:0.75rem; margin-left:auto;">${d.date}</span>
                </div>
            `;
        }).join('');
    }

    let defaultDayTitle = selectedDay?.title || (selectedDay ? (t('itinerary.day_label') + (activeTrip.days.indexOf(selectedDay) + 1) + (t('itinerary.day_suffix') === 'itinerary.day_suffix' ? '' : t('itinerary.day_suffix'))) : t('map.select_date'));

    // Check if this place is already in the itinerary
    let addedDays = [];
    if (activeTrip && activeTrip.days) {
        activeTrip.days.forEach((day, index) => {
            if (day.stops) {
                const match = day.stops.some(s => {
                    // 1. If both have placeId, compare by placeId (most accurate)
                    if (s.placeId && place.id) {
                        return s.placeId === place.id;
                    }
                    // 2. Fallback: compare by name AND address (since name alone is not unique for chains)
                    const nameMatch = s.location && place.displayName && s.location.toLowerCase() === place.displayName.toLowerCase();
                    const addressMatch = s.address && place.formattedAddress && s.address === place.formattedAddress;
                    return nameMatch && addressMatch;
                });
                if (match) {
                    addedDays.push({ id: day.id, title: day.title || (t('itinerary.day_label') + (index + 1) + (t('itinerary.day_suffix') === 'itinerary.day_suffix' ? '' : t('itinerary.day_suffix'))) });
                }
            }
        });
    }

    let addedStatusHtml = '';
    if (addedDays.length > 0) {
        addedStatusHtml = `
            <div style="position:relative; display:inline-block; margin-left: 10px;">
                <button onclick="toggleMenu(event, 'map-added-status-${placeId}')" style="background:rgba(34, 197, 94, 0.15); color:#22c55e; border:1px solid rgba(34, 197, 94, 0.3); border-radius:8px; padding:6px 14px; font-weight:700; font-size:0.85rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background 0.15s;" onmouseover="this.style.background='rgba(34, 197, 94, 0.25)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.15)'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${t('map.added')}
                </button>
                <div class="menu-dropdown" id="menu-map-added-status-${placeId}" style="top:2.5rem; left:0; min-width:140px; padding: 0.5rem; z-index: 1000;">
                    <div style="font-size: 0.75rem; color:var(--text-secondary); margin-bottom: 0.4rem; padding: 0 4px;">${t('map.exists_in_itineraries')}</div>
                    ${addedDays.map(d => `<div style="padding: 4px 8px; font-size: 0.85rem; color:var(--text-primary); background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 4px;">${d.title}</div>`).join('')}
                </div>
            </div>
        `;
    }

    panel.innerHTML = `
        <div style="display:flex; border-bottom:1px solid rgba(255,255,255,0.1); padding: 0 0.8rem; height: 50px; position:relative; background:#0d111b; flex-shrink:0;">
            <button class="poi-tab active" data-target="poi-about" style="padding:0 16px; background:none; border:none; color:var(--accent-primary); font-weight:700; border-bottom:2px solid var(--accent-primary); cursor:pointer; font-size:0.95rem; display:flex; align-items:center;">${t('map.tab_about')}</button>
            <button class="poi-tab" data-target="poi-reviews" style="padding:0 16px; background:none; border:none; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.95rem; display:flex; align-items:center;">${t('map.tab_reviews')}</button>
            <button class="poi-tab" data-target="poi-photos" style="padding:0 16px; background:none; border:none; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.95rem; display:flex; align-items:center;">${t('map.tab_photos')}</button>
            <button onclick="closeMapInfoPanel()" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        
        <div style="padding: 0.8rem 1.2rem 0 1.2rem; z-index: 10; display: flex; align-items: center;">
            <!-- Single "Add to Trip" button -->
            <button id="map-add-trigger" class="map-custom-select" style="background:var(--accent-primary); color:white; border:none; border-radius:8px; padding:6px 18px; font-weight:700; font-size:0.9rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow: 0 4px 12px rgba(249,115,22,0.3); transition:transform 0.15s, background 0.15s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.background='rgba(249,115,22,0.95)'" onmouseout="this.style.transform='translateY(0)'; this.style.background='var(--accent-primary)'">
                <span style="font-size:1.1rem; margin-top:-1px;">+</span> ${t('map.add_to_itinerary')}
            </button>
            ${addedStatusHtml}
        </div>

        <div style="flex:1; overflow-y:auto; padding: 0.8rem 1.2rem 1.2rem 1.2rem; position:relative; z-index: 1;" class="custom-scrollbar">
            <!-- About Tab -->
            <div class="poi-tab-content active" id="poi-about" style="display:flex; justify-content:space-between; align-items:flex-start; gap: 1.5rem;">
                
                <!-- Left Column: Info & Details -->
                <div style="flex:1; display:flex; flex-direction:column; min-width:0;">

                    <div style="margin-bottom: 1rem;">
                        <h2 style="margin:0 0 0.2rem 0; font-size:1.5rem; font-weight:800; color:white; word-break:break-word; line-height:1.2;">
                            ${displayNameText}
                        </h2>
                        <div style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:0.5rem;">
                            ${placeType || t('map.place')}
                        </div>
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            ${stars ? `
                            <span style="color:#f97316; font-weight:800; font-size:1rem;">${stars}</span>
                            <span style="color:#f97316; font-size:0.9rem; letter-spacing:1px; line-height:1;">${starsStr}</span>
                            <span style="color:var(--text-secondary); font-size:0.85rem; margin-left:2px;">(${place.userRatingCount || 0} reviews)</span>
                            ` : `<span style="color:var(--text-secondary); font-size:0.85rem;">${t('map.no_rating')}</span>`}
                        </div>
                    </div>
 
                    <div style="display:flex; flex-direction:column; gap: 12px; margin-bottom: 1rem;">
                        <!-- Address -->
                        <div style="display:flex; align-items:flex-start; gap: 10px;">
                            <span style="color:#f97316; flex-shrink:0; margin-top:2px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
                            <span style="color:#e2e8f0; font-size:0.9rem; line-height:1.4;">${formattedAddrText}</span>
                        </div>
                        <!-- Hours -->
                        ${todayHours ? `
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span style="color:#f97316; flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></span>
                            <span style="color:#e2e8f0; font-size:0.9rem;">${todayHours}</span>
                        </div>` : ''}
                        <!-- Phone -->
                        ${place.internationalPhoneNumber ? `
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span style="color:#f97316; flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></span>
                            <span style="color:#f97316; font-size:0.9rem; font-weight:600;">${place.internationalPhoneNumber}</span>
                        </div>` : ''}
                        <!-- Website -->
                        ${place.websiteURI ? `
                        <div style="display:flex; align-items:center; gap: 10px;">
                            <span style="color:#f97316; flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14c-.17-.64-.26-1.31-.26-2s.09-1.36.26-2h3.38c-.04.66-.07 1.32-.07 2s.03 1.34.07 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.91-4.33-3.56zm2.95-8H5.08c.96-1.65 2.49-2.93 4.33-3.56-.6 1.11-1.06 2.31-1.38 3.56zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.04-.66-.06-1.34-.06-2s.02-1.34.06-2h4.68c.04.66.06 1.34.06 2s-.02 1.34-.06 2zm.24 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49-2.93-4.33 3.56zM16.36 14c.04-.66.07-1.32.07-2s-.03-1.34-.07-2h3.38c.17.64.26 1.31.26 2s-.09 1.36-.26 2h-3.38z"/></svg></span>
                            <a href="${place.websiteURI}" target="_blank" style="color:#f97316; font-size:0.9rem; font-weight:600; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${place.websiteURI.replace('https://', '').replace(/\/$/, '')}</a>
                        </div>` : ''}
                    </div>

                </div>

                <!-- Right Column: Big Image -->
                ${photo ? `
                <div style="width: 340px; height: 210px; flex-shrink: 0; border-radius:10px; overflow:hidden; margin-top: 2px; cursor:pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4); background: #1a1e26;" onclick="openPhotoLightbox(0)">
                    <img src="${photo}" style="width:100%; height:100%; object-fit:cover; display:block; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onerror="this.src='https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=400&auto=format&fit=crop'">
                </div>` : ''}

            </div> <!-- end poi-about tab -->
            
            <!-- Reviews Tab -->
            <div class="poi-tab-content" id="poi-reviews" style="display:none; flex-direction:column; padding-bottom: 2rem;">
                ${reviewsHtml}
            </div>

            <!-- Photos Tab -->
            <div class="poi-tab-content" id="poi-photos" style="display:none; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:10px; padding-bottom: 2rem;">
                ${photosHtml}
            </div>
        </div>
    `;

    containerDiv.style.position = 'relative';
    containerDiv.appendChild(panel);

    // Add a quick stylesheet for scrollbar just in case it doesn't exist
    if (!document.getElementById('poi-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'poi-modal-styles';
        style.textContent = `
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        `;
        document.head.appendChild(style);
    }

    // Tab switching logic
    const tabs = panel.querySelectorAll('.poi-tab');
    const contents = panel.querySelectorAll('.poi-tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.color = 'var(--text-secondary)';
                t.style.borderBottom = 'none';
            });
            contents.forEach(c => {
                c.style.display = 'none';
            });
            tab.classList.add('active');
            tab.style.color = 'var(--accent-primary)';
            tab.style.borderBottom = '2px solid var(--accent-primary)';
            const targetId = tab.getAttribute('data-target');
            const targetEl = panel.querySelector('#' + targetId);
            if (targetEl) {
                targetEl.style.display = targetId === 'poi-photos' ? 'grid' : (targetId === 'poi-about' ? 'flex' : 'flex');
            }
        });
    });

    // Close dropdown on outside click
    function handleGlobalDropdownClose(e) {
        const globalDropdown = document.getElementById('global-map-day-dropdown');
        if (globalDropdown && globalDropdown.style.display !== 'none') {
            const isClickInside = globalDropdown.contains(e.target);
            const isTrigger = e.target.closest('#map-add-trigger');
            if (!isClickInside && !isTrigger) {
                globalDropdown.style.display = 'none';
            }
        }
    }

    if (window._mapGlobalDropdownCloseHandler) {
        document.removeEventListener('click', window._mapGlobalDropdownCloseHandler);
    }
    window._mapGlobalDropdownCloseHandler = handleGlobalDropdownClose;
    document.addEventListener('click', window._mapGlobalDropdownCloseHandler);

    // Dropdown Trigger Logic (appending to document.body to escape InfoWindow clipping)
    const triggerBtn = panel.querySelector('#map-add-trigger');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            let globalDropdown = document.getElementById('global-map-day-dropdown');
            if (!globalDropdown) {
                globalDropdown = document.createElement('div');
                globalDropdown.id = 'global-map-day-dropdown';
                globalDropdown.className = 'custom-scrollbar';
                globalDropdown.style.cssText = `
                    display:none; 
                    position:fixed; 
                    background:var(--bg-secondary); 
                    border:1px solid var(--glass-border); 
                    border-radius:8px; 
                    min-width:180px; 
                    z-index:999999; 
                    box-shadow:0 -8px 24px rgba(0,0,0,0.6);
                    max-height: 300px;
                    overflow-y: auto;
                    overflow-x: hidden;
                `;
                document.body.appendChild(globalDropdown);
            }

            if (globalDropdown.style.display === 'block') {
                globalDropdown.style.display = 'none';
                return;
            }

            // Populate list dynamically to fetch latest colors/state
            const currentActiveTrip = state.trips.find(t => t.id === state.activeTripId);
            if (currentActiveTrip && currentActiveTrip.days && currentActiveTrip.days.length > 0) {
                globalDropdown.innerHTML = currentActiveTrip.days.map((d, index) => {
                    const dColor = d.color || '#5b7a99';
                    const dayTitle = `${t('itinerary.day_label')}${index + 1}${t('itinerary.day_suffix')}`;
                    return `
                        <div class="global-map-day-option" data-value="${d.id}" data-title="${dayTitle}" style="padding: 0.6rem 1rem; display:flex; align-items:center; cursor:pointer; border-bottom: 1px solid var(--glass-border); white-space:nowrap;" onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.05))'" onmouseout="this.style.background='transparent'">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dColor}; margin-right: 10px; flex-shrink:0;"></div>
                            <span style="color:var(--text-primary); font-size:0.9rem; font-weight:600; margin-right: 16px;">${dayTitle}</span>
                            <span style="color:var(--text-secondary); font-size:0.75rem; margin-left:auto;">${d.date}</span>
                        </div>
                    `;
                }).join('');
            } else {
                globalDropdown.innerHTML = `<div style="padding: 1rem; color:var(--text-secondary); white-space:nowrap; font-size:0.9rem;">${t('map.no_days_found')}</div>`;
            }

            // Bind click events directly on the newly injected options to perform Add action instantly
            const options = globalDropdown.querySelectorAll('.global-map-day-option');
            options.forEach(opt => {
                opt.addEventListener('click', async (evt) => {
                    evt.stopPropagation();
                    globalDropdown.style.display = 'none';
                    const targetDayId = opt.getAttribute('data-value');

                    // Trigger the add action using existing place data
                    const originalHtml = triggerBtn.innerHTML;
                    triggerBtn.innerHTML = `<span>⏳</span> ${t('map.adding')}`;
                    triggerBtn.disabled = true;

                    try {
                        const { autoAddStop } = await import('./ui/handlers/stops.js');
                        let addPlaceObj = window._currentMapPlace;
                        if (!addPlaceObj) addPlaceObj = place; // fallback

                        const placeId = addPlaceObj.id || addPlaceObj.place_id;
                        if (!placeId) throw new Error('No place ID found');

                        await autoAddStop(targetDayId, placeId);

                        triggerBtn.innerHTML = `<span>✅</span> ${t('map.added')}`;
                        setTimeout(() => {
                            if (document.body.contains(triggerBtn)) {
                                triggerBtn.innerHTML = originalHtml;
                                triggerBtn.disabled = false;
                            }
                            // Re-render the panel to show the new "Added" badge state
                            window._openPlacePanel(placeId);
                        }, 600);
                    } catch (error) {
                        console.error('[maps] Error adding location:', error);
                        triggerBtn.innerHTML = `<span>❌</span> ${t('map.add_failed')}`;
                        setTimeout(() => {
                            if (document.body.contains(triggerBtn)) {
                                triggerBtn.innerHTML = originalHtml;
                                triggerBtn.disabled = false;
                            }
                        }, 2000);
                    }
                });
            });

            // Position calculation
            globalDropdown.style.visibility = 'hidden';
            globalDropdown.style.display = 'block';

            const rect = triggerBtn.getBoundingClientRect();
            // Drop UPWARDS (position top edge of dropdown relative to top edge of button)
            const dropdownHeight = globalDropdown.offsetHeight;
            let finalTop = rect.top - dropdownHeight - 6;

            // Adjust if it goes off the screen top
            if (finalTop < 10) {
                // If it doesn't fit upwards, open it downwards below the button
                finalTop = rect.bottom + 6;
            }

            globalDropdown.style.left = rect.left + 'px';
            globalDropdown.style.top = finalTop + 'px';
            globalDropdown.style.visibility = 'visible';
        });
    }

    return containerDiv;
}

export function closeMapInfoPanel() {
    const panels = document.querySelectorAll('#map-info-panel');
    panels.forEach(p => p.remove());
}

// Expose globally so onclick="closeMapInfoPanel()" in HTML works
window.closeMapInfoPanel = closeMapInfoPanel;

// Photo lightbox – opens a full-screen overlay with the clicked photo index
function openPhotoLightbox(index) {
    const isMobile = window.innerWidth <= 768;
    const urls = window._currentPlacePhotos || [];
    if (!urls[index]) return;

    let currentIndex = index;

    // Remove existing lightbox if any
    const existing = document.getElementById('photo-lightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'photo-lightbox';
    overlay.style.cssText = `
        position:fixed; inset:0; z-index:10000;
        background:rgba(0,0,0,0.95); display:flex;
        align-items:center; justify-content:center;
        animation: lbFadeIn 0.2s ease;
        user-select: none;
    `;

    // Main image component
    const img = document.createElement('img');
    img.style.cssText = `
        max-width:90vw; max-height:90vh; object-fit:contain;
        border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,0.8);
        transition: opacity 0.2s ease;
    `;

    const updateImage = (idx) => {
        currentIndex = idx;
        // Dim the old image slightly instead of hiding completely to indicate change but avoid black flash
        img.style.opacity = '0.4';

        const tempImg = new Image();
        tempImg.onload = () => {
            if (currentIndex !== idx) return; // ignore if user clicked another one while loading
            img.src = urls[currentIndex];
            img.style.opacity = '1';
            updateCounter();
            preloadAdjacent();
        };
        tempImg.onerror = () => {
            img.style.opacity = '1';
            updateCounter();
        };
        tempImg.src = urls[currentIndex];
    };

    const preloadAdjacent = () => {
        const nextIdx = (currentIndex + 1) % urls.length;
        const prevIdx = (currentIndex - 1 + urls.length) % urls.length;
        if (urls[nextIdx]) (new Image()).src = urls[nextIdx];
        if (urls[prevIdx]) (new Image()).src = urls[prevIdx];
    };
    preloadAdjacent();

    img.src = urls[currentIndex];

    // Counter
    const counter = document.createElement('div');
    counter.style.cssText = `
        position:absolute; ${isMobile ? 'top:32px; left:32px;' : 'bottom:24px; left:50%; transform:translateX(-50%);'}
        color:white; background:rgba(255,255,255,0.1); padding:4px 12px;
        border-radius:20px; font-size:0.9rem; font-weight:600; z-index: 10001;
    `;
    const updateCounter = () => {
        counter.innerText = `${currentIndex + 1} / ${urls.length}`;
    };
    updateCounter();

    // Navigation buttons

    const btnSize = isMobile ? '64px' : '48px';
    const btnFontSize = isMobile ? '2.2rem' : '1.5rem';
    
    let btnBaseStyle = `
        position:absolute;
        background:rgba(255,255,255,0.15); border:none; border-radius:50%;
        width:${btnSize}; height:${btnSize}; color:white; font-size:${btnFontSize};
        cursor:pointer; display:flex; align-items:center; justify-content:center;
        transition: background 0.2s, transform 0.1s; z-index: 10001;
    `;

    const desktopBtnStyle = `top:50%; transform:translateY(-50%);`;
    const mobileBtnStyle = `bottom: 30px; top: auto; transform: none;`;

    const btnStyle = btnBaseStyle + (isMobile ? mobileBtnStyle : desktopBtnStyle);

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '‹';
    prevBtn.style.cssText = btnStyle + (isMobile ? 'left: 40px;' : 'left: 24px;');
    prevBtn.onclick = (e) => { e.stopPropagation(); updateImage((currentIndex - 1 + urls.length) % urls.length); };
    prevBtn.onmouseenter = () => prevBtn.style.background = 'rgba(255,255,255,0.25)';
    prevBtn.onmouseleave = () => prevBtn.style.background = 'rgba(255,255,255,0.15)';
    prevBtn.onmousedown = () => prevBtn.style.transform = isMobile ? 'scale(0.9)' : 'translateY(-50%) scale(0.9)';
    prevBtn.onmouseup = () => prevBtn.style.transform = isMobile ? 'scale(1)' : 'translateY(-50%) scale(1)';

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '›';
    nextBtn.style.cssText = btnStyle + (isMobile ? 'right: 40px;' : 'right: 24px;');
    nextBtn.onclick = (e) => { e.stopPropagation(); updateImage((currentIndex + 1) % urls.length); };
    nextBtn.onmouseenter = () => nextBtn.style.background = 'rgba(255,255,255,0.25)';
    nextBtn.onmouseleave = () => nextBtn.style.background = 'rgba(255,255,255,0.15)';
    nextBtn.onmousedown = () => nextBtn.style.transform = isMobile ? 'scale(0.9)' : 'translateY(-50%) scale(0.9)';
    nextBtn.onmouseup = () => nextBtn.style.transform = isMobile ? 'scale(1)' : 'translateY(-50%) scale(1)';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position:absolute; top:24px; right:24px;
        background:rgba(255,255,255,0.15); border:none;
        border-radius:50%; width:40px; height:40px;
        color:#fff; font-size:1.2rem; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        transition:background 0.2s; z-index: 10001;
    `;
    closeBtn.onclick = () => overlay.remove();
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.15)';

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    overlay.appendChild(counter);
    if (urls.length > 1) {
        overlay.appendChild(prevBtn);
        overlay.appendChild(nextBtn);
    }
    document.body.appendChild(overlay);

    // Close on background click
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    // Keyboard navigation
    const onKey = (e) => {
        if (e.key === 'Escape') overlay.remove();
        if (urls.length > 1) {
            if (e.key === 'ArrowLeft') updateImage((currentIndex - 1 + urls.length) % urls.length);
            if (e.key === 'ArrowRight') updateImage((currentIndex + 1) % urls.length);
        }
    };
    document.addEventListener('keydown', onKey);

    // Clean up event listener when removed
    const observer = new MutationObserver(() => {
        if (!document.body.contains(overlay)) {
            document.removeEventListener('keydown', onKey);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true });

    // Inject fade-in animation if not already present
    if (!document.getElementById('lightbox-keyframes')) {
        const style = document.createElement('style');
        style.id = 'lightbox-keyframes';
        style.textContent = '@keyframes lbFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }';
        document.head.appendChild(style);
    }
}
window.openPhotoLightbox = openPhotoLightbox;

// Toggle transit mode between driving and walking for a specific stop
async function toggleTransitMode(dayId, stopId) {
    const { saveData } = await import('./api.js');
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    const locationStops = day.stops.filter(s => s.type === 'location' || !s.type || s.type === 'hotel_checkin' || s.type === 'hotel_checkout');
    const stopIndex = locationStops.findIndex(s => s.id === stopId);
    if (stopIndex === -1 || stopIndex >= locationStops.length - 1) return;

    const stop = locationStops[stopIndex];
    const nextStop = locationStops[stopIndex + 1];

    // Toggle mode
    const currentMode = stop.transitMode || 'DRIVE';
    const newMode = currentMode === 'DRIVE' ? 'WALK' : 'DRIVE';
    stop.transitMode = newMode;

    // Update icon and text immediately to show loading
    const transitEl = document.getElementById(`transit-${stopId}`);
    const iconBtn = (ico) => `<span onclick="toggleTransitMode('${dayId}', '${stopId}')" style="cursor:pointer; user-select:none; display:inline-block; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" title="点击切换驾车/步行">${ico}</span>`;
    if (transitEl) {
        const icon = newMode === 'WALK' ? '🚶' : '🚗';
        transitEl.innerHTML = `${iconBtn(icon)} <span style="opacity:0.5;">${t('itinerary.calculating')}</span>`;
    }

    // Fetch new route data
    if (stop.lat !== undefined && nextStop.lat !== undefined) {
        const origin = { lat: Number(stop.lat), lng: Number(stop.lng) };
        const dest = { lat: Number(nextStop.lat), lng: Number(nextStop.lng) };
        const result = await fetchRouteDuration(origin, dest, newMode);
        stop.transitToNext = result;
        saveData();

        // Update UI
        if (transitEl) {
            const icon = newMode === 'WALK' ? '🚶' : '🚗';
            if (result) {
                transitEl.innerHTML = `${iconBtn(icon)} ${formatDuration(result.durationSeconds)} · ${formatDistance(result.distanceMeters)}`;
            } else {
                transitEl.innerHTML = `${iconBtn(icon)} <span style="opacity:0.5;">${t('itinerary.no_data')}</span>`;
            }
        }
    }
}
async function toggleHotelTransitMode(dayId, direction) {
    const { saveData } = await import('./api.js');
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    if (direction === 'from') {
        const currentMode = day.transitFromHotelMode || 'DRIVE';
        day.transitFromHotelMode = currentMode === 'DRIVE' ? 'WALK' : 'DRIVE';
    } else {
        const currentMode = day.transitToHotelMode || 'DRIVE';
        day.transitToHotelMode = currentMode === 'DRIVE' ? 'WALK' : 'DRIVE';
    }

    saveData();
    // Trigger re-computation
    await computeTransitData(dayId);
}

async function toggleReturnRoute(dayId) {
    const { saveData } = await import('./api.js');
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    day.showReturnRoute = !day.showReturnRoute;
    saveData();
    initRealMap(); // Re-render markers/lines

    // Re-render day UI
    const { getDayHTML } = await import('./ui/templates/itinerary.js');
    const dayEl = document.getElementById(dayId);
    const timeline = document.querySelector('.itinerary-timeline');
    if (dayEl && timeline) {
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, dayEl);
    }
}

window.toggleTransitMode = toggleTransitMode;
window.toggleHotelTransitMode = toggleHotelTransitMode;
window.toggleReturnRoute = toggleReturnRoute;

// Compute real driving transit data between consecutive location stops in a day
// Stores { duration, distance } in stop.transitToNext and saves to DB
export async function computeTransitData(dayId) {
    if (!window.googleMapsReady || typeof google === 'undefined') return;

    const { state } = await import('./state.js');
    const { saveData } = await import('./api.js');
    const { getDayHTML } = await import('./ui/templates/itinerary.js');

    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    const locationStops = day.stops.filter(s =>
        (s.type === 'location' || !s.type || s.type === 'hotel_checkin' || s.type === 'hotel_checkout') &&
        s.lat !== undefined && s.lat !== null && s.lat !== '' &&
        s.lng !== undefined && s.lng !== null && s.lng !== ''
    );

    // --- Virtual Hotel Transit Logic ---
    // Identify if this day is within a stay range to compute transit to/from hotel hints
    const allStopsWithDays = trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id })));
    const staysMap = new Map();
    allStopsWithDays.forEach(s => {
        if (s.stayId) {
            if (!staysMap.get(s.stayId)) staysMap.set(s.stayId, { id: s.stayId, cin: null, cout: null });
            const stay = staysMap.get(s.stayId);
            if (s.type === 'hotel_checkin') stay.cin = s;
            if (s.type === 'hotel_checkout') stay.cout = s;
        }
    });

    const dIdx = trip.days.findIndex(d => d.id === day.id);
    const dayStay = Array.from(staysMap.values()).find(s => {
        if (!s.cin || !s.cout) return false;
        const cinIdx = trip.days.findIndex(d => d.id === s.cin.dayId);
        const coutIdx = trip.days.findIndex(d => d.id === s.cout.dayId);
        return dIdx >= cinIdx && dIdx <= coutIdx;
    });

    // 1. Transit from virtual hotel start
    const isBetween = dayStay && dayStay.cin.dayId !== day.id && dayStay.cout.dayId !== day.id;
    const isCoutOnly = dayStay && dayStay.cout.dayId === day.id && dayStay.cin.dayId !== day.id;
    if ((isBetween || isCoutOnly) && locationStops.length > 0) {
        const hotelOrigin = { lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) };
        const firstStopDest = { lat: Number(locationStops[0].lat), lng: Number(locationStops[0].lng) };
        day.transitFromHotel = await fetchRouteDuration(hotelOrigin, firstStopDest, day.transitFromHotelMode || 'DRIVE');
    } else {
        day.transitFromHotel = null;
    }

    // 2. Normal segments between physical stops
    for (let i = 0; i < locationStops.length - 1; i++) {
        const lat1 = Number(locationStops[i].lat);
        const lng1 = Number(locationStops[i].lng);
        const lat2 = Number(locationStops[i + 1].lat);
        const lng2 = Number(locationStops[i + 1].lng);

        if (!isNaN(lat1) && !isNaN(lng1) && !isNaN(lat2) && !isNaN(lng2)) {
            const origin = { lat: lat1, lng: lng1 };
            const dest = { lat: lat2, lng: lng2 };
            const result = await fetchRouteDuration(origin, dest, locationStops[i].transitMode || 'DRIVE');
            locationStops[i].transitToNext = result;
        } else {
            console.warn('[computeTransitData] Invalid coordinates for stop index:', i);
            locationStops[i].transitToNext = null;
        }
    }
    if (locationStops.length > 0) {
        locationStops[locationStops.length - 1].transitToNext = null;
    }

    // 3. Transit back to virtual hotel end
    const isCinOnly = dayStay && dayStay.cin.dayId === day.id && dayStay.cout.dayId !== day.id;
    const isSameDayStay = dayStay && dayStay.cin.dayId === day.id && dayStay.cout.dayId === day.id;
    if ((isBetween || isCinOnly || isSameDayStay) && locationStops.length > 0) {
        // Find the last location stop that is NOT the check-in card itself (if it's on same day)
        // Actually the prompt says "每天行程默认从酒店出发，并在当天最后一项行程后默认返回酒店"
        // If it's CinOnly, the hotel is a stop. We return to hotel AFTER all other stops.
        const lastStop = locationStops[locationStops.length - 1];
        // If the last stop is already a hotel card, maybe we don't need a virtual "return" hint?
        // But the prompt says "这些只作为 UI 提示... 不生成额外卡片"
        const hotelDest = { lat: Number(dayStay.cin.lat), lng: Number(dayStay.cin.lng) };
        const lastStopOrigin = { lat: Number(lastStop.lat), lng: Number(lastStop.lng) };

        // Only add if last stop isn't already the hotel
        if (lastStop.id !== dayStay.cin.id) {
            day.transitToHotel = await fetchRouteDuration(lastStopOrigin, hotelDest, day.transitToHotelMode || 'DRIVE');
        } else {
            day.transitToHotel = null;
        }
    } else {
        day.transitToHotel = null;
    }

    saveData();

    // Re-render
    const dayEl = document.getElementById(dayId);
    const timeline = document.querySelector('.itinerary-timeline');
    if (dayEl && timeline) {
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, dayEl);
    }
}
