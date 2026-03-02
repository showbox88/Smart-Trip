import { state } from './state.js';

const MAPS_API_KEY = 'AIzaSyCmUAhTA7jDkeC4A3R3BtF8QyiNOr0uD8k';

// --- Routes REST API helpers (replaces deprecated DirectionsService) ---
async function fetchRouteDuration(origin, dest) {
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
                travelMode: 'DRIVE'
            })
        });
        const data = await res.json();
        if (!data.routes || !data.routes[0]) return null;
        const route = data.routes[0];
        const seconds = parseInt(route.duration);  // e.g. "3600s" → 3600
        const meters = route.distanceMeters;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return {
            duration: h > 0 ? `${h} 小时 ${m} 分钟` : `${m} 分钟`,
            distance: `${(meters / 1000).toFixed(1)} 公里`
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
    if (mapDiv) {
        mapDiv.style.filter = mapDarkMode ? 'invert(90%) hue-rotate(180deg)' : '';
    }
    const btn = document.getElementById('map-dark-toggle');
    if (btn) {
        btn.innerText = mapDarkMode ? '☀️' : '🌙';
        btn.title = mapDarkMode ? '切换日间模式' : '切换夜间模式';
    }
}

export function initRealMap() {
    console.log("initRealMap called. googleMapsReady:", googleMapsReady);
    const debugEl = document.getElementById('map-debug-status');

    try {
        if (!googleMapsReady || typeof google === 'undefined') {
            if (debugEl) debugEl.innerText = "Map Status: Google Maps API Not Loaded";
            return;
        }
        const mapDiv = document.getElementById('real-map');
        if (!mapDiv) {
            console.error("real-map div not found");
            return;
        }
        if (debugEl) debugEl.innerText = "Map Status: Initializing Google Map Instance...";

        googleMapInstance = new google.maps.Map(mapDiv, {
            center: { lat: 35.6895, lng: 139.6917 },
            zoom: 12,
            mapId: 'DEMO_MAP_ID',          // Required for AdvancedMarkerElement
            disableDefaultUI: true,
            zoomControl: true
        });

        // Apply dark mode overlay via CSS since styles[] is incompatible with mapId
        if (mapDarkMode) {
            mapDiv.style.filter = 'invert(90%) hue-rotate(180deg)';
        } else {
            mapDiv.style.filter = '';
        }

        // Clear markers
        if (googleMapMarkers) {
            googleMapMarkers.forEach(m => {
                if (m && typeof m.setMap === 'function') m.setMap(null);
            });
        }
        googleMapMarkers = [];

        // Clear existing route
        if (window._mapRouteRenderer) {
            window._mapRouteRenderer.setMap(null);
            window._mapRouteRenderer = null;
        }

        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (!trip) return;

        const bounds = new google.maps.LatLngBounds();
        let hasValidPins = false;
        let pinCount = 0;
        const routePath = []; // collect ordered positions for polyline

        trip.days.forEach(day => {
            if (!day.stops) return;
            day.stops.forEach((stop) => {
                if (stop.type !== 'location' || !stop.location) return;
                pinCount++;
                if (stop.lat !== undefined && stop.lng !== undefined) {
                    const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
                    if (isNaN(pos.lat) || isNaN(pos.lng)) return;

                    // AdvancedMarkerElement replaces deprecated google.maps.Marker
                    const pinEl = document.createElement('div');
                    pinEl.style.cssText = `
                        width:26px; height:26px; border-radius:50% 50% 50% 0;
                        transform:rotate(-45deg); background:#5b7a99;
                        display:flex; align-items:center; justify-content:center;
                        box-shadow:0 2px 6px rgba(0,0,0,0.4);
                    `;
                    const label = document.createElement('span');
                    label.style.cssText = 'transform:rotate(45deg); color:#fff; font-size:0.7rem; font-weight:700; line-height:1;';
                    label.textContent = String(pinCount);
                    pinEl.appendChild(label);

                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        position: pos,
                        map: googleMapInstance,
                        title: stop.location,
                        content: pinEl
                    });
                    googleMapMarkers.push(marker);
                    bounds.extend(pos);
                    routePath.push(pos);
                    hasValidPins = true;
                }
            });
        });

        // Draw driving route via Routes REST API (replaces deprecated DirectionsService)
        if (routePath.length >= 2) {
            fetchRoutePolyline(routePath).then(path => {
                if (!path) return;
                if (window._mapRouteRenderer) {
                    window._mapRouteRenderer.setMap(null);
                }
                window._mapRouteRenderer = new google.maps.Polyline({
                    path,
                    strokeColor: '#f97316',
                    strokeOpacity: 0.85,
                    strokeWeight: 4,
                    map: googleMapInstance
                });
            });
        }

        if (hasValidPins) {
            googleMapInstance.fitBounds(bounds);
            if (debugEl) debugEl.innerText = `Map Status: Ready (${pinCount} pins)`;
            if (googleMapMarkers.length === 1) {
                setTimeout(() => { if (googleMapInstance) googleMapInstance.setZoom(15); }, 200);
            }
        } else {
            if (debugEl) debugEl.innerText = "Map Status: Ready (No locations to show)";
        }

        // Map click → show place info panel
        googleMapInstance.addListener('click', async (e) => {
            closeMapInfoPanel();
            if (!e.placeId) return;
            e.stop(); // prevent default Google infowindow
            try {
                const { Place } = await google.maps.importLibrary('places');
                const place = new Place({ id: e.placeId });
                await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'rating', 'types', 'photos'] });
                showMapInfoPanel(place, e.placeId);
            } catch (err) {
                console.warn('[map-click] fetchFields failed:', err);
            }
        });

    } catch (e) {
        console.error("initRealMap failed:", e);
        if (debugEl) debugEl.innerText = "Map Status: ERROR - " + e.message;
    }
}

