import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTrips } from './useTrips';
import { useI18n } from '../context/I18nContext';
import { getCategoryFromTypes } from '../utils/tripHelpers';
import { supabase } from '../lib/supabase';
import { fetchRouteDuration } from '../utils/transitHelpers';

const DEFAULT_COLORS = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

function formatDate(startDate, dayIndex) {
  if (!startDate) return '';
  const d = new Date(startDate.replace(/-/g, '/'));
  d.setDate(d.getDate() + dayIndex);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function useTripEditor(tripId) {
  const { state, dispatch } = useApp();
  const { saveTrip } = useTrips();
  const { t } = useI18n();
  const saveTimerRef = useRef(null);

  const trip = state.trips.find(tr => tr.id === tripId) || null;

  // Debounced save to Supabase
  const scheduleCloudSave = useCallback((updatedTrip) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTrip(updatedTrip).catch(err => console.error('[useTripEditor] save failed:', err));
    }, 1500);
  }, [saveTrip]);

  // Helper: dispatch UPDATE_TRIP and schedule save
  const applyUpdate = useCallback((updatedTrip) => {
    dispatch({ type: 'UPDATE_TRIP', payload: updatedTrip });
    scheduleCloudSave(updatedTrip);
  }, [dispatch, scheduleCloudSave]);

  const computeTransitData = useCallback(async (dayId) => {
    if (!trip || typeof google === 'undefined' || !window.googleMapsReady) return;
    
    // We get the LATEST trip state from state.trips to avoid race conditions
    const currentTrip = state.trips.find(tr => tr.id === tripId);
    if (!currentTrip) return;

    const updated = JSON.parse(JSON.stringify(currentTrip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;

    const locationStops = day.stops.filter(s =>
      ['location', 'hotel_checkin', 'hotel_checkout'].includes(s.type || 'location') &&
      s.lat && s.lng
    );

    if (locationStops.length < 2) {
      const hasTransit = locationStops.some(s => s.transitToNext);
      if (hasTransit) {
        locationStops.forEach(s => s.transitToNext = null);
        applyUpdate(updated);
      }
      return;
    }

    let changed = false;
    for (let i = 0; i < locationStops.length - 1; i++) {
      const stop = locationStops[i];
      const next = locationStops[i + 1];
      
      const res = await fetchRouteDuration(
        { lat: Number(stop.lat), lng: Number(stop.lng) },
        { lat: Number(next.lat), lng: Number(next.lng) },
        stop.transitMode || 'DRIVE'
      );
      
      if (JSON.stringify(stop.transitToNext) !== JSON.stringify(res)) {
        stop.transitToNext = res;
        changed = true;
      }
    }
    
    if (locationStops[locationStops.length - 1].transitToNext !== null) {
      locationStops[locationStops.length - 1].transitToNext = null;
      changed = true;
    }

    if (changed) {
      applyUpdate(updated);
    }
  }, [tripId, state.trips, applyUpdate, trip]);

  const toggleTransitMode = useCallback(async (dayId, stopId) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;

    const stop = day.stops.find(s => s.id === stopId);
    if (stop) {
      stop.transitMode = (stop.transitMode === 'WALK' ? 'DRIVE' : 'WALK');
      applyUpdate(updated);
      await computeTransitData(dayId);
    }
  }, [trip, applyUpdate, computeTransitData]);

  const addDay = useCallback(() => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip)); // deep clone

    // Extend endDate
    if (updated.startDate) {
      const newEnd = new Date(updated.startDate.replace(/-/g, '/'));
      newEnd.setDate(newEnd.getDate() + updated.days.length);
      if (!isNaN(newEnd)) {
        updated.endDate = `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')}`;
      }
    }

    const newDayNum = updated.days.length + 1;
    const newDayId = `day-${Date.now()}`;
    const newColor = DEFAULT_COLORS[(newDayNum - 1) % DEFAULT_COLORS.length];
    const dateStr = updated.startDate ? formatDate(updated.startDate, updated.days.length) : t('itinerary.unknown_date');

    updated.days.push({
      id: newDayId,
      title: `${t('itinerary.day_label')}${newDayNum}`,
      date: dateStr,
      stops: [],
      color: newColor,
    });
    updated.activeDayId = newDayId;

    applyUpdate(updated);
    return newDayId;
  }, [trip, t, applyUpdate]);

  const deleteDay = useCallback((dayId) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;
    day.stops = [];
    applyUpdate(updated);
  }, [trip, applyUpdate]);

  const setDayColor = useCallback((dayId, color) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (day) {
      day.color = color;
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const updateDay = useCallback((dayId, patch) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (day) {
      Object.assign(day, patch);
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const deleteStop = useCallback((dayId, stopId) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;

    const stop = day.stops.find(s => s.id === stopId);
    if (stop?.stayId) {
      const stayId = stop.stayId;
      updated.days.forEach(d => {
        d.stops = d.stops.filter(s => s.stayId !== stayId);
      });
    } else {
      day.stops = day.stops.filter(s => s.id !== stopId);
    }
    applyUpdate(updated);
    computeTransitData(dayId);
  }, [trip, applyUpdate, computeTransitData]);

  const updateStop = useCallback((dayId, stopId, patch) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;
    const stop = day.stops.find(s => s.id === stopId);
    if (stop) {
      Object.assign(stop, patch);
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const addNote = useCallback((dayId, afterStopId = null) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;

    const newStop = { id: 'n' + Date.now(), type: 'note', content: '', checked: false };

    if (afterStopId) {
      const idx = day.stops.findIndex(s => s.id === afterStopId);
      day.stops.splice(idx >= 0 ? idx + 1 : day.stops.length, 0, newStop);
    } else {
      day.stops.push(newStop);
    }
    applyUpdate(updated);
    return newStop.id;
  }, [trip, applyUpdate]);

  const addList = useCallback((dayId, afterStopId = null) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    if (!day) return;

    const newStop = { id: 'l' + Date.now(), type: 'list', title: '', items: [{ text: '', checked: false }] };

    if (afterStopId) {
      const idx = day.stops.findIndex(s => s.id === afterStopId);
      day.stops.splice(idx >= 0 ? idx + 1 : day.stops.length, 0, newStop);
    } else {
      day.stops.push(newStop);
    }
    applyUpdate(updated);
    return newStop.id;
  }, [trip, applyUpdate]);

  const updateNoteContent = useCallback((dayId, stopId, content) => {
    updateStop(dayId, stopId, { content });
  }, [updateStop]);

  const updateListItem = useCallback((dayId, stopId, index, text) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop?.items?.[index] !== undefined) {
      stop.items[index].text = text;
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const toggleListItem = useCallback((dayId, stopId, index) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop?.items?.[index] !== undefined) {
      stop.items[index].checked = !stop.items[index].checked;
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const addListItem = useCallback((dayId, stopId, afterIndex) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const day = updated.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop) {
      stop.items = stop.items || [];
      const insertIdx = afterIndex !== undefined ? afterIndex + 1 : stop.items.length;
      stop.items.splice(insertIdx, 0, { text: '', checked: false });
      applyUpdate(updated);
    }
  }, [trip, applyUpdate]);

  const addStopFromPlace = useCallback(async (dayId, placeId, afterStopId = null) => {
    if (!trip || typeof google === 'undefined' || !window.googleMapsReady) {
      console.warn('[addStopFromPlace] Google Maps not ready');
      return;
    }
    try {
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: placeId });
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'nationalPhoneNumber', 'location', 'photos', 'rating', 'editorialSummary', 'types', 'regularOpeningHours'],
      });

      const updated = JSON.parse(JSON.stringify(trip));
      const day = updated.days.find(d => d.id === dayId);
      if (!day) return;

      if (day.stops.some(s => s.placeId === placeId)) return;

      let timeStr = '09:00';
      let period = 'AM';
      const locationStops = day.stops.filter(s => s.type === 'location' || !s.type);
      if (locationStops.length > 0) {
        const last = locationStops[locationStops.length - 1];
        if (last.time) {
          let [h, m] = last.time.split(':').map(Number);
          if (last.period === 'PM' && h !== 12) h += 12;
          if (last.period === 'AM' && h === 12) h = 0;
          h = (h + 2) % 24;
          period = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 || 12;
          timeStr = `${String(displayH).padStart(2, '0')}:${(last.time.split(':')[1] || '00')}`;
        }
      }

      const lat = place.location?.lat() || 0;
      const lng = place.location?.lng() || 0;
      let photoUrl = place.photos?.length > 0 ? place.photos[0].getURI({ maxWidth: 400 }) : '';

      if (!photoUrl && lat && lng && window._getStreetViewThumbUrl) {
        photoUrl = (await window._getStreetViewThumbUrl(lat, lng, 320, 240)) || '';
      }

      const categoryInfo = getCategoryFromTypes(place.types || []);

      const newStop = {
        id: 's' + Date.now(),
        location: place.displayName,
        desc: place.editorialSummary || '',
        address: place.formattedAddress || '',
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
        category: categoryInfo.label,
        categoryIcon: categoryInfo.icon,
        placeId: place.id,
        openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
      };

      if (afterStopId) {
        const idx = day.stops.findIndex(s => s.id === afterStopId);
        day.stops.splice(idx >= 0 ? idx + 1 : day.stops.length, 0, newStop);
      } else {
        day.stops.push(newStop);
        day.stops.sort((a, b) => {
          const toMin = (time, p) => {
            if (!time) return 0;
            let [hh, mm] = time.split(':').map(Number);
            if (p === 'PM' && hh !== 12) hh += 12;
            if (p === 'AM' && hh === 12) hh = 0;
            return hh * 60 + mm;
          };
          return toMin(a.time, a.period) - toMin(b.time, b.period);
        });
      }

      applyUpdate(updated);
      await computeTransitData(dayId);

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
                const latestTrip = JSON.parse(JSON.stringify(state.trips.find(tr => tr.id === tripId)));
                const latestDay = latestTrip?.days.find(d => d.id === dayId);
                const latestStop = latestDay?.stops.find(s => s.id === newStop.id);
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
  }, [trip, tripId, state.trips, applyUpdate, computeTransitData]);

  const moveStop = useCallback((sourceDayId, stopId, targetDayId, afterStopId) => {
    if (!trip) return;
    const updated = JSON.parse(JSON.stringify(trip));
    const srcDay = updated.days.find(d => d.id === sourceDayId);
    const tgtDay = updated.days.find(d => d.id === targetDayId);
    if (!srcDay || !tgtDay) return;

    const stopIdx = srcDay.stops.findIndex(s => s.id === stopId);
    if (stopIdx === -1) return;
    const [stop] = srcDay.stops.splice(stopIdx, 1);

    if (afterStopId == null) {
      tgtDay.stops.push(stop);
    } else {
      const afterIdx = tgtDay.stops.findIndex(s => s.id === afterStopId);
      tgtDay.stops.splice(afterIdx + 1, 0, stop);
    }
    applyUpdate(updated);

    computeTransitData(sourceDayId);
    if (sourceDayId !== targetDayId) {
      computeTransitData(targetDayId);
    }
  }, [trip, applyUpdate, computeTransitData]);

  const updateTripMetadata = useCallback((patch) => {
    if (!trip) return;
    const updated = { ...trip, ...patch };
    applyUpdate(updated);
  }, [trip, applyUpdate]);

  return {
    trip,
    addDay,
    deleteDay,
    setDayColor,
    updateDay,
    deleteStop,
    updateStop,
    moveStop,
    addNote,
    addList,
    updateNoteContent,
    updateListItem,
    toggleListItem,
    addListItem,
    addStopFromPlace,
    updateTripMetadata,
    toggleTransitMode,
    computeTransitData,
  };
}
