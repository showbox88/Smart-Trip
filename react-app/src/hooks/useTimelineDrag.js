import { useState, useRef, useCallback } from 'react';

const DRAG_THRESHOLD = 5;

/**
 * Cross-day pointer-based drag system for timeline cards.
 * Cards across all days are treated as a single flat list.
 * 30% overlap threshold triggers iOS-style displacement animation.
 */
export function useTimelineDrag(trip, moveStop) {
  const [draggingStopId, setDraggingStopId] = useState(null);
  const timelineRef = useRef(null);
  const dragRef = useRef(null);

  const getWrappers = useCallback(() => {
    if (!timelineRef.current) return [];
    return Array.from(timelineRef.current.querySelectorAll('[data-drag-id]'));
  }, []);

  const handlePointerDown = useCallback((e, stopId) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, textarea, a, [contenteditable]')) return;

    // Don't preventDefault or setPointerCapture yet — allow normal clicks to fire.
    // These are deferred until the drag threshold is exceeded in handlePointerMove.
    const wrapper = e.currentTarget;

    dragRef.current = {
      phase: 'pending',
      stopId,
      sourceDayId: wrapper.dataset.dragDay,
      startX: e.clientX,
      startY: e.clientY,
      wrapper,
      pointerId: e.pointerId,
    };
  }, []);

  const initDrag = useCallback((e) => {
    const wrappers = getWrappers();
    const cardData = wrappers.map((w) => ({
      el: w,
      id: w.dataset.dragId,
      dayId: w.dataset.dragDay,
      rect: w.getBoundingClientRect(),
    }));

    const originalIndex = cardData.findIndex(c => c.id === dragRef.current.stopId);
    if (originalIndex === -1) return;

    const draggedRect = cardData[originalIndex].rect;

    Object.assign(dragRef.current, {
      originalIndex,
      currentIndex: originalIndex,
      cardData,
      dragHeight: draggedRect.height,
      initialTop: draggedRect.top,
      offsetY: e.clientY - draggedRect.top,
    });

    setDraggingStopId(dragRef.current.stopId);

    // Prepare non-dragged cards for smooth displacement animation
    cardData.forEach((card, i) => {
      if (i !== originalIndex) {
        card.el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)';
      }
    });
  }, [getWrappers]);

  const updateDrag = useCallback((e) => {
    const { originalIndex, cardData, initialTop, offsetY, dragHeight } = dragRef.current;
    const dy = e.clientY - offsetY - initialTop;

    // Move dragged card visually
    const dragEl = cardData[originalIndex].el;
    dragEl.style.transform = `translateY(${dy}px) scale(1.03)`;
    dragEl.style.zIndex = '100';
    dragEl.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
    dragEl.style.transition = 'box-shadow 0.2s, scale 0.2s';

    // Calculate new insert position based on 30% overlap
    const dragTop = initialTop + dy;
    const dragBottom = dragTop + dragHeight;
    let newIndex = originalIndex;

    if (dy < 0) {
      // Moving up
      for (let i = originalIndex - 1; i >= 0; i--) {
        const card = cardData[i];
        if (dragTop <= card.rect.top + card.rect.height * 0.7) {
          newIndex = i;
        }
      }
    } else if (dy > 0) {
      // Moving down
      for (let i = originalIndex + 1; i < cardData.length; i++) {
        const card = cardData[i];
        if (dragBottom >= card.rect.top + card.rect.height * 0.3) {
          newIndex = i;
        }
      }
    }

    // Apply displacement transforms when position changes
    if (newIndex !== dragRef.current.currentIndex) {
      dragRef.current.currentIndex = newIndex;

      for (let i = 0; i < cardData.length; i++) {
        if (i === originalIndex) continue;
        let shift = 0;
        if (originalIndex < newIndex && i > originalIndex && i <= newIndex) {
          shift = -dragHeight; // shift up to fill gap
        } else if (originalIndex > newIndex && i >= newIndex && i < originalIndex) {
          shift = dragHeight; // shift down to make room
        }
        cardData[i].el.style.transform = shift ? `translateY(${shift}px)` : '';
      }
    }
  }, []);

  const finishDrag = useCallback(() => {
    const { originalIndex, currentIndex, cardData, stopId, sourceDayId } = dragRef.current;

    // Reset all inline styles
    cardData.forEach(card => {
      card.el.style.transform = '';
      card.el.style.transition = '';
      card.el.style.zIndex = '';
      card.el.style.boxShadow = '';
    });

    // Commit reorder if position changed
    if (currentIndex !== originalIndex) {
      const targetCard = cardData[currentIndex];
      const isPhantom = targetCard.id.startsWith('__empty_');

      let afterStopId;
      let targetDayId;

      if (isPhantom) {
        // Dropping onto an empty day's placeholder
        targetDayId = targetCard.dayId;
        afterStopId = null;
      } else if (currentIndex > originalIndex) {
        // Moving down: place after the card at currentIndex
        afterStopId = targetCard.id;
        targetDayId = targetCard.dayId;
      } else {
        // Moving up: place before the card at currentIndex
        targetDayId = targetCard.dayId;
        const prevCard = currentIndex > 0 ? cardData[currentIndex - 1] : null;
        if (prevCard && prevCard.dayId === targetDayId && !prevCard.id.startsWith('__empty_')) {
          // Previous card is a real card in the same day → insert after it
          afterStopId = prevCard.id;
        } else {
          // At the beginning of a day → insert at start
          afterStopId = null;
        }
      }

      moveStop?.(sourceDayId, stopId, targetDayId, afterStopId);
    }
  }, [moveStop]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;

    if (dragRef.current.phase === 'pending') {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      // Threshold exceeded — now commit to dragging
      try { dragRef.current.wrapper.setPointerCapture(dragRef.current.pointerId); } catch (_) {}
      initDrag(e);
      dragRef.current.phase = 'active';
    }

    if (dragRef.current.phase === 'active') {
      updateDrag(e);
    }
  }, [initDrag, updateDrag]);

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    if (dragRef.current.phase === 'active') {
      finishDrag();
    }
    dragRef.current = null;
    setDraggingStopId(null);
  }, [finishDrag]);

  return {
    timelineRef,
    draggingStopId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
