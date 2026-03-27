import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useSidebarGlow } from '../../hooks/useSidebarGlow';
import { useSidebarDrag } from '../../hooks/useSidebarDrag';

function formatDayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TripSidebar({ trip, activeDayId, onAddDay, onRemoveLastDay, onDayClick, moveDay, isDayMode = false }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const isCollapsed = state.sidebarCollapsed;
  const sidebarRef = useSidebarGlow(isCollapsed);

  const {
    listRef,
    draggingDayId,
    wasDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useSidebarDrag(moveDay);

  const handleDayClick = (dayId) => {
    if (wasDragging.current) return;
    if (onDayClick) {
      onDayClick(dayId);
    } else {
      const el = document.getElementById(dayId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [highlight, setHighlight] = useState({ opacity: 0, transform: 'translate(0, 0)', height: 0, width: 0, color: 'transparent' });
  const navRef = useRef(null);

  const handleMouseEnter = (e, color) => {
    if (draggingDayId) return;
    const item = e.currentTarget;
    setHighlight({
      opacity: 1,
      transform: `translate(${item.offsetLeft}px, ${item.offsetTop}px)`,
      width: item.offsetWidth,
      height: item.offsetHeight,
      color: color
    });
  };

  const handleMouseLeave = () => {
    setHighlight(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <aside ref={sidebarRef} className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className="sidebar-toggle"
        onClick={() => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !isCollapsed })}
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </div>

      <ul
        className="trip-navigation"
        id="sidebar-nav"
        ref={(el) => { navRef.current = el; listRef.current = el; }}
        onMouseLeave={handleMouseLeave}
        style={{ flex: 1, marginTop: '1rem', position: 'relative' }}
      >
        <div
          className="nav-highlight"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${highlight.width}px`,
            height: `${highlight.height}px`,
            transform: highlight.transform,
            borderRadius: '10px',
            background: highlight.color === 'transparent' ? 'transparent' : `${highlight.color}26`,
            outline: `2px solid ${highlight.color}`,
            outlineOffset: '-2px',
            opacity: highlight.opacity,
            transition: 'all 0.25s ease',
            pointerEvents: 'none',
            zIndex: 10
          }}
        />

        {(trip?.days || []).map((day, index) => {
          const activeColor = day.color || '#5b7a99';
          const suffix = t('itinerary.day_suffix');
          const dayLabel = `${t('itinerary.day_label') || 'Day'}${index + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;
          const stopsCount = (day.stops || []).filter(s => s.type === 'location' || !s.type).length;
          const isDragging = draggingDayId === day.id;

          return (
            <li
              key={day.id}
              id={`nav-day-${day.id}`}
              data-day-drag-id={day.id}
              className={day.id === activeDayId ? 'active' : ''}
              onClick={() => handleDayClick(day.id)}
              onPointerDown={(e) => handlePointerDown(e, day.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onMouseEnter={(e) => handleMouseEnter(e, activeColor)}
              style={{
                '--active-color': activeColor,
                cursor: isDragging ? 'grabbing' : 'grab',
                position: 'relative',
                zIndex: isDragging ? 100 : 1,
                userSelect: 'none',
              }}
            >
              <div className="nav-day-main" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: '100%' }}>
                <div className="sidebar-color-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeColor, flexShrink: 0 }} />
                <span className="nav-day-short">D{index + 1}</span>
                <span className="nav-day-title" style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{dayLabel}</span>
                <span className="nav-day-date" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 'auto' }}>
                  {formatDayDate(day.date)}
                </span>
              </div>
              <div className="nav-day-info" style={{ paddingLeft: '20px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {stopsCount} {t('itinerary.stops_count') || 'stops'}
                </span>
              </div>
            </li>
          );
        })}

        {/* 单天打卡模式下隐藏添加/删除天按钮 */}
        {!isDayMode && (
          <>
            <li className="add-day-btn" onClick={onAddDay} title={t('itinerary.add_day') || 'Add day'}
              onMouseEnter={(e) => handleMouseEnter(e, '#22c55e')}>
              <span className="material-symbols-outlined">add</span>
              <span className="add-day-text">{t('itinerary.add_day') || 'Add day'}</span>
            </li>
            {(trip?.days?.length || 0) > 1 && (
              <li className="add-day-btn" onClick={onRemoveLastDay} title={t('itinerary.remove_day') || 'Remove last day'} style={{ opacity: 0.7 }}
                onMouseEnter={(e) => handleMouseEnter(e, '#ef4444')}>
                <span className="material-symbols-outlined">remove</span>
                <span className="add-day-text">{t('itinerary.remove_day') || 'Remove last day'}</span>
              </li>
            )}
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        <div className="footer-icon" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <span className="material-symbols-outlined">settings</span>
        </div>
      </div>
    </aside>
  );
}
