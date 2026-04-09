/**
 * ThemeSwitcher — Floating theme picker panel
 *
 * A small FAB button that opens a theme selector overlay.
 * Users can preview and switch between preset themes instantly.
 */

import { useState, useMemo, useRef } from 'react';
import { useTheme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { PRESET_THEMES } from '../../theme/presetThemes';
import { useColorOverrides, EDITABLE_COLORS } from '../../hooks/useColorOverrides';

const LAYOUT_GROUPS = [
  { key: 'glass', label: 'Glass', icon: 'blur_on' },
  { key: 'clean', label: 'Clean', icon: 'light_mode' },
];

export default function ThemeSwitcher() {
  const { applyCustomTheme, applyPresetTheme, layoutVariant } = useTheme();
  const { state } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('ocean');
  const [showCustomize, setShowCustomize] = useState(false);
  const colorInputRefs = useRef({});

  const {
    handleColorChange, handleSave, handleReset,
    getCurrentColor, hasUnsaved, hasAnyChange,
  } = useColorOverrides(activeId, applyPresetTheme, state.user?.id);

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

  const handleSelect = (preset) => {
    applyPresetTheme(preset.id, preset.theme);
    setActiveId(preset.id);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: layoutVariant === 'clean' ? '5.5rem' : '1.5rem',
          right: '1.5rem',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--md-sys-color-primary)',
          color: 'var(--md-sys-color-on-primary-container)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
          {isOpen ? 'close' : 'palette'}
        </span>
      </button>

      {/* Theme Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: layoutVariant === 'clean' ? '9.5rem' : '5.5rem',
            right: '1.5rem',
            width: '280px',
            maxHeight: '75vh',
            background: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: 'var(--md-sys-shape-corner-large)',
            padding: '1.2rem',
            zIndex: 9999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            backdropFilter: 'var(--st-glass-blur)',
            animation: 'fadeIn 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: 'var(--md-sys-color-on-surface)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>palette</span>
            Theme
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {LAYOUT_GROUPS.map((group) => {
              const themes = groupedThemes[group.key] || [];
              if (!themes.length) return null;
              return (
                <div key={group.key}>
                  {/* Group label */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--st-color-text-muted)', letterSpacing: '0.05em',
                    marginBottom: '0.4rem', paddingLeft: '0.2rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{group.icon}</span>
                    {group.label}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {themes.map((preset) => {
                      const isActive = activeId === preset.id;
                      const colors = preset.theme.colors;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelect(preset)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '0.6rem 0.7rem',
                            borderRadius: 'var(--md-sys-shape-corner-medium)',
                            border: isActive
                              ? `2px solid ${colors.primary}`
                              : '2px solid transparent',
                            background: isActive
                              ? `${colors.primary}15`
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            textAlign: 'left',
                          }}
                        >
                          {/* Color preview dots */}
                          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                            {[colors.primary, colors.secondary, colors.tertiary, colors.surface].map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: c,
                                  border: i === 3 ? '1px solid var(--md-sys-color-outline)' : 'none',
                                }}
                              />
                            ))}
                          </div>

                          {/* Name */}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: isActive ? colors.primary : 'var(--md-sys-color-on-surface)',
                            }}>
                              {preset.emoji} {preset.theme.name}
                            </div>
                            <div style={{
                              fontSize: '0.68rem',
                              color: 'var(--st-color-text-muted)',
                              marginTop: '2px',
                            }}>
                              {preset.theme.description}
                            </div>
                          </div>

                          {/* Check mark */}
                          {isActive && (
                            <span className="material-symbols-outlined" style={{
                              fontSize: '18px',
                              color: colors.primary,
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

          {/* ── Customize section ── */}
          <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '0.75rem' }}>
            <button
              onClick={() => setShowCustomize(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.25rem 0.2rem', borderRadius: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--md-sys-color-primary)' }}>tune</span>
                Customize
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-text-muted)', transition: 'transform 0.2s', transform: showCustomize ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </button>

            {showCustomize && (
              <div style={{ marginTop: '0.6rem' }}>
                {/* Color swatches */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '0.4rem 0.2rem' }}>
                  {EDITABLE_COLORS.map((colorDef) => {
                    const currentVal = getCurrentColor(colorDef);
                    return (
                      <div key={colorDef.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
                        <div
                          onClick={() => colorInputRefs.current[colorDef.key]?.click()}
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: currentVal,
                            border: hasUnsaved ? '2px solid var(--md-sys-color-primary)' : '2px solid var(--md-sys-color-outline)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s',
                          }}
                          title={colorDef.label}
                        />
                        <span style={{ fontSize: '0.55rem', color: 'var(--st-color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {colorDef.label}
                        </span>
                        <input
                          ref={el => colorInputRefs.current[colorDef.key] = el}
                          type="color"
                          value={currentVal.length === 7 ? currentVal : '#888888'}
                          onChange={e => handleColorChange(colorDef, e.target.value)}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Save / Reset buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '0.6rem' }}>
                  {hasUnsaved && (
                    <button onClick={handleSave} style={{
                      flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer',
                      background: 'var(--md-sys-color-primary)', border: 'none',
                      color: 'var(--md-sys-color-on-primary)', fontSize: '0.72rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
                      Save
                    </button>
                  )}
                  {hasAnyChange && (
                    <button onClick={handleReset} style={{
                      flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer',
                      background: 'none', border: '1px solid var(--md-sys-color-outline-variant)',
                      color: 'var(--st-color-text-muted)', fontSize: '0.72rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>restart_alt</span>
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
