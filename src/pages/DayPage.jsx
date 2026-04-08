import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import { useCheckIn } from '../hooks/useCheckIn';
import ItineraryView from '../components/itinerary/ItineraryView';
import MapPanel from '../components/itinerary/MapPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * DayPage — 单天行程页面
 *
 * 使用 useCheckIn(date) 复用通用打卡逻辑。
 * 桌面端：仅显示时间线
 * 手机端：时间线 ↔ 地图切换
 */
export default function DayPage() {
  const { date } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobileView, setMobileView] = useState('timeline');
  const [mapMounted, setMapMounted] = useState(false);
  const mapPanelRef = useRef(null);

  // 切换视图时同步 body class，防止 CSS 规则 "body.mobile-mode-plan .map-view { display:none }" 把地图隐藏
  const switchView = useCallback((view) => {
    setMobileView(view);
    if (view === 'map') {
      setMapMounted(true);
      document.body.classList.add('mobile-mode-map');
      document.body.classList.remove('mobile-mode-plan');
    } else {
      document.body.classList.remove('mobile-mode-map');
    }
  }, []);

  const { virtualTripId, dayId, loading, existingPlaceIds, handleAddToDay } = useCheckIn(date);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (loading) {
    return <LoadingSpinner message={t('common.loading') || '加载中...'} />;
  }

  // ── 桌面端：只显示时间线 ──
  if (!isMobile) {
    return <ItineraryView tripId={virtualTripId} isDayMode date={date} />;
  }

  // ── 手机端：时间线 ↔ 地图切换 ──
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: 'var(--md-sys-color-surface)' }}>

      {/* 顶部栏 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '10px 12px', paddingTop: 'max(10px, env(safe-area-inset-top))',
        background: 'var(--md-sys-color-surface)',
        borderBottom: '1px solid var(--md-sys-color-outline-variant)',
        zIndex: 1100, flexShrink: 0,
      }}>
        {/* 返回 */}
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'var(--md-sys-color-surface-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--md-sys-color-on-surface)', flexShrink: 0,
          }}
          aria-label="Back"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>

        {/* 日期 */}
        <div style={{ flex: 1, fontWeight: 700, fontSize: '1rem', color: 'var(--md-sys-color-on-surface)' }}>
          {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
        </div>

        {/* 视图切换 */}
        <div style={{
          display: 'flex', background: 'var(--md-sys-color-surface-container)',
          borderRadius: '10px', padding: '3px', gap: '2px',
        }}>
          {[
            { key: 'timeline', icon: 'view_timeline' },
            { key: 'map',      icon: 'map' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => switchView(v.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 32, borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: mobileView === v.key ? 'var(--md-sys-color-primary)' : 'transparent',
                color: mobileView === v.key ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
                transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{v.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* 时间线 */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'auto',
          display: mobileView === 'timeline' ? 'block' : 'none',
        }}>
          <ItineraryView tripId={virtualTripId} isDayMode date={date} />
        </div>

        {/* 地图（懒挂载） */}
        {mapMounted && (
          <div style={{
            position: 'absolute', inset: 0,
            display: mobileView === 'map' ? 'flex' : 'none',
            flexDirection: 'column',
          }}>
            <MapPanel
              ref={mapPanelRef}
              isDayMode
              onAddToDay={handleAddToDay}
              focusDayIds={[]}
              dayId={dayId}
              existingPlaceIds={existingPlaceIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}
