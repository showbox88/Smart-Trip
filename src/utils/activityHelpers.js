/**
 * Activity category definitions and helpers.
 */

export const ACTIVITY_CATEGORY_MAP = {
  tour:         { icon: 'tour',          label_en: 'Guided Tour',          label_zh: '导览团' },
  water_sport:  { icon: 'pool',          label_en: 'Water Sports',         label_zh: '水上运动' },
  hiking:       { icon: 'hiking',        label_en: 'Hiking & Trekking',    label_zh: '徒步登山' },
  adventure:    { icon: 'paragliding',   label_en: 'Adventure',            label_zh: '冒险运动' },
  cultural:     { icon: 'palette',       label_en: 'Cultural Experience',  label_zh: '文化体验' },
  wildlife:     { icon: 'forest',        label_en: 'Nature & Wildlife',    label_zh: '自然生态' },
  winter_sport: { icon: 'ac_unit',       label_en: 'Winter Sports',        label_zh: '冬季运动' },
  cycling:      { icon: 'two_wheeler',   label_en: 'Cycling & Motor',      label_zh: '骑行摩托' },
  wellness:     { icon: 'spa',           label_en: 'Wellness & Spa',       label_zh: '养生温泉' },
  entertainment:{ icon: 'attractions',   label_en: 'Entertainment',        label_zh: '娱乐' },
};

export const ACTIVITY_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_MAP);

/**
 * Get the Material Symbol icon name for an activity category.
 */
export function getActivityIcon(categoryKey) {
  return ACTIVITY_CATEGORY_MAP[categoryKey]?.icon || 'local_activity';
}

/**
 * Get the translated label for an activity category.
 * Falls back to the key or English label.
 */
export function getActivityLabel(categoryKey, t) {
  if (!categoryKey) return t?.('activity.category_tour') || 'Activity';
  const key = `activity.category_${categoryKey}`;
  const translated = t?.(key);
  // If i18n returned the key itself (not translated), fall back to built-in label
  if (translated && translated !== key) return translated;
  return ACTIVITY_CATEGORY_MAP[categoryKey]?.label_en || categoryKey;
}

/**
 * Format a duration in minutes to a human-readable string.
 * e.g., 150 → "2h 30m", 60 → "1h", 45 → "45m"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Create an empty activityInfo object for a new activity stop.
 */
export function createEmptyActivityInfo(categoryKey = 'tour') {
  return {
    activityCategory: categoryKey,
    provider: '',
    contactPerson: '',
    contactPhone: '',
    meetingPoint: '',
    bookingRef: '',
    bookingUrl: '',
    duration: null,
    groupSize: null,
    difficulty: null,
    equipment: '',
  };
}
