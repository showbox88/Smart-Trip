import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { useDays } from '../hooks/useDays';
import { useTrips } from '../hooks/useTrips';
import { useTripsV2 } from '../hooks/useTripsV2';

// ── helpers ──────────────────────────────────────────────

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const TRIP_COLORS = [
  'rgba(60,131,246,0.55)',
  'rgba(255,140,66,0.55)',
  'rgba(139,92,246,0.55)',
  'rgba(16,185,129,0.55)',
  'rgba(239,68,68,0.55)',
  'rgba(236,72,153,0.55)',
  'rgba(245,158,11,0.55)',
  'rgba(6,182,212,0.55)',
];

function tripColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return TRIP_COLORS[Math.abs(h) % TRIP_COLORS.length];
}

// solid version for legend/bar
function tripColorSolid(id) {
  return tripColor(id).replace('0.55)', '0.85)');
}

// ── CalendarPage ─────────────────────────────────────────

export default function CalendarPage() {
  const { state } = useApp();
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { loadDaysInRange, days } = useDays();
  const { refreshTrips: refreshV1 } = useTrips();
  const { refreshTrips: refreshV2 } = useTripsV2();

  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // ── load data ──
  useEffect(() => {
    refreshV1();
    refreshV2();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // load days for visible range
  useEffect(() => {
    if (!state.user) return;
    let start, end;
    if (viewMode === 'month') {
      const first = new Date(currentDate.year, currentDate.month, 1);
      const last = new Date(currentDate.year, currentDate.month + 1, 0);
      start = fmt(startOfWeek(first));
      end = fmt(addDays(startOfWeek(addDays(last, 6)), 6)); // cover last partial week
    } else {
      start = `${currentDate.year}-01-01`;
      end = `${currentDate.year}-12-31`;
    }
    loadDaysInRange(start, end);
  }, [state.user, viewMode, currentDate, loadDaysInRange]);

  // ── merge trips (V1 + V2) ──
  const allTrips = useMemo(() => {
    const v1 = (state.trips || [])
      .filter(t => !t._isVirtualDay && !t._isVirtualTrip && t.startDate && t.endDate)
      .map(t => ({
        id: t.id,
        title: t.title || t.trip_data?.title || '',
        startDate: t.startDate || t.trip_data?.startDate,
        endDate: t.endDate || t.trip_data?.endDate,
        _isV2: false,
      }));
    const v2 = (state.tripsV2 || [])
      .filter(t => t.startDate && t.endDate)
      .map(t => ({
        id: t.id,
        title: t.title || '',
        startDate: t.startDate,
        endDate: t.endDate,
        _isV2: true,
      }));
    return [...v1, ...v2];
  }, [state.trips, state.tripsV2]);

  // ── navigation ──
  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentDate({ year: now.getFullYear(), month: now.getMonth() });
  }, []);

  const goPrev = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'year') return { ...prev, year: prev.year - 1 };
      const m = prev.month - 1;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: m };
    });
  }, [viewMode]);

  const goNext = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'year') return { ...prev, year: prev.year + 1 };
      const m = prev.month + 1;
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: m };
    });
  }, [viewMode]);

  const handleDayClick = useCallback((dateStr) => {
    navigate(`/day/${dateStr}`);
  }, [navigate]);

  const handleTripClick = useCallback((trip) => {
    if (trip._isV2) navigate(`/trip-v2/${trip.id}`);
    else navigate(`/trip/${trip.id}`);
  }, [navigate]);

  const handleMonthClick = useCallback((month) => {
    setCurrentDate(prev => ({ ...prev, month }));
    setViewMode('month');
  }, []);

  // ── title ──
  const title = useMemo(() => {
    if (viewMode === 'year') return `${currentDate.year}`;
    const d = new Date(currentDate.year, currentDate.month);
    return d.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });
  }, [viewMode, currentDate, language]);

  return (
    <div className="calendar-page">
      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          <button className="calendar-nav-btn" onClick={goPrev}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
          </button>
          <h2>{title}</h2>
          <button className="calendar-nav-btn" onClick={goNext}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
          </button>
          <button className="calendar-today-btn" onClick={goToday}>
            {t('calendar.today') || 'Today'}
          </button>
        </div>
        <div className="calendar-view-toggle">
          <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>
            {t('calendar.month_view') || 'Month'}
          </button>
          <button className={viewMode === 'year' ? 'active' : ''} onClick={() => setViewMode('year')}>
            {t('calendar.year_view') || 'Year'}
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <MonthView
          year={currentDate.year}
          month={currentDate.month}
          days={days}
          trips={allTrips}
          language={language}
          t={t}
          onDayClick={handleDayClick}
          onTripClick={handleTripClick}
        />
      ) : (
        <YearView
          year={currentDate.year}
          days={days}
          trips={allTrips}
          language={language}
          t={t}
          onMonthClick={handleMonthClick}
          onTripClick={handleTripClick}
        />
      )}
    </div>
  );
}

