import { useMemo, useState, useCallback } from 'react';
import { getTripStopsWithDayContext, getTripStayMap } from '../utils/stayHelpers';

const DEFAULT_CHECKIN = { date: '', time: '14:00', period: 'PM' };
const DEFAULT_CHECKOUT = { date: '', time: '12:00', period: 'PM' };

function formatDayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitialStayState(allStops, stayMap, stopId) {
  const currentStop = allStops.find((stop) => stop.id === stopId);
  const stayId = currentStop?.stayId;

  let checkin = { ...DEFAULT_CHECKIN };
  let checkout = { ...DEFAULT_CHECKOUT };

  if (stayId) {
    const existingCheckin = stayMap.get(stayId)?.checkinStop;
    const existingCheckout = stayMap.get(stayId)?.checkoutStop;

    if (existingCheckin) {
      checkin = {
        date: existingCheckin._dayDate || '',
        time: existingCheckin.time || DEFAULT_CHECKIN.time,
        period: existingCheckin.period || DEFAULT_CHECKIN.period,
      };
    }

    if (existingCheckout) {
      checkout = {
        date: existingCheckout._dayDate || '',
        time: existingCheckout.time || DEFAULT_CHECKOUT.time,
        period: existingCheckout.period || DEFAULT_CHECKOUT.period,
      };
    }
  }

  if (!checkin.date && currentStop) {
    checkin.date = currentStop._dayDate || '';
  }

  return { currentStop, checkin, checkout };
}

export function useStayInfoForm(trip, stopId) {
  const allStops = useMemo(() => getTripStopsWithDayContext(trip), [trip]);
  const stayMap = useMemo(() => getTripStayMap(trip), [trip]);
  const dayOptions = useMemo(
    () => trip.days.map((day) => ({ id: day.id, value: day.date || day.id, label: formatDayLabel(day.date) || day.date || day.id })),
    [trip.days]
  );

  const initialState = useMemo(
    () => getInitialStayState(allStops, stayMap, stopId),
    [allStops, stayMap, stopId]
  );

  const [cinDate, setCinDate] = useState(initialState.checkin.date);
  const [cinTime, setCinTime] = useState(initialState.checkin.time);
  const [cinPeriod, setCinPeriod] = useState(initialState.checkin.period);
  const [coutDate, setCoutDate] = useState(initialState.checkout.date);
  const [coutTime, setCoutTime] = useState(initialState.checkout.time);
  const [coutPeriod, setCoutPeriod] = useState(initialState.checkout.period);

  const getPayload = useCallback(() => ({
    cinDate,
    cinTime,
    cinPeriod,
    coutDate,
    coutTime,
    coutPeriod,
  }), [cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod]);

  return {
    dayOptions,
    cinDate,
    cinTime,
    cinPeriod,
    coutDate,
    coutTime,
    coutPeriod,
    setCinDate,
    setCinTime,
    setCinPeriod,
    setCoutDate,
    setCoutTime,
    setCoutPeriod,
    getPayload,
  };
}
