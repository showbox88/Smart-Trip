/**
 * Map route drawing utilities — pure functions for polyline creation.
 * Extracted from MapPanel.jsx to reduce file size and improve testability.
 */

import { getRouteCache, saveRouteCache } from './routeCache';
import { checkApiAllowed, logApiCall } from './apiGuard';

export const TRAVEL_MODE_MAP = { 'DRIVE': 'DRIVING', 'WALK': 'WALKING', 'TRANSIT': 'TRANSIT' };

export const TRANSPORT_MODES = new Set(['FLIGHT', 'TRAIN', 'BUS', 'SHIP']);

export const TRANSPORT_STYLES = {
  FLIGHT: { color: '#4FC3F7', geodesic: true, opacity: 0, weight: 3, dash: true },
  TRAIN:  { color: '#9E9E9E', geodesic: false, opacity: 0.85, weight: 4, rail: true },
  BUS:    { color: '#FF8F00', geodesic: false, opacity: 0.85, weight: 4 },
  SHIP:   { color: '#1E88E5', geodesic: false, opacity: 0.9, weight: 5 },
};

export function drawTransportLine(from, to, transportType, mapInstance) {
  const style = TRANSPORT_STYLES[transportType] || TRANSPORT_STYLES.FLIGHT;
  const polylines = [];

  if (transportType === 'FLIGHT') {
    const poly = new google.maps.Polyline({
      path: [from, to],
      geodesic: true,
      strokeColor: style.color,
      strokeOpacity: 0,
      strokeWeight: style.weight,
      map: mapInstance,
      icons: [
        { icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, scale: 3, strokeColor: style.color }, offset: '0', repeat: '14px' },
      ],
    });
    polylines.push(poly);
  } else if (transportType === 'TRAIN') {
    const poly = new google.maps.Polyline({
      path: [from, to],
      geodesic: false,
      strokeColor: style.color,
      strokeOpacity: style.opacity,
      strokeWeight: style.weight,
      map: mapInstance,
      icons: [
        { icon: { path: 'M -2,0 2,0', strokeOpacity: 0.9, scale: 2, strokeColor: '#757575', strokeWeight: 3 }, offset: '0', repeat: '16px' },
      ],
    });
    polylines.push(poly);
  } else if (transportType === 'SHIP') {
    const poly = new google.maps.Polyline({
      path: [from, to],
      geodesic: false,
      strokeColor: style.color,
      strokeOpacity: style.opacity,
      strokeWeight: style.weight,
      map: mapInstance,
      icons: [
        { icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 2, strokeColor: style.color }, offset: '0', repeat: '20px' },
      ],
    });
    polylines.push(poly);
  } else {
    // BUS — simple solid line
    const poly = new google.maps.Polyline({
      path: [from, to],
      geodesic: false,
      strokeColor: style.color,
      strokeOpacity: style.opacity,
      strokeWeight: style.weight,
      map: mapInstance,
    });
    polylines.push(poly);
  }

  return polylines;
}

export async function decodeAndDrawSteps(steps, fallbackColor, mapInstance, normalized = false) {
  const { encoding } = await google.maps.importLibrary('geometry');
  const polylines = [];
  for (const step of steps) {
    const encoded = normalized ? step.encodedPolyline : step.polyline?.encodedPolyline;
    if (!encoded) continue;
    const path = encoding.decodePath(encoded);
    if (!path?.length) continue;
    const isWalk = step.travelMode === 'WALK' || step.travelMode === 'WALKING';
    const lineColor = normalized ? step.lineColor : step.transitDetails?.line?.color;
    const strokeColor = (!isWalk && lineColor) ? lineColor : (isWalk ? '#888888' : fallbackColor);
    const poly = new google.maps.Polyline({
      path,
      strokeColor,
      strokeOpacity: isWalk ? 0 : 0.9,
      strokeWeight: isWalk ? 2 : 5,
      map: mapInstance,
      ...(isWalk ? {
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 3 }, offset: '0', repeat: '10px' }],
      } : {}),
    });
    polylines.push(poly);
  }
  return polylines;
}

