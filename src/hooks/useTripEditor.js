/**
 * useTripEditor — facade hook that composes all trip-editing sub-hooks.
 * Returns the same API as the original monolithic version.
 */

import { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTrips } from './useTrips';
import { useTripsV2 } from './useTripsV2';
import { useI18n } from '../context/I18nContext';
import { cloneTrip } from '../utils/tripEditorHelpers';

import { useTripTransit } from './trip-editor/useTripTransit';
import { useTripCrud } from './trip-editor/useTripCrud';
import { useTripContent } from './trip-editor/useTripContent';
import { useTripPlaceAdd } from './trip-editor/useTripPlaceAdd';
import { useTripPlanB } from './trip-editor/useTripPlanB';
import { useTripStay } from './trip-editor/useTripStay';
import { useTripMetadata } from './trip-editor/useTripMetadata';

export function useTripEditor(tripId) {
  const { state, dispatch } = useApp();
  const { saveTrip } = useTrips();
  const { updateTrip: updateTripV2, linkDaysToTrip } = useTripsV2();
  const { t } = useI18n();
  const saveTimerRef = useRef(null);

  const trip = state.trips.find((tr) => tr.id === tripId) || null;

  // ── Core infrastructure ──

  const scheduleCloudSave = useCallback((updatedTrip) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTrip(updatedTrip).catch((err) => console.error('[useTripEditor] save failed:', err));
    }, 1500);
  }, [saveTrip]);

  const applyUpdate = useCallback((updatedTrip) => {
    dispatch({ type: 'UPDATE_TRIP', payload: updatedTrip });
    scheduleCloudSave(updatedTrip);
  }, [dispatch, scheduleCloudSave]);

  const withTripUpdate = useCallback((updater) => {
    if (!trip) return null;
    const updated = cloneTrip(trip);
    const result = updater(updated);
    if (result === false) return null;
    applyUpdate(updated);
    return { updated, result };
  }, [trip, applyUpdate]);

  // ── Compose sub-hooks ──

  const { computeTransitData, toggleTransitMode: _toggleTransitMode, toggleHotelTransitMode: _toggleHotelTransitMode } =
    useTripTransit(trip, state, tripId, applyUpdate);

  const {
    addDay, deleteDay, removeDay, setDayColor, updateDay,
    deleteStop, updateStop, updateStopAndSort, sortDayByTime,
    insertStop, moveStop, moveDay,
  } = useTripCrud(withTripUpdate, computeTransitData, state, dispatch, t);

  const {
    addNote, addList, addTransport, addActivity,
    updateNoteContent, updateListTitle, updateListItem,
    toggleListItem, addListItem, deleteListItem,
  } = useTripContent(withTripUpdate, insertStop, updateStop);

  const { addStopFromPlace } = useTripPlaceAdd(trip, state, tripId, applyUpdate, computeTransitData);

  const { addPlanBAlternative, removePlanBAlternative, swapPlanB } =
    useTripPlanB(trip, state, tripId, withTripUpdate, applyUpdate, computeTransitData);

  const { saveStayInfo } = useTripStay(withTripUpdate, computeTransitData);

  const { updateTripMetadata } = useTripMetadata(trip, withTripUpdate, updateTripV2, linkDaysToTrip);

  // ── Wrap transit toggles to inject withTripUpdate ──

  const toggleTransitMode = useCallback(async (dayId, stopId) => {
    await _toggleTransitMode(dayId, stopId, withTripUpdate);
  }, [_toggleTransitMode, withTripUpdate]);

  const toggleHotelTransitMode = useCallback(async (dayId, stopId, direction) => {
    await _toggleHotelTransitMode(dayId, stopId, direction, withTripUpdate);
  }, [_toggleHotelTransitMode, withTripUpdate]);

  // ── Return identical API ──

  return {
    trip,
    addDay,
    deleteDay,
    removeDay,
    setDayColor,
    updateDay,
    deleteStop,
    updateStop,
    updateStopAndSort,
    sortDayByTime,
    moveStop,
    moveDay,
    addNote,
    addList,
    addTransport,
    updateNoteContent,
    updateListTitle,
    updateListItem,
    toggleListItem,
    addListItem,
    deleteListItem,
    addStopFromPlace,
    addActivity,
    updateTripMetadata,
    toggleTransitMode,
    toggleHotelTransitMode,
    computeTransitData,
    saveStayInfo,
    addPlanBAlternative,
    removePlanBAlternative,
    swapPlanB,
  };
}
