import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTrips } from '../../hooks/useTrips';
import { calculateDays, formatCurrency } from '../../utils/formatters';

function getStatus(trip, t) {
  const today = new Date().toISOString().split('T')[0];
  if (trip.status) {
    const labels = { ongoing: t('common.ongoing'), planned: t('common.planned'), completed: t('common.completed') };
    const classes = { ongoing: 'status-ongoing', planned: 'status-planned', completed: 'status-completed' };
    return { label: labels[trip.status] || t('common.planned'), cls: classes[trip.status] || 'status-planned' };
  }
  if (!trip.startDate || !trip.endDate) return { label: t('common.planned'), cls: 'status-planned' };
  if (today >= trip.startDate && today <= trip.endDate) return { label: t('common.ongoing'), cls: 'status-ongoing' };
  if (today < trip.startDate) return { label: t('common.planned'), cls: 'status-planned' };
  return { label: t('common.completed'), cls: 'status-completed' };
}


export default function TripCard({ trip, isList = false, onEdit, onShare }) {
  const { t } = useI18n();
  const { state } = useApp();
  const { deleteTrip } = useTrips();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const duration = (trip.startDate && trip.endDate) ? calculateDays(trip.startDate, trip.endDate) : 0;
  const status = getStatus(trip, t);
  const stopsCount = trip.stopsCount !== undefined
    ? trip.stopsCount
    : (trip.days ? trip.days.reduce((acc, day) => acc + (day.stops?.length || 0), 0) : 0);
  const totalCost = trip.totalCost !== undefined
    ? trip.totalCost
    : (trip.days ? trip.days.reduce((acc, day) => {
        return acc + (day.stops?.reduce((s, stop) => s + (parseFloat(stop.price) || 0), 0) || 0);
      }, 0) : 0);

  const handleOpen = () => navigate(`/trip-v2/${trip.id}`);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm(t('itinerary.confirm_delete_trip') || 'Delete this trip?')) return;
    try {
      await deleteTrip(trip.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setMenuOpen(v => !v);
  };

  if (isList) {
    const cities = trip.cities || [];
    return (
      <div
        className="trip-card-list"
        onClick={handleOpen}
        style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--st-glass-bg)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '16px', padding: '12px', transition: 'all 0.3s', cursor: 'pointer', marginBottom: '1rem', position: 'relative' }}
      >
        <div style={{ width: '120px', height: '80px', borderRadius: '12px', background: '#000', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <div className="thumb-blur-bg" style={{ backgroundImage: `url('${trip.thumb}')`, opacity: 0.3, filter: 'blur(10px)' }} />
          <img src={trip.thumb} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} alt={trip.title} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>{trip.title}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--st-color-text-muted)', fontSize: '0.85rem', marginBottom: cities.length ? '6px' : 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
              {trip.startDate} - {trip.endDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
              {stopsCount} {t('itinerary.stops_count')}
            </span>
          </div>
          {cities.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {cities.map(city => (
                <span key={city} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.07)', color: 'var(--st-color-text-muted)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                  {city}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '4px 12px', borderRadius: '20px' }}>{status.label}</span>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', minWidth: '100px', textAlign: 'right' }}>
          {formatCurrency(totalCost, state.settings)}
        </div>
        <div style={{ position: 'relative', marginLeft: '10px' }}>
          <button className="menu-dots" onClick={handleMenuToggle} style={{ position: 'static', transform: 'none', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.2s' }}>⋮</button>
          {menuOpen && (
            <div className="menu-dropdown" style={{ right: 0, top: '2.5rem', transform: 'none', zIndex: 100, display: 'block' }}>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>{t('itinerary.edit_trip')}</button>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>share</span>
                {t('itinerary.share_trip') || 'Share trip'}
              </button>
              <button className="danger" onClick={handleDelete}>{t('itinerary.delete_trip')}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="trip-card" onClick={handleOpen} style={{ position: 'relative' }}>
      <div className="trip-thumb">
        <div className="thumb-blur-bg" style={{ backgroundImage: `url('${trip.thumb}')` }} />
        <img className="thumb-main-img" src={trip.thumb} loading="lazy" alt={trip.title} />
        <button className="menu-dots" onClick={handleMenuToggle} style={{ position: 'absolute', top: '1rem', right: '1rem', transform: 'none', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backdropFilter: 'blur(4px)', zIndex: 10 }}>⋮</button>
        {trip.share_token && (
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', borderRadius: '20px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#a5f3fc', fontSize: '0.75rem', fontWeight: 600, zIndex: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>link</span>
            {t('share.shared') || 'Shared'}
          </div>
        )}
      </div>
      <div className="trip-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{trip.title}</h4>
          <div style={{ color: 'var(--md-sys-color-primary)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
            {stopsCount} {t('itinerary.stops_count')}
          </div>
        </div>
        <div style={{ color: 'var(--st-color-text-muted)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
          {trip.startDate} - {trip.endDate}
        </div>
        <div className="trip-meta">
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--st-color-text-muted)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '2px' }}>{t('dashboard.total_expenses')}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{formatCurrency(totalCost, state.settings)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="meta-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
              {duration} {t('itinerary.days')}
            </div>
            <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '4px 10px', borderRadius: '8px', backdropFilter: 'none' }}>{status.label}</span>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="menu-dropdown" style={{ right: '1rem', top: '3.5rem', transform: 'none', display: 'block', zIndex: 20 }}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>{t('itinerary.edit_trip')}</button>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>share</span>
            {t('itinerary.share_trip') || 'Share trip'}
          </button>
          <button className="danger" onClick={handleDelete}>{t('itinerary.delete_trip')}</button>
        </div>
      )}
    </div>
  );
}
