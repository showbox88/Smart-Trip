import { motion, AnimatePresence } from 'framer-motion';
import { Tag, MapPin, Check, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export function FilterMenu({ filterState, onFilterChange, photos = [], t }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Counts for each filter
  const unclassifiedCount = photos.filter(p => !p.category).length;
  const noCityCount = photos.filter(p => !p.city).length;

  // Derived label
  const activeCount = Object.values(filterState).filter(Boolean).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 border",
          activeCount > 0 
            ? "bg-blue-600/20 border-blue-500/50 text-blue-400" 
            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
        )}
      >
        <div className="relative">
          <Tag size={18} className={clsx(activeCount > 0 && "text-blue-400")} />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#0b0c10]" />
          )}
        </div>
        <span>{t('app.filters.label')}</span>
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-md leading-none">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={clsx("transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-64 bg-[#1a1b1e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[150] ring-1 ring-black/50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-xs font-bold text-white">{t('app.filters.title')}</p>
              <p className="text-[10px] text-neutral-500">{t('app.filters.subtitle')}</p>
            </div>

            <FilterOption 
              icon={Tag}
              label={t('app.filters.unclassified')}
              count={unclassifiedCount}
              isActive={filterState.unclassified}
              onClick={() => onFilterChange({ ...filterState, unclassified: !filterState.unclassified })}
              colorClass="text-purple-400"
              t={t}
            />

            <FilterOption 
              icon={MapPin}
              label={t('app.filters.noCity')}
              count={noCityCount}
              isActive={filterState.noCity}
              onClick={() => onFilterChange({ ...filterState, noCity: !filterState.noCity })}
              colorClass="text-orange-400"
              t={t}
            />
            
            {activeCount > 0 && (
              <button
                onClick={() => onFilterChange({ unclassified: false, noCity: false })}
                className="w-full mt-2 px-3 py-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 text-center transition-colors uppercase tracking-widest"
              >
                {t('app.filters.reset')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterOption({ icon: Icon, label, count, isActive, onClick, colorClass, t }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
        isActive ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isActive ? "bg-blue-600/20" : "bg-neutral-800"
        )}>
          <Icon size={16} className={clsx(isActive ? "text-blue-400" : "text-neutral-500 group-hover:text-neutral-300")} />
        </div>
        <div className="flex flex-col items-start">
          <span className={clsx("text-xs font-medium", isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200")}>
            {label}
          </span>
          <span className="text-[9px] text-neutral-600 font-bold">
            {t('app.grid.photosCount').replace('{{count}}', count)}
          </span>
        </div>
      </div>
      <div className={clsx(
        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
        isActive ? "bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-white/10"
      )}>
        {isActive && <Check size={12} className="text-white" />}
      </div>
    </button>
  );
}
