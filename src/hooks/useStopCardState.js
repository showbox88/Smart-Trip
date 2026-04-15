/**
 * useStopCardState — UI state and event handlers for StopCard.
 * Extracts all useState, useRef, useEffect, and derived handlers.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { checkApiAllowed, logApiCall } from '../utils/apiGuard';
import { uploadToSupabase } from '../utils/uploadHelpers';

export function useStopCardState(stop, dayId, userId, t, callbacks) {
  const { onDelete, onOpenTimePicker, onOpenExpense, onChangePhoto } = callbacks;

  // ── UI state ──
  const [showPlanB, setShowPlanB] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showPrivateNoteSheet, setShowPrivateNoteSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  const isFlipped = (rotation / 180) % 2 !== 0;

  // ── Refs ──
  const touchStart = useRef(null);
  const thumbRef = useRef(null);
  const pickerRef = useRef(null);
  const deleteRef = useRef(null);

  // ── Outside-click handler ──
  useEffect(() => {
    if (!showPhotoPicker && !confirmingDelete) return;
    const handler = (e) => {
      if (showPhotoPicker &&
          pickerRef.current && !pickerRef.current.contains(e.target) &&
          thumbRef.current && !thumbRef.current.contains(e.target)) {
        setShowPhotoPicker(false);
      }
      if (confirmingDelete &&
          deleteRef.current && !deleteRef.current.contains(e.target)) {
        setConfirmingDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPhotoPicker, confirmingDelete]);

  // ── Event handlers ──

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    setConfirmingDelete(true);
  }, []);

  const handleConfirmDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(dayId, stop.id);
    setConfirmingDelete(false);
  }, [onDelete, dayId, stop.id]);

  const handleTimeClick = useCallback((e) => {
    e.stopPropagation();
    onOpenTimePicker?.(dayId, stop.id);
  }, [onOpenTimePicker, dayId, stop.id]);

  const handleExpenseClick = useCallback((e) => {
    e.stopPropagation();
    onOpenExpense?.(dayId, stop.id);
  }, [onOpenExpense, dayId, stop.id]);

  const handleSelectPhoto = useCallback((photoUrl) => {
    onChangePhoto?.(dayId, stop.id, photoUrl);
    setShowPhotoPicker(false);
  }, [onChangePhoto, dayId, stop.id]);

  const handlePhotoClick = useCallback(async (e) => {
    e.stopPropagation();
    if (!stop.placeId || typeof google === 'undefined') return;
    if (showPhotoPicker) { setShowPhotoPicker(false); return; }
    setShowPhotoPicker(true);
    setLoadingPhotos(true);
    try {
      const { allowed } = await checkApiAllowed('place_details', userId);
      if (!allowed) {
        console.warn('[StopCard] place_details blocked by guard');
        setPlacePhotos([]);
        setLoadingPhotos(false);
        return;
      }
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: stop.placeId });
      await place.fetchFields({ fields: ['photos'] });
      logApiCall('place_details', userId, 'success');
      const photos = place.photos || [];
      setPlacePhotos(photos.map(p => ({
        url: p.getURI({ maxWidth: 400, maxHeight: 300 }),
        urlFull: p.getURI({ maxWidth: 1200, maxHeight: 900 }),
      })));
    } catch (err) {
      console.error('[StopCard] fetch photos failed:', err);
      setPlacePhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [stop.placeId, showPhotoPicker, userId]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadToSupabase(file);
      handleSelectPhoto(publicUrl);
    } catch (err) {
      console.error('[StopCard] Upload error:', err);
      alert(t('common.fetch_error') || 'Upload error');
    }
  }, [handleSelectPhoto, t]);

  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    if (diff > 50) {
      setRotation(prev => prev - 180);
    } else if (diff < -50) {
      setRotation(prev => prev + 180);
    }
    touchStart.current = null;
  }, []);

  return {
    // State
    showPlanB, setShowPlanB,
    showActivityDetail, setShowActivityDetail,
    showPhotoPicker, setShowPhotoPicker,
    placePhotos,
    loadingPhotos,
    confirmingDelete, setConfirmingDelete,
    rotation, isFlipped,
    showPrivateNoteSheet, setShowPrivateNoteSheet,
    showPhotoSheet, setShowPhotoSheet,
    // Refs
    thumbRef, pickerRef, deleteRef,
    // Handlers
    handleDelete, handleConfirmDelete,
    handleTimeClick, handleExpenseClick,
    handlePhotoClick, handleSelectPhoto, handleFileUpload,
    handleTouchStart, handleTouchEnd,
  };
}
