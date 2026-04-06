import { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import {
  ACTIVITY_CATEGORY_MAP, ACTIVITY_CATEGORIES,
  getActivityIcon, getActivityLabel, formatDuration, createEmptyActivityInfo,
} from '../../utils/activityHelpers';

export default memo(function ActivityDetailModal({ stop, dayId, onSave, onClose }) {
  const { t } = useI18n();
  const info = stop?.activityInfo || createEmptyActivityInfo();

  const [form, setForm] = useState({
    activityCategory: info.activityCategory || 'tour',
    provider: info.provider || '',
    contactPerson: info.contactPerson || '',
    contactPhone: info.contactPhone || '',
    meetingPoint: info.meetingPoint || '',
    bookingRef: info.bookingRef || '',
    bookingUrl: info.bookingUrl || '',
    durationH: info.duration ? Math.floor(info.duration / 60) : '',
    durationM: info.duration ? (info.duration % 60) : '',
    groupSize: info.groupSize || '',
    difficulty: info.difficulty || null,
    equipment: info.equipment || '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = () => {
    const dH = parseInt(form.durationH) || 0;
    const dM = parseInt(form.durationM) || 0;
    const duration = (dH * 60 + dM) || null;

    const activityInfo = {
      activityCategory: form.activityCategory,
      provider: form.provider.trim(),
      contactPerson: form.contactPerson.trim(),
      contactPhone: form.contactPhone.trim(),
      meetingPoint: form.meetingPoint.trim(),
      bookingRef: form.bookingRef.trim(),
      bookingUrl: form.bookingUrl.trim(),
      duration,
      groupSize: parseInt(form.groupSize) || null,
      difficulty: form.difficulty,
      equipment: form.equipment.trim(),
    };
    onSave?.({ ...stop, type: 'activity', activityInfo });
    onClose?.();
  };

  // ── Field row helper ──
  const Field = ({ icon, label, children }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.75rem' }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-on-surface-variant)', marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
        {children}
      </div>
    </div>
  );

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '8px',
    border: '1px solid var(--md-sys-color-outline-variant)',
    background: 'var(--md-sys-color-surface-container)',
    color: 'var(--md-sys-color-on-surface)',
    fontSize: '0.85rem', outline: 'none',
  };

  const difficultyOptions = [
    { key: 'easy', label: t('activity.difficulty_easy') || 'Easy', color: '#10b981' },
    { key: 'moderate', label: t('activity.difficulty_moderate') || 'Moderate', color: '#f59e0b' },
    { key: 'hard', label: t('activity.difficulty_hard') || 'Hard', color: '#ef4444' },
  ];

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
        background: 'var(--md-sys-color-surface-variant)',
        borderRadius: '1rem',
        width: '100%', maxWidth: '480px', maxHeight: '85vh',
        overflow: 'auto', padding: '1.25rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#26a69a' }}>local_activity</span>
            {t('activity.detail_title') || 'Activity Details'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--md-sys-color-on-surface-variant)', padding: 4, borderRadius: 8 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* ── Category Grid ── */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('activity.category_label') || 'Activity Type'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
            {ACTIVITY_CATEGORIES.map(key => {
              const active = form.activityCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => set('activityCategory', key)}
                  style={{
                    padding: '6px 2px',
                    borderRadius: '10px',
                    border: active ? '2px solid #26a69a' : '1px solid var(--md-sys-color-outline-variant)',
                    background: active ? 'rgba(38,166,154,0.12)' : 'var(--md-sys-color-surface-container)',
                    color: active ? '#26a69a' : 'var(--md-sys-color-on-surface)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    fontSize: '0.62rem', fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{getActivityIcon(key)}</span>
                  {getActivityLabel(key, t)}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)', paddingTop: '0.75rem' }}>

          {/* Provider + Duration */}
          <Field icon="business" label={t('activity.provider') || 'Operator / Company'}>
            <input
              style={inputStyle}
              value={form.provider}
              onChange={e => set('provider', e.target.value)}
              placeholder={t('activity.provider_placeholder') || 'Tour company name...'}
            />
          </Field>

          <Field icon="timer" label={t('activity.duration') || 'Duration'}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                type="number" min="0" max="48"
                value={form.durationH}
                onChange={e => set('durationH', e.target.value)}
                placeholder="0"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>h</span>
              <input
                style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
                type="number" min="0" max="59"
                value={form.durationM}
                onChange={e => set('durationM', e.target.value)}
                placeholder="0"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>m</span>
            </div>
          </Field>

          {/* Meeting & Booking */}
          <Field icon="pin_drop" label={t('activity.meeting_point') || 'Meeting Point'}>
            <input style={inputStyle} value={form.meetingPoint} onChange={e => set('meetingPoint', e.target.value)}
              placeholder={t('activity.meeting_point_placeholder') || 'Collection address...'} />
          </Field>

          <Field icon="confirmation_number" label={t('activity.booking_ref') || 'Booking Reference'}>
            <input style={inputStyle} value={form.bookingRef} onChange={e => set('bookingRef', e.target.value)}
              placeholder={t('activity.booking_ref_placeholder') || 'Confirmation number...'} />
          </Field>

          <Field icon="link" label={t('activity.booking_url') || 'Booking URL'}>
            <input style={inputStyle} value={form.bookingUrl} onChange={e => set('bookingUrl', e.target.value)}
              placeholder="https://..." />
          </Field>

          {/* Contact */}
          <Field icon="person" label={t('activity.contact_person') || 'Contact Person'}>
            <input style={inputStyle} value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)}
              placeholder={t('activity.contact_person_placeholder') || 'Guide / host name...'} />
          </Field>

          <Field icon="call" label={t('activity.contact_phone') || 'Contact Phone'}>
            <input style={inputStyle} type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)}
              placeholder="+81-90-1234-5678" />
          </Field>

          {/* Group & Difficulty */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <Field icon="group" label={t('activity.group_size') || 'Group Size'}>
                <input style={{ ...inputStyle, width: '80px' }} type="number" min="1" max="999"
                  value={form.groupSize} onChange={e => set('groupSize', e.target.value)} placeholder="—" />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field icon="speed" label={t('activity.difficulty') || 'Difficulty'}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {difficultyOptions.map(d => (
                    <button key={d.key}
                      onClick={() => set('difficulty', form.difficulty === d.key ? null : d.key)}
                      style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                        border: form.difficulty === d.key ? `2px solid ${d.color}` : '1px solid var(--md-sys-color-outline-variant)',
                        background: form.difficulty === d.key ? `${d.color}18` : 'transparent',
                        color: form.difficulty === d.key ? d.color : 'var(--md-sys-color-on-surface-variant)',
                        transition: 'all 0.15s',
                      }}
                    >{d.label}</button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* Equipment */}
          <Field icon="backpack" label={t('activity.equipment') || 'What to Bring'}>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
              value={form.equipment}
              onChange={e => set('equipment', e.target.value)}
              placeholder={t('activity.equipment_placeholder') || 'Comfortable shoes, sunscreen, water bottle...'}
            />
          </Field>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            background: '#26a69a', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
          {t('common.save') || 'Save'}
        </button>
      </div>
    </div>,
    document.body
  );
});
