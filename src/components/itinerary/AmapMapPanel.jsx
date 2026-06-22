import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import NearbyCheckinPanel from './NearbyCheckinPanel';
import AmapSearchBox from './AmapSearchBox';
import AmapPlaceCard from './AmapPlaceCard';
import { wgs84ToGcj02 } from '../../utils/coord';
import { amapPoiToPlace } from '../../utils/amapPoi';
import { isHotelStop } from '../../utils/stayHelpers';

// 高德底图 + stop 标记 + 我的位置 + 周边打卡。与 MapPanel 同 props/ref 接口子集。
// 本期不做富 tooltip / 路线绘制(留二三期)。
const AmapMapPanel = forwardRef(function AmapMapPanel(
  { onAddToDay, focusDayIds = [], isDayMode = false, dayId = null, existingPlaceIds = [] }, ref
) {
  const { state } = useApp();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const locationMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(!!window.amapReady);
  const [mapInited, setMapInited] = useState(false); // 地图实例已建(触发依赖它的 effect 重跑)
  const [userLocation, setUserLocation] = useState(null); // WGS-84 {lat,lng}
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null); // 搜索/点选选中的地点

  const activeTrip = useMemo(
    () => state.trips.find((tr) => tr.id === state.activeTripId),
    [state.trips, state.activeTripId]
  );

  // 等 SDK ready
  useEffect(() => {
    if (window.amapReady) { setMapReady(true); return; }
    window._dispatchAmapReady = () => setMapReady(true);
    const tick = () => { if (window.amapReady) setMapReady(true); else requestAnimationFrame(tick); };
    tick();
  }, []);

  // 建图:必须等容器“可见且有尺寸”再 new AMap.Map ——
  // 高德 2.0 是 WebGL 地图,在 0×0 / display:none 的容器里初始化会渲染失败,
  // 事后 resize() 也救不回(mobile plan 模式会 display:none 隐藏 .map-view)。
  // 策略:可见则立即建;不可见用 ResizeObserver 等它变可见再建;已建则尺寸变化时 resize() 重绘。
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const el = mapRef.current;
    const createIfVisible = () => {
      if (mapInstanceRef.current) return;
      if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
      mapInstanceRef.current = new window.AMap.Map(el, {
        zoom: 11,
        center: [116.397, 39.909], // [lng,lat];默认北京(高德只覆盖中国)
      });
      setMapInited(true);
    };
    createIfVisible();
    const ro = new ResizeObserver(() => {
      if (!mapInstanceRef.current) createIfVisible();
      else if (el.offsetWidth > 0 && el.offsetHeight > 0) mapInstanceRef.current.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  // 画 stop 标记 + fitView
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeTrip) return;
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    const daysToRender = activeTrip.days.filter((d) => (focusDayIds || []).includes(d.id));
    const markers = [];
    daysToRender.forEach((day) => {
      day.stops.forEach((stop) => {
        const isLoc = !stop.type || stop.type === 'location';
        if (!(isLoc || isHotelStop(stop)) || !stop.lat || !stop.lng) return;
        const g = wgs84ToGcj02(Number(stop.lat), Number(stop.lng));
        if (isNaN(g.lat) || isNaN(g.lng)) return;
        const marker = new window.AMap.Marker({
          position: [g.lng, g.lat],
          title: stop.location || '',
        });
        marker._stopId = stop.id;
        markers.push(marker);
      });
    });
    if (markers.length) {
      map.add(markers);
      map.setFitView(markers, false, [60, 60, 60, 60]);
    }
    markersRef.current = markers;
  }, [activeTrip, focusDayIds, mapReady, mapInited]);

  // isDayMode:自动定位 + 打卡面板
  useEffect(() => {
    if (!isDayMode || !mapReady || !mapInstanceRef.current) return;
    (async () => {
      try {
        const { getCurrentPosition, isGeolocationAvailable } = await import('../../utils/geolocation.js');
        if (!isGeolocationAvailable()) return;
        const { latitude: lat, longitude: lng } = await getCurrentPosition({
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
        setUserLocation({ lat, lng }); // 存 WGS-84
        const g = wgs84ToGcj02(lat, lng);
        const map = mapInstanceRef.current;
        if (!map) return;
        if (locationMarkerRef.current) map.remove(locationMarkerRef.current);
        locationMarkerRef.current = new window.AMap.Marker({
          position: [g.lng, g.lat], title: 'My Location',
        });
        map.add(locationMarkerRef.current);
        map.setZoomAndCenter(16, [g.lng, g.lat]);
        setShowCheckinPanel(true);
      } catch (e) {
        console.warn('[AmapMapPanel] autoLocate error:', e);
      }
    })();
  }, [isDayMode, mapReady, mapInited]);

  // 点地图 POI → searchNearBy 取最近 POI → 弹卡片(点空白不弹)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapInited || !map) return;
    const onMapClick = (e) => {
      const lng = e.lnglat?.getLng ? e.lnglat.getLng() : e.lnglat?.lng;
      const lat = e.lnglat?.getLat ? e.lnglat.getLat() : e.lnglat?.lat;
      if (lng == null || lat == null) return;
      const ps = new window.AMap.PlaceSearch({ pageSize: 1 });
      ps.searchNearBy('', [lng, lat], 50, (status, result) => {
        const poi = status === 'complete' && result.poiList?.pois?.[0];
        const place = poi && amapPoiToPlace(poi);
        if (place) setSelectedPlace(place);
      });
    };
    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [mapInited]);

  // ref 接口(本期最小:focusStop 平移到该 stop)
  const focusStop = useCallback((stopId) => {
    const map = mapInstanceRef.current;
    const marker = markersRef.current.find((m) => m._stopId === stopId);
    if (map && marker) map.setZoomAndCenter(16, marker.getPosition());
  }, []);
  useImperativeHandle(ref, () => ({ focusStop, focusAndOpen: focusStop }), [focusStop]);

  return (
    <section className="map-view">
      <div className="map-placeholder" id="mock-map-container" style={{ position: 'relative', overflow: 'hidden', background: '#eaebd8', width: '100%', height: '100%' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#666', opacity: 0.6 }}>
              <span style={{ fontSize: '3rem' }}>🗺️</span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('common.loading') || '加载高德地图…'}</p>
            </div>
          </div>
        )}
        {mapInited && (
          <AmapSearchBox
            leftOffset={isDayMode ? 56 : 15}
            onSelect={(place) => {
              const m = mapInstanceRef.current;
              if (m && place._gcj) m.setZoomAndCenter(16, [place._gcj.lng, place._gcj.lat]);
              setSelectedPlace(place);
            }}
          />
        )}

        {selectedPlace && (
          <AmapPlaceCard
            place={selectedPlace}
            canAdd={!!dayId}
            onAdd={async (place) => {
              if (dayId) await onAddToDay?.(dayId, place, false); // 规划加入,非实时打卡
              setSelectedPlace(null);
            }}
            onClose={() => setSelectedPlace(null)}
          />
        )}

        {isDayMode && showCheckinPanel && userLocation && mapInstanceRef.current && (
          <NearbyCheckinPanel
            mapInstance={mapInstanceRef.current}
            userLocation={userLocation}
            existingPlaceIds={existingPlaceIds}
            onAddPlace={async (poi) => { if (dayId) await onAddToDay?.(dayId, poi, true); }}
            onClose={() => setShowCheckinPanel(false)}
          />
        )}
      </div>
    </section>
  );
});

export default AmapMapPanel;
