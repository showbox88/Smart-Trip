import { useState, useRef, useEffect, forwardRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import {
  Utensils, Landmark, MapPin,
  Bed, Plane, Leaf, ShoppingBag,
  Clock, CheckCircle2, Phone,
  Hotel, LogIn, LogOut, Receipt, Coffee, Croissant
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import TransitInfo from './TransitInfo';
import { uploadToSupabase } from '../../utils/uploadHelpers';

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

function getCategoryIcon(cat, iconName) {
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

export default memo(function StopCard({
  stop, dayId, dayColor, index, showTransit, dayWeekdayIdx, isToday,
  onDelete, onToggleTransitMode, onOpenTimePicker, onOpenExpense, onOpenStayInfo,
  onChangePhoto, onAddStop, onAddNote, onAddList, onFocusStop,
  fromHotel, toHotel,
}) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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

      {/* Hotel stay vertical line — amber, extends full card height */}
      {isHotelType && (
        <div style={{
          position: 'absolute',
          left: 'var(--hotel-line-x)',
          top: stop.type === 'hotel_checkin' ? '2.2rem' : 0,
          bottom: stop.type === 'hotel_checkout' ? '1rem' : 0,
          width: '4px',
          background: stop.type === 'hotel_checkout' ? 'rgba(239,68,68,0.7)' : 'rgba(245,158,11,0.7)',
          borderRadius: stop.type === 'hotel_checkin' ? '2px 2px 0 0' : '0 0 2px 2px',
          zIndex: 1,
        }} />
      )}

      {/* fromHotel: amber line from above (covering gap) down to dot */}
      {fromHotel && !isHotelType && (
        <div style={{
          position: 'absolute',
          left: 'var(--hotel-line-x)',
          top: '-1.2rem',
          height: 'calc(1.7rem + 1.2rem)',
          width: '4px',
          background: 'rgba(245,158,11,0.7)',
          zIndex: 1,
        }} />
      )}

      {/* toHotel: amber line from dot down, extending below to cover gap to hint */}
      {toHotel && !isHotelType && (
        <div style={{
          position: 'absolute',
          left: 'var(--hotel-line-x)',
          top: '1.7rem',
          bottom: '-1.2rem',
          width: '4px',
          background: 'rgba(245,158,11,0.7)',
          zIndex: 1,
        }} />
      )}

      {/* Timeline line */}
      {showTransit && !isHotelType && (
        <div style={{ position: 'absolute', left: 'var(--transit-line-x)', top: '2.5rem', bottom: '-0.5rem', width: '2px', background: `${dayColor || '#5b7a99'}40`, zIndex: 1 }} />
      )}

      {/* Card */}
      <div
        className="rich-stop-card"
        onClick={() => onFocusStop?.(stop.id)}
        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
        style={{
          marginLeft: 'var(--card-margin-l)',
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

        {/* Closed-day warning */}
        {isClosed && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '10px',
            padding: '6px 12px',
            marginBottom: '0.6rem',
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

        {/* Layout: Main Info + Thumbnail */}
        <div className="stop-card-main-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div className="stop-card-info-content" style={{ flex: 1 }}>
             {/* Hotel badge */}
            {isHotel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'white', marginBottom: '0.5rem' }}>
                <Hotel size={13} strokeWidth={2.5} />
                {typeLabel}
              </div>
            )}

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
                  const Icon = getCategoryIcon(stop.category, stop.categoryIcon);
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
          </div>

          {/* Thumbnail (Right) - click to change photo */}
          <div
            className="rich-stop-card-media"
            ref={thumbRef}
            onClick={handlePhotoClick}
            style={{ width: '100px', height: '65px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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

        {/* Note / Placeholder */}
        {stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.2rem', padding: '4px 0' }}>
            {stop.type === 'hotel_checkin' ? <LogIn size={14} strokeWidth={2.5} className="text-white" /> : <LogOut size={14} strokeWidth={2.5} className="text-white" />}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
              {typeLabel}
            </span>
          </div>
        ) : (
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
        )}

        {/* Bottom Actions: Time & Expense Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: 'auto', flexWrap: 'wrap' }}>
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

          {isHotel && (
            <div
              className="stop-chip editable"
              onClick={(e) => { e.stopPropagation(); onOpenStayInfo?.(dayId, stop.id); }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }}
            >
              <Bed size={16} strokeWidth={2.5} />
              {t('itinerary.stay_info') || 'Stay Info'}
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
                marginLeft: 'auto',
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
