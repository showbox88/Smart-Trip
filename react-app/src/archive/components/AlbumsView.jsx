import React from 'react';
import { motion } from 'framer-motion';
import { Filter, Plus, Link as LinkIcon, Image as ImageIcon, MapPin, ImagePlus } from 'lucide-react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import clsx from 'clsx';
import { format } from 'date-fns';

export function AlbumsView({ trips, onNavigate, onContextMenu, onUpdateTrip, onCreateNew, t }) {
  // trips from activeFilter logic in App.jsx are passed in as displayedItems.
  // They are structured as: { type: 'trip', id, title, item, photos, associatedEvents }
  
  // Calculate total photos across all displayed albums for the header
  const totalPhotos = trips.reduce((acc, tripData) => acc + (tripData.photos?.length || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto w-full bg-[#101922] text-slate-100 flex flex-col">
      {/* Container matching the max-w from mockup */}
      <div className="px-6 lg:px-12 py-8 max-w-[1600px] mx-auto w-full h-full flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">{t('app.albums.title')}</h1>
            <p className="text-slate-400 font-medium">
              {t('app.albums.subtitle')
                .replace('{{photoCount}}', totalPhotos.toLocaleString())
                .replace('{{tripCount}}', trips.length)
              }
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors text-sm font-semibold text-slate-200 border border-slate-700/50">
              <Filter size={18} />
              {t('app.albums.filter')}
            </button>
            <button 
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d7ff2] text-white rounded-lg hover:bg-[#0d7ff2]/90 transition-colors text-sm font-bold shadow-lg shadow-[#0d7ff2]/20"
            >
              <Plus size={18} strokeWidth={3} />
              {t('app.albums.newArchive')}
            </button>
          </div>
        </div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {trips.map((tripData) => (
            <TripCard 
              key={tripData.id}
              trip={tripData.item}
              photos={tripData.photos}
              associatedEvents={tripData.associatedEvents}
              onNavigate={onNavigate}
              onContextMenu={onContextMenu}
              onUpdateTrip={onUpdateTrip}
              t={t}
            />
          ))}

          {/* Create New Collection Card */}
          <div 
            onClick={onCreateNew}
            className="group relative aspect-[4/5] rounded-xl border-2 border-dashed border-slate-700 hover:border-[#0d7ff2]/50 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer bg-slate-800/20"
          >
            <div className="size-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-[#0d7ff2] group-hover:bg-[#0d7ff2]/10 transition-colors">
              <ImagePlus size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-300 group-hover:text-white transition-colors">{t('app.albums.createNew')}</p>
              <p className="text-sm text-slate-500 mt-1">{t('app.albums.addPhotos')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TripCard({ trip, photos, associatedEvents, onNavigate, onContextMenu, onUpdateTrip, t }) {
  const coverPhoto = trip.cover_photo_id 
    ? photos.find(p => p.path.replace(/\\/g, '/') === trip.cover_photo_id.replace(/\\/g, '/')) || (photos.length > 0 ? photos[0] : null)
    : (photos.length > 0 ? photos[0] : null);
  const imgUrl = useObjectUrl(coverPhoto?.handle);
  
  const startDate = trip.startDate ? new Date(trip.startDate) : null;
  let subtitle = '';
  if (startDate) {
      subtitle = format(startDate, 'MMMM yyyy');
  } else if (trip.date) {
      subtitle = format(new Date(trip.date), 'MMMM yyyy');
  }

  // Count total photos
  const photoCount = photos.length;
  
  // Get distinct locations (cities) aggregated from events and direct photos
  const cities = Array.from(new Set([
    ...associatedEvents.map(e => e.city),
    ...photos.map(p => p.city)
  ].filter(Boolean)));
  const locationString = cities.length > 0 ? cities.join(', ') : t('app.albums.unknownLocation');

  return (
    <div 
      onClick={() => onNavigate({ type: 'trip', id: trip.trip_id })}
      onContextMenu={(e) => onContextMenu(e, { ...trip, type: 'trip' })}
      className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer bg-slate-800 border border-slate-700/50 hover:border-[#0d7ff2]/50 transition-all shadow-lg"
    >
      {/* Background Image */}
      {imgUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
          style={{ backgroundImage: `url(${imgUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
           <MapPin size={32} className="text-neutral-700" />
        </div>
      )}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 trip-card-gradient"></div>
      
      {/* Top Right Icon */}
      <div className="absolute top-4 right-4">
        <LinkIcon size={20} className="text-white/40 group-hover:text-[#0d7ff2] transition-colors" />
      </div>
      
      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 p-6 w-full">
        {subtitle && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#0d7ff2] mb-1">
            {subtitle}
          </p>
        )}
        <h3 className="text-xl font-bold text-white mb-2 leading-tight">
          {trip.title}
        </h3>
        
        <div className="flex items-center gap-3 text-slate-300 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <ImageIcon size={14} className="text-white/60" /> 
            {photoCount}
          </span>
          <span className="flex items-center gap-1.5 font-medium truncate">
            <MapPin size={14} className="text-white/60 shrink-0" /> 
            <span className="truncate">{locationString}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
