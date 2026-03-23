export function getTripStopsWithDayContext(trip) {
  if (!trip?.days) return [];

  return trip.days.flatMap((day, index) =>
    (day.stops || []).map((stop) => ({
      ...stop,
      _dayId: day.id,
      _dayDate: day.date || '',
      _dayIndex: index,
    }))
  );
}

export function getTripStayMap(trip) {
  const staysMap = new Map();
  const allStops = getTripStopsWithDayContext(trip);

  allStops.forEach((stop) => {
    if (!stop.stayId) return;

    if (!staysMap.has(stop.stayId)) {
      staysMap.set(stop.stayId, {
        id: stop.stayId,
        location: stop.location,
        checkinStop: null,
        checkoutStop: null,
      });
    }

    const stay = staysMap.get(stop.stayId);
    if (stop.type === 'hotel_checkin') {
      stay.checkinStop = stop;
      stay.location = stop.location;
    }
    if (stop.type === 'hotel_checkout') {
      stay.checkoutStop = stop;
    }
  });

  return staysMap;
}

export function isHotelStop(stop) {
  return stop?.type === 'hotel_checkin' || stop?.type === 'hotel_checkout';
}

export function getTripStays(trip) {
  return Array.from(getTripStayMap(trip).values())
    .filter((stay) => stay.checkinStop && stay.checkoutStop)
    .map((stay) => ({
      id: stay.id,
      location: stay.location,
      checkinDayId: stay.checkinStop._dayId,
      checkinTime: stay.checkinStop.time,
      checkinPeriod: stay.checkinStop.period,
      checkoutDayId: stay.checkoutStop._dayId,
      checkoutTime: stay.checkoutStop.time,
      checkoutPeriod: stay.checkoutStop.period,
      hotelStop: stay.checkinStop,
    }));
}

export function getHotelContextForDay(trip, dayId) {
  if (!trip?.days) return {};

  const stays = Array.from(getTripStayMap(trip).values()).filter(
    (stay) => stay.checkinStop && stay.checkoutStop
  );
  const dayIndexMap = new Map(trip.days.map((day, index) => [day.id, index]));
  const currentDayIndex = dayIndexMap.get(dayId);

  const stay = stays.find((item) => {
    const checkinIndex = dayIndexMap.get(item.checkinStop._dayId);
    const checkoutIndex = dayIndexMap.get(item.checkoutStop._dayId);
    return (
      currentDayIndex !== undefined &&
      checkinIndex !== undefined &&
      checkoutIndex !== undefined &&
      currentDayIndex >= checkinIndex &&
      currentDayIndex <= checkoutIndex
    );
  });

  if (!stay) return {};

  return {
    stay: {
      id: stay.id,
      location: stay.location,
      checkinDayId: stay.checkinStop._dayId,
      checkoutDayId: stay.checkoutStop._dayId,
    },
    isCinOnly: stay.checkinStop._dayId === dayId && stay.checkoutStop._dayId !== dayId,
    isCoutOnly: stay.checkoutStop._dayId === dayId && stay.checkinStop._dayId !== dayId,
    isBetween: stay.checkinStop._dayId !== dayId && stay.checkoutStop._dayId !== dayId,
    isSameDayStay: stay.checkinStop._dayId === dayId && stay.checkoutStop._dayId === dayId,
  };
}
