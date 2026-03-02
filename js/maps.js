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

        // If real-map is a freshly rendered empty div (has no Google Maps panes injected yet), 
        // the old instance is detached. We must recreate it.
        if (googleMapInstance && mapDiv.childElementCount === 0) {
            googleMapInstance = null;
        }

        if (!googleMapInstance) {
            googleMapInstance = new google.maps.Map(mapDiv, {
                center: { lat: 35.6895, lng: 139.6917 },
                zoom: 12,
                mapId: 'DEMO_MAP_ID',          // Required for AdvancedMarkerElement
                disableDefaultUI: true,
                zoomControl: true
            });
        }

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

        // Clear existing routes
        if (window._mapRouteRenderers) {
            window._mapRouteRenderers.forEach(r => {
                if (r) r.setMap(null);
            });
        }
        window._mapRouteRenderers = [];

        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (!trip) return;

        const bounds = new google.maps.LatLngBounds();
        let hasValidPins = false;
        let totalPins = 0;

        trip.days.forEach(day => {
            // Skip collapsed days
            if (state.collapsedDays && state.collapsedDays[day.id]) return;
            if (!day.stops) return;

            let pinCount = 0;
            const dayColor = day.color || '#5b7a99';
            const routePath = []; // collect ordered positions for this day's polyline

            day.stops.forEach((stop) => {
                if (stop.type !== 'location' || !stop.location) return;
                pinCount++;
                totalPins++;
                if (stop.lat !== undefined && stop.lng !== undefined) {
                    const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
                    if (isNaN(pos.lat) || isNaN(pos.lng)) return;

                    // AdvancedMarkerElement replaces deprecated google.maps.Marker
                    const pinEl = document.createElement('div');
                    pinEl.style.cssText = `
                        width:26px; height:26px; border-radius:50% 50% 50% 0;
                        transform:rotate(-45deg); background:${dayColor};
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
            if (debugEl) debugEl.innerText = `Map Status: Ready (${totalPins} pins)`;
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
                await showMapInfoPanel(place, e.placeId);
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
async function showMapInfoPanel(place, placeId) {
    closeMapInfoPanel();
    const mapDiv = document.getElementById('real-map');
    const containerDiv = document.getElementById('mock-map-container');
    if (!mapDiv || !containerDiv) return;

    const { state } = await import('./state.js');

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

    // Build day options for custom dropdown
    const activeTrip = state.trips.find(t => t.id === state.activeTripId);
    let selectedDayId = activeTrip?.activeDayId || (activeTrip?.days?.[0]?.id);
    let selectedDay = activeTrip?.days?.find(d => d.id === selectedDayId);

    let dropdownHtml = '';
    if (activeTrip && activeTrip.days && activeTrip.days.length > 0) {
        if (!selectedDay) selectedDay = activeTrip.days[0];
        const selectedColor = selectedDay.color || '#5b7a99';

        let optionsHtml = activeTrip.days.map(d => {
            const dColor = d.color || '#5b7a99';
            return `
                <div class="map-day-option" data-value="${d.id}" style="padding: 0.8rem 1rem; display:flex; align-items:center; justify-content:flex-start; cursor:pointer; border-bottom: 1px solid var(--glass-border); border-radius:0;" onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.05))'" onmouseout="this.style.background='transparent'">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${dColor}; flex-shrink:0; margin-right: 1.2rem; transform: translateY(1px);"></div>
                    <div style="flex-grow:1; display:flex; align-items:center;">
                        <span style="color:var(--text-primary); font-size:1rem; font-weight:700; margin-right:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${d.title || d.id}</span>
                        <span style="color:var(--text-secondary); font-size:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${d.date}</span>
                    </div>
                </div>
            `;
        }).join('');

        dropdownHtml = `
            <div style="margin-top: 1rem; position:relative;" class="map-dropdown-container">
                <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; display:block;">选择日期:</label>
                
                <div class="map-custom-select" style="width:100%; padding: 0.8rem 1rem; background: transparent; border: 1px solid var(--glass-border); border-radius: 8px; font-size: 1rem; cursor:pointer; display:flex; align-items:center; justify-content:space-between;" onclick="const dp = this.nextElementSibling; dp.style.display = dp.style.display === 'none' ? 'block' : 'none'; event.stopPropagation();">
                    
                    <div style="display:flex; align-items:center;">
                        <div id="map-select-color" style="width: 14px; height: 14px; border-radius: 50%; background: ${selectedColor}; flex-shrink:0; margin-right: 1.2rem; transform: translateY(1px);"></div>
                        <div id="map-select-text-container" style="display:flex; align-items:center;">
                            <span id="map-select-title" style="color:var(--text-primary); font-size:1rem; font-weight:700; margin-right:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${selectedDay.title}</span>
                            <span id="map-select-date" style="color:var(--text-secondary); font-size:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${selectedDay.date}</span>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; justify-content:center; width: 32px; height: 32px; border:none; background:transparent;">
                        <span style="font-size:0.8rem; color:var(--text-secondary);">▼</span>
                    </div>

                </div>

                <div class="map-custom-dropdown" style="display:none; position:absolute; bottom: 100%; left:0; right:0; margin-bottom: 0.4rem; background: var(--bg-secondary, #1e2535); border: 1px solid var(--glass-border); border-radius: 8px; box-shadow: 0 -4px 15px rgba(0,0,0,0.5); z-index: 501; max-height: 200px; overflow-y:auto;">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    panel.innerHTML = `
        <button onclick="closeMapInfoPanel()" style="position:absolute;top:8px;right:10px;background:none;border:none;color:var(--text-secondary, #aaa);font-size:1.1rem;cursor:pointer;line-height:1;z-index:10;">✕</button>
        ${dropdownHtml}
        
        <button id="map-add-btn" style="
            margin-top:0.8rem; width:100%; padding:0.55rem 0;
            background:#f97316; color:#fff; border:none; border-radius:8px;
            font-weight:700; font-size:0.9rem; cursor:pointer; transition:opacity 0.2s;
        " onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            + 添加到行程
        </button>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
            ${photo ? `<img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:0.7rem;" onerror="this.style.display='none'">` : ''}
            <div style="font-weight:700;font-size:1rem;margin-bottom:0.3rem;padding-right:1.5rem;">${place.displayName || '未知地点'}</div>
            ${stars ? `<div style="font-size:0.82rem;color:#f4b942;margin-bottom:0.3rem;">${stars}</div>` : ''}
            <div style="font-size:0.8rem;color:var(--text-secondary, #aaa);" >${place.formattedAddress || ''}</div>
        </div>
    `;

    containerDiv.style.position = 'relative';
    containerDiv.appendChild(panel);

    // Dropdown selection logic
    let currentSelectedDayId = selectedDayId;
    const options = panel.querySelectorAll('.map-day-option');
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            currentSelectedDayId = opt.getAttribute('data-value');
            const colorDiv = opt.querySelector('div').style.background;

            // Get the text elements directly since we changed strong to span
            const spans = opt.querySelectorAll('div:nth-child(2) span');
            if (spans && spans.length >= 2) {
                const titleText = spans[0].innerText;
                const dateText = spans[1].innerText;

                panel.querySelector('#map-select-color').style.background = colorDiv;
                panel.querySelector('#map-select-text-container').innerHTML = `
                    <span id="map-select-title" style="color:var(--text-primary); font-size:1rem; font-weight:700; margin-right:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${titleText}</span>
                    <span id="map-select-date" style="color:var(--text-secondary); font-size:1rem; border:none !important; background:none !important; padding:0 !important; box-shadow:none !important;">${dateText}</span>
                `;
            }

            const dp = opt.closest('.map-custom-dropdown');
            if (dp) dp.style.display = 'none';
        });
    });

    // Close dropdown on outside click
    // We bind to 'window' rather than 'document' to avoid stale references,
    // and we name the handler so it can be removed if needed, but a cleaner way is:
    function handleOutsideClick(e) {
        const containers = document.querySelectorAll('.map-dropdown-container');
        containers.forEach(container => {
            const dp = container.querySelector('.map-custom-dropdown');
            const selectBox = container.querySelector('.map-custom-select');
            if (dp && dp.style.display === 'block') {
                if (!dp.contains(e.target) && selectBox && !selectBox.contains(e.target)) {
                    dp.style.display = 'none';
                }
            }
        });
    }
    document.removeEventListener('click', window._mapDropdownCloseHandler);
    window._mapDropdownCloseHandler = handleOutsideClick;
    document.addEventListener('click', window._mapDropdownCloseHandler);

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

            // Use user-selected day from custom dropdown
            const dayId = currentSelectedDayId || trip.days[0].id;

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
