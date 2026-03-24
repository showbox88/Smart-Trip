import { useState, useEffect, useCallback } from 'react';

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = useCallback((event, data) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      data: data,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (contextMenu) {
      const handleScroll = (e) => {
        // Don't close if scrolling inside the context menu itself
        const menuEl = document.querySelector('[data-context-menu]');
        if (menuEl && menuEl.contains(e.target)) return;
        closeMenu();
      };
      window.addEventListener('click', closeMenu);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('click', closeMenu);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [contextMenu, closeMenu]);

  return { contextMenu, handleContextMenu, closeMenu };
}
