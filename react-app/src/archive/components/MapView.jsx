import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { MapPin, Camera, Navigation2, Route, ArrowLeft, X } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

delete L.Icon.Default.prototype._getIconUrl;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normPath(p) {
  return (p || '').replace(/\\/g, '/').toLowerCase();
}

function getEventCoords(event, allPhotos) {
  if (event.cover_photo_id) {
    const p = allPhotos.find(p => normPath(p.path) === normPath(event.cover_photo_id));
    if (p?.latitude && p?.longitude) return [p.latitude, p.longitude];
  }
  const fb = allPhotos.find(
    p => String(p.event_id) === String(event.event_id) && p.latitude && p.longitude
  );
  return fb ? [fb.latitude, fb.longitude] : null;
}

// Cover photo: try cover_photo_id, then first photo of event (with or without GPS)
function getEventCoverPhoto(event, allPhotos) {
  if (event.cover_photo_id) {
    const p = allPhotos.find(p => normPath(p.path) === normPath(event.cover_photo_id));
    if (p?.handle) return p;
  }
  // Fallback: any photo belonging to this event
  return allPhotos.find(p => String(p.event_id) === String(event.event_id) && p.handle) || null;
}

function makeEventMarkerIcon(label, hovered, dimmed) {
  const bg = dimmed ? '#1e3a5f' : hovered ? '#3b9eff' : '#0d7ff2';
  const border = dimmed ? '#1a2d45' : hovered ? '#7dc4ff' : '#1a6fd4';
  const size = hovered ? 38 : 32;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2.5px solid ${border};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${dimmed ? '#4a7aaa' : 'white'};font-size:12px;font-weight:800;box-shadow:0 4px 16px rgba(13,127,242,${dimmed ? 0.15 : 0.5});font-family:system-ui,sans-serif;">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePhotoMarkerIcon(hovered, pinned) {
  // Transparent 32px hit area; visible dot inside
  const dotSize = pinned ? 18 : hovered ? 16 : 13;
  const bg = pinned ? '#ffffff' : hovered ? '#93c5fd' : '#60a5fa';
  const border = pinned ? '#0d7ff2' : 'rgba(255,255,255,0.9)';
  const shadow = pinned
    ? '0 0 0 3px rgba(13,127,242,0.4), 0 4px 12px rgba(0,0,0,0.8)'
    : '0 2px 8px rgba(0,0,0,0.7)';
  const HIT = 32;
  return L.divIcon({
    className: '',
    html: `<div style="width:${HIT}px;height:${HIT}px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <div style="width:${dotSize}px;height:${dotSize}px;background:${bg};border:2px solid ${border};border-radius:50%;box-shadow:${shadow};transition:all 0.12s;"></div>
    </div>`,
    iconSize: [HIT, HIT],
    iconAnchor: [HIT / 2, HIT / 2],
  });
}

// ─── Photo speech bubble ──────────────────────────────────────────────────────

