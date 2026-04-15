/**
 * Transit/route computation logic for trip editing.
 * Handles computing transit data between stops and toggling transit modes.
 */

import { useCallback, useRef } from 'react';
import { fetchRouteDuration } from '../../utils/transitHelpers';
import {
  buildStayGroups,
  cloneTrip,
  findDayById,
  findStopById,
} from '../../utils/tripEditorHelpers';

export function useTripTransit(trip, state, tripId, applyUpdate) {
  const isComputing = useRef(false);

  const computeTransitData = useCallback(async (dayId, tripSnapshot) => {
    const mapsApi = globalThis.google;
    if (!trip || !mapsApi || !window.googleMapsReady || isComputing.current) return;

    try {
      isComputing.current = true;
      const currentTrip = tripSnapshot || state.trips.find((tr) => tr.id === tripId);
      if (!currentTrip) return;

      const updated = cloneTrip(currentTrip);
      const day = findDayById(updated, dayId);
      if (!day) return;

      const locationStops = day.stops.filter((stop) =>
        ['location', 'hotel_checkin', 'hotel_checkout'].includes(stop.type || 'location') &&
        stop.lat && stop.lng
      );

      if (locationStops.length < 2) {
        const hasTransit = locationStops.some((stop) => stop.transitToNext);
        if (hasTransit) {
          locationStops.forEach((stop) => {
            stop.transitToNext = null;
          });
          applyUpdate(updated);
        }
        return;
      }

      let changed = false;
      for (let i = 0; i < locationStops.length - 1; i += 1) {
        const stop = locationStops[i];
        const next = locationStops[i + 1];

        if (stop.transitToNext && stop.transitToNext.duration && !changed) {
          // Rely on fetchRouteDuration's cache
        }

        const res = await fetchRouteDuration(
          { lat: Number(stop.lat), lng: Number(stop.lng) },
          { lat: Number(next.lat), lng: Number(next.lng) },
          stop.transitMode || 'DRIVE'
        );

        await new Promise(r => setTimeout(r, 100));

        if (!res && !stop.transitToNext) continue;
        if (
          res &&
          stop.transitToNext &&
          res.duration === stop.transitToNext.duration &&
          res.distance === stop.transitToNext.distance
        ) continue;

        stop.transitToNext = res;
        changed = true;
      }

      const staysMap = buildStayGroups(updated);
      const dayIdxMap = new Map(updated.days.map((item, index) => [item.id, index]));
      const dayIndex = dayIdxMap.get(day.id);
      const plainStops = day.stops.filter((stop) =>
        stop.type !== 'hotel_checkin' &&
        stop.type !== 'hotel_checkout' &&
        stop.type !== 'note' &&
        stop.type !== 'list' &&
        stop.lat &&
        stop.lng
      );
      const firstPlain = plainStops[0];
      const lastPlain = plainStops[plainStops.length - 1];

      for (const [, stay] of staysMap) {
        const { checkinStop, checkoutStop } = stay;
        if (!checkinStop || !checkoutStop) continue;

        const cinIdx = dayIdxMap.get(checkinStop._dayId);
        const coutIdx = dayIdxMap.get(checkoutStop._dayId);
        if (dayIndex === undefined || cinIdx === undefined || coutIdx === undefined) continue;
        if (dayIndex < cinIdx || dayIndex > coutIdx) continue;

        if (firstPlain && checkinStop._dayId !== day.id && checkinStop.lat && checkinStop.lng) {
          const res = await fetchRouteDuration(
            { lat: Number(checkinStop.lat), lng: Number(checkinStop.lng) },
            { lat: Number(firstPlain.lat), lng: Number(firstPlain.lng) },
            firstPlain.transitModeFromHotel || 'DRIVE'
          );
          await new Promise(r => setTimeout(r, 150));
          const target = findStopById(day, firstPlain.id);
          if (target && JSON.stringify(target.transitFromHotel) !== JSON.stringify(res)) {
            target.transitFromHotel = res;
            changed = true;
          }
        }

        if (lastPlain && checkoutStop._dayId !== day.id && checkoutStop.lat && checkoutStop.lng) {
          const res = await fetchRouteDuration(
            { lat: Number(lastPlain.lat), lng: Number(lastPlain.lng) },
            { lat: Number(checkoutStop.lat), lng: Number(checkoutStop.lng) },
            lastPlain.transitModeToHotel || 'DRIVE'
          );
          await new Promise(r => setTimeout(r, 150));
          const target = findStopById(day, lastPlain.id);
          if (target && JSON.stringify(target.transitToHotel) !== JSON.stringify(res)) {
            target.transitToHotel = res;
            changed = true;
          }
        }
      }

      if (changed) applyUpdate(updated);
    } finally {
      isComputing.current = false;
    }
  }, [trip, state.trips, tripId, applyUpdate]);

  const toggleTransitMode = useCallback(async (dayId, stopId, withTripUpdate) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      const cycle = { 'DRIVE': 'WALK', 'WALK': 'TRANSIT', 'TRANSIT': 'DRIVE' };
      stop.transitMode = cycle[stop.transitMode] || 'WALK';
      return updated;
    });

    if (updateResult?.updated) {
      await computeTransitData(dayId, updateResult.updated);
    }
  }, [computeTransitData]);

  const toggleHotelTransitMode = useCallback(async (dayId, stopId, direction, withTripUpdate) => {
    const updateResult = withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      const cycle = { 'DRIVE': 'WALK', 'WALK': 'TRANSIT', 'TRANSIT': 'DRIVE' };
      if (direction === 'from') {
        stop.transitModeFromHotel = cycle[stop.transitModeFromHotel] || 'WALK';
      } else {
        stop.transitModeToHotel = cycle[stop.transitModeToHotel] || 'WALK';
      }
      return updated;
    });

    if (updateResult?.updated) {
      await computeTransitData(dayId, updateResult.updated);
    }
  }, [computeTransitData]);

  return { computeTransitData, toggleTransitMode, toggleHotelTransitMode };
}
