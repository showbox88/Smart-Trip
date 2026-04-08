import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { formatCurrency, calculateDays } from '../../utils/formatters';
import ClimateCard from '../climate/ClimateCard';
import { useClimateData } from '../../hooks/useClimateData';

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCheckinDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const full = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return { weekday, full };
}

export default function TripHeader({ trip, onDeleteTrip, onEditTrip, onShareTrip, onShowSchedule, isDayMode = false }) {
  const { t } = useI18n();
  const { state } = useApp();
  const { layoutVariant, themeId } = useTheme();
  const isClean = layoutVariant === 'clean';
  const isBlossom = themeId === 'blossom';
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showClimate, setShowClimate] = useState(false);
  const menuRef = useRef(null);

  // Merge manually-added destinations with stop-derived cities (dedup by name)
  const allDestinations = useMemo(() => {
    const manual = trip?.settings?.destinations || [];
    const fromStops = trip?.citiesWithCoords || [];
    const seen = new Set(manual.map(d => d.name));
    const merged = [...manual];
    for (const c of fromStops) {
      if (!seen.has(c.name)) {
        merged.push(c);
        seen.add(c.name);
      }
    }
    return merged;
  }, [trip?.settings?.destinations, trip?.citiesWithCoords]);

  const { climateByCity, loading: climateLoading } = useClimateData(
    allDestinations, trip?.startDate, trip?.endDate
  );
  const hasClimateData = !climateLoading && Object.keys(climateByCity).length > 0;

  const totalCost = trip?.days?.reduce((acc, day) => {
    return acc + (day.stops || []).reduce((sum, stop) => {
      const p = parseFloat(stop.price);
      return sum + (isNaN(p) ? 0 : p);
    }, 0);
  }, 0) || 0;

  const dayCount = calculateDays(trip?.startDate, trip?.endDate);
  const stopCount = trip?.days?.reduce((acc, day) => acc + (day.stops || []).length, 0) || 0;

  useEffect(() => {
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  if (!trip) return null;

  // ── Menu dropdown (shared between all layouts) ──
  const renderMenu = () => {
    if (isDayMode) return null;
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{
            background: isBlossom ? 'rgba(131,75,88,0.08)' : 'none',
            border: 'none', cursor: 'pointer',
            color: isBlossom ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)',
            padding: '6px',
            borderRadius: isBlossom ? '10px' : '8px',
            display: 'flex', alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>more_vert</span>
        </button>
        {showMenu && (
          <div className="menu-dropdown active" style={{ top: '2rem', right: 0 }}>
            <button title={t('itinerary.today_schedule') || 'Today\'s Schedule'} onClick={() => { onShowSchedule?.(); setShowMenu(false); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>today</span>
            </button>
            <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={() => { onEditTrip?.(); setShowMenu(false); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
            </button>
            <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={() => { onShareTrip?.(); setShowMenu(false); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
            </button>
            <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={() => { onDeleteTrip?.(trip.id); setShowMenu(false); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════
  //  BLOSSOM LAYOUT — Daily Summary Card style
  // ══════════════════════════════════════════════
  if (isClean && isBlossom) {
    return (
      <>
        <style>{blossomHeaderCSS}</style>
        <div className="blossom-trip-header" id="trip-header-bar">
          {/* Back button */}
          <button className="blossom-header-back" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          {/* Main info card */}
          <div className="blossom-header-card">
            {/* Decorative flower */}
            <div className="blossom-header-decor">
              <span className="material-symbols-outlined" style={{ fontSize: '5rem' }}>filter_vintage</span>
            </div>

            <div className="blossom-header-info">
              <div className="blossom-header-left">
                <h2 className="blossom-header-title">
                  {isDayMode
                    ? (() => { const d = formatCheckinDate(trip.startDate); return d.weekday; })()
                    : trip.title
                  }
                </h2>
                <p className="blossom-header-meta">
                  {isDayMode ? (
                    formatCheckinDate(trip.startDate)?.full
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: -2 }}>location_on</span>
                      {formatDateShort(trip.startDate)} — {formatDateShort(trip.endDate)}
                    </>
                  )}
                </p>
              </div>

              <div className="blossom-header-right">
                {!isDayMode && dayCount > 0 && (
                  <div className="blossom-header-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                    {dayCount} {t('itinerary.days') || 'days'}
                  </div>
                )}
                {totalCost > 0 && (
                  <div className="blossom-header-budget">
                    <span className="blossom-budget-label">{isDayMode ? "Today's Budget" : 'Budget'}</span>
                    <div className="blossom-budget-pill">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_vintage</span>
                      <span className="blossom-budget-value">{formatCurrency(totalCost, state.settings)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Climate toggle */}
          {allDestinations.length > 0 && trip?.startDate && trip?.endDate && (
            <button
              onClick={() => setShowClimate(v => !v)}
              style={{
                background: showClimate ? 'rgba(131,75,88,0.12)' : 'rgba(131,75,88,0.05)',
                border: 'none', cursor: 'pointer',
                color: 'var(--md-sys-color-primary)',
                padding: '6px',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center',
                transition: 'background 0.2s',
              }}
              title={t('climate.climate_info') || 'Climate Info'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>thermostat</span>
            </button>
          )}

          {/* Menu */}
          {renderMenu()}
        </div>

        {/* Climate collapsible section */}
        {showClimate && allDestinations.length > 0 && (
          <div style={{
            padding: '0.5rem 1rem 0.75rem',
            display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
            animation: 'climateSlideDown 0.25s ease-out',
          }}>
            {climateLoading ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                {t('climate.loading') || 'Loading climate data...'}
              </div>
            ) : hasClimateData ? (
              allDestinations.map(dest => (
                climateByCity[dest.name] && (
                  <ClimateCard
                    key={dest.placeId || dest.name}
                    cityName={dest.name}
                    climateData={climateByCity[dest.name]}
                    compact
                  />
                )
              ))
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', padding: '0.25rem 0' }}>
                {t('climate.no_dates') || 'Set dates to see climate info'}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  // ══════════════════════════════════════════════
  //  CLEAN LAYOUT (non-Blossom)
  // ══════════════════════════════════════════════
  if (isClean) {
    return (
      <div
        className="itinerary-header itinerary-header--clean"
        id="trip-header-bar"
        style={{
          padding: '0.75rem 1rem',
          background: 'var(--md-sys-color-surface)',
          borderBottom: '1px solid var(--md-sys-color-outline-variant)',
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--md-sys-color-on-surface)', padding: '4px',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isDayMode ? (() => { const d = formatCheckinDate(trip.startDate); return d.weekday; })() : trip.title}
        </h2>
        {renderMenu()}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  //  DEFAULT (Glass) LAYOUT
  // ══════════════════════════════════════════════
  return (
    <div
      className="itinerary-header"
      id="trip-header-bar"
      style={{ padding: '0.75rem 1.5rem', background: 'var(--md-sys-color-surface)', borderBottom: '1px solid var(--md-sys-color-outline)', position: 'sticky', top: 0, zIndex: 100 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isDayMode ? (
            <div>
              {(() => {
                const dateInfo = formatCheckinDate(trip.startDate);
                return (
                  <>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>{dateInfo.weekday}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.82rem' }}>{dateInfo.full}</span>
                      {totalCost > 0 && (
                        <span className="header-badge">{formatCurrency(totalCost, state.settings)}</span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '56px', height: '56px', borderRadius: '12px',
                  background: trip.thumb ? `url(${trip.thumb}) center/cover no-repeat` : 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--md-sys-color-outline)',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                }}
              >
                {!trip.thumb && <span className="material-symbols-outlined" style={{ opacity: 0.2 }}>image</span>}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>{trip.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.82rem' }}>
                    {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
                  </span>
                  {dayCount > 0 && <span className="header-badge">{dayCount} {t('itinerary.days') || 'days'}</span>}
                  {totalCost > 0 && <span className="header-badge">{formatCurrency(totalCost, state.settings)}</span>}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {allDestinations.length > 0 && trip?.startDate && trip?.endDate && !isDayMode && (
            <button
              onClick={() => setShowClimate(v => !v)}
              style={{
                background: showClimate ? 'rgba(var(--md-sys-color-primary-rgb, 103,80,164), 0.12)' : 'none',
                border: 'none', cursor: 'pointer',
                color: 'var(--md-sys-color-on-surface-variant)',
                padding: '6px', borderRadius: '8px',
                display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
              title={t('climate.climate_info') || 'Climate Info'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>thermostat</span>
            </button>
          )}
          {!isDayMode && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button className="menu-dots" onClick={() => setShowMenu(v => !v)} style={{ position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}>⋮</button>
              {showMenu && (
                <div className="menu-dropdown active" style={{ top: '2rem', right: 0 }}>
                  <button title={t('itinerary.today_schedule') || 'Today\'s Schedule'} onClick={() => { onShowSchedule?.(); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>today</span>
                  </button>
                  <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={() => { onEditTrip?.(); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                  </button>
                  <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={() => { onShareTrip?.(); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
                  </button>
                  <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={() => { onDeleteTrip?.(trip.id); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Climate collapsible section */}
      {showClimate && allDestinations.length > 0 && (
        <div style={{
          padding: '0.5rem 1.5rem 0.75rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
          borderTop: '1px solid var(--md-sys-color-outline-variant)',
        }}>
          {climateLoading ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>progress_activity</span>
              {t('climate.loading') || 'Loading climate data...'}
            </div>
          ) : hasClimateData ? (
            allDestinations.map(dest => (
              climateByCity[dest.name] && (
                <ClimateCard
                  key={dest.placeId || dest.name}
                  cityName={dest.name}
                  climateData={climateByCity[dest.name]}
                  compact
                />
              )
            ))
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--md-sys-color-on-surface-variant)', padding: '0.25rem 0' }}>
              {t('climate.no_dates') || 'Set dates to see climate info'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 *  Blossom Trip Header — Scoped CSS
 * ──────────────────────────────────────────────────────────── */
const blossomHeaderCSS = `
  .blossom-trip-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
  }

  .blossom-header-back {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--md-sys-color-primary);
    padding: 6px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    transition: background 0.2s;
  }
  .blossom-header-back:hover {
    background: rgba(131, 75, 88, 0.08);
  }

  .blossom-header-card {
    flex: 1;
    position: relative;
    overflow: visible;
    background: var(--md-sys-color-surface-container-lowest);
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    box-shadow: 0 12px 24px rgba(131, 75, 88, 0.05);
    border-left: 6px solid var(--md-sys-color-primary-container);
    min-width: 0;
  }

  .blossom-header-decor {
    position: absolute;
    top: -10px;
    right: -10px;
    opacity: 0.08;
    color: var(--md-sys-color-primary);
    pointer-events: none;
  }

  .blossom-header-info {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
  }

  .blossom-header-left { flex: 1; min-width: 0; }

  .blossom-header-title {
    font-family: var(--md-sys-typescale-headline-font);
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--md-sys-color-primary);
    margin: 0;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .blossom-header-meta {
    margin: 0.2rem 0 0;
    font-size: 0.82rem;
    color: var(--md-sys-color-on-surface-variant);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .blossom-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .blossom-header-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-low);
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
  }

  .blossom-header-budget {
    text-align: right;
  }

  .blossom-budget-label {
    display: block;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--md-sys-color-primary);
    margin-bottom: 0.15rem;
  }

  .blossom-budget-pill {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(254, 182, 196, 0.2);
    padding: 0.3rem 0.75rem;
    border-radius: 9999px;
    color: var(--md-sys-color-primary);
  }

  .blossom-budget-value {
    font-family: var(--md-sys-typescale-headline-font);
    font-weight: 700;
    font-size: 0.9rem;
  }

  @keyframes climateSlideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 600px) {
    .blossom-header-title { font-size: 1.1rem; }
    .blossom-header-card { padding: 0.6rem 0.75rem; border-left-width: 4px; }
    .blossom-header-info {
      flex-direction: column;
      align-items: stretch;
      gap: 0.35rem;
    }
    .blossom-header-left { flex: none; min-width: 0; }
    .blossom-header-meta { font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .blossom-header-right {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      width: 100%;
    }
    .blossom-header-budget { text-align: right; }
    .blossom-budget-label { font-size: 0.5rem; }
    .blossom-budget-pill { padding: 0.2rem 0.5rem; }
    .blossom-budget-value { font-size: 0.78rem; }
    .blossom-header-badge { font-size: 0.65rem; padding: 0.15rem 0.45rem; }
    .blossom-header-decor { font-size: 3rem; top: -6px; right: -6px; }
  }
`;
