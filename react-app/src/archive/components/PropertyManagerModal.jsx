import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Tag, MapPin, SlidersHorizontal, Check, Palette } from 'lucide-react';
import clsx from 'clsx';

const PRESET_COLORS = [
  '#60a5fa', // blue-400
  '#f87171', // red-400
  '#34d399', // emerald-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#94a3b8', // slate-400
  '#38bdf8', // sky-400
  '#4ade80', // green-400
];

export function PropertyManagerModal({ isOpen, onClose, metadata, onUpdate, t }) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'cities' | 'tags'
  const [newValue, setNewValue] = useState('');
  const [hoveredColorIdx, setHoveredColorIdx] = useState(null);

  if (!isOpen) return null;

  const currentList = metadata[activeTab] || [];

  const handleAdd = () => {
    if (!newValue.trim()) return;
    if (currentList.some(item => item.name === newValue.trim())) return;
    
    // Switch from random to sequential to ensure visual variety
    const sequentialColor = PRESET_COLORS[currentList.length % PRESET_COLORS.length];
    const newList = [...currentList, { name: newValue.trim(), color: sequentialColor }];
    onUpdate({ [activeTab]: newList });
    setNewValue('');
  };

  const handleRemove = (name) => {
    const newList = currentList.filter(i => i.name !== name);
    onUpdate({ [activeTab]: newList });
  };

  const handleColorChange = (name, newColor) => {
    const newList = currentList.map(item => 
      item.name === name ? { ...item, color: newColor } : item
    );
    onUpdate({ [activeTab]: newList });
  };

  const tabs = [
    { id: 'categories', label: t('app.propertyModal.tabCategories'), icon: Tag, color: 'text-blue-400' },
    { id: 'cities', label: t('app.propertyModal.tabCities'), icon: MapPin, color: 'text-emerald-400' },
    { id: 'tags', label: t('app.propertyModal.tabTags'), icon: SlidersHorizontal, color: 'text-purple-400' },
  ];

  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || activeTab;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-[#1a1b1e] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-white/[0.02] to-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <SlidersHorizontal size={24} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{t('app.propertyModal.title')}</h2>
                <p className="text-sm text-neutral-500 font-medium">{t('app.propertyModal.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/5 rounded-2xl text-neutral-500 hover:text-white transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-40 border-r border-white/5 p-4 flex flex-col gap-2 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setNewValue(''); }}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all",
                    activeTab === tab.id 
                      ? "bg-white/10 text-white shadow-lg ring-1 ring-white/10" 
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                  )}
                >
                  <tab.icon size={18} className={clsx(activeTab === tab.id ? tab.color : "text-neutral-600")} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
              {/* Add New */}
              <div className="flex gap-3 mb-6 shrink-0">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder={t('app.propertyModal.addPlaceholder').replace('{{tab}}', activeTabLabel)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!newValue.trim()}
                  className="px-6 py-3 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-sm font-black text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  <Plus size={18} strokeWidth={3} />
                  {t('app.propertyModal.addButton')}
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 gap-3">
                  {currentList.map((item, idx) => (
                    <motion.div
                      layout
                      key={item.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Interactive Color Ball */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              const currIdx = PRESET_COLORS.indexOf(item.color);
                              const nextIdx = (currIdx + 1) % PRESET_COLORS.length;
                              handleColorChange(item.name, PRESET_COLORS[nextIdx]);
                            }}
                            className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white/10 hover:ring-white/30 transition-all shrink-0 active:scale-90"
                            style={{ backgroundColor: item.color }}
                            title={t('app.propertyModal.clickToChangeColor')}
                          />
                        </div>
                        
                        <span className="text-sm font-bold text-neutral-300 truncate">{item.name}</span>
                      </div>

                      <button
                        onClick={() => handleRemove(item.name)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-all scale-90 group-hover:scale-100 shrink-0"
                        title={t('app.propertyModal.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                  {currentList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-600 italic">
                      <p className="text-sm">{t('app.propertyModal.emptyState').replace('{{tab}}', activeTabLabel)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-all active:scale-95"
            >
              {t('app.propertyModal.done')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
