import { pb } from '../lib/pb';
import { DEFAULT_TRIP_THUMB } from '../utils/tripFactory';
import { isCountableStop } from '../utils/formatters';

/**
 * pbAdapter — 把 PocketBase 的 trips / days / stops / locations
 * 映射成前端 V2 模型期望的形状（trip 卡片 + day { stops: [] }）。
 *
 * 数据量小（百行级），一次全量拉取并缓存，刷新时强制重拉。
 * 此适配层为只读：不向 PocketBase 写任何数据。
 */

let _cache = null;

export async function loadPbData(force = false) {
  if (_cache && !force) return _cache;
  const [trips, days, stops, expenses] = await Promise.all([
    pb.collection('trips').getFullList({ sort: '-created' }),
    pb.collection('days').getFullList({ sort: 'date' }),
    pb.collection('stops').getFullList({ expand: 'location', sort: 'date' }),
    pb.collection('expenses').getFullList({ sort: 'date' }),
  ]);

  // stops 按 day id 分组
  const stopsByDayId = {};
  for (const s of stops) {
    if (!s.day) continue;
    (stopsByDayId[s.day] ||= []).push(s);
  }

  // expenses 按 stop id 分组（stop 卡片显示费用合计）
  const expensesByStopId = {};
  for (const e of expenses) {
    if (!e.stop) continue;
    (expensesByStopId[e.stop] ||= []).push(e);
  }

  _cache = { trips, days, stops, expenses, stopsByDayId, expensesByStopId };
  return _cache;
}

export function clearPbCache() {
  _cache = null;
}

// ── 单条记录映射 ────────────────────────────────────────

/** PB 日期 "2026-10-25 00:00:00.000Z" → "2026-10-25" */
export function pbDate(s) {
  return s ? String(s).slice(0, 10) : null;
}

/**
 * PB 时间戳（UTC）→ { time: "h:mm", period: "AM"|"PM" }（stop 所在时区的当地时间）
 * timezone 为空时回退到浏览器本地时区（与写入侧 wallTimeToUtcIso 对称），
 * 不能回退 UTC——否则 phone-bridge 没写时区的打卡会显示错 N 小时。
 */
function pbTimeParts(isoStr, timezone) {
  if (!isoStr) return { time: '', period: 'AM' };
  const d = new Date(isoStr.replace(' ', 'T'));
  if (isNaN(d)) return { time: '', period: 'AM' };

  let h, m;
  if (!timezone) {
    h = d.getHours();
    m = String(d.getMinutes()).padStart(2, '0');
  } else {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      h = parseInt(parts.find(p => p.type === 'hour')?.value, 10);
      m = parts.find(p => p.type === 'minute')?.value || '00';
      if (h === 24) h = 0;
    } catch {
      h = d.getHours();
      m = String(d.getMinutes()).padStart(2, '0');
    }
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { time: `${h12}:${m}`, period };
}

// PB expense_category → ExpenseModal 的 UI 类别（显示用）
const PB_CATEGORY_TO_UI = {
  '交通': 'transport', '餐饮': 'dining', '购物/日用': 'shopping',
  '住宿': 'stay', '门票': 'sightseeing', '娱乐': 'activities',
  '旅行': 'other', '订阅服务': 'other', '代付': 'other', '其他': 'other',
};

/** PB stop（含 expand.location）→ 前端 stop 对象 */
export function normalizePbStop(s) {
  const loc = s.expand?.location || null;
  // 显示时间优先级：实际打卡 > 计划时间 > 预约时间
  const { time, period } = pbTimeParts(s.checkin || s.planned_at || s.reserved, s.timezone);
  // meta = 卡片差异化字段（stayId/交通/清单等），先铺开，已映射字段在后面覆盖
  const meta = (s.meta && typeof s.meta === 'object' && !Array.isArray(s.meta)) ? s.meta : {};
  // lat/lng == 0 视为未知坐标
  const lat = s.actual_lat || loc?.lat || null;
  const lng = s.actual_lng || loc?.lng || null;
  const categories = Array.isArray(s.categories) ? s.categories : [];
  // stop 自己的照片优先，location 主数据的照片（Notion/外链）作兜底
  const locPhotos = Array.isArray(loc?.photos) ? loc.photos : [];
  const photos = [...(Array.isArray(s.photos) ? s.photos : []), ...locPhotos];

  // 该 stop 关联的费用（USD 合计，对应 V2 的 stop.price 语义）
  const expenses = _cache?.expensesByStopId?.[s.id] || [];
  const totalUsd = expenses.reduce((sum, e) => sum + (parseFloat(e.amount_usd) || 0), 0);

  return {
    ...meta,
    id: s.id,
    type: s.stop_type || 'location',
    location: s.name || loc?.name || '',
    desc: meta.desc || '',
    // 中文分类直接喂给 getCategoryMaterialIcon（映射表含中文关键词）
    category: meta.category || categories.join(' '),
    address: loc?.address || '',
    city: loc?.city || '',
    phone: loc?.phone || '',
    time,
    period,
    note: s.note || '',
    price: totalUsd > 0 ? String(Math.round(totalUsd * 100) / 100) : '0',
    expenseCategory: expenses.length ? (PB_CATEGORY_TO_UI[expenses[0].expense_category] || 'other') : undefined,
    lat,
    lng,
    photo: photos[0] || null,
    photos,
    rating: null,
    placeTypes: [],
    openingHours: [],
    checkedIn: !!s.checkin,
    checkinTime: s.checkin ? time : undefined,
    sortOrder: s.sort_order || 0,
    // 保留 PB 原始引用，便于调试 / 后续写支持
    pbStopId: s.id,
    pbLocationId: s.location || null,
    pbCategories: categories,
  };
}

