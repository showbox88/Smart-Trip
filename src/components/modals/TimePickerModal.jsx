import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const ITEM_HEIGHT = 44;

function ScrollColumn({ items, selectedIdx, onSelect }) {
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const debounceRef = useRef(null);

  const REPEAT_COUNT = 100;
  const extendedItems = Array.from({ length: items.length * REPEAT_COUNT }, (_, i) => items[i % items.length]);

  useEffect(() => {
    if (scrollRef.current) {
      const centerGroup = Math.floor(REPEAT_COUNT / 2);
      const targetIdx = centerGroup * items.length + selectedIdx;
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollTop = targetIdx * ITEM_HEIGHT;
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
      }, 50);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const centerOffset = st + scrollRef.current.offsetHeight / 2;
      const idx = Math.round((centerOffset - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(extendedItems.length - 1, idx));
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSelect(clamped % items.length);
      }, 60);
    });
  };

  return (
    <div style={{ position: 'relative', height: 180, flex: 1 }}>
      {/* Selection highlight */}
      <div style={{
        position: 'absolute', top: '50%', left: 4, right: 4, height: ITEM_HEIGHT,
        transform: 'translateY(-50%)',
        background: '#007AFF', borderRadius: 12, zIndex: 0,
        boxShadow: '0 4px 14px rgba(0,122,255,0.25)',
      }} />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar"
        style={{
          height: 180, overflowY: 'auto', position: 'relative', zIndex: 2,
          scrollSnapType: 'y mandatory',
          paddingTop: (180 - ITEM_HEIGHT) / 2,
          paddingBottom: (180 - ITEM_HEIGHT) / 2,
          maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
        }}
      >
        {extendedItems.map((item, i) => {
          const isSel = selectedIdx === (i % items.length);
          return (
            <div
              key={i}
              onClick={() => {
                onSelect(i % items.length);
                if (scrollRef.current?.children[i]) {
                  scrollRef.current.children[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
              }}
              style={{
                height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700,
                color: isSel ? '#fff' : '#C7C7CC',
                cursor: 'pointer',
                transform: isSel ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.15s, color 0.15s',
                scrollSnapAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function TimePickerModal({ stop, dayDate, onSave, onClose }) {
  const { t } = useI18n();
  const [openingHours, setOpeningHours] = useState(stop.openingHours || []);
  const [loadingHours, setLoadingHours] = useState(false);
  const [closing, setClosing] = useState(false);

  const initialTime = stop.time || '10:00';
  const initialPeriod = stop.period || 'AM';
  const [h, m] = initialTime.split(':');

  const [period, setPeriod] = useState(initialPeriod);
  const [hourIdx, setHourIdx] = useState(() => {
    const idx = HOURS.indexOf(h);
    return idx >= 0 ? idx : 9;
  });
  const [minIdx, setMinIdx] = useState(() => {
    const idx = MINUTES.indexOf(m);
    return idx >= 0 ? idx : 0;
  });

  const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayWeekdayIdx = (() => {
    if (!dayDate) return -1;
    const d = new Date(dayDate);
    if (isNaN(d)) return -1;
    return (d.getDay() + 6) % 7;
  })();
  const todayName = todayWeekdayIdx >= 0 ? WEEKDAY_NAMES[todayWeekdayIdx] : '';
  const isTodayClosed = todayWeekdayIdx >= 0 && openingHours.length > 0 && /closed/i.test(openingHours[todayWeekdayIdx] || '');

  useEffect(() => {
    if ((!openingHours || openingHours.length === 0) && stop.placeId && window.googleMapsReady) {
      setLoadingHours(true);
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({ placeId: stop.placeId, fields: ['opening_hours'] }, (place, status) => {
        setLoadingHours(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place.opening_hours) {
          setOpeningHours(place.opening_hours.weekday_text || []);
        }
      });
    }
  }, [stop.placeId]);

  const animateClose = (cb) => {
    setClosing(true);
    setTimeout(() => { cb?.(); onClose(); }, 260);
  };

  const handleSave = () => {
    const timeH = HOURS[hourIdx];
    const timeM = MINUTES[minIdx];
    animateClose(() => onSave?.({ time: `${timeH}:${timeM}`, period, openingHours }));
  };

  const handlePunchIn = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const isPM = hours >= 12;
    const currentPeriod = isPM ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timeH = String(hours).padStart(2, '0');
    const timeM = String(minutes).padStart(2, '0');
    animateClose(() => onSave?.({ time: `${timeH}:${timeM}`, period: currentPeriod, openingHours }));
  };

  const hasHours = openingHours && openingHours.length > 0;

  return (
    <div
      onClick={() => animateClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2200,
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: closing ? 'tpFadeOut .25s ease forwards' : 'tpFadeIn .25s ease forwards',
      }}
    >
      <style>{`
        @keyframes tpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tpFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes tpSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes tpSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 env(safe-area-inset-bottom, 16px) 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
          animation: closing ? 'tpSlideDown .25s ease forwards' : 'tpSlideUp .3s cubic-bezier(.32,1.15,.6,1) forwards',
          maxHeight: '92vh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* ── Drag Handle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
        </div>

        {/* ── Header: Stop Name + Date ── */}
        <div style={{ padding: '4px 24px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 4, letterSpacing: 0.5 }}>
            RESERVATION
          </div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: '#1C1C1E',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stop.name || stop.location || 'Set Time'}
          </div>
          {dayDate && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93' }}>{dayDate}</span>
              {todayName && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: isTodayClosed ? '#FF3B30' : '#007AFF',
                  background: isTodayClosed ? '#FF3B3012' : '#007AFF12',
                  padding: '2px 8px', borderRadius: 6,
                }}>
                  {todayName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Closed Warning ── */}
        {isTodayClosed && (
          <div style={{
            margin: '0 20px 12px', padding: '10px 14px', borderRadius: 12,
            background: '#FFF5F5', border: '1px solid #FFE0E0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#FF3B30' }}>error</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#FF3B30' }}>
              Closed on {todayName}
            </span>
          </div>
        )}

        {/* ── AM/PM Toggle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px 12px' }}>
          <div style={{
            display: 'flex', background: '#F2F2F7', borderRadius: 10, padding: 3,
            width: 180,
          }}>
            {['AM', 'PM'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                  borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: period === p ? '#fff' : 'transparent',
                  color: period === p ? '#007AFF' : '#8E8E93',
                  boxShadow: period === p ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {t(`common.${p.toLowerCase()}`) || p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scroll Wheels ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, padding: '0 32px', marginBottom: 8,
        }}>
          <ScrollColumn items={HOURS} selectedIdx={hourIdx} onSelect={setHourIdx} />
          <div style={{
            fontSize: 28, fontWeight: 800, color: '#3C3C43', lineHeight: 1,
            paddingBottom: 2,
          }}>:</div>
          <ScrollColumn items={MINUTES} selectedIdx={minIdx} onSelect={setMinIdx} />
        </div>

        {/* ── Opening Hours (Collapsible) ── */}
        {(hasHours || loadingHours) && (
          <OpeningHoursSection
            openingHours={openingHours}
            loadingHours={loadingHours}
            todayWeekdayIdx={todayWeekdayIdx}
          />
        )}

        {/* ── Footer Actions ── */}
        <div style={{ padding: '12px 20px 16px', display: 'flex', gap: 10 }}>
          <button
            onClick={handlePunchIn}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '14px 0', border: 'none', cursor: 'pointer',
              borderRadius: 14, background: '#FFF8F0',
              border: '1px solid #FFE8CC',
              fontSize: 14, fontWeight: 600, color: '#FF9500',
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>my_location</span>
            {t('itinerary.punch_in') || 'Now'}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '14px 0', border: 'none', cursor: 'pointer',
              borderRadius: 14, background: '#007AFF',
              fontSize: 15, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 14px rgba(0,122,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {t('common.save') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}


function OpeningHoursSection({ openingHours, loadingHours, todayWeekdayIdx }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ padding: '0 20px 8px' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#F9F9F9', borderRadius: 14,
          border: '1px solid #F2F2F7', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#FF9500' }}>schedule</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>Opening Hours</span>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8E8E93' }}>
          {expanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      <div style={{
        maxHeight: expanded ? 300 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ padding: '12px 16px 4px' }}>
          {loadingHours ? (
            <div style={{ color: '#8E8E93', fontSize: 13, padding: '8px 0' }}>Loading...</div>
          ) : openingHours.map((line, i) => {
            const isClosedLine = /closed/i.test(line);
            const isToday = i === todayWeekdayIdx;
            return (
              <div key={i} style={{
                fontSize: 13, lineHeight: 1.6, fontWeight: isToday ? 700 : 400,
                color: isClosedLine ? '#FF3B30' : isToday ? '#1C1C1E' : '#8E8E93',
                padding: isToday ? '4px 10px' : '2px 0',
                background: isToday ? (isClosedLine ? '#FFF5F5' : '#F0F7FF') : 'transparent',
                borderRadius: isToday ? 8 : 0,
                marginBottom: 2,
              }}>
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
