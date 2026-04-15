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

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripEditor } from '../../../hooks/useTripEditor';
import { useTrips } from '../../../hooks/useTrips';
import { useI18n } from '../../../context/I18nContext';
import { useClimateData } from '../../../hooks/useClimateData';
import { useCityInfo } from '../../../hooks/useCityInfo';
import { isVisibleStop } from '../../../utils/formatters';
import { useTimelineDrag } from '../../../hooks/useTimelineDrag';
import StopEditModal from '../../modals/StopEditModal';
import TripEditModal from '../../modals/TripEditModal';
import ShareModal from '../../modals/ShareModal';
import ConfirmModal from '../../modals/ConfirmModal';
import TimePickerModal from '../../modals/TimePickerModal';
import ExpenseModal from '../../modals/ExpenseModal';
import PlanBPanel from '../PlanBPanel';
import MapPanel from '../MapPanel';
import TripCardMenu from '../../shared/TripCardMenu';
import MobileHero from './MobileHero';
import MobileDayStrip from './MobileDayStrip';
import MobileStopRow from './MobileStopRow';
import CityInfoModal from './CityInfoModal';
import { FONT } from './mobileStyles';

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
  const [cityModal, setCityModal] = useState(null);
  const [confirm, setConfirm]     = useState(null);
  const [timePick, setTimePick]   = useState(null);
  const [expense, setExpense]     = useState(null);
  const [menu, setMenu]           = useState(false);
  const [pageRotation, setPageRotation] = useState(0);
  const showMap = Math.round(pageRotation / 180) % 2 !== 0;
  const [planBStop, setPlanBStop]  = useState(null);
  const mapPanelRef = useRef(null);
  const [cardRotation, setCardRotation] = useState({});
  const swipeRef = useRef(null);

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
  const stops = (day?.stops || []).filter(isVisibleStop);

  /* ── Hero carousel state ── */
  const cities = (trip?.settings?.destinations || []).map(d => d.name).filter(Boolean);
  const totalSlides = 1 + cities.length;
  const [heroIdx, setHeroIdx] = useState(0);

  const DAY_ROW_H = 46;
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(null);
  const baseShift = dayIdx * DAY_ROW_H;

  // Day reorder drag state
  const [dayDragIdx, setDayDragIdx] = useState(null);
  const [dayDragDy, setDayDragDy] = useState(0);
  const [dayDropIdx, setDayDropIdx] = useState(null);
  const dayDragRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current == null) return;
    if (dayDragIdx != null) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    const maxShift = (days.length - 1) * DAY_ROW_H;
    const clamped = Math.max(-baseShift, Math.min(maxShift - baseShift, delta));
    setDragOffset(clamped);
  }, [baseShift, days.length, dayDragIdx]);

  const onTouchEnd = useCallback(() => {
    if (dayDragIdx != null) return;
    const totalShiftVal = baseShift + dragOffset;
    const nearest = Math.round(totalShiftVal / DAY_ROW_H);
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
      if (Math.abs(e.clientY - dayDragRef.current.startY) > 8) {
        clearTimeout(dayDragRef.current.timer);
        dayDragRef.current = null;
      }
      return;
    }
    const dy = e.clientY - dayDragRef.current.startY;
    setDayDragDy(dy);
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
        <p style={{ marginTop: 8, fontSize: 15 }}>Loading trip...</p>
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
      {/* FRONT FACE — Itinerary */}
      <div style={{
        position: 'absolute', inset: 0,
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        background: '#F2F2F7', fontFamily: FONT,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: showMap ? 'none' : 'auto',
      }}>
      <style>{`.mobile-ios-view .stop-card-container { min-height: unset !important; }`}</style>

      {/* Hero Carousel */}
      <MobileHero
        trip={trip} cities={cities} destinations={destinations}
        climateByCity={climateByCity} cityInfo={cityInfo} cityInfoLoading={cityInfoLoading}
        heroIdx={heroIdx} setHeroIdx={setHeroIdx} totalSlides={totalSlides}
        setCityModal={setCityModal}
        menuTrigger={
          <TripCardMenu
            open={menu}
            onToggle={() => setMenu(v => !v)}
            onEdit={() => { setEditTrip(true); setMenu(false); }}
            onShare={() => { setShare(true); setMenu(false); }}
            onDelete={doDelete}
            t={t}
            triggerIcon="more_horiz"
            triggerStyle={{ position: 'absolute', top: 9, right: 16, zIndex: 20 }}
          />
        }
      />

      {/* Scrollable Content Area */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'relative', zIndex: 2,
        paddingBottom: 96,
      }}>
      {/* Two-Column Body */}
      <div style={{
        display: 'flex', gap: 0, padding: '16px 12px 0',
        alignItems: 'flex-start',
      }}>

        {/* LEFT: Day nav */}
        <MobileDayStrip
          days={days} dayIdx={dayIdx} setDayIdx={setDayIdx}
          totalShift={totalShift} dragOffset={dragOffset}
          dayDragIdx={dayDragIdx} dayDragDy={dayDragDy} dayDropIdx={dayDropIdx}
          DAY_ROW_H={DAY_ROW_H}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onDayPointerDown={onDayPointerDown} onDayPointerMove={onDayPointerMove} onDayPointerUp={onDayPointerUp}
        />

        {/* RIGHT: Stops card */}
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
              ) : stops.map((stop, idx) => (
                <MobileStopRow
                  key={stop.id}
                  stop={stop} idx={idx} last={idx === stops.length - 1}
                  day={day} dayIdx={dayIdx} trip={trip}
                  draggingStopId={draggingStopId} cardRotation={cardRotation} didDragRef={didDragRef}
                  onCardTouchStart={onCardTouchStart} onCardTouchEnd={onCardTouchEnd}
                  onCardMouseDown={onCardMouseDown} onCardMouseUp={onCardMouseUp}
                  wrappedPointerDown={wrappedPointerDown} onDragPointerMove={onDragPointerMove}
                  wrappedPointerUp={wrappedPointerUp}
                  setEditStop={setEditStop} setTimePick={setTimePick}
                  setExpense={setExpense} setPlanBStop={setPlanBStop} t={t}
                />
              ))}
          </div>
        </div>
      </div>
      </div>{/* end clip wrapper */}

      {/* Floating Map Button */}
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

      {/* Modals */}
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
      {/* Backdrop to close menu on outside tap */}
      {menu && <div style={{ position: 'absolute', inset: 0, zIndex: 19 }} onClick={() => setMenu(false)} />}

      {/* Plan B Panel */}
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

      {/* City Info Modal */}
      <CityInfoModal
        cityModal={cityModal} setCityModal={setCityModal}
        cityInfo={cityInfo} cityInfoLoading={cityInfoLoading}
      />
    </div>{/* end front face */}

    {/* BACK FACE — Map */}
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
      display: 'flex', flexDirection: 'column',
      background: '#F2F2F7',
      pointerEvents: showMap ? 'auto' : 'none',
    }}>
      <style>{`
        .mobile-ios-view .map-view {
          height: 100% !important; flex: 1 !important;
          display: flex !important; flex-direction: column !important;
          overflow: visible !important; min-width: unset !important;
          min-height: 0 !important;
        }
        .mobile-ios-view .map-view .map-placeholder {
          height: 100% !important; flex: 1 !important;
          overflow: visible !important; position: relative !important;
        }
        .mobile-ios-view .map-search-control {
          z-index: 200 !important; position: absolute !important;
          top: 14px !important; left: 12px !important;
          width: calc(100% - 110px) !important;
          display: flex !important;
        }
        .mobile-ios-view .map-search-control .location-search-input {
          background: rgba(255,255,255,.92) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          color: #222 !important;
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,.12) !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          padding: 10px 40px 10px 36px !important;
        }
        .mobile-ios-view .map-search-control .location-search-input::placeholder {
          color: #999 !important;
        }
        .mobile-ios-view .map-search-control.map-dark .location-search-input {
          background: rgba(13,17,27,.85) !important;
          color: #fff !important;
          box-shadow: 0 4px 20px rgba(0,0,0,.5) !important;
        }
        .mobile-ios-view .map-search-control.map-dark .location-search-input::placeholder {
          color: rgba(255,255,255,.5) !important;
        }
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
