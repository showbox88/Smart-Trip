import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import NearbyCheckinPanel from './NearbyCheckinPanel';
import { wgs84ToGcj02 } from '../../utils/coord';
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
  const [userLocation, setUserLocation] = useState(null); // WGS-84 {lat,lng}
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);

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

  // 建图
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.AMap.Map(mapRef.current, {
      zoom: 12,
      center: [139.6917, 35.6895], // 高德是 [lng,lat]
    });
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
  }, [activeTrip, focusDayIds, mapReady]);

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
  }, [isDayMode, mapReady]);

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
