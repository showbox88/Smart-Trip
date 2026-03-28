import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const ITEM_HEIGHT = 40;
const PADDING_TOP = 55;

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
      
      // Perform instantaneous un-animated jump to center on mount
      const targetScroll = targetIdx * ITEM_HEIGHT;
      scrollRef.current.style.scrollBehavior = 'auto'; // ensure instant
      scrollRef.current.scrollTop = targetScroll;
      
      // Small delay before enabling smooth scroll behavior if they click to select
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.style.scrollBehavior = 'smooth';
      }, 50);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(debounceRef.current);
    };
  }, []); // Only run once on mount

  const handleScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const centerOffset = st + scrollRef.current.offsetHeight / 2 - PADDING_TOP;
      const idx = Math.round((centerOffset - ITEM_HEIGHT / 2) / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(extendedItems.length - 1, idx));

      clearTimeout(debounceRef.current);
      // Wait for scrolling to settle
      debounceRef.current = setTimeout(() => {
        onSelect(clamped % items.length);
      }, 60);
    });
  };

  return (
    <div className="time-picker-scroll-container" style={{ position: 'relative', height: '150px', flex: 1 }}>
      <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '40px', transform: 'translateY(-50%)', background: '#3b82f6', borderRadius: '12px', zIndex: 0, boxShadow: '0 6px 20px rgba(59,130,246,0.35)', pointerEvents: 'none' }} />

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="custom-scrollbar hide-scrollbar"
        style={{ height: '150px', overflowY: 'auto', position: 'relative', padding: '55px 0', zIndex: 2, scrollSnapType: 'y mandatory', maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)' }}
      >
        {extendedItems.map((item, i) => {
          const isSel = selectedIdx === (i % items.length);
          return (
            <div
              key={i}
              onClick={() => {
                onSelect(i % items.length);
                if (scrollRef.current && scrollRef.current.children[i]) {
                  scrollRef.current.children[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
              }}
              style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: isSel ? 'white' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transform: isSel ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s ease, color 0.15s ease', scrollSnapAlign: 'center', lineHeight: 1, willChange: 'transform' }}
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
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const debounceRef = useRef(null);
  const [openingHours, setOpeningHours] = useState(stop.openingHours || []);
  const [loadingHours, setLoadingHours] = useState(false);

  const initialTime = stop.time || '10:00';
  const initialPeriod = stop.period || 'AM';
  const [h, m] = initialTime.split(':');

  const [period, setPeriod] = useState(initialPeriod);

  const [hourIdx, setHourIdx] = useState(() => {
    const idx = HOURS.indexOf(h);
    return idx >= 0 ? idx : 9; // Default 10
  });

  const [minIdx, setMinIdx] = useState(() => {
    const idx = MINUTES.indexOf(m);
    return idx >= 0 ? idx : 0; // Default 00
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

  const handleSave = () => {
    const timeH = HOURS[hourIdx];
    const timeM = MINUTES[minIdx];
    onSave?.({ time: `${timeH}:${timeM}`, period, openingHours });
    onClose();
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

    onSave?.({ time: `${timeH}:${timeM}`, period: currentPeriod, openingHours });
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
          <div className="time-picker-selector" style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            
            {/* AM/PM Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', width: '100%', maxWidth: '200px' }}>
              <button
                onClick={() => setPeriod('AM')}
                style={{ flex: 1, padding: '8px 0', border: 'none', background: period === 'AM' ? '#3b82f6' : 'transparent', color: period === 'AM' ? 'white' : 'rgba(255,255,255,0.5)', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: period === 'AM' ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}
              >
                {t('common.am') || 'AM'}
              </button>
              <button
                onClick={() => setPeriod('PM')}
                style={{ flex: 1, padding: '8px 0', border: 'none', background: period === 'PM' ? '#3b82f6' : 'transparent', color: period === 'PM' ? 'white' : 'rgba(255,255,255,0.5)', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: period === 'PM' ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}
              >
                {t('common.pm') || 'PM'}
              </button>
            </div>

            {/* Scrolling Wheels */}
            <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '280px' }}>
              <ScrollColumn items={HOURS} selectedIdx={hourIdx} onSelect={setHourIdx} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>:</div>
              <ScrollColumn items={MINUTES} selectedIdx={minIdx} onSelect={setMinIdx} />
            </div>

          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.8rem', marginTop: '1.2rem' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.8rem 0.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.85)', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          
          <button 
            onClick={handlePunchIn}
            style={{ padding: '0.8rem 0.5rem', borderRadius: '16px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(249,115,22,0.25)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(249,115,22,0.15)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
            {t('itinerary.punch_in') || '打卡此时'}
          </button>

          <button 
            onClick={handleSave}
            style={{ padding: '0.8rem 0.5rem', borderRadius: '16px', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 6px 15px rgba(59,130,246,0.3)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            {t('common.save') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
