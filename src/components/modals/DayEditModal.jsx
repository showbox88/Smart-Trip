import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';

export default function DayEditModal({ day, dayIndex, onSave, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: day.name || '',
    subtitle: day.subtitle || '',
    date: day.date || '',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    onSave?.({ ...form });
    onClose?.();
  };

  const suffix = t('itinerary.day_suffix');
  const dayLabel = `${t('itinerary.day_label') || 'Day'}${dayIndex + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {t('itinerary.edit_day_label') || 'Edit Day'} — {dayLabel}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Day name */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('itinerary.day_name') || 'Day name'}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder={dayLabel}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Subtitle */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('itinerary.day_subtitle') || 'Subtitle'}
          </label>
          <input
            type="text"
            value={form.subtitle}
            onChange={set('subtitle')}
            placeholder={t('itinerary.day_subtitle_placeholder') || 'e.g. Arrival day'}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Date */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('itinerary.day_date') || 'Date'}
          </label>
          <input
            type="date"
            value={form.date}
            onChange={set('date')}
            style={{ width: '100%', padding: '0.8rem', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface)', cursor: 'pointer' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--md-sys-color-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('common.save') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
