import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { formatDistance, formatDuration } from '../../utils/formatters';

export default function TransitInfo({ transit, transitMode, onToggleMode, onAddStop, onAddNote, onAddList }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    if (!showAddMenu && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowAddMenu(v => !v);
  };

  const hasData = transit?.duration || transit?.distance;

  const modeIcon = transitMode === 'WALK' ? 'directions_walk' : 'directions_car';
  const modeLabel = transitMode === 'WALK' ? t('itinerary.walk') || '步行' : t('itinerary.drive') || '驾车';

  return (
    <div className="transit-info-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0 0.4rem 2.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpenMenu}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
      </button>

      {showAddMenu && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            background: '#1a1d24',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
            minWidth: '150px'
          }}
        >
          <div
            className="menu-item"
            onClick={(e) => { e.stopPropagation(); onAddStop?.(); setShowAddMenu(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '0.85rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ff4d4f' }}>push_pin</span>
            {t('itinerary.add_stop') || 'Add Stop'}
          </div>
          <div
            className="menu-item"
            onClick={(e) => { e.stopPropagation(); onAddNote?.(); setShowAddMenu(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '0.85rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8b5cf6' }}>description</span>
            {t('itinerary.add_note') || 'Add Note'}
          </div>
          <div
            className="menu-item"
            onClick={(e) => { e.stopPropagation(); onAddList?.(); setShowAddMenu(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '0.85rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>check</span>
            {t('itinerary.add_list') || 'Add Checklist'}
          </div>
        </div>,
        document.body
      )}

      {hasData && (
        <>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', cursor: onToggleMode ? 'pointer' : 'default', color: 'var(--text-bright)' }}
            onClick={onToggleMode}
            title={modeLabel}
          >
            {modeIcon}
          </span>
          {transit.duration && (
            <span>{formatDuration(transit.duration, t)}</span>
          )}
          {transit.distance && (
            <span style={{ opacity: 0.7 }}>· {formatDistance(transit.distance, state.settings, t)}</span>
          )}
        </>
      )}
    </div>
  );
}
