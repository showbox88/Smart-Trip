import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';

export default function BudgetSummary() {
  const { state } = useApp();
  const { t } = useI18n();
  const today = new Date().toISOString().split('T')[0];
  const trips = state.tripsV2 || [];
  const completedCount = trips.filter(tr => tr.endDate && today > tr.endDate).length;
  const cityCount = new Set(trips.flatMap(tr => tr.cities || [])).size;

  return (
    <section className="budget-summary-panel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>{t('dashboard.budget_title')}</h3>
          <p style={{ color: 'var(--st-color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t('dashboard.budget_desc_prefix')} {trips.length} {t('dashboard.budget_desc_suffix')}
          </p>
          <div className="summary-grid">
            <div className="summary-stat">
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--st-color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>{t('dashboard.stat_trips')}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{trips.length}</div>
            </div>
            <div className="summary-stat">
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--st-color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>{t('dashboard.stat_destinations')}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{cityCount}</div>
            </div>
            <div className="summary-stat">
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--st-color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>{t('dashboard.stat_completed')}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{completedCount}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
