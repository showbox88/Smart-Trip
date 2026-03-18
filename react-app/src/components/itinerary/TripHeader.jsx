import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency, calculateDays } from '../../utils/formatters';

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TripHeader({ trip, onDeleteTrip, onEditTrip }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const totalCost = trip?.days?.reduce((acc, day) => {
    return acc + (day.stops || []).reduce((sum, stop) => {
      const p = parseFloat(stop.price);
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
  }, 0) || 0;

  const dayCount = calculateDays(trip?.startDate, trip?.endDate);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!trip) return null;

  return (
    <div
      className="itinerary-header"
      id="trip-header-bar"
      style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--glass-border)', position: 'sticky', top: 0, zIndex: 100 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Thumbnail */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: trip.thumb ? `url(${trip.thumb}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {!trip.thumb && <span className="material-symbols-outlined" style={{ opacity: 0.2 }}>image</span>}
          </div>

          {/* Title + meta */}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>{trip.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
              </span>
              {dayCount > 0 && (
                <span className="header-badge">{dayCount} {t('itinerary.days') || 'days'}</span>
              )}
              {totalCost > 0 && (
                <span className="header-badge">{formatCurrency(totalCost, state.settings)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="menu-dots"
            onClick={() => setShowMenu(v => !v)}
          >⋮</button>
          {showMenu && (
            <div className="menu-dropdown active" style={{ top: '2rem', right: 0 }}>
              <button onClick={() => { onEditTrip?.(); setShowMenu(false); }}>
                {t('itinerary.edit_trip') || 'Edit trip'}
              </button>
              <button className="danger" onClick={() => { onDeleteTrip?.(trip.id); setShowMenu(false); }}>
                {t('itinerary.delete_trip') || 'Delete trip'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
