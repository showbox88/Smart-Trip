import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckIn } from '../hooks/useCheckIn';
import MapPanel from '../components/itinerary/MapPanel';

/**
 * MapPage — 独立地图打卡页（今日打卡）
 * 使用 useCheckIn(today) 复用通用打卡逻辑
 */
export default function MapPage() {
  const mapPanelRef = useRef(null);
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const { dayId, existingPlaceIds, handleAddToDay } = useCheckIn(today);

  useEffect(() => {
    document.body.classList.add('mobile-mode-map');
    document.body.classList.remove('mobile-mode-plan');
    return () => document.body.classList.remove('mobile-mode-map');
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      background: 'var(--md-sys-color-surface)',
    }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1100,
          width: 38, height: 38, borderRadius: '50%', border: 'none',
          background: 'var(--md-sys-color-surface-container-lowest)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--md-sys-color-on-surface)',
        }}
        aria-label="Back"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
      </button>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MapPanel
          ref={mapPanelRef}
          isDayMode
          onAddToDay={handleAddToDay}
          focusDayIds={[]}
          dayId={dayId}
          existingPlaceIds={existingPlaceIds}
        />
      </div>
    </div>
  );
}
