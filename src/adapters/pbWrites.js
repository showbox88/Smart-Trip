import { pb } from '../lib/pb';
import { loadPbData, clearPbCache, normalizePbStop, pbDate } from './pbAdapter';

/**
 * pbWrites — Phase 3a 写支持：打卡 + 拍照 + 记账
 *
 * 写入面收敛为一个差量同步器 syncDayStopsToPb：
 * UI 各处（TodayPage 打卡、TimePicker 改时间、ExpenseModal 记账、StopCard 选照片）
 * 都把"整天的 stops 数组"交给 saveDayToDB / updateDayStops，这里 diff 出
 * 变化的字段并精准 PATCH 到 PocketBase（其余字段一概不碰）。
 *
 * 3a 支持：checkin（打卡/补打卡/改时间/取消）、photos（追加照片）、
 *          note（stop 备注）、price+expenseCategory（→ expenses 记账）。
 * 不支持（3b）：新建/删除 stop、改名、计划时间排序 —— 只警告不报错。
 */

export const PB_WRITES = import.meta.env.VITE_PB_WRITES !== 'off';

// ── 时间换算 ────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function to24h(time, period) {
  const [h, m] = (time || '0:00').split(':').map(Number);
  let hh = h;
  if (period === 'PM' && hh !== 12) hh += 12;
  if (period === 'AM' && hh === 12) hh = 0;
  return [hh, m || 0];
}

/** 某时区在某时刻的 UTC 偏移（毫秒） */
function tzOffsetMs(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
    +parts.hour % 24, +parts.minute, +parts.second);
  return asUTC - date.getTime();
}

/** 把 (日期, 12h 时间, 时区) 的墙上时间换成 UTC ISO；无时区用浏览器本地 */
export function wallTimeToUtcIso(dateStr, time, period, tz) {
  const [hh, mm] = to24h(time, period);
  if (!tz) {
    return new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00`).toISOString();
  }
  try {
    const guess = new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00Z`);
    return new Date(guess.getTime() - tzOffsetMs(guess, tz)).toISOString();
  } catch {
    return new Date(`${dateStr}T${pad(hh)}:${pad(mm)}:00`).toISOString();
  }
}

// ── 照片上传（VM /media 通道，原图不压缩） ──────────────

export async function uploadMedia(file, dir) {
  const name = encodeURIComponent(file.name || 'upload.jpg');
  const res = await fetch(`/media/upload?dir=${encodeURIComponent(dir)}&name=${name}`, {
    method: 'POST',
    body: file,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `upload failed (${res.status})`);
  }
  const { path } = await res.json();
  return path; // "/media/stops/<id>/<ts>_<name>"
}

// ── 记账：UI 类别 ↔ PB expense_category ─────────────────

const UI_TO_PB_CATEGORY = {
  flight: '交通', car_rental: '交通', transport: '交通', fuel: '交通',
  dining: '餐饮', drinks: '餐饮',
  groceries: '购物/日用', shopping: '购物/日用',
  stay: '住宿', sightseeing: '门票', activities: '娱乐', other: '其他',
};

export const PB_TO_UI_CATEGORY = {
  '交通': 'transport', '餐饮': 'dining', '购物/日用': 'shopping',
  '住宿': 'stay', '门票': 'sightseeing', '娱乐': 'activities',
  '旅行': 'other', '订阅服务': 'other', '代付': 'other', '其他': 'other',
};

/**
 * stop 维度的记账 upsert：该 stop 已有 UI 录入的（手动）expense 则更新，否则新建。
 * 金额默认 USD（与 V2 的 stop.price 语义一致），amount_usd 客户端计算（Phase 0 结论）。
 */
async function upsertStopExpense(rawStop, { amount, uiCategory, description }) {
  const existing = await pb.collection('expenses').getFullList({
    filter: `stop = "${rawStop.id}" && source = "手动"`,
  });
  const payload = {
    description: description || rawStop.name || '',
    amount,
    currency: 'USD',
    amount_usd: Math.round(amount * 100) / 100,
    expense_category: UI_TO_PB_CATEGORY[uiCategory] || '其他',
    type: '支出',
    source: '手动',
    date: rawStop.date || '',
    timezone: rawStop.timezone || '',
    stop: rawStop.id,
    day: rawStop.day || '',
    trip: rawStop.trip || '',
  };
  if (existing.length > 0) {
    await pb.collection('expenses').update(existing[0].id, payload);
  } else {
    await pb.collection('expenses').create(payload);
  }
}

