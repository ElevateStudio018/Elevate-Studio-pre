/* "Testa din sajt": runs a real Google PageSpeed Insights (Lighthouse) audit of any public URL
   and explains in Swedish how each problem can be fixed. Nothing is simulated: if the test
   cannot run, an honest error message is shown instead of results. */
(function () {
  var form = document.getElementById('sitetest-form');
  if (!form) return;

  var API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  var KEY = form.dataset.apiKey || '';
  var prefix = form.dataset.prefix || '';
  var input = form.querySelector('input[name="url"]');
  var button = form.querySelector('button[type="submit"]');
  var progress = document.getElementById('sitetest-progress');
  var bar = progress.querySelector('.sitetest__bar i');
  var stepText = progress.querySelector('.sitetest__step');
  var timeText = progress.querySelector('.sitetest__time');
  var results = document.getElementById('sitetest-results');
  var errorBox = document.getElementById('sitetest-error');

  var STEPS = [
    'Öppnar sidan i en riktig webbläsare …',
    'Mäter hur snabbt innehållet visas …',
    'Kontrollerar bilder, skript och typsnitt …',
    'Granskar tillgänglighet och kontraster …',
    'Går igenom SEO och metadata …',
    'Letar efter säkerhetsbrister och fel …',
    'Sammanställer resultatet …'
  ];

  var CATEGORIES = [
    { id: 'performance', label: 'Prestanda' },
    { id: 'accessibility', label: 'Tillgänglighet' },
    { id: 'best-practices', label: 'Bästa praxis' },
    { id: 'seo', label: 'SEO' }
  ];

  var METRICS = [
    { id: 'first-contentful-paint', label: 'Första innehåll' },
    { id: 'largest-contentful-paint', label: 'Största innehåll' },
    { id: 'total-blocking-time', label: 'Blockeringstid' },
    { id: 'cumulative-layout-shift', label: 'Layoutskift' },
    { id: 'speed-index', label: 'Hastighetsindex' }
  ];

  // How we would fix the most common findings, and which service it belongs to.
  var FIXES = {
    'render-blocking-resources': ['Vi laddar kritisk CSS först och skjuter upp skript som inte behövs direkt, så att sidan syns tidigare.', 'utveckling'],
    'uses-optimized-images': ['Vi komprimerar bilderna utan synlig kvalitetsförlust och automatiserar det för nya bilder.', 'utveckling'],
    'modern-image-formats': ['Vi konverterar bilder till moderna format som WebP eller AVIF, som ofta är hälften så stora.', 'utveckling'],
    'uses-responsive-images': ['Vi levererar rätt bildstorlek till varje skärm i stället för att skicka stora bilder till mobilen.', 'utveckling'],
    'offscreen-images': ['Vi laddar bilder först när de närmar sig skärmen (lazy loading).', 'utveckling'],
    'unused-javascript': ['Vi rensar bort oanvänd JavaScript och delar upp koden så att varje sida bara laddar det den behöver.', 'utveckling'],
    'unused-css-rules': ['Vi tar bort oanvänd CSS och bryter ut det som behövs för första visningen.', 'utveckling'],
    'unminified-javascript': ['Vi minifierar JavaScript i byggsteget.', 'utveckling'],
    'unminified-css': ['Vi minifierar CSS i byggsteget.', 'utveckling'],
    'server-response-time': ['Vi snabbar upp servern med cachning, bättre hosting eller ett CDN nära besökarna.', 'drift-och-support'],
    'uses-text-compression': ['Vi slår på gzip- eller Brotli-komprimering på servern.', 'drift-och-support'],
    'uses-long-cache-ttl': ['Vi ställer in långa cachetider för bilder, typsnitt och skript så att återkommande besök går blixtsnabbt.', 'drift-och-support'],
    'redirects': ['Vi tar bort onödiga omdirigeringar så att besökaren kommer direkt till rätt sida.', 'drift-och-support'],
    'uses-rel-preconnect': ['Vi förbereder anslutningar till viktiga externa tjänster tidigt.', 'utveckling'],
    'font-display': ['Vi ser till att text syns direkt medan typsnitten laddas.', 'utveckling'],
    'third-party-summary': ['Vi går igenom tredjepartsskript (annonser, chattar, spårning) och laddar dem smartare eller tar bort det som inte behövs.', 'utveckling'],
    'total-byte-weight': ['Vi bantar sidans totala storlek genom att optimera bilder, skript och typsnitt.', 'utveckling'],
    'dom-size': ['Vi förenklar sidans struktur så att webbläsaren får mindre att räkna på.', 'utveckling'],
    'bootup-time': ['Vi minskar tung JavaScript som tar lång tid att köra på mobiler.', 'utveckling'],
    'mainthread-work-breakdown': ['Vi flyttar tunga beräkningar bort från huvudtråden så att sidan svarar direkt på klick.', 'utveckling'],
    'largest-contentful-paint': ['Vi prioriterar sidans viktigaste bild eller rubrik så att den visas snabbare.', 'utveckling'],
    'largest-contentful-paint-element': ['Vi prioriterar sidans viktigaste bild eller rubrik så att den visas snabbare.', 'utveckling'],
    'first-contentful-paint': ['Vi minskar det som måste laddas innan något alls kan visas.', 'utveckling'],
    'total-blocking-time': ['Vi delar upp långa skript så att sidan kan svara på klick och scroll direkt.', 'utveckling'],
    'cumulative-layout-shift': ['Vi reserverar plats för bilder, annonser och typsnitt så att innehållet inte hoppar när sidan laddar.', 'utveckling'],
    'layout-shift-elements': ['Vi reserverar plats för bilder, annonser och typsnitt så att innehållet inte hoppar när sidan laddar.', 'utveckling'],
    'speed-index': ['Vi optimerar ordningen innehållet laddas i så att sidan upplevs snabbare.', 'utveckling'],
    'color-contrast': ['Vi justerar färgerna så att texten blir läsbar för alla, även med nedsatt syn.', 'inkludering'],
    'image-alt': ['Vi skriver beskrivande alternativtexter så att bilder fungerar med skärmläsare och i sök.', 'inkludering'],
    'button-name': ['Vi ger alla knappar tydliga namn som skärmläsare kan läsa upp.', 'inkludering'],
    'link-name': ['Vi ger alla länkar beskrivande texter.', 'inkludering'],
    'label': ['Vi kopplar etiketter till alla formulärfält.', 'inkludering'],
    'heading-order': ['Vi rättar rubrikordningen så att sidan går att navigera med skärmläsare.', 'inkludering'],
    'html-has-lang': ['Vi anger sidans språk så att skärmläsare uttalar texten rätt.', 'inkludering'],
    'target-size': ['Vi gör knappar och länkar tillräckligt stora för att träffa med fingret.', 'inkludering'],
    'tap-targets': ['Vi gör knappar och länkar tillräckligt stora för att träffa med fingret.', 'inkludering'],
    'aria-allowed-attr': ['Vi rättar felaktiga ARIA-attribut.', 'inkludering'],
    'document-title': ['Vi skriver en tydlig sidtitel som lockar till klick i sökresultaten.', 'digital-tillvaxt'],
    'meta-description': ['Vi skriver säljande metabeskrivningar för varje sida.', 'digital-tillvaxt'],
    'link-text': ['Vi byter ut "Läs mer"-länkar mot beskrivande texter som både Google och besökare förstår.', 'digital-tillvaxt'],
    'is-crawlable': ['Vi ser till att Google får indexera sidan.', 'digital-tillvaxt'],
    'robots-txt': ['Vi rättar robots.txt så att sökmotorerna hittar rätt sidor.', 'digital-tillvaxt'],
    'canonical': ['Vi lägger in korrekta canonical-länkar så att Google vet vilken sida som är originalet.', 'digital-tillvaxt'],
    'hreflang': ['Vi rättar språkversionerna så att rätt sida visas i rätt land.', 'digital-tillvaxt'],
    'structured-data': ['Vi lägger till strukturerad data som kan ge rikare sökresultat.', 'digital-tillvaxt'],
    'font-size': ['Vi ökar textstorleken så att sidan är läsbar på mobil utan att zooma.', 'design'],
    'viewport': ['Vi gör sidan mobilanpassad.', 'design'],
    'is-on-https': ['Vi flyttar hela sajten till säker HTTPS.', 'drift-och-support'],
    'errors-in-console': ['Vi rättar JavaScript-felen som uppstår när sidan laddas.', 'utveckling'],
    'inspector-issues': ['Vi rättar de problem som webbläsaren varnar för.', 'utveckling'],
    'deprecations': ['Vi byter ut föråldrade webbläsarfunktioner innan de slutar fungera.', 'utveckling'],
    'image-aspect-ratio': ['Vi visar bilderna i rätt proportioner.', 'design'],
    'image-size-responsive': ['Vi levererar bilder i rätt upplösning för skarpa skärmar.', 'utveckling'],
    'csp-xss': ['Vi lägger till en säkerhetspolicy (CSP) som skyddar mot skadliga skript.', 'drift-och-support'],
    'third-party-cookies': ['Vi ser över tredjepartscookies inför att webbläsarna fasar ut dem.', 'drift-och-support']
  };
  var CATEGORY_FALLBACK = {
    'performance': ['Vi analyserar orsaken och optimerar koden, bilderna eller servern så att sidan blir snabbare.', 'utveckling'],
    'accessibility': ['Vi åtgärdar problemet så att sidan fungerar för alla besökare och uppfyller tillgänglighetskraven.', 'inkludering'],
    'best-practices': ['Vi rättar problemet enligt moderna riktlinjer för säkerhet och kvalitet.', 'drift-och-support'],
    'seo': ['Vi åtgärdar problemet så att Google förstår och rankar sidan bättre.', 'digital-tillvaxt']
  };
  var SERVICE_NAMES = {
    'utveckling': 'Utveckling', 'drift-och-support': 'Drift och support', 'inkludering': 'Inkludering',
    'digital-tillvaxt': 'Digital tillväxt', 'design': 'Design', 'strategi': 'Strategi'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Lighthouse descriptions use [text](url) links; keep the text only.
  function plain(md) { return String(md || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, ''); }

  function normaliseUrl(value) {
    var v = value.trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      if (!u.hostname.includes('.')) return null;
      return u.href;
    } catch (e) { return null; }
  }

  function grade(score) {
    if (score >= 0.9) return 'good';
    if (score >= 0.5) return 'ok';
    return 'bad';
  }

  var timer = null;
  function startProgress() {
    var start = Date.now();
    progress.hidden = false;
    results.hidden = true;
    errorBox.hidden = true;
    timer = setInterval(function () {
      var s = (Date.now() - start) / 1000;
      // Ease towards 95 % over roughly 30 seconds; the real result finishes the bar.
      var pct = Math.min(95, 100 * (1 - Math.exp(-s / 12)));
      bar.style.width = pct.toFixed(1) + '%';
      stepText.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(s / 4.5))];
      timeText.textContent = Math.floor(s) + ' s';
    }, 200);
  }
  function stopProgress() {
    clearInterval(timer);
    bar.style.width = '100%';
    setTimeout(function () { progress.hidden = true; bar.style.width = '0'; }, 400);
  }

  function showError(message) {
    errorBox.innerHTML = '<h2>Testet kunde inte genomföras</h2><p>' + message + '</p>' +
      '<p><a class="btn btn--primary" href="' + prefix + 'kontakt.html"><span>Be oss göra en manuell genomgång</span></a></p>';
    errorBox.hidden = false;
  }

  function ring(score, label) {
    var pct = Math.round(score * 100);
    var c = 2 * Math.PI * 52;
    return '<div class="score score--' + grade(score) + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="score__bg"/>' +
      '<circle cx="60" cy="60" r="52" class="score__fg" stroke-dasharray="' + (c * score).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>' +
      '<span class="score__value">' + pct + '</span><span class="score__label">' + label + '</span></div>';
  }

  function render(data, url, strategy) {
    var lr = data.lighthouseResult;
    var audits = lr.audits;
    var cats = lr.categories;

    // Map each audit to the category with the most weight for it.
    var auditCat = {};
    CATEGORIES.forEach(function (c) {
      (cats[c.id] && cats[c.id].auditRefs || []).forEach(function (ref) {
        if (!auditCat[ref.id] || ref.weight > auditCat[ref.id].weight) auditCat[ref.id] = { cat: c.id, weight: ref.weight };
      });
    });

    var scores = CATEGORIES.filter(function (c) { return cats[c.id]; })
      .map(function (c) { return ring(cats[c.id].score || 0, c.label); }).join('');

    var metrics = METRICS.filter(function (m) { return audits[m.id]; }).map(function (m) {
      var a = audits[m.id];
      return '<div class="metric metric--' + grade(a.score || 0) + '"><span>' + m.label + '</span><b>' + esc(a.displayValue || '–') + '</b></div>';
    }).join('');

    var issues = Object.keys(audits).map(function (id) { return audits[id]; }).filter(function (a) {
      if (a.score === null || a.score === undefined || a.score >= 0.9) return false;
      if (['manual', 'notApplicable', 'informative', 'error'].indexOf(a.scoreDisplayMode) !== -1) return false;
      return auditCat[a.id];
    }).sort(function (a, b) {
      var sa = (a.details && a.details.overallSavingsMs) || 0, sb = (b.details && b.details.overallSavingsMs) || 0;
      var wa = auditCat[a.id].weight, wb = auditCat[b.id].weight;
      return (a.score - b.score) || (sb - sa) || (wb - wa);
    }).slice(0, 15);

    var issueHtml = issues.length ? issues.map(function (a) {
      var cat = auditCat[a.id].cat;
      var fix = FIXES[a.id] || CATEGORY_FALLBACK[cat];
      var catLabel = CATEGORIES.filter(function (c) { return c.id === cat; })[0].label;
      return '<li class="issue issue--' + grade(a.score) + '">' +
        '<div class="issue__head"><span class="issue__cat">' + catLabel + '</span>' +
        (a.displayValue ? '<span class="issue__value">' + esc(a.displayValue) + '</span>' : '') + '</div>' +
        '<h3>' + esc(a.title) + '</h3>' +
        '<p class="issue__what">' + esc(plain(a.description)).slice(0, 260) + '</p>' +
        '<p class="issue__fix"><b>Så fixar vi det:</b> ' + esc(fix[0]) + ' <a href="' + prefix + 'tjanster/' + fix[1] + '.html">' + SERVICE_NAMES[fix[1]] + ' →</a></p></li>';
    }).join('') : '<li class="issue issue--good"><h3>Inga större problem hittades</h3><p>Sajten klarar Googles test bra. Vi hjälper gärna till med nästa steg, till exempel konvertering och innehåll.</p></li>';

    var shot = audits['final-screenshot'] && audits['final-screenshot'].details && audits['final-screenshot'].details.data;
    var summary = CATEGORIES.filter(function (c) { return cats[c.id]; })
      .map(function (c) { return c.label + ' ' + Math.round((cats[c.id].score || 0) * 100); }).join(', ');
    var mail = 'mailto:info@elevatestudio.nu?subject=' + encodeURIComponent('Hjälp med ' + url) +
      '&body=' + encodeURIComponent('Hej! Vi testade ' + url + ' (' + summary + ') och vill ha hjälp att åtgärda resultatet.');

    results.innerHTML =
      '<div class="sitetest__summary">' +
        (shot ? '<img class="sitetest__shot" src="' + shot + '" alt="Skärmbild av den testade sidan">' : '') +
        '<div><p class="sitetest__tested">Testad sida (' + (strategy === 'mobile' ? 'mobil' : 'dator') + ')</p>' +
        '<p class="sitetest__url">' + esc(url) + '</p><div class="scores">' + scores + '</div></div>' +
      '</div>' +
      '<h2 class="sitetest__h2">Laddtider</h2><div class="metrics">' + metrics + '</div>' +
      '<h2 class="sitetest__h2">Det här kan förbättras <span>(' + issues.length + ')</span></h2>' +
      '<ol class="issues">' + issueHtml + '</ol>' +
      '<div class="sitetest__cta"><div><h2>Vill du att vi fixar det här?</h2><p>Vi går igenom resultatet med dig och ger ett förslag med fast pris.</p></div>' +
      '<a class="btn btn--light" href="' + mail + '"><span>Skicka resultatet till oss</span></a></div>' +
      '<p class="sitetest__source">Mätningen görs med Google PageSpeed Insights (Lighthouse). Resultatet kan variera något mellan körningar.</p>';
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = normaliseUrl(input.value);
    if (!url) {
      input.setCustomValidity('Skriv en giltig adress, till exempel dittforetag.se');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    var strategy = form.querySelector('input[name="strategy"]:checked').value;
    var params = new URLSearchParams({ url: url, strategy: strategy, locale: 'sv' });
    CATEGORIES.forEach(function (c) { params.append('category', c.id); });
    if (KEY) params.append('key', KEY);

    button.disabled = true;
    startProgress();
    fetch(API + '?' + params.toString())
      .then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); })
      .then(function (r) {
        stopProgress();
        if (r.status === 429) {
          showError('Googles testtjänst är överbelastad just nu. Försök igen om en stund – eller låt oss göra testet åt dig.');
        } else if (r.body.error) {
          showError('Vi kunde inte ladda ' + esc(url) + '. Kontrollera att adressen stämmer och att sidan är öppen för besökare.');
        } else if (r.body.lighthouseResult && r.body.lighthouseResult.runtimeError && r.body.lighthouseResult.runtimeError.code !== 'NO_ERROR') {
          showError('Sidan kunde inte testas: ' + esc(r.body.lighthouseResult.runtimeError.message || 'okänt fel') + '.');
        } else {
          render(r.body, url, strategy);
        }
      })
      .catch(function () {
        stopProgress();
        showError('Testet kunde inte nå Googles testtjänst. Kontrollera din uppkoppling och försök igen.');
      })
      .then(function () { button.disabled = false; });
  });

  var preset = new URLSearchParams(location.search).get('url');
  if (preset) {
    input.value = preset;
    if (form.requestSubmit) form.requestSubmit(); else button.click();
  }
})();
