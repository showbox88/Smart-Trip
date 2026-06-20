import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckIn } from '../hooks/useCheckIn';
import MapPanel from '../components/itinerary/ProviderMapPanel';

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
