import { useRef, useState, useEffect, memo } from 'react';
import { useI18n } from '../../context/I18nContext';

export default memo(function DeleteConfirm({ onDelete }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!confirming) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setConfirming(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirming]);

  return (
    <div ref={ref} style={{ position: 'absolute', top: '-0.5rem', right: '0.3rem', zIndex: 5 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        style={{ background: '#1e3a5f', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '3px 5px', borderRadius: '6px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title={t('common.delete') || 'Delete'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
      </button>
      {confirming && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
            style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', fontSize: '0.78rem' }}
          >{t('common.cancel') || 'Cancel'}</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); setConfirming(false); }}
            style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >{t('common.delete') || 'Delete'}</button>
        </div>
      )}
    </div>
  );
})
