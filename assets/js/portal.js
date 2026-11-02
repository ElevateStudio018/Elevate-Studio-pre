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
    var dd = st.data, mo = dd.services.filter(function (s) { return s.period === 'month'; }).reduce(function (a, s) { return a + (+s.price || 0); }, 0);
    var todoN = dd.services.filter(function (s) { var n = days(s.renews_at); return s.renews_at && n <= 60 && n >= 0 && !s.auto_renew; }).length + dd.invoices.filter(function (i) { return i.status === 'overdue'; }).length;
    var hero = '<div class="portal-glow glow-dark">' + (DEMO ? '<p class="portal-demo">Demoläge · testdata · inget sparas</p>' : '') + '<h2>Hej ' + esc(((st.user.user_metadata || {}).full_name || '').split(' ')[0] || '') + '</h2>' +
      '<div class="st-preview portal-tiles">' +
      '<div class="st-card"><b class="portal-num">' + dd.services.length + '</b><p>Aktiva tjänster</p></div>' +
      '<div class="st-card"><b class="portal-num">' + Math.round(mo) + ' kr</b><p>Per månad</p></div>' +
      '<div class="st-card"><b class="portal-num">' + todoN + '</b><p>Att göra</p></div></div></div>';
    root.innerHTML = hero + '<div class="portal-top"><div><p class="form-prefill__k">' + esc(ROLE[st.role] || '') + '</p>' +
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
      '<h3 class="portal-h">Lägg till fler tjänster</h3>' +
      '<div class="promo2 portal-promo"><div class="promo2__card glow-dark"><div class="promo2__head"><h2>Sök och köp ert <em>domännamn</em></h2><span class="promo2__arrow" aria-hidden="true">&rarr;</span></div><p>Skydda namnet på fler toppdomäner.</p>' +
      '<form class="sitetest__form portal-dom" action="domaner.html"><label class="sitetest__field"><span class="sr-only">Domän</span><input name="q" placeholder="dittforetag" aria-label="Domän"></label><button class="btn btn--primary"><span>Sök</span></button></form></div>' +
      '<a class="promo2__card promo2__card--wide glow-dark" href="foretagsmejl.html"><div class="promo2__head"><h2>Imponera med professionell e-post</h2><span class="promo2__arrow" aria-hidden="true">&rarr;</span></div><p>Fler konton, alias som info@ och flytt av gammal mejl.</p>' +
      '<div class="wm" aria-hidden="true"><div class="wm__win"><div class="wm__bar"><b class="wm__logo">elevate<span>mejl</span></b><span class="wm__search">Sök i mejl</span><span class="wm__acc">anna@exempelbygg.se</span></div><div class="wm__tools"><span>Uppdatera</span><span>Ta bort</span><span>Flytta</span><span>Markera som oläst</span><span>Blockera</span></div><div class="wm__body"><div class="wm__side"><span class="wm__compose">Skriv nytt</span><span class="on">Inkorg <i>2</i></span><span>Utkast</span><span>Skickat</span><span>Skräppost</span></div><div class="wm__list"><p class="wm__h">Inkorg</p><div class="wm__m wm__m--new"><b>Karin Lund</b><span>Offert på badrum</span><small>Hej! Vi vill gärna ha en offert på …</small><em>offert.pdf</em></div><div class="wm__m wm__m--new"><b>Bokning</b><span>Ny bokning tisdag 14:00</span><small>Johan har bokat ett möte …</small></div><div class="wm__m wm__m--sel"></div><div class="wm__m"><b>Faktura</b><span>Betalning mottagen</span><small>Tack, faktura 2026-041 är betald.</small></div></div><div class="wm__read"><p class="wm__h">Offert på badrum</p><div class="wm__from"><i>K</i><div><b>Karin Lund</b><small>Till: info@exempelbygg.se</small></div></div><p>Hej! Vi har sett er hemsida och vill gärna ha en offert på ett nytt badrum, ungefär 6 kvadratmeter.</p><p>Vänliga hälsningar<br>Karin</p><div class="wm__acts"><span>Svara</span><span>Svara alla</span><span>Vidarebefordra</span></div></div></div></div><div class="wm__cal"><p>November</p><div class="wm__days"><b>M</b><b>T</b><b>O</b><b>T</b><b>F</b><b>L</b><b>S</b><i>1</i><i>2</i><i class=on>3</i><i>4</i><i>5</i><i>6</i><i>7</i><i>8</i><i>9</i><i>10</i><i>11</i><i>12</i><i>13</i><i>14</i><i>15</i><i>16</i><i>17</i><i>18</i><i>19</i><i>20</i><i>21</i><i>22</i><i>23</i><i>24</i><i>25</i><i>26</i><i>27</i><i>28</i></div></div></div>' + '</a></div>' +
      '<div class="promo2 portal-promo portal-promo--one"><a class="promo2__card glow-dark" href="testa.html"><div class="promo2__head"><h2>Hur presterar er sajt?</h2><span class="promo2__arrow" aria-hidden="true">&rarr;</span></div><p>Testa hastighet, tillgänglighet och SEO på en minut.</p>' +
      '<div class="st-preview"><div class="st-card"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="st-bg"/><circle cx="60" cy="60" r="50" class="st-fg" stroke="#d4e85a" stroke-dasharray="250 314"/></svg><b>–</b><p>Prestanda</p></div><div class="st-card"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="st-bg"/><circle cx="60" cy="60" r="50" class="st-fg" stroke="#3cc2b0" stroke-dasharray="285 314"/></svg><b>–</b><p>Tillgänglighet</p></div><div class="st-card"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" class="st-bg"/><circle cx="60" cy="60" r="50" class="st-fg" stroke="#f2b45f" stroke-dasharray="200 314"/></svg><b>–</b><p>SEO och AI-optimering</p></div></div></a></div>' +
      (tips.length ? '<p class="shop-note">Saknas: ' + tips.map(function (t) { return '<a href="' + t[1] + '">' + t[0] + '</a>'; }).join(' · ') + '</p>' : '');
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

  // ---------- demo: test data, clearly marked, nothing is saved ----------
  function demoClient() {
    var d = function (n) { return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10); };
    var db = {
      company_members: [{ role: 'owner', company_id: 'c1', user_id: 'u1', companies: { id: 'c1', name: 'Exempelbygg AB', org_nr: '556000-0000', billing_email: 'faktura@exempelbygg.se', phone: '070-000 00 00', billing_address: 'Storgatan 1, Uppsala' } }, { role: 'user', company_id: 'u1', user_id: 'c2', company_id: 'c2', companies: { id: 'c2', name: 'Exempel Städ AB', org_nr: '556000-0001' } }],
      services: [{ id: 's1', company_id: 'c1', type: 'domain', name: 'exempelbygg.se', status: 'active', price: 149, period: 'year', renews_at: d(21), auto_renew: false },
        { id: 's2', company_id: 'c1', type: 'mail', name: 'Mejl Företag · 5 konton', status: 'active', price: 199, period: 'month' },
        { id: 's3', company_id: 'c1', type: 'website', name: 'Hemsida Starter', status: 'active', price: 99, period: 'year', renews_at: d(200), auto_renew: true },
        { id: 's4', company_id: 'c1', type: 'ssl', name: 'SSL-certifikat exempelbygg.se', status: 'active', renews_at: d(64), auto_renew: true }],
      invoices: [{ id: 'i1', company_id: 'c1', number: '2026-041', amount: 199, status: 'open', due_date: d(9), description: 'Företagsmejl november' },
        { id: 'i2', company_id: 'c1', number: '2026-030', amount: 5000, status: 'paid', due_date: d(-30), description: 'Hemsida Starter' }],
      tickets: [{ id: 't1', company_id: 'c1', subject: 'Mejlen kommer inte fram i mobilen', status: 'answered', created_at: d(-2) }],
      ticket_messages: [{ ticket_id: 't1', from_staff: false, body: 'Jag får inte in mejlen i iPhone. Vad ska jag fylla i?', created_at: d(-2) }, { ticket_id: 't1', from_staff: true, body: 'Hej! Välj IMAP och fyll i servern mail.exempelbygg.se. Vi har mejlat en guide till dig.', created_at: d(-1) }],
      notifications: [], data_requests: []
    };
    db.company_members[0].company_id = 'c1';
    var q = function (table) {
      var rows = (db[table] || []).slice(), single = false, api = {
        select: function () { return api; }, order: function () { return api; }, limit: function () { return api; }, is: function () { return api; }, or: function () { return api; },
        eq: function (k, v) { rows = rows.filter(function (r) { return r[k] === undefined || r[k] === v; }); return api; },
        insert: function (row) { row = Object.assign({ id: 'n' + Date.now(), created_at: new Date().toISOString(), status: 'open' }, row); (db[table] = db[table] || []).unshift(row); rows = [row]; return api; },
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
