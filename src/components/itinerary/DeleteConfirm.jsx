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
    <div ref={ref} style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', zIndex: 5 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
        style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', lineHeight: 1, fontSize: '1.1rem' }}
        title={t('common.delete') || 'Delete'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
      </button>
      {confirming && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('common.delete_confirm') || 'Delete?'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
            style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
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
