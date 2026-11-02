// Records a short how-to video of a real page: a big cursor that glides between elements, a numbered
// caption at the bottom, a highlight ring around what we talk about, and green intro/outro cards.
// Usage: node tools/tutorial/<film>.cjs  (needs: python3 -m http.server 8767 in the repo root)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const OVERLAY = `(() => {
  if (!document.documentElement || document.getElementById('tz-cur')) return;
  const css = document.createElement('style');
  css.textContent = \`
  #tz-cur{position:fixed;left:0;top:0;width:58px;height:58px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));transition:transform .08s}
  #tz-rip{position:fixed;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:3px solid #8fd3a6;z-index:2147483646;pointer-events:none;opacity:0}
  #tz-ring{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid #8fd3a6;border-radius:14px;box-shadow:0 0 0 9999px rgba(10,20,14,.28),0 0 30px rgba(143,211,166,.7);opacity:0;transition:all .45s cubic-bezier(.2,.8,.2,1)}
  #tz-cap{position:fixed;left:50%;bottom:26px;transform:translate(-50%,20px);z-index:2147483646;pointer-events:none;display:flex;gap:14px;align-items:center;max-width:960px;padding:14px 22px 14px 14px;border-radius:18px;background:rgba(15,36,24,.94);color:#fff;font:600 20px/1.35 'Hanken Grotesk',system-ui,sans-serif;box-shadow:0 20px 50px -15px rgba(0,0,0,.6);opacity:0;transition:all .35s cubic-bezier(.2,.8,.2,1)}
  #tz-cap b{flex:none;display:grid;place-items:center;min-width:40px;height:40px;padding:0 10px;border-radius:12px;background:#8fd3a6;color:#0f2418;font-size:17px}
  #tz-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;text-align:center;background:radial-gradient(60% 70% at 30% 70%,rgba(143,211,166,.35),transparent 70%),radial-gradient(50% 60% at 80% 20%,rgba(47,125,79,.6),transparent 70%),#0f2418;color:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .4s}
  #tz-card h1{font-size:64px;letter-spacing:-.03em;margin:18px 0 10px}#tz-card p{font-size:24px;opacity:.85;margin:0}#tz-card .hl{padding:0 .15em;border-radius:.12em;background:#8fd3a6;color:#0f2418}
  #tz-card ol{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;list-style:none;padding:0;margin:26px auto 0;max-width:980px}#tz-card li{padding:8px 16px;border-radius:999px;border:1px solid rgba(143,211,166,.5);background:rgba(255,255,255,.08);font-size:17px}
  \`;
  document.documentElement.appendChild(css);
  const add = (h) => { const d = document.createElement('div'); d.innerHTML = h; const el = d.firstElementChild; document.documentElement.appendChild(el); return el; };
  add('<div id="tz-ring"></div>'); add('<div id="tz-rip"></div>'); add('<div id="tz-cap"><b></b><span></span></div>'); add('<div id="tz-card"></div>');
  add('<svg id="tz-cur" viewBox="0 0 40 40"><path d="M6 3 L6 33 L14 25 L20 38 L26 35 L20 23 L31 23 Z" fill="#fff" stroke="#0f2418" stroke-width="2.4" stroke-linejoin="round"/></svg>');
  window.__cur = window.__cur || { x: innerWidth + 60, y: innerHeight - 80 };
  document.getElementById('tz-cur').style.transform = 'translate(' + window.__cur.x + 'px,' + window.__cur.y + 'px)';
})();`;

const LOGO = '<svg viewBox="0 0 1884.3 1353.9" style="width:96px"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="#8fd3a6"/></svg>';

