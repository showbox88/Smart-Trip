import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
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
  const { themeId } = useTheme();
  const isBlossom = themeId === 'blossom';
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

  // ══════════════════════════════════════════════
  //  BLOSSOM — Horizontal day bubble strip
  // ══════════════════════════════════════════════
  if (isBlossom) {
    return (
      <>
        <style>{blossomSidebarCSS}</style>
        <div className="blossom-day-strip" ref={sidebarRef}>
          <div
            className="blossom-day-strip-scroll"
            ref={(el) => { navRef.current = el; listRef.current = el; }}
          >
            {(trip?.days || []).map((day, index) => {
              const isActive = day.id === activeDayId;
              const isDragging = draggingDayId === day.id;

              return (
                <button
                  key={day.id}
                  id={`nav-day-${day.id}`}
                  data-day-drag-id={day.id}
                  className={`blossom-day-pill ${isActive ? 'active' : ''}`}
                  onClick={() => handleDayClick(day.id)}
                  onPointerDown={(e) => handlePointerDown(e, day.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    zIndex: isDragging ? 100 : 1,
                  }}
                >
                  <span className="blossom-pill-label">DAY</span>
                  <span className="blossom-pill-num">{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}

            {/* Add / Remove day */}
            {!isDayMode && (
              <>
                <button
                  className="blossom-day-pill blossom-day-pill--add"
                  onClick={onAddDay}
                  title={t('itinerary.add_day') || 'Add day'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                </button>
                {(trip?.days?.length || 0) > 1 && (
                  <button
                    className="blossom-day-pill blossom-day-pill--remove"
                    onClick={onRemoveLastDay}
                    title={t('itinerary.remove_day') || 'Remove last day'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>remove</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════
  //  DEFAULT — vertical sidebar
  // ══════════════════════════════════════════════
  return (
    <aside ref={sidebarRef} className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <style>{`@media (max-width: 768px) { .add-day-text { display: none; } }`}</style>
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
                <span className="nav-day-title" style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)', fontWeight: 600 }}>{dayLabel}</span>
                <span className="nav-day-date" style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 'auto' }}>
                  {formatDayDate(day.date)}
                </span>
              </div>
              <div className="nav-day-info" style={{ paddingLeft: '20px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  {stopsCount} {t('itinerary.stops_count') || 'stops'}
                </span>
              </div>
            </li>
          );
        })}

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
        <div className="footer-icon" style={{ cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)' }}>
          <span className="material-symbols-outlined">settings</span>
        </div>
      </div>
    </aside>
  );
}

/* ────────────────────────────────────────────────────────────
 *  Blossom Day Strip — Scoped CSS
 * ──────────────────────────────────────────────────────────── */
const blossomSidebarCSS = `
  .blossom-day-strip {
    width: 100%;
    padding: 0.75rem 1rem 0.5rem;
    overflow: hidden;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
  }

  .blossom-day-strip-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    align-items: center;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .blossom-day-strip-scroll::-webkit-scrollbar {
    display: none;
  }

  /* ── Day pill (circle) ── */
  .blossom-day-pill {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface-variant);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: grab;
    font-family: var(--md-sys-typescale-headline-font);
    transition: all 0.2s ease;
    user-select: none;
    position: relative;
  }

  .blossom-day-pill:hover {
    background: rgba(254, 182, 196, 0.25);
  }

  .blossom-day-pill:active {
    transform: scale(0.95);
  }

  /* Active state — large pink circle */
  .blossom-day-pill.active {
    width: 64px;
    height: 64px;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    box-shadow: 0 6px 16px rgba(131, 75, 88, 0.18);
  }

  /* ── Label "DAY" ── */
  .blossom-pill-label {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
    color: var(--md-sys-color-primary-dim, #75404c);
    opacity: 0.7;
  }
  .blossom-day-pill.active .blossom-pill-label {
    opacity: 1;
  }

  /* ── Number "01" ── */
  .blossom-pill-num {
    font-size: 1.15rem;
    font-weight: 800;
    line-height: 1;
    margin-top: 1px;
  }
  .blossom-day-pill.active .blossom-pill-num {
    font-size: 1.3rem;
  }

  /* ── Add / Remove buttons — dashed circles ── */
  .blossom-day-pill--add,
  .blossom-day-pill--remove {
    width: 56px;
    height: 56px;
    background: transparent;
    border: 2px dashed var(--md-sys-color-outline-variant);
    color: var(--md-sys-color-outline-variant);
    cursor: pointer;
  }
  .blossom-day-pill--add:hover {
    border-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-primary);
    background: rgba(254, 182, 196, 0.08);
  }
  .blossom-day-pill--remove:hover {
    border-color: var(--md-sys-color-error, #b31b25);
    color: var(--md-sys-color-error, #b31b25);
    background: rgba(179, 27, 37, 0.06);
  }

  /* ── Mobile ── */
  @media (max-width: 600px) {
    .blossom-day-strip { padding: 0.5rem 0.75rem 0.25rem; }
    .blossom-day-pill { width: 48px; height: 48px; }
    .blossom-day-pill.active { width: 56px; height: 56px; }
    .blossom-pill-num { font-size: 1rem; }
    .blossom-day-pill.active .blossom-pill-num { font-size: 1.1rem; }
    .blossom-day-pill--add,
    .blossom-day-pill--remove { width: 48px; height: 48px; }
  }
`;
