// Local test server for the live analysis: serves the site, runs /api/live with Playwright's Chromium (same engine as
// worker/live.js, other adapter) and forwards the other /api/ calls to the live site. Usage: node tools/live-dev.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { run, checkAddress, publicHost, privateIp } from '../worker/live.js';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = +(process.argv[2] || 8771);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.mp4': 'video/mp4' };

function adapter(browser) {
  return {
    async newPage(dev) {
      const ctx = await browser.newContext({ viewport: { width: dev.width, height: dev.height }, isMobile: dev.mobile, hasTouch: dev.mobile, userAgent: dev.ua });
      const p = await ctx.newPage();
      await p.route('**/*', (r) => { let h = ''; try { h = new URL(r.request().url()).hostname; } catch {} return privateIp(h) || h === 'localhost' ? r.abort() : r.continue(); });
      return {
        onConsole: (fn) => p.on('console', (m) => fn(m.type(), m.text())),
        onRequestFailed: (fn) => p.on('requestfailed', (r) => fn(r.url())),
        onResponse: (fn) => p.on('response', (r) => fn(r.status(), r.url())),
        init: (src) => p.addInitScript(src),
        goto: async (u) => { const r = await p.goto(u, { waitUntil: 'load', timeout: 30000 }); return r ? { status: r.status() } : null; },
        read: (fn) => p.evaluate(fn),
        scrollTo: (y) => p.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y),
        setViewport: (v) => p.setViewportSize({ width: v.width, height: v.height }),
        shot: async () => { const b = await p.screenshot({ type: 'jpeg', quality: 55 }); const pos = await p.evaluate(() => [scrollY, document.documentElement.scrollHeight]); return { img: b.toString('base64'), y: pos[0], h: pos[1] }; },
        close: () => ctx.close(),
      };
    },
  };
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/live') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    const send = (e, d) => { if (!res.writableEnded) res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`); };
    const chk = checkAddress(u.searchParams.get('url') || '');
    if (chk.error) { send('fail', { message: chk.error }); return res.end(); }
    const pub = await publicHost(chk.url.hostname);
    if (pub.error) { send('fail', { message: pub.error }); return res.end(); }
    const ctl = new AbortController(); req.on('close', () => ctl.abort());
    const browser = await chromium.launch();
    try { await run(adapter(browser), chk.url, u.searchParams.get('strategy') === 'desktop' ? 'desktop' : 'mobile', send, ctl.signal); }
    catch (e) { send('fail', { message: 'Live-granskningen avbröts av ett tekniskt fel.' }); console.error(e); }
    finally { await browser.close().catch(() => {}); res.end(); }
    return;
  }
  if (u.pathname.startsWith('/api/')) {
    const r = await fetch('https://elevatestudio.nu' + u.pathname + u.search, { method: req.method }).catch(() => null);
    if (!r) { res.writeHead(502); return res.end(); }
    res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/json' });
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('live-dev on', PORT));
