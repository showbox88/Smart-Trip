const MAPS_API_KEY = 'AIzaSyCmUAhTA7jDkeC4A3R3BtF8QyiNOr0uD8k';

export async function fetchRouteDuration(origin, dest, travelMode = 'DRIVE') {
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
      console.warn('[transitHelpers] API returned no routes');
      return null;
    }
    const route = data.routes[0];
    const durationStr = route.duration || '0s';
    const seconds = parseInt(durationStr.toString().replace(/[^0-9]/g, ''), 10);
    const meters = route.distanceMeters;

    return {
      duration: seconds, // Store raw seconds
      distance: meters,  // Store raw meters
    };
  } catch (err) {
    console.error('[transitHelpers] fetchRouteDuration failed:', err);
    return null;
  }
}
