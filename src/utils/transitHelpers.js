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

export async function fetchRouteDuration(origin, dest, travelMode = 'DRIVE') {
  try {
    if (typeof google === 'undefined') return null;
    
    const mode = TRAVEL_MODE_MAP[travelMode] || travelMode;
    
    // Create a unique key for the cache
    const cacheKey = `${origin.lat},${origin.lng}|${dest.lat},${dest.lng}|${mode}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey);
    }

    const { Route } = await google.maps.importLibrary('routes');

    const { routes } = await Route.computeRoutes({
      origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
      destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
      travelMode: mode,
      fields: ['durationMillis', 'distanceMeters'],
    });

    if (!routes?.[0]) {
      console.warn('[transitHelpers] Routes API returned no routes');
      return null;
    }

    const route = routes[0];
    const seconds = Math.round((route.durationMillis || 0) / 1000);
    const meters = route.distanceMeters;

    const result = {
      duration: seconds,
      distance: meters,
    };

    // Store in cache
    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[transitHelpers] fetchRouteDuration failed:', err);
    return null;
  }
}
