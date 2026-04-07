import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Haversine distance in meters (duplicated from useGpsCheckin to avoid coupling).
 */
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

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_RADIUS = 5000; // 5 km
const MAX_RESULTS = 10;

function cacheKey(lat, lng, type) {
  return `st-sos-nearby:${lat.toFixed(2)},${lng.toFixed(2)},${type}`;
}

function readCache(lat, lng, type) {
  try {
    const key = cacheKey(lat, lng, type);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

function writeCache(lat, lng, type, data) {
  try {
    const key = cacheKey(lat, lng, type);
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Search nearby emergency services (hospital, pharmacy, police) via Google Places API.
 * Results are cached in localStorage for offline use.
 *
 * @param {'hospital'|'pharmacy'|'police'} serviceType
 * @param {{ lat: number, lng: number }|null} position - user's current GPS position
 * @returns {{ results, loading, error, fromCache, refresh }}
 */
export function useEmergencyNearby(serviceType, position) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const fetchedRef = useRef(null); // track what we've fetched to avoid duplicates

  const fetchNearby = useCallback(async (pos, force = false) => {
    if (!pos?.lat || !pos?.lng) return;
    if (!window.google?.maps) {
      setError('Google Maps not loaded');
      return;
    }

    // Check cache first (unless forced refresh)
    if (!force) {
      const cached = readCache(pos.lat, pos.lng, serviceType);
      if (cached) {
        // Add distance to cached results
        const withDist = cached.map(r => ({
          ...r,
          distance: haversineDistance(pos.lat, pos.lng, r.lat, r.lng),
        }));
        setResults(withDist.sort((a, b) => a.distance - b.distance));
        setFromCache(true);
        return;
      }
    }

    // Avoid duplicate fetches for same position
    const posKey = `${pos.lat.toFixed(2)},${pos.lng.toFixed(2)},${serviceType}`;
    if (!force && fetchedRef.current === posKey) return;
    fetchedRef.current = posKey;

    setLoading(true);
    setError(null);
    setFromCache(false);

    try {
      const { Place } = await google.maps.importLibrary('places');
      const center = new google.maps.LatLng(pos.lat, pos.lng);

      const request = {
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours', 'rating'],
        locationRestriction: {
          center,
          radius: SEARCH_RADIUS,
        },
        includedPrimaryTypes: [serviceType],
        maxResultCount: MAX_RESULTS,
        language: 'en',
      };

      const { places } = await Place.searchNearby(request);

      const mapped = (places || []).map(p => {
        const lat = p.location?.lat() ?? 0;
        const lng = p.location?.lng() ?? 0;
        return {
          id: p.id,
          name: p.displayName || 'Unknown',
          address: p.formattedAddress || '',
          phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
          rating: p.rating || null,
          lat,
          lng,
          isOpen: p.regularOpeningHours?.isOpen?.() ?? null,
          distance: haversineDistance(pos.lat, pos.lng, lat, lng),
        };
      }).sort((a, b) => a.distance - b.distance);

      setResults(mapped);
      // Cache for offline use (without distance, which depends on user position)
      writeCache(pos.lat, pos.lng, serviceType, mapped.map(({ distance, ...rest }) => rest));
    } catch (err) {
      console.error('[useEmergencyNearby] search error:', err);
      setError(err.message || 'Search failed');

      // Try to show cached data even on error
      const cached = readCache(pos.lat, pos.lng, serviceType);
      if (cached) {
        const withDist = cached.map(r => ({
          ...r,
          distance: haversineDistance(pos.lat, pos.lng, r.lat, r.lng),
        }));
        setResults(withDist.sort((a, b) => a.distance - b.distance));
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [serviceType]);

  // Auto-fetch when position changes
  useEffect(() => {
    if (position) fetchNearby(position);
  }, [position?.lat, position?.lng, fetchNearby]);

  const refresh = useCallback(() => {
    if (position) {
      fetchedRef.current = null;
      fetchNearby(position, true);
    }
  }, [position, fetchNearby]);

  return { results, loading, error, fromCache, refresh };
}
