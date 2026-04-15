// Ported from js/utils.js — state dependency removed, settings passed as parameter

export function formatDistance(meters, settings, t) {
  if (meters === undefined || meters === null) return '';

  if (typeof meters === 'string' && isNaN(Number(meters))) {
    let val = parseFloat(meters.replace(/,/g, ''));
    if (isNaN(val)) return meters;
    if (meters.toLowerCase().includes('mi') || meters.includes('英里')) {
      meters = val / 0.000621371;
    } else {
      meters = val * 1000;
    }
  }

  meters = Number(meters);
  if (isNaN(meters)) return '';

  const translator = t || ((k) => k);
  const isKm = (settings?.unitDistance ?? 'km') === 'km';
  if (isKm) {
    const km = meters / 1000;
    return `${km.toFixed(1)} ${translator('itinerary.unit_km')}`;
  } else {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} ${translator('itinerary.unit_mi')}`;
  }
}

export function formatDuration(seconds, t) {
  if (seconds === undefined || seconds === null) return '';

  if (typeof seconds === 'string' && seconds.endsWith('s') && !isNaN(Number(seconds.slice(0, -1)))) {
    seconds = Number(seconds.slice(0, -1));
  }

  if (typeof seconds === 'string' && isNaN(Number(seconds))) {
    let h = 0, m = 0;
    const hMatch = seconds.match(/(\d+)\s*(小时|hr|h|:)/i);
    const mMatch = seconds.match(/(\d+)\s*(分钟|min|m)/i);
    if (hMatch) h = parseInt(hMatch[1]);
    if (mMatch) m = parseInt(mMatch[1]);
    if (!hMatch && !mMatch) return seconds;
    seconds = h * 3600 + m * 60;
  }

  seconds = Number(seconds);
  if (isNaN(seconds)) return '';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const translator = t || ((k) => k);
  const hrUnit = translator('itinerary.time_unit_hour');
  const minUnit = translator('itinerary.time_unit_minute');

  if (h > 0) return `${h} ${hrUnit} ${m} ${minUnit}`;
  return `${m} ${minUnit}`;
}

export function formatCurrency(amount, settings) {
  const currency = settings?.currency || 'USD';
  const amountVal = parseFloat(amount) || 0;
  const symbols = { USD: '$', CNY: '¥', EUR: '€', JPY: '¥', GBP: '£' };
  const symbol = symbols[currency] || '$';
  return `${symbol}${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTemp(c, settings) {
  if (isNaN(c)) return c;
  const isC = (settings?.unitTemp ?? 'c') === 'c';
  if (isC) return `${c}°C`;
  const f = (c * 9 / 5) + 32;
  return `${Math.round(f)}°F`;
}

export function formatPrecipitation(mm) {
  if (isNaN(mm)) return mm;
  return `${mm} mm`;
}

export function generateId(prefix = 'id') {
  return prefix + '-' + Date.now() + Math.random().toString(36).substr(2, 5);
}

export function formatDate(dateStr, dayIndex = 0, settings) {
  if (!dateStr) return '';
  let normalized = dateStr;
  if (dateStr.includes('年') || dateStr.includes('月') || dateStr.includes('日')) {
    normalized = dateStr.replace(/[年月日]/g, '/').replace(/\/+$/, '');
    if (normalized.split('/').length === 2) {
      normalized = new Date().getFullYear() + '/' + normalized;
    }
  }
  const d = new Date(normalized.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  if (dayIndex !== 0) d.setDate(d.getDate() + dayIndex);
  const lang = settings?.language || 'zh';
  const locale = lang === 'en' ? 'en-US' : 'zh-CN';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function calculateDays(start, end) {
  if (!start || !end) return 0;
  const d1 = new Date(start.replace(/-/g, '/'));
  const d2 = new Date(end.replace(/-/g, '/'));
  if (isNaN(d1) || isNaN(d2)) return 0;
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 判断一个 stop 是否应被计入 stop 总数
 * 地点类（location、hotel、activity）= 计数
 * 内容类（note、list、transport）= 不计数
 */
export function isCountableStop(stop) {
  const t = stop?.type;
  return !t || t === 'location' || t === 'hotel_checkin' || t === 'hotel_checkout' || t === 'activity';
}

/* ── Consolidated from SharedTripPage / TripHeader / TodayScheduleModal ── */

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(startStr, endStr) {
  try {
    const o = { month: 'short', day: 'numeric', year: 'numeric' };
    const a = new Date(startStr.replace(/-/g, '/')).toLocaleDateString('en-US', o);
    if (!endStr) return a;
    return `${a} – ${new Date(endStr.replace(/-/g, '/')).toLocaleDateString('en-US', o)}`;
  } catch { return ''; }
}

export function formatTodayLabel() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ── Consolidated from MobileItineraryView ── */

export function formatTime12h(stop) {
  if (!stop.time) return null;
  const [hS, mS] = stop.time.split(':');
  const h24 = parseInt(hS, 10), m = parseInt(mS, 10) || 0;
  if (isNaN(h24)) return null;
  const p = stop.period || (h24 >= 12 ? 'PM' : 'AM');
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

export function formatDurationCompact(sec) {
  const n = typeof sec === 'string' ? parseInt(sec, 10) : sec;
  if (!n || isNaN(n)) return null;
  const h = Math.floor(n / 3600);
  const m = Math.max(1, Math.round((n % 3600) / 60));
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export function priceTier(stop) {
  const v = stop.expense != null ? parseFloat(stop.expense) : parseFloat(stop.price || 0);
  if (isNaN(v) || v < 0) return null;
  if (v === 0) return 'Free';
  if (v <= 15) return '$';
  if (v <= 50) return '$$';
  if (v <= 150) return '$$$';
  return '$$$$';
}

export function stopDisplayName(s) {
  return s.location || s.title || s.address || '';
}

export function isVisibleStop(s) {
  return !s.type || s.type === 'location' || s.type === 'activity';
}

