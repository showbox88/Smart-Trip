import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { useSystemAlerts } from '../../hooks/useSystemAlerts';
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
  const [bellOpen, setBellOpen] = useState(false);
  const { alerts, unackCount, markAck, markAllAck } = useSystemAlerts();
  // Captured at dropdown-open time so age strings are stable across re-renders.
  // eslint-disable-next-line react-hooks/purity, react-hooks/exhaustive-deps -- Date.now() refresh keyed off bellOpen is intentional
  const nowMs = useMemo(() => Date.now(), [bellOpen]);
  // Click-outside-to-close for bell + user dropdowns. We listen on mousedown
  // (not click) so the close happens before any subsequent button click fires —
  // avoids needing per-button stopPropagation hacks.
  const bellRef = useRef(null);
  const userRef = useRef(null);
  useEffect(() => {
    if (!bellOpen && !dropdownOpen) return undefined;
    const onDocMouseDown = (e) => {
      if (bellOpen && bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
      if (dropdownOpen && userRef.current && !userRef.current.contains(e.target)) {
        setDropdownOpen(false);
        // Collapse any inner submenus so reopening starts clean.
        setLangMenuOpen(false);
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [bellOpen, dropdownOpen]);

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
            <div className="bell-container" ref={bellRef} style={{ position: 'relative' }}>
              <button
                className="nav-icon-btn"
                onClick={() => setBellOpen((v) => !v)}
                title={unackCount > 0 ? `${unackCount} 条未读告警` : '通知'}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unackCount > 0 && (
                  <span className="nav-dot" style={{
                    position: 'absolute', top: 4, right: 4,
                    minWidth: 16, height: 16, padding: '0 4px',
                    borderRadius: 8, background: '#ef4444', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unackCount > 9 ? '9+' : unackCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="bell-dropdown" style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  background: 'var(--md-sys-color-surface-container-lowest)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: 8, minWidth: 320, maxHeight: 420, overflowY: 'auto',
                  zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0 8px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 6,
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>通知</span>
                    {unackCount > 0 && (
                      <button
                        onClick={markAllAck}
                        style={{
                          background: 'none', border: 'none', color: '#63b3ed',
                          cursor: 'pointer', fontSize: 12,
                        }}
                      >全部标记已读</button>
                    )}
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '16px 8px', color: 'var(--st-color-text-muted)', fontSize: 13, textAlign: 'center' }}>
                      暂无通知
                    </div>
                  ) : (
                    [...alerts]
                      .sort((a, b) => (a.acknowledged === b.acknowledged ? 0 : a.acknowledged ? 1 : -1))
                      .map((a) => {
                        const REASON = {
                          'disabled': '管理员关闭',
                          'daily_limit': '触发日限额',
                          '2min_limit': '触发 2 分钟限额',
                        };
                        const ageMs = nowMs - new Date(a.created).getTime();
                        const ageMin = Math.floor(ageMs / 60000);
                        const ageText = ageMin < 1 ? '刚刚' : ageMin < 60 ? `${ageMin} 分钟前` : `${Math.floor(ageMin/60)} 小时前`;
                        return (
                          <div key={a.id} style={{
                            padding: '8px',
                            borderRadius: 8,
                            background: a.acknowledged ? 'transparent' : 'rgba(239,68,68,0.06)',
                            opacity: a.acknowledged ? 0.6 : 1,
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            marginBottom: 4,
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444', flexShrink: 0 }}>warning</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {a.api_type} 自动关闭
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--st-color-text-muted)', marginTop: 2 }}>
                                {REASON[a.reason] || a.reason}（{a.count} 次）· {ageText}
                              </div>
                            </div>
                            {!a.acknowledged && (
                              <button
                                onClick={() => markAck(a.id)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: 'var(--st-color-text-muted)', padding: 0,
                                }}
                                title="标记已读"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
            <div className="user-profile-container" ref={userRef}>
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
