import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as idb from '../utils/idb';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { Image, Heart } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export const PhotoCard = memo(function PhotoCard({ fileInfo, index, onContextMenu, isSelected, onToggleSelection, onNavigate, onUpdate, animatingTargetId, metadata }) {
  const categories = metadata?.categories || [];
  const cities = metadata?.cities || [];

  const getPropertyColor = (name, list) => {
    const found = (list || []).find(it => (typeof it === 'string' ? it === name : it.name === name));
    return found?.color || found?.hex || '#60a5fa';
  };
  const [thumbUrl, setThumbUrl] = useState(null);
  const rawUrl = useObjectUrl(fileInfo.handle);
  
  const date = fileInfo.timestamp ? new Date(fileInfo.timestamp) : null;
  const rating = fileInfo.rating ?? 0;
  
  // 异步加载缩略图
  useEffect(() => {
    let isMounted = true;
    async function loadThumb() {
      try {
        const cached = await idb.get(fileInfo.path, 'ThumbnailStore');
        if (isMounted && cached) {
          setThumbUrl(cached);
        }
      } catch (e) {}
    }
    loadThumb();
    return () => { isMounted = false; };
  }, [fileInfo.path]);

  // 渲染时优先使用缩略图
  const displayUrl = thumbUrl || rawUrl;
  
  const displayTitle = fileInfo.name.replace(/\.[^/.]+$/, "");
  const finalLayoutId = (isSelected && animatingTargetId) ? animatingTargetId : fileInfo.path;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: index * 0.01, 
        duration: 0.4,
        ease: "easeOut"
      }}
      onContextMenu={(e) => onContextMenu(e, fileInfo)}
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelection(fileInfo.path, index, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onNavigate({ type: 'photo', data: fileInfo });
      }}
      whileTap={{ scale: 0.98 }}
      data-item-key={fileInfo.path}
      className={clsx(
        "relative flex flex-col cursor-pointer group rounded-xl overflow-visible",
        "bg-[#191a21] border border-white/5 shadow-lg transition-all duration-300",
        isSelected 
          ? "ring-4 ring-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.4)]" 
          : "hover:border-blue-500/30 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:bg-[#1e1f28]"
      )}
    >
      <div className="pt-2 pb-1 flex justify-center bg-[#191a21] rounded-t-xl shrink-0">
        <div className="relative w-[85%] aspect-square overflow-hidden rounded-lg bg-neutral-900 shadow-inner group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
          {displayUrl ? (
            <motion.img 
              layoutId={finalLayoutId}
              src={displayUrl} 
              alt={fileInfo.name} 
              className={clsx(
                  "w-full h-full object-cover transition-transform duration-500 group-hover:scale-125",
                  isSelected && "brightness-90 opacity-80"
              )}
              transition={{ 
                type: "spring", stiffness: 220, damping: 22, mass: 1.1, duration: 1.0
              }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Image className="text-white" size={12} />
            </div>
          )}

          <div className={clsx(
            "absolute top-1 right-1 z-40 w-2.5 h-2.5 rounded-full border flex items-center justify-center transition-all duration-300",
            isSelected
              ? "bg-blue-500 border-blue-400 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              : "bg-black/40 border-white/20 opacity-0 group-hover:opacity-100 backdrop-blur-md"
          )}>
            {isSelected && (
              <svg width="5" height="5" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="p-1.5 flex flex-col gap-0.5 relative border-t border-white/[0.03]">
        <div className="flex flex-col gap-0 min-w-0">
          <h3 className="text-white text-[9px] font-bold truncate leading-tight">
            {displayTitle}
          </h3>
          <div className="flex items-center">
            {[...Array(10)].map((_, i) => {
              const active = i < rating;
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newRating = i + 1;
                    onUpdate?.(fileInfo.path, { rating: newRating }, 'photo');
                  }}
                  className={clsx(
                    "transition-all",
                    active ? "text-red-500" : "text-white/5 hover:text-white/20"
                  )}
                >
                  <Heart size={7} fill={active ? "currentColor" : "none"} strokeWidth={active ? 0 : 2} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-hidden">
          {fileInfo.category && (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 max-w-[50%] overflow-hidden backdrop-blur-sm"
              style={{ 
                backgroundColor: `${getPropertyColor(fileInfo.category, categories)}15`,
                borderColor: `${getPropertyColor(fileInfo.category, categories)}40`
              }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.3)]" 
                style={{ backgroundColor: getPropertyColor(fileInfo.category, categories) }}
              />
              <span className="text-[10px] text-white/95 font-black truncate tracking-wide">
                {fileInfo.category}
              </span>
            </div>
          )}
          {fileInfo.city && (
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 max-w-[50%] overflow-hidden backdrop-blur-sm"
              style={{ 
                backgroundColor: `${getPropertyColor(fileInfo.city, cities)}15`,
                borderColor: `${getPropertyColor(fileInfo.city, cities)}40`
              }}
            >
              <div 
                className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.3)]" 
                style={{ backgroundColor: getPropertyColor(fileInfo.city, cities) }}
              />
              <span className="text-[10px] text-white/95 font-black truncate tracking-wide">
                {fileInfo.city}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <span className="text-[7px] text-neutral-600 font-medium">
            {date ? format(date, 'MMM d, yy') : 'Unknown'}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
