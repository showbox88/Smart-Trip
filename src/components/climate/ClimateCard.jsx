import { memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { formatTemp } from '../../utils/formatters';
import { getClothingSuggestion } from '../../utils/climateApi';

/**
 * ClimateCard — displays historical climate info for a destination city.
 *
 * Props:
 *   cityName     - display name
 *   climateData  - { avgHigh, avgLow, avgPrecipMm, rainyDays, tripDays, yearsAnalyzed }
 *   compact      - smaller variant for TripEditModal preview
 */
export default memo(function ClimateCard({ cityName, climateData, compact = false }) {
  const { t } = useI18n();
  const { state } = useApp();

  if (!climateData) return null;

  const { avgHigh, avgLow, avgPrecipMm, rainyDays, yearsAnalyzed } = climateData;
  const clothing = getClothingSuggestion(avgHigh, t);

  if (compact) {
    return (
      <div style={{
        padding: '0.75rem 1rem',
        borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
        border: '1px solid var(--md-sys-color-outline-variant)',
        background: 'var(--md-sys-color-surface-container-low)',
        minWidth: '200px',
        flex: '1 1 200px',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--md-sys-color-primary)' }}>thermostat</span>
          {cityName}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatTemp(avgHigh, state.settings)}</span>
            /
            <span style={{ color: '#3b82f6', fontWeight: 700 }}>{formatTemp(avgLow, state.settings)}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
            {avgPrecipMm}mm
          </span>
          {rainyDays > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>umbrella</span>
              ~{rainyDays}{t('climate.days_suffix') || 'd'}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>checkroom</span>
          {clothing}
        </div>
      </div>
    );
  }

  // Full-size card for TripHeader
  return (
    <div style={{
      padding: '1rem 1.25rem',
      borderRadius: 'var(--md-sys-shape-corner-large, 16px)',
      border: '1px solid var(--md-sys-color-outline-variant)',
      background: 'var(--md-sys-color-surface-container-low)',
      flex: '1 1 260px',
      minWidth: '240px',
    }}>
      {/* City name */}
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-primary)' }}>thermostat</span>
        {cityName}
      </div>

      {/* Temperature row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ef4444' }}>arrow_upward</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{formatTemp(avgHigh, state.settings)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#3b82f6' }}>arrow_downward</span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>{formatTemp(avgLow, state.settings)}</span>
        </div>
      </div>

      {/* Precipitation row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '0.5rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>water_drop</span>
          {t('climate.precipitation') || 'Rainfall'}: {avgPrecipMm}mm/{t('climate.per_day') || 'day'}
        </span>
        {rainyDays > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>umbrella</span>
            ~{rainyDays} {t('climate.rainy_days') || 'rainy days'}
          </span>
        )}
      </div>

      {/* Clothing suggestion */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0.45rem 0.75rem',
        borderRadius: '8px',
        background: 'var(--md-sys-color-primary-container)',
        color: 'var(--md-sys-color-on-primary-container)',
        fontSize: '0.78rem',
        fontWeight: 600,
        marginBottom: '0.4rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>checkroom</span>
        {clothing}
      </div>

      {/* Source note */}
      <div style={{ fontSize: '0.68rem', color: 'var(--md-sys-color-on-surface-variant)', opacity: 0.7, textAlign: 'right' }}>
        {t('climate.based_on_history') || `Based on ${yearsAnalyzed}-year average`}
      </div>
    </div>
  );
});
