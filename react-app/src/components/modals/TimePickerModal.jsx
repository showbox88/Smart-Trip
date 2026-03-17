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

export default function TimePickerModal({ stop, dayDate, onSave, onClose }) {
  const { t } = useI18n();
  const scrollRef = useRef(null);
  const [openingHours, setOpeningHours] = useState(stop.openingHours || []);
  const [loadingHours, setLoadingHours] = useState(false);

  const initialTime = stop.time || '10:00';
  const initialPeriod = stop.period || 'AM';
  const [h, m] = initialTime.split(':');
  
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = TIMES.findIndex(t => t.h === h && t.m === m && t.p === initialPeriod);
    return idx >= 0 ? idx : 20; // Default or parsed
  });

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
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const items = container.children;
    const containerCenter = container.getBoundingClientRect().top + container.offsetHeight / 2;
    
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const diff = Math.abs(containerCenter - itemCenter);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
    }
    if (closestIdx !== selectedIdx) {
      setSelectedIdx(closestIdx);
    }
  };

  const handleSave = () => {
    const time = TIMES[selectedIdx];
    onSave?.({ time: `${time.h}:${time.m}`, period: time.p, openingHours });
    onClose();
  };

  return (
    <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div 
        className="modal-content" 
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

        <h3 style={{ textAlign: 'center', margin: '0.5rem 0 2rem 0', fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
          Select Appointment Time
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '2rem', marginBottom: '1.5rem', minHeight: '340px' }}>
          {/* Left: Opening Hours */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '1.8rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f97316', marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>schedule</span>
              Opening Hours
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingHours ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading hours...</div>
              ) : (openingHours && openingHours.length > 0) ? (
                openingHours.map((line, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {line}
                    </div>
                ))
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontStyle: 'italic', marginTop: '1rem', textAlign: 'center' }}>
                  No opening hours<br/>data available.
                </div>
              )}
            </div>
          </div>

          {/* Right: Time Selection */}
          <div style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.8rem', color: 'white', lineHeight: 1.3 }}>
              Select Approximate<br/>Appointment Time
            </div>
            
            {dayDate && (
              <div style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', padding: '6px 16px', borderRadius: '12px', display: 'inline-block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                {dayDate}
              </div>
            )}
            
            <div style={{ position: 'relative', flex: 1, height: '260px' }}>
              {/* FIXED Selection Highlight (Stay in place, items roll behind it) */}
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '0', 
                right: '0', 
                height: '84px', 
                transform: 'translateY(-50%)', 
                background: '#3b82f6', 
                borderRadius: '24px', 
                zIndex: 0,
                boxShadow: '0 12px 30px rgba(59,130,246,0.35)'
              }} />

              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="custom-scrollbar hide-scrollbar"
                style={{ 
                  height: '260px', 
                  overflowY: 'auto', 
                  position: 'relative',
                  padding: '88px 0',
                  zIndex: 2,
                  scrollSnapType: 'y mandatory',
                  maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)'
                }}
              >
                {TIMES.map((t, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                        setSelectedIdx(i);
                        scrollRef.current.children[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }}
                    style={{ 
                      height: '84px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      fontSize: selectedIdx === i ? '2.2rem' : '1.35rem',
                      fontWeight: 800,
                      color: selectedIdx === i ? 'white' : 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      scrollSnapAlign: 'center',
                      lineHeight: 1
                    }}
                  >
                    {selectedIdx === i ? (
                      <>
                        <span>{t.h}:{t.m}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, opacity: 0.9, marginTop: '4px' }}>{t.p}</span>
                      </>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {t.h}:{t.m} <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t.p}</span>
                      </span>
                    )}
                  </div>
                ))}
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
