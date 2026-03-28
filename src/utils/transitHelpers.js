// Map legacy REST API travel modes to JS SDK values
const TRAVEL_MODE_MAP = {
  'DRIVE': 'DRIVING',
  'WALK': 'WALKING',
  'BICYCLE': 'BICYCLING',
  'TRANSIT': 'TRANSIT',
  'TWO_WHEELER': 'TWO_WHEELER',
};

// In-memory cache to avoid hitting Quota limits on repeated requests
const routeCache = new Map();

async function fetchRouteForMode(origin, dest, mode) {
  const cacheKey = `${origin.lat},${origin.lng}|${dest.lat},${dest.lng}|${mode}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

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
  routeCache.set(cacheKey, result);
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
  const cacheKey = `transit-detail:${origin.lat},${origin.lng}|${dest.lat},${dest.lng}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  try {
    const routes = await directionsServiceTransit(origin, dest, false);
    if (!routes) return null;
    const result = parseDirectionsRoute(routes[0]);
    if (result) routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[transitHelpers] fetchTransitDetails failed:', err);
    return null;
  }
}

// Fetch multiple transit route alternatives (for the detail panel)
export async function fetchTransitAlternatives(origin, dest) {
  const cacheKey = `transit-alts:${origin.lat},${origin.lng}|${dest.lat},${dest.lng}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  try {
    if (typeof google === 'undefined') return null;
    const routes = await directionsServiceTransit(origin, dest, true);
    if (!routes) return null;
    const parsed = routes.map(r => parseDirectionsRoute(r)).filter(Boolean);
    if (parsed.length) routeCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('[transitHelpers] fetchTransitAlternatives failed:', err);
    return null;
  }
}

export async function fetchRouteDuration(origin, dest, travelMode = 'DRIVE') {
  try {
    if (typeof google === 'undefined') return null;

    const primaryMode = TRAVEL_MODE_MAP[travelMode] || travelMode;

    // For TRANSIT mode, fetch with step-level detail
    if (primaryMode === 'TRANSIT') {
      return await fetchTransitDetails(origin, dest);
    }

    const result = await fetchRouteForMode(origin, dest, primaryMode);
    if (result) return result;

    // Fallback: if DRIVE/WALK returned nothing (e.g. South Korea restriction), try TRANSIT with steps
    return await fetchTransitDetails(origin, dest);
  } catch (err) {
    console.error('[transitHelpers] fetchRouteDuration failed:', err);
    return null;
  }
}
