import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function StopEditModal({ stop, onSave, onDelete, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    location: stop.location || '',
    address: stop.address || '',
    phone: stop.phone || '',
    note: stop.note || '',
    time: stop.time || '',
    period: stop.period || 'AM',
    price: stop.price || '0',
    reservationTime: stop.reservationTime || '',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    onSave?.({ ...form });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('stops.edit_modal_title') || 'Edit Stop'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Name */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.location') || 'Name'}
          </label>
          <input
            type="text"
            value={form.location}
            onChange={set('location')}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        {/* Time */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.edit_time') || 'Time'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={form.time}
              onChange={set('time')}
              placeholder="12:00"
              style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none' }}
            />
            <select
              value={form.period}
              onChange={set('period')}
              style={{ padding: '0.8rem', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="AM">{t('common.am') || 'AM'}</option>
              <option value="PM">{t('common.pm') || 'PM'}</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.location') || 'Address'}
          </label>
          <input
            type="text"
            value={form.address}
            onChange={set('address')}
            placeholder={t('itinerary.add_stop') || 'Address...'}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Price */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('itinerary.add_expense') || 'Expense'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--st-color-text-muted)' }}>$</span>
            <input
              type="number"
              value={form.price}
              onChange={set('price')}
              placeholder="0"
              style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none' }}
            />
          </div>
        </div>

        {/* Reservation Time */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('itinerary.select_appointment_time') || 'Reservation Time'}
          </label>
          <input
            type="text"
            value={form.reservationTime}
            onChange={set('reservationTime')}
            placeholder="14:00"
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Phone */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.phone') || 'Phone'}
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={set('phone')}
            placeholder={t('stops.phone_placeholder') || '+1 ...'}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Note */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.note') || 'Note'}
          </label>
          <textarea
            value={form.note}
            onChange={set('note')}
            placeholder={t('itinerary.add_note') || 'Add a note...'}
            style={{ width: '100%', minHeight: '100px', fontSize: '1rem', padding: '1rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
            {t('common.delete') || 'Delete'}
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
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
    </div>
  );
}
