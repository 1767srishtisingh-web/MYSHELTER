#!/usr/bin/env node
/*
 * Zero-dependency static server for local development and end-to-end tests.
 * Sends the same security headers as production (read from vercel.json) so
 * CSP problems show up locally, not only after deploying.
 *
 *   node scripts/serve.js            → serves the project root on PORT (default 5173)
 *   node scripts/serve.js dist       → serves the production build
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', process.argv[2] || '.');
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

let securityHeaders = {};
try {
  const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'vercel.json'), 'utf8'));
  const all = (cfg.headers || []).find((h) => h.source === '/(.*)');
  if (all) for (const h of all.headers) securityHeaders[h.key] = h.value;
} catch (e) {
  console.warn('Could not read vercel.json headers:', e.message);
}

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': type, 'Cache-Control': 'no-store' }, securityHeaders, extra || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', TYPES['.txt'], { Allow: 'GET, HEAD' });
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'Bad request', TYPES['.txt']);
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(ROOT, '.' + pathname);
  // Block path traversal and dotfiles
  if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\./.test(path.relative(ROOT, file))) {
    return send(res, 403, 'Forbidden', TYPES['.txt']);
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      const notFound = path.join(ROOT, '404.html');
      const body = fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found';
      return send(res, 404, req.method === 'HEAD' ? '' : body, TYPES['.html']);
    }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    if (req.method === 'HEAD') return send(res, 200, '', type);
    fs.readFile(file, (readErr, data) => {
      if (readErr) return send(res, 500, 'Server error', TYPES['.txt']);
      send(res, 200, data, type);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`MYSHELTER running at http://${HOST}:${PORT}  (serving ${path.relative(process.cwd(), ROOT) || '.'})`);
});
