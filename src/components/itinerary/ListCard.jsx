import { useRef, useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import DeleteConfirm from './DeleteConfirm';
import HotelLine from './HotelLine';
import { supabase } from '../../lib/supabase';

export default memo(function ListCard(props) {
  const { stop, dayId, dayColor, onDelete, onTitleChange, onItemChange, onItemToggle, onAddItem, onDeleteItem, onUpdateStop, pendingFocusId, setPendingFocusId, inHotelStay } = props;
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [focusIndex, setFocusIndex] = useState(null);
  const listContainerRef = useRef(null);
  const titleRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const touchStartX = useRef(null);
  const [attachments, setAttachments] = useState(stop.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (pendingFocusId === stop.id && titleRef.current) {
      titleRef.current.focus();
      setPendingFocusId(null);
    }
  }, [pendingFocusId, stop.id, setPendingFocusId]);

  useEffect(() => {
    if (focusIndex === null || !listContainerRef.current) return;
    const textareas = listContainerRef.current.querySelectorAll('textarea');
    if (textareas[focusIndex]) {
      textareas[focusIndex].focus();
    }
    setFocusIndex(null);
  }, [focusIndex, stop.items]);

  useEffect(() => {
    setAttachments(stop.attachments || []);
  }, [stop.attachments]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setIsFlipped(true);
    else if (diff < -50) setIsFlipped(false);
    touchStartX.current = null;
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
      console.error('[ListCard] Upload failed:', err);
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
    <div className={`timeline-item list-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline dot */}
      <div style={{ position: 'absolute', left: 'var(--timeline-line-x)', top: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: dayColor || '#5b7a99', opacity: 0.6, zIndex: 2 }} />
      {inHotelStay && <HotelLine />}

      <div
        className="note-list-card-container"
        style={{ marginLeft: 'var(--card-margin-l)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`note-list-card-inner${isFlipped ? ' is-flipped' : ''}`}>

          {/* Front face */}
          <div
            className="note-list-card-front"
            onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
            onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
            style={{
              background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
              border: '1px dashed var(--glass-border)',
              borderColor: state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
              borderRadius: '0.75rem',
              padding: '0.75rem var(--note-card-px)',
              position: 'relative',
              transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s, transform 0.25s',
              transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
              boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>checklist</span>
              <input
                ref={titleRef}
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

          {/* Back face - photo gallery */}
          <div className="note-list-card-back">
            {/* Minimalist Upload buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem', justifyContent: 'flex-start' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.4)', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0 }} title={t('itinerary.take_photo') || '拍照'}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#3b82f6' }}>photo_camera</span>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0 }} title={t('itinerary.choose_photo') || '从相册选择'}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10b981' }}>add_photo_alternate</span>
                <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>

            {uploading && (
              <div style={{ textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>sync</span>
                {t('common.uploading') || '上传中...'}
              </div>
            )}

            {/* Photo grid */}
            {attachments.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '0.3rem', opacity: 0.35 }}>image_not_supported</span>
                {t('itinerary.no_attachments') || '还没有照片'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                {attachments.map((att, idx) => (
                  <div key={att.path || idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img
                      src={att.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                      onClick={() => setPreviewUrl(att.url)}
                      loading="lazy"
                    />
                    <button
                      onClick={() => handleDeletePhoto(idx)}
                      style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff6b6b' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Swipe-back hint */}
            <div className="flip-back-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>swipe_right</span>
              <span>{t('itinerary.swipe_back') || '右滑返回'}</span>
            </div>
          </div>

        </div>

        {/* Indicator dots (desktop only) */}
        <div className="stop-card-dots">
          <div className={`stop-card-dot${!isFlipped ? ' active' : ''}`} onClick={() => setIsFlipped(false)} />
          <div className={`stop-card-dot${isFlipped ? ' active' : ''}`} onClick={() => setIsFlipped(true)} />
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
