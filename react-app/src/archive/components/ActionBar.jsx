import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Download, Trash2, Layers, Map, Plane } from 'lucide-react';
import clsx from 'clsx';

export function ActionBar({ selectedIds, onClear, onMerge, onDownload, onDelete }) {
  const selectionCount = selectedIds?.size || 0;
  if (selectionCount === 0) return null;

  // 解析选中项类型
  const ids = Array.from(selectedIds);
  const typeCounts = ids.reduce((acc, id) => {
    const type = id.startsWith('trip:') ? 'trip' : id.startsWith('event:') ? 'event' : 'photo';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const selectedTypes = Object.keys(typeCounts);
  const primaryType = selectedTypes.length === 1 ? selectedTypes[0] : 'mixed';

  // 动态主题配置
  const THEMES = {
    photo: { color: 'blue', text: 'Photos', icon: Layers, btnBg: 'bg-blue-600', btnHover: 'hover:bg-blue-500', accent: 'text-blue-400', shadow: 'shadow-blue-600/20' },
    event: { color: 'orange', text: 'Events', icon: Map, btnBg: 'bg-orange-600', btnHover: 'hover:bg-orange-500', accent: 'text-orange-400', shadow: 'shadow-orange-600/20' },
    trip: { color: 'purple', text: 'Trips', icon: Plane, btnBg: 'bg-purple-600', btnHover: 'hover:bg-purple-500', accent: 'text-purple-400', shadow: 'shadow-purple-600/20' },
    mixed: { color: 'blue', text: 'Items', icon: Layers, btnBg: 'bg-blue-600', btnHover: 'hover:bg-blue-500', accent: 'text-blue-400', shadow: 'shadow-blue-600/20' }
  };

  const theme = THEMES[primaryType];
  const label = `${selectionCount} ${selectionCount === 1 ? theme.text.slice(0, -1) : theme.text} Selected`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, x: '-50%', opacity: 0 }}
        animate={{ y: 0, x: '-50%', opacity: 1 }}
        exit={{ y: 100, x: '-50%', opacity: 0 }}
        className="fixed bottom-10 left-1/2 z-[200] w-max max-w-[90vw]"
      >
        <div className="bg-[#111215]/80 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6">
          <div className="flex items-center gap-4 pr-6 border-r border-white/10">
            <button 
              onClick={onClear}
              className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-white text-sm font-bold tracking-tight">{label}</span>
              <span className={clsx("text-[10px] font-black uppercase tracking-widest", theme.accent)}>Selection Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton icon={<FolderPlus size={18} />} onClick={() => {}} />
            <ActionButton icon={<Download size={18} />} onClick={onDownload} />
            <ActionButton icon={<Trash2 size={18} className="text-red-400" />} onClick={onDelete} />
          </div>

          <button
            onClick={onMerge}
            className={clsx(
              "ml-4 flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-all shadow-lg active:scale-95",
              theme.btnBg, theme.btnHover, theme.shadow
            )}
          >
            <theme.icon size={16} />
            {primaryType === 'trip' ? 'Archive to Trip' : primaryType === 'event' ? 'Add to Event' : 'Merge to Event'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionButton({ icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-3 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white transition-all active:scale-90"
    >
      {icon}
    </button>
  );
}
