import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTrips } from '../hooks/useTrips';
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
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [sharingTrip, setSharingTrip] = useState(null);

  const filteredTrips = state.trips.filter((trip) => {
    if (state.dashboardFilter === 'all' || !state.dashboardFilter) return true;
    return getDashboardTripStatus(trip) === state.dashboardFilter;
  });

  const handleTodayCheckin = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    navigate(`/day/${today}`);
  }, [navigate]);

  const handleAddNewTrip = useCallback(async (e) => {
    if (e) e.stopPropagation();
    if (isCreating) return;

    setIsCreating(true);
    console.log('[DashboardPage] Starting new trip creation...');

    try {
      const newTrip = createDraftTrip(state.settings, t);
      await saveTrip(newTrip);
      console.log('[DashboardPage] Trip created:', newTrip.id);
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error('[DashboardPage] add trip failed:', err);
      alert('鍒涘缓鏃呰澶辫触锛岃閲嶈瘯');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, state.settings, t, saveTrip, navigate]);

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
            className="btn-secondary"
            onClick={handleTodayCheckin}
            title={t('dashboard.today_checkin') || '今日打卡'}
          >
            <span className="material-symbols-outlined">my_location</span>
            <span>{t('dashboard.today_checkin') || '今日打卡'}</span>
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
