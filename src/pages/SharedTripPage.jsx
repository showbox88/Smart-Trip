import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useTrips } from '../hooks/useTrips';
import { useI18n } from '../context/I18nContext';

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

const CATEGORY_ICON_MAP = [
  [['lodging', 'hotel', 'accommodation', '酒店', '住宿'], 'hotel'],
  [['restaurant', 'food', '餐厅', '餐饮'], 'restaurant'],
  [['cafe', 'coffee', '咖啡'], 'local_cafe'],
  [['bakery', 'bread'], 'bakery_dining'],
  [['bar', 'night'], 'local_bar'],
  [['attraction', 'museum', 'landmark', '景点', '博物馆'], 'museum'],
  [['park', 'nature', '公园'], 'park'],
  [['shopping', 'store', 'mall', '购物'], 'shopping_bag'],
  [['transit', 'subway', 'train', 'bus', '交通'], 'directions_transit'],
  [['airport', 'flight', '机场'], 'flight'],
  [['activity', 'sport', 'run'], 'directions_run'],
  [['spa', 'health'], 'spa'],
];

function getCategoryIcon(stop) {
  if (stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout') return 'hotel';
  if (!stop.category) return 'place';
  const key = stop.category.toLowerCase();
  for (const [keywords, icon] of CATEGORY_ICON_MAP) {
    if (keywords.some(k => key.includes(k))) return icon;
  }
  return 'place';
}

function getHotelBadge(type) {
  if (type === 'hotel_checkin') return { label: 'Check-in', color: '#22c55e' };
  if (type === 'hotel_checkout') return { label: 'Check-out', color: '#f59e0b' };
  return null;
}

export default function SharedTripPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { importSharedTrip } = useTrips();
  const { t } = useI18n();

  const [tripData, setTripData] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingPage(true);
    supabase
      .from('trips')
      .select(`
        title, thumb, start_date, end_date,
        trip_days ( days_v2 ( id, date, title, color, stops_data ) )
      `)
      .eq('share_token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('not_found');
          setLoadingPage(false);
          return;
        }

        const days = (data.trip_days || [])
          .map(td => td.days_v2)
          .filter(Boolean)
          .sort((a, b) => (a.date > b.date ? 1 : -1))
          .map(d => ({
            id: d.id,
            date: d.date,
            label: d.title,
            color: d.color,
            stops: Array.isArray(d.stops_data) ? d.stops_data : [],
          }));
        setTripData({
          title: data.title,
          thumb: data.thumb,
          startDate: data.start_date,
          endDate: data.end_date,
          days,
        });
        setLoadingPage(false);
      });
  }, [token]);

  const handleImport = async () => {
    if (!state.user || !tripData) return;
    setImporting(true);
    try {
      await importSharedTrip(tripData);
      navigate('/');
    } catch (e) {
      console.error('[SharedTripPage] importSharedTrip error:', e);
      setImporting(false);
    }
  };

  if (loadingPage) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem', opacity: 0.4 }}>travel_explore</span>
          <p style={{ margin: 0 }}>Loading trip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem', opacity: 0.35 }}>link_off</span>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Trip not available</h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>This trip is no longer available or the link has been revoked.</p>
        </div>
      </div>
    );
  }

  const dayCount = calculateDays(tripData?.startDate, tripData?.endDate);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <style>{`
        .shared-import-top-btn { display: flex; }
        .shared-import-bottom-bar { display: none; }
        @media (max-width: 640px) {
          .shared-import-top-btn { display: none; }
          .shared-import-bottom-bar { display: flex; }
          .shared-page-content { padding-bottom: 80px; }
        }
      `}</style>
      {/* Top bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: '22px' }}>travel_explore</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Smart Trip</span>
        </div>

        {state.user && (
          <button
            className="shared-import-top-btn"
            onClick={handleImport}
            disabled={importing}
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: importing ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
            {importing ? t('share.importing') : t('share.import_trip')}
          </button>
        )}
      </div>

      {/* Trip header card */}
      <div className="shared-page-content" style={{
        maxWidth: '720px',
        margin: '2rem auto 0',
        padding: '0 1.5rem',
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '14px',
            flexShrink: 0,
            background: tripData.thumb ? `url(${tripData.thumb}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!tripData.thumb && <span className="material-symbols-outlined" style={{ opacity: 0.2 }}>image</span>}
          </div>
          <div>
            <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.4rem', lineHeight: 1.2 }}>{tripData.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {(tripData.startDate || tripData.endDate) && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {formatDateShort(tripData.startDate)}{tripData.endDate ? ` — ${formatDateShort(tripData.endDate)}` : ''}
                </span>
              )}
              {dayCount > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '1px 8px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}>
                  {dayCount} days
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Days */}
        {(tripData.days || []).map((day, dayIndex) => (
          <div key={day.id || dayIndex} style={{ marginBottom: '1.5rem' }}>
            {/* Day header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.75rem',
              padding: '0.6rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '10px',
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: day.color || 'var(--accent-primary)',
                flexShrink: 0,
              }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Day {dayIndex + 1}
              </span>
              {day.date && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  — {formatDateShort(day.date)}
                </span>
              )}
              {day.label && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  · {day.label}
                </span>
              )}
            </div>

            {/* Stops */}
            {(day.stops || []).map((stop, stopIndex) => {
              // Note card
              if (stop.type === 'note') {
                return (
                  <div key={stop.id || stopIndex} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>sticky_note_2</span>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {stop.content || ''}
                    </p>
                  </div>
                );
              }

              // List card
              if (stop.type === 'list') {
                return (
                  <div key={stop.id || stopIndex} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--glass-border)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)' }}>checklist</span>
                      {stop.title && <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{stop.title}</span>}
                    </div>
                    {(stop.items || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{
                          width: '15px', height: '15px', borderRadius: '4px', flexShrink: 0,
                          border: '2px solid var(--text-muted)',
                          background: item.checked ? 'var(--text-muted)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.checked && <span style={{ color: 'var(--bg-primary)', fontSize: '9px', fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.5 : 1 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }

              const hotelBadge = getHotelBadge(stop.type);
              const price = parseFloat(stop.price);
              const navUrl = stop.address
                ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}${stop.placeId ? `&destination_place_id=${stop.placeId}` : ''}`
                : null;
              const chip = (bg, color, border, icon, label) => (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  background: bg, color, border: `1px solid ${border}`,
                  borderRadius: '6px', padding: '2px 7px',
                  fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{icon}</span>
                  {label}
                </span>
              );
              return (
                <div key={stop.id || stopIndex} style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '0.75rem 0.85rem',
                  marginBottom: '0.45rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}>
                  {/* Left: all text content */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Row 1: icon + name + hotel badge + rating */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span className="material-symbols-outlined" style={{
                        fontSize: '14px', color: 'var(--accent-primary)',
                        fontVariationSettings: "'FILL' 1", flexShrink: 0, lineHeight: 1,
                      }}>
                        {getCategoryIcon(stop)}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3 }}>
                        {stop.name || stop.location || 'Unnamed stop'}
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
                        }}>{stop.address}</span>
                      </div>
                    )}

                    {/* Row 3: time + reservationTime + price + navigate */}
                    {(stop.time || stop.reservationTime || (!isNaN(price) && price > 0) || navUrl) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {stop.time && chip('rgba(249,115,22,0.1)', '#f97316', 'rgba(249,115,22,0.25)', 'schedule', `${stop.time}${stop.period ? ` ${stop.period}` : ''}`)}
                        {stop.reservationTime && chip('rgba(255,255,255,0.06)', 'var(--text-primary)', 'rgba(255,255,255,0.12)', 'event_available', stop.reservationTime)}
                        {!isNaN(price) && price > 0 && chip('rgba(16,185,129,0.1)', '#10b981', 'rgba(16,185,129,0.25)', 'payments', stop.price)}
                        {navUrl && (
                          <a href={navUrl} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '3px',
                            background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                            border: '1px solid rgba(59,130,246,0.25)',
                            borderRadius: '6px', padding: '2px 7px',
                            fontSize: '0.7rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>near_me</span>
                            Navigate
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: thumbnail */}
                  {stop.photo && (
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                      <img src={stop.photo} alt={stop.name || stop.location} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              );
            })}

            {(day.stops || []).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 1rem', fontStyle: 'italic' }}>
                No stops for this day.
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '2rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.82rem',
          borderTop: '1px solid var(--glass-border)',
          marginTop: '1rem',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px', opacity: 0.6 }}>travel_explore</span>
          Shared via Smart Trip
        </div>
      </div>

      {/* Mobile-only sticky bottom import bar */}
      {state.user && (
        <div className="shared-import-bottom-bar" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0.75rem 1rem',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--glass-border)',
          zIndex: 200,
          justifyContent: 'center',
        }}>
          <button
            onClick={handleImport}
            disabled={importing}
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: importing ? 0.7 : 1,
              width: '100%',
              maxWidth: '400px',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            {importing ? t('share.importing') : t('share.import_trip')}
          </button>
        </div>
      )}
    </div>
  );
}
