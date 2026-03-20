import { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { PhotoCard } from './PhotoCard';
import { CollectionCard } from './CollectionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus as PlusIcon, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';

// Isolated drag-selection overlay — renders independently so mousemove never re-renders the grid
// dragWasActiveRef: shared ref so parent's onClick can skip clear-selection after a drag
const DragSelectionBox = memo(function DragSelectionBox({ gridRef, selectedIdsRef, onToggleSelection, dragWasActiveRef }) {
  const dragStartRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (e.button !== 0 || e.target.closest('button') || e.target.closest('input')) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragWasActiveRef.current = false;
    };

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (!dragWasActiveRef.current && Math.sqrt(dx * dx + dy * dy) <= 5) return;
      dragWasActiveRef.current = true;

      if (boxRef.current) {
        const left = Math.min(dragStartRef.current.x, e.clientX);
        const top = Math.min(dragStartRef.current.y, e.clientY);
        boxRef.current.style.display = 'block';
        boxRef.current.style.left = `${left}px`;
        boxRef.current.style.top = `${top}px`;
        boxRef.current.style.width = `${Math.abs(dx)}px`;
        boxRef.current.style.height = `${Math.abs(dy)}px`;
      }
    };

    const handleMouseUp = (e) => {
      if (boxRef.current) boxRef.current.style.display = 'none';
      if (dragWasActiveRef.current && dragStartRef.current && gridRef.current) {
        const rect = {
          left: Math.min(dragStartRef.current.x, e.clientX),
          top: Math.min(dragStartRef.current.y, e.clientY),
          right: Math.max(dragStartRef.current.x, e.clientX),
          bottom: Math.max(dragStartRef.current.y, e.clientY),
        };
        // Use the ref (not stale closure) to get current selectedIds
        const currentSelected = selectedIdsRef.current;
        const newlySelected = new Set(e.shiftKey || e.ctrlKey || e.metaKey ? currentSelected : []);
        gridRef.current.querySelectorAll('[data-item-key]').forEach(el => {
          const elRect = el.getBoundingClientRect();
          if (!(rect.left > elRect.right || rect.right < elRect.left || rect.top > elRect.bottom || rect.bottom < elRect.top)) {
            newlySelected.add(el.getAttribute('data-item-key'));
          }
        });
        onToggleSelection(newlySelected, true);
      }
      dragStartRef.current = null;
      // dragWasActiveRef stays true briefly so onClick can detect it, cleared there
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // stable: all state accessed via refs, no stale closure issues

  return (
    <div
      ref={boxRef}
      style={{ display: 'none', position: 'fixed', zIndex: 1000, pointerEvents: 'none', border: '1px solid rgb(59,130,246)', background: 'rgba(59,130,246,0.15)' }}
    />
  );
});

