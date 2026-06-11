#!/usr/bin/env node
/**
 * Smat Trip — PB 模式静态服务器（部署在 dashboard-server VM 101）
 *
 * - 静态托管 vite build 产物（SPA fallback 到 index.html，BrowserRouter 需要）
 * - 把 /api/* 同源代理到本机 PocketBase (127.0.0.1:8090)，前端零 CORS
 * - PB_INJECT_TOKEN=on 时给无 Authorization 的 /api 请求注入 PB_TOKEN（免登录模式）
 * - /media：照片存 VM 文件夹（GET 出图 + POST 原图上传，不压缩）
 * - 零外部依赖，node >= 18
 *
 * systemd: smat-trip.service → node /home/dev/smat-trip/server.js
 *          EnvironmentFile=/home/dev/smat-trip/.env (PB_TOKEN / PB_INJECT_TOKEN)
 * 入口:   Tailscale Serve :8451 → http://127.0.0.1:8101
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8101', 10);
const DIST = process.env.DIST_DIR || path.join(__dirname, 'dist');
const PB_HOST = process.env.PB_HOST || '127.0.0.1';
const PB_PORT = parseInt(process.env.PB_PORT || '8090', 10);
const MEDIA_DIR = process.env.MEDIA_DIR || path.join(__dirname, 'media');
const PB_TOKEN = process.env.PB_TOKEN || '';
const INJECT = process.env.PB_INJECT_TOKEN === 'on' && PB_TOKEN;
const MAX_UPLOAD = 25 * 1024 * 1024; // 25 MB，原图不压缩
const UI_PASSPHRASE = process.env.UI_PASSPHRASE || ''; // 用户记得住的口令；空 = 禁用 gate

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
  // 访问日志（journalctl -u smat-trip 可见），用于排查"请求到底有没有到这"
  console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]}`);

  // ── /auth/gate：口令验证 → 返回 PB token + 用户记录（浏览器写 authStore） ──
  if (req.method === 'POST' && req.url === '/auth/gate') {
    return handleAuthGate(req, res);
  }

  // ── /api/* → PocketBase 同源代理（含 SSE 流式响应） ──
  if (req.url.startsWith('/api/')) {
    const headers = { ...req.headers, host: `${PB_HOST}:${PB_PORT}` };
    // 免登录模式：浏览器没带凭据时由代理注入（带了则原样透传，便于启用登录后切换）
    if (INJECT && !headers.authorization) headers.authorization = PB_TOKEN;
    const proxyReq = http.request(
      {
        host: PB_HOST,
        port: PB_PORT,
        path: req.url,
        method: req.method,
        headers,
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

  // ── /media：照片上传 / 出图（文件在 VM 文件夹，PB 只存路径） ──
  if (req.url.startsWith('/media')) {
    return handleMedia(req, res);
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

/**
 * /media 路由：
 *   GET  /media/<dir>/<file>                        — 出图（无 SPA fallback，缺失 404）
 *   POST /media/upload?dir=stops/<id>&name=a.jpg    — 原图直传（body 为文件字节流）
 *        响应 { path: "/media/stops/<id>/<ts>_a.jpg" }
 */
