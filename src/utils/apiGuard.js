/**
 * apiGuard.js — Google API 用量保护
 * 每次 API 调用前检查开关 + 限额，超限自动切断
 */
import { supabase } from '../lib/supabase';

/** 记录一次 API 调用 */
export async function logApiCall(apiType, userId, status = 'success') {
  await supabase.from('api_logs').insert({ api_type: apiType, user_id: userId, status });
}

/**
 * 检查某类 API 是否允许调用
 * @returns {{ allowed: boolean, reason: string }}
 */
export async function checkApiAllowed(apiType, userId) {
  // 1. 读开关 + 限额配置
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [`${apiType}_enabled`, 'daily_api_limit', 'per_2min_api_limit']);

  const get = (key) => settings?.find(s => s.key === key)?.value;

  const enabled = get(`${apiType}_enabled`);
  if (enabled === false || enabled === 'false') {
    return { allowed: false, reason: 'disabled' };
  }

  const dailyLimit = Number(get('daily_api_limit') ?? 200);
  const per2minLimit = Number(get('per_2min_api_limit') ?? 20);

  // 2. 计今日成功调用次数（所有类型合计）
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

  const [{ count: dailyCount }, { count: recentCount }] = await Promise.all([
    supabase.from('api_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('created_at', startOfDay.toISOString()),
    supabase.from('api_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('created_at', twoMinAgo.toISOString()),
  ]);

  // 3. 超限 → 自动关闭开关
  if (dailyCount >= dailyLimit) {
    await supabase.from('system_settings')
      .update({ value: 'false', updated_at: new Date().toISOString() })
      .eq('key', `${apiType}_enabled`);
    await logApiCall(apiType, userId, 'blocked');
    console.warn(`[apiGuard] 日限额超限 (${dailyCount}/${dailyLimit})，已自动关闭 ${apiType}`);
    return { allowed: false, reason: 'daily_limit' };
  }

  if (recentCount >= per2minLimit) {
    await supabase.from('system_settings')
      .update({ value: 'false', updated_at: new Date().toISOString() })
      .eq('key', `${apiType}_enabled`);
    await logApiCall(apiType, userId, 'blocked');
    console.warn(`[apiGuard] 2分钟限额超限 (${recentCount}/${per2minLimit})，已自动关闭 ${apiType}`);
    return { allowed: false, reason: '2min_limit' };
  }

  return { allowed: true, reason: '' };
}
