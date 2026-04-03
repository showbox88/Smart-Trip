import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useTrips } from '../../hooks/useTrips';

export default function ShareModal({ trip, onClose }) {
  const { t } = useI18n();
  const { setShareToken, clearShareToken } = useTrips();
  const [token, setToken] = useState(trip.share_token || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const shareUrl = token ? `${window.location.origin}/shared/${token}` : null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const newToken = await setShareToken(trip.id);
      setToken(newToken);
    } catch (e) {
      console.error('[ShareModal] setShareToken error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('[ShareModal] clipboard error:', e);
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      return;
    }
    setLoading(true);
    try {
      await clearShareToken(trip.id);
      setToken(null);
      setConfirmRevoke(false);
    } catch (e) {
      console.error('[ShareModal] clearShareToken error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)', fontSize: '20px' }}>share</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--md-sys-color-on-surface)' }}>
              {t('itinerary.share_trip') || 'Share trip'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Trip name */}
        <p style={{ margin: '0 0 1.25rem', color: 'var(--st-color-text-muted)', fontSize: '0.9rem' }}>
          {trip.title}
        </p>

        {!token ? (
          /* No token state */
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--st-color-text-muted)', opacity: 0.4, display: 'block', marginBottom: '0.75rem' }}>link_off</span>
            <p style={{ color: 'var(--st-color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {t('share.no_link') || 'No share link yet. Generate one to let anyone view this trip.'}
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                background: 'var(--md-sys-color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.6rem 1.25rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add_link</span>
              {loading ? (t('common.loading') || 'Loading...') : (t('share.generate_link') || 'Generate share link')}
            </button>
          </div>
        ) : (
          /* Token exists state */
          <div>
            <p style={{ color: 'var(--st-color-text-muted)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
              {t('share.anyone_with_link') || 'Anyone with this link can view this trip (read-only):'}
            </p>

            {/* URL box */}
            <div style={{
              background: 'var(--md-sys-color-surface-variant)',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'var(--md-sys-color-on-surface)',
              wordBreak: 'break-all',
              marginBottom: '0.85rem',
            }}>
              {shareUrl}
            </div>

            {/* Open link */}
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--md-sys-color-primary)', marginBottom: '0.85rem', textDecoration: 'none', width: 'fit-content' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
              {t('share.open_link') || 'Open in new tab'}
            </a>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  background: 'var(--md-sys-color-surface-variant)',
                  border: '1px solid var(--md-sys-color-outline)',
                  color: copied ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-on-surface)',
                  borderRadius: '8px',
                  padding: '0.55rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'color 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? (t('share.copied') || 'Copied!') : (t('share.copy_link') || 'Copy link')}
              </button>

              <button
                onClick={handleRevoke}
                disabled={loading}
                style={{
                  background: confirmRevoke ? 'var(--md-sys-color-error)' : 'transparent',
                  border: `1px solid ${confirmRevoke ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-outline)'}`,
                  color: confirmRevoke ? '#fff' : 'var(--md-sys-color-error)',
                  borderRadius: '8px',
                  padding: '0.55rem 1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link_off</span>
                {loading
                  ? (t('common.loading') || 'Loading...')
                  : confirmRevoke
                    ? (t('share.confirm_revoke') || 'Confirm revoke?')
                    : (t('share.revoke_link') || 'Revoke link')}
              </button>
            </div>

            {confirmRevoke && !loading && (
              <p style={{ color: 'var(--md-sys-color-error)', fontSize: '0.82rem', margin: 0 }}>
                {t('share.revoke_warning') || 'The current link will stop working. This cannot be undone.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
