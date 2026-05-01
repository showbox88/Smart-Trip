/**
 * Plan B alternative places management.
 * Add, remove, and swap Plan B alternatives for stops.
 */

import { useCallback } from 'react';
import { getCategoryFromTypes } from '../../utils/tripHelpers';
import { supabase } from '../../lib/supabase';
import { checkApiAllowed, logApiCall } from '../../utils/apiGuard';
import {
  cloneTrip,
  findDayById,
  findStopById,
} from '../../utils/tripEditorHelpers';
import { extractCityFromAddressComponents, getStreetViewThumbUrl } from './useTripPlaceAdd';

const PLAN_B_PLACE_FIELDS = [
  'location', 'address', 'city', 'lat', 'lng', 'placeId',
  'category', 'categoryIcon', 'photo', 'rating', 'phone',
  'openingHours', 'desc', 'placeTypes',
];
const MAX_PLAN_B = 4;

export function useTripPlanB(trip, state, tripId, withTripUpdate, applyUpdate, computeTransitData) {

  const addPlanBAlternative = useCallback(async (dayId, stopId, placeId) => {
    const mapsApi = globalThis.google;
    if (!trip || !mapsApi || !window.googleMapsReady) return null;

    try {
      const day = trip.days?.find(d => d.id === dayId);
      const stop = day?.stops?.find(s => s.id === stopId);
      if (!stop) return null;
      if ((stop.planB || []).length >= MAX_PLAN_B) {
        console.warn('[addPlanBAlternative] max 4 alternatives reached');
        return null;
      }
      if ((stop.planB || []).some(a => a.placeId === placeId)) return null;

      let placeData = null;
      const { data: cached } = await supabase
        .from('places')
        .select('*')
        .eq('place_id', placeId)
        .maybeSingle();

      if (cached) {
        placeData = {
          displayName: cached.name,
          formattedAddress: cached.address,
          lat: cached.lat,
          lng: cached.lng,
          phone: cached.phone || '',
          rating: cached.rating,
          category: cached.category,
          photoUrl: cached.photo_url || '',
          openingHours: cached.opening_hours || [],
          types: cached.category ? [cached.category] : [],
        };
      }

      if (!placeData) {
        const { allowed } = await checkApiAllowed('place_details', state.user?.id);
        if (!allowed) return null;

        const { Place } = await mapsApi.maps.importLibrary('places');
        const place = new Place({ id: placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'location', 'photos', 'rating', 'editorialSummary', 'types', 'regularOpeningHours', 'websiteURI'],
        });
        logApiCall('place_details', state.user?.id, 'success');

        const lat = place.location?.lat() || 0;
        const lng = place.location?.lng() || 0;
        let photoUrl = place.photos?.length > 0 ? place.photos[0].getURI({ maxWidth: 400 }) : '';
        if (!photoUrl && lat && lng) {
          photoUrl = (await getStreetViewThumbUrl(lat, lng, 320, 240)) || '';
        }
        const categoryInfo = getCategoryFromTypes(place.types || []);

        placeData = {
          displayName: place.displayName,
          formattedAddress: place.formattedAddress || '',
          lat,
          lng,
          phone: place.nationalPhoneNumber || '',
          rating: place.rating,
          category: categoryInfo.labelKey,
          categoryIcon: categoryInfo.icon,
          photoUrl,
          openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
          types: place.types || [],
          website: place.websiteURI || '',
          addressComponents: place.addressComponents,
        };
      }

      let permanentPhotoUrl = '';
      if (placeData.photoUrl) {
        try {
          const resp = await fetch(placeData.photoUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const filename = `planb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
            const { data: uploadData } = await supabase.storage.from('trip-media').upload(filename, blob, { cacheControl: '3600', upsert: false });
            if (uploadData) {
              const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(filename);
              if (urlData?.publicUrl) {
                permanentPhotoUrl = urlData.publicUrl;
              }
            }
          }
        } catch (e) {
          console.warn('[addPlanBAlternative] photo upload failed, using original URL:', e);
          permanentPhotoUrl = placeData.photoUrl;
        }
      }

      const altId = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newAlt = {
        id: altId,
        location: placeData.displayName,
        address: placeData.formattedAddress || '',
        city: placeData.addressComponents ? extractCityFromAddressComponents(placeData.addressComponents) : '',
        lat: placeData.lat,
        lng: placeData.lng,
        placeId,
        category: placeData.category || '',
        categoryIcon: placeData.categoryIcon || '',
        photo: permanentPhotoUrl,
        rating: placeData.rating || 0,
        phone: placeData.phone || '',
        website: placeData.website || '',
        openingHours: placeData.openingHours || [],
        placeTypes: placeData.types || [],
        addedAt: new Date().toISOString(),
      };

      const latestTrip = cloneTrip(state.trips.find((tr) => tr.id === tripId) || trip);
      const latestDay = findDayById(latestTrip, dayId);
      const latestStop = findStopById(latestDay, stopId);
      if (!latestStop) return null;
      if (!latestStop.planB) latestStop.planB = [];
      if (latestStop.planB.length >= MAX_PLAN_B) return null;
      latestStop.planB.push(newAlt);
      applyUpdate(latestTrip);

      return altId;
    } catch (err) {
      console.error('[addPlanBAlternative] failed:', err);
      return null;
    }
  }, [trip, state.user?.id, state.trips, tripId, applyUpdate]);

  const removePlanBAlternative = useCallback((dayId, stopId, altId) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop?.planB) return false;
      stop.planB = stop.planB.filter(a => a.id !== altId);
    });
  }, [withTripUpdate]);

  const swapPlanB = useCallback((dayId, stopId, altId) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop?.planB) return false;
      const altIdx = stop.planB.findIndex(a => a.id === altId);
      if (altIdx === -1) return false;
      const alt = stop.planB[altIdx];

      const newAlt = {
        id: `pb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        addedAt: new Date().toISOString(),
      };
      for (const field of PLAN_B_PLACE_FIELDS) {
        if (stop[field] !== undefined) newAlt[field] = stop[field];
      }

      for (const field of PLAN_B_PLACE_FIELDS) {
        if (alt[field] !== undefined) {
          stop[field] = alt[field];
        }
      }

      stop.planB[altIdx] = newAlt;
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  return { addPlanBAlternative, removePlanBAlternative, swapPlanB };
}
