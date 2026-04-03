import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';

export default function AuthForm() {
  const { t } = useI18n();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="login-view fade-in">
      <div className="login-bg-container">
        <img src="/assets/images/login_bg.png" className="login-bg-image" alt="Travel Background" />
        <div className="login-overlay"></div>
      </div>

      <div className="login-card-container">
        <div className="login-glass-card" id="auth-card">
          <div className="login-logo">Smart<span>Trip</span></div>
          <div className="login-tagline">{t('auth.tagline')}</div>

          <button 
            className="auth-btn-google" 
            type="button"
            onClick={() => signInWithGoogle()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.38c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.87 14.13c-.22-.67-.35-1.38-.35-2.13s.13-1.46.35-2.13V7.01H2.18C1.43 8.51 1 10.21 1 12s.43 3.49 1.18 4.99l3.69-2.86z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.69 2.87c.86-2.59 3.28-4.5 6.13-4.5z" fill="#EA4335"/>
            </svg>
            {t('auth.google_login')}
          </button>

          <div className="auth-divider">
            <span>{t('auth.or')}</span>
          </div>

          <div className="auth-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--md-sys-color-outline)' }}>
            <div
              className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
              onClick={() => setTab('signin')}
              style={{ padding: '0.5rem 0', cursor: 'pointer', flex: 1, textAlign: 'center', fontWeight: 600, color: tab === 'signin' ? 'var(--md-sys-color-primary)' : 'var(--st-color-text-muted)', borderBottom: tab === 'signin' ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent', transition: '0.3s' }}
            >
              {t('auth.login')}
            </div>
            <div
              className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
              onClick={() => setTab('signup')}
              style={{ padding: '0.5rem 0', cursor: 'pointer', flex: 1, textAlign: 'center', color: tab === 'signup' ? 'var(--md-sys-color-primary)' : 'var(--st-color-text-muted)', borderBottom: tab === 'signup' ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent', transition: '0.3s' }}
            >
              {t('auth.register')}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label htmlFor="login-email">{t('auth.email')}</label>
              <div className="auth-input-wrapper">
                <span className="material-symbols-outlined auth-input-icon">mail</span>
                <input
                  type="email"
                  id="login-email"
                  className="auth-input"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="login-password">{t('auth.password')}</label>
              <div className="auth-input-wrapper">
                <span className="material-symbols-outlined auth-input-icon">lock</span>
                <input
                  type="password"
                  id="login-password"
                  className="auth-input"
                  placeholder="******"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--st-color-text-muted)', fontSize: '0.85rem' }}>
              <input type="checkbox" id="stay-logged-in" defaultChecked style={{ accentColor: 'var(--md-sys-color-primary)' }} />
              <label htmlFor="stay-logged-in" style={{ cursor: 'pointer', marginBottom: 0 }}>{t('auth.remember_me')}</label>
            </div>

            {error && (
              <div style={{ marginTop: '0.75rem', color: 'var(--md-sys-color-error)', fontSize: '0.85rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn-main"
              style={{ marginTop: '1.5rem' }}
              disabled={loading}
            >
              <span>{loading ? '...' : t('auth.submit')}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '1rem' }}>
            {t('auth.no_plan_query')}<a href="#">{t('auth.view_sample')}</a>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', zIndex: 10, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', letterSpacing: '1px', fontWeight: 600 }}>
        PROJECT: SMART-TRIP / 2026 EDITION
      </div>
    </div>
  );
}
