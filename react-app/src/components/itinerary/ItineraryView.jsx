import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripEditor } from '../../hooks/useTripEditor';
import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import { useTrips } from '../../hooks/useTrips';
import TripHeader from './TripHeader';
import TripSidebar from './TripSidebar';
import DaySection from './DaySection';
import MapPanel from './MapPanel';
import ConfirmModal from '../modals/ConfirmModal';
import StopEditModal from '../modals/StopEditModal';
import DayEditModal from '../modals/DayEditModal';
import TripEditModal from '../modals/TripEditModal';
import TimePickerModal from '../modals/TimePickerModal';
import ExpenseModal from '../modals/ExpenseModal';
import StayInfoModal from '../modals/StayInfoModal';
import { useI18n } from '../../context/I18nContext';

function scrollToNewStop(id, attempts = 0) {
  const el = document.querySelector(`.id-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (attempts < 60) {
    requestAnimationFrame(() => scrollToNewStop(id, attempts + 1));
  }
}

export default function ItineraryView({ tripId }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { deleteTrip } = useTrips();
  const {
    trip,
    addDay, deleteDay, setDayColor, updateDay,
    deleteStop, updateStop, moveStop,
    addNote, addList,
    updateNoteContent, updateListItem, toggleListItem, addListItem, deleteListItem,
    addStopFromPlace, updateTripMetadata, toggleTransitMode, toggleHotelTransitMode,
    computeTransitData, saveStayInfo,
  } = useTripEditor(tripId);

  const {
    timelineRef,
    draggingStopId,
    handlePointerDown: onDragPointerDown,
    handlePointerMove: onDragPointerMove,
    handlePointerUp: onDragPointerUp,
  } = useTimelineDrag(trip, moveStop);

  // Track active day by scroll position
  useEffect(() => {
    if (!trip?.days?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveDayIdLocal(visible.target.id);
      },
      { threshold: 0.2, rootMargin: '-10% 0px -70% 0px' }
    );
    trip.days.forEach(day => {
      const el = document.getElementById(day.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [trip?.days?.map(d => d.id).join(',')]);

  // Auto-compute transit data if missing on load
  useEffect(() => {
    if (trip?.days) {
      trip.days.forEach(day => {
        const needsCompute = day.stops.some(s => 
          (s.type === 'location' || !s.type) && s.lat && !s.transitToNext
        );
        if (needsCompute) {
          computeTransitData(day.id);
        }
      });
    }
  }, [tripId, !!trip]);

  const mapPanelRef = useRef(null);

  // Modal state
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [stopEditModal, setStopEditModal] = useState(null); // { dayId, stop }
  const [dayEditModal, setDayEditModal] = useState(null); // { day, dayIndex }
  const [tripEditModal, setTripEditModal] = useState(false);
  const [timePickerModal, setTimePickerModal] = useState(null); // { dayId, stop, dayDate }
  const [expenseModal, setExpenseModal] = useState(null); // { dayId, stop }
  const [stayInfoModal, setStayInfoModal] = useState(null); // { dayId, stopId }
  const [collapsedDays, setCollapsedDays] = useState({}); // { [dayId]: boolean }
  const [pendingInsertion, setPendingInsertion] = useState(null); // { dayId, afterStopId }
  const [activeDayIdLocal, setActiveDayIdLocal] = useState(null);

  const openConfirm = useCallback((message, onConfirm) => setConfirmModal({ message, onConfirm }), []);

  // --- Stop actions ---
  const handleDeleteStop = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  const handleEditStop = useCallback((dayId, stopId) => {
    const day = trip?.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop) setStopEditModal({ dayId, stop });
  }, [trip?.days]);

  const handleSaveStop = useCallback((dayId, stopId, patch) => {
    updateStop(dayId, stopId, patch);
  }, [updateStop]);

  const handleOpenTimePicker = useCallback((dayId, stopId) => {
    const day = trip?.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop && day) {
      let displayDate = day.date;
      if (trip.startDate) {
        const dayIdx = trip.days.findIndex(d => d.id === dayId);
        const d = new Date(trip.startDate.replace(/-/g, '/'));
        d.setDate(d.getDate() + dayIdx);
        if (!isNaN(d)) {
          displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      setTimePickerModal({ dayId, stop, dayDate: displayDate });
    }
  }, [trip?.days, trip?.startDate]);

  const handleOpenExpense = useCallback((dayId, stopId) => {
    const day = trip?.days.find(d => d.id === dayId);
    const stop = day?.stops.find(s => s.id === stopId);
    if (stop) {
      setExpenseModal({ dayId, stop });
    }
  }, [trip?.days]);

  const handleOpenStayInfo = useCallback((dayId, stopId) => {
    setStayInfoModal({ dayId, stopId });
  }, []);

  // --- Note/List delete (confirmation is handled inside the card) ---
  const handleDeleteNote = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  const handleDeleteList = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  // --- Day actions ---
  const handleDeleteDay = useCallback((dayId) => {
    openConfirm(
      t('common.confirm_delete') || 'Delete this day?',
      () => deleteDay(dayId)
    );
  }, [t, deleteDay]);

  const handleEditDay = useCallback((dayId) => {
    const dayIndex = trip?.days.findIndex(d => d.id === dayId);
    const day = trip?.days[dayIndex];
    if (day) setDayEditModal({ day, dayIndex });
  }, [trip?.days]);

  // --- Trip delete ---
  const handleDeleteTrip = useCallback((tripIdArg) => {
    openConfirm(
      t('itinerary.delete_trip') || 'Delete this trip?',
      async () => {
        await deleteTrip(tripIdArg);
        navigate('/');
      }
    );
  }, [t, deleteTrip, navigate]);

  const handleMapAddToDay = useCallback(async (dayId, placeId) => {
    const afterId = (pendingInsertion?.dayId === dayId) ? pendingInsertion.afterStopId : null;
    // Expand the target day so the new card renders
    setCollapsedDays(prev => ({ ...prev, [dayId]: false }));
    const newId = await addStopFromPlace(dayId, placeId, afterId);
    setPendingInsertion(null);
    if (newId) scrollToNewStop(newId);
  }, [pendingInsertion, addStopFromPlace]);

  // ─── 计算派生值（必须在 if (!trip) return 之前，遵守 Hooks 规则）───
  const activeDayId = activeDayIdLocal || trip?.activeDayId || trip?.days[0]?.id;

  // 计算所有当前展开的天 ID 数组
  const expandedDayIds = trip?.days?.filter(d => !collapsedDays[d.id]).map(d => d.id) || [];
  
  // 原有的逻辑保留做向下兼容或显示逻辑，但地图使用 expandedDayIds
  const expandedDayId = expandedDayIds.length > 0 ? expandedDayIds[0] : null;

  const handleToggleDayCollapse = useCallback((dayId, forceValue) => {
    setCollapsedDays(prev => ({
      ...prev,
      [dayId]: forceValue !== undefined ? forceValue : !prev[dayId]
    }));
  }, []);

  const handleAddStop = useCallback(async (dayId, placeId, afterStopId) => {
    if (placeId) {
      setCollapsedDays(prev => ({ ...prev, [dayId]: false }));
      const newId = await addStopFromPlace(dayId, placeId, afterStopId || null);
      if (newId) scrollToNewStop(newId);
    }
  }, [addStopFromPlace]);

  const handleAddNote = useCallback(async (dayId, afterId) => {
    const newId = await addNote(dayId, afterId);
    if (newId) scrollToNewStop(newId);
  }, [addNote]);

  const handleAddList = useCallback(async (dayId, afterId) => {
    const newId = await addList(dayId, afterId);
    if (newId) scrollToNewStop(newId);
  }, [addList]);

  const handleChangePhoto = useCallback((dayId, stopId, photoUrl) => {
    updateStop(dayId, stopId, { photo: photoUrl });
  }, [updateStop]);

  const handleFocusStop = useCallback((stopId) => {
    mapPanelRef.current?.focusAndOpen(stopId);
  }, []);

  const handleSidebarDayClick = useCallback((dayId) => {
    setActiveDayIdLocal(dayId);

    // Scroll to day
    const el = document.getElementById(dayId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Auto-expand this day and collapse others
    const newCollapsed = {};
    trip?.days?.forEach(d => {
      newCollapsed[d.id] = d.id !== dayId;
    });
    setCollapsedDays(newCollapsed);
  }, [trip?.days]);

  // ─── 早期返回：trip 未加载时显示 Loading ───
  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.3 }}>travel_explore</span>
          <p>Loading trip...</p>
        </div>
      </div>
    );
  }

      return (
        <div className="dashboard-view fade-in">
          <TripSidebar 
            trip={trip} 
            activeDayId={activeDayId} 
            onAddDay={addDay} 
            onDayClick={handleSidebarDayClick}
          />

          <section className="main-itinerary" id="itinerary-scroll-container">
            <TripHeader trip={trip} onDeleteTrip={handleDeleteTrip} onEditTrip={() => setTripEditModal(true)} />

            {pendingInsertion && (
              <div style={{ 
                background: 'var(--accent-primary)', 
                color: 'white', 
                padding: '8px 16px', 
                borderRadius: '12px', 
                margin: '0 2rem 1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                animation: 'slideIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                  <span>Select a place on the map to insert after this position</span>
                </div>
                <button 
                  onClick={() => setPendingInsertion(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="itinerary-timeline" ref={timelineRef} style={{ padding: 0 }}>
              {trip.days.map((day, dayIndex) => (
                <DaySection
                  key={day.id}
                  day={day}
                  dayIndex={dayIndex}
                  trip={trip}
                  isCollapsed={!!collapsedDays[day.id]}
                  onToggleCollapse={() => handleToggleDayCollapse(day.id)}
                  onAddStop={handleAddStop}
                  onDeleteStop={handleDeleteStop}
                  onEditStop={handleEditStop}
                  onToggleTransitMode={toggleTransitMode}
                  onToggleHotelTransitMode={toggleHotelTransitMode}
                  onAddNote={handleAddNote}
                  onAddList={handleAddList}
                  onDeleteNote={handleDeleteNote}
                  onUpdateNoteContent={updateNoteContent}
                  onDeleteList={handleDeleteList}
                  onUpdateListItem={updateListItem}
                  onToggleListItem={toggleListItem}
                  onAddListItem={addListItem}
                  onDeleteListItem={deleteListItem}
                  onMoveStop={moveStop}
                  draggingStopId={draggingStopId}
                  onDragPointerDown={onDragPointerDown}
                  onDragPointerMove={onDragPointerMove}
                  onDragPointerUp={onDragPointerUp}
                  onColorChange={setDayColor}
                  onEditDay={handleEditDay}
                  onDeleteDay={handleDeleteDay}
                  onUpdateDay={updateDay}
                  onOpenTimePicker={handleOpenTimePicker}
                  onOpenExpense={handleOpenExpense}
                  onOpenStayInfo={handleOpenStayInfo}
                  onChangePhoto={handleChangePhoto}
                  onFocusStop={handleFocusStop}
                />
              ))}
            </div>
          </section>

          <MapPanel ref={mapPanelRef} onAddToDay={handleMapAddToDay} focusDayIds={expandedDayIds} />

      {/* Mobile view switcher */}
      <div className="mobile-view-switcher">
        <button className="mobile-nav-btn active" data-mode="plan">
          <span className="material-symbols-outlined">event_note</span>
          {t('common.itinerary') || 'Itinerary'}
        </button>
        <button className="mobile-nav-btn" data-mode="map">
          <span className="material-symbols-outlined">map</span>
          {t('common.map') || 'Map'}
        </button>
      </div>

      {/* Modals */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {stopEditModal && (
        <StopEditModal
          stop={stopEditModal.stop}
          onSave={(patch) => handleSaveStop(stopEditModal.dayId, stopEditModal.stop.id, patch)}
          onDelete={() => deleteStop(stopEditModal.dayId, stopEditModal.stop.id)}
          onClose={() => setStopEditModal(null)}
        />
      )}

      {dayEditModal && (
        <DayEditModal
          day={dayEditModal.day}
          dayIndex={dayEditModal.dayIndex}
          onSave={(patch) => updateDay(dayEditModal.day.id, patch)}
          onClose={() => setDayEditModal(null)}
        />
      )}

      {tripEditModal && (
        <TripEditModal
          trip={trip}
          onSave={updateTripMetadata}
          onClose={() => setTripEditModal(false)}
        />
      )}

      {timePickerModal && (
        <TimePickerModal
          stop={timePickerModal.stop}
          dayDate={timePickerModal.dayDate}
          onSave={(patch) => updateStop(timePickerModal.dayId, timePickerModal.stop.id, patch)}
          onClose={() => setTimePickerModal(null)}
        />
      )}

      {expenseModal && (
        <ExpenseModal
          stop={expenseModal.stop}
          onSave={(patch) => updateStop(expenseModal.dayId, expenseModal.stop.id, patch)}
          onDelete={() => {
            updateStop(expenseModal.dayId, expenseModal.stop.id, { price: '0', expenseCategory: null });
            setExpenseModal(null);
          }}
          onClose={() => setExpenseModal(null)}
        />
      )}

      {stayInfoModal && (
        <StayInfoModal
          trip={trip}
          dayId={stayInfoModal.dayId}
          stopId={stayInfoModal.stopId}
          onSave={(stayData) => saveStayInfo(stayInfoModal.dayId, stayInfoModal.stopId, stayData)}
          onClose={() => setStayInfoModal(null)}
        />
      )}
    </div>
  );
}
