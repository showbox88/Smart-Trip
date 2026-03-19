import { useEffect, useRef } from 'react';

/**
 * Sidebar mouse-glow effect.
 * Attach the returned ref to the <aside className="sidebar"> element.
 */
export function useSidebarGlow(isCollapsed) {
  const sidebarRef = useRef(null);
  const layerRef = useRef(null);
  const dotsRef = useRef([]); // [{ item, activeDot, hoverDot }]
  const rafRef = useRef(null);
  const pointerRef = useRef({ x: -9999, y: -9999 });
  const isCollapsedRef = useRef(isCollapsed);

  // Build / rebuild the glow layer and dot elements
  const buildLayer = () => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Remove old layer
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }
    dotsRef.current = [];

    if (!isCollapsedRef.current) return;

    const layer = document.createElement('div');
    layer.className = 'sidebar-glow-layer';
    layer.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;';
    sidebar.prepend(layer);
    layerRef.current = layer;

    const items = sidebar.querySelectorAll('#sidebar-nav li, .add-day-btn');
    items.forEach(item => {
      // Active dot — always visible on active item
      const activeDot = document.createElement('div');
      activeDot.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
      layer.appendChild(activeDot);

      // Hover dot — follows mouse proximity
      const hoverDot = document.createElement('div');
      hoverDot.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
      layer.appendChild(hoverDot);

      dotsRef.current.push({ item, activeDot, hoverDot });
    });
  };

  const applyGlow = () => {
    rafRef.current = null;
    const sidebar = sidebarRef.current;
    if (!sidebar || !isCollapsedRef.current || !layerRef.current) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const { x: pointerX, y: pointerY } = pointerRef.current;
    const sidebarRight = sidebarRect.right;
    const isNear = pointerX >= 0 && pointerX < sidebarRight + 60;

    for (const { item, activeDot, hoverDot } of dotsRef.current) {
      const rect = item.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - sidebarRect.left;
      const cy = rect.top + rect.height / 2 - sidebarRect.top;
      const isActive = item.classList.contains('active');

      // Position both dots at item center
      const pos = `position:absolute;width:0;height:0;left:${cx}px;top:${cy}px;pointer-events:none;`;
      activeDot.style.cssText = pos;
      hoverDot.style.cssText = pos;

      // Active glow — steady, uses day color if available
      const activeColor = item.style.getPropertyValue('--active-color') || '#3b82f6';
      activeDot.style.boxShadow = isActive
        ? `0 0 28px 14px ${activeColor}99`
        : 'none';

      // Hover glow — proximity-based
      if (!isNear) {
        hoverDot.style.boxShadow = 'none';
      } else {
        const itemCenterYViewport = rect.top + rect.height / 2;
        const distance = Math.abs(pointerY - itemCenterYViewport);
        const maxDistance = 100;
        if (distance < maxDistance) {
          const strength = 1 - distance / maxDistance;
          const blur = 24 + strength * 28;
          const spread = 10 + strength * 14;
          const alpha = (0.25 + strength * 0.65).toFixed(2);
          hoverDot.style.boxShadow = `0 0 ${blur}px ${spread}px rgba(148,180,255,${alpha})`;
        } else {
          hoverDot.style.boxShadow = 'none';
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
    window.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', buildLayer);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', buildLayer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Rebuild when collapsed state changes
  useEffect(() => {
    isCollapsedRef.current = isCollapsed;
    setTimeout(() => { buildLayer(); scheduleGlow(); }, 350);
  }, [isCollapsed]);

  return sidebarRef;
}
