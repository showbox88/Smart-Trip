import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/formatters';
import { deleteFilesFromSupabase } from '../utils/uploadHelpers';

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

    const trips = data.map(row => ({
      ...row.trip_data,
      id: row.id,
      title: row.title,
      thumb: row.thumb,
    }));
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

  return {
    trips: state.trips,
    refreshTrips,
    deleteTrip,
    saveTrip,
  };
}
