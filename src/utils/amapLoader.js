// 动态加载高德 JS API 2.0。成功后设 window.amapReady 并触发 _dispatchAmapReady。
export function loadAmap() {
  const key = import.meta.env.VITE_AMAP_KEY;
  const jscode = import.meta.env.VITE_AMAP_JSCODE;
  if (!key || key.includes('VITE_AMAP_KEY')) {
    console.error('VITE_AMAP_KEY 缺失或未替换,无法加载高德地图。');
    return;
  }
  if (window.AMap) { window.amapReady = true; return; }

  // 安全密钥必须在加载 SDK 之前设置
  window._AMapSecurityConfig = { securityJsCode: jscode || '' };

  const script = document.createElement('script');
  // 一次性带上本期要用的插件:PlaceSearch
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch`;
  script.async = true;
  script.onload = () => {
    window.amapReady = true;
    if (window._dispatchAmapReady) window._dispatchAmapReady();
  };
  script.onerror = () => console.error('高德地图 SDK 加载失败(国内网络/域名白名单/key 限制?)');
  document.head.appendChild(script);
}
