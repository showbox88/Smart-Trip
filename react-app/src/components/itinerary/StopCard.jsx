import { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { formatCurrency } from '../../utils/formatters';
import TransitInfo from './TransitInfo';
import { uploadToSupabase } from '../../utils/uploadHelpers';

export default function StopCard({
  stop, dayId, dayColor, index, showTransit, dayWeekdayIdx,
  onDelete, onToggleTransitMode, onOpenTimePicker, onOpenExpense,
  onChangePhoto, onAddStop, onAddNote, onAddList, onFocusStop
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

  const isHotel = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
  const typeLabel = stop.type === 'hotel_checkin'
    ? (t('itinerary.hotel_checkin') || 'Check-in')
    : stop.type === 'hotel_checkout'
    ? (t('itinerary.hotel_checkout') || 'Check-out')
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

  return (
    <div className={`timeline-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline Numbered Dot */}
      <div style={{ 
        position: 'absolute', 
        left: '0.75rem', 
        top: '1.7rem', 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: dayColor || '#5b7a99', 
        zIndex: 2,
        boxShadow: `0 0 10px ${dayColor || '#5b7a99'}`
      }} />

      {/* Timeline line */}
      {showTransit && (
        <div style={{ position: 'absolute', left: '1.22rem', top: '2.5rem', bottom: '-0.5rem', width: '2px', background: `${dayColor || '#5b7a99'}40`, zIndex: 1 }} />
      )}

      {/* Card */}
      <div
        className="rich-stop-card"
        onClick={() => onFocusStop?.(stop.id)}
        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
        style={{
          marginLeft: '2.2rem',
          background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
          border: isClosed ? '1px solid rgba(239,68,68,0.35)' : '1px solid var(--glass-border)',
          borderColor: isClosed ? 'rgba(239,68,68,0.35)' : state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
          borderRadius: '1.2rem',
          padding: '1.2rem',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
          boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100px'
        }}
      >
        {/* Delete button (Top Right) */}
        <div ref={deleteRef} style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 5 }}>
          <button
            onClick={handleDelete}
            style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', lineHeight: 1, fontSize: '1.1rem' }}
            title={t('common.delete') || 'Delete'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
          </button>
          {confirmingDelete && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t('common.delete_confirm') || 'Delete?'}</span>
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
            display: 'flex',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
             {/* Hotel badge */}
            {isHotel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(139,107,59,0.2)', border: '1px solid rgba(139,107,59,0.4)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: '#c8a96e', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>hotel</span>
                {typeLabel}
              </div>
            )}

            {/* Title Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  position: 'relative',
                  width: '24px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {/* Fill the hole in the center of location_on icon */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: dayColor || '#52c41a',
                    zIndex: 0
                  }} />
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '32px', 
                    color: dayColor || '#52c41a',
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
                <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
                  {stop.location}
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#ff4d4f' }}>location_on</span>
                {stop.category || t('map.place')}
              </div>
            </div>

            {/* Address */}
            {stop.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f97316' }}>near_me</span>
                <span style={{ opacity: 0.8 }}>{stop.address}</span>
              </div>
            )}
          </div>

          {/* Thumbnail (Right) - click to change photo */}
          <div
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

        {/* Bottom Actions: Time & Expense Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: 'auto' }}>
          {stop.time && (
            <div 
              className="stop-chip editable"
              onClick={handleTimeClick}
              style={{ 
                background: 'rgba(91, 122, 153, 0.15)', 
                color: '#9ebad6', 
                padding: '0.5rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(91, 122, 153, 0.2)',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
              {stop.time} {stop.period}
            </div>
          )}

          <div 
            className="stop-chip editable"
            onClick={handleExpenseClick}
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--text-secondary)', 
              padding: '0.5rem 1rem', 
              borderRadius: '10px', 
              fontSize: '0.85rem', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
            {stop.price && parseFloat(stop.price) > 0 
              ? formatCurrency(stop.price, state.settings) 
              : (t('itinerary.add_expense') || '添加消费')}
          </div>

          {stop.reservationTime && (
            <div 
              className="stop-chip"
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                color: '#4ade80', 
                padding: '0.5rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event_available</span>
              {stop.reservationTime}
            </div>
          )}
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
