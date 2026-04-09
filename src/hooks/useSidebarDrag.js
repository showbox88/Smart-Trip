import { useState, useRef, useCallback, useEffect } from 'react';
import { getIsTouch } from './useDeviceType';

const DRAG_THRESHOLD = 5;

/**
 * Pointer-based drag system for sidebar day items.
 * Mirrors useTimelineDrag but operates on day-level reordering.
 * 30% overlap threshold triggers iOS-style displacement animation.
 *
 * Pattern: onPointerDown / onPointerMove / onPointerUp are all attached
 * to every <li> (same as timeline cards). setPointerCapture ensures events
 * keep flowing to the originating element after the drag threshold is met.
 */
export function useSidebarDrag(moveDay) {
  const [draggingDayId, setDraggingDayId] = useState(null);
  const listRef = useRef(null);
  const dragRef = useRef(null);
  const wasDragging = useRef(false);

  const getItems = useCallback(() => {
    if (!listRef.current) return [];
    return Array.from(listRef.current.querySelectorAll('[data-day-drag-id]'));
  }, []);

  /* ── pointer down ─────────────────────────────────────────────── */
  const handlePointerDown = useCallback((e, dayId) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, a, [contenteditable]')) return;

    if (getIsTouch() && e.pointerType === 'touch' && !e.target.closest('.drag-handle')) return;

    const item = e.currentTarget;

    dragRef.current = {
      phase: 'pending',
      dayId,
      startX: e.clientX,
      startY: e.clientY,
      item,
      pointerId: e.pointerId,
      isTouch: e.pointerType === 'touch',
    };

    if (e.pointerType === 'touch' && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }
  }, []);

  /* ── init: snapshot positions ──────────────────────────────────── */
  const initDrag = useCallback((e) => {
    const items = getItems();
    const itemData = items.map(el => ({
      el,
      id: el.dataset.dayDragId,
      rect: el.getBoundingClientRect(),
    }));

    const originalIndex = itemData.findIndex(c => c.id === dragRef.current.dayId);
    if (originalIndex === -1) return;

    const draggedRect = itemData[originalIndex].rect;

    Object.assign(dragRef.current, {
      originalIndex,
      currentIndex: originalIndex,
      itemData,
      dragHeight: draggedRect.height,
      initialTop: draggedRect.top,
      offsetY: e.clientY - draggedRect.top,
    });

    setDraggingDayId(dragRef.current.dayId);

    itemData.forEach((item, i) => {
      if (i !== originalIndex) {
        item.el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
      }
    });
  }, [getItems]);

  /* ── update: move card + displace neighbours ──────────────────── */
  const updateDrag = useCallback((e) => {
    const { originalIndex, itemData, initialTop, offsetY, dragHeight } = dragRef.current;
    const dy = e.clientY - offsetY - initialTop;

    const dragEl = itemData[originalIndex].el;
    dragEl.style.transform = `translateY(${dy}px) scale(1.03)`;
    dragEl.style.zIndex = '100';
    dragEl.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
    dragEl.style.transition = 'box-shadow 0.2s, scale 0.2s';

    const dragTop = initialTop + dy;
    const dragBottom = dragTop + dragHeight;
    let newIndex = originalIndex;

    if (dy < 0) {
      for (let i = originalIndex - 1; i >= 0; i--) {
        const item = itemData[i];
        if (dragTop <= item.rect.top + item.rect.height * 0.7) {
          newIndex = i;
        }
      }
    } else if (dy > 0) {
      for (let i = originalIndex + 1; i < itemData.length; i++) {
        const item = itemData[i];
        if (dragBottom >= item.rect.top + item.rect.height * 0.3) {
          newIndex = i;
        }
      }
    }

    if (newIndex !== dragRef.current.currentIndex) {
      dragRef.current.currentIndex = newIndex;

      for (let i = 0; i < itemData.length; i++) {
        if (i === originalIndex) continue;
        let shift = 0;
        if (originalIndex < newIndex && i > originalIndex && i <= newIndex) {
          shift = -dragHeight;
        } else if (originalIndex > newIndex && i >= newIndex && i < originalIndex) {
          shift = dragHeight;
        }
        itemData[i].el.style.transform = shift ? `translateY(${shift}px)` : '';
      }
    }
  }, []);

  /* ── finish: commit reorder ───────────────────────────────────── */
  const finishDrag = useCallback(() => {
    const { originalIndex, currentIndex, itemData, dayId } = dragRef.current;

    itemData.forEach(item => {
      item.el.style.transform = '';
      item.el.style.transition = '';
      item.el.style.zIndex = '';
      item.el.style.boxShadow = '';
    });

    if (currentIndex !== originalIndex) {
      wasDragging.current = true;
      let afterDayId;
      if (currentIndex > originalIndex) {
        afterDayId = itemData[currentIndex].id;
      } else {
        const prevItem = currentIndex > 0 ? itemData[currentIndex - 1] : null;
        afterDayId = prevItem ? prevItem.id : null;
      }
      moveDay?.(dayId, afterDayId);
    }
  }, [moveDay]);

  /* ── pointer move ─────────────────────────────────────────────── */
  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;

    if (dragRef.current.phase === 'pending') {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      // Capture pointer so all future events go to this element
      try { dragRef.current.item.setPointerCapture(dragRef.current.pointerId); } catch (_) {}
      initDrag(e);
      dragRef.current.phase = 'active';
    }

    if (dragRef.current.phase === 'active') {
      updateDrag(e);
    }
  }, [initDrag, updateDrag]);

  /* ── pointer up ───────────────────────────────────────────────── */
  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;

    if (dragRef.current.phase === 'active') {
      finishDrag();
    }

    dragRef.current = null;
    setDraggingDayId(null);

    setTimeout(() => { wasDragging.current = false; }, 0);
  }, [finishDrag]);

  /* ── touch fallback (same as useTimelineDrag) ─────────────────── */
  useEffect(() => {
    const handleTouchMove = (e) => {
      if (dragRef.current && (dragRef.current.phase === 'pending' || dragRef.current.phase === 'active')) {
        e.preventDefault();
        if (e.touches && e.touches.length > 0) {
          handlePointerMove({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY,
            preventDefault: () => {},
          });
        }
      }
    };

    const handleTouchEnd = () => {
      if (dragRef.current && (dragRef.current.phase === 'pending' || dragRef.current.phase === 'active')) {
        handlePointerUp();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handlePointerMove, handlePointerUp]);

  return {
    listRef,
    draggingDayId,
    wasDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
