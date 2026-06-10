#!/usr/bin/env node
/**
 * Smat Trip — PB 模式静态服务器（部署在 dashboard-server VM 101）
 *
 * - 静态托管 vite build 产物（SPA fallback 到 index.html，BrowserRouter 需要）
 * - 把 /api/* 同源代理到本机 PocketBase (127.0.0.1:8090)，前端零 CORS
 * - 零外部依赖，node >= 18
 *
 * systemd: smat-trip.service → node /home/dev/smat-trip/server.js
 * 入口:   Tailscale Serve :8451 → http://127.0.0.1:8101
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8101', 10);
const DIST = process.env.DIST_DIR || path.join(__dirname, 'dist');
const PB_HOST = process.env.PB_HOST || '127.0.0.1';
const PB_PORT = parseInt(process.env.PB_PORT || '8090', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  // ── /api/* → PocketBase 同源代理（含 SSE 流式响应） ──
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request(
      {
        host: PB_HOST,
        port: PB_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `${PB_HOST}:${PB_PORT}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: 502, message: 'PocketBase unreachable: ' + e.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  // ── 静态文件 + SPA fallback ──
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // 防目录穿越
  const filePath = path.join(DIST, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    const target = !err && stat.isFile() ? filePath : path.join(DIST, 'index.html');
    const ext = path.extname(target).toLowerCase();
    const isIndex = target.endsWith('index.html');
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      // 带 hash 的资源永久缓存，index.html 不缓存（发版即生效）
      'cache-control': isIndex ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[smat-trip] listening on 127.0.0.1:${PORT}, dist=${DIST}, pb=${PB_HOST}:${PB_PORT}`);
});
