import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';
import { isAdmin } from '../../utils/admin';

export default function Navbar() {
  const { state } = useApp();
  const { signOut } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        Smart<span>Trip</span>
      </div>

      {/* 
      <div className="nav-search-bar">
        <span className="material-symbols-outlined">search</span>
        <input type="text" placeholder="Search..." id="main-search" />
      </div>
      */}

      <nav>
        <ul>
        <ul />
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
                style={{ 
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {state.user.avatar ? (
                  <img 
                    src={state.user.avatar} 
                    alt={state.user.name} 
                    style={{ width: '100%', height: '100%', objectCover: 'cover' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '1.8rem', color: 'var(--text-secondary)' }}>account_circle</span>
                )}
              </div>
              {dropdownOpen && (
                <div className="user-dropdown" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px', minWidth: '180px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '4px' }}>
                    {state.user.email}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setLangMenuOpen(v => !v)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: langMenuOpen ? 'rgba(255,255,255,0.06)' : 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-text-muted)' }}>language</span>
                        {availableLanguages.find(l => l.code === language)?.label || language}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--st-color-text-muted)', transition: 'transform 0.2s', transform: langMenuOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                    </button>
                    {langMenuOpen && (
                      <div style={{ marginTop: '2px', background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        {availableLanguages.map(lang => (
                          <button
                            key={lang.code}
                            onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); setDropdownOpen(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '7px 14px', background: lang.code === language ? 'rgba(99,179,237,0.12)' : 'none', border: 'none', color: lang.code === language ? '#63b3ed' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            {lang.code === language && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                            {lang.code !== language && <span style={{ width: '14px' }} />}
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdmin(state.user) && (
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-text-muted)' }}>admin_panel_settings</span>
                      Admin Dashboard
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--md-sys-color-error)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                    {t('common.logout')}
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
