import { supabase } from '../lib/supabase';

/**
 * 将 day 对象持久化到 days_v2 表
 * 供 useTrips.saveTrip 在虚拟 day trip 模式下调用
 *
 * @param {string} userId
 * @param {object} day - { id, date, title, color, stops }
 */
export async function saveDayToDB(userId, day) {
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
