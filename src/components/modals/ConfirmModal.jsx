import { useI18n } from '../../context/I18nContext';

export default function ConfirmModal({ message, onConfirm, onCancel }) {
  const { t } = useI18n();

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <p style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: 'var(--md-sys-color-on-surface)' }}>
          {message || t('common.confirm_delete') || 'Are you sure?'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('common.delete') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
