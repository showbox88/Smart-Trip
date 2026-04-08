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

  // Refresh v2 trips with stop counts whenever dashboard mounts
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
      // 手机屏幕小，直接进入地图选址 check-in 页面
      navigate('/map');
    } else {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
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
      // 新架构：创建纯元数据 trip，不含 trip_data
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

      // 将已有 days_v2 记录归入此行程
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

  return (
    <div className="trip-dashboard-container fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {state.user?.name}{t('dashboard.title')}
          </h2>
          <p style={{ color: 'var(--st-color-text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            className="btn-main"
            onClick={handleTodayCheckin}
            style={{ background: 'linear-gradient(135deg, var(--st-color-category-food), #ea580c)' }}
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
      </div>

      {/* Today's schedule entry card */}
      <div
        onClick={() => navigate('/today')}
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.12))'}
        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--st-color-category-food), #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>today</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--md-sys-color-on-surface)' }}>{t('dashboard.today_schedule') || "Today's Schedule"}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--st-color-text-muted)', marginTop: '1px' }}>
              {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--st-color-category-food)' }}>chevron_right</span>
      </div>

      <DashboardFilters />

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
