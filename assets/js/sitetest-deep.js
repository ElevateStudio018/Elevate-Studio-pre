/* "Djupanalys": reads every page in the sitemap, every link (internal and external), every picture, the security
   headers, the mail set-up and the certificate, and runs Google's own test on the most important pages. It shows
   what it is doing while it runs, and afterwards every finding with what is wrong and how we fix it. A finding is
   shown only when the page, the server or Google's test shows it. */
(function () {
  var box = document.getElementById('sitetest-deep');
  var btn = document.getElementById('sitetest-deep-btn');
  var input = document.querySelector('#sitetest-form input[name="url"]');
  var form = document.getElementById('sitetest-form');
  var quickResults = document.getElementById('sitetest-results');
  var quickExtra = document.getElementById('sitetest-extra');
  if (!box || !btn || !input || !form) return;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var path = function (u) { var s = String(u).replace(/^https?:\/\/[^/]+/, ''); return esc(s || '/'); };
  var kb = function (b) { return Math.round(b / 1024) + ' KB'; };
  var PSI_CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
  var CAT_NAMES = { performance: 'Prestanda', accessibility: 'Tillgänglighet', 'best-practices': 'Bästa praxis', seo: 'SEO' };
  var HEADERS_WANTED = { 'content-security-policy': 'Säkerhetspolicy (CSP)', 'strict-transport-security': 'HSTS', 'x-content-type-options': 'X-Content-Type-Options', 'x-frame-options': 'X-Frame-Options', 'referrer-policy': 'Referrer-Policy', 'permissions-policy': 'Permissions-Policy' };
  var STEPS = [
    'Hämtar listan över alla sidor',
    'Kollar varje sida: titlar, rubriker, text och bilder',
    'Letar efter sökord på sidorna',
    'Kollar alla länkar, både interna och externa',
    'Kollar alla bilder och deras storlek',
    'Kollar mejl, säkerhet och certifikat',
    'Kör Googles test på de viktigaste sidorna',
    'Sammanställer allt till en rapport'
  ];

  // What is wrong, and how we fix it. The key is the same id the checks use.
  var FIX = {
    'seo|title-missing': 'Vi skriver en titel per sida som beskriver tjänsten och orten, eftersom det är det Google visar i sökresultaten.',
    'seo|title-long': 'Vi korta titeln till under 60 tecken så att den inte klipps av i sökresultaten.',
    'seo|title-short': 'Vi gör titeln tydligare, med tjänst och ort, så att den säger mer än några få ord.',
    'seo|desc-missing': 'Vi skriver en beskrivning på 70 till 160 tecken per sida som får besökaren att klicka.',
    'seo|desc-long': 'Vi korta beskrivningen till under 160 tecken så att den syns hela i sökresultaten.',
    'seo|desc-short': 'Vi utökar beskrivningen till minst 70 tecken så att den säger vad sidan handlar om.',
    'seo|h1-missing': 'Vi lägger en huvudrubrik (h1) på varje sida som säger vad sidan handlar om.',
    'seo|h1-multi': 'Vi behåller en huvudrubrik (h1) per sida och gör övriga rubriker till h2.',
    'seo|heading-skip': 'Vi bygger rubrikerna i ordning, h1, h2, h3, så att både Google och skärmläsare följer strukturen.',
    'seo|heading-empty': 'Vi tar bort tomma rubriker eller fyller dem med text.',
    'seo|canonical': 'Vi lägger en canonical-länk på varje sida så att Google vet vilken adress som är den riktiga.',
    'seo|og': 'Vi lägger till titel, beskrivning, adress och bild för delning, så att sidan ser bra ut när den delas.',
    'seo|noindex': 'Vi tar bort noindex från sidor som ska synas i Google. Gäller det en avsiktlig sida, som en admin- eller bokningssida, lämnas den.',
    'seo|ld-bad': 'Vi rättar den strukturerade datan så att Google kan läsa den och visa rikare sökresultat.',
    'seo|generic': 'Vi byter ut "läs mer" mot en länktext som säger vart länken går, till exempel "Se våra priser".',
    'seo|thin': 'Vi skriver mer innehåll på sidan, så att den svarar på det besökaren undrar över. Sidor under 150 ord är svåra för Google att förstå.',
    'seo|dup-title': 'Vi ger varje sida en egen titel, så att Google inte väljer mellan flera likadana.',
    'seo|dup-text': 'Vi skriver om texten så att varje sida har eget innehåll. Samma text på flera sidor konkurrerar mot varandra.',
    'seo|sitemap': 'Vi skapar en sajtkarta (sitemap.xml) och skickar in den till Google Search Console.',
    'seo|robots': 'Vi lägger till en robots.txt som säger vad sökmotorer får läsa och pekar på sajtkartan.',
    'seo|robots-block': 'Vi tar bort regeln som blockerar hela sajten, annars syns inga sidor i Google.',
    'seo|soft404': 'Vi ser till att okända adresser ger en riktig 404-sida, så att Google inte indexerar tomma sidor.',
    'access|lang': 'Vi anger språket på sidan (lang="sv"), så att skärmläsare uttalar texten rätt och Google förstår språket.',
    'access|viewport': 'Vi lägger till viewport-inställningen, så att sidan anpassas till mobilens skärm.',
    'access|alt': 'Vi skriver en kort bildtext (alt) för varje bild som säger vad den visar. Dekorativa bilder får tom alt.',
    'access|link-empty': 'Vi ger varje länk en text eller ett aria-label som säger vart den går.',
    'access|button-empty': 'Vi ger varje knapp en text eller ett aria-label som säger vad den gör.',
    'access|input-label': 'Vi kopplar en etikett till varje fält, så att alla vet vad de ska skriva i det.',
    'practice|refresh': 'Vi byter ut meta refresh mot en riktig omdirigering på servern.',
    'practice|doctype': 'Vi lägger till doctype (<!doctype html>) så att webbläsare visar sidan som den är tänkt.',
    'practice|charset': 'Vi anger teckenuppsättningen (utf-8) så att å, ä och ö visas rätt.',
    'practice|mixed': 'Vi byter alla http-adresser mot https, så att webbläsare inte varnar för osäkert innehåll.',
    'practice|blank': 'Vi lägger till rel="noopener" på länkar som öppnar ny flik, så att den nya sidan inte kan styra din.',
    'practice|deprecated': 'Vi byter ut föråldrade taggar mot modern HTML och CSS.',
    'practice|hdr-content-security-policy': 'Vi inför en säkerhetspolicy (CSP) som hindrar skadliga skript från att köras på sajten.',
    'practice|hdr-strict-transport-security': 'Vi slår på HSTS, så att webbläsare alltid använder krypterad anslutning.',
    'practice|hdr-x-content-type-options': 'Vi lägger till nosniff, så att webbläsaren inte gissar filtyper.',
    'practice|hdr-x-frame-options': 'Vi sätter X-Frame-Options, så att ingen kan bädda in sajten och lura besökare.',
    'practice|hdr-referrer-policy': 'Vi begränsar vilken information som skickas när besökaren klickar sig vidare från sajten.',
    'practice|hdr-permissions-policy': 'Vi begränsar vilka funktioner i webbläsaren som sajten får använda.',
    'perf|blocking': 'Vi lägger defer på skripten i sidhuvudet, så att sidan syns innan de körs.',
    'perf|img-size': 'Vi anger width och height på alla bilder, så att sidan inte hoppar när bilderna laddas.',
    'perf|heavy': 'Vi tar bort kod och stilar som inte behövs, och flyttar ut stora delar till egna filer.',
    'perf|inline-styles': 'Vi samlar stilarna i en stilfil i stället för inline på elementen.',
    'perf|inline-scripts': 'Vi flyttar skripten till egna filer, så att de kan cachas.',
    'perf|img-big': 'Vi gör bilden mindre och i rätt storlek för var den visas, eftersom den är större än 300 KB.',
    'perf|img-format': 'Vi konverterar bilden till WebP eller AVIF, som ofta är hälften så stor vid samma kvalitet.',
    'perf|no-gzip': 'Vi slår på komprimering (gzip eller brotli) på servern, så att sidan skickas mindre.',
    'perf|no-cache-css': 'Vi ställer in lång cache för stilfilen, så att återkommande besök går snabbare.',
    'security|spf': 'Vi lägger in en SPF-post i DNS, så att mottagare vet vilka servrar som får skicka mejl för domänen.',
    'security|dkim': 'Vi aktiverar DKIM i mejlsystemet och lägger in nyckeln i DNS, så att mejlen kan verifieras.',
    'security|dmarc': 'Vi lägger in en DMARC-post i DNS, så att ingen kan skicka mejl som ser ut att komma från er.',
    'security|dmarc-none': 'Vi höjer DMARC-policyn till quarantine och sedan reject, när vi sett att legitima mejl går igenom.',
    'security|mx': 'Vi kontrollerar DNS så att mejl till domänen går att ta emot.',
    'security|cert': 'Vi kontrollerar att förnyelsen av certifikatet fungerar, så att webbläsare inte varnar för sajten.',
    'links|broken-int': 'Vi rättar länken till rätt adress, eller lägger en omdirigering från den gamla adressen.',
    'links|redir': 'Vi uppdaterar länken så att den pekar direkt på slutadressen, så att besökaren och Google slipper ett steg.',
    'links|broken-ext': 'Vi byter länken mot en fungerande adress eller tar bort den.',
    'links|ext-unknown': 'Kontrollera länken manuellt i en webbläsare. Om den fungerar behöver inget göras.',
    'links|img-broken': 'Vi laddar upp bilden på nytt eller byter ut den mot en som fungerar.'
  };
  var SEVERE = { 'seo|title-missing': 1, 'seo|h1-missing': 1, 'seo|noindex': 1, 'seo|robots-block': 1, 'practice|mixed': 1, 'security|spf': 1, 'security|dmarc': 1, 'security|cert': 1, 'links|broken-int': 1, 'links|broken-ext': 1, 'links|img-broken': 1, 'practice|hdr-content-security-policy': 1 };
  var STOP = ('och att en ett för av till på i med är som om vi ni du det den de från eller vår våra din era ert hos var vara har ha kan får blir när också mer mest alla allt inte så nu här där hur vad vem vilka hemsida hemsidan sidan sida företag webbyrå sajt').split(' ');

  // ---------- helpers ----------
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
  var ring = function (pct, label, tone) {
    var c = 2 * Math.PI * 52, s = Math.max(0, Math.min(100, pct)) / 100;
    var cls = tone || (pct >= 90 ? 'good' : pct >= 50 ? 'ok' : 'bad');
    return '<div class="score score--' + cls + '"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="score__bg"/>' +
      '<circle cx="60" cy="60" r="52" class="score__fg" stroke-dasharray="' + (c * s).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>' +
      '<span class="score__value">' + Math.round(pct) + '</span><span class="score__label">' + esc(label) + '</span></div>';
  };

  // ---------- progress, shown in the panel while the test runs ----------
  var panel = null;
  // Same look as the quick test: the same white progress box, bar, step text and time
  var startedAt = 0, timer = null;
  function progressPanel() {
    box.innerHTML = '<div class="sitetest__progress" style="display:block" id="deep-progress">' +
      '<div class="sitetest__progress-head"><p class="sitetest__step" id="deep-title">Startar …</p><span class="sitetest__time" id="deep-time">0 s</span></div>' +
      '<div class="sitetest__bar"><i id="deep-line"></i></div>' +
      '<p class="sitetest__note" id="deep-now">Djupanalys av hela sajten. Det tar oftast 1 till 3 minuter. Stäng inte sidan.</p></div>';
    panel = box.querySelector('#deep-progress');
    startedAt = Date.now();
    clearInterval(timer);
    timer = setInterval(function () { var t = panel && panel.querySelector('#deep-time'); if (t) t.textContent = Math.round((Date.now() - startedAt) / 1000) + ' s'; }, 500);
  }
  function setStep(i, detail) {
    if (!panel) return;
    var pct = Math.round(i / STEPS.length * 100);
    panel.querySelector('#deep-line').style.width = pct + '%';
    panel.querySelector('#deep-title').textContent = (i < STEPS.length ? STEPS[i] : 'Klart') + ' (' + Math.min(i + 1, STEPS.length) + ' av ' + STEPS.length + ')';
    panel.querySelector('#deep-now').textContent = 'Djupanalys av hela sajten.' + (detail ? ' ' + detail + '.' : '');
    if (near) near.textContent = STEPS[i] + (detail ? ' (' + detail + ')' : '') + ' …';
  }

  // ---------- the run ----------
  var near = null;
  function run(base, t0, finish) {
    var R = { base: base };
    setStep(0);
    post('list', {}, base).then(function (list) {
      R.urls = list.urls || [];
      return post('headers', {}, base).then(function (h) { R.headers = h; });
    }).then(function () {
      setStep(1, R.urls.length + ' sidor');
      return pool(chunks(R.urls, 12), 4, function (c) { return post('pages', { urls: c }, base).then(function (r) { return r.pages || []; }); })
        .then(function (g) {
          R.pages = [].concat.apply([], g).filter(Boolean);
          R.ok = R.pages.filter(function (p) { return p.ok; });
          setStep(2, R.ok.length + ' sidor');
          var internal = {}, external = {}, images = {};
          R.ok.forEach(function (p) {
            p.links.internal.forEach(function (h) { internal[h] = 1; });
            p.links.external.forEach(function (h) { external[h] = 1; });
            p.links.images.forEach(function (h) { images[h] = 1; });
          });
          R.internal = Object.keys(internal); R.external = Object.keys(external); R.images = Object.keys(images);
          return Promise.all([
            pool(chunks(R.internal, 40), 4, function (c) { return post('links', { urls: c }, base).then(function (r) { return r.links || []; }); }),
            pool(chunks(R.external, 40), 4, function (c) { return post('links', { urls: c }, base).then(function (r) { return r.links || []; }); }),
            pool(chunks(R.images, 40), 4, function (c) { return post('images', { urls: c }, base).then(function (r) { return r.images || []; }); })
          ]);
        })
        .then(function (res) {
          setStep(3, R.internal.length + ' interna, ' + R.external.length + ' externa');
          R.linkStatus = {}; [].concat.apply([], res[0]).forEach(function (l) { R.linkStatus[l.url] = l; });
          R.extStatus = {}; [].concat.apply([], res[1]).forEach(function (l) { R.extStatus[l.url] = l; });
          R.imgStatus = {}; [].concat.apply([], res[2]).forEach(function (l) { R.imgStatus[l.url] = l; });
          setStep(4, R.images.length + ' bilder');
          // keywords: the words our pages use in titles and descriptions (we do not know search volumes)
          var words = {};
          R.ok.forEach(function (p) {
            ((p.a.title || '') + ' ' + (p.a.desc || '')).toLowerCase().replace(/[^a-zåäöé0-9\s-]/g, ' ').split(/\s+/).forEach(function (w) {
              if (w.length < 4 || STOP.indexOf(w) >= 0 || /^\d+$/.test(w)) return;
              words[w] = (words[w] || 0) + 1;
            });
          });
          R.keywords = Object.keys(words).map(function (w) { return { w: w, n: words[w] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 16);
          setStep(5);
          return fetch('/api/sitecheck?url=' + encodeURIComponent(base)).then(function (r) { return r.json(); }).catch(function () { return {}; });
        })
        .then(function (sc) {
          R.mail = sc.mail || null; R.cert = sc.cert || null; R.files = sc.files || null;
          var pick = [];
          var add = function (u) { if (u && pick.indexOf(u) < 0 && pick.length < 12) pick.push(u); };
          add(R.base); R.ok.forEach(function (p) { if (/\/(kontakt|priser|tjanster)/.test(p.url)) add(p.url); });
          R.ok.forEach(function (p) { add(p.url); });
          R.psiPages = pick; R.psi = {};
          var done = 0;
          setStep(6, '0 av ' + pick.length + ' sidor');
          return pool(pick, 3, function (u) {
            return psi(u).then(function (lr) { R.psi[u] = lr; }).catch(function (e) { R.psi[u] = { error: e.message }; })
              .then(function () { done++; setStep(6, done + ' av ' + pick.length + ' sidor'); });
          });
        });
    }).then(function () {
      setStep(7);
      clearInterval(timer);
      show(R, t0);
      finish(true);
    }).catch(function (e) {
      clearInterval(timer);
      if (panel) panel.querySelector('#deep-now').textContent = 'Djupanalysen kunde inte slutföras: ' + (e.message || 'okänt fel') + '. Försök igen om en stund.';
      finish(false);
    });
  }

  // ---------- findings ----------
  function collect(R) {
    var F = {};
    var add = function (cat, id, label, where, extra) {
      var k = cat + '|' + id;
      if (!F[k]) F[k] = { cat: cat, id: id, label: label, where: [], google: !!extra };
      F[k].where.push(where);
    };
    var ok = R.ok, pageBad = { seo: {}, access: {}, practice: {}, perf: {} }, extBroken = {}, extSeen = {};
    ok.forEach(function (p) {
      var a = p.a, d = p.d, u = p.url, lab = path(u);
      var t = function (cat, id, label) { pageBad[cat][u] = 1; add(cat, id, label, lab); };
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
      if (!d.ogComplete) t('seo', 'og', 'Saknar fullständig information för delning i sociala medier (Open Graph)');
      if (a.noindex) t('seo', 'noindex', 'Markerad noindex, Google visar inte sidan');
      if (a.ldBad) t('seo', 'ld-bad', 'Strukturerad data (JSON-LD) är trasig, Google ignorerar den');
      if (d.genericLinks) t('seo', 'generic', 'Länktext som "läs mer" eller "klicka här"');
      if (d.words < 150) t('seo', 'thin', 'Tunn text, under 150 ord på sidan (' + d.words + ' ord)');
      if (d.metaRefresh) t('practice', 'refresh', 'Använder meta refresh för omdirigering');
      if (!a.lang) t('access', 'lang', 'Språket är inte angivet (lang)');
      if (!a.viewport) t('access', 'viewport', 'Saknar viewport, sidan skalas fel på mobil');
      if (a.noAlt) t('access', 'alt', 'Bilder saknar alt-text (' + a.noAlt + ' st)');
      if (d.emptyLinks) t('access', 'link-empty', 'Länkar utan text eller etikett');
      if (d.emptyButtons) t('access', 'button-empty', 'Knappar utan text eller etikett');
      if (d.unlabeledInputs) t('access', 'input-label', 'Fält utan etikett');
      if (!d.doctype) t('practice', 'doctype', 'Saknar doctype');
      if (!d.charset) t('practice', 'charset', 'Saknar teckenuppsättning (charset)');
      if (a.mixed) t('practice', 'mixed', 'Laddar innehåll över http i stället för https');
      if (d.blankTarget) t('practice', 'blank', 'Länk som öppnar ny flik utan rel="noopener" (' + d.blankTarget + ' st)');
      if (d.deprecated) t('practice', 'deprecated', 'Föråldrade HTML-taggar (font, center m.fl.)');
      if (d.blockingScripts) t('perf', 'blocking', 'Skript i sidhuvudet blockerar visningen (' + d.blockingScripts + ' st)');
      if (d.imgNoSize) t('perf', 'img-size', 'Bilder utan width och height (' + d.imgNoSize + ' st), ger layoutskift');
      if (d.bytes > 150 * 1024) t('perf', 'heavy', 'Stor HTML-fil (' + kb(d.bytes) + ')');
      if (d.inlineStyles > 200) t('perf', 'inline-styles', 'Många inline-stilar (' + d.inlineStyles + ')');
      if (d.inlineScripts > 5) t('perf', 'inline-scripts', 'Många inline-skript (' + d.inlineScripts + ')');
    });
    var titles = {}, texts = {};
    ok.forEach(function (p) {
      if (p.a.title) (titles[p.a.title] = titles[p.a.title] || []).push(p.url);
      if (p.d.words >= 30) (texts[p.d.textHash] = texts[p.d.textHash] || []).push(p.url);
    });
    Object.keys(titles).forEach(function (t) { if (titles[t].length > 1) titles[t].forEach(function (u) { add('seo', 'dup-title', 'Samma titel på flera sidor', path(u)); }); });
    Object.keys(texts).forEach(function (h) { if (texts[h].length > 1) texts[h].forEach(function (u) { add('seo', 'dup-text', 'Samma innehåll på flera sidor', path(u)); }); });
    ok.forEach(function (p) {
      p.links.internal.forEach(function (h) {
        var s = R.linkStatus[h] || {};
        if (!s.status || s.status >= 400) add('links', 'broken-int', 'Trasig intern länk', path(p.url) + ' → ' + path(h) + ' (' + (s.status || 'inget svar') + ')');
        else if (s.redirected) add('links', 'redir', 'Intern länk som omdirigeras', path(p.url) + ' → ' + path(h));
      });
      p.links.external.forEach(function (h) {
        var s = R.extStatus[h] || {};
        if (s.status === 429 || s.status === 403 || s.status === 999) { extSeen[h] = extSeen[h] || { status: s.status, pages: [] }; extSeen[h].pages.push(p.url); }
        else if (!s.status || s.status >= 400) { extBroken[h] = extBroken[h] || { status: s.status, pages: [] }; extBroken[h].pages.push(p.url); }
      });
    });
    // one line per external address, with the number of pages that link to it
    Object.keys(extBroken).forEach(function (h) { add('links', 'broken-ext', 'Trasig extern länk', esc(h) + ' (' + (extBroken[h].status || 'inget svar') + ') från ' + extBroken[h].pages.length + ' sidor'); });
    Object.keys(extSeen).forEach(function (h) { add('links', 'ext-unknown', 'Extern länk som inte går att kontrollera automatiskt', esc(h) + ' svarar ' + extSeen[h].status + ', webbplatsen blockerar robotar. Länken är oftast fungerande.'); });
    var imgTotal = Object.keys(R.imgStatus).length;
    Object.keys(R.imgStatus).forEach(function (src) {
      var im = R.imgStatus[src], where = path(src);
      if (!im.status || im.status >= 400) add('links', 'img-broken', 'Trasig bild', where);
      if (im.bytes > 300 * 1024) add('perf', 'img-big', 'Stor bild över 300 KB (' + kb(im.bytes) + ')', where);
      else if (im.bytes > 120 * 1024 && /jpeg|png/.test(im.type)) add('perf', 'img-format', 'Bild över 120 KB i jpg eller png (' + kb(im.bytes) + ')', where);
    });
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
    var m = R.mail;
    if (m) {
      if (!m.spf.found) add('security', 'spf', 'SPF saknas, mejl från domänen kan hamna i skräpposten', 'domänen');
      if (!m.dkim.found) add('security', 'dkim', 'DKIM hittades inte bland vanliga väljare', 'domänen');
      if (!m.dmarc.found) add('security', 'dmarc', 'DMARC saknas, andra kan skicka mejl som ser ut att komma från er', 'domänen');
      else if (m.dmarc.policy === 'none') add('security', 'dmarc-none', 'DMARC står på none, bara övervakning', 'domänen');
      if (!m.mx.found) add('security', 'mx', 'Inga MX-poster, domänen kan inte ta emot mejl', 'domänen');
    }
    if (R.cert && R.cert.checked && R.cert.daysLeft < 30) add('security', 'cert', 'Certifikatet går ut om ' + R.cert.daysLeft + ' dagar', 'domänen');

    // Google's test: failing audits, grouped by the pages they were found on
    var psiOk = R.psiPages.filter(function (u) { return R.psi[u] && !R.psi[u].error; });
    var hits = {};
    psiOk.forEach(function (u) {
      var lr = R.psi[u];
      PSI_CATS.forEach(function (c) {
        var cat = lr.categories[c]; if (!cat) return;
        cat.auditRefs.forEach(function (ref) {
          var a = lr.audits[ref.id];
          if (!a || a.score === null || a.score >= 0.9 || ['manual', 'notApplicable', 'informative'].indexOf(a.scoreDisplayMode) >= 0) return;
          var k = c + '|' + ref.id;
          hits[k] = hits[k] || { cat: c, title: a.title, desc: a.description, pages: [], value: a.displayValue || '' };
          hits[k].pages.push(u);
        });
      });
    });
    var gcat = function (c) { return c === 'performance' ? 'perf' : c === 'accessibility' ? 'access' : c === 'best-practices' ? 'practice' : 'seo'; };
    return { F: F, pageBad: pageBad, psiOk: psiOk, hits: hits, gcat: gcat, imgTotal: imgTotal };
  }

  function show(R, t0) {
    var C = collect(R), F = C.F, ok = R.ok, total = ok.length || 1;
    var pctPages = function (cat) { return Math.round((ok.length - Object.keys(C.pageBad[cat]).length) / total * 100); };
    var linksTotal = R.internal.length + R.external.length;
    var linksBad = Object.keys(F).filter(function (k) { return k.indexOf('links|broken') === 0; }).reduce(function (n, k) { return n + F[k].where.length; }, 0);
    var sec = 0; ['spf', 'dkim', 'dmarc', 'dmarc-none', 'mx', 'cert'].forEach(function (id) { if (F['security|' + id]) sec++; });
    var secPct = Math.max(0, Math.round((6 - sec) / 6 * 100));
    var rings = [
      ring(pctPages('seo'), 'SEO'), ring(pctPages('access'), 'Tillgänglighet'), ring(pctPages('practice'), 'Bästa praxis'),
      ring(pctPages('perf'), 'Prestanda'), ring(secPct, 'Säkerhet och mejl'), ring(linksTotal ? Math.round((linksTotal - linksBad) / linksTotal * 100) : 100, 'Länkar')
    ].join('');
    var gAvg = {};
    if (C.psiOk.length) PSI_CATS.forEach(function (c) { var s = C.psiOk.map(function (u) { return R.psi[u].categories[c].score; }); gAvg[c] = Math.round(s.reduce(function (a, b) { return a + b; }, 0) / s.length * 100); });
    var googleRings = C.psiOk.length ? PSI_CATS.map(function (c) { return ring(gAvg[c], CAT_NAMES[c]); }).join('') : '';

    var html = '<p class="deep__summary"><b>Klart på ' + Math.round((Date.now() - t0) / 1000) + ' sekunder.</b> Vi läste ' + ok.length + ' av ' + R.urls.length + ' sidor, ' + R.internal.length + ' interna och ' + R.external.length + ' externa länkar, ' + C.imgTotal + ' bilder och ' + C.psiOk.length + ' sidor i Googles test.' +
      (ok.length < R.urls.length ? ' ' + (R.urls.length - ok.length) + ' sidor gick inte att läsa.' : '') + '</p>';
    html += '<h3 class="sitetest__h3">Sajten i siffror</h3><div class="deep__rings">' + rings + '</div>';
    if (googleRings) html += '<h3 class="sitetest__h3">Googles test, snitt för ' + C.psiOk.length + ' viktiga sidor (mobil)</h3><div class="deep__rings">' + googleRings + '</div>';

    // keywords
    if (R.keywords && R.keywords.length) {
      html += '<h3 class="sitetest__h3">Sökord som sidorna använder</h3>' +
        '<p class="sitetest__note">Orden som förekommer mest i era titlar och beskrivningar. Vi mäter inte hur många som söker på dem, det kräver ett sökverktyg med sökvolymer. Se Sökord på Google i admin för vad som faktiskt ger visningar.</p>' +
        '<div class="deep__kw">' + R.keywords.map(function (k) { return '<span>' + esc(k.w) + ' <b>' + k.n + '</b></span>'; }).join('') + '</div>';
    }

    // categories
    var CATS = [['seo', 'SEO', pctPages('seo')], ['access', 'Tillgänglighet', pctPages('access')], ['practice', 'Bästa praxis', pctPages('practice')], ['perf', 'Prestanda', pctPages('perf')], ['security', 'Säkerhet och mejl', secPct], ['links', 'Länkar och bilder', linksTotal ? Math.round((linksTotal - linksBad) / linksTotal * 100) : 100]];
    CATS.forEach(function (c) {
      var items = Object.keys(F).filter(function (k) { return F[k].cat === c[0]; }).map(function (k) { return F[k]; })
        .sort(function (a, b) { return (SEVERE[b.cat + '|' + b.id] || 0) - (SEVERE[a.cat + '|' + a.id] || 0) || b.where.length - a.where.length; });
      var googleItems = Object.keys(C.hits).filter(function (k) { return C.gcat(C.hits[k].cat) === c[0]; }).map(function (k) { return C.hits[k]; })
        .sort(function (a, b) { return b.pages.length - a.pages.length; });
      var all = items.map(function (it) { return card(it, false); }).concat(googleItems.map(function (h) { return gcard(h, C.psiOk.length); }));
      html += '<div class="deep__cat"><h3 class="sitetest__h3">' + c[1] + ' <span class="deep__pct">' + c[2] + ' %</span></h3>';
      if (!all.length) html += '<p class="sitetest__note deep__ok">Inga fel hittades i den här kategorin.</p>';
      else {
        html += '<div class="deep__cards">' + all.slice(0, 3).join('') + '</div>';
        if (all.length > 3) html += '<details class="deep__all"><summary>Se alla ' + all.length + ' fel i ' + c[1].toLowerCase() + '</summary><div class="deep__cards">' + all.slice(3).join('') + '</div></details>';
      }
      html += '</div>';
    });
    if (R.mail) html += '<div class="deep__cat"><h3 class="sitetest__h3">Mejl och certifikat</h3><p class="sitetest__note">SPF ' + (R.mail.spf.found ? 'finns' : 'saknas') + ', DKIM ' + (R.mail.dkim.found ? 'hittat' : 'hittades inte') + ', DMARC ' + (R.mail.dmarc.found ? 'policy ' + esc(R.mail.dmarc.policy) : 'saknas') + '. ' + (R.cert && R.cert.checked ? 'Certifikatet gäller till ' + esc(R.cert.expires) + '.' : '') + '</p></div>';
    html += '<p class="sitetest__note">Varje fel är kontrollerat mot sidans egen HTML, sajtens svar, DNS eller Googles test. Googles test gäller mobil och görs på de viktigaste sidorna.</p>';
    box.innerHTML = '<section class="sitetest__more deep__result"><h2 class="sitetest__h2">Djupanalys av hela sajten</h2>' + html + '</section>';
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // one finding: what is wrong, where, and how we fix it, with the full list of pages under "Se alla sidor"
  function card(it, _) {
    var key = it.cat + '|' + it.id;
    var sev = SEVERE[key] ? 'bad' : 'ok';
    var fix = FIX[key] || FIX[it.cat === 'practice' && it.id.indexOf('hdr-') === 0 ? 'practice|' + it.id : key] || '';
    return '<article class="deep__card deep__card--' + sev + '">' +
      '<h4>' + esc(it.label) + '</h4>' +
      '<p class="deep__count">' + it.where.length + (it.where.length === 1 ? ' förekomst' : ' förekomster') + '</p>' +
      '<p class="deep__fix"><b>Så löser vi det:</b> ' + esc(fix || 'Vi åtgärdar det i sidans kod eller innehåll.') + '</p>' +
      '<details><summary>Se alla sidor</summary><ul>' + it.where.slice(0, 200).map(function (w) { return '<li>' + w + '</li>'; }).join('') +
      (it.where.length > 200 ? '<li>… och ' + (it.where.length - 200) + ' till</li>' : '') + '</ul></details></article>';
  }
  function gcard(h, n) {
    var fix = String(h.desc || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '').split('. ')[0];
    return '<article class="deep__card deep__card--' + (h.pages.length > n / 2 ? 'bad' : 'ok') + '">' +
      '<h4>' + esc(h.title) + '</h4>' +
      '<p class="deep__count">Googles test: ' + h.pages.length + ' av ' + n + ' sidor' + (h.value ? ', ' + esc(h.value) : '') + '</p>' +
      '<p class="deep__fix"><b>Så löser vi det:</b> ' + esc(fix || 'Vi åtgärdar det enligt Googles rekommendation.') + '.</p>' +
      '<details><summary>Se alla sidor</summary><ul>' + h.pages.map(function (u) { return '<li>' + path(u) + '</li>'; }).join('') + '</ul></details></article>';
  }

  // ---------- the button: starts the deep test and takes the place of the quick result ----------
  near = document.createElement('p');
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
    if (label) label.textContent = 'Djupanalys körs …';
    if (quickResults) quickResults.hidden = true;
    if (quickExtra) quickExtra.hidden = true;
    var qp = document.getElementById('sitetest-progress'); if (qp) qp.hidden = true;
    box.hidden = false;
    progressPanel();
    window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
    run(base, Date.now(), function (done) {
      btn.disabled = false;
      if (label) label.textContent = idle;
      near.textContent = done ? 'Klart. Resultatet visas nedanför.' : '';
    });
  });

  // a quick test replaces the deep result, and the other way round
  form.addEventListener('submit', function () { box.hidden = true; box.innerHTML = ''; panel = null; });
})();
