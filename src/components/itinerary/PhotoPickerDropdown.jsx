import { useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';

const PhotoPickerDropdown = forwardRef(function PhotoPickerDropdown(
  { anchorEl, loading, photos, currentPhoto, noPhotosText, uploadText, onSelect, onUpload },
  ref
) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const rect = anchorEl.getBoundingClientRect();
  const top = rect.bottom + 6;
  const right = window.innerWidth - rect.right;

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top, right,
          zIndex: 10000,
          background: 'var(--md-sys-color-surface-variant)',
          border: '1px solid var(--md-sys-color-outline)',
          borderRadius: '12px',
          padding: '0.5rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          width: '280px',
          maxHeight: '340px',
          overflowY: 'auto'
        }}
      >
        {/* Upload Local Button */}
        <div style={{ marginBottom: '0.6rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0.6rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px dashed var(--md-sys-color-outline)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--md-sys-color-on-surface-variant)',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            fontWeight: 600
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
            {uploadText}
            <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Current photo preview */}
        {currentPhoto && (
          <div
            onClick={() => setPreviewUrl(currentPhoto)}
            style={{ marginBottom: '0.5rem', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid var(--md-sys-color-outline)', position: 'relative' }}
          >
            <img src={currentPhoto} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} alt="" />
            <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>zoom_in</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--st-color-text-muted)', fontSize: '0.85rem' }}>Loading...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--st-color-text-muted)', fontSize: '0.85rem' }}>{noPhotosText}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {photos.map((p, i) => (
              <div
                key={i}
                onClick={() => onSelect(p.urlFull)}
                style={{ cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', aspectRatio: '1', border: p.urlFull === currentPhoto ? '2px solid var(--md-sys-color-primary)' : '1px solid transparent' }}
              >
                <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen preview */}
      {previewUrl && createPortal(
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}
        >
          <img
            src={previewUrl}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          />
        </div>,
        document.body
      )}
    </>
  );
});

export default PhotoPickerDropdown;
