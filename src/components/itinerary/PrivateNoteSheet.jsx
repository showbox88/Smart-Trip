import { useState } from 'react';

export default function PrivateNoteSheet({ stop, dayId, onSave, onClose, t }) {
  const [title, setTitle] = useState(stop.privateNoteTitle || '');
  const [content, setContent] = useState(stop.privateNote || '');
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = () => {
    onSave(title, content);
  };

  // Close on backdrop tap
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      if (isDirty) {
        if (window.confirm(t('common.discard_changes') || '放弃未保存的内容？')) onClose();
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className="sheet-backdrop"
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div className="sheet-panel" style={{
        width: '100%',
        maxHeight: '85vh',
        background: 'var(--md-sys-color-surface-variant)',
        borderRadius: '1.4rem 1.4rem 0 0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Drag handle bar */}
        <div className="sheet-drag-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1.2rem 0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-secondary)' }}>lock</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--md-sys-color-on-surface)' }}>
                {t('itinerary.back_private_note')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--st-color-text-muted)', marginTop: '1px' }}>
                📍 {stop.location}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '0.8rem' }} />

        {/* Content area */}
        <div style={{ padding: '0 1.2rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* Title input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--st-color-text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
              {t('itinerary.private_note_title_label') || '标题'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              placeholder={t('itinerary.private_note_title_placeholder') || '如：酒店确认号、取票信息...'}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'var(--md-sys-color-on-surface)', padding: '10px 12px', fontSize: '0.95rem',
                outline: 'none', fontFamily: 'inherit', fontWeight: 600,
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--md-sys-color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Content area */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--st-color-text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
              {t('itinerary.private_note_content_label') || '内容'}
            </label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
              placeholder={t('itinerary.private_note_content_placeholder') || '记录任何私密信息：确认码、密码、提醒事项...'}
              rows={7}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'var(--md-sys-color-on-surface-variant)', padding: '10px 12px', fontSize: '0.9rem',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, resize: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--md-sys-color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0.8rem 1.2rem 1.4rem', display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {t('common.cancel') || '取消'}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '0.8rem', borderRadius: '12px',
              background: 'var(--md-sys-color-primary)', border: 'none',
              color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
            {t('common.save') || '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
