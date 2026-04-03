import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import { PRESET_THEMES } from '../../theme/presetThemes';
import { isAdmin } from '../../utils/admin';

const LAYOUT_GROUPS = [
  { key: 'glass', label: 'Glass', icon: 'blur_on' },
  { key: 'clean', label: 'Clean', icon: 'light_mode' },
];

export default function Navbar() {
  const { state } = useApp();
  const { layoutVariant, applyPresetTheme, themeId } = useTheme();
  const { signOut } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const groupedThemes = useMemo(() => {
    const groups = {};
    for (const g of LAYOUT_GROUPS) groups[g.key] = [];
    for (const preset of PRESET_THEMES) {
      const variant = preset.theme.layout?.variant || 'glass';
      if (groups[variant]) groups[variant].push(preset);
      else groups[variant] = [preset];
    }
    return groups;
  }, []);

  // Hide navbar in clean layout (bottom nav replaces it)
  if (layoutVariant === 'clean') return null;

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
                  <span className="material-symbols-outlined" style={{ fontSize: '1.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>account_circle</span>
                )}
              </div>
              {dropdownOpen && (
                <div className="user-dropdown" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px', minWidth: '180px', zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                  <div style={{ padding: '0.5rem 0.75rem', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '4px' }}>
                    {state.user.email}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setLangMenuOpen(v => !v)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: langMenuOpen ? 'rgba(255,255,255,0.06)' : 'none', border: 'none', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
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
                            style={{ width: '100%', textAlign: 'left', padding: '7px 14px', background: lang.code === language ? 'rgba(99,179,237,0.12)' : 'none', border: 'none', color: lang.code === language ? '#63b3ed' : 'var(--md-sys-color-on-surface)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            {lang.code === language && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                            {lang.code !== language && <span style={{ width: '14px' }} />}
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Theme picker */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setThemeMenuOpen(v => !v)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: themeMenuOpen ? 'rgba(255,255,255,0.06)' : 'none', border: 'none', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-text-muted)' }}>palette</span>
                        Theme
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--st-color-text-muted)', transition: 'transform 0.2s', transform: themeMenuOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                    </button>
                    {themeMenuOpen && (
                      <div style={{ marginTop: '2px', background: 'var(--md-sys-color-surface-container-lowest)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                        {LAYOUT_GROUPS.map((group) => {
                          const themes = groupedThemes[group.key] || [];
                          if (!themes.length) return null;
                          return (
                            <div key={group.key} style={{ marginBottom: '4px' }}>
                              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--st-color-text-muted)', letterSpacing: '0.05em', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{group.icon}</span>
                                {group.label}
                              </div>
                              {themes.map((preset) => {
                                const isActive = themeId === preset.id;
                                const colors = preset.theme.colors;
                                return (
                                  <button
                                    key={preset.id}
                                    onClick={() => { applyPresetTheme(preset.id, preset.theme); }}
                                    style={{ width: '100%', textAlign: 'left', padding: '6px 10px', background: isActive ? `${colors.primary}20` : 'none', border: 'none', color: isActive ? colors.primary : 'var(--md-sys-color-on-surface)', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }}
                                  >
                                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                      {[colors.primary, colors.secondary, colors.tertiary].map((c, i) => (
                                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                                      ))}
                                    </div>
                                    <span>{preset.emoji} {preset.theme.name}</span>
                                    {isActive && <span className="material-symbols-outlined" style={{ fontSize: '14px', marginLeft: 'auto' }}>check</span>}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {isAdmin(state.user) && (
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}
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
