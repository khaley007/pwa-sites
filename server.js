// PWA audience sites — zero-dependency static host + lead-capture API.
// Node >= 22.5 (node:sqlite). Routes by Host header:
//   ministry.purewaterautomations.com   -> sites/ministry
// Local dev: http://localhost:PORT/ministry/... also works.
// Nonprofit site removed; the nonprofits. hostname transition is unresolved
// (see AGENTS.md). Do not release this to production until it is resolved.
// Sits behind Caddy in production; binds loopback only.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 8811;
const BIND = process.env.BIND || '127.0.0.1';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path.join(DATA_DIR, 'leads.db'));
db.exec(`CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  audience TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  phone TEXT,
  interest TEXT,
  message TEXT,
  page TEXT,
  user_agent TEXT
)`);
db.exec(`CREATE TABLE IF NOT EXISTS cta_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  target TEXT NOT NULL,
  audience TEXT,
  referer TEXT
)`);
// ponytail: prepare per call — node:sqlite on Node 22.x finalizes long-lived
// prepared statements under GC; per-call prepare is version-proof and cheap here.
const insertLead = (...args) => db.prepare(`INSERT INTO leads (audience, name, email, organization, phone, interest, message, page, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...args);
const insertClick = (...args) => db.prepare('INSERT INTO cta_clicks (target, audience, referer) VALUES (?, ?, ?)').run(...args);

// CTA outbound redirects, hit-counted in cta_clicks.
const GO = {
  '/go/discover': 'https://team.purewaterautomations.com/discover',
  '/go/quiz': 'https://purewaterautomations.getformly.app/tcndHU',
};

const HOSTS = {
  'ministry.purewaterautomations.com': 'ministry',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
};

// Validate the optional Email Core config once at startup.
let EMAIL_CORE = null;
{
  const { EMAIL_CORE_URL, EMAIL_CORE_KEY, EMAIL_CORE_WORKSPACE, EMAIL_CORE_SENDER_ID, LEAD_NOTIFY_TO } = process.env;
  if (EMAIL_CORE_URL && EMAIL_CORE_KEY && EMAIL_CORE_WORKSPACE && EMAIL_CORE_SENDER_ID && LEAD_NOTIFY_TO) {
    try {
      const u = new URL('/send/transactional', EMAIL_CORE_URL);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        EMAIL_CORE = { url: u, key: EMAIL_CORE_KEY, workspace: EMAIL_CORE_WORKSPACE, sender: EMAIL_CORE_SENDER_ID, to: LEAD_NOTIFY_TO };
      }
    } catch (e) {
      console.error('Invalid EMAIL_CORE_URL, notifications disabled:', e.message);
    }
  }
}

function send(res, code, body, headers = {}) {
  if (res.headersSent) return res.destroy();
  res.writeHead(code, headers);
  res.end(body);
}

function isPathWithin(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
    const ext = path.extname(filePath).toLowerCase();
    // html/css/js revalidate every request (304 via Last-Modified); images/fonts cache a day
    const cache = ['.html', '.css', '.js'].includes(ext) ? 'no-cache' : 'public, max-age=86400';
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cache,
      'Last-Modified': st.mtime.toUTCString(),
      'Content-Length': st.size,
      'X-Content-Type-Options': 'nosniff',
    };
    const ims = Date.parse(req.headers['if-modified-since'] || '');
    if (ims && Math.floor(st.mtimeMs / 1000) * 1000 <= ims) {
      delete headers['Content-Length'];
      return send(res, 304, '', headers);
    }
    if (req.method === 'HEAD') return send(res, 200, '', headers);
    res.writeHead(200, headers);
    pipeline(fs.createReadStream(filePath), res, (perr) => {
      if (perr && !res.writableEnded) res.destroy();
    });
  });
}

// Best-effort email notification through Email Core (optional; env-gated).
// Leads are always durable in SQLite regardless of notification outcome.
function notifyLead(lead) {
  if (!EMAIL_CORE) return;
  try {
    const body = JSON.stringify({
      workspace_id: EMAIL_CORE.workspace,
      sender_identity_id: EMAIL_CORE.sender,
      to: { email: EMAIL_CORE.to },
      subject: `New ${lead.audience} lead: ${lead.name}`,
      text: `Name: ${lead.name}\nEmail: ${lead.email}\nOrg: ${lead.organization || '-'}\nPhone: ${lead.phone || '-'}\nInterest: ${lead.interest || '-'}\nPage: ${lead.page || '-'}\n\n${lead.message || ''}`,
      idempotency_key: `pwa-sites-lead-${lead.id}`,
    });
    const mod = EMAIL_CORE.url.protocol === 'https:' ? require('node:https') : http;
    const req = mod.request(EMAIL_CORE.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMAIL_CORE.key}` },
      timeout: 10_000,
    }, (r) => {
      if (r.statusCode >= 300) console.error(`notifyLead: Email Core responded ${r.statusCode}`);
      r.resume();
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => console.error('notifyLead failed:', e.message));
    req.end(body);
  } catch (e) {
    console.error('notifyLead failed:', e.message);
  }
}

// Fixed-window per-IP counters with a bounded map. Blocked requests don't
// accumulate state; idle buckets are swept each window.
const WINDOW_MS = 3600_000;
const MAX_BUCKETS = 10_000;
const buckets = new Map(); // ip -> { start, leads, clicks }
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of buckets) if (now - b.start >= WINDOW_MS) buckets.delete(ip);
}, 300_000).unref();

