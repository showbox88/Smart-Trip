import { useRef, useState, useEffect, useMemo } from 'react';
import { PhotoCard } from './PhotoCard';
import { CollectionCard } from './CollectionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus as PlusIcon, CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';

export function VirtualGrid({ items, onContextMenu, selectedIds, onToggleSelection, onToggleDateSelection, onNavigate, onUpdateItem, onUpdateTrip, animatingTargetId, metadata, subHeader, t }) {
  const parentRef = useRef(null);
  const gridRef = useRef(null);
  
  // 统一回调：优先使用 onUpdateItem，如果未定义则回退到 onUpdateTrip
  const updateHandler = onUpdateItem || onUpdateTrip;
  
  // Selection box state
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragWasActive = useRef(false);

  // Handle mass selection from rect
  const handleMassSelection = (rect, isAppend) => {
    if (!gridRef.current) return;
    
    const cardElements = gridRef.current.querySelectorAll('[data-item-key]');
    const newlySelected = new Set(isAppend ? selectedIds : []);
    
    cardElements.forEach(el => {
      const elRect = el.getBoundingClientRect();
      const itemKey = el.getAttribute('data-item-key');
      
      // Check collision
      const isIntersecting = !(
        rect.left > elRect.right ||
        rect.right < elRect.left ||
        rect.top > elRect.bottom ||
        rect.bottom < elRect.top
      );
      
      if (isIntersecting) {
        newlySelected.add(itemKey);
      }
    });

    if (onToggleSelection) {
      onToggleSelection(newlySelected, true); 
    }
  };

  const onMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('input')) return;
    
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCurrent({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
    dragWasActive.current = false;
  };

  const onMouseMove = (e) => {
    if (!dragStart) return;
    
    const dist = Math.sqrt(Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2));
    if (dist > 5) {
      setIsDragging(true);
      setDragCurrent({ x: e.clientX, y: e.clientY });
      dragWasActive.current = true;
    }
  };

  const onMouseUp = (e) => {
    if (isDragging && dragStart && dragCurrent) {
      const rect = {
        left: Math.min(dragStart.x, dragCurrent.x),
        top: Math.min(dragStart.y, dragCurrent.y),
        right: Math.max(dragStart.x, dragCurrent.x),
        bottom: Math.max(dragStart.y, dragCurrent.y)
      };
      handleMassSelection(rect, e.shiftKey || e.ctrlKey || e.metaKey);
    }
    setDragStart(null);
    setDragCurrent(null);
    setIsDragging(false);
  };

  useEffect(() => {
    if (dragStart) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragStart, dragCurrent, isDragging]);

  const selectionBoxStyle = useMemo(() => {
    if (!dragStart || !dragCurrent || !isDragging) return null;
    return {
      left: Math.min(dragStart.x, dragCurrent.x),
      top: Math.min(dragStart.y, dragCurrent.y),
      width: Math.abs(dragStart.x - dragCurrent.x),
      height: Math.abs(dragStart.y - dragCurrent.y),
    };
  }, [dragStart, dragCurrent, isDragging]);

  const PAGE_SIZE = 21;
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
    <div
      ref={parentRef}
      onMouseDown={onMouseDown}
      onClick={() => {
        if (!dragWasActive.current) {
          onToggleSelection(new Set(), true);
        }
      }}
      className="flex-1 overflow-y-auto w-full px-10 pb-10 scroll-smooth custom-scrollbar select-none"
    >
      {subHeader}
      <div
        ref={gridRef}
        className="w-full grid gap-4"
        style={{ 
          gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' 
        }}
      >
        {visibleItems.map((item, i) => {
            const itemKey = item.type === 'photo' ? item.path : `${item.type}:${item.id}`;
            const isSelected = selectedIds.has(itemKey);

            if (item.type === 'date-header') {
              const photosOnDate = items.filter(p => p.type === 'photo' && p.date === item.date);
              const selectedOnDate = photosOnDate.filter(p => selectedIds.has(p.path));
              const isAllSelected = photosOnDate.length > 0 && selectedOnDate.length === photosOnDate.length;
              const isPartialSelected = selectedOnDate.length > 0 && selectedOnDate.length < photosOnDate.length;

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
                      {t('app.grid.photosCount').replace('{{count}}', photosOnDate.length)}
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

      <AnimatePresence>
        {selectionBoxStyle && (
          <div
            className="fixed z-[1000] border border-blue-500 bg-blue-500/20 pointer-events-none"
            style={selectionBoxStyle}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