function PhotoHoverBubble({ photo, isPinned, onExpand }) {
  const map = useMap();
  const [pixelPos, setPixelPos] = useState(null);
  const imgUrl = useObjectUrl(photo?.handle ?? null);

  // Refs so the native listener always reads fresh values (no stale closure)
  const isPinnedRef = useRef(isPinned);
  const onExpandRef = useRef(onExpand);
  const photoRef = useRef(photo);
  isPinnedRef.current = isPinned;
  onExpandRef.current = onExpand;
  photoRef.current = photo;

  // callback ref: fires when the element is actually in the DOM (after pixelPos is set)
  const containerRef = useCallback((el) => {
    if (!el) return;
    // Native listener fires on this element; stopPropagation below prevents bubbling to Leaflet
    el.addEventListener('click', () => {
      if (isPinnedRef.current && onExpandRef.current) {
        onExpandRef.current(photoRef.current);
      }
    });
    // Prevent click from bubbling up to Leaflet's map container listener
    L.DomEvent.disableClickPropagation(el);
  }, []);

  const updatePos = useCallback(() => {
    if (!photo) { setPixelPos(null); return; }
    const pt = map.latLngToContainerPoint(L.latLng(photo.latitude, photo.longitude));
    setPixelPos({ x: pt.x, y: pt.y });
  }, [photo, map]);

  useEffect(() => { updatePos(); }, [updatePos]);
  useMapEvents({ move: updatePos, zoom: updatePos, moveend: updatePos, zoomend: updatePos });

  if (!pixelPos || !photo) return null;

  const CARD_W = 200;
  const ARROW_H = 9;
  const DOT_HALF = 7;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: pixelPos.x - CARD_W / 2,
        top: pixelPos.y - DOT_HALF - ARROW_H,
        transform: 'translateY(-100%)',
        width: CARD_W,
        zIndex: 1600,
        pointerEvents: isPinned ? 'auto' : 'none',
        cursor: isPinned ? 'pointer' : 'default',
      }}
    >
      <div style={{
        background: 'rgba(8,16,26,0.97)',
        border: isPinned ? '1px solid rgba(13,127,242,0.5)' : '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isPinned ? '0 8px 28px rgba(0,0,0,0.85), 0 0 0 2px rgba(13,127,242,0.2)' : '0 8px 28px rgba(0,0,0,0.85)',
      }}>
        {/* Photo */}
        <div style={{ height: 130, background: '#0d1520', position: 'relative', overflow: 'hidden' }}>
          {imgUrl
            ? <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>📷</span>
              </div>
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,16,26,0.8) 0%, transparent 50%)' }} />
          {isPinned && (
            <div style={{
              position: 'absolute', bottom: 6, right: 8,
              color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'system-ui,sans-serif',
            }}>click to enlarge</div>
          )}
        </div>
        {/* Date */}
        {photo.date && (
          <div style={{
            padding: '6px 10px 8px',
            color: '#94a3b8', fontSize: 11,
            fontFamily: 'system-ui,sans-serif',
          }}>
            {format(new Date(photo.date), 'MMM d, yyyy')}
            {photo.time && <span style={{ color: '#475569', marginLeft: 6 }}>{photo.time.slice(0, 5)}</span>}
          </div>
        )}
      </div>
      {/* Arrow */}
      <div style={{ position: 'absolute', bottom: -ARROW_H + 1, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', bottom: -ARROW_H + 2, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid rgba(8,16,26,0.97)' }} />
    </div>,
    map.getContainer()
  );
}

// ─── Route fit controller (fires when trip route changes) ─────────────────────

function RouteController({ fitCoords }) {
  const map = useMap();
  useEffect(() => {
    if (!fitCoords?.length) return;
    if (fitCoords.length === 1) {
      map.setView(fitCoords[0], 13, { animate: true, duration: 1.2 });
    } else {
      map.fitBounds(L.latLngBounds(fitCoords), { padding: [80, 80], animate: true, duration: 1.2 });
    }
  }, [fitCoords, map]);
  return null;
}

// ─── Event zoom controller (fires when an event is clicked) ──────────────────

function EventZoomController({ photoCoords, eventId }) {
  const map = useMap();
  useEffect(() => {
    if (!eventId || !photoCoords?.length) return;
    if (photoCoords.length === 1) {
      map.setView(photoCoords[0], 16, { animate: true, duration: 1.0 });
    } else {
      map.fitBounds(L.latLngBounds(photoCoords), { padding: [60, 60], animate: true, duration: 1.0 });
    }
  }, [eventId, photoCoords, map]);
  return null;
}

// ─── Click empty map to deselect event ───────────────────────────────────────

function MapClickHandler({ onClick }) {
  useMapEvents({ click: onClick });
  return null;
}

// ─── Speech bubble hover card ─────────────────────────────────────────────────

