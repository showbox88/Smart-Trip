import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getPbDaysForTrip,
  getPbDaysInRange,
  getPbDayByDate,
} from '../../adapters/pbAdapter';

const READONLY_MSG = '[pb] PocketBase 数据源为只读模式，改动只保留在本地内存（不会写入 PB）';

/**
 * useDaysPb — PocketBase 只读版 useDays
 * 接口签名与 useDays 完全一致。
 * 写操作只更新本地内存（保持 UI 流畅），绝不写 PocketBase。
 */
export function useDaysPb() {
  const { state, dispatch } = useApp();

  const loadDaysInRange = useCallback(async (startDate, endDate) => {
    if (!state.user) return [];
    try {
      const days = await getPbDaysInRange(startDate, endDate);
      dispatch({ type: 'SET_DAYS', payload: days });
      return days;
    } catch (e) {
      console.error('[useDaysPb] loadDaysInRange error:', e.message);
      return [];
    }
  }, [state.user, dispatch]);

  const loadDaysForTrip = useCallback(async (tripId) => {
    if (!state.user) return [];
    try {
      const days = await getPbDaysForTrip(tripId);
      dispatch({ type: 'SET_DAYS', payload: days });
      return days;
    } catch (e) {
      console.error('[useDaysPb] loadDaysForTrip error:', e.message);
      return [];
    }
  }, [state.user, dispatch]);

  const getOrCreateDay = useCallback(async (date) => {
    if (!state.user) return null;

    if (state.days[date]) return state.days[date];

    try {
      const day = await getPbDayByDate(date);
      if (day) {
        dispatch({ type: 'UPSERT_DAY', payload: day });
        return day;
      }
    } catch (e) {
      console.error('[useDaysPb] getOrCreateDay error:', e.message);
    }

    // PB 里没有这天 → 给一个本地临时 day（不持久化），让 DayPage 能打开
    const localDay = {
      id: `pb-local-${date}`,
      user_id: 'pb',
      date,
      title: null,
      color: '#5b7a99',
      stops: [],
      created_at: null,
    };
    dispatch({ type: 'UPSERT_DAY', payload: localDay });
    return localDay;
  }, [state.user, state.days, dispatch]);

  // ── 写操作：仅本地内存，不写 PB ────────────────────────

  const saveDay = useCallback(async (day) => {
    console.warn(READONLY_MSG);
    dispatch({ type: 'UPSERT_DAY', payload: day });
  }, [dispatch]);

  const updateDayStops = useCallback(async (date, stops) => {
    const day = state.days[date];
    if (!day) return;
    dispatch({ type: 'UPSERT_DAY', payload: { ...day, stops } });
    // Phase 3a：差量写 PB（打卡/照片/备注/记账），其余字段警告跳过
    try {
      const { syncDayStopsToPb } = await import('../../adapters/pbWrites');
      await syncDayStopsToPb(date, stops);
    } catch (e) {
      console.error('[useDaysPb] updateDayStops sync error:', e.message);
    }
  }, [state.days, dispatch]);

  const updateDayMeta = useCallback(async (date, updates) => {
    console.warn(READONLY_MSG);
    const day = state.days[date];
    if (!day) return;
    dispatch({ type: 'UPSERT_DAY', payload: { ...day, ...updates } });
  }, [state.days, dispatch]);

  const deleteDay = useCallback(async (date) => {
    console.warn(READONLY_MSG, { date });
    throw new Error('PocketBase 数据源为只读模式，不能删除日期');
  }, []);

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
