import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useDays } from '../hooks/useDays';
import { useI18n } from '../context/I18nContext';
import ItineraryView from '../components/itinerary/ItineraryView';
import LoadingSpinner from '../components/common/LoadingSpinner';

/**
 * DayPage — 单天行程页面（v2 Day-Centric 架构入口）
 *
 * 策略：把单个 day 包装成一个"只有一天的虚拟 trip"，
 * 注入 AppContext.trips，让现有 ItineraryView 及所有 hooks 零改动地运行。
 * 存储层通过拦截 useTripEditor 的 saveTrip 调用，改写为 useDays.saveDay。
 */
export default function DayPage() {
  const { date } = useParams(); // "YYYY-MM-DD"
  const { state, dispatch } = useApp();
  const { getOrCreateDay } = useDays();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [virtualTripId] = useState(() => `day-trip-${date}`);

  useEffect(() => {
    if (!state.user) return;

    const init = async () => {
      setLoading(true);
      try {
        const day = await getOrCreateDay(date);
        if (!day) {
          console.error('[DayPage] Failed to load/create day for', date);
          navigate('/');
          return;
        }

        // 把 day 包装成虚拟 trip，注入 AppContext.trips
        const virtualTrip = buildVirtualTrip(virtualTripId, day, date);
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
  }, [date, state.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 监听虚拟 trip 的变化，同步回 days_v2（存储层拦截）
  useEffect(() => {
    const virtualTrip = state.trips.find(t => t.id === virtualTripId);
    if (!virtualTrip || loading) return;

    // 虚拟 trip 只有一天，取第一天的 stops 同步到 days_v2
    // useTripEditor 会把修改写到 AppContext（UPDATE_TRIP），
    // 这里侦测变化并实际持久化到 days_v2 表
    const day = virtualTrip.days?.[0];
    if (!day) return;

    // 触发 useDays 的保存（通过 UPSERT_DAY action 更新内存中的 days 索引）
    dispatch({
      type: 'UPSERT_DAY',
      payload: {
        id: day.id,
        user_id: state.user.id,
        date: day.date,
        title: day.title,
        color: day.color,
        stops: day.stops || [],
      },
    });
  }, [state.trips, virtualTripId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <LoadingSpinner message={t('common.loading') || '加载中...'} />;
  }

  return <ItineraryView tripId={virtualTripId} isDayMode date={date} />;
}

// ── 内部工具 ────────────────────────────────────────────

/**
 * 把 day 对象包装成"只有一天的虚拟 trip"
 * 这样 useTripEditor 和 ItineraryView 可以照常工作
 */
function buildVirtualTrip(virtualTripId, day, date) {
  return {
    id: virtualTripId,
    title: day.title || date,
    thumb: null,
    startDate: date,
    endDate: date,
    settings: {},
    share_token: null,
    _isVirtualDay: true,   // 标记，供后续逻辑识别
    _dayDate: date,
    days: [
      {
        id: day.id,
        date: day.date,
        title: day.title || null,
        color: day.color || '#5b7a99',
        stops: day.stops || [],
      },
    ],
    activeDayId: day.id,
  };
}
