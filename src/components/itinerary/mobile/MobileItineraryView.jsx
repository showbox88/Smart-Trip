/**
 * MobileItineraryView — iOS-style itinerary layout
 *
 * Reference layout:
 *   - Hero image at top
 *   - Light grey body background
 *   - Active day + its stops fused in ONE white rounded card
 *   - Inactive days listed below on grey bg, separated by gray divider lines
 *   - Between stop cards: gray horizontal line with transit pill centered
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripEditor } from '../../../hooks/useTripEditor';
import { useTrips } from '../../../hooks/useTrips';
import { useI18n } from '../../../context/I18nContext';
import { useClimateData } from '../../../hooks/useClimateData';
import { useCityInfo } from '../../../hooks/useCityInfo';
import { formatTemp } from '../../../utils/formatters';
import { useTimelineDrag } from '../../../hooks/useTimelineDrag';
import StopEditModal from '../../modals/StopEditModal';
import TripEditModal from '../../modals/TripEditModal';
import ShareModal from '../../modals/ShareModal';
import ConfirmModal from '../../modals/ConfirmModal';
import TimePickerModal from '../../modals/TimePickerModal';
import ExpenseModal from '../../modals/ExpenseModal';
import PlanBPanel from '../PlanBPanel';
import MapPanel from '../MapPanel';

/* ── helpers ─────────────────────────────────────────────── */

function stopName(s) { return s.location || s.title || s.address || ''; }

function priceTier(stop) {
  const v = stop.expense != null ? parseFloat(stop.expense) : parseFloat(stop.price || 0);
  if (isNaN(v) || v < 0) return null;
  if (v === 0) return 'Free';
  if (v <= 15) return '$';
  if (v <= 50) return '$$';
  if (v <= 150) return '$$$';
  return '$$$$';
}

