import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripEditor } from '../../hooks/useTripEditor';
import { useTimelineDrag } from '../../hooks/useTimelineDrag';
import { useTrips } from '../../hooks/useTrips';
import { useItineraryUIState } from '../../hooks/useItineraryUIState';
import { useTheme } from '../../theme';
import TripHeader from './TripHeader';
import TripSidebar from './TripSidebar';
import DaySection from './DaySection';
import MapPanel from './MapPanel';
import ConfirmModal from '../modals/ConfirmModal';
import ShareModal from '../modals/ShareModal';
import StopEditModal from '../modals/StopEditModal';
import DayEditModal from '../modals/DayEditModal';
import TripEditModal from '../modals/TripEditModal';
import TimePickerModal from '../modals/TimePickerModal';
import ExpenseModal from '../modals/ExpenseModal';
import StayInfoModal from '../modals/StayInfoModal';
import { useI18n } from '../../context/I18nContext';
import TodayScheduleModal from './TodayScheduleModal';

function scrollToNewStop(id, attempts = 0) {
  const el = document.querySelector(`.id-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (attempts < 60) {
    requestAnimationFrame(() => scrollToNewStop(id, attempts + 1));
  }
}

export default function ItineraryView({ tripId, isDayMode = false, date = null }) {
  const { t } = useI18n();
  const { themeId } = useTheme();
  const isBlossom = themeId === 'blossom';
  const navigate = useNavigate();
  const { deleteTrip } = useTrips();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const {
    trip,
    addDay, deleteDay, removeDay, setDayColor, updateDay,
    deleteStop, updateStop, updateStopAndSort, moveStop, moveDay,
    addNote, addList, addTransport, addActivity,
    updateNoteContent, updateListTitle, updateListItem, toggleListItem, addListItem, deleteListItem,
    addStopFromPlace, updateTripMetadata, toggleTransitMode, toggleHotelTransitMode,
    computeTransitData, saveStayInfo,
    addPlanBAlternative, removePlanBAlternative, swapPlanB,
  } = useTripEditor(tripId);
  const {
    mapPanelRef,
    isManualScroll,
    confirmModal,
    stopEditModal,
    dayEditModal,
    tripEditModal,
    timePickerModal,
    expenseModal,
    stayInfoModal,
    collapsedDays,
    pendingInsertion,
    activeDayId,
    pendingFocusId,
    viewMode,
    expandedDayIds,
    openConfirm,
    setStopEditModal,
    setDayEditModal,
    setTripEditModal,
    setTimePickerModal,
    setExpenseModal,
    setStayInfoModal,
    setCollapsedDays,
    setPendingInsertion,
    setActiveDayIdLocal,
    setPendingFocusId,
    setViewMode,
    closeConfirm,
    closeStopEditModal,
    closeDayEditModal,
    closeTripEditModal,
    closeTimePickerModal,
    closeExpenseModal,
    closeStayInfoModal,
    handleToggleDayCollapse,
    handleSidebarDayClick,
  } = useItineraryUIState(trip);

  const {
    timelineRef,
    draggingStopId,
    handlePointerDown: onDragPointerDown,
    handlePointerMove: onDragPointerMove,
    handlePointerUp: onDragPointerUp,
  } = useTimelineDrag(trip, moveStop);

  useEffect(() => {
    if (!trip?.days?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScroll.current) return;
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          const dayId = visible.target.id;
          if (dayId) setActiveDayIdLocal(dayId);
        }
      },
      { threshold: 0.2, rootMargin: '-10% 0px -70% 0px' }
    );

    trip.days.forEach((day) => {
      const el = document.getElementById(day.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [trip?.days, isManualScroll, setActiveDayIdLocal]);

  useEffect(() => {
    if (!trip?.days || !window.googleMapsReady) return;
    
    // Find the active day first if it needs compute, otherwise find any day
    const findNeedsCompute = (day) => {
      // Find stops that are locations and have no transit info yet
      const locationStops = day.stops.filter(s => 
        (s.type === 'location' || s.type === 'hotel_checkin' || s.type === 'hotel_checkout') && s.lat
      );
      if (locationStops.length < 2) return false;
      
      // Check if any segment is missing transit data
      for (let i = 0; i < locationStops.length - 1; i++) {
        if (!locationStops[i].transitToNext) return true;
      }
      return false;
    };

    const activeDay = trip.days.find(d => d.id === activeDayId);
    if (activeDay && findNeedsCompute(activeDay)) {
      computeTransitData(activeDay.id);
      return;
    }

    const anyDay = trip.days.find(findNeedsCompute);
    if (anyDay) {
      computeTransitData(anyDay.id);
    }
  }, [tripId, trip, computeTransitData, activeDayId]);

  const handleDeleteStop = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  const handleEditStop = useCallback((dayId, stopId) => {
    const day = trip?.days.find((item) => item.id === dayId);
    const stop = day?.stops.find((item) => item.id === stopId);
    if (stop) setStopEditModal({ dayId, stop });
  }, [trip?.days, setStopEditModal]);

  const handleSaveStop = useCallback((dayId, stopId, patch) => {
    updateStop(dayId, stopId, patch);
  }, [updateStop]);

  const handleOpenTimePicker = useCallback((dayId, stopId) => {
    const day = trip?.days.find((item) => item.id === dayId);
    const stop = day?.stops.find((item) => item.id === stopId);
    if (stop && day) {
      let displayDate = day.date;
      if (trip.startDate) {
        const dayIdx = trip.days.findIndex((item) => item.id === dayId);
        const date = new Date(trip.startDate.replace(/-/g, '/'));
        date.setDate(date.getDate() + dayIdx);
        if (!isNaN(date)) {
          displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      setTimePickerModal({ dayId, stop, dayDate: displayDate });
    }
  }, [trip, setTimePickerModal]);

  const handleOpenExpense = useCallback((dayId, stopId) => {
    const day = trip?.days.find((item) => item.id === dayId);
    const stop = day?.stops.find((item) => item.id === stopId);
    if (stop) setExpenseModal({ dayId, stop });
  }, [trip?.days, setExpenseModal]);

  const handleOpenStayInfo = useCallback((dayId, stopId) => {
    setStayInfoModal({ dayId, stopId });
  }, [setStayInfoModal]);

  const handleDeleteNote = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  const handleDeleteList = useCallback((dayId, stopId) => {
    deleteStop(dayId, stopId);
  }, [deleteStop]);

  const handleDeleteDay = useCallback((dayId) => {
    deleteDay(dayId);
  }, [deleteDay]);

  const handleRemoveLastDay = useCallback(() => {
    if (!trip?.days?.length) return;
    const lastDay = trip.days[trip.days.length - 1];
    const hasStops = (lastDay.stops || []).length > 0;
    if (hasStops) {
      openConfirm(
        t('common.clear_day_confirm') || 'This day has stops. Delete anyway?',
        () => removeDay(lastDay.id)
      );
    } else {
      removeDay(lastDay.id);
    }
  }, [trip, removeDay, openConfirm, t]);

  const handleEditDay = useCallback((dayId) => {
    const dayIndex = trip?.days.findIndex((day) => day.id === dayId);
    const day = trip?.days[dayIndex];
    if (day) setDayEditModal({ day, dayIndex });
  }, [trip?.days, setDayEditModal]);

  const handleDeleteTrip = useCallback((tripIdArg) => {
    openConfirm(
      t('itinerary.delete_trip') || 'Delete this trip?',
      async () => {
        await deleteTrip(tripIdArg);
        navigate('/');
      }
    );
  }, [t, deleteTrip, navigate, openConfirm]);

  const handleMapAddToDay = useCallback(async (dayId, placeId, useNow = false) => {
    const afterId = pendingInsertion?.dayId === dayId ? pendingInsertion.afterStopId : null;
    setCollapsedDays((prev) => ({ ...prev, [dayId]: false }));
    const newId = await addStopFromPlace(dayId, placeId, afterId, useNow);
    setPendingInsertion(null);
    if (newId) scrollToNewStop(newId);
  }, [pendingInsertion, addStopFromPlace, setCollapsedDays, setPendingInsertion]);

  const handleAddStop = useCallback(async (dayId, placeId, afterStopId) => {
    if (!placeId) return;
    setCollapsedDays((prev) => ({ ...prev, [dayId]: false }));
    const newId = await addStopFromPlace(dayId, placeId, afterStopId || null);
    if (newId) scrollToNewStop(newId);
  }, [addStopFromPlace, setCollapsedDays]);

  const handleAddNote = useCallback(async (dayId, afterId) => {
    const newId = await addNote(dayId, afterId);
    if (newId) {
      setPendingFocusId(newId);
      scrollToNewStop(newId);
    }
  }, [addNote, setPendingFocusId]);

  const handleAddList = useCallback(async (dayId, afterId) => {
    const newId = await addList(dayId, afterId);
    if (newId) {
      setPendingFocusId(newId);
      scrollToNewStop(newId);
    }
  }, [addList, setPendingFocusId]);

  const handleAddTransport = useCallback(async (dayId, afterId) => {
    const newId = await addTransport(dayId, afterId);
    if (newId) scrollToNewStop(newId);
  }, [addTransport, scrollToNewStop]);

  const handleAddActivity = useCallback(async (dayId, afterId) => {
    const newId = await addActivity(dayId, afterId);
    if (newId) scrollToNewStop(newId);
  }, [addActivity, scrollToNewStop]);

  const handleChangePhoto = useCallback((dayId, stopId, photoUrl) => {
    updateStop(dayId, stopId, { photo: photoUrl });
  }, [updateStop]);

  const handleFocusStop = useCallback((stopId) => {
    mapPanelRef.current?.focusAndOpen(stopId);
  }, [mapPanelRef]);

  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--md-sys-color-on-surface-variant)' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.3 }}>travel_explore</span>
          <p>Loading trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view fade-in">
      {/* Default sidebar (vertical, left side) — hidden for Blossom */}
      {!isDayMode && !isBlossom && (
        <TripSidebar
          trip={trip}
          activeDayId={activeDayId}
          onAddDay={addDay}
          onRemoveLastDay={handleRemoveLastDay}
          onDayClick={handleSidebarDayClick}
          moveDay={moveDay}
        />
      )}

      <section className="main-itinerary" id="itinerary-scroll-container">
        {/* Blossom: sticky block wrapping header + day strip */}
        {isBlossom ? (
          <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--md-sys-color-surface)' }}>
            <TripHeader trip={trip} onDeleteTrip={handleDeleteTrip} onEditTrip={() => setTripEditModal(true)} onShareTrip={() => setShowShareModal(true)} onShowSchedule={() => setShowScheduleModal(true)} isDayMode={isDayMode} />
            {!isDayMode && (
              <TripSidebar
                trip={trip}
                activeDayId={activeDayId}
                onAddDay={addDay}
                onRemoveLastDay={handleRemoveLastDay}
                onDayClick={handleSidebarDayClick}
                moveDay={moveDay}
              />
            )}
          </div>
        ) : (
          <TripHeader trip={trip} onDeleteTrip={handleDeleteTrip} onEditTrip={() => setTripEditModal(true)} onShareTrip={() => setShowShareModal(true)} onShowSchedule={() => setShowScheduleModal(true)} isDayMode={isDayMode} />
        )}

        {pendingInsertion && (
          <div style={{
            background: 'var(--md-sys-color-primary)',
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
            animation: 'slideIn 0.3s ease',
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
              onAddTransport={handleAddTransport}
              onAddActivity={handleAddActivity}
              onDeleteNote={handleDeleteNote}
              onUpdateNoteContent={updateNoteContent}
              onUpdateListTitle={updateListTitle}
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
              onUpdateStop={updateStop}
              onOpenTimePicker={handleOpenTimePicker}
              onOpenExpense={handleOpenExpense}
              onOpenStayInfo={handleOpenStayInfo}
              onChangePhoto={handleChangePhoto}
              onFocusStop={handleFocusStop}
              pendingFocusId={pendingFocusId}
              setPendingFocusId={setPendingFocusId}
              onSwapPlanB={swapPlanB}
              onAddPlanBAlternative={addPlanBAlternative}
              onRemovePlanBAlternative={removePlanBAlternative}
            />
          ))}
        </div>
      </section>

      <MapPanel
        ref={mapPanelRef}
        onAddToDay={handleMapAddToDay}
        focusDayIds={expandedDayIds}
        isDayMode={isDayMode}
        dayId={isDayMode ? trip?.days?.[0]?.id : null}
        existingPlaceIds={isDayMode
          ? (trip?.days?.[0]?.stops || []).map(s => s.placeId).filter(Boolean)
          : []
        }
      />

      <div className="mobile-view-switcher">
        <button
          className={`mobile-nav-btn ${viewMode === 'plan' ? 'active' : ''}`}
          onClick={() => setViewMode('plan')}
          data-mode="plan"
        >
          <span className="material-symbols-outlined">event_note</span>
          {t('common.itinerary') || 'Itinerary'}
        </button>
        <button
          className={`mobile-nav-btn ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => setViewMode('map')}
          data-mode="map"
        >
          <span className="material-symbols-outlined">map</span>
          {t('common.map') || 'Map'}
        </button>
      </div>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => {
            confirmModal.onConfirm();
            closeConfirm();
          }}
          onCancel={closeConfirm}
        />
      )}

      {showScheduleModal && (
        <TodayScheduleModal
          trip={trip}
          onUpdateStop={updateStop}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {stopEditModal && (
        <StopEditModal
          stop={stopEditModal.stop}
          onSave={(patch) => handleSaveStop(stopEditModal.dayId, stopEditModal.stop.id, patch)}
          onDelete={() => deleteStop(stopEditModal.dayId, stopEditModal.stop.id)}
          onClose={closeStopEditModal}
        />
      )}

      {dayEditModal && (
        <DayEditModal
          day={dayEditModal.day}
          dayIndex={dayEditModal.dayIndex}
          onSave={(patch) => updateDay(dayEditModal.day.id, patch)}
          onClose={closeDayEditModal}
        />
      )}

      {tripEditModal && (
        <TripEditModal
          trip={trip}
          onSave={updateTripMetadata}
          onClose={closeTripEditModal}
        />
      )}

      {timePickerModal && (
        <TimePickerModal
          stop={timePickerModal.stop}
          dayDate={timePickerModal.dayDate}
          onSave={(patch) => updateStopAndSort(timePickerModal.dayId, timePickerModal.stop.id, patch)}
          onClose={closeTimePickerModal}
        />
      )}

      {expenseModal && (
        <ExpenseModal
          stop={expenseModal.stop}
          onSave={(patch) => updateStop(expenseModal.dayId, expenseModal.stop.id, patch)}
          onDelete={() => {
            updateStop(expenseModal.dayId, expenseModal.stop.id, { price: '0', expenseCategory: null });
            closeExpenseModal();
          }}
          onClose={closeExpenseModal}
        />
      )}

      {stayInfoModal && (
        <StayInfoModal
          trip={trip}
          dayId={stayInfoModal.dayId}
          stopId={stayInfoModal.stopId}
          onSave={(stayData) => saveStayInfo(stayInfoModal.dayId, stayInfoModal.stopId, stayData)}
          onClose={closeStayInfoModal}
        />
      )}

      {showShareModal && (
        <ShareModal trip={trip} onClose={() => setShowShareModal(false)} />
      )}
    </div>
  );
}
