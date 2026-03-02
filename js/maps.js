import { state } from './state.js';

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
    if (googleMapInstance) {
        googleMapInstance.setOptions({
            styles: mapDarkMode ? DARK_STYLES : []
        });
    }
    // Update button visual
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
            styles: mapDarkMode ? DARK_STYLES : [],
            disableDefaultUI: true,
            zoomControl: true
        });

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

                    const marker = new google.maps.Marker({
                        position: pos,
                        map: googleMapInstance,
                        title: stop.location,
                        label: { text: String(pinCount), color: 'white', fontSize: '10px' }
                    });
                    googleMapMarkers.push(marker);
                    bounds.extend(pos);
                    routePath.push(pos);
                    hasValidPins = true;
                }
            });
        });

        // Draw driving route between stops using Directions API
        if (routePath.length >= 2) {
            const directionsService = new google.maps.DirectionsService();

            // Directions API supports max 25 waypoints (origin + destination + 23 waypoints)
            const origin = routePath[0];
            const destination = routePath[routePath.length - 1];
            const waypoints = routePath.slice(1, -1).map(pos => ({
                location: pos,
                stopover: true
            }));

            directionsService.route({
                origin: origin,
                destination: destination,
                waypoints: waypoints.slice(0, 23), // API limit
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false // keep user's order
            }, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    // Clear previous renderer
                    if (window._mapRouteRenderer) {
                        window._mapRouteRenderer.setMap(null);
                    }
                    window._mapRouteRenderer = new google.maps.DirectionsRenderer({
                        map: googleMapInstance,
                        directions: result,
                        suppressMarkers: true, // we have our own numbered markers
                        polylineOptions: {
                            strokeColor: '#f97316',
                            strokeOpacity: 0.85,
                            strokeWeight: 4
                        }
                    });
                } else {
                    console.warn("Directions request failed:", status);
                }
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
    } catch (e) {
        console.error("initRealMap failed:", e);
        if (debugEl) debugEl.innerText = "Map Status: ERROR - " + e.message;
    }
}