function fmtTime(stop) {
  if (!stop.time) return null;
  const [hS, mS] = stop.time.split(':');
  const h24 = parseInt(hS, 10), m = parseInt(mS, 10) || 0;
  if (isNaN(h24)) return null;
  const p = stop.period || (h24 >= 12 ? 'PM' : 'AM');
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

function fmtDuration(sec) {
  const n = typeof sec === 'string' ? parseInt(sec, 10) : sec;
  if (!n || isNaN(n)) return null;
  const h = Math.floor(n / 3600);
  const m = Math.max(1, Math.round((n % 3600) / 60));
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

const T_ICON = { WALK: 'directions_walk', DRIVE: 'directions_car', TRANSIT: 'directions_bus', BICYCLE: 'pedal_bike' };
const T_WORD = { WALK: 'walk', DRIVE: 'taxi', TRANSIT: 'transit', BICYCLE: 'bike' };

function transitPill(t) {
  if (!t) return null;
  const mode = (t.mode || 'WALK').toUpperCase();
  const dur = fmtDuration(t.duration);
  if (!dur) return null;
  return { icon: T_ICON[mode] || 'directions_walk', text: `${dur} ${T_WORD[mode] || 'walk'}` };
}

function fmtRange(s, e) {
  try {
    const o = { month: 'short', day: 'numeric', year: 'numeric' };
    const a = new Date(s.replace(/-/g, '/')).toLocaleDateString('en-US', o);
    if (!e) return a;
    return `${a} – ${new Date(e.replace(/-/g, '/')).toLocaleDateString('en-US', o)}`;
  } catch { return ''; }
}

function isVisible(s) { return !s.type || s.type === 'location' || s.type === 'activity'; }

/* ── component ───────────────────────────────────────────── */

export default function MobileItineraryView({ tripId }) {
  const nav = useNavigate();
  const { t } = useI18n();
  const { deleteTrip } = useTrips();
  const { trip, deleteStop, updateStop, updateStopAndSort, updateTripMetadata, moveStop, moveDay, swapPlanB, addPlanBAlternative, removePlanBAlternative } = useTripEditor(tripId);

  // City data hooks
  const destinations = useMemo(() => trip?.settings?.destinations || [], [trip?.settings?.destinations]);
  const { climateByCity } = useClimateData(destinations, trip?.startDate, trip?.endDate);
  const { cityInfo, loading: cityInfoLoading } = useCityInfo(destinations);

  const [dayIdx, setDayIdx]       = useState(0);
  const [editStop, setEditStop]   = useState(null);
  const [editTrip, setEditTrip]   = useState(false);
  const [share, setShare]         = useState(false);
  const [cityModal, setCityModal] = useState(null); // { type: 'cuisine'|'attractions', city, data }
  const [confirm, setConfirm]     = useState(null);
  const [timePick, setTimePick]   = useState(null);
  const [expense, setExpense]     = useState(null);
  const [menu, setMenu]           = useState(false);
  const [pageRotation, setPageRotation] = useState(0);
  const showMap = Math.round(pageRotation / 180) % 2 !== 0;
  const [planBStop, setPlanBStop]  = useState(null); // { dayId, stop }
  const mapPanelRef = useRef(null);
  const [cardRotation, setCardRotation] = useState({}); // { [stopId]: angle }
  const swipeRef = useRef(null); // { id, startX, startY }
  const dayRefs = useRef([]);

  const {
    timelineRef: dragContainerRef,
    draggingStopId,
    handlePointerDown: onDragPointerDown,
    handlePointerMove: onDragPointerMove,
    handlePointerUp: onDragPointerUp,
  } = useTimelineDrag(trip, moveStop);

  // Track if a drag just ended to suppress the click that follows pointerup
  const didDragRef = useRef(false);
  const wrappedPointerDown = useCallback((e, stopId) => {
    didDragRef.current = false;
    onDragPointerDown(e, stopId);
  }, [onDragPointerDown]);
  const wrappedPointerUp = useCallback((e) => {
    if (draggingStopId) didDragRef.current = true;
    onDragPointerUp(e);
  }, [draggingStopId, onDragPointerUp]);

  // Card flip — directional rotation following swipe, cyclic
  const flipCard = useCallback((stopId, direction) => {
    // direction: -1 = swipe left → rotate -180, +1 = swipe right → rotate +180
    setCardRotation(prev => {
      const cur = prev[stopId] || 0;
      return { ...prev, [stopId]: cur - direction * 180 };
    });
  }, []);

  const onCardTouchStart = useCallback((e, stopId) => {
    if (draggingStopId) return;
    const t = e.touches[0];
    swipeRef.current = { id: stopId, startX: t.clientX, startY: t.clientY };
  }, [draggingStopId]);

  const onCardTouchEnd = useCallback((e) => {
    if (!swipeRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.startX;
    const dy = t.clientY - swipeRef.current.startY;
    const id = swipeRef.current.id;
    swipeRef.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      flipCard(id, dx > 0 ? -1 : 1);
    }
  }, [flipCard]);

  // Mouse swipe for desktop
  const onCardMouseDown = useCallback((e, stopId) => {
    if (draggingStopId) return;
    swipeRef.current = { id: stopId, startX: e.clientX, startY: e.clientY };
  }, [draggingStopId]);

  const onCardMouseUp = useCallback((e) => {
    if (!swipeRef.current) return;
    const dx = e.clientX - swipeRef.current.startX;
    const dy = e.clientY - swipeRef.current.startY;
    const id = swipeRef.current.id;
    swipeRef.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      flipCard(id, dx > 0 ? -1 : 1);
    }
  }, [flipCard]);

  const days  = trip?.days || [];
  const day   = days[dayIdx] ?? days[0];
  const stops = (day?.stops || []).filter(isVisible);

  /* ── Hero carousel state ── */
  const cities = (trip?.settings?.destinations || []).map(d => d.name).filter(Boolean);
  // Slides: [cover, city1, city2, ...] → loop
  const totalSlides = 1 + cities.length;
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTouchX = useRef(null);

  const onHeroTouchStart = useCallback((e) => {
    heroTouchX.current = e.touches[0].clientX;
  }, []);
  const onHeroTouchEnd = useCallback((e) => {
    if (heroTouchX.current == null) return;
    const dx = heroTouchX.current - e.changedTouches[0].clientX;
    heroTouchX.current = null;
    if (Math.abs(dx) < 40) return; // too small
    if (dx > 0) {
      // swipe left → next
      setHeroIdx(prev => (prev + 1) % totalSlides);
    } else {
      // swipe right → prev
      setHeroIdx(prev => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [totalSlides]);

  const DAY_ROW_H = 46;
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(null);
  const baseShift = dayIdx * DAY_ROW_H;

  // Day reorder drag state
  const [dayDragIdx, setDayDragIdx] = useState(null);       // index being dragged
  const [dayDragDy, setDayDragDy] = useState(0);            // pixel offset of dragged item
  const [dayDropIdx, setDayDropIdx] = useState(null);        // current insert position
  const dayDragRef = useRef(null); // { fromIdx, startY, timer }

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current == null) return;
    // If day-reorder drag active, handle that instead of scroll
    if (dayDragIdx != null) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    const maxShift = (days.length - 1) * DAY_ROW_H;
    const clamped = Math.max(-baseShift, Math.min(maxShift - baseShift, delta));
    setDragOffset(clamped);
  }, [baseShift, days.length, dayDragIdx]);

  const onTouchEnd = useCallback(() => {
    if (dayDragIdx != null) return; // handled by day drag end
    // Snap to nearest day
    const totalShift = baseShift + dragOffset;
    const nearest = Math.round(totalShift / DAY_ROW_H);
    const clamped = Math.max(0, Math.min(days.length - 1, nearest));
    setDragOffset(0);
    touchStartY.current = null;
    if (clamped !== dayIdx) setDayIdx(clamped);
  }, [baseShift, dragOffset, days.length, dayIdx, dayDragIdx]);

  const totalShift = baseShift + dragOffset;

  // Day reorder: long-press to start, drag to reorder
  const onDayPointerDown = useCallback((e, idx) => {
    if (e.button !== 0) return;
    const startY = e.clientY;
    const timer = setTimeout(() => {
      if (dayDragRef.current?.fromIdx !== idx) return;
      dayDragRef.current.active = true;
      setDayDragIdx(idx);
      setDayDropIdx(idx);
      if (window.navigator.vibrate) window.navigator.vibrate(20);
    }, 400);
    dayDragRef.current = { fromIdx: idx, startY, timer, active: false };
  }, []);

  const onDayPointerMove = useCallback((e) => {
    if (!dayDragRef.current) return;
    if (!dayDragRef.current.active) {
      // If moved too much before long-press fires, cancel
      if (Math.abs(e.clientY - dayDragRef.current.startY) > 8) {
        clearTimeout(dayDragRef.current.timer);
        dayDragRef.current = null;
      }
      return;
    }
    const dy = e.clientY - dayDragRef.current.startY;
    setDayDragDy(dy);
    // Calculate drop position
    const fromIdx = dayDragRef.current.fromIdx;
    const offsetRows = Math.round(dy / DAY_ROW_H);
    const target = Math.max(0, Math.min(days.length - 1, fromIdx + offsetRows));
    setDayDropIdx(target);
  }, [days.length]);

  const onDayPointerUp = useCallback(() => {
    if (!dayDragRef.current) return;
    clearTimeout(dayDragRef.current.timer);
    if (dayDragRef.current.active && dayDragIdx != null && dayDropIdx != null && dayDropIdx !== dayDragIdx) {
      const dayId = days[dayDragIdx].id;
      // moveDay(dayId, afterDayId) places dayId after afterDayId (null = beginning)
      const afterId = dayDropIdx === 0
        ? null
        : dayDropIdx > dayDragIdx
          ? days[dayDropIdx].id
          : (dayDropIdx > 0 ? days[dayDropIdx - 1].id : null);
      moveDay(dayId, afterId);
      setDayIdx(dayDropIdx);
    }
    dayDragRef.current = null;
    setDayDragIdx(null);
    setDayDragDy(0);
    setDayDropIdx(null);
  }, [dayDragIdx, dayDropIdx, days, moveDay]);

  const doDelete = useCallback(() => {
    setMenu(false);
    setConfirm({
      message: t('itinerary.confirm_delete_trip') || 'Delete this trip?',
      onConfirm: async () => { await deleteTrip(trip._realTripId || trip.id); nav('/'); },
    });
  }, [trip, deleteTrip, nav, t]);

  if (!trip) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FONT }}>
      <div style={{ textAlign: 'center', color: '#8E8E93' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: .3 }}>travel_explore</span>
        <p style={{ marginTop: 8, fontSize: 15 }}>Loading trip…</p>
      </div>
    </div>
  );

  return (
    <div style={{ perspective: 1800, height: '100vh', overflow: 'hidden' }}>
    <div className="mobile-ios-view" style={{
      position: 'relative', width: '100%', height: '100%',
      transformStyle: 'preserve-3d',
      transition: 'transform 0.7s cubic-bezier(.4,.0,.2,1)',
      transform: `rotateY(${pageRotation}deg)`,
    }}>
      {/* ══ FRONT FACE — Itinerary ══ */}
      <div style={{
        position: 'absolute', inset: 0,
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        background: '#F2F2F7', fontFamily: FONT,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: showMap ? 'none' : 'auto',
      }}>
      <style>{`.mobile-ios-view .stop-card-container { min-height: unset !important; }`}</style>

      {/* ════ HERO CAROUSEL (fixed at top) ════ */}
      <div style={{ position: 'relative', height: 235, flexShrink: 0, overflow: 'hidden' }}
        onTouchStart={onHeroTouchStart} onTouchEnd={onHeroTouchEnd}>

        {/* Slide track */}
        <div style={{
          display: 'flex', width: `${totalSlides * 100}%`,
          height: '100%',
          transform: `translateX(-${heroIdx * (100 / totalSlides)}%)`,
          transition: 'transform .35s ease',
        }}>
          {/* Slide 0: Trip cover */}
          <div style={{ width: `${100 / totalSlides}%`, height: '100%', position: 'relative', flexShrink: 0 }}>
            {trip.thumb
              ? <img src={trip.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1c2d4f,#2c4a7c,#3a6bc2)' }} />}
            <div style={{ position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.12) 55%, transparent 100%)' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.2,
                textShadow: '0 2px 12px rgba(0,0,0,.4)', letterSpacing: '-.3px' }}>{trip.title}</h1>
              {(trip.startDate || trip.endDate) &&
                <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.85)', fontSize: 14 }}>
                  {fmtRange(trip.startDate, trip.endDate)}</p>}
            </div>
          </div>

          {/* Slides 1+: City info cards */}
          {cities.map((city) => {
            const climate = climateByCity?.[city];
            const info = cityInfo?.[city];
            const dest = destinations.find(d => d.name === city);
            const stg = trip?.settings;
            return (
              <div key={city} style={{
                width: `${100 / totalSlides}%`, height: '100%', flexShrink: 0,
                position: 'relative',
                background: 'linear-gradient(160deg,#1a1a2e,#16213e,#0f3460)',
                display: 'flex', flexDirection: 'column',
                padding: '48px 16px 14px',
                gap: 6,
                overflow: 'hidden',
              }}>
                {/* ── Title row: city + country + temp in one line ── */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>{city}</h2>
                    {dest?.country && (
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>{dest.country}</span>
                    )}
                  </div>
                  {climate && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: '#FFD60A', fontSize: 11 }}>☀</span>
                      <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{formatTemp(climate.avgHigh, stg)}</span>
                      <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 11 }}>/ {formatTemp(climate.avgLow, stg)}</span>
                    </div>
                  )}
                </div>

                {/* ── About card (full width) ── */}
                <div style={{
                  background: 'rgba(255,255,255,.08)', borderRadius: 12,
                  padding: '8px 12px', overflow: 'hidden', cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>info</span>
                    <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>About</span>
                    {climate && (
                      <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.35)', fontSize: 9 }}>
                        {climate.rainyDays || 0}d rain · {climate.avgPrecipMm > 0 ? `${Math.round(climate.avgPrecipMm)}mm` : '0mm'}
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: 0, color: 'rgba(255,255,255,.75)', fontSize: 11, lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {cityInfoLoading ? 'Loading…' : (info?.intro || 'No description available')}
                  </p>
                </div>

                {/* ── Bottom row: Cuisine + Attractions + Activity buttons ── */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setCityModal({ type: 'cuisine', city })} style={{
                    flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: 12,
                    padding: '10px 8px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>restaurant</span>
                    <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 600 }}>Cuisine</span>
                  </button>
                  <button onClick={() => setCityModal({ type: 'attractions', city })} style={{
                    flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: 12,
                    padding: '10px 8px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>tour</span>
                    <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 600 }}>Attractions</span>
                  </button>
                  <button onClick={() => {
                    const loc = encodeURIComponent(`${city}, ${dest?.country || ''}`);
                    const d1 = trip?.startDate ? trip.startDate.replace(/\//g, '-') : '';
                    const d2 = trip?.endDate ? trip.endDate.replace(/\//g, '-') : '';
                    let url = `https://www.expedia.com/things-to-do/search?location=${loc}&sort=RECOMMENDED&swp=on`;
                    if (d1) url += `&d1=${d1}&startDate=${encodeURIComponent(d1)}`;
                    if (d2) url += `&d2=${d2}&endDate=${encodeURIComponent(d2)}`;
                    window.open(url, '_blank');
                  }} style={{
                    flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: 12,
                    padding: '10px 8px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>confirmation_number</span>
                    <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, fontWeight: 600 }}>Activity</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', marginLeft: 'auto' }}>open_in_new</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Overlay controls — always on top */}
        <button onClick={() => nav(-1)} style={{ ...HBTN, top: 16, left: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, width: 36, height: 36 }}>
          <button onClick={() => setMenu(v => !v)} style={{ ...HBTN, top: 0, left: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_horiz</span>
          </button>
          {menu && (
            <div style={{ position: 'absolute', top: 44, right: 0, background: 'rgba(255,255,255,.97)',
              borderRadius: 13, boxShadow: '0 8px 24px rgba(0,0,0,.18)', overflow: 'hidden', minWidth: 160, zIndex: 300 }}>
              {[
                { ic: 'edit', lb: 'Edit Trip', fn: () => { setEditTrip(true); setMenu(false); } },
                { ic: 'share', lb: 'Share', fn: () => { setShare(true); setMenu(false); } },
                { ic: 'delete', lb: 'Delete', fn: doDelete, danger: true },
              ].map(i => (
                <button key={i.lb} onClick={i.fn} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,.06)',
                  cursor: 'pointer', fontSize: 15, color: i.danger ? '#FF3B30' : '#000', fontFamily: FONT, textAlign: 'left',
                }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{i.ic}</span>{i.lb}</button>
              ))}
            </div>
          )}
        </div>

        {/* Page dots */}
        {totalSlides > 1 && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6, zIndex: 10,
          }}>
            {Array.from({ length: totalSlides }, (_, idx) => (
              <div key={idx} style={{
                width: heroIdx === idx ? 18 : 6, height: 6, borderRadius: 3,
                background: heroIdx === idx ? '#fff' : 'rgba(255,255,255,.5)',
                transition: 'all .25s ease',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* ════ SCROLLABLE CONTENT AREA ════ */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'relative', zIndex: 2,
        paddingBottom: 96,
      }}>
      {/* ════ TWO-COLUMN BODY ════ */}
      <div style={{
        display: 'flex', gap: 0, padding: '16px 12px 0',
        alignItems: 'flex-start',
      }}>

        {/* ── LEFT: Day nav — clip + translateY + touch drag + long-press reorder ── */}
        <div style={{
          width: 72, flexShrink: 0, overflow: 'hidden',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onPointerMove={onDayPointerMove}
          onPointerUp={onDayPointerUp}
          onPointerLeave={onDayPointerUp}
        >
          <div style={{
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            transform: `translateY(-${totalShift}px)`,
            transition: (dragOffset !== 0 || dayDragIdx != null) ? 'none' : 'transform .3s ease',
          }}>
            {/* Vertical connecting line through dot centers */}
            <div style={{
              position: 'absolute',
              right: 13,
              top: 22,
              bottom: 22,
              width: 2,
              background: '#C7C7CC',
              zIndex: 0,
            }} />
            {days.map((d, i) => {
              const active = i === dayIdx;
              const adjActive = i === dayIdx - 1 || i === dayIdx;
              const isDayDragging = dayDragIdx === i;
              // Displacement for non-dragged items
              let dayShift = 0;
              if (dayDragIdx != null && dayDropIdx != null && i !== dayDragIdx) {
                if (dayDragIdx < dayDropIdx && i > dayDragIdx && i <= dayDropIdx) dayShift = -DAY_ROW_H;
                else if (dayDragIdx > dayDropIdx && i >= dayDropIdx && i < dayDragIdx) dayShift = DAY_ROW_H;
              }
              return (
                <div key={d.id}
                  onPointerDown={(e) => onDayPointerDown(e, i)}
                  style={{
                  position: 'relative',
                  zIndex: isDayDragging ? 10 : (active ? 2 : 1),
                  height: DAY_ROW_H,
                  boxSizing: 'border-box',
                  transform: isDayDragging
                    ? `translateY(${dayDragDy}px) scale(1.06)`
                    : dayShift ? `translateY(${dayShift}px)` : '',
                  transition: isDayDragging ? 'scale 0.2s' : 'transform 0.25s cubic-bezier(.25,.1,.25,1)',
                  opacity: isDayDragging ? 0.9 : 1,
                  touchAction: 'none',
                }}>
                  <button onClick={() => { if (dayDragIdx != null) return; setDayIdx(i); }}
                    onPointerDown={(e) => onDayPointerDown(e, i)}
                    style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 0 0 6px', border: 'none', cursor: 'pointer',
                    background: isDayDragging ? '#F2F2F7' : (active ? '#fff' : 'transparent'),
                    borderRadius: active || isDayDragging ? '16px 0 0 16px' : 0,
                    width: '100%', height: '100%',
                    transition: 'background .15s',
                    boxShadow: isDayDragging ? '0 4px 16px rgba(0,0,0,.15)' : 'none',
                    touchAction: 'none',
                  }}>
                    <span style={{
                      fontSize: 15, fontWeight: active ? 700 : 500,
                      color: active ? '#000' : '#8E8E93',
                      whiteSpace: 'nowrap',
                    }}>Day {i + 1}</span>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: active ? '#FF3B30' : '#C7C7CC',
                      flexShrink: 0,
                      border: active ? '2px solid #fff' : '2px solid #F2F2F7',
                      boxSizing: 'content-box',
                      position: 'relative', zIndex: 1,
                      ...(active ? { boxShadow: '0 0 0 3px rgba(255,59,48,.15)' } : {}),
                    }} />
                  </button>
                  {/* Gray divider */}
                  {i < days.length - 1 && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 9, right: 23,
                      height: 1,
                      background: adjActive ? 'transparent' : '#C7C7CC',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Stops card — always at the top ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div ref={dragContainerRef} style={{
            background: '#fff',
            borderRadius: '0 16px 16px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            padding: '10px 8px 10px',
          }}>
              {stops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: '#8E8E93' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: .25, display: 'block', marginBottom: 8 }}>
                    add_location_alt</span>
                  <span style={{ fontSize: 14 }}>No stops for this day</span>
                </div>
              ) : stops.map((stop, idx) => {
                const nm = stopName(stop);
                const tr = transitPill(stop.transitToNext);
                const pr = priceTier(stop);
                const tm = fmtTime(stop);
                const last = idx === stops.length - 1;
                const isDragging = draggingStopId === stop.id;

                return (
                  <div key={stop.id}
                    data-drag-id={stop.id}
                    data-drag-day={day.id}
                    data-drag-handle="true"
                    onPointerDown={(e) => wrappedPointerDown(e, stop.id)}
                    onPointerMove={onDragPointerMove}
                    onPointerUp={wrappedPointerUp}
                    style={{
                      position: 'relative',
                      userSelect: 'none',
                      willChange: isDragging ? 'transform' : 'auto',
                    }}
                  >
                    {/* Stop card — 3D flip container */}
                    {(() => {
                      const rot = cardRotation[stop.id] || 0;
                      const isBack = Math.round(rot / 180) % 2 !== 0;
                      return (
                    <div className="stop-card-container"
                      onTouchStart={(e) => onCardTouchStart(e, stop.id)}
                      onTouchEnd={onCardTouchEnd}
                      onMouseDown={(e) => onCardMouseDown(e, stop.id)}
                      onMouseUp={onCardMouseUp}
                      style={{ perspective: 900, width: '100%' }}>
                      <div style={{
                        position: 'relative', width: '100%',
                        transition: 'transform 0.55s cubic-bezier(.4,.0,.2,1)',
                        transformStyle: 'preserve-3d',
                        transform: `rotateY(${rot}deg)`,
                      }}>
                        {/* ── FRONT FACE ── */}
                        <div style={{
                          width: '100%', background: '#fff', borderRadius: 14, padding: '8px 6px',
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          border: 'none', textAlign: 'left', position: 'relative',
                          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                          boxShadow: isDragging
                            ? '0 12px 32px rgba(0,0,0,0.35)'
                            : '0 1px 3px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06)',
                        }}>
                          {/* badge */}
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: '#1C1C1E', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 2, position: 'relative',
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1}</span>
                            <span className="material-symbols-outlined" style={{
                              position: 'absolute', fontSize: 10, color: 'rgba(255,255,255,.45)',
                              bottom: -2, right: -2,
                            }}>drag_indicator</span>
                          </div>
                          {/* info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div onClick={() => {
                              if (draggingStopId || didDragRef.current) return;
                              setEditStop({ dayId: day.id, stop });
                            }} style={{
                              fontSize: 14, fontWeight: 600, color: '#000', lineHeight: 1.3,
                              marginBottom: 4, cursor: 'pointer',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>{nm}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {stop.rating > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 500, color: '#3C3C43' }}>
                                  <span style={{ color: '#FF3B30', fontSize: 12 }}>★</span>
                                  {Number(stop.rating).toFixed(1)}
                                </span>
                              )}
                              {tm && <span style={{ ...CHIP, cursor: 'pointer' }} onClick={(e) => {
                                e.stopPropagation();
                                if (draggingStopId || didDragRef.current) return;
                                let dayDate = day.date;
                                if (trip.startDate) {
                                  const d = new Date(trip.startDate.replace(/-/g, '/'));
                                  d.setDate(d.getDate() + dayIdx);
                                  if (!isNaN(d)) dayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                }
                                setTimePick({ dayId: day.id, stop, dayDate });
                              }}>{tm}</span>}
                              {pr && <span style={{ ...CHIP, cursor: 'pointer' }} onClick={(e) => {
                                e.stopPropagation();
                                if (draggingStopId || didDragRef.current) return;
                                setExpense({ dayId: day.id, stop });
                              }}>{pr}</span>}
                            </div>
                          </div>
                          {/* photo */}
                          {stop.photo && (
                            <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                              <img src={stop.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </div>
                          )}
                        </div>{/* end front face */}

                        {/* ── BACK FACE — Apple-style white ── */}
                        <div style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          background: '#fff', borderRadius: 14,
                          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center',
                          padding: '0 12px', gap: 10,
                          boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06)',
                        }}>
                          {[
                            { icon: 'attach_file', label: '附件' },
                            { icon: 'swap_horiz', label: 'Plan B', action: () => {
                              setPlanBStop({ dayId: day.id, stop });
                            }},
                            { icon: 'near_me', label: '导航', action: () => {
                              const dest = stop.lat && stop.lng
                                ? `${stop.lat},${stop.lng}`
                                : encodeURIComponent(stop.address || stop.location || nm);
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                            }},
                          ].map(btn => (
                            <button key={btn.label} onClick={(e) => {
                              e.stopPropagation();
                              btn.action?.();
                            }} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                              background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12,
                              cursor: 'pointer', padding: '10px 0',
                              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 6px rgba(0,0,0,.04)',
                              width: '100%', height: '100%', maxHeight: 64,
                            }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#1C1C1E' }}>{btn.icon}</span>
                              <span style={{ fontSize: 11, fontWeight: 500, color: '#3C3C43', letterSpacing: .2 }}>{btn.label}</span>
                            </button>
                          ))}
                        </div>{/* end back face */}
                      </div>
                    </div>
                      );
                    })()}{/* end stop-card-container flip wrapper */}

                    {/* Divider line + transit pill between stops */}
                    {!last && (
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        margin: '2px 4px', height: 30,
                      }}>
                        <div style={{ flex: 1, height: 1, background: '#E5E5EA' }} />
                        {tr ? (
                          <div style={PILL}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{tr.icon}</span>
                            {tr.text}
                          </div>
                        ) : (
                          <div style={{ ...PILL, color: '#AEAEB2' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>more_horiz</span>
                          </div>
                        )}
                        <div style={{ flex: 1, height: 1, background: '#E5E5EA' }} />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      </div>{/* end clip wrapper */}

      {/* ════ FLOATING MAP BUTTON ════ */}
      <button onClick={() => setPageRotation(r => r - 180)} style={{
        position: 'absolute', bottom: 84, right: 18, zIndex: 50,
        width: 52, height: 52, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,.45)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.6)',
        boxShadow: '0 0 20px rgba(0,122,255,.2), 0 4px 16px rgba(0,0,0,.08)',
        cursor: 'pointer', padding: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#007AFF' }}>map</span>
      </button>

      {/* ════ MODALS ════ */}
      {editStop && <StopEditModal stop={editStop.stop}
        onSave={p => updateStop(editStop.dayId, editStop.stop.id, p)}
        onDelete={() => deleteStop(editStop.dayId, editStop.stop.id)}
        onClose={() => setEditStop(null)} />}
      {editTrip && <TripEditModal trip={trip} onSave={updateTripMetadata} onClose={() => setEditTrip(false)} />}
      {share && <ShareModal trip={trip} onClose={() => setShare(false)} />}
      {confirm && <ConfirmModal message={confirm.message}
        onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />}
      {timePick && <TimePickerModal stop={timePick.stop} dayDate={timePick.dayDate}
        onSave={p => updateStopAndSort(timePick.dayId, timePick.stop.id, p)}
        onClose={() => setTimePick(null)} />}
      {expense && <ExpenseModal stop={expense.stop}
        onSave={p => updateStop(expense.dayId, expense.stop.id, p)}
        onDelete={() => updateStop(expense.dayId, expense.stop.id, { price: '0', expenseCategory: null })}
        onClose={() => setExpense(null)} />}
      {menu && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMenu(false)} />}

      {/* ════ PLAN B PANEL ════ */}
      {planBStop && (
        <PlanBPanel
          stop={planBStop.stop}
          dayId={planBStop.dayId}
          open={!!planBStop}
          onClose={() => setPlanBStop(null)}
          onSwap={swapPlanB}
          onAddAlternative={addPlanBAlternative}
          onRemoveAlternative={removePlanBAlternative}
        />
      )}

      {/* ════ CITY INFO MODAL (centered card) ════ */}
      {cityModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setCityModal(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', width: '100%', maxWidth: 360, maxHeight: '70vh',
            background: '#fff', borderRadius: 20,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0,0,0,.25)',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F2F2F7', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#007AFF' }}>
                  {cityModal.type === 'cuisine' ? 'restaurant' : 'tour'}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#000', fontFamily: FONT }}>
                    {cityModal.type === 'cuisine' ? 'Local Cuisine' : 'Attractions'}
                  </h3>
                  <span style={{ fontSize: 12, color: '#8E8E93' }}>{cityModal.city}</span>
                </div>
              </div>
              <button onClick={() => setCityModal(null)} style={{
                background: '#F2F2F7', border: 'none', borderRadius: '50%',
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8E8E93' }}>close</span>
              </button>
            </div>
            {/* Content — read live from cityInfo */}
            {(() => {
              const liveInfo = cityInfo?.[cityModal.city];
              const cuisineData = liveInfo?.cuisine; // { intro, items: [{ name, desc, image }] }
              const attractionsData = liveInfo?.attractions; // [{ name, desc, image }]
              const isCuisine = cityModal.type === 'cuisine';
              const items = isCuisine ? (cuisineData?.items || []) : (attractionsData || []);
              const introText = isCuisine ? cuisineData?.intro : '';

              /* Shared card renderer for both cuisine dishes and attractions */
              const renderCard = (item, idx) => {
                const name = typeof item === 'string' ? item : item.name;
                const desc = typeof item === 'string' ? '' : (item.desc || '');
                const img = typeof item === 'string' ? '' : (item.image || '');
                return (
                  <div key={idx} style={{
                    display: 'flex', gap: 10, padding: 10,
                    background: '#F8F8FA', borderRadius: 14, overflow: 'hidden',
                  }}>
                    {img ? (
                      <img src={img} alt={name} style={{
                        width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                        background: '#E5E5EA',
                      }} />
                    ) : (
                      <div style={{
                        width: 64, height: 64, borderRadius: 10, flexShrink: 0,
                        background: isCuisine ? 'linear-gradient(135deg,#FF9500,#FF6B35)' : 'linear-gradient(135deg,#007AFF,#5856D6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#fff' }}>
                          {isCuisine ? 'lunch_dining' : 'location_on'}
                        </span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', fontFamily: FONT }}>{name}</span>
                      {desc && (
                        <span style={{
                          fontSize: 12, color: '#8E8E93', fontFamily: FONT, lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{desc}</span>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div style={{ padding: '14px 18px 20px', overflowY: 'auto', flex: 1 }}>
                  {cityInfoLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
                      <span style={{ fontSize: 14, color: '#8E8E93', fontFamily: FONT }}>Loading…</span>
                    </div>
                  ) : (
                    <>
                      {introText && (
                        <p style={{
                          margin: '0 0 12px', fontSize: 13, lineHeight: 1.6, color: '#3C3C43',
                          fontFamily: FONT, paddingBottom: 12, borderBottom: '1px solid #F2F2F7',
                        }}>{introText}</p>
                      )}
                      {items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {items.map(renderCard)}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 14, color: '#8E8E93', fontFamily: FONT }}>
                          {isCuisine ? 'No cuisine information available.' : 'No attractions data available.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>{/* end front face */}

    {/* ══ BACK FACE — Map ══ */}
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
      display: 'flex', flexDirection: 'column',
      background: '#F2F2F7',
      pointerEvents: showMap ? 'auto' : 'none',
    }}>
      <style>{`
        .mobile-ios-view .map-view { height: 100% !important; flex: 1; }
        .mobile-ios-view .map-view .map-placeholder { height: 100% !important; }
        .mobile-ios-view #map-controls-row { top: 16px !important; right: 12px !important; gap: 6px !important; }
        .mobile-ios-view #map-dark-toggle,
        .mobile-ios-view #map-gps-btn { width: 32px !important; height: 32px !important; font-size: 0.85rem !important; }
        .mobile-ios-view #map-gps-btn .material-symbols-outlined { font-size: 16px !important; }
      `}</style>
      {showMap && (
        <MapPanel
          ref={mapPanelRef}
          onAddToDay={() => {}}
          focusDayIds={day ? [day.id] : []}
          isDayMode={false}
          dayId={null}
          existingPlaceIds={[]}
        />
      )}
      <button onClick={() => setPageRotation(r => r - 180)} style={{
        position: 'absolute', bottom: 84, right: 18, zIndex: 70,
        width: 52, height: 52, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,.45)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.6)',
        boxShadow: '0 0 20px rgba(0,122,255,.2), 0 4px 16px rgba(0,0,0,.08)',
        cursor: 'pointer', padding: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#007AFF' }}>event_note</span>
      </button>
    </div>
    </div>
    </div>
  );
}

/* ── tokens ───────────────────────────────────────────────── */

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

const HBTN = {
  position: 'absolute', background: 'rgba(0,0,0,.3)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10,
};

const CHIP = {
  background: '#E8E8ED', color: '#3C3C43',
  padding: '2px 8px', borderRadius: 20,
  fontSize: 11, fontWeight: 500, lineHeight: '16px', whiteSpace: 'nowrap',
};

const PILL = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 12px', borderRadius: 20,
  fontSize: 12, fontWeight: 500, color: '#3C3C43', whiteSpace: 'nowrap',
  margin: '0 8px',
};