// ── MonthView ────────────────────────────────────────────

function MonthView({ year, month, days, trips, language, t, onDayClick, onTripClick }) {
  // build grid dates (6 weeks max)
  const { gridDates, weeks } = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startD = startOfWeek(first);
    const dates = [];
    let d = new Date(startD);
    // always produce 6 weeks for consistent height
    while (dates.length < 42) {
      dates.push(new Date(d));
      d = addDays(d, 1);
    }
    const wks = [];
    for (let i = 0; i < dates.length; i += 7) {
      wks.push(dates.slice(i, i + 7));
    }
    return { gridDates: dates, weeks: wks };
  }, [year, month]);

  const todayStr = fmt(new Date());

  // compute trip segments per week-row
  const tripSegments = useMemo(() => {
    const segs = [];
    weeks.forEach((week, weekIdx) => {
      const wStart = fmt(week[0]);
      const wEnd = fmt(week[6]);

      // filter trips overlapping this week
      const overlapping = trips.filter(tr => tr.startDate <= wEnd && tr.endDate >= wStart);

      // greedy lane assignment
      const lanes = []; // each lane: array of { colStart, colEnd }

      overlapping.forEach(tr => {
        const clipStart = tr.startDate > wStart ? tr.startDate : wStart;
        const clipEnd = tr.endDate < wEnd ? tr.endDate : wEnd;

        const colStart = week.findIndex(d => fmt(d) >= clipStart);
        const colEndIdx = week.findIndex(d => fmt(d) >= clipEnd);
        const colEnd = colEndIdx >= 0 ? colEndIdx : 6;
        const colSpan = colEnd - colStart + 1;

        // find first lane without overlap
        let lane = -1;
        for (let l = 0; l < lanes.length; l++) {
          const hasOverlap = lanes[l].some(seg => !(colEnd < seg.colStart || colStart > seg.colEnd));
          if (!hasOverlap) { lane = l; break; }
        }
        if (lane === -1) {
          lane = lanes.length;
          lanes.push([]);
        }
        lanes[lane].push({ colStart, colEnd });

        segs.push({
          tripId: tr.id,
          trip: tr,
          weekIdx,
          lane,
          colStart,
          colSpan,
          isStart: tr.startDate >= wStart,
          isEnd: tr.endDate <= wEnd,
        });
      });
    });
    return segs;
  }, [weeks, trips]);

  // count max lanes per week (for cell min-height)
  const maxLanesPerWeek = useMemo(() => {
    const m = {};
    tripSegments.forEach(s => {
      m[s.weekIdx] = Math.max(m[s.weekIdx] || 0, s.lane + 1);
    });
    return m;
  }, [tripSegments]);

  // weekday labels
  const weekdayLabels = useMemo(() => {
    const base = new Date(2024, 0, 7); // a known Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(base, i);
      return d.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' });
    });
  }, [language]);

  return (
    <div className="calendar-month">
      <div className="calendar-weekday-row">
        {weekdayLabels.map((label, i) => (
          <div key={i} className="calendar-weekday-cell">{label}</div>
        ))}
      </div>

      {weeks.map((week, weekIdx) => {
        const weekSegs = tripSegments.filter(s => s.weekIdx === weekIdx);
        const maxLanes = maxLanesPerWeek[weekIdx] || 0;
        const extraH = Math.max(0, maxLanes) * 20;

        return (
          <div key={weekIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px', position: 'relative' }}>
            {week.map((date, colIdx) => {
              const dateStr = fmt(date);
              const isOutside = date.getMonth() !== month;
              const isToday = dateStr === todayStr;
              const dayData = days[dateStr];
              const stopCount = dayData?.stops?.length || 0;

              // trip bars that START in this cell
              const cellSegs = weekSegs.filter(s => s.colStart === colIdx);

              return (
                <div
                  key={colIdx}
                  className={`calendar-cell${isOutside ? ' outside' : ''}${isToday ? ' today' : ''}`}
                  style={{ minHeight: `${90 + extraH}px` }}
                  onClick={() => onDayClick(dateStr)}
                >
                  <div className="calendar-date-num">{date.getDate()}</div>

                  {/* stop count — right below date, left-aligned */}
                  {stopCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', marginLeft: '8px' }}>
                      <div className="calendar-cell-dot" style={{ width: '7px', height: '7px', ...(dayData?.color ? { background: dayData.color } : {}) }} />
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>location_on</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stopCount} stops</span>
                    </div>
                  )}

                  {/* trip bars */}
                  <div className="calendar-trips-area">
                    {/* spacer lanes for proper ordering */}
                    {Array.from({ length: maxLanes }, (_, laneIdx) => {
                      const seg = cellSegs.find(s => s.lane === laneIdx);
                      if (!seg) {
                        // check if another cell's bar passes through here at this lane
                        const passing = weekSegs.find(s => s.lane === laneIdx && colIdx >= s.colStart && colIdx < s.colStart + s.colSpan);
                        if (passing) return <div key={laneIdx} style={{ height: '18px', marginBottom: '2px' }} />;
                        return <div key={laneIdx} style={{ height: '18px', marginBottom: '2px' }} />;
                      }

                      // calculate width to span across cells
                      // We use percentage-based positioning
                      const widthPercent = seg.colSpan; // number of cells
                      const barClasses = ['calendar-trip-bar'];
                      if (seg.isStart) barClasses.push('start');
                      if (seg.isEnd) barClasses.push('end');

                      return (
                        <div
                          key={laneIdx}
                          className={barClasses.join(' ')}
                          style={{
                            background: tripColorSolid(seg.tripId),
                            width: widthPercent > 1 ? `calc(${widthPercent * 100}% + ${(widthPercent - 1) * 2}px)` : '100%',
                            position: widthPercent > 1 ? 'relative' : 'relative',
                            zIndex: 3,
                            marginBottom: '2px',
                          }}
                          title={seg.trip.title}
                          onClick={(e) => { e.stopPropagation(); onTripClick(seg.trip); }}
                        >
                          {seg.trip.title}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── YearView ─────────────────────────────────────────────

function YearView({ year, days, trips, language, t, onMonthClick, onTripClick }) {
  const todayStr = fmt(new Date());
  const todayDate = new Date();
  const isCurrentYear = todayDate.getFullYear() === year;

  // build trip date sets for fast lookup
  const tripDateSets = useMemo(() => {
    const map = {};
    trips.forEach(tr => {
      let d = new Date(tr.startDate + 'T00:00:00');
      const end = new Date(tr.endDate + 'T00:00:00');
      while (d <= end) {
        const ds = fmt(d);
        if (!map[ds]) map[ds] = [];
        map[ds].push(tr);
        d = addDays(d, 1);
      }
    });
    return map;
  }, [trips]);

  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <>
      <div className="calendar-year-grid">
        {months.map(m => (
          <MiniMonth
            key={m}
            year={year}
            month={m}
            days={days}
            tripDateSets={tripDateSets}
            language={language}
            isCurrent={isCurrentYear && todayDate.getMonth() === m}
            todayStr={todayStr}
            onClick={() => onMonthClick(m)}
          />
        ))}
      </div>

      {/* trip legend */}
      {trips.length > 0 && (
        <div className="calendar-trip-legend">
          {trips.map(tr => (
            <div
              key={tr.id}
              className="calendar-legend-item"
              onClick={() => onTripClick(tr)}
            >
              <div className="calendar-legend-dot" style={{ background: tripColorSolid(tr.id) }} />
              {tr.title}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                {tr.startDate} ~ {tr.endDate}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── MiniMonth ────────────────────────────────────────────

function MiniMonth({ year, month, days, tripDateSets, language, isCurrent, todayStr, onClick }) {
  const title = useMemo(() => {
    return new Date(year, month).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long' });
  }, [year, month, language]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const dim = daysInMonth(year, month);
    const startDow = first.getDay(); // 0=Sun
    const result = [];

    // empty cells before month start
    for (let i = 0; i < startDow; i++) result.push(null);
    for (let d = 1; d <= dim; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = days[dateStr];
      const hasActivity = dayData && dayData.stops && dayData.stops.length > 0;
      const tripsOnDay = tripDateSets[dateStr];
      const hasTrip = tripsOnDay && tripsOnDay.length > 0;
      result.push({ dateStr, hasActivity, hasTrip, isToday: dateStr === todayStr });
    }
    return result;
  }, [year, month, days, tripDateSets, todayStr]);

  return (
    <div className={`calendar-mini-month${isCurrent ? ' current-month' : ''}`} onClick={onClick}>
      <div className="calendar-mini-month-title">{title}</div>
      <div className="calendar-mini-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="calendar-mini-cell" />;
          let cls = 'calendar-mini-cell';
          if (cell.hasActivity && cell.hasTrip) cls += ' has-both';
          else if (cell.hasActivity) cls += ' has-activity';
          else if (cell.hasTrip) cls += ' has-trip';
          if (cell.isToday) cls += ' is-today';
          return <div key={i} className={cls} />;
        })}
      </div>
    </div>
  );
}
