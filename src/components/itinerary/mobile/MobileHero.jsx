/**
 * MobileHero — Hero carousel for the mobile itinerary view.
 * Shows trip cover image + city info slides with climate data.
 */

import { useCallback, useRef } from 'react';
import { formatTemp, formatDateRange } from '../../../utils/formatters';

export default function MobileHero({
  trip, cities, destinations, climateByCity, cityInfo, cityInfoLoading,
  heroIdx, setHeroIdx, totalSlides,
  menuTrigger, setCityModal,
}) {
  const heroTouchX = useRef(null);

  const onHeroTouchStart = useCallback((e) => {
    heroTouchX.current = e.touches[0].clientX;
  }, []);

  const onHeroTouchEnd = useCallback((e) => {
    if (heroTouchX.current == null) return;
    const dx = heroTouchX.current - e.changedTouches[0].clientX;
    heroTouchX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) {
      setHeroIdx(prev => (prev + 1) % totalSlides);
    } else {
      setHeroIdx(prev => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [totalSlides, setHeroIdx]);

  const stg = trip?.settings;

  return (
    <div style={{ position: 'relative', height: 235, flexShrink: 0, overflow: 'hidden' }}
      onTouchStart={onHeroTouchStart} onTouchEnd={onHeroTouchEnd}>

      {/* Slide track */}
      <div style={{
        display: 'flex', width: `${totalSlides * 100}%`,
        height: '100%',
        transform: `translateX(-${heroIdx * (100 / totalSlides)}%)`,
        transition: 'transform .35s ease',
      }}>
        {/* Slide 0: Trip cover */}
        <div style={{ width: `${100 / totalSlides}%`, height: '100%', position: 'relative', flexShrink: 0 }}>
          {trip.thumb
            ? <img src={trip.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1c2d4f,#2c4a7c,#3a6bc2)' }} />}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.12) 55%, transparent 100%)' }} />
          <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 700, lineHeight: 1.2,
              textShadow: '0 2px 12px rgba(0,0,0,.4)', letterSpacing: '-.3px' }}>{trip.title}</h1>
            {(trip.startDate || trip.endDate) &&
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.85)', fontSize: 14 }}>
                {formatDateRange(trip.startDate, trip.endDate)}</p>}
          </div>
        </div>

        {/* Slides 1+: City info cards */}
        {cities.map((city) => {
          const climate = climateByCity?.[city];
          const info = cityInfo?.[city];
          const dest = destinations.find(d => d.name === city);
          return (
            <div key={city} style={{
              width: `${100 / totalSlides}%`, height: '100%', flexShrink: 0,
              position: 'relative',
              background: 'linear-gradient(160deg,#1a1a2e,#16213e,#0f3460)',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 16px 14px',
              overflow: 'hidden',
            }}>
              {/* Title row */}
              <div style={{ marginBottom: 10, paddingRight: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700, letterSpacing: '-.4px' }}>{city}</h2>
                    {dest?.country && (
                      <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, fontWeight: 400 }}>{dest.country}</span>
                    )}
                  </div>
                  {climate && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: '#FFD60A', fontSize: 12 }}>★</span>
                      <span style={{ color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: '-.3px' }}>{formatTemp(climate.avgHigh, stg)}</span>
                      <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, fontWeight: 400 }}>/ {formatTemp(climate.avgLow, stg)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* About card */}
              <div style={{
                background: 'rgba(255,255,255,.06)', borderRadius: 14,
                padding: '10px 14px', overflow: 'hidden', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,.06)',
                marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'rgba(255,255,255,.4)' }}>info</span>
                  <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px' }}>About</span>
                  {climate && (
                    <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,.3)', fontSize: 10, fontWeight: 500 }}>
                      {climate.rainyDays || 0}d rain · {climate.avgPrecipMm > 0 ? `${Math.round(climate.avgPrecipMm)}mm` : '0mm'}
                    </span>
                  )}
                </div>
                <p style={{
                  margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 12.5, lineHeight: 1.5, fontWeight: 400,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {cityInfoLoading ? 'Loading...' : (info?.intro || 'No description available')}
                </p>
              </div>

              {/* Bottom row: Cuisine + Attractions + Activity */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { icon: 'restaurant', label: 'Cuisine', fn: () => setCityModal({ type: 'cuisine', city }) },
                  { icon: 'tour', label: 'Attractions', fn: () => setCityModal({ type: 'attractions', city }) },
                  { icon: 'confirmation_number', label: 'Activity', fn: () => {
                    const loc = encodeURIComponent(`${city}, ${dest?.country || ''}`);
                    const d1 = trip?.startDate ? trip.startDate.replace(/\//g, '-') : '';
                    const d2 = trip?.endDate ? trip.endDate.replace(/\//g, '-') : '';
                    let url = `https://www.expedia.com/things-to-do/search?location=${loc}&sort=RECOMMENDED&swp=on`;
                    if (d1) url += `&d1=${d1}&startDate=${encodeURIComponent(d1)}`;
                    if (d2) url += `&d2=${d2}&endDate=${encodeURIComponent(d2)}`;
                    window.open(url, '_blank');
                  }, external: true },
                ].map(b => (
                  <button key={b.label} onClick={b.fn} style={{
                    flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: 12,
                    padding: '10px 0', border: '1px solid rgba(255,255,255,.06)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    transition: 'background .15s',
                  }}
                  onPointerDown={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}
                  onPointerUp={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
                  onPointerLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,.6)' }}>{b.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, fontWeight: 600, letterSpacing: '.2px' }}>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Menu trigger — rendered by parent to avoid overflow:hidden clipping */}
      {menuTrigger}

      {/* Page dots */}
      {totalSlides > 1 && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, zIndex: 10,
        }}>
          {Array.from({ length: totalSlides }, (_, idx) => (
            <div key={idx} style={{
              width: heroIdx === idx ? 18 : 6, height: 6, borderRadius: 3,
              background: heroIdx === idx ? '#fff' : 'rgba(255,255,255,.5)',
              transition: 'all .25s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
