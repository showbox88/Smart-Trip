/**
 * Shared constants and components used by all compact card styles.
 */

// Shared menu button (three-dot dropdown) used by all card variants
export function MenuBtn({ menuOpen, onMenuToggle, onEdit, onShare, onDelete, onOpenBudget, trip, t, size = 22, color, bg = 'transparent', setMenuOpen }) {
  return (
    <div style={{ position: 'relative' }}>
      <button className="menu-dots" onClick={onMenuToggle} style={{
        background: bg, border: 'none', borderRadius: '50%',
        width: `${size}px`, height: `${size}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color || 'var(--md-sys-color-on-surface-variant)',
        cursor: 'pointer', fontSize: `${Math.max(14, size - 7)}px`,
        transition: 'background 0.15s',
      }}>⋮</button>
      {menuOpen && (
        <div className="menu-dropdown" style={{ right: 0, top: `${size + 4}px`, transform: 'none', zIndex: 100, display: 'flex' }}>
          <button title={t('itinerary.view_budget') || 'Budget'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenBudget?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
          </button>
          <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
          </button>
          <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
          </button>
          <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={onDelete}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

export const baseCard = {
  position: 'relative',
  cursor: 'pointer',
  overflow: 'hidden',
  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
};
