/**
 * routeCache.js — 路线数据库缓存
 * 存储 A→B 路线的 polyline 数据，避免重复调用 Google Directions/Routes API
 */
import { supabase } from '../lib/supabase';

// 坐标精度：保留4位小数（约11米精度，足够路线匹配）
const round = (n) => Math.round(Number(n) * 10000) / 10000;

function coordKey(fromLat, fromLng, toLat, toLng, mode) {
  return `${round(fromLat)},${round(fromLng)}|${round(toLat)},${round(toLng)}|${mode}`;
}

// 内存一级缓存
const memCache = new Map();

/** 查询路线缓存 */
export async function getRouteCache(fromLat, fromLng, toLat, toLng, mode) {
  const key = coordKey(fromLat, fromLng, toLat, toLng, mode);
  if (memCache.has(key)) return memCache.get(key);

  const { data } = await supabase
    .from('route_cache')
    .select('duration_seconds, distance_meters, polyline_data')
    .eq('from_lat', round(fromLat))
    .eq('from_lng', round(fromLng))
    .eq('to_lat', round(toLat))
    .eq('to_lng', round(toLng))
    .eq('mode', mode)
    .maybeSingle();

  if (data) memCache.set(key, data);
  return data || null;
}

/** 写入路线缓存 */
export async function saveRouteCache(fromLat, fromLng, toLat, toLng, mode, { durationSeconds, distanceMeters, polylineData }) {
  const key = coordKey(fromLat, fromLng, toLat, toLng, mode);
  const row = {
    from_lat: round(fromLat),
    from_lng: round(fromLng),
    to_lat: round(toLat),
    to_lng: round(toLng),
    mode,
    duration_seconds: durationSeconds ?? null,
    distance_meters: distanceMeters ?? null,
    polyline_data: polylineData ?? null,
    fetched_at: new Date().toISOString(),
  };
  memCache.set(key, { duration_seconds: row.duration_seconds, distance_meters: row.distance_meters, polyline_data: row.polyline_data });

  const { error } = await supabase
    .from('route_cache')
    .upsert(row, { onConflict: 'from_lat,from_lng,to_lat,to_lng,mode' });
  if (error) console.warn('[routeCache] save failed:', error.message);
}
