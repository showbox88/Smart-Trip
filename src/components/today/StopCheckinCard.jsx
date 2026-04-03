import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import TimePickerModal from '../modals/TimePickerModal';
import ExpenseModal from '../modals/ExpenseModal';

const CATEGORY_ICON_MAP = [
  [['lodging', 'hotel', 'accommodation'], 'hotel'],
  [['restaurant', 'food', 'dining'], 'restaurant'],
  [['cafe', 'coffee'], 'local_cafe'],
  [['bakery'], 'bakery_dining'],
  [['bar', 'night', 'drinks'], 'local_bar'],
  [['attraction', 'museum', 'landmark', 'sightseeing'], 'museum'],
  [['park', 'nature'], 'park'],
  [['shopping', 'store', 'mall'], 'shopping_bag'],
  [['transit', 'subway', 'train', 'bus', 'transport'], 'directions_transit'],
  [['airport', 'flight'], 'flight'],
  [['activity', 'sport', 'activities'], 'confirmation_number'],
];

function getCategoryIcon(stop) {
  if (stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout') return 'hotel';
  const key = (stop.category || '').toLowerCase();
  for (const [kw, icon] of CATEGORY_ICON_MAP) {
    if (kw.some(k => key.includes(k))) return icon;
  }
  return 'place';
}

/**
 * Props:
 *   stop        - stop object (with checkedIn, checkinTime optional)
 *   isCurrent   - bool: this is the next unchecked stop
 *   dayDate     - YYYY-MM-DD string
 *   onCheckin   - (stopId, patch) => void  — saves check-in to DB
 */
export default function StopCheckinCard({ stop, isCurrent, dayDate, onCheckin }) {
  const { state } = useApp();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const price = parseFloat(stop.price) || 0;
  const hotelBadge =
    stop.type === 'hotel_checkin' ? { label: 'Check-in', color: 'var(--st-color-hotel-checkin)' } :
    stop.type === 'hotel_checkout' ? { label: 'Check-out', color: 'var(--st-color-status-soon)' } : null;

  const navUrl = stop.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}${stop.placeId ? `&destination_place_id=${stop.placeId}` : ''}`
    : null;

  const handleCheckin = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const timeStr = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onCheckin(stop.id, { checkedIn: true, time: timeStr, period, checkinTime: timeStr });
  };

  // Border color logic
  const borderColor = stop.checkedIn
    ? 'rgba(34,197,94,0.35)'
    : isCurrent
      ? 'rgba(249,115,22,0.5)'
      : 'var(--md-sys-color-outline)';

  const bgColor = stop.checkedIn
    ? 'rgba(34,197,94,0.04)'
    : isCurrent
      ? 'rgba(249,115,22,0.05)'
      : 'var(--md-sys-color-surface-variant)';

  return (
    <>
      <div style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '0.85rem 1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        position: 'relative',
        transition: 'all 0.2s',
      }}>
        {/* Status indicator column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px', gap: '4px', flexShrink: 0 }}>
          {stop.checkedIn ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)', border: '2px solid var(--st-color-hotel-checkin)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-hotel-checkin)', fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
          ) : isCurrent ? (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(249,115,22,0.15)', border: '2px solid var(--st-color-category-food)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--st-color-category-food)' }}>near_me</span>
            </div>
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--st-color-text-muted)' }}>radio_button_unchecked</span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: icon + name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '14px', color: 'var(--md-sys-color-primary)',
              fontVariationSettings: "'FILL' 1", flexShrink: 0,
            }}>
              {getCategoryIcon(stop)}
            </span>
            <span style={{
              fontWeight: 700, fontSize: '0.9rem', color: stop.checkedIn ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px',
            }}>
              {stop.location || stop.name || 'Unnamed'}
            </span>
            {hotelBadge && (
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: hotelBadge.color, background: `${hotelBadge.color}22`, border: `1px solid ${hotelBadge.color}44`, borderRadius: '4px', padding: '1px 5px' }}>
                {hotelBadge.label}
              </span>
            )}
            {isCurrent && !stop.checkedIn && (
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--st-color-category-food)', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
                当前站
              </span>
            )}
            {stop.rating && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                <span style={{ color: 'var(--st-color-status-soon)', fontSize: '11px' }}>★</span>
                <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.7rem', fontWeight: 700 }}>{stop.rating}</span>
              </span>
            )}
          </div>

          {/* Row 2: address */}
          {stop.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px', marginBottom: '0.4rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '11px', color: 'var(--st-color-category-food)', flexShrink: 0, marginTop: '2px' }}>location_on</span>
              <span style={{
                color: 'var(--st-color-text-muted)', fontSize: '0.71rem', lineHeight: 1.45,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {stop.address}
              </span>
            </div>
          )}

          {/* Row 3: 4 equal-width buttons, always present */}
          {(() => {
            const btnBase = {
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              borderRadius: '7px', padding: '5px 4px',
              fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 0,
            };
            return (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '5px', marginTop: '2px' }}>
                {/* ① Time */}
                <button
                  onClick={() => setShowTimePicker(true)}
                  style={{
                    ...btnBase,
                    background: stop.checkedIn ? 'rgba(34,197,94,0.1)' : stop.time ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.05)',
                    color: stop.checkedIn ? 'var(--st-color-hotel-checkin)' : stop.time ? 'var(--st-color-category-food)' : 'var(--st-color-text-muted)',
                    border: `1px solid ${stop.checkedIn ? 'rgba(34,197,94,0.3)' : stop.time ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', flexShrink: 0 }}>
                    {stop.checkedIn ? 'check_circle' : 'schedule'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stop.time ? `${stop.time}${stop.period ? ' ' + stop.period : ''}` : '--:--'}
                  </span>
                </button>

                {/* ② Expense */}
                <button
                  onClick={() => setShowExpense(true)}
                  style={{
                    ...btnBase,
                    background: price > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                    color: price > 0 ? 'var(--md-sys-color-tertiary)' : '#475569',
                    border: `1px solid ${price > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', flexShrink: 0 }}>payments</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {price > 0 ? formatCurrency(price, state.settings) : '0'}
                  </span>
                </button>

                {/* ③ Navigate — placeholder if no address */}
                {navUrl ? (
                  <a
                    href={navUrl} target="_blank" rel="noreferrer"
                    style={{
                      ...btnBase,
                      background: 'rgba(59,130,246,0.1)', color: 'var(--md-sys-color-primary)',
                      border: '1px solid rgba(59,130,246,0.25)', textDecoration: 'none',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>near_me</span>
                    导航
                  </a>
                ) : (
                  <div style={{
                    ...btnBase,
                    background: 'rgba(255,255,255,0.03)', color: '#334155',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>near_me</span>
                    导航
                  </div>
                )}

                {/* ④ Check-in — placeholder when already checked in */}
                {stop.checkedIn ? (
                  <div style={{
                    ...btnBase,
                    background: 'rgba(34,197,94,0.07)', color: 'var(--st-color-hotel-checkin)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>where_to_vote</span>
                    已打卡
                  </div>
                ) : (
                  <button
                    onClick={handleCheckin}
                    style={{
                      ...btnBase,
                      background: isCurrent ? 'var(--st-color-category-food)' : 'rgba(249,115,22,0.12)',
                      color: isCurrent ? 'white' : 'var(--st-color-category-food)',
                      border: `1px solid ${isCurrent ? 'var(--st-color-category-food)' : 'rgba(249,115,22,0.3)'}`,
                      fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>where_to_vote</span>
                    打卡
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* Thumbnail */}
        {stop.photo && (
          <div style={{ width: 56, height: 56, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--md-sys-color-outline)', opacity: stop.checkedIn ? 0.7 : 1 }}>
            <img src={stop.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* Sub-modals in portals at z-index 4500 */}
      {showTimePicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
          <TimePickerModal
            stop={stop}
            dayDate={dayDate}
            onSave={(patch) => {
              onCheckin(stop.id, { ...patch, checkedIn: stop.checkedIn, checkinTime: patch.time });
              setShowTimePicker(false);
            }}
            onClose={() => setShowTimePicker(false)}
          />
        </div>,
        document.body
      )}

      {showExpense && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
          <ExpenseModal
            stop={stop}
            onSave={(patch) => {
              onCheckin(stop.id, patch);
              setShowExpense(false);
            }}
            onClose={() => setShowExpense(false)}
          />
        </div>,
        document.body
      )}
    </>
  );
}
