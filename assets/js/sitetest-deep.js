/* "Djupanalys": reads every page in the sitemap, every link (internal and external), every picture, the security
   headers, the mail set-up and the certificate, and runs Google's own test on the most important pages. Everything
   is grouped under six categories. A finding is shown only when the page, the server or Google's test shows it. */
(function () {
  var box = document.getElementById('sitetest-deep');
  var btn = document.getElementById('sitetest-deep-btn');
  var input = document.querySelector('#sitetest-form input[name="url"]');
  if (!box || !btn || !input) return;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var path = function (u) { var s = String(u).replace(/^https?:\/\/[^/]+/, ''); return esc(s || '/'); };
  var short = function (u) { return esc(String(u).replace(/^https?:\/\//, '').replace(/\/$/, '')); };
  var kb = function (b) { return Math.round(b / 1024) + ' KB'; };
  var PSI_CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
  var CAT_NAMES = { performance: 'Prestanda', accessibility: 'Tillgänglighet', 'best-practices': 'Bästa praxis', seo: 'SEO' };
  var HEADERS_WANTED = { 'content-security-policy': 'Säkerhetspolicy (CSP)', 'strict-transport-security': 'HSTS', 'x-content-type-options': 'X-Content-Type-Options', 'x-frame-options': 'X-Frame-Options', 'referrer-policy': 'Referrer-Policy', 'permissions-policy': 'Permissions-Policy' };

  function normalise(v) {
    v = (v || '').trim(); if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); return u.hostname.indexOf('.') > 0 ? u.origin + '/' : null; } catch (e) { return null; }
  }
  function post(op, body, base) {
    return fetch('/api/crawl?op=' + op + '&url=' + encodeURIComponent(base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json(); });
  }
  function pool(items, width, fn) {
    var out = [], i = 0;
    var workers = Array.apply(null, Array(Math.max(1, Math.min(width, items.length)))).map(function () {
      var next = function () { var k = i++; if (k >= items.length) return Promise.resolve(); return fn(items[k], k).then(function (r) { out[k] = r; return next(); }); };
      return next();
    });
    return Promise.all(workers).then(function () { return out; });
  }
  function chunks(arr, n) { var c = []; for (var i = 0; i < arr.length; i += n) c.push(arr.slice(i, i + n)); return c; }
  function psi(url) {
    var p = new URLSearchParams({ url: url, strategy: 'mobile', locale: 'sv' });
    PSI_CATS.forEach(function (c) { p.append('category', c); });
    return fetch('/api/psi?' + p.toString()).then(function (r) { if (r.status === 429) throw new Error('quota'); return r.json(); })
      .then(function (d) { if (!d.lighthouseResult) throw new Error('none'); return d.lighthouseResult; });
  }

  // ---------- the run ----------
  function run(base, finish) {
    var status = document.getElementById('deep-status');
    var t0 = Date.now();
    var say = function (t) { var line = t + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)'; status.textContent = line; near.textContent = line; };
    var R = { base: base };
    say('Hämtar sajtkartan och säkerhetsrubriker …');
    post('list', {}, base).then(function (list) {
      R.urls = list.urls || [];
      return Promise.all([post('headers', {}, base), R.urls.length ? null : null]).then(function (h) { R.headers = h[0]; return list; });
    }).then(function (list) {
      say('Läser ' + R.urls.length + ' sidor, 12 i taget …');
      return pool(chunks(R.urls, 12), 4, function (c) { return post('pages', { urls: c }, base).then(function (r) { return r.pages || []; }); })
        .then(function (g) {
          R.pages = [].concat.apply([], g).filter(Boolean);
          R.ok = R.pages.filter(function (p) { return p.ok; });
          var internal = {}, external = {}, images = {};
          R.ok.forEach(function (p) {
            p.links.internal.forEach(function (h) { internal[h] = 1; });
            p.links.external.forEach(function (h) { external[h] = 1; });
            p.links.images.forEach(function (h) { images[h] = 1; });
          });
          R.internal = Object.keys(internal); R.external = Object.keys(external); R.images = Object.keys(images);
          say('Kontrollerar ' + R.internal.length + ' interna och ' + R.external.length + ' externa länkar samt ' + R.images.length + ' bilder …');
          return Promise.all([
            pool(chunks(R.internal, 40), 4, function (c) { return post('links', { urls: c }, base).then(function (r) { return r.links || []; }); }),
            pool(chunks(R.external, 40), 4, function (c) { return post('links', { urls: c }, base).then(function (r) { return r.links || []; }); }),
            pool(chunks(R.images, 40), 4, function (c) { return post('images', { urls: c }, base).then(function (r) { return r.images || []; }); })
          ]);
        })
        .then(function (res) {
          R.linkStatus = {}; [].concat.apply([], res[0]).forEach(function (l) { R.linkStatus[l.url] = l; });
          R.extStatus = {}; [].concat.apply([], res[1]).forEach(function (l) { R.extStatus[l.url] = l; });
          R.imgStatus = {}; [].concat.apply([], res[2]).forEach(function (l) { R.imgStatus[l.url] = l; });
          // Google's own test on the most important pages (start page, contact, then the rest in sitemap order)
          var pick = [];
          var add = function (u) { if (u && pick.indexOf(u) < 0 && pick.length < 12) pick.push(u); };
          add(R.base); R.ok.forEach(function (p) { if (/\/(kontakt|priser|tjanster)/.test(p.url)) add(p.url); });
          R.ok.forEach(function (p) { add(p.url); });
          R.psiPages = pick;
          R.psi = {};
          say('Mäter ' + pick.length + ' sidor med Googles test …');
          return pool(pick, 3, function (u, i) {
            return psi(u).then(function (lr) { R.psi[u] = lr; }).catch(function (e) { R.psi[u] = { error: e.message }; });
          });
        })
        .then(function () {
          say('Kontrollerar mejl och certifikat …');
          return fetch('/api/sitecheck?url=' + encodeURIComponent(base)).then(function (r) { return r.json(); }).catch(function () { return {}; });
        })
        .then(function (sc) { R.mail = sc.mail || null; R.cert = sc.cert || null; R.files = sc.files || null; });
    }).then(function () {
      say('Sammanställer resultatet …');
      show(R, t0);
      status.textContent = '';
      finish(true);
    }).catch(function (e) {
      status.textContent = 'Djupanalysen kunde inte slutföras: ' + (e.message || 'okänt fel') + '. Försök igen om en stund.';
      finish(false);
    });
  }

  // ---------- findings ----------
  function show(R, t0) {
    var F = {}; // "cat|id" -> { label, pages: [] }
    var add = function (cat, id, label, where) {
      var k = cat + '|' + id;
      if (!F[k]) F[k] = { cat: cat, label: label, where: [] };
      F[k].where.push(where);
    };
    var ok = R.ok, total = ok.length || 1;
    var pageCats = { seo: {}, access: {}, practice: {}, perf: {} };

    // per page
    ok.forEach(function (p) {
      var a = p.a, d = p.d, u = p.url, lab = path(u);
      var t = function (cat, id, label) { pageCats[cat][u] = 1; add(cat, id, label, lab); };
      if (!a.titleLen) t('seo', 'title-missing', 'Sidan saknar titel');
      if (a.titleLen > 60) t('seo', 'title-long', 'Titeln är för lång (över 60 tecken)');
      if (a.titleLen && a.titleLen < 25) t('seo', 'title-short', 'Titeln är för kort (under 25 tecken)');
      if (!a.descLen) t('seo', 'desc-missing', 'Saknar metabeskrivning');
      if (a.descLen > 160) t('seo', 'desc-long', 'Beskrivningen är för lång (över 160 tecken)');
      if (a.descLen && a.descLen < 70) t('seo', 'desc-short', 'Beskrivningen är för kort (under 70 tecken)');
      if (a.h1 === 0) t('seo', 'h1-missing', 'Saknar rubrik h1');
      if (a.h1 > 1) t('seo', 'h1-multi', 'Har flera rubriker h1');
      if (d.headingSkips) t('seo', 'heading-skip', 'Rubriknivåerna hoppar (till exempel h2 direkt till h4)');
      if (d.emptyHeadings) t('seo', 'heading-empty', 'Tomma rubriker');
      if (!a.canonical) t('seo', 'canonical', 'Saknar canonical-länk');
      if (!a.ogImage || !d.ogComplete) t('seo', 'og', 'Saknar fullständig information för delning i sociala medier (Open Graph)');
      if (a.noindex) t('seo', 'noindex', 'Markerad noindex, Google visar inte sidan');
      if (a.ldBad) t('seo', 'ld-bad', 'Strukturerad data (JSON-LD) är trasig, Google ignorerar den');
      if (d.genericLinks) t('seo', 'generic', 'Länktext som "läs mer" eller "klicka här"');
      if (d.words < 150) t('seo', 'thin', 'Tunn text, under 150 ord på sidan');
      if (d.metaRefresh) t('practice', 'refresh', 'Använder meta refresh för omdirigering, föredra en riktig omdirigering');
      if (!a.lang) t('access', 'lang', 'Språket är inte angivet (lang)');
      if (!a.viewport) t('access', 'viewport', 'Saknar viewport, sidan skalas fel på mobil');
      if (a.noAlt) t('access', 'alt', 'Bilder saknar alt-text (' + a.noAlt + ' st)');
      if (d.emptyLinks) t('access', 'link-empty', 'Länkar utan text eller etikett');
      if (d.emptyButtons) t('access', 'button-empty', 'Knappar utan text eller etikett');
      if (d.unlabeledInputs) t('access', 'input-label', 'Fält utan etikett');
      if (!d.doctype) t('practice', 'doctype', 'Saknar doctype');
      if (!d.charset) t('practice', 'charset', 'Saknar teckenuppsättning (charset)');
      if (a.mixed) t('practice', 'mixed', 'Laddar innehåll över http i stället för https');
      if (d.blankTarget) t('practice', 'blank', 'Länk som öppnar ny flik utan rel="noopener"');
      if (d.deprecated) t('practice', 'deprecated', 'Föråldrade HTML-taggar (font, center m.fl.)');
      if (d.blockingScripts) t('perf', 'blocking', 'Skript i sidhuvudet blockerar visningen (saknar defer eller async)');
      if (d.imgNoSize) t('perf', 'img-size', 'Bilder utan width och height, ger layoutskift');
      if (d.bytes > 150 * 1024) t('perf', 'heavy', 'Stor HTML-fil (över 150 KB, ' + kb(d.bytes) + ')');
      if (d.inlineStyles > 200) t('perf', 'inline-styles', 'Många inline-stilar (' + d.inlineStyles + ')');
      if (d.inlineScripts > 5) t('perf', 'inline-scripts', 'Många inline-skript (' + d.inlineScripts + ')');
    });
    // duplicates across pages
    var titles = {}, texts = {};
    ok.forEach(function (p) {
      if (p.a.title) (titles[p.a.title] = titles[p.a.title] || []).push(p.url);
      if (p.d.words >= 30) (texts[p.d.textHash] = texts[p.d.textHash] || []).push(p.url);
    });
    Object.keys(titles).forEach(function (t) { if (titles[t].length > 1) titles[t].forEach(function (u) { add('seo', 'dup-title', 'Samma titel på flera sidor', path(u)); }); });
    Object.keys(texts).forEach(function (h) { if (texts[h].length > 1) texts[h].forEach(function (u) { add('seo', 'dup-text', 'Samma innehåll på flera sidor', path(u)); }); });

    // links
    var linkRows = [];
    ok.forEach(function (p) {
      p.links.internal.forEach(function (h) {
        var s = R.linkStatus[h] || {};
        if (!s.status || s.status >= 400) add('links', 'broken-int', 'Trasig intern länk', path(p.url) + ' → ' + path(h) + ' (' + (s.status || 'inget svar') + ')');
        else if (s.redirected) add('links', 'redir', 'Intern länk som omdirigeras, peka direkt på slutadressen', path(p.url) + ' → ' + path(h));
      });
      p.links.external.forEach(function (h) {
        var s = R.extStatus[h] || {};
        if (!s.status || s.status >= 400) add('links', 'broken-ext', 'Trasig extern länk', path(p.url) + ' → ' + esc(h) + ' (' + (s.status || 'inget svar') + ')');
      });
    });
    // images
    Object.keys(R.imgStatus).forEach(function (src) {
      var im = R.imgStatus[src];
      var where = path(src);
      if (!im.status || im.status >= 400) add('links', 'img-broken', 'Trasig bild', where);
      if (im.bytes > 300 * 1024) add('perf', 'img-big', 'Stor bild över 300 KB (' + kb(im.bytes) + ')', where);
      else if (im.bytes > 120 * 1024 && /jpeg|png/.test(im.type)) add('perf', 'img-format', 'Bild över 120 KB i jpg eller png, WebP eller AVIF blir mindre (' + kb(im.bytes) + ')', where);
    });
    // site level
    var files = R.files || {};
    if (files.sitemap && !files.sitemap.found) add('seo', 'sitemap', 'Sajtkartan (sitemap.xml) hittades inte', 'sajten');
    if (files.robots && !files.robots.found) add('seo', 'robots', 'Filen robots.txt hittades inte', 'sajten');
    if (files.robots && files.robots.blocksAll) add('seo', 'robots-block', 'robots.txt blockerar hela sajten för sökmotorer', 'sajten');
    if (files.notFound && !files.notFound.ok) add('seo', 'soft404', 'En okänd adress svarar ' + (files.notFound.status || 'inget') + ' i stället för 404', 'sajten');
    var hd = (R.headers && R.headers.home) || {};
    Object.keys(HEADERS_WANTED).forEach(function (h) { if (R.headers && !hd[h]) add('practice', 'hdr-' + h, HEADERS_WANTED[h] + ' saknas i svaret', 'startsidan'); });
    if (R.headers && hd['content-encoding'] === null) add('perf', 'no-gzip', 'Sidan komprimeras inte (ingen gzip eller brotli)', 'startsidan');
    var css = (R.headers && R.headers.css) || {};
    if (R.headers && !css['cache-control']) add('perf', 'no-cache-css', 'Stilfilen saknar cache-inställning', 'stilfilen');
    // mail and certificate
    var m = R.mail;
    if (m) {
      if (!m.spf.found) add('security', 'spf', 'SPF saknas, mejl från domänen kan hamna i skräpposten', 'domänen');
      if (!m.dkim.found) add('security', 'dkim', 'DKIM hittades inte bland vanliga väljare, kontrollera mejlsystemet', 'domänen');
      if (!m.dmarc.found) add('security', 'dmarc', 'DMARC saknas, andra kan skicka mejl som ser ut att komma från er', 'domänen');
      else if (m.dmarc.policy === 'none') add('security', 'dmarc-none', 'DMARC står på none, bara övervakning. Höj till quarantine eller reject', 'domänen');
      if (!m.mx.found) add('security', 'mx', 'Inga MX-poster, domänen kan inte ta emot mejl', 'domänen');
    }
    if (R.cert && R.cert.checked && R.cert.daysLeft < 30) add('security', 'cert', 'Certifikatet går ut om ' + R.cert.daysLeft + ' dagar', 'domänen');

    // Google's test: the failing audits, grouped over the pages measured
    var psiOk = R.psiPages.filter(function (u) { return R.psi[u] && !R.psi[u].error; });
    var auditHits = {};
    psiOk.forEach(function (u) {
      var lr = R.psi[u];
      PSI_CATS.forEach(function (c) {
        var cat = lr.categories[c]; if (!cat) return;
        cat.auditRefs.forEach(function (ref) {
          var a = lr.audits[ref.id]; if (!a || a.score === null || a.score >= 0.9 || ['manual', 'notApplicable', 'informative'].indexOf(a.scoreDisplayMode) >= 0) return;
          var k = c + '|' + ref.id;
          auditHits[k] = auditHits[k] || { cat: c, title: a.title, desc: a.description, pages: [], value: a.displayValue || '' };
          auditHits[k].pages.push(u);
        });
      });
    });
    var gcat = function (c) { return c === 'performance' ? 'perf' : c === 'accessibility' ? 'access' : c === 'best-practices' ? 'practice' : 'seo'; };

    // ---------- render ----------
    var pct = function (cat) { var n = Object.keys(pageCats[cat]).length; return Math.round((ok.length - n) / total * 100); };
    var CATS = [['seo', 'SEO'], ['access', 'Tillgänglighet'], ['practice', 'Bästa praxis'], ['perf', 'Prestanda'], ['security', 'Säkerhet och mejl'], ['links', 'Länkar och bilder']];
    var html = '<p class="sitetest__note"><b>Klart på ' + Math.round((Date.now() - t0) / 1000) + ' sekunder.</b> Kontrollerade ' + ok.length + ' av ' + R.urls.length + ' sidor, ' + R.internal.length + ' interna och ' + R.external.length + ' externa länkar, ' + R.images.length + ' bilder och ' + psiOk.length + ' sidor i Googles test.' +
      (ok.length < R.urls.length ? ' ' + (R.urls.length - ok.length) + ' sidor kunde inte läsas.' : '') + '</p>';
    // score strip
    html += '<div class="deep__scores">' + ['seo', 'access', 'practice', 'perf'].map(function (c) {
      var name = CATS.filter(function (x) { return x[0] === c; })[0][1];
      return '<div><b>' + pct(c) + ' %</b><span>' + name + '</span></div>';
    }).join('') + '</div>';
    // Google's scores
    if (psiOk.length) {
      var avg = {}; PSI_CATS.forEach(function (c) { var s = psiOk.map(function (u) { return R.psi[u].categories[c].score; }); avg[c] = Math.round(s.reduce(function (a, b) { return a + b; }, 0) / s.length * 100); });
      html += '<h3 class="sitetest__h3">Googles test, snitt för ' + psiOk.length + ' sidor (mobil)</h3><div class="deep__scores">' + PSI_CATS.map(function (c) { return '<div><b>' + avg[c] + '</b><span>' + CAT_NAMES[c] + '</span></div>'; }).join('') + '</div>';
    }
    CATS.forEach(function (c) {
      var items = Object.keys(F).filter(function (k) { return F[k].cat === c[0]; }).map(function (k) { return F[k]; });
      // Google's failing audits belong to the category of their test
      var g = Object.keys(auditHits).filter(function (k) { return gcat(auditHits[k].cat) === c[0]; }).map(function (k) { return auditHits[k]; });
      var rows = items.sort(function (a, b) { return b.where.length - a.where.length; }).map(function (it) {
        return '<details class="deep__item"><summary><b>' + esc(it.label) + '</b> <span>' + it.where.length + (it.where.length === 1 ? ' förekomst' : ' förekomster') + '</span></summary><ul class="sitetest__list">' +
          it.where.slice(0, 80).map(function (w) { return '<li>' + w + '</li>'; }).join('') + (it.where.length > 80 ? '<li>… och ' + (it.where.length - 80) + ' till</li>' : '') + '</ul></details>';
      }).join('');
      var gh = g.sort(function (a, b) { return b.pages.length - a.pages.length; }).map(function (h) {
        return '<details class="deep__item deep__google"><summary><b>' + esc(h.title) + '</b> <span>' + h.pages.length + ' av ' + psiOk.length + ' sidor' + (h.value ? ', ' + esc(h.value) : '') + '</span></summary>' +
          '<p class="sitetest__note">' + esc(String(h.desc || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')) + '</p><ul class="sitetest__list">' + h.pages.map(function (u) { return '<li>' + path(u) + '</li>'; }).join('') + '</ul></details>';
      }).join('');
      var empty = !rows && !gh;
      html += '<div class="deep__cat"><h3 class="sitetest__h3">' + c[1] + (['seo', 'access', 'practice', 'perf'].indexOf(c[0]) >= 0 ? ' <span class="deep__pct">' + pct(c[0]) + ' % av sidorna utan fel</span>' : '') + '</h3>' +
        (empty ? '<p class="sitetest__note">Inga fel hittades i den här kategorin.</p>' : rows + gh) + '</div>';
    });
    if (R.mail) html += '<div class="deep__cat"><h3 class="sitetest__h3">Mejl och certifikat</h3><p class="sitetest__note">SPF ' + (R.mail.spf.found ? 'finns' : 'saknas') + ', DKIM ' + (R.mail.dkim.found ? 'hittat' : 'hittades inte') + ', DMARC ' + (R.mail.dmarc.found ? R.mail.dmarc.policy : 'saknas') + '. ' + (R.cert && R.cert.checked ? 'Certifikatet gäller till ' + esc(R.cert.expires) + '.' : '') + '</p></div>';
    html += '<p class="sitetest__note">Alla fel är kontrollerade mot sidans egen HTML, sajtens svar eller Googles test. Googles test gäller mobil och görs på de viktigaste sidorna, inte på alla.</p>';
    box.querySelector('#deep-out').innerHTML = html;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Right by the button: what is happening now, so the visitor sees that the test runs
  var near = document.createElement('p');
  near.className = 'sitetest__note deep__near';
  near.setAttribute('role', 'status');
  btn.parentNode.insertBefore(near, btn.nextSibling);
  var label = btn.querySelector('span');
  var idle = label ? label.textContent : '';

  btn.addEventListener('click', function () {
    var base = normalise(input.value);
    if (!base) { near.textContent = 'Skriv in en giltig adress ovanför, till exempel dittforetag.se.'; input.focus(); return; }
    input.setCustomValidity('');
    btn.disabled = true;
    if (label) label.textContent = 'Kör djupanalys …';
    near.textContent = 'Startar. Resultatet visas längst ner på sidan och kan ta några minuter.';
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.innerHTML = '<section class="sitetest__more"><h2 class="sitetest__h2">Djupanalys av hela sajten</h2>' +
      '<p class="sitetest__note">Läser alla sidor, alla länkar och bilder, säkerhetsrubriker, mejl och certifikat, och kör Googles test på de viktigaste sidorna. Det kan ta några minuter.</p>' +
      '<p class="sitetest__note" id="deep-status"></p><div id="deep-out"></div></section>';
    run(base, function (done) {
      btn.disabled = false;
      if (label) label.textContent = idle;
      near.textContent = done ? '' : near.textContent;
    });
  });
})();
