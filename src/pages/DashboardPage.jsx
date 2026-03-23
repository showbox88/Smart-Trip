import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useTrips } from '../hooks/useTrips';
import { formatDate, pad } from '../utils/formatters';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import TripGrid from '../components/dashboard/TripGrid';
import BudgetSummary from '../components/dashboard/BudgetSummary';
import TripEditModal from '../components/modals/TripEditModal';

function getStatusKey(trip) {
  const today = new Date().toISOString().split('T')[0];
  if (trip.status) return trip.status;
  if (today >= trip.startDate && today <= trip.endDate) return 'ongoing';
  if (today < trip.startDate) return 'planned';
  return 'completed';
}

export default function DashboardPage() {
  const { state } = useApp();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { saveTrip } = useTrips();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const filteredTrips = state.trips.filter(trip => {
    if (state.dashboardFilter === 'all' || !state.dashboardFilter) return true;
    return getStatusKey(trip) === state.dashboardFilter;
  });

  const handleAddNewTrip = useCallback(async (e) => {
    if (e) e.stopPropagation();
    if (isCreating) return;
    setIsCreating(true);
    console.log('[DashboardPage] Starting new trip creation...');
    try {
      const newTripId = 't-' + Date.now() + Math.random().toString(36).substr(2, 4);
      const today = new Date();
      const endDay = new Date(today);
      endDay.setDate(today.getDate() + 5);

      const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      const endStr = `${endDay.getFullYear()}-${pad(endDay.getMonth() + 1)}-${pad(endDay.getDate())}`;

      const newTrip = {
        id: newTripId,
        title: t('dashboard.new_trip_default_title') || '我的新旅行',
        startDate: startStr,
        endDate: endStr,
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        status: "planned",
        days: [],
        settings: { ...state.settings }
      };

      const numDays = 6;
      for (let i = 0; i < numDays; i++) {
        const d = new Date(startStr.replace(/-/g, '/'));
        d.setDate(d.getDate() + i);
        const dateStr = !isNaN(d) ? formatDate(startStr, i, state.settings) : t('itinerary.unknown_date');
        const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

        newTrip.days.push({
          id: `day-${Date.now()}-${i}`,
          title: `${t('itinerary.day_label') || '第'}${i + 1}${t('itinerary.day_suffix') || '天'}`,
          date: dateStr,
          stops: [],
          color: defaultColors[i % defaultColors.length]
        });
      }

      if (newTrip.days.length > 0) {
        newTrip.activeDayId = newTrip.days[0].id;
      }

      await saveTrip(newTrip);
      console.log('[DashboardPage] Trip created:', newTripId);
      navigate(`/trip/${newTripId}`);
    } catch (err) {
      console.error('[DashboardPage] add trip failed:', err);
      alert('创建旅行失败，请重试');
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, state.settings, t, saveTrip, navigate]);

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
        <TripGrid trips={filteredTrips} onAddTrip={handleAddNewTrip} onEdit={(trip) => setEditingTrip(trip)} />
      </div>

      <BudgetSummary />

      {editingTrip && (
        <TripEditModal 
          trip={editingTrip} 
          onSave={async (patch) => {
            try {
              const updated = { ...editingTrip, ...patch };
              await saveTrip(updated);
              setEditingTrip(null);
            } catch (err) {
              alert(err.message);
            }
          }}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </div>
  );
}
