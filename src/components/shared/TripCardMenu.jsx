/**
 * TripCardMenu — shared three-dot menu for trip cards.
 * Used in both Dashboard (TripCard) and Mobile Itinerary (MobileHero).
 * Renders a ⋮ trigger + dropdown with Edit / Share / Delete.
 */

export default function TripCardMenu({
  open, onToggle, onEdit, onShare, onDelete, t,
  triggerStyle,   // override styles for the ⋮ button
  dropdownStyle,  // override position/direction of the dropdown
  triggerIcon,    // 'more_vert' (default) or 'more_horiz'
}) {
  return (
    <div style={{ position: 'relative', ...triggerStyle }}>
      <button
        className="menu-dots"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          background: 'rgba(0,0,0,.25)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: 'none', borderRadius: '50%',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
          transition: 'background 0.15s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          {triggerIcon || 'more_vert'}
        </span>
      </button>
      {open && (
        <div className="menu-dropdown" style={{
          position: 'absolute',
          top: '110%', right: 0,
          display: 'flex',
          zIndex: 100,
          ...dropdownStyle,
        }}>
          <button
            title={t('itinerary.edit_trip') || 'Edit Trip'}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
          </button>
          <button
            title={t('itinerary.share_trip') || 'Share'}
            onClick={(e) => { e.stopPropagation(); onShare(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>share</span>
          </button>
          <button
            className="danger"
            title={t('itinerary.delete_trip') || 'Delete'}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
