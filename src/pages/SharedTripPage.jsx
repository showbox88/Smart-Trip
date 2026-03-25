import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useTrips } from '../hooks/useTrips';

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

const CATEGORY_ICONS = {
  food: 'restaurant',
  restaurant: 'restaurant',
  hotel: 'hotel',
  accommodation: 'hotel',
  attraction: 'attractions',
  activity: 'directions_run',
  shopping: 'shopping_bag',
  transport: 'directions_transit',
  nature: 'park',
  default: 'place',
};

function getCategoryIcon(category) {
  if (!category) return CATEGORY_ICONS.default;
  const key = category.toLowerCase();
  return CATEGORY_ICONS[key] || CATEGORY_ICONS.default;
}

export default function SharedTripPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { importSharedTrip } = useTrips();

  const [tripData, setTripData] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingPage(true);
    supabase
      .from('trips')
      .select('trip_data, title, thumb')
      .eq('share_token', token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('not_found');
        } else {
          setTripData({
            ...data.trip_data,
            title: data.title,
            thumb: data.thumb,
          });
        }
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: importing ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
            {importing ? 'Importing...' : 'Import to My Trips'}
          </button>
        )}
      </div>

      {/* Trip header card */}
      <div style={{
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
            {(day.stops || []).filter(s => s.type === 'location' || !s.type).map((stop, stopIndex) => (
              <div key={stop.id || stopIndex} style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--accent-primary)' }}>
                    {getCategoryIcon(stop.category)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stop.name || stop.location || 'Unnamed stop'}
                  </div>
                  {stop.address && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stop.address}
                    </div>
                  )}
                  {stop.time && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: '3px' }}>schedule</span>
                      {stop.time}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(day.stops || []).filter(s => s.type === 'location' || !s.type).length === 0 && (
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
    </div>
  );
}
