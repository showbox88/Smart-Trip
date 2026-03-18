import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Calendar, MapPin, Tag, FileText, DollarSign, Clock, Info, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import clsx from 'clsx';
import { format } from 'date-fns';

export function DetailModal({ isOpen, onClose, type, item, allPhotos = [], metadata = {}, onUpdate }) {
  const [formData, setFormData] = useState({});
  const isTrip = type === 'trip';
  const isEvent = type === 'event';
  const isPhoto = type === 'photo';

  const categories = metadata.categories || [];
  const cities = metadata.cities || [];

  // Helper to find color for a name
  const getPropertyColor = (name, list) => {
    const found = (list || []).find(it => (typeof it === 'string' ? it === name : it.name === name));
    return found?.color || found?.hex || '#60a5fa'; // Default blue
  };

  const displayCities = useMemo(() => {
    if (!item) return [];
    if (isPhoto) return [formData.city].filter(Boolean);
    
    if (isEvent) {
      // Aggregate cities from all photos in this event
      const eventPhotos = allPhotos.filter(p => String(p.event_id) === String(item.event_id));
      const citiesFromPhotos = eventPhotos.map(p => p.city).filter(Boolean);
      return Array.from(new Set(citiesFromPhotos));
    }

    if (isTrip) {
      // Aggregate cities from all events in this trip
      const tripEvents = (metadata.events || []).filter(e => String(e.trip_id) === String(item.trip_id));
      
      // Also need to consider photos directly in trip but not in events
      const tripPhotos = allPhotos.filter(p => String(p.trip_id) === String(item.trip_id));
      
      const citiesFromEvents = tripEvents.flatMap(e => {
          // If we want it truly transitive, we should look at photos of these events
          const ePhotos = allPhotos.filter(p => String(p.event_id) === String(e.event_id));
          return [e.city, ...ePhotos.map(p => p.city)];
      });
      const citiesFromDirectPhotos = tripPhotos.map(p => p.city);
      
      return Array.from(new Set([...citiesFromEvents, ...citiesFromDirectPhotos].filter(Boolean)));
    }
    return [];
  }, [type, item, allPhotos, metadata.events, formData.city, item?.event_id, item?.trip_id, isPhoto, isEvent, isTrip]);

  // 根据类型配置主题
  const theme = {
    trip: {
      color: 'purple',
      accent: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      ring: 'focus:ring-purple-500/20',
      btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20',
      label: '行程详情'
    },
    event: {
      color: 'orange',
      accent: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      ring: 'focus:ring-orange-500/20',
      btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20',
      label: '事件详情'
    },
    photo: {
      color: 'blue',
      accent: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      ring: 'focus:ring-blue-500/20',
      btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
      label: '照片详情'
    }
  }[type] || { color: 'blue', accent: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', ring: 'focus:ring-blue-500/20', btn: 'bg-blue-600', label: '详情' };

  useEffect(() => {
    if (isOpen && item) {
      setFormData({
        title: item.title || (isPhoto ? (item.name || '') : ''),
        rating: item.rating ?? 0,
        category: item.category || '',
        city: item.city || '',
        startDate: (item.startDate || item.date || '').split('T')[0],
        endDate: item.endDate || '',
        time: item.time || '',
        spending: item.spending ?? 0,
        currency: item.currency || 'CNY',
        latitude: item.latitude ?? (isPhoto ? item.latitude : ''),
        longitude: item.longitude ?? (isPhoto ? item.longitude : ''),
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
        notes: item.notes || ''
      });
    }
  }, [isOpen, item, isPhoto]);

  // 获取封面图逻辑
  const coverPhoto = useMemo(() => {
    if (!item || !isOpen) return null;
    if (isPhoto) return item;
    
    // 对于行程或事件，查找关联照片
    if (isTrip) {
      if (item.cover_photo_id) {
        const cover = allPhotos.find(p => p.path === item.cover_photo_id);
        if (cover) return cover;
      }
      const tripPhotos = allPhotos.filter(p => p.trip_id === item.trip_id);
      return tripPhotos[0] || null;
    }
    
    if (isEvent) {
      const eventPhotos = allPhotos.filter(p => p.event_id === item.event_id);
      return eventPhotos[0] || null;
    }
    
    return null;
  }, [item, isOpen, isPhoto, isTrip, isEvent, allPhotos]);

  const coverUrl = useObjectUrl(coverPhoto?.handle);

  if (!isOpen || !item) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const updatedData = { ...formData };
    if (typeof updatedData.tags === 'string') {
      updatedData.tags = updatedData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    // 数值转换
    updatedData.rating = parseInt(updatedData.rating);
    updatedData.spending = parseFloat(updatedData.spending) || 0;
    if (updatedData.latitude) updatedData.latitude = parseFloat(updatedData.latitude);
    if (updatedData.longitude) updatedData.longitude = parseFloat(updatedData.longitude);

    onUpdate(isTrip ? item.trip_id : (isEvent ? item.event_id : item.path), updatedData);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={clsx(
            "relative w-full max-w-4xl bg-[#0f1115] border rounded-3xl overflow-hidden shadow-2xl",
            theme.border
          )}
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={clsx("p-3 rounded-2xl", theme.bg)}>
                <Info size={24} className={theme.accent} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white">{theme.label}</h3>
                <p className="text-xs text-neutral-500 font-medium">查看并编辑该{isTrip ? '行程' : isEvent ? '事件' : '照片'}的详细信息</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Hero Banner Area */}
          <div className="px-8 pt-2">
            <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden bg-white/5 border border-white/10 group shadow-2xl">
                {coverUrl ? (
                    <img 
                        src={coverUrl} 
                        alt="Cover" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-700">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Preview available</span>
                    </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent opacity-60" />
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Basic Info */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">标题/名称</label>
                  <input
                    type="text"
                    className={clsx(
                      "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold outline-none transition-all placeholder:text-neutral-700 text-white text-sm",
                      theme.ring, "focus:border-" + theme.color + "-500/40"
                    )}
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">
                    好感度 ({formData.rating ?? 0}/10)
                  </label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 transition-all hover:bg-white/[0.07]">
                    {[...Array(10)].map((_, i) => {
                      const val = i + 1;
                      const active = val <= (formData.rating ?? 0);
                      return (
                        <button
                          key={i}
                          onClick={() => handleChange('rating', val)}
                          className={clsx(
                            "transition-all duration-300 transform hover:scale-125 active:scale-95",
                            active ? "text-red-500" : "text-white/10 hover:text-white/30"
                          )}
                        >
                          {active ? (
                            <Heart size={20} fill="currentColor" strokeWidth={0} />
                          ) : (
                            <Heart size={20} strokeWidth={2} />
                          )}
                        </button>
                      );
                    })}
                    <div className="ml-auto pl-4 border-l border-white/10">
                       <span className={clsx("font-black text-xl tabular-nums", theme.accent)}>
                         {formData.rating ?? 0}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                  {!isTrip && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">分类</label>
                      <div className="relative group/select">
                        <div 
                          className="w-full h-[54px] bg-white/5 border border-white/10 rounded-2xl px-4 flex items-center gap-3 transition-all group-hover/select:border-white/20"
                          style={{ 
                            backgroundColor: formData.category ? `${getPropertyColor(formData.category, categories)}15` : undefined,
                            borderColor: formData.category ? `${getPropertyColor(formData.category, categories)}40` : undefined
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.3)]" 
                            style={{ backgroundColor: getPropertyColor(formData.category, categories) }}
                          />
                          <select
                            className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none appearance-none cursor-pointer"
                            value={formData.category || ''}
                            onChange={(e) => handleChange('category', e.target.value)}
                          >
                            <option value="" disabled className="bg-[#1a1b1e]">选择分类...</option>
                            {categories.map(cat => (
                              <option key={cat.name} value={cat.name} className="bg-[#1a1b1e]">{cat.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="text-neutral-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={clsx(isTrip && "col-span-full")}>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">城市</label>
                    {isPhoto ? (
                      <div className="relative group/select">
                        <div 
                          className="w-full h-[54px] bg-white/5 border border-white/10 rounded-2xl px-4 flex items-center gap-3 transition-all group-hover/select:border-white/20"
                          style={{ 
                            backgroundColor: formData.city ? `${getPropertyColor(formData.city, metadata.cities)}15` : undefined,
                            borderColor: formData.city ? `${getPropertyColor(formData.city, metadata.cities)}40` : undefined
                          }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.3)]" 
                            style={{ backgroundColor: getPropertyColor(formData.city, metadata.cities) }}
                          />
                          <select
                            className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none appearance-none cursor-pointer"
                            value={formData.city || ''}
                            onChange={(e) => handleChange('city', e.target.value)}
                          >
                            <option value="" disabled className="bg-[#1a1b1e]">选择城市...</option>
                            {(metadata.cities || []).map(city => (
                              <option key={city.name} value={city.name} className="bg-[#1a1b1e]">{city.name}</option>
                            ))}
                            {formData.city && !(metadata.cities || []).some(c => c.name === formData.city) && (
                               <option value={formData.city} className="bg-[#1a1b1e]">{formData.city}</option>
                            )}
                          </select>
                          <ChevronDown size={14} className="text-neutral-500 pointer-events-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 p-2 min-h-[54px] bg-white/5 border border-white/10 rounded-2xl">
                        {displayCities.length > 0 ? (
                          displayCities.map(cityName => (
                            <span 
                              key={cityName}
                              className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/5"
                            >
                              <div 
                                className="w-1.5 h-1.5 rounded-full" 
                                style={{ backgroundColor: getPropertyColor(cityName, metadata.cities) }}
                              />
                              {cityName}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-600 italic px-2 py-2">暂无关联城市</span>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>

              {/* Middle Column: Meta Data */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1 truncate">
                      {isTrip ? '开始日期' : '发生日期'}
                    </label>
                    <div className="relative group">
                      <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors pointer-events-none" />
                      <input
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-3 py-4 text-xs font-bold text-white outline-none [color-scheme:dark] focus:border-white/20 transition-all"
                        value={formData.startDate || ''}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1 truncate">
                      {isTrip ? '结束日期' : '拍摄时间'}
                    </label>
                    <div className="relative group">
                      {isTrip ? (
                         <>
                           <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors pointer-events-none" />
                           <input
                             type="date"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-3 py-4 text-xs font-bold text-white outline-none [color-scheme:dark] focus:border-white/20 transition-all"
                             value={formData.endDate || ''}
                             onChange={(e) => handleChange('endDate', e.target.value)}
                           />
                         </>
                      ) : (
                         <>
                           <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors pointer-events-none" />
                           <input
                             type="time"
                             step="1"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-3 py-4 text-xs font-bold text-white outline-none [color-scheme:dark] focus:border-white/20 transition-all"
                             value={formData.time || ''}
                             onChange={(e) => handleChange('time', e.target.value)}
                           />
                         </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">消费金额</label>
                    <div className="relative group">
                      <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors pointer-events-none" />
                      <input
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-white/20 transition-all"
                        value={formData.spending ?? 0}
                        onChange={(e) => handleChange('spending', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">货币选择</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                         <span className="text-xs font-bold text-neutral-500 group-focus-within:text-white transition-colors">$</span>
                      </div>
                      <select
                        className="w-full h-[58px] bg-[#1c1d24] border border-white/10 rounded-2xl pl-10 pr-4 text-xs font-bold text-white outline-none appearance-none cursor-pointer focus:border-white/20 transition-all"
                        value={formData.currency || 'CNY'}
                        onChange={(e) => handleChange('currency', e.target.value)}
                      >
                        <option value="CNY">人民币 (CNY)</option>
                        <option value="USD">美元 (USD)</option>
                        <option value="EUR">欧元 (EUR)</option>
                        <option value="JPY">日元 (JPY)</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                  {!isTrip && (
                    <div className="grid grid-cols-2 gap-3 text-neutral-400">
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">坐标 (LAT)</label>
                        <div className="relative group">
                          <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" />
                          <input
                            type="text"
                            placeholder="0.0000"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-[11px] font-bold text-white outline-none focus:border-white/20 transition-all bg-transparent"
                            value={formData.latitude || ''}
                            onChange={(e) => handleChange('latitude', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">坐标 (LNG)</label>
                        <div className="relative group">
                          <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" />
                          <input
                            type="text"
                            placeholder="0.0000"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-[11px] font-bold text-white outline-none focus:border-white/20 transition-all bg-transparent"
                            value={formData.longitude || ''}
                            onChange={(e) => handleChange('longitude', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Right Column: Tags & Notes */}
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">标签</label>
                  <div className="relative">
                    <Tag size={14} className="absolute left-4 top-[1.3rem] text-neutral-500" />
                    <input
                      type="text"
                      placeholder="逗号隔开..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold text-white outline-none placeholder:text-neutral-700"
                      value={formData.tags || ''}
                      onChange={(e) => handleChange('tags', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 ml-1">详细备注</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-4 top-4 text-neutral-500" />
                    <textarea
                      placeholder="记录此时的心情或故事..."
                      className="w-full h-[145px] bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-sm font-medium text-white outline-none resize-none placeholder:text-neutral-700"
                      value={formData.notes || ''}
                      onChange={(e) => handleChange('notes', e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Buttons */}
          <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-400 font-bold transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className={clsx(
                "flex-[2] py-4 rounded-2xl text-white font-black tracking-tight transition-all shadow-xl active:scale-[0.98]",
                theme.btn
              )}
            >
              保存更改
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
