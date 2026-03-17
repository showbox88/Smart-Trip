import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';

export default function Navbar() {
  const { state } = useApp();
  const { signOut } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
    setDropdownOpen(false);
  };

  return (
    <header className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        Smart<span>Trip</span>
      </div>

      <div className="nav-search-bar">
        <span className="material-symbols-outlined">search</span>
        <input type="text" placeholder="Search..." id="main-search" />
      </div>

      <nav>
        <ul>
          <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>{t('dashboard.title') || 'My Trips'}</a></li>
        </ul>
      </nav>

      <div className="nav-right">
        {state.user && (
          <>
            <button className="nav-icon-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="nav-dot"></span>
            </button>
            <div className="user-profile-container">
              <div
                className="user-avatar"
                onClick={() => setDropdownOpen(v => !v)}
                style={{ cursor: 'pointer' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.8rem', color: 'var(--text-secondary)' }}>account_circle</span>
              </div>
              {dropdownOpen && (
                <div className="user-dropdown" style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '0.5rem', minWidth: '160px', zIndex: 200 }}>
                  <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.25rem' }}>
                    {state.user.email}
                  </div>
                  <button
                    onClick={toggleLanguage}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                  >
                    🌐 {language === 'zh' ? 'English' : '中文'}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                  >
                    🚪 {t('auth.logout') || 'Logout'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
