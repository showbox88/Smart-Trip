import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';

export default function DashboardFilters() {
  const { state, dispatch } = useApp();
  const { t } = useI18n();

  const filters = [
    { key: 'all', label: t('dashboard.filter_all') },
    { key: 'ongoing', label: t('dashboard.filter_ongoing') },
    { key: 'planned', label: t('dashboard.filter_planned') },
    { key: 'completed', label: t('dashboard.filter_completed') },
  ];

  return (
    <div className="dashboard-filters">
      {state.dashboardView !== 'calendar' && state.dashboardView !== 'album' && (
        <div className="filter-tabs" id="dashboard-filter-tabs">
          {filters.map(f => (
            <button
              key={f.key}
              className={`filter-tab${state.dashboardFilter === f.key ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_DASHBOARD_FILTER', payload: f.key })}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      <div className="view-toggles" id="dashboard-view-toggles">
        <button
          className={`view-icon${state.dashboardView === 'grid' || !state.dashboardView ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_DASHBOARD_VIEW', payload: 'grid' })}
        >
          <span className="material-symbols-outlined">grid_view</span>
        </button>
        <button
          className={`view-icon${state.dashboardView === 'list' ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_DASHBOARD_VIEW', payload: 'list' })}
        >
          <span className="material-symbols-outlined">list</span>
        </button>
        <button
          className={`view-icon${state.dashboardView === 'calendar' ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_DASHBOARD_VIEW', payload: 'calendar' })}
          title={t('calendar.title') || 'Calendar'}
        >
          <span className="material-symbols-outlined">calendar_month</span>
        </button>
        <button
          className={`view-icon${state.dashboardView === 'album' ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_DASHBOARD_VIEW', payload: 'album' })}
          title={t('dashboard.view_album') || 'Album Mode'}
        >
          <span className="material-symbols-outlined">collections</span>
        </button>
      </div>
    </div>
  );
}
