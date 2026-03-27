import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { deleteFilesFromSupabase } from '../utils/uploadHelpers';
import { formatTripDate } from '../utils/tripEditorHelpers';
import { saveDayToDB } from '../utils/dayHelpers';

export function useTrips() {
  const { state, dispatch } = useApp();

  // ... refreshTrips and deleteTrip follow ...

  const refreshTrips = useCallback(async () => {
    if (!state.user) return;
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useTrips] refreshTrips error:', error.message);
      return;
    }

    const trips = data.map(row => {
      const trip = {
        ...row.trip_data,
        id: row.id,
        title: row.title,
        thumb: row.thumb,
        share_token: row.share_token || null,
      };
      // Auto-fix days whose dates don't match startDate
      if (trip.startDate && trip.days?.length) {
        const expectedFirst = formatTripDate(trip.startDate, 0);
        if (trip.days[0].date !== expectedFirst) {
          trip.days = trip.days.map((day, i) => ({
            ...day,
            date: formatTripDate(trip.startDate, i),
          }));
        }
      }
      return trip;
    });
    dispatch({ type: 'SET_TRIPS', payload: trips });
  }, [state.user, dispatch]);

  const deleteTrip = useCallback(async (tripId) => {
    if (!state.user) return;
    
    // 1. Find the trip in memory to get its images
    const trip = state.trips.find(t => t.id === tripId);
    if (trip) {
      const filesToDelete = [];
      const extractFileName = (url) => {
        if (!url || !url.includes('/storage/v1/object/public/trip-media/')) return null;
        return url.split('/').pop().split('?')[0]; // Get filename, strip query params
      };

      // Trip thumb
      const thumbFile = extractFileName(trip.thumb);
      if (thumbFile) filesToDelete.push(thumbFile);

      // All stops photos
      if (trip.days) {
        trip.days.forEach(day => {
          day.stops?.forEach(stop => {
            const stopFile = extractFileName(stop.photo);
            if (stopFile) filesToDelete.push(stopFile);
          });
        });
      }

      // 2. Delete files from Supabase Storage
      if (filesToDelete.length > 0) {
        try {
          // Remove duplicates
          const uniqueFiles = [...new Set(filesToDelete)];
          await deleteFilesFromSupabase(uniqueFiles);
          console.log(`[deleteTrip] Cleaned up ${uniqueFiles.length} files from storage`);
        } catch (e) {
          console.warn('[deleteTrip] Failed to cleanup storage:', e);
          // Continue with DB deletion even if storage cleanup fails
        }
      }
    }

    // 3. Delete from database
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', state.user.id);

    if (error) throw error;

    dispatch({
      type: 'SET_TRIPS',
      payload: state.trips.filter(t => t.id !== tripId),
    });
  }, [state.user, state.trips, dispatch]);

  const saveTrip = useCallback(async (trip) => {
    if (!state.user) return;

    // v2: 虚拟 day trip（今日打卡）拦截 — 存到 days_v2 而不是 trips 表
    if (trip._isVirtualDay) {
      const day = trip.days?.[0];
      if (day) {
        await saveDayToDB(state.user.id, day);
      }
      // 只更新内存，不写 trips 表
      const updated = state.trips.map(t => t.id === trip.id ? trip : t);
      const isNew = !state.trips.find(t => t.id === trip.id);
      dispatch({ type: 'SET_TRIPS', payload: isNew ? [trip, ...state.trips] : updated });
      return;
    }

    // v2: 新架构行程拦截 — days 存到 days_v2，trip 元数据已在 useTripsV2 管理
    if (trip._isV2) {
      const realTripId = trip._realTripId;
      let tripChanged = false;
      const updatedDays = await Promise.all(
        (trip.days || []).map(async (day) => {
          // 占位天：有内容时才懒创建 days_v2 记录 + trip_days 关联
          if (day._isPlaceholder) {
            if (!day.stops?.length) return day;
            const newDayId = `day-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const { error: insertErr } = await supabase.from('days_v2').insert({
              id: newDayId,
              user_id: state.user.id,
              date: day.date,
              title: day.title || null,
              color: day.color || '#5b7a99',
              stops_data: day.stops,
            });
            if (insertErr) { console.error('[useTrips] v2 lazy create day failed:', insertErr.message); return day; }
            if (realTripId) {
              await supabase.from('trip_days').upsert({ trip_id: realTripId, day_id: newDayId });
            }
            tripChanged = true;
            return { ...day, id: newDayId, _dayId: newDayId, _isPlaceholder: false };
          }
          // 真实天：直接写 days_v2
          const dayId = day._dayId || day.id;
          await saveDayToDB(state.user.id, { id: dayId, date: day.date, title: day.title, color: day.color, stops: day.stops || [] });
          return day;
        })
      );
      const finalTrip = tripChanged ? { ...trip, days: updatedDays } : trip;
      const isNew = !state.trips.find(t => t.id === trip.id);
      dispatch({ type: 'SET_TRIPS', payload: isNew ? [finalTrip, ...state.trips] : state.trips.map(t => t.id === trip.id ? finalTrip : t) });
      return;
    }

    const { error } = await supabase
      .from('trips')
      .upsert({
        id: trip.id,
        user_id: state.user.id,
        title: trip.title,
        thumb: trip.thumb,
        trip_data: trip,
      });

    if (error) throw error;

    const updated = state.trips.map(t => t.id === trip.id ? trip : t);
    const isNew = !state.trips.find(t => t.id === trip.id);
    dispatch({ type: 'SET_TRIPS', payload: isNew ? [trip, ...state.trips] : updated });
  }, [state.user, state.trips, dispatch]);

  const setShareToken = useCallback(async (tripId) => {
    if (!state.user) return null;
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('trips')
      .update({ share_token: token })
      .eq('id', tripId)
      .eq('user_id', state.user.id);
    if (error) throw error;
    dispatch({
      type: 'SET_TRIPS',
      payload: state.trips.map(t => t.id === tripId ? { ...t, share_token: token } : t),
    });
    return token;
  }, [state.user, state.trips, dispatch]);

  const clearShareToken = useCallback(async (tripId) => {
    if (!state.user) return;
    const { error } = await supabase
      .from('trips')
      .update({ share_token: null })
      .eq('id', tripId)
      .eq('user_id', state.user.id);
    if (error) throw error;
    dispatch({
      type: 'SET_TRIPS',
      payload: state.trips.map(t => t.id === tripId ? { ...t, share_token: null } : t),
    });
  }, [state.user, state.trips, dispatch]);

  const importSharedTrip = useCallback(async (sharedTrip) => {
    if (!state.user) return null;
    const newTrip = {
      ...sharedTrip,
      id: crypto.randomUUID(),
      share_token: undefined,
      days: (sharedTrip.days || []).map(day => ({
        ...day,
        id: crypto.randomUUID(),
        stops: (day.stops || []).map(stop => ({
          ...stop,
          id: crypto.randomUUID(),
        })),
      })),
    };
    delete newTrip.share_token;
    await saveTrip(newTrip);
    return newTrip;
  }, [saveTrip, state.user]);

  return {
    trips: state.trips,
    refreshTrips,
    deleteTrip,
    saveTrip,
    setShareToken,
    clearShareToken,
    importSharedTrip,
  };
}
