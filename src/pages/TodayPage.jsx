import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { supabase } from '../lib/supabase';
import { saveDayToDB } from '../utils/dayHelpers';
import { formatCurrency } from '../utils/formatters';
import { useGpsCheckin } from '../hooks/useGpsCheckin';
import StopCheckinCard from '../components/today/StopCheckinCard';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

function formatTodayLabel() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

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
  const [status, setStatus] = useState('loading'); // loading | ok | error

  if (!url) {
    return (
      <div style={{
        borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.1)',
        marginBottom: '1.25rem', height: '100px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#475569', fontSize: '0.78rem', gap: '6px',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>map</span>
        地图需要 VITE_GOOGLE_MAPS_KEY 且站点有坐标
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: '14px', overflow: 'hidden',
      border: '1px solid var(--md-sys-color-outline)',
      marginBottom: '1.25rem', background: '#1a1a2e',
      minHeight: status === 'error' ? '60px' : '180px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {status === 'error' ? (
        <div style={{ color: 'var(--md-sys-color-error)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
          Static Maps API 加载失败 — 请检查 Google Cloud Console 是否启用
        </div>
      ) : (
        <img
          src={url}
          alt="今日路线"
          style={{ width: '100%', display: 'block', opacity: status === 'loading' ? 0 : 1, transition: 'opacity 0.3s' }}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}

export default function TodayPage() {
  const { state } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState(null);   // { id, stops: [] }
  const [stops, setStops] = useState([]);          // location stops, sorted by time
  const [gpsToast, setGpsToast] = useState(null);  // stop object for nearby toast
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
              // Sort by time (convert to 24h for comparison)
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

    // Update local state optimistically
    setStops(prev => prev.map(s => s.id === stopId ? { ...s, ...patch } : s));

    // Load the full day stops_data, merge, and save
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

  // ── No auth ───────────────────────────────────────────────────
  if (!state.user) {
    navigate('/');
    return null;
  }

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--md-sys-color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--st-color-text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem', opacity: 0.4 }}>today</span>
          <p style={{ margin: 0 }}>加载今日行程...</p>
        </div>
      </div>
    );
  }

  // ── No trips today → redirect to lazy checkin ─────────────────
  if (!dayData || stops.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--md-sys-color-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '56px', display: 'block', marginBottom: '1rem', opacity: 0.25, color: 'var(--md-sys-color-on-surface)' }}>
            event_available
          </span>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: 'var(--md-sys-color-on-surface)' }}>今天没有行程安排</h2>
          <p style={{ color: 'var(--st-color-text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            今天还没有规划行程，可以进入随意打卡模式，随时记录你去过的地方。
          </p>
          <button
            onClick={() => navigate(`/day/${today}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '0.75rem 1.5rem', fontWeight: 800, fontSize: '0.95rem',
              cursor: 'pointer', marginBottom: '0.75rem', width: '100%',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>my_location</span>
            随意打卡模式
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: '1px solid var(--md-sys-color-outline)', color: 'var(--st-color-text-muted)',
              borderRadius: '10px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%',
            }}
          >
            返回主页
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--md-sys-color-surface)', color: 'var(--md-sys-color-on-surface)', paddingBottom: '100px' }}>

      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--md-sys-color-surface)', borderBottom: '1px solid var(--md-sys-color-outline)',
        padding: '0.75rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>今日行程</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)' }}>{formatTodayLabel()}</div>
          </div>
        </div>
        {/* Progress badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: checkedCount === totalCount && totalCount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${checkedCount === totalCount && totalCount > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '20px', padding: '4px 12px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: checkedCount === totalCount && totalCount > 0 ? 'var(--st-color-hotel-checkin)' : 'var(--st-color-category-food)' }}>
            {checkedCount === totalCount && totalCount > 0 ? 'celebration' : 'route'}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: checkedCount === totalCount && totalCount > 0 ? 'var(--st-color-hotel-checkin)' : 'var(--md-sys-color-on-surface)' }}>
            {checkedCount} / {totalCount} 站
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          width: totalCount > 0 ? `${(checkedCount / totalCount) * 100}%` : '0%',
          background: 'linear-gradient(90deg, var(--st-color-category-food), var(--st-color-hotel-checkin))',
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.25rem 1rem 0' }}>

        {/* ── Map thumbnail ── */}
        <MapThumbnail url={mapUrl} />

        {/* ── Stop list ── */}
        <div>
          {stops.map((stop) => (
            <StopCheckinCard
              key={stop.id}
              stop={stop}
              isCurrent={stop.id === currentStopId}
              dayDate={today}
              onCheckin={handleStopUpdate}
            />
          ))}
        </div>
      </div>

      {/* ── GPS nearby toast ── */}
      {gpsToast && (
        <div style={{
          position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 2000, width: 'calc(100% - 2rem)', maxWidth: '400px',
          background: '#1a1a2e', border: '1px solid rgba(249,115,22,0.5)',
          borderRadius: '14px', padding: '1rem 1.25rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          animation: 'slideUp 0.3s ease',
        }}>
          <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity:0; } to { transform: translateX(-50%) translateY(0); opacity:1; } }`}</style>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--st-color-category-food)', flexShrink: 0, marginTop: '1px' }}>near_me</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '2px' }}>
                你好像到了附近
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                background: 'var(--st-color-category-food)', color: 'white', border: 'none',
                borderRadius: '8px', padding: '6px 14px',
                fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0,
              }}
            >
              打卡
            </button>
            <button
              onClick={dismissToast}
              style={{ background: 'none', border: 'none', color: 'var(--st-color-text-muted)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom expense summary ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 95%, transparent)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--md-sys-color-outline)',
        padding: '0.75rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-tertiary)' }}>payments</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--st-color-text-muted)' }}>今日总消费</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: totalExpense > 0 ? 'var(--md-sys-color-tertiary)' : 'var(--st-color-text-muted)' }}>
          {formatCurrency(totalExpense, state.settings)}
        </div>
      </div>
    </div>
  );
}
