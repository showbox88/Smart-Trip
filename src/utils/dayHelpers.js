import { supabase } from '../lib/supabase';
import { IS_PB } from '../lib/dataSource';

/**
 * 将 day 对象持久化到 days_v2 表
 * 供 useTrips.saveTrip 在虚拟 day trip 模式下调用
 *
 * PB 模式：改为差量同步——diff 出 stops 里变化的字段精准写 PB
 * （3a：打卡/照片/备注/记账），其余操作警告跳过。
 *
 * @param {string} userId
 * @param {object} day - { id, date, title, color, stops }
 */
export async function saveDayToDB(userId, day) {
  if (IS_PB) {
    const { syncDayStopsToPb } = await import('../adapters/pbWrites');
    // day._partial = stops 只是子集（TodayPage 只传 location 类），不写顺序
    await syncDayStopsToPb(day.date, day.stops || [], {
      partial: !!day._partial,
      tripId: day._tripId || '',
      dayPatch: {
        // 用 undefined 表示"不动该字段"，空串/null 表示清空
        color: day.color !== undefined ? day.color : undefined,
        title: day.title !== undefined ? day.title : undefined,
      },
    });
    return;
  }

  const { error } = await supabase
    .from('days_v2')
    .upsert({
      id: day.id,
      user_id: userId,
      date: day.date,
      title: day.title || null,
      color: day.color || '#5b7a99',
      stops_data: day.stops || [],
    });

  if (error) {
    console.error('[dayHelpers] saveDayToDB error:', error.message);
    throw error;
  }
}
