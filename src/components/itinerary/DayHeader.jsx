import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { formatDistance, formatDuration, formatCurrency } from '../../utils/formatters';

const DAY_COLORS = ['#0e27b4ff', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'];

export default memo(function DayHeader({
  day, dayIndex, isCollapsed, date, weekday,
  onToggleCollapse, onColorChange, onEditDay, onDeleteDay, onUpdateDay
}) {
  const { t } = useI18n();
  const { state } = useApp();
  const { themeId } = useTheme();
  const isBlossom = themeId === 'blossom';

  const { totalDuration, totalDistance, stopCount, totalExpense } = useMemo(() => {
    const stops = day.stops || [];
    let dur = 0, dist = 0, expense = 0;
    stops.forEach(s => {
      if (s.transitToNext) {
        if (s.transitToNext.duration) dur += s.transitToNext.duration;
        if (s.transitToNext.distance) dist += s.transitToNext.distance;
      }
      if (day.showReturnRoute && s.transitToHotel) {
        if (s.transitToHotel.duration) dur += s.transitToHotel.duration;
        if (s.transitToHotel.distance) dist += s.transitToHotel.distance;
      }
      if (s.price && !isNaN(parseFloat(s.price))) {
        expense += parseFloat(s.price);
      }
    });
    return { totalDuration: dur || null, totalDistance: dist || null, stopCount: stops.length, totalExpense: expense };
  }, [day.stops, day.showReturnRoute]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleValue, setSubtitleValue] = useState(day.subtitle || '');
  const colorRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const activeColor = day.color || 'var(--st-color-timeline-default)';

  const suffix = t('itinerary.day_suffix');
  const dayLabel = `${t('itinerary.day_label') || 'Day'} ${dayIndex + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;

  useEffect(() => {
    const onMouseDown = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setShowColorPicker(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) { setShowMenu(false); setConfirmingDelete(false); }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleSubtitleBlur = () => {
    setEditingSubtitle(false);
    if (subtitleValue !== day.subtitle) {
      onUpdateDay?.(day.id, { subtitle: subtitleValue });
    }
  };

  const handleSubtitleClick = (e) => {
    e.stopPropagation();
    setEditingSubtitle(true);
  };

  useEffect(() => {
    if (editingSubtitle && inputRef.current) inputRef.current.focus();
  }, [editingSubtitle]);

  // ── Shared menu dropdown ──
  const renderMenuDropdown = () => (
    <div ref={menuRef} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
      <button
        className={isBlossom ? undefined : 'menu-dots'}
        onClick={() => setShowMenu(v => !v)}
        style={isBlossom
          ? { background: 'rgba(131,75,88,0.06)', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', padding: '4px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }
          : { position: 'static', transform: 'none', padding: '0 5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.2rem' }
        }
      >
        {isBlossom
          ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_horiz</span>
          : '⋮'
        }
      </button>
      {showMenu && (
        <div className="menu-dropdown active" style={{ top: '2rem', right: 0 }}>
          {!confirmingDelete ? (
            <>
              <button onClick={() => { onEditDay?.(day.id); setShowMenu(false); }}>
                {t('itinerary.edit_day_label') || 'Edit day'}
              </button>
              <button className="danger" onClick={() => setConfirmingDelete(true)}>
                {t('itinerary.delete_day') || 'Clear Day'}
              </button>
            </>
          ) : (
            <div style={{ padding: '0.4rem 0.2rem' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)', whiteSpace: 'normal', maxWidth: '180px', lineHeight: 1.4 }}>
                {t('common.clear_day_confirm') || 'Clear all items for this day?'}
              </p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => setConfirmingDelete(false)} style={{ flex: 1 }}>
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button className="danger" style={{ flex: 1 }} onClick={() => { onDeleteDay?.(day.id); setShowMenu(false); setConfirmingDelete(false); }}>
                  {t('common.delete') || 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════
  //  BLOSSOM LAYOUT — scrapbook-style day header
  // ══════════════════════════════════════════════
  if (isBlossom) {
    return (
      <div>
        <style>{blossomDayHeaderCSS}</style>
        {/* ── Main header row ── */}
        <div className="blossom-day-header" onClick={onToggleCollapse}>
          {/* Day bubble */}
          <div className="blossom-day-bubble" style={{ '--bubble-color': activeColor }}>
            <span className="blossom-day-bubble-label">Day</span>
            <span className="blossom-day-bubble-num">{String(dayIndex + 1).padStart(2, '0')}</span>
          </div>

          {/* Info section */}
          <div className="blossom-day-info">
            <div className="blossom-day-name-row">
              {day.name && <h3 className="blossom-day-name">{day.name}</h3>}
              {date && <span className="blossom-day-date">{date}</span>}
              {weekday && <span className="blossom-day-weekday">{weekday}</span>}
            </div>

            {/* Badges row */}
            <div className="blossom-day-badges">
              <span className="blossom-day-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                {stopCount} {t('itinerary.stops_count') || 'Stops'}
              </span>
              {totalDuration && (
                <span className="blossom-day-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                  {formatDuration(totalDuration, t)}
                </span>
              )}
              {totalExpense > 0 && (
                <span className="blossom-day-badge blossom-day-badge--expense">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>payments</span>
                  {formatCurrency(totalExpense, state.settings)}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="blossom-day-controls" onClick={(e) => e.stopPropagation()}>
            {/* Color picker */}
            <div ref={colorRef} style={{ position: 'relative' }}>
              <div
                className="blossom-color-dot"
                onClick={() => setShowColorPicker(v => !v)}
                style={{ background: activeColor }}
                title={t('itinerary.change_color') || 'Change color'}
              />
              {showColorPicker && (
                <div className="blossom-color-picker">
                  {DAY_COLORS.map(c => (
                    <div
                      key={c}
                      className={`blossom-color-option ${activeColor === c ? 'active' : ''}`}
                      style={{ background: c }}
                      onClick={() => { onColorChange?.(day.id, c); setShowColorPicker(false); }}
                    />
                  ))}
                </div>
              )}
            </div>
            {renderMenuDropdown()}
          </div>
        </div>

        {/* ── Subtitle row ── */}
        <div className="blossom-day-subtitle-row">
          <span
            onClick={onToggleCollapse}
            className="blossom-collapse-arrow"
            style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          >▼</span>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            {editingSubtitle ? (
              <input
                ref={inputRef}
                type="text"
                value={subtitleValue}
                onChange={(e) => setSubtitleValue(e.target.value)}
                onBlur={handleSubtitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleSubtitleBlur()}
                className="blossom-subtitle-input"
              />
            ) : (
              <span onClick={handleSubtitleClick} className="blossom-subtitle-text">
                {day.subtitle || t('itinerary.add_subtitle') || 'Add subtitle'}
              </span>
            )}
          </div>

          {/* Show Return switch */}
          <div
            onClick={(e) => { e.stopPropagation(); onUpdateDay?.(day.id, { showReturnRoute: !day.showReturnRoute }); }}
            className="blossom-return-switch"
            title={t('itinerary.show_return') || 'Show Return'}
          >
            <span className="blossom-return-label" style={{ color: day.showReturnRoute ? 'var(--md-sys-color-primary)' : undefined }}>
              {t('itinerary.show_return') || 'SHOW RETURN'}
            </span>
            <div className="blossom-switch-track" style={{ background: day.showReturnRoute ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)' }}>
              <div className="blossom-switch-thumb" style={{ left: day.showReturnRoute ? '14px' : '2px' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  DEFAULT LAYOUT
  // ══════════════════════════════════════════════
  return (
    <div>
      {/* Title row */}
      <div
        className="day-header"
        onClick={onToggleCollapse}
        style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', paddingLeft: '1.25rem', paddingRight: '2.875rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '0.8rem 1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '85px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '15px', marginRight: '15px' }}>
          <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>{dayLabel}</span>
          {date && <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap' }}>{date}</span>}
          {weekday && <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.72rem', fontWeight: 500, opacity: 0.6, whiteSpace: 'nowrap' }}>{weekday}</span>}
        </div>

        <div className="day-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.name || ''}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--st-color-text-muted)', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)', opacity: 0.8 }}>location_on</span>
              <span>{stopCount} {t('itinerary.stops_count') || 'Stops'}</span>
            </div>
            {totalDuration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--st-color-text-muted)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)', opacity: 0.8 }}>directions_car</span>
                <span>{formatDuration(totalDuration, t)}</span>
              </div>
            )}
            {totalExpense > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--md-sys-color-tertiary)', fontWeight: 800 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                <span>{formatCurrency(totalExpense, state.settings)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="day-header-controls" style={{ display: 'flex', alignItems: 'center', marginLeft: '10px', flexShrink: 0 }}>
          <div ref={colorRef} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div
              onClick={() => setShowColorPicker(v => !v)}
              style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, cursor: 'pointer', border: '2px solid var(--md-sys-color-outline)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.1s', marginRight: '15px' }}
              title={t('itinerary.change_color') || 'Change color'}
            />
            {showColorPicker && (
              <div style={{ position: 'absolute', top: '1.5rem', right: '0.5rem', display: 'flex', flexDirection: 'row', padding: '0.4rem', gap: '6px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '30px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {DAY_COLORS.map(c => (
                  <div key={c} onClick={() => { onColorChange?.(day.id, c); setShowColorPicker(false); }} style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${activeColor === c ? 'var(--md-sys-color-on-surface)' : 'transparent'}`, boxShadow: '0 2px 5px rgba(0,0,0,0.3)', transition: 'transform 0.1s' }} />
                ))}
              </div>
            )}
          </div>
          {renderMenuDropdown()}
        </div>
      </div>

      {/* Subtitle row */}
      <div className="day-subtitle-container" style={{ color: 'var(--md-sys-color-on-surface-variant)', paddingLeft: '2.375rem', paddingRight: '1.5rem', marginBottom: '0.3rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span onClick={onToggleCollapse} style={{ cursor: 'pointer', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', marginRight: '4px', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {editingSubtitle ? (
            <input
              ref={inputRef}
              type="text"
              value={subtitleValue}
              onChange={(e) => setSubtitleValue(e.target.value)}
              onBlur={handleSubtitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleSubtitleBlur()}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--md-sys-color-primary)', outline: 'none', color: 'var(--md-sys-color-on-surface)', fontSize: 'inherit', fontFamily: 'inherit', padding: 0, minWidth: '150px' }}
            />
          ) : (
            <span onClick={handleSubtitleClick} style={{ fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8, fontWeight: 500, minHeight: '1em', cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {day.subtitle || t('itinerary.add_subtitle') || 'Add subtitle'}
            </span>
          )}
        </div>
        <div
          onClick={(e) => { e.stopPropagation(); onUpdateDay?.(day.id, { showReturnRoute: !day.showReturnRoute }); }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
          title={t('itinerary.show_return') || 'Show Return'}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: day.showReturnRoute ? 'var(--md-sys-color-primary)' : 'var(--st-color-text-muted)', letterSpacing: '0.04em', transition: 'color 0.2s' }}>
            {t('itinerary.show_return') || 'SHOW RETURN'}
          </span>
          <div style={{ width: '28px', height: '16px', borderRadius: '8px', background: day.showReturnRoute ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: day.showReturnRoute ? '14px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
      </div>
    </div>
  );
})

/* ────────────────────────────────────────────────────────────
 *  Blossom Day Header — Scoped CSS
 * ──────────────────────────────────────────────────────────── */
const blossomDayHeaderCSS = `
  .blossom-day-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-radius: 1rem;
    transition: background 0.2s;
    margin-bottom: 0.25rem;
  }
  .blossom-day-header:hover {
    background: rgba(131, 75, 88, 0.04);
  }

  /* ── Day Bubble ── */
  .blossom-day-bubble {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(131, 75, 88, 0.12);
    font-family: var(--md-sys-typescale-headline-font);
    transition: transform 0.2s, box-shadow 0.2s;
    border: 2px solid transparent;
  }
  .blossom-day-header:hover .blossom-day-bubble {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(131, 75, 88, 0.2);
  }

  .blossom-day-bubble-label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 1;
    font-weight: 700;
    line-height: 1;
    color: var(--md-sys-color-primary-dim, #75404c);
  }

  .blossom-day-bubble-num {
    font-size: 1.15rem;
    font-weight: 800;
    line-height: 1;
    margin-top: 1px;
  }

  /* ── Info section ── */
  .blossom-day-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .blossom-day-name-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .blossom-day-name {
    margin: 0;
    font-family: var(--md-sys-typescale-headline-font);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--md-sys-color-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .blossom-day-date {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--md-sys-color-on-surface-variant);
    white-space: nowrap;
  }

  .blossom-day-weekday {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.6;
    white-space: nowrap;
  }

  /* ── Badges ── */
  .blossom-day-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .blossom-day-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-low);
    padding: 0.2rem 0.55rem;
    border-radius: 9999px;
  }

  .blossom-day-badge--expense {
    color: var(--md-sys-color-tertiary);
    background: rgba(182, 13, 61, 0.08);
    font-weight: 800;
  }

  /* ── Controls ── */
  .blossom-day-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .blossom-color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--md-sys-color-outline-variant);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .blossom-color-dot:hover {
    transform: scale(1.15);
    box-shadow: 0 2px 8px rgba(131, 75, 88, 0.2);
  }

  .blossom-color-picker {
    position: absolute;
    top: 1.75rem;
    right: 0;
    display: flex;
    gap: 6px;
    padding: 0.45rem 0.6rem;
    background: var(--md-sys-color-surface-container-lowest);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 9999px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(131, 75, 88, 0.12);
  }

  .blossom-color-option {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.15s;
  }
  .blossom-color-option:hover { transform: scale(1.2); }
  .blossom-color-option.active {
    border-color: var(--md-sys-color-on-surface);
    box-shadow: 0 0 0 2px var(--md-sys-color-surface-container-lowest);
  }

  /* ── Subtitle row ── */
  .blossom-day-subtitle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 1rem 0 4.5rem;
    margin-bottom: 0.3rem;
    font-size: 0.9rem;
    color: var(--md-sys-color-on-surface-variant);
  }

  .blossom-collapse-arrow {
    cursor: pointer;
    display: inline-block;
    font-size: 0.7rem;
    transition: transform 0.2s;
    flex-shrink: 0;
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.5;
  }

  .blossom-subtitle-input {
    background: transparent;
    border: none;
    border-bottom: 1.5px solid var(--md-sys-color-primary);
    outline: none;
    color: var(--md-sys-color-on-surface);
    font-size: inherit;
    font-family: inherit;
    padding: 0;
    min-width: 150px;
  }

  .blossom-subtitle-text {
    font-size: 0.85rem;
    color: var(--md-sys-color-on-surface-variant);
    opacity: 0.7;
    font-weight: 500;
    min-height: 1em;
    cursor: text;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-style: italic;
  }

  /* ── Return switch ── */
  .blossom-return-switch {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    flex-shrink: 0;
    user-select: none;
  }

  .blossom-return-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--md-sys-color-on-surface-variant);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition: color 0.2s;
  }

  .blossom-switch-track {
    width: 28px;
    height: 16px;
    border-radius: 8px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .blossom-switch-thumb {
    position: absolute;
    top: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Mobile responsive ── */
  @media (max-width: 600px) {
    .blossom-day-bubble { width: 44px; height: 44px; }
    .blossom-day-bubble-num { font-size: 1rem; }
    .blossom-day-bubble-label { font-size: 0.5rem; }
    .blossom-day-name { font-size: 0.92rem; }
    .blossom-day-subtitle-row { padding-left: 3.75rem; }
    .blossom-day-badges { gap: 0.3rem; }
    .blossom-day-badge { font-size: 0.65rem; padding: 0.15rem 0.4rem; }
  }
`;
