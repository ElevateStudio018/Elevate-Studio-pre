/* Kundportal. Supabase Auth for login; every table is protected by row level security, so a customer only ever
   receives rows for the companies they belong to (see supabase/sql/2026-11-02_portal.sql). No keys but the
   public anon key are in the page. */
(function () {
  var root = document.getElementById('portal'); if (!root || !window.supabase) return;
  var DEMO = /[?&]demo\b/.test(location.search) || /githack|localhost/.test(location.hostname);
  var sb = DEMO ? demoClient() : window.supabase.createClient(root.dataset.url, root.dataset.key);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var kr = function (n) { return n == null ? '–' : Math.round(n).toLocaleString('sv-SE') + ' kr'; };
  var day = function (d) { return d ? new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; };
  var days = function (d) { return d ? Math.ceil((new Date(d) - new Date()) / 864e5) : null; };
  var TYPE = { domain: 'Domän', mail: 'Företagsmejl', website: 'Hemsida', hosting: 'Hosting', ssl: 'SSL-certifikat', support: 'Support', other: 'Tjänst' };
  var SST = { active: 'Aktiv', pending: 'Aktiveras', expiring: 'Går ut snart', suspended: 'Pausad', cancelled: 'Uppsagd' };
  var IST = { open: 'Att betala', paid: 'Betald', overdue: 'Förfallen', credited: 'Krediterad' };
  var TST = { open: 'Öppen', answered: 'Besvarad', resolved: 'Löst' };
  var ROLE = { owner: 'Företagsägare', admin: 'Administratör', finance: 'Ekonomiansvarig', tech: 'Teknisk administratör', user: 'Användare' };
  var st = { user: null, members: [], company: null, role: null, tab: 'oversikt', data: {} };
  var can = { invoices: function () { return /owner|admin|finance/.test(st.role); }, edit: function () { return /owner|admin|finance/.test(st.role); }, tech: function () { return /owner|admin|tech/.test(st.role); } };
  var msg = function (el, t, bad) { el.hidden = false; el.textContent = t; el.classList.toggle('form-status--error', !!bad); };

  // ---------- login, forgotten password, new password ----------
  function login(note) {
    root.innerHTML = '<div class="portal-login"><h2 class="sitetest__h2">Logga in</h2>' + (note ? '<p class="shop-lead">' + esc(note) + '</p>' : '') +
      '<form id="pl" class="portal-form" novalidate><input name="email" type="email" placeholder="E-post" autocomplete="email" aria-label="E-post" required>' +
      '<input name="password" type="password" placeholder="Lösenord" autocomplete="current-password" aria-label="Lösenord" required>' +
      '<button class="btn btn--primary" type="submit"><span>Logga in</span></button><p class="form-status" hidden></p></form>' +
      '<p class="shop-note"><button type="button" class="portal-link" id="forgot">Glömt lösenordet?</button> · Inget konto? Det skapas när ni blir kund. <a href="kontakt.html">Kontakta oss</a>.</p></div>';
    var f = root.querySelector('#pl'), s = f.querySelector('.form-status');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); msg(s, 'Loggar in …');
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        if (r.error) return msg(s, 'Fel e-post eller lösenord.', true);
        mfaThenStart();
      });
    });
    root.querySelector('#forgot').addEventListener('click', function () {
      var email = f.email.value.trim(); if (!/\S+@\S+\.\S+/.test(email)) { msg(s, 'Skriv din e-post ovan först.', true); f.email.focus(); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function () { msg(s, 'Om adressen finns får du ett mejl med en länk för att välja nytt lösenord.'); });
    });
  }
  function newPassword() {
    root.innerHTML = '<div class="portal-login"><h2 class="sitetest__h2">Välj nytt lösenord</h2><form id="np" class="portal-form"><input name="p" type="password" minlength="10" placeholder="Nytt lösenord (minst 10 tecken)" aria-label="Nytt lösenord" autocomplete="new-password"><button class="btn btn--primary"><span>Spara</span></button><p class="form-status" hidden></p></form></div>';
    var f = root.querySelector('#np'), s = f.querySelector('.form-status');
    f.addEventListener('submit', function (e) { e.preventDefault(); if (f.p.value.length < 10) return msg(s, 'Minst 10 tecken.', true);
      sb.auth.updateUser({ password: f.p.value }).then(function (r) { if (r.error) return msg(s, r.error.message, true); start(); }); });
  }
  // two-factor: if the account has a verified factor, ask for the code before anything is shown
  function mfaThenStart() {
    sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (r) {
      var a = r.data || {};
      if (a.nextLevel === 'aal2' && a.currentLevel !== 'aal2') return mfaPrompt();
      start();
    });
  }
  function mfaPrompt() {
    sb.auth.mfa.listFactors().then(function (r) {
      var f0 = ((r.data || {}).totp || [])[0]; if (!f0) return start();
      root.innerHTML = '<div class="portal-login"><h2 class="sitetest__h2">Tvåstegsverifiering</h2><form id="mf" class="portal-form"><input name="c" inputmode="numeric" autocomplete="one-time-code" placeholder="Kod från appen" aria-label="Kod"><button class="btn btn--primary"><span>Fortsätt</span></button><p class="form-status" hidden></p></form></div>';
      var f = root.querySelector('#mf'), s = f.querySelector('.form-status');
      f.addEventListener('submit', function (e) { e.preventDefault();
        sb.auth.mfa.challengeAndVerify({ factorId: f0.id, code: f.c.value.trim() }).then(function (x) { if (x.error) return msg(s, 'Fel kod. Försök igen.', true); start(); }); });
    });
  }

  // ---------- data ----------
  function start() {
    sb.auth.getUser().then(function (r) {
      st.user = r.data && r.data.user; if (!st.user) return login();
      sb.from('company_members').select('role, company_id, companies(id,name,org_nr,billing_email,billing_address,phone)').eq('user_id', st.user.id).then(function (m) {
        if (m.error) { root.innerHTML = '<p class="shop-lead">Portalen är inte färdigställd på servern än. Försök igen senare.</p>' + logoutBtn(); bindLogout(); return; }
        st.members = (m.data || []).filter(function (x) { return x.companies; });
        if (!st.members.length) { root.innerHTML = '<div class="portal-login"><h2 class="sitetest__h2">Hej!</h2><p class="shop-lead">Ditt konto (' + esc(st.user.email) + ') är inte kopplat till något företag än. Hör av dig så kopplar vi det.</p><p><a class="btn btn--primary" href="kontakt.html"><span>Kontakta oss</span></a></p>' + logoutBtn() + '</div>'; bindLogout(); return; }
        var saved = null; try { saved = localStorage.getItem('es.portal.company'); } catch (e) { /* none */ }
        var pick = st.members.filter(function (x) { return x.company_id === saved; })[0] || st.members[0];
        choose(pick);
      });
    });
  }
  function choose(mem) {
    st.company = mem.companies; st.role = mem.role;
    try { localStorage.setItem('es.portal.company', mem.company_id); } catch (e) { /* fine */ }
    var c = st.company.id;
    Promise.all([
      sb.from('services').select('*').eq('company_id', c).order('type'),
      can.invoices() ? sb.from('invoices').select('*').eq('company_id', c).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      sb.from('tickets').select('*').eq('company_id', c).order('created_at', { ascending: false }),
      sb.from('notifications').select('*').or('user_id.eq.' + st.user.id + ',company_id.eq.' + c).is('read_at', null).order('created_at', { ascending: false }).limit(10),
      sb.from('company_members').select('role,user_id').eq('company_id', c),
      sb.from('site_reports').select('*').eq('company_id', c).order('created_at', { ascending: false }).limit(1),
      sb.from('uptime_checks').select('url,ok,ms,checked_at').eq('company_id', c).gte('checked_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('checked_at', { ascending: false }).limit(3000),
      sb.from('change_requests').select('*').eq('company_id', c).order('created_at', { ascending: false }),
      sb.from('site_stats').select('*').eq('company_id', c).gte('day', new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10)).order('day')
    ]).then(function (r) {
      st.data = { services: r[0].data || [], invoices: r[1].data || [], tickets: r[2].data || [], notes: r[3].data || [], members: r[4].data || [], report: (r[5] && r[5].data || [])[0] || null, uptime: r[6] && r[6].data || [], changes: r[7] && r[7].data || [], stats: r[8] && r[8].data || [] };
      shell();
    });
  }

  // ---------- layout: long side menu + green hero (design 5) ----------
  var TABS = [['oversikt', 'Översikt', 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z'], ['hemsida', 'Hemsidans admin', 'M3 5h18v14H3zM3 9h18M7 7h.01'], ['besokare', 'Besökare', 'M3 17l6-6 4 4 8-8M15 7h6v6'], ['sajten', 'Sajten', 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0v18M3 12h18'],
    ['andringar', 'Ändringar', 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'], ['tjanster', 'Tjänster', 'M4 6h16M4 12h16M4 18h10'], ['fakturor', 'Fakturor', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6'],
    ['support', 'Ärenden', 'M4 5h16v11H8l-4 4z'], ['konto', 'Konto & team', 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0']];
  function logoutBtn() { return '<p><button type="button" class="portal-link" id="logout">Logga ut</button></p>'; }
  function bindLogout() { var b = root.querySelector('#logout'); if (b) b.addEventListener('click', function () { sb.auth.signOut().then(function () { document.body.classList.remove('portal-app'); login('Du är utloggad.'); }); }); }
  function todos() {
    var d = st.data, todo = [];
    (d.changes || []).forEach(function (c) { if (c.status === 'quoted') todo.push(['Pris klart', esc(c.page || 'Ändring') + ' · ' + kr(c.price), 'andringar', 'Svara']); });
    d.invoices.forEach(function (i) { if (i.status === 'overdue') todo.push(['Förfallen', 'Faktura ' + esc(i.number) + ' · ' + kr(i.amount), 'fakturor', 'Visa']); else if (i.status === 'open') todo.push(['Faktura', esc(i.number) + ' · ' + kr(i.amount) + ' · förfaller ' + day(i.due_date), 'fakturor', '']); });
    d.services.forEach(function (s) { var n = days(s.renews_at); if (s.renews_at && n <= 60 && n >= 0 && !s.auto_renew) todo.push(['Går ut', esc(s.name) + ' om ' + n + ' dagar', 'tjanster', 'Visa']); if (s.status === 'suspended') todo.push(['Pausad', esc(s.name), 'support', 'Kontakta oss']); });
    (d.changes || []).forEach(function (c) { if (c.status === 'in_progress') todo.push(['Pågår', esc(c.description).slice(0, 60), 'andringar', '']); });
    d.notes.forEach(function (n) { todo.push(['Info', esc(n.title), null, '']); });
    return todo;
  }
  function shell() {
    document.body.classList.add('portal-app');
    var tabs = TABS.filter(function (t) { return t[0] !== 'fakturor' || can.invoices(); });
    var badge = { andringar: (st.data.changes || []).filter(function (c) { return c.status === 'quoted'; }).length, fakturor: st.data.invoices.filter(function (i) { return i.status !== 'paid' && i.status !== 'credited'; }).length };
    var name = ((st.user.user_metadata || {}).full_name || st.user.email || '');
    root.innerHTML = '<div class="pa">' +
      '<aside class="pa-side"><a class="pa-brand" href="./">Elevate<small>Kundportal</small></a>' +
      (st.members.length > 1 ? '<select id="pc" class="pa-co" aria-label="Företag">' + st.members.map(function (m) { return '<option value="' + m.company_id + '"' + (m.company_id === st.company.id ? ' selected' : '') + '>' + esc(m.companies.name) + '</option>'; }).join('') + '</select>' : '<p class="pa-co">' + esc(st.company.name) + '</p>') +
      '<nav class="pa-nav" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t[2] + '"/></svg>' + t[1] + (badge[t[0]] ? '<i>' + badge[t[0]] + '</i>' : '') + '</button>'; }).join('') + '</nav>' +
      '<div class="pa-help"><b>Behöver ni hjälp?</b><p>Vi svarar vardagar inom en arbetsdag.</p><button type="button" data-tab="support">Skapa ärende</button></div>' +
      '<div class="pa-me"><i>' + esc((name[0] || '?').toUpperCase()) + '</i><span>' + esc(name) + '<small>' + esc(ROLE[st.role] || '') + '</small></span><button type="button" class="portal-link" id="logout">Logga ut</button></div></aside>' +
      '<main class="pa-main">' + (DEMO ? '<p class="portal-demo">Demoläge · testdata · inget sparas</p>' : '') + '<div id="pv"></div></main></div>';
    bindLogout();
    var pc = root.querySelector('#pc'); if (pc) pc.addEventListener('change', function () { choose(st.members.filter(function (m) { return m.company_id === pc.value; })[0]); });
    root.querySelector('.pa-side').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; shell(); window.scrollTo(0, 0); });
    ({ oversikt: dashboard, hemsida: siteAdmin, besokare: visitors, sajten: site, tjanster: services, andringar: changes, fakturor: invoices, support: support, konto: account })[st.tab]();
    view().addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) { st.tab = b.dataset.go; shell(); window.scrollTo(0, 0); } });
  }
  var view = function () { return root.querySelector('#pv'); };

  // ---------- visitor statistics (daily rows in site_stats) ----------
  var nf = function (n) { return Math.round(n || 0).toLocaleString('sv-SE'); };
  function statRange(n) {
    var rows = (st.data.stats || []).slice().sort(function (a, b) { return String(a.day).localeCompare(String(b.day)); });
    var cut = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10), prev = new Date(Date.now() - 2 * n * 864e5).toISOString().slice(0, 10);
    var cur = rows.filter(function (r) { return r.day > cut; }), old = rows.filter(function (r) { return r.day > prev && r.day <= cut; });
    var sum = function (l, k) { return l.reduce(function (a, r) { return a + (+r[k] || 0); }, 0); };
    var merge = function (k) { var m = {}; cur.forEach(function (r) { var o = r[k] || {}; Object.keys(o).forEach(function (x) { m[x] = (m[x] || 0) + o[x]; }); }); return Object.keys(m).map(function (x) { return [x, m[x]]; }).sort(function (a, b) { return b[1] - a[1]; }); };
    var pct = function (a, b) { return b ? Math.round((a - b) / b * 100) : null; };
    var v = sum(cur, 'visitors'), pv = sum(cur, 'pageviews'), l = sum(cur, 'leads');
    return { rows: cur, visitors: v, pageviews: pv, leads: l, dv: pct(v, sum(old, 'visitors')), dp: pct(pv, sum(old, 'pageviews')), dl: l - sum(old, 'leads'),
      sources: merge('sources'), pages: merge('pages'), devices: merge('devices'), cities: merge('cities'), queries: merge('queries'), weekdays: [1, 2, 3, 4, 5, 6, 0].map(function (w) { return sum(cur.filter(function (r) { return new Date(r.day).getDay() === w; }), 'visitors'); }) };
  }
  function line(vals, light) {
    if (vals.length < 2) return '';
    var mx = Math.max.apply(null, vals) || 1, w = 600, h = 140, pts = vals.map(function (v, i) { return [i * w / (vals.length - 1), h - 6 - v / mx * (h - 18)]; });
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L');
    return '<svg class="pa-line' + (light ? ' pa-line--light' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path class="pa-line__f" d="' + d + ' L' + w + ',' + h + ' L0,' + h + 'Z"/><path class="pa-line__s" d="' + d + '"/></svg>';
  }
  function share(list, n) {
    var tot = list.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
    return list.length ? '<div class="pa-share">' + list.slice(0, n || 5).map(function (x) { var p = Math.round(x[1] / tot * 100); return '<div><span>' + esc(x[0]) + '</span><b>' + p + ' %</b><i><em style="width:' + p + '%"></em></i></div>'; }).join('') + '</div>' : '<p class="mut">Ingen data ännu.</p>';
  }
  function table(list, n) { return list.length ? '<table class="pa-tbl">' + list.slice(0, n || 5).map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + nf(x[1]) + '</td></tr>'; }).join('') + '</table>' : '<p class="mut">Ingen data ännu.</p>'; }
  function delta(n, unit) { return n == null ? '' : '<em class="' + (n < 0 ? 'down' : '') + '">' + (n > 0 ? '+' : '') + n + (unit || '') + '</em>'; }
  function uptimeSum() { var up = st.data.uptime || []; if (!up.length) return null; var ok = up.filter(function (c) { return c.ok; }).length; return { pct: ok / up.length * 100, down: up.length - ok }; }
  function rings() {
    var r = st.data.report; if (!r) return '<p class="mut">Första rapporten kommer den 1:a nästa månad.</p>';
    return '<div class="pa-rings">' + [['Prestanda', r.performance], ['Tillgänglighet', r.accessibility], ['SEO', r.seo], ['Praxis', r.best_practices]].map(function (x) { var v = x[1] == null ? 0 : x[1], c = v >= 90 ? 'good' : v >= 50 ? 'ok' : 'bad';
      return '<div class="pa-ring pa-ring--' + c + '"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9"/><circle cx="18" cy="18" r="15.9" stroke-dasharray="' + v + ' 100"/></svg><b>' + (x[1] == null ? '–' : v) + '</b><small>' + x[0] + '</small></div>'; }).join('') + '</div>';
  }
  function kpis(s) {
    var u = uptimeSum();
    return '<div class="pa-kpis"><div><small>Besökare</small><b>' + nf(s.visitors) + '</b>' + delta(s.dv, ' %') + '</div><div><small>Sidvisningar</small><b>' + nf(s.pageviews) + '</b>' + delta(s.dp, ' %') + '</div>' +
      '<div><small>Förfrågningar</small><b>' + nf(s.leads) + '</b>' + delta(s.dl) + '</div><div><small>Drifttid</small><b>' + (u ? u.pct.toFixed(2).replace('.', ',') + ' %' : '–') + '</b><em>' + (u ? (u.down ? u.down + ' fel' : '0 avbrott') + ' · 30 dagar' : 'ingen mätning') + '</em></div></div>';
  }
  function dashboard() {
    var s = statRange(30), first = ((st.user.user_metadata || {}).full_name || '').split(' ')[0], top = s.sources[0], tot = s.sources.reduce(function (a, x) { return a + x[1]; }, 0);
    var mon = new Date().toLocaleDateString('sv-SE', { month: 'long' }); mon = mon[0].toUpperCase() + mon.slice(1);
    var td = todos();
    view().innerHTML = '<section class="pa-hero"><div><small>' + mon + ' · ' + esc(st.company.name) + '</small><h2>' + (s.rows.length ? nf(s.visitors) + ' besökare' : 'Hej ' + esc(first)) + '</h2><p>' +
      (s.rows.length ? (s.dv != null ? Math.abs(s.dv) + ' % ' + (s.dv >= 0 ? 'fler' : 'färre') + ' än förra månaden. ' : '') + (top ? esc(top[0]) + ' står för ' + Math.round(top[1] / tot * 100) + ' % av besöken.' : '') : 'Besöksstatistiken visas här så fort den är inkopplad på er sajt.') + '</p></div>' +
      line(s.rows.map(function (r) { return +r.visitors || 0; }), true) + '</section>' +
      kpis(s) +
      '<div class="pa-g2"><div class="pa-c"><h4>Källor</h4>' + share(s.sources) + '</div><div class="pa-c"><h4>Toppsidor</h4>' + table(s.pages) + '</div></div>' +
      '<div class="pa-g2"><div class="pa-c"><h4>Betyg från Google</h4>' + rings() + '</div><div class="pa-c"><h4>Att göra</h4>' +
      (td.length ? '<ul class="pa-todo">' + td.slice(0, 6).map(function (t) { return '<li><b>' + t[0] + '</b><span>' + t[1] + '</span>' + (t[2] && t[3] ? '<button type="button" data-go="' + t[2] + '">' + t[3] + '</button>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="portal-ok">Allt fungerar. Inget behöver göras just nu.</p>') + '</div></div>';
  }
  function visitors() {
    var n = st.range || 30, s = statRange(n);
    view().innerHTML = '<header class="pa-head"><h2>Besökare</h2><div class="pa-seg">' + [[7, '7 dagar'], [30, '30 dagar'], [90, '90 dagar'], [365, '12 mån']].map(function (x) { return '<button type="button" data-r="' + x[0] + '" aria-pressed="' + (n === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></header>' +
      kpis(s) + '<div class="pa-c"><h4>Besökare per dag</h4>' + (line(s.rows.map(function (r) { return +r.visitors || 0; })) || '<p class="mut">Ingen data ännu.</p>') + '</div>' +
      '<div class="pa-g3"><div class="pa-c"><h4>Källor</h4>' + share(s.sources) + '</div><div class="pa-c"><h4>Sidor</h4>' + table(s.pages, 8) + '</div><div class="pa-c"><h4>Enheter</h4>' + share(s.devices) + '</div></div>' +
      '<div class="pa-g3"><div class="pa-c"><h4>Orter</h4>' + table(s.cities) + '</div><div class="pa-c"><h4>Veckodagar</h4><div class="pa-bars">' + (function () { var mx = Math.max.apply(null, s.weekdays) || 1; return s.weekdays.map(function (v, i) { return '<div><i style="height:' + Math.round(v / mx * 100) + '%"></i><small>' + 'MTOTFLS'[i] + '</small></div>'; }).join(''); })() + '</div></div><div class="pa-c"><h4>Sökord på Google</h4>' + table(s.queries) + '</div></div>' +
      '<p class="mut pa-note">Statistiken räknas utan kakor och utan att spara personuppgifter.</p>';
    view().querySelector('.pa-seg').addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (b) { st.range = +b.dataset.r; visitors(); } });
  }
  // ---------- the customer's own website admin, connected with a code from that admin ----------
  var DEMO_SITE = { connected: true, base_url: 'https://exempelbygg.se', name: 'Exempelbygg AB', admin_url: 'https://exempelbygg.se/admin', counts: { leads: 48, new: 3 },
    leads: [{ name: 'Karin Lund', email: 'karin@example.se', phone: '070-111 22 33', message: 'Offert på badrum, ca 6 kvm.', created_at: new Date(Date.now() - 36e5).toISOString(), status: 'Ny' },
      { name: 'Johan Berg', email: 'johan@example.se', phone: '', message: 'Kan ni bygga en altan i maj?', created_at: new Date(Date.now() - 864e5).toISOString(), status: 'Ny' },
      { name: 'Sara Ek', email: 'sara@example.se', phone: '073-555 00 11', message: 'Fasadmålning villa, 2 plan.', created_at: new Date(Date.now() - 3 * 864e5).toISOString(), status: 'Besvarad' }] };
  function siteApi(action, body) {
    if (DEMO) return new Promise(function (ok) { setTimeout(function () {
      if (action === 'connect') { if (!/^es1\.[A-Za-z0-9_-]{10,}$/.test(String(body.code || '').trim())) return ok({ error: 'code' }); st.demoSite = true; return ok(DEMO_SITE); }
      if (action === 'disconnect') { st.demoSite = false; return ok({ ok: true }); }
      ok(st.demoSite ? DEMO_SITE : { connected: false }); }, 250); });
    return sb.auth.getSession().then(function (r) {
      var t = r.data && r.data.session && r.data.session.access_token, h = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' };
      return fetch('/api/site/' + action + (body ? '' : '?company_id=' + encodeURIComponent(st.company.id)), body ? { method: 'POST', headers: h, body: JSON.stringify(Object.assign({ company_id: st.company.id }, body)) } : { headers: h });
    }).then(function (r) { return r.json(); }).catch(function () { return { error: 'net' }; });
  }
  var SERR = { code: 'Koden ser inte rätt ut. Kopiera hela koden igen, den börjar med es1.', key: 'Hemsidan godkände inte koden. Skapa en ny kod i er admin och försök igen.', site: 'Vi fick inget svar från hemsidan. Kontrollera att den är uppe.', format: 'Hemsidan svarade, men inte i rätt format. Kontakta oss så hjälper vi er.', role: 'Bara ägare, administratörer och tekniska administratörer kan koppla hemsidan.', setup: 'Kopplingen är inte aktiverad hos oss än. Kontakta oss.', net: 'Kunde inte nå servern. Försök igen.' };
  function siteAdmin() {
    view().innerHTML = '<header class="pa-head"><h2>Hemsidans admin</h2></header><p class="mut">Laddar …</p>';
    siteApi('data').then(function (d) { if (st.tab !== 'hemsida') return; d && d.connected ? siteConnected(d) : siteConnect(); });
  }
  function siteConnect() {
    var mayEdit = /owner|admin|tech/.test(st.role);
    view().innerHTML = '<header class="pa-head"><h2>Koppla er hemsidas admin</h2></header>' +
      '<p class="pa-lead">Se förfrågningar och öppna adminpanelen direkt här i portalen. Det tar under en minut.</p>' +
      '<ol class="sx">' +
      '<li class="sx__step"><span class="sx__n">1</span><h4>Logga in i er admin</h4><p>Gå till er hemsida och lägg till <b>/admin</b> efter adressen.</p>' +
        '<div class="sx__mock"><div class="sx__bar"><i></i><i></i><i></i><span>ert-foretag.se<b>/admin</b></span></div><div class="sx__login"><span></span><span></span><em>Logga in</em></div></div></li>' +
      '<li class="sx__arrow" aria-hidden="true"><svg viewBox="0 0 40 24"><path d="M2 12h34M26 3l10 9-10 9"/></svg></li>' +
      '<li class="sx__step"><span class="sx__n">2</span><h4>Inställningar → Kundportal</h4><p>Klicka på <b>Inställningar</b> i menyn och sedan <b>Kundportal</b>.</p>' +
        '<div class="sx__mock sx__mock--menu"><span>Förfrågningar</span><span>Sidor</span><span class="on">Inställningar</span><span class="sub hl">Kundportal <svg class="sx__point" viewBox="0 0 30 20"><path d="M28 10H4M12 2 4 10l8 8"/></svg></span></div></li>' +
      '<li class="sx__arrow" aria-hidden="true"><svg viewBox="0 0 40 24"><path d="M2 12h34M26 3l10 9-10 9"/></svg></li>' +
      '<li class="sx__step"><span class="sx__n">3</span><h4>Kopiera koden</h4><p>Klicka på <b>Kopiera kod</b>. Koden börjar med <code>es1.</code></p>' +
        '<div class="sx__mock sx__mock--code"><code>es1.eyJ1Ijoi…</code><em class="hl">Kopiera kod</em><svg class="sx__point sx__point--up" viewBox="0 0 20 30"><path d="M10 28V4M2 12l8-8 8 8"/></svg></div></li>' +
      '</ol>' +
      '<div class="sx__down" aria-hidden="true"><svg viewBox="0 0 24 40"><path d="M12 2v34M3 26l9 10 9-10"/></svg><span>4. Klistra in här</span></div>' +
      '<form id="sx-form" class="sx__form" novalidate><label for="sx-code">Kod från er admin</label><div class="sx__row"><input id="sx-code" name="code" autocomplete="off" spellcheck="false" placeholder="es1.…"' + (mayEdit ? '' : ' disabled') + '>' +
      '<button class="btn btn--primary"' + (mayEdit ? '' : ' disabled') + '><span>Koppla hemsidan</span></button></div>' +
      (DEMO ? '<button type="button" class="portal-link" id="sx-demo">Fyll i en exempelkod (demo)</button>' : '') +
      '<p class="form-status" hidden></p>' + (mayEdit ? '' : '<p class="mut">Be företagets ägare eller tekniska administratör att koppla hemsidan.</p>') +
      '<p class="mut sx__safe">Koden kan bara läsa. Den sparas krypterad och visas aldrig igen. Ni kan koppla från när som helst.</p></form>' +
      '<p class="mut">Hittar ni inte Kundportal i er admin? <button type="button" class="portal-link" data-go="support">Skapa ett ärende</button> så lägger vi till det.</p>';
    var f = view().querySelector('#sx-form'), s = f.querySelector('.form-status');
    var dm = view().querySelector('#sx-demo'); if (dm) dm.addEventListener('click', function () { f.code.value = 'es1.eyJ1IjoiaHR0cHM6Ly9leGVtcGVsYnlnZy5zZSIsImsiOiJkZW1vLWRlbW8tZGVtby1kZW1vIn0'; });
    f.addEventListener('submit', function (e) { e.preventDefault(); var code = f.code.value.trim(); if (!code) { f.code.focus(); return msg(s, 'Klistra in koden först.', true); }
      msg(s, 'Kopplar …'); siteApi('connect', { code: code }).then(function (d) { if (d.error) return msg(s, SERR[d.error] || 'Något gick fel. Försök igen.', true); siteConnected(Object.assign({ connected: true }, d)); }); });
  }
  function siteConnected(d) {
    var leads = d.leads || [], c = d.counts || {}, mayEdit = /owner|admin|tech/.test(st.role);
    view().innerHTML = '<header class="pa-head"><div><h2>' + esc(d.name || 'Er hemsida') + '</h2><p class="mut">' + esc(d.base_url || '') + ' · <span class="pa-ok">● Kopplad</span></p></div>' +
      '<div class="sx__acts">' + (d.admin_url ? '<a class="btn btn--primary" href="' + esc(d.admin_url) + '" target="_blank" rel="noopener"><span>Öppna admin</span></a><button type="button" class="mp1__pick" id="sx-embed">Visa admin här</button>' : '') + '</div></header>' +
      (d.error ? '<p class="portal-warn"><span>' + esc(SERR[d.error] || 'Kunde inte hämta data från hemsidan just nu.') + '</span></p>' : '') +
      '<div id="sx-frame"></div>' +
      '<div class="pa-kpis"><div><small>Förfrågningar totalt</small><b>' + nf(c.leads) + '</b></div><div><small>Nya</small><b>' + nf(c.new) + '</b>' + (c.new ? '<em>väntar på svar</em>' : '') + '</div><div><small>Senaste</small><b class="sx__small">' + (leads[0] ? day(leads[0].created_at) : '–') + '</b></div><div><small>Källa</small><b class="sx__small">Er admin</b></div></div>' +
      '<div class="pa-c"><h4>Senaste förfrågningarna</h4>' + (leads.length ? '<ul class="sx__leads">' + leads.slice(0, 10).map(function (l) { return '<li><div><b>' + esc(l.name || 'Okänd') + '</b><span>' + esc(l.message) + '</span><small>' + [l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' : '', l.phone ? '<a href="tel:' + esc(l.phone.replace(/\s/g, '')) + '">' + esc(l.phone) + '</a>' : '', day(l.created_at)].filter(Boolean).join(' · ') + '</small></div>' + (l.status ? '<em class="sx__st' + (/ny/i.test(l.status) ? ' sx__st--new' : '') + '">' + esc(l.status) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="mut">Inga förfrågningar ännu.</p>') + '</div>' +
      (mayEdit ? '<p class="pa-note"><button type="button" class="portal-link" id="sx-off">Koppla från hemsidan</button></p>' : '');
    var em = view().querySelector('#sx-embed'); if (em) em.addEventListener('click', function () { var box = view().querySelector('#sx-frame');
      if (box.innerHTML) { box.innerHTML = ''; em.textContent = 'Visa admin här'; return; }
      box.innerHTML = '<div class="sx__frame"><iframe src="' + esc(d.admin_url) + '" title="Hemsidans admin" referrerpolicy="no-referrer"></iframe><p class="mut">Ser ni en tom ruta? Vissa adminpaneler kan bara öppnas i en egen flik – använd <a href="' + esc(d.admin_url) + '" target="_blank" rel="noopener">Öppna admin</a>.</p></div>'; em.textContent = 'Dölj admin'; });
    var off = view().querySelector('#sx-off'); if (off) off.addEventListener('click', function () { if (!confirm('Koppla från hemsidan? Ni kan koppla igen med en ny kod.')) return; siteApi('disconnect', {}).then(function () { siteConnect(); }); });
  }
  function site() { view().innerHTML = '<header class="pa-head"><h2>Sajten</h2></header>' + (health() || '<p class="mut">Driftövervakning och månadsrapport startar när er hemsida är kopplad.</p>'); }

  function serviceRow(s, actions) {
    var d = days(s.renews_at);
    return '<div class="shop-row"><b>' + esc(s.name) + '<small>' + (TYPE[s.type] || '') + '</small></b><span class="shop-st shop-st--' + (/active/.test(s.status) ? 'ok' : 'no') + '">' + (SST[s.status] || esc(s.status)) + '</span>' +
      '<span>' + (s.price != null ? kr(s.price) + (s.period === 'month' ? '/mån' : s.period === 'year' ? '/år' : '') : '') + (s.renews_at ? '<small>' + (s.auto_renew ? 'Förnyas ' : 'Går ut ') + day(s.renews_at) + (d != null && d <= 60 && d >= 0 ? ' (om ' + d + ' dagar)' : '') + '</small>' : '') + '</span>' + (actions || '') + '</div>';
  }

  // Uptime (last 30 days) and the latest monthly report
  function health() {
    var d = st.data, up = d.uptime || [], rep = d.report, html = '';
    if (up.length) {
      var byUrl = {}; up.forEach(function (c) { (byUrl[c.url] = byUrl[c.url] || []).push(c); });
      html += '<h3 class="portal-h">Driften</h3><div class="portal-health">' + Object.keys(byUrl).map(function (u) {
        var l = byUrl[u], okN = l.filter(function (c) { return c.ok; }).length, pct = (okN / l.length * 100), last = l[0];
        var ms = Math.round(l.filter(function (c) { return c.ok; }).reduce(function (a, c) { return a + (c.ms || 0); }, 0) / Math.max(1, okN));
        var down = l.filter(function (c) { return !c.ok; }).length;
        return '<div class="portal-up"><p class="portal-up__url">' + esc(u.replace(/^https?:\/\//, '')) + '</p><p class="portal-up__state portal-up__state--' + (last.ok ? 'ok' : 'down') + '">' + (last.ok ? 'Uppe' : 'Svarar inte') + '</p>' +
          '<div class="portal-up__nums"><div><b>' + (pct === 100 ? '100' : pct.toFixed(2).replace('.', ',')) + ' %</b><span>uppe senaste 30 dagarna</span></div><div><b>' + (ms / 1000).toFixed(2).replace('.', ',') + ' s</b><span>snitt svarstid</span></div><div><b>' + down + '</b><span>' + (down === 1 ? 'kontroll' : 'kontroller') + ' utan svar</span></div></div>' +
          '<p class="mut">Senast kontrollerad ' + new Date(last.checked_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) + '. Vi kontrollerar var 15:e minut och mejlar er om sidan slutar svara.</p></div>';
      }).join('') + '</div>';
    }
    if (rep) {
      var sc = [['Prestanda', rep.performance], ['Tillgänglighet', rep.accessibility], ['Bästa praxis', rep.best_practices], ['SEO', rep.seo]];
      html += '<h3 class="portal-h">Månadsrapport <small>' + new Date(rep.created_at).toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' }) + '</small></h3><div class="portal-report">' +
        '<div class="portal-report__scores">' + sc.map(function (x) { var v = x[1]; return '<div class="portal-report__s portal-report__s--' + (v == null ? 'na' : v >= 90 ? 'good' : v >= 50 ? 'ok' : 'bad') + '"><b>' + (v == null ? '–' : v) + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
        ((rep.issues || []).length ? '<p class="mut">Det här kan förbättras:</p><ul class="portal-report__list">' + rep.issues.slice(0, 5).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '<p class="mut">Inga större problem hittades.</p>') +
        '<button type="button" class="btn btn--primary" id="rep-fix"><span>Be oss åtgärda det</span></button></div>';
    }
    setTimeout(function () { var b = view() && view().querySelector('#rep-fix'); if (b) b.addEventListener('click', function () { st.tab = 'andringar'; st.prefill = 'Åtgärda det som månadsrapporten hittade:\n- ' + (rep.issues || []).slice(0, 5).join('\n- '); shell(); }); }, 0);
    return html;
  }

  // Change requests: the customer describes it, we send a price, the customer approves or declines
  var CST = { new: 'Vi tittar på den', quoted: 'Pris lämnat – väntar på er', approved: 'Godkänd – vi sätter igång', declined: 'Avböjd', in_progress: 'Pågår', done: 'Klar' };
  function changes() {
    var d = st.data, pre = st.prefill || ''; st.prefill = null; var mayDecide = /owner|admin|finance/.test(st.role);
    view().innerHTML = '<h3 class="portal-h">Ny ändring</h3><form id="cr" class="portal-form portal-form--wide" novalidate>' +
      '<input name="page" placeholder="Vilken sida? T.ex. /kontakt eller Startsidan" aria-label="Sida">' +
      '<textarea name="desc" rows="5" placeholder="Vad ska ändras? Skriv så konkret ni kan." aria-label="Vad ska ändras" required>' + esc(pre) + '</textarea>' +
      '<label class="portal-file">Skärmbild (valfritt)<input type="file" name="img" accept="image/*"></label><p class="mut" id="cr-img"></p>' +
      '<button class="btn btn--primary"><span>Skicka – vi återkommer med ett pris</span></button><p class="form-status" hidden></p></form>' +
      '<h3 class="portal-h">Era ändringar</h3>' + (d.changes.length ? d.changes.map(function (c) {
        return '<div class="portal-change portal-change--' + c.status + '"><div class="portal-change__top"><b>' + esc(c.page || 'Ändring') + '</b><span class="portal-change__st">' + (CST[c.status] || esc(c.status)) + '</span></div>' +
          '<p>' + esc(c.description) + '</p>' + (c.image ? '<img src="' + esc(c.image) + '" alt="Skärmbild" class="portal-change__img">' : '') +
          (c.price != null ? '<div class="portal-change__price"><b>' + kr(c.price) + ' <small>exkl. moms</small></b>' + (c.quote_note ? '<p>' + esc(c.quote_note) + '</p>' : '') +
            (c.status === 'quoted' ? (mayDecide ? '<div class="portal-acts"><button type="button" class="btn btn--primary" data-ok="' + c.id + '"><span>Godkänn priset</span></button><button type="button" class="btn btn--light" data-no="' + c.id + '"><span>Avböj</span></button></div>' : '<p class="mut">Ägare, administratör eller ekonomiansvarig godkänner priset.</p>') : '') + '</div>' : '') +
          '<p class="mut">Skickad ' + day(c.created_at) + '</p></div>';
      }).join('') : '<p class="shop-lead">Inga ändringar än.</p>');
    var f = view().querySelector('#cr'), s = f.querySelector('.form-status'), img = null;
    f.img.addEventListener('change', function () {
      var file = f.img.files[0]; img = null; if (!file) return;
      if (file.size > 2 * 1048576) { view().querySelector('#cr-img').textContent = 'Bilden är för stor (max 2 MB).'; f.img.value = ''; return; }
      var r = new FileReader(); r.onload = function () { img = r.result; view().querySelector('#cr-img').textContent = 'Bifogad: ' + file.name; }; r.readAsDataURL(file);
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (f.desc.value.trim().length < 5) return msg(s, 'Beskriv vad som ska ändras.', true);
      msg(s, 'Skickar …');
      sb.from('change_requests').insert({ company_id: st.company.id, created_by: st.user.id, page: f.page.value.trim().slice(0, 200) || null, description: f.desc.value.trim().slice(0, 5000), image: img }).select().single().then(function (r) {
        if (r.error) return msg(s, 'Kunde inte skicka. Mejla info@elevatestudio.nu.', true);
        st.data.changes.unshift(r.data); changes(); msg(view().querySelector('#cr .form-status'), 'Tack! Vi återkommer med ett pris, oftast inom en arbetsdag.');
      });
    });
    view().addEventListener('click', function (e) {
      var ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'); if (!ok && !no) return;
      var id = (ok || no).dataset.ok || (ok || no).dataset.no, c = d.changes.filter(function (x) { return x.id === id; })[0];
      if (ok && !confirm('Godkänna ' + kr(c.price) + ' exkl. moms för ändringen? Vi sätter igång och fakturerar när den är klar.')) return;
      sb.from('change_requests').update({ status: ok ? 'approved' : 'declined' }).eq('id', id).then(function (r) { if (r.error) return alert('Kunde inte spara.'); c.status = ok ? 'approved' : 'declined'; changes(); });
    });
  }

  function services() {
    var d = st.data;
    view().innerHTML = '<h3 class="portal-h">Tjänster</h3>' + (d.services.length ? '<div class="shop-list">' + d.services.map(function (s) {
      var acts = '<span class="portal-acts">' + (s.renews_at && can.tech() ? '<label class="portal-switch"><input type="checkbox" data-renew="' + s.id + '"' + (s.auto_renew ? ' checked' : '') + '> Automatisk förnyelse</label>' : '') +
        '<button type="button" class="portal-link" data-help="' + s.id + '">Hjälp med den här</button></span>';
      return serviceRow(s, acts);
    }).join('') + '</div>' : '<p class="shop-lead">Inga tjänster ännu. <a href="domaner.html">Sök domän</a> eller <a href="foretagsmejl.html">välj företagsmejl</a>.</p>') +
      '<p class="shop-note">Vill ni ändra DNS, namnservrar eller lägga till mejlkonton? Skapa ett ärende under Support så gör vi det åt er. Ändringar som kan påverka mejl eller hemsida bekräftas alltid med er först.</p>';
    view().addEventListener('change', function (e) {
      var id = e.target.dataset.renew; if (!id) return;
      if (!e.target.checked && !confirm('Stänga av automatisk förnyelse? Tjänsten går då ut på förfallodagen.')) { e.target.checked = true; return; }
      sb.from('services').update({ auto_renew: e.target.checked }).eq('id', id).then(function (r) { if (r.error) { alert('Kunde inte spara.'); e.target.checked = !e.target.checked; } else { st.data.services.forEach(function (s) { if (s.id === id) s.auto_renew = e.target.checked; }); } });
    });
    view().addEventListener('click', function (e) { var b = e.target.closest('[data-help]'); if (b) { st.tab = 'support'; st.newFor = b.dataset.help; shell(); } });
  }

  function invoices() {
    var d = st.data;
    view().innerHTML = '<h3 class="portal-h">Fakturor</h3>' + (d.invoices.length ? '<div class="shop-list">' + d.invoices.map(function (i) {
      return '<div class="shop-row"><b>' + esc(i.number) + '<small>' + esc(i.description || '') + '</small></b><span class="shop-st shop-st--' + (i.status === 'paid' ? 'ok' : 'no') + '">' + (IST[i.status] || esc(i.status)) + '</span>' +
        '<span>' + kr(i.amount) + '<small>Förfaller ' + day(i.due_date) + '</small></span>' + (i.pdf_url ? '<a class="btn btn--light" href="' + esc(i.pdf_url) + '" target="_blank" rel="noopener"><span>PDF</span></a>' : '<span></span>') + '</div>';
    }).join('') + '</div>' : '<p class="shop-lead">Inga fakturor ännu.</p>') + '<p class="shop-note">Betalning sker mot faktura. Kortbetalning kommer senare.</p>';
  }

  function support() {
    var d = st.data, pre = st.newFor; st.newFor = null;
    view().innerHTML = '<h3 class="portal-h">Nytt ärende</h3><form id="tn" class="portal-form portal-form--wide" novalidate>' +
      '<select name="service" aria-label="Gäller"><option value="">Gäller ingen särskild tjänst</option>' + d.services.map(function (s) { return '<option value="' + s.id + '"' + (s.id === pre ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' +
      '<input name="subject" placeholder="Rubrik" aria-label="Rubrik" required><textarea name="body" rows="5" placeholder="Beskriv vad som händer" aria-label="Beskrivning" required></textarea>' +
      '<button class="btn btn--primary"><span>Skicka ärende</span></button><p class="form-status" hidden></p></form>' +
      '<h3 class="portal-h">Era ärenden</h3>' + (d.tickets.length ? '<div class="shop-list">' + d.tickets.map(function (t) {
        return '<div class="shop-row"><b>' + esc(t.subject) + '<small>' + day(t.created_at) + '</small></b><span class="shop-st shop-st--' + (t.status === 'resolved' ? 'ok' : 'no') + '">' + (TST[t.status] || esc(t.status)) + '</span><span></span><button type="button" class="btn btn--light" data-t="' + t.id + '"><span>Öppna</span></button></div>';
      }).join('') + '</div>' : '<p class="shop-lead">Inga ärenden.</p>') + '<div id="thread"></div>';
    var f = view().querySelector('#tn'), s = f.querySelector('.form-status');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!f.subject.value.trim() || !f.body.value.trim()) return msg(s, 'Skriv rubrik och beskrivning.', true);
      msg(s, 'Skickar …');
      sb.from('tickets').insert({ company_id: st.company.id, service_id: f.service.value || null, subject: f.subject.value.trim().slice(0, 200), created_by: st.user.id }).select().single().then(function (r) {
        if (r.error) return msg(s, 'Kunde inte skapa ärendet. Mejla info@elevatestudio.nu.', true);
        return sb.from('ticket_messages').insert({ ticket_id: r.data.id, author: st.user.id, body: f.body.value.trim().slice(0, 5000) }).then(function () { st.data.tickets.unshift(r.data); support(); });
      });
    });
    view().addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) thread(b.dataset.t); });
  }
  function thread(id) {
    var t = st.data.tickets.filter(function (x) { return x.id === id; })[0], box = view().querySelector('#thread');
    sb.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at').then(function (r) {
      box.innerHTML = '<h3 class="portal-h">' + esc(t.subject) + '</h3>' + (r.data || []).map(function (m) { return '<div class="portal-msg' + (m.from_staff ? ' portal-msg--staff' : '') + '"><small>' + (m.from_staff ? 'Elevate Studio' : 'Ni') + ' · ' + day(m.created_at) + '</small><p>' + esc(m.body) + '</p></div>'; }).join('') +
        '<form id="tr" class="portal-form portal-form--wide"><textarea name="b" rows="3" placeholder="Svara" aria-label="Svar"></textarea><div class="portal-acts"><button class="btn btn--primary"><span>Skicka svar</span></button>' +
        '<button type="button" class="btn btn--light" id="tstate"><span>' + (t.status === 'resolved' ? 'Öppna igen' : 'Markera som löst') + '</span></button></div></form>';
      box.scrollIntoView({ behavior: 'smooth' });
      box.querySelector('#tr').addEventListener('submit', function (e) { e.preventDefault(); var b = e.target.b.value.trim(); if (!b) return;
        sb.from('ticket_messages').insert({ ticket_id: id, author: st.user.id, body: b.slice(0, 5000) }).then(function () { if (t.status === 'resolved') sb.from('tickets').update({ status: 'open' }).eq('id', id); thread(id); }); });
      box.querySelector('#tstate').addEventListener('click', function () { var ns = t.status === 'resolved' ? 'open' : 'resolved';
        sb.from('tickets').update({ status: ns }).eq('id', id).then(function () { t.status = ns; support(); }); });
    });
  }

  function account() {
    var c = st.company, u = st.user, edit = can.edit();
    view().innerHTML = '<h3 class="portal-h">Företaget</h3><form id="cf" class="portal-form portal-form--grid">' +
      [['name', 'Företagsnamn'], ['org_nr', 'Organisationsnummer'], ['billing_email', 'E-post för fakturor'], ['phone', 'Telefon'], ['billing_address', 'Fakturaadress']].map(function (x) { return '<label>' + x[1] + '<input name="' + x[0] + '" value="' + esc(c[x[0]] || '') + '"' + (edit ? '' : ' disabled') + '></label>'; }).join('') +
      (edit ? '<button class="btn btn--primary"><span>Spara</span></button>' : '<p class="shop-note">Bara ägare, administratör och ekonomiansvarig kan ändra företagsuppgifter.</p>') + '<p class="form-status" hidden></p></form>' +
      '<h3 class="portal-h">Användare i företaget</h3><div class="shop-list">' + st.data.members.map(function (m) { return '<div class="shop-row"><b>' + (m.user_id === u.id ? esc(u.email) + ' (du)' : 'Användare') + '</b><span>' + (ROLE[m.role] || m.role) + '</span><span></span><span></span></div>'; }).join('') + '</div>' +
      '<p class="shop-note">Vill ni lägga till eller ta bort en användare? Skapa ett ärende så ordnar vi det.</p>' +
      '<h3 class="portal-h">Ditt konto</h3><form id="pf" class="portal-form portal-form--grid"><label>Namn<input name="n" value="' + esc((u.user_metadata || {}).full_name || '') + '"></label><label>E-post<input value="' + esc(u.email) + '" disabled></label>' +
      '<label>Nytt lösenord<input name="p" type="password" minlength="10" autocomplete="new-password" placeholder="Lämna tomt för att behålla"></label><button class="btn btn--primary"><span>Spara</span></button><p class="form-status" hidden></p></form>' +
      '<h3 class="portal-h">Säkerhet</h3><div id="mfa"></div><p class="portal-acts"><button type="button" class="btn btn--light" id="others"><span>Logga ut andra enheter</span></button></p>' +
      '<h3 class="portal-h">Personuppgifter</h3><p class="shop-lead">Ni kan begära en kopia av era personuppgifter eller att de raderas. Uppgifter vi måste spara enligt lag, till exempel bokföring, raderas när tiden har gått ut.</p>' +
      '<p class="portal-acts"><button type="button" class="btn btn--light" data-req="export"><span>Begär export</span></button><button type="button" class="btn btn--light" data-req="delete"><span>Begär radering</span></button></p><p class="form-status" id="reqs" hidden></p>';
    var cf = view().querySelector('#cf');
    if (edit) cf.addEventListener('submit', function (e) { e.preventDefault(); var up = {}; ['name', 'org_nr', 'billing_email', 'phone', 'billing_address'].forEach(function (k) { up[k] = cf[k].value.trim() || null; });
      if (!up.name) return msg(cf.querySelector('.form-status'), 'Företagsnamn behövs.', true);
      sb.from('companies').update(up).eq('id', c.id).then(function (r) { msg(cf.querySelector('.form-status'), r.error ? 'Kunde inte spara.' : 'Sparat.', !!r.error); if (!r.error) Object.assign(c, up); }); });
    var pf = view().querySelector('#pf');
    pf.addEventListener('submit', function (e) { e.preventDefault(); var s = pf.querySelector('.form-status'), up = { data: { full_name: pf.n.value.trim() } };
      if (pf.p.value) { if (pf.p.value.length < 10) return msg(s, 'Lösenordet behöver minst 10 tecken.', true); up.password = pf.p.value; }
      sb.auth.updateUser(up).then(function (r) { msg(s, r.error ? r.error.message : 'Sparat.', !!r.error); pf.p.value = ''; }); });
    view().querySelector('#others').addEventListener('click', function () { sb.auth.signOut({ scope: 'others' }).then(function () { alert('Andra enheter är utloggade.'); }); });
    view().addEventListener('click', function (e) { var b = e.target.closest('[data-req]'); if (!b) return;
      if (b.dataset.req === 'delete' && !confirm('Begära att era personuppgifter raderas? Vi kontaktar er innan något tas bort.')) return;
      sb.from('data_requests').insert({ user_id: u.id, kind: b.dataset.req }).then(function (r) { msg(view().querySelector('#reqs'), r.error ? 'Kunde inte skicka. Mejla info@elevatestudio.nu.' : 'Begäran är mottagen. Vi återkommer inom 30 dagar.', !!r.error); }); });
    mfaBox();
  }
  // two-factor with an authenticator app (TOTP)
  function mfaBox() {
    var box = view().querySelector('#mfa');
    sb.auth.mfa.listFactors().then(function (r) {
      var f = ((r.data || {}).totp || []).filter(function (x) { return x.status === 'verified'; })[0];
      if (f) { box.innerHTML = '<p class="portal-ok">Tvåstegsverifiering är på.</p><p><button type="button" class="portal-link" id="mfaoff">Stäng av</button></p>';
        box.querySelector('#mfaoff').addEventListener('click', function () { if (confirm('Stänga av tvåstegsverifiering?')) sb.auth.mfa.unenroll({ factorId: f.id }).then(mfaBox); }); return; }
      box.innerHTML = '<p class="shop-lead">Skydda kontot med en kod från en app (till exempel Google Authenticator eller Microsoft Authenticator).</p><p><button type="button" class="btn btn--light" id="mfaon"><span>Slå på tvåstegsverifiering</span></button></p>';
      box.querySelector('#mfaon').addEventListener('click', function () {
        sb.auth.mfa.enroll({ factorType: 'totp' }).then(function (e) {
          if (e.error) { box.insertAdjacentHTML('beforeend', '<p class="form-status form-status--error">Tvåstegsverifiering är inte påslaget i Supabase än.</p>'); return; }
          box.innerHTML = '<p class="shop-lead">Skanna koden med appen och skriv sedan in sexsiffriga koden.</p><img src="' + e.data.totp.qr_code + '" alt="QR-kod för tvåstegsverifiering" width="180" height="180">' +
            '<form id="mv" class="portal-form"><input name="c" inputmode="numeric" placeholder="Kod" aria-label="Kod"><button class="btn btn--primary"><span>Bekräfta</span></button><p class="form-status" hidden></p></form>';
          box.querySelector('#mv').addEventListener('submit', function (ev) { ev.preventDefault();
            sb.auth.mfa.challengeAndVerify({ factorId: e.data.id, code: ev.target.c.value.trim() }).then(function (x) { if (x.error) return msg(ev.target.querySelector('.form-status'), 'Fel kod.', true); mfaBox(); }); });
        });
      });
    });
  }

  // ---------- demo: test data, clearly marked, nothing is saved ----------
  function demoClient() {
    var d = function (n) { return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); };
    var db = {
      company_members: [{ role: 'owner', company_id: 'c1', user_id: 'u1', companies: { id: 'c1', name: 'Exempelbygg AB', org_nr: '556000-0000', billing_email: 'faktura@exempelbygg.se', phone: '070-000 00 00', billing_address: 'Storgatan 1, Uppsala' } }, { role: 'user', user_id: 'u1', company_id: 'c2', companies: { id: 'c2', name: 'Exempel Städ AB', org_nr: '556000-0001' } }],
      services: [{ id: 's1', company_id: 'c1', type: 'domain', name: 'exempelbygg.se', status: 'active', price: 149, period: 'year', renews_at: d(21), auto_renew: false },
        { id: 's2', company_id: 'c1', type: 'mail', name: 'Mejl Företag · 5 konton', status: 'active', price: 199, period: 'month' },
        { id: 's3', company_id: 'c1', type: 'website', name: 'Hemsida Starter', status: 'active', price: 99, period: 'year', renews_at: d(200), auto_renew: true },
        { id: 's4', company_id: 'c1', type: 'ssl', name: 'SSL-certifikat exempelbygg.se', status: 'active', renews_at: d(64), auto_renew: true }],
      invoices: [{ id: 'i1', company_id: 'c1', number: '2026-041', amount: 199, status: 'open', due_date: d(9), description: 'Företagsmejl november' },
        { id: 'i2', company_id: 'c1', number: '2026-030', amount: 5000, status: 'paid', due_date: d(-30), description: 'Hemsida Starter' }],
      tickets: [{ id: 't1', company_id: 'c1', subject: 'Mejlen kommer inte fram i mobilen', status: 'answered', created_at: d(-2) }],
      site_reports: [{ company_id: 'c1', created_at: d(-1), url: 'https://exempelbygg.se', performance: 78, accessibility: 92, best_practices: 100, seo: 88, lcp_ms: 3100, issues: ['Bilder kan komprimeras bättre', 'En länk saknar beskrivande text', 'Metabeskrivning saknas på /kontakt'] }],
      uptime_checks: (function () { var a = []; for (var i = 0; i < 2880; i++) a.push({ company_id: 'c1', url: 'https://exempelbygg.se', ok: i !== 700 && i !== 701, ms: 380 + (i * 37) % 260, checked_at: new Date(Date.now() - i * 9e5).toISOString() }); return a; })(),
      site_stats: (function () { var a = [], src = ['Google', 'Direkt', 'Instagram', 'Facebook', 'Bing'], pg = ['Startsidan', '/tjanster', '/kontakt', '/om-oss', '/projekt', '/priser'], ct = ['Haninge', 'Stockholm', 'Nynäshamn', 'Tyresö', 'Huddinge'], qs = ['bygg haninge', 'badrumsrenovering haninge', 'snickare södertörn', 'altan pris', 'exempelbygg'];
        for (var i = 400; i >= 0; i--) { var dt = new Date(Date.now() - i * 864e5), w = dt.getDay(), v = Math.round((30 + (400 - i) * 0.04 + 9 * Math.sin(i / 3.1)) * (w === 0 || w === 6 ? 0.6 : 1)), o = function (names, ws) { var r = {}; names.forEach(function (n, k) { r[n] = Math.max(0, Math.round(v * ws[k])); }); return r; };
          a.push({ company_id: 'c1', day: dt.toISOString().slice(0, 10), visitors: v, pageviews: Math.round(v * 3.04), leads: (i % 4 === 0) ? 1 : (i % 9 === 0 ? 2 : 0), sources: o(src, [0.58, 0.21, 0.12, 0.06, 0.03]), pages: o(pg, [0.48, 0.22, 0.14, 0.08, 0.06, 0.05]), devices: o(['Mobil', 'Dator', 'Surfplatta'], [0.71, 0.25, 0.04]), cities: o(ct, [0.34, 0.31, 0.12, 0.09, 0.07]), queries: o(qs, [0.11, 0.08, 0.05, 0.03, 0.02]) }); }
        return a; })(),
      change_requests: [{ id: 'cr1', company_id: 'c1', created_at: d(-3), page: 'Startsidan', description: 'Byt bilden högst upp till en bild från vårt senaste badrumsprojekt.', status: 'quoted', price: 900, quote_note: 'Vi byter bilden, beskär den för mobil och komprimerar den. Klart inom två arbetsdagar.' },
        { id: 'cr2', company_id: 'c1', created_at: d(-20), page: '/priser', description: 'Lägg till en rad om ROT-avdrag.', status: 'done', price: 0, quote_note: 'Ingår i ert avtal.' }],
      ticket_messages: [{ ticket_id: 't1', from_staff: false, body: 'Jag får inte in mejlen i iPhone. Vad ska jag fylla i?', created_at: d(-2) }, { ticket_id: 't1', from_staff: true, body: 'Hej! Välj IMAP och fyll i servern mail.exempelbygg.se. Vi har mejlat en guide till dig.', created_at: d(-1) }],
      notifications: [], data_requests: []
    };
    var q = function (table) {
      var rows = (db[table] || []).slice(), single = false, api = {
        select: function () { return api; }, order: function () { return api; }, limit: function () { return api; }, is: function () { return api; }, gte: function () { return api; }, or: function () { return api; },
        eq: function (k, v) { rows = rows.filter(function (r) { return r[k] === undefined || r[k] === v; }); return api; },
        insert: function (row) { row = Object.assign({ id: 'n' + Date.now(), created_at: new Date().toISOString(), status: table === 'change_requests' ? 'new' : 'open' }, row); (db[table] = db[table] || []).unshift(row); rows = [row]; return api; },
        update: function () { return api; }, single: function () { single = true; return api; },
        then: function (ok) { return Promise.resolve({ data: single ? rows[0] : rows, error: null }).then(ok); }
      };
      return api;
    };
    var user = { id: 'u1', email: 'anna@exempelbygg.se', user_metadata: { full_name: 'Anna Exempel' } };
    return { from: q, auth: {
      getSession: function () { return Promise.resolve({ data: { session: {} } }); }, getUser: function () { return Promise.resolve({ data: { user: user } }); },
      signInWithPassword: function () { return Promise.resolve({}); }, signOut: function () { return Promise.resolve({}); }, updateUser: function () { return Promise.resolve({}); },
      resetPasswordForEmail: function () { return Promise.resolve({}); }, onAuthStateChange: function () {},
      mfa: { getAuthenticatorAssuranceLevel: function () { return Promise.resolve({ data: {} }); }, listFactors: function () { return Promise.resolve({ data: { totp: [] } }); },
        enroll: function () { return Promise.resolve({ error: { message: 'demo' } }); } } } };
  }

  sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') newPassword(); });
  if (/type=recovery/.test(location.hash)) return;
  sb.auth.getSession().then(function (r) { if (r.data && r.data.session) mfaThenStart(); else login(); });
})();
