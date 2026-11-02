// Captures frame sequences of the real pages (Testa din sajt, Elevate Mejl) for the ad film, so the film shows
// exactly the site's own design. Writes forslag/film/seq/<name>/NNN.jpg and boxes.json (element centres).
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', '..', 'forslag', 'film', 'seq');
const audit = (id, title, score, extra = {}) => ({ id, title, score, scoreDisplayMode: 'numeric', ...extra });
const PSI = { lighthouseResult: { finalUrl: 'https://lindvikbygg.se/', categories: {
  performance: { score: 0.58, auditRefs: [{ id: 'largest-contentful-paint', weight: 25 }, { id: 'uses-optimized-images', weight: 0 }] },
  accessibility: { score: 0.79, auditRefs: [{ id: 'image-alt', weight: 10 }] },
  'best-practices': { score: 0.92, auditRefs: [] },
  seo: { score: 0.71, auditRefs: [{ id: 'meta-description', weight: 1 }, { id: 'document-title', weight: 1 }] } },
  audits: {
    'largest-contentful-paint': audit('largest-contentful-paint', 'Största innehållsritningen', 0.31, { displayValue: '4,8 s', numericValue: 4800 }),
    'first-contentful-paint': audit('first-contentful-paint', 'Första innehållsritningen', 0.62, { displayValue: '2,1 s' }),
    'total-blocking-time': audit('total-blocking-time', 'Total blockeringstid', 0.7, { displayValue: '320 ms' }),
    'cumulative-layout-shift': audit('cumulative-layout-shift', 'Layoutförskjutning', 0.95, { displayValue: '0,04' }),
    'speed-index': audit('speed-index', 'Hastighetsindex', 0.55, { displayValue: '4,2 s' }),
    'uses-optimized-images': audit('uses-optimized-images', 'Bilderna är inte komprimerade', 0.2, { details: { overallSavingsMs: 1400 } }),
    'image-alt': audit('image-alt', 'Bilder saknar alt-text', 0, { scoreDisplayMode: 'binary' }),
    'meta-description': audit('meta-description', 'Sidan saknar metabeskrivning', 0, { scoreDisplayMode: 'binary' }),
    'document-title': audit('document-title', 'Rubriken saknar viktiga sökord', 0.5, { scoreDisplayMode: 'binary' }),
  } } };
(async () => {
  const b = await chromium.launch(); const boxes = {};
  const shotter = (p, name) => { const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); let n = 0;
    return async (label) => { const f = String(n++).padStart(3, '0') + '.jpg'; await p.screenshot({ path: path.join(dir, f), type: 'jpeg', quality: 86 }); if (label) (boxes[name] = boxes[name] || {})[label] = n - 1; return n - 1; }; };
  const box = async (p, name, key, sel) => { const r = await p.locator(sel).first().boundingBox(); (boxes[name + ':pos'] = boxes[name + ':pos'] || {})[key] = r ? [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)] : null; };

  // ---- Testa din sajt ----
  const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  await p.addInitScript(() => { try { localStorage.setItem('es.consent', 'no'); } catch (e) {} });
  await p.route('**/api/psi**', async (r) => { await new Promise((ok) => setTimeout(ok, 2200)); r.fulfill({ json: PSI }); });
  await p.route('**pagespeedonline**', (r) => r.fulfill({ json: PSI }));
  await p.route('**observatory-api**', (r) => r.fulfill({ status: 500, body: '' }));
  await p.route('**/api/crux**', (r) => r.fulfill({ json: {} })); await p.route('**/api/safe**', (r) => r.fulfill({ json: {} })); await p.route('**/api/log**', (r) => r.fulfill({ json: {} }));
  await p.goto('http://localhost:8767/testa.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelectorAll('.cookie, #cookie, .consent, .chat').forEach((e) => e.remove()); });
  await p.evaluate(() => window.scrollTo(0, 120)); await p.waitForTimeout(300);
  const s1 = shotter(p, 'testa');
  await s1('start'); await box(p, 'testa', 'input', '#sitetest-form input'); await box(p, 'testa', 'button', '#sitetest-form button[type=submit]');
  const url = 'lindvikbygg.se';
  for (let i = 1; i <= url.length; i++) { await p.fill('#sitetest-form input', url.slice(0, i)); if (i % 2 === 0 || i === url.length) await s1(i === url.length ? 'typed' : null); }
  await p.click('#sitetest-form button[type=submit]');
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(260); await s1(i === 0 ? 'loading' : null); }
  await p.waitForSelector('#sitetest-results:not([hidden]) .score', { timeout: 20000 });
  await p.evaluate(() => { const r = document.querySelector('#sitetest-results'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 90); }); 
  for (let i = 0; i < 16; i++) { await s1(i === 0 ? 'rings' : null); await p.waitForTimeout(110); }
  await s1('ringsdone');
  await p.evaluate(() => { const r = document.querySelector('#sitetest-results .issues, #sitetest-results ul, .issue'); if (r) window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 140); }); await p.waitForTimeout(400);
  await s1('issues');

  // ---- Elevate Mejl ----
  const m = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  await m.goto('http://localhost:8767/mail.html?demo'); await m.click('#wl button[type=submit]'); await m.waitForSelector('.wmx-item'); await m.waitForTimeout(400);
  await m.evaluate(() => { const ch = document.querySelector('.chat'); if (ch) ch.remove(); const d = document.querySelector('.wmx-demo'); if (d) d.remove(); });
  const s2 = shotter(m, 'mejl');
  await s2('inbox'); await box(m, 'mejl', 'first', '.wmx-item >> nth=0');
  await m.click('.wmx-item >> nth=0'); await m.waitForSelector('.wmx-text'); await m.waitForTimeout(300);
  await s2('read'); await box(m, 'mejl', 'reply', '#rrep');
  await m.click('#rrep'); await m.waitForSelector('.wmx-editor'); await m.waitForTimeout(300);
  await m.evaluate(() => { const e = document.querySelector('.wmx-editor'); e.innerHTML = '<div></div>' + e.innerHTML; });
  await s2('compose');
  const reply = 'Hej Karin! Tack för förfrågan. Vi kan komma och titta på torsdag kl 10.';
  for (let i = 4; i <= reply.length; i += 4) { await m.evaluate((t) => { document.querySelector('.wmx-editor').firstElementChild.textContent = t; }, reply.slice(0, i)); await s2(null); }
  await m.evaluate((t) => { document.querySelector('.wmx-editor').firstElementChild.textContent = t; }, reply); await s2('typed');
  await box(m, 'mejl', 'send', '#wc button[type=submit]');
  await m.click('#wc button[type=submit]'); await m.waitForSelector('.wmx-toast'); await m.waitForTimeout(150); await s2('sent');
  fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(boxes, null, 1));
  console.log(JSON.stringify(boxes)); await b.close();
})();