// ── meta 提取：卡片差异化字段统一进 stops.meta(json) ────

// 这些键有独立 PB 落点或属于派生/瞬态数据，不进 meta
const META_OMIT = new Set([
  'id', 'type', 'location', 'address', 'city', 'phone', 'time', 'period',
  'note', 'price', 'expenseCategory', 'lat', 'lng', 'photo', 'photos',
  'checkedIn', 'checkinTime', 'category', 'sortOrder',
  'pbStopId', 'pbLocationId', 'pbCategories',
]);

export function pickStopMeta(stop) {
  const meta = {};
  for (const [k, v] of Object.entries(stop)) {
    if (META_OMIT.has(k)) continue;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === 'desc' && !v) continue;
    meta[k] = v;
  }
  return meta;
}

// ── Google 图片：服务端下载缓存（外链带 key 且会过期） ──

const GOOGLE_PHOTO_RE = /^https:\/\/[^/]*(googleapis|googleusercontent|ggpht|gstatic)\.com\//;

async function cachePhotoIfGoogle(photoUrl, dir) {
  if (!photoUrl || !GOOGLE_PHOTO_RE.test(photoUrl)) return photoUrl;
  try {
    const res = await fetch(`/media/cache?dir=${encodeURIComponent(dir)}&url=${encodeURIComponent(photoUrl)}`);
    if (!res.ok) throw new Error(`cache ${res.status}`);
    const { path } = await res.json();
    return path;
  } catch (e) {
    console.warn('[pbWrites] Google 图片缓存失败，保留外链:', e.message);
    return photoUrl;
  }
}

// ── 新建 stop（DayPage 附近打卡 / 行程内添加地点） ──────

// UI 本地 id（s<timestamp>）→ PB record id 的会话内映射，防止重复创建
const _localToPbId = new Map();
const _pendingCreates = new Set();

function deviceTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** 复用或新建 locations 记录（去重优先级：google_place_id > 名称），返回 record id */
async function findOrCreateLocation(next) {
  const name = (next.location || '').trim();
  if (!name) return '';
  try {
    if (next.placeId) {
      const byPlace = await pb.collection('locations').getFullList({
        filter: pb.filter('google_place_id = {:pid}', { pid: next.placeId }),
      });
      if (byPlace.length > 0) return byPlace[0].id;
    }
    const found = await pb.collection('locations').getFullList({
      filter: pb.filter('name = {:name}', { name }),
    });
    if (found.length > 0) {
      // 老记录补 google_place_id（便于以后精确去重）
      if (next.placeId && !found[0].google_place_id) {
        pb.collection('locations').update(found[0].id, { google_place_id: next.placeId }).catch(() => {});
      }
      return found[0].id;
    }
    const rec = await pb.collection('locations').create({
      name,
      address: next.address || '',
      city: next.city || '',
      phone: next.phone || '',
      lat: next.lat || 0,
      lng: next.lng || 0,
      type: '其他',
      timezone: deviceTz(),
      google_place_id: next.placeId || '',
    });
    return rec.id;
  } catch (e) {
    console.warn('[pbWrites] locations find/create failed:', e.message);
    return '';
  }
}

/** 在 PB 创建 stop（打卡创建的带 checkin + 打卡分类） */
async function createPbStop(dayRaw, date, next, dayTz = '') {
  // 打卡 = 人就在现场，用设备时区；规划添加 = 用当天既有时区上下文兜底设备时区
  const tz = next.checkedIn ? deviceTz() : (dayTz || deviceTz());
  const checkin = next.checkedIn
    ? (next.time ? wallTimeToUtcIso(date, next.time, next.period, tz) : new Date().toISOString())
    : '';
  // 规划添加的时间落 planned_at（计划时间），打卡时间落 checkin
  const plannedAt = !next.checkedIn && next.time
    ? wallTimeToUtcIso(date, next.time, next.period, tz)
    : '';
  const locationId = await findOrCreateLocation(next);
  const photo = await cachePhotoIfGoogle(next.photo, `stops/${next.id}`);

  return pb.collection('stops').create({
    name: next.location || 'Unnamed',
    date: `${date} 00:00:00.000Z`,
    day: dayRaw.id,
    trip: dayRaw.trip || '',
    location: locationId,
    stop_type: next.type || 'location',
    categories: next.checkedIn ? ['打卡'] : [],
    note: next.note || '',
    checkin,
    planned_at: plannedAt,
    actual_lat: next.lat || 0,
    actual_lng: next.lng || 0,
    timezone: tz,
    photos: photo ? [photo] : null,
    meta: pickStopMeta(next),
  });
}

