import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { checkApiAllowed, logApiCall } from '../utils/apiGuard';
import { getCategoryFromTypes } from '../utils/tripHelpers';

const SEARCH_RADIUS = 1000; // metres
const MAX_RESULTS = 8;

/**
 * useNearbyRecommend — fetches nearby places of the same category
 * using Google Places searchNearby API.
 *
 * Results are cached per (lat, lng, category) so re-opening
 * the panel doesn't trigger another API call.
 */
export function useNearbyRecommend() {
  const { state } = useApp();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef({});  // key: "lat,lng,cat" → results

  const fetchNearby = useCallback(async ({ lat, lng, category }) => {
    if (!lat || !lng) return;

    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${category || ''}`;
    if (cacheRef.current[cacheKey]) {
      setRecommendations(cacheRef.current[cacheKey]);
      return;
    }

    const mapsApi = globalThis.google;
    if (!mapsApi || !window.googleMapsReady) return;

    try {
      const { allowed, reason } = await checkApiAllowed('nearby_search', state.user?.id);
      if (!allowed) {
        console.warn('[useNearbyRecommend] blocked:', reason);
        return;
      }

      setLoading(true);
      setError(null);

      const { Place } = await mapsApi.maps.importLibrary('places');

      // Map our category to Google's includedTypes
      const typeMap = {
        restaurant: 'restaurant',
        food: 'restaurant',
        cafe: 'cafe',
        coffee: 'cafe',
        bakery: 'bakery',
        attraction: 'tourist_attraction',
        museum: 'museum',
        park: 'park',
        shopping: 'shopping_mall',
        store: 'store',
        lodging: 'lodging',
        hotel: 'lodging',
      };
      const googleType = typeMap[(category || '').toLowerCase()];

      const request = {
        fields: ['id', 'displayName', 'location', 'rating', 'photos', 'types', 'formattedAddress'],
        locationRestriction: {
          center: new mapsApi.maps.LatLng(lat, lng),
          radius: SEARCH_RADIUS,
        },
        maxResultCount: MAX_RESULTS,
        ...(googleType ? { includedTypes: [googleType] } : {}),
      };

      const { places: results } = await Place.searchNearby(request);
      logApiCall('nearby_search', state.user?.id, 'success');

      const mapped = (results || []).map(p => {
        const catInfo = getCategoryFromTypes(p.types || []);
        let photoUrl = '';
        try {
          if (p.photos?.length > 0) {
            photoUrl = p.photos[0].getURI({ maxWidth: 300 });
          }
        } catch { /* ignore */ }

        return {
          placeId: p.id,
          location: p.displayName,
          address: p.formattedAddress || '',
          lat: p.location?.lat() || 0,
          lng: p.location?.lng() || 0,
          rating: p.rating || 0,
          category: catInfo.labelKey,
          categoryIcon: catInfo.icon,
          photo: photoUrl,
          types: p.types || [],
        };
      });

      cacheRef.current[cacheKey] = mapped;
      setRecommendations(mapped);
    } catch (err) {
      console.error('[useNearbyRecommend] failed:', err);
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [state.user?.id]);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
  }, []);

  return { recommendations, loading, error, fetchNearby, clearRecommendations };
}
