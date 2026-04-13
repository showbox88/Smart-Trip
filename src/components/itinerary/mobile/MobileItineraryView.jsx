/**
 * MobileItineraryView
 *
 * iOS-style itinerary layout — matches the clean mobile app design.
 * Used when themeId === 'mobile_ios'.
 *
 * Layout:
 *   - Full-width hero image with gradient + title/dates
 *   - Left: vertical day selector timeline (Day 1…N + dots)
 *   - Right: stop cards (number badge, name, rating, time, price, photo)
 *   - Transport connectors between cards
 *   - Reuses all existing modals unchanged
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripEditor } from '../../../hooks/useTripEditor';
import { useTrips } from '../../../hooks/useTrips';
import { useI18n } from '../../../context/I18nContext';
import StopEditModal from '../../modals/StopEditModal';
import TripEditModal from '../../modals/TripEditModal';
import ShareModal from '../../modals/ShareModal';
import ConfirmModal from '../../modals/ConfirmModal';
import TimePickerModal from '../../modals/TimePickerModal';
import ExpenseModal from '../../modals/ExpenseModal';

// ── Helpers ────────────────────────────────────────────────

function getPriceTier(expense) {
  if (expense === null || expense === undefined) return null;
  const n = parseFloat(expense);
  if (isNaN(n) || n < 0) return null;
  if (n === 0) return 'Free';
  if (n <= 15) return '$';
  if (n <= 50) return '$$';
  if (n <= 150) return '$$$';
  return '$$$$';
}

function formatStopTime(stop) {
  if (!stop.time) return null;
  const parts = stop.time.split(':').map(Number);
  const h24 = parts[0];
  const m = parts[1] || 0;
  if (isNaN(h24)) return null;

  let period = stop.period;
  if (!period) period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const TRANSIT_ICONS = {
  WALK: 'directions_walk',
  DRIVE: 'directions_car',
  TRANSIT: 'directions_bus',
  BICYCLE: 'pedal_bike',
};
const TRANSIT_LABELS = {
  WALK: 'walk',
  DRIVE: 'drive',
  TRANSIT: 'transit',
  BICYCLE: 'bike',
};

function getTransitDisplay(transitToNext) {
  if (!transitToNext?.duration) return null;
  const mode = transitToNext.mode || 'WALK';
  const icon = TRANSIT_ICONS[mode] || 'directions_walk';
  const modeLabel = TRANSIT_LABELS[mode] || 'walk';
  return {
    icon,
    label: `${transitToNext.duration} ${modeLabel}`,
  };
}

function formatDateRange(start, end) {
  if (!start) return '';
  try {
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    const s = new Date(start.replace(/-/g, '/')).toLocaleDateString('en-US', opts);
    if (!end) return s;
    const e = new Date(end.replace(/-/g, '/')).toLocaleDateString('en-US', opts);
    return `${s} – ${e}`;
  } catch {
    return '';
  }
}

// Only render countable stops (location / activity / undefined type)
function isDisplayStop(stop) {
  return !stop.type ||
    stop.type === 'location' ||
    stop.type === 'activity';
}

// ── Main Component ─────────────────────────────────────────

export default function MobileItineraryView({ tripId }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { deleteTrip } = useTrips();

  const {
    trip,
    deleteStop,
    updateStop,
    updateStopAndSort,
    updateTripMetadata,
  } = useTripEditor(tripId);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [stopEditModal, setStopEditModal] = useState(null);   // { dayId, stop }
  const [tripEditModal, setTripEditModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);     // { message, onConfirm }
  const [timePickerModal, setTimePickerModal] = useState(null);
  const [expenseModal, setExpenseModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const days = trip?.days || [];
  const activeDay = days[activeDayIndex] ?? days[0];
  const stops = (activeDay?.stops || []).filter(isDisplayStop);

  const handleDeleteTrip = useCallback(() => {
    setMenuOpen(false);
    setConfirmModal({
      message: t('itinerary.confirm_delete_trip') || 'Delete this trip?',
      onConfirm: async () => {
        await deleteTrip(trip._realTripId || trip.id);
        navigate('/');
      },
    });
  }, [trip, deleteTrip, navigate, t]);

  const handleStopTap = useCallback((stop, dayId) => {
    setStopEditModal({ dayId, stop });
  }, []);

  if (!trip) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh',
        fontFamily: IOS_FONT,
      }}>
        <div style={{ textAlign: 'center', color: '#8E8E93' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', opacity: 0.3 }}>
            travel_explore
          </span>
          <p style={{ margin: '8px 0 0', fontSize: '15px' }}>Loading trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#F2F2F7',
      minHeight: '100vh',
      fontFamily: IOS_FONT,
      paddingBottom: '96px',
    }}>

      {/* ══ Hero ══════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
        {trip.thumb ? (
          <img
            src={trip.thumb}
            alt={trip.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #1c2d4f 0%, #2c4a7c 50%, #3a6bc2 100%)',
          }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            ...HERO_BTN_STYLE,
            top: 'env(safe-area-inset-top, 16px)',
            left: '16px',
            marginTop: '16px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', lineHeight: 1 }}>
            arrow_back
          </span>
        </button>

        {/* Menu button */}
        <div style={{ position: 'absolute', top: 'env(safe-area-inset-top, 16px)', right: '16px', marginTop: '16px' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="More options"
            style={HERO_BTN_STYLE}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', lineHeight: 1 }}>
              more_horiz
            </span>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '44px', right: 0,
              background: 'rgba(255,255,255,0.97)',
              borderRadius: '13px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              minWidth: '160px',
              zIndex: 300,
            }}>
              {[
                { icon: 'edit', label: 'Edit Trip', action: () => { setTripEditModal(true); setMenuOpen(false); } },
                { icon: 'share', label: 'Share', action: () => { setShareModal(true); setMenuOpen(false); } },
                { icon: 'delete', label: 'Delete Trip', action: handleDeleteTrip, danger: true },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '12px 16px',
                    background: 'none', border: 'none',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: item.danger ? '#FF3B30' : '#000',
                    fontFamily: IOS_FONT,
                    textAlign: 'left',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trip title + dates */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', right: '20px',
        }}>
          <h1 style={{
            margin: 0,
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            {trip.title}
          </h1>
          {(trip.startDate || trip.endDate) && (
            <p style={{
              margin: '5px 0 0',
              color: 'rgba(255,255,255,0.88)',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.1px',
            }}>
              {formatDateRange(trip.startDate, trip.endDate)}
            </p>
          )}
        </div>
      </div>

      {/* ══ Body: Day Sidebar + Stops ══════════════════════ */}
      <div style={{
        display: 'flex',
        padding: '20px 14px 0',
        gap: '10px',
        alignItems: 'flex-start',
      }}>

        {/* ── Day Selector (left) ─────────────────────── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          minWidth: '58px',
          flexShrink: 0,
          paddingTop: '8px',
        }}>
          {days.map((day, idx) => {
            const isActive = idx === activeDayIndex;
            return (
              <div key={day.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveDayIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 0',
                    width: '100%',
                  }}
                >
                  {/* Timeline dot */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isActive ? '#FF3B30' : '#C7C7CC',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                    boxShadow: isActive ? '0 0 0 3px rgba(255,59,48,0.18)' : 'none',
                  }} />
                  {/* Label */}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#000' : '#8E8E93',
                    letterSpacing: '-0.1px',
                    lineHeight: 1,
                  }}>
                    Day {idx + 1}
                  </span>
                </button>

                {/* Connector line between days */}
                {idx < days.length - 1 && (
                  <div style={{
                    width: '1px',
                    height: '36px',
                    background: '#D1D1D6',
                    marginLeft: '4px',   // align with dot center
                    alignSelf: 'flex-start',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Stop Cards (right) ──────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: '8px' }}>
          {stops.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#8E8E93',
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '44px', opacity: 0.25,
                display: 'block', marginBottom: '10px',
              }}>
                add_location_alt
              </span>
              <span style={{ fontSize: '15px' }}>No stops for this day</span>
            </div>
          ) : (
            stops.map((stop, idx) => {
              const transitDisplay = getTransitDisplay(stop.transitToNext);
              const rawExpense = stop.expense !== null && stop.expense !== undefined
                    ? stop.expense
                    : (parseFloat(stop.price) || null);
              const priceTier = getPriceTier(rawExpense);
              const timeStr = formatStopTime(stop);
              const isLast = idx === stops.length - 1;

              return (
                <div key={stop.id}>
                  {/* ── Stop Card ── */}
                  <button
                    onClick={() => handleStopTap(stop, activeDay.id)}
                    style={{
                      width: '100%',
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '14px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Number badge */}
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: '#000',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: 700,
                      flexShrink: 0,
                      lineHeight: 1,
                      letterSpacing: '-0.2px',
                    }}>
                      {idx + 1}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#000',
                        lineHeight: 1.3,
                        marginBottom: '7px',
                        letterSpacing: '-0.2px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {stop.title}
                      </div>

                      {/* Chips row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap',
                      }}>
                        {/* Star rating */}
                        {stop.rating > 0 && (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#3C3C43',
                          }}>
                            <span style={{ color: '#FF9500', fontSize: '14px', lineHeight: 1 }}>★</span>
                            {Number(stop.rating).toFixed(1)}
                          </span>
                        )}

                        {/* Time chip */}
                        {timeStr && (
                          <span style={CHIP_STYLE}>{timeStr}</span>
                        )}

                        {/* Price chip */}
                        {priceTier && (
                          <span style={{
                            ...CHIP_STYLE,
                            color: priceTier === 'Free' ? '#34C759' : '#3C3C43',
                            background: priceTier === 'Free' ? 'rgba(52,199,89,0.12)' : '#E5E5EA',
                          }}>
                            {priceTier}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Photo thumbnail */}
                    {stop.photo && (
                      <div style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        <img
                          src={stop.photo}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                  </button>

                  {/* ── Transit connector ── */}
                  {!isLast && transitDisplay && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '9px 0',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#E5E5EA',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#3C3C43',
                        letterSpacing: '-0.1px',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px', lineHeight: 1 }}>
                          {transitDisplay.icon}
                        </span>
                        {transitDisplay.label}
                      </div>
                    </div>
                  )}

                  {/* Gap between cards (no transit) */}
                  {!isLast && !transitDisplay && (
                    <div style={{ height: '10px' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══ Modals (unchanged) ════════════════════════════ */}

      {stopEditModal && (
        <StopEditModal
          stop={stopEditModal.stop}
          onSave={(patch) => {
            updateStop(stopEditModal.dayId, stopEditModal.stop.id, patch);
          }}
          onDelete={() => {
            deleteStop(stopEditModal.dayId, stopEditModal.stop.id);
          }}
          onClose={() => setStopEditModal(null)}
        />
      )}

      {tripEditModal && (
        <TripEditModal
          trip={trip}
          onSave={updateTripMetadata}
          onClose={() => setTripEditModal(false)}
        />
      )}

      {shareModal && (
        <ShareModal trip={trip} onClose={() => setShareModal(false)} />
      )}

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {timePickerModal && (
        <TimePickerModal
          stop={timePickerModal.stop}
          dayDate={timePickerModal.dayDate}
          onSave={(patch) => updateStopAndSort(timePickerModal.dayId, timePickerModal.stop.id, patch)}
          onClose={() => setTimePickerModal(null)}
        />
      )}

      {expenseModal && (
        <ExpenseModal
          stop={expenseModal.stop}
          onSave={(patch) => updateStop(expenseModal.dayId, expenseModal.stop.id, patch)}
          onDelete={() => updateStop(expenseModal.dayId, expenseModal.stop.id, { price: '0', expenseCategory: null })}
          onClose={() => setExpenseModal(null)}
        />
      )}

      {/* Backdrop to close hero menu */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

// ── Design tokens ──────────────────────────────────────────

const IOS_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

const HERO_BTN_STYLE = {
  position: 'absolute',
  background: 'rgba(0,0,0,0.32)',
  border: 'none',
  borderRadius: '50%',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 10,
};

const CHIP_STYLE = {
  background: '#E5E5EA',
  color: '#3C3C43',
  padding: '3px 9px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '-0.1px',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
};
