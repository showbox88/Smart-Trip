import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useNearbyRecommend } from '../../hooks/useNearbyRecommend';
import PlanBCard from './PlanBCard';
import PlanBSearchBar from './PlanBSearchBar';

const MAX_ALTERNATIVES = 4;

/**
 * PlanBPanel — Slide-out panel showing Plan B alternatives for a stop.
 *
 * Layout (always both sections visible):
 *   ┌─ Header: stop name + close ─┐
 *   │ ── My Alternatives ──       │
 *   │  Search bar (if < 4)        │
 *   │  PlanBCard × 0-4            │
 *   │ ── Nearby Recommendations ──│
 *   │  PlanBCard × N              │
 *   └─ Undo toast (after swap) ───┘
 */
export default memo(function PlanBPanel({
  stop,
  dayId,
  open,
  onClose,
  onSwap,
  onAddAlternative,
  onRemoveAlternative,
}) {
  const { t } = useI18n();
  const { recommendations, loading: recLoading, fetchNearby } = useNearbyRecommend();

  const [undoData, setUndoData] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const alternatives = stop?.planB || [];
  const canAddMore = alternatives.length < MAX_ALTERNATIVES;

  // Fetch nearby recommendations when panel opens
  useEffect(() => {
    if (open && stop?.lat && stop?.lng) {
      fetchNearby({ lat: stop.lat, lng: stop.lng, category: stop.category });
    }
  }, [open, stop?.lat, stop?.lng, stop?.category, fetchNearby]);

  // Clear undo on unmount
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  const handleSwap = useCallback((altId) => {
    const alt = alternatives.find(a => a.id === altId);
    if (!alt) return;

    // Store undo data
    setUndoData({ stopName: stop.location, altName: alt.location, altId });
    const timer = setTimeout(() => setUndoData(null), 5000);
    setUndoTimer(timer);

    onSwap?.(dayId, stop.id, altId);
  }, [alternatives, stop, dayId, onSwap]);

  const handleUndo = useCallback(() => {
    if (!undoData) return;
    // The "undo" is just swapping back — the original stop is now in planB
    // We find the original stop (now an alt) and swap it back
    // After a swap, the original stop's placeId should be in planB
    // Actually we can just re-swap using the alt that replaced the original
    // The newly created alt (from the original stop) has the stop's old data
    // We need to find it — it's the alt whose location matches the old stop name
    // Simplest: just swap with the alt that was just created
    // The alt that replaced the original is in the current planB list
    const currentAlts = stop?.planB || [];
    const originalInPlanB = currentAlts.find(a => a.location === undoData.stopName);
    if (originalInPlanB) {
      onSwap?.(dayId, stop.id, originalInPlanB.id);
    }
    setUndoData(null);
    if (undoTimer) clearTimeout(undoTimer);
  }, [undoData, undoTimer, stop, dayId, onSwap]);

  const handleAddFromSearch = useCallback((placeId) => {
    if (!canAddMore) return;
    onAddAlternative?.(dayId, stop.id, placeId);
  }, [canAddMore, dayId, stop?.id, onAddAlternative]);

  const handleAddFromRecommendation = useCallback((place) => {
    if (!canAddMore) return;
    // Add recommended place as an alternative (needs full place details fetch)
    onAddAlternative?.(dayId, stop.id, place.placeId);
  }, [canAddMore, dayId, stop?.id, onAddAlternative]);

  const handleRemove = useCallback((altId) => {
    onRemoveAlternative?.(dayId, stop.id, altId);
  }, [dayId, stop?.id, onRemoveAlternative]);

  if (!open) return null;

  // Filter out recommendations that are already in planB or are the current stop
  const filteredRecs = recommendations.filter(r => {
    if (r.placeId === stop?.placeId) return false;
    if (alternatives.some(a => a.placeId === r.placeId)) return false;
    return true;
  });

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="planb-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="planb-panel">
        {/* Header */}
        <div className="planb-header">
          <h3>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--md-sys-color-primary)' }}>alt_route</span>
            Plan B
          </h3>
          <button className="planb-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Current stop label */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--md-sys-color-surface-container-low)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-on-surface-variant)' }}>location_on</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
            {stop?.location}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', marginLeft: 'auto' }}>
            {t('planb.current') || 'Current'}
          </span>
        </div>

        {/* Scrollable body */}
        <div className="planb-body">

          {/* ── Section: My Alternatives ── */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="planb-section-title">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>bookmark</span>
              {t('planb.my_alternatives') || 'My Alternatives'}
            </div>
            <span className="planb-limit-badge">{alternatives.length}/{MAX_ALTERNATIVES}</span>
          </div>

          {/* Search bar (if can add more) */}
          {canAddMore && (
            <PlanBSearchBar
              onSelect={handleAddFromSearch}
              disabled={!canAddMore}
            />
          )}

          {/* Saved alternatives */}
          {alternatives.length > 0 ? (
            alternatives.map(alt => (
              <PlanBCard
                key={alt.id}
                place={alt}
                mode="saved"
                onSwap={handleSwap}
                onRemove={handleRemove}
              />
            ))
          ) : (
            <div className="planb-empty">
              <div className="planb-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>bookmark_border</span>
              </div>
              <div className="planb-empty-text">
                {t('planb.empty_hint') || 'Search above to add alternative places'}
              </div>
            </div>
          )}

          <div className="planb-divider" />

          {/* ── Section: Nearby Recommendations ── */}
          <div className="planb-section-title">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>explore</span>
            {t('planb.nearby_recommendations') || 'Nearby Recommendations'}
          </div>

          {recLoading ? (
            <div className="planb-loading">
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
              {t('common.loading') || 'Loading...'}
            </div>
          ) : filteredRecs.length > 0 ? (
            filteredRecs.map(rec => (
              <PlanBCard
                key={rec.placeId}
                place={rec}
                mode="recommendation"
                onAdd={handleAddFromRecommendation}
              />
            ))
          ) : (
            <div className="planb-empty" style={{ padding: '1rem' }}>
              <div className="planb-empty-text" style={{ fontSize: '0.78rem' }}>
                {t('planb.no_recommendations') || 'No nearby recommendations found'}
              </div>
            </div>
          )}
        </div>

        {/* Undo toast */}
        {undoData && (
          <div className="planb-undo-toast">
            <span>
              {t('planb.swapped_to') || 'Swapped to'} {undoData.altName}
            </span>
            <button className="planb-undo-btn" onClick={handleUndo}>
              {t('planb.undo') || 'Undo'}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
});
