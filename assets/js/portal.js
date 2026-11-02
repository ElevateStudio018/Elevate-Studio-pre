/* Kundportal. Supabase Auth for login; every table is protected by row level security, so a customer only ever
   receives rows for the companies they belong to (see supabase/sql/2026-11-02_portal.sql). No keys but the
   public anon key are in the page. */
(function () {
  var root = document.getElementById('portal'); if (!root || !window.supabase) return;
  var sb = window.supabase.createClient(root.dataset.url, root.dataset.key);
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
      sb.from('company_members').select('role,user_id').eq('company_id', c)
    ]).then(function (r) {
      st.data = { services: r[0].data || [], invoices: r[1].data || [], tickets: r[2].data || [], notes: r[3].data || [], members: r[4].data || [] };
      shell();
    });
  }

  // ---------- layout: top menu (design 10) ----------
  var TABS = [['oversikt', 'Översikt'], ['tjanster', 'Tjänster'], ['fakturor', 'Fakturor'], ['support', 'Support'], ['konto', 'Konto']];
  function logoutBtn() { return '<p><button type="button" class="portal-link" id="logout">Logga ut</button></p>'; }
  function bindLogout() { var b = root.querySelector('#logout'); if (b) b.addEventListener('click', function () { sb.auth.signOut().then(function () { login('Du är utloggad.'); }); }); }
  function shell() {
    var tabs = TABS.filter(function (t) { return t[0] !== 'fakturor' || can.invoices(); });
    root.innerHTML = '<div class="portal-top"><div><p class="form-prefill__k">' + esc(ROLE[st.role] || '') + '</p>' +
      (st.members.length > 1 ? '<select id="pc" class="portal-company" aria-label="Företag">' + st.members.map(function (m) { return '<option value="' + m.company_id + '"' + (m.company_id === st.company.id ? ' selected' : '') + '>' + esc(m.companies.name) + '</option>'; }).join('') + '</select>' : '<h2 class="portal-company">' + esc(st.company.name) + '</h2>') +
      '</div><button type="button" class="portal-link" id="logout">Logga ut</button></div>' +
      '<nav class="portal-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav><div id="pv"></div>';
    bindLogout();
    var pc = root.querySelector('#pc'); if (pc) pc.addEventListener('change', function () { choose(st.members.filter(function (m) { return m.company_id === pc.value; })[0]); });
    root.querySelector('.portal-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; st.tab = b.dataset.tab; shell(); });
    ({ oversikt: overview, tjanster: services, fakturor: invoices, support: support, konto: account })[st.tab]();
  }
  var view = function () { return root.querySelector('#pv'); };

  function serviceRow(s, actions) {
    var d = days(s.renews_at);
    return '<div class="shop-row"><b>' + esc(s.name) + '<small>' + (TYPE[s.type] || '') + '</small></b><span class="shop-st shop-st--' + (/active/.test(s.status) ? 'ok' : 'no') + '">' + (SST[s.status] || esc(s.status)) + '</span>' +
      '<span>' + (s.price != null ? kr(s.price) + (s.period === 'month' ? '/mån' : s.period === 'year' ? '/år' : '') : '') + (s.renews_at ? '<small>' + (s.auto_renew ? 'Förnyas ' : 'Går ut ') + day(s.renews_at) + (d != null && d <= 60 && d >= 0 ? ' (om ' + d + ' dagar)' : '') + '</small>' : '') + '</span>' + (actions || '') + '</div>';
  }

  function overview() {
    var d = st.data, todo = [];
    d.services.forEach(function (s) { var n = days(s.renews_at); if (s.renews_at && n <= 60 && n >= 0 && !s.auto_renew) todo.push(['<b>' + esc(s.name) + '</b> går ut om ' + n + ' dagar och förnyas inte automatiskt.', 'tjanster', 'Visa']); if (s.status === 'suspended') todo.push(['<b>' + esc(s.name) + '</b> är pausad.', 'support', 'Kontakta oss']); });
    d.invoices.forEach(function (i) { if (i.status === 'overdue') todo.push(['Faktura <b>' + esc(i.number) + '</b> på ' + kr(i.amount) + ' är förfallen.', 'fakturor', 'Visa']); });
    d.notes.forEach(function (n) { todo.push(['<b>' + esc(n.title) + '</b>' + (n.body ? ' ' + esc(n.body) : ''), null, '']); });
    var month = d.services.filter(function (s) { return s.period === 'month' && s.status !== 'cancelled'; }).reduce(function (a, s) { return a + (+s.price || 0); }, 0);
    var year = d.services.filter(function (s) { return s.period === 'year' && s.status !== 'cancelled'; }).reduce(function (a, s) { return a + (+s.price || 0); }, 0);
    var next = d.invoices.filter(function (i) { return i.status === 'open'; }).sort(function (a, b) { return String(a.due_date).localeCompare(String(b.due_date)); })[0];
    var has = function (t) { return d.services.some(function (s) { return s.type === t; }); };
    var tips = [];
    if (has('domain') && !has('mail')) tips.push(['Mejl med er egen domän', 'foretagsmejl.html']);
    if (!has('website')) tips.push(['En hemsida som ger förfrågningar', 'priser.html']);
    if (!has('domain')) tips.push(['Ett eget domännamn', 'domaner.html']);
    view().innerHTML =
      (todo.length ? todo.map(function (t) { return '<div class="portal-warn"><p>' + t[0] + '</p>' + (t[1] ? '<button type="button" class="btn btn--primary" data-go="' + t[1] + '"><span>' + t[2] + '</span></button>' : '') + '</div>'; }).join('') : '<p class="portal-ok">Allt fungerar. Inget behöver göras just nu.</p>') +
      '<h3 class="portal-h">Era tjänster</h3>' + (d.services.length ? '<div class="shop-list">' + d.services.map(function (s) { return serviceRow(s); }).join('') + '</div>' : '<p class="shop-lead">Inga tjänster ännu.</p>') +
      '<p class="portal-sum">Totalt ' + kr(month) + '/mån' + (year ? ' + ' + kr(year) + '/år' : '') + ' exkl. moms' + (next ? ' · nästa faktura ' + day(next.due_date) : '') + '</p>' +
      (tips.length ? '<h3 class="portal-h">Kanske intressant</h3><p class="shop-lead">' + tips.map(function (t) { return '<a href="' + t[1] + '">' + t[0] + '</a>'; }).join(' · ') + '</p>' : '');
    view().addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) { st.tab = b.dataset.go; shell(); } });
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

  sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') newPassword(); });
  if (/type=recovery/.test(location.hash)) return;
  sb.auth.getSession().then(function (r) { if (r.data && r.data.session) mfaThenStart(); else login(); });
})();
