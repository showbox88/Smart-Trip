/**
 * apiGuard.js — Google API 用量保护
 * 每次 API 调用前检查开关 + 限额，超限自动切断 + 写 system_alerts。
 *
 * Storage: PocketBase (system_settings / api_logs / system_alerts).
 * Migrated from Supabase 2026-06-11.
 */
import { pb } from '../lib/pb';

const SETTINGS_COLL = 'system_settings';
const LOGS_COLL     = 'api_logs';
const ALERTS_COLL   = 'system_alerts';

// PB filter expects datetime as "YYYY-MM-DD HH:MM:SS.sssZ"
const pbTime = (d) => d.toISOString().replace('T', ' ');

/** Record one API call (success or blocked). Best-effort; never throws. */
export async function logApiCall(apiType, userId, status = 'success') {
  try {
    await pb.collection(LOGS_COLL).create({
      api_type: apiType,
      user_id:  userId || '',
      status,
    });
  } catch (e) {
    console.warn('[apiGuard] logApiCall failed (non-fatal):', e?.message);
  }
}

/**
 * Check whether `apiType` may be called right now.
 * @returns {{ allowed: boolean, reason: string }}
 *
 * Reasons:
 *  - ''             → allowed
 *  - 'disabled'     → switch is off
 *  - 'daily_limit'  → hit per-type daily quota
 *  - '2min_limit'   → hit 2-minute burst quota
 *
 * Fail-open: if PB is unreachable for settings read, returns allowed.
 * (Same semantics as the Supabase predecessor — gate is a soft check;
 * GCP-side quota is the bedrock.)
 */
export async function checkApiAllowed(apiType, userId) {
  let map = {};
  try {
    const settings = await pb.collection(SETTINGS_COLL).getFullList({
      filter: `key="${apiType}_enabled" || key="daily_api_limit" || key="per_2min_api_limit"`,
    });
    settings.forEach((s) => { map[s.key] = s.value; });
  } catch (e) {
    console.warn('[apiGuard] settings read failed, fail-open:', e?.message);
    return { allowed: true, reason: '' };
  }

  if (map[`${apiType}_enabled`] === 'false') {
    return { allowed: false, reason: 'disabled' };
  }

  const dailyLimit   = Number(map.daily_api_limit ?? 200);
  const per2minLimit = Number(map.per_2min_api_limit ?? 20);

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const twoMinAgo  = new Date(Date.now() - 2 * 60 * 1000);

  let dailyCount = 0;
  let recentCount = 0;
  try {
    const [dailyRes, recentRes] = await Promise.all([
      pb.collection(LOGS_COLL).getList(1, 1, {
        filter: `api_type="${apiType}" && status="success" && created>="${pbTime(startOfDay)}"`,
      }),
      pb.collection(LOGS_COLL).getList(1, 1, {
        filter: `api_type="${apiType}" && status="success" && created>="${pbTime(twoMinAgo)}"`,
      }),
    ]);
    dailyCount  = dailyRes.totalItems;
    recentCount = recentRes.totalItems;
  } catch (e) {
    console.warn('[apiGuard] count read failed, fail-open:', e?.message);
    return { allowed: true, reason: '' };
  }

  if (dailyCount >= dailyLimit) {
    await flipSwitch(`${apiType}_enabled`, 'false');
    await createAlert({ kind: 'api_disabled', api_type: apiType, reason: 'daily_limit', count: dailyCount });
    await logApiCall(apiType, userId, 'blocked');
    return { allowed: false, reason: 'daily_limit' };
  }
  if (recentCount >= per2minLimit) {
    await flipSwitch(`${apiType}_enabled`, 'false');
    await createAlert({ kind: 'api_disabled', api_type: apiType, reason: '2min_limit', count: recentCount });
    await logApiCall(apiType, userId, 'blocked');
    return { allowed: false, reason: '2min_limit' };
  }
  return { allowed: true, reason: '' };
}

async function flipSwitch(key, value) {
  try {
    const rec = await pb.collection(SETTINGS_COLL).getFirstListItem(`key="${key}"`);
    await pb.collection(SETTINGS_COLL).update(rec.id, { value });
  } catch (e) {
    console.warn(`[apiGuard] flip ${key} failed:`, e?.message);
  }
}

async function createAlert(payload) {
  try {
    await pb.collection(ALERTS_COLL).create({ ...payload, acknowledged: false });
  } catch (e) {
    console.warn('[apiGuard] createAlert failed (non-fatal):', e?.message);
  }
}
