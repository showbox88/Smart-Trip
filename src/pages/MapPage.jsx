import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPanel from '../components/itinerary/MapPanel';

/**
 * Standalone map page — shows MapPanel in day mode (GPS location + nearby checkin).
 * Used when Map tab is clicked outside of a trip context.
 */
export default function MapPage() {
  const mapPanelRef = useRef(null);
  const navigate = useNavigate();

  // Ensure body has correct class for MapPanel visibility
  useEffect(() => {
    document.body.classList.add('mobile-mode-map');
    document.body.classList.remove('mobile-mode-plan');
    return () => {
      document.body.classList.remove('mobile-mode-map');
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--md-sys-color-surface)',
    }}>
      {/* Back button overlay */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1100,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--md-sys-color-surface-container-lowest)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--md-sys-color-on-surface)',
        }}
        aria-label="Back"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
      </button>

      {/* MapPanel in day mode — auto-locates GPS on mount */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MapPanel
          ref={mapPanelRef}
          isDayMode
          onAddToDay={() => {}}
          focusDayIds={[]}
          existingPlaceIds={[]}
        />
      </div>
    </div>
  );
}
