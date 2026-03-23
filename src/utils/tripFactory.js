import { formatDate, generateId } from './formatters';
import { DEFAULT_DAY_COLORS } from './tripEditorHelpers';

const DEFAULT_TRIP_DAYS = 6;
const DEFAULT_TRIP_THUMB = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function toIsoDateString(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function getDashboardTripStatus(trip) {
  const today = new Date().toISOString().split('T')[0];
  if (trip.status) return trip.status;
  if (today >= trip.startDate && today <= trip.endDate) return 'ongoing';
  if (today < trip.startDate) return 'planned';
  return 'completed';
}

export function createDraftTrip(settings, t) {
  const today = new Date();
  const endDay = new Date(today);
  endDay.setDate(today.getDate() + DEFAULT_TRIP_DAYS - 1);

  const startDate = toIsoDateString(today);
  const endDate = toIsoDateString(endDay);

  const days = Array.from({ length: DEFAULT_TRIP_DAYS }, (_, index) => ({
    id: generateId(`day-${index}`),
    title: `${t('itinerary.day_label') || '第'}${index + 1}${t('itinerary.day_suffix') || '天'}`,
    date: formatDate(startDate, index, settings) || t('itinerary.unknown_date'),
    stops: [],
    color: DEFAULT_DAY_COLORS[index % DEFAULT_DAY_COLORS.length],
  }));

  return {
    id: generateId('t'),
    title: t('dashboard.new_trip_default_title') || '我的新旅行',
    startDate,
    endDate,
    thumb: DEFAULT_TRIP_THUMB,
    status: 'planned',
    days,
    activeDayId: days[0]?.id || null,
    settings: { ...settings },
  };
}
