import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useDays } from './useDays';
import { deleteFilesFromSupabase } from '../utils/uploadHelpers';

/**
 * useTripsV2 — v2 Trip 元数据 + trip_days 关联管理
 *
 * Trip 只是一个标签/过滤器，不存储行程内容。
 * 行程内容存在 days_v2，通过 trip_days 关联。
 */
export function useTripsV2() {
  const { state, dispatch } = useApp();
  const { loadDaysForTrip } = useDays();

  /**
   * 加载所有 trips 元数据
   */
  const refreshTrips = useCallback(async () => {
    if (!state.user) return;

    const { data, error } = await supabase
      .from('trips')
      .select('id, title, thumb, start_date, end_date, settings, share_token, created_at')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[useTripsV2] refreshTrips error:', error.message);
      return;
    }

    dispatch({ type: 'SET_TRIPS_V2', payload: data.map(normalizeTripRow) });
  }, [state.user, dispatch]);

  /**
   * 加载单个 Trip 及其所有关联 days
   * @param {string} tripId
   * @returns {{ trip, days }}
   */
  const loadTrip = useCallback(async (tripId) => {
    if (!state.user) return null;

    const trip = state.tripsV2.find(t => t.id === tripId);
    if (!trip) return null;

    const days = await loadDaysForTrip(tripId);
    return { trip, days };
  }, [state.user, state.tripsV2, loadDaysForTrip]);

  /**
   * 创建新 Trip（不自动创建 days，懒创建）
   * @param {{ title, startDate, endDate, thumb?, settings? }} meta
   * @returns {object} trip
   */
  const createTrip = useCallback(async (meta) => {
    if (!state.user) return null;

    const trip = {
      id: `trip-${Date.now()}`,
      user_id: state.user.id,
      title: meta.title || '',
      thumb: meta.thumb || null,
      start_date: meta.startDate || null,
      end_date: meta.endDate || null,
      settings: meta.settings || {},
    };

    const { data, error } = await supabase
      .from('trips')
      .insert(trip)
      .select()
      .single();

    if (error) {
      console.error('[useTripsV2] createTrip error:', error.message);
      throw error;
    }

    const normalized = normalizeTripRow(data);
    dispatch({ type: 'UPDATE_TRIP_V2', payload: normalized });
    return normalized;
  }, [state.user, dispatch]);

  /**
   * 更新 Trip 元数据（title、thumb、dates、settings）
   * @param {string} tripId
   * @param {object} updates
   */
  const updateTrip = useCallback(async (tripId, updates) => {
    if (!state.user) return;

    const dbUpdates = {};
    if (updates.title !== undefined)     dbUpdates.title = updates.title;
    if (updates.thumb !== undefined)     dbUpdates.thumb = updates.thumb;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined)   dbUpdates.end_date = updates.endDate;
    if (updates.settings !== undefined)  dbUpdates.settings = updates.settings;

    const { error } = await supabase
      .from('trips')
      .update(dbUpdates)
      .eq('id', tripId)
      .eq('user_id', state.user.id);

    if (error) {
      console.error('[useTripsV2] updateTrip error:', error.message);
      throw error;
    }

    const existing = state.tripsV2.find(t => t.id === tripId);
    if (existing) {
      dispatch({
        type: 'UPDATE_TRIP_V2',
        payload: { ...existing, ...updates },
      });
    }
  }, [state.user, state.tripsV2, dispatch]);

  /**
   * 删除 Trip（不删除 days，只删除关联和元数据）
   * trip_days 由 CASCADE 自动清理
   * @param {string} tripId
   */
  const deleteTrip = useCallback(async (tripId) => {
    if (!state.user) return;

    // 清理封面图
    const trip = state.tripsV2.find(t => t.id === tripId);
    if (trip?.thumb) {
      const fileName = extractStorageFileName(trip.thumb);
      if (fileName) {
        try {
          await deleteFilesFromSupabase([fileName]);
        } catch (e) {
          console.warn('[useTripsV2] deleteTrip: failed to delete thumb', e);
        }
      }
    }

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', state.user.id);

    if (error) {
      console.error('[useTripsV2] deleteTrip error:', error.message);
      throw error;
    }

    dispatch({ type: 'DELETE_TRIP_V2', payload: tripId });
  }, [state.user, state.tripsV2, dispatch]);

  // ── trip_days 关联管理 ──────────────────────────────────

  /**
   * 将一个 day 关联到 Trip
   * @param {string} tripId
   * @param {string} dayId
   */
  const linkDayToTrip = useCallback(async (tripId, dayId) => {
    const { error } = await supabase
      .from('trip_days')
      .upsert({ trip_id: tripId, day_id: dayId });

    if (error) {
      console.error('[useTripsV2] linkDayToTrip error:', error.message);
      throw error;
    }
  }, []);

  /**
   * 将一个 day 从 Trip 中解除关联（不删除 day 本身）
   * @param {string} tripId
   * @param {string} dayId
   */
  const unlinkDayFromTrip = useCallback(async (tripId, dayId) => {
    const { error } = await supabase
      .from('trip_days')
      .delete()
      .eq('trip_id', tripId)
      .eq('day_id', dayId);

    if (error) {
      console.error('[useTripsV2] unlinkDayFromTrip error:', error.message);
      throw error;
    }
  }, []);

  /**
   * 将日期范围内的所有已存在 days 批量关联到 Trip
   * 用于"建立 Trip 后，将这几天归入行程"的场景
   * @param {string} tripId
   * @param {string[]} dayIds
   */
  const linkDaysToTrip = useCallback(async (tripId, dayIds) => {
    if (!dayIds.length) return;

    const rows = dayIds.map(dayId => ({ trip_id: tripId, day_id: dayId }));
    const { error } = await supabase
      .from('trip_days')
      .upsert(rows);

    if (error) {
      console.error('[useTripsV2] linkDaysToTrip error:', error.message);
      throw error;
    }
  }, []);

  // ── 分享功能 ────────────────────────────────────────────

  const setShareToken = useCallback(async (tripId) => {
    if (!state.user) return null;
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from('trips')
      .update({ share_token: token })
      .eq('id', tripId)
      .eq('user_id', state.user.id);
    if (error) throw error;

    const existing = state.tripsV2.find(t => t.id === tripId);
    if (existing) {
      dispatch({ type: 'UPDATE_TRIP_V2', payload: { ...existing, share_token: token } });
    }
    return token;
  }, [state.user, state.tripsV2, dispatch]);

  const clearShareToken = useCallback(async (tripId) => {
    if (!state.user) return;
    const { error } = await supabase
      .from('trips')
      .update({ share_token: null })
      .eq('id', tripId)
      .eq('user_id', state.user.id);
    if (error) throw error;

    const existing = state.tripsV2.find(t => t.id === tripId);
    if (existing) {
      dispatch({ type: 'UPDATE_TRIP_V2', payload: { ...existing, share_token: null } });
    }
  }, [state.user, state.tripsV2, dispatch]);

  return {
    trips: state.tripsV2,
    refreshTrips,
    loadTrip,
    createTrip,
    updateTrip,
    deleteTrip,
    linkDayToTrip,
    unlinkDayFromTrip,
    linkDaysToTrip,
    setShareToken,
    clearShareToken,
  };
}

// ── 内部工具 ────────────────────────────────────────────

function normalizeTripRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    thumb: row.thumb || null,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    settings: row.settings || {},
    share_token: row.share_token || null,
    created_at: row.created_at,
  };
}

function extractStorageFileName(url) {
  if (!url || !url.includes('/storage/v1/object/public/trip-media/')) return null;
  return url.split('/').pop().split('?')[0];
}
