/* "Djupanalys": reads every page in the sitemap in small batches (the server does the reading), checks the links
   and groups every finding under SEO, Tillgänglighet, Bästa praxis and Prestanda. Each finding lists the pages it
   was found on. Nothing is estimated: a finding is only shown when the page's own HTML shows it. */
(function () {
  var box = document.getElementById('sitetest-deep');
  if (!box) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var path = function (u) { return esc(u.replace(/^https?:\/\/[^/]+/, '') || '/'); };
  var CATS = [['seo', 'SEO'], ['access', 'Tillgänglighet'], ['practice', 'Bästa praxis'], ['perf', 'Prestanda']];

  // Every check: category, id, text. A check returns true for the pages it applies to.
  var CHECKS = [
    ['seo', 'title-missing', 'Sidan saknar titel', function (p) { return p.a.titleLen === 0; }],
    ['seo', 'title-long', 'Titeln är för lång (över 60 tecken)', function (p) { return p.a.titleLen > 60; }],
    ['seo', 'title-short', 'Titeln är för kort (under 25 tecken)', function (p) { return p.a.titleLen > 0 && p.a.titleLen < 25; }],
    ['seo', 'desc-missing', 'Saknar metabeskrivning', function (p) { return p.a.descLen === 0; }],
    ['seo', 'desc-long', 'Beskrivningen är för lång (över 160 tecken)', function (p) { return p.a.descLen > 160; }],
    ['seo', 'desc-short', 'Beskrivningen är för kort (under 70 tecken)', function (p) { return p.a.descLen > 0 && p.a.descLen < 70; }],
    ['seo', 'h1-missing', 'Saknar rubrik h1', function (p) { return p.a.h1 === 0; }],
    ['seo', 'h1-multi', 'Har flera rubriker h1', function (p) { return p.a.h1 > 1; }],
    ['seo', 'heading-skip', 'Rubriknivåerna hoppar, till exempel h2 direkt till h4', function (p) { return p.d.headingSkips > 0; }],
    ['seo', 'heading-empty', 'Tomma rubriker', function (p) { return p.d.emptyHeadings > 0; }],
    ['seo', 'canonical-missing', 'Saknar canonical-länk', function (p) { return !p.a.canonical; }],
    ['seo', 'og-missing', 'Saknar bild för delning i sociala medier (og:image)', function (p) { return !p.a.ogImage; }],
    ['seo', 'ld-bad', 'Strukturerad data (JSON-LD) går inte att läsa', function (p) { return p.a.ldBad > 0; }],
    ['seo', 'noindex', 'Är markerad noindex, Google visar inte sidan', function (p) { return p.a.noindex; }],
    ['seo', 'generic-link', 'Länktext som "läs mer" eller "klicka här"', function (p) { return p.d.genericLinks > 0; }],
    ['access', 'img-alt', 'Bilder saknar alt-text', function (p) { return p.a.noAlt > 0; }],
    ['access', 'link-empty', 'Länkar utan text eller etikett', function (p) { return p.d.emptyLinks > 0; }],
    ['access', 'button-empty', 'Knappar utan text eller etikett', function (p) { return p.d.emptyButtons > 0; }],
    ['access', 'input-label', 'Fält utan etikett', function (p) { return p.d.unlabeledInputs > 0; }],
    ['access', 'heading-skip', 'Rubriknivåerna hoppar', function (p) { return p.d.headingSkips > 0; }],
    ['access', 'lang-missing', 'Språket är inte angivet (lang)', function (p) { return !p.a.lang; }],
    ['access', 'viewport-missing', 'Saknar viewport, sidan skalas fel på mobil', function (p) { return !p.a.viewport; }],
    ['practice', 'doctype-missing', 'Saknar doctype', function (p) { return !p.d.doctype; }],
    ['practice', 'charset-missing', 'Saknar teckenuppsättning (charset)', function (p) { return !p.d.charset; }],
    ['practice', 'mixed', 'Laddar innehåll över http i stället för https', function (p) { return p.a.mixed > 0; }],
    ['practice', 'blank-target', 'Länk som öppnar ny flik utan rel="noopener"', function (p) { return p.d.blankTarget > 0; }],
    ['practice', 'deprecated', 'Föråldrade HTML-taggar (font, center m.fl.)', function (p) { return p.d.deprecated > 0; }],
    ['perf', 'blocking', 'Skript i sidhuvudet blockerar visningen (saknar defer eller async)', function (p) { return p.d.blockingScripts > 0; }],
    ['perf', 'img-size', 'Bilder utan width och height, vilket ger layoutskift', function (p) { return p.d.imgNoSize > 0; }],
    ['perf', 'heavy', 'Stor HTML-fil (över 150 KB)', function (p) { return p.d.bytes > 150 * 1024; }],
    ['perf', 'inline-styles', 'Många inline-stilar (över 200 på en sida)', function (p) { return p.d.inlineStyles > 200; }]
  ];
  var LABEL = {};
  CHECKS.forEach(function (c) { LABEL[c[0] + ':' + c[1]] = c[2]; });

  function post(op, body, base) {
    return fetch('/api/crawl?op=' + op + '&url=' + encodeURIComponent(base), { method: op === 'list' ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: op === 'list' ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  // Runs tasks, `width` at a time
  function pool(items, width, fn) {
    var out = [], i = 0;
    var workers = Array.apply(null, Array(Math.min(width, items.length))).map(function () {
      var next = function () { var k = i++; if (k >= items.length) return Promise.resolve(); return fn(items[k], k).then(function (r) { out[k] = r; return next(); }); };
      return next();
    });
    return Promise.all(workers).then(function () { return out; });
  }
  function chunks(arr, n) { var c = []; for (var i = 0; i < arr.length; i += n) c.push(arr.slice(i, i + n)); return c; }

  function run(base) {
    var status = document.getElementById('deep-status');
    var t0 = Date.now();
    var say = function (text) { status.textContent = text + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)'; };
    say('Hämtar sajtkartan …');
    post('list', null, base).then(function (list) {
      var urls = list.urls || [];
      say('Läser ' + urls.length + ' sidor, 12 i taget …');
      return pool(chunks(urls, 12), 4, function (c) { return post('pages', { urls: c }, base).then(function (r) { return r.pages || []; }); })
        .then(function (groups) {
          var pages = [].concat.apply([], groups).filter(Boolean);
          var ok = pages.filter(function (p) { return p.ok; });
          var seen = {}; ok.forEach(function (p) { p.internal.forEach(function (h) { seen[h] = 1; }); });
          var links = Object.keys(seen);
          say('Kontrollerar ' + links.length + ' interna länkar …');
          return pool(chunks(links, 40), 4, function (c) { return post('links', { urls: c }, base).then(function (r) { return r.links || []; }); })
            .then(function (lg) {
              var statusOf = {}; [].concat.apply([], lg).forEach(function (l) { statusOf[l.url] = l.status; });
              say('Sammanställer resultatet …');
              show(base, urls, pages, statusOf, t0);
            });
        });
    }).catch(function () { status.textContent = 'Djupanalysen kunde inte köras just nu. Försök igen om en stund.'; });
  }

  function show(base, urls, pages, statusOf, t0) {
    var ok = pages.filter(function (p) { return p.ok; });
    var byIssue = {}; // "cat:id" -> [page urls]
    var addIssue = function (cat, id, url) { var k = cat + ':' + id; (byIssue[k] = byIssue[k] || []).push(url); };
    var titles = {};
    ok.forEach(function (p) { if (p.a.title) titles[p.a.title] = (titles[p.a.title] || []).concat([p.url]); });
    Object.keys(titles).forEach(function (t) { if (titles[t].length > 1) titles[t].forEach(function (u) { addIssue('seo', 'title-dup', u); }); });
    LABEL['seo:title-dup'] = 'Samma titel på flera sidor';
    ok.forEach(function (p) { CHECKS.forEach(function (c) { if (c[3](p)) addIssue(c[0], c[1], p.url); }); });
    // broken links: each page that links to a broken target
    var broken = [];
    ok.forEach(function (p) { p.internal.forEach(function (h) { var st = statusOf[h]; if (!st || st >= 400) broken.push({ target: h, from: p.url, status: st || 0 }); }); });
    LABEL['seo:broken'] = 'Trasig intern länk';
    broken.forEach(function (b) { addIssue('seo', 'broken', b.from); });

    var rowsFor = function (cat) {
      var items = Object.keys(byIssue).filter(function (k) { return k.indexOf(cat + ':') === 0; }).map(function (k) {
        return { key: k, label: LABEL[k] || k, pages: byIssue[k] };
      }).sort(function (a, b) { return b.pages.length - a.pages.length; });
      var list = items.map(function (it) {
        var extra = it.key === 'seo:broken' ? '<ul class="sitetest__list">' + broken.map(function (b) { return '<li>' + path(b.from) + ' länkar till ' + path(b.target) + ' (' + (b.status || 'inget svar') + ')</li>'; }).join('') + '</ul>'
          : '<ul class="sitetest__list">' + it.pages.slice(0, 60).map(function (u) { return '<li>' + path(u) + '</li>'; }).join('') + (it.pages.length > 60 ? '<li>… och ' + (it.pages.length - 60) + ' till</li>' : '') + '</ul>';
        return '<details class="deep__item"><summary><b>' + esc(it.label) + '</b> <span>' + it.pages.length + ' sidor</span></summary>' + extra + '</details>';
      }).join('');
      var clean = ok.filter(function (p) { return !CHECKS.some(function (c) { return c[0] === cat && c[3](p); }) && !(cat === 'seo' && byIssue['seo:broken'] && byIssue['seo:broken'].indexOf(p.url) >= 0); }).length;
      var pct = ok.length ? Math.round(clean / ok.length * 100) : 0;
      return '<div class="deep__cat"><h3 class="sitetest__h3">' + (CATS.filter(function (c) { return c[0] === cat; })[0][1]) + ' <span class="deep__pct">' + pct + ' % av sidorna utan fel</span></h3>' +
        (list || '<p class="sitetest__note">Inga fel hittades i den här kategorin.</p>') + '</div>';
    };
    var lastErr = '';
    box.querySelector('#deep-out').innerHTML = '<p class="sitetest__note">Klar på ' + Math.round((Date.now() - t0) / 1000) + ' sekunder. Kontrollerade ' + ok.length + ' av ' + urls.length + ' sidor och ' + Object.keys(statusOf).length + ' interna länkar.' +
      (ok.length < urls.length ? ' ' + (urls.length - ok.length) + ' sidor kunde inte hämtas.' : '') + '</p>' +
      CATS.map(function (c) { return rowsFor(c[0]); }).join('') +
      '<p class="sitetest__note">Varje fel är kontrollerat mot sidans egen HTML. Externa länkar kontrolleras inte i den här analysen.</p>';
    box.querySelector('#deep-status').textContent = '';
  }

  document.addEventListener('sitetest:done', function (e) {
    box.hidden = false;
    box.innerHTML = '<section class="sitetest__more"><h2 class="sitetest__h2">Djupanalys av hela sajten</h2>' +
      '<p class="sitetest__note">Läser alla sidor i sajtkartan och kontrollerar varje länk, med SEO, tillgänglighet, bästa praxis och prestanda. Ett fel visas bara när sidans egen HTML visar det.</p>' +
      '<button type="button" class="btn btn--primary" id="deep-go"><span>Starta djupanalysen</span></button>' +
      '<p class="sitetest__note" id="deep-status"></p><div id="deep-out"></div></section>';
    var base = e.detail.url;
    box.querySelector('#deep-go').addEventListener('click', function () { this.disabled = true; run(base); });
  });
})();
