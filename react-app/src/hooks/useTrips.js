import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { generateId } from '../utils/formatters';

export function useTrips() {
  const { state, dispatch } = useApp();

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
