/* "Testa din sajt", the extra checks after the main test: mobile and desktop side by side, the whole site
   (titles, descriptions, headings, pictures without text, broken links, contact form), the speed of the most
   important pages, mail (SPF, DKIM, DMARC), the certificate, a comparison with competitors and earlier results
   in this browser. Every number comes from Google's or the checks' own answers. */
(function () {
  var box = document.getElementById('sitetest-extra');
  if (!box) return;
  var CATS = [['performance', 'Prestanda'], ['accessibility', 'Tillgänglighet'], ['best-practices', 'Bästa praxis'], ['seo', 'SEO']];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pct = function (s) { return typeof s === 'number' ? Math.round(s * 100) : '–'; };
  var tone = function (s) { return typeof s !== 'number' ? '' : s >= 0.9 ? 'good' : s >= 0.5 ? 'ok' : 'bad'; };
  var HIST = 'es.sitetest.hist';

  function psi(url, strategy) {
    var p = new URLSearchParams({ url: url, strategy: strategy, locale: 'sv' });
    CATS.forEach(function (c) { p.append('category', c[0]); });
    return fetch('/api/psi?' + p.toString()).then(function (r) {
      if (r.status === 429) throw new Error('Googles testtjänst har nått sin gräns just nu.');
      return r.json();
    }).then(function (d) {
      var lr = d.lighthouseResult;
      if (!lr) throw new Error('Sidan kunde inte testas.');
      var c = {};
      CATS.forEach(function (x) { c[x[0]] = lr.categories[x[0]] ? lr.categories[x[0]].score : null; });
      var a = lr.audits;
      return { cats: c, lcp: a['largest-contentful-paint'] ? a['largest-contentful-paint'].displayValue : '–', cls: a['cumulative-layout-shift'] ? a['cumulative-layout-shift'].displayValue : '–' };
    });
  }
  function site(url) {
    return fetch('/api/sitecheck?url=' + encodeURIComponent(url)).then(function (r) { return r.json(); }).then(function (d) {
      if (d.error) throw new Error('Sajten kunde inte läsas.');
      return d;
    });
  }
  function history(url) {
    try { return (JSON.parse(localStorage.getItem(HIST) || '{}')[url]) || []; } catch (e) { return []; }
  }
  function saveHistory(url, cats, lcp) {
    try {
      var all = JSON.parse(localStorage.getItem(HIST) || '{}');
      var list = all[url] || [];
      list.push({ date: new Date().toISOString().slice(0, 10), p: pct(cats.performance), a: pct(cats.accessibility), b: pct(cats['best-practices']), s: pct(cats.seo), lcp: lcp });
      all[url] = list.slice(-12);
      localStorage.setItem(HIST, JSON.stringify(all));
    } catch (e) { /* the browser may block storage; the test still works */ }
  }
  var section = function (title, body) { return '<section class="sitetest__more"><h2 class="sitetest__h2">' + title + '</h2>' + body + '</section>'; };
  var note = function (text) { return '<p class="sitetest__note">' + text + '</p>'; };
  var failed = function (e) { return '<p class="sitetest__note">' + esc(e.message || 'Något gick fel.') + '</p>'; };

  // ---- mobile and desktop side by side ----
  function devices(url, main) {
    var el = document.getElementById('ex-device');
    var other = main.strategy === 'mobile' ? 'desktop' : 'mobile';
    psi(url, other).then(function (o) {
      var m = main.strategy === 'mobile' ? main.cats : o.cats, d = main.strategy === 'mobile' ? o.cats : main.cats;
      var rows = CATS.map(function (c) {
        return '<tr><td>' + c[1] + '</td><td class="' + tone(m[c[0]]) + '">' + pct(m[c[0]]) + '</td><td class="' + tone(d[c[0]]) + '">' + pct(d[c[0]]) + '</td></tr>';
      }).join('');
      el.innerHTML = '<div class="sitetest__tbl"><table><thead><tr><th>Kategori</th><th>Mobil</th><th>Dator</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      if (main.strategy === 'mobile') saveHistory(url, main.cats, main.lcp);
    }).catch(function (e) { el.innerHTML = failed(e); });
    var h = history(url), prev = h.length > 1 ? h[h.length - 2] : null, now = h[h.length - 1];
    if (prev && now) {
      var delta = function (a, b) { return b === a ? '<b>oförändrat</b>' : (b > a ? '<b class="up">+' + (b - a) + '</b>' : '<b class="down">' + (b - a) + '</b>'); };
      el.innerHTML += '<p class="sitetest__note">Jämfört med ' + esc(prev.date) + ' (mobil): prestanda ' + prev.p + ' → ' + now.p + ' (' + delta(prev.p, now.p) + '), SEO ' + prev.s + ' → ' + now.s + ', tillgänglighet ' + prev.a + ' → ' + now.a + '. Historiken sparas bara i den webbläsare som gjorde testet.</p>';
    } else if (now || main.strategy === 'mobile') {
      el.innerHTML += '<p class="sitetest__note">Gör testet igen om en tid, så visar vi hur sajten har förändrats. Historiken sparas i den här webbläsaren.</p>';
    }
  }

  // ---- the whole site ----
  function siteReport(url, d) {
    var pages = d.pages || [], ok = pages.filter(function (p) { return p.ok; });
    var issues = [];
    ok.forEach(function (p) {
      var where = esc(p.url.replace(/^https?:\/\/[^/]+/, '') || '/');
      if (!p.titleLen) issues.push(where + ': sidan saknar titel');
      else if (p.titleLen > 60) issues.push(where + ': titeln är för lång (' + p.titleLen + ' tecken, max 60)');
      else if (p.titleLen < 25) issues.push(where + ': titeln är för kort (' + p.titleLen + ' tecken)');
      if (!p.descLen) issues.push(where + ': saknar metabeskrivning');
      else if (p.descLen > 160) issues.push(where + ': beskrivningen är för lång (' + p.descLen + ' tecken, max 160)');
      else if (p.descLen < 70) issues.push(where + ': beskrivningen är för kort (' + p.descLen + ' tecken)');
      if (p.h1 === 0) issues.push(where + ': saknar rubrik (h1)');
      if (p.h1 > 1) issues.push(where + ': har ' + p.h1 + ' rubriker h1, en räcker');
      if (p.noAlt) issues.push(where + ': ' + p.noAlt + ' bilder saknar bildtext (alt)');
    });
    (d.duplicateTitles || []).forEach(function (t) { issues.push('Samma titel på flera sidor: "' + esc(t) + '"'); });
    (d.broken || []).forEach(function (b) { issues.push('Trasig länk: ' + esc(b.url.replace(/^https?:\/\/[^/]+/, '') || '/') + ' (status ' + (b.status || 'inget svar') + ') på sidan ' + esc(b.from.replace(/^https?:\/\/[^/]+/, '') || '/')); });
    var f = d.form || {};
    issues.push(f.found ? '' : 'Hittar inget formulär med e-postfält och skicka-knapp på ' + esc((f.page || '').replace(/^https?:\/\/[^/]+/, '') || 'startsidan'));
    issues = issues.filter(Boolean);
    var rows = pages.map(function (p) {
      return '<tr><td>' + esc(p.url.replace(/^https?:\/\/[^/]+/, '') || '/') + '</td><td>' + (p.ok ? esc(p.titleLen) : '–') + '</td><td>' + (p.ok ? esc(p.descLen) : '–') + '</td><td>' + (p.ok ? esc(p.h1) : '–') + '</td><td>' + (p.ok ? esc(p.noAlt) + ' av ' + esc(p.imgs) : '–') + '</td><td>' + (p.ok ? (p.form ? 'Ja' : 'Nej') : esc(p.status || 'inget svar')) + '</td></tr>';
    }).join('');
    var summary = '<p class="sitetest__note">Kontrollerade ' + esc(d.checked.pages) + ' sidor av ' + esc(d.checked.sitemapPages) + ' i sajtkartan och ' + esc(d.checked.links) + ' interna länkar.' +
      (d.checked.sitemapPages > d.checked.pages ? ' Resten av sajten kontrolleras inte i det här testet.' : '') + '</p>';
    var table = '<div class="sitetest__tbl"><table><thead><tr><th>Sida</th><th>Titel (tecken)</th><th>Beskrivning (tecken)</th><th>Rubrik h1</th><th>Bilder utan text</th><th>Formulär</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    var list = issues.length ? '<ul class="sitetest__list">' + issues.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' : '<p class="sitetest__note">Inga SEO-fel hittades på de sidor vi kontrollerade.</p>';
    return summary + table + list;
  }
  function mailReport(d) {
    var m = d.mail || {}, c = d.cert || {};
    var yes = function (ok, text) { return '<li class="' + (ok ? 'good' : 'bad') + '"><b>' + (ok ? 'Finns' : 'Saknas') + '</b> ' + text + '</li>'; };
    var spf = m.spf || {}, dm = m.dmarc || {}, dk = m.dkim || {}, mx = m.mx || {};
    var out = '<ul class="sitetest__list sitetest__mail">' +
      yes(spf.found, 'SPF: talar om vilka servrar som får skicka mejl för domänen' + (spf.found ? '.' : '. Utan den kan mejl från er domän sorteras som skräp.')) +
      yes(dk.found, 'DKIM: signerar mejlen' + (dk.found ? ' (väljare: ' + esc((dk.selectors || []).join(', ')) + ').' : '. Vi hittade ingen signatur bland de vanligaste väljarna. Om ni använder ett annat mejlsystem kan den ändå finnas.')) +
      yes(dm.found, 'DMARC: säger vad mottagaren ska göra med mejl som inte kan verifieras' + (dm.found ? ' (policy: ' + esc(dm.policy) + (dm.policy === 'none' ? ', bara övervakning' : '') + ').' : '. Utan den kan andra skicka mejl som ser ut att komma från er.')) +
      yes(mx.found, 'MX: tar emot mejl' + (mx.found ? ' (' + esc((mx.hosts || []).slice(0, 2).join(', ')) + ').' : '.')) +
      '</ul>';
    if (c.checked) {
      var soon = c.daysLeft < 30;
      out += '<p class="sitetest__note' + (soon ? ' sitetest__warn' : '') + '">Certifikatet gäller till ' + esc(c.expires) + ' (' + esc(c.daysLeft) + ' dagar kvar).' + (soon ? ' Förnya snart, annars visar webbläsare en varning.' : '') + '</p>';
    } else {
      out += '<p class="sitetest__note">Vi kunde inte läsa certifikatets giltighetstid just nu.</p>';
    }
    return out;
  }

  function run(url, main) {
    var site_ = box.querySelector('#ex-site');
    site(url).then(function (d) {
      site_.innerHTML = siteReport(url, d) + '<h3 class="sitetest__h3">Mejl och säkerhet</h3>' + mailReport(d);
      var others = (d.pages || []).filter(function (p) { return p.ok && p.url !== url && p.url.replace(/\/$/, '') !== url.replace(/\/$/, ''); })
        .map(function (p) { return p.url; }).slice(0, 4);
      if (!others.length) return;
      var out = box.querySelector('#ex-pages');
      var rows = [];
      var next = function (i) {
        if (i >= others.length) { out.innerHTML = '<div class="sitetest__tbl"><table><thead><tr><th>Sida</th><th>Prestanda</th><th>Största innehåll</th><th>Layoutskift</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'; return; }
        out.innerHTML = '<p class="sitetest__note">Testar sida ' + (i + 1) + ' av ' + others.length + ' …</p>';
        psi(others[i], 'mobile').then(function (r) {
          rows.push('<tr><td>' + esc(others[i].replace(/^https?:\/\/[^/]+/, '') || '/') + '</td><td class="' + tone(r.cats.performance) + '">' + pct(r.cats.performance) + '</td><td>' + esc(r.lcp) + '</td><td>' + esc(r.cls) + '</td></tr>');
        }).catch(function (e) { rows.push('<tr><td>' + esc(others[i]) + '</td><td colspan="3">' + esc(e.message) + '</td></tr>'); })
          .then(function () { next(i + 1); });
      };
      next(0);
    }).catch(function (e) { site_.innerHTML = failed(e); });
  }

  // ---- competitors ----
  function compare(url, main) {
    var out = box.querySelector('#ex-comp-out');
    var inputs = [].slice.call(box.querySelectorAll('#ex-comp input')).map(function (i) { return i.value.trim(); }).filter(Boolean).slice(0, 3);
    if (!inputs.length) { out.innerHTML = '<p class="sitetest__note">Skriv in minst en konkurrents adress.</p>'; return; }
    out.innerHTML = '<p class="sitetest__note">Testar ' + inputs.length + ' konkurrent' + (inputs.length > 1 ? 'er' : '') + ' och er sajt. Det tar en stund.</p>';
    var sites = [url].concat(inputs.map(function (x) { return /^https?:\/\//.test(x) ? x : 'https://' + x; }));
    var jobs = sites.map(function (s, i) {
      return Promise.all([psi(s, 'mobile'), site(s)]).then(function (r) { return { url: s, psi: r[0], site: r[1] }; })
        .catch(function (e) { return { url: s, error: e.message }; });
    });
    Promise.all(jobs).then(function (res) {
      var head = res.map(function (r) { return '<th>' + esc(r.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + (r === res[0] ? ' (ni)' : '') + '</th>'; }).join('');
      var line = function (label, fn) { return '<tr><td>' + label + '</td>' + res.map(function (r) { return '<td>' + (r.error ? '–' : fn(r)) + '</td>'; }).join('') + '</tr>'; };
      var rows = [
        line('Prestanda (mobil)', function (r) { return '<span class="' + tone(r.psi.cats.performance) + '">' + pct(r.psi.cats.performance) + '</span>'; }),
        line('Tillgänglighet', function (r) { return pct(r.psi.cats.accessibility); }),
        line('SEO', function (r) { return pct(r.psi.cats.seo); }),
        line('Största innehåll', function (r) { return esc(r.psi.lcp); }),
        line('SPF', function (r) { return r.site.mail && r.site.mail.spf.found ? 'Finns' : 'Saknas'; }),
        line('DKIM', function (r) { return r.site.mail && r.site.mail.dkim.found ? 'Finns' : 'Saknas'; }),
        line('DMARC', function (r) { return r.site.mail && r.site.mail.dmarc.found ? esc(r.site.mail.dmarc.policy) : 'Saknas'; }),
        line('Certifikat, dagar kvar', function (r) { return r.site.cert && r.site.cert.checked ? esc(r.site.cert.daysLeft) : '–'; }),
        line('SEO-fel på sidorna', function (r) { return esc(r.site.pages.filter(function (p) { return p.ok && (!p.titleLen || p.titleLen > 60 || !p.descLen || p.h1 !== 1 || p.noAlt); }).length); }),
        line('Trasiga länkar', function (r) { return esc((r.site.broken || []).length); })
      ].join('');
      var fails = res.filter(function (r) { return r.error; }).map(function (r) { return '<p class="sitetest__note">' + esc(r.url) + ': ' + esc(r.error) + '</p>'; }).join('');
      out.innerHTML = '<div class="sitetest__tbl sitetest__cmp"><table><thead><tr><th></th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + fails +
        '<p class="sitetest__note">Konkurrenternas siffror är från samma test som ni fick. Vi visar bara det som går att mäta utifrån, och inget påhittat.</p>';
    });
  }

  document.addEventListener('sitetest:done', function (e) {
    var d = e.detail;
    box.hidden = false;
    box.innerHTML =
      section('Mobil och dator', '<div id="ex-device"><p class="sitetest__note">Hämtar datortestet …</p></div>') +
      section('Hela sajten', '<div id="ex-site"><p class="sitetest__note">Läser sajtens sidor, länkar, mejl och certifikat …</p></div><div id="ex-pages"></div>') +
      section('Jämför med konkurrenter',
        '<p class="sitetest__note">Skriv in upp till tre konkurrenter. Vi testar dem på samma sätt som er sajt.</p>' +
        '<div class="sitetest__comp" id="ex-comp"><input type="text" placeholder="Konkurrent 1, till exempel dittforetag.se"><input type="text" placeholder="Konkurrent 2"><input type="text" placeholder="Konkurrent 3"></div>' +
        '<button type="button" class="btn btn--primary" id="ex-comp-go"><span>Jämför</span></button><div id="ex-comp-out"></div>');
    run(d.url, d);
    devices(d.url, d);
    box.querySelector('#ex-comp-go').addEventListener('click', function () { compare(d.url, d); });
  });
})();
