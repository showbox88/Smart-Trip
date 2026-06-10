import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useDays } from '../useDays';
import { pb } from '../../lib/pb';
import { getPbTrips, getPbTrip, clearPbCache } from '../../adapters/pbAdapter';

const READONLY_MSG = '[pb] PocketBase 数据源为只读模式，写操作未执行';

/** "YYYY-MM-DD" → PB date；空值原样传空 */
const pbDateVal = (d) => (d ? `${d} 00:00:00.000Z` : '');

// UI 三态 → PB 五态（select 只认这五个值）
const UI_STATUS_TO_PB = { planned: 'Planning', ongoing: 'Ongoing', completed: 'Done' };
const toPbStatus = (s) => (s ? (UI_STATUS_TO_PB[s] || s) : '');

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

  // ── 写操作（3b） ────────────────────────────────────────

  const createTrip = useCallback(async (meta) => {
    if (!state.user) return null;
    const rec = await pb.collection('trips').create({
      title: meta.title || '',
      date_start: pbDateVal(meta.startDate),
      date_end: pbDateVal(meta.endDate),
    });
    clearPbCache();
    const trip = await getPbTrip(rec.id);
    dispatch({ type: 'UPDATE_TRIP_V2', payload: trip });
    return trip;
  }, [state.user, dispatch]);

  const updateTrip = useCallback(async (tripId, updates) => {
    const existing = state.tripsV2.find(t => t.id === tripId);
    if (existing) {
      dispatch({ type: 'UPDATE_TRIP_V2', payload: { ...existing, ...updates } });
    }
    const patch = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.startDate !== undefined) patch.date_start = pbDateVal(updates.startDate);
    if (updates.endDate !== undefined) patch.date_end = pbDateVal(updates.endDate);
    if (updates.status !== undefined) patch.status = toPbStatus(updates.status);
    if (updates.settings?.status !== undefined) patch.status = toPbStatus(updates.settings.status);
    if (updates.thumb !== undefined && updates.thumb) {
      // 封面 = trips.photos 第一张
      const raw = (await pb.collection('trips').getOne(tripId)).photos;
      const photos = Array.isArray(raw) ? raw : [];
      patch.photos = [updates.thumb, ...photos.filter(p => p !== updates.thumb)];
    }
    if (Object.keys(patch).length > 0) {
      await pb.collection('trips').update(tripId, patch);
      clearPbCache();
    }
  }, [state.tripsV2, dispatch]);

  const deleteTrip = useCallback(async (tripId) => {
    if (!state.user) return;
    await pb.collection('trips').delete(tripId); // 不删 days/stops，只删行程标签本身
    clearPbCache();
    dispatch({ type: 'DELETE_TRIP_V2', payload: tripId });
  }, [state.user, dispatch]);

  const linkDayToTrip = useCallback(async (tripId, dayId) => {
    await pb.collection('days').update(dayId, { trip: tripId });
    clearPbCache();
  }, []);

  const unlinkDayFromTrip = useCallback(async (_tripId, dayId) => {
    await pb.collection('days').update(dayId, { trip: '' });
    clearPbCache();
  }, []);

  const linkDaysToTrip = useCallback(async (tripId, dayIds) => {
    for (const dayId of dayIds) {
      await pb.collection('days').update(dayId, { trip: tripId });
    }
    if (dayIds.length) clearPbCache();
  }, []);

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
