/**
 * useDeviceType
 *
 * Provides two independent device dimensions:
 *  - isMobile:  screen width < 768px  (layout/UI decisions)
 *  - isTouch:   pointer is coarse (finger) — phones AND tablets (interaction decisions)
 *
 * Use `isTouch` for drag handles, card flips, hover interactions, etc.
 * Use `isMobile` for layout breakpoints, navigation style, etc.
 */

import { useState, useEffect } from 'react';

function detectTouch() {
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}

function detectMobile() {
  return window.innerWidth < 768;
}

export function useDeviceType() {
  const [isTouch, setIsTouch] = useState(detectTouch);
  const [isMobile, setIsMobile] = useState(detectMobile);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handlePointer = (e) => setIsTouch(e.matches || navigator.maxTouchPoints > 0);
    mq.addEventListener('change', handlePointer);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    return () => {
      mq.removeEventListener('change', handlePointer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isTouch, isMobile };
}

/**
 * Non-reactive version for use outside React components (e.g. event handlers)
 */
export function getIsTouch() {
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
}
