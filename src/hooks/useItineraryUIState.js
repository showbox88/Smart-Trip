import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export function useItineraryUIState(trip) {
  const mapPanelRef = useRef(null);
  const isManualScroll = useRef(false);
  const manualScrollTimer = useRef(null);

  const [confirmModal, setConfirmModal] = useState(null);
  const [stopEditModal, setStopEditModal] = useState(null);
  const [dayEditModal, setDayEditModal] = useState(null);
  const [tripEditModal, setTripEditModal] = useState(false);
  const [timePickerModal, setTimePickerModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);
  const [stayInfoModal, setStayInfoModal] = useState(null);
  const [collapsedDays, setCollapsedDays] = useState({});
  const [pendingInsertion, setPendingInsertion] = useState(null);
  const [activeDayIdLocal, setActiveDayIdLocal] = useState(null);
  const [pendingFocusId, setPendingFocusId] = useState(null);
  const [viewMode, setViewMode] = useState('plan');

  useEffect(() => {
    document.body.classList.remove('mobile-mode-plan', 'mobile-mode-map');
    document.body.classList.add(`mobile-mode-${viewMode}`);
    return () => document.body.classList.remove('mobile-mode-plan', 'mobile-mode-map');
  }, [viewMode]);

  useEffect(() => () => {
    if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);
  }, []);

  const openConfirm = useCallback((message, onConfirm) => {
    setConfirmModal({ message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => setConfirmModal(null), []);
  const closeStopEditModal = useCallback(() => setStopEditModal(null), []);
  const closeDayEditModal = useCallback(() => setDayEditModal(null), []);
  const closeTripEditModal = useCallback(() => setTripEditModal(false), []);
  const closeTimePickerModal = useCallback(() => setTimePickerModal(null), []);
  const closeExpenseModal = useCallback(() => setExpenseModal(null), []);
  const closeStayInfoModal = useCallback(() => setStayInfoModal(null), []);

  const activeDayId = activeDayIdLocal || trip?.activeDayId || trip?.days?.[0]?.id || null;

  const expandedDayIds = useMemo(
    () => trip?.days?.filter((day) => !collapsedDays[day.id]).map((day) => day.id) || [],
    [trip?.days, collapsedDays]
  );

  const handleToggleDayCollapse = useCallback((dayId, forceValue) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dayId]: forceValue !== undefined ? forceValue : !prev[dayId],
    }));
  }, []);

  const handleSidebarDayClick = useCallback((dayId) => {
    isManualScroll.current = true;
    if (manualScrollTimer.current) clearTimeout(manualScrollTimer.current);

    setActiveDayIdLocal(dayId);
    setCollapsedDays((prev) => {
      const next = { ...prev };
      trip?.days?.forEach((day) => {
        next[day.id] = day.id !== dayId;
      });
      return next;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = document.getElementById('itinerary-scroll-container');
        const el = document.getElementById(dayId);
        if (container && el) {
          const scrollMargin = 75;
          const targetTop =
            el.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop -
            scrollMargin;
          container.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      });
    });

    manualScrollTimer.current = setTimeout(() => {
      isManualScroll.current = false;
    }, 1000);
  }, [trip?.days]);

  return {
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
  };
}