function bucketFor(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now - b.start >= WINDOW_MS) {
    if (!b && buckets.size >= MAX_BUCKETS) return null; // under pressure: fail open for reads, closed for writes below
    b = { start: now, leads: 0, clicks: 0 };
    buckets.set(ip, b);
  }
  return b;
}

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function handleLead(req, res, audience) {
  const json = { 'Content-Type': 'application/json' };
  const ctype = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/json') return send(res, 415, JSON.stringify({ ok: false, error: 'Content-Type must be application/json' }), json);
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > 20_000) return send(res, 413, JSON.stringify({ ok: false, error: 'Body too large' }), json);

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    size += c.length;
    if (size > 20_000) {
      aborted = true;
      send(res, 413, JSON.stringify({ ok: false, error: 'Body too large' }), json);
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      const ip = clientIp(req);
      const b = bucketFor(ip);
      b && b.leads++;
      if (!b || b.leads > 10) return send(res, 429, JSON.stringify({ ok: false, error: 'Too many requests' }), json);
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, JSON.stringify({ ok: false, error: 'Invalid JSON' }), json); }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return send(res, 400, JSON.stringify({ ok: false, error: 'Invalid JSON' }), json);
      }
      if (body.website) return send(res, 200, JSON.stringify({ ok: true }), json); // honeypot
      const name = String(body.name || '').trim().slice(0, 200);
      const email = String(body.email || '').trim().slice(0, 200);
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return send(res, 400, JSON.stringify({ ok: false, error: 'Name and a valid email are required' }), json);
      }
      const info = insertLead(
        audience, name, email,
        String(body.organization || '').slice(0, 300),
        String(body.phone || '').slice(0, 50),
        String(body.interest || '').slice(0, 200),
        String(body.message || '').slice(0, 5000),
        String(body.page || '').slice(0, 300),
        String(req.headers['user-agent'] || '').slice(0, 300),
      );
      notifyLead({ id: info.lastInsertRowid, audience, name, email, organization: body.organization, phone: body.phone, interest: body.interest, message: body.message, page: body.page });
      send(res, 200, JSON.stringify({ ok: true }), json);
    } catch (e) {
      console.error('handleLead error:', e.message);
      send(res, 500, JSON.stringify({ ok: false, error: 'Server error' }), json);
    }
  });
}

function handleRequest(req, res) {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  let site = HOSTS[host] || null;
  let prefix = ''; // '/ministry' in local-dev prefix mode
  let urlPath;
  let query = '';
  try {
    const u = new URL(req.url, 'http://x');
    urlPath = decodeURIComponent(u.pathname);
    query = u.search || '';
  } catch { return send(res, 400, 'Bad request'); }
  // Reject decoded control characters (NUL crashes fs.stat sync; CR/LF poisons Location headers).
  if (/[\u0000-\u001f\u007f]/.test(urlPath)) return send(res, 400, 'Bad request');

  // Local-dev prefix routing when host is not a known vhost.
  if (!site) {
    const m = urlPath.match(/^\/(ministry)(\/.*)?$/);
    if (m) { site = m[1]; prefix = `/${m[1]}`; urlPath = m[2] || '/'; }
  }

  if (req.method === 'POST' && urlPath === '/api/lead') {
    return handleLead(req, res, site || 'unknown');
  }
  if (urlPath === '/healthz') return send(res, 200, 'ok', { 'Content-Type': 'text/plain' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

  // CTA counters: /go/<target> -> 302 outbound (query passed through), one row in cta_clicks.
  if (GO[urlPath]) {
    if (req.method === 'GET') {
      try {
        const ip = clientIp(req);
        const b = bucketFor(ip);
        if (b && ++b.clicks <= 60) {
          insertClick(urlPath.slice('/go/'.length), site || 'unknown', String(req.headers.referer || '').slice(0, 300));
        }
      } catch (e) { console.error('cta_clicks insert failed:', e.message); }
    }
    const dest = GO[urlPath] + (query ? (GO[urlPath].includes('?') ? '&' + query.slice(1) : query) : '');
    return send(res, 302, '', { Location: dest });
  }

  if (urlPath === '/favicon.ico') return serveFile(req, res, path.join(ROOT, 'shared', 'assets', 'favicon.png'));

  // Shared static assets under /shared/ (site-independent, so before the site check)
  if (urlPath.startsWith('/shared/')) {
    const p = path.normalize(path.join(ROOT, urlPath));
    if (!isPathWithin(path.join(ROOT, 'shared'), p)) return send(res, 403, 'Forbidden');
    return serveFile(req, res, p);
  }
  if (!site) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });

  // Canonical 301s: strip .html, /index.html -> /, trailing slash -> none. Query preserved.
  const redirect = (loc) => send(res, 301, '', { Location: encodeURI(prefix + loc) + query, 'Cache-Control': 'no-cache' });
  if (urlPath === '/index.html') return redirect('/');
  if (urlPath.endsWith('/index.html')) return redirect(urlPath.slice(0, -'index.html'.length));
  if (urlPath.endsWith('.html')) return redirect(urlPath.slice(0, -'.html'.length));
  if (urlPath !== '/' && urlPath.endsWith('/')) return redirect(urlPath.replace(/\/+$/, ''));

  const siteRoot = path.join(ROOT, 'sites', site);
  let p = path.normalize(path.join(siteRoot, urlPath));
  if (urlPath !== '/' && !isPathWithin(siteRoot, p)) return send(res, 403, 'Forbidden');
  if (urlPath === '/') p = path.join(siteRoot, 'index.html');
  else if (!path.extname(p)) p = `${p}.html`; // clean URLs: /services -> services.html
  serveFile(req, res, p);
}

const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (e) {
    console.error('request error:', e.message);
    try { send(res, 500, 'Server error', { 'Content-Type': 'text/plain' }); } catch { res.destroy(); }
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.maxRequestsPerSocket = 200;

server.listen(PORT, BIND, () => console.log(`pwa-sites listening on ${BIND}:${PORT}`));
