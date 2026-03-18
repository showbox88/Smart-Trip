import { useRef, useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';

export default function NoteCard({ stop, dayId, dayColor, onDelete, onContentChange }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const textareaRef = useRef(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteRef = useRef(null);

  useEffect(() => {
    if (!confirmingDelete) return;
    const handler = (e) => {
      if (deleteRef.current && !deleteRef.current.contains(e.target)) setConfirmingDelete(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmingDelete]);

  const autoResize = (el) => {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  return (
    <div className={`timeline-item note-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
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
        <div ref={deleteRef} style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', zIndex: 5 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmingDelete(true); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5, fontSize: '1rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
          </button>
          {confirmingDelete && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('common.delete_confirm') || 'Delete?'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
              >{t('common.cancel') || 'Cancel'}</button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(dayId, stop.id); setConfirmingDelete(false); }}
                style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >{t('common.delete') || 'Delete'}</button>
            </div>
          )}
        </div>
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
}
