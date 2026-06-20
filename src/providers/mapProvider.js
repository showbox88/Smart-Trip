// 地图服务商偏好:按设备存 localStorage,不进 PB。
export const MAP_PROVIDER_KEY = 'st.mapProvider';
const VALID = ['google', 'amap'];

export function getMapProvider() {
  try {
    const v = localStorage.getItem(MAP_PROVIDER_KEY);
    return VALID.includes(v) ? v : 'google';
  } catch {
    return 'google';
  }
}

export function setMapProvider(provider) {
  const v = VALID.includes(provider) ? provider : 'google';
  try { localStorage.setItem(MAP_PROVIDER_KEY, v); } catch { /* ignore */ }
  return v;
}

export function isAmap() {
  return getMapProvider() === 'amap';
}
