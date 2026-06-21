import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDays } from './useDays';
import { useTripEditor } from './useTripEditor';
import { saveDayToDB } from '../utils/dayHelpers';

/**
 * useCheckIn(date) — 通用打卡 hook
 *
 * 封装「为某一天创建/加载 day → 虚拟 trip → addStopFromPlace → 写回 DB」的完整流程。
 * 调用方只需传入日期字符串，即可获得地图 check-in 所需的全部状态和方法。
 *
 * @param {string} date - "YYYY-MM-DD"（今日打卡传 today，日历打卡传选中的日期）
 * @returns {{ virtualTripId, dayId, loading, existingPlaceIds, handleAddToDay }}
 */
export function useCheckIn(date) {
  const { state, dispatch } = useApp();
  const { getOrCreateDay } = useDays();
  const [loading, setLoading] = useState(true);
  const [dayId, setDayId] = useState(null);
  const saveTimerRef = useRef(null);

  const virtualTripId = useMemo(() => `checkin-${date}`, [date]);

  // ── Step 1: 加载/创建 day，包装成虚拟 trip ──
  useEffect(() => {
    if (!state.user || !date) return;

    // 已经存在则直接复用
    const existing = state.trips.find(t => t.id === virtualTripId);
    if (existing) {
      setDayId(existing.days?.[0]?.id || null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getOrCreateDay(date).then((day) => {
      if (!day) {
        setLoading(false);
        return;
      }

      const virtualTrip = {
        id: virtualTripId,
        _isV2: true,
        _isVirtualTrip: true,
        _isVirtualDay: true,
        _realTripId: null,
        title: date,
        startDate: date,
        endDate: date,
        settings: {},
        days: [{
          id: day.id,
          _dayId: day.id,
          user_id: day.user_id,
          date,
          title: day.title || null,
          color: day.color || '#5b7a99',
          stops: day.stops || [],
        }],
        activeDayId: day.id,
      };

      dispatch({ type: 'UPDATE_TRIP', payload: virtualTrip });
      setDayId(day.id);
      setLoading(false);
    });
  }, [date, state.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 2: 监听变化，同步到内存 + 数据库 ──
  useEffect(() => {
    const virtualTrip = state.trips.find(t => t.id === virtualTripId);
    if (!virtualTrip || loading) return;

    const day = virtualTrip.days?.[0];
    if (!day) return;

    const userId = day.user_id || state.user?.id;
    const dayPayload = {
      id: day._dayId || day.id,
      user_id: userId,
      date: day.date,
      title: day.title,
      color: day.color,
      stops: day.stops || [],
    };

    // 立即更新内存
    dispatch({ type: 'UPSERT_DAY', payload: dayPayload });

    // 防抖写入数据库
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDayToDB(userId, dayPayload)
        .catch(err => console.warn('[useCheckIn] saveDayToDB failed:', err));
    }, 600);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state.trips, virtualTripId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 3: 地图交互所需的 derived state ──
  const { addStopFromPlace } = useTripEditor(virtualTripId);

  const existingPlaceIds = useMemo(() => {
    const vTrip = state.trips.find(t => t.id === virtualTripId);
    return (vTrip?.days?.[0]?.stops || []).flatMap(s => [s.placeId, s.amap_poi_id]).filter(Boolean);
  }, [state.trips, virtualTripId]);

  const handleAddToDay = useCallback(async (dayIdArg, placeId, useNow = false) => {
    await addStopFromPlace(dayIdArg, placeId, null, useNow);
  }, [addStopFromPlace]);

  return { virtualTripId, dayId, loading, existingPlaceIds, handleAddToDay };
}
