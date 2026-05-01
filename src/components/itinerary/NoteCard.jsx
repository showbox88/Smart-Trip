import { useRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import DeleteConfirm from './DeleteConfirm';
import HotelLine from './HotelLine';
import { supabase } from '../../lib/supabase';
import { useEditOperations } from '../../context/EditOperationsContext';

export default memo(function NoteCard({ stop, dayId, dayColor, inHotelStay }) {
  const {
    onDeleteNote: onDelete, onUpdateNoteContent: onContentChange,
    onUpdateStop, pendingFocusId, setPendingFocusId,
  } = useEditOperations();
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const textareaRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const isFlipped = (rotation / 180) % 2 !== 0;
  const touchStartX = useRef(null);
  const [attachments, setAttachments] = useState(stop.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

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

  useEffect(() => {
    setAttachments(stop.attachments || []);
  }, [stop.attachments]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setRotation(prev => prev - 180);
    else if (diff < -50) setRotation(prev => prev + 180);
    touchStartX.current = null;
  };

  const isEvent = stop.isEvent === true;
  const toggleEventMode = () => {
    onUpdateStop?.(dayId, stop.id, { isEvent: !isEvent });
  };

  const basePath = `${state.user?.id}/${state.activeTripId}/${stop.id}/attachments`;

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `${basePath}/${fileName}`;
        const { error } = await supabase.storage.from('trip-media').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('trip-media').getPublicUrl(path);
        return { url: publicUrl, path, name: file.name, createdAt: new Date().toISOString() };
      }));
      const next = [...attachments, ...uploaded];
      setAttachments(next);
      onUpdateStop?.(dayId, stop.id, { attachments: next });
    } catch (err) {
      console.error('[NoteCard] Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (idx) => {
    const item = attachments[idx];
    try {
      if (item.path) await supabase.storage.from('trip-media').remove([item.path]);
    } catch (e) { /* silent */ }
    const next = attachments.filter((_, i) => i !== idx);
    setAttachments(next);
    onUpdateStop?.(dayId, stop.id, { attachments: next });
  };

  return (
    <div className={`timeline-item note-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline dot */}
      <div style={{ position: 'absolute', left: 'var(--timeline-line-x)', top: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: dayColor || '#5b7a99', opacity: 0.6, zIndex: 2 }} />
      {inHotelStay && <HotelLine />}

      <div
        className="note-list-card-container"
        style={{ marginLeft: 'var(--card-margin-l)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="note-list-card-inner" style={{ transform: `rotateY(${rotation}deg)` }}>

          {/* Front face */}
          <div
            className={`note-list-card-front note-mode-${isEvent ? 'event' : 'reminder'}`}
            onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
            onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
            style={{
              background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : (isEvent ? '#0a0c10' : 'rgba(10,12,16,0.55)'),
              border: '1px dashed var(--md-sys-color-outline)',
              borderColor: state.hoveredStopId === stop.id ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.05)',
              borderRadius: '0.75rem',
              padding: '0.75rem var(--note-card-px) 2.5rem',
              position: 'relative',
              transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.25s, opacity 0.25s',
              transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : (isEvent ? 'none' : 'translateX(12px)'),
              boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
              opacity: isEvent ? 1 : 0.72,
              filter: isEvent ? 'none' : 'saturate(0.6)',
            }}
          >
            <div className="drag-handle left-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
            </div>
            <div className="drag-handle right-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
            </div>

            <DeleteConfirm onDelete={() => onDelete?.(dayId, stop.id)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--st-color-text-muted)' }}>sticky_note_2</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleEventMode(); }}
                title={isEvent
                  ? (t('itinerary.note_event_tooltip') || 'Event — counted as a stop. Click to switch to Reminder.')
                  : (t('itinerary.note_reminder_tooltip') || 'Reminder — not counted. Click to switch to Event.')}
                aria-label={isEvent ? 'Note mode: Event' : 'Note mode: Reminder'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: isEvent ? 'rgba(59,130,246,0.12)' : 'rgba(148,163,184,0.10)',
                  color: isEvent ? '#60a5fa' : 'var(--st-color-text-muted)',
                  border: `1px solid ${isEvent ? 'rgba(59,130,246,0.35)' : 'rgba(148,163,184,0.25)'}`,
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  {isEvent ? 'schedule' : 'push_pin'}
                </span>
                {isEvent ? (t('itinerary.note_event') || 'Event') : (t('itinerary.note_reminder') || 'Reminder')}
              </button>
            </div>
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
                color: 'var(--md-sys-color-on-surface-variant)',
                fontSize: '0.9rem',
                resize: 'none',
                lineHeight: 1.5,
                overflow: 'hidden',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Back face - photo gallery */}
          <div className="note-list-card-back">
            {/* Minimalist Upload buttons */}
            <div className="back-content-grid" style={{ flex: '0 0 auto', padding: '0 0.5rem', marginBottom: '0.8rem' }}>
              <label 
                className="back-action-item" 
                style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                title={t('itinerary.take_photo') || '拍照'}
              >
                <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>photo_camera</span>
                <label style={{ cursor: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>{t('itinerary.take_photo') || '拍照'}</label>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
              </label>
              
              <label 
                className="back-action-item" 
                style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                title={t('itinerary.choose_photo') || '从相册选择'}
              >
                <span className="material-symbols-outlined" style={{ color: '#10b981' }}>add_photo_alternate</span>
                <label style={{ cursor: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}>{t('itinerary.choose_photo') || '相册'}</label>
                <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>

            {uploading && (
              <div style={{ textAlign: 'center', color: 'var(--md-sys-color-primary)', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>sync</span>
                {t('common.uploading') || '上传中...'}
              </div>
            )}

            {/* Horizontal Row Content */}
            <div className="back-icon-side">
              <span className="material-symbols-outlined">description</span>
            </div>

            {attachments.length === 0 ? (
              <div className="attachment-empty-row">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>image_not_supported</span>
                <span>{t('itinerary.no_attachments') || '还没有照片'}</span>
              </div>
            ) : (
              <div className="note-card-attachments-row">
                {attachments.map((att, idx) => (
                  <div key={att.path || idx} className="attachment-thumb-full">
                    <img
                      src={att.url}
                      alt=""
                      onClick={(e) => { e.stopPropagation(); setPreviewUrl(att.url); }}
                      loading="lazy"
                    />
                    <button
                      className="attachment-delete-mini"
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(idx); }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Flip Icon */}
        <div className="stop-card-flip-container">
          <button
            className="stop-card-flip-btn"
            onClick={(e) => { e.stopPropagation(); setRotation(prev => prev + 180); }}
            title={t('itinerary.flip_card') || 'Explore Back'}
          />
        </div>
      </div>

      {/* Full-screen photo preview */}
      {previewUrl && createPortal(
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}
        >
          <img src={previewUrl} alt="" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>,
        document.body
      )}
    </div>
  );
})
