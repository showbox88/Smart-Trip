import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
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
  const key = (stop.category || stop.categoryIcon || '').toLowerCase();
  for (const [keywords, icon] of CATEGORY_ICON_MAP) {
    if (keywords.some(k => key.includes(k))) return icon;
  }
  return 'place';
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate.replace(/-/g, '/'));
  const e = new Date(endDate.replace(/-/g, '/'));
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(0, Math.round((e - s) / 86400000) + 1);
}

function Chip({ bg, color, border, icon, label, onClick, title }) {
  return (
    <span
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: bg, color, border: `1px solid ${border}`,
        borderRadius: '6px', padding: '2px 7px',
        fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'opacity 0.15s' : undefined,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.opacity = '1'; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{icon}</span>
      {label}
    </span>
  );
}

export default function TodayScheduleModal({ trip, onUpdateStop, onClose }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [editingTime, setEditingTime] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const dayCount = calculateDays(trip?.startDate, trip?.endDate);

  const isLocationStop = (s) => !s.type || s.type === 'location' || s.type === 'hotel_checkin' || s.type === 'hotel_checkout';

  const days = (trip?.days || []).filter(day =>
    (day.stops || []).some(isLocationStop)
  );

  return [createPortal(
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '2rem 1rem',
        }}
        onClick={onClose}
      >
        <div
          style={{ width: '100%', maxWidth: '720px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Sticky header ── */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '0.75rem 1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderRadius: '16px 16px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: '20px' }}>travel_explore</span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                {t('itinerary.today_schedule') || '今日行程表'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
            </button>
          </div>

          {/* ── Content ── */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '0 0 16px 16px',
            padding: '0 1.5rem 1.5rem',
          }}>
            {/* Trip header card */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '1.25rem',
              margin: '1.25rem 0 1.5rem',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0,
                background: trip?.thumb ? `url(${trip.thumb}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!trip?.thumb && <span className="material-symbols-outlined" style={{ opacity: 0.2 }}>image</span>}
              </div>
              <div>
                <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
                  {trip?.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(trip?.startDate || trip?.endDate) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatDateShort(trip.startDate)}{trip.endDate ? ` — ${formatDateShort(trip.endDate)}` : ''}
                    </span>
                  )}
                  {dayCount > 0 && (
                    <span style={{
                      background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
                      borderRadius: '6px', padding: '1px 8px', fontSize: '0.8rem', color: 'var(--text-muted)',
                    }}>
                      {dayCount} days
                    </span>
                  )}
                </div>
              </div>
            </div>

            {days.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '8px', opacity: 0.3 }}>event_busy</span>
                <div style={{ fontSize: '0.88rem' }}>暂无行程</div>
              </div>
            )}

            {days.map((day, _i) => {
              const tripDayIndex = (trip?.days || []).findIndex(d => d.id === day.id);
              const stops = (day.stops || []).filter(isLocationStop);
              if (!stops.length) return null;

              return (
                <div key={day.id} style={{ marginBottom: '1.5rem' }}>
                  {/* Day header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    marginBottom: '0.75rem', padding: '0.6rem 1rem',
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    borderRadius: '10px',
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: day.color || 'var(--accent-primary)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Day {tripDayIndex + 1}
                    </span>
                    {day.date && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        — {formatDateShort(day.date)}
                      </span>
                    )}
                    {day.title && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        · {day.title}
                      </span>
                    )}
                  </div>

                  {/* Stop cards */}
                  {stops.map((stop, stopIdx) => {
                    const price = parseFloat(stop.price) || 0;
                    const hotelBadge =
                      stop.type === 'hotel_checkin' ? { label: 'Check-in', color: '#22c55e' } :
                      stop.type === 'hotel_checkout' ? { label: 'Check-out', color: '#f59e0b' } : null;
                    const navUrl = stop.address
                      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}${stop.placeId ? `&destination_place_id=${stop.placeId}` : ''}`
                      : null;

                    return (
                      <div
                        key={stop.id || stopIdx}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '12px',
                          padding: '0.75rem 0.85rem',
                          marginBottom: '0.45rem',
                          display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                        }}
                      >
                        {/* Left: text content */}
                        <div style={{ flex: 1, minWidth: 0 }}>

                          {/* Row 1: icon + name + badge + rating */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                            <span className="material-symbols-outlined" style={{
                              fontSize: '14px', color: 'var(--accent-primary)',
                              fontVariationSettings: "'FILL' 1", flexShrink: 0, lineHeight: 1,
                            }}>
                              {getCategoryIcon(stop)}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3, color: 'var(--text-primary)' }}>
                              {stop.location || stop.name || 'Unnamed stop'}
                            </span>
                            {hotelBadge && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: hotelBadge.color, background: `${hotelBadge.color}22`, border: `1px solid ${hotelBadge.color}44`, borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>
                                {hotelBadge.label}
                              </span>
                            )}
                            {stop.rating && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                <span style={{ color: '#f59e0b', fontSize: '11px', lineHeight: 1 }}>★</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700 }}>{stop.rating}</span>
                              </span>
                            )}
                          </div>

                          {/* Row 2: address */}
                          {stop.address && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '3px', marginBottom: '0.35rem' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#f97316', flexShrink: 0, marginTop: '2px' }}>location_on</span>
                              <span style={{
                                color: 'var(--text-muted)', fontSize: '0.71rem', lineHeight: 1.45,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}>
                                {stop.address}
                              </span>
                            </div>
                          )}

                          {/* Row 3: chips */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {/* Time chip — clickable */}
                            <Chip
                              bg={stop.time ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.05)'}
                              color={stop.time ? '#f97316' : '#64748b'}
                              border={stop.time ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.08)'}
                              icon="schedule"
                              label={stop.time ? `${stop.time}${stop.period ? ` ${stop.period}` : ''}` : '--:--'}
                              onClick={() => setEditingTime({ stop, dayId: day.id, dayDate: day.date })}
                              title="点击修改时间 / Check In"
                            />

                            {/* Expense chip — always shown */}
                            <Chip
                              bg={price > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)'}
                              color={price > 0 ? '#10b981' : '#475569'}
                              border={price > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}
                              icon="payments"
                              label={price > 0 ? String(stop.price) : '0'}
                              onClick={() => setEditingExpense({ stop, dayId: day.id })}
                              title="点击修改消费"
                            />

                            {/* Navigate */}
                            {navUrl && (
                              <a
                                href={navUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  borderRadius: '6px', padding: '2px 7px',
                                  fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>near_me</span>
                                Navigate
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Right: thumbnail */}
                        {stop.photo && (
                          <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                            <img src={stop.photo} alt={stop.location || stop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </>,
    document.body
  ),

  // Sub-modals rendered in separate portals at z-index 4500 (above main modal at 3000)
  editingTime && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
      <TimePickerModal
        stop={editingTime.stop}
        dayDate={editingTime.dayDate}
        onSave={(patch) => {
          onUpdateStop(editingTime.dayId, editingTime.stop.id, patch);
          setEditingTime(null);
        }}
        onClose={() => setEditingTime(null)}
      />
    </div>,
    document.body
  ),

  editingExpense && createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
      <ExpenseModal
        stop={editingExpense.stop}
        onSave={(patch) => {
          onUpdateStop(editingExpense.dayId, editingExpense.stop.id, patch);
          setEditingExpense(null);
        }}
        onClose={() => setEditingExpense(null)}
      />
    </div>,
    document.body
  ),
];
}
