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


  // MDN HTTP Observatory: security headers test (CORS-enabled, no key needed)
  var OBS = 'https://observatory-api.mdn.mozilla.net/api/v2/';
  var SECURITY = {
    'content-security-policy': ['Säkerhetspolicy (CSP) saknas eller är svag', 'Vi inför en Content Security Policy som hindrar skadliga skript från att köras på sajten.'],
    'cookies': ['Cookies saknar säkerhetsflaggor', 'Vi sätter Secure, HttpOnly och SameSite på alla cookies.'],
    'cross-origin-resource-sharing': ['För öppen delning mellan domäner (CORS)', 'Vi begränsar vilka andra sajter som får läsa ert innehåll.'],
    'redirection': ['Besökare skickas inte säkert till HTTPS', 'Vi ser till att alla besök går direkt till en krypterad HTTPS-adress.'],
    'referrer-policy': ['Referrer-policy saknas', 'Vi begränsar vilken information som skickas vidare när besökare klickar sig bort från sajten.'],
    'strict-transport-security': ['HTTPS tvingas inte (HSTS)', 'Vi slår på HSTS så att webbläsare alltid använder krypterad anslutning.'],
    'subresource-integrity': ['Externa skript kontrolleras inte (SRI)', 'Vi lägger till integritetskontroll för skript som laddas från andra domäner.'],
    'x-content-type-options': ['X-Content-Type-Options saknas', 'Vi lägger till nosniff så att webbläsaren inte gissar filtyper.'],
    'x-frame-options': ['Sajten kan bäddas in av andra (clickjacking)', 'Vi spärrar inbäddning med frame-ancestors så att ingen kan lura besökare via en falsk ram.'],
    'cross-origin-opener-policy': ['Cross-Origin-Opener-Policy saknas', 'Vi isolerar sajten från fönster som öppnas av andra domäner.'],
    'cross-origin-embedder-policy': ['Cross-Origin-Embedder-Policy saknas', 'Vi styr vilka externa resurser som får bäddas in.'],
    'cross-origin-resource-policy': ['Cross-Origin-Resource-Policy saknas', 'Vi styr vilka andra sajter som får använda era resurser.']
  };
  function runSecurity(url) {
    var host = new URL(url).hostname;
    return fetch(OBS + 'scan?host=' + encodeURIComponent(host), { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (scan) {
        if (scan.error) throw new Error(scan.error);
        return fetch(OBS + 'analyze?host=' + encodeURIComponent(host)).then(function (r) { return r.json(); });
      });
  }

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

  function render(data, sec, url, strategy, psiProblem) {
    var lr = data && data.lighthouseResult;
    var audits = lr ? lr.audits : {};
    var cats = lr ? lr.categories : {};

    var auditCat = {};
    CATEGORIES.forEach(function (c) {
      (cats[c.id] && cats[c.id].auditRefs || []).forEach(function (ref) {
        if (!auditCat[ref.id] || ref.weight > auditCat[ref.id].weight) auditCat[ref.id] = { cat: c.id, weight: ref.weight };
      });
    });

    var rings = CATEGORIES.filter(function (c) { return cats[c.id]; })
      .map(function (c) { return ring(cats[c.id].score || 0, c.label); });
    var secScan = sec && sec.scan;
    if (secScan && typeof secScan.score === 'number') {
      rings.push(ring(Math.max(0, Math.min(100, secScan.score)) / 100, 'Säkerhet ' + esc(secScan.grade || '')));
    }

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
      return (a.score - b.score) || (sb - sa) || (auditCat[b.id].weight - auditCat[a.id].weight);
    }).slice(0, 15).map(function (a) {
      var cat = auditCat[a.id].cat;
      var fix = FIXES[a.id] || CATEGORY_FALLBACK[cat];
      return { level: grade(a.score), cat: CATEGORIES.filter(function (c) { return c.id === cat; })[0].label,
        value: a.displayValue, title: a.title, what: plain(a.description).slice(0, 260), fix: fix[0], service: fix[1] };
    });

    var secTests = sec && sec.tests ? Object.keys(sec.tests).map(function (k) { return [k, sec.tests[k]]; }) : [];
    secTests.filter(function (t) { return t[1].pass === false; }).forEach(function (t) {
      var info = SECURITY[t[0]] || [t[1].title, 'Vi åtgärdar inställningen på servern enligt moderna säkerhetsriktlinjer.'];
      issues.push({ level: t[1].score_modifier <= -20 ? 'bad' : 'ok', cat: 'Säkerhet',
        value: t[1].score_modifier ? t[1].score_modifier + ' poäng' : '', title: info[0],
        what: plain(String(t[1].score_description || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(),
        fix: info[1], service: 'drift-och-support' });
    });

    var issueHtml = issues.length ? issues.map(function (i) {
      return '<li class="issue issue--' + i.level + '">' +
        '<div class="issue__head"><span class="issue__cat">' + i.cat + '</span>' +
        (i.value ? '<span class="issue__value">' + esc(i.value) + '</span>' : '') + '</div>' +
        '<h3>' + esc(i.title) + '</h3>' +
        (i.what ? '<p class="issue__what">' + esc(i.what) + '</p>' : '') +
        '<p class="issue__fix"><b>Så fixar vi det:</b> ' + esc(i.fix) + ' <a href="' + prefix + 'tjanster/' + i.service + '.html">' + SERVICE_NAMES[i.service] + ' →</a></p></li>';
    }).join('') : '<li class="issue issue--good"><h3>Inga större problem hittades</h3><p>Sajten klarar testerna bra. Vi hjälper gärna till med nästa steg, till exempel konvertering och innehåll.</p></li>';

    var shot = audits['final-screenshot'] && audits['final-screenshot'].details && audits['final-screenshot'].details.data;
    var summary = rings.length ? CATEGORIES.filter(function (c) { return cats[c.id]; })
      .map(function (c) { return c.label + ' ' + Math.round((cats[c.id].score || 0) * 100); })
      .concat(secScan ? ['Säkerhet ' + secScan.grade] : []).join(', ') : '';
    var mail = 'mailto:info@elevatestudio.nu?subject=' + encodeURIComponent('Hjälp med ' + url) +
      '&body=' + encodeURIComponent('Hej! Vi testade ' + url + ' (' + summary + ') och vill ha hjälp att åtgärda resultatet.');
    var notice = psiProblem ? '<div class="sitetest__notice"><b>Prestandadelen kunde inte köras just nu.</b> ' + psiProblem +
      ' Säkerhetstestet nedan är komplett – kör gärna om testet om en stund för prestanda, tillgänglighet och SEO.</div>' : '';

    results.innerHTML = notice +
      '<div class="sitetest__summary' + (shot ? '' : ' sitetest__summary--noshot') + '">' +
        (shot ? '<img class="sitetest__shot" src="' + shot + '" alt="Skärmbild av den testade sidan">' : '') +
        '<div><p class="sitetest__tested">Testad sida' + (lr ? ' (' + (strategy === 'mobile' ? 'mobil' : 'dator') + ')' : '') + '</p>' +
        '<p class="sitetest__url">' + esc(url) + '</p><div class="scores">' + rings.join('') + '</div></div>' +
      '</div>' +
      (metrics ? '<h2 class="sitetest__h2">Laddtider</h2><div class="metrics">' + metrics + '</div>' : '') +
      '<h2 class="sitetest__h2">Det här kan förbättras <span>(' + issues.length + ')</span></h2>' +
      '<ol class="issues">' + issueHtml + '</ol>' +
      '<div class="sitetest__cta"><div><h2>Vill du att vi fixar det här?</h2><p>Vi går igenom resultatet med dig och ger ett förslag med fast pris.</p></div>' +
      '<a class="btn btn--light" href="' + mail + '"><span>Skicka resultatet till oss</span></a></div>' +
      '<p class="sitetest__source">Mätningen görs med ' + (lr ? 'Google PageSpeed Insights (Lighthouse) och ' : '') +
      'MDN HTTP Observatory. Resultatet kan variera något mellan körningar.</p>';
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
    var psi = fetch(API + '?' + params.toString())
      .then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); })
      .then(function (r) {
        if (r.status === 429) return { problem: 'Googles testtjänst har nått sin dagskvot.' };
        if (r.body.error) return { problem: 'Google kunde inte ladda sidan.', fatal: true };
        var rt = r.body.lighthouseResult && r.body.lighthouseResult.runtimeError;
        if (rt && rt.code !== 'NO_ERROR') return { problem: 'Sidan kunde inte testas (' + esc(rt.message || 'okänt fel') + ').', fatal: true };
        return { data: r.body };
      })
      .catch(function () { return { problem: 'Vi kunde inte nå Googles testtjänst.' }; });
    var security = runSecurity(url).then(function (d) { return { data: d }; }).catch(function () { return { failed: true }; });

    Promise.all([psi, security]).then(function (out) {
      stopProgress();
      var p = out[0], sec = out[1];
      if (!p.data && !sec.data) {
        showError(p.fatal ? 'Vi kunde inte ladda ' + esc(url) + '. Kontrollera att adressen stämmer och att sidan är öppen för besökare.'
          : 'Testtjänsterna svarar inte just nu. Försök igen om en stund – eller låt oss göra testet åt dig.');
      } else {
        render(p.data || null, sec.data || null, url, strategy, p.data ? '' : p.problem);
      }
      button.disabled = false;
    });
  });

  var preset = new URLSearchParams(location.search).get('url');
  if (preset) {
    input.value = preset;
    if (form.requestSubmit) form.requestSubmit(); else button.click();
  }
})();
