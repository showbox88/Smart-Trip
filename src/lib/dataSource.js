/**
 * 数据源开关
 *
 * 默认 supabase；用 `npm run dev:pb`（vite --mode pb，加载 .env.pb）
 * 切换到 PocketBase 只读数据源。
 */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'supabase';
export const IS_PB = DATA_SOURCE === 'pb';

/**
 * PB 模式登录开关（计划书 D1 双开关之一，另一个是 VM 端 PB_INJECT_TOKEN）：
 * - off：跳过登录页，代理注入 token（两开关必须同步切换）
 * - on（默认）：登录页启用，走 PB 真实认证
 */
export const PB_LOGIN = import.meta.env.VITE_PB_LOGIN !== 'off';
