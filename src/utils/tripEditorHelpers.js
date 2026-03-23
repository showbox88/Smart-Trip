export const DEFAULT_DAY_COLORS = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export function cloneTrip(trip) {
  return trip ? JSON.parse(JSON.stringify(trip)) : null;
}

export function findDayById(trip, dayId) {
  return trip?.days?.find((day) => day.id === dayId) || null;
}

export function findStopById(day, stopId) {
  return day?.stops?.find((stop) => stop.id === stopId) || null;
}

export function findStopAcrossTrip(trip, stopId) {
  if (!trip?.days) return { day: null, stop: null };

  for (const day of trip.days) {
    const stop = findStopById(day, stopId);
    if (stop) return { day, stop };
  }

  return { day: null, stop: null };
}

export function formatTripDate(startDate, dayIndex) {
  if (!startDate) return '';
  const date = new Date(startDate.replace(/-/g, '/'));
  date.setDate(date.getDate() + dayIndex);
  if (isNaN(date)) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function syncTripEndDate(trip) {
  if (!trip?.startDate || !trip?.days?.length) return;
  const end = new Date(trip.startDate.replace(/-/g, '/'));
  end.setDate(end.getDate() + trip.days.length - 1);
  if (isNaN(end)) return;
  trip.endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

export function timeToMinutes(time, period) {
  if (!time) return Infinity;
  let [hh, mm] = time.split(':').map(Number);
  if (period === 'PM' && hh !== 12) hh += 12;
  if (period === 'AM' && hh === 12) hh = 0;
  return hh * 60 + (mm || 0);
}

export function sortStopsByTime(stops) {
  stops.sort((a, b) => timeToMinutes(a.time, a.period) - timeToMinutes(b.time, b.period));
}

export function insertStopIntoDay(day, newStop, afterStopId = null) {
  if (!day) return;
  if (afterStopId === '__prepend__') {
    day.stops.unshift(newStop);
    return;
  }
  if (afterStopId) {
    const idx = day.stops.findIndex((stop) => stop.id === afterStopId);
    day.stops.splice(idx >= 0 ? idx + 1 : day.stops.length, 0, newStop);
    return;
  }
  day.stops.push(newStop);
}

export function buildStayGroups(trip) {
  const allStops = trip?.days?.flatMap((day) =>
    day.stops.map((stop) => ({ ...stop, _dayId: day.id }))
  ) || [];
  const staysMap = new Map();

  allStops.forEach((stop) => {
    if (!stop.stayId) return;
    if (!staysMap.has(stop.stayId)) {
      staysMap.set(stop.stayId, { checkinStop: null, checkoutStop: null });
    }
    const stay = staysMap.get(stop.stayId);
    if (stop.type === 'hotel_checkin') stay.checkinStop = stop;
    if (stop.type === 'hotel_checkout') stay.checkoutStop = stop;
  });

  return staysMap;
}