function HoverBubble({ eventData }) {
  const map = useMap();
  const [pixelPos, setPixelPos] = useState(null);

  // coverPhoto pre-computed in routeEvents — no path lookup needed here
  const imgUrl = useObjectUrl(eventData?.coverPhoto?.handle ?? null);

  const updatePos = useCallback(() => {
    if (!eventData) { setPixelPos(null); return; }
    const pt = map.latLngToContainerPoint(L.latLng(eventData.coords));
    setPixelPos({ x: pt.x, y: pt.y });
  }, [eventData, map]);

  useEffect(() => { updatePos(); }, [updatePos]);
  useMapEvents({ move: updatePos, zoom: updatePos, moveend: updatePos, zoomend: updatePos });

  if (!pixelPos || !eventData) return null;

  const { event, index } = eventData;
  const CARD_W = 220;
  const ARROW_H = 9;
  const MARKER_HALF = 19;

  return createPortal(
    <div style={{
      position: 'absolute',
      left: pixelPos.x - CARD_W / 2,
      top: pixelPos.y - MARKER_HALF - ARROW_H,
      transform: 'translateY(-100%)',
      width: CARD_W,
      zIndex: 1500,
      pointerEvents: 'none',
    }}>
      {/* Card */}
      <div style={{
        background: 'rgba(8,16,26,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}>
        {/* Cover image */}
        <div style={{ height: 110, position: 'relative', overflow: 'hidden', background: '#0d1520' }}>
          {imgUrl && (
            <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,16,26,1) 0%, transparent 55%)' }} />
          <div style={{
            position: 'absolute', top: 8, left: 8,
            width: 20, height: 20, background: '#0d7ff2', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 10, fontWeight: 800, fontFamily: 'system-ui,sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>{index}</div>
          <div style={{
            position: 'absolute', bottom: 6, right: 8,
            color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'system-ui,sans-serif',
          }}>click to explore</div>
        </div>

        {/* Text */}
        <div style={{ padding: '8px 10px 10px', fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title || t('app.map.event')}
          </div>
          {event.city && (
            <div style={{ color: '#3b9eff', fontSize: 11, marginTop: 3 }}>📍 {event.city}</div>
          )}
          <div style={{ display: 'flex', gap: 8, color: '#64748b', fontSize: 11, marginTop: 4 }}>
            {event.date && <span>{format(new Date(event.date), 'MMM d, yyyy')}</span>}
            {event.category && <span style={{ color: '#475569' }}>{event.category}</span>}
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ position: 'absolute', bottom: -ARROW_H + 1, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid rgba(255,255,255,0.12)' }} />
      <div style={{ position: 'absolute', bottom: -ARROW_H + 2, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid rgba(8,16,26,0.97)' }} />
    </div>,
    map.getContainer()
  );
}

// ─── Left panel trip card ──────────────────────────────────────────────────────

function TripPanelCard({ tripData, isSelected, onSelect, onNavigate, allPhotos }) {
  const coverPhoto = useMemo(() => {
    const coverPath = tripData.item.cover_photo_id;
    if (coverPath) {
      return tripData.photos.find(p => normPath(p.path) === normPath(coverPath)) || tripData.photos[0];
    }
    return tripData.photos[0] || null;
  }, [tripData]);

  const imgUrl = useObjectUrl(coverPhoto?.handle);

  const stopCount = useMemo(
    () => tripData.associatedEvents.filter(e => getEventCoords(e, allPhotos) !== null).length,
    [tripData.associatedEvents, allPhotos]
  );

  const cities = useMemo(() => {
    const set = new Set([...tripData.associatedEvents.map(e => e.city), ...tripData.photos.map(p => p.city)].filter(Boolean));
    return Array.from(set).slice(0, 3);
  }, [tripData]);

  return (
    <div
      onClick={() => onSelect(tripData.id)}
      onDoubleClick={() => onNavigate({ type: 'trip', id: tripData.id })}
      className={clsx(
        'relative group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-200 select-none',
        isSelected ? 'border-[#0d7ff2] shadow-lg shadow-[#0d7ff2]/20' : 'border-white/5 hover:border-white/15'
      )}
    >
      <div className="aspect-[16/7] relative overflow-hidden bg-[#0d1520]">
        {imgUrl
          ? <img src={imgUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
          : <div className="w-full h-full flex items-center justify-center"><MapPin size={20} className="text-slate-700" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {stopCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-lg text-[11px] font-bold text-white">
            <Route size={10} />{stopCount} stops
          </div>
        )}
        {isSelected && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#0d7ff2] rounded-lg text-[11px] font-bold text-white">On map ↑</div>
        )}
      </div>
      <div className={clsx('px-3 py-2.5 transition-colors', isSelected ? 'bg-[#0d1f35]' : 'bg-[#0d1520]')}>
        <h3 className="font-bold text-white text-sm leading-tight truncate">{tripData.title}</h3>
        {cities.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{cities.join(' · ')}</p>}
        <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1"><Camera size={9} />{tripData.photos.length} photos</p>
      </div>
    </div>
  );
}

// ─── Expanded photo overlay ───────────────────────────────────────────────────

function ExpandedPhotoOverlay({ photo, onClose }) {
  const imgUrl = useObjectUrl(photo?.handle ?? null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!photo) return null;

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* Photo */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[90vw] max-h-[88vh] flex flex-col items-center"
      >
        {imgUrl
          ? <img
              src={imgUrl}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              alt=""
            />
          : <div className="w-64 h-64 flex items-center justify-center text-5xl bg-slate-900 rounded-xl">📷</div>
        }
        {/* Meta */}
        {photo.date && (
          <div className="mt-3 text-slate-400 text-sm">
            {format(new Date(photo.date), 'MMMM d, yyyy')}
            {photo.time && <span className="text-slate-600 ml-3">{photo.time.slice(0, 5)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main MapView ──────────────────────────────────────────────────────────────

export function MapView({ trips, allPhotos, onNavigate, t }) {
  const [selectedTripId, setSelectedTripId] = useState(() => trips[0]?.id || null);
  const [hoveredEventId, setHoveredEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [hoveredPhoto, setHoveredPhoto] = useState(null);
  const [pinnedPhoto, setPinnedPhoto] = useState(null);
  const [expandedPhoto, setExpandedPhoto] = useState(null);

  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);

  // Clear selected event + pinned photo when trip changes
  useEffect(() => { setSelectedEventId(null); setPinnedPhoto(null); setExpandedPhoto(null); }, [selectedTripId]);

  // Route events: sorted, with coords + cover photo pre-computed
  const routeEvents = useMemo(() => {
    if (!selectedTrip) return [];
    return [...selectedTrip.associatedEvents]
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .map((event, i) => ({
        event,
        coords: getEventCoords(event, allPhotos),
        coverPhoto: getEventCoverPhoto(event, allPhotos),
        index: i + 1,
      }))
      .filter(e => e.coords !== null);
  }, [selectedTrip, allPhotos]);

  const polylineCoords = useMemo(() => routeEvents.map(e => e.coords), [routeEvents]);

  // Photos within the clicked event that have GPS
  const eventPhotos = useMemo(() => {
    if (!selectedEventId) return [];
    return allPhotos.filter(
      p => String(p.event_id) === selectedEventId && p.latitude && p.longitude
    );
  }, [selectedEventId, allPhotos]);

  const eventPhotoCoords = useMemo(() => eventPhotos.map(p => [p.latitude, p.longitude]), [eventPhotos]);

  const hoveredEventData = useMemo(
    () => hoveredEventId ? routeEvents.find(e => String(e.event.event_id) === hoveredEventId) : null,
    [hoveredEventId, routeEvents]
  );

  const selectedEventData = useMemo(
    () => selectedEventId ? routeEvents.find(e => String(e.event.event_id) === selectedEventId) : null,
    [selectedEventId, routeEvents]
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel */}
      <div className="w-72 shrink-0 flex flex-col bg-[#0a1520] border-r border-white/5 overflow-hidden">
        <div className="px-4 pt-5 pb-3 shrink-0 border-b border-white/5">
          <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
            <Navigation2 size={16} className="text-[#0d7ff2]" />
            {t('app.nav.map')}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">{trips.length} {t('sidebar.trips')} · click to view route</p>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 flex flex-col gap-2.5">
          {trips.map(tripData => (
            <TripPanelCard
              key={tripData.id}
              tripData={tripData}
              isSelected={tripData.id === selectedTripId}
              onSelect={id => { setSelectedTripId(id); setSelectedEventId(null); }}
              onNavigate={onNavigate}
              allPhotos={allPhotos}
            />
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={[20, 0]} zoom={2} className="w-full h-full" zoomControl={false} style={{ background: '#060d14' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />

          {/* Fit to route when trip changes */}
          {!selectedEventId && polylineCoords.length > 0 && <RouteController fitCoords={polylineCoords} />}

          {/* Fit to event photos when event is clicked */}
          {selectedEventId && eventPhotoCoords.length > 0 && (
            <EventZoomController photoCoords={eventPhotoCoords} eventId={selectedEventId} />
          )}

          {/* Click empty map → deselect event + unpin photo */}
          <MapClickHandler onClick={() => { setSelectedEventId(null); setPinnedPhoto(null); }} />

          {/* Route polyline */}
          {polylineCoords.length > 1 && (
            <Polyline positions={polylineCoords} pathOptions={{ color: '#0d7ff2', weight: 2, opacity: selectedEventId ? 0.25 : 0.6, dashArray: '5 8' }} />
          )}

          {/* Event markers */}
          {routeEvents.map(({ event, coords, index }) => (
            <Marker
              key={event.event_id}
              position={coords}
              icon={makeEventMarkerIcon(index, hoveredEventId === String(event.event_id), !!selectedEventId && selectedEventId !== String(event.event_id))}
              eventHandlers={{
                mouseover: () => { if (!selectedEventId) setHoveredEventId(String(event.event_id)); },
                mouseout: () => setHoveredEventId(null),
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  setHoveredEventId(null);
                  setSelectedEventId(String(event.event_id));
                },
                dblclick: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onNavigate({ type: 'trip', id: selectedTripId });
                },
              }}
            />
          ))}

          {/* Photo markers for clicked event */}
          {eventPhotos.map((photo, i) => {
            const pid = photo.photo_id || photo.path || i;
            const isPinned = pinnedPhoto?.path === photo.path;
            const isHovered = hoveredPhoto?.path === photo.path;
            return (
              <Marker
                key={pid}
                position={[photo.latitude, photo.longitude]}
                icon={makePhotoMarkerIcon(isHovered, isPinned)}
                eventHandlers={{
                  mouseover: () => setHoveredPhoto(photo),
                  mouseout: () => setHoveredPhoto(null),
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    setPinnedPhoto(prev => prev?.path === photo.path ? null : photo);
                  },
                }}
              />
            );
          })}

          {/* Speech bubble — event hover */}
          {!selectedEventId && <HoverBubble eventData={hoveredEventData} />}

          {/* Speech bubble — photo (pinned takes priority over hover) */}
          {selectedEventId && (
            <PhotoHoverBubble
              photo={pinnedPhoto ?? hoveredPhoto}
              isPinned={!!(pinnedPhoto)}
              onExpand={setExpandedPhoto}
            />
          )}
        </MapContainer>

        {/* Event detail banner (shown when event is selected) */}
        {selectedEventData && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 px-4 py-2.5 bg-[#08101a]/95 backdrop-blur-xl border border-[#0d7ff2]/30 rounded-2xl shadow-2xl pointer-events-auto">
            <button
              onClick={() => setSelectedEventId(null)}
              className="flex items-center gap-1.5 text-[#3b9eff] hover:text-white transition-colors text-xs font-bold"
            >
              <ArrowLeft size={13} />
              {t('app.map.route')}
            </button>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#0d7ff2] rounded-full flex items-center justify-center text-white font-black text-[10px]">
                {selectedEventData.index}
              </div>
              <span className="text-white font-bold text-sm">{selectedEventData.event.title || t('app.map.event')}</span>
              {selectedEventData.event.city && (
                <span className="text-slate-400 text-xs">· {selectedEventData.event.city}</span>
              )}
            </div>
            <div className="w-px h-4 bg-white/10" />
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Camera size={11} />{t('app.map.photosOnMap').replace('{{count}}', eventPhotos.length)}
            </span>
          </div>
        )}

        {/* No GPS fallback */}
        {selectedTrip && routeEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-5 text-center">
              <MapPin size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">{t('app.map.noGps')}</p>
              <p className="text-slate-400 text-xs mt-1">{t('app.map.gpsHint')}</p>
            </div>
          </div>
        )}

        {/* Expanded photo overlay */}
        {expandedPhoto && (
          <ExpandedPhotoOverlay
            photo={expandedPhoto}
            onClose={() => setExpandedPhoto(null)}
          />
        )}
      </div>
    </div>
  );
}
