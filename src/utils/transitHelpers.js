// Map legacy REST API travel modes to JS SDK values
const TRAVEL_MODE_MAP = {
  'DRIVE': 'DRIVING',
  'WALK': 'WALKING',
  'BICYCLE': 'BICYCLING',
  'TRANSIT': 'TRANSIT',
  'TWO_WHEELER': 'TWO_WHEELER',
};

export async function fetchRouteDuration(origin, dest, travelMode = 'DRIVING') {
  try {
    if (typeof google === 'undefined') return null;
    const { Route } = await google.maps.importLibrary('routes');
    const mode = TRAVEL_MODE_MAP[travelMode] || travelMode;

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

    return {
      duration: seconds,
      distance: meters,
    };
  } catch (err) {
    console.error('[transitHelpers] fetchRouteDuration failed:', err);
    return null;
  }
}
