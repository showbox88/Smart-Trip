import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../theme';
import { formatDistance, formatDuration } from '../../utils/formatters';
import { fetchTransitAlternatives } from '../../utils/transitHelpers';
import HotelLine from './HotelLine';

function getStepIcon(step) {
  if (step.travelMode === 'WALKING') return 'directions_walk';
  const vt = (step.vehicleType || '').toUpperCase();
  if (vt === 'SUBWAY' || vt === 'METRO_RAIL') return 'directions_subway';
  if (vt.includes('BUS') || vt === 'TROLLEYBUS') return 'directions_bus';
  if (vt.includes('TRAIN') || vt === 'RAIL' || vt === 'MONORAIL') return 'train';
  if (vt === 'TRAM' || vt === 'CABLE_CAR') return 'tram';
  if (vt === 'FERRY') return 'directions_boat';
  return 'directions_transit';
}

// Compact summary of transit lines for a route: e.g. "2호선 → 3호선"
function getRouteSummary(route) {
  const transitSteps = (route.steps || []).filter(s => s.travelMode === 'TRANSIT');
  if (!transitSteps.length) return '';
  return transitSteps.map(s => s.lineName || '').filter(Boolean).join(' → ');
}

function TransitStepsPanel({ origin, dest, transit, onClose, t }) {
  const { state, dispatch } = useApp();
  const [routes, setRoutes] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!origin || !dest) {
        if (transit?.steps?.length) {
          setRoutes([transit]);
        }
        setLoading(false);
        return;
      }
      try {
        const alts = await fetchTransitAlternatives(origin, dest);
        if (cancelled) return;
        if (alts?.length) {
          setRoutes(alts);
        } else if (transit?.steps?.length) {
          setRoutes([transit]);
        }
      } catch (err) {
        console.warn('[TransitStepsPanel] fetch failed:', err);
        if (transit?.steps?.length) setRoutes([transit]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [origin, dest, transit]);

  // Dispatch selected route to map for preview
  const selectedRoute = routes?.[selectedIdx] || null;
  useEffect(() => {
    if (selectedRoute?.steps?.length) {
      dispatch({ type: 'SET_TRANSIT_PREVIEW', payload: { steps: selectedRoute.steps } });
    }
    return () => dispatch({ type: 'SET_TRANSIT_PREVIEW', payload: null });
  }, [selectedRoute, dispatch]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--md-sys-color-surface-container-lowest)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--st-color-hotel-checkin)', fontSize: '20px' }}>directions_transit</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                {t('itinerary.transit') || '公共交通'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', borderRadius: '8px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
            </button>
          </div>

          {/* Route alternatives tabs */}
          {!loading && routes && routes.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '2px' }}>
              {routes.map((route, i) => {
                const isActive = i === selectedIdx;
                const summary = getRouteSummary(route);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: isActive ? '1.5px solid var(--st-color-hotel-checkin)' : '1px solid rgba(255,255,255,0.12)',
                      background: isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                      color: isActive ? 'var(--st-color-hotel-checkin)' : 'rgba(255,255,255,0.6)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{route.durationText || formatDuration(route.duration, t)}</span>
                    {summary && <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>{summary}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>
          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '8px' }}>progress_activity</span>
              {t('common.loading') || '加载中...'}
            </div>
          ) : !selectedRoute ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
              {t('itinerary.no_route') || '无路线'}
            </div>
          ) : (
            <>
              {/* Route overview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                  {selectedRoute.durationText || formatDuration(selectedRoute.duration, t)}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  {selectedRoute.distanceText || formatDistance(selectedRoute.distance, state.settings, t)}
                </span>
                {selectedRoute.departureTime && selectedRoute.arrivalTime && (
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                    {selectedRoute.departureTime} → {selectedRoute.arrivalTime}
                  </span>
                )}
              </div>

              {/* Line summary badges */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {(selectedRoute.steps || []).filter(s => s.travelMode === 'TRANSIT').map((step, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: step.lineColor || 'var(--st-color-hotel-checkin)',
                    color: 'white', borderRadius: '6px', padding: '2px 8px',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{getStepIcon(step)}</span>
                    {step.lineName || ''}
                  </span>
                ))}
              </div>

              {/* Steps */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(selectedRoute.steps || []).map((step, i) => {
                  const isWalk = step.travelMode === 'WALKING';
                  const lineColor = step.lineColor || (isWalk ? 'var(--st-color-text-muted)' : 'var(--st-color-hotel-checkin)');
                  const icon = getStepIcon(step);
                  const isLast = i === selectedRoute.steps.length - 1;

                  return (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                      {/* Timeline */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '26px', flexShrink: 0 }}>
                        <div style={{
                          width: '26px', height: '26px', borderRadius: '50%',
                          background: isWalk ? 'rgba(255,255,255,0.06)' : lineColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: isWalk ? 'rgba(255,255,255,0.4)' : 'white' }}>
                            {icon}
                          </span>
                        </div>
                        {!isLast && (
                          <div style={{
                            width: isWalk ? '1px' : '3px',
                            flex: 1, minHeight: '20px',
                            background: isWalk ? 'rgba(255,255,255,0.08)' : lineColor,
                            borderRadius: '2px', margin: '3px 0',
                          }} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : '14px', paddingTop: '3px' }}>
                        {isWalk ? (
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                            {t('itinerary.walk') || '步行'}
                            {step.durationText ? ` ${step.durationText}` : step.duration ? ` ${Math.ceil(step.duration / 60)} min` : ''}
                            {step.distanceText ? ` (${step.distanceText})` : step.distance ? ` (${step.distance}m)` : ''}
                          </div>
                        ) : (
                          <div>
                            {/* Line badge + duration */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {step.lineName && (
                                <span style={{
                                  background: lineColor, color: 'white', borderRadius: '5px',
                                  padding: '1px 7px', fontSize: '0.76rem', fontWeight: 700,
                                }}>
                                  {step.lineName}
                                </span>
                              )}
                              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', textTransform: 'lowercase' }}>
                                {step.vehicleType?.replace(/_/g, ' ') || ''}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                                {step.durationText || (step.duration ? `${Math.ceil(step.duration / 60)} min` : '')}
                              </span>
                            </div>

                            {/* Departure → Arrival */}
                            {(step.departureStop || step.arrivalStop) && (
                              <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                                {step.departureStop && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: lineColor, flexShrink: 0 }} />
                                    <span>{step.departureStop}</span>
                                    {step.departureTime && <span style={{ opacity: 0.5, fontSize: '0.72rem' }}>{step.departureTime}</span>}
                                  </div>
                                )}
                                {step.stopCount && (
                                  <div style={{ marginLeft: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', padding: '2px 0' }}>
                                    {step.stopCount} {t('itinerary.stops') || 'stops'}
                                  </div>
                                )}
                                {step.arrivalStop && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', border: `2px solid ${lineColor}`, background: 'transparent', flexShrink: 0, boxSizing: 'border-box' }} />
                                    <span>{step.arrivalStop}</span>
                                    {step.arrivalTime && <span style={{ opacity: 0.5, fontSize: '0.72rem' }}>{step.arrivalTime}</span>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default memo(function TransitInfo({ transit, transitMode, origin, dest, onToggleMode, onAddStop, onAddNote, onAddList, onAddTransport, onAddActivity, hideAdd, inHotelStay }) {
  const { t } = useI18n();
  const { state } = useApp();
  const { layout } = useTheme();
  const isInlineTransit = layout?.transit?.display === 'inline';
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const prevModeRef = useRef(transitMode);
  const calcTimerRef = useRef(null);
  const menuRef = useRef(null);

  // 切换模式时进入 calculating 状态，避免短暂显示"无路线"
  useEffect(() => {
    if (prevModeRef.current !== transitMode) {
      prevModeRef.current = transitMode;
      setCalculating(true);
      clearTimeout(calcTimerRef.current);
      // 最多等 6 秒，超时强制结束 calculating
      calcTimerRef.current = setTimeout(() => setCalculating(false), 6000);
    }
    return () => clearTimeout(calcTimerRef.current);
  }, [transitMode]);

  // 新路线数据返回后结束 calculating
  useEffect(() => {
    if (calculating) {
      const SDK_TO_SHORT_CHK = { 'DRIVING': 'DRIVE', 'WALKING': 'WALK', 'TRANSIT': 'TRANSIT' };
      const returnedMode = SDK_TO_SHORT_CHK[transit?.mode] || transit?.mode;
      if (returnedMode === transitMode) {
        clearTimeout(calcTimerRef.current);
        setCalculating(false);
      }
    }
  }, [transit, transitMode, calculating]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  // Slide-out add menu items
  const addMenuItems = [
    { key: 'stop', icon: 'push_pin', color: '#ff4d4f', label: t('itinerary.add_stop') || 'Add Stop', action: onAddStop },
    { key: 'note', icon: 'description', color: '#8b5cf6', label: t('itinerary.add_note') || 'Add Note', action: onAddNote },
    { key: 'list', icon: 'check', color: 'var(--md-sys-color-tertiary)', label: t('itinerary.add_list') || 'Add Checklist', action: onAddList },
    { key: 'transport', icon: 'flight', color: '#4FC3F7', label: t('itinerary.add_transport') || 'Add Transport', action: onAddTransport },
    { key: 'activity', icon: 'local_activity', color: '#26a69a', label: t('activity.add_activity') || 'Add Activity', action: onAddActivity },
  ];

  const handleOpenMenu = (e) => {
    e.stopPropagation();
    setShowAddMenu(v => !v);
  };

  const hasData = transit?.duration || transit?.distance;
  // transit.mode uses SDK values ('DRIVING','WALKING','TRANSIT'), transitMode uses short form ('DRIVE','WALK','TRANSIT')
  const SDK_TO_SHORT = { 'DRIVING': 'DRIVE', 'WALKING': 'WALK', 'TRANSIT': 'TRANSIT' };
  const transitModeShort = SDK_TO_SHORT[transit?.mode] || transit?.mode;
  const effectiveMode = transitModeShort || transitMode || 'DRIVE';
  const isTransit = effectiveMode === 'TRANSIT';
  const hasSteps = isTransit && transit?.steps?.length > 0;
  const noRouteForMode = hasData && transitModeShort && transitModeShort !== (transitMode || 'DRIVE');

  if (hideAdd && !hasData) return null;

  const modeIconMap = { 'DRIVE': 'directions_car', 'WALK': 'directions_walk', 'TRANSIT': 'directions_transit' };
  const modeIcon = modeIconMap[transitMode] || modeIconMap[effectiveMode] || 'directions_car';
  const modeLabel = transitMode === 'TRANSIT'
    ? (t('itinerary.transit') || '公共交通')
    : transitMode === 'WALK'
      ? (t('itinerary.walk') || '步行')
      : (t('itinerary.drive') || '驾车');

  // ── Inline compact display for clean layout ──
  if (isInlineTransit && hasData && !calculating) {
    const modeEmoji = effectiveMode === 'WALK' ? '🚶' : effectiveMode === 'TRANSIT' ? '🚌' : '🚗';
    return (
      <div className="transit-info-row transit-inline" style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        padding: '0.25rem 0 0.25rem var(--transit-pl)',
        color: 'var(--st-color-text-muted)', fontSize: '0.78rem',
        position: 'relative',
      }}>
        {inHotelStay && <HotelLine top="0" bottom="0" />}
        <span>{modeEmoji}</span>
        {transit.duration && <span>{formatDuration(transit.duration, t)}</span>}
        {transit.distance && <span style={{ opacity: 0.6 }}>· {formatDistance(transit.distance, state.settings, t)}</span>}
        {isTransit && (hasSteps || (origin && dest)) && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '14px', cursor: 'pointer', opacity: 0.5 }}
            onClick={() => setShowSteps(true)}
          >info</span>
        )}
        {showSteps && (
          <TransitStepsPanel origin={origin} dest={dest} transit={transit} onClose={() => setShowSteps(false)} t={t} />
        )}
      </div>
    );
  }

  return (
    <div className="transit-info-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0 0.6rem var(--transit-pl)', color: 'var(--st-color-text-muted)', fontSize: '0.8rem', position: 'relative' }}>
      {inHotelStay && <HotelLine top="0" bottom="0" />}
      {!hideAdd && (
        <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button
            onClick={handleOpenMenu}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.15)',
              background: showAddMenu ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: 'var(--md-sys-color-on-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.3s ease, background 0.2s',
              transform: showAddMenu ? 'rotate(45deg)' : 'none',
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          </button>

          {/* Slide-out icon bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            overflow: 'hidden',
            maxWidth: showAddMenu ? `${addMenuItems.length * 42}px` : '0px',
            opacity: showAddMenu ? 1 : 0,
            transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
            marginLeft: showAddMenu ? '6px' : '0px',
          }}>
            {addMenuItems.map((item, idx) => (
              <button
                key={item.key}
                onClick={(e) => { e.stopPropagation(); item.action?.(); setShowAddMenu(false); }}
                title={item.label}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  transition: `transform 0.25s ease ${idx * 0.04}s, opacity 0.2s ease ${idx * 0.04}s`,
                  transform: showAddMenu ? 'scale(1)' : 'scale(0.5)',
                  opacity: showAddMenu ? 1 : 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode icon — always show if toggleable */}
      {onToggleMode && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '18px', cursor: 'pointer',
            color: (transitMode || 'DRIVE') === 'TRANSIT' ? 'var(--st-color-hotel-checkin)' : (transitMode === 'WALK' ? '#60a5fa' : 'var(--md-sys-color-on-surface)'),
          }}
          onClick={onToggleMode}
          title={modeLabel}
        >
          {modeIcon}
        </span>
      )}

      {calculating ? (
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>···</span>
      ) : hasData ? (
        <>
          {noRouteForMode && (
            <span style={{ color: 'var(--md-sys-color-error)', fontSize: '0.72rem' }}>
              {t('itinerary.no_route') || '无路线'}
            </span>
          )}
          <span
            onClick={(isTransit && (hasSteps || (origin && dest))) ? () => setShowSteps(true) : undefined}
            style={{ cursor: (isTransit && (hasSteps || (origin && dest))) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {transit.duration && (
              <span style={{
                textDecoration: isTransit ? 'underline dotted' : 'none',
                textUnderlineOffset: '2px',
              }}>
                {formatDuration(transit.duration, t)}
              </span>
            )}
            {transit.distance && (
              <span style={{ opacity: 0.7 }}>· {formatDistance(transit.distance, state.settings, t)}</span>
            )}
            {isTransit && (
              <span className="material-symbols-outlined" style={{ fontSize: '12px', opacity: 0.6 }}>chevron_right</span>
            )}
          </span>
        </>
      ) : onToggleMode && !calculating ? (
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
          {t('itinerary.no_route') || '无路线'}
        </span>
      ) : null}

      {showSteps && (
        <TransitStepsPanel
          origin={origin}
          dest={dest}
          transit={transit}
          onClose={() => setShowSteps(false)}
          t={t}
        />
      )}
    </div>
  );
})
