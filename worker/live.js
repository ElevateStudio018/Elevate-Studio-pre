// "Testa din sajt" – live analysis. A real Chromium session (Cloudflare Browser Rendering, binding BROWSER) visits the
// address the visitor typed, scrolls through it and streams what it sees and finds as Server-Sent Events:
//   step     { id, text, state: 'run'|'done'|'fail' }          a real operation starting or ending
//   frame    { img (jpeg base64), y, h, vw, vh, marks: [...] }  a screenshot of the live session right now
//   cat      { id, state, note }                                category status: wait|run|done|problem|failed
//   finding  { cat, sev, what, where, why, fix, y, box? }       something we actually found on the page
//   good     { cat, text }                                      something that works well
//   metric   { id, label, value }                               a measured value
//   done     { summary }                                        the live part is finished
//   fail     { message }                                        the session could not be run
// Nothing is reported before it has happened; a check that cannot run is reported as failed, never as passed.
// The engine (run) only needs a small adapter, so the same code runs on Cloudflare (puppeteer) and locally (playwright).

export const LIVE_LIMIT_MS = 75000;
const DEVICES = {
  mobile: { width: 390, height: 844, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1 ElevateStudioTest' },
  desktop: { width: 1366, height: 820, mobile: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 ElevateStudioTest' },
};

// ---------- address validation (SSRF) ----------
const BAD_SUFFIX = /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa|test|invalid|example)$/i;
export function privateIp(ip) {
  ip = String(ip || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (ip.includes(':')) return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^::ffff:/.test(ip) || /^64:ff9b/.test(ip);
  return false;
}
export function checkAddress(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return { error: 'Adressen ser inte giltig ut.' }; }
  if (!/^https?:$/.test(u.protocol)) return { error: 'Bara webbadresser (http/https) kan testas.' };
  if (u.username || u.password) return { error: 'Adressen får inte innehålla inloggningsuppgifter.' };
  if (u.port && !['80', '443'].includes(u.port)) return { error: 'Bara vanliga webbadresser utan port kan testas.' };
  const h = u.hostname.replace(/\.$/, '');
  if (/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return { error: 'Skriv en domän, inte en IP-adress.' };
  if (!h.includes('.') || BAD_SUFFIX.test(h)) return { error: 'Den adressen går inte att testa från internet.' };
  return { url: u };
}
// The hostname must only point at public addresses (asked through DNS over HTTPS)
export async function publicHost(host, fetcher = fetch) {
  const ask = async (type) => {
    const r = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    return (j.Answer || []).filter((x) => x.type === 1 || x.type === 28).map((x) => x.data);
  };
  const ips = [...(await ask('A').catch(() => [])), ...(await ask('AAAA').catch(() => []))];
  if (!ips.length) return { error: 'Domänen finns inte eller har ingen webbserver.' };
  if (ips.some(privateIp)) return { error: 'Domänen pekar på en intern adress och kan inte testas.' };
  return { ips };
}

// ---------- what we read from the page (runs inside the page) ----------
const INIT = `(() => { window.__es = { lcp: 0, cls: 0 };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__es.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__es.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {} })();`;

function readPage() {
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const clip = (t, n = 80) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const heads = q('h1,h2,h3,h4').filter(vis).map((h) => ({ tag: h.tagName.toLowerCase(), text: clip(h.textContent), ...box(h) }));
  const near = (y) => { let t = ''; for (const h of heads) { if (h.y <= y + 4) t = h.text; else break; } return t; };
  const meta = (n) => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
  const imgs = q('img').filter(vis).map((i) => { const b = box(i); return { src: clip((i.currentSrc || i.src || '').split('/').pop().split('?')[0], 60), alt: i.getAttribute('alt'), nw: i.naturalWidth, nh: i.naturalHeight, ...b, sec: near(b.y) }; });
  const named = (e) => clip(e.textContent) || e.getAttribute('aria-label') || e.getAttribute('title') || (e.querySelector('img[alt]:not([alt=""])') ? 'bild' : '');
  const noName = q('a[href],button').filter(vis).filter((e) => !named(e)).slice(0, 8).map((e) => { const b = box(e); return { tag: e.tagName.toLowerCase(), ...b, sec: near(b.y) }; });
  const fields = q('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea').filter(vis);
  const unlabeled = fields.filter((f) => !(f.labels && f.labels.length) && !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby')).map((f) => { const b = box(f); return { name: f.name || f.type, ph: f.placeholder || '', ...b, sec: near(b.y) }; });
  const small = q('a[href],button').filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).slice(0, 40).map((e) => ({ text: named(e), ...box(e) }));
  let tiny = 0; q('p,li,span,a,td').filter(vis).slice(0, 600).forEach((e) => { if (e.childNodes.length && parseFloat(getComputedStyle(e).fontSize) < 12 && clip(e.textContent).length > 3) tiny++; });
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  const bytes = res.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0);
  const big = res.filter((r) => r.transferSize > 300000).sort((a, b) => b.transferSize - a.transferSize).slice(0, 3).map((r) => ({ name: clip(r.name.split('/').pop().split('?')[0], 50), kb: Math.round(r.transferSize / 1024) }));
  const mixed = location.protocol === 'https:' ? res.filter((r) => r.name.startsWith('http:')).length : 0;
  return {
    url: location.href, https: location.protocol === 'https:', title: document.title, desc: meta('description'), viewport: meta('viewport'), robots: meta('robots'),
    lang: document.documentElement.lang, canonical: (document.querySelector('link[rel=canonical]') || {}).href || '', og: !!document.querySelector('meta[property="og:image"]'),
    heads, imgs, noName, unlabeled, fields: fields.length, small, tiny,
    forms: q('form').filter(vis).length, tel: q('a[href^="tel:"]').length, mail: q('a[href^="mailto:"]').length,
    links: q('a[href]').map((a) => a.href).filter((h) => h.startsWith(location.origin)).slice(0, 200),
    overflow: document.documentElement.scrollWidth > innerWidth + 2, docH: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight,
    ttfb: Math.round(nav.responseStart || 0), dcl: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0),
    lcp: Math.round((window.__es || {}).lcp || 0), cls: Math.round(((window.__es || {}).cls || 0) * 1000) / 1000,
    requests: res.length + 1, kb: Math.round(bytes / 1024), big, mixed,
  };
}

