// The customer's booking page: the link in the mail opens /boka/<link>, this fetches the free times,
// the customer taps one and it is booked right away. Times are shown in Swedish time.
(function () {
  var TZ = 'Europe/Stockholm';
  var pick = document.getElementById('pick');
  var token = decodeURIComponent((location.pathname.split('/boka/')[1] || '').replace(/\/+$/, ''));
  var preset = Number(new URLSearchParams(location.search).get('v')) || 0;
  var st = { data: null, page: 0, at: 0, busy: false, rebook: false };
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
    document.getElementById('lead').textContent = (who ? who + ' har föreslagit' : 'Vi har föreslagit') + ' ett kort möte om er hemsida. Tryck på en ledig tid så är det bokat.';
    document.getElementById('pills').innerHTML = '<span class="pill">' + d.minutes + ' min</span><span class="pill">' + esc(d.type) + '</span>' + (d.host ? '<span class="pill">' + esc(d.host.name) + '</span>' : '');
    document.title = 'Välj en tid' + (who ? ' med ' + who : '') + ' – Elevate Studio';
  }

  function findDay(at) { return st.data.days.find(function (x) { return x.slots.some(function (s) { return s.t === at; }); }); }

  function render() {
    var d = st.data, days = d.days;
    if (d.booked && !st.rebook) return renderDone({ at: d.booked.at, minutes: d.booked.minutes, link: d.booked.link, type: d.type, email: d.email, already: true });
    var pages = Math.ceil(days.length / 5), from = st.page * 5, week = days.slice(from, from + 5);
    var day = st.at ? findDay(st.at) : null;
    pick.innerHTML = '<div class="cols">' + week.map(function (x) {
      return '<div class="col' + (x.free ? '' : ' is-full') + '"><h3>' + esc(x.wd) + ' <b>' + x.d + ' ' + esc(x.mon) + '</b><em>' + (x.free ? x.free + ' lediga' : 'fullt') + '</em></h3><div class="stack">' +
        x.slots.map(function (s) {
          return s.free ? '<button class="chip' + (s.t === st.at ? ' is-on' : '') + '" data-at="' + s.t + '">' + time(s.t) + '</button>'
            : '<button class="chip is-busy" disabled aria-label="' + time(s.t) + ' är upptaget">' + time(s.t) + '</button>';
        }).join('') + '</div></div>';
    }).join('') + '</div>' +
      '<div class="more"><button id="prev"' + (st.page === 0 ? ' disabled' : '') + '>&#8249; Förra veckan</button><button id="next"' + (st.page >= pages - 1 ? ' disabled' : '') + '>Nästa vecka &#8250;</button></div>' +
      '<div class="legend"><span><i></i>Ledig</span>' + (d.live ? '<span><i class="b"></i>Upptagen i vår kalender</span>' : '') + '<span><i class="s"></i>Vald</span></div>' +
      '<div class="sheet"><p>' + (day ? '<b>' + cap(day.long) + ' · ' + time(st.at) + '–' + time(st.at + d.minutes * 6e4) + '</b>' : '<b>Välj en tid i listan</b>') +
      '<small>' + esc(d.type) + (d.host ? ' med ' + esc(d.host.first) : '') + (d.type === 'Google Meet' ? ' – länken kommer i bekräftelsen' : '') + '</small></p>' +
      '<button class="cta" id="book"' + (day ? '' : ' disabled') + '>' + (st.rebook ? 'Boka om till den här tiden' : 'Boka tiden') + '</button></div><p class="msg" id="msg"></p>';
    pick.querySelectorAll('[data-at]').forEach(function (b) { b.addEventListener('click', function () { st.at = Number(b.dataset.at); render(); }); });
    document.getElementById('prev').addEventListener('click', function () { st.page--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('next').addEventListener('click', function () { st.page++; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.getElementById('book').addEventListener('click', book);
  }

  function book() {
    if (st.busy || !st.at) return;
    st.busy = true;
    var btn = document.getElementById('book'); btn.disabled = true; btn.textContent = 'Bokar …';
    fetch('/api/booking/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, at: st.at }) })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (x) {
        st.busy = false;
        if (x.ok) return renderDone(x.b);
        if (x.b.error === 'taken' || x.b.error === 'slot') { st.at = 0; return load('Oj, den tiden blev precis upptagen. Välj en annan.'); }
        if (x.b.error === 'link') return fail('link');
        document.getElementById('msg').textContent = 'Det gick inte att boka just nu (' + (x.b.error || 'fel') + '). Försök igen om en stund, eller svara på mejlet.';
        btn.disabled = false; btn.textContent = 'Boka tiden';
      }).catch(function () { st.busy = false; document.getElementById('msg').textContent = 'Servern svarade inte. Försök igen.'; btn.disabled = false; btn.textContent = 'Boka tiden'; });
  }

  function renderDone(b) {
    var d = st.data;
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
      st.data = d; fillHero(d); init(); render();
      if (message) document.getElementById('msg').textContent = message;
    }).catch(function () { fail('net'); });
  }
  if (!token) return fail('link');
  load();
})();
