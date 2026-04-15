/**
 * Trip metadata updates: title, dates, settings, destinations.
 */

import { useCallback } from 'react';
import { formatTripDate } from '../../utils/tripEditorHelpers';

export function useTripMetadata(trip, withTripUpdate, updateTripV2, linkDaysToTrip) {

  const updateTripMetadata = useCallback((patch) => {
    withTripUpdate((updated) => {
      const oldStartDate = updated.startDate;
      const { _destinations, _dayIdsToLink, ...rest } = patch;
      Object.assign(updated, rest);
      if (_destinations) {
        if (!updated.settings) updated.settings = {};
        updated.settings.destinations = _destinations;
      }
      if (patch.startDate && patch.startDate !== oldStartDate && updated.days) {
        updated.days.forEach((day, index) => {
          day.date = formatTripDate(patch.startDate, index);
        });
      }
      return updated;
    });

    const realTripId = trip?._realTripId;
    if (realTripId) {
      const { _destinations, _dayIdsToLink, ...rest } = patch;
      const dbPatch = {};
      if (rest.title !== undefined) dbPatch.title = rest.title;
      if (rest.startDate !== undefined) dbPatch.startDate = rest.startDate;
      if (rest.endDate !== undefined) dbPatch.endDate = rest.endDate;
      if (rest.thumb !== undefined) dbPatch.thumb = rest.thumb;
      if (rest.status !== undefined) dbPatch.status = rest.status;
      const mergedSettings = { ...(trip?.settings || {}) };
      if (_destinations) mergedSettings.destinations = _destinations;
      if (rest.status) mergedSettings.status = rest.status;
      dbPatch.settings = mergedSettings;
      updateTripV2(realTripId, dbPatch).catch(err =>
        console.error('[useTripEditor] updateTripV2 metadata failed:', err)
      );
      if (_dayIdsToLink?.length) {
        linkDaysToTrip(realTripId, _dayIdsToLink).catch(err =>
          console.error('[useTripEditor] linkDaysToTrip failed:', err)
        );
      }
    }
  }, [withTripUpdate, trip, updateTripV2, linkDaysToTrip]);

  return { updateTripMetadata };
}
