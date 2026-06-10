/**
 * 数据源开关
 *
 * 默认 supabase；用 `npm run dev:pb`（vite --mode pb，加载 .env.pb）
 * 切换到 PocketBase 只读数据源。
 */
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'supabase';
export const IS_PB = DATA_SOURCE === 'pb';
