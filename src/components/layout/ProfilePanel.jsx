/**
 * ProfilePanel — iOS-style slide-up settings sheet
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import { PRESET_THEMES } from '../../theme/presetThemes';
import { isAdmin } from '../../utils/admin';
import { useColorOverrides, EDITABLE_COLORS } from '../../hooks/useColorOverrides';
import ColorSwatch from '../common/ColorSwatch';

const LAYOUT_GROUPS = [
  { key: 'glass',  label: 'Glass',  icon: 'blur_on' },
  { key: 'clean',  label: 'Clean',  icon: 'light_mode' },
  { key: 'mobile', label: 'Mobile', icon: 'smartphone' },
];

export default function ProfilePanel({ open, onClose }) {
  const { state } = useApp();
  const { applyPresetTheme, themeId } = useTheme();
  const { signOut } = useAuth();
  const { t, language, setLanguage, availableLanguages } = useI18n();
  const navigate = useNavigate();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const {
    handleColorChange, handleSave, handleReset,
    getCurrentColor, hasUnsaved, hasAnyChange,
  } = useColorOverrides(themeId, applyPresetTheme, state.user?.id);

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

  if (!open) return null;

  const animateClose = (cb) => {
    setClosing(true);
    setTimeout(() => { setClosing(false); cb?.(); onClose(); }, 260);
  };

  const handleLogout = async () => {
    animateClose(async () => { await signOut(); navigate('/'); });
  };

  const handleThemeSelect = (preset) => {
    applyPresetTheme(preset.id, preset.theme);
  };

  // Shared row style for menu items
  const ROW = {
    width: '100%', textAlign: 'left', padding: '13px 16px',
    background: '#fff', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 12,
    fontSize: 15, fontWeight: 500, color: '#1C1C1E',
    transition: 'background 0.15s',
  };

  return (
    <>
      <style>{`
        @keyframes ppFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ppFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ppSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ppSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={() => animateClose()}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 2020,
          animation: closing ? 'ppFadeOut .25s ease forwards' : 'ppFadeIn .2s ease forwards',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        width: '100%', maxWidth: 420, margin: '0 auto',
        maxHeight: '80vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        background: '#F2F2F7',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
        zIndex: 2021,
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        animation: closing ? 'ppSlideDown .25s ease forwards' : 'ppSlideUp .3s cubic-bezier(.32,1.15,.6,1) forwards',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', position: 'sticky', top: 0, background: '#F2F2F7', zIndex: 1, borderRadius: '24px 24px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C7C7CC' }} />
        </div>

        {/* ═══ User Card ═══ */}
        {state.user && (
          <div style={{
            margin: '4px 16px 16px', padding: '16px',
            background: '#fff', borderRadius: 16,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
              background: '#F2F2F7', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {state.user.avatar ? (
                <img src={state.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#C7C7CC' }}>account_circle</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>
                {state.user.name || state.user.email?.split('@')[0]}
              </div>
              <div style={{
                fontSize: 13, color: '#8E8E93', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {state.user.email}
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#C7C7CC' }}>chevron_right</span>
          </div>
        )}

        {/* ═══ Settings Group ═══ */}
        <div style={{ margin: '0 16px 16px', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>

          {/* ── Theme ── */}
          <button
            onClick={() => setThemeOpen(v => !v)}
            style={{ ...ROW, borderBottom: '0.5px solid #E5E5EA' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#007AFF' }}>palette</span>
            <span style={{ flex: 1 }}>Theme</span>
            <span style={{ fontSize: 13, color: '#8E8E93', marginRight: 4 }}>
              {PRESET_THEMES.find(p => p.id === themeId)?.emoji || ''}
            </span>
            <span className="material-symbols-outlined" style={{
              fontSize: 16, color: '#C7C7CC',
              transition: 'transform 0.2s',
              transform: themeOpen ? 'rotate(180deg)' : 'none',
            }}>expand_more</span>
          </button>

          {/* Theme expanded content */}
          {themeOpen && (
            <div style={{ borderBottom: '0.5px solid #E5E5EA' }}>
              {/* Customize colors */}
              <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #F2F2F7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', marginBottom: 10, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Customize Colors
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                  {EDITABLE_COLORS.map((colorDef) => (
                    <ColorSwatch
                      key={colorDef.key}
                      colorDef={colorDef}
                      currentVal={getCurrentColor(colorDef)}
                      hasUnsaved={hasUnsaved}
                      onChange={handleColorChange}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsaved}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10, border: 'none',
                      background: hasUnsaved ? '#007AFF' : '#F2F2F7',
                      color: hasUnsaved ? '#fff' : '#C7C7CC',
                      fontSize: 13, fontWeight: 600, cursor: hasUnsaved ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={!hasAnyChange}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 10,
                      background: '#F2F2F7', border: 'none',
                      color: hasAnyChange ? '#FF3B30' : '#C7C7CC',
                      fontSize: 13, fontWeight: 600, cursor: hasAnyChange ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Theme presets by group */}
              {LAYOUT_GROUPS.map((group) => {
                const themes = groupedThemes[group.key] || [];
                if (!themes.length) return null;
                return (
                  <div key={group.key} style={{ padding: '12px 16px', borderBottom: '0.5px solid #F2F2F7' }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#8E8E93',
                      letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{group.icon}</span>
                      {group.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {themes.map((preset) => {
                        const isActive = themeId === preset.id;
                        const colors = preset.theme.colors;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleThemeSelect(preset)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', borderRadius: 12,
                              border: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
                              background: isActive ? `${colors.primary}0D` : '#F9F9F9',
                              cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                              {[colors.primary, colors.secondary, colors.tertiary, colors.surface].map((c, i) => (
                                <div key={i} style={{
                                  width: 16, height: 16, borderRadius: '50%',
                                  background: c,
                                  border: i === 3 ? '1px solid #E5E5EA' : 'none',
                                }} />
                              ))}
                            </div>
                            <span style={{
                              flex: 1, fontSize: 14, fontWeight: 600,
                              color: isActive ? colors.primary : '#1C1C1E',
                            }}>
                              {preset.emoji} {preset.theme.name}
                            </span>
                            {isActive && (
                              <span className="material-symbols-outlined" style={{
                                fontSize: 18, color: colors.primary,
                                fontVariationSettings: "'FILL' 1",
                              }}>check_circle</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Language ── */}
          <button
            onClick={() => setLangMenuOpen(v => !v)}
            style={{ ...ROW, borderBottom: (isAdmin(state.user) || langMenuOpen) ? '0.5px solid #E5E5EA' : 'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#FF9500' }}>language</span>
            <span style={{ flex: 1 }}>{t('itinerary.settings_lang') || 'Language'}</span>
            <span style={{ fontSize: 13, color: '#8E8E93', marginRight: 4 }}>
              {availableLanguages.find(l => l.code === language)?.label || language}
            </span>
            <span className="material-symbols-outlined" style={{
              fontSize: 16, color: '#C7C7CC',
              transition: 'transform 0.2s',
              transform: langMenuOpen ? 'rotate(180deg)' : 'none',
            }}>expand_more</span>
          </button>

          {langMenuOpen && (
            <div style={{ borderBottom: isAdmin(state.user) ? '0.5px solid #E5E5EA' : 'none' }}>
              {availableLanguages.map(lang => {
                const isActive = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); }}
                    style={{
                      ...ROW, padding: '11px 16px 11px 50px',
                      background: isActive ? '#F0F7FF' : '#fff',
                      color: isActive ? '#007AFF' : '#1C1C1E',
                      fontWeight: isActive ? 600 : 400,
                      borderBottom: '0.5px solid #F2F2F7',
                    }}
                  >
                    {isActive && <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#007AFF', marginLeft: -24 }}>check</span>}
                    {lang.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Admin ── */}
          {state.user && isAdmin(state.user) && (
            <button
              onClick={() => animateClose(() => navigate('/admin'))}
              style={{ ...ROW }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#5856D6' }}>admin_panel_settings</span>
              <span style={{ flex: 1 }}>Admin Dashboard</span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#C7C7CC' }}>chevron_right</span>
            </button>
          )}
        </div>

        {/* ═══ Logout Group ═══ */}
        <div style={{ margin: '0 16px 20px', background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
          <button
            onClick={handleLogout}
            style={{
              ...ROW, justifyContent: 'center',
              color: '#FF3B30', fontWeight: 600,
              gap: 8,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            {t('common.logout') || 'Sign Out'}
          </button>
        </div>
      </div>
    </>
  );
}
