import ArchiveApp from '../archive/App';
import '../archive/index.css';
import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function ArchivePage() {
  const { state } = useApp();

  // Add a class to body to let Tailwind/Archive know it's in full-page mode
  useEffect(() => {
    document.body.classList.add('archive-mode');
    return () => {
      document.body.classList.remove('archive-mode');
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--background)' }}>
      <button 
        onClick={() => window.history.back()} 
        style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10000, background: 'rgba(20, 24, 38, 0.7)', color: 'white', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(20, 24, 38, 0.9)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(20, 24, 38, 0.7)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        Back to Smart Trip
      </button>
      <ArchiveApp smartTrips={state.trips || []} currentUser={state.user} />
    </div>
  );
}