async function tour(name, fn, opts = {}) {
  const dir = fs.mkdtempSync('/tmp/tour-');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
  await ctx.addInitScript('document.addEventListener("DOMContentLoaded",()=>{' + OVERLAY + '})');
  await ctx.addInitScript(() => { try { localStorage.setItem('es.consent', 'no'); } catch (e) {} });
  if (opts.setup) await opts.setup(ctx);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const t0 = Date.now();
  const sleep = (ms) => p.waitForTimeout(ms);
  const ensure = () => p.evaluate(OVERLAY);
  const center = async (sel) => { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded().catch(() => {}); const r = await el.boundingBox(); return r ? [r.x + r.width / 2, r.y + r.height / 2, r] : null; };
  const api = {
    p, sleep,
    async goto(url) { await p.goto(url); await ensure(); await p.evaluate(() => { const c = document.querySelector('.cookie, #cookie, .consent'); if (c) c.remove(); const ch = document.querySelector('.chat'); if (ch) ch.style.display = 'none'; }); },
    async card(html, ms = 2600) { await ensure(); await p.evaluate((h) => { const c = document.getElementById('tz-card'); c.innerHTML = '<div>' + h + '</div>'; c.style.opacity = 1; }, html); await sleep(ms); },
    async uncard() { await p.evaluate(() => { document.getElementById('tz-card').style.opacity = 0; }); await sleep(450); },
    async say(step, text) { await ensure(); await p.evaluate(([s, t]) => { const c = document.getElementById('tz-cap'); c.style.opacity = 0; c.style.transform = 'translate(-50%,20px)'; setTimeout(() => { c.querySelector('b').textContent = s; c.querySelector('span').textContent = t; c.style.opacity = 1; c.style.transform = 'translate(-50%,0)'; }, 180); }, [step, text]); await sleep(500); },
    async hush() { await p.evaluate(() => { const c = document.getElementById('tz-cap'); c.style.opacity = 0; }); },
    async ring(sel, pad = 8) { const c = await center(sel); if (!c) return; const r = c[2]; await p.evaluate(([x, y, w, h]) => { const e = document.getElementById('tz-ring'); Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', opacity: 1 }); }, [r.x - pad, r.y - pad, r.width + pad * 2, r.height + pad * 2]); await sleep(450); },
    async unring() { await p.evaluate(() => { document.getElementById('tz-ring').style.opacity = 0; }); },
    async move(sel, ms = 700) {
      await ensure(); const c = typeof sel === 'string' ? await center(sel) : sel; if (!c) { console.log('missing', sel); return; }
      await p.evaluate(([x, y, ms]) => new Promise((done) => { const s = window.__cur, x0 = s.x, y0 = s.y, t0 = performance.now(), cur = document.getElementById('tz-cur');
        const e = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
        (function f(now) { const k = Math.min(1, (now - t0) / ms), q = e(k); s.x = x0 + (x - x0) * q; s.y = y0 + (y - y0) * q; cur.style.transform = 'translate(' + (s.x - 7) + 'px,' + (s.y - 5) + 'px)'; k < 1 ? requestAnimationFrame(f) : done(); })(t0); }), [c[0], c[1], ms]);
      await p.mouse.move(c[0], c[1]);
    },
    async click(sel, ms) { await api.move(sel, ms); await p.evaluate(() => { const s = window.__cur, cur = document.getElementById('tz-cur'), r = document.getElementById('tz-rip');
        cur.style.transform = 'translate(' + (s.x - 7) + 'px,' + (s.y - 5) + 'px) scale(.8)'; r.style.left = s.x + 'px'; r.style.top = s.y + 'px';
        r.animate([{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 500 }); setTimeout(() => { cur.style.transform = 'translate(' + (s.x - 7) + 'px,' + (s.y - 5) + 'px)'; }, 140); });
      await p.locator(sel).first().click(); await sleep(250); await ensure(); },
    async type(sel, text, delay = 45) { await api.click(sel); await p.locator(sel).first().fill(''); await p.locator(sel).first().pressSequentially(text, { delay }); },
    async out(x = 1340, y = 760) { await api.move([x, y], 600); },
    LOGO,
  };
  await fn(api);
  await p.close(); await ctx.close(); await b.close();
  const webm = fs.readdirSync(dir).filter((f) => f.endsWith('.webm')).map((f) => path.join(dir, f))[0];
  const out = path.join(__dirname, '..', '..', 'forslag', 'film', name + '.mp4');
  // the first frames are the blank page before the intro card: skip them
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(opts.skip || 0.6), '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', '30', '-movflags', '+faststart', out]);
  console.log(name, 'klar', ((Date.now() - t0) / 1000).toFixed(1) + ' s', errs.length ? errs : 'inga fel');
}
module.exports = { tour };
