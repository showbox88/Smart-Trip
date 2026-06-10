import { createPortal } from 'react-dom';
import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { getCategoryMaterialIcon as getCategoryIcon } from '../../utils/categoryHelpers';
import { uploadToSupabase } from '../../utils/uploadHelpers';
import TimePickerModal from '../modals/TimePickerModal';
import ExpenseModal from '../modals/ExpenseModal';

export default function StopCheckinCard({ stop, isCurrent, dayDate, onCheckin }) {
  const { state } = useApp();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许连续选择同一文件
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadToSupabase(file, 'trip-media', { dir: `stops/${stop.id}` });
      onCheckin(stop.id, { photo: url });
    } catch (err) {
      console.error('[StopCheckinCard] photo upload failed:', err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const price = parseFloat(stop.price) || 0;
  const hotelBadge =
    stop.type === 'hotel_checkin' ? { label: 'Check-in', color: 'var(--st-color-hotel-checkin)' } :
    stop.type === 'hotel_checkout' ? { label: 'Check-out', color: 'var(--st-color-status-soon)' } : null;

  const navUrl = stop.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}${stop.placeId ? `&destination_place_id=${stop.placeId}` : ''}`
    : null;

  const handleCheckin = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const timeStr = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onCheckin(stop.id, { checkedIn: true, time: timeStr, period, checkinTime: timeStr });
  };

  /* ── Status indicator icon ── */
  const statusIcon = stop.checkedIn
    ? { icon: 'check_circle', color: 'var(--st-color-hotel-checkin)', fill: true }
    : isCurrent
      ? { icon: 'circle', color: 'var(--md-sys-color-primary)', fill: true }
      : { icon: 'circle', color: 'rgba(255,255,255,.15)', fill: false };

  return (
    <>
      <div style={{
        background: 'var(--md-sys-color-surface-container)',
        borderRadius: 16,
        padding: '14px 14px 12px',
        marginBottom: 10,
        transition: 'all 0.2s',
        ...(isCurrent && !stop.checkedIn ? { boxShadow: '0 0 0 1.5px var(--md-sys-color-primary)' } : {}),
      }}>
        {/* ── Top: status + name + rating + photo ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Status dot */}
          <div style={{ paddingTop: 2, flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 20, color: statusIcon.color,
              fontVariationSettings: statusIcon.fill ? "'FILL' 1" : "'FILL' 0",
            }}>{statusIcon.icon}</span>
          </div>

          {/* Name + address */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 14, color: 'var(--md-sys-color-primary)',
                fontVariationSettings: "'FILL' 1", flexShrink: 0,
              }}>{getCategoryIcon(stop)}</span>
              <span style={{
                fontWeight: 600, fontSize: 15, letterSpacing: '-.2px',
                color: stop.checkedIn ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-on-surface)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {stop.location || stop.name || 'Unnamed'}
              </span>
              {hotelBadge && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: hotelBadge.color,
                  background: `${hotelBadge.color}15`, borderRadius: 4, padding: '1px 6px',
                }}>{hotelBadge.label}</span>
              )}
              {stop.rating && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <span style={{ color: '#FFD60A', fontSize: 11 }}>★</span>
                  <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: 12, fontWeight: 600 }}>{stop.rating}</span>
                </span>
              )}
            </div>

            {stop.address && (
              <p style={{
                margin: '4px 0 0', color: 'var(--st-color-text-muted)', fontSize: 12, lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{stop.address}</p>
            )}
          </div>

          {/* Thumbnail — 点击上传/更换照片（手机会弹相机/相册选择） */}
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            title={stop.photo ? 'Change photo' : 'Add photo'}
            style={{
              width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
              padding: 0, cursor: uploading ? 'wait' : 'pointer',
              border: stop.photo ? 'none' : '1px dashed rgba(255,255,255,0.18)',
              background: stop.photo ? 'transparent' : 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: uploading ? 0.5 : stop.checkedIn && stop.photo ? 0.6 : 1,
            }}
          >
            {stop.photo ? (
              <img src={stop.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="material-symbols-outlined" style={{
                fontSize: 20, color: 'var(--st-color-text-muted)',
              }}>{uploading ? 'hourglass_top' : 'add_a_photo'}</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoFile}
          />
        </div>

        {/* ── Bottom: action buttons ── */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 10,
          paddingLeft: 30, /* align with text above */
        }}>
          {/* Time */}
          <button onClick={() => setShowTimePicker(true)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'rgba(255,255,255,.04)', border: 'none', borderRadius: 8,
            padding: '7px 0', cursor: 'pointer',
            color: stop.checkedIn ? 'var(--st-color-hotel-checkin)' : stop.time ? 'var(--md-sys-color-on-surface)' : 'var(--st-color-text-muted)',
            fontSize: 12, fontWeight: 500,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            {stop.time ? `${stop.time}` : '--:--'}
          </button>

          {/* Expense */}
          <button onClick={() => setShowExpense(true)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'rgba(255,255,255,.04)', border: 'none', borderRadius: 8,
            padding: '7px 0', cursor: 'pointer',
            color: price > 0 ? 'var(--md-sys-color-tertiary)' : 'var(--st-color-text-muted)',
            fontSize: 12, fontWeight: 500,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
            {price > 0 ? formatCurrency(price, state.settings) : '$0'}
          </button>

          {/* Navigate */}
          {navUrl ? (
            <a href={navUrl} target="_blank" rel="noreferrer" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'rgba(59,130,246,.08)', border: 'none', borderRadius: 8,
              padding: '7px 0', textDecoration: 'none',
              color: 'var(--md-sys-color-primary)', fontSize: 12, fontWeight: 500,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>near_me</span>
            </a>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'rgba(255,255,255,.02)', borderRadius: 8,
              padding: '7px 0',
              color: 'rgba(255,255,255,.12)', fontSize: 12, fontWeight: 500,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>near_me</span>
            </div>
          )}

          {/* Check-in */}
          {stop.checkedIn ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'rgba(34,197,94,.08)', borderRadius: 8,
              padding: '7px 0',
              color: 'var(--st-color-hotel-checkin)', fontSize: 12, fontWeight: 600,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          ) : (
            <button onClick={handleCheckin} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: isCurrent ? 'var(--md-sys-color-primary)' : 'rgba(59,130,246,.08)',
              border: 'none', borderRadius: 8,
              padding: '7px 0', cursor: 'pointer',
              color: isCurrent ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-primary)',
              fontSize: 12, fontWeight: 600,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>where_to_vote</span>
            </button>
          )}
        </div>
      </div>

      {showTimePicker && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
          <TimePickerModal
            stop={stop}
            dayDate={dayDate}
            onSave={(patch) => {
              onCheckin(stop.id, { ...patch, checkedIn: stop.checkedIn, checkinTime: patch.time });
              setShowTimePicker(false);
            }}
            onClose={() => setShowTimePicker(false)}
          />
        </div>,
        document.body
      )}

      {showExpense && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
          <ExpenseModal
            stop={stop}
            onSave={(patch) => {
              onCheckin(stop.id, patch);
              setShowExpense(false);
            }}
            onClose={() => setShowExpense(false)}
          />
        </div>,
        document.body
      )}
    </>
  );
}
