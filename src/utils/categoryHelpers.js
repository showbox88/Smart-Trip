/**
 * Consolidated category icon mapping & hotel detection
 * Source: SharedTripPage, TodayScheduleModal, StopCard
 */

// Material Symbol icon mapping (for non-Lucide contexts)
const CATEGORY_ICON_MAP = [
  [['lodging', 'hotel', 'accommodation', '酒店', '住宿'], 'hotel'],
  [['restaurant', 'food', 'dining', '餐厅', '餐饮'], 'restaurant'],
  [['cafe', 'coffee', '咖啡'], 'local_cafe'],
  [['bakery', 'bread'], 'bakery_dining'],
  [['bar', 'night', 'drinks'], 'local_bar'],
  [['attraction', 'museum', 'landmark', 'sightseeing', '景点', '博物馆'], 'museum'],
  [['park', 'nature', '公园'], 'park'],
  [['shopping', 'store', 'mall', '购物'], 'shopping_bag'],
  [['transit', 'subway', 'train', 'bus', 'transport', '交通'], 'directions_transit'],
  [['airport', 'flight', '机场'], 'flight'],
  [['activity', 'sport', 'run', 'activities'], 'confirmation_number'],
  [['spa', 'health'], 'spa'],
];

export function getCategoryMaterialIcon(stop) {
  if (stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout') return 'hotel';
  const key = (stop.category || stop.categoryIcon || '').toLowerCase();
  if (!key) return 'place';
  for (const [keywords, icon] of CATEGORY_ICON_MAP) {
    if (keywords.some(k => key.includes(k))) return icon;
  }
  return 'place';
}

// Hotel detection
export const HOTEL_CATEGORIES = [
  'lodging', 'hotel', 'motel', 'hostel', 'inn', 'resort',
  'guest_house', 'bed_and_breakfast', 'serviced_apartment',
];

export function isHotelStop(stop) {
  if (stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout') return true;
  const cat = (stop.category || '').toLowerCase();
  return HOTEL_CATEGORIES.some(h => cat.includes(h));
}

export function getHotelBadge(type) {
  if (type === 'hotel_checkin') return { label: 'Check-in', color: 'var(--st-color-hotel-checkin)' };
  if (type === 'hotel_checkout') return { label: 'Check-out', color: 'var(--st-color-status-soon)' };
  return null;
}
