import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

const TIMES = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hh = h % 12 || 12;
    const mm = String(m).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    TIMES.push({ h: String(hh).padStart(2, '0'), m: mm, p: period });
  }
}

const ITEM_HEIGHT = 40;
const PADDING_TOP = 55;

export default function TimePickerModal({ stop, dayDate, onSave, onClose }) {
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const debounceRef = useRef(null);
  const [openingHours, setOpeningHours] = useState(stop.openingHours || []);
  const [loadingHours, setLoadingHours] = useState(false);

  const initialTime = stop.time || '10:00';
  const initialPeriod = stop.period || 'AM';
  const [h, m] = initialTime.split(':');

  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = TIMES.findIndex(t => t.h === h && t.m === m && t.p === initialPeriod);
    return idx >= 0 ? idx : 20;
  });

  // Determine which weekday this stop falls on (for "Closed" detection)
  const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayWeekdayIdx = (() => {
    if (!dayDate) return -1;
    const d = new Date(dayDate);
    if (isNaN(d)) return -1;
    return (d.getDay() + 6) % 7; // Convert JS 0=Sun → 0=Mon...6=Sun
  })();
  const todayName = todayWeekdayIdx >= 0 ? WEEKDAY_NAMES[todayWeekdayIdx] : '';
  const isTodayClosed = todayWeekdayIdx >= 0 && openingHours.length > 0 && /closed/i.test(openingHours[todayWeekdayIdx] || '');

  useEffect(() => {
    if ((!openingHours || openingHours.length === 0) && stop.placeId && window.googleMapsReady) {
      setLoadingHours(true);
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({
        placeId: stop.placeId,
        fields: ['opening_hours']
      }, (place, status) => {
        setLoadingHours(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place.opening_hours) {
          const hours = place.opening_hours.weekday_text || [];
          setOpeningHours(hours);
        }
      });
    }
  }, [stop.placeId]);

  useEffect(() => {
    if (scrollRef.current && selectedIdx >= 0) {
      const el = scrollRef.current.children[selectedIdx];
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
    };
  }, []);

  // O(1) scroll handler: compute center item from scrollTop math, throttle with rAF, debounce state update
  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const centerOffset = st + scrollRef.current.offsetHeight / 2 - PADDING_TOP;
      const idx = Math.round((centerOffset - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(TIMES.length - 1, idx));

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setSelectedIdx(clamped), 60);
    });
  };

  const handleSave = () => {
    const time = TIMES[selectedIdx];
    onSave?.({ time: `${time.h}:${time.m}`, period: time.p, openingHours });
    onClose();
  };

  return (
    <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div 
        className="modal-content time-picker-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '680px', 
          background: '#0a0c11', 
          borderRadius: '32px', 
          padding: '2.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>

        {dayDate && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '1rem',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{ color: 'white', fontSize: '1rem', fontWeight: 800 }}>{dayDate}</span>
            {todayName && (
              <span style={{ 
                background: 'rgba(249,115,22,0.15)', 
                color: '#f97316', 
                padding: '2px 10px', 
                borderRadius: '6px', 
                fontSize: '0.8rem', 
                fontWeight: 800 
              }}>
                {todayName}
              </span>
            )}
          </div>
        )}

        {/* Closed-day warning */}
        {isTodayClosed && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '16px', padding: '12px 18px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', animation: 'pulse-border 2s ease-in-out infinite' }}>
            <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: '20px', flexShrink: 0 }}>error</span>
            <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}>
              {todayName} Closed
            </span>
          </div>
        )}

        <div className="time-picker-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '2rem', marginBottom: '1.5rem', minHeight: '340px' }}>
          {/* Left: Opening Hours */}
          <div className="time-picker-hours" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '1.5rem', border: isTodayClosed ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316', marginBottom: '1rem', fontWeight: 800, fontSize: '0.9rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
              Opening Hours
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHours ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading hours...</div>
              ) : (openingHours && openingHours.length > 0) ? (
                openingHours.map((line, i) => {
                  const isClosedLine = /closed/i.test(line);
                  const isToday = i === todayWeekdayIdx;
                  return (
                    <div key={i} style={{
                      fontSize: '0.85rem',
                      color: isClosedLine ? '#ef4444' : isToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      fontWeight: isToday ? 700 : 400,
                      borderLeft: isToday ? `3px solid ${isClosedLine ? '#ef4444' : '#f97316'}` : 'none',
                      paddingLeft: isToday ? '10px' : 0,
                      background: isToday && isClosedLine ? 'rgba(239,68,68,0.08)' : 'transparent',
                      borderRadius: isToday ? '4px' : 0,
                      padding: isToday ? '4px 10px' : 0
                    }}>
                      {line}
                    </div>
                  );
                })
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontStyle: 'italic', marginTop: '1rem', textAlign: 'center' }}>
                  No opening hours<br/>data available.
                </div>
              )}
            </div>
          </div>

          {/* Right: Time Selection */}
          <div className="time-picker-selector" style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            <div className="time-picker-scroll-container" style={{ position: 'relative', height: '150px' }}>
              {/* FIXED Selection Highlight (Stay in place, items roll behind it) */}
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '0', 
                right: '0', 
                height: '40px', 
                transform: 'translateY(-50%)', 
                background: '#3b82f6', 
                borderRadius: '12px', 
                zIndex: 0,
                boxShadow: '0 6px 20px rgba(59,130,246,0.35)',
                pointerEvents: 'none'
              }} />

              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="custom-scrollbar hide-scrollbar"
                style={{ 
                  height: '150px', 
                  overflowY: 'auto', 
                  position: 'relative',
                  padding: '55px 0',
                  zIndex: 2,
                  scrollSnapType: 'y mandatory',
                  maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)'
                }}
              >
                {TIMES.map((t, i) => {
                  const isSel = selectedIdx === i;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedIdx(i);
                        scrollRef.current.children[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                      }}
                      style={{
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isSel ? 'white' : 'rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        transform: isSel ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.2s ease, color 0.15s ease',
                        scrollSnapAlign: 'center',
                        lineHeight: 1,
                        willChange: 'transform'
                      }}
                    >
                      <span>{t.h}:{t.m}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: isSel ? 0.9 : 0.7 }}>{t.p}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          <button 
            onClick={onClose}
            style={{ padding: '1.2rem', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.85)', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            style={{ padding: '1.2rem', borderRadius: '20px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(59,130,246,0.3)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