function handleMedia(req, res) {
  const json = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };

  // 静态出图（/media/cache 是 API 端点，须先排除，见下方分支）
  if (req.method === 'GET' && !req.url.startsWith('/media/cache')) {
    const urlPath = decodeURIComponent(req.url.split('?')[0]).slice('/media'.length);
    const filePath = path.join(MEDIA_DIR, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(MEDIA_DIR)) return json(403, { message: 'Forbidden' });
    return fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) return json(404, { message: 'Not found' });
      res.writeHead(200, {
        'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'content-length': stat.size,
        'cache-control': 'public, max-age=31536000, immutable', // 文件名含时间戳，内容不变
      });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  // GET /media/cache?dir=locations/<id>&url=<google photo url>
  // 服务端下载 Google 图片缓存到本地（外链带 API key 且会过期，不能存外链）
  if (req.method === 'GET' && req.url.startsWith('/media/cache')) {
    const q = new URL(req.url, 'http://x').searchParams;
    const dir = (q.get('dir') || '').trim();
    const srcUrl = q.get('url') || '';
    if (!/^[a-z0-9_]+\/[a-zA-Z0-9_-]+$/.test(dir)) return json(400, { message: 'bad dir' });
    let u;
    try { u = new URL(srcUrl); } catch { return json(400, { message: 'bad url' }); }
    // 仅允许 Google 图片域，防 SSRF（参考 music-station net_guard 教训）
    const ALLOWED_HOSTS = /(^|\.)googleapis\.com$|(^|\.)googleusercontent\.com$|(^|\.)ggpht\.com$|(^|\.)gstatic\.com$/;
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.test(u.hostname)) {
      return json(403, { message: 'host not allowed' });
    }
    const destDir = path.join(MEDIA_DIR, dir);
    fs.mkdirSync(destDir, { recursive: true });
    const fileName = `${Date.now()}_google.jpg`;
    const destPath = path.join(destDir, fileName);
    const https = require('https');
    const fetchTo = (url, redirectsLeft) => {
      https.get(url, (gres) => {
        if (gres.statusCode >= 301 && gres.statusCode <= 308 && gres.headers.location && redirectsLeft > 0) {
          gres.resume();
          try {
            const next = new URL(gres.headers.location, url);
            if (next.protocol !== 'https:' || !ALLOWED_HOSTS.test(next.hostname)) {
              return json(403, { message: 'redirect host not allowed' });
            }
            return fetchTo(next.href, redirectsLeft - 1);
          } catch { return json(502, { message: 'bad redirect' }); }
        }
        if (gres.statusCode !== 200) {
          gres.resume();
          return json(502, { message: `upstream ${gres.statusCode}` });
        }
        const out = fs.createWriteStream(destPath);
        let received = 0;
        gres.on('data', (c) => {
          received += c.length;
          if (received > MAX_UPLOAD) { out.destroy(); fs.unlink(destPath, () => {}); gres.destroy(); }
        });
        gres.pipe(out);
        out.on('finish', () => json(200, { path: `/media/${dir}/${fileName}`, size: received }));
        out.on('error', (e) => json(500, { message: e.message }));
      }).on('error', (e) => json(502, { message: e.message }));
    };
    return fetchTo(u.href, 3);
  }

  if (req.method === 'POST' && req.url.startsWith('/media/upload')) {
    const q = new URL(req.url, 'http://x').searchParams;
    const dir = (q.get('dir') || '').trim();
    const rawName = (q.get('name') || 'upload.bin').trim();
    // dir 仅允许 collection/recordId 这种两段式小写路径
    if (!/^[a-z0-9_]+\/[a-zA-Z0-9_-]+$/.test(dir)) return json(400, { message: 'bad dir' });
    const safeName = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-80) || 'upload.bin';
    const declared = parseInt(req.headers['content-length'] || '0', 10);
    if (declared > MAX_UPLOAD) return json(413, { message: 'file too large (>25MB)' });

    const destDir = path.join(MEDIA_DIR, dir);
    fs.mkdirSync(destDir, { recursive: true });
    const fileName = `${Date.now()}_${safeName}`;
    const destPath = path.join(destDir, fileName);

    let received = 0;
    const out = fs.createWriteStream(destPath);
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > MAX_UPLOAD) {
        out.destroy();
        fs.unlink(destPath, () => {});
        json(413, { message: 'file too large (>25MB)' });
        req.destroy();
      }
    });
    req.pipe(out);
    out.on('finish', () => json(200, { path: `/media/${dir}/${fileName}`, size: received }));
    out.on('error', (e) => json(500, { message: e.message }));
    return;
  }

  return json(405, { message: 'Method not allowed' });
}

/**
 * /auth/gate — UI 口令网关
 * 浏览器 POST { passphrase: "..." }
 * 成功：返回 { token: <PB superuser token>, record: <superuser record> }，
 *       浏览器 pb.authStore.save(token, record) 即可作为真 PB 凭据。
 * 失败：401（含 1 秒延迟，简易限速）
 */
function handleAuthGate(req, res) {
  const crypto = require('crypto');
  const reply = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (!UI_PASSPHRASE || !PB_TOKEN) {
    return reply(503, { message: 'gate not configured (UI_PASSPHRASE / PB_TOKEN missing)' });
  }
  let body = '';
  let received = 0;
  req.on('data', (c) => {
    received += c.length;
    if (received > 4096) { req.destroy(); reply(413, { message: 'too large' }); return; }
    body += c.toString('utf8');
  });
  req.on('end', () => {
    let pass = '';
    try { pass = String(JSON.parse(body)?.passphrase || ''); } catch { return reply(400, { message: 'bad json' }); }
    const a = Buffer.from(pass);
    const b = Buffer.from(UI_PASSPHRASE);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      setTimeout(() => reply(401, { message: 'wrong passphrase' }), 1000);
      return;
    }
    // 口令对 → 用 PB_TOKEN 拉 superuser 自身记录，连同 token 一并返回
    let userId = '';
    try {
      const payload = JSON.parse(Buffer.from(PB_TOKEN.split('.')[1], 'base64').toString('utf8'));
      userId = payload.id;
    } catch { return reply(500, { message: 'bad PB_TOKEN' }); }
    const opts = {
      host: PB_HOST, port: PB_PORT, method: 'GET',
      path: `/api/collections/_superusers/records/${encodeURIComponent(userId)}`,
      headers: { 'Authorization': PB_TOKEN, host: `${PB_HOST}:${PB_PORT}` },
    };
    http.get(opts, (pbRes) => {
      let buf = '';
      pbRes.on('data', (c) => { buf += c.toString('utf8'); });
      pbRes.on('end', () => {
        if (pbRes.statusCode !== 200) return reply(502, { message: `PB ${pbRes.statusCode}` });
        try {
          const record = JSON.parse(buf);
          reply(200, { token: PB_TOKEN, record });
        } catch { reply(502, { message: 'bad PB response' }); }
      });
    }).on('error', (e) => reply(502, { message: e.message }));
  });
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[smat-trip] listening on 127.0.0.1:${PORT}, dist=${DIST}, pb=${PB_HOST}:${PB_PORT}, media=${MEDIA_DIR}, inject=${INJECT ? 'on' : 'off'}, gate=${UI_PASSPHRASE ? 'on' : 'off'}`);
});
