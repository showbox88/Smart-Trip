import { useCallback, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTrips } from './useTrips';
import { useI18n } from '../context/I18nContext';
import { getCategoryFromTypes } from '../utils/tripHelpers';
import { supabase } from '../lib/supabase';
import { isAdmin } from '../utils/admin'; // Add this
import { fetchRouteDuration } from '../utils/transitHelpers';
import {
  DEFAULT_DAY_COLORS,
  buildStayGroups,
  cloneTrip,
  findDayById,
  findStopAcrossTrip,
  findStopById,
  formatTripDate,
  insertStopIntoDay,
  sortStopsByTime,
  syncTripEndDate,
} from '../utils/tripEditorHelpers';

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

export function useTripEditor(tripId) {
  const { state, dispatch } = useApp();
  const { saveTrip } = useTrips();
  const { t } = useI18n();
  const saveTimerRef = useRef(null);

  const trip = state.trips.find((tr) => tr.id === tripId) || null;

  useEffect(() => {
    if (!trip && tripId && !tripId.startsWith('day-trip-') && !tripId.startsWith('v2-trip-') && isAdmin(state.user)) {
      const fetchGlobalTrip = async () => {
        try {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();
          
          if (data && !error) {
            const formattedTrip = {
              ...data.trip_data,
              id: data.id,
              user_id: data.user_id,
              title: data.title,
              thumb: data.thumb,
            };
            dispatch({ type: 'UPDATE_TRIP', payload: formattedTrip });
          }
        } catch (e) {
          console.warn('[useTripEditor] Global fetch failed:', e);
        }
      };
      fetchGlobalTrip();
    }
  }, [trip, tripId, state.user, dispatch]);

  const scheduleCloudSave = useCallback((updatedTrip) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTrip(updatedTrip).catch((err) => console.error('[useTripEditor] save failed:', err));
    }, 1500);
  }, [saveTrip]);

  const applyUpdate = useCallback((updatedTrip) => {
    dispatch({ type: 'UPDATE_TRIP', payload: updatedTrip });
    scheduleCloudSave(updatedTrip);
  }, [dispatch, scheduleCloudSave]);

  const withTripUpdate = useCallback((updater) => {
    if (!trip) return null;
    const updated = cloneTrip(trip);
    const result = updater(updated);
    if (result === false) return null;
    applyUpdate(updated);
    return { updated, result };
  }, [trip, applyUpdate]);

  // Singleton to prevent multiple computeTransitData from flooding the API
  const isComputing = useRef(false);

  const computeTransitData = useCallback(async (dayId, tripSnapshot) => {
    const mapsApi = globalThis.google;
    if (!trip || !mapsApi || !window.googleMapsReady || isComputing.current) return;

    try {
      isComputing.current = true;
      const currentTrip = tripSnapshot || state.trips.find((tr) => tr.id === tripId);
      if (!currentTrip) return;

      const updated = cloneTrip(currentTrip);
      const day = findDayById(updated, dayId);
      if (!day) return;

      const locationStops = day.stops.filter((stop) =>
        ['location', 'hotel_checkin', 'hotel_checkout'].includes(stop.type || 'location') &&
        stop.lat && stop.lng
      );

      if (locationStops.length < 2) {
        const hasTransit = locationStops.some((stop) => stop.transitToNext);
        if (hasTransit) {
          locationStops.forEach((stop) => {
            stop.transitToNext = null;
          });
          applyUpdate(updated);
        }
        return;
      }

      let changed = false;
      for (let i = 0; i < locationStops.length - 1; i += 1) {
        const stop = locationStops[i];
        const next = locationStops[i + 1];
        
        // Skip if we already have it (though fetchRouteDuration also has a cache, this avoids even calling it)
        if (stop.transitToNext && stop.transitToNext.duration && !changed) {
            // Check if coordinates have changed basically?
            // Since we clone trip every move, if it's there it's likely fresh enough if the logic inside useTripEditor handles it.
            // But let's rely on fetchRouteDuration's cache and just add a tiny delay to satisfy Google's per-minute quota
        }

        const res = await fetchRouteDuration(
          { lat: Number(stop.lat), lng: Number(stop.lng) },
          { lat: Number(next.lat), lng: Number(next.lng) },
          stop.transitMode || 'DRIVE'
        );

        // Wait a small amount between requests to avoid hitting rate limits
        await new Promise(r => setTimeout(r, 100));

        if (!res && !stop.transitToNext) {
          continue;
        }

        if (
          res &&
          stop.transitToNext &&
          res.duration === stop.transitToNext.duration &&
          res.distance === stop.transitToNext.distance
        ) {
          continue;
        }

        stop.transitToNext = res;
        changed = true;
      }

      const staysMap = buildStayGroups(updated);
      const dayIdxMap = new Map(updated.days.map((item, index) => [item.id, index]));
      const dayIndex = dayIdxMap.get(day.id);
      const plainStops = day.stops.filter((stop) =>
        stop.type !== 'hotel_checkin' &&
        stop.type !== 'hotel_checkout' &&
        stop.type !== 'note' &&
        stop.type !== 'list' &&
        stop.lat &&
        stop.lng
      );
      const firstPlain = plainStops[0];
      const lastPlain = plainStops[plainStops.length - 1];

      for (const [, stay] of staysMap) {
        const { checkinStop, checkoutStop } = stay;
        if (!checkinStop || !checkoutStop) continue;

        const cinIdx = dayIdxMap.get(checkinStop._dayId);
        const coutIdx = dayIdxMap.get(checkoutStop._dayId);
        if (dayIndex === undefined || cinIdx === undefined || coutIdx === undefined) continue;
        if (dayIndex < cinIdx || dayIndex > coutIdx) continue;

        if (firstPlain && checkinStop._dayId !== day.id && checkinStop.lat && checkinStop.lng) {
          const res = await fetchRouteDuration(
            { lat: Number(checkinStop.lat), lng: Number(checkinStop.lng) },
            { lat: Number(firstPlain.lat), lng: Number(firstPlain.lng) },
            firstPlain.transitModeFromHotel || 'DRIVE'
          );
          await new Promise(r => setTimeout(r, 150));
          const target = findStopById(day, firstPlain.id);
          if (target && JSON.stringify(target.transitFromHotel) !== JSON.stringify(res)) {
            target.transitFromHotel = res;
            changed = true;
          }
        }

        if (lastPlain && checkoutStop._dayId !== day.id && checkoutStop.lat && checkoutStop.lng) {
          const res = await fetchRouteDuration(
            { lat: Number(lastPlain.lat), lng: Number(lastPlain.lng) },
            { lat: Number(checkoutStop.lat), lng: Number(checkoutStop.lng) },
            lastPlain.transitModeToHotel || 'DRIVE'
          );
          await new Promise(r => setTimeout(r, 150));
          const target = findStopById(day, lastPlain.id);
          if (target && JSON.stringify(target.transitToHotel) !== JSON.stringify(res)) {
            target.transitToHotel = res;
            changed = true;
          }
        }
      }

      if (changed) applyUpdate(updated);
    } finally {
      isComputing.current = false;
    }
  }, [trip, state.trips, tripId, applyUpdate]);

  const toggleTransitMode = useCallback(async (dayId, stopId) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      stop.transitMode = stop.transitMode === 'WALK' ? 'DRIVE' : 'WALK';
      return updated;
    });

    if (updateResult?.updated) {
      await computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const toggleHotelTransitMode = useCallback(async (dayId, stopId, direction) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      if (direction === 'from') {
        stop.transitModeFromHotel = stop.transitModeFromHotel === 'WALK' ? 'DRIVE' : 'WALK';
      } else {
        stop.transitModeToHotel = stop.transitModeToHotel === 'WALK' ? 'DRIVE' : 'WALK';
      }
      return updated;
    });

    if (updateResult?.updated) {
      await computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const addDay = useCallback(() => {
    const updateResult = withTripUpdate((updated) => {
      const newDayNum = updated.days.length + 1;
      const newDayId = `day-${Date.now()}`;

      if (updated.startDate) {
        const newEnd = new Date(updated.startDate.replace(/-/g, '/'));
        newEnd.setDate(newEnd.getDate() + updated.days.length);
        if (!isNaN(newEnd)) {
          updated.endDate = `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')}`;
        }
      }

      updated.days.push({
        id: newDayId,
        title: `${t('itinerary.day_label')}${newDayNum}`,
        date: updated.startDate ? formatTripDate(updated.startDate, updated.days.length) : t('itinerary.unknown_date'),
        stops: [],
        color: DEFAULT_DAY_COLORS[(newDayNum - 1) % DEFAULT_DAY_COLORS.length],
      });
      updated.activeDayId = newDayId;
      return newDayId;
    });

    return updateResult?.result || null;
  }, [withTripUpdate, t]);

  const deleteDay = useCallback((dayId) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      day.stops = [];
      return updated;
    });
  }, [withTripUpdate]);

  const removeDay = useCallback((dayId) => {
    withTripUpdate((updated) => {
      updated.days = updated.days.filter((day) => day.id !== dayId);
      if (updated.activeDayId === dayId) {
        updated.activeDayId = updated.days[updated.days.length - 1]?.id || null;
      }
      syncTripEndDate(updated);
      return updated;
    });
  }, [withTripUpdate]);

  const setDayColor = useCallback((dayId, color) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      day.color = color;
      return updated;
    });
  }, [withTripUpdate]);

  const updateDay = useCallback((dayId, patch) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      Object.assign(day, patch);
      return updated;
    });
  }, [withTripUpdate]);

  const deleteStop = useCallback((dayId, stopId) => {
    // Collect Storage paths to clean up before mutating the trip
    const photoPathsToDelete = [];
    const collectPhotos = (stop) => {
      if (stop?.photo && stop.photo.includes('trip-media')) {
        const fileName = stop.photo.split('/').pop().split('?')[0];
        if (fileName) photoPathsToDelete.push(fileName);
      }
    };

    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;

      const stop = findStopById(day, stopId);
      if (stop?.stayId) {
        updated.days.forEach((tripDay) => {
          tripDay.stops.forEach((s) => { if (s.stayId === stop.stayId) collectPhotos(s); });
          tripDay.stops = tripDay.stops.filter((item) => item.stayId !== stop.stayId);
        });
      } else {
        collectPhotos(stop);
        day.stops = day.stops.filter((item) => item.id !== stopId);
      }

      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }

    // Best-effort cleanup of Storage photos
    if (photoPathsToDelete.length > 0) {
      supabase.storage.from('trip-media').remove(photoPathsToDelete)
        .catch((err) => console.warn('[deleteStop] storage cleanup failed:', err));
    }
  }, [withTripUpdate, computeTransitData]);

  const updateStop = useCallback((dayId, stopId, patch) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      Object.assign(stop, patch);
      return updated;
    });
  }, [withTripUpdate]);

  const updateStopAndSort = useCallback((dayId, stopId, patch) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!day || !stop) return false;
      Object.assign(stop, patch);
      sortStopsByTime(day.stops);
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const sortDayByTime = useCallback((dayId) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      sortStopsByTime(day.stops);
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const insertStop = useCallback((dayId, newStop, afterStopId = null) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      insertStopIntoDay(day, newStop, afterStopId);
      return newStop.id;
    });

    return updateResult?.result || null;
  }, [withTripUpdate]);

  const addNote = useCallback((dayId, afterStopId = null) => {
    return insertStop(dayId, { id: `n${Date.now()}`, type: 'note', content: '', checked: false }, afterStopId);
  }, [insertStop]);

  const addList = useCallback((dayId, afterStopId = null) => {
    return insertStop(dayId, { id: `l${Date.now()}`, type: 'list', title: '', items: [{ text: '', checked: false }] }, afterStopId);
  }, [insertStop]);

  const updateNoteContent = useCallback((dayId, stopId, content) => {
    updateStop(dayId, stopId, { content });
  }, [updateStop]);

  const updateListTitle = useCallback((dayId, stopId, title) => {
    updateStop(dayId, stopId, { title });
  }, [updateStop]);

  const updateListItem = useCallback((dayId, stopId, index, text) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items[index].text = text;
      return updated;
    });
  }, [withTripUpdate]);

  const toggleListItem = useCallback((dayId, stopId, index) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items[index].checked = !stop.items[index].checked;
      return updated;
    });
  }, [withTripUpdate]);

  const addListItem = useCallback((dayId, stopId, afterIndex) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      stop.items = stop.items || [];
      const insertIdx = afterIndex !== undefined ? afterIndex + 1 : stop.items.length;
      stop.items.splice(insertIdx, 0, { text: '', checked: false });
      return updated;
    });
  }, [withTripUpdate]);

  const deleteListItem = useCallback((dayId, stopId, index) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items.splice(index, 1);
      return updated;
    });
  }, [withTripUpdate]);

  const addStopFromPlace = useCallback(async (dayId, placeId, afterStopId = null, useNow = false) => {
    const mapsApi = globalThis.google;
    if (!trip || !mapsApi || !window.googleMapsReady) {
      console.warn('[addStopFromPlace] Google Maps not ready');
      return null;
    }

    try {
      const { Place } = await mapsApi.maps.importLibrary('places');
      const place = new Place({ id: placeId });
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'location', 'photos', 'rating', 'editorialSummary', 'types', 'regularOpeningHours'],
      });

      const updated = cloneTrip(trip);
      const day = findDayById(updated, dayId);
      if (!day) return null;
      if (day.stops.some((stop) => stop.placeId === placeId)) return null;

      let timeStr = '09:00';
      let period = 'AM';

      if (useNow) {
        // 实时打卡：用当前时间
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

      const lat = place.location?.lat() || 0;
      const lng = place.location?.lng() || 0;
      let photoUrl = place.photos?.length > 0 ? place.photos[0].getURI({ maxWidth: 400 }) : '';
      if (!photoUrl && lat && lng) {
        photoUrl = (await getStreetViewThumbUrl(lat, lng, 320, 240)) || '';
      }

      const categoryInfo = getCategoryFromTypes(place.types || []);
      const newStop = {
        id: `s${Date.now()}`,
        location: place.displayName,
        desc: place.editorialSummary || '',
        address: place.formattedAddress || '',
        city: extractCityFromAddressComponents(place.addressComponents),
        phone: place.nationalPhoneNumber || '',
        time: timeStr,
        period,
        note: '',
        price: '0',
        type: 'location',
        lat,
        lng,
        photo: photoUrl,
        rating: place.rating,
        category: categoryInfo.labelKey,
        categoryIcon: categoryInfo.icon,
        placeTypes: place.types || [],
        placeId: place.id,
        openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
      };

      insertStopIntoDay(day, newStop, afterStopId);
      if (!afterStopId) sortStopsByTime(day.stops);

      applyUpdate(updated);
      await computeTransitData(dayId, updated);

      if (photoUrl) {
        try {
          const resp = await fetch(photoUrl);
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

  const moveStop = useCallback((sourceDayId, stopId, targetDayId, afterStopId) => {
    const updateResult = withTripUpdate((updated) => {
      const srcDay = findDayById(updated, sourceDayId);
      const tgtDay = findDayById(updated, targetDayId);
      if (!srcDay || !tgtDay) return false;

      const stopIdx = srcDay.stops.findIndex((stop) => stop.id === stopId);
      if (stopIdx === -1) return false;

      const [stop] = srcDay.stops.splice(stopIdx, 1);
      if (afterStopId == null) {
        tgtDay.stops.unshift(stop);
      } else {
        const afterIdx = tgtDay.stops.findIndex((item) => item.id === afterStopId);
        tgtDay.stops.splice(afterIdx + 1, 0, stop);
      }

      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(sourceDayId, updateResult.updated);
      if (sourceDayId !== targetDayId) computeTransitData(targetDayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const moveDay = useCallback((dayId, afterDayId) => {
    withTripUpdate((updated) => {
      const dates = updated.days.map((day) => day.date);
      const fromIdx = updated.days.findIndex((day) => day.id === dayId);
      if (fromIdx === -1) return false;

      const [day] = updated.days.splice(fromIdx, 1);
      if (afterDayId == null) {
        updated.days.unshift(day);
      } else {
        const afterIdx = updated.days.findIndex((item) => item.id === afterDayId);
        updated.days.splice(afterIdx + 1, 0, day);
      }

      updated.days.forEach((item, index) => {
        if (dates[index] !== undefined) item.date = dates[index];
      });
      return updated;
    });
  }, [withTripUpdate]);

  const updateTripMetadata = useCallback((patch) => {
    withTripUpdate((updated) => {
      const oldStartDate = updated.startDate;
      Object.assign(updated, patch);
      // If startDate changed, recalculate each day's date
      if (patch.startDate && patch.startDate !== oldStartDate && updated.days) {
        updated.days.forEach((day, index) => {
          day.date = formatTripDate(patch.startDate, index);
        });
      }
      return updated;
    });
  }, [withTripUpdate]);

  const saveStayInfo = useCallback((dayId, stopId, { cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod }) => {
    const updateResult = withTripUpdate((updated) => {
      const { day: origDay, stop } = findStopAcrossTrip(updated, stopId);
      if (!origDay || !stop) return false;

      const stayId = stop.stayId || `stay-${Date.now()}`;
      updated.days.forEach((day) => {
        day.stops = day.stops.filter((item) => !(item.stayId === stayId && item.type === 'hotel_checkout'));
      });

      const cinDay = updated.days.find((day) => day.date === cinDate);
      const coutDay = updated.days.find((day) => day.date === coutDate);
      if (!cinDay || !coutDay) {
        alert('鎵€閫夋棩鏈熶笉鍦ㄨ绋嬭寖鍥村唴');
        return false;
      }

      stop.stayId = stayId;
      stop.type = 'hotel_checkin';
      stop.time = cinTime;
      stop.period = cinPeriod;

      if (origDay.id !== cinDay.id) {
        origDay.stops = origDay.stops.filter((item) => item.id !== stopId);
        cinDay.stops.push(stop);
      }

      const coutStop = {
        ...cloneTrip(stop),
        id: `cout-${Date.now()}`,
        type: 'hotel_checkout',
        stayId,
        time: coutTime,
        period: coutPeriod,
      };
      coutDay.stops.push(coutStop);
      return { cinDayId: cinDay.id, coutDayId: coutDay.id };
    });

    if (updateResult?.updated) {
      computeTransitData(updateResult.result.cinDayId, updateResult.updated);
      if (updateResult.result.coutDayId !== updateResult.result.cinDayId) {
        computeTransitData(updateResult.result.coutDayId, updateResult.updated);
      }
    }
  }, [withTripUpdate, computeTransitData]);

  return {
    trip,
    addDay,
    deleteDay,
    removeDay,
    setDayColor,
    updateDay,
    deleteStop,
    updateStop,
    updateStopAndSort,
    sortDayByTime,
    moveStop,
    moveDay,
    addNote,
    addList,
    updateNoteContent,
    updateListTitle,
    updateListItem,
    toggleListItem,
    addListItem,
    deleteListItem,
    addStopFromPlace,
    updateTripMetadata,
    toggleTransitMode,
    toggleHotelTransitMode,
    computeTransitData,
    saveStayInfo,
  };
}
