import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

const DAY_COLORS = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export default function DayHeader({ day, dayIndex, isCollapsed, onToggleCollapse, onColorChange, onEditDay, onDeleteDay, onUpdateDay }) {
  const { t } = useI18n();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleValue, setSubtitleValue] = useState(day.subtitle || '');
  const colorRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const activeColor = day.color || '#5b7a99';

  const suffix = t('itinerary.day_suffix');
  const dayLabel = `${t('itinerary.day_label') || 'Day'}${dayIndex + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;

  // Close pickers on outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setShowColorPicker(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
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
        style={{ display: 'flex', alignItems: 'center', marginBottom: '0.3rem', paddingLeft: '2.25rem', paddingRight: '2.875rem', cursor: 'pointer' }}
      >
        <h3 className="day-title" style={{ margin: 0 }}>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 800, marginRight: '8px' }}>{dayLabel}</span>
          {day.name || ''}
        </h3>

        <div className="day-header-controls" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          {/* Color picker */}
          <div
            ref={colorRef}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', marginLeft: 'auto', marginRight: '15px', display: 'flex', alignItems: 'center' }}
          >
            <div
              onClick={() => setShowColorPicker(v => !v)}
              style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, cursor: 'pointer', border: '2px solid var(--glass-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'transform 0.1s' }}
              title={t('itinerary.change_color') || 'Change color'}
            />
            {showColorPicker && (
              <div
                style={{ position: 'absolute', top: '1.5rem', right: '-0.5rem', display: 'flex', flexDirection: 'row', padding: '0.4rem', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '30px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                {DAY_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => { onColorChange?.(day.id, c); setShowColorPicker(false); }}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: `2px solid ${activeColor === c ? 'var(--text-primary)' : 'transparent'}`, boxShadow: '0 2px 5px rgba(0,0,0,0.3)', transition: 'transform 0.1s' }}
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
              style={{ position: 'static', transform: 'none', padding: '0 5px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem' }}
            >⋮</button>
            {showMenu && (
              <div className="menu-dropdown show" style={{ top: '2rem', right: 0 }}>
                <button onClick={() => { onEditDay?.(day.id); setShowMenu(false); }}>
                  {t('itinerary.edit_day_label') || 'Edit day'}
                </button>
                <button className="danger" onClick={() => { onDeleteDay?.(day.id); setShowMenu(false); }}>
                  {t('common.delete') || 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtitle + collapse arrow */}
      <div className="day-subtitle-container" style={{ color: 'var(--text-secondary)', paddingLeft: '2.375rem', marginBottom: '0.3rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
        <span
          onClick={onToggleCollapse}
          style={{ cursor: 'pointer', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', marginRight: '4px', transition: 'transform 0.2s' }}
        >▼</span>
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
              borderBottom: '1px solid var(--accent-primary)', 
              outline: 'none', 
              color: 'var(--text-primary)', 
              fontSize: 'inherit', 
              fontFamily: 'inherit', 
              padding: 0, 
              minWidth: '200px' 
            }}
          />
        ) : (
          <span 
            onClick={handleSubtitleClick}
            style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', opacity: 0.8, fontWeight: 500, minHeight: '1em', minWidth: '10px', cursor: 'text' }}
          >
            {day.subtitle || t('itinerary.add_subtitle') || 'Add subtitle'}
          </span>
        )}
      </div>
    </div>
  );
}
