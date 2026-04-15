import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTripsV2 } from '../hooks/useTripsV2';
import { createDraftTrip, getDashboardTripStatus } from '../utils/tripFactory';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import TripGrid from '../components/dashboard/TripGrid';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import TripEditModal from '../components/modals/TripEditModal';
import ShareModal from '../components/modals/ShareModal';
import CalendarPage from './CalendarPage';

export default function DashboardPage() {
  const { state } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { createTrip, updateTrip, linkDaysToTrip, refreshTrips } = useTripsV2();

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [sharingTrip, setSharingTrip] = useState(null);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  const allTrips = (state.tripsV2 || [])
    .map(t => ({ ...t, _isV2: true }))
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const filteredTrips = allTrips.filter((trip) => {
    if (state.dashboardFilter === 'all' || !state.dashboardFilter) return true;
    return getDashboardTripStatus(trip) === state.dashboardFilter;
  });

  const handleTodayCheckin = useCallback(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      navigate('/map');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      navigate(`/day/${today}`);
    }
  }, [navigate]);

  const handleAddNewTrip = useCallback((e) => {
    if (e) e.stopPropagation();
    setShowNewTripModal(true);
  }, []);

  const handleCreateNewTrip = useCallback(async (patch) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const tripSettings = { ...(state.settings || {}) };
      if (patch._destinations?.length) {
        tripSettings.destinations = patch._destinations;
      }
      const newTrip = await createTrip({
        title: patch.title || t('dashboard.new_trip_default_title') || '我的新旅行',
        startDate: patch.startDate || null,
        endDate: patch.endDate || null,
        thumb: patch.thumb || null,
        settings: tripSettings,
      });

      if (patch._dayIdsToLink?.length) {
        try {
          await linkDaysToTrip(newTrip.id, patch._dayIdsToLink);
        } catch (err) {
          console.warn('[DashboardPage] linkDaysToTrip failed:', err);
        }
      }

      navigate(`/trip-v2/${newTrip.id}`);
    } catch (err) {
      console.error('[DashboardPage] create trip failed:', err);
      alert('创建失败，请重试');
    } finally {
      setIsCreating(false);
      setShowNewTripModal(false);
    }
  }, [isCreating, state.settings, t, createTrip, linkDaysToTrip, navigate]);

  const handleSaveEditedTrip = useCallback(async (patch) => {
    if (!editingTrip) return;
    try {
      const updatedSettings = { ...(editingTrip.settings || {}) };
      if (patch._destinations) {
        updatedSettings.destinations = patch._destinations;
      }
      if (patch.status) {
        updatedSettings.status = patch.status;
      }
      await updateTrip(editingTrip.id, {
        title: patch.title,
        startDate: patch.startDate || null,
        endDate: patch.endDate || null,
        thumb: patch.thumb,
        status: patch.status,
        settings: updatedSettings,
      });
      if (patch._dayIdsToLink?.length) {
        await linkDaysToTrip(editingTrip.id, patch._dayIdsToLink);
      }
      setEditingTrip(null);
    } catch (err) {
      alert(err.message);
    }
  }, [editingTrip, updateTrip, linkDaysToTrip]);

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="trip-dashboard-container fade-in">

      {/* ── Header ── */}
      <div className="dashboard-header" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{
            fontSize: '1.75rem', fontWeight: 700, marginBottom: 4,
            letterSpacing: '-.4px', lineHeight: 1.2,
          }}>
            {state.user?.name}{t('dashboard.title')}
          </h2>
          <p style={{ color: 'var(--st-color-text-muted)', fontSize: 13, margin: 0, fontWeight: 400 }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
      </div>

      {/* ── Action row: Check-in + New Trip ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className="btn-main"
          onClick={handleTodayCheckin}
          title={t('dashboard.today_checkin') || 'Check In'}
        >
          <span className="material-symbols-outlined">my_location</span>
          <span>Check In</span>
        </button>
        <button
          className="btn-main"
          onClick={handleAddNewTrip}
          disabled={isCreating}
        >
          <span className="material-symbols-outlined">{isCreating ? 'sync' : 'add'}</span>
          <span>{isCreating ? t('common.loading') : t('dashboard.new_trip')}</span>
        </button>
      </div>

      {/* ── Today's Schedule card ── */}
      <div
        onClick={() => navigate('/today')}
        style={{
          background: 'var(--md-sys-color-surface-container)',
          borderRadius: 14, padding: '12px 16px',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--md-sys-color-surface-container-high)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--md-sys-color-surface-container)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(59,130,246,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-primary)' }}>today</span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--md-sys-color-on-surface)' }}>
              {t('dashboard.today_schedule') || "Today's Schedule"}
            </div>
            <div style={{ fontSize: 12, color: 'var(--st-color-text-muted)', marginTop: 1 }}>{todayLabel}</div>
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--st-color-text-muted)' }}>chevron_right</span>
      </div>

      {/* ── Filters + View toggles ── */}
      <DashboardFilters />

      {/* ── Trip grid / Calendar ── */}
      <div id="trip-grid-container">
        {state.dashboardView === 'calendar' ? (
          <CalendarPage />
        ) : (
          <TripGrid trips={filteredTrips} onAddTrip={handleAddNewTrip} onEdit={setEditingTrip} onShare={setSharingTrip} />
        )}
      </div>

      <BudgetSummary />

      {showNewTripModal && (
        <TripEditModal
          trip={{ title: '', startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), thumb: '', status: 'planned' }}
          onSave={handleCreateNewTrip}
          onClose={() => setShowNewTripModal(false)}
          isCreating
        />
      )}

      {editingTrip && (
        <TripEditModal
          trip={editingTrip}
          onSave={handleSaveEditedTrip}
          onClose={() => setEditingTrip(null)}
        />
      )}

      {sharingTrip && (
        <ShareModal
          trip={sharingTrip}
          onClose={() => setSharingTrip(null)}
        />
      )}
    </div>
  );
}
