import { useState, useMemo, memo } from 'react';
import { format, addDays } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext';
import DayHeader from './DayHeader';
import StopCard from './StopCard';
import NoteCard from './NoteCard';
import ListCard from './ListCard';
import AddStopRow from './AddStopRow';
import TransitInfo from './TransitInfo';
import HotelLine from './HotelLine';
import { getHotelContextForDay } from '../../utils/stayHelpers';

export default memo(function DaySection({
  day, dayIndex, trip,
  isCollapsed, onToggleCollapse,
  onAddStop, onDeleteStop, onToggleTransitMode,
  onAddNote, onAddList,
  onDeleteNote, onUpdateNoteContent,
  onDeleteList, onUpdateListTitle, onUpdateListItem, onToggleListItem, onAddListItem, onDeleteListItem,
  onColorChange, onEditDay, onDeleteDay, onUpdateDay, onUpdateStop,
  onSortByTime,
  onOpenTimePicker,
  onOpenExpense,
  onOpenStayInfo,
  onChangePhoto,
  onToggleHotelTransitMode,
  draggingStopId,
  onDragPointerDown, onDragPointerMove, onDragPointerUp,
  onFocusStop,
  pendingFocusId, setPendingFocusId
}) {
  const { t, language } = useI18n();
  const [insertingAfterStopId, setInsertingAfterStopId] = useState(null);
  const activeColor = day.color || '#5b7a99';

  const hotelContext = getHotelContextForDay(trip, day.id);
  const stops = useMemo(() => day.stops || [], [day.stops]);

  // Localized date parts for the header
  const dateInfo = useMemo(() => {
    if (!trip?.startDate) return { date: '', weekday: '' };
    try {
      const baseDate = new Date(trip.startDate.replace(/-/g, '/'));
      if (isNaN(baseDate)) return { date: '', weekday: '' };
      const currentDate = addDays(baseDate, dayIndex);
      
      const locale = language === 'zh' ? zhCN : enUS;
      const dateStr = language === 'zh' ? 'M月d日' : 'MMM d';
      const weekdayStr = 'EEEE';
      
      return {
        date: format(currentDate, dateStr, { locale }),
        weekday: format(currentDate, weekdayStr, { locale })
      };
    } catch (e) {
      console.error('[DaySection] Error formatting date:', e);
      return { date: '', weekday: '' };
    }
  }, [trip, dayIndex, language]);

  // Compute the weekday index (Mon=0...Sun=6) for this day
  const dayWeekdayIdx = useMemo(() => {
    if (!trip?.startDate) return -1;
    const d = new Date(trip.startDate.replace(/-/g, '/'));
    if (isNaN(d)) return -1;
    d.setDate(d.getDate() + dayIndex);
    return (d.getDay() + 6) % 7;
  }, [trip, dayIndex]);

  // Check if this day section represents today
  const isToday = useMemo(() => {
    if (!trip?.startDate) return false;
    const base = new Date(trip.startDate.replace(/-/g, '/'));
    if (isNaN(base)) return false;
    base.setDate(base.getDate() + dayIndex);
    const now = new Date();
    return base.getFullYear() === now.getFullYear() &&
      base.getMonth() === now.getMonth() &&
      base.getDate() === now.getDate();
  }, [trip, dayIndex]);

  // First and last plain POI for hotel transit info
  const { firstPlainStop, lastPlainStop } = useMemo(() => {
    const pois = stops
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.type !== 'hotel_checkin' && s.type !== 'hotel_checkout' && s.type !== 'note' && s.type !== 'list');
    return {
      firstPlainStop: pois[0]?.s ?? null,
      lastPlainStop: pois[pois.length - 1]?.s ?? null,
    };
  }, [stops]);

  // Index of checkin/checkout stops for the current hotel stay (within this day's stops array)
  const { cinIdx, coutIdx } = useMemo(() => ({
    cinIdx: hotelContext.stay
      ? stops.findIndex(s => s.type === 'hotel_checkin' && s.stayId === hotelContext.stay.id)
      : -1,
    coutIdx: hotelContext.stay
      ? stops.findIndex(s => s.type === 'hotel_checkout' && s.stayId === hotelContext.stay.id)
      : -1,
  }), [stops, hotelContext.stay]);

  // Returns true only if stop at given index is strictly between checkin dot and checkout dot
  const getInHotelStay = (index, stopType) => {
    if (!hotelContext.stay) return false;
    if (stopType === 'hotel_checkin' || stopType === 'hotel_checkout') return false;
    if (hotelContext.isBetween) return true;
    if (hotelContext.isCinOnly) return cinIdx >= 0 && index > cinIdx;
    if (hotelContext.isCoutOnly) return coutIdx >= 0 && index < coutIdx;
    if (hotelContext.isSameDayStay) return cinIdx >= 0 && coutIdx >= 0 && index > cinIdx && index < coutIdx;
    return false;
  };

  const renderStop = (stop, index) => {
    const isPoi = stop.type === 'location' || !stop.type || stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
    const hasNextPoi = stops.slice(index + 1).some(s => s.type === 'location' || !s.type || s.type === 'hotel_checkin' || s.type === 'hotel_checkout');
    const showTransit = isPoi && hasNextPoi;

    // Calculate display index for POI (location/hotel) reset per day
    let displayIndex = null;
    if (isPoi) {
      // Count POIs before this one in current day
      const prevStopsInDay = stops.slice(0, index).filter(s => s.type !== 'note' && s.type !== 'list').length;
      displayIndex = prevStopsInDay + 1;
    }

    const inHotelStay = getInHotelStay(index, stop.type);

    let card;
    if (stop.type === 'note') {
      card = (
        <NoteCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          onDelete={onDeleteNote} onContentChange={onUpdateNoteContent}
          pendingFocusId={pendingFocusId} setPendingFocusId={setPendingFocusId}
          inHotelStay={inHotelStay}
        />
      );
    } else if (stop.type === 'list') {
      card = (
        <ListCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          onDelete={onDeleteList} onTitleChange={onUpdateListTitle} onItemChange={onUpdateListItem}
          onItemToggle={onToggleListItem} onAddItem={onAddListItem}
          onDeleteItem={onDeleteListItem}
          pendingFocusId={pendingFocusId} setPendingFocusId={setPendingFocusId}
          inHotelStay={inHotelStay}
        />
      );
    } else {
      card = (
        <StopCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          index={displayIndex ? displayIndex - 1 : index}
          showTransit={showTransit}
          dayWeekdayIdx={dayWeekdayIdx}
          isToday={isToday}
          onDelete={onDeleteStop}
          onChangePhoto={onChangePhoto}
          onToggleTransitMode={onToggleTransitMode}
          onOpenTimePicker={onOpenTimePicker}
          onOpenExpense={onOpenExpense}
          onOpenStayInfo={onOpenStayInfo}
          onUpdateStop={onUpdateStop}
          onAddStop={(dId, afterId) => setInsertingAfterStopId(afterId)}
          onAddNote={onAddNote}
          onAddList={onAddList}
          onFocusStop={onFocusStop}
          inHotelStay={inHotelStay}
        />
      );
    }

    const isDragging = draggingStopId === stop.id;

    return (
      <div
        key={stop.id}
        data-drag-id={stop.id}
        data-drag-day={day.id}
        className={`timeline-item-wrapper${isDragging ? ' dragging' : ''}`}
        onPointerDown={(e) => onDragPointerDown?.(e, stop.id)}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        style={{ position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {card}
        {/* Inline insert search */}
        {insertingAfterStopId === stop.id && (
          <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <AddStopRow
              dayId={day.id}
              afterStopId={stop.id}
              onAddStop={(dayId, placeId) => {
                onAddStop?.(dayId, placeId, stop.id);
                setInsertingAfterStopId(null);
              }}
              onAddNote={onAddNote}
              onAddList={onAddList}
              autoFocus
              onClose={() => setInsertingAfterStopId(null)}
              inHotelStay={inHotelStay}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="day-section"
      id={day.id}
      style={{ marginBottom: '3rem', position: 'relative' }}
    >
      {/* Bridge amber hotel line for isBetween days: spans full day-section including both inter-day gaps */}
      {hotelContext.stay && hotelContext.isBetween && (
        <HotelLine top="-3rem" bottom="-3rem" />
      )}

      {/* For isCoutOnly: wrap DayHeader so bridge is confined to just the header area.
          The hotel line continues inside the timeline via toolbar + individual stop inHotelStay props. */}
      <div style={{ position: hotelContext.stay && hotelContext.isCoutOnly ? 'relative' : undefined }}>
        {hotelContext.stay && hotelContext.isCoutOnly && (
          <HotelLine top="-3rem" bottom="-0.5rem" />
        )}
      <DayHeader
        day={day} dayIndex={dayIndex} isCollapsed={isCollapsed}
        date={dateInfo.date} weekday={dateInfo.weekday}
        onToggleCollapse={onToggleCollapse}
        onColorChange={onColorChange} 
        onEditDay={onEditDay} 
        onDeleteDay={onDeleteDay}
        onUpdateDay={onUpdateDay}
      />
      </div>

      {!isCollapsed && (
        <div style={{ paddingLeft: 0 }}>
          <div className="timeline-container" style={{ position: 'relative' }}>
            {/* Dashed timeline line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'var(--timeline-line-x)', width: 0, borderLeft: `2px dashed ${activeColor}`, opacity: 0.5, zIndex: 0, transform: 'translateX(-50%)', transition: 'border-color 0.2s, left 0.3s' }} />

            {/* Toolbar wrapper — hotel line hangs on the wrapper, not inside the flex container */}
            <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
              {(hotelContext.isBetween || hotelContext.isCoutOnly) && hotelContext.stay && (
                <HotelLine top="0" bottom="-0.8rem" />
              )}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', paddingLeft: 'var(--auto-fill-pl)', paddingRight: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                  <span style={{ fontSize: '1.1rem' }}>🪄</span> {t('itinerary.auto_fill')}
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                  <span style={{ fontSize: '1.1rem' }}>📍</span> {t('itinerary.optimize_route')}
                  <span style={{ background: 'var(--accent-primary)', color: '#FFF', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', marginLeft: '2px' }}>PRO</span>
                </button>
                {stops.some(s => s.time) && (
                  <button
                    onClick={onSortByTime}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🕐</span> {t('itinerary.sort_by_time')}
                  </button>
                )}
              </div>
            </div>

            {/* "From hotel" hint — between days */}
            {(hotelContext.isBetween || hotelContext.isCoutOnly) && hotelContext.stay && (
              <>
                <div style={{ paddingLeft: '2.25rem', marginBottom: '0.2rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                  {/* amber line from top of day down through hint, connects to first card's fromHotel line */}
                  <HotelLine top="0" bottom="-0.2rem" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏨</span>
                    <span>{t('itinerary.from_hotel') || 'From hotel:'} {hotelContext.stay.location}</span>
                  </div>
                </div>
                <TransitInfo
                  transit={firstPlainStop?.transitFromHotel}
                  transitMode={firstPlainStop?.transitModeFromHotel || 'DRIVE'}
                  onToggleMode={firstPlainStop ? () => onToggleHotelTransitMode?.(day.id, firstPlainStop.id, 'from') : null}
                  onAddStop={() => setInsertingAfterStopId('__before_first__')}
                  onAddNote={() => onAddNote?.(day.id, '__prepend__')}
                  onAddList={() => onAddList?.(day.id, '__prepend__')}
                  inHotelStay
                />
              </>
            )}

            {/* Inline insert before first stop (from hotel TransitInfo + button) */}
            {insertingAfterStopId === '__before_first__' && (
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                <AddStopRow
                  dayId={day.id}
                  afterStopId="__prepend__"
                  onAddStop={(dayId, placeId) => {
                    onAddStop?.(dayId, placeId, '__prepend__');
                    setInsertingAfterStopId(null);
                  }}
                  onAddNote={(dayId) => { onAddNote?.(dayId, '__prepend__'); setInsertingAfterStopId(null); }}
                  onAddList={(dayId) => { onAddList?.(dayId, '__prepend__'); setInsertingAfterStopId(null); }}
                  autoFocus
                  onClose={() => setInsertingAfterStopId(null)}
                  inHotelStay={!!hotelContext.stay}
                />
              </div>
            )}

            {/* Empty state — also acts as a phantom drop target */}
            {stops.length === 0 && (
              <div
                data-drag-id={`__empty_${day.id}`}
                data-drag-day={day.id}
                className="timeline-item-wrapper"
                style={{ padding: '1.5rem 1rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', position: 'relative', zIndex: 2, transition: 'transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
              >
                <span style={{ fontSize: '2rem', opacity: 0.5 }}>📅</span>
                <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0', fontWeight: 500 }}>({t('itinerary.no_data') || 'No stops yet'})</p>
              </div>
            )}

            {stops.map(renderStop)}

            {/* "Return to hotel" hint — between days */}
            {(hotelContext.isBetween || hotelContext.isCinOnly || hotelContext.isSameDayStay) && hotelContext.stay && (
              <>
                <TransitInfo
                  transit={lastPlainStop?.transitToHotel}
                  transitMode={lastPlainStop?.transitModeToHotel || 'DRIVE'}
                  onToggleMode={lastPlainStop ? () => onToggleHotelTransitMode?.(day.id, lastPlainStop.id, 'to') : null}
                  onAddStop={() => setInsertingAfterStopId(lastPlainStop?.id)}
                  onAddNote={() => onAddNote?.(day.id, lastPlainStop?.id)}
                  onAddList={() => onAddList?.(day.id, lastPlainStop?.id)}
                  inHotelStay
                />
                <div style={{ paddingLeft: '2.25rem', marginTop: '0.2rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                  {/* amber line from last card's toHotel line, connects through hint */}
                  <HotelLine top="-0.2rem" bottom="0" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏨</span>
                    <span>{t('itinerary.return_hotel') || 'Return to hotel:'} {hotelContext.stay.location}</span>
                  </div>
                </div>
              </>
            )}

            <AddStopRow
              dayId={day.id}
              onAddStop={onAddStop}
              onAddNote={onAddNote}
              onAddList={onAddList}
              inHotelStay={!!(hotelContext.stay && (hotelContext.isCinOnly || hotelContext.isBetween))}
            />
          </div>
        </div>
      )}
    </div>
  );
})
