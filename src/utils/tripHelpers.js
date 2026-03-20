// Ported from js/constants.js and js/ui/templates/dashboard.js

export const PLACE_CATEGORY_MAP = {
  'restaurant': { icon: '🍴', labelKey: 'map.place_restaurant' },
  'cafe': { icon: '☕', labelKey: 'map.place_cafe' },
  'bar': { icon: '🍸', labelKey: 'map.place_bar' },
  'bakery': { icon: '🥐', labelKey: 'map.place_bakery' },
  'meal_takeaway': { icon: '🥡', labelKey: 'map.place_meal_takeaway' },
  'airport': { icon: '✈️', labelKey: 'map.place_airport' },
  'train_station': { icon: '🚆', labelKey: 'map.place_train_station' },
  'transit_station': { icon: '🚉', labelKey: 'map.place_transit_station' },
  'bus_station': { icon: '🚌', labelKey: 'map.place_bus_station' },
  'subway_station': { icon: '🚇', labelKey: 'map.place_subway_station' },
  'lodging': { icon: '🏨', labelKey: 'map.place_lodging' },
  'hotel': { icon: '🏨', labelKey: 'map.place_lodging' },
  'motel': { icon: '🏨', labelKey: 'map.place_lodging' },
  'resort_hotel': { icon: '🏨', labelKey: 'map.place_lodging' },
  'bed_and_breakfast': { icon: '🏨', labelKey: 'map.place_lodging' },
  'guest_house': { icon: '🏨', labelKey: 'map.place_lodging' },
  'hostel': { icon: '🏨', labelKey: 'map.place_lodging' },
  'inn': { icon: '🏨', labelKey: 'map.place_lodging' },
  'apartment': { icon: '🏠', labelKey: 'map.place_lodging' },
  'vacation_rental': { icon: '🏠', labelKey: 'map.place_lodging' },
  'villa': { icon: '🏠', labelKey: 'map.place_lodging' },
  'campground': { icon: '⛺', labelKey: 'map.place_lodging' },
  'rv_park': { icon: '🚐', labelKey: 'map.place_lodging' },
  'museum': { icon: '🏛️', labelKey: 'map.place_museum' },
  'art_gallery': { icon: '🎨', labelKey: 'map.place_art_gallery' },
  'tourist_attraction': { icon: '🏛️', labelKey: 'map.place_tourist_attraction' },
  'aquarium': { icon: '🐠', labelKey: 'map.place_aquarium' },
  'zoo': { icon: '🦁', labelKey: 'map.place_zoo' },
  'amusement_park': { icon: '🎡', labelKey: 'map.place_amusement_park' },
  'park': { icon: '🌳', labelKey: 'map.place_park' },
  'shopping_mall': { icon: '🛍️', labelKey: 'map.place_shopping_mall' },
  'store': { icon: '🛍️', labelKey: 'map.place_store' },
  'supermarket': { icon: '🛒', labelKey: 'map.place_supermarket' },
  'gas_station': { icon: '⛽', labelKey: 'map.place_gas_station' },
  'bank': { icon: '🏦', labelKey: 'map.place_bank' },
  'hospital': { icon: '🏥', labelKey: 'map.place_hospital' },
  'pharmacy': { icon: '💊', labelKey: 'map.place_pharmacy' },
  'parking': { icon: '🅿️', labelKey: 'map.place_parking' },
};

export function getCategoryFromTypes(types, t) {
  if (!types || !types.length) return { icon: '📍', labelKey: 'map.place_default' };
  for (const type of types) {
    if (PLACE_CATEGORY_MAP[type]) return PLACE_CATEGORY_MAP[type];
  }
  return { icon: '📍', labelKey: 'map.place_default' };
}

// Ported from js/ui/templates/dashboard.js getStatus()
export function getTripStatus(trip) {
  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  if (now >= start && now <= end) return 'ongoing';
  if (now < start) return 'planned';
  return 'completed';
}
