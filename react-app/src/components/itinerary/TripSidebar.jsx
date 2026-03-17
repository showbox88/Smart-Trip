import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { useSidebarGlow } from '../../hooks/useSidebarGlow';

function formatDayDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TripSidebar({ trip, activeDayId, onAddDay, onDayClick }) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();
  const isCollapsed = state.sidebarCollapsed;
  const sidebarRef = useSidebarGlow(isCollapsed);

  const handleDayClick = (dayId) => {
    if (onDayClick) {
      onDayClick(dayId);
    } else {
      const el = document.getElementById(dayId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside ref={sidebarRef} className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className="sidebar-toggle"
        onClick={() => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !isCollapsed })}
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </div>

      <ul className="trip-navigation" id="sidebar-nav" style={{ flex: 1, marginTop: '1rem' }}>
        {(trip?.days || []).map((day, index) => {
          const activeColor = day.color || '#5b7a99';
          const suffix = t('itinerary.day_suffix');
          const dayLabel = `${t('itinerary.day_label') || 'Day'}${index + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;
          const stopsCount = (day.stops || []).filter(s => s.type === 'location' || !s.type).length;

          return (
            <li
              key={day.id}
              id={`nav-day-${day.id}`}
              className={day.id === activeDayId ? 'active' : ''}
              onClick={() => handleDayClick(day.id)}
              style={{ '--active-color': activeColor, cursor: 'pointer' }}
            >
              <div className="nav-day-main" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: '100%' }}>
                <div className="sidebar-color-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeColor, flexShrink: 0 }} />
                <span className="nav-day-short">D{index + 1}</span>
                <span className="nav-day-title" style={{ whiteSpace: 'nowrap', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{dayLabel}</span>
                <span className="nav-day-date" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: 'auto' }}>
                  {formatDayDate(day.date)}
                </span>
              </div>
              <div className="nav-day-info" style={{ paddingLeft: '20px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {stopsCount} {t('itinerary.stops_count') || 'stops'}
                </span>
              </div>
            </li>
          );
        })}

        <li className="add-day-btn" onClick={onAddDay} title={t('itinerary.add_day') || 'Add day'}>
          <span className="material-symbols-outlined">add</span>
          <span className="add-day-text">{t('itinerary.add_day') || 'Add day'}</span>
        </li>
      </ul>

      <div className="sidebar-footer">
        <div className="footer-icon" style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <span className="material-symbols-outlined">settings</span>
        </div>
      </div>
    </aside>
  );
}
