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
      window.addEventListener('click', closeMenu);
      window.addEventListener('scroll', closeMenu, true);
    }
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu, closeMenu]);

  return { contextMenu, handleContextMenu, closeMenu };
}
