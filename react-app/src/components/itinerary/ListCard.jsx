import { useRef, useState, useEffect, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import DeleteConfirm from './DeleteConfirm';

export default memo(function ListCard(props) {
  const { stop, dayId, dayColor, onDelete, onTitleChange, onItemChange, onItemToggle, onAddItem, onDeleteItem } = props;
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [focusIndex, setFocusIndex] = useState(null);
  const listContainerRef = useRef(null);

  useEffect(() => {
    if (focusIndex === null || !listContainerRef.current) return;
    const textareas = listContainerRef.current.querySelectorAll('textarea');
    if (textareas[focusIndex]) {
      textareas[focusIndex].focus();
    }
    setFocusIndex(null);
  }, [focusIndex, stop.items]);

  return (
    <div className={`timeline-item list-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Dot */}
      <div style={{ position: 'absolute', left: '0.75rem', top: '1rem', width: '8px', height: '8px', borderRadius: '50%', background: dayColor || '#5b7a99', opacity: 0.6, zIndex: 2 }} />

      <div
        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
        style={{
          marginLeft: '2.2rem',
          background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
          border: '1px dashed var(--glass-border)',
          borderColor: state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          position: 'relative',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
          boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none'
        }}
      >
        <DeleteConfirm onDelete={() => onDelete?.(dayId, stop.id)} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>checklist</span>
          <input
            defaultValue={stop.title || ''}
            placeholder={t('itinerary.list_title_placeholder') || 'List title...'}
            onChange={(e) => onTitleChange?.(dayId, stop.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!stop.items || stop.items.length === 0) {
                  onAddItem?.(dayId, stop.id);
                  setFocusIndex(0);
                } else {
                  setFocusIndex(0);
                }
              }
            }}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, flex: 1, fontFamily: 'inherit' }}
          />
        </div>

        <div id={`list-items-${stop.id}`} ref={listContainerRef}>
          {(stop.items || []).map((item, idx) => (
            <div key={idx} className="list-card-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <div
                onClick={() => onItemToggle?.(dayId, stop.id, idx)}
                style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, cursor: 'pointer',
                  border: '2px solid var(--text-secondary)',
                  background: item.checked ? 'var(--text-secondary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {item.checked && <span style={{ color: 'var(--bg-primary)', fontSize: '10px', fontWeight: 700 }}>✓</span>}
              </div>
              <textarea
                rows={1}
                defaultValue={item.text || ''}
                placeholder={t('itinerary.list_item_placeholder') || 'Item...'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onAddItem?.(dayId, stop.id, idx);
                    setFocusIndex(idx + 1);
                  }
                }}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  onItemChange?.(dayId, stop.id, idx, e.target.value);
                }}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-secondary)', fontSize: '0.85rem', resize: 'none',
                  overflow: 'hidden', lineHeight: 1.4, fontFamily: 'inherit',
                  textDecoration: item.checked ? 'line-through' : 'none',
                  opacity: item.checked ? 0.5 : 1,
                }}
              />
              <button
                className="list-item-delete"
                onClick={() => onDeleteItem?.(dayId, stop.id, idx)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: '2px', flexShrink: 0,
                  opacity: 0, transition: 'opacity 0.15s',
                  lineHeight: 1, display: 'flex', alignItems: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => { onAddItem?.(dayId, stop.id); setFocusIndex((stop.items || []).length); }}
          style={{ marginTop: '0.25rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
          {t('itinerary.add_item') || 'Add item'}
        </button>
      </div>
    </div>
  );
})