/** PB 没有这一天时按需创建（懒创建，只在第一次真实写入时发生） */
async function createPbDay(date) {
  return pb.collection('days').create({
    name: date,
    date: `${date} 00:00:00.000Z`,
    timezone: '',
  });
}

/**
 * 删除 PB stops（UI 删除按钮显式调用——不能从差量"缺失"推断删除，
 * 因为 TodayPage 等场景传来的本来就是当天 stops 的子集）。
 * 关联的 expenses 故意保留（消费记录不应随 stop 静默消失）。
 */
export async function deletePbStops(uiIds) {
  if (!PB_WRITES) {
    console.warn('[pbWrites] VITE_PB_WRITES=off，跳过删除');
    return;
  }
  let deleted = 0;
  for (const uiId of uiIds) {
    const id = _localToPbId.get(uiId) || uiId;
    // 本会话新建但还没写入 PB 的本地 stop（s<timestamp>）没有 PB 记录可删
    if (/^s\d+$/.test(id)) continue;
    try {
      await pb.collection('stops').delete(id);
      deleted++;
      _localToPbId.delete(uiId);
    } catch (e) {
      if (e?.status !== 404) console.error('[pbWrites] 删除 stop 失败:', id, e.message);
    }
  }
  if (deleted > 0) clearPbCache();
  console.info(`[pbWrites] 已删除 ${deleted} 个 stop`);
}

// ── 差量同步器 ──────────────────────────────────────────

/**
 * 对比某天 UI 提交的 stops 与 PB 当前状态，把变化写回 PB。
 * @param {string} date  "YYYY-MM-DD"
 * @param {object[]} nextStops  UI 形状的 stop 数组
 * @param {object} opts  { partial }: true = 子集（如 TodayPage 只传 location 类），
 *                       不写顺序、不视缺失为移出
 */