export async function tryDrawRoute(routePath, color, mapInstance, googleMode, userId = null) {
  const origin = routePath[0];
  const dest = routePath[routePath.length - 1];

  // Check DB cache
  const cached = await getRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, googleMode);
  if (cached?.polyline_data?.segments) {
    const { encoding } = await google.maps.importLibrary('geometry');
    const drawnPolylines = [];
    for (const seg of cached.polyline_data.segments) {
      const path = encoding.decodePath(seg.encoded);
      if (!path?.length) continue;
      const poly = new google.maps.Polyline({
        path,
        strokeColor: seg.color || color,
        strokeOpacity: seg.isWalk ? 0 : (seg.opacity ?? 0.85),
        strokeWeight: seg.isWalk ? 2 : (seg.weight ?? 4),
        map: mapInstance,
        ...(seg.isWalk ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 3 }, offset: '0', repeat: '10px' }] } : {}),
      });
      drawnPolylines.push(poly);
    }
    if (drawnPolylines.length > 0) return drawnPolylines;
  }

  // Check API guard
  const { allowed } = await checkApiAllowed('directions', userId);
  if (!allowed) {
    console.warn('[MapPanel] directions blocked by guard');
    return null;
  }

  const { Route } = await google.maps.importLibrary('routes');

  if (googleMode === 'TRANSIT') {
    const { routes } = await Route.computeRoutes({
      origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
      destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
      travelMode: 'TRANSIT',
      fields: ['path', 'legs'],
    });
    if (!routes?.[0]) return null;
    const route = routes[0];
    const leg = route.legs?.[0];
    const steps = leg?.steps || [];

    if (steps.length > 0) {
      const { encoding } = await google.maps.importLibrary('geometry');
      const drawnPolylines = [];
      const segments = [];
      for (const step of steps) {
        const encoded = step.polyline?.encodedPolyline || step.encodedPolyline || step.polylineEncoded;
        if (!encoded) continue;
        const path = encoding.decodePath(encoded);
        if (!path?.length) continue;
        const isWalk = step.travelMode === 'WALK' || step.travelMode === 'WALKING';
        const lineColor = step.transitDetails?.line?.color;
        const strokeColor = (!isWalk && lineColor) ? lineColor : (isWalk ? '#888888' : color);
        segments.push({ encoded, color: strokeColor, isWalk });
        const poly = new google.maps.Polyline({
          path, strokeColor,
          strokeOpacity: isWalk ? 0 : 0.9,
          strokeWeight: isWalk ? 2 : 5,
          map: mapInstance,
          ...(isWalk ? { icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 3 }, offset: '0', repeat: '10px' }] } : {}),
        });
        drawnPolylines.push(poly);
      }
      if (drawnPolylines.length > 0) {
        logApiCall('directions', userId, 'success');
        saveRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, googleMode, { polylineData: { segments } });
        return drawnPolylines;
      }
    }

    // Fallback: single-color polyline
    const polylines = route.createPolylines();
    polylines.forEach(p => { p.setOptions({ strokeColor: color, strokeOpacity: 0.8, strokeWeight: 4 }); p.setMap(mapInstance); });
    if (polylines.length > 0) {
      logApiCall('directions', userId, 'success');
      saveRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, googleMode, { polylineData: { segments: [] } });
    }
    return polylines.length > 0 ? polylines : null;
  }

  const intermediates = routePath.slice(1, -1).slice(0, 25).map(p => ({
    location: new google.maps.LatLng(Number(p.lat), Number(p.lng))
  }));

  const { routes } = await Route.computeRoutes({
    origin: new google.maps.LatLng(Number(origin.lat), Number(origin.lng)),
    destination: new google.maps.LatLng(Number(dest.lat), Number(dest.lng)),
    travelMode: googleMode,
    ...(intermediates.length ? { intermediates } : {}),
    fields: ['path', 'legs'],
  });

  if (!routes?.[0]) return null;

  const isWalk = googleMode === 'WALKING';
  const polylines = routes[0].createPolylines();
  polylines.forEach(p => {
    p.setOptions({
      strokeColor: color,
      strokeOpacity: isWalk ? 0 : 0.8,
      strokeWeight: 4,
      ...(isWalk ? {
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 3 }, offset: '0', repeat: '12px' }],
      } : {}),
    });
    p.setMap(mapInstance);
  });

  if (polylines.length > 0) {
    logApiCall('directions', userId, 'success');
    const segments = [];
    for (const leg of (routes[0].legs || [])) {
      for (const step of (leg.steps || [])) {
        const encoded = step.polyline?.encodedPolyline;
        if (encoded) segments.push({ encoded, color, isWalk, opacity: isWalk ? 0 : 0.8, weight: 4 });
      }
    }
    saveRouteCache(origin.lat, origin.lng, dest.lat, dest.lng, googleMode, { polylineData: { segments } });
  }

  return polylines;
}

export async function drawTransitSteps(steps, color, mapInstance) {
  try {
    const hasPolylines = steps.some(s => s.encodedPolyline);
    if (!hasPolylines) return [];
    return await decodeAndDrawSteps(steps, color, mapInstance, true);
  } catch (err) {
    console.warn('[MapPanel] drawTransitSteps failed:', err);
    return [];
  }
}

export async function fetchAndDrawRoute(routePath, color, mapInstance, travelMode = 'DRIVE') {
  try {
    if (typeof google === 'undefined') return [];

    const primaryMode = TRAVEL_MODE_MAP[travelMode] || 'DRIVING';
    let polylines = await tryDrawRoute(routePath, color, mapInstance, primaryMode);

    // Fallback to TRANSIT if DRIVE/WALK returns nothing
    if (!polylines && primaryMode !== 'TRANSIT') {
      polylines = await tryDrawRoute(routePath, color, mapInstance, 'TRANSIT');
    }

    return polylines || [];
  } catch (err) {
    console.warn('[MapPanel] Routes API failed:', err?.message || err);
    return [];
  }
}
