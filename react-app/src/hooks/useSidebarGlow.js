import { useEffect, useRef } from 'react';

/**
 * Replicates the sidebar mouse-glow effect from ux.js.
 * Attach the returned ref to the <aside className="sidebar"> element.
 */
export function useSidebarGlow(isCollapsed) {
  const sidebarRef = useRef(null);
  const cacheRef = useRef(null);
  const rafRef = useRef(null);
  const pointerRef = useRef({ x: -9999, y: -9999 });

  const invalidateCache = () => { cacheRef.current = null; };

  const buildCache = (sidebar) => {
    let layer = sidebar.querySelector('.sidebar-glow-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'sidebar-glow-layer';
      layer.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:visible;';
      sidebar.prepend(layer);
    }
    layer.style.display = '';

    const sidebarRect = sidebar.getBoundingClientRect();
    const items = sidebar.querySelectorAll('#sidebar-nav li, .add-day-btn');
    const dots = [];

    items.forEach((item, i) => {
      let dot = layer.children[i];
      if (!dot) {
        dot = document.createElement('div');
        layer.appendChild(dot);
      }
      const rect = item.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2 - sidebarRect.top;
      dots.push({ dot, item, centerY });
    });

    while (layer.children.length > items.length) {
      layer.removeChild(layer.lastChild);
    }

    return { sidebar, layer, sidebarRight: sidebarRect.right, dots };
  };

  const applyGlow = () => {
    rafRef.current = null;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    if (!isCollapsed) {
      // Hide glow layer when expanded
      const layer = sidebar.querySelector('.sidebar-glow-layer');
      if (layer) layer.style.display = 'none';
      cacheRef.current = null;
      return;
    }

    if (!cacheRef.current || cacheRef.current.sidebar !== sidebar) {
      cacheRef.current = buildCache(sidebar);
    }

    const { sidebarRight, dots } = cacheRef.current;
    const { x: pointerX, y: pointerY } = pointerRef.current;
    const isNear = pointerX < sidebarRight + 40;

    for (const { dot, item, centerY } of dots) {
      const isActive = item.classList.contains('active');
      if (!isNear) {
        dot.style.boxShadow = isActive ? '0 0 30px 12px rgba(96,165,250,0.7)' : 'none';
      } else {
        const dy = pointerY - centerY;
        const distance = Math.abs(dy);
        const maxDistance = 120;
        if (distance < maxDistance) {
          const strength = 1 - distance / maxDistance;
          const b = 20 + strength * 20;
          const s = 8 + strength * 8;
          const a = (strength * 0.8).toFixed(2);
          dot.style.boxShadow = `0 0 ${b}px ${s}px rgba(96,165,250,${a})`;
        } else {
          dot.style.boxShadow = isActive ? '0 0 30px 12px rgba(96,165,250,0.7)' : 'none';
        }
      }
    }
  };

  const scheduleGlow = () => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(applyGlow);
    }
  };

  useEffect(() => {
    const onMove = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      scheduleGlow();
    };
    const onLeave = () => {
      pointerRef.current = { x: -9999, y: -9999 };
      scheduleGlow();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('scroll', invalidateCache, true);
    window.addEventListener('resize', invalidateCache);

    // Initial render
    setTimeout(() => { invalidateCache(); scheduleGlow(); }, 100);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', invalidateCache, true);
      window.removeEventListener('resize', invalidateCache);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Re-apply when collapsed state changes
  useEffect(() => {
    invalidateCache();
    setTimeout(() => { invalidateCache(); scheduleGlow(); }, 350);
  }, [isCollapsed]);

  return sidebarRef;
}