// --- Map Info Panel ---
function showMapInfoPanel(place, placeId) {
    closeMapInfoPanel();
    const mapDiv = document.getElementById('real-map');
    const containerDiv = document.getElementById('mock-map-container');
    if (!mapDiv || !containerDiv) return;

    const { state } = { state: window._appState };

    const panel = document.createElement('div');
    panel.id = 'map-info-panel';
    panel.style.cssText = `
        position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        background:var(--bg-secondary, #1e2535); color:var(--text-primary, #e8eaf6); border-radius:14px;
        padding:1rem 1.2rem; min-width:260px; max-width:340px;
        box-shadow:0 8px 32px rgba(0,0,0,0.6); z-index:500;
        border:1px solid var(--glass-border, rgba(255,255,255,0.12)); font-family:inherit;
    `;

    const stars = place.rating ? '⭐ ' + place.rating.toFixed(1) : '';
    const photo = place.photos?.[0]?.getURI({ maxWidth: 300 }) || '';

    panel.innerHTML = `
        <button onclick="closeMapInfoPanel()" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-secondary, #aaa);font-size:1.1rem;cursor:pointer;line-height:1;">✕</button>
        ${photo ? `<img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:0.7rem;" onerror="this.style.display='none'">` : ''}
        <div style="font-weight:700;font-size:1rem;margin-bottom:0.3rem;padding-right:1.5rem;">${place.displayName || '未知地点'}</div>
        ${stars ? `<div style="font-size:0.82rem;color:#f4b942;margin-bottom:0.3rem;">${stars}</div>` : ''}
        <div style="font-size:0.8rem;color:var(--text-secondary, #aaa);" >${place.formattedAddress || ''}</div>
        <button id="map-add-btn" style="
            margin-top:0.8rem; width:100%; padding:0.55rem 0;
            background:#f97316; color:#fff; border:none; border-radius:8px;
            font-weight:700; font-size:0.9rem; cursor:pointer; transition:opacity 0.2s;
        " onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            + 添加到行程
        </button>
    `;

    containerDiv.style.position = 'relative';
    containerDiv.appendChild(panel);

    // Add button handler
    panel.querySelector('#map-add-btn').addEventListener('click', async () => {
        const btn = panel.querySelector('#map-add-btn');
        btn.textContent = '添加中...';
        btn.disabled = true;
        try {
            const { state } = await import('./state.js');
            const trip = state.trips.find(t => t.id === state.activeTripId);
            if (!trip || !trip.days || trip.days.length === 0) {
                alert('请先确保行程中有日期');
                btn.textContent = '+ 添加到行程';
                btn.disabled = false;
                return;
            }
            // Use active day, or first day
            const dayId = trip.activeDayId || trip.days[0].id;
            const { autoAddStop } = await import('./ui/handlers/stops.js');
            await autoAddStop(dayId, placeId);
            btn.textContent = '✓ 已添加';
            setTimeout(() => closeMapInfoPanel(), 1200);
        } catch (err) {
            console.error('[map-add] failed:', err);
            btn.textContent = '失败，请重试';
            btn.disabled = false;
        }
    });
}

export function closeMapInfoPanel() {
    const panel = document.getElementById('map-info-panel');
    if (panel) panel.remove();
}

// Expose globally so onclick="closeMapInfoPanel()" in HTML works
window.closeMapInfoPanel = closeMapInfoPanel;

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
        (s.type === 'location' || !s.type) &&
        s.lat !== undefined && s.lat !== null && s.lat !== '' &&
        s.lng !== undefined && s.lng !== null && s.lng !== ''
    );
    if (locationStops.length < 2) {
        console.log('[transit] Not enough location stops with coordinates:', locationStops.length);
        return;
    }
    console.log('[transit] Computing transit for', locationStops.length, 'stops in day', dayId);

    // Use Routes REST API (replaces deprecated DirectionsService)
    for (let i = 0; i < locationStops.length - 1; i++) {
        const origin = { lat: Number(locationStops[i].lat), lng: Number(locationStops[i].lng) };
        const dest = { lat: Number(locationStops[i + 1].lat), lng: Number(locationStops[i + 1].lng) };
        const result = await fetchRouteDuration(origin, dest);
        locationStops[i].transitToNext = result; // null if failed
        if (result) {
            console.log(`[transit] ${locationStops[i].location} → ${locationStops[i + 1].location}: ${result.duration}, ${result.distance}`);
        } else {
            console.error(`[transit] Failed stop ${i}→${i + 1}. Ensure "Routes API" is enabled in Google Cloud Console.`);
        }
    }

    // Clear last stop's transit
    locationStops[locationStops.length - 1].transitToNext = null;

    saveData();

    // Re-render only the affected day
    const dayEl = document.getElementById(dayId);
    const timeline = document.querySelector('.itinerary-timeline');
    if (dayEl && timeline) {
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, dayEl);
    }
}
