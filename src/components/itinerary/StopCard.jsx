import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import {
  Utensils, Landmark, MapPin,
  Bed, Plane, Leaf, ShoppingBag,
  Clock, CheckCircle2, Phone,
  Hotel, Receipt, Coffee, Croissant
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import HotelLine from './HotelLine';
import TransitInfo from './TransitInfo';
import { uploadToSupabase } from '../../utils/uploadHelpers';
import { supabase } from '../../lib/supabase';

// 分类图标映射
const CATEGORY_MAP = {
  'lodging': Hotel,
  'hotel': Hotel,
  'restaurant': Utensils,
  'food': Utensils,
  'cafe': Coffee,
  'coffee': Coffee,
  'bakery': Croissant,
  'bread': Croissant,
  'attraction': Landmark,
  'museum': Landmark,
  'park': Leaf,
  'nature': Leaf,
  'shopping': ShoppingBag,
  'store': ShoppingBag,
  'transit_station': Plane,
  'airport': Plane,
  'point_of_interest': MapPin,
};

function getCategoryIcon(cat) {
  if (!cat) return MapPin;
  const lowerCat = String(cat).toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_MAP)) {
    if (lowerCat.includes(key)) return icon;
  }
  return MapPin;
}

function getStopTimeStatus(stop, isToday, t) {
  if (!isToday || !stop.time) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let [hh, mm] = stop.time.split(':').map(Number);
  if (stop.period === 'PM' && hh !== 12) hh += 12;
  if (stop.period === 'AM' && hh === 12) hh = 0;
  const stopMin = hh * 60 + (mm || 0);
  const diff = nowMin - stopMin;
  if (diff > 120) return { label: t('itinerary.stop_status_passed'), color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
  if (diff >= 0) return { label: t('itinerary.stop_status_ongoing'), color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' };
  if (diff > -60) return { label: t('itinerary.stop_status_soon'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { label: t('itinerary.stop_status_upcoming'), color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' };
}

export default React.memo(function StopCard({
  stop, dayId, dayColor, index, showTransit, dayWeekdayIdx, isToday,
  onDelete, onToggleTransitMode, onOpenTimePicker, onOpenExpense, onOpenStayInfo,
  onChangePhoto, onAddStop, onAddNote, onAddList, onFocusStop,
  onUpdateStop,
  inHotelStay,
}) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPrivateNoteSheet, setShowPrivateNoteSheet] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const touchStart = useRef(null);
  const thumbRef = useRef(null);
  const pickerRef = useRef(null);
  const deleteRef = useRef(null);

  // Close photo picker / delete confirm on outside click
  useEffect(() => {
    if (!showPhotoPicker && !confirmingDelete) return;
    const handler = (e) => {
      if (showPhotoPicker &&
          pickerRef.current && !pickerRef.current.contains(e.target) &&
          thumbRef.current && !thumbRef.current.contains(e.target)) {
        setShowPhotoPicker(false);
      }
      if (confirmingDelete &&
          deleteRef.current && !deleteRef.current.contains(e.target)) {
        setConfirmingDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPhotoPicker, confirmingDelete]);

  const HOTEL_CATEGORIES = ['酒店', '住宿', 'lodging', 'Accommodation', 'Hotel', 'map.place_lodging'];
  const isHotel = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout'
    || HOTEL_CATEGORIES.includes(stop.category)
    || (typeof stop.category === 'string' && stop.category.includes('lodging'));
  const typeLabel = stop.type === 'hotel_checkin'
    ? (t('itinerary.hotel_checkin') || 'Check-in')
    : stop.type === 'hotel_checkout'
    ? (t('itinerary.hotel_checkout') || 'Check-out')
    : isHotel
    ? (t('itinerary.hotel_checkin') || 'Check-in')
    : null;

  // Closed-day detection
  const openingHours = stop.openingHours || [];
  const isClosed = dayWeekdayIdx >= 0 && openingHours.length > 0 && /closed/i.test(openingHours[dayWeekdayIdx] || '');

  const handleDelete = (e) => {
    e.stopPropagation();
    setConfirmingDelete(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    onDelete?.(dayId, stop.id);
    setConfirmingDelete(false);
  };

  const handleTimeClick = (e) => {
    e.stopPropagation();
    onOpenTimePicker?.(dayId, stop.id);
  };

  const handleExpenseClick = (e) => {
    e.stopPropagation();
    onOpenExpense?.(dayId, stop.id);
  };

  const handlePhotoClick = async (e) => {
    e.stopPropagation();
    if (!stop.placeId || typeof google === 'undefined') return;
    if (showPhotoPicker) { setShowPhotoPicker(false); return; }
    setShowPhotoPicker(true);
    setLoadingPhotos(true);
    try {
      const { Place } = await google.maps.importLibrary('places');
      const place = new Place({ id: stop.placeId });
      await place.fetchFields({ fields: ['photos'] });
      const photos = place.photos || [];
      setPlacePhotos(photos.map(p => ({
        url: p.getURI({ maxWidth: 400, maxHeight: 300 }),
        urlFull: p.getURI({ maxWidth: 1200, maxHeight: 900 }),
      })));
    } catch (err) {
      console.error('[StopCard] fetch photos failed:', err);
      setPlacePhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleSelectPhoto = (photoUrl) => {
    onChangePhoto?.(dayId, stop.id, photoUrl);
    setShowPhotoPicker(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const publicUrl = await uploadToSupabase(file);
      handleSelectPhoto(publicUrl);
    } catch (err) {
      console.error('[StopCard] Upload error:', err);
      alert(t('common.fetch_error') || 'Upload error');
    }
  };

  const isHotelType = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
  const dotColor = isHotelType ? '#f59e0b' : (dayColor || '#5b7a99');

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;

    // Swipe left (diff > 50) -> Flip to back
    if (diff > 50 && !isFlipped) {
      setIsFlipped(true);
    } 
    // Swipe right (diff < -50) -> Flip back to front
    else if (diff < -50 && isFlipped) {
      setIsFlipped(false);
    }
    touchStart.current = null;
  };

  return (
    <div className={`timeline-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline Numbered Dot — amber for hotel */}
      <div style={{
        position: 'absolute',
        left: 'var(--timeline-line-x)',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: dotColor,
        zIndex: 2,
        boxShadow: `0 0 10px ${dotColor}`
      }} />

      {/* Hotel checkin/checkout card: amber line from dot to edge */}
      {isHotelType && (
        <HotelLine
          top={stop.type === 'hotel_checkin' ? 'calc(50% + 8px)' : '-1rem'}
          bottom={stop.type === 'hotel_checkout' ? 'calc(50% + 8px)' : '-1rem'}
          color='#f59e0b'
        />
      )}

      {/* Arc connector: curves from hotel line endpoint into the colored dot */}
      {stop.type === 'hotel_checkin' && (
        <div style={{
          position: 'absolute',
          left: 'var(--hotel-line-x)',
          top: '50%',
          width: 'calc(var(--timeline-line-x) - var(--hotel-line-x))',
          height: '8px',
          borderTop: 'var(--hotel-line-width) solid var(--hotel-line-color)',
          borderLeft: 'var(--hotel-line-width) solid var(--hotel-line-color)',
          borderTopLeftRadius: '8px',
          zIndex: 1,
          boxSizing: 'border-box',
        }} />
      )}
      {stop.type === 'hotel_checkout' && (
        <div style={{
          position: 'absolute',
          left: 'var(--hotel-line-x)',
          top: 'calc(50% - 8px)',
          width: 'calc(var(--timeline-line-x) - var(--hotel-line-x))',
          height: '8px',
          borderBottom: 'var(--hotel-line-width) solid var(--hotel-line-color)',
          borderLeft: 'var(--hotel-line-width) solid var(--hotel-line-color)',
          borderBottomLeftRadius: '8px',
          zIndex: 1,
          boxSizing: 'border-box',
        }} />
      )}

      {/* All plain POI cards in hotel stay: continuous amber line bridging gaps above and below */}
      {inHotelStay && !isHotelType && <HotelLine />}

      {/* Timeline line */}
      {showTransit && !isHotelType && (
        <div style={{ position: 'absolute', left: 'var(--transit-line-x)', top: '2.5rem', bottom: '-0.5rem', width: '2px', background: `${dayColor || '#5b7a99'}40`, zIndex: 1 }} />
      )}
      {/* Card Wrapper with 3D context */}
      <div 
        className="stop-card-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ marginLeft: 'var(--card-margin-l)' }}
      >
        <div className={`stop-card-inner ${isFlipped ? 'is-flipped' : ''}`}>
          
          {/* Front Face */}
          <div
            className="rich-stop-card rich-stop-card-front"
            onClick={() => onFocusStop?.(stop.id)}
            onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
            onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
            style={{
              background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
              border: isClosed ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--glass-border)',
              borderColor: isClosed ? 'rgba(239,68,68,0.35)' : state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
              borderRadius: '1.2rem',
              padding: 'var(--stop-card-p)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
              boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100px'
            }}
          >
            {/* 移动端专用的拖拽边缘把手（左右各一个，方便双手操作） */}
            <div className="drag-handle left-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
            </div>
            <div className="drag-handle right-handle" title={t('common.drag_to_reorder') || 'Drag to reorder'}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>drag_indicator</span>
            </div>

            {/* Hotel check-in/out time badge — top right */}
            {(stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout') && stop.time && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '2.8rem',
                background: stop.type === 'hotel_checkout' ? '#ef4444' : '#f59e0b',
                color: 'white',
                padding: '2px 10px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                zIndex: 3,
                letterSpacing: '0.02em',
              }}>
                {stop.time}{stop.period ? ` ${stop.period}` : ''} {typeLabel}
              </div>
            )}

            {/* Delete button (Top Right) */}
            <div ref={deleteRef} style={{ position: 'absolute', top: '-0.5rem', right: '0.3rem', zIndex: 5 }}>
              <button
                onClick={handleDelete}
                style={{ background: '#1e3a5f', border: 'none', color: '#93c5fd', cursor: 'pointer', padding: '3px 5px', borderRadius: '6px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={t('common.delete') || 'Delete'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
              {confirmingDelete && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                    style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.78rem' }}
                  >{t('common.cancel') || 'Cancel'}</button>
                  <button
                    onClick={handleConfirmDelete}
                    style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >{t('common.delete') || 'Delete'}</button>
                </div>
              )}
            </div>

            {/* Badges & Warnings (Above Name) */}
            <div style={{ paddingBottom: '0.4rem' }}>
              {/* Hotel badge */}
              {isHotel && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'white', marginBottom: '0.5rem' }}>
                  <Hotel size={13} strokeWidth={2.5} />
                  {typeLabel}
                </div>
              )}

              {/* Closed-day warning */}
              {isClosed && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                  gap: '6px',
                  animation: 'pulse-border 2s ease-in-out infinite'
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '16px', flexShrink: 0 }}>error</span>
                  <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 700 }}>
                    {t('itinerary.closed_today') || 'Closed today!'}
                  </span>
                </div>
              )}
            </div>

            {/* Layout Row: Info/Note/Actions (Left) + Thumbnail (Right) */}
            <div className="stop-card-layout-row" style={{ display: 'flex', gap: '1.2rem', alignItems: 'stretch' }}>
              <div className="stop-card-left-column" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Title Row: pin + name + category badge + rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <div style={{
                    position: 'relative',
                    width: '24px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: isHotelType ? '#f59e0b' : (dayColor || '#52c41a'),
                      zIndex: 0
                    }} />
                    <span className="material-symbols-outlined" style={{
                      fontSize: '32px',
                      color: isHotelType ? '#f59e0b' : (dayColor || '#52c41a'),
                      position: 'absolute',
                      fontVariationSettings: "'FILL' 1",
                      zIndex: 1
                    }}>location_on</span>
                    <span style={{
                      position: 'relative',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      marginTop: '-6px',
                      zIndex: 2
                    }}>{index + 1}</span>
                  </div>
                  <h4 className="rich-stop-card-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
                    {stop.location}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px', flexShrink: 0 }} title={stop.category ? (t(stop.category) !== stop.category ? t(stop.category) : stop.category) : t('map.place_default')}>
                    {(() => {
                      const Icon = getCategoryIcon(stop.category);
                      return <Icon size={16} strokeWidth={2.5} className="text-white opacity-90" />;
                    })()}
                  </div>
                  {stop.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <span style={{ color: '#f59e0b', fontSize: '13px' }}>★</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700 }}>{stop.rating}</span>
                    </div>
                  )}
                </div>

                {/* Vertical Details List: Address -> Phone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0.8rem' }}>
                  {/* Address */}
                  {stop.address && (
                    <div className="rich-stop-card-address" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ color: '#f97316', fontSize: '15px', flexShrink: 0, marginTop: '2px' }}>location_on</span>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {(() => {
                          const addr = stop.address;
                          if (addr.includes(',')) {
                            const parts = addr.split(',');
                            return (
                              <>
                                <div style={{ color: 'white', fontWeight: 700, marginBottom: '2px' }}>{parts[0].trim()}</div>
                                <div style={{ opacity: 0.6, fontSize: '0.78rem' }}>{parts.slice(1).join(',').trim()}</div>
                              </>
                            );
                          }
                          // Asian split
                          const match = addr.match(/(.*?[市区町村])(.*)/);
                          if (match) {
                            return (
                              <>
                                <div style={{ color: 'white', fontWeight: 700, marginBottom: '2px' }}>{match[1]}</div>
                                <div style={{ opacity: 0.6, fontSize: '0.78rem' }}>{match[2]}</div>
                              </>
                            );
                          }
                          return addr;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {stop.phone && (
                    <div className="rich-stop-card-phone" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Phone size={14} strokeWidth={2.5} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <a href={`tel:${stop.phone}`} style={{ fontSize: '0.82rem', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>
                        {stop.phone}
                      </a>
                    </div>
                  )}

                  {/* Website (if available) */}
                  {stop.website && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '15px', flexShrink: 0 }}>public</span>
                      <a href={stop.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700, textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stop.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Note / Placeholder */}
                {(() => {
                  const isNoteRedundant = stop.note && stop.location && 
                    (stop.note.trim().toLowerCase() === stop.location.trim().toLowerCase());
                  
                  if (isNoteRedundant) return null;

                  return (
                    <div
                      style={{
                        fontSize: '0.95rem',
                        color: stop.note ? 'var(--text-secondary)' : 'var(--text-muted)',
                        marginBottom: '1.2rem',
                        lineHeight: 1.5,
                        padding: '4px 0',
                        fontStyle: stop.note ? 'normal' : 'italic'
                      }}
                    >
                      {stop.note || t('itinerary.add_note') || '点击添加备注...'}
                    </div>
                  );
                })()}

                {/* Bottom Actions: Time & Expense Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: 'auto' }}>
                  {/* Hotel Specific Row (Check-in info) */}
                  {isHotel && (
                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                      <div
                        className="stop-chip editable"
                        onClick={(e) => { e.stopPropagation(); onOpenStayInfo?.(dayId, stop.id); }}
                        style={{
                          background: 'rgba(139, 92, 246, 0.08)',
                          color: '#8b5cf6',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          cursor: 'pointer'
                        }}
                      >
                        <Bed size={14} strokeWidth={2.5} />
                        {t('itinerary.stay_info') || 'Stay Info'}
                      </div>
                    </div>
                  )}

                  {/* Main Action Chips */}
                  <div className="stop-card-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {stop.time && (
                      <div
                        className="stop-chip editable"
                        onClick={handleTimeClick}
                        style={{
                          background: 'rgba(249, 115, 22, 0.08)',
                          color: '#f97316',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(249, 115, 22, 0.25)',
                          cursor: 'pointer'
                        }}
                      >
                        <Clock size={14} strokeWidth={2.5} />
                        {stop.time} {stop.period}
                      </div>
                    )}

                    <div 
                      className="stop-chip editable"
                      onClick={handleExpenseClick}
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.08)', 
                        color: '#10b981', 
                        padding: '4px 10px', 
                        borderRadius: '8px', 
                        fontSize: '0.78rem', 
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        cursor: 'pointer'
                      }}
                    >
                      <Receipt size={14} strokeWidth={2.5} />
                      {stop.price && parseFloat(stop.price) > 0
                        ? formatCurrency(stop.price, state.settings)
                        : (t('itinerary.add_expense') || '添加消费')}
                    </div>

                    {stop.address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}${stop.placeId ? `&destination_place_id=${stop.placeId}` : ''}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={t('itinerary.navigate') || 'Navigate'}
                        className="stop-chip nav-chip"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(59,130,246,0.25)', textDecoration: 'none', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>near_me</span>
                        {t('itinerary.navigate') || 'Navigate'}
                      </a>
                    )}

                    {stop.reservationTime && (
                      <div
                        className="stop-chip"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-bright)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                        {stop.reservationTime}
                      </div>
                    )}

                    {(() => {
                      const s = getStopTimeStatus(stop, isToday, t);
                      if (!s) return null;
                      return (
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: s.color,
                          background: s.bg,
                          border: `1px solid ${s.border}`,
                          letterSpacing: '0.03em',
                          whiteSpace: 'nowrap',
                        }}>
                          {s.label}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Thumbnail (Right) - click to change photo */}
              <div
                className="rich-stop-card-media"
                ref={thumbRef}
                onClick={handlePhotoClick}
                style={{ borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}
                title={t('itinerary.change_photo') || 'Change photo'}
              >
                {stop.photo ? (
                  <img src={stop.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={stop.location} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--text-muted)', opacity: 0.4 }}>add_photo_alternate</span>
                )}
              </div>

              {/* Photo picker portal */}
              {showPhotoPicker && thumbRef.current && createPortal(
                <PhotoPickerDropdown
                  ref={pickerRef}
                  anchorEl={thumbRef.current}
                  loading={loadingPhotos}
                  photos={placePhotos}
                  currentPhoto={stop.photo}
                  noPhotosText={t('itinerary.no_photos') || 'No photos available'}
                  uploadText={t('stops.upload_local') || 'Upload Locally'}
                  onSelect={handleSelectPhoto}
                  onUpload={handleFileUpload}
                />,
                document.body
              )}
            </div>
          </div>

          {/* Back Face */}
          <div className="rich-stop-card-back">
            <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'white', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-secondary)' }}>attachment</span>
              {t('itinerary.additional_docs')}
            </h5>
            
            <div className="back-content-grid">
              <div className="back-action-item" onClick={(e) => { e.stopPropagation(); setShowPhotoSheet(true); }}>
                <span className="material-symbols-outlined">add_a_photo</span>
                <label>{t('itinerary.back_photos')}</label>
              </div>
              <div className="back-action-item" onClick={(e) => { e.stopPropagation(); setShowPrivateNoteSheet(true); }}>
                <span className="material-symbols-outlined">description</span>
                <label>{t('itinerary.back_private_note')}</label>
              </div>
              <div className="back-action-item">
                <span className="material-symbols-outlined">link</span>
                <label>{t('itinerary.back_web_link')}</label>
              </div>
              <div className="back-action-item">
                <span className="material-symbols-outlined">qr_code_2</span>
                <label>{t('itinerary.back_qr_code')}</label>
              </div>
            </div>

            <div className="flip-back-hint">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>swipe_right</span>
              {t('itinerary.swipe_back')}
            </div>
          </div>

        </div>

        {/* Page Indicator Dots */}
        <div className="stop-card-dots">
          <div
            className={`stop-card-dot ${!isFlipped ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
          />
          <div
            className={`stop-card-dot ${isFlipped ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
          />
        </div>
      </div>

      {/* Photo Bottom Sheet */}
      {showPhotoSheet && createPortal(
        <PhotoSheet
          stop={stop}
          userId={state.user?.id}
          tripId={state.activeTripId}
          onUpdateStop={(patch) => onUpdateStop?.(dayId, stop.id, patch)}
          onClose={() => setShowPhotoSheet(false)}
          t={t}
        />,
        document.body
      )}

      {/* Private Note Bottom Sheet */}
      {showPrivateNoteSheet && createPortal(
        <PrivateNoteSheet
          stop={stop}
          dayId={dayId}
          onSave={(title, content) => {
            onUpdateStop?.(dayId, stop.id, { privateNoteTitle: title, privateNote: content });
            setShowPrivateNoteSheet(false);
          }}
          onClose={() => setShowPrivateNoteSheet(false)}
          t={t}
        />,
        document.body
      )}

      {/* Transit info */}
      {showTransit && (
        <TransitInfo
          transit={stop.transitToNext}
          transitMode={stop.transitMode || 'DRIVE'}
          onToggleMode={() => onToggleTransitMode?.(dayId, stop.id)}
          onAddStop={() => onAddStop?.(dayId, stop.id)}
          onAddNote={() => onAddNote?.(dayId, stop.id)}
          onAddList={() => onAddList?.(dayId, stop.id)}
        />
      )}

    </div>
  );
})

function PhotoSheet({ stop, userId, tripId, onUpdateStop, onClose, t }) {
  const [attachments, setAttachments] = useState(stop.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const basePath = `${userId}/${tripId}/${stop.id}/attachments`;

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `${basePath}/${fileName}`;
        const { error } = await supabase.storage.from('trip-media').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('trip-media').getPublicUrl(path);
        return { url: publicUrl, path, name: file.name, createdAt: new Date().toISOString() };
      }));
      const next = [...attachments, ...uploaded];
      setAttachments(next);
      onUpdateStop({ attachments: next });
    } catch (err) {
      console.error('[PhotoSheet] Upload failed:', err);
      alert(t('common.upload_failed') || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (idx) => {
    const item = attachments[idx];
    try {
      if (item.path) {
        await supabase.storage.from('trip-media').remove([item.path]);
      }
    } catch (e) {
      console.warn('[PhotoSheet] Delete from storage failed:', e);
    }
    const next = attachments.filter((_, i) => i !== idx);
    setAttachments(next);
    onUpdateStop({ attachments: next });
  };

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease' }}
    >
      <div className="sheet-panel" style={{ width: '100%', maxHeight: '88vh', background: 'var(--bg-secondary)', borderRadius: '1.4rem 1.4rem 0 0', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)', boxShadow: '0 -20px 60px rgba(0,0,0,0.5)' }}>
        {/* Drag handle */}
        <div className="sheet-drag-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1.2rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-primary)' }}>photo_library</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>{t('itinerary.back_photos')}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>📍 {stop.location}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Upload buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', padding: '0.9rem 1.2rem' }}>
          {/* Camera (mobile only) */}
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.7rem', background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.4)', borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#3b82f6' }}>photo_camera</span>
            <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>{t('itinerary.take_photo') || '拍照'}</span>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
          </label>

          {/* Gallery */}
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '0.7rem', background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '12px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#10b981' }}>add_photo_alternate</span>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{t('itinerary.choose_photo') || '从相册选择'}</span>
            <input ref={galleryRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>

        {uploading && (
          <div style={{ textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.85rem', paddingBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>sync</span>
            {t('common.uploading') || '上传中...'}
          </div>
        )}

        {/* Grid of attachments */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.2rem 1.6rem' }}>
          {attachments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }}>image_not_supported</span>
              {t('itinerary.no_attachments') || '还没有附件，点上方按钮添加'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {attachments.map((att, idx) => (
                <div key={att.path || idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img
                    src={att.url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    onClick={() => setPreviewUrl(att.url)}
                    loading="lazy"
                  />
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff6b6b' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen preview */}
      {previewUrl && createPortal(
        <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}>
          <img src={previewUrl} alt="" style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />
        </div>,
        document.body
      )}
    </div>
  );
}

function PrivateNoteSheet({ stop, dayId, onSave, onClose, t }) {
  const [title, setTitle] = useState(stop.privateNoteTitle || '');
  const [content, setContent] = useState(stop.privateNote || '');
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = () => {
    onSave(title, content);
  };

  // Close on backdrop tap
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) {
      if (isDirty) {
        if (window.confirm(t('common.discard_changes') || '放弃未保存的内容？')) onClose();
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className="sheet-backdrop"
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div className="sheet-panel" style={{
        width: '100%',
        maxHeight: '85vh',
        background: 'var(--bg-secondary)',
        borderRadius: '1.4rem 1.4rem 0 0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Drag handle bar */}
        <div className="sheet-drag-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1.2rem 0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-secondary)' }}>lock</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>
                {t('itinerary.back_private_note')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                📍 {stop.location}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '0.8rem' }} />

        {/* Content area */}
        <div style={{ padding: '0 1.2rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* Title input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
              {t('itinerary.private_note_title_label') || '标题'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              placeholder={t('itinerary.private_note_title_placeholder') || '如：酒店确认号、取票信息...'}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'var(--text-bright)', padding: '10px 12px', fontSize: '0.95rem',
                outline: 'none', fontFamily: 'inherit', fontWeight: 600,
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {/* Content area */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>
              {t('itinerary.private_note_content_label') || '内容'}
            </label>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
              placeholder={t('itinerary.private_note_content_placeholder') || '记录任何私密信息：确认码、密码、提醒事项...'}
              rows={7}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', color: 'var(--text-secondary)', padding: '10px 12px', fontSize: '0.9rem',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, resize: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0.8rem 1.2rem 1.4rem', display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '0.8rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {t('common.cancel') || '取消'}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '0.8rem', borderRadius: '12px',
              background: 'var(--accent-primary)', border: 'none',
              color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
            {t('common.save') || '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PhotoPickerDropdown = forwardRef(function PhotoPickerDropdown(
  { anchorEl, loading, photos, currentPhoto, noPhotosText, uploadText, onSelect, onUpload },
  ref
) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const rect = anchorEl.getBoundingClientRect();
  const top = rect.bottom + 6;
  const right = window.innerWidth - rect.right;

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top, right,
          zIndex: 10000,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '0.5rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          width: '280px',
          maxHeight: '340px',
          overflowY: 'auto'
        }}
      >
        {/* Upload Local Button */}
        <div style={{ marginBottom: '0.6rem' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '0.6rem', 
            background: 'rgba(255,255,255,0.06)', 
            border: '1px dashed var(--glass-border)', 
            borderRadius: '8px', 
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            fontWeight: 600
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
            {uploadText}
            <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Current photo preview */}
        {currentPhoto && (
          <div
            onClick={() => setPreviewUrl(currentPhoto)}
            style={{ marginBottom: '0.5rem', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', border: '1px solid var(--glass-border)', position: 'relative' }}
          >
            <img src={currentPhoto} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} alt="" />
            <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>zoom_in</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{noPhotosText}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            {photos.map((p, i) => (
              <div
                key={i}
                onClick={() => onSelect(p.urlFull)}
                style={{ cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', aspectRatio: '1', border: p.urlFull === currentPhoto ? '2px solid var(--accent-primary)' : '1px solid transparent' }}
              >
                <img src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen preview */}
      {previewUrl && createPortal(
        <div
          onClick={() => setPreviewUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', backdropFilter: 'blur(8px)' }}
        >
          <img
            src={previewUrl}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          />
        </div>,
        document.body
      )}
    </>
  );
});
