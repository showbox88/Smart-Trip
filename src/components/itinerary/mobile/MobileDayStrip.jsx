/**
 * MobileDayStrip — Vertical day selector with touch drag & long-press reorder.
 * iOS-style timeline dots with connecting line.
 */

export default function MobileDayStrip({
  days, dayIdx, setDayIdx,
  totalShift, dragOffset,
  dayDragIdx, dayDragDy, dayDropIdx, DAY_ROW_H,
  onTouchStart, onTouchMove, onTouchEnd,
  onDayPointerDown, onDayPointerMove, onDayPointerUp,
}) {
  return (
    <div style={{
      width: 72, flexShrink: 0, overflow: 'hidden',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPointerMove={onDayPointerMove}
      onPointerUp={onDayPointerUp}
      onPointerLeave={onDayPointerUp}
    >
      <div style={{
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        transform: `translateY(-${totalShift}px)`,
        transition: (dragOffset !== 0 || dayDragIdx != null) ? 'none' : 'transform .3s ease',
      }}>
        {/* Vertical connecting line through dot centers */}
        <div style={{
          position: 'absolute',
          right: 13,
          top: 22,
          bottom: 22,
          width: 2,
          background: '#C7C7CC',
          zIndex: 0,
        }} />
        {days.map((d, i) => {
          const active = i === dayIdx;
          const adjActive = i === dayIdx - 1 || i === dayIdx;
          const isDayDragging = dayDragIdx === i;
          // Displacement for non-dragged items
          let dayShift = 0;
          if (dayDragIdx != null && dayDropIdx != null && i !== dayDragIdx) {
            if (dayDragIdx < dayDropIdx && i > dayDragIdx && i <= dayDropIdx) dayShift = -DAY_ROW_H;
            else if (dayDragIdx > dayDropIdx && i >= dayDropIdx && i < dayDragIdx) dayShift = DAY_ROW_H;
          }
          return (
            <div key={d.id}
              onPointerDown={(e) => onDayPointerDown(e, i)}
              style={{
              position: 'relative',
              zIndex: isDayDragging ? 10 : (active ? 2 : 1),
              height: DAY_ROW_H,
              boxSizing: 'border-box',
              transform: isDayDragging
                ? `translateY(${dayDragDy}px) scale(1.06)`
                : dayShift ? `translateY(${dayShift}px)` : '',
              transition: isDayDragging ? 'scale 0.2s' : 'transform 0.25s cubic-bezier(.25,.1,.25,1)',
              opacity: isDayDragging ? 0.9 : 1,
              touchAction: 'none',
            }}>
              <button onClick={() => { if (dayDragIdx != null) return; setDayIdx(i); }}
                onPointerDown={(e) => onDayPointerDown(e, i)}
                style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 0 0 6px', border: 'none', cursor: 'pointer',
                background: isDayDragging ? '#F2F2F7' : (active ? '#fff' : 'transparent'),
                borderRadius: active || isDayDragging ? '16px 0 0 16px' : 0,
                width: '100%', height: '100%',
                transition: 'background .15s',
                boxShadow: isDayDragging ? '0 4px 16px rgba(0,0,0,.15)' : 'none',
                touchAction: 'none',
              }}>
                <span style={{
                  fontSize: 15, fontWeight: active ? 700 : 500,
                  color: active ? '#000' : '#8E8E93',
                  whiteSpace: 'nowrap',
                }}>Day {i + 1}</span>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: active ? '#FF3B30' : '#C7C7CC',
                  flexShrink: 0,
                  border: active ? '2px solid #fff' : '2px solid #F2F2F7',
                  boxSizing: 'content-box',
                  position: 'relative', zIndex: 1,
                  ...(active ? { boxShadow: '0 0 0 3px rgba(255,59,48,.15)' } : {}),
                }} />
              </button>
              {/* Gray divider */}
              {i < days.length - 1 && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 9, right: 23,
                  height: 1,
                  background: adjActive ? 'transparent' : '#C7C7CC',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
