import { pb } from '../lib/pb';

/**
 * pbSettings — UI 偏好的 PB 持久化（app_settings collection: key 唯一 + value json）
 *
 * 跨设备记住：语言、主题、配色覆盖、地图黑夜模式等。
 * 启动时 loadPbSettings() 全量拉进内存，之后同步读 getPbSettingSync。
 * 写入 upsert + 更新内存缓存，丢失也无大碍（localStorage 仍是本地兜底）。
 */

let _cache = null; // { key: { id, value } }
let _loading = null;
const _subs = new Set(); // 加载完成后的回调（用于让组件重读偏好）

export async function loadPbSettings(force = false) {
  if (_cache && !force) return _cache;
  if (_loading && !force) return _loading;
  _loading = pb.collection('app_settings').getFullList()
    .then((rows) => {
      _cache = {};
      for (const r of rows) _cache[r.key] = { id: r.id, value: r.value };
      _subs.forEach((cb) => { try { cb(); } catch { /* ignore */ } });
      return _cache;
    })
    .catch((e) => {
      console.warn('[pbSettings] load failed:', e.message);
      return _cache || {};
    })
    .finally(() => { _loading = null; });
  return _loading;
}

/** 偏好加载完后回调（不管成败都会触发一次）；返回取消订阅函数 */
export function onPbSettingsReady(cb) {
  if (_cache) { cb(); return () => {}; }
  _subs.add(cb);
  return () => _subs.delete(cb);
}

export function isPbSettingsLoaded() {
  return _cache !== null;
}

/** 同步读（需 loadPbSettings 已完成；未加载时返回 fallback） */
export function getPbSettingSync(key, fallback = null) {
  const hit = _cache?.[key];
  return hit === undefined ? fallback : hit.value;
}

export async function savePbSetting(key, value) {
  try {
    const existing = _cache?.[key];
    if (existing?.id) {
      await pb.collection('app_settings').update(existing.id, { value });
      _cache[key] = { id: existing.id, value };
    } else {
      const rec = await pb.collection('app_settings').create({ key, value });
      if (!_cache) _cache = {};
      _cache[key] = { id: rec.id, value };
    }
  } catch (e) {
    // key 撞唯一索引（别的设备先建了）→ 重拉后重试一次
    if (e?.status === 400 && !_cache?.[key]?.id) {
      await loadPbSettings(true);
      if (_cache?.[key]?.id) return savePbSetting(key, value);
    }
    console.warn('[pbSettings] save failed:', key, e.message);
  }
}
