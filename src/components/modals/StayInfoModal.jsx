import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';

export default function StayInfoModal({ trip, dayId, stopId, onSave, onClose }) {
  const { t } = useI18n();

  // Find this stop and its current stay info
  const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, _dayId: d.id, _dayDate: d.date })));
  const thisStop = allStops.find(s => s.id === stopId);
  const stayId = thisStop?.stayId;

  let initCinDate = '', initCinTime = '14:00', initCinPeriod = 'PM';
  let initCoutDate = '', initCoutTime = '12:00', initCoutPeriod = 'PM';

  if (stayId) {
    const cin = allStops.find(s => s.stayId === stayId && s.type === 'hotel_checkin');
    const cout = allStops.find(s => s.stayId === stayId && s.type === 'hotel_checkout');
    if (cin) { initCinDate = cin._dayDate || ''; initCinTime = cin.time || '14:00'; initCinPeriod = cin.period || 'PM'; }
    if (cout) { initCoutDate = cout._dayDate || ''; initCoutTime = cout.time || '12:00'; initCoutPeriod = cout.period || 'PM'; }
  }

  // Default cin date to this stop's day if not set
  if (!initCinDate && thisStop) initCinDate = thisStop._dayDate || '';

  const [cinDate, setCinDate] = useState(initCinDate);
  const [cinTime, setCinTime] = useState(initCinTime);
  const [cinPeriod, setCinPeriod] = useState(initCinPeriod);
  const [coutDate, setCoutDate] = useState(initCoutDate);
  const [coutTime, setCoutTime] = useState(initCoutTime);
  const [coutPeriod, setCoutPeriod] = useState(initCoutPeriod);

  // Build date options from trip days
  const dayOptions = trip.days.map(d => ({ id: d.id, label: d.date || d.id }));

  const handleSubmit = () => {
    if (!cinDate || !coutDate) return alert(t('itinerary.stay_date_required') || '请选择日期');
    onSave({ cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod });
    onClose();
  };

  const inputStyle = {
    flex: 1,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    padding: '0.75rem',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    textAlign: 'center',
  };
  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
    fontWeight: 600,
  };
  const selectStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '0.75rem 0.5rem',
    fontSize: '0.9rem',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '2rem', width: '440px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('itinerary.stay_modal_title') || 'Stay Information Management'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Check-in row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('itinerary.stay_checkin_date') || 'Check-in Date'}</label>
            <select value={cinDate} onChange={e => setCinDate(e.target.value)} style={{ ...inputStyle, textAlign: 'left' }}>
              <option value="">--</option>
              {dayOptions.map(d => <option key={d.id} value={d.label}>{d.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('itinerary.stay_checkin_time') || 'Check-in Time'}</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={cinTime} onChange={e => setCinTime(e.target.value)} style={inputStyle} placeholder="14:00" />
              <select value={cinPeriod} onChange={e => setCinPeriod(e.target.value)} style={selectStyle}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Check-out row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('itinerary.stay_checkout_date') || 'Check-out Date'}</label>
            <select value={coutDate} onChange={e => setCoutDate(e.target.value)} style={{ ...inputStyle, textAlign: 'left' }}>
              <option value="">--</option>
              {dayOptions.map(d => <option key={d.id} value={d.label}>{d.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>{t('itinerary.stay_checkout_time') || 'Check-out Time'}</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={coutTime} onChange={e => setCoutTime(e.target.value)} style={inputStyle} placeholder="12:00" />
              <select value={coutPeriod} onChange={e => setCoutPeriod(e.target.value)} style={selectStyle}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-primary)', paddingLeft: '10px', lineHeight: 1.5 }}>
          {t('itinerary.stay_hint') || "System will automatically generate 'Check-in' and 'Check-out' cards on selected dates, marking the start and end of your stay."}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            style={{ flex: 2, padding: '0.85rem', borderRadius: '12px', background: 'var(--accent-primary)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
          >
            {t('itinerary.stay_submit') || 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
