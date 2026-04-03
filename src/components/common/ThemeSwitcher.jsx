/**
 * ThemeSwitcher — Floating theme picker panel
 *
 * A small FAB button that opens a theme selector overlay.
 * Users can preview and switch between preset themes instantly.
 */

import { useState } from 'react';
import { useTheme } from '../../theme';
import { PRESET_THEMES } from '../../theme/presetThemes';

export default function ThemeSwitcher() {
  const { applyCustomTheme, currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('ocean');

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
          bottom: '6rem',
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
            bottom: '10rem',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {PRESET_THEMES.map((preset) => {
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
                    padding: '0.7rem 0.8rem',
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
                          border: i === 3 ? '1px solid rgba(255,255,255,0.15)' : 'none',
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
      )}
    </>
  );
}