export function VirtualGrid({ items, onContextMenu, selectedIds, onToggleSelection, onToggleDateSelection, onNavigate, onUpdateItem, onUpdateTrip, animatingTargetId, metadata, subHeader, t }) {
  const parentRef = useRef(null);
  const gridRef = useRef(null);
  const dragWasActiveRef = useRef(false);
  // Keep selectedIds in a ref so DragSelectionBox can read it without stale closures
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  // 统一回调：优先使用 onUpdateItem，如果未定义则回退到 onUpdateTrip
  const updateHandler = onUpdateItem || onUpdateTrip;

  // Memoize per-date photo counts to avoid O(n) filter on every render
  const photosByDate = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      if (item.type === 'photo') {
        if (!map.has(item.date)) map.set(item.date, []);
        map.get(item.date).push(item.path);
      }
    });
    return map;
  }, [items]);

  const handleClearSelection = useCallback(() => {
    // If this click was the end of a drag, don't clear — just reset the flag
    if (dragWasActiveRef.current) {
      dragWasActiveRef.current = false;
      return;
    }
    onToggleSelection(new Set(), true);
  }, [onToggleSelection]);

  const PAGE_SIZE = 24;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  const prevItemsKeysRef = useRef("");

  useEffect(() => {
    // Generate a stable key string for detection of "real" navigation/filter changes
    // We use item count and the first/last few keys as a heuristic
    const currentKeys = items.length > 0 
      ? `${items.length}-${items[0].type}:${items[0].id || items[0].path}-${items[items.length-1].type}:${items[items.length-1].id || items[items.length-1].path}`
      : "empty";

    if (prevItemsKeysRef.current !== currentKeys) {
        setDisplayLimit(PAGE_SIZE);
        prevItemsKeysRef.current = currentKeys;
    }
  }, [items]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && displayLimit < items.length) {
        setDisplayLimit(prev => prev + PAGE_SIZE);
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [items.length, displayLimit]);

  const visibleItems = items.slice(0, displayLimit);

  return (
    <>
    <DragSelectionBox gridRef={gridRef} selectedIdsRef={selectedIdsRef} onToggleSelection={onToggleSelection} dragWasActiveRef={dragWasActiveRef} />
    <div
      ref={parentRef}
      onClick={handleClearSelection}
      className="flex-1 overflow-y-auto w-full px-10 pb-10 scroll-smooth custom-scrollbar select-none"
    >
      {subHeader}
      <div
        ref={gridRef}
        className="w-full grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))'
        }}
      >
        {visibleItems.map((item, i) => {
            const itemKey = item.type === 'photo' ? item.path : `${item.type}:${item.id}`;
            const isSelected = selectedIds.has(itemKey);

            if (item.type === 'date-header') {
              const pathsOnDate = photosByDate.get(item.date) || [];
              const photosOnDate = pathsOnDate;
              const selectedOnDate = pathsOnDate.filter(p => selectedIds.has(p));
              const isAllSelected = pathsOnDate.length > 0 && selectedOnDate.length === pathsOnDate.length;
              const isPartialSelected = selectedOnDate.length > 0 && selectedOnDate.length < pathsOnDate.length;

              return (
                <div 
                  key={itemKey}
                  className="col-span-full py-8 first:pt-0 sticky top-0 z-50 bg-black/5 backdrop-blur-md -mx-10 px-10 mb-4 flex items-center gap-4 border-b border-white/5 group/header"
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-light tracking-tight text-white/90">
                      {item.title}
                    </h2>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDateSelection?.(item.date, !isAllSelected);
                      }}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-1 rounded-full border transition-all",
                        isAllSelected 
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-400" 
                          : (isPartialSelected ? "bg-white/5 border-white/20 text-blue-400/70" : "bg-white/5 border-white/10 text-neutral-500 hover:border-white/20 hover:text-neutral-300 opacity-0 group-hover/header:opacity-100")
                      )}
                    >
                      {isAllSelected ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Circle size={16} />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {isAllSelected ? t('app.grid.allSelected') : (isPartialSelected ? t('app.grid.partialSelected') : t('app.grid.selectAll'))}
                      </span>
                    </button>

                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      {t('app.grid.photosCount').replace('{{count}}', pathsOnDate.length)}
                    </span>
                  </div>
                  
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                </div>
              );
            }

            if (item.type === 'photo') {
              return (
                <PhotoCard
                  key={itemKey}
                  index={i}
                  onContextMenu={onContextMenu}
                  isSelected={isSelected}
                  onToggleSelection={onToggleSelection}
                  onNavigate={onNavigate}
                  onUpdate={updateHandler}
                  fileInfo={item}
                  animatingTargetId={animatingTargetId}
                  metadata={metadata}
                  t={t}
                />
              );
            }

            return (
              <CollectionCard
                key={itemKey}
                type={item.type}
                item={item.item || item}
                photos={item.photos}
                associatedEvents={item.associatedEvents}
                index={i}
                isSelected={isSelected}
                onToggleSelection={onToggleSelection}
                onUpdateTrip={updateHandler}
                onNavigate={onNavigate}
                onContextMenu={onContextMenu}
                metadata={metadata}
                t={t}
              />
            );
          })}

          <motion.div
            layout
            onClick={() => updateHandler?.('NEW_POP_MODAL')}
            className="border border-dashed border-white/8 rounded-xl flex flex-col items-center justify-center gap-1.5 text-white/20 hover:text-white/40 hover:border-white/15 transition-all cursor-pointer min-h-[180px]"
          >
            <PlusIcon size={20} />
            <span className="text-[11px] font-medium">{t('app.grid.newPage')}</span>
          </motion.div>
      </div>

      {displayLimit < items.length && (
        <div ref={sentinelRef} className="h-20 w-full flex items-center justify-center">
           <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
        </div>
      )}
    </div>
    </>
  );
}


