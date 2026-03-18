import { motion } from 'framer-motion';

const Plus = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

import { 
  Image, 
  Map, 
  Plane, 
  Clock, 
  Star, 
  Archive,
  ChevronRight,
  MoreHorizontal,
  Settings,
  Tag,
  MapPin
} from 'lucide-react';
import clsx from 'clsx';

export function Sidebar({ dbContent, activeFilter, onFilterChange, photos = [], t }) {
  const trips = dbContent.trips || [];
  const events = dbContent.events || [];
  
  // Independent events are those not linked to any trip
  const independentEvents = events.filter(e => !e.trip_id);

  const NavItem = ({ icon: Icon, label, count, isActive, onClick, colorClass = "text-neutral-400" }) => (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group",
        isActive ? "bg-white/10 text-white shadow-sm" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={clsx(isActive ? (label === t('sidebar.allMemories') || label === t('sidebar.recent') || label === t('sidebar.favorites') ? "text-blue-400" : colorClass) : colorClass)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count !== undefined && (
        <span className={clsx(
          "text-[10px] px-2 py-0.5 rounded-full font-bold",
          isActive ? (colorClass.includes("orange") ? "bg-orange-500/20 text-orange-400" : colorClass.includes("purple") ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400") : "bg-white/5 text-neutral-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );

  const SectionHeader = ({ label }) => (
    <div className="px-3 mt-8 mb-2 flex items-center justify-between group">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">{label}</span>
      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-md transition-all">
        <Plus size={12} className="text-neutral-600" />
      </button>
    </div>
  );

  return (
    <aside className="w-72 shrink-0 border-r border-white/5 bg-[#0d0e12]/60 backdrop-blur-3xl flex flex-col z-30 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        
        {/* Core Sections */}
        <div className="space-y-1">
          <NavItem 
            icon={Image} 
            label={t('sidebar.allMemories')} 
            count={photos.length}
            isActive={activeFilter.type === 'all'}
            onClick={() => onFilterChange({ type: 'all' })}
          />
          <NavItem 
            icon={Clock} 
            label={t('sidebar.recent')} 
            isActive={activeFilter.type === 'recent'}
            onClick={() => onFilterChange({ type: 'recent' })}
          />
          <NavItem 
            icon={Star} 
            label={t('sidebar.favorites')} 
            count={photos.filter(p => p.rating >= 9).length}
            isActive={activeFilter.type === 'favorites'}
            onClick={() => onFilterChange({ type: 'favorites' })}
          />
        </div>

        {/* Trips Section */}
        <div className="mt-8">
          <SectionHeader label={t('sidebar.trips')} />
          <div className="space-y-1 mt-2">
            {trips.length === 0 ? (
              <p className="px-3 py-4 text-xs text-neutral-600 italic leading-relaxed">
                {t('sidebar.noTrips')}
              </p>
            ) : (
              trips.map(trip => (
                <NavItem 
                  key={trip.trip_id}
                  icon={Plane} 
                  label={trip.title}
                  count={events.filter(e => e.trip_id === trip.trip_id).length}
                  isActive={activeFilter.type === 'trip' && activeFilter.id === trip.trip_id}
                  onClick={() => onFilterChange({ type: 'trip', id: trip.trip_id })}
                  colorClass="text-purple-400"
                />
              ))
            )}
          </div>
        </div>

        {/* Independent Events Section */}
        <div className="mt-8">
          <SectionHeader label={t('sidebar.independentEvents')} />
          <div className="space-y-1 mt-2">
            {independentEvents.length === 0 ? (
              <p className="px-3 py-4 text-xs text-neutral-600 italic leading-relaxed">
                {t('sidebar.noEvents')}
              </p>
            ) : (
              independentEvents.map(event => (
                <NavItem 
                  key={event.event_id}
                  icon={Map} 
                  label={event.title}
                  isActive={activeFilter.type === 'event' && activeFilter.id === event.event_id}
                  onClick={() => onFilterChange({ type: 'event', id: event.event_id })}
                  colorClass="text-orange-400"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-6 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-1.5 shadow-lg">
             <Archive size={16} className="text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white/40">v2.2 {t('sidebar.archiveCore')}</span>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <Settings size={14} className="text-neutral-600" />
        </button>
      </div>
    </aside>
  );
}

