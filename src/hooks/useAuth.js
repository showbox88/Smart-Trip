import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { formatTripDate } from '../utils/tripEditorHelpers';

export function useAuth() {
  const { state, dispatch } = useApp();
  const { setLanguage } = useI18n();

  // Subscribe to auth state changes on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        dispatch({
          type: 'SET_USER',
          payload: {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.email.split('@')[0],
            avatar: u.user_metadata?.avatar_url || null,
          },
        });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    // Listen for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        dispatch({
          type: 'SET_USER',
          payload: {
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || u.email.split('@')[0],
            avatar: u.user_metadata?.avatar_url || null,
          },
        });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Load user data (trips + settings) after user is set
  useEffect(() => {
    if (!state.user) return;

    const loadUserData = async () => {
      try {
        // Load settings
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('id', state.user.id)
          .single();

        if (settingsData?.settings) {
          dispatch({ type: 'SET_SETTINGS', payload: settingsData.settings });
          if (settingsData.settings.language) {
            setLanguage(settingsData.settings.language);
          }
        }

        // Load trips
        const { data: tripsData, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', state.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (tripsData) {
          const trips = tripsData.map(row => {
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
        }

        // v2: Load trip metadata from new schema (no trip_data, no days)
        const { data: tripsV2Data, error: tripsV2Error } = await supabase
          .from('trips')
          .select('id, title, thumb, start_date, end_date, settings, share_token, created_at')
          .eq('user_id', state.user.id)
          .is('trip_data', null)  // Only v2 trips (no legacy trip_data)
          .order('created_at', { ascending: false });

        if (!tripsV2Error && tripsV2Data?.length) {
          dispatch({
            type: 'SET_TRIPS_V2',
            payload: tripsV2Data.map(row => ({
              id: row.id,
              title: row.title || '',
              thumb: row.thumb || null,
              startDate: row.start_date || null,
              endDate: row.end_date || null,
              settings: row.settings || {},
              share_token: row.share_token || null,
              created_at: row.created_at,
            })),
          });
        }
      } catch (e) {
        console.error('[useAuth] loadUserData error:', e.message);
      }
    };

    loadUserData();
  }, [state.user?.id, dispatch, setLanguage]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  return { user: state.user, isLoading: state.isLoading, signIn, signUp, signOut, signInWithGoogle };
}
