export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--md-sys-color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.9rem' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
