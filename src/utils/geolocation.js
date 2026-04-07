/**
 * Shared geolocation utility.
 * Uses @capacitor/geolocation on native, falls back to browser API on web.
 */

/** Returns true when running inside a Capacitor native app */
export function isCapacitorNative() {
  return !!(window.Capacitor?.isNativePlatform?.());
}

/**
 * Get current position — Capacitor-first, browser fallback.
 * Returns { latitude, longitude, accuracy }
 */
export async function getCurrentPosition({ enableHighAccuracy = true, timeout = 10000, maximumAge = 0 } = {}) {
  // On native (Android / iOS) always use Capacitor plugin
  if (isCapacitorNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  }

  // Web: use browser geolocation
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      reject,
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

/**
 * Returns true if geolocation is usable in the current environment.
 * On native always true; on web requires HTTPS or localhost.
 */
export function isGeolocationAvailable() {
  if (isCapacitorNative()) return true;
  return !!(
    navigator.geolocation &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  );
}
