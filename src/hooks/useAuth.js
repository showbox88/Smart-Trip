import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../theme';
import { normalizeTripRow } from './useTripsV2';
import { IS_PB } from '../lib/dataSource';
import { useAuthPb } from './pb/useAuthPb';

function useAuthSupabase() {
  const { state, dispatch } = useApp();
  const { setLanguage } = useI18n();
  const { setUserId: setThemeUserId } = useTheme();

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
        setThemeUserId(u.id);
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
        setThemeUserId(u.id);
      } else {
        dispatch({ type: 'LOGOUT' });
        setThemeUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch, setThemeUserId]);

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

        // Load v2 trip metadata (with full join so cities/stopsCount are available immediately)
        const { data: tripsV2Data, error: tripsV2Error } = await supabase
          .from('trips')
          .select(`
            id, title, thumb, start_date, end_date, settings, share_token, created_at,
            trip_days ( days_v2 ( stops_data ) )
          `)
          .eq('user_id', state.user.id)
          .is('trip_data', null)
          .order('created_at', { ascending: false });

        if (!tripsV2Error && tripsV2Data?.length) {
          dispatch({
            type: 'SET_TRIPS_V2',
            payload: tripsV2Data.map(normalizeTripRow),
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

// 数据源在构建时确定，模块级选择不违反 hooks 规则
export const useAuth = IS_PB ? useAuthPb : useAuthSupabase;
