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
                if ((stop.type && stop.type !== 'location') || !stop.location) return;
                pinCount++;
                totalPins++;
                if (stop.lat !== undefined && stop.lng !== undefined) {
                    const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
                    if (isNaN(pos.lat) || isNaN(pos.lng)) return;

                    // Use img + SVG data-URI for custom marker:
                    // This bypasses the AdvancedMarkerElement shadow-DOM white background wrapper.
                    console.log(`[maps] Creating custom SVG marker #${pinCount} color:${dayColor}`);
                    const encodedSvg = encodeURIComponent(`<svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 44 18 44 C18 44 36 31.5 36 18 C36 8.06 27.94 0 18 0Z" fill="${dayColor}" stroke="white" stroke-width="1.5" opacity="0.95"/>
                        <circle cx="18" cy="18" r="11" fill="#1a2235" opacity="0.9"/>
                        <text x="18" y="23" text-anchor="middle" fill="white" font-size="13" font-weight="800" font-family="Arial, sans-serif">${pinCount}</text>
                    </svg>`);
                    const markerImg = document.createElement('img');
                    markerImg.src = `data:image/svg+xml,${encodedSvg}`;
                    markerImg.width = 36;
                    markerImg.height = 44;
                    markerImg.style.cssText = `
                        cursor: pointer;
                        transition: transform 0.2s;
                        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.7));
                        display: block;
                    `;
                    markerImg.onmouseenter = () => markerImg.style.transform = 'scale(1.2) translateY(-4px)';
                    markerImg.onmouseleave = () => markerImg.style.transform = 'scale(1) translateY(0)';

                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        position: pos,
                        map: googleMapInstance,
                        title: stop.location,
                        content: markerImg
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
                await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'rating', 'userRatingCount', 'types', 'photos', 'priceLevel', 'regularOpeningHours', 'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteURI', 'reviews'] });
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

    // Horizontal layout: height=50%-10px of map, width=80% of map, left=8px, bottom=8px gap
    panel.style.cssText = `
        position:absolute; bottom:8px; left:8px; 
        width: 80%; height: calc(50% - 10px); min-height: 200px; max-width: none;
        background:var(--bg-primary, #1e2535); color:var(--text-primary, #e8eaf6); border-radius:12px;
        box-shadow:0 12px 40px rgba(0,0,0,0.6); z-index:500;
        border:1px solid var(--glass-border, rgba(255,255,255,0.12)); 
        display:flex; flex-direction:column; overflow:hidden; font-family:inherit;
    `;

    const stars = place.rating !== undefined ? place.rating.toFixed(1) : '';
    const ratingNum = place.rating || 0;
    const starsStr = '★'.repeat(Math.round(ratingNum)) + '☆'.repeat(5 - Math.round(ratingNum));

    // Main photo
    const photo = place.photos?.[0] ? place.photos[0].getURI({ maxWidth: 600 }) : '';

    // Reviews HTML
    let reviewsHtml = '<div style="color:var(--text-secondary);text-align:center;padding:1rem;">暂无评价</div>';
    if (place.reviews && place.reviews.length > 0) {
        reviewsHtml = place.reviews.map(r => `
            <div style="border-bottom:1px solid var(--glass-border); padding-bottom:1rem; margin-bottom:1rem;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    ${r.authorURI ? `<img src="${r.authorPhotoURI}" style="width:28px;height:28px;border-radius:50%;">` : '<div style="width:28px;height:28px;border-radius:50%;background:#5b7a99;display:flex;align-items:center;justify-content:center;font-size:12px;">👤</div>'}
                    <span style="font-weight:600;font-size:0.9rem;">${r.authorAttribution?.displayName || '匿名用户'}</span>
                    <span style="color:#f4b942;font-size:0.8rem;margin-left:auto;">${'★'.repeat(r.rating || 5)}</span>
                </div>
                <!-- Truncated text -->
                <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.5; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;">${r.text || ''}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px;">${r.relativePublishTimeDescription || ''}</div>
            </div>
        `).join('');
    }

    // Photos HTML
    let photosHtml = '<div style="color:var(--text-secondary);text-align:center;padding:1rem;width:100%;">暂无照片</div>';
    if (place.photos && place.photos.length > 0) {
        photosHtml = place.photos.map(p => `
            <div style="aspect-ratio:1; border-radius:8px; overflow:hidden; background:#2a3441;">
                <img src="${p.getURI({ maxWidth: 300 })}" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display='none'">
            </div>
        `).join('');
    }

    // Process Price and Type
    const priceLevels = ['免费', '$', '$$', '$$$', '$$$$'];
    const priceText = place.priceLevel !== undefined && place.priceLevel !== null && place.priceLevel >= 0 ? priceLevels[place.priceLevel] || '$$' : '';
    const priceHtml = priceText ? `<span style="background:rgba(255,255,255,0.08); padding:3px 10px; border-radius:12px; font-size:0.75rem;">${priceText}</span>` : '';

    let placeType = place.types?.[0] ? place.types[0].replace(/_/g, ' ') : '';
    const typeHtml = placeType ? `<span style="background:rgba(255,255,255,0.08); padding:3px 10px; border-radius:12px; font-size:0.75rem; text-transform:capitalize;">${placeType}</span>` : '';

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

        dropdownOptionsHtml = activeTrip.days.map(d => {
            const dColor = d.color || '#5b7a99';
            return `
                <div class="map-day-option" data-value="${d.id}" data-title="${d.title || ('第' + (activeTrip.days.indexOf(d) + 1) + '天')}" style="padding: 0.8rem 1rem; display:flex; align-items:center; cursor:pointer; border-bottom: 1px solid var(--glass-border);" onmouseover="this.style.background='var(--bg-hover, rgba(255,255,255,0.05))'" onmouseout="this.style.background='transparent'">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${dColor}; margin-right: 12px;"></div>
                    <span style="color:var(--text-primary); font-size:0.95rem; font-weight:600;">${d.title || ('第' + (activeTrip.days.indexOf(d) + 1) + '天')}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem; margin-left:auto;">${d.date}</span>
                </div>
            `;
        }).join('');
    }

    let defaultDayTitle = selectedDay?.title || (selectedDay ? ('第' + (activeTrip.days.indexOf(selectedDay) + 1) + '天') : '选择日期');

    panel.innerHTML = `
        <div style="display:flex; border-bottom:1px solid var(--glass-border); padding: 0 0.5rem; position:relative; background:var(--bg-secondary); flex-shrink:0;">
            <button class="poi-tab active" data-target="poi-about" style="padding:12px 16px; background:none; border:none; color:var(--accent-primary); font-weight:700; border-bottom:2px solid var(--accent-primary); cursor:pointer; font-size:0.95rem;">简介 (About)</button>
            <button class="poi-tab" data-target="poi-reviews" style="padding:12px 16px; background:none; border:none; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.95rem;">评价 (Reviews)</button>
            <button class="poi-tab" data-target="poi-photos" style="padding:12px 16px; background:none; border:none; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.95rem;">照片 (Photos)</button>
            <button onclick="closeMapInfoPanel()" style="position:absolute; right:12px; top:10px; background:rgba(255,255,255,0.05); border:none; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; color:var(--text-primary); cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">✕</button>
        </div>
        
        <div style="flex:1; overflow-y:auto; padding: 1.2rem; position:relative;" class="custom-scrollbar">
            <!-- About Tab -->
            <div class="poi-tab-content active" id="poi-about" style="display:flex; gap: 1.5rem; height: 100%;">
                
                <!-- Left Column: Info & Button -->
                <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between;">
                        <div>
                            <h2 style="margin:0 0 0.4rem 0; font-size:1.5rem; font-weight:800; line-height:1.2; word-break:break-word;">
                                <span style="font-size:1.2rem; margin-right:4px;">📍</span> ${place.displayName || '未知地点'}
                            </h2>
                            <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-secondary); margin-bottom:0.8rem; flex-wrap:wrap;">
                                ${priceHtml} ${typeHtml}
                            </div>
                            <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:1.5rem;">
                                ${stars ? `
                                <span style="color:#f4b942; font-weight:800; font-size:1.1rem;">${stars}</span>
                                <span style="color:#f4b942; font-size:1.1rem; letter-spacing:1px; line-height:1;">${starsStr}</span>
                                <span style="color:var(--text-secondary); font-size:0.85rem; margin-left:4px;">(${place.userRatingCount || 0} reviews)</span>
                                ` : '<span style="color:var(--text-secondary); font-size:0.85rem;">暂无评分</span>'}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 24px 1fr; gap: 10px 8px; color:var(--text-primary); font-size:0.9rem; align-items:start; margin-bottom: 1.5rem;">
                        <span style="font-size:1.1rem; text-align:center;">📍</span> <span style="line-height:1.4;">${place.formattedAddress || '未知地址'}</span>
                        ${todayHours ? `<span style="font-size:1.1rem; text-align:center;">🕒</span> <span style="line-height:1.4;">${todayHours}</span>` : ''}
                        ${place.internationalPhoneNumber ? `<span style="font-size:1.1rem; text-align:center;">📞</span> <span style="line-height:1.4; color:var(--accent-primary); cursor:pointer;">${place.internationalPhoneNumber}</span>` : ''}
                        ${place.websiteURI ? `<span style="font-size:1.1rem; text-align:center;">🌐</span> <a href="${place.websiteURI}" target="_blank" style="color:var(--accent-primary); text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; line-height:1.4;">${place.websiteURI}</a>` : ''}
                    </div>

                    <!-- Add Button pushes to bottom if needed -->
                    <div style="margin-top:auto;">
                        <!-- Orange Add to Trip Split Button -->
                        <div style="display:inline-flex; align-items:stretch; background:#f97316; border-radius:8px; box-shadow:0 4px 10px rgba(249,115,22,0.3);">
                            <button id="map-add-btn" style="background:transparent; color:white; border:none; padding:10px 18px; font-weight:700; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; gap:6px; border-radius:8px 0 0 8px;" onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='transparent'">
                                <span>+</span> 添加到行程
                            </button>
                            ${activeTrip && activeTrip.days.length > 0 ? `
                            <div style="width:1px; background:rgba(255,255,255,0.3); margin:6px 0;"></div>
                            <div class="map-dropdown-container" style="position:relative; display:flex;">
                                <button id="map-day-trigger" class="map-custom-select" style="background:transparent; color:white; border:none; padding:10px 14px 10px 10px; cursor:pointer; display:flex; align-items:center; gap:4px; font-weight:600; font-size:0.9rem; border-radius:0 8px 8px 0;" onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='transparent'">
                                    <span id="map-selected-day-txt" style="max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${defaultDayTitle}</span> <span style="font-size:0.7rem;">▼</span>
                                </button>
                                <!-- The dropdown itself drops UP because it's at the bottom of the widget -->
                                <div class="map-custom-dropdown" style="display:none; position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); background:var(--bg-secondary); border:1px solid var(--glass-border); border-radius:12px; min-width:200px; box-shadow:0 -8px 24px rgba(0,0,0,0.6); z-index:100; overflow:hidden;">
                                    ${dropdownOptionsHtml}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Right Column: Big Image -->
                ${photo ? `
                <div style="flex:0 0 50%; max-width: 400px; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                    <img src="${photo}" style="width:100%;height:100%;object-fit:cover;">
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

    // Dropdown selection logic
    let currentSelectedDayId = selectedDayId;
    const options = panel.querySelectorAll('.map-day-option');
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            currentSelectedDayId = opt.getAttribute('data-value');
            const titleTxt = opt.getAttribute('data-title');
            const txtEl = panel.querySelector('#map-selected-day-txt');
            if (txtEl) txtEl.innerText = titleTxt;

            const dp = opt.closest('.map-custom-dropdown');
            if (dp) dp.style.display = 'none';
            e.stopPropagation();
        });
    });

    // Close dropdown on outside click
    function handleOutsideClick(e) {
        const containers = document.querySelectorAll('.map-dropdown-container');
        containers.forEach(container => {
            const dp = container.querySelector('.map-custom-dropdown');
            const triggerBtn = container.querySelector('#map-day-trigger');
            if (dp && dp.style.display === 'block') {
                if (!dp.contains(e.target) && triggerBtn && !triggerBtn.contains(e.target)) {
                    dp.style.display = 'none';
                }
            }
        });
    }
    document.removeEventListener('click', window._mapDropdownCloseHandler);
    window._mapDropdownCloseHandler = handleOutsideClick;
    document.addEventListener('click', window._mapDropdownCloseHandler);

    // Dropdown Trigger Logic
    const triggerBtn = panel.querySelector('#map-day-trigger');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
            const dropdown = panel.querySelector('.map-custom-dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            }
            e.stopPropagation();
        });
    }

    // Add button handler
    const addBtn = panel.querySelector('#map-add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            addBtn.innerHTML = '<span>⏳</span> 添加中...';
            addBtn.disabled = true;
            try {
                const { state } = await import('./state.js');
                const trip = state.trips.find(t => t.id === state.activeTripId);
                if (!trip || !trip.days || trip.days.length === 0) {
                    alert('请先确保行程中有日期');
                    addBtn.innerHTML = '<span>+</span> 添加到行程';
                    addBtn.disabled = false;
                    return;
                }

                const dayId = currentSelectedDayId || trip.days[0].id;
                const { autoAddStop } = await import('./ui/handlers/stops.js');
                await autoAddStop(dayId, placeId);

                addBtn.innerHTML = '<span>✓</span> 已添加';
                setTimeout(() => {
                    panel.remove();
                    if (window.closeMapInfoPanel) window.closeMapInfoPanel();
                }, 1200);
            } catch (err) {
                console.error('[map-add] failed:', err);
                addBtn.innerHTML = '<span>❌</span> 失败，请重试';
                addBtn.disabled = false;
            }
        });
    }
}

export function closeMapInfoPanel() {
    const panels = document.querySelectorAll('#map-info-panel');
    panels.forEach(p => p.remove());
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
