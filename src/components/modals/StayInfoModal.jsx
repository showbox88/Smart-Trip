import { useState, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';

const pad = n => String(n).padStart(2, '0');

const SELECT_STYLE = {
  width: '100%',
  height: '48px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  borderRadius: '8px',
  padding: '0 0.75rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const FIELDSET_STYLE = {
  background: 'rgba(100,160,255,0.06)',
  border: '1px solid rgba(100,160,255,0.2)',
  borderRadius: '12px',
  padding: '0.75rem 1rem',
  margin: '0 0 0.75rem 0',
};

const LEGEND_STYLE = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  padding: '0 6px',
};

// Scroll-wheel time picker: hover + scroll to change hours or minutes
function TimePicker({ value, onChange }) {
  const [hoverPart, setHoverPart] = useState(null);

  const parts = value.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  const handleWheel = useCallback((e, part) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    if (part === 'h') {
      const next = (hours + dir + 12) % 12 || 12;
      onChange(`${pad(next)}:${pad(minutes)}`);
    } else {
      const next = (minutes + dir * 5 + 60) % 60;
      onChange(`${pad(hours)}:${pad(next)}`);
    }
  }, [hours, minutes, onChange]);

  const segStyle = (part) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    borderRadius: '6px',
    cursor: 'ns-resize',
    background: hoverPart === part ? 'rgba(255,255,255,0.12)' : 'transparent',
    transition: 'background 0.15s',
    userSelect: 'none',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      height: '100%',
      fontSize: '0.95rem',
      fontWeight: 600,
      color: 'var(--text-primary)',
      overflow: 'hidden',
      flex: 1,
    }}>
      <div
        style={segStyle('h')}
        onMouseEnter={() => setHoverPart('h')}
        onMouseLeave={() => setHoverPart(null)}
        onWheel={e => handleWheel(e, 'h')}
        title="Scroll to change hours"
      >
        {pad(hours)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5, padding: '0 2px' }}>:</div>
      <div
        style={segStyle('m')}
        onMouseEnter={() => setHoverPart('m')}
        onMouseLeave={() => setHoverPart(null)}
        onWheel={e => handleWheel(e, 'm')}
        title="Scroll to change minutes"
      >
        {pad(minutes)}
      </div>
    </div>
  );
}

function PeriodToggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(value === 'AM' ? 'PM' : 'AM')}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '0.85rem',
        fontWeight: 700,
        padding: '0 0.75rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, border-color 0.15s',
        height: '100%',
        minWidth: '52px',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      {value}
    </button>
  );
}

function initStayState(trip, stopId) {
  const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, _dayId: d.id, _dayDate: d.date })));
  const thisStop = allStops.find(s => s.id === stopId);
  const stayId = thisStop?.stayId;

  let cinDate = thisStop?._dayDate || '', cinTime = '14:00', cinPeriod = 'PM';
  let coutDate = '', coutTime = '12:00', coutPeriod = 'PM';

  if (stayId) {
    const cin = allStops.find(s => s.stayId === stayId && s.type === 'hotel_checkin');
    const cout = allStops.find(s => s.stayId === stayId && s.type === 'hotel_checkout');
    if (cin) { cinDate = cin._dayDate || ''; cinTime = cin.time || '14:00'; cinPeriod = cin.period || 'PM'; }
    if (cout) { coutDate = cout._dayDate || ''; coutTime = cout.time || '12:00'; coutPeriod = cout.period || 'PM'; }
  }

  return { cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod };
}

export default function StayInfoModal({ trip, stopId, onSave, onClose }) {
  const { t } = useI18n();

  const [{ cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod }, setStay] = useState(
    () => initStayState(trip, stopId)
  );
  const setCinDate = v => setStay(s => ({ ...s, cinDate: v }));
  const setCinTime = v => setStay(s => ({ ...s, cinTime: v }));
  const setCinPeriod = v => setStay(s => ({ ...s, cinPeriod: v }));
  const setCoutDate = v => setStay(s => ({ ...s, coutDate: v }));
  const setCoutTime = v => setStay(s => ({ ...s, coutTime: v }));
  const setCoutPeriod = v => setStay(s => ({ ...s, coutPeriod: v }));

  const dayOptions = trip.days.map(d => ({ id: d.id, label: d.date || d.id }));

  const handleSubmit = () => {
    if (!cinDate || !coutDate) return alert(t('itinerary.stay_date_required') || '请选择日期');
    onSave({ cinDate, cinTime, cinPeriod, coutDate, coutTime, coutPeriod });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '1.5rem', width: '400px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('itinerary.stay_modal_title') || 'Stay Information Management'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>

        {/* Check-in section */}
        <fieldset style={FIELDSET_STYLE}>
          <legend style={LEGEND_STYLE}>CHECK-IN</legend>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <select value={cinDate} onChange={e => setCinDate(e.target.value)} style={SELECT_STYLE}>
                <option value="">--</option>
                {dayOptions.map(d => <option key={d.id} value={d.label}>{d.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px', height: '48px' }}>
                <TimePicker value={cinTime} onChange={setCinTime} />
                <PeriodToggle value={cinPeriod} onChange={setCinPeriod} />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Check-out section */}
        <fieldset style={FIELDSET_STYLE}>
          <legend style={LEGEND_STYLE}>CHECK-OUT</legend>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <select value={coutDate} onChange={e => setCoutDate(e.target.value)} style={SELECT_STYLE}>
                <option value="">--</option>
                {dayOptions.map(d => <option key={d.id} value={d.label}>{d.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '6px', height: '48px' }}>
                <TimePicker value={coutTime} onChange={setCoutTime} />
                <PeriodToggle value={coutPeriod} onChange={setCoutPeriod} />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            style={{ flex: 2, padding: '0.75rem', borderRadius: '12px', background: 'var(--accent-primary)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
          >
            {t('itinerary.stay_submit') || 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
