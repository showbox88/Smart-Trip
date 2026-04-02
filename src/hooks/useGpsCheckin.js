import { useEffect, useRef, useCallback } from 'react';

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Watch GPS position and notify when user is within radiusMeters of an unchecked stop.
 * Each stop is only notified once per session (notifiedIds ref).
 *
 * @param {object[]} stops  - location stops with lat/lng/checkedIn/id
 * @param {function} onNearby - called with the stop when user is near it
 * @param {number}   radiusMeters - default 100
 */
export function useGpsCheckin({ stops, onNearby, radiusMeters = 100 }) {
  const watchIdRef = useRef(null);
  const notifiedIds = useRef(new Set());

  const check = useCallback(
    (lat, lng) => {
      for (const stop of stops) {
        if (!stop.lat || !stop.lng) continue;
        if (stop.checkedIn) continue;
        if (notifiedIds.current.has(stop.id)) continue;
        const dist = haversineDistance(lat, lng, stop.lat, stop.lng);
        if (dist <= radiusMeters) {
          notifiedIds.current.add(stop.id);
          onNearby?.(stop);
        }
      }
    },
    [stops, onNearby, radiusMeters]
  );

  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => check(pos.coords.latitude, pos.coords.longitude),
      err => console.warn('[useGpsCheckin]', err.message),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [check]);

  // Allow parent to manually clear a stop from the notified set (e.g. after dismissing)
  const clearNotified = useCallback((stopId) => {
    notifiedIds.current.delete(stopId);
  }, []);

  return { clearNotified };
}
