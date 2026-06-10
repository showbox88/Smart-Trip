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
    await syncDayStopsToPb(day.date, day.stops || []);
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
