/* "Testa din sajt": runs a real Google PageSpeed Insights (Lighthouse) audit of any public URL
   and explains in Swedish how each problem can be fixed. Nothing is simulated: if the test
   cannot run, an honest error message is shown instead of results. */
(function () {
  var form = document.getElementById('sitetest-form');
  if (!form) return;

  var API = '/api/psi', GOOGLE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
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
    'render-blocking-resources': ['Vi laddar kritisk CSS först och skjuter upp skript som inte behövs direkt, så att sidan syns tidigare.', 'hemsidor'],
    'uses-optimized-images': ['Vi komprimerar bilderna utan synlig kvalitetsförlust och automatiserar det för nya bilder.', 'hemsidor'],
    'modern-image-formats': ['Vi konverterar bilder till moderna format som WebP eller AVIF, som ofta är hälften så stora.', 'hemsidor'],
    'uses-responsive-images': ['Vi levererar rätt bildstorlek till varje skärm i stället för att skicka stora bilder till mobilen.', 'hemsidor'],
    'offscreen-images': ['Vi laddar bilder först när de närmar sig skärmen (lazy loading).', 'hemsidor'],
    'unused-javascript': ['Vi rensar bort oanvänd JavaScript och delar upp koden så att varje sida bara laddar det den behöver.', 'hemsidor'],
    'unused-css-rules': ['Vi tar bort oanvänd CSS och bryter ut det som behövs för första visningen.', 'hemsidor'],
    'unminified-javascript': ['Vi minifierar JavaScript i byggsteget.', 'hemsidor'],
    'unminified-css': ['Vi minifierar CSS i byggsteget.', 'hemsidor'],
    'server-response-time': ['Vi snabbar upp servern med cachning, bättre hosting eller ett CDN nära besökarna.', 'support-och-underhall'],
    'uses-text-compression': ['Vi slår på gzip- eller Brotli-komprimering på servern.', 'support-och-underhall'],
    'uses-long-cache-ttl': ['Vi ställer in långa cachetider för bilder, typsnitt och skript så att återkommande besök går blixtsnabbt.', 'support-och-underhall'],
    'redirects': ['Vi tar bort onödiga omdirigeringar så att besökaren kommer direkt till rätt sida.', 'support-och-underhall'],
    'uses-rel-preconnect': ['Vi förbereder anslutningar till viktiga externa tjänster tidigt.', 'hemsidor'],
    'font-display': ['Vi ser till att text syns direkt medan typsnitten laddas.', 'hemsidor'],
    'third-party-summary': ['Vi går igenom tredjepartsskript (annonser, chattar, spårning) och laddar dem smartare eller tar bort det som inte behövs.', 'hemsidor'],
    'total-byte-weight': ['Vi bantar sidans totala storlek genom att optimera bilder, skript och typsnitt.', 'hemsidor'],
    'dom-size': ['Vi förenklar sidans struktur så att webbläsaren får mindre att räkna på.', 'hemsidor'],
    'bootup-time': ['Vi minskar tung JavaScript som tar lång tid att köra på mobiler.', 'hemsidor'],
    'mainthread-work-breakdown': ['Vi flyttar tunga beräkningar bort från huvudtråden så att sidan svarar direkt på klick.', 'hemsidor'],
    'largest-contentful-paint': ['Vi prioriterar sidans viktigaste bild eller rubrik så att den visas snabbare.', 'hemsidor'],
    'largest-contentful-paint-element': ['Vi prioriterar sidans viktigaste bild eller rubrik så att den visas snabbare.', 'hemsidor'],
    'first-contentful-paint': ['Vi minskar det som måste laddas innan något alls kan visas.', 'hemsidor'],
    'total-blocking-time': ['Vi delar upp långa skript så att sidan kan svara på klick och scroll direkt.', 'hemsidor'],
    'cumulative-layout-shift': ['Vi reserverar plats för bilder, annonser och typsnitt så att innehållet inte hoppar när sidan laddar.', 'hemsidor'],
    'layout-shift-elements': ['Vi reserverar plats för bilder, annonser och typsnitt så att innehållet inte hoppar när sidan laddar.', 'hemsidor'],
    'speed-index': ['Vi optimerar ordningen innehållet laddas i så att sidan upplevs snabbare.', 'hemsidor'],
    'color-contrast': ['Vi justerar färgerna så att texten blir läsbar för alla, även med nedsatt syn.', 'hemsidor'],
    'image-alt': ['Vi skriver beskrivande alternativtexter så att bilder fungerar med skärmläsare och i sök.', 'hemsidor'],
    'button-name': ['Vi ger alla knappar tydliga namn som skärmläsare kan läsa upp.', 'hemsidor'],
    'link-name': ['Vi ger alla länkar beskrivande texter.', 'hemsidor'],
    'label': ['Vi kopplar etiketter till alla formulärfält.', 'hemsidor'],
    'heading-order': ['Vi rättar rubrikordningen så att sidan går att navigera med skärmläsare.', 'hemsidor'],
    'html-has-lang': ['Vi anger sidans språk så att skärmläsare uttalar texten rätt.', 'hemsidor'],
    'target-size': ['Vi gör knappar och länkar tillräckligt stora för att träffa med fingret.', 'hemsidor'],
    'tap-targets': ['Vi gör knappar och länkar tillräckligt stora för att träffa med fingret.', 'hemsidor'],
    'aria-allowed-attr': ['Vi rättar felaktiga ARIA-attribut.', 'hemsidor'],
    'document-title': ['Vi skriver en tydlig sidtitel som lockar till klick i sökresultaten.', 'seo-och-ai-optimering'],
    'meta-description': ['Vi skriver säljande metabeskrivningar för varje sida.', 'seo-och-ai-optimering'],
    'link-text': ['Vi byter ut "Läs mer"-länkar mot beskrivande texter som både Google och besökare förstår.', 'seo-och-ai-optimering'],
    'is-crawlable': ['Vi ser till att Google får indexera sidan.', 'seo-och-ai-optimering'],
    'robots-txt': ['Vi rättar robots.txt så att sökmotorerna hittar rätt sidor.', 'seo-och-ai-optimering'],
    'canonical': ['Vi lägger in korrekta canonical-länkar så att Google vet vilken sida som är originalet.', 'seo-och-ai-optimering'],
    'hreflang': ['Vi rättar språkversionerna så att rätt sida visas i rätt land.', 'seo-och-ai-optimering'],
    'structured-data': ['Vi lägger till strukturerad data som kan ge rikare sökresultat.', 'seo-och-ai-optimering'],
    'font-size': ['Vi ökar textstorleken så att sidan är läsbar på mobil utan att zooma.', 'hemsidor'],
    'viewport': ['Vi gör sidan mobilanpassad.', 'hemsidor'],
    'is-on-https': ['Vi flyttar hela sajten till säker HTTPS.', 'support-och-underhall'],
    'errors-in-console': ['Vi rättar JavaScript-felen som uppstår när sidan laddas.', 'hemsidor'],
    'inspector-issues': ['Vi rättar de problem som webbläsaren varnar för.', 'hemsidor'],
    'deprecations': ['Vi byter ut föråldrade webbläsarfunktioner innan de slutar fungera.', 'hemsidor'],
    'image-aspect-ratio': ['Vi visar bilderna i rätt proportioner.', 'hemsidor'],
    'image-size-responsive': ['Vi levererar bilder i rätt upplösning för skarpa skärmar.', 'hemsidor'],
    'csp-xss': ['Vi lägger till en säkerhetspolicy (CSP) som skyddar mot skadliga skript.', 'support-och-underhall'],
    'third-party-cookies': ['Vi ser över tredjepartscookies inför att webbläsarna fasar ut dem.', 'support-och-underhall']
  };
  var CATEGORY_FALLBACK = {
    'performance': ['Vi analyserar orsaken och optimerar koden, bilderna eller servern så att sidan blir snabbare.', 'hemsidor'],
    'accessibility': ['Vi åtgärdar problemet så att sidan fungerar för alla besökare och uppfyller tillgänglighetskraven.', 'hemsidor'],
    'best-practices': ['Vi rättar problemet enligt moderna riktlinjer för säkerhet och kvalitet.', 'support-och-underhall'],
    'seo': ['Vi åtgärdar problemet så att Google förstår och rankar sidan bättre.', 'seo-och-ai-optimering']
  };
  var SERVICE_NAMES = {
    'hemsidor': 'Hemsidor', 'support-och-underhall': 'Support och underhåll', 'seo-och-ai-optimering': 'SEO och AI-optimering'
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
    errorBox.innerHTML = '<h2>Testet kunde inte genomföras</h2><div>' + message + '</div>' +
      '<p><a class="btn btn--primary" href="' + prefix + 'kontakt.html"><span>Be oss göra en manuell genomgång</span></a></p>';
    errorBox.hidden = false;
  }

  function ring(score, label) {
    if (typeof score !== 'number') return '<div class="score score--na"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="score__bg"/></svg><span class="score__value">–</span><span class="score__label">' + label + '</span></div>';
    var pct = Math.round(score * 100);
    var c = 2 * Math.PI * 52;
    return '<div class="score score--' + grade(score) + '">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="score__bg"/>' +
      '<circle cx="60" cy="60" r="52" class="score__fg" stroke-dasharray="' + (c * score).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>' +
      '<span class="score__value">' + pct + '</span><span class="score__label">' + label + '</span></div>';
  }

  // One sentence on top of the rings: the average and what it means
  function verdict(cats, secScan) {
    var s = CATEGORIES.filter(function (c) { return cats[c.id] && typeof cats[c.id].score === 'number'; }).map(function (c) { return Math.round(cats[c.id].score * 100); });
    if (secScan && typeof secScan.score === 'number') s.push(Math.max(0, Math.min(100, secScan.score)));
    if (!s.length) return '';
    var avg = Math.round(s.reduce(function (a, b) { return a + b; }, 0) / s.length);
    var text = avg >= 90 ? 'Riktigt bra. Bara finputs kvar.' : avg >= 75 ? 'Bra grund, några saker att fixa.' : avg >= 50 ? 'Det finns tydliga vinster att hämta.' : 'Sidan tappar besökare. Här finns mycket att vinna.';
    return '<div class="sitetest__verdict"><b class="sitetest__avg sitetest__avg--' + (avg >= 90 ? 'good' : avg >= 50 ? 'ok' : 'bad') + '">' + avg + '</b><div><strong>' + text + '</strong><span>Snittbetyg av ' + s.length + ' tester</span></div></div>';
  }

  function render(data, sec, url, strategy, psiProblem, extra) {
    extra = extra || {};
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
      .map(function (c) { return ring(cats[c.id].score, c.label); });
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
        fix: info[1], service: 'support-och-underhall' });
    });

    var safe = extra.safe;
    if (safe && safe.safe === false) {
      var TH = { MALWARE: 'skadlig kod', SOCIAL_ENGINEERING: 'bedrägeri (nätfiske)', UNWANTED_SOFTWARE: 'oönskad programvara', POTENTIALLY_HARMFUL_APPLICATION: 'skadliga appar' };
      issues.unshift({ level: 'bad', cat: 'Säkerhet', value: 'Google Safe Browsing', title: 'Google varnar besökare för sidan',
        what: 'Sajten finns på Googles lista för ' + safe.threats.map(function (t) { return TH[t] || t; }).join(', ') + '. Chrome och Google visar en röd varning, och de flesta besökare vänder.',
        fix: 'Vi rensar sajten, täpper till hålet och begär en ny granskning hos Google så att varningen tas bort.', service: 'support-och-underhall' });
    }
    // Real visitors: Google's figures from Chrome users over the last 28 days
    var cx = extra.crux, real = [];
    if (cx && !cx.none && !cx.error) {
      var sec2 = function (ms) { return ms == null ? '–' : (ms / 1000).toFixed(1).replace('.', ',') + ' s'; };
      var lvl = function (v, good, poor) { return v == null ? 'ok' : v <= good ? 'good' : v <= poor ? 'ok' : 'bad'; };
      if (cx.lcp) real.push(['Största innehåll', sec2(cx.lcp.p75), lvl(cx.lcp.p75, 2500, 4000), cx.lcp.good]);
      if (cx.inp) real.push(['Svar på klick', cx.inp.p75 == null ? '–' : cx.inp.p75 + ' ms', lvl(cx.inp.p75, 200, 500), cx.inp.good]);
      if (cx.cls) real.push(['Layoutskift', cx.cls.p75 == null ? '–' : String(cx.cls.p75).replace('.', ','), lvl(Number(cx.cls.p75), 0.1, 0.25), cx.cls.good]);
      if (cx.fcp) real.push(['Första innehåll', sec2(cx.fcp.p75), lvl(cx.fcp.p75, 1800, 3000), cx.fcp.good]);
      if (cx.ttfb) real.push(['Serverns svarstid', sec2(cx.ttfb.p75), lvl(cx.ttfb.p75, 800, 1800), cx.ttfb.good]);
    }
    var realHtml = real.length ? '<h2 class="sitetest__h2">Riktiga besökare <span>(senaste 28 dagarna' + (cx.scope === 'origin' ? ', hela sajten' : '') + ')</span></h2><div class="metrics">' +
      real.map(function (m) { return '<div class="metric metric--' + m[2] + '"><span>' + m[0] + '</span><b>' + esc(m[1]) + '</b>' + (m[3] != null ? '<small>' + Math.round(m[3] * 100) + ' % fick en snabb upplevelse</small>' : '') + '</div>'; }).join('') + '</div>'
      : (cx && cx.none ? '<p class="sitetest__real-none">Sajten har för få besökare för Googles statistik över riktiga besökare. Siffrorna ovan kommer från ett labbtest.</p>' : '');
    var safeHtml = safe && safe.safe ? '<p class="sitetest__safe">✓ Google Safe Browsing: inga varningar för skadlig kod eller bedrägeri.</p>' : '';

    var issueHtml = issues.length ? issues.map(function (i) {
      return '<li class="issue issue--' + i.level + '">' +
        '<div class="issue__head"><span class="issue__cat">' + i.cat + '</span>' +
        (i.value ? '<span class="issue__value">' + esc(i.value) + '</span>' : '') + '</div>' +
        '<h3>' + esc(i.title) + '</h3>' +
        (i.what ? '<p class="issue__what">' + esc(i.what) + '</p>' : '') +
        '<p class="issue__fix"><b>Så fixar vi det:</b> ' + esc(i.fix) + '</p><a class="issue__go" href="' + prefix + 'tjanster/' + i.service + '.html">Vi fixar det →</a></li>';
    }).join('') : '<li class="issue issue--good"><h3>Inga större problem hittades</h3><p>Sajten klarar testerna bra. Vi hjälper gärna till med nästa steg, till exempel konvertering och innehåll.</p></li>';

    var shot = audits['final-screenshot'] && audits['final-screenshot'].details && audits['final-screenshot'].details.data;
    var summary = rings.length ? CATEGORIES.filter(function (c) { return cats[c.id]; })
      .map(function (c) { return c.label + ' ' + (typeof cats[c.id].score === 'number' ? Math.round(cats[c.id].score * 100) : '–'); })
      .concat(secScan ? ['Säkerhet ' + secScan.grade] : []).join(', ') : '';
    var notice = psiProblem ? '<div class="sitetest__notice"><b>Prestandadelen kunde inte köras just nu.</b> ' + psiProblem +
      ' Säkerhetstestet nedan är komplett. Vill du ha hela testet? Lämna din e-post så kör vi det åt dig och mejlar resultatet.' +
      leadForm(url) + '</div>' : '';

    results.innerHTML = notice +
      '<div class="sitetest__summary' + (shot ? '' : ' sitetest__summary--noshot') + '">' +
        (shot ? '<img class="sitetest__shot" src="' + shot + '" alt="Skärmbild av den testade sidan">' : '') +
        '<div><p class="sitetest__tested">Testad sida' + (lr ? ' (' + (strategy === 'mobile' ? 'mobil' : 'dator') + ')' : '') + '</p>' +
        '<p class="sitetest__url">' + esc(url) + '</p>' + verdict(cats, secScan) + '<div class="scores">' + rings.join('') + '</div></div>' +
      '</div>' +
      (metrics ? '<h2 class="sitetest__h2">Laddtider</h2><div class="metrics">' + metrics + '</div>' : '') + realHtml + safeHtml +
      '<h2 class="sitetest__h2">Det här kan förbättras <span>(' + issues.length + ')</span></h2>' +
      '<ol class="issues">' + issueHtml + '</ol>' +
      '<div class="sitetest__cta"><div><h2>Vill du att vi fixar det här?</h2><p>Vi går igenom resultatet med dig och ger ett förslag med fast pris.</p></div>' +
      '<div class="sitetest__actions"><button type="button" class="btn btn--light" id="sitetest-pdf"><span>Ladda ner som PDF</span></button>' +
      '<a class="btn btn--outline-light" id="sitetest-send" href="' + prefix + 'kontakt.html?fran=test#formular"><span>Skicka via offertförfrågan</span></a></div></div>' +
      '<p class="sitetest__source">Mätningen görs med ' + (lr ? 'Google PageSpeed Insights (Lighthouse) och ' : '') +
      'MDN HTTP Observatory. Resultatet kan variera något mellan körningar.</p>';
    results.hidden = false;
    bindLeadForm();
    var report = { url: url, device: strategy === 'mobile' ? 'mobil' : 'dator', summary: summary, date: new Date().toLocaleDateString('sv-SE'),
      metrics: METRICS.filter(function (m) { return audits[m.id]; }).map(function (m) { return [m.label, audits[m.id].displayValue || '–']; }),
      issues: issues, shot: shot || '', real: real.map(function (m) { return [m[0], m[1]]; }), safe: safe ? safe.safe : null };
    if (window.elevateTrack) window.elevateTrack('sitetest', url, (summary || 'Inget resultat') + ' · ' + report.device);
    document.getElementById('sitetest-pdf').addEventListener('click', function () { downloadPdf(report); });
    document.getElementById('sitetest-send').addEventListener('click', function () {
      try { sessionStorage.setItem('es.sitetest', reportText(report)); } catch (e) { /* the form still opens */ }
      if (window.elevateTrack) window.elevateTrack('sitetest_send', url);
    });
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // The whole result as plain text, for the quote request form
  function reportText(r) {
    return 'Hej! Vi testade ' + r.url + ' (' + r.device + ', ' + r.date + ') i Testa din sajt och vill ha hjälp att åtgärda resultatet.\n\n' +
      'Betyg: ' + (r.summary || '–') + '\n' +
      (r.metrics.length ? 'Laddtider: ' + r.metrics.map(function (m) { return m[0] + ' ' + m[1]; }).join(', ') + '\n' : '') +
      (r.real && r.real.length ? 'Riktiga besökare: ' + r.real.map(function (m) { return m[0] + ' ' + m[1]; }).join(', ') + '\n' : '') +
      (r.issues.length ? '\nDet här kan förbättras:\n' + r.issues.map(function (i, n) { return (n + 1) + '. ' + i.cat + ': ' + i.title + (i.value ? ' (' + i.value + ')' : ''); }).join('\n') : '');
  }

  // The whole result as a PDF, made in the browser (jsPDF is loaded the first time it is needed)
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    return new Promise(function (ok, fail) {
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      sc.onload = function () { ok(window.jspdf); }; sc.onerror = fail;
      document.head.appendChild(sc);
    });
  }
  // Same look as the web agreement: green header with the mark, Hanken Grotesk, green headings, footer with page numbers
  var MARK = 'M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z';
  function b64(url) {
    return fetch(url).then(function (res) { if (!res.ok) throw new Error('font'); return res.arrayBuffer(); }).then(function (ab) {
      var u = new Uint8Array(ab), bin = ''; for (var i = 0; i < u.length; i += 32768) bin += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(bin);
    });
  }
  function downloadPdf(r) {
    var btn = document.getElementById('sitetest-pdf'); btn.disabled = true;
    loadJsPdf().then(function (lib) {
      var doc = new lib.jsPDF({ unit: 'pt', format: 'a4' });
      return Promise.all([b64(prefix + 'assets/fonts/HankenGrotesk-Regular.ttf'), b64(prefix + 'assets/fonts/HankenGrotesk-Bold.ttf')]).then(function (f) {
        doc.addFileToVFS('HG-R.ttf', f[0]); doc.addFont('HG-R.ttf', 'Hanken', 'normal');
        doc.addFileToVFS('HG-B.ttf', f[1]); doc.addFont('HG-B.ttf', 'Hanken', 'bold'); return 'Hanken';
      }).catch(function () { return 'helvetica'; }).then(function (font) { drawPdf(doc, font, r); });
    }).catch(function () { alert('PDF:en kunde inte skapas just nu. Försök igen om en stund.'); })
      .then(function () { btn.disabled = false; });
  }
  function drawPdf(doc, font, r) {
    var W = 595.28, H = 841.89, U = W / 100, X = 9.4 * U, RIGHT = W - X;
    var GREEN = [29, 59, 42], INK = [31, 42, 36], SOFT = [231, 239, 233], MUTED = [111, 125, 116];
    var body = 1.65 * U, lh = body * 1.65, gap = 1.3 * U, y = 0, top = 0, FOOT = H - 5.6 * U;
    var set = function (size, weight, color) { doc.setFont(font, weight || 'normal'); doc.setFontSize(size); doc.setTextColor.apply(doc, color || INK); };
    var mark = function (x, yy, w) {
      var sc = w / 1884.3, pts = MARK.replace(/[MLZ]/g, ' ').trim().split(/\s+/).map(Number), ls = [];
      for (var i = 2; i < pts.length; i += 2) ls.push([(pts[i] - pts[i - 2]) * sc, (pts[i + 1] - pts[i - 1]) * sc]);
      doc.setFillColor(255, 255, 255); doc.lines(ls, x + pts[0] * sc, yy + pts[1] * sc, [1, 1], 'F', true);
    };
    var sheet = function (first) {
      if (!first) doc.addPage();
      top = 7.6 * U + 3.5 * U + 1.4 * U + 1.55 * U * 1.3 + 6.4 * U;
      doc.setFillColor.apply(doc, GREEN); doc.rect(0, 0, W, top, 'F');
      var mw = 6.4 * U; mark(X, (top - mw * 0.7185) / 2, mw);
      var tx = X + mw + 2.6 * U;
      set(3.5 * U, 'bold', [255, 255, 255]); doc.text('ELEVATE STUDIO', tx, 7.6 * U + 3.5 * U * 0.78, { charSpace: 0.4 });
      set(1.55 * U, 'normal', [255, 255, 255]); doc.text('WEBBANALYS / TESTA DIN SAJT', tx, 7.6 * U + 3.5 * U + 1.4 * U + 1.55 * U * 0.9, { charSpace: 0.2 });
      y = top + 4.6 * U + body;
    };
    var need = function (h) { if (y + h > FOOT - 4 * U) sheet(false); };
    var para = function (text, weight, color, size) {
      set(size || body, weight, color);
      doc.splitTextToSize(String(text), RIGHT - X).forEach(function (row) { need(lh); doc.text(row, X, y); y += (size || body) * 1.65; });
      y += gap;
    };
    var h2 = function (text) { need(8 * U); y += 2.9 * U; set(2.1 * U, 'bold', GREEN); doc.text(text, X, y); y += 1.05 * U + 1.8 * U + body; };

    sheet(true);
    set(2 * U, 'bold', GREEN); doc.text('TESTAD SIDA', X, y);
    set(1.6 * U, 'normal', MUTED); doc.text('Datum: ' + r.date + '   ·   ' + (r.device === 'mobil' ? 'Mobil' : 'Dator'), RIGHT, y, { align: 'right' });
    y += 2.4 * U; set(2.6 * U, 'bold', INK); doc.text(doc.splitTextToSize(r.url, RIGHT - X)[0], X, y); y += 3 * U;

    // Scores as soft boxes, like the price table in the agreement
    var parts = (r.summary || '').split(', ').filter(Boolean);
    if (parts.length) {
      h2('Betyg');
      var n = parts.length, bw = (RIGHT - X - (n - 1) * 1.2 * U) / n, bh = 9 * U;
      parts.forEach(function (pt, i) {
        var m = pt.match(/^(.*) (\S+)$/) || [pt, pt, ''], bx = X + i * (bw + 1.2 * U), v = m[2], num = Number(v);
        doc.setFillColor.apply(doc, SOFT); doc.roundedRect(bx, y - body, bw, bh, 6, 6, 'F');
        var col = isNaN(num) ? GREEN : num >= 90 ? [26, 127, 75] : num >= 50 ? [176, 112, 0] : [192, 57, 43];
        set(3.4 * U, 'bold', col); doc.text(v, bx + bw / 2, y + 2.6 * U, { align: 'center' });
        set(1.3 * U, 'normal', MUTED); doc.text(m[1], bx + bw / 2, y + 5.6 * U, { align: 'center' });
      });
      y += bh + gap;
    }
    if (r.metrics.length) {
      h2('Laddtider');
      r.metrics.forEach(function (m, i) {
        need(lh + 4);
        if (i % 2 === 0) { doc.setFillColor.apply(doc, SOFT); doc.rect(X, y - body * 1.15, RIGHT - X, lh + 2, 'F'); }
        set(body, 'normal', INK); doc.text(m[0], X + 1.2 * U, y); set(body, 'bold', INK); doc.text(String(m[1]), RIGHT - 1.2 * U, y, { align: 'right' });
        y += lh + 2;
      });
      y += gap;
    }
    if (r.real && r.real.length) {
      h2('Riktiga besökare (senaste 28 dagarna)');
      r.real.forEach(function (m, i) {
        need(lh + 4);
        if (i % 2 === 0) { doc.setFillColor.apply(doc, SOFT); doc.rect(X, y - body * 1.15, RIGHT - X, lh + 2, 'F'); }
        set(body, 'normal', INK); doc.text(m[0], X + 1.2 * U, y); set(body, 'bold', INK); doc.text(String(m[1]), RIGHT - 1.2 * U, y, { align: 'right' });
        y += lh + 2;
      });
      y += gap;
    }
    if (r.safe === true) para('Google Safe Browsing: inga varningar för skadlig kod eller bedrägeri.', 'normal', GREEN);
    h2('Det här kan förbättras (' + r.issues.length + ')');
    if (!r.issues.length) para('Inga större problem hittades. Sajten klarar testerna bra.');
    r.issues.forEach(function (it, i) {
      need(10 * U);
      para((i + 1) + '. ' + it.title + (it.value ? '  (' + it.value + ')' : ''), 'bold', INK);
      y -= gap * 0.6; para(it.cat.toUpperCase(), 'normal', MUTED, 1.25 * U);
      if (it.what) para(it.what, 'normal', [70, 82, 75], 1.45 * U);
      para('Så fixar vi det: ' + it.fix, 'normal', GREEN, 1.5 * U);
    });
    h2('Nästa steg');
    para('Vi går gärna igenom resultatet med er och ger ett förslag med fast pris. Hör av er så bokar vi ett kort möte.');
    para('info@elevatestudio.nu  ·  elevatestudio.nu/kontakt', 'bold', GREEN);
    para('Mätningen görs med Google PageSpeed Insights (Lighthouse) och MDN HTTP Observatory. Resultatet kan variera något mellan körningar.', 'normal', MUTED, 1.3 * U);

    var pages = doc.getNumberOfPages();
    for (var pg = 1; pg <= pages; pg++) {
      doc.setPage(pg);
      doc.setDrawColor(201, 214, 205); doc.setLineWidth(0.75); doc.line(X, FOOT - 3.3 * U, RIGHT, FOOT - 3.3 * U);
      set(1.3 * U, 'normal', MUTED); doc.text('ELEVATE STUDIO  |  WEBBANALYS', X, FOOT); doc.text('Sida ' + pg + ' av ' + pages, RIGHT, FOOT, { align: 'right' });
    }
    var host = r.url.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '-').replace(/-+$/, '');
    doc.save('webbanalys-' + host + '.pdf');
    if (window.elevateTrack) window.elevateTrack('sitetest_pdf', r.url);
  }

  // When Google's quota is used up the visitor can leave an e-mail; we run the test and reply.
  var FORM_ENDPOINT = form.dataset.formEndpoint;
  function leadForm(url) {
    return '<form class="sitetest__lead" data-url="' + esc(url) + '"><label><span class="sr-only">Din e-post</span>' +
      '<input type="email" name="email" placeholder="Din e-post" required></label>' +
      '<button type="submit" class="btn btn--primary"><span>Kör testet åt mig</span></button><p class="form-status" role="status" hidden></p></form>';
  }
  function bindLeadForm() {
    document.querySelectorAll('.sitetest__lead:not([data-bound])').forEach(function (lead) {
      lead.dataset.bound = '1';
      lead.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = lead.querySelector('.form-status');
        var email = lead.querySelector('input').value;
        status.hidden = false;
        status.textContent = 'Skickar …';
        fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: 'Testa min sajt: ' + lead.dataset.url, _template: 'table', email: email, sajt: lead.dataset.url }) })
          .then(function (res) { if (!res.ok) throw new Error(); status.textContent = 'Tack! Vi kör testet och mejlar dig resultatet.'; lead.querySelector('button').disabled = true; })
          .catch(function () { status.textContent = 'Något gick fel. Mejla info@elevatestudio.nu så hjälper vi dig.'; });
      });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var url = normaliseUrl(input.value);
    if (!url) {
      input.setCustomValidity(window.ElevateLang ? window.ElevateLang.t('Skriv en giltig adress, till exempel dittforetag.se') : 'Skriv en giltig adress, till exempel dittforetag.se');
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    var strategy = form.querySelector('input[name="strategy"]:checked').value;
    var params = new URLSearchParams({ url: url, strategy: strategy, locale: window.ElevateLang && window.ElevateLang.lang === 'en' ? 'en' : 'sv' });
    CATEGORIES.forEach(function (c) { params.append('category', c.id); });
    if (KEY) params.append('key', KEY);

    button.disabled = true;
    startProgress();
    var runPsi = function (retry) {
      // Our server first (it adds the Google API key when one is set); if Google says no, the visitor's own browser asks Google directly
      return fetch(API + '?' + params.toString()).then(function (res) { return res.status === 429 ? fetch(GOOGLE + '?' + params.toString()) : res; })
        .then(function (res) { return res.json().then(function (body) { return { status: res.status, body: body }; }); })
        .then(function (r) {
          if (r.status === 429) {
            if (retry) return new Promise(function (ok) { setTimeout(ok, 5000); }).then(function () { return runPsi(false); });
            return { problem: 'Googles testtjänst har nått sin gräns för just nu.', quota: true };
          }
          if (r.body.error) return { problem: 'Google kunde inte ladda sidan.', fatal: true };
          var rt = r.body.lighthouseResult && r.body.lighthouseResult.runtimeError;
          if (rt && rt.code !== 'NO_ERROR') return { problem: 'Sidan kunde inte testas (' + esc(rt.message || 'okänt fel') + ').', fatal: true };
          return { data: r.body };
        })
        .catch(function () { return { problem: 'Vi kunde inte nå Googles testtjänst.', quota: true }; });
    };
    var psi = runPsi(true);
    var security = runSecurity(url).then(function (d) { return { data: d }; }).catch(function () { return { failed: true }; });

    // Real visitors (Chrome UX Report) and Google's blacklists (Safe Browsing), via our server
    var getJson = function (path) { return fetch(path + '?' + new URLSearchParams({ url: url, strategy: strategy })).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
    var extras = Promise.all([getJson('/api/crux'), getJson('/api/safe')]);

    Promise.all([psi, security, extras]).then(function (out) {
      stopProgress();
      var p = out[0], sec = out[1], extra = { crux: out[2][0], safe: out[2][1] };
      if (!p.data && !sec.data) {
        showError(p.fatal ? 'Vi kunde inte ladda ' + esc(url) + '. Kontrollera att adressen stämmer och att sidan är öppen för besökare.'
          : 'Testtjänsterna svarar inte just nu. Lämna din e-post så kör vi testet åt dig och mejlar resultatet.' + leadForm(url));
        bindLeadForm();
      } else {
        render(p.data || null, sec.data || null, url, strategy, p.data ? '' : p.problem, extra);
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
