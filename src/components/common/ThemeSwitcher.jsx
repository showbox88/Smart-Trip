/**
 * ThemeSwitcher — Floating theme picker panel
 *
 * A small FAB button that opens a theme selector overlay.
 * Users can preview and switch between preset themes instantly.
 */

import { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import { PRESET_THEMES } from '../../theme/presetThemes';

const LAYOUT_GROUPS = [
  { key: 'glass', label: 'Glass', icon: 'blur_on' },
  { key: 'clean', label: 'Clean', icon: 'light_mode' },
];

export default function ThemeSwitcher() {
  const { applyCustomTheme, layoutVariant } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('ocean');

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
    applyCustomTheme(preset.theme);
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
            background: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: 'var(--md-sys-shape-corner-large)',
            padding: '1.2rem',
            zIndex: 9999,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            backdropFilter: 'var(--st-glass-blur)',
            animation: 'fadeIn 0.2s ease',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto' }}>
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
        </div>
      )}
    </>
  );
}
