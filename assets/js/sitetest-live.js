/* "Testa din sajt" – live analysis view. Opens a modal that shows the real browser session (/api/live, Server-Sent
   Events with screenshots), the real steps, the categories and the findings as they happen. Google's Lighthouse
   (the existing quick test) runs at the same time; its scores fill the categories when they arrive. When both are
   finished the modal folds into the normal result, and the live findings are added above it.
   Nothing here is timed or invented: every line comes from an event the server sent or from Google's answer. */
(function () {
  'use strict';
  if (!window.EventSource) return;
  var CATS = [
    ['performance', 'Prestanda'], ['accessibility', 'Tillgänglighet'], ['seo', 'SEO'],
    ['best-practices', 'Bästa praxis'], ['mobile', 'Mobilupplevelse'], ['technical', 'Teknisk kvalitet']
  ];
  var LABEL = { wait: 'Väntar', run: 'Pågår', done: 'Klar', problem: 'Problem hittat', failed: 'Kunde inte testas' };
  var SEV = { high: 'Viktigt', med: 'Bör åtgärdas', low: 'Litet' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function start(url, strategy) {
    var es = null, root = null, opened = false, finished = false, cancelled = false, liveDone = false, psiDone = false;
    var findings = [], goods = [], metrics = {}, steps = {}, catState = {}, t0 = Date.now(), timer = null, vw = 390, vh = 844;
    var waiters = [], unavailable = false, failMsg = '';
    var expected = ['browser', 'nav', 'read', 'seo', 'scroll', 'perf', 'mobile', 'tech', 'psi'];

    function build() {
      root = document.createElement('div');
      root.className = 'stl';
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Live-analys av ' + url);
      root.innerHTML =
        '<div class="stl__veil"></div><div class="stl__box">' +
        '<header class="stl__top"><div><p class="stl__eb">Live-analys</p><h2 class="stl__h">Vi granskar <span>' + esc(url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</span></h2></div>' +
        '<div class="stl__meta"><span class="stl__chip">' + (strategy === 'desktop' ? 'Dator' : 'Mobil') + '</span><span class="stl__clock" id="stl-clock">0 s</span>' +
        '<button type="button" class="stl__x" id="stl-cancel" aria-label="Avbryt analysen">Avbryt</button></div></header>' +
        '<div class="stl__grid">' +
        '<section class="stl__browser stl__browser--' + (strategy === 'desktop' ? 'desk' : 'mob') + '">' +
        '<div class="stl__bar"><i></i><i></i><i></i><span class="stl__url"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" fill="currentColor"/></svg><b id="stl-url">' + esc(url) + '</b></span></div>' +
        '<div class="stl__view" id="stl-view"><div class="stl__wait" id="stl-wait"><span class="stl__spin"></span><p>Startar en riktig webbläsare …</p></div>' +
        '<img id="stl-a" alt=""><img id="stl-b" alt=""><div class="stl__marks" id="stl-marks"></div><div class="stl__cur" id="stl-cur" hidden><svg viewBox="0 0 20 24" aria-hidden="true"><path d="M2 1l15 12-7 1 4 8-3 1-4-8-5 5z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><p id="stl-tip"></p></div><div class="stl__sb"><i id="stl-sb"></i></div></div>' +
        '<p class="stl__cap" id="stl-cap">En riktig webbläsare besöker sidan just nu.</p></section>' +
        '<aside class="stl__panel">' +
        '<div class="stl__prog"><div class="stl__prog-h"><span id="stl-now">Ansluter …</span><b id="stl-pct">0 %</b></div><div class="stl__track"><i id="stl-bar"></i></div></div>' +
        '<ul class="stl__cats">' + CATS.map(function (c) { return '<li data-c="' + c[0] + '" class="is-wait"><span class="stl__dot"></span><b>' + c[1] + '</b><em>Väntar</em><span class="stl__score"></span></li>'; }).join('') + '</ul>' +
        '<div class="stl__tabs"><p class="stl__sub">Aktivitet</p><ol class="stl__log" id="stl-log"></ol></div>' +
        '<div class="stl__tabs"><p class="stl__sub">Upptäckter <span id="stl-nf">0</span></p><div class="stl__finds" id="stl-finds"><p class="stl__empty">Inga upptäckter än.</p></div></div>' +
        '</aside></div></div>';
      document.body.appendChild(root);
      document.documentElement.classList.add('stl-open');
      requestAnimationFrame(function () { root.classList.add('is-in'); });
      root.querySelector('#stl-cancel').addEventListener('click', cancel);
      document.addEventListener('keydown', onKey);
      timer = setInterval(function () { var c = root && root.querySelector('#stl-clock'); if (c) c.textContent = Math.floor((Date.now() - t0) / 1000) + ' s'; }, 250);
    }
    function onKey(e) { if (e.key === 'Escape') cancel(); }
    function $(id) { return root && root.querySelector('#' + id); }

    function progress() {
      var doneN = expected.filter(function (k) { return steps[k] === 'done' || steps[k] === 'fail'; }).length;
      var pct = Math.round(100 * doneN / expected.length);
      if ($('stl-bar')) { $('stl-bar').style.width = pct + '%'; $('stl-pct').textContent = pct + ' %'; }
    }
    function log(id, text, state) {
      var ol = $('stl-log'); if (!ol) return;
      var li = ol.querySelector('[data-s="' + id + '"]');
      if (!li) { li = document.createElement('li'); li.setAttribute('data-s', id); ol.appendChild(li); }
      li.className = 'is-' + state;
      li.innerHTML = '<span class="stl__ic"></span><span>' + esc(text) + '</span><time>' + ((Date.now() - t0) / 1000).toFixed(1).replace('.', ',') + ' s</time>';
      ol.scrollTop = ol.scrollHeight;
      if (state === 'run') $('stl-now').textContent = text;
      steps[id] = state; progress();
    }
    var liveCat = {}, psiScore = {};
    // The shown state combines the live check and Google's score: failed stays failed, any problem or a score under 90 is a problem
    function combine(id) {
      var l = liveCat[id], g = psiScore[id];
      if (l === 'run' || l === 'wait' || !l) return g == null ? (l || 'wait') : 'run';
      if (l === 'failed') return g == null ? 'failed' : (g >= 90 ? 'done' : 'problem');
      if (l === 'problem' || (g != null && g < 90)) return 'problem';
      return 'done';
    }
    function setCat(id, state, extra) {
      catState[id] = state;
      var li = root && root.querySelector('.stl__cats [data-c="' + id + '"]'); if (!li) return;
      li.className = 'is-' + state; li.querySelector('em').textContent = LABEL[state] || state;
      if (extra != null) li.querySelector('.stl__score').textContent = extra;
    }
    var flip = false;
    function frame(d) {
      vw = d.vw; vh = d.vh;
      var a = $('stl-a'), b = $('stl-b'), w = $('stl-wait');
      if (!a) return;
      var show = flip ? a : b, hide = flip ? b : a; flip = !flip;
      show.onload = function () { show.classList.add('is-on'); hide.classList.remove('is-on'); };
      show.src = 'data:image/jpeg;base64,' + d.img;
      if (w) w.remove();
      var sb = $('stl-sb'); if (sb && d.h) { sb.style.height = Math.max(8, 100 * d.vh / d.h) + '%'; sb.style.top = (100 * d.y / d.h) + '%'; }
      $('stl-marks').innerHTML = (d.marks || []).filter(function (m) { return m.y + m.h > 0 && m.y < vh; }).map(function (m) {
        return '<i class="stl__m' + (m.scan ? ' stl__m--scan' : ' stl__m--' + m.sev) + '" style="left:' + (100 * m.x / vw) + '%;top:' + (100 * m.y / vh) + '%;width:' + (100 * m.w / vw) + '%;height:' + (100 * m.h / vh) + '%">' + (m.label ? '<span>' + esc(m.label) + '</span>' : '') + '</i>';
      }).join('');
    }
    function addFinding(f) {
      findings.push(f);
      var box = $('stl-finds'); if (!box) return;
      var e = box.querySelector('.stl__empty'); if (e) e.remove();
      var el = document.createElement('div'); el.className = 'stl__f stl__f--' + f.sev;
      el.innerHTML = '<b>' + esc(f.what) + '</b><span>' + esc(f.where) + '</span>';
      box.insertBefore(el, box.firstChild);
      $('stl-nf').textContent = findings.length;
    }
    function open() { if (!opened) { opened = true; build(); } }

    es = new EventSource('/api/live?' + new URLSearchParams({ url: url, strategy: strategy }));
    var on = function (n, fn) { es.addEventListener(n, function (ev) { var d; try { d = JSON.parse(ev.data); } catch (x) { return; } fn(d); }); };
    on('unavailable', function () { unavailable = true; es.close(); liveDone = true; settle(); });
    on('step', function (d) { open(); log(d.id, d.text, d.state); });
    on('cat', function (d) { open(); liveCat[d.id] = d.state; setCat(d.id, combine(d.id), psiScore[d.id]); });
    on('frame', function (d) { open(); frame(d); });
    on('finding', function (d) { addFinding(d); });
    on('cursor', function (d) {
      var c = $('stl-cur'); if (!c) return;
      c.hidden = false; c.style.left = (100 * d.x / vw) + '%'; c.style.top = (100 * d.y / vh) + '%';
      c.classList.toggle('is-right', d.x > vw * 0.55);
      $('stl-tip').textContent = d.text;
      c.classList.remove('is-click'); if (d.click) { void c.offsetWidth; c.classList.add('is-click'); }
    });
    on('good', function (d) { goods.push(d); });
    on('metric', function (d) { metrics[d.id] = d; });
    on('done', function (d) { es.close(); liveDone = true; if ($('stl-cap')) $('stl-cap').textContent = 'Webbläsaren är klar efter ' + d.seconds + ' s. ' + findings.length + ' upptäckter.'; settle(); });
    on('fail', function (d) {
      es.close(); liveDone = true; failMsg = d.message || 'Live-granskningen kunde inte genomföras.';
      if (opened) { log('live', failMsg, 'fail'); CATS.forEach(function (c) { if (catState[c[0]] !== 'done' && catState[c[0]] !== 'problem') setCat(c[0], 'failed'); }); if ($('stl-cap')) $('stl-cap').textContent = failMsg; }
      settle();
    });
    es.onerror = function () { if (!liveDone) { es.close(); liveDone = true; failMsg = 'Anslutningen till live-webbläsaren bröts.'; if (opened) log('live', failMsg, 'fail'); settle(); } };

    function psiResult(p) {
      psiDone = true;
      if (opened) {
        if (p && p.data) {
          var cats = p.data.lighthouseResult && p.data.lighthouseResult.categories || {};
          ['performance', 'accessibility', 'seo', 'best-practices'].forEach(function (id) {
            var c = cats[id]; if (!c || typeof c.score !== 'number') return;
            psiScore[id] = Math.round(c.score * 100);
            setCat(id, combine(id), psiScore[id]);
          });
          log('psi', 'Google Lighthouse klart: poäng hämtade', 'done');
        } else log('psi', 'Googles poäng kunde inte hämtas' + (p && p.problem ? ' (' + p.problem + ')' : ''), 'fail');
      }
      settle();
    }
    // Lighthouse runs in parallel from the start: show it as a running step once the modal is open
    var psiShown = setInterval(function () { if (opened) { clearInterval(psiShown); if (!psiDone) log('psi', 'Google Lighthouse mäter prestanda, tillgänglighet och SEO …', 'run'); } }, 100);

    function settle() {
      if (!(liveDone && psiDone) || finished) return;
      finished = true; clearInterval(timer); clearInterval(psiShown);
      if (opened && !cancelled) {
        log('end', 'Sammanställer resultat …', 'done');
        $('stl-now').textContent = 'Analysen är klar';
        root.classList.add('is-done');
        setTimeout(close, 1400);
      } else close();
    }
    function close() {
      document.removeEventListener('keydown', onKey);
      if (root) { root.classList.add('is-out'); setTimeout(function () { if (root) root.remove(); root = null; document.documentElement.classList.remove('stl-open'); }, 650); }
      var w = waiters; waiters = []; w.forEach(function (fn) { fn(!cancelled); });
    }
    function cancel() {
      if (finished && !root) return;
      cancelled = true; if (es) es.close(); finished = true; clearInterval(timer); clearInterval(psiShown);
      close();
    }

    return {
      // Called with the existing Lighthouse result; resolves (true = show the result) when the modal has closed
      finish: function (p) { return new Promise(function (ok) { waiters.push(ok); psiResult(p); }); },
      get cancelled() { return cancelled; },
      get used() { return opened; },
      // The live findings as a section above the normal result
      section: function () {
        if (!opened || (!findings.length && !goods.length && !failMsg)) return '';
        var byCat = CATS.map(function (c) {
          var fs = findings.filter(function (f) { return f.cat === c[0]; }).sort(function (a, b) { return 'hml'.indexOf(a.sev[0]) - 'hml'.indexOf(b.sev[0]); });
          var gs = goods.filter(function (g) { return g.cat === c[0]; });
          var st = catState[c[0]] || 'wait';
          return '<div class="stl-r__cat"><h3><span class="stl-r__st is-' + st + '">' + esc(LABEL[st] || '') + '</span>' + c[1] + '</h3>' +
            fs.map(function (f) { return '<article class="stl-r__f stl-r__f--' + f.sev + '"><p class="stl-r__sev">' + SEV[f.sev] + '</p><h4>' + esc(f.what) + '</h4><dl><dt>Var</dt><dd>' + esc(f.where) + '</dd><dt>Varför</dt><dd>' + esc(f.why) + '</dd><dt>Så fixar ni det</dt><dd>' + esc(f.fix) + '</dd></dl></article>'; }).join('') +
            gs.map(function (g) { return '<p class="stl-r__g">' + esc(g.text) + '</p>'; }).join('') +
            (!fs.length && !gs.length ? '<p class="stl-r__na">' + (st === 'failed' ? 'Kunde inte testas.' : 'Inga upptäckter i live-granskningen.') + '</p>' : '') + '</div>';
        }).join('');
        var ms = Object.keys(metrics).map(function (k) { return '<div><b>' + esc(metrics[k].value) + '</b><span>' + esc(metrics[k].label) + '</span></div>'; }).join('');
        return '<section class="stl-r"><p class="stl-r__eb">Live-granskning · ' + (strategy === 'desktop' ? 'dator' : 'mobil') + '</p><h2>Det här såg vi på er sida</h2>' +
          (failMsg ? '<p class="stl-r__warn">' + esc(failMsg) + '</p>' : '') +
          (ms ? '<div class="stl-r__m">' + ms + '</div>' : '') + '<div class="stl-r__grid">' + byCat + '</div>' +
          '<p class="stl-r__note">Mätt i en riktig webbläsare vid ett enskilt besök. Värdena kan variera något mellan körningar.</p></section>';
      }
    };
  }
  window.SitetestLive = { start: start };
})();
