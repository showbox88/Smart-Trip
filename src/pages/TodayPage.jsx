import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { supabase } from '../lib/supabase';
import { saveDayToDB } from '../utils/dayHelpers';
import { formatCurrency, formatTodayLabel } from '../utils/formatters';
import { useGpsCheckin } from '../hooks/useGpsCheckin';
import StopCheckinCard from '../components/today/StopCheckinCard';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

function buildStaticMapUrl(stops, width = 680, height = 180) {
  if (!MAPS_KEY) return null;
  const locationStops = stops.filter(s => s.lat && s.lng);
  if (locationStops.length < 1) return null;

  const darkStyle = [
    'style=element:geometry|color:0x1a1a2e',
    'style=element:labels.text.fill|color:0x7a7a8a',
    'style=element:labels.text.stroke|color:0x1a1a2e',
    'style=feature:road|element:geometry|color:0x2c2c3e',
    'style=feature:water|element:geometry|color:0x0f0f1e',
    'style=feature:poi|visibility:off',
  ].join('&');

  const markers = locationStops
    .map((s, i) => `markers=color:0xff6b35|label:${i + 1}|${s.lat},${s.lng}`)
    .join('&');

  const path = `path=color:0xff6b3580|weight:3|${locationStops.map(s => `${s.lat},${s.lng}`).join('|')}`;

  return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&maptype=roadmap&${darkStyle}&${markers}&${path}&key=${MAPS_KEY}`;
}

function MapThumbnail({ url }) {
  const [status, setStatus] = useState('loading');
  const { t } = useI18n();

  if (!url) {
    return (
      <div style={{
        borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)',
        marginBottom: 16, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--st-color-text-muted)', fontSize: 12, gap: 6,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>map</span>
        {t('today.map_no_key')}
      </div>
    );
  }

  if (status === 'error') return null;

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      marginBottom: 16, background: '#1a1a2e',
      minHeight: 160,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <img
        src={url}
        alt={t('today.route_alt')}
        style={{ width: '100%', display: 'block', opacity: status === 'loading' ? 0 : 1, transition: 'opacity 0.3s' }}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

export default function TodayPage() {
  const { state } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState(null);
  const [stops, setStops] = useState([]);
  const [gpsToast, setGpsToast] = useState(null);
  const toastTimerRef = useRef(null);

  // ── Load today's day ──────────────────────────────────────────
  useEffect(() => {
    if (!state.user) return;
    setLoading(true);
    supabase
      .from('days_v2')
      .select('id, date, title, color, stops_data')
      .eq('user_id', state.user.id)
      .eq('date', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('[TodayPage] load failed:', error.message);
        if (data) {
          setDayData({ id: data.id, date: data.date, color: data.color });
          const raw = Array.isArray(data.stops_data) ? data.stops_data : [];
          const locationStops = raw
            .filter(s => !s.type || s.type === 'location' || s.type === 'hotel_checkin' || s.type === 'hotel_checkout')
            .sort((a, b) => {
              const toMins = (s) => {
                if (!s.time) return 9999;
                const [h, m] = s.time.split(':').map(Number);
                const h24 = s.period === 'PM' && h !== 12 ? h + 12 : s.period === 'AM' && h === 12 ? 0 : h;
                return h24 * 60 + (m || 0);
              };
              return toMins(a) - toMins(b);
            });
          setStops(locationStops);
        } else {
          setDayData(null);
          setStops([]);
        }
        setLoading(false);
      });
  }, [state.user, today]);

  // ── Persist stop update back to DB ────────────────────────────
  const handleStopUpdate = useCallback(async (stopId, patch) => {
    if (!dayData) return;
    setStops(prev => prev.map(s => s.id === stopId ? { ...s, ...patch } : s));

    const { data } = await supabase
      .from('days_v2')
      .select('stops_data')
      .eq('id', dayData.id)
      .single();

    const allStops = (Array.isArray(data?.stops_data) ? data.stops_data : []).map(s =>
      s.id === stopId ? { ...s, ...patch } : s
    );

    saveDayToDB(state.user.id, {
      id: dayData.id,
      date: dayData.date,
      color: dayData.color,
      stops: allStops,
    }).catch(err => console.warn('[TodayPage] save failed:', err));
  }, [dayData, state.user]);

  // ── GPS proximity notifications ───────────────────────────────
  const handleNearby = useCallback((stop) => {
    clearTimeout(toastTimerRef.current);
    setGpsToast(stop);
    toastTimerRef.current = setTimeout(() => setGpsToast(null), 10000);
  }, []);

  useGpsCheckin({ stops, onNearby: handleNearby, radiusMeters: 100 });

  const dismissToast = () => {
    clearTimeout(toastTimerRef.current);
    setGpsToast(null);
  };

  const checkedCount = stops.filter(s => s.checkedIn).length;
  const totalCount = stops.length;
  const currentStopId = stops.find(s => !s.checkedIn)?.id;
  const totalExpense = stops.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const mapUrl = buildStaticMapUrl(stops);
  const allDone = checkedCount === totalCount && totalCount > 0;

  if (!state.user) { navigate('/'); return null; }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--md-sys-color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--st-color-text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.3 }}>today</span>
          <p style={{ margin: 0, fontSize: 14 }}>{t('dashboard.loading_today') || "Loading today's schedule..."}</p>
        </div>
      </div>
    );
  }

  // ── No trips today ────────────────────────────────────────────
  if (!dayData || stops.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--md-sys-color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 52, display: 'block', marginBottom: 16, opacity: 0.2, color: 'var(--md-sys-color-on-surface)' }}>
            event_available
          </span>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--md-sys-color-on-surface)', letterSpacing: '-.3px' }}>{t('today.no_schedule_title')}</h2>
          <p style={{ color: 'var(--st-color-text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {t('today.no_schedule_desc')}
          </p>
          <button
            onClick={() => navigate(`/day/${today}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', background: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)', border: 'none', borderRadius: 14,
              padding: '14px 0', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>my_location</span>
            {t('today.free_checkin')}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', background: 'none',
              border: '1px solid rgba(255,255,255,.08)', color: 'var(--st-color-text-muted)',
              borderRadius: 12, padding: '12px 0', cursor: 'pointer', fontSize: 14,
            }}
          >
            {t('today.back_home')}
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--md-sys-color-surface)',
        padding: '14px 20px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', color: 'var(--md-sys-color-primary)', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.3px', lineHeight: 1.2 }}>
                {t('dashboard.today_schedule') || "Today's Schedule"}
              </div>
              <div style={{ fontSize: 12, color: 'var(--st-color-text-muted)', marginTop: 2 }}>{formatTodayLabel()}</div>
            </div>
          </div>

          {/* Progress pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: allDone ? 'rgba(34,197,94,0.1)' : 'var(--md-sys-color-surface-container)',
            borderRadius: 20, padding: '5px 12px',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 14,
              color: allDone ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-primary)',
              fontVariationSettings: "'FILL' 1",
            }}>
              {allDone ? 'check_circle' : 'route'}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 600, letterSpacing: '-.2px',
              color: allDone ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-on-surface)',
            }}>
              {t('today.stops_progress').replace('{checked}', checkedCount).replace('{total}', totalCount)}
            </span>
          </div>
        </div>

        {/* Thin progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,.04)', borderRadius: 2, marginTop: 12 }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: totalCount > 0 ? `${(checkedCount / totalCount) * 100}%` : '0%',
            background: allDone ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-primary)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 0' }}>

        <MapThumbnail url={mapUrl} />

        {/* Stop list */}
        {stops.map((stop) => (
          <StopCheckinCard
            key={stop.id}
            stop={stop}
            isCurrent={stop.id === currentStopId}
            dayDate={today}
            onCheckin={handleStopUpdate}
          />
        ))}

        {/* Expense summary */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--md-sys-color-surface-container)',
          borderRadius: 14, padding: '12px 16px', marginTop: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--md-sys-color-tertiary)' }}>payments</span>
            <span style={{ fontSize: 13, color: 'var(--st-color-text-muted)', fontWeight: 500 }}>{t('today.total_expense')}</span>
          </div>
          <span style={{
            fontWeight: 700, fontSize: 17, letterSpacing: '-.3px',
            color: totalExpense > 0 ? 'var(--md-sys-color-tertiary)' : 'var(--st-color-text-muted)',
          }}>
            {formatCurrency(totalExpense, state.settings)}
          </span>
        </div>

        {/* Check-in CTA */}
        <button
          onClick={() => navigate(`/day/${today}`)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', marginTop: 12, marginBottom: 80,
            padding: '14px 0',
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
            border: 'none', borderRadius: 14,
            fontWeight: 600, fontSize: 15, letterSpacing: '-.2px',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>my_location</span>
          {t('dashboard.today_checkin') || 'Check In'}
        </button>
      </div>

      {/* ── GPS nearby toast ── */}
      {gpsToast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, width: 'calc(100% - 2rem)', maxWidth: 400,
          background: 'var(--md-sys-color-surface-container)',
          border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 16, padding: '14px 16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.3s ease',
        }}>
          <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--md-sys-color-primary)', flexShrink: 0 }}>near_me</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {t('today.nearby_toast_title')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--st-color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {gpsToast.location || gpsToast.name}
              </div>
            </div>
            <button
              onClick={() => {
                const now = new Date();
                const h = now.getHours(), m = now.getMinutes();
                const period = h >= 12 ? 'PM' : 'AM';
                const dh = h % 12 || 12;
                const timeStr = `${String(dh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                handleStopUpdate(gpsToast.id, { checkedIn: true, time: timeStr, period, checkinTime: timeStr });
                dismissToast();
              }}
              style={{
                background: 'var(--md-sys-color-primary)', color: 'var(--md-sys-color-on-primary)',
                border: 'none', borderRadius: 10, padding: '7px 14px',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {t('today.checkin_btn')}
            </button>
            <button
              onClick={dismissToast}
              style={{ background: 'none', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
