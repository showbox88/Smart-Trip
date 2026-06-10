import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useDays } from '../useDays';
import { getPbTrips, getPbTrip } from '../../adapters/pbAdapter';

const READONLY_MSG = '[pb] PocketBase 数据源为只读模式，写操作未执行';

/**
 * useTripsV2Pb — PocketBase 只读版 useTripsV2
 * 接口签名与 useTripsV2 完全一致；所有写操作 no-op + 警告。
 */
export function useTripsV2Pb() {
  const { state, dispatch } = useApp();
  const { loadDaysForTrip } = useDays();

  const refreshTrips = useCallback(async () => {
    if (!state.user) return;
    try {
      const trips = await getPbTrips(true);
      dispatch({ type: 'SET_TRIPS_V2', payload: trips });
    } catch (e) {
      console.error('[useTripsV2Pb] refreshTrips error:', e.message);
    }
  }, [state.user, dispatch]);

  const loadTrip = useCallback(async (tripId) => {
    if (!state.user) return null;

    let trip = state.tripsV2.find(t => t.id === tripId);
    if (!trip) {
      trip = await getPbTrip(tripId);
      if (!trip) return null;
      dispatch({ type: 'UPDATE_TRIP_V2', payload: trip });
    }

    const days = await loadDaysForTrip(tripId);
    return { trip, days };
  }, [state.user, state.tripsV2, loadDaysForTrip, dispatch]);

  // ── 写操作：只读模式全部 no-op ──────────────────────────

  const createTrip = useCallback(async () => {
    console.warn(READONLY_MSG);
    throw new Error('PocketBase 数据源为只读模式，不能创建行程');
  }, []);

  const updateTrip = useCallback(async (tripId, updates) => {
    console.warn(READONLY_MSG, { tripId, updates });
    // 仅更新本地内存，让 UI 不卡死；刷新后恢复 PB 数据
    const existing = state.tripsV2.find(t => t.id === tripId);
    if (existing) {
      dispatch({ type: 'UPDATE_TRIP_V2', payload: { ...existing, ...updates } });
    }
  }, [state.tripsV2, dispatch]);

  const deleteTrip = useCallback(async () => {
    console.warn(READONLY_MSG);
    throw new Error('PocketBase 数据源为只读模式，不能删除行程');
  }, []);

  const linkDayToTrip = useCallback(async () => { console.warn(READONLY_MSG); }, []);
  const unlinkDayFromTrip = useCallback(async () => { console.warn(READONLY_MSG); }, []);
  const linkDaysToTrip = useCallback(async () => { console.warn(READONLY_MSG); }, []);

  const setShareToken = useCallback(async () => {
    console.warn(READONLY_MSG);
    throw new Error('PocketBase 数据源为只读模式，不支持分享');
  }, []);

  const clearShareToken = useCallback(async () => { console.warn(READONLY_MSG); }, []);

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
