import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTrips } from '../hooks/useTrips';
import { useTripsV2 } from '../hooks/useTripsV2';
import { createDraftTrip, getDashboardTripStatus } from '../utils/tripFactory';
import { formatTripDate } from '../utils/tripEditorHelpers';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import TripGrid from '../components/dashboard/TripGrid';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import TripEditModal from '../components/modals/TripEditModal';
import ShareModal from '../components/modals/ShareModal';

export default function DashboardPage() {
  const { state } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { saveTrip } = useTrips();
  const { createTrip, linkDaysToTrip } = useTripsV2();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [sharingTrip, setSharingTrip] = useState(null);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  const allTrips = [
    ...state.trips.filter(t => !t._isVirtualDay),
    ...(state.tripsV2 || []).map(t => ({ ...t, _isV2: true })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const filteredTrips = allTrips.filter((trip) => {
    if (state.dashboardFilter === 'all' || !state.dashboardFilter) return true;
    return getDashboardTripStatus(trip) === state.dashboardFilter;
  });

  const handleTodayCheckin = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    navigate(`/day/${today}`);
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
      const newTrip = await createTrip({
        title: patch.title || t('dashboard.new_trip_default_title') || '我的新旅行',
        startDate: patch.startDate || null,
        endDate: patch.endDate || null,
        thumb: patch.thumb || null,
        settings: state.settings || {},
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
      const updated = { ...editingTrip, ...patch };

      // If startDate changed, recalculate each day's date
      if (patch.startDate && patch.startDate !== editingTrip.startDate && updated.days) {
        updated.days = updated.days.map((day, index) => ({
          ...day,
          date: formatTripDate(patch.startDate, index),
        }));
      }

      await saveTrip(updated);
      setEditingTrip(null);
    } catch (err) {
      alert(err.message);
    }
  }, [editingTrip, saveTrip]);

  return (
    <div className="trip-dashboard-container fade-in">
      <div className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {state.user?.name}{t('dashboard.title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button
            className="btn-main"
            onClick={handleTodayCheckin}
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
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

      <DashboardFilters />

      <div id="trip-grid-container">
        <TripGrid trips={filteredTrips} onAddTrip={handleAddNewTrip} onEdit={setEditingTrip} onShare={setSharingTrip} />
      </div>

      <BudgetSummary />

      {showNewTripModal && (
        <TripEditModal
          trip={{ title: '', startDate: '', endDate: '', thumb: '', status: 'planned' }}
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
