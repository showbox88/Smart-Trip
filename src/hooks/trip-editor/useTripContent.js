/**
 * Content item operations: notes, lists, transport, activities.
 */

import { useCallback } from 'react';
import { findDayById, findStopById } from '../../utils/tripEditorHelpers';

export function useTripContent(withTripUpdate, insertStop, updateStop) {

  const addNote = useCallback((dayId, afterStopId = null) => {
    return insertStop(dayId, { id: `n${Date.now()}`, type: 'note', content: '', checked: false }, afterStopId);
  }, [insertStop]);

  const addList = useCallback((dayId, afterStopId = null) => {
    return insertStop(dayId, { id: `l${Date.now()}`, type: 'list', title: '', items: [{ text: '', checked: false }] }, afterStopId);
  }, [insertStop]);

  const addTransport = useCallback((dayId, afterStopId = null, transportType = 'FLIGHT') => {
    return insertStop(dayId, { id: `tr${Date.now()}`, type: 'transport', transportType, carrier: '', tripNumber: '', departureTime: '', arrivalTime: '', note: '', attachments: [] }, afterStopId);
  }, [insertStop]);

  const addActivity = useCallback((dayId, afterStopId = null) => {
    return insertStop(dayId, {
      id: `a${Date.now()}`,
      type: 'activity',
      location: '', address: '', city: '',
      lat: null, lng: null,
      time: '', period: '',
      photo: '', rating: null,
      phone: '', note: '',
      price: '0',
      category: '活动',
      categoryIcon: '🎯',
      placeTypes: [],
      activityInfo: {
        activityCategory: 'tour',
        provider: '', contactPerson: '', contactPhone: '',
        meetingPoint: '', bookingRef: '', bookingUrl: '',
        duration: null, groupSize: null, difficulty: null, equipment: '',
      },
    }, afterStopId);
  }, [insertStop]);

  const updateNoteContent = useCallback((dayId, stopId, content) => {
    updateStop(dayId, stopId, { content });
  }, [updateStop]);

  const updateListTitle = useCallback((dayId, stopId, title) => {
    updateStop(dayId, stopId, { title });
  }, [updateStop]);

  const updateListItem = useCallback((dayId, stopId, index, text) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items[index].text = text;
      return updated;
    });
  }, [withTripUpdate]);

  const toggleListItem = useCallback((dayId, stopId, index) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items[index].checked = !stop.items[index].checked;
      return updated;
    });
  }, [withTripUpdate]);

  const addListItem = useCallback((dayId, stopId, afterIndex) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (!stop) return false;
      stop.items = stop.items || [];
      const insertIdx = afterIndex !== undefined ? afterIndex + 1 : stop.items.length;
      stop.items.splice(insertIdx, 0, { text: '', checked: false });
      return updated;
    });
  }, [withTripUpdate]);

  const deleteListItem = useCallback((dayId, stopId, index) => {
    withTripUpdate((updated) => {
      const day = findDayById(updated, dayId);
      const stop = findStopById(day, stopId);
      if (stop?.items?.[index] === undefined) return false;
      stop.items.splice(index, 1);
      return updated;
    });
  }, [withTripUpdate]);

  return {
    addNote, addList, addTransport, addActivity,
    updateNoteContent, updateListTitle, updateListItem,
    toggleListItem, addListItem, deleteListItem,
  };
}
