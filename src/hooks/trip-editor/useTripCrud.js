/**
 * Core CRUD operations for trip days and stops.
 */

import { useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { IS_PB } from '../../lib/dataSource';
import {
  DEFAULT_DAY_COLORS,
  findDayById,
  findStopById,
  formatTripDate,
  insertStopIntoDay,
  sortStopsByTime,
  syncTripEndDate,
} from '../../utils/tripEditorHelpers';

export function useTripCrud(withTripUpdate, computeTransitData, state, dispatch, t) {

  const addDay = useCallback(() => {
    const updateResult = withTripUpdate((updated) => {
      const newDayNum = updated.days.length + 1;
      const newDayId = `day-${Date.now()}`;

      if (updated.startDate) {
        const newEnd = new Date(updated.startDate.replace(/-/g, '/'));
        newEnd.setDate(newEnd.getDate() + updated.days.length);
        if (!isNaN(newEnd)) {
          updated.endDate = `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, '0')}-${String(newEnd.getDate()).padStart(2, '0')}`;
        }
      }

      updated.days.push({
        id: newDayId,
        title: `${t('itinerary.day_label')}${newDayNum}`,
        date: updated.startDate ? formatTripDate(updated.startDate, updated.days.length) : t('itinerary.unknown_date'),
        stops: [],
        color: DEFAULT_DAY_COLORS[(newDayNum - 1) % DEFAULT_DAY_COLORS.length],
      });
      updated.activeDayId = newDayId;
      return newDayId;
    });

    return updateResult?.result || null;
  }, [withTripUpdate, t]);

  const deleteDay = useCallback((dayId) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      day.stops = [];
      return updated;
    });
  }, [withTripUpdate]);

  const removeDay = useCallback((dayId) => {
    withTripUpdate((updated) => {
      updated.days = updated.days.filter((day) => day.id !== dayId);
      if (updated.activeDayId === dayId) {
        updated.activeDayId = updated.days[updated.days.length - 1]?.id || null;
      }
      syncTripEndDate(updated);
      return updated;
    });
  }, [withTripUpdate]);

  const setDayColor = useCallback((dayId, color) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      day.color = color;
      if (day.date) {
        const existingDay = state.days?.[day.date];
        if (existingDay) {
          dispatch({ type: 'UPSERT_DAY', payload: { ...existingDay, color } });
        }
      }
      return updated;
    });
  }, [withTripUpdate, state.days, dispatch]);

  const updateDay = useCallback((dayId, patch) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      Object.assign(day, patch);
      return updated;
    });
  }, [withTripUpdate]);

  const deleteStop = useCallback((dayId, stopId) => {
    const photoPathsToDelete = [];
    const deletedStopIds = [];
    const collectPhotos = (stop) => {
      if (stop?.photo && stop.photo.includes('trip-media')) {
        const fileName = stop.photo.split('/').pop().split('?')[0];
        if (fileName) photoPathsToDelete.push(fileName);
      }
    };

    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;

      const stop = findStopById(day, stopId);
      if (stop?.stayId) {
        updated.days.forEach((tripDay) => {
          tripDay.stops.forEach((s) => {
            if (s.stayId === stop.stayId) { collectPhotos(s); deletedStopIds.push(s.id); }
          });
          tripDay.stops = tripDay.stops.filter((item) => item.stayId !== stop.stayId);
        });
      } else {
        collectPhotos(stop);
        deletedStopIds.push(stopId);
        day.stops = day.stops.filter((item) => item.id !== stopId);
      }

      return updated;
    });

    // PB 模式：显式删除 PB 记录（差量同步器无法从"缺失"推断删除）
    if (IS_PB && deletedStopIds.length > 0) {
      import('../../adapters/pbWrites')
        .then(({ deletePbStops }) => deletePbStops(deletedStopIds))
        .catch((err) => console.warn('[deleteStop] PB delete failed:', err));
    }

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }

    if (photoPathsToDelete.length > 0) {
      supabase.storage.from('trip-media').remove(photoPathsToDelete)
        .catch((err) => console.warn('[deleteStop] storage cleanup failed:', err));
    }
  }, [withTripUpdate, computeTransitData]);

  const updateStop = useCallback((dayId, stopId, patch) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      Object.assign(stop, patch);
      return updated;
    });
  }, [withTripUpdate]);

  const updateStopAndSort = useCallback((dayId, stopId, patch) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!day || !stop) return false;
      Object.assign(stop, patch);
      sortStopsByTime(day.stops);
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const sortDayByTime = useCallback((dayId) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      sortStopsByTime(day.stops);
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(dayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const insertStop = useCallback((dayId, newStop, afterStopId = null) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      if (!day) return false;
      insertStopIntoDay(day, newStop, afterStopId);
      return newStop.id;
    });

    return updateResult?.result || null;
  }, [withTripUpdate]);

  const moveStop = useCallback((sourceDayId, stopId, targetDayId, afterStopId) => {
    const updateResult = withTripUpdate((updated) => {
      const srcDay = findDayById(updated, sourceDayId);
      const tgtDay = findDayById(updated, targetDayId);
      if (!srcDay || !tgtDay) return false;

      const stopIdx = srcDay.stops.findIndex((stop) => stop.id === stopId);
      if (stopIdx === -1) return false;

      const [stop] = srcDay.stops.splice(stopIdx, 1);
      if (afterStopId == null) {
        tgtDay.stops.unshift(stop);
      } else {
        const afterIdx = tgtDay.stops.findIndex((item) => item.id === afterStopId);
        tgtDay.stops.splice(afterIdx + 1, 0, stop);
      }
      return updated;
    });

    if (updateResult?.updated) {
      computeTransitData(sourceDayId, updateResult.updated);
      if (sourceDayId !== targetDayId) computeTransitData(targetDayId, updateResult.updated);
    }
  }, [withTripUpdate, computeTransitData]);

  const moveDay = useCallback((dayId, afterDayId) => {
    withTripUpdate((updated) => {
      const dates = updated.days.map((day) => day.date);
      const fromIdx = updated.days.findIndex((day) => day.id === dayId);
      if (fromIdx === -1) return false;

      const [day] = updated.days.splice(fromIdx, 1);
      if (afterDayId == null) {
        updated.days.unshift(day);
      } else {
        const afterIdx = updated.days.findIndex((item) => item.id === afterDayId);
        updated.days.splice(afterIdx + 1, 0, day);
      }

      updated.days.forEach((item, index) => {
        if (dates[index] !== undefined) item.date = dates[index];
      });
      return updated;
    });
  }, [withTripUpdate]);

  return {
    addDay, deleteDay, removeDay, setDayColor, updateDay,
    deleteStop, updateStop, updateStopAndSort, sortDayByTime,
    insertStop, moveStop, moveDay,
  };
}
