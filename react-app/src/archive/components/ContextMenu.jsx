import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, Info, Trash2, Tag, Move, Layers, ChevronRight, Briefcase, 
  ImagePlus, Heart, MapPin, Utensils, Landmark, Bed, Plane, Leaf, 
  User, ShoppingBag, Camera, Globe, MoreHorizontal 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';

const CATEGORY_ICONS = {
  '美食': Utensils,
  'Food': Utensils,
  '景点': Landmark,
  'Attractions': Landmark,
  '街景': Camera,
  'Street View': Camera,
  '酒店': Bed,
  'Hotel': Bed,
  '交通': Plane,
  'Transport': Plane,
  '自然': Leaf,
  'Nature': Leaf,
  '人像': User,
  'Portrait': User,
  '购物': ShoppingBag,
  'Shopping': ShoppingBag,
  '其他': MoreHorizontal,
  'Other': MoreHorizontal,
  '旅行': Globe,
  'Travel': Globe
};

export function ContextMenu({ menu, onClose, onAction, trips = [], events = [], categories = [], cities = [], selectedTripId = null, t }) {
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [hoveredRating, setHoveredRating] = useState(null);

  // Multi-column Layout Helper
  const ROWS_PER_COLUMN = 5;

  const categoryChunks = useMemo(() => {
    const chunks = [];
    const sorted = [...categories].sort((a, b) => {
      const nameA = typeof a === 'object' ? a.name : String(a);
      const nameB = typeof b === 'object' ? b.name : String(b);
      return nameA.localeCompare(nameB, 'zh-CN');
    });
    for (let i = 0; i < sorted.length; i += ROWS_PER_COLUMN) {
      chunks.push(sorted.slice(i, i + ROWS_PER_COLUMN));
    }
    return chunks;
  }, [categories]);

  const cityChunks = useMemo(() => {
    const chunks = [];
    const sorted = [...cities].sort((a, b) => {
      const nameA = typeof a === 'object' ? a.name : String(a);
      const nameB = typeof b === 'object' ? b.name : String(b);
      return nameA.localeCompare(nameB, 'zh-CN');
    });
    for (let i = 0; i < sorted.length; i += ROWS_PER_COLUMN) {
      chunks.push(sorted.slice(i, i + ROWS_PER_COLUMN));
    }
    return chunks;
  }, [cities]);

  if (!menu) return null;

  const targetType = menu.data?.type || 'photo';

  // Extract implicit trip_id from event if necessary
  let currentTripId = selectedTripId || menu.data?.trip_id;
  if (!currentTripId && targetType === 'photo' && menu.data?.event_id) {
      const parentEvent = events.find(e => e.event_id === menu.data.event_id);
      if (parentEvent?.trip_id) {
          currentTripId = parentEvent.trip_id;
      }
  }

  const handleAction = (id, extraData) => {
    onAction(id, menu.data, extraData);
    onClose();
  };

  // Constants for sizing
  const MENU_WIDTH = 280;
  const SUBMENU_WIDTH = 210; // Safe max for sub-menus
  const MENU_HEIGHT_ESTIMATE = 480; // Vertical safe area

  // Calculate main menu position
  let finalX = menu.mouseX;
  let finalY = menu.mouseY;

  if (finalX + MENU_WIDTH > window.innerWidth) {
    finalX = window.innerWidth - MENU_WIDTH - 10;
  }
  if (finalY + MENU_HEIGHT_ESTIMATE > window.innerHeight) {
    finalY = window.innerHeight - MENU_HEIGHT_ESTIMATE - 10;
  }

  // Determine sub-menu direction
  const showSubmenuOnLeft = finalX + MENU_WIDTH + SUBMENU_WIDTH > window.innerWidth;
  const subMenuPosClass = showSubmenuOnLeft 
    ? "absolute right-full top-0 mr-2" 
    : "absolute left-full top-0 ml-2";
  const subMenuAnimX = showSubmenuOnLeft ? 10 : -10;


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[100] min-w-[280px] bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 ring-1 ring-black/50"
      style={{ top: finalY, left: finalX }}
      onMouseLeave={() => {
        setActiveSubmenu(null);
        setHoveredRating(null);
      }}
    >
      {/* Photo Actions */}
      {targetType === 'photo' && (
        <>
          <button
            onClick={() => handleAction('create-event', { skipModal: true })}
            className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-orange-400"
          >
            <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
              {t('app.context.gatherNew')}
            </span>
          </button>

          <div className="relative">
            <button
              onMouseEnter={() => setActiveSubmenu('category')}
              className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-blue-400"
            >
              <div className="flex items-center gap-3">
                <Tag size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
                  {t('app.context.editCategory')}
                </span>
              </div>
              <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {activeSubmenu === 'category' && (
                <motion.div
                  initial={{ opacity: 0, x: subMenuAnimX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: subMenuAnimX }}
                  className={`${subMenuPosClass} min-w-max bg-[#0e0f12] border border-white/10 rounded-[2rem] shadow-2xl p-5 flex flex-col gap-5 ring-1 ring-black/50 translate-z-0`}
                >
                  <div className="flex flex-col gap-2">
                    <p className="px-3 py-1 text-[9px] uppercase tracking-widest text-neutral-600 font-black">
                      {t('app.context.updateCategory')}
                    </p>
                    {/* Top-level Add New Category Action */}
                    <button
                      onClick={() => handleAction('create-category')}
                      className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl bg-blue-500/10 hover:bg-[#252629]! transition-all group text-left border border-blue-500/20 shadow-md shadow-blue-500/5 mb-0.5"
                    >
                      <PlusCircle size={20} className="text-blue-400" />
                      <span className="text-[16px] font-medium text-blue-400">
                        {t('app.context.addCategory')}
                      </span>
                    </button>
                  </div>

                  {/* Multi-column Category Grid */}
                  <div className="flex gap-4">
                    {categoryChunks.length > 0 ? (
                      categoryChunks.map((chunk, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-2.5 min-w-[180px]">
                          {chunk.map((cat, rowIdx) => {
                            const rawName = typeof cat === 'object' ? cat.name : cat;
                            const name = (rawName || '').trim();
                            const color = typeof cat === 'object' ? cat.color : '#60a5fa';
                              const Icon = CATEGORY_ICONS[name] || Tag;
                              const translatedName = t('app.category.' + name);
                              const displayName = translatedName !== 'app.category.' + name ? translatedName : name;
                              
                              return (
                                <button
                                  key={`${name}-${colIdx}-${rowIdx}`}
                                  onClick={() => handleAction('set-category', { category: name })}
                                  className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-left"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Icon 
                                      size={16} 
                                      style={{ color: color }} 
                                      className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" 
                                    />
                                    <span className="text-[16px] font-medium text-neutral-300 group-hover:text-white truncate">
                                      {displayName}
                                    </span>
                                  </div>
                                </button>
                              );
                          })}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center min-w-[150px]">
                         <span className="text-xs text-neutral-600 italic">No categories added</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onMouseEnter={() => setActiveSubmenu('city')}
              className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-emerald-400"
            >
              <div className="flex items-center gap-3">
                <MapPin size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
                  {t('app.context.editCity')}
                </span>
              </div>
              <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {activeSubmenu === 'city' && (
                <motion.div
                  initial={{ opacity: 0, x: subMenuAnimX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: subMenuAnimX }}
                  className={`${subMenuPosClass} min-w-max bg-[#0e0f12] border border-white/10 rounded-[2rem] shadow-2xl p-5 flex flex-col gap-5 ring-1 ring-black/50 translate-z-0`}
                >
                  <div className="flex flex-col gap-2">
                    <p className="px-3 py-1 text-[9px] uppercase tracking-widest text-neutral-600 font-black">
                      {t('app.context.updateCity')}
                    </p>
                    
                    {/* Top-level Add New City Action */}
                    <button
                      onClick={() => handleAction('create-city')}
                      className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl bg-emerald-500/10 hover:bg-[#252629]! transition-all group text-left border border-emerald-500/20 shadow-md shadow-emerald-500/5 mb-0.5"
                    >
                      <PlusCircle size={20} className="text-emerald-400" />
                      <span className="text-[16px] font-medium text-emerald-400">
                        {t('app.context.addCity')}
                      </span>
                    </button>
                  </div>

                  {/* Multi-column City Grid */}
                  <div className="flex gap-4">
                    {cityChunks.length > 0 ? (
                      cityChunks.map((chunk, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-2.5 min-w-[180px]">
                          {chunk.map((city, rowIdx) => {
                            const name = typeof city === 'object' ? city.name : city;
                            const color = typeof city === 'object' ? city.color : '#10b981';
                            return (
                              <button
                                key={`${name}-${colIdx}-${rowIdx}`}
                                onClick={() => handleAction('set-city', { city: name })}
                                className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-left"
                              >
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-[16px] font-medium text-neutral-300 group-hover:text-white truncate max-w-[130px]">{name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center min-w-[150px]">
                         <span className="text-xs text-neutral-600 italic">No cities added</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onMouseEnter={() => setActiveSubmenu('rating')}
              className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-red-500"
            >
              <div className="flex items-center gap-3">
                <Heart size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
                  {t('app.context.editRating')}
                </span>
              </div>
              <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {activeSubmenu === 'rating' && (
                <motion.div
                  initial={{ opacity: 0, x: subMenuAnimX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: subMenuAnimX }}
                  className={`${subMenuPosClass} min-w-[260px] bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 ring-1 ring-black/50 overflow-hidden`}
                >
                  <p className="px-3 py-2 text-[9px] uppercase tracking-widest text-neutral-600 font-black">
                    {t('app.context.updateRating')}
                  </p>
                  
                  {/* Rating Container with Orange Border 'Long Bar' Style */}
                  <div 
                    className="flex flex-col gap-2 p-3 bg-orange-500/5 rounded-xl border border-orange-500/40 mx-1 relative overflow-hidden group/rating-box"
                    onMouseLeave={() => setHoveredRating(null)}
                  >
                    {/* Background Progress Bar (The 'Long Bar') */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                       <motion.div 
                          className="h-full bg-orange-500/10 border-r border-orange-500/30"
                          initial={{ width: 0 }}
                          animate={{ width: hoveredRating ? `${(hoveredRating / 10) * 100}%` : 0 }}
                       />
                    </div>

                    <div className="flex items-center gap-1 justify-between px-1 relative z-10">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <button
                          key={num}
                          onClick={() => handleAction('set-rating', { rating: num })}
                          onMouseEnter={() => setHoveredRating(num)}
                          className="group/heart transition-all duration-200 transform hover:scale-125 active:scale-95 px-0.5"
                        >
                          <Heart 
                             size={16} 
                             className={clsx(
                                "transition-all duration-300",
                                // Red bordered hearts
                                num <= (hoveredRating || 0) 
                                  ? "text-red-500 fill-red-500 stroke-red-600 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" 
                                  : "text-red-500/10 stroke-red-500/40"
                             )}
                             strokeWidth={2.5}
                          />
                        </button>
                      ))}
                    </div>
                    
                    {/* Visual Rating Indicator Bar at the bottom */}
                    <div className="h-1 w-full bg-neutral-800 rounded-full mt-1 overflow-hidden border border-orange-500/20">
                       <motion.div 
                          className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                          initial={{ width: 0 }}
                          animate={{ width: hoveredRating ? `${(hoveredRating / 10) * 100}%` : 0 }}
                       />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onMouseEnter={() => setActiveSubmenu('events')}
              className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-orange-400"
            >
              <div className="flex items-center gap-3">
                <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
                  {t('app.context.addToEvent')}
                </span>
              </div>
              <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {activeSubmenu === 'events' && (
                <motion.div
                  initial={{ opacity: 0, x: subMenuAnimX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: subMenuAnimX }}
                  className={`${subMenuPosClass} min-w-[240px] bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 ring-1 ring-black/50`}
                >
                  <p className="px-3 py-2 text-[9px] uppercase tracking-widest text-neutral-600 font-black">
                    {t('app.context.selectTargetEvent')}
                  </p>
                  {events.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-neutral-500 italic">
                      {t('sidebar.noEvents')}
                    </p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {events.map(event => {
                        const isCurrentEvent = event.event_id === menu.data?.event_id;
                        return (
                          <button
                            key={event.event_id}
                            onClick={() => handleAction('assign-to-event', { eventId: event.event_id, title: event.title })}
                            className={clsx(
                              "w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl transition-all group text-left",
                              isCurrentEvent
                                ? "bg-orange-500/15 border border-orange-500/30"
                                : "hover:bg-[#252629]!"
                            )}
                          >
                            <Tag size={20} className={isCurrentEvent ? "text-orange-400" : "text-orange-400/50 group-hover:text-orange-400"} />
                            <span className={clsx("text-[16px] font-medium truncate", isCurrentEvent ? "text-orange-300" : "text-neutral-300 group-hover:text-white")}>{event.title}</span>
                            {isCurrentEvent && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Event Actions: Archiving */}
      {targetType === 'event' && (
        <>
          <button
            onClick={() => handleAction('create-trip')}
            className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-purple-400"
          >
            <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
              {t('app.context.archiveToNewTrip')}
            </span>
          </button>

          <div className="relative">
            <button
              onMouseEnter={() => setActiveSubmenu('trips')}
              className="w-full flex items-center justify-between gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-purple-400"
            >
              <div className="flex items-center gap-3">
                <Layers size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
                  {t('app.context.archiveToExistingTrip')}
                </span>
              </div>
              <ChevronRight size={14} className="text-neutral-600 group-hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {activeSubmenu === 'trips' && (
                <motion.div
                  initial={{ opacity: 0, x: subMenuAnimX }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: subMenuAnimX }}
                  className={`${subMenuPosClass} min-w-[240px] bg-[#0e0f12] border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 ring-1 ring-black/50`}
                >
                  <p className="px-3 py-2 text-[9px] uppercase tracking-widest text-neutral-600 font-black">
                    {t('app.context.selectTargetTrip')}
                  </p>
                  {trips.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-neutral-500 italic">
                      {t('sidebar.noTrips')}
                    </p>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {trips.map(trip => (
                        <button
                          key={trip.trip_id}
                          onClick={() => handleAction('assign-to-trip', { tripId: trip.trip_id, title: trip.title })}
                          className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-left"
                        >
                          <Briefcase size={20} className="text-purple-400/50 group-hover:text-purple-400" />
                          <span className="text-[16px] font-medium text-neutral-300 group-hover:text-white truncate">{trip.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="h-px bg-white/5 my-2" />
      
      {targetType === 'photo' && currentTripId && (
        <button
          onClick={() => handleAction('set-trip-cover', { trip_id: currentTripId })}
          className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-purple-400"
        >
          <ImagePlus size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[16px] font-medium text-purple-400/80 group-hover:text-purple-400">
            {t('app.context.setTripCover')}
          </span>
        </button>
      )}

      {targetType === 'photo' && menu.data?.event_id && (
        <button
          onClick={() => handleAction('set-event-cover', { event_id: menu.data.event_id })}
          className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-orange-400"
        >
          <ImagePlus size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[16px] font-medium text-orange-400/80 group-hover:text-orange-400">
            {t('app.context.setEventCover')}
          </span>
        </button>
      )}

      <button
        onClick={() => handleAction('info')}
        className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-[#252629]! transition-all group text-neutral-400"
      >
        <Info size={20} className="group-hover:scale-110 transition-transform" />
        <span className="text-[16px] font-medium text-neutral-200 group-hover:text-white">
          {t('app.context.viewDetail')}
        </span>
      </button>
      
      <button
        onClick={() => handleAction('delete')}
        className="w-full flex items-center gap-3 pl-5 pr-4 py-4 rounded-xl hover:bg-red-500/10 transition-all group text-red-400"
      >
        <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
        <span className="text-[16px] font-medium text-red-400/80 group-hover:text-red-400">
          {t('app.context.remove')}
        </span>
      </button>
    </motion.div>
  );
}
