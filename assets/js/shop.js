/* Domäner, Företagsmejl and Kassa. Prices come from assets/data/catalog.json; the cart is kept in this browser
   (localStorage, key es.cart) so it survives a reload and can be finished later. Availability comes from
   /api/domain/check and is never guessed. The order is priced again on the server. */
(function () {
  var KEY = 'es.cart', cat = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var kr = function (n) { return Math.round(n).toLocaleString('sv-SE') + ' kr'; };
  var load = function () { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  var save = function (c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* private window */ } bar(); };
  var cart = load();
  var tldOf = function (d) { return d.split('.').slice(1).join('.'); };
  var T = function (tld) { return cat && cat.tlds.filter(function (t) { return t.tld === tld; })[0]; };
  var M = function (id) { return cat && cat.mail.filter(function (m) { return m.id === id; })[0]; };
  var demo = function () { return cat && cat.demo ? ' <span class="shop-demo" title="Exempelpris tills priserna är satta">Demopris</span>' : ''; };

  // what one cart line costs now (net) and per period
  function price(it) {
    if (it.type === 'domain') { var t = T(tldOf(it.domain)); if (!t) return { once: 0, year: 0 }; var y = it.years || 1; return it.transfer ? { once: t.transfer + t.renew, year: t.renew } : { once: t.register + t.renew * (y - 1), year: t.renew }; }
    var m = M(it.id); if (!m) return { once: 0, month: 0, year: 0 };
    return it.period === 'year' ? { once: 0, year: m.yearly + (it.extra || 0) * m.extra_account * 12 } : { once: 0, month: m.monthly + (it.extra || 0) * m.extra_account };
  }
  function sums() { return cart.reduce(function (s, it) { var p = price(it); s.once += p.once || 0; s.month += p.month || 0; s.year += p.year || 0; return s; }, { once: 0, month: 0, year: 0 }); }

  // the bar at the bottom: what is in the cart and the way to the checkout
  function bar() {
    var b = document.getElementById('shop-bar');
    if (!cart.length || /kassa(\.html)?$/.test(location.pathname)) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'shop-bar'; b.className = 'shop-bar'; document.body.appendChild(b); }
    var s = sums();
    b.innerHTML = '<p><b>' + cart.length + (cart.length === 1 ? ' produkt' : ' produkter') + '</b> · ' + (s.once ? kr(s.once) + ' nu' : '') + (s.month ? (s.once ? ', ' : '') + kr(s.month) + '/mån' : '') + ' <span>exkl. moms</span></p><a class="btn btn--primary" href="kassa.html"><span>Till kassan</span></a>';
  }

  function add(it) {
    var same = cart.filter(function (x) { return x.type === it.type && (x.domain || x.id) === (it.domain || it.id) && (x.domain === it.domain); })[0];
    if (!same) cart.push(it);
    save(cart);
  }

  // ---------- domain search ----------
  var STATUS = { free: ['Ledig', 'ok'], likely_free: ['Sannolikt ledig', 'ok'], taken: ['Upptagen', 'no'], unknown: ['Kunde inte kontrolleras', 'no'], invalid: ['Ogiltigt namn', 'no'] };
  function domainPage() {
    var form = document.getElementById('dom-form'); if (!form) return;
    var out = document.getElementById('dom-results'), hint = document.getElementById('dom-hint'), last = null, sort = 'relevance', only = '';
    function row(r) {
      var t = T(r.tld), st = STATUS[r.status] || STATUS.unknown, inCart = cart.some(function (x) { return x.domain === r.domain; });
      var btn = st[1] === 'ok' && t ? '<button type="button" class="btn ' + (inCart ? 'btn--light' : 'btn--primary') + ' shop-add" data-d="' + esc(r.domain) + '"' + (inCart ? ' disabled' : '') + '><span>' + (inCart ? 'Tillagd' : 'Lägg till') + '</span></button>'
        : r.status === 'taken' && t ? '<button type="button" class="btn btn--light shop-add" data-d="' + esc(r.domain) + '" data-transfer="1"><span>Är den er? Flytta hit</span></button>' : '';
      var warn = t && t.renew > t.register * 2 ? '<small class="shop-warn">Förnyas för ' + kr(t.renew) + '/år</small>' : t ? '<small>Förnyas ' + kr(t.renew) + '/år</small>' : '';
      var dot = r.domain.indexOf('.');
      return '<div class="shop-row"><b>' + esc(r.domain.slice(0, dot)) + ' <span class="tld">' + esc(r.domain.slice(dot)) + '</span></b><span class="shop-st shop-st--' + st[1] + '"' + (r.status === 'likely_free' ? ' title="Kontrollerad via DNS. Bekräftas innan registrering."' : '') + '>' + st[0] + '</span>' +
        '<span>' + (t && st[1] === 'ok' ? kr(t.register) + ' första året' : '') + warn + '</span>' + btn + '</div>';
    }
    function render() {
      if (!last) return;
      var list = last.results.slice().filter(function (r) { return !only || r.tld === only; });
      if (sort === 'price') list.sort(function (a, b) { return ((T(a.tld) || {}).register || 9e9) - ((T(b.tld) || {}).register || 9e9); });
      if (sort === 'popular') list.sort(function (a, b) { return ((T(b.tld) || {}).popular || 0) - ((T(a.tld) || {}).popular || 0); });
      if (sort === 'relevance') list.sort(function (a, b) { var o = function (r) { return (r.tld === last.asked ? -10 : 0) + (STATUS[r.status][1] === 'ok' ? 0 : 5) - ((T(r.tld) || {}).popular || 0) / 10; }; return o(a) - o(b); });
      var tlds = last.results.map(function (r) { return r.tld; });
      out.innerHTML = '<div class="shop-tools"><div class="chips">' + ['', ].concat(tlds).map(function (t) { return '<button type="button" class="chip' + (only === t ? ' is-on' : '') + '" data-tld="' + t + '">' + (t ? '.' + t : 'Alla') + '</button>'; }).join('') + '</div>' +
        '<label class="shop-sort">Sortera <select id="dom-sort"><option value="relevance">Relevans</option><option value="price">Pris</option><option value="popular">Popularitet</option></select></label></div>' +
        '<div class="shop-list">' + list.map(row).join('') + '</div>' +
        (last.ideas.length ? '<h2 class="sitetest__h2">Andra lediga namn</h2><p class="shop-lead">Förslag utifrån namnet. Alla är kontrollerade innan de visas.</p><div class="shop-list">' + last.ideas.map(row).join('') + '</div>' : '') +
        '<p class="shop-note">Priser exkl. moms' + (cat && cat.demo ? '. <b>Priserna är exempel (demopriser)</b> tills Elevate Studio har satt de riktiga.' : '.') + ' Kontrollerat ' + new Date(last.checked).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) + '.</p>';
      out.querySelector('#dom-sort').value = sort;
    }
    out.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (c) { only = c.dataset.tld; render(); return; }
      var b = e.target.closest('.shop-add'); if (!b) return;
      add({ type: 'domain', domain: b.dataset.d, years: 1, transfer: !!b.dataset.transfer }); render();
    });
    out.addEventListener('change', function (e) { if (e.target.id === 'dom-sort') { sort = e.target.value; render(); } });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = form.q.value.trim(); if (q.length < 2) { hint.textContent = 'Skriv minst två tecken.'; return; }
      hint.textContent = 'Kontrollerar …'; out.innerHTML = '';
      var btn = form.querySelector('button'); btn.disabled = true;
      fetch('/api/domain/check?q=' + encodeURIComponent(q)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { last = d; hint.textContent = ''; render(); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); })
        .catch(function () { hint.textContent = 'Sökningen fungerade inte just nu. Försök igen om en stund.'; })
        .then(function () { btn.disabled = false; });
    });
    var pre = new URLSearchParams(location.search).get('q'); if (pre) { form.q.value = pre; form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  }

  // ---------- business mail ----------
  function mailPage() {
    var box = document.getElementById('mail-plans'); if (!box) return;
    var period = function () { return (document.querySelector('input[name="period"]:checked') || {}).value || 'month'; };
    function render() {
      var y = period() === 'year';
      box.innerHTML = cat.mail.map(function (m) {
        return '<div class="shop-plan"><h3>' + esc(m.name) + '</h3><p class="shop-price">' + kr(y ? m.yearly : m.monthly) + '<span>/' + (y ? 'år' : 'mån') + '</span>' + demo() + '</p>' +
          '<p class="shop-sub">' + m.accounts + (m.accounts === 1 ? ' konto' : ' konton') + ' · ' + m.storage_gb + ' GB per konto · extra konto ' + kr(m.extra_account) + '/mån</p>' +
          '<ul class="check-list">' + m.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
          '<label class="shop-small">Domän <input type="text" class="m-dom" placeholder="ert-foretag.se"></label>' +
          '<label class="shop-small">Extra konton <input type="number" class="m-extra" min="0" max="500" value="0"></label>' +
          '<label class="shop-small">Önskade adresser <input type="text" class="m-addr" placeholder="info, kontakt, faktura"></label>' +
          '<button type="button" class="btn btn--primary m-add" data-id="' + m.id + '"><span>Lägg till</span></button></div>';
      }).join('');
    }
    document.querySelectorAll('input[name="period"]').forEach(function (r) { r.addEventListener('change', render); });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.m-add'); if (!b) return;
      var card = b.closest('.shop-plan'), dom = card.querySelector('.m-dom').value.trim().toLowerCase().replace(/^https?:\/\/|^www\./g, '');
      if (!/^[a-z0-9åäö.-]+\.[a-z]{2,}$/.test(dom)) { card.querySelector('.m-dom').focus(); card.querySelector('.m-dom').setCustomValidity('Skriv domänen, till exempel ert-foretag.se'); card.querySelector('.m-dom').reportValidity(); return; }
      card.querySelector('.m-dom').setCustomValidity('');
      var addr = card.querySelector('.m-addr').value.split(/[,\s]+/).filter(Boolean).map(function (a) { return a.replace(/@.*$/, '') + '@' + dom; });
      add({ type: 'mail', id: b.dataset.id, period: period(), extra: Math.max(0, +card.querySelector('.m-extra').value || 0), domain: dom, addresses: addr });
      b.querySelector('span').textContent = 'Tillagd'; b.disabled = true;
    });
    render();
    // mail diagnostics in plain words
    var f = document.getElementById('diag-form'), o = document.getElementById('diag-out');
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault(); o.innerHTML = '<p class="shop-lead">Kontrollerar …</p>';
      fetch('/api/mail/diag?domain=' + encodeURIComponent(f.domain.value)).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (d) {
        var line = function (ok, t, fix) { return '<div class="shop-row shop-row--diag"><b>' + t + '</b><span class="shop-st shop-st--' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Bra' : 'Åtgärda') + '</span><span>' + fix + '</span></div>'; };
        o.innerHTML = '<div class="shop-list">' +
          line(d.mx.found, 'MX', d.mx.found ? 'Tar emot mejl via ' + esc(d.mx.hosts.slice(0, 2).join(', ')) + '.' : 'Inga MX-poster. Domänen kan inte ta emot mejl.') +
          line(d.spf.found, 'SPF', d.spf.found ? 'Finns. Talar om vilka servrar som får skicka i ert namn.' : 'Saknas. Mejl från er kan hamna i skräpposten.') +
          line(d.dkim.found, 'DKIM', d.dkim.found ? 'Hittad (' + esc(d.dkim.selectors.join(', ')) + ').' : 'Hittades inte bland vanliga namn. Den kan finnas under ett annat namn – fråga oss.') +
          line(d.dmarc.found && d.dmarc.policy !== 'none', 'DMARC', !d.dmarc.found ? 'Saknas. Andra kan skicka mejl som ser ut att komma från er.' : d.dmarc.policy === 'none' ? 'Finns men står på "none", alltså bara övervakning. Höj till quarantine när allt fungerar.' : 'Finns med policy ' + esc(d.dmarc.policy) + '.') +
          '</div>';
      }).catch(function () { o.innerHTML = '<p class="shop-lead">Kunde inte kontrollera den domänen. Stämmer stavningen?</p>'; });
    });
  }

  // ---------- checkout ----------
  function checkout() {
    var view = document.getElementById('cart-view'); if (!view) return;
    var form = document.getElementById('checkout');
    function render() {
      if (!cart.length) { view.innerHTML = '<p class="shop-lead">Varukorgen är tom. <a href="domaner.html">Sök domän</a> eller <a href="foretagsmejl.html">välj företagsmejl</a>.</p>'; form.hidden = true; return; }
      form.hidden = false;
      var s = sums(), vat = cat.vat || 0.25;
      view.innerHTML = '<div class="shop-list">' + cart.map(function (it, i) {
        var p = price(it), name = it.type === 'domain' ? esc(it.domain) + (it.transfer ? ' (flytt)' : '') : esc((M(it.id) || {}).name) + ' för ' + esc(it.domain);
        var opts = it.type === 'domain' && !it.transfer ? '<select data-i="' + i + '" class="c-years" aria-label="År">' + [1, 2, 3, 5, 10].map(function (y) { return '<option value="' + y + '"' + (y === (it.years || 1) ? ' selected' : '') + '>' + y + ' år</option>'; }).join('') + '</select>'
          : it.type === 'mail' ? '<select data-i="' + i + '" class="c-period" aria-label="Period"><option value="month"' + (it.period !== 'year' ? ' selected' : '') + '>Per månad</option><option value="year"' + (it.period === 'year' ? ' selected' : '') + '>Per år</option></select>' : '';
        var cost = (p.once ? kr(p.once) + ' nu' : '') + (p.month ? kr(p.month) + '/mån' : '') + (p.year && it.type === 'domain' ? '<small>sedan ' + kr(p.year) + '/år</small>' : p.year ? kr(p.year) + '/år' : '');
        return '<div class="shop-row"><b>' + name + (it.addresses && it.addresses.length ? '<small>' + esc(it.addresses.join(', ')) + '</small>' : '') + '</b>' + opts + '<span>' + cost + '</span><button type="button" class="shop-x" data-i="' + i + '" aria-label="Ta bort">Ta bort</button></div>';
      }).join('') + '</div>' +
        '<div class="shop-total"><p><span>Engångskostnad nu</span><b>' + kr(s.once) + '</b></p>' + (s.month ? '<p><span>Återkommande per månad</span><b>' + kr(s.month) + '</b></p>' : '') +
        '<p><span>Moms ' + Math.round(vat * 100) + ' % (på första betalningen)</span><b>' + kr((s.once + s.month) * vat) + '</b></p><p class="shop-total__sum"><span>Första betalningen inkl. moms</span><b>' + kr((s.once + s.month) * (1 + vat)) + '</b></p>' +
        (cat.demo ? '<p class="shop-note"><b>Demopriser.</b> Priserna är exempel tills Elevate Studio har satt de riktiga. Ni bekräftar alltid via offert innan något debiteras.</p>' : '') + '</div>';
    }
    view.addEventListener('click', function (e) { var x = e.target.closest('.shop-x'); if (!x) return; cart.splice(+x.dataset.i, 1); save(cart); render(); });
    view.addEventListener('change', function (e) {
      var i = +e.target.dataset.i;
      if (e.target.classList.contains('c-years')) cart[i].years = +e.target.value;
      if (e.target.classList.contains('c-period')) cart[i].period = e.target.value;
      save(cart); render();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = document.getElementById('checkout-status'), btn = form.querySelector('[type=submit]');
      var c = { name: form.name.value, email: form.email.value, company: form.company.value, orgnr: form.orgnr.value, phone: form.phone.value, address: form.address.value };
      if (!c.name.trim() || !/^\S+@\S+\.\S+$/.test(c.email)) { st.hidden = false; st.textContent = 'Fyll i namn och en giltig e-postadress.'; return; }
      if (!form.terms.checked) { st.hidden = false; st.textContent = 'Godkänn villkoren för att skicka beställningen.'; return; }
      btn.disabled = true; st.hidden = false; st.textContent = 'Skickar …';
      var text = cart.map(function (it) { var p = price(it); return '- ' + (it.type === 'domain' ? it.domain + (it.transfer ? ' (flytt)' : ' (' + (it.years || 1) + ' år)') : (M(it.id) || {}).name + ' för ' + it.domain + ', ' + (it.period === 'year' ? 'per år' : 'per månad') + (it.extra ? ', +' + it.extra + ' konton' : '') + (it.addresses && it.addresses.length ? ', adresser: ' + it.addresses.join(', ') : '')) + ': ' + (p.once ? kr(p.once) + ' nu ' : '') + (p.month ? kr(p.month) + '/mån' : ''); }).join('\n');
      fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: c, items: cart, terms: true, terms_version: '2026-11' }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'fel'); return d; }); })
        .then(function (d) {
          // the order also arrives as a mail to info@, so nothing is lost while the database is being set up
          return fetch('https://formsubmit.co/ajax/info@elevatestudio.nu', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ _subject: 'Beställning ' + d.ref + ' (domäner/mejl)', _template: 'table', order: d.ref, namn: c.name, email: c.email, foretag: c.company, orgnr: c.orgnr, telefon: c.phone, adress: c.address, produkter: text, demopriser: d.demo ? 'ja' : 'nej' }) })
            .catch(function () { /* the order is stored on the server */ }).then(function () { return d; });
        })
        .then(function (d) {
          cart = []; save(cart);
          view.innerHTML = '<div class="form-prefill"><p class="form-prefill__k">Beställning ' + esc(d.ref) + '</p><p class="form-prefill__t">Tack! Vi har tagit emot beställningen.</p>' +
            '<p class="form-prefill__n"><b>Betalning:</b> ingen betalning är gjord. <b>Registrering:</b> inte gjord än. Vi mejlar en bekräftelse med pris till ' + esc(c.email) + ', och registrerar först när ni har godkänt den.</p></div>';
          form.hidden = true;
          if (window.elevateTrack) window.elevateTrack('order', d.ref);
        })
        .catch(function () { st.textContent = 'Beställningen kunde inte skickas. Försök igen eller mejla info@elevatestudio.nu.'; })
        .then(function () { btn.disabled = false; });
    });
    render();
  }

  fetch('assets/data/catalog.json').then(function (r) { return r.json(); }).then(function (c) {
    cat = c; bar(); domainPage(); mailPage(); checkout();
  }).catch(function () { var o = document.getElementById('dom-results') || document.getElementById('mail-plans') || document.getElementById('cart-view'); if (o) o.innerHTML = '<p class="shop-lead">Kunde inte läsa prislistan. Ladda om sidan.</p>'; });
})();
