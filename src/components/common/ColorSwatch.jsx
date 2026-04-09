/**
 * ColorSwatch — Cross-platform color picker trigger
 *
 * Desktop (mouse): delegates to native <input type="color"> (browser's built-in picker)
 * Touch devices (phone + tablet): shows a react-colorful HexColorPicker popup overlay
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { getIsTouch } from '../../hooks/useDeviceType';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => getIsTouch());
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e) => setIsMobile(e.matches || navigator.maxTouchPoints > 0);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function ColorSwatch({ colorDef, currentVal, hasUnsaved, onChange }) {
  const isMobile = useIsMobile();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localColor, setLocalColor] = useState(currentVal);
  const nativeRef = useRef(null);
  const popupRef = useRef(null);

  // Keep localColor in sync when currentVal changes externally
  useEffect(() => {
    setLocalColor(currentVal.startsWith('#') && currentVal.length >= 4 ? currentVal : '#888888');
  }, [currentVal]);

  // Close popup on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [pickerOpen]);

  const handleSwatchClick = useCallback(() => {
    if (isMobile) {
      setPickerOpen(v => !v);
    } else {
      nativeRef.current?.click();
    }
  }, [isMobile]);

  const handleMobileChange = useCallback((hex) => {
    setLocalColor(hex);
    onChange(colorDef, hex);
  }, [colorDef, onChange]);

  const handleNativeChange = useCallback((e) => {
    onChange(colorDef, e.target.value);
  }, [colorDef, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', flex: 1 }}>
      {/* Swatch circle */}
      <div
        onClick={handleSwatchClick}
        style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: currentVal,
          border: hasUnsaved ? '2px solid var(--md-sys-color-primary)' : '2px solid var(--md-sys-color-outline)',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        title={colorDef.label}
      />
      <span style={{ fontSize: '0.5rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {colorDef.label}
      </span>

      {/* Desktop: hidden native input */}
      {!isMobile && (
        <input
          ref={nativeRef}
          type="color"
          value={currentVal.length === 7 ? currentVal : '#888888'}
          onChange={handleNativeChange}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Mobile: react-colorful popup */}
      {isMobile && pickerOpen && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            bottom: '200px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline)',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
            {colorDef.label}
          </div>
          <HexColorPicker color={localColor} onChange={handleMobileChange} />
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: localColor, border: '2px solid var(--md-sys-color-outline)', flexShrink: 0 }} />
            <input
              type="text"
              value={localColor}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) handleMobileChange(v);
                else setLocalColor(v);
              }}
              style={{
                flex: 1, padding: '4px 8px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace',
                background: 'var(--md-sys-color-surface-container-high)',
                border: '1px solid var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            />
            <button
              onClick={() => setPickerOpen(false)}
              style={{
                padding: '4px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)',
                border: 'none', cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
