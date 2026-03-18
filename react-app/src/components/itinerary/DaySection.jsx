import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import DayHeader from './DayHeader';
import StopCard from './StopCard';
import NoteCard from './NoteCard';
import ListCard from './ListCard';
import AddStopRow from './AddStopRow';

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
  onChangePhoto,
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
          onAddStop={(dId, afterId) => setInsertingAfterStopId(afterId)}
          onAddNote={onAddNote}
          onAddList={onAddList}
          onFocusStop={onFocusStop}
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

            {/* "From hotel" hint */}
            {(hotelContext.isBetween || hotelContext.isCoutOnly) && hotelContext.stay && (
              <div style={{ paddingLeft: '2.25rem', marginBottom: '0.8rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', left: '10px', top: '-10rem', bottom: '-1rem', width: '4px', background: '#8b6b3b', opacity: 1, zIndex: 1, borderRadius: 0, transition: 'all 0.3s ease' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏨</span>
                  <span>{t('itinerary.from_hotel') || 'From hotel:'} {hotelContext.stay.location}</span>
                </div>
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

            {/* "Return to hotel" hint */}
            {(hotelContext.isBetween || hotelContext.isCinOnly || hotelContext.isSameDayStay) && hotelContext.stay && (
              <div style={{ paddingLeft: '2.25rem', marginTop: '0.8rem', color: '#f59e0b', fontSize: '0.85rem', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', left: '10px', top: '-1rem', bottom: '-10rem', width: '4px', background: '#8b6b3b', opacity: 1, zIndex: 1, borderRadius: 0, transition: 'all 0.3s ease' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🏨</span>
                  <span>{t('itinerary.return_hotel') || 'Return to hotel:'} {hotelContext.stay.location}</span>
                </div>
              </div>
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
