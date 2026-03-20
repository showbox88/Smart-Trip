import { motion, AnimatePresence } from 'framer-motion';
import { X, Plane, Briefcase, CheckCircle2, Layers, Flag, Calendar, Activity, Plus, Heart } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import clsx from 'clsx';

const STAGES = ['Planning', 'Completed', 'Ongoing', 'Canceled'];

export function CreateTripModal({ isOpen, onClose, events, metadata = {}, onCreate, initialSelectedIds = [], allPhotos = [] }) {
  const categories = metadata.categories || [];
  
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || '旅行');
  const [rating, setRating] = useState(8);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [spending, setSpending] = useState(0);
  const [currency, setCurrency] = useState('CNY');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState(new Set(initialSelectedIds));

  useEffect(() => {
    if (isOpen) {
      setSelectedEventIds(new Set(initialSelectedIds));
    }
  }, [isOpen, initialSelectedIds]);

  // 获取选定事件的预览照片
  const previewPhotos = useMemo(() => {
    if (!isOpen || selectedEventIds.size === 0 || !allPhotos.length) return [];
    
    const ids = Array.from(selectedEventIds);
    const photos = [];
    
    // 为每个选定事件尝试找一张照片，最多找三张不同事件的照片
    for (const eventId of ids) {
      const photo = allPhotos.find(p => String(p.event_id) === String(eventId));
      if (photo) photos.push(photo);
      if (photos.length >= 3) break;
    }
    
    return photos;
  }, [isOpen, selectedEventIds, allPhotos]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    
    onCreate({
      title,
      city,
      category,
      rating,
      startDate,
      endDate,
      spending: parseFloat(spending) || 0,
      currency,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      notes,
      eventIds: Array.from(selectedEventIds),
    });
    
    onClose();
    // Reset
    setTitle('');
    setCity('');
    setCategory('旅行');
    setRating(8);
    setStartDate('');
    setEndDate('');
    setSpending(0);
    setCurrency('CNY');
    setLatitude('');
    setLongitude('');
    setTags('');
    setNotes('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl bg-[#16171d] border border-white/10 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl">
                    <Plus size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white">开启新行程档案</h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      记录一段完整的旅程，整合 {selectedEventIds.size} 个选定事件
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {previewPhotos.length > 0 && (
                <div className="mb-8 flex items-center gap-8 p-5 bg-white/5 rounded-2xl border border-white/5 ring-1 ring-white/5 relative overflow-hidden">
                  <div className="flex-1 flex items-center h-20 relative px-2">
                    <div className="flex items-center w-full h-full relative">
                      {previewPhotos.map((p, idx) => {
                        const total = previewPhotos.length;
                        const thumbWidth = 80;
                        const maxGap = 12;
                        const containerWidth = 600;
                        
                        const idealWidth = total * thumbWidth + (total - 1) * maxGap;
                        
                        let xOffset = 0;
                        if (idealWidth <= containerWidth) {
                          xOffset = idx * (thumbWidth + maxGap);
                        } else {
                          const step = (containerWidth - thumbWidth) / (total - 1);
                          xOffset = idx * step;
                        }

                        return (
                          <motion.div 
                            key={p.path}
                            className="absolute top-0 w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 group/thumb"
                            initial={{ x: xOffset + 40, opacity: 0 }}
                            animate={{ 
                              x: xOffset, 
                              opacity: 1,
                              zIndex: idx
                            }}
                            whileHover={{ 
                              y: -8, 
                              scale: 1.1, 
                              zIndex: 100,
                              transition: { duration: 0.2 }
                            }}
                            style={{ left: 0 }}
                          >
                            <PhotoThumbnail 
                              handle={p.handle} 
                              layoutId={`event:${p.event_id}`} 
                              index={idx}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="shrink-0 pl-4 border-l border-white/5">
                     <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">
                       正在整合回忆
                     </p>
                     <p className="text-sm font-medium text-neutral-300 truncate max-w-[150px]">
                       {selectedEventIds.size} 个选定事件
                     </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: Core Info */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">行程标题</label>
                      <input
                        autoFocus
                        type="text"
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-5 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-purple-500/10 text-white text-sm"
                        placeholder="例如：巴塞罗那 2024 夏日庆典"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">出发城市</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 text-white text-sm"
                          placeholder="北京 / 东京..."
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">分类</label>
                        <select
                          className="w-full bg-[#1e1f28] border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all text-white text-sm cursor-pointer"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {categories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">好感度 ({rating}/10)</label>
                      <div className="flex items-center gap-2 bg-white/5 px-5 py-4 rounded-2xl border border-white/10">
                        {[...Array(10)].map((_, i) => {
                          const val = i + 1;
                          const active = val <= rating;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setRating(val)}
                              className={clsx(
                                "transition-all hover:scale-125 active:scale-95",
                                active ? "text-red-500" : "text-white/10 hover:text-white/30"
                              )}
                            >
                              {active ? (
                                <Heart size={18} fill="currentColor" strokeWidth={0} />
                              ) : (
                                <Heart size={18} strokeWidth={2} />
                              )}
                            </button>
                          );
                        })}
                        <div className="ml-auto pl-4 border-l border-white/10">
                           <span className="text-purple-400 font-bold text-lg min-w-[2ch] tabular-nums">{rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Logistics */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">开始日期</label>
                        <input
                          type="date"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 text-sm font-medium outline-none transition-all text-white [color-scheme:dark]"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">结束日期</label>
                        <input
                          type="date"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 text-sm font-medium outline-none transition-all text-white [color-scheme:dark]"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">消费金额</label>
                        <input
                          type="number"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 text-white text-sm"
                          placeholder="0.00"
                          value={spending}
                          onChange={(e) => setSpending(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">货币</label>
                        <select
                          className="w-full bg-[#1e1f28] border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all text-white text-sm cursor-pointer"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                        >
                          <option value="CNY">人民币 (¥)</option>
                          <option value="USD">美元 ($)</option>
                          <option value="JPY">日元 (¥)</option>
                          <option value="EUR">欧元 (€)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">GPS 纬度</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 text-white text-sm"
                          placeholder="Lat (例如 39.9)"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">GPS 经度</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-4 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 text-white text-sm"
                          placeholder="Lng (例如 116.4)"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tags & Notes */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">标签 (用逗号隔开)</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-5 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-purple-500/10 text-white text-sm"
                        placeholder="美食, 拍照, 艺术..."
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-2 ml-1">备注</label>
                      <textarea
                        className="w-full h-[155px] bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-2xl px-5 py-4 font-medium outline-none transition-all placeholder:text-neutral-600 focus:ring-1 focus:ring-purple-500/10 text-white text-sm resize-none"
                        placeholder="在这里记录你的心情、攻略或未尽的事宜..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 font-bold transition-all text-neutral-400 hover:text-white"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!title}
                    className="flex-[2] px-6 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-all shadow-xl shadow-purple-900/20 text-white"
                  >
                    创建行程并完成归档
                  </button>
                </div>
              </form>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PhotoThumbnail({ handle, layoutId, index }) {
  const url = useObjectUrl(handle);
  return (
    <div className="w-full h-full bg-neutral-800 flex items-center justify-center overflow-hidden">
      {url ? (
        <motion.img 
          layoutId={layoutId}
          src={url} 
          alt="" 
          className="w-full h-full object-cover" 
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 20,
            mass: 1.2,
            delay: index * 0.05
          }}
        />
      ) : (
        <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
      )}
    </div>
  );
}