/** PB day → 前端 day 对象（normalizeDayRow 同形状） */
export function normalizePbDay(d, stopsByDayId) {
  const date = pbDate(d.date);
  const pbStops = stopsByDayId[d.id] || [];
  const stops = pbStops.map(normalizePbStop);
  const hasManualOrder = stops.some(s => s.sortOrder > 0);
  if (hasManualOrder) {
    // 手动排过序：sort_order 优先（没排过的排后面按时间）
    stops.sort((a, b) =>
      (a.sortOrder || 9999) - (b.sortOrder || 9999) || to24h(a) - to24h(b)
    );
  } else {
    // 有时间的在前按时间排，无时间的保持原顺序在后
    stops.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return to24h(a) - to24h(b);
    });
  }

  return {
    id: d.id,
    user_id: 'pb',
    date,
    title: d.name && d.name !== date ? d.name : null,
    color: d.color || '#5b7a99',
    stops,
    created_at: d.created,
  };
}

function to24h(stop) {
  const [h, m] = (stop.time || '0:00').split(':').map(Number);
  let hh = h;
  if (stop.period === 'PM' && hh !== 12) hh += 12;
  if (stop.period === 'AM' && hh === 12) hh = 0;
  return hh * 60 + (m || 0);
}

/** PB trip → 前端 trip 卡片对象（normalizeTripRow 同形状） */
export function normalizePbTrip(t, days, stopsByDayId) {
  const tripDays = days.filter(d => d.trip === t.id);

  let stopsCount = 0;
  let totalCost = 0;
  const citySet = new Set();
  const cityCoordMap = {};
  // trip 自身的 photos json（Notion 同步来的外链）排在相册最前
  const stopPhotos = (Array.isArray(t.photos) ? t.photos : []).filter(Boolean);
  for (const d of tripDays) {
    for (const s of (stopsByDayId[d.id] || []).map(normalizePbStop)) {
      if (isCountableStop(s)) stopsCount++;
      const price = parseFloat(s.price);
      if (!isNaN(price) && price > 0) totalCost += price;
      for (const p of s.photos || []) {
        if (p && !stopPhotos.includes(p)) stopPhotos.push(p);
      }
      if (s.city && isCountableStop(s)) {
        citySet.add(s.city);
        if (s.lat && s.lng && !cityCoordMap[s.city]) {
          cityCoordMap[s.city] = { name: s.city, lat: s.lat, lng: s.lng };
        }
      }
    }
  }

  return {
    id: t.id,
    title: t.title || '',
    thumb: stopPhotos[0] || DEFAULT_TRIP_THUMB,
    startDate: pbDate(t.date_start),
    endDate: pbDate(t.date_end),
    settings: t.status ? { status: PB_STATUS_TO_UI[t.status] || t.status } : {},
    status: t.status ? (PB_STATUS_TO_UI[t.status] || t.status) : null,
    pbStatus: t.status || null,
    share_token: null,
    created_at: t.created,
    stopsCount,
    totalCost,
    cities: [...citySet],
    citiesWithCoords: Object.values(cityCoordMap),
    stopPhotos,
  };
}

// PB 行程状态（5 态）→ UI 三态
export const PB_STATUS_TO_UI = {
  Planning: 'planned', Booked: 'planned',
  Ongoing: 'ongoing',
  Done: 'completed', Cancelled: 'completed',
};

// ── 查询接口（hooks 调用） ──────────────────────────────

export async function getPbTrips(force = false) {
  const { trips, days, stopsByDayId } = await loadPbData(force);
  return trips.map(t => normalizePbTrip(t, days, stopsByDayId));
}

export async function getPbTrip(tripId) {
  const { trips, days, stopsByDayId } = await loadPbData();
  const t = trips.find(x => x.id === tripId);
  return t ? normalizePbTrip(t, days, stopsByDayId) : null;
}

export async function getPbDaysForTrip(tripId) {
  const { days, stopsByDayId } = await loadPbData();
  return days
    .filter(d => d.trip === tripId)
    .map(d => normalizePbDay(d, stopsByDayId));
}

export async function getPbDaysInRange(startDate, endDate) {
  const { days, stopsByDayId } = await loadPbData();
  return days
    .filter(d => {
      const date = pbDate(d.date);
      return date && date >= startDate && date <= endDate;
    })
    .map(d => normalizePbDay(d, stopsByDayId));
}

export async function getPbDayByDate(date, force = false) {
  const { days, stopsByDayId } = await loadPbData(force);
  const d = days.find(x => pbDate(x.date) === date);
  return d ? normalizePbDay(d, stopsByDayId) : null;
}
