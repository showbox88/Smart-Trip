import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { formatDateShort } from '../../utils/formatters';
import { getCategoryMaterialIcon as getCategoryIcon } from '../../utils/categoryHelpers';
import ExpenseModal from '../modals/ExpenseModal';
import AddStopRow from './AddStopRow';
import { EditOperationsProvider } from '../../context/EditOperationsContext';

const ROW = 72;          // 每格高度（时间格 / stop 卡共用，中线对齐）
const STEP = 5;          // 时间轴粒度：5 分钟

// 生成一天的 5 分钟时间格
const TIME_SLOTS = [];
for (let m = 0; m < 1440; m += STEP) TIME_SLOTS.push(m);

const pad2 = (n) => String(n).padStart(2, '0');
// 分钟 → { time(12h), period }
function minToParts(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h % 12 || 12;
  return { time: `${pad2(dh)}:${pad2(m)}`, period };
}
const isLocationStop = (s) => !s.type || s.type === 'location' || s.type === 'hotel_checkin' || s.type === 'hotel_checkout';
const dayDateStr = (d) => String(d?.date || '').slice(0, 10);

export default function TodayScheduleModal({ trip, onUpdateStop, editOps, onClose }) {
  const { t } = useI18n();
  const [editingExpense, setEditingExpense] = useState(null);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSlot = Math.round(nowMin / STEP) * STEP;
  const todayStr = now.toISOString().slice(0, 10);

  // 全部行程天（日期条覆盖每一天，空天也能加地点）
  const days = trip?.days || [];

  const initialDayId = (() => {
    const todayDay = days.find(d => dayDateStr(d) === todayStr);
    return (todayDay || days[0])?.id || null;
  })();

  const [selDayId, setSelDayId] = useState(initialDayId);
  const [selStopIdx, setSelStopIdx] = useState(0);
  const [selMin, setSelMin] = useState(nowSlot);

  // 手机：底部抽屉 + 更矮的滚筒（3 格）；桌面：居中卡片（4 格）
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 520px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 520px)');
    const h = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  // 滚筒高度：手机满屏时 flex 填充剩余空间，用 ResizeObserver 实测；桌面固定 4 格
  const pickerRef = useRef(null);
  const [drumH, setDrumH] = useState(ROW * 4);
  const PAD = (drumH - ROW) / 2;

  const timeRef = useRef(null);
  const stopRef = useRef(null);
  const timeTimer = useRef(null);
  const stopTimer = useRef(null);
  const dayStripRef = useRef(null);

  // 桌面端：日期条用鼠标滚轮横向滚动（手机/触控板横滑仍走原生）
  const onDayStripWheel = useCallback((e) => {
    const el = dayStripRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  }, []);

  const selDay = days.find(d => d.id === selDayId) || days[0] || null;
  const stops = selDay ? (selDay.stops || []).filter(isLocationStop) : [];
  const selDayIsToday = dayDateStr(selDay) === todayStr;
  const centeredStop = stops[selStopIdx] || null;

  // 时间轴停在“现在”那一格 && 选中天是今天 → 打卡取精确到分钟的当前时间
  const atNow = selDayIsToday && selMin === nowSlot;
  const checkinLabel = atNow
    ? `${pad2(now.getHours() % 12 || 12)}:${pad2(now.getMinutes())} ${now.getHours() >= 12 ? 'PM' : 'AM'}`
    : (() => { const p = minToParts(selMin); return `${p.time} ${p.period}`; })();

  const hasStops = stops.length > 0;

  // 打开 / 换天：stop 滚筒回顶、时间轴对准“现在”（滚筒挂载后才生效）
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (stopRef.current) stopRef.current.scrollTop = 0;
      if (timeRef.current) timeRef.current.scrollTop = (nowSlot / STEP) * ROW;
    });
    setSelStopIdx(0);
    setSelMin(nowSlot);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDayId, hasStops]);

  // 实测滚筒容器高度（手机满屏时随可用空间变化）
  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height || 0;
      if (h > 0) setDrumH(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasStops, isNarrow]);

  // 选中天变化时，把它滚到日期条可见区域中间（点到被截断的天也顺手）
  useEffect(() => {
    const el = dayStripRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const btn = el.querySelector('[data-active="true"]');
      if (btn) btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [selDayId]);

  const onTimeScroll = useCallback(() => {
    clearTimeout(timeTimer.current);
    timeTimer.current = setTimeout(() => {
      const idx = Math.round((timeRef.current?.scrollTop || 0) / ROW);
      setSelMin(TIME_SLOTS[Math.max(0, Math.min(TIME_SLOTS.length - 1, idx))]);
    }, 90);
  }, []);

  const onStopScroll = useCallback(() => {
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      const idx = Math.round((stopRef.current?.scrollTop || 0) / ROW);
      setSelStopIdx(Math.max(0, Math.min(stops.length - 1, idx)));
    }, 90);
  }, [stops.length]);

  const doCheckIn = () => {
    if (!centeredStop || !selDay) return;
    let time, period;
    if (atNow) {
      const h = now.getHours(), m = now.getMinutes();
      period = h >= 12 ? 'PM' : 'AM';
      time = `${pad2(h % 12 || 12)}:${pad2(m)}`;
    } else {
      const p = minToParts(selMin); time = p.time; period = p.period;
    }
    onUpdateStop(selDay.id, centeredStop.id, { checkedIn: true, time, period, checkinTime: time, skipped: false });
  };
  const undoCheckIn = () => centeredStop && selDay && onUpdateStop(selDay.id, centeredStop.id, { checkedIn: false, checkinTime: undefined });
  const setSkip = (skipped) => centeredStop && selDay && onUpdateStop(selDay.id, centeredStop.id, { skipped, ...(skipped ? { checkedIn: false, checkinTime: undefined } : {}) });

  const navUrl = centeredStop?.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(centeredStop.address)}${centeredStop.placeId ? `&destination_place_id=${centeredStop.placeId}` : ''}`
    : null;

  const fadeMask = 'linear-gradient(to bottom, transparent, #000 24%, #000 76%, transparent)';

  return [createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: isNarrow ? 'stretch' : 'center', justifyContent: 'center',
        padding: isNarrow ? 0 : '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: isNarrow ? '100%' : '440px',
          height: isNarrow ? '100%' : 'auto',
          maxHeight: isNarrow ? '100%' : 'calc(100vh - 2rem)',
          background: 'var(--md-sys-color-surface)',
          border: isNarrow ? 'none' : '1px solid var(--md-sys-color-outline)',
          borderRadius: isNarrow ? '0' : '20px',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          paddingBottom: isNarrow ? 'env(safe-area-inset-bottom, 0px)' : 0,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--md-sys-color-outline)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--md-sys-color-primary)', fontSize: '20px' }}>route</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {trip?.title || (t('itinerary.today_schedule') || '今日行程表')}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
          </button>
        </div>

        {/* Day strip — 始终显示，覆盖全部行程天 */}
        {days.length >= 1 && (
          <div ref={dayStripRef} onWheel={onDayStripWheel} style={{ display: 'flex', gap: '0.4rem', padding: '0.6rem 1.1rem', overflowX: 'auto', scrollbarWidth: 'none', borderBottom: '1px solid var(--md-sys-color-outline)', flexShrink: 0 }}>
            {days.map((d) => {
              const idx = (trip?.days || []).findIndex(x => x.id === d.id);
              const active = d.id === selDay?.id;
              const isToday = dayDateStr(d) === todayStr;
              return (
                <button
                  key={d.id}
                  data-active={active ? 'true' : undefined}
                  onClick={() => setSelDayId(d.id)}
                  style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                    padding: '5px 11px', borderRadius: '10px', cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
                    background: active ? 'var(--md-sys-color-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Day {idx + 1}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.85 }}>{isToday ? (t('itinerary.today') || '今天') : formatDateShort(d.date)}</span>
                </button>
              );
            })}
          </div>
        )}

        {stops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--st-color-text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '8px', opacity: 0.3 }}>event_busy</span>
            <div style={{ fontSize: '0.88rem' }}>{t('itinerary.no_stops_today') || '这天还没有地点'}</div>
          </div>
        ) : (
          <>
            {/* Column labels */}
            <div style={{ display: 'flex', gap: '10px', padding: '0.5rem 1.1rem 0', flexShrink: 0 }}>
              <span style={{ width: '84px', textAlign: 'center', fontSize: '0.66rem', color: 'var(--st-color-text-muted)' }}>{t('itinerary.time') || '时间'}</span>
              <span style={{ flex: 1, fontSize: '0.66rem', color: 'var(--st-color-text-muted)' }}>{t('itinerary.place') || '地点'}</span>
            </div>

            {/* Dual drum picker */}
            <div ref={pickerRef} style={{ position: 'relative', flex: isNarrow ? '1 1 auto' : '0 0 auto', height: isNarrow ? 'auto' : `${ROW * 4}px`, minHeight: isNarrow ? 0 : undefined, display: 'flex', gap: '10px', padding: '0 1.1rem' }}>
              {/* Center selection band */}
              <div style={{
                position: 'absolute', left: '1.1rem', right: '1.1rem', top: '50%', transform: 'translateY(-50%)',
                height: `${ROW}px`, borderTop: '1px solid rgba(91,155,255,0.5)', borderBottom: '1px solid rgba(91,155,255,0.5)',
                background: 'rgba(91,155,255,0.06)', borderRadius: '10px', pointerEvents: 'none', zIndex: 3,
              }} />

              {/* Time drum */}
              <div
                ref={timeRef}
                onScroll={onTimeScroll}
                style={{
                  width: '84px', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
                  WebkitMaskImage: fadeMask, maskImage: fadeMask,
                }}
              >
                <div style={{ height: `${PAD}px` }} />
                {TIME_SLOTS.map((m) => {
                  const p = minToParts(m);
                  const isNowSlot = selDayIsToday && m === nowSlot;
                  const quarter = m % 15 === 0;
                  return (
                    <div key={m} style={{
                      height: `${ROW}px`, scrollSnapAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontSize: quarter ? '1.05rem' : '0.9rem',
                        fontWeight: quarter ? 700 : 500,
                        fontVariantNumeric: 'tabular-nums',
                        color: quarter ? 'var(--md-sys-color-on-surface)' : 'var(--st-color-text-muted)',
                      }}>{p.time}</span>
                      {isNowSlot && <span style={{ fontSize: '0.55rem', color: 'var(--st-color-category-food)', letterSpacing: '1px', marginTop: '1px' }}>{t('itinerary.now') || '现在'}</span>}
                    </div>
                  );
                })}
                <div style={{ height: `${PAD}px` }} />
              </div>

              {/* Stop drum */}
              <div
                ref={stopRef}
                onScroll={onStopScroll}
                style={{
                  flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none',
                  WebkitMaskImage: fadeMask, maskImage: fadeMask,
                }}
              >
                <div style={{ height: `${PAD}px` }} />
                {stops.map((stop) => {
                  const checkedIn = !!stop.checkedIn;
                  const skipped = !!stop.skipped;
                  const price = parseFloat(stop.price) || 0;
                  return (
                    <div key={stop.id} style={{
                      height: `${ROW}px`, scrollSnapAlign: 'center',
                      display: 'flex', alignItems: 'center', gap: '9px', padding: '0 4px',
                      opacity: skipped ? 0.5 : 1,
                    }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                        background: stop.photo ? `url(${stop.photo}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${checkedIn ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-outline)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {!stop.photo && (
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: checkedIn ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-primary)', fontVariationSettings: "'FILL' 1" }}>
                            {getCategoryIcon(stop)}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', textDecoration: skipped ? 'line-through' : 'none' }}>
                            {stop.location || stop.name || 'Unnamed stop'}
                          </span>
                          {checkedIn && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', fontWeight: 700, color: 'var(--st-color-hotel-checkin)', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '4px', padding: '0 5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '10px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              {stop.checkinTime || (t('itinerary.checked_in') || '已打卡')}
                            </span>
                          )}
                          {skipped && !checkedIn && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--st-color-text-muted)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '4px', padding: '0 5px' }}>
                              {t('itinerary.skipped') || '已跳过'}
                            </span>
                          )}
                          {price > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', fontWeight: 700, color: 'var(--md-sys-color-tertiary)', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', borderRadius: '4px', padding: '0 5px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>payments</span>
                              {stop.price}
                            </span>
                          )}
                        </div>
                        {stop.address && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--st-color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px', verticalAlign: '-1px', color: 'var(--st-color-category-food)' }}>location_on</span> {stop.address}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height: `${PAD}px` }} />
              </div>
            </div>

            {/* Contextual action bar */}
            <div style={{ padding: '0.75rem 1.1rem 0.4rem', borderTop: '1px solid var(--md-sys-color-outline)', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              {centeredStop && !centeredStop.checkedIn && !centeredStop.skipped && (
                <>
                  <button onClick={doCheckIn} style={btnStyle('#fff', 'var(--st-color-hotel-checkin)', true)}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>where_to_vote</span>
                    {`${checkinLabel} ${t('itinerary.check_in') || '打卡'}`}
                  </button>
                  <button onClick={() => setSkip(true)} style={btnStyle('var(--st-color-text-muted)')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                    {t('itinerary.mark_skipped') || '不去'}
                  </button>
                </>
              )}
              {centeredStop && centeredStop.checkedIn && (
                <>
                  <button onClick={undoCheckIn} style={btnStyle('var(--st-color-text-muted)')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>undo</span>
                    {t('itinerary.undo_checkin') || '撤销打卡'}
                  </button>
                  <button onClick={() => setEditingExpense({ stop: centeredStop, dayId: selDay.id })} style={btnStyle('var(--md-sys-color-tertiary)')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>
                    {t('itinerary.edit_expense') || '改消费'}
                  </button>
                </>
              )}
              {centeredStop && centeredStop.skipped && (
                <button onClick={() => setSkip(false)} style={btnStyle('var(--md-sys-color-primary)')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
                  {t('itinerary.restore') || '恢复'}
                </button>
              )}
              {navUrl && (
                <a href={navUrl} target="_blank" rel="noreferrer" style={{ ...btnStyle('var(--md-sys-color-primary)'), flex: '0 0 auto', textDecoration: 'none' }} title={t('itinerary.navigate') || 'Navigate'}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>near_me</span>
                </a>
              )}
            </div>
          </>
        )}

        {/* Add stop — 始终可加（空的那天也能加地点） */}
        {editOps && selDay && (
          <div style={{ padding: '0.5rem 1.1rem 1rem', flexShrink: 0 }}>
            <EditOperationsProvider value={editOps}>
              <AddStopRow dayId={selDay.id} />
            </EditOperationsProvider>
          </div>
        )}
      </div>
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

function btnStyle(color, solidBg, solid) {
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
    padding: '10px', borderRadius: '12px', cursor: 'pointer',
    background: solid ? solidBg : 'transparent',
    color: solid ? color : color,
    border: `1px solid ${solid ? solidBg : 'var(--md-sys-color-outline)'}`,
    fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
  };
}
