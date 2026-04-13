/**
 * ProfilePanel — Slide-up user profile & settings sheet
 *
 * Contains: user info, theme picker, language switcher, admin link, logout.
 * Used by BottomNav (clean layout) and can be triggered from Navbar (glass layout).
 */

import { useState, useMemo } from 'react';
// useCallback and useEffect now handled by useColorOverrides hook
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

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigate('/');
  };

  const handleThemeSelect = (preset) => {
    applyPresetTheme(preset.id, preset.theme);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.32)',
          zIndex: 2020,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        maxHeight: '70vh',
        background: 'var(--md-sys-color-surface-container-lowest)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        borderRadius: 'var(--md-sys-shape-corner-large)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        zIndex: 2021,
        overflowY: 'auto',
        padding: '1rem',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* ── User Info ── */}
        {state.user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--md-sys-color-outline-variant)',
            marginBottom: '0.75rem',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--md-sys-color-surface-container)',
              flexShrink: 0,
            }}>
              {state.user.avatar ? (
                <img src={state.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--md-sys-color-on-surface-variant)' }}>account_circle</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                {state.user.name || state.user.email?.split('@')[0]}
              </div>
              <div style={{
                fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {state.user.email}
              </div>
            </div>
          </div>
        )}

        {/* ── Theme Picker ── */}
        <div style={{ marginBottom: '0.75rem' }}>
          {/* Collapsible header */}
          <button
            onClick={() => setThemeOpen(v => !v)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px',
              background: themeOpen ? 'var(--md-sys-color-surface-container)' : 'transparent',
              border: 'none', borderRadius: '8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              gap: '8px', justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>palette</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>Theme</span>
            </span>
            <span className="material-symbols-outlined" style={{
              fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)',
              transition: 'transform 0.2s',
              transform: themeOpen ? 'rotate(180deg)' : 'none',
            }}>expand_more</span>
          </button>

          {/* Expandable content */}
          {themeOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
              {/* ── Customize colors — always visible ── */}
              <div style={{ padding: '0.5rem 0.4rem 0.6rem', borderBottom: '1px solid var(--md-sys-color-outline-variant)', marginBottom: '0.2rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>tune</span>
                  Customize
                </div>
                {/* Color swatches */}
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
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
                {/* Save / Reset buttons — always visible */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '0.6rem' }}>
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsaved}
                    style={{
                      flex: 1, padding: '5px', borderRadius: '8px',
                      cursor: hasUnsaved ? 'pointer' : 'default',
                      background: hasUnsaved ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)',
                      border: 'none',
                      color: hasUnsaved ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                      fontSize: '0.7rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      opacity: hasUnsaved ? 1 : 0.45,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>save</span>
                    Save
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={!hasAnyChange}
                    style={{
                      flex: 1, padding: '5px', borderRadius: '8px',
                      cursor: hasAnyChange ? 'pointer' : 'default',
                      background: 'none',
                      border: '1px solid var(--md-sys-color-outline-variant)',
                      color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.7rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                      opacity: hasAnyChange ? 1 : 0.45,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>restart_alt</span>
                    Reset
                  </button>
                </div>
              </div>

              {LAYOUT_GROUPS.map((group) => {
                const themes = groupedThemes[group.key] || [];
                if (!themes.length) return null;
                return (
                  <div key={group.key}>
                    <div style={{
                      fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                      color: 'var(--md-sys-color-on-surface-variant)',
                      letterSpacing: '0.05em', marginBottom: '0.3rem', paddingLeft: '0.2rem',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{group.icon}</span>
                      {group.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {themes.map((preset) => {
                        const isActive = themeId === preset.id;
                        const colors = preset.theme.colors;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleThemeSelect(preset)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '0.5rem 0.6rem',
                              borderRadius: 'var(--md-sys-shape-corner-medium)',
                              border: isActive ? `2px solid ${colors.primary}` : '2px solid transparent',
                              background: isActive ? `${colors.primary}15` : 'transparent',
                              cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                              {[colors.primary, colors.secondary, colors.tertiary, colors.surface].map((c, i) => (
                                <div key={i} style={{
                                  width: '14px', height: '14px', borderRadius: '50%',
                                  background: c,
                                  border: i === 3 ? '1px solid var(--md-sys-color-outline)' : 'none',
                                }} />
                              ))}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '0.78rem', fontWeight: 600,
                                color: isActive ? colors.primary : 'var(--md-sys-color-on-surface)',
                              }}>
                                {preset.emoji} {preset.theme.name}
                              </div>
                            </div>
                            {isActive && (
                              <span className="material-symbols-outlined" style={{
                                fontSize: '16px', color: colors.primary,
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
        </div>

        {/* ── Language Switcher ── */}
        <div style={{
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
          paddingTop: '0.75rem', marginBottom: '0.5rem',
        }}>
          <button
            onClick={() => setLangMenuOpen(v => !v)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px',
              background: langMenuOpen ? 'var(--md-sys-color-surface-container)' : 'transparent',
              border: 'none', color: 'var(--md-sys-color-on-surface)',
              cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-on-surface-variant)' }}>language</span>
              {t('itinerary.settings_lang')}
            </span>
            <span className="material-symbols-outlined" style={{
              fontSize: '14px', color: 'var(--md-sys-color-on-surface-variant)',
              transition: 'transform 0.2s',
              transform: langMenuOpen ? 'rotate(180deg)' : 'none',
            }}>expand_more</span>
          </button>
          {langMenuOpen && (
            <div style={{ marginTop: '2px', borderRadius: '8px', overflow: 'hidden' }}>
              {availableLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setLangMenuOpen(false); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '7px 14px',
                    background: lang.code === language ? 'var(--md-sys-color-primary-container)' : 'transparent',
                    border: 'none',
                    color: lang.code === language ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                    cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {lang.code === language && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                  {lang.code !== language && <span style={{ width: '14px' }} />}
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Admin Link ── */}
        {state.user && isAdmin(state.user) && (
          <button
            onClick={() => { onClose(); navigate('/admin'); }}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px',
              background: 'transparent', border: 'none',
              color: 'var(--md-sys-color-on-surface)',
              cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-on-surface-variant)' }}>admin_panel_settings</span>
            Admin Dashboard
          </button>
        )}

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left', padding: '8px 10px',
            background: 'transparent', border: 'none',
            color: 'var(--md-sys-color-error)',
            cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
          {t('common.logout')}
        </button>
      </div>
    </>
  );
}