// ---------- the engine ----------
const CATS = ['performance', 'accessibility', 'seo', 'best-practices', 'mobile', 'technical'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(adapter, url, device, send, signal) {
  const dev = DEVICES[device] || DEVICES.mobile;
  const t0 = Date.now();
  const stopped = () => signal && signal.aborted;
  const step = (id, text, state = 'run') => send('step', { id, text, state, t: Date.now() - t0 });
  const cat = (id, state, note = '') => send('cat', { id, state, note });
  const found = { performance: 0, accessibility: 0, seo: 0, 'best-practices': 0, mobile: 0, technical: 0 };
  const finding = (f) => { found[f.cat]++; send('finding', f); };
  const good = (c, text) => send('good', { cat: c, text });
  const metric = (id, label, value) => send('metric', { id, label, value });
  const console_ = [], failed = [], bad = [];
  let page;
  CATS.forEach((c) => cat(c, 'wait'));

  step('browser', 'Initialiserar webbläsaren …');
  page = await adapter.newPage(dev);
  page.onConsole((type, text) => { if (type === 'error' && console_.length < 20) console_.push(String(text).slice(0, 160)); });
  page.onRequestFailed((u) => { if (failed.length < 20) failed.push(u); });
  page.onResponse((status, u) => { if (status >= 400 && bad.length < 20) bad.push({ status, u }); });
  await page.init(INIT);
  step('browser', `Webbläsare startad (${dev.mobile ? 'mobil' : 'dator'}, ${dev.width}×${dev.height})`, 'done');

  const frame = async (marks = []) => {
    if (stopped()) return;
    const s = await page.shot().catch(() => null);
    if (s) send('frame', { img: s.img, y: s.y, h: s.h, vw: dev.width, vh: dev.height, marks });
  };

  step('nav', `Ansluter till ${url.hostname} …`);
  cat('technical', 'run'); cat('performance', 'run');
  const navT = Date.now();
  let resp;
  try { resp = await page.goto(url.href); } catch (e) {
    step('nav', 'Sidan kunde inte laddas', 'fail');
    CATS.forEach((c) => cat(c, 'failed', 'Sidan kunde inte laddas'));
    send('fail', { message: /timeout/i.test(String(e)) ? 'Sidan svarade inte inom 30 sekunder.' : 'Sidan kunde inte laddas i webbläsaren. Den kan vara nere eller blockera automatiska besök.' });
    return;
  }
  const status = resp ? resp.status : 0;
  if (status >= 400 || !status) {
    step('nav', `Servern svarade med felkod ${status || 'okänd'}`, 'fail');
    await frame();
    CATS.forEach((c) => cat(c, 'failed', `Felkod ${status}`));
    send('fail', { message: status === 403 || status === 429 || status === 503 ? `Webbplatsen blockerar automatiska besök (felkod ${status}). Testet kan inte genomföras härifrån.` : `Webbplatsen svarade med felkod ${status}.` });
    return;
  }
  step('nav', `Webbplatsen har laddats (${((Date.now() - navT) / 1000).toFixed(1).replace('.', ',')} s, statuskod ${status})`, 'done');
  await sleep(600);
  await frame();
  if (stopped()) return;

  step('read', 'Undersöker sidstruktur …');
  const d = await page.read(readPage);
  step('read', `Sidstruktur läst: ${d.heads.length} rubriker, ${d.imgs.length} bilder, ${d.links.length} interna länkar`, 'done');
  metric('load', 'Laddtid (denna körning)', d.load ? (d.load / 1000).toFixed(1).replace('.', ',') + ' s' : '–');
  if (d.lcp) metric('lcp', 'Största innehållet visades', (d.lcp / 1000).toFixed(1).replace('.', ',') + ' s');
  metric('kb', 'Sidans vikt', d.kb >= 1024 ? (d.kb / 1024).toFixed(1).replace('.', ',') + ' MB' : d.kb + ' kB');
  metric('req', 'Antal filer', String(d.requests));
  metric('ttfb', 'Serverns svarstid', d.ttfb + ' ms');

  // ---- what is visible where, so findings show up when the scroll reaches them ----
  const queue = [];
  const at = (y, f) => queue.push({ y, f });
  const sec = (s) => (s ? `under ”${s}”` : 'högst upp på sidan');

  // SEO (reported straight away: it is in the page head, not at a position)
  step('seo', 'Undersöker SEO-struktur …'); cat('seo', 'run');
  if (!d.title) finding({ cat: 'seo', sev: 'high', what: 'Sidan saknar titel', where: '<title> i sidans huvud', why: 'Titeln är det Google visar som blå rubrik i sökresultatet.', fix: 'Skriv en titel med tjänst + ort, 30–60 tecken.' });
  else if (d.title.length > 65) finding({ cat: 'seo', sev: 'low', what: `Titeln är ${d.title.length} tecken lång`, where: `”${d.title.slice(0, 70)}…”`, why: 'Google kapar titlar efter cirka 60 tecken.', fix: 'Korta till under 60 tecken och lägg det viktigaste först.' });
  else if (d.title.length < 15) finding({ cat: 'seo', sev: 'med', what: 'Titeln är mycket kort', where: `”${d.title}”`, why: 'En kort titel säger inte vad ni gör eller var.', fix: 'Lägg till tjänst och ort, t.ex. ”Snickare i Uppsala – Företagsnamn”.' });
  else good('seo', `Bra titel: ”${d.title.slice(0, 60)}”`);
  if (!d.desc) finding({ cat: 'seo', sev: 'med', what: 'Metabeskrivning saknas', where: 'Sidans huvud', why: 'Utan beskrivning väljer Google själv en text, ofta en dålig.', fix: 'Skriv 120–155 tecken som säljer och innehåller ort och tjänst.' });
  else good('seo', 'Sidan har en metabeskrivning');
  const h1s = d.heads.filter((h) => h.tag === 'h1');
  if (h1s.length === 0) finding({ cat: 'seo', sev: 'med', what: 'Huvudrubrik (H1) saknas', where: 'Hela sidan', why: 'H1 talar om för Google och skärmläsare vad sidan handlar om.', fix: 'Gör sidans största rubrik till en H1.' });
  else if (h1s.length > 1) finding({ cat: 'seo', sev: 'low', what: `${h1s.length} huvudrubriker (H1) på samma sida`, where: h1s.map((h) => `”${h.text.slice(0, 30)}”`).slice(0, 3).join(', '), why: 'Flera H1 gör det otydligt vad sidan främst handlar om.', fix: 'Behåll en H1 och gör övriga till H2.' });
  else good('seo', `En tydlig huvudrubrik: ”${h1s[0].text.slice(0, 50)}”`);
  if (/noindex/i.test(d.robots)) finding({ cat: 'seo', sev: 'high', what: 'Sidan är dold för Google (noindex)', where: '<meta name="robots">', why: 'Sidan kommer inte att visas i sökresultat alls.', fix: 'Ta bort noindex om sidan ska synas.' });
  if (!d.canonical) finding({ cat: 'seo', sev: 'low', what: 'Kanonisk adress saknas', where: 'Sidans huvud', why: 'Samma sida kan annars räknas flera gånger (med och utan www).', fix: 'Lägg till <link rel="canonical">.' });
  if (!d.og) finding({ cat: 'seo', sev: 'low', what: 'Ingen delningsbild (og:image)', where: 'Sidans huvud', why: 'När sidan delas i sociala medier blir förhandsvisningen tom.', fix: 'Lägg till en og:image på 1200×630 px.' });
  step('seo', 'SEO-struktur granskad', 'done');

  // headings in order
  for (let i = 1; i < d.heads.length; i++) {
    const a = +d.heads[i - 1].tag[1], b = +d.heads[i].tag[1];
    if (b > a + 1) { const h = d.heads[i]; at(h.y, { cat: 'accessibility', sev: 'low', what: `Rubriknivå hoppar från H${a} till H${b}`, where: `”${h.text.slice(0, 40)}”`, why: 'Skärmläsare navigerar efter rubriknivåer.', fix: `Gör rubriken till H${a + 1}.`, y: h.y, box: h }); break; }
  }
  const noAlt = d.imgs.filter((i) => i.alt === null);
  noAlt.slice(0, 4).forEach((i) => at(i.y, { cat: 'accessibility', sev: 'med', what: 'Bild utan alt-text', where: `${i.src || 'bild'} ${sec(i.sec)}`, why: 'Synskadade och Google vet inte vad bilden visar.', fix: 'Lägg till en kort beskrivning i alt-attributet.', y: i.y, box: i }));
  const huge = d.imgs.filter((i) => i.nw > 900 && i.w > 0 && i.nw > i.w * 2.5);
  huge.slice(0, 3).forEach((i) => at(i.y, { cat: 'performance', sev: 'med', what: `Bild ${i.nw}×${i.nh} px visas bara ${i.w} px bred`, where: `${i.src} ${sec(i.sec)}`, why: 'Besökaren laddar ner mycket mer än som behövs.', fix: `Skala ner till ca ${Math.min(i.nw, i.w * 2)} px och spara som WebP.`, y: i.y, box: i }));
  d.noName.slice(0, 3).forEach((e) => at(e.y, { cat: 'accessibility', sev: 'med', what: `${e.tag === 'a' ? 'Länk' : 'Knapp'} utan namn`, where: sec(e.sec), why: 'En skärmläsare läser bara ”länk” utan att säga vart den leder.', fix: 'Lägg till text eller aria-label.', y: e.y, box: e }));
  d.unlabeled.slice(0, 3).forEach((f) => at(f.y, { cat: 'accessibility', sev: 'med', what: `Formulärfält utan etikett${f.ph ? ` (”${f.ph}”)` : ''}`, where: sec(f.sec), why: 'Platshållartext försvinner när man skriver och läses inte alltid upp.', fix: 'Koppla en <label> till fältet.', y: f.y, box: f }));

  // ---- scroll through the page at a human pace ----
  step('scroll', 'Granskar rubriker och innehåll …'); cat('accessibility', 'run');
  const maxY = Math.min(d.docH - dev.height, 9000);
  let y = 0;
  const stepPx = Math.round(dev.height * 0.42);
  while (!stopped() && Date.now() - t0 < LIVE_LIMIT_MS - 25000) {
    const inView = [];
    for (let i = queue.length - 1; i >= 0; i--) if (queue[i].y < y + dev.height * 0.85) { const f = queue.splice(i, 1)[0].f; finding(f); if (f.box) inView.push({ ...f.box, sev: f.sev, label: f.what }); }
    const scanning = [...d.heads, ...d.imgs].filter((e) => e.y >= y && e.y < y + dev.height).slice(0, 6).map((e) => ({ x: e.x, y: e.y, w: e.w, h: e.h, scan: true }));
    await frame([...inView, ...scanning].map((m) => ({ ...m, y: m.y - y })));
    if (y >= maxY) break;
    y = Math.min(maxY, y + stepPx);
    await page.scrollTo(y);
    await sleep(380);
  }
  queue.splice(0).forEach((q) => finding(q.f));
  step('scroll', `Hela sidan genomgången (${Math.round(Math.min(d.docH, 9000 + dev.height))} px)`, 'done');
  if (!noAlt.length && d.imgs.length) good('accessibility', `Alla ${d.imgs.length} bilder har alt-text`);
  if (!d.lang) finding({ cat: 'accessibility', sev: 'low', what: 'Sidans språk är inte angivet', where: '<html lang>', why: 'Skärmläsare kan läsa svenska med engelskt uttal.', fix: 'Lägg till lang="sv".' });

  // ---- performance ----
  step('perf', 'Analyserar bilder och resurser …');
  if (d.kb > 3072) finding({ cat: 'performance', sev: 'high', what: `Sidan väger ${(d.kb / 1024).toFixed(1).replace('.', ',')} MB`, where: d.big.length ? 'Störst: ' + d.big.map((b) => `${b.name} (${b.kb} kB)`).join(', ') : 'Hela sidan', why: 'Tunga sidor laddar långsamt i mobilnät och besökare lämnar.', fix: 'Komprimera bilder och video, sikta på under 2 MB.' });
  else if (d.kb < 1500) good('performance', `Lätt sida: ${d.kb} kB totalt`);
  if (d.requests > 120) finding({ cat: 'performance', sev: 'low', what: `${d.requests} filer laddas`, where: 'Hela sidan', why: 'Många filer ger fler väntetider, särskilt på mobil.', fix: 'Slå ihop skript och ta bort tillägg som inte används.' });
  if (d.lcp > 4000) finding({ cat: 'performance', sev: 'high', what: `Största innehållet visades efter ${(d.lcp / 1000).toFixed(1).replace('.', ',')} s`, where: 'Första vyn', why: 'Google räknar över 4 s som dåligt; besökare väntar sällan så länge.', fix: 'Gör första bilden mindre och ladda den först.' });
  else if (d.lcp > 2500) finding({ cat: 'performance', sev: 'med', what: `Största innehållet visades efter ${(d.lcp / 1000).toFixed(1).replace('.', ',')} s`, where: 'Första vyn', why: 'Google vill se under 2,5 s.', fix: 'Optimera hjältebilden och typsnitt.' });
  else if (d.lcp) good('performance', `Snabb första vy: ${(d.lcp / 1000).toFixed(1).replace('.', ',')} s`);
  if (d.ttfb > 1200) finding({ cat: 'performance', sev: 'med', what: `Servern tog ${d.ttfb} ms att svara`, where: 'Webbhotellet', why: 'Allt annat får vänta på serverns första svar.', fix: 'Byt till snabbare hosting eller använd cache.' });
  step('perf', 'Bilder och resurser analyserade', 'done');

  // ---- mobile experience ----
  step('mobile', 'Kontrollerar mobilanpassning …'); cat('mobile', 'run');
  let m = d;
  if (!dev.mobile) {
    try { await page.setViewport(DEVICES.mobile); await sleep(500); m = await page.read(readPage); await page.setViewport(dev); } catch { m = null; }
  }
  if (!m) cat('mobile', 'failed', 'Kunde inte testas');
  else {
    if (!m.viewport) finding({ cat: 'mobile', sev: 'high', what: 'Ingen viewport-inställning', where: 'Sidans huvud', why: 'Sidan visas som en förminskad datorsida i mobilen.', fix: 'Lägg till <meta name="viewport" content="width=device-width, initial-scale=1">.' });
    if (m.overflow) finding({ cat: 'mobile', sev: 'high', what: 'Sidan är bredare än mobilskärmen', where: 'Hela sidan (går att scrolla i sidled)', why: 'Besökaren måste dra åt sidan för att se allt.', fix: 'Hitta elementet som är för brett och sätt max-width: 100%.' });
    if (m.small.length > 6) finding({ cat: 'mobile', sev: 'med', what: `${m.small.length} knappar eller länkar är mindre än 32 px`, where: m.small.slice(0, 3).map((s) => `”${s.text || 'ikon'}”`).join(', '), why: 'Små mål är svåra att träffa med tummen.', fix: 'Gör klickytor minst 44×44 px.' });
    if (m.tiny > 10) finding({ cat: 'mobile', sev: 'low', what: `${m.tiny} textstycken är mindre än 12 px`, where: 'Flera ställen på sidan', why: 'Liten text är svår att läsa i mobilen.', fix: 'Använd minst 16 px för brödtext.' });
    if (m.viewport && !m.overflow) good('mobile', 'Sidan passar mobilskärmen utan sidoscroll');
  }
  step('mobile', 'Mobilanpassning kontrollerad', 'done');

  // ---- technical quality / best practices ----
  step('tech', 'Kontrollerar teknisk kvalitet …'); cat('best-practices', 'run');
  if (!d.https) finding({ cat: 'technical', sev: 'high', what: 'Sidan använder inte HTTPS', where: d.url, why: 'Webbläsare varnar för osäker sida och Google rankar ner den.', fix: 'Aktivera SSL-certifikat och skicka http till https.' });
  else good('technical', 'Säker anslutning (HTTPS)');
  if (d.mixed) finding({ cat: 'technical', sev: 'med', what: `${d.mixed} filer laddas över osäker http`, where: 'Bilder eller skript', why: 'Blandat innehåll kan blockeras av webbläsaren.', fix: 'Byt adresserna till https.' });
  if (console_.length) finding({ cat: 'best-practices', sev: 'med', what: `${console_.length} JavaScript-fel i webbläsaren`, where: `”${console_[0].slice(0, 90)}”`, why: 'Fel kan göra att knappar, formulär eller spårning slutar fungera.', fix: 'Gå igenom felen i webbläsarens konsol.' });
  else good('best-practices', 'Inga JavaScript-fel under besöket');
  if (bad.length || failed.length) finding({ cat: 'technical', sev: 'med', what: `${bad.length + failed.length} filer kunde inte laddas`, where: (bad[0] ? `${bad[0].status}: ${bad[0].u.split('/').pop().slice(0, 50)}` : failed[0].split('/').pop().slice(0, 50)), why: 'Trasiga filer ger saknade bilder eller funktioner.', fix: 'Rätta eller ta bort länkarna till filerna.' });
  if (!d.forms && !d.tel && !d.mail) finding({ cat: 'best-practices', sev: 'high', what: 'Inget sätt att kontakta er på sidan', where: 'Hela startsidan', why: 'Besökaren måste leta efter kontaktuppgifter – många ger upp.', fix: 'Lägg till telefon, mejl eller ett offertformulär synligt.' });
  else good('best-practices', `Kontaktväg finns: ${[d.forms && 'formulär', d.tel && 'telefon', d.mail && 'mejl'].filter(Boolean).join(', ')}`);
  step('tech', 'Teknisk kvalitet kontrollerad', 'done');

  // ---- visit the contact page if there is one ----
  const contact = d.links.find((h) => /kontakt|contact|offert/i.test(h) && h.split('#')[0] !== d.url.split('#')[0]);
  if (contact && !stopped() && Date.now() - t0 < LIVE_LIMIT_MS - 12000) {
    step('contact', `Besöker ${new URL(contact).pathname} …`);
    try {
      const r2 = await page.goto(contact);
      await sleep(500); await frame();
      const c = await page.read(readPage);
      if ((r2 && r2.status >= 400)) finding({ cat: 'technical', sev: 'high', what: `Kontaktsidan svarar med felkod ${r2.status}`, where: new URL(contact).pathname, why: 'Kunder som vill höra av sig hamnar på en felsida.', fix: 'Rätta länken eller sidan.' });
      else if (c.forms) good('best-practices', `Kontaktsidan har ett formulär (${new URL(contact).pathname})`);
      step('contact', `Kontaktsidan granskad (${new URL(contact).pathname})`, 'done');
    } catch { step('contact', 'Kontaktsidan kunde inte öppnas', 'fail'); }
  }

  // live categories that are fully ours
  cat('mobile', m ? (found.mobile ? 'problem' : 'done') : 'failed');
  cat('technical', found.technical ? 'problem' : 'done');
  // the Google categories get their scores from the existing analysis; mark the live part as finished
  ['performance', 'accessibility', 'seo', 'best-practices'].forEach((c) => cat(c, found[c] ? 'problem' : 'done', 'live-granskning klar'));
  step('end', 'Sammanställer resultat …');
  send('done', { found, seconds: Math.round((Date.now() - t0) / 1000), url: d.url, device: dev.mobile ? 'mobile' : 'desktop' });
}

// ---------- Cloudflare adapter (Browser Rendering) ----------
export function puppeteerAdapter(browser) {
  return {
    async newPage(dev) {
      const p = await browser.newPage();
      const set = async (v) => { await p.setViewport({ width: v.width, height: v.height, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: 1 }); };
      await p.setUserAgent(dev.ua); await set(dev);
      await p.setRequestInterception(true);
      p.on('request', (r) => { let h = ''; try { h = new URL(r.url()).hostname; } catch {} if (h && (privateIp(h) || h === 'localhost' || BAD_SUFFIX.test(h))) r.abort(); else r.continue(); });
      return {
        onConsole: (fn) => p.on('console', (m) => fn(m.type(), m.text())),
        onRequestFailed: (fn) => p.on('requestfailed', (r) => fn(r.url())),
        onResponse: (fn) => p.on('response', (r) => fn(r.status(), r.url())),
        init: (src) => p.evaluateOnNewDocument(src),
        goto: async (u) => { const r = await p.goto(u, { waitUntil: 'load', timeout: 30000 }); return r ? { status: r.status() } : null; },
        read: (fn) => p.evaluate(fn),
        scrollTo: (y) => p.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y),
        setViewport: set,
        shot: async () => { const img = await p.screenshot({ type: 'jpeg', quality: 55, encoding: 'base64' }); const pos = await p.evaluate(() => [scrollY, document.documentElement.scrollHeight]); return { img, y: pos[0], h: pos[1] }; },
      };
    },
  };
}

