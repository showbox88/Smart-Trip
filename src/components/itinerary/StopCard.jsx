import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useTheme } from '../../theme';
import {
  Utensils, Landmark, MapPin,
  Bed, Plane, Leaf, ShoppingBag,
  Clock, CheckCircle2, Phone,
  Hotel, Receipt, Coffee, Croissant
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { isHotelStop, HOTEL_CATEGORIES } from '../../utils/categoryHelpers';
import HotelLine from './HotelLine';
import TransitInfo from './TransitInfo';
import PlanBPanel from './PlanBPanel';
import ActivityDetailModal from '../modals/ActivityDetailModal';
import { getActivityIcon, getActivityLabel, formatDuration } from '../../utils/activityHelpers';
import { supabase } from '../../lib/supabase';
import PhotoSheet from './PhotoSheet';
import PrivateNoteSheet from './PrivateNoteSheet';
import PhotoPickerDropdown from './PhotoPickerDropdown';
import { useStopCardState } from '../../hooks/useStopCardState';
import { useEditOperations } from '../../context/EditOperationsContext';

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
  if (diff > 120) return { label: t('itinerary.stop_status_passed'), color: 'var(--st-color-status-passed)', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
  if (diff >= 0) return { label: t('itinerary.stop_status_ongoing'), color: 'var(--st-color-status-ongoing)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)' };
  if (diff > -60) return { label: t('itinerary.stop_status_soon'), color: 'var(--st-color-status-soon)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' };
  return { label: t('itinerary.stop_status_upcoming'), color: 'var(--st-color-status-upcoming)', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' };
}

export default React.memo(function StopCard({
  stop, dayId, dayColor, index, showTransit, dayWeekdayIdx, isToday,
  nextStop,
  onInsertAfter,
  inHotelStay,
}) {
  const { state, dispatch } = useApp();
  const {
    onDeleteStop: onDelete, onToggleTransitMode, onOpenTimePicker, onOpenExpense, onOpenStayInfo,
    onChangePhoto, onAddNote, onAddList, onAddTransport, onAddActivity, onFocusStop,
    onUpdateStop, onSwapPlanB, onAddPlanBAlternative, onRemovePlanBAlternative,
  } = useEditOperations();
  const { t } = useI18n();
  const { layoutVariant, layout, themeId } = useTheme();
  const isClean = layoutVariant === 'clean';
  const isBlossom = themeId === 'blossom';
  const isActivity = stop.type === 'activity';
  const checkedIn = !!stop.checkedIn;
  const skipped = !!stop.skipped;

  const {
    showPlanB, setShowPlanB,
    showActivityDetail, setShowActivityDetail,
    showPhotoPicker, setShowPhotoPicker,
    placePhotos, loadingPhotos,
    confirmingDelete, setConfirmingDelete,
    rotation, isFlipped,
    showPrivateNoteSheet, setShowPrivateNoteSheet,
    showPhotoSheet, setShowPhotoSheet,
    thumbRef, pickerRef, deleteRef,
    handleDelete, handleConfirmDelete,
    handleTimeClick, handleExpenseClick,
    handlePhotoClick, handleSelectPhoto, handleFileUpload,
    handleTouchStart, handleTouchEnd,
  } = useStopCardState(stop, dayId, state.user?.id, t, {
    onDelete, onOpenTimePicker, onOpenExpense, onChangePhoto,
  });

  const isHotel = isHotelStop(stop);
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

  const isHotelType = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
  const dotColor = isHotelType ? 'var(--st-color-hotel-line)' : (dayColor || 'var(--st-color-timeline-default)');

  return (
    <div className={`timeline-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline Dot — bubble icon in clean, filled dot in glass */}
      {isClean ? (
        <div style={{
          position: 'absolute',
          left: 'var(--timeline-line-x)',
          top: isBlossom ? 'calc(1.7rem + 2px)' : '1.2rem',
          transform: 'translateX(-50%)',
          width: isBlossom ? '26px' : '40px',
          height: isBlossom ? '26px' : '40px',
          borderRadius: '50%',
          background: isBlossom ? '#ffffff' : 'var(--md-sys-color-surface-container-lowest)',
          border: isBlossom ? `2.5px solid ${dotColor}` : 'none',
          boxShadow: isBlossom ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          transition: 'transform 0.2s ease',
        }}>
          <div style={{
            width: isBlossom ? '22px' : '34px',
            height: isBlossom ? '22px' : '34px',
            borderRadius: '50%',
            background: `${dotColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              color: dotColor,
              fontSize: isBlossom ? '0.65rem' : '0.8rem',
              fontWeight: 800,
              lineHeight: 1,
            }}>{index + 1}</span>
          </div>
        </div>
      ) : (
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
          boxShadow: `0 0 10px ${dotColor}`,
          transition: 'all 0.3s ease',
        }} />
      )}

      {/* Hotel checkin/checkout card: amber line from dot to edge */}
      {isHotelType && (
        <HotelLine
          top={stop.type === 'hotel_checkin' ? 'calc(50% + 8px)' : '-1rem'}
          bottom={stop.type === 'hotel_checkout' ? 'calc(50% + 8px)' : '-1rem'}
          color='var(--st-color-hotel-line)'
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
          zIndex: 0,
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
          zIndex: 0,
          boxSizing: 'border-box',
        }} />
      )}

      {/* All plain POI cards in hotel stay: continuous amber line bridging gaps above and below */}
      {inHotelStay && !isHotelType && <HotelLine />}

      {/* Timeline line */}
      {showTransit && !isHotelType && (
        <div style={{ position: 'absolute', left: 'var(--transit-line-x)', top: '2.5rem', bottom: '-0.5rem', width: '2px', background: `${dayColor || 'var(--st-color-timeline-default)'}40`, zIndex: 1 }} />
      )}
      {/* Card Wrapper — 3D flip in glass, flat in clean */}
      <div
        className="stop-card-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ marginLeft: 'var(--card-margin-l)' }}
      >
        <div className="stop-card-inner" style={{ transform: `rotateY(${rotation}deg)` }}>
          
          {/* Front Face */}
          <div
            className="rich-stop-card rich-stop-card-front"
            onClick={() => onFocusStop?.(stop.id)}
            onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
            onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
            style={(() => {
              const baseColor = isClosed ? 'rgba(239,68,68,0.35)' : state.hoveredStopId === stop.id ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.05)';
              return {
              background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : 'var(--md-sys-color-surface-container-lowest)',
              borderTop: `1px solid ${baseColor}`,
              borderRight: `1px solid ${baseColor}`,
              borderBottom: `1px solid ${baseColor}`,
              // 打卡=绿色左边框，跳过=灰色左边框，其次活动=青色
              borderLeft: checkedIn ? '3px solid var(--st-color-hotel-checkin)'
                : skipped ? '3px solid var(--st-color-text-muted)'
                : isActivity ? '3px solid #26a69a'
                : `1px solid ${baseColor}`,
              borderRadius: '1.2rem',
              padding: 'var(--stop-card-p) var(--stop-card-p) 2.8rem',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
              boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100px',
              // 跳过的 stop 整体灰化
              opacity: skipped ? 0.55 : 1,
            }; })()}
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
                background: stop.type === 'hotel_checkout' ? 'var(--st-color-hotel-checkout)' : 'var(--st-color-hotel-line)',
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
                style={{ background: 'var(--md-sys-color-primary-container)', border: 'none', color: 'var(--md-sys-color-on-primary-container)', cursor: 'pointer', padding: '3px 5px', borderRadius: '6px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={t('common.delete') || 'Delete'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
              {confirmingDelete && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '10px', padding: '0.6rem 0.8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmingDelete(false); }}
                    style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--md-sys-color-surface)', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface-variant)', cursor: 'pointer', fontSize: '0.78rem' }}
                  >{t('common.cancel') || 'Cancel'}</button>
                  <button
                    onClick={handleConfirmDelete}
                    style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'var(--md-sys-color-error)', border: 'none', color: 'var(--md-sys-color-on-error)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
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

              {/* Activity badge */}
              {isActivity && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(38,166,154,0.1)',
                  border: '1px solid rgba(38,166,154,0.3)',
                  borderRadius: '8px', padding: '3px 10px',
                  fontSize: '0.72rem', fontWeight: 700, color: '#26a69a',
                  marginBottom: '0.4rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {getActivityIcon(stop.activityInfo?.activityCategory)}
                  </span>
                  {getActivityLabel(stop.activityInfo?.activityCategory, t)}
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
                  <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-error)', fontSize: '16px', flexShrink: 0 }}>error</span>
                  <span style={{ color: 'var(--md-sys-color-error)', fontSize: '0.78rem', fontWeight: 700 }}>
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
                  <h4 className="rich-stop-card-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)', letterSpacing: '-0.02em', textDecoration: skipped ? 'line-through' : 'none' }}>
                    {stop.location}
                  </h4>
                  {checkedIn && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--st-color-hotel-checkin)', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '5px', padding: '1px 7px', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {t('itinerary.checked_in') || '已打卡'}{stop.checkinTime ? ` ${stop.checkinTime}` : ''}
                    </span>
                  )}
                  {skipped && !checkedIn && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--st-color-text-muted)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '5px', padding: '1px 7px', flexShrink: 0 }}>
                      {t('itinerary.skipped') || '已跳过'}
                    </span>
                  )}
                  {/* Category icon after name — all layouts */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={stop.category ? (t(stop.category) !== stop.category ? t(stop.category) : stop.category) : t('map.place_default')}>
                    {(() => {
                      const Icon = getCategoryIcon(stop.category);
                      const iconColor = isHotelType ? 'var(--st-color-hotel-line)' : (dotColor || 'var(--md-sys-color-primary)');
                      return <Icon size={16} strokeWidth={2.2} style={{ color: iconColor, opacity: 0.75 }} />;
                    })()}
                  </div>
                  {stop.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <span style={{ color: 'var(--st-color-status-soon)', fontSize: '13px' }}>★</span>
                      <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.82rem', fontWeight: 700 }}>{stop.rating}</span>
                    </div>
                  )}
                </div>

                {/* Vertical Details List: Address -> Phone */}
                <div className="rich-stop-card-details" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0.8rem' }}>
                  {/* Address */}
                  {stop.address && (
                    <div className="rich-stop-card-address" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--st-color-category-food)', fontSize: '15px', flexShrink: 0, marginTop: '2px' }}>location_on</span>
                      <div style={{ fontSize: '0.82rem', color: 'var(--st-color-text-muted)', lineHeight: 1.4 }}>
                        {(() => {
                          const addr = stop.address;
                          if (addr.includes(',')) {
                            const parts = addr.split(',');
                            return (
                              <>
                                <div style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 700, marginBottom: '2px' }}>{parts[0].trim()}</div>
                                <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.78rem' }}>{parts.slice(1).join(',').trim()}</div>
                              </>
                            );
                          }
                          // Asian split
                          const match = addr.match(/(.*?[市区町村])(.*)/);
                          if (match) {
                            return (
                              <>
                                <div style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: 700, marginBottom: '2px' }}>{match[1]}</div>
                                <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.78rem' }}>{match[2]}</div>
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
                      <Phone size={14} strokeWidth={2.5} style={{ color: 'var(--md-sys-color-primary)', flexShrink: 0 }} />
                      <a href={`tel:${stop.phone}`} style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-primary)', fontWeight: 700, textDecoration: 'none' }}>
                        {stop.phone}
                      </a>
                    </div>
                  )}

                  {/* Website (if available) */}
                  {stop.website && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-tertiary)', fontSize: '15px', flexShrink: 0 }}>public</span>
                      <a href={stop.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-tertiary)', fontWeight: 700, textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {stop.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                </div>


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
                          color: 'var(--st-color-category-attraction)',
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
                          background: 'var(--md-sys-color-primary-container)',
                          color: 'var(--md-sys-color-on-primary-container)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid var(--md-sys-color-outline-variant)',
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
                        background: 'var(--md-sys-color-primary-container)',
                        color: 'var(--md-sys-color-on-primary-container)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid var(--md-sys-color-outline-variant)',
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
                        style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--md-sys-color-outline-variant)', textDecoration: 'none', cursor: 'pointer' }}
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
                          color: 'var(--md-sys-color-on-surface)',
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

                    {/* Activity chips */}
                    {isActivity && stop.activityInfo?.duration && (
                      <div
                        className="stop-chip"
                        style={{
                          background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', gap: '5px',
                          border: '1px solid rgba(99,102,241,0.25)',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                        {formatDuration(stop.activityInfo.duration)}
                      </div>
                    )}

                    {isActivity && stop.activityInfo?.bookingRef && (
                      <div
                        className="stop-chip"
                        style={{
                          background: 'rgba(255,255,255,0.05)', color: 'var(--md-sys-color-on-surface)',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '5px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>confirmation_number</span>
                        {stop.activityInfo.bookingRef}
                      </div>
                    )}

                    {isActivity && (
                      <div
                        className="stop-chip editable"
                        onClick={(e) => { e.stopPropagation(); setShowActivityDetail(true); }}
                        style={{
                          background: 'rgba(38,166,154,0.08)', color: '#26a69a',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                          display: 'flex', alignItems: 'center', gap: '5px',
                          border: '1px solid rgba(38,166,154,0.25)',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                        {t('activity.details') || 'Details'}
                      </div>
                    )}

                    {/* Plan B button */}
                    <div
                      className="stop-chip editable"
                      onClick={(e) => { e.stopPropagation(); setShowPlanB(true); }}
                      style={{
                        background: 'var(--md-sys-color-primary-container)',
                        color: 'var(--md-sys-color-on-primary-container)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: '1px solid var(--md-sys-color-outline-variant)',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>alt_route</span>
                      Plan B
                      {stop.planB?.length > 0 && (
                        <span style={{
                          background: 'var(--md-sys-color-primary)',
                          color: 'var(--md-sys-color-on-primary)',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          minWidth: '16px',
                          height: '16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}>
                          {stop.planB.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thumbnail (Right) - click to change photo */}
              <div
                className="rich-stop-card-media"
                ref={thumbRef}
                onClick={handlePhotoClick}
                style={{ borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--md-sys-color-outline)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }}
                title={t('itinerary.change_photo') || 'Change photo'}
              >
                {stop.photo ? (
                  <img src={stop.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={stop.location} />
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--st-color-text-muted)', opacity: 0.4 }}>add_photo_alternate</span>
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

          {/* Back Face — hidden in clean layout */}
          <div className="rich-stop-card-back">
            <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'white', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-secondary)' }}>attachment</span>
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

            {/* Empty space for flip button */}
            <div style={{ height: '2.5rem' }} />
          </div>

        </div>

        {/* Flip Icon */}
        <div className="stop-card-flip-container">
          <button
            className="stop-card-flip-btn"
            onClick={(e) => { e.stopPropagation(); setRotation(prev => prev + 180); }}
            title={t('itinerary.flip_card') || 'Explore Back'}
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

      {/* Activity Detail Modal */}
      {showActivityDetail && (
        <ActivityDetailModal
          stop={stop}
          dayId={dayId}
          onSave={(updatedStop) => onUpdateStop?.(dayId, stop.id, updatedStop)}
          onClose={() => setShowActivityDetail(false)}
        />
      )}

      {/* Plan B Panel */}
      <PlanBPanel
        stop={stop}
        dayId={dayId}
        open={showPlanB}
        onClose={() => setShowPlanB(false)}
        onSwap={onSwapPlanB}
        onAddAlternative={onAddPlanBAlternative}
        onRemoveAlternative={onRemovePlanBAlternative}
      />

      {/* Transit info */}
      {showTransit && (
        <TransitInfo
          transit={stop.transitToNext}
          transitMode={stop.transitMode || 'DRIVE'}
          origin={stop.lat && stop.lng ? { lat: stop.lat, lng: stop.lng } : null}
          dest={nextStop?.lat && nextStop?.lng ? { lat: nextStop.lat, lng: nextStop.lng } : null}
          onToggleMode={() => onToggleTransitMode?.(dayId, stop.id)}
          onAddStop={() => onInsertAfter?.(stop.id)}
          onAddNote={() => onAddNote?.(dayId, stop.id)}
          onAddList={() => onAddList?.(dayId, stop.id)}
          onAddTransport={() => onAddTransport?.(dayId, stop.id)}
          onAddActivity={() => onAddActivity?.(dayId, stop.id)}
        />
      )}

    </div>
  );
})