export async function syncDayStopsToPb(date, nextStops, opts = {}) {
  if (!PB_WRITES) {
    console.warn('[pbWrites] VITE_PB_WRITES=off，跳过写入');
    return;
  }

  const { days, stops: rawStops, stopsByDayId } = await loadPbData();
  let day = days.find(d => pbDate(d.date) === date);
  if (!day) {
    // 懒创建：第一次对这一天真实写入时才在 PB 建 day
    day = await createPbDay(date);
    days.push(day);
    console.info('[pbWrites] 已创建 day:', date, '→', day.id);
  }

  const prevById = {};
  for (const s of stopsByDayId[day.id] || []) prevById[s.id] = normalizePbStop(s);
  const rawById = {};
  for (const s of rawStops) rawById[s.id] = s;

  let wrote = false;
  let position = 0;

  for (const next of nextStops) {
    position += 1;
    // 本地 id（s<ts>，本会话内创建过）→ 解析成 PB id
    const resolvedId = _localToPbId.get(next.id) || next.id;
    let prev = prevById[resolvedId];

    // 跨天拖拽：这条 stop 在 PB 里存在但挂在别的天 → 改挂靠，绝不能新建副本
    if (!prev && rawById[resolvedId]) {
      const movedRaw = rawById[resolvedId];
      await pb.collection('stops').update(resolvedId, {
        day: day.id,
        trip: day.trip || '',
        date: `${date} 00:00:00.000Z`,
      });
      wrote = true;
      console.info('[pbWrites] stop 移动到', date, ':', next.location);
      prev = normalizePbStop(movedRaw);
    }

    if (!prev) {
      // PB 没有这条 → 新建（DayPage 附近打卡 / 添加地点）
      if (_pendingCreates.has(next.id)) continue; // 防抖期间的重复保存
      _pendingCreates.add(next.id);
      try {
        const dayTz = day.timezone
          || (stopsByDayId[day.id] || []).map(s => s.timezone).find(Boolean)
          || '';
        const rec = await createPbStop(day, date, next, dayTz);
        _localToPbId.set(next.id, rec.id);
        if (!opts.partial) {
          await pb.collection('stops').update(rec.id, { sort_order: position });
        }
        wrote = true;
        console.info('[pbWrites] 已创建 stop:', next.location, '→', rec.id);
      } catch (e) {
        console.error('[pbWrites] 创建 stop 失败:', next.location, e.message);
      } finally {
        _pendingCreates.delete(next.id);
      }
      continue;
    }

    const raw = rawById[resolvedId];
    const patch = {};

    // 1) 打卡：checkedIn / checkinTime / time 变化 → stops.checkin
    const wasChecked = !!prev.checkedIn;
    const isChecked = !!next.checkedIn;
    const timeChanged = isChecked && next.time && next.time !== prev.time;
    if (isChecked && (!wasChecked || timeChanged)) {
      patch.checkin = next.time
        ? wallTimeToUtcIso(date, next.time, next.period, raw.timezone)
        : new Date().toISOString();
      // stop 没有时区时补上当前设备时区（SMARTNOTE 约定：有 timezone 列的行要带时区）
      if (!raw.timezone) {
        try {
          patch.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch { /* 老浏览器拿不到就算了 */ }
      }
    } else if (!isChecked && wasChecked) {
      patch.checkin = '';
    }

    // 2) 照片：photo 变化 → 追加进 stops.photos（最新在前，保留历史；Google 外链先缓存）
    if (next.photo && next.photo !== prev.photo) {
      const stored = await cachePhotoIfGoogle(next.photo, `stops/${resolvedId}`);
      const existing = Array.isArray(raw.photos) ? raw.photos : [];
      if (!existing.includes(stored)) {
        patch.photos = [stored, ...existing.filter(p => p !== stored)];
      }
    }

    // 2.5) 改名 / 计划时间 / 卡片类型 / meta（3b）
    if (next.location && next.location !== prev.location) {
      patch.name = next.location;
    }
    if (!isChecked && next.time && next.time !== prev.time) {
      patch.planned_at = wallTimeToUtcIso(date, next.time, next.period, raw.timezone);
    }
    if (next.type && next.type !== (raw.stop_type || 'location')) {
      patch.stop_type = next.type;
    }
    const nextMeta = pickStopMeta(next);
    const prevMeta = (raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)) ? raw.meta : {};
    if (JSON.stringify(nextMeta) !== JSON.stringify(prevMeta)) {
      patch.meta = nextMeta;
    }

    // 2.6) 手动顺序：全量同步时按数组位置持久化（partial 子集不写，防止 TodayPage 扰动）
    if (!opts.partial && (raw.sort_order || 0) !== position) {
      patch.sort_order = position;
    }

    // 3) 备注：只填空、不覆盖——ExpenseModal 保存时会连带把"描述"写进 stop.note，
    //    曾把 phone-bridge 写的备注盖掉（2026-06-10 实测）。描述已存在 expense 记录上，不丢。
    if (next.note !== undefined && next.note !== prev.note) {
      if (!prev.note) {
        patch.note = next.note;
      } else {
        console.warn('[pbWrites] stop 已有备注，跳过覆盖:', prev.note, '→', next.note);
      }
    }

    if (Object.keys(patch).length > 0) {
      await pb.collection('stops').update(resolvedId, patch);
      wrote = true;
    }

    // 4) 记账：price / 类别变化 → expenses upsert
    const nextPrice = parseFloat(next.price);
    const prevPrice = parseFloat(prev.price);
    const priceChanged = !isNaN(nextPrice) && nextPrice > 0 && nextPrice !== prevPrice;
    const catChanged = next.expenseCategory && next.expenseCategory !== prev.expenseCategory;
    if (priceChanged || (catChanged && !isNaN(nextPrice) && nextPrice > 0)) {
      await upsertStopExpense(raw, {
        amount: nextPrice,
        uiCategory: next.expenseCategory,
        description: next.note || next.location || '',
      });
      wrote = true;
    }
  }

  if (wrote) clearPbCache(); // 下次读取拿最新状态
}
