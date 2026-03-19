import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import DayHeader from './DayHeader';
import StopCard from './StopCard';
import NoteCard from './NoteCard';
import ListCard from './ListCard';
import AddStopRow from './AddStopRow';
import TransitInfo from './TransitInfo';

export default function DaySection({
  day, dayIndex, trip,
  isCollapsed, onToggleCollapse,
  onAddStop, onDeleteStop, onEditStop, onToggleTransitMode,
  onAddNote, onAddList,
  onDeleteNote, onUpdateNoteContent,
  onDeleteList, onUpdateListItem, onToggleListItem, onAddListItem, onDeleteListItem,
  onColorChange, onEditDay, onDeleteDay, onUpdateDay,
  onOpenTimePicker,
  onOpenExpense,
  onOpenStayInfo,
  onChangePhoto,
  onToggleHotelTransitMode,
  draggingStopId,
  onDragPointerDown, onDragPointerMove, onDragPointerUp,
  onFocusStop
}) {
  const { t } = useI18n();
  const [insertingAfterStopId, setInsertingAfterStopId] = useState(null);
  const activeColor = day.color || '#5b7a99';

  const hotelContext = getHotelContext(day, trip);
  const stops = day.stops || [];

  // Compute the weekday index (Mon=0...Sun=6) for this day
  const dayWeekdayIdx = (() => {
    if (!trip?.startDate) return -1;
    const d = new Date(trip.startDate.replace(/-/g, '/'));
    if (isNaN(d)) return -1;
    d.setDate(d.getDate() + dayIndex);
    return (d.getDay() + 6) % 7;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  // First and last plain POI indices (location type, not hotel/note/list) for hotel context lines
  const plainPois = stops
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.type !== 'hotel_checkin' && s.type !== 'hotel_checkout' && s.type !== 'note' && s.type !== 'list');
  const plainPoiIndices = plainPois.map(({ i }) => i);
  const firstPlainPoiIdx = plainPoiIndices[0] ?? -1;
  const lastPlainPoiIdx = plainPoiIndices[plainPoiIndices.length - 1] ?? -1;
  const firstPlainStop = plainPois[0]?.s ?? null;
  const lastPlainStop = plainPois[plainPois.length - 1]?.s ?? null;

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

    let card;
    if (stop.type === 'note') {
      card = (
        <NoteCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          onDelete={onDeleteNote} onContentChange={onUpdateNoteContent}
        />
      );
    } else if (stop.type === 'list') {
      card = (
        <ListCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          onDelete={onDeleteList} onItemChange={onUpdateListItem}
          onItemToggle={onToggleListItem} onAddItem={onAddListItem}
          onDeleteItem={onDeleteListItem}
        />
      );
    } else {
      const isPlainPoi = stop.type !== 'hotel_checkin' && stop.type !== 'hotel_checkout' && stop.type !== 'note' && stop.type !== 'list';
      const hasHotelAbove = (hotelContext.isBetween || hotelContext.isCoutOnly) && hotelContext.stay;
      const hasHotelBelow = (hotelContext.isBetween || hotelContext.isCinOnly || hotelContext.isSameDayStay) && hotelContext.stay;
      card = (
        <StopCard
          stop={stop} dayId={day.id} dayColor={activeColor}
          index={displayIndex ? displayIndex - 1 : index}
          showTransit={showTransit}
          dayWeekdayIdx={dayWeekdayIdx}
          onDelete={onDeleteStop}
          onChangePhoto={onChangePhoto}
          onToggleTransitMode={onToggleTransitMode}
          onOpenTimePicker={onOpenTimePicker}
          onOpenExpense={onOpenExpense}
          onOpenStayInfo={onOpenStayInfo}
          onAddStop={(dId, afterId) => setInsertingAfterStopId(afterId)}
          onAddNote={onAddNote}
          onAddList={onAddList}
          onFocusStop={onFocusStop}
          fromHotel={isPlainPoi && hasHotelAbove && index === firstPlainPoiIdx}
          toHotel={isPlainPoi && hasHotelBelow && index === lastPlainPoiIdx}
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
        style={{ position: 'relative', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
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
      style={{ marginBottom: '3rem', scrollMarginTop: '120px' }}
    >
      <DayHeader
        day={day} dayIndex={dayIndex} isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onColorChange={onColorChange} 
        onEditDay={onEditDay} 
        onDeleteDay={onDeleteDay}
        onUpdateDay={onUpdateDay} 
      />

      {!isCollapsed && (
        <div style={{ paddingLeft: 0 }}>
          <div className="timeline-container" style={{ position: 'relative' }}>
            {/* Dashed timeline line */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '22px', width: 0, borderLeft: `2px dashed ${activeColor}`, opacity: 0.5, zIndex: 0, transform: 'translateX(-50%)', transition: 'border-color 0.2s' }} />

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '0.8rem', paddingLeft: '2.25rem', paddingRight: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>🪄</span> {t('itinerary.auto_fill')}
              </button>
              <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>📍</span> {t('itinerary.optimize_route')} 
                <span style={{ background: 'var(--accent-primary)', color: '#FFF', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '4px', marginLeft: '2px' }}>PRO</span>
              </button>
            </div>

            {/* "From hotel" hint — between days */}
            {(hotelContext.isBetween || hotelContext.isCoutOnly) && hotelContext.stay && (
              <>
                <div style={{ paddingLeft: '2.25rem', marginBottom: '0.2rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                  {/* amber line from top of day down through hint, connects to first card's fromHotel line */}
                  <div style={{ position: 'absolute', left: '1.05rem', top: 0, bottom: '-0.2rem', width: '4px', background: 'rgba(245,158,11,0.7)', zIndex: 1 }} />
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
                />
                <div style={{ paddingLeft: '2.25rem', marginTop: '0.2rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                  {/* amber line from last card's toHotel line, connects through hint */}
                  <div style={{ position: 'absolute', left: '1.05rem', top: '-0.2rem', bottom: 0, width: '4px', background: 'rgba(245,158,11,0.7)', zIndex: 1 }} />
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
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getHotelContext(day, trip) {
  if (!trip?.days) return {};
  const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id })));
  const staysMap = new Map();
  allStops.forEach(s => {
    if (!s.stayId) return;
    if (!staysMap.has(s.stayId)) staysMap.set(s.stayId, { id: s.stayId, checkinDayId: null, checkoutDayId: null, location: s.location });
    const stay = staysMap.get(s.stayId);
    if (s.type === 'hotel_checkin') { stay.checkinDayId = s.dayId; stay.location = s.location; }
    if (s.type === 'hotel_checkout') { stay.checkoutDayId = s.dayId; }
  });
  const stays = Array.from(staysMap.values()).filter(s => s.checkinDayId && s.checkoutDayId);
  const dayIdxMap = new Map(trip.days.map((d, i) => [d.id, i]));
  const dIdx = dayIdxMap.get(day.id);
  const stay = stays.find(s => {
    const cinIdx = dayIdxMap.get(s.checkinDayId);
    const coutIdx = dayIdxMap.get(s.checkoutDayId);
    return dIdx !== undefined && cinIdx !== undefined && coutIdx !== undefined && dIdx >= cinIdx && dIdx <= coutIdx;
  });
  if (!stay) return {};
  return {
    stay,
    isCinOnly: stay.checkinDayId === day.id && stay.checkoutDayId !== day.id,
    isCoutOnly: stay.checkoutDayId === day.id && stay.checkinDayId !== day.id,
    isBetween: stay.checkinDayId !== day.id && stay.checkoutDayId !== day.id,
    isSameDayStay: stay.checkinDayId === day.id && stay.checkoutDayId === day.id,
  };
}
