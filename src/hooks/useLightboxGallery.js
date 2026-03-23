import { useCallback, useEffect, useRef, useState } from 'react';

export function useLightboxGallery(photoUrls) {
  const [zoomedPhotoIdx, setZoomedPhotoIdx] = useState(null);
  const [prevPhotoIdx, setPrevPhotoIdx] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const swipedRef = useRef(false);
  const zoomedPhotoIdxRef = useRef(zoomedPhotoIdx);
  const photosRef = useRef(photoUrls);

  useEffect(() => {
    zoomedPhotoIdxRef.current = zoomedPhotoIdx;
  }, [zoomedPhotoIdx]);

  useEffect(() => {
    photosRef.current = photoUrls;
  }, [photoUrls]);

  const closeLightbox = useCallback(() => {
    setZoomedPhotoIdx(null);
  }, []);

  const handlePhotoClick = useCallback((idx) => {
    setPrevPhotoIdx(null);
    setZoomedPhotoIdx(idx);
  }, []);

  const transitionToPhoto = useCallback((nextIdx) => {
    if (nextIdx === zoomedPhotoIdxRef.current) return;
    setPrevPhotoIdx(zoomedPhotoIdxRef.current);
    setZoomedPhotoIdx(nextIdx);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setPrevPhotoIdx(null);
    }, 800);
  }, []);

  const nextPhoto = useCallback((e) => {
    e?.stopPropagation();
    const currentIdx = zoomedPhotoIdxRef.current;
    if (currentIdx === null || !photosRef.current.length) return;
    transitionToPhoto((currentIdx + 1) % photosRef.current.length);
  }, [transitionToPhoto]);

  const prevPhoto = useCallback((e) => {
    e?.stopPropagation();
    const currentIdx = zoomedPhotoIdxRef.current;
    if (currentIdx === null || !photosRef.current.length) return;
    transitionToPhoto((currentIdx - 1 + photosRef.current.length) % photosRef.current.length);
  }, [transitionToPhoto]);

  useEffect(() => {
    if (zoomedPhotoIdx === null || !photoUrls.length) return;

    const preloadIdxs = [
      (zoomedPhotoIdx + 1) % photoUrls.length,
      (zoomedPhotoIdx - 1 + photoUrls.length) % photoUrls.length,
    ];

    preloadIdxs.forEach((idx) => {
      const img = new Image();
      img.src = photoUrls[idx];
    });
  }, [zoomedPhotoIdx, photoUrls]);

  useEffect(() => {
    if (zoomedPhotoIdx === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextPhoto();
      else if (e.key === 'ArrowLeft') prevPhoto();
      else if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedPhotoIdx, nextPhoto, prevPhoto, closeLightbox]);

  useEffect(() => {
    if (zoomedPhotoIdx === null) return;
    let startX = null;
    let startY = null;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swipedRef.current = false;
    };

    const onTouchEnd = (e) => {
      if (startX === null || !e.changedTouches.length) return;
      const dx = startX - e.changedTouches[0].clientX;
      const dy = Math.abs(startY - e.changedTouches[0].clientY);
      startX = null;
      startY = null;

      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        swipedRef.current = true;
        const curIdx = zoomedPhotoIdxRef.current;
        const len = photosRef.current.length;
        if (curIdx === null || len === 0) return;
        const newIdx = dx > 0 ? (curIdx + 1) % len : (curIdx - 1 + len) % len;
        transitionToPhoto(newIdx);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomedPhotoIdx, transitionToPhoto]);

  return {
    zoomedPhotoIdx,
    prevPhotoIdx,
    isAnimating,
    swipedRef,
    handlePhotoClick,
    nextPhoto,
    prevPhoto,
    closeLightbox,
    resetGallery: closeLightbox,
  };
}
