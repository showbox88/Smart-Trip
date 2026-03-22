import { useRef, useEffect, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import DeleteConfirm from './DeleteConfirm';

export default memo(function NoteCard({ stop, dayId, dayColor, onDelete, onContentChange, pendingFocusId, setPendingFocusId }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const textareaRef = useRef(null);

  const autoResize = (el) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => {
    if (pendingFocusId === stop.id && textareaRef.current) {
      textareaRef.current.focus();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, stop.id, setPendingFocusId]);

  return (
    <div className={`timeline-item note-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Dot */}
      <div style={{ position: 'absolute', left: 'var(--timeline-line-x)', top: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: dayColor || '#5b7a99', opacity: 0.6, zIndex: 2 }} />

      <div
        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
        style={{
          marginLeft: 'var(--card-margin-l)',
          background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
          border: '1px dashed var(--glass-border)',
          borderColor: state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
          borderRadius: '0.75rem',
          padding: '0.75rem var(--note-card-px)',
          position: 'relative',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
          boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none'
        }}
      >
        {/* 移动端专用的拖拽边缘把手（左右各一个，方便双手操作） */}
        <div className="drag-handle left-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
        </div>
        <div className="drag-handle right-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
        </div>

        <DeleteConfirm onDelete={() => onDelete?.(dayId, stop.id)} />
        <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>sticky_note_2</span>
        <textarea
          ref={textareaRef}
          defaultValue={stop.content || ''}
          placeholder={t('itinerary.note_placeholder') || 'Add a note...'}
          rows={1}
          onChange={(e) => {
            autoResize(e.target);
            onContentChange?.(dayId, stop.id, e.target.value);
          }}
          onInput={(e) => autoResize(e.target)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            resize: 'none',
            lineHeight: 1.5,
            overflow: 'hidden',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
})
