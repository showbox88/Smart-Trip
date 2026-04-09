import { useState, useEffect } from 'react';

export default function ScreenDebug() {
  const [info, setInfo] = useState(getInfo);

  function getInfo() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      pointer: window.matchMedia('(pointer: coarse)').matches ? 'coarse (touch)' : 'fine (mouse)',
      dpr: window.devicePixelRatio,
      breakpoint: getBreakpoint(window.innerWidth),
    };
  }

  function getBreakpoint(w) {
    if (w <= 900) return 'mobile ≤900';
    if (w <= 1100) return 'tablet 901–1100';
    return 'desktop ≥1101';
  }

  useEffect(() => {
    const update = () => setInfo(getInfo());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.85)',
      color: '#0ff',
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: '8px 14px',
      borderRadius: '8px',
      zIndex: 99999,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      lineHeight: 1.6,
      border: '1px solid rgba(0,255,255,0.3)',
    }}>
      <div>📐 {info.w} × {info.h}px  |  {info.orientation}  |  DPR {info.dpr}</div>
      <div>🖱️ {info.pointer}  |  📦 {info.breakpoint}</div>
    </div>
  );
}