// ---------- HTTP: GET /api/live?url=&strategy= (text/event-stream) ----------
export async function live(req, env) {
  const q = new URL(req.url).searchParams;
  const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const headers = { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' };
  const once = (event, data) => new Response(sse(event, data), { headers });
  if (!env.BROWSER) return once('unavailable', { message: 'Live-webbläsaren är inte aktiverad på servern.' });
  const chk = checkAddress(q.get('url') || '');
  if (chk.error) return once('fail', { message: chk.error });
  const pub = await publicHost(chk.url.hostname);
  if (pub.error) return once('fail', { message: pub.error });

  const { readable, writable } = new TransformStream();
  const w = writable.getWriter(), enc = new TextEncoder(), ctl = new AbortController();
  let open = true;
  const send = (event, data) => { if (!open) return; w.write(enc.encode(sse(event, data))).catch(() => { open = false; ctl.abort(); }); };
  req.signal && req.signal.addEventListener('abort', () => { open = false; ctl.abort(); });
  (async () => {
    let browser;
    const limit = setTimeout(() => ctl.abort(), LIVE_LIMIT_MS);
    try {
      const { default: puppeteer } = await import('@cloudflare/puppeteer');
      browser = await puppeteer.launch(env.BROWSER, { keep_alive: 10000 });
      await run(puppeteerAdapter(browser), chk.url, q.get('strategy') === 'desktop' ? 'desktop' : 'mobile', send, ctl.signal);
    } catch (e) {
      send('fail', { message: /limit|429|quota/i.test(String(e)) ? 'Live-webbläsaren är upptagen just nu. Försök igen om en minut.' : 'Live-granskningen avbröts av ett tekniskt fel.' });
    } finally {
      clearTimeout(limit);
      if (browser) await browser.close().catch(() => {});
      open = false; w.close().catch(() => {});
    }
  })();
  return new Response(readable, { headers });
}
