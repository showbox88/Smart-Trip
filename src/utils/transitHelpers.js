import { checkApiAllowed, logApiCall } from './apiGuard';
import { getRouteCache, saveRouteCache } from './routeCache';

// Map legacy REST API travel modes to JS SDK values
const TRAVEL_MODE_MAP = {
  'DRIVE': 'DRIVING',
  'WALK': 'WALKING',
  'BICYCLE': 'BICYCLING',
  'TRANSIT': 'TRANSIT',
  'TWO_WHEELER': 'TWO_WHEELER',
};

async function fetchRouteForMode(origin, dest, mode) {
  // 查 DB 缓存
  const cached = await getRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, mode);
  if (cached) {
    return { duration: cached.duration_seconds, distance: cached.distance_meters, mode };
  }

  const { Route } = await google.maps.importLibrary('routes');
  const { routes } = await Route.computeRoutes({
    origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
    destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
    travelMode: mode,
    fields: ['durationMillis', 'distanceMeters'],
  });

  if (!routes?.[0]) return null;

  const route = routes[0];
  const result = {
    duration: Math.round((route.durationMillis || 0) / 1000),
    distance: route.distanceMeters,
    mode,
  };

  saveRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, mode, {
    durationSeconds: result.duration,
    distanceMeters: result.distance,
  });

  return result;
}

// Use classic DirectionsService — returns clean, non-obfuscated transit details
function directionsServiceTransit(origin, dest, provideAlternatives = false) {
  return new Promise((resolve) => {
    const svc = new google.maps.DirectionsService();
    svc.route({
      origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
      destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
      travelMode: 'TRANSIT',
      provideRouteAlternatives: provideAlternatives,
    }, (result, status) => {
      if (status === 'OK' && result?.routes?.length) {
        resolve(result.routes);
      } else {
        resolve(null);
      }
    });
  });
}

function parseDirectionsRoute(route) {
  const leg = route.legs?.[0];
  if (!leg) return null;

  const steps = (leg.steps || []).map(step => {
    const isTransit = step.travel_mode === 'TRANSIT';
    const t = step.transit;
    return {
      travelMode: step.travel_mode, // 'WALKING' or 'TRANSIT'
      duration: step.duration?.value || 0,
      distance: step.distance?.value || 0,
      durationText: step.duration?.text || '',
      distanceText: step.distance?.text || '',
      instructions: step.instructions || '',
      encodedPolyline: step.polyline?.points || null,
      // Transit-specific
      lineColor: isTransit ? (t?.line?.color || null) : null,
      lineName: isTransit ? (t?.line?.short_name || t?.line?.name || null) : null,
      vehicleType: isTransit ? (t?.line?.vehicle?.type || null) : null,
      vehicleIcon: isTransit ? (t?.line?.vehicle?.icon || null) : null,
      departureStop: isTransit ? (t?.departure_stop?.name || null) : null,
      arrivalStop: isTransit ? (t?.arrival_stop?.name || null) : null,
      stopCount: isTransit ? (t?.num_stops || null) : null,
      departureTime: isTransit ? (t?.departure_time?.text || null) : null,
      arrivalTime: isTransit ? (t?.arrival_time?.text || null) : null,
    };
  });

  return {
    duration: leg.duration?.value || 0,
    distance: leg.distance?.value || 0,
    durationText: leg.duration?.text || '',
    distanceText: leg.distance?.text || '',
    departureTime: leg.departure_time?.text || null,
    arrivalTime: leg.arrival_time?.text || null,
    mode: 'TRANSIT',
    steps,
  };
}

export async function fetchTransitDetails(origin, dest) {
  // 查 DB 缓存
  const cached = await getRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, 'TRANSIT');
  if (cached?.polyline_data) {
    return {
      duration: cached.duration_seconds,
      distance: cached.distance_meters,
      mode: 'TRANSIT',
      steps: cached.polyline_data.steps || [],
      durationText: '',
      distanceText: '',
      departureTime: null,
      arrivalTime: null,
    };
  }

  try {
    const routes = await directionsServiceTransit(origin, dest, false);
    if (!routes) return null;
    const result = parseDirectionsRoute(routes[0]);
    if (result) {
      saveRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, 'TRANSIT', {
        durationSeconds: result.duration,
        distanceMeters: result.distance,
        polylineData: { steps: result.steps },
      });
    }
    return result;
  } catch (err) {
    console.error('[transitHelpers] fetchTransitDetails failed:', err);
    return null;
  }
}

// Fetch multiple transit route alternatives (for the detail panel)
export async function fetchTransitAlternatives(origin, dest) {
  // alternatives 不走 DB 缓存（每次可能有新班次），但走内存缓存
  const memKey = `transit-alts:${origin.lat},${origin.lng}|${dest.lat},${dest.lng}`;
  if (fetchTransitAlternatives._cache?.has(memKey)) return fetchTransitAlternatives._cache.get(memKey);

  try {
    if (typeof google === 'undefined') return null;
    const routes = await directionsServiceTransit(origin, dest, true);
    if (!routes) return null;
    const parsed = routes.map(r => parseDirectionsRoute(r)).filter(Boolean);
    if (parsed.length) {
      if (!fetchTransitAlternatives._cache) fetchTransitAlternatives._cache = new Map();
      fetchTransitAlternatives._cache.set(memKey, parsed);
    }
    return parsed;
  } catch (err) {
    console.error('[transitHelpers] fetchTransitAlternatives failed:', err);
    return null;
  }
}

export async function fetchRouteDuration(origin, dest, travelMode = 'DRIVE', userId = null) {
  try {
    if (typeof google === 'undefined') return null;

    const { allowed, reason } = await checkApiAllowed('directions', userId);
    if (!allowed) {
      console.warn('[transitHelpers] directions blocked:', reason);
      return null;
    }

    const primaryMode = TRAVEL_MODE_MAP[travelMode] || travelMode;

    // For TRANSIT mode, fetch with step-level detail
    if (primaryMode === 'TRANSIT') {
      return await fetchTransitDetails(origin, dest);
    }

    const result = await fetchRouteForMode(origin, dest, primaryMode);
    if (result) { logApiCall('directions', userId, 'success'); return result; }

    // Fallback: if DRIVE/WALK returned nothing (e.g. South Korea restriction), try TRANSIT with steps
    const fallback = await fetchTransitDetails(origin, dest);
    if (fallback) logApiCall('directions', userId, 'success');
    return fallback;
  } catch (err) {
    console.error('[transitHelpers] fetchRouteDuration failed:', err);
    return null;
  }
}
