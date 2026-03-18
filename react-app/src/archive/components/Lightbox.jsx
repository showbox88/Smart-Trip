import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Info, Maximize2, MapPin, Tag, Star, Calendar, MessageSquare } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import clsx from 'clsx';

export function Lightbox({ isOpen, onClose, photos, initialIndex = 0, events = [] }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showInfo, setShowInfo] = useState(false);

  // 1. Sync index when opening or initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  // 2. Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos]);

  // 3. Derived Data (Must be before early return to follow Hook rules)
  const currentPhoto = photos && photos.length > 0 ? photos[currentIndex] : null;

  const associatedEvent = useMemo(() => {
    if (!currentPhoto || !events) return null;
    return events.find(e => e.event_id === currentPhoto.event_id);
  }, [currentPhoto, events]);

  const handleNext = () => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // 4. Early Return (After all Hooks)
  if (!isOpen || !photos || photos.length === 0 || !currentPhoto) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center overflow-hidden"
      >
        {/* Top Controls */}
        <div className="absolute top-0 inset-x-0 h-20 px-8 flex items-center justify-between z-50 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-lg text-white/50 text-xs font-medium">
              {currentIndex + 1} / {photos.length}
            </div>
            <h4 className="text-white font-medium truncate max-w-[300px]">{currentPhoto.name}</h4>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2.5 rounded-full transition-all ${showInfo ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-white/70'}`}
            >
              <Info size={20} />
            </button>
            <button className="p-2.5 hover:bg-white/10 rounded-full text-white/70 transition-all">
              <Download size={20} />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2" />
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Image Area - Using Dual Buffer for zero-flicker transitions */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <ImageBuffer 
            currentPhoto={currentPhoto} 
            showInfo={showInfo}
          />

          {/* Navigation Arrows */}
          <button 
            onClick={handlePrev}
            className="absolute left-8 p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all group z-50"
          >
            <ChevronLeft size={48} strokeWidth={1} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-8 p-4 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all group z-50"
          >
            <ChevronRight size={48} strokeWidth={1} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Info Sidebar */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-[#0f1014]/90 backdrop-blur-xl border-l border-white/10 p-8 pt-24 z-40 shadow-2xl overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white tracking-tight">档案详情</h3>
                {associatedEvent && (
                  <div className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    归档完毕
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Event Related Metadata */}
                {associatedEvent ? (
                  <div className="space-y-6">
                    <InfoItem 
                      icon={<Calendar size={14} className="text-blue-400" />} 
                      label="日期" 
                      value={associatedEvent.date || '未设置'} 
                    />
                    <InfoItem 
                      icon={<MapPin size={14} className="text-emerald-400" />} 
                      label="地点" 
                      value={associatedEvent.city || '未设置'} 
                    />
                    <div className="space-y-2">
                       <p className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
                         <Tag size={12} className="text-purple-400" /> 分类
                       </p>
                       <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                         {associatedEvent.category || 'Sightseeing'}
                       </span>
                    </div>
                    
                    <div className="space-y-2">
                       <p className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
                         <Star size={12} className="text-yellow-400" /> 评分
                       </p>
                       <div className="flex gap-1">
                         {[1, 2, 3, 4, 5].map(s => (
                           <Star 
                             key={s} 
                             size={14} 
                             className={s <= (associatedEvent.rate || 0) ? "fill-yellow-400 text-yellow-400" : "text-neutral-700"} 
                           />
                         ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <p className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
                         <MessageSquare size={12} className="text-neutral-400" /> 回忆笔记
                       </p>
                       <div className="text-sm text-neutral-400 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl border border-white/5 min-h-[100px] whitespace-pre-wrap">
                         {associatedEvent.notes || '暂无笔记，记录一下美好的瞬间吧...'}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-center">
                    <p className="text-xs text-yellow-500/80 leading-relaxed font-medium">
                      这张照片尚未归类到任何事件中。回到主页双击或右键将其归档。
                    </p>
                  </div>
                )}

                {/* Technical Metadata */}
                <div className="pt-8 border-t border-white/5 space-y-6">
                  <InfoItem label="文件名" value={currentPhoto.name} />
                  <InfoItem label="原始路径" value={currentPhoto.path} color="text-neutral-600 font-mono text-[10px]" />
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">内部识别码</p>
                     <p className="text-[9px] text-neutral-600 font-mono">{currentPhoto.photo_id?.slice(0, 8)}...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ImageBuffer Component
 * Implements a dual-layer buffer to ensure smooth transitions without flickers.
 */
function ImageBuffer({ currentPhoto }) {
  const [layers, setLayers] = useState([
    { photo: currentPhoto, key: currentPhoto.path, isReady: true, isExiting: false }
  ]);

  useEffect(() => {
    setLayers(prev => {
      if (prev[prev.length - 1]?.key === currentPhoto.path) return prev;
      
      // 将之前的层标记为正在退出
      const newLayers = prev.map(l => ({ ...l, isExiting: true }));
      // 只保留最后两层
      const limited = newLayers.slice(-1);
      return [...limited, { photo: currentPhoto, key: currentPhoto.path, isReady: false, isExiting: false }];
    });
  }, [currentPhoto.path]);

  const handleLayerReady = (key) => {
    setLayers(prev => prev.map(l => l.key === key ? { ...l, isReady: true } : l));
    
    // 延迟清理 (1.5s 动画 + 0.5s 缓冲)
    setTimeout(() => {
      setLayers(prev => {
        const idx = prev.findIndex(l => l.key === key);
        if (idx > 0) return prev.slice(idx);
        return prev;
      });
    }, 2000);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {layers.map((layer, index) => (
        <PhotoLayer 
          key={layer.key}
          photo={layer.photo}
          isActive={layer.isReady}
          isExiting={layer.isExiting}
          onReady={() => handleLayerReady(layer.key)}
          zIndex={index}
        />
      ))}
    </div>
  );
}

function PhotoLayer({ photo, isActive, isExiting, onReady, zIndex }) {
  const url = useObjectUrl(photo?.handle);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: isExiting ? 0 : (isActive ? 1 : 0) 
      }}
      transition={{ 
        duration: 1.5, 
        ease: "easeInOut",
        // 当退出时，同步微调延迟至 1.2s，确保新图接近完全不透明时开始淡出
        delay: isExiting ? 1.2 : 0 
      }}
      style={{ zIndex }}
      className="absolute inset-0 flex items-center justify-center p-4"
    >
      {url ? (
        <img 
          src={url} 
          alt={photo?.name} 
          onLoad={onReady}
          className="max-w-[95vw] max-h-[90vh] object-contain shadow-2xl select-none"
        />
      ) : (
        <div className="w-12 h-12 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
      )}
    </motion.div>
  );
}

function InfoItem({ label, value, icon, color = "text-neutral-300" }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
        {icon} {label}
      </p>
      <p className={clsx("text-sm font-medium break-words", color)}>{value}</p>
    </div>
  );
}
