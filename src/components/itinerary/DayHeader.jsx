import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { formatDistance, formatDuration, formatCurrency } from '../../utils/formatters';

const DAY_COLORS = ['#0e27b4ff', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899'];

export default memo(function DayHeader({
  day, dayIndex, isCollapsed, date, weekday,
  onToggleCollapse, onColorChange, onEditDay, onDeleteDay, onUpdateDay
}) {
  const { t } = useI18n();
  const { state } = useApp();

  // Sum transit durations/distances; include return-to-hotel leg when showReturnRoute is on
  const { totalDuration, totalDistance, stopCount, totalExpense } = useMemo(() => {
    const stops = day.stops || [];
    let dur = 0, dist = 0, expense = 0;
    stops.forEach(s => {
      if (s.transitToNext) {
        if (s.transitToNext.duration) dur += s.transitToNext.duration;
        if (s.transitToNext.distance) dist += s.transitToNext.distance;
      }
      // Add return-to-hotel leg if switch is on
      if (day.showReturnRoute && s.transitToHotel) {
        if (s.transitToHotel.duration) dur += s.transitToHotel.duration;
        if (s.transitToHotel.distance) dist += s.transitToHotel.distance;
      }
      if (s.price && !isNaN(parseFloat(s.price))) {
        expense += parseFloat(s.price);
      }
    });
    return {
      totalDuration: dur || null,
      totalDistance: dist || null,
      stopCount: stops.length,
      totalExpense: expense
    };
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

  // Close pickers on outside click
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
    if (editingSubtitle && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingSubtitle]);

  return (
    <div>
      {/* Title row */}
      <div
        className="day-header"
        onClick={onToggleCollapse}
        style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', paddingLeft: '1.25rem', paddingRight: '2.875rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '0.8rem 1.25rem' }}
      >
        {/* Date column: 3 rows centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '85px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '15px', marginRight: '15px' }}>
          <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>{dayLabel}</span>
          {date && (
            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap' }}>
              {date}
            </span>
          )}
          {weekday && (
            <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.72rem', fontWeight: 500, opacity: 0.6, whiteSpace: 'nowrap' }}>
              {weekday}
            </span>
          )}
        </div>

        <div className="day-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
          <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 600, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.name || ''}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Stop Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--st-color-text-muted)', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)', opacity: 0.8 }}>location_on</span>
              <span>{stopCount} {t('itinerary.stops_count') || 'Stops'}</span>
            </div>

            {/* Total Duration */}
            {totalDuration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--st-color-text-muted)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--md-sys-color-primary)', opacity: 0.8 }}>directions_car</span>
                <span>{formatDuration(totalDuration, t)}</span>
              </div>
            )}

            {/* Total Expense */}
            {totalExpense > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--md-sys-color-tertiary)', fontWeight: 800 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                <span>{formatCurrency(totalExpense, state.settings)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="day-header-controls" style={{ display: 'flex', alignItems: 'center', marginLeft: '10px', flexShrink: 0 }}>
          {/* Color picker */}
          <div
            ref={colorRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <div
              onClick={() => setShowColorPicker(v => !v)}
              style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, cursor: 'pointer', border: '2px solid var(--md-sys-color-outline)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.1s', marginRight: '15px' }}
              title={t('itinerary.change_color') || 'Change color'}
            />
            {showColorPicker && (
              <div
                style={{ position: 'absolute', top: '1.5rem', right: '0.5rem', display: 'flex', flexDirection: 'row', padding: '0.4rem', gap: '6px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '30px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                {DAY_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => { onColorChange?.(day.id, c); setShowColorPicker(false); }}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${activeColor === c ? 'var(--md-sys-color-on-surface)' : 'transparent'}`, boxShadow: '0 2px 5px rgba(0,0,0,0.3)', transition: 'transform 0.1s' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Menu */}
          <div ref={menuRef} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button
              className="menu-dots"
              onClick={() => setShowMenu(v => !v)}
              style={{ position: 'static', transform: 'none', padding: '0 5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1.2rem' }}
            >⋮</button>
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
        </div>
      </div>

      {/* Subtitle row */}
      <div className="day-subtitle-container" style={{ color: 'var(--md-sys-color-on-surface-variant)', paddingLeft: '2.375rem', paddingRight: '1.5rem', marginBottom: '0.3rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          onClick={onToggleCollapse}
          style={{ cursor: 'pointer', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', marginRight: '4px', transition: 'transform 0.2s', flexShrink: 0 }}
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
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--md-sys-color-primary)',
                outline: 'none',
                color: 'var(--md-sys-color-on-surface)',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                padding: 0,
                minWidth: '150px'
              }}
            />
          ) : (
            <span
              onClick={handleSubtitleClick}
              style={{ fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.8, fontWeight: 500, minHeight: '1em', cursor: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {day.subtitle || t('itinerary.add_subtitle') || 'Add subtitle'}
            </span>
          )}
        </div>

        {/* Show Return switch */}
        <div
          onClick={(e) => { e.stopPropagation(); onUpdateDay?.(day.id, { showReturnRoute: !day.showReturnRoute }); }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
          title={t('itinerary.show_return') || 'Show Return'}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: day.showReturnRoute ? 'var(--md-sys-color-primary)' : 'var(--st-color-text-muted)', letterSpacing: '0.04em', transition: 'color 0.2s' }}>
            {t('itinerary.show_return') || 'SHOW RETURN'}
          </span>
          {/* Mini iOS-style switch */}
          <div style={{
            width: '28px', height: '16px',
            borderRadius: '8px',
            background: day.showReturnRoute ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.15)',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute',
              top: '2px',
              left: day.showReturnRoute ? '14px' : '2px',
              width: '12px', height: '12px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
})
