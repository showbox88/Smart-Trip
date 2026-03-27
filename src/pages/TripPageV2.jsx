import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDays } from '../hooks/useDays';
import { useTripsV2 } from '../hooks/useTripsV2';
import { useI18n } from '../context/I18nContext';
import { saveDayToDB } from '../utils/dayHelpers';
import { DEFAULT_DAY_COLORS } from '../utils/tripEditorHelpers';
import ItineraryView from '../components/itinerary/ItineraryView';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * TripPageV2 — v2 行程页面入口
 *
 * 策略：
 * 1. 从 trip_days -> days_v2 加载该行程所有关联的天
 * 2. 按日期填充空白天（trip 日期范围内没有 days_v2 记录的天，也显示为空 day）
 * 3. 把整个结构包装成 virtual trip 注入 AppContext，复用所有现有 UI
 * 4. 监听 AppContext 变化，将修改写回 days_v2
 */
export default function TripPageV2() {
  const { tripId } = useParams();
  const { state, dispatch } = useApp();
  const { getOrCreateDay, loadDaysForTrip } = useDays();
  const { loadTrip } = useTripsV2();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [virtualTripId] = useState(() => `v2-trip-${tripId}`);
  const tripMetaRef = useRef(null); // 保存 trip 元数据

  useEffect(() => {
    if (!state.user) return;

    const init = async () => {
      setLoading(true);
      try {
        // 1. 加载 trip 元数据 + 关联 days
        const result = await loadTrip(tripId);
        if (!result?.trip) {
          console.error('[TripPageV2] Trip not found:', tripId);
          navigate('/');
          return;
        }

        const { trip: tripMeta, days: linkedDays } = result;
        tripMetaRef.current = tripMeta;

        // 2. 根据日期范围生成完整的天列表
        //    已有 days_v2 记录的天用真实数据，没有的天用空 day（懒创建，用户操作时才写库）
        const allDays = await buildDaysList(tripMeta, linkedDays, state.user.id, getOrCreateDay);

        // 3. 包装成 virtual trip 注入 AppContext
        const virtualTrip = buildVirtualTrip(virtualTripId, tripMeta, allDays);
        dispatch({ type: 'UPDATE_TRIP', payload: virtualTrip });
        dispatch({ type: 'SET_ACTIVE_TRIP', payload: virtualTripId });
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      dispatch({ type: 'SET_ACTIVE_TRIP', payload: null });
    };
  }, [tripId, state.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听 virtual trip 变化，把每天的 stops 写回 days_v2
  useEffect(() => {
    const virtualTrip = state.trips.find(t => t.id === virtualTripId);
    if (!virtualTrip || loading) return;

    // 对每一天做持久化（只在 stops 有变动时）
    virtualTrip.days?.forEach(async (day) => {
      if (!day._dayId) return; // 没有 _dayId 说明是空白占位天，还未真实创建
      try {
        await saveDayToDB(state.user.id, {
          id: day._dayId,
          date: day.date,
          title: day.title,
          color: day.color,
          stops: day.stops || [],
        });
      } catch (err) {
        console.warn('[TripPageV2] saveDayToDB failed for', day.date, err);
      }
    });
  }, [state.trips, virtualTripId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <LoadingSpinner message={t('common.loading') || '加载中...'} />;
  }

  return <ItineraryView tripId={virtualTripId} />;
}

// ── 内部工具 ────────────────────────────────────────────

/**
 * 根据 trip 的日期范围生成完整 days 列表：
 * - 已关联 days_v2 记录 → 用真实数据
 * - 日期范围内没有记录 → 用空 day（_dayId: null，操作时懒创建）
 */
async function buildDaysList(tripMeta, linkedDays, userId, getOrCreateDay) {
  const { startDate, endDate } = tripMeta;

  // 如果 trip 没有设置日期范围，直接用已关联的 days（按日期排序）
  if (!startDate || !endDate) {
    return linkedDays.map((day, i) => normalizeDayForTrip(day, i));
  }

  // 生成日期范围内的每一天
  const start = new Date(startDate.replace(/-/g, '/'));
  const end = new Date(endDate.replace(/-/g, '/'));
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  // 按日期建索引
  const daysByDate = {};
  linkedDays.forEach(day => { daysByDate[day.date] = day; });

  const result = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const existingDay = daysByDate[date];
    if (existingDay) {
      result.push(normalizeDayForTrip(existingDay, i));
    } else {
      // 空白占位天：_dayId 为 null，等用户操作时才真实创建
      result.push({
        id: `placeholder-${date}`,
        _dayId: null,
        _isPlaceholder: true,
        date,
        title: null,
        color: DEFAULT_DAY_COLORS[i % DEFAULT_DAY_COLORS.length],
        stops: [],
      });
    }
  }

  return result;
}

/**
 * 将 days_v2 的 day 对象标准化为 virtual trip 内的 day 格式
 * 保留 _dayId 供写回时使用
 */
function normalizeDayForTrip(day, index) {
  return {
    id: day.id,        // useTripEditor 用这个做 key
    _dayId: day.id,    // 写回 days_v2 时用
    date: day.date,
    title: day.title || null,
    color: day.color || DEFAULT_DAY_COLORS[index % DEFAULT_DAY_COLORS.length],
    stops: day.stops || [],
  };
}

/**
 * 把 trip 元数据 + days 组装成 virtual trip，注入 AppContext
 */
function buildVirtualTrip(virtualTripId, tripMeta, days) {
  return {
    id: virtualTripId,
    _isV2: true,
    _isVirtualTrip: true,  // Exclude from dashboard listing
    _realTripId: tripMeta.id,
    title: tripMeta.title || '',
    thumb: tripMeta.thumb || null,
    startDate: tripMeta.startDate || null,
    endDate: tripMeta.endDate || null,
    settings: tripMeta.settings || {},
    share_token: tripMeta.share_token || null,
    days,
    activeDayId: days[0]?.id || null,
  };
}
