/**
 * Add stop from Google Place ID — fetches place data, creates stop, uploads photo.
 */

import { useCallback } from 'react';
import { getCategoryFromTypes } from '../../utils/tripHelpers';
import { supabase } from '../../lib/supabase';
import { checkApiAllowed, logApiCall } from '../../utils/apiGuard';
import {
  cloneTrip,
  findDayById,
  findStopById,
  insertStopIntoDay,
  sortStopsByTime,
} from '../../utils/tripEditorHelpers';

async function getStreetViewThumbUrl(lat, lng, width = 320, height = 240) {
  try {
    const mapsApi = globalThis.google;
    if (!mapsApi) return null;
    const svc = new mapsApi.maps.StreetViewService();
    const result = await svc.getPanorama({ location: { lat: Number(lat), lng: Number(lng) }, radius: 100 });
    const pano = result?.data?.location?.pano;
    if (!pano) return null;
    const yaw = result?.data?.tiles?.centerHeading ?? 0;
    return `https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=${pano}&cb_client=search.gws-prod.gps&w=${width}&h=${height}&yaw=${yaw}&pitch=0&thumbfov=100`;
  } catch {
    return null;
  }
}

function extractCityFromAddressComponents(addressComponents) {
  if (!addressComponents) return '';
  const getCompData = (comp) => ({
    names: comp.long_name || comp.longName || comp.nh || '',
    types: comp.types || comp.mh || [],
  });
  const targetTypes = ['locality', 'ward', 'sublocality_level_1', 'administrative_area_level_2'];
  for (const type of targetTypes) {
    const found = addressComponents.find((comp) => getCompData(comp).types.includes(type));
    if (found) return getCompData(found).names;
  }
  return '';
}

export { extractCityFromAddressComponents, getStreetViewThumbUrl };

export function useTripPlaceAdd(trip, state, tripId, applyUpdate, computeTransitData) {

  const addStopFromPlace = useCallback(async (dayId, placeId, afterStopId = null, useNow = false) => {
    const mapsApi = globalThis.google;
    if (!trip || !mapsApi || !window.googleMapsReady) {
      console.warn('[addStopFromPlace] Google Maps not ready');
      return null;
    }

    try {
      const updated = cloneTrip(trip);
      const day = findDayById(updated, dayId);
      if (!day) return null;
      if (day.stops.some((stop) => stop.placeId === placeId)) return null;

      // ── Check places cache ──
      let placeData = null;
      const { data: cached } = await supabase
        .from('places')
        .select('*')
        .eq('place_id', placeId)
        .maybeSingle();

      if (cached) {
        console.log('[addStopFromPlace] places cache hit:', placeId);
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
          editorialSummary: '',
          addressComponents: null,
        };
      }

      // ── Cache miss: call Google API ──
      if (!placeData) {
        const { allowed, reason } = await checkApiAllowed('place_details', state.user?.id);
        if (!allowed) {
          console.warn('[addStopFromPlace] place_details blocked:', reason);
          return null;
        }
        console.log('[addStopFromPlace] cache miss, calling Google API:', placeId);
        const { Place } = await mapsApi.maps.importLibrary('places');
        const place = new Place({ id: placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'location', 'photos', 'rating', 'editorialSummary', 'types', 'regularOpeningHours'],
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
          editorialSummary: place.editorialSummary || '',
          addressComponents: place.addressComponents,
        };

        // Async write to places cache
        const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
        supabase.from('places').select('place_id, fetched_at').eq('place_id', placeId).maybeSingle().then(({ data: existing }) => {
          const isStale = !existing || !existing.fetched_at || (Date.now() - new Date(existing.fetched_at).getTime() > THREE_MONTHS_MS);
          if (!existing) {
            supabase.from('places').insert({
              place_id: placeId,
              name: placeData.displayName,
              address: placeData.formattedAddress,
              lat: placeData.lat,
              lng: placeData.lng,
              category: placeData.category,
              phone: placeData.phone || null,
              opening_hours: placeData.openingHours,
              photo_url: placeData.photoUrl || null,
              rating: placeData.rating ?? null,
              fetched_at: new Date().toISOString(),
            }).then(({ error }) => {
              if (error && error.code !== '23505') console.warn('[places cache] insert failed:', error.message);
            });
          } else if (isStale) {
            supabase.from('places').update({
              rating: placeData.rating ?? null,
              opening_hours: placeData.openingHours,
              fetched_at: new Date().toISOString(),
            }).eq('place_id', placeId).then(({ error }) => {
              if (error) console.warn('[places cache] refresh failed:', error.message);
            });
          }
        });
      }

      let timeStr = '09:00';
      let period = 'AM';

      if (useNow) {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        timeStr = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      } else {
        const locationStops = day.stops.filter((stop) => stop.type === 'location' || !stop.type);
        if (locationStops.length > 0) {
          const last = locationStops[locationStops.length - 1];
          if (last.time) {
            let [h] = last.time.split(':').map(Number);
            if (last.period === 'PM' && h !== 12) h += 12;
            if (last.period === 'AM' && h === 12) h = 0;
            h = (h + 2) % 24;
            period = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            timeStr = `${String(displayH).padStart(2, '0')}:${last.time.split(':')[1] || '00'}`;
          }
        }
      }

      const categoryInfo = placeData.categoryIcon
        ? { labelKey: placeData.category, icon: placeData.categoryIcon }
        : getCategoryFromTypes(placeData.types || []);

      const newStop = {
        id: `s${Date.now()}`,
        location: placeData.displayName,
        desc: placeData.editorialSummary || '',
        address: placeData.formattedAddress || '',
        city: placeData.addressComponents ? extractCityFromAddressComponents(placeData.addressComponents) : '',
        phone: placeData.phone || '',
        time: timeStr,
        period,
        note: '',
        price: '0',
        type: 'location',
        lat: placeData.lat,
        lng: placeData.lng,
        photo: placeData.photoUrl,
        rating: placeData.rating,
        category: categoryInfo.labelKey,
        categoryIcon: categoryInfo.icon,
        placeTypes: placeData.types || [],
        placeId,
        openingHours: placeData.openingHours || [],
        // useNow = 实时打卡（GPS/附近打卡面板），直接标记已打卡
        ...(useNow ? { checkedIn: true, checkinTime: timeStr } : {}),
      };

      insertStopIntoDay(day, newStop, afterStopId);
      sortStopsByTime(day.stops);

      applyUpdate(updated);
      await computeTransitData(dayId, updated);

      if (placeData.photoUrl) {
        try {
          const resp = await fetch(placeData.photoUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const ext = blob.type.split('/')[1] || 'jpg';
            const filename = `stop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
            const { data: uploadData } = await supabase.storage.from('trip-media').upload(filename, blob, { cacheControl: '3600', upsert: false });
            if (uploadData) {
              const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(filename);
              if (urlData?.publicUrl) {
                const latestTrip = cloneTrip(state.trips.find((tr) => tr.id === tripId));
                const latestDay = findDayById(latestTrip, dayId);
                const latestStop = findStopById(latestDay, newStop.id);
                if (latestStop) {
                  latestStop.photo = urlData.publicUrl;
                  applyUpdate(latestTrip);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[addStopFromPlace] photo cache failed:', e);
        }
      }

      return newStop.id;
    } catch (err) {
      console.error('[addStopFromPlace] failed:', err);
      throw err;
    }
  }, [trip, state.trips, tripId, applyUpdate, computeTransitData]);

  return { addStopFromPlace };
}
