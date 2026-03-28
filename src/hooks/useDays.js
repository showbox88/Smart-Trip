import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { isAdmin } from '../utils/admin';

/**
 * useDays — v2 Day-Centric Architecture
 *
 * Day 是客观事实，全局唯一（user_id + date）。
 * 负责 days_v2 表的所有读写操作。
 */
export function useDays() {
  const { state, dispatch } = useApp();

  /**
   * 加载指定日期范围的 days（用于打开 Trip 时）
   * @param {string} startDate - "YYYY-MM-DD"
   * @param {string} endDate   - "YYYY-MM-DD"
   */
  const loadDaysInRange = useCallback(async (startDate, endDate) => {
    if (!state.user) return [];

    let query = supabase.from('days_v2').select('*');
    if (!isAdmin(state.user)) query = query.eq('user_id', state.user.id);

    const { data, error } = await query
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('[useDays] loadDaysInRange error:', error.message);
      return [];
    }

    const days = data.map(normalizeDayRow);
    dispatch({ type: 'SET_DAYS', payload: days });
    return days;
  }, [state.user, dispatch]);

  /**
   * 加载某个 Trip 关联的所有 days（通过 trip_days 关联表）
   * @param {string} tripId
   */
  const loadDaysForTrip = useCallback(async (tripId) => {
    if (!state.user) return [];
    const { data, error } = await supabase
      .from('trip_days')
      .select(`
        day_id,
        days_v2 (
          id, user_id, date, title, color, stops_data, created_at
        )
      `)
      .eq('trip_id', tripId)
      .order('days_v2(date)', { ascending: true });

    if (error) {
      console.error('[useDays] loadDaysForTrip error:', error.message);
      return [];
    }

    const days = data
      .filter(row => row.days_v2)
      .map(row => normalizeDayRow(row.days_v2));

    dispatch({ type: 'SET_DAYS', payload: days });
    return days;
  }, [state.user, dispatch]);

  /**
   * 获取或创建某一天的记录（懒创建）
   * @param {string} date - "YYYY-MM-DD"
   * @returns {object} day
   */
  const getOrCreateDay = useCallback(async (date) => {
    if (!state.user) return null;

    // 先查内存缓存
    if (state.days[date]) return state.days[date];

    // 查数据库
    let query = supabase.from('days_v2').select('*').eq('date', date);
    if (!isAdmin(state.user)) query = query.eq('user_id', state.user.id);
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[useDays] getOrCreateDay select error:', error.message);
      return null;
    }

    if (data) {
      const day = normalizeDayRow(data);
      dispatch({ type: 'UPSERT_DAY', payload: day });
      return day;
    }

    // 不存在则创建（懒创建）
    const newDay = {
      id: `day-${Date.now()}`,
      user_id: state.user.id,
      date,
      title: null,
      color: '#5b7a99',
      stops_data: [],
    };

    const { data: inserted, error: insertError } = await supabase
      .from('days_v2')
      .insert(newDay)
      .select()
      .single();

    if (insertError) {
      console.error('[useDays] getOrCreateDay insert error:', insertError.message);
      return null;
    }

    const day = normalizeDayRow(inserted);
    dispatch({ type: 'UPSERT_DAY', payload: day });
    return day;
  }, [state.user, state.days, dispatch]);

  /**
   * 保存（更新）一天的数据
   * @param {object} day - 完整的 day 对象
   */
  const saveDay = useCallback(async (day) => {
    if (!state.user) return;

    const { error } = await supabase
      .from('days_v2')
      .upsert({
        id: day.id,
        user_id: day.user_id || state.user.id,
        date: day.date,
        title: day.title,
        color: day.color,
        stops_data: day.stops || [],
      });

    if (error) {
      console.error('[useDays] saveDay error:', error.message);
      throw error;
    }

    dispatch({ type: 'UPSERT_DAY', payload: day });
  }, [state.user, dispatch]);

  /**
   * 更新一天的 stops（最常用操作，直接传新 stops 数组）
   * @param {string} date - "YYYY-MM-DD"
   * @param {array}  stops
   */
  const updateDayStops = useCallback(async (date, stops) => {
    if (!state.user) return;

    const day = state.days[date];
    if (!day) {
      console.warn('[useDays] updateDayStops: day not found for date', date);
      return;
    }

    const updated = { ...day, stops };
    dispatch({ type: 'UPSERT_DAY', payload: updated });

    let query = supabase
      .from('days_v2')
      .update({ stops_data: stops })
      .eq('id', day.id);
    
    if (!isAdmin(state.user)) query = query.eq('user_id', state.user.id);
    const { error } = await query;

    if (error) {
      console.error('[useDays] updateDayStops error:', error.message);
      // 回滚
      dispatch({ type: 'UPSERT_DAY', payload: day });
      throw error;
    }
  }, [state.user, state.days, dispatch]);

  /**
   * 更新一天的元数据（title、color）
   * @param {string} date
   * @param {object} updates - { title?, color? }
   */
  const updateDayMeta = useCallback(async (date, updates) => {
    if (!state.user) return;

    const day = state.days[date];
    if (!day) return;

    const updated = { ...day, ...updates };
    dispatch({ type: 'UPSERT_DAY', payload: updated });

    let query = supabase
      .from('days_v2')
      .update(updates)
      .eq('id', day.id);
    
    if (!isAdmin(state.user)) query = query.eq('user_id', state.user.id);
    const { error } = await query;

    if (error) {
      console.error('[useDays] updateDayMeta error:', error.message);
      dispatch({ type: 'UPSERT_DAY', payload: day });
      throw error;
    }
  }, [state.user, state.days, dispatch]);

  /**
   * 删除一天的记录（同时从所有 trip_days 关联中移除，由 CASCADE 自动处理）
   * @param {string} date - "YYYY-MM-DD"
   */
  const deleteDay = useCallback(async (date) => {
    if (!state.user) return;

    const day = state.days[date];
    if (!day) return;

    let query = supabase
      .from('days_v2')
      .delete()
      .eq('id', day.id);
    
    if (!isAdmin(state.user)) query = query.eq('user_id', state.user.id);
    const { error } = await query;

    if (error) {
      console.error('[useDays] deleteDay error:', error.message);
      throw error;
    }

    dispatch({ type: 'DELETE_DAY', payload: date });
  }, [state.user, state.days, dispatch]);

  return {
    days: state.days,
    loadDaysInRange,
    loadDaysForTrip,
    getOrCreateDay,
    saveDay,
    updateDayStops,
    updateDayMeta,
    deleteDay,
  };
}

// ── 内部工具 ────────────────────────────────────────────

/**
 * 将数据库行转换为前端使用的 day 对象
 * stops_data (JSONB) → stops (array)
 */
function normalizeDayRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    title: row.title,
    color: row.color || '#5b7a99',
    stops: Array.isArray(row.stops_data) ? row.stops_data : [],
    created_at: row.created_at,
  };
}
