import { useState, useEffect } from 'react';
import * as idb from '../utils/idb';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';

/**
 * Optimized Image component that prefers IndexedDB thumbnails over raw files
 */
export function OptimizedImage({ fileHandle, path, className, alt, layoutId, transition }) {
  const [thumbUrl, setThumbUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const rawUrl = useObjectUrl(fileHandle);

  useEffect(() => {
    let isMounted = true;
    
    async function loadThumbnail() {
      try {
        const cachedThumb = await idb.get(path, 'ThumbnailStore');
        if (isMounted && cachedThumb) {
          setThumbUrl(cachedThumb);
        }
      } catch (err) {
        console.warn('Failed to load thumbnail from IDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadThumbnail();
    return () => { isMounted = false; };
  }, [path]);

  const displayUrl = thumbUrl || rawUrl;

  if (!displayUrl && !isLoading) {
    return (
      <div className={clsx("flex items-center justify-center bg-neutral-900", className)}>
        <ImageIcon className="text-neutral-700" size={24} />
      </div>
    );
  }

  // If we have framer-motion props, use motion.img, otherwise standard img
  const Tag = layoutId ? 'motion.img' : 'img';
  
  // Note: We're using standard img here for simplicity unless layoutId is passed
  // In our case, PhotoCard uses motion.img, so we should stay flexible
  
  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      loading="lazy"
      style={{ opacity: isLoading && !thumbUrl ? 0 : 1, transition: 'opacity 0.3s' }}
    />
  );
}
