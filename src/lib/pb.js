import PocketBase from 'pocketbase';

/**
 * PocketBase 客户端（只读数据源模式）
 *
 * 生产 PocketBase 跑在 dashboard-server 的 127.0.0.1:8090，
 * 本机开发需要先建 SSH 隧道（见 start-pb.bat）：
 *   ssh -N -L 8090:127.0.0.1:8090 dashboard-server
 */
const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

// 多个 hook 并发拉取同一 collection 时不要互相取消请求
pb.autoCancellation(false);
