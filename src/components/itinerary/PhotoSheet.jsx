import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

export default function PhotoSheet({ stop, userId, tripId, onUpdateStop, onClose, t }) {
  const [attachments, setAttachments] = useState(stop.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const basePath = `${userId}/${tripId}/${stop.id}/attachments`;

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
      onUpdateStop({ attachments: next });
    } catch (err) {
      console.error('[PhotoSheet] Upload failed:', err);
      alert(t('common.upload_failed') || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (idx) => {
    const item = attachments[idx];
    try {
      if (item.path) {
        await supabase.storage.from('trip-media').remove([item.path]);
      }
    } catch (e) {
      console.warn('[PhotoSheet] Delete from storage failed:', e);
    }
    const next = attachments.filter((_, i) => i !== idx);
    setAttachments(next);
    onUpdateStop({ attachments: next });
  };

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease' }}
    >
      <div className="sheet-panel" style={{ width: '100%', maxHeight: '88vh', background: 'var(--md-sys-color-surface-variant)', borderRadius: '1.4rem 1.4rem 0 0', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)' }}>
        {/* Drag handle */}
        <div className="sheet-drag-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.2rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>photo_library</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--md-sys-color-on-surface)' }}>{t('itinerary.back_photos')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--st-color-text-muted)', marginTop: '1px' }}>📍 {stop.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Upload buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', padding: '0.9rem 1.2rem' }}>
          {/* Camera (mobile only) */}
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.7rem', background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.4)', borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-sys-color-primary)' }}>photo_camera</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>{t('itinerary.take_photo') || '拍照'}</span>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
          </label>

          {/* Gallery */}
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.7rem', background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-sys-color-tertiary)' }}>add_photo_alternate</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-tertiary)', fontWeight: 600 }}>{t('itinerary.choose_photo') || '从相册选择'}</span>
            <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>

        {uploading && (
          <div style={{ textAlign: 'center', color: 'var(--md-sys-color-primary)', fontSize: '0.85rem', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>sync</span>
            {t('common.uploading') || '上传中...'}
          </div>
        )}

        {/* Grid of attachments */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.2rem 1.6rem' }}>
          {attachments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--st-color-text-muted)', fontSize: '0.85rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>image_not_supported</span>
              {t('itinerary.no_attachments') || '还没有附件，点上方按钮添加'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {attachments.map((att, idx) => (
                <div key={att.path || idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img
                    src={att.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    onClick={() => setPreviewUrl(att.url)}
                    loading="lazy"
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--md-sys-color-error)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen preview */}
      {previewUrl && createPortal(
        <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}>
          <img src={previewUrl} alt="" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>,
        document.body
      )}
    </div>
  );
}
