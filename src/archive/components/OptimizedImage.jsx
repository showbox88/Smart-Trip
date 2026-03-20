import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  // Skip blob URL generation if we already have a thumbnail
  const rawUrl = useObjectUrl(fileHandle, !!thumbUrl);

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

  // If we have layoutId, we must use motion.img for shared element transitions
  if (layoutId) {
    return (
      <motion.img
        layoutId={layoutId}
        src={displayUrl}
        alt={alt}
        className={className}
        transition={transition || { type: 'spring', stiffness: 300, damping: 30 }}
        loading="lazy"
        style={{ opacity: isLoading && !thumbUrl ? 0 : 1, transition: 'opacity 0.3s' }}
      />
    );
  }

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
