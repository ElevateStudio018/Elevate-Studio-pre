// The customer's booking page: the link in the mail opens /boka/<link>, this fetches the free times,
// the customer taps one and it is booked right away. Times are shown in Swedish time.
(function () {
  var TZ = 'Europe/Stockholm';
  var pick = document.getElementById('pick');
  var token = decodeURIComponent((location.pathname.split('/boka/')[1] || '').replace(/\/+$/, '')) || 'public';
  var preset = Number(new URLSearchParams(location.search).get('v')) || 0;
  var st = { data: null, page: 0, at: 0, busy: false, rebook: false, who: { name: '', email: '', company: '', phone: '' } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var time = function (ms) { return new Date(ms).toLocaleTimeString('sv-SE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';

  function fail(why) {
    var text = why === 'link' ? 'Den här länken har gått ut eller fungerar inte längre.' : 'Vi kunde inte hämta tiderna just nu.';
    pick.innerHTML = '<div class="done"><h2>Hoppsan</h2><p class="done__sub">' + text + ' Hör av dig till <a href="mailto:info@elevatestudio.nu">info@elevatestudio.nu</a> eller ring 076-022 83 61, så hittar vi en tid tillsammans.</p></div>';
  }

  function fillHero(d) {
    var who = d.host ? d.host.first : null;
    document.getElementById('title').textContent = 'När passar det dig' + (d.first ? ', ' + d.first : '') + '?';
    document.getElementById('lead').textContent = d.demo ? 'Förhandsvisning av bokningssidan: tiderna är de som är lediga i kalendern just nu, men inget bokas när du trycker.'
      : d.public ? 'Välj en tid som passar dig, så tar vi ett kort möte om er hemsida. Det kostar ingenting och du behöver inte förbereda något.'
      : (who ? who + ' har föreslagit' : 'Vi har föreslagit') + ' ett kort möte om er hemsida. Tryck på en ledig tid så är det bokat.';
    document.getElementById('pills').innerHTML = '<span class="pill">' + d.minutes + ' min</span><span class="pill">' + esc(d.type) + '</span>';
    document.title = 'Välj en tid' + (who ? ' med ' + who : '') + ' – Elevate Studio';
    var host = document.getElementById('host');
    if (d.host) {
      var ph = '<svg class="host__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/></svg>';
      var ml = '<svg class="host__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.2V17h16V7.2l-8 5.3z M4.6 7l7.4 4.9L19.4 7z" fill="currentColor"/></svg>';
      var mk = '<svg class="host__logo" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>';
      host.innerHTML = '<div class="host__top"><div><p class="host__kicker">Du träffar</p><h2 class="host__name">' + esc(d.host.name) + '</h2><p class="host__role">' + esc(d.host.role) + '</p></div>' + mk + '</div>' +
        '<ul class="host__links">' + (d.host.phone ? '<li><a href="tel:' + esc(d.host.phone.replace(/\s/g, '')) + '">' + ph + '<span>' + esc(d.host.phone.replace('+46 ', '0').replace(/^\+46/, '0').replace(/^(\d{3}) /, '$1-')) + '</span></a></li>' : '') +
        (d.host.email ? '<li><a href="mailto:' + esc(d.host.email) + '">' + ml + '<span>' + esc(d.host.email) + '</span></a></li>' : '') + '</ul><p class="host__company">Elevate Studio · Uppsala</p>';
      document.getElementById('about-text').textContent = d.host.first + ' går igenom ert företag, vad hemsidan ska ge er och hur ett upplägg kan se ut. Det kostar ingenting, och du behöver inte förbereda något.';
      document.getElementById('about').hidden = false;
    } else { document.getElementById('about').hidden = true; }
  }

  function findDay(at) { return st.data.days.find(function (x) { return x.slots.some(function (s) { return s.t === at; }); }); }

  function render() {
    var d = st.data, days = d.days;
    if (d.booked && !st.rebook) return renderDone({ at: d.booked.at, minutes: d.booked.minutes, link: d.booked.link, type: d.type, email: d.email, already: true });
    var pages = Math.ceil(days.length / 5), from = st.page * 5, week = days.slice(from, from + 5);
    var day = st.at ? findDay(st.at) : null;
    pick.innerHTML = '<div class="cols">' + week.map(function (x) {
      return '<div class="col' + (x.free ? '' : ' is-full') + '"><h3>' + esc(cap(x.wd)) + ' <b>' + x.d + ' ' + esc(x.mon.toLowerCase()) + '</b><em>' + (x.free ? x.free + ' lediga' : 'fullt') + '</em></h3><div class="stack">' +
        x.slots.map(function (s) {
          return s.free ? '<button class="chip' + (s.t === st.at ? ' is-on' : '') + '" data-at="' + s.t + '">' + time(s.t) + '</button>'
            : '<button class="chip is-busy" disabled aria-label="' + time(s.t) + ' är upptaget">' + time(s.t) + '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div>' +
      '<div class="more"><button id="prev"' + (st.page === 0 ? ' disabled' : '') + '>&#8249; Förra veckan</button><button id="next"' + (st.page >= pages - 1 ? ' disabled' : '') + '>Nästa vecka &#8250;</button></div>' +
      '<div class="legend"><span><i></i>Ledig</span>' + (d.live ? '<span><i class="b"></i>Upptagen i vår kalender</span>' : '') + '<span><i class="s"></i>Vald</span></div>' +
      '<div class="sheet"><p>' + (day ? '<b>' + cap(day.long) + ' · ' + time(st.at) + '–' + time(st.at + d.minutes * 6e4) + '</b>' : '<b>Välj en tid i listan</b>') +
      '<small>' + esc(d.type) + (d.host ? ' med ' + esc(d.host.first) : '') + (d.type === 'Google Meet' ? ' – länken kommer i bekräftelsen' : '') + '</small></p>' +
      (d.public && day ? '<form class="who" id="who" autocomplete="on"><label><span>Namn</span><input id="w-name" type="text" required autocomplete="name" value="' + esc(st.who.name) + '"></label><label><span>E-post</span><input id="w-email" type="email" required autocomplete="email" value="' + esc(st.who.email) + '"></label><label><span>Företag</span><input id="w-company" type="text" autocomplete="organization" value="' + esc(st.who.company) + '"></label><label><span>Telefon</span><input id="w-phone" type="tel" autocomplete="tel" value="' + esc(st.who.phone) + '"></label><input id="w-web" type="text" name="web" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px"></form>' : '') +
      '<button class="cta" id="book"' + (day ? '' : ' disabled') + '>' + (st.rebook ? 'Boka om till den här tiden' : 'Boka tiden') + '</button></div><p class="msg" id="msg"></p>';
    if (d.public && day) ['name', 'email', 'company', 'phone'].forEach(function (k) { document.getElementById('w-' + k).addEventListener('input', function (e) { st.who[k] = e.target.value; }); });
    pick.querySelectorAll('[data-at]').forEach(function (b) { b.addEventListener('click', function () { st.at = Number(b.dataset.at); render(); }); });
    document.getElementById('prev').addEventListener('click', function () { st.page--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('next').addEventListener('click', function () { st.page++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('book').addEventListener('click', book);
  }

  function book() {
    if (st.busy || !st.at) return;
    var body = { t: token, at: st.at };
    if (st.data.public) {
      var f = document.getElementById('who');
      if (f && !f.reportValidity()) return;
      body.name = st.who.name.trim(); body.email = st.who.email.trim(); body.company = st.who.company.trim(); body.phone = st.who.phone.trim(); body.web = f ? document.getElementById('w-web').value : '';
      if (!body.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) { document.getElementById('msg').textContent = 'Fyll i namn och en riktig e-postadress så vi kan skicka bekräftelsen.'; return; }
    }
    st.busy = true;
    var btn = document.getElementById('book') || { disabled: false, textContent: '' }; btn.disabled = true; btn.textContent = 'Bokar …';
    fetch('/api/booking/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (x) {
        st.busy = false;
        if (x.ok) return renderDone(x.b);
        if (x.b.error === 'taken' || x.b.error === 'slot') { st.at = 0; return load('Oj, den tiden blev precis upptagen. Välj en annan.'); }
        if (x.b.error === 'link') return fail('link');
        if (x.b.error === 'who') { document.getElementById('msg').textContent = 'Fyll i namn och en riktig e-postadress så vi kan skicka bekräftelsen.'; btn.disabled = false; btn.textContent = 'Boka tiden'; return; }
        if (!document.getElementById('msg')) return load('Det gick inte att boka just nu. Välj en tid, så försöker vi igen.');
        document.getElementById('msg').textContent = 'Det gick inte att boka just nu (' + (x.b.error || 'fel') + '). Försök igen om en stund, eller svara på mejlet.';
        btn.disabled = false; btn.textContent = 'Boka tiden';
      }).catch(function () { st.busy = false; if (!document.getElementById('msg')) return load('Servern svarade inte. Välj en tid, så försöker vi igen.'); document.getElementById('msg').textContent = 'Servern svarade inte. Försök igen.'; btn.disabled = false; btn.textContent = 'Boka tiden'; });
  }

  function renderDone(b) {
    var d = st.data;
    if (d.demo) {
      var w = cap(new Date(b.at).toLocaleString('sv-SE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + time(b.at) + '–' + time(b.at + b.minutes * 6e4);
      pick.innerHTML = '<div class="done"><div class="done__check">' + CHECK + '</div><h2>Klart, mötet är bokat!</h2><p class="done__sub">Så här ser sidan ut för kunden efter bokningen. Det här är en förhandsvisning – inget bokades.</p>' +
        '<div class="done__card"><b>' + w + '</b><span>' + esc(d.type) + (d.host ? ' med ' + esc(d.host.name) : '') + '</span></div><div class="done__row"><button class="ghost" id="rebook">Tillbaka till tiderna</button></div></div>';
      document.getElementById('rebook').addEventListener('click', function () { st.at = 0; load(); });
      return;
    }
    var when = cap(new Date(b.at).toLocaleString('sv-SE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + time(b.at) + '–' + time(b.at + b.minutes * 6e4);
    pick.innerHTML = '<div class="done"><div class="done__check">' + CHECK + '</div><h2>' + (b.already ? 'Du har redan bokat' : b.rebooked ? 'Mötet är ombokat' : 'Klart, mötet är bokat!') + '</h2>' +
      '<p class="done__sub">' + (b.already ? 'Det här mötet är inlagt i vår kalender.' : b.mailed === false ? 'Mötet ligger i vår kalender.' : 'En bekräftelse' + (b.link ? ' med länken' : '') + ' är på väg till ' + esc(b.email || d.email) + '.') + '</p>' +
      '<div class="done__card"><b>' + when + '</b><span>' + esc(b.type || d.type) + (d.host ? ' med ' + esc(d.host.name) : ' med Elevate Studio') + '</span></div>' +
      '<div class="done__row">' + (b.link ? '<a class="ghost" href="' + esc(b.link) + '" target="_blank" rel="noopener">Öppna möteslänken</a>' : '') + '<button class="ghost" id="rebook">Välj en annan tid</button></div>' +
      '<p class="note">Passar det inte längre? Välj en ny tid här, eller svara på mejlet så löser vi det.</p></div>';
    document.getElementById('rebook').addEventListener('click', function () { st.rebook = true; st.at = 0; load(); });
  }

  function init() {
    var days = st.data.days, first = Math.max(0, days.findIndex(function (x) { return x.free > 0; }));
    st.page = Math.floor(first / 5);
    if (preset) { var dayIdx = days.findIndex(function (x) { return x.slots.some(function (s) { return s.t === preset && s.free; }); }); if (dayIdx >= 0) { st.at = preset; st.page = Math.floor(dayIdx / 5); } }
  }

  function load(message) {
    fetch('/api/booking/info?t=' + encodeURIComponent(token)).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.ok) return fail(d.error);
      st.data = d; fillHero(d); init();
      // A time clicked in the mail is booked right away, no extra step
      if (preset && st.at === preset && !(d.booked && !st.rebook)) {
        preset = 0;
        pick.innerHTML = '<div class="done"><h2>Bokar din tid …</h2><p class="done__sub">Ett ögonblick.</p></div>';
        return book();
      }
      preset = 0; render();
      if (message) document.getElementById('msg').textContent = message;
    }).catch(function () { fail('net'); });
  }
  load();
})();
