import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useBudgetReport } from '../hooks/useBudgetReport';
import BudgetSummaryCard from '../components/budget/BudgetSummaryCard';
import CategoryRow from '../components/budget/CategoryRow';
import SpendDonut from '../components/budget/SpendDonut';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function BudgetPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const { t } = useI18n();
  const { report, loading, error } = useBudgetReport(tripId);

  const trip = (state.tripsV2 || []).find(x => x.id === tripId);
  const settings = state.settings;

  if (loading) return <LoadingSpinner message={t('budget.loading')} />;
  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', color: 'var(--st-color-text-muted)' }}>
        {t('budget.load_error')}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto', padding: '16px 14px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} className="menu-dots" style={{
          background: 'var(--md-sys-color-surface-container-high)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--md-sys-color-on-surface)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip?.title || t('budget.title')}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)' }}>{t('budget.subtitle')}</div>
        </div>
      </div>

      <BudgetSummaryCard report={report} settings={settings} t={t} />
      <SpendDonut report={report} settings={settings} t={t} />
      <div>
        {report.categories.map(row => (
          <CategoryRow key={row.category} row={row} settings={settings} t={t} />
        ))}
      </div>
    </div>
  );
}
