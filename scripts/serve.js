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

// Load .env if present
try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (e) {}

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
  let urlObj;
  try {
    urlObj = new URL(req.url, 'http://localhost');
  } catch (e) {
    return send(res, 400, 'Bad request', TYPES['.txt']);
  }
  let pathname = decodeURIComponent(urlObj.pathname);

  // Handle Serverless API routes locally
  if (pathname.startsWith('/api/')) {
    let apiPath = pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    if (apiPath.startsWith('_') || apiPath.includes('/_')) {
      return send(res, 404, JSON.stringify({ ok: false, error: 'API route not found' }), TYPES['.json']);
    }
    let fileCandidates = [
      path.resolve(__dirname, '..', 'api', apiPath + '.js'),
      path.resolve(__dirname, '..', 'api', apiPath, 'index.js')
    ];
    let targetFile = fileCandidates.find((f) => fs.existsSync(f));

    if (!targetFile) {
      return send(res, 404, JSON.stringify({ ok: false, error: 'API route not found' }), TYPES['.json']);
    }

    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch (e) {
        req.body = rawBody;
      }
      req.query = Object.fromEntries(urlObj.searchParams.entries());

      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        send(res, res.statusCode || 200, JSON.stringify(data), TYPES['.json']);
      };

      try {
        // Clear require cache in dev so code changes reflect immediately
        delete require.cache[require.resolve(targetFile)];
        const handler = require(targetFile);
        await handler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        if (!res.writableEnded) {
          send(res, 500, JSON.stringify({ ok: false, error: err.message }), TYPES['.json']);
        }
      }
    });
    return;
  }

  // Handle rewrites
  if (pathname === '/admin') pathname = '/admin.html';
  if (pathname === '/auth') pathname = '/auth.html';

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed', TYPES['.txt'], { Allow: 'GET, HEAD' });
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
