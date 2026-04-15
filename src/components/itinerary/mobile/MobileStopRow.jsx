/**
 * MobileStopRow — Single stop card with 3D flip, drag-to-reorder, swipe gestures.
 * Renders front face (stop info) and back face (actions: attach, plan B, navigate).
 */

import { stopDisplayName, formatTime12h, priceTier, formatDurationCompact } from '../../../utils/formatters';
import { TRANSIT_MODE_ICONS, TRANSIT_MODE_WORDS } from '../../../utils/transitHelpers';
import { CHIP, PILL } from './mobileStyles';

function transitPill(t) {
  if (!t) return null;
  const mode = (t.mode || 'WALK').toUpperCase();
  const dur = formatDurationCompact(t.duration);
  if (!dur) return null;
  return { icon: TRANSIT_MODE_ICONS[mode] || 'directions_walk', text: `${dur} ${TRANSIT_MODE_WORDS[mode] || 'walk'}` };
}

export default function MobileStopRow({
  stop, idx, last, day, dayIdx, trip,
  draggingStopId, cardRotation, didDragRef,
  onCardTouchStart, onCardTouchEnd, onCardMouseDown, onCardMouseUp,
  wrappedPointerDown, onDragPointerMove, wrappedPointerUp,
  setEditStop, setTimePick, setExpense, setPlanBStop, t,
}) {
  const nm = stopDisplayName(stop);
  const tr = transitPill(stop.transitToNext);
  const pr = priceTier(stop);
  const tm = formatTime12h(stop);
  const isDragging = draggingStopId === stop.id;
  const rot = cardRotation[stop.id] || 0;

  return (
    <div
      data-drag-id={stop.id}
      data-drag-day={day.id}
      data-drag-handle="true"
      onPointerDown={(e) => wrappedPointerDown(e, stop.id)}
      onPointerMove={onDragPointerMove}
      onPointerUp={wrappedPointerUp}
      style={{
        position: 'relative',
        userSelect: 'none',
        willChange: isDragging ? 'transform' : 'auto',
      }}
    >
      {/* Stop card — 3D flip container */}
      <div className="stop-card-container"
        onTouchStart={(e) => onCardTouchStart(e, stop.id)}
        onTouchEnd={onCardTouchEnd}
        onMouseDown={(e) => onCardMouseDown(e, stop.id)}
        onMouseUp={onCardMouseUp}
        style={{ perspective: 900, width: '100%' }}>
        <div className="stop-card-flip" style={{
          position: 'relative', width: '100%',
          transition: 'transform 0.55s cubic-bezier(.4,.0,.2,1)',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rot}deg)`,
        }}>
          {/* FRONT FACE */}
          <div style={{
            width: '100%', background: '#fff', borderRadius: 14, padding: '8px 6px',
            display: 'flex', gap: 8, alignItems: 'flex-start',
            border: 'none', textAlign: 'left', position: 'relative',
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            boxShadow: isDragging
              ? '0 12px 32px rgba(0,0,0,0.35)'
              : '0 1px 3px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06)',
          }}>
            {/* badge */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#1C1C1E', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2, position: 'relative',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1}</span>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', fontSize: 10, color: 'rgba(255,255,255,.45)',
                bottom: -2, right: -2,
              }}>drag_indicator</span>
            </div>
            {/* info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div onClick={() => {
                if (draggingStopId || didDragRef.current) return;
                setEditStop({ dayId: day.id, stop });
              }} style={{
                fontSize: 14, fontWeight: 600, color: '#000', lineHeight: 1.3,
                marginBottom: 4, cursor: 'pointer',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{nm}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {stop.rating > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 500, color: '#3C3C43' }}>
                    <span style={{ color: '#FF3B30', fontSize: 12 }}>★</span>
                    {Number(stop.rating).toFixed(1)}
                  </span>
                )}
                {tm && <span style={{ ...CHIP, cursor: 'pointer' }} onClick={(e) => {
                  e.stopPropagation();
                  if (draggingStopId || didDragRef.current) return;
                  let dayDate = day.date;
                  if (trip.startDate) {
                    const d = new Date(trip.startDate.replace(/-/g, '/'));
                    d.setDate(d.getDate() + dayIdx);
                    if (!isNaN(d)) dayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  }
                  setTimePick({ dayId: day.id, stop, dayDate });
                }}>{tm}</span>}
                {pr && <span style={{ ...CHIP, cursor: 'pointer' }} onClick={(e) => {
                  e.stopPropagation();
                  if (draggingStopId || didDragRef.current) return;
                  setExpense({ dayId: day.id, stop });
                }}>{pr}</span>}
              </div>
            </div>
            {/* photo */}
            {stop.photo && (
              <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                <img src={stop.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
          </div>{/* end front face */}

          {/* BACK FACE — Apple-style white */}
          <div style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            background: '#fff', borderRadius: 14,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center',
            padding: '0 12px', gap: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06)',
          }}>
            {[
              { icon: 'attach_file', label: t('stops.attach_btn') || 'Attach' },
              { icon: 'swap_horiz', label: t('itinerary.plan_b') || 'Plan B', action: () => {
                setPlanBStop({ dayId: day.id, stop });
              }},
              { icon: 'near_me', label: t('itinerary.navigate') || 'Navigate', action: () => {
                const dest = stop.lat && stop.lng
                  ? `${stop.lat},${stop.lng}`
                  : encodeURIComponent(stop.address || stop.location || nm);
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
              }},
            ].map(btn => (
              <button key={btn.label} onClick={(e) => {
                e.stopPropagation();
                btn.action?.();
              }} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12,
                cursor: 'pointer', padding: '10px 0',
                boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 1px 6px rgba(0,0,0,.04)',
                width: '100%', height: '100%', maxHeight: 64,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#1C1C1E' }}>{btn.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#3C3C43', letterSpacing: .2 }}>{btn.label}</span>
              </button>
            ))}
          </div>{/* end back face */}
        </div>
      </div>{/* end stop-card-container */}

      {/* Divider line + transit pill between stops */}
      {!last && (
        <div style={{
          display: 'flex', alignItems: 'center',
          margin: '2px 4px', height: 30,
        }}>
          <div style={{ flex: 1, height: 1, background: '#E5E5EA' }} />
          {tr ? (
            <div style={PILL}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{tr.icon}</span>
              {tr.text}
            </div>
          ) : (
            <div style={{ ...PILL, color: '#AEAEB2' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>more_horiz</span>
            </div>
          )}
          <div style={{ flex: 1, height: 1, background: '#E5E5EA' }} />
        </div>
      )}
    </div>
  );
}
