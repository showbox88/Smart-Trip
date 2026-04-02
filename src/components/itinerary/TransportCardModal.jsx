import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { TRANSPORT_CONFIG } from './TransportCard';

const TYPES = ['FLIGHT', 'TRAIN', 'BUS', 'SHIP'];

export default memo(function TransportCardModal({ stop, dayId, onSave, onClose }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [form, setForm] = useState({
    transportType: stop?.transportType || 'FLIGHT',
    carrier: stop?.carrier || '',
    tripNumber: stop?.tripNumber || '',
    departureTime: stop?.departureTime || '',
    departurePeriod: stop?.departurePeriod || '',
    arrivalTime: stop?.arrivalTime || '',
    arrivalPeriod: stop?.arrivalPeriod || '',
    arrivalNextDay: stop?.arrivalNextDay || false,
    note: stop?.note || '',
    attachments: stop?.attachments || [],
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFiles = async (files) => {
    if (!files?.length || !state.user?.id || !state.activeTripId) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => {
        const ext = file.name.split('.').pop();
        const name = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const path = `${state.user.id}/${state.activeTripId}/${stop.id}/attachments/${name}`;
        const { error } = await supabase.storage.from('trip-media').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('trip-media').getPublicUrl(path);
        return { type: 'image', url: data.publicUrl, name: file.name };
      }));
      set('attachments', [...form.attachments, ...uploaded]);
    } catch (e) {
      console.error('[TransportCardModal] upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    set('attachments', form.attachments.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave?.({ ...stop, ...form });
    onClose?.();
  };

  const cfg = TRANSPORT_CONFIG[form.transportType];

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
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '1.5rem',
        width: '100%',
        maxWidth: 420,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('transport.edit') || '交通信息'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          {TYPES.map(type => {
            const c = TRANSPORT_CONFIG[type];
            const active = form.transportType === type;
            return (
              <button
                key={type}
                onClick={() => set('transportType', type)}
                style={{
                  padding: '0.6rem 0.3rem',
                  borderRadius: '10px',
                  border: `2px solid ${active ? c.color : 'var(--glass-border)'}`,
                  background: active ? c.bg : 'var(--bg-primary)',
                  color: active ? c.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s',
                  fontSize: '0.75rem',
                  fontWeight: active ? 700 : 400,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* Carrier + Trip number */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('transport.carrier') || '公司/运营商'}</label>
              <input
                style={inputStyle}
                placeholder={form.transportType === 'FLIGHT' ? '国航 CA' : form.transportType === 'TRAIN' ? '高铁/动车' : form.transportType === 'SHIP' ? '渡轮公司' : '大巴公司'}
                value={form.carrier}
                onChange={e => set('carrier', e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('transport.trip_number') || (form.transportType === 'FLIGHT' ? '航班号' : '班次')}</label>
              <input
                style={inputStyle}
                placeholder={form.transportType === 'FLIGHT' ? 'CA123' : form.transportType === 'TRAIN' ? 'G1234' : '—'}
                value={form.tripNumber}
                onChange={e => set('tripNumber', e.target.value)}
              />
            </div>
          </div>

          {/* Departure + Arrival time */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('transport.departure') || '出发时间'}</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  type="time"
                  value={form.departureTime}
                  onChange={e => set('departureTime', e.target.value)}
                />
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '10px' }}>arrow_forward</span>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>{t('transport.arrival') || '到达时间'}</label>
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="time"
                value={form.arrivalTime}
                onChange={e => set('arrivalTime', e.target.value)}
              />
            </div>
          </div>

          {/* Arrival next day toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.arrivalNextDay}
              onChange={e => set('arrivalNextDay', e.target.checked)}
              style={{ accentColor: cfg.color }}
            />
            {t('transport.arrival_next_day') || '次日到达（跨天）'}
          </label>

          {/* Note */}
          <div>
            <label style={labelStyle}>{t('transport.note') || '备注（座位号、订单号等）'}</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
              placeholder={t('transport.note_placeholder') || '可选填写座位号、订单号…'}
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </div>
        </div>

        {/* Ticket photo */}
        <div>
          <label style={labelStyle}>{t('transport.ticket_photo') || '票据照片'}</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {form.attachments.map((att, idx) => (
              <div key={idx} style={{ position: 'relative', width: 64, height: 64 }}>
                <img src={att.url} alt="ticket" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                <button
                  onClick={() => removeAttachment(idx)}
                  style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>
            ))}
            <label style={{
              width: 64, height: 64, borderRadius: '8px',
              border: '1.5px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)', gap: '2px', fontSize: '0.7rem',
              opacity: uploading ? 0.5 : 1,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_photo_alternate</span>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
            </label>
            <label style={{
              width: 64, height: 64, borderRadius: '8px',
              border: '1.5px dashed var(--glass-border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)', gap: '2px', fontSize: '0.7rem',
              opacity: uploading ? 0.5 : 1,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>photo_camera</span>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} disabled={uploading} />
            </label>
            {uploading && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>上传中…</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {t('common.cancel') || '取消'}
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '0.5rem 1.4rem', borderRadius: '10px', background: cfg.color, border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {t('common.save') || '保存'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

const inputStyle = {
  width: '100%',
  padding: '0.45rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid var(--glass-border)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};
