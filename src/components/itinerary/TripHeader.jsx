import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { formatCurrency, calculateDays, isCountableStop, formatDateShort } from '../../utils/formatters';
import ClimateCard from '../climate/ClimateCard';
import { useClimateData } from '../../hooks/useClimateData';
import { getIsTouch } from '../../hooks/useDeviceType';

/** true when device is touch + portrait — updates on orientation change */
function usePortraitTouch() {
  const [is, setIs] = useState(() => getIsTouch() && window.innerHeight > window.innerWidth);
  useEffect(() => {
    const update = () => setIs(getIsTouch() && window.innerHeight > window.innerWidth);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, []);
  return is;
}

function formatCheckinDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (isNaN(d)) return dateStr;
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const full = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return { weekday, full };
}

export default function TripHeader({ trip, onDeleteTrip, onEditTrip, onShareTrip, onShowSchedule, isDayMode = false, viewMode, setViewMode }) {
  const { t } = useI18n();
  const { state } = useApp();
  const { layoutVariant, themeId } = useTheme();
  const isClean = layoutVariant === 'clean';
  const isBlossom = themeId === 'blossom';
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showClimate, setShowClimate] = useState(false);
  const menuRef = useRef(null);
  const isPortraitTouch = usePortraitTouch();

  const renderMapToggle = () => {
    if (!isPortraitTouch || isDayMode || !setViewMode) return null;
    const isMap = viewMode === 'map';
    return (
      <button
        onClick={() => setViewMode(isMap ? 'plan' : 'map')}
        style={{
          background: isMap ? 'var(--md-sys-color-primary)' : (isBlossom ? 'rgba(131,75,88,0.08)' : 'rgba(255,255,255,0.06)'),
          border: `1px solid ${isMap ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline)'}`,
          borderRadius: '10px',
          color: isMap ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface-variant)',
          padding: '5px 10px',
          display: 'flex', alignItems: 'center', gap: '4px',
          cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        title={isMap ? (t('common.itinerary') || 'Itinerary') : (t('common.map') || 'Map')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {isMap ? 'event_note' : 'map'}
        </span>
        <span>{isMap ? (t('common.itinerary') || 'Plan') : (t('common.map') || 'Map')}</span>
      </button>
    );
  };

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
      return sum + (isNaN(p) || p <= 0 ? 0 : p);
    }, 0);
  }, 0) || 0;

  const dayCount = calculateDays(trip?.startDate, trip?.endDate);
  const stopCount = trip?.days?.reduce((acc, day) => acc + (day.stops || []).filter(isCountableStop).length, 0) || 0;

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
            <button title={t('itinerary.view_budget') || 'Budget'} onClick={() => { navigate(`/budget/${trip.id}`); setShowMenu(false); }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
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
        {/* blossom CSS loaded via src/styles/blossom.css */}
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
              {/* 标题 — 独占一行 */}
              <h2 className="blossom-header-title">
                {isDayMode
                  ? (() => { const d = formatCheckinDate(trip.startDate); return d.weekday; })()
                  : trip.title
                }
              </h2>

              {/* 日期 — 独占一行 */}
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

              {/* 底部行：天数 chip（左）+ 预算（右）*/}
              {(!isDayMode && dayCount > 0) || totalCost > 0 ? (
                <div className="blossom-header-bottom">
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
              ) : null}
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

          {/* Map/Plan toggle — portrait touch only */}
          {renderMapToggle()}

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
        {renderMapToggle()}
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
          {renderMapToggle()}
          {!isDayMode && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button className="menu-dots" onClick={() => setShowMenu(v => !v)} style={{ position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}>⋮</button>
              {showMenu && (
                <div className="menu-dropdown active" style={{ top: '2rem', right: 0 }}>
                  <button title={t('itinerary.today_schedule') || 'Today\'s Schedule'} onClick={() => { onShowSchedule?.(); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>today</span>
                  </button>
                  <button title={t('itinerary.view_budget') || 'Budget'} onClick={() => { navigate(`/budget/${trip.id}`); setShowMenu(false); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
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

/* Blossom Trip Header CSS moved to src/styles/blossom.css */
