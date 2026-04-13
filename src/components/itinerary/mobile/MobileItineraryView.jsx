/**
 * MobileItineraryView — iOS-style itinerary layout
 *
 * Reference layout:
 *   - Hero image at top
 *   - Light grey body background
 *   - Active day + its stops fused in ONE white rounded card
 *   - Inactive days listed below on grey bg, separated by gray divider lines
 *   - Between stop cards: gray horizontal line with transit pill centered
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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

/* ── helpers ─────────────────────────────────────────────── */

function stopName(s) { return s.location || s.title || s.address || ''; }

function priceTier(stop) {
  const v = stop.expense != null ? parseFloat(stop.expense) : parseFloat(stop.price || 0);
  if (isNaN(v) || v < 0) return null;
  if (v === 0) return 'Free';
  if (v <= 15) return '$';
  if (v <= 50) return '$$';
  if (v <= 150) return '$$$';
  return '$$$$';
}

function fmtTime(stop) {
  if (!stop.time) return null;
  const [hS, mS] = stop.time.split(':');
  const h24 = parseInt(hS, 10), m = parseInt(mS, 10) || 0;
  if (isNaN(h24)) return null;
  const p = stop.period || (h24 >= 12 ? 'PM' : 'AM');
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${p}`;
}

function fmtDuration(sec) {
  const n = typeof sec === 'string' ? parseInt(sec, 10) : sec;
  if (!n || isNaN(n)) return null;
  const h = Math.floor(n / 3600);
  const m = Math.max(1, Math.round((n % 3600) / 60));
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

const T_ICON = { WALK: 'directions_walk', DRIVE: 'directions_car', TRANSIT: 'directions_bus', BICYCLE: 'pedal_bike' };
const T_WORD = { WALK: 'walk', DRIVE: 'taxi', TRANSIT: 'transit', BICYCLE: 'bike' };

function transitPill(t) {
  if (!t) return null;
  const mode = (t.mode || 'WALK').toUpperCase();
  const dur = fmtDuration(t.duration);
  if (!dur) return null;
  return { icon: T_ICON[mode] || 'directions_walk', text: `${dur} ${T_WORD[mode] || 'walk'}` };
}

function fmtRange(s, e) {
  try {
    const o = { month: 'short', day: 'numeric', year: 'numeric' };
    const a = new Date(s.replace(/-/g, '/')).toLocaleDateString('en-US', o);
    if (!e) return a;
    return `${a} – ${new Date(e.replace(/-/g, '/')).toLocaleDateString('en-US', o)}`;
  } catch { return ''; }
}

function isVisible(s) { return !s.type || s.type === 'location' || s.type === 'activity'; }

/* ── component ───────────────────────────────────────────── */

export default function MobileItineraryView({ tripId }) {
  const nav = useNavigate();
  const { t } = useI18n();
  const { deleteTrip } = useTrips();
  const { trip, deleteStop, updateStop, updateStopAndSort, updateTripMetadata } = useTripEditor(tripId);

  const [dayIdx, setDayIdx]       = useState(0);
  const [editStop, setEditStop]   = useState(null);
  const [editTrip, setEditTrip]   = useState(false);
  const [share, setShare]         = useState(false);
  const [confirm, setConfirm]     = useState(null);
  const [timePick, setTimePick]   = useState(null);
  const [expense, setExpense]     = useState(null);
  const [menu, setMenu]           = useState(false);
  const dayRefs = useRef([]);

  const days  = trip?.days || [];
  const day   = days[dayIdx] ?? days[0];
  const stops = (day?.stops || []).filter(isVisible);

  const DAY_ROW_H = 46;
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(null);
  const baseShift = dayIdx * DAY_ROW_H;

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current == null) return;
    const delta = touchStartY.current - e.touches[0].clientY;
    const maxShift = (days.length - 1) * DAY_ROW_H;
    const clamped = Math.max(-baseShift, Math.min(maxShift - baseShift, delta));
    setDragOffset(clamped);
  }, [baseShift, days.length]);

  const onTouchEnd = useCallback(() => {
    // Snap to nearest day
    const totalShift = baseShift + dragOffset;
    const nearest = Math.round(totalShift / DAY_ROW_H);
    const clamped = Math.max(0, Math.min(days.length - 1, nearest));
    setDragOffset(0);
    touchStartY.current = null;
    if (clamped !== dayIdx) setDayIdx(clamped);
  }, [baseShift, dragOffset, days.length, dayIdx]);

  const totalShift = baseShift + dragOffset;

  const doDelete = useCallback(() => {
    setMenu(false);
    setConfirm({
      message: t('itinerary.confirm_delete_trip') || 'Delete this trip?',
      onConfirm: async () => { await deleteTrip(trip._realTripId || trip.id); nav('/'); },
    });
  }, [trip, deleteTrip, nav, t]);

  if (!trip) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: FONT }}>
      <div style={{ textAlign: 'center', color: '#8E8E93' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: .3 }}>travel_explore</span>
        <p style={{ marginTop: 8, fontSize: 15 }}>Loading trip…</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#F2F2F7', height: '100vh', fontFamily: FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ════ HERO (fixed at top) ════ */}
      <div style={{ position: 'relative', height: 260, flexShrink: 0, overflow: 'hidden' }}>
        {trip.thumb
          ? <img src={trip.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1c2d4f,#2c4a7c,#3a6bc2)' }} />}
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.12) 55%, transparent 100%)' }} />

        <button onClick={() => nav(-1)} style={{ ...HBTN, top: 16, left: 16 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
          <button onClick={() => setMenu(v => !v)} style={HBTN}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_horiz</span>
          </button>
          {menu && (
            <div style={{ position: 'absolute', top: 44, right: 0, background: 'rgba(255,255,255,.97)',
              borderRadius: 13, boxShadow: '0 8px 24px rgba(0,0,0,.18)', overflow: 'hidden', minWidth: 160, zIndex: 300 }}>
              {[
                { ic: 'edit', lb: 'Edit Trip', fn: () => { setEditTrip(true); setMenu(false); } },
                { ic: 'share', lb: 'Share', fn: () => { setShare(true); setMenu(false); } },
                { ic: 'delete', lb: 'Delete', fn: doDelete, danger: true },
              ].map(i => (
                <button key={i.lb} onClick={i.fn} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,.06)',
                  cursor: 'pointer', fontSize: 15, color: i.danger ? '#FF3B30' : '#000', fontFamily: FONT, textAlign: 'left',
                }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{i.ic}</span>{i.lb}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,.4)', letterSpacing: '-.3px' }}>{trip.title}</h1>
          {(trip.startDate || trip.endDate) &&
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.85)', fontSize: 14 }}>
              {fmtRange(trip.startDate, trip.endDate)}</p>}
        </div>
      </div>

      {/* ════ SCROLLABLE CONTENT AREA ════ */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'relative', zIndex: 2,
        paddingBottom: 96,
      }}>
      {/* ════ TWO-COLUMN BODY ════ */}
      <div style={{
        display: 'flex', gap: 0, padding: '16px 12px 0',
        alignItems: 'flex-start',
      }}>

        {/* ── LEFT: Day nav — clip + translateY + touch drag ── */}
        <div style={{
          width: 72, flexShrink: 0, overflow: 'hidden',
          position: 'relative',
        }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div style={{
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            transform: `translateY(-${totalShift}px)`,
            transition: dragOffset !== 0 ? 'none' : 'transform .3s ease',
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
              return (
                <div key={d.id} style={{
                  position: 'relative',
                  zIndex: active ? 2 : 1,
                  height: DAY_ROW_H,
                  boxSizing: 'border-box',
                }}>
                  <button onClick={() => setDayIdx(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0 0 0 6px', border: 'none', cursor: 'pointer',
                    background: active ? '#fff' : 'transparent',
                    borderRadius: active ? '16px 0 0 16px' : 0,
                    width: '100%', height: '100%',
                    transition: 'background .15s',
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

        {/* ── RIGHT: Stops card — always at the top ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: '#fff',
            borderRadius: '0 16px 16px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            overflow: 'hidden',
            minHeight: 120,
          }}>
            <div style={{ padding: '10px 8px 14px' }}>
              {stops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: '#8E8E93' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: .25, display: 'block', marginBottom: 8 }}>
                    add_location_alt</span>
                  <span style={{ fontSize: 14 }}>No stops for this day</span>
                </div>
              ) : stops.map((stop, idx) => {
                const nm = stopName(stop);
                const tr = transitPill(stop.transitToNext);
                const pr = priceTier(stop);
                const tm = fmtTime(stop);
                const last = idx === stops.length - 1;

                return (
                  <div key={stop.id}>
                    {/* Stop card */}
                    <button onClick={() => setEditStop({ dayId: day.id, stop })} style={{
                      width: '100%', background: '#fff', borderRadius: 12, padding: '8px 6px',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      boxShadow: '0 2px 6px rgba(0,0,0,.12), 0 1px 10px rgba(0,0,0,.06)',
                    }}>
                      {/* badge */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#1C1C1E', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2,
                      }}>{idx + 1}</div>
                      {/* info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600, color: '#000', lineHeight: 1.3,
                          marginBottom: 4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{nm}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          {stop.rating > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 500, color: '#3C3C43' }}>
                              <span style={{ color: '#FF3B30', fontSize: 12 }}>★</span>
                              {Number(stop.rating).toFixed(1)}
                            </span>
                          )}
                          {tm && <span style={CHIP}>{tm}</span>}
                          {pr && <span style={CHIP}>{pr}</span>}
                        </div>
                      </div>
                      {/* photo */}
                      {stop.photo && (
                        <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={stop.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                    </button>

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
              })}
            </div>
          </div>
        </div>
      </div>
      </div>{/* end clip wrapper */}

      {/* ════ MODALS ════ */}
      {editStop && <StopEditModal stop={editStop.stop}
        onSave={p => updateStop(editStop.dayId, editStop.stop.id, p)}
        onDelete={() => deleteStop(editStop.dayId, editStop.stop.id)}
        onClose={() => setEditStop(null)} />}
      {editTrip && <TripEditModal trip={trip} onSave={updateTripMetadata} onClose={() => setEditTrip(false)} />}
      {share && <ShareModal trip={trip} onClose={() => setShare(false)} />}
      {confirm && <ConfirmModal message={confirm.message}
        onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)} />}
      {timePick && <TimePickerModal stop={timePick.stop} dayDate={timePick.dayDate}
        onSave={p => updateStopAndSort(timePick.dayId, timePick.stop.id, p)}
        onClose={() => setTimePick(null)} />}
      {expense && <ExpenseModal stop={expense.stop}
        onSave={p => updateStop(expense.dayId, expense.stop.id, p)}
        onDelete={() => updateStop(expense.dayId, expense.stop.id, { price: '0', expenseCategory: null })}
        onClose={() => setExpense(null)} />}
      {menu && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setMenu(false)} />}
    </div>
  );
}

/* ── tokens ───────────────────────────────────────────────── */

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

const HBTN = {
  position: 'absolute', background: 'rgba(0,0,0,.3)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10,
};

const CHIP = {
  background: '#E8E8ED', color: '#3C3C43',
  padding: '2px 8px', borderRadius: 20,
  fontSize: 11, fontWeight: 500, lineHeight: '16px', whiteSpace: 'nowrap',
};

const PILL = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 12px', borderRadius: 20,
  fontSize: 12, fontWeight: 500, color: '#3C3C43', whiteSpace: 'nowrap',
  margin: '0 8px',
};
