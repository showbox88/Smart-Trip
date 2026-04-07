import { useState } from 'react';
import EmergencyModal from './EmergencyModal';

/**
 * Global floating SOS button — rendered in App.jsx, always visible.
 * Tap to open the full emergency info modal.
 */
export default function EmergencyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="sos-fab"
        onClick={() => setOpen(true)}
        aria-label="Emergency SOS"
        title="Emergency / SOS"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, fontWeight: 700 }}>sos</span>
      </button>

      {open && <EmergencyModal onClose={() => setOpen(false)} />}

      <style>{`
        .sos-fab {
          position: fixed;
          bottom: 90px;
          right: 16px;
          z-index: 2500;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #D32F2F, #B71C1C);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4), 0 0 0 3px rgba(211, 47, 47, 0.15);
          transition: all 0.25s ease;
          opacity: 0.8;
          animation: sos-pulse 2s ease-in-out 1;
        }
        .sos-fab:hover, .sos-fab:active {
          opacity: 1;
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(211, 47, 47, 0.5), 0 0 0 4px rgba(211, 47, 47, 0.2);
        }
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4), 0 0 0 3px rgba(211, 47, 47, 0.15); }
          50% { box-shadow: 0 4px 16px rgba(211, 47, 47, 0.4), 0 0 0 10px rgba(211, 47, 47, 0); }
        }

        /* When no bottom nav (glass layout) */
        @media (min-width: 769px) {
          .sos-fab { bottom: 24px; }
        }
      `}</style>
    </>
  );
}
