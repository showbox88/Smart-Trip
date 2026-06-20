/**
 * 从高德 POI 直接建 stop(不依赖 Google 详情)。
 * 与 useTripPlaceAdd.addStopFromPlace 产出同形 stop;坐标 GCJ-02 → WGS-84,写 amap_poi_id。
 */
import { useCallback } from 'react';
import { gcj02ToWgs84 } from '../../utils/coord';
import {
  cloneTrip,
  findDayById,
  insertStopIntoDay,
  sortStopsByTime,
} from '../../utils/tripEditorHelpers';

export function useAmapPlaceAdd(trip, state, tripId, applyUpdate, computeTransitData) {
  const addStopFromAmapPoi = useCallback(async (dayId, poi, afterStopId = null, useNow = false) => {
    if (!trip || !poi) return null;

    const updated = cloneTrip(trip);
    const day = findDayById(updated, dayId);
    if (!day) return null;

    // 实时打卡时间(镜像 useTripPlaceAdd 的 useNow 逻辑);非实时给个默认值
    let timeStr = '09:00';
    let period = 'AM';
    if (useNow) {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      timeStr = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // 高德 POI 坐标是 GCJ-02 → 存库统一 WGS-84
    const gcj = poi._gcj || poi.geometry?.location || { lat: poi.lat, lng: poi.lng };
    const w = gcj02ToWgs84(Number(gcj.lat), Number(gcj.lng));

    const newStop = {
      id: `s${Date.now()}`,
      location: poi.name || '',
      desc: '',
      address: poi.vicinity || '',
      city: '',
      phone: '',
      time: timeStr,
      period,
      note: '',
      price: '0',
      type: 'location',
      lat: w.lat,
      lng: w.lng,
      photo: '',
      rating: undefined,
      category: '',
      categoryIcon: '',
      placeTypes: poi.types || [],
      placeId: '', // 高德无 Google placeId
      amap_poi_id: poi.amap_poi_id || poi.place_id || '',
      openingHours: [],
      ...(useNow ? { checkedIn: true, checkinTime: timeStr } : {}),
    };

    insertStopIntoDay(day, newStop, afterStopId);
    sortStopsByTime(day.stops);
    applyUpdate(updated);
    await computeTransitData(dayId, updated);
    return newStop.id;
  }, [trip, applyUpdate, computeTransitData]);

  return { addStopFromAmapPoi };
}
