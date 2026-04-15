/**
 * Hotel stay management: save check-in/check-out info across days.
 */

import { useCallback } from 'react';
import {
  cloneTrip,
  findDayById,
  findStopAcrossTrip,
  findStopById,
} from '../../utils/tripEditorHelpers';

export function useTripStay(withTripUpdate, computeTransitData) {

  const saveStayInfo = useCallback((dayId, stopId, { cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod }) => {
    const updateResult = withTripUpdate((updated) => {
      const { day: origDay, stop } = findStopAcrossTrip(updated, stopId);
      if (!origDay || !stop) return false;

      const stayId = stop.stayId || `stay-${Date.now()}`;
      updated.days.forEach((day) => {
        day.stops = day.stops.filter((item) => !(item.stayId === stayId && item.type === 'hotel_checkout'));
      });

      const cinDay = updated.days.find((day) => day.date === cinDate);
      const coutDay = updated.days.find((day) => day.date === coutDate);
      if (!cinDay || !coutDay) {
        alert('鎵€閫夋棩鏈熶笉鍦ㄨ绋嬭寖鍥村唴');
        return false;
      }

      stop.stayId = stayId;
      stop.type = 'hotel_checkin';
      stop.time = cinTime;
      stop.period = cinPeriod;

      if (origDay.id !== cinDay.id) {
        origDay.stops = origDay.stops.filter((item) => item.id !== stopId);
        cinDay.stops.push(stop);
      }

      const coutStop = {
        ...cloneTrip(stop),
        id: `cout-${Date.now()}`,
        type: 'hotel_checkout',
        stayId,
        time: coutTime,
        period: coutPeriod,
      };
      coutDay.stops.push(coutStop);
      return { cinDayId: cinDay.id, coutDayId: coutDay.id };
    });

    if (updateResult?.updated) {
      computeTransitData(updateResult.result.cinDayId, updateResult.updated);
      if (updateResult.result.coutDayId !== updateResult.result.cinDayId) {
        computeTransitData(updateResult.result.coutDayId, updateResult.updated);
      }
    }
  }, [withTripUpdate, computeTransitData]);

  return { saveStayInfo };
}
