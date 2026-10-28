/* Admin for elevatestudio.nu/admin: runs in the browser and talks straight to the database (Supabase).
 * Access is enforced by the database itself – only accounts with the admin role can read or change leads. */
(function () {
  var root = document.getElementById('admin');
  var sb = window.supabase.createClient(root.dataset.url, root.dataset.key);
  var REVIEW_URL = root.dataset.review;
  var MARK = '<svg viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>';
  var STATUS = [
    ['new', 'Ny', '#3b82f6'], ['contacted', 'Kontaktad', '#06b6d4'], ['meeting_to_book', 'Möte ska bokas in', '#d946ef'],
    ['meeting_booked', 'Möte inbokat', '#14b8a6'], ['meeting_rebook', 'Boka om möte', '#f97316'], ['meeting_held', 'Möte hållet', '#84cc16'],
    ['quote_sent', 'Offert skickad', '#6366f1'], ['waiting', 'Väntar svar', '#f59e0b'], ['negotiation', 'Förhandling', '#8b5cf6'],
    ['done', 'Klar', '#10b981'], ['sold', 'Såld', '#d4a017'], ['lost', 'Förlorad', '#f43f5e'], ['archived', 'Arkiverad', '#94a3b8']
  ];
  var MEETING = { manual: 'Manuellt tillagd', quote: 'Offertförfrågan', teams: 'Microsoft Teams', google_meet: 'Google Meet', phone: 'Telefonmöte' };
  var TEAM = [['Carl', 'Carl From'], ['Isak', 'Isak Mattsson'], ['Oscar', 'Oscar Svanerud']];
  var CLOSED = ['sold', 'lost', 'archived', 'done'];
  var GMAIL = 'elevate.studio018@gmail.com'; // all mail from the admin is sent from here (worker/invite.js)
  // Sends through the site's server (Gmail) – never opens a mail program. Resolves to 'sent' or an error text.
  function sendMail(body) {
    return sb.auth.getSession().then(function (r) {
      var token = r.data && r.data.session && r.data.session.access_token;
      return fetch('/api/mail', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) {
        if (res.ok) return b;
        if (b.error === 'not_configured') throw new Error('Gmail är inte kopplat än (se Integrationer).');
        if (b.error === 'auth') throw new Error('Du behöver logga in igen.');
        throw new Error(b.error || 'Fel ' + res.status);
      });
    }, function () { throw new Error('Servern svarade inte.'); });
  }
  // The four admin profiles; who is signed in decides the name in the menu and the default sender
  var PROFILES = [['carl', 'Carl From', 'carl@elevatestudio.nu'], ['isak', 'Isak Mattsson', 'isak@elevatestudio.nu'],
    // Oscar uses his Gmail until oskar@elevatestudio.nu is opened; both addresses (and oscar@) count as him
    ['oscar', 'Oscar Svanerud', 'svanerudo@gmail.com', ['leads', 'kalender', 'fakturor', 'konto'], ['oskar@elevatestudio.nu', 'oscar@elevatestudio.nu']],
    ['', 'Elevate Studio', 'info@elevatestudio.nu']];
  var profile = function (email) { email = String(email || '').toLowerCase(); return PROFILES.find(function (p) { return p[2] === email || (p[4] || []).indexOf(email) >= 0; }) || PROFILES[3]; };
  // A profile with a list sees only those pages (and no mail campaigns); the others see everything
  var allowed = function (view) { var only = profile(st.user && st.user.email)[3]; return !only || only.indexOf(view) >= 0; };
  // Whose lead it is: the leads table has no owner column, so the owner is a tag on the first line of
  // the comment ("[Oscar]"). It is hidden in the comment fields and shown as a badge instead.
  var OWNER_RE = /^\[(Carl|Isak|Oscar)\]\n?/;
  var ownerOf = function (l) { var m = OWNER_RE.exec((l && l.admin_notes) || ''); return m ? m[1] : ''; };
  var noteOf = function (l) { return ((l && l.admin_notes) || '').replace(OWNER_RE, ''); };
  var withOwner = function (owner, note) { note = (note || '').trim(); return owner ? '[' + owner + ']' + (note ? '\n' + note : '') : (note || null); };
  var myTag = function () { var p = profile(st.user && st.user.email); return p[3] ? p[1].split(' ')[0] : ''; };
  var me = function () { return profile(st.user && st.user.email)[1]; };
  var senderKey = function (who) { return (TEAM.find(function (t) { return t[1] === who || t[0] === who; }) || [''])[0].toLowerCase(); };
  var st = { user: null, leads: [], view: (location.hash.slice(1).match(/^[a-z]+$/) || ['leads'])[0], status: 'all', q: '', sort: 'created_desc', shown: 40, editing: null };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sInfo = function (k) { return STATUS.find(function (s) { return s[0] === k; }) || STATUS[0]; };
  var kr = function (n) { return new Intl.NumberFormat('sv-SE').format(Math.round(n || 0)) + ' kr'; };
  var dt = function (iso, opts) { return iso ? new Date(iso).toLocaleString('sv-SE', opts || { dateStyle: 'medium', timeStyle: 'short' }) : '–'; };
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  function toast(text) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = text; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  var ICON = {
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M7 15l4-4 3 3 6-6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2M6 6V4h12v2"/></svg>',
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-2zM15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>'
  };

  /* ---------- Login ---------- */
  function renderLogin(message) {
    root.innerHTML = '<div class="login"><aside class="login__side"><a class="brand" href="../index.html">' + MARK + 'Elevate Studio</a>' +
      '<div><h1>Välkommen <span class="serif">tillbaka.</span></h1><p>Leads, möten och offerter – samlat på ett ställe.</p></div><p>elevatestudio.nu</p>' +
      '<span class="login__big">' + MARK + '</span></aside>' +
      '<div class="login__form"><form class="login__card" id="login"><h2>Logga in</h2><p style="color:var(--muted);margin:0 0 22px">För Elevate-teamet.</p>' +
      '<label class="field">E-post<input class="input" type="email" name="email" autocomplete="email" required></label>' +
      '<label class="field">Lösenord<input class="input" type="password" name="password" autocomplete="current-password" required></label>' +
      '<button class="btn btn--block" type="submit">Logga in</button><p class="msg" id="login-msg">' + esc(message || '') + '</p>' +
      '<button type="button" class="link" id="forgot">Glömt lösenord?</button></form></div></div>';
    $('#forgot').addEventListener('click', function () {
      var email = $('#login').email.value.trim();
      if (!email) { $('#login-msg').textContent = 'Fyll i din e-post först, tryck sedan på Glömt lösenord.'; return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] }).then(function (r) {
        $('#login-msg').textContent = r.error ? r.error.message : 'Om e-posten finns skickas en länk dit. Klicka på den för att välja ett nytt lösenord.';
      });
    });
    $('#login').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = $('button', f);
      btn.disabled = true; btn.textContent = 'Loggar in …';
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value }).then(function (r) {
        if (r.error) throw r.error;
        return start(r.data.user);
      }).catch(function (err) {
        renderLogin(/invalid/i.test(err.message) ? 'Fel e-post eller lösenord.' : err.message);
      });
    });
  }

  function start(user) {
    return sb.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(function (r) {
      if (r.error || !r.data) { sb.auth.signOut(); renderLogin('Kontot saknar admin-behörighet.'); return; }
      st.user = user;
      if (!VIEWS[st.view] || !allowed(st.view)) st.view = 'leads';
      renderShell();
      return loadLeads();
    });
  }

  /* ---------- Shell ---------- */
  var NAV = [
    ['Försäljning', [['leads', 'Leads', 'inbox'], ['kalender', 'Kalender', 'cal'], ['kontakter', 'Kontakter', 'users'], ['fakturor', 'Fakturor', 'file']]],
    ['Marknadsföring', [['utskick', 'Utskick', 'send'], ['segment', 'Segment', 'layers'], ['besokare', 'Besökare', 'eye'], ['chatten', 'Chatten', 'msg']]],
    ['Kunder', [['kundportal', 'Kundportal', 'door']]],
    ['AI & analys', [['ai', 'AI-assistent', 'spark'], ['insikter', 'Insikter', 'chart'], ['ekonomi', 'Ekonomi', 'wallet'], ['minne', 'AI-minne', 'brain']]],
    ['Inställningar', [['integrationer', 'Integrationer', 'plug'], ['konto', 'Konto', 'user']]]
  ];
  var VIEWS = {};
  NAV.forEach(function (g) { g[1].forEach(function (v) { VIEWS[v[0]] = v[1]; }); });

  function renderShell() {
    root.innerHTML = '<div class="shell" id="shell"><aside class="side"><a class="brand" href="../index.html">' + MARK + 'Elevate Studio</a><nav class="side__nav">' +
      NAV.map(function (g) {
        var items = g[1].filter(function (v) { return allowed(v[0]); });
        return !items.length ? '' : '<small>' + g[0] + '</small>' + items.map(function (v) { return '<button class="nav" data-view="' + v[0] + '">' + ICON[v[2]] + v[1] + '</button>'; }).join('');
      }).join('') + '</nav>' +
      '<div class="side__foot"><div class="side__me"><b>' + esc(me()) + '</b><br>' + esc(st.user.email) + '</div><a class="nav" href="../index.html">' + ICON.site + 'Till hemsidan</a><button class="nav" id="logout">' + ICON.out + 'Logga ut</button></div></aside>' +
      '<div><div class="top"><button id="menu" aria-label="Meny">' + ICON.menu + '</button><span class="brand">' + MARK + 'Admin</span></div><main id="main"></main></div></div>';
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.view); });
    });
    $('#logout').addEventListener('click', function () { sb.auth.signOut().then(function () { st.user = null; history.replaceState(null, '', location.pathname); renderLogin(); }); });
    $('#menu').addEventListener('click', function () { $('#shell').classList.toggle('is-menu'); });
  }
  function go(view) {
    st.view = view; $('#shell').classList.remove('is-menu');
    history.replaceState(null, '', '#' + view); window.scrollTo(0, 0); render();
  }

  function loadLeads() {
    $('#main').innerHTML = '<p class="empty">Hämtar leads …</p>';
    return sb.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(2000).then(function (r) {
      if (r.error) { $('#main').innerHTML = '<p class="empty">Kunde inte hämta leads: ' + esc(r.error.message) + '</p>'; return; }
      st.leads = (r.data || []).filter(function (l) { return !myTag() || ownerOf(l) === myTag(); });
      render();
    });
  }

  function render() {
    root.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === st.view); });
    if (!allowed(st.view)) st.view = 'leads';
    var fn = PAGES[st.view];
    if (fn) return fn();
    renderLeads();
  }

  /* ---------- Leads ---------- */
  function filtered() {
    var q = st.q.toLowerCase();
    var rows = st.leads.filter(function (l) {
      if (st.status !== 'all' && (l.status || 'new') !== st.status) return false;
      if (!q) return true;
      return [l.name, l.company, l.email, l.phone, l.service_type, l.admin_notes].some(function (v) { return v && String(v).toLowerCase().indexOf(q) > -1; });
    });
    var key = st.sort.indexOf('booking') === 0 ? 'booking_at' : 'created_at', asc = /asc$/.test(st.sort);
    return rows.sort(function (a, b) {
      var x = a[key] ? Date.parse(a[key]) : (asc ? Infinity : -Infinity), y = b[key] ? Date.parse(b[key]) : (asc ? Infinity : -Infinity);
      return asc ? x - y : y - x;
    });
  }

  function renderLeads() {
    var now = Date.now(), week = 7 * 864e5, L = st.leads;
    var newWeek = L.filter(function (l) { return now - Date.parse(l.created_at) < week; }).length;
    var open = L.filter(function (l) { return CLOSED.indexOf(l.status || 'new') < 0; }).length;
    var meetings = L.filter(function (l) { var t = l.booking_at && Date.parse(l.booking_at); return t && t >= now && t - now < week; }).length;
    var sold30 = L.filter(function (l) { return l.status === 'sold' && l.sold_at && now - Date.parse(l.sold_at) < 30 * 864e5; })
      .reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0);
    var counts = {}; L.forEach(function (l) { var k = l.status || 'new'; counts[k] = (counts[k] || 0) + 1; });
    var rows = filtered();
    $('#main').innerHTML =
      '<div class="page-h"><div><h1>Leads <span class="serif">&amp; förfrågningar</span></h1><p>Alla som hört av sig. Byt status och skriv kommentarer direkt i listan.</p></div></div>' + quickBar() +
      '<div class="kpis"><div class="kpi"><small>Nya senaste 7 dagarna</small><b>' + newWeek + '</b></div><div class="kpi"><small>Öppna leads</small><b>' + open +
      '</b></div><div class="kpi"><small>Möten kommande 7 dagar</small><b>' + meetings + '</b></div><div class="kpi"><small>Sålt senaste 30 dagar</small><b>' + kr(sold30) + '</b></div></div>' +
      '<div class="bar"><input class="input" id="q" placeholder="Sök namn, företag, mejl, kommentar …" value="' + esc(st.q) + '">' +
      '<select class="input" id="sort"><option value="created_desc">Nyast först</option><option value="created_asc">Äldst först</option><option value="booking_asc">Möte: närmast</option><option value="booking_desc">Möte: senast</option></select></div>' +
      '<div class="chips"><button class="chip' + (st.status === 'all' ? ' is-on' : '') + '" data-s="all">Alla <em>' + L.length + '</em></button>' +
      STATUS.map(function (s) { return '<button class="chip' + (st.status === s[0] ? ' is-on' : '') + '" data-s="' + s[0] + '"><i style="background:' + s[2] + '"></i>' + s[1] + (counts[s[0]] ? ' <em>' + counts[s[0]] + '</em>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="list">' + (rows.slice(0, st.shown).map(card).join('') || '<p class="empty">Inga leads här.</p>') + '</div>' +
      (rows.length > st.shown ? '<button class="btn btn--ghost more" id="more">Visa fler (' + (rows.length - st.shown) + ' kvar)</button>' : '');
    $('#sort').value = st.sort;
    $('#q').addEventListener('input', function (e) { st.q = e.target.value; st.shown = 40; var pos = e.target.selectionStart; renderLeads(); var n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); });
    $('#sort').addEventListener('change', function (e) { st.sort = e.target.value; renderLeads(); });
    root.querySelectorAll('[data-s]').forEach(function (b) { b.addEventListener('click', function () { st.status = b.dataset.s; st.shown = 40; renderLeads(); }); });
    if ($('#more')) $('#more').addEventListener('click', function () { st.shown += 40; renderLeads(); });
    root.querySelectorAll('.lead').forEach(bindCard);
    bindQuick();
  }

  function card(l) {
    var s = sInfo(l.status || 'new');
    var when = l.booking_at ? dt(l.booking_at) : (l.preferred_time || '–');
    var editing = st.editing === l.id;
    return '<article class="lead" data-id="' + l.id + '" style="--c:' + s[2] + '">' +
      '<div class="lead__top"><div><h3 class="lead__name">' + esc(l.name) + (l.company ? ' <span>· ' + esc(l.company) + '</span>' : '') + (ownerOf(l) ? ' <em class="owner">' + esc(ownerOf(l)) + 's lead</em>' : '') + '</h3>' +
      '<p class="lead__meta">' + esc(MEETING[l.meeting_type] || l.meeting_type || 'Förfrågan') + ' · ' + dt(l.created_at) + '</p></div>' +
      '<div class="lead__acts"><button class="btn btn--ghost btn--sm" data-a="detail">Detaljer</button><button class="btn btn--ghost btn--sm" data-a="offer">Skapa offert</button>' +
      '<select class="status" data-a="status" style="color:' + s[2] + '">' + STATUS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === s[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="lead__grid"><div><span>E-post:</span> ' + (l.email ? '<button type="button" class="link link--inline" data-a="mail">' + esc(l.email) + '</button>' : '–') + '</div>' +
      '<div><span>Telefon:</span> ' + (l.phone ? '<a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a>' : '–') + '</div>' +
      '<div><span>Bransch:</span> ' + esc(l.service_type || '–') + '</div><div><span>Tid:</span> ' + esc(when) + '</div>' +
      (l.followup_at ? '<div><span>Ring upp:</span> ' + dt(l.followup_at) + '</div>' : '') +
      (l.sold_amount != null ? '<div><span>Såld för:</span> <b>' + kr(l.sold_amount) + '</b></div>' : '') + '</div>' +
      (editing
        ? '<div class="note-edit"><textarea class="input" rows="3" data-a="note-text" placeholder="Skriv en kommentar …">' + esc(noteOf(l)) + '</textarea>' +
          '<div class="note-edit__row"><button class="btn btn--ghost btn--sm" data-a="note-cancel">Avbryt</button><button class="btn btn--sm" data-a="note-save">Spara kommentar</button></div></div>'
        : '<button class="note' + (noteOf(l) ? '' : ' is-empty') + '" data-a="note">' + ICON.msg + '<span>' + (noteOf(l) ? esc(noteOf(l)) : 'Lägg till kommentar …') + '</span></button>') +
      '</article>';
  }

  function lead(id) { return st.leads.find(function (l) { return l.id === id; }); }
  function update(id, patch) {
    return sb.from('quote_requests').update(patch).eq('id', id).select().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Ändringen sparades inte – saknar kontot admin-behörighet?');
      Object.assign(lead(id), r.data[0]);
    });
  }

  function bindCard(el) {
    var id = el.dataset.id, l = lead(id);
    el.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]');
      if (!a) { if (!e.target.closest('a, select, textarea, button')) openLead(l); return; }
      var act = a.dataset.a;
      if (act === 'detail') openLead(l);
      if (act === 'offer') openOffer(l);
      if (act === 'mail') composeMail(l);
      if (act === 'note') { st.editing = id; renderLeads(); var t = $('.lead[data-id="' + id + '"] textarea'); if (t) t.focus(); }
      if (act === 'note-cancel') { st.editing = null; renderLeads(); }
      if (act === 'note-save') {
        var text = $('textarea', el).value;
        update(id, { admin_notes: withOwner(ownerOf(lead(id)), text) }).then(function () { st.editing = null; renderLeads(); toast('Kommentaren är sparad'); })
          .catch(function (err) { toast(err.message); });
      }
    });
    $('[data-a="status"]', el).addEventListener('change', function (e) {
      var v = e.target.value;
      if (v === 'sold') return openSold(l);
      update(id, { status: v }).then(function () { renderLeads(); toast('Status: ' + sInfo(v)[1]); }).catch(function (err) { toast(err.message); renderLeads(); });
    });
  }

  /* ---------- Dialogs ---------- */
  function dialog(html, onMount) {
    var d = document.createElement('div'); d.className = 'dlg';
    d.innerHTML = '<div class="dlg__box' + (dialog.wide ? ' dlg__box--wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    dialog.wide = false;
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.remove(); });
    document.body.appendChild(d);
    if (onMount) onMount(d);
    return d;
  }

  function openSold(l) {
    dialog('<h2>Markera som såld</h2><p>' + esc(l.name) + (l.company ? ' · ' + esc(l.company) : '') + '</p>' +
      '<label class="field">Belopp (kr)<input class="input" type="number" min="0" step="1" id="amount" placeholder="t.ex. 6000"></label>' +
      '<div class="dlg__row"><button class="btn btn--ghost" data-close>Avbryt</button><button class="btn" id="save-sold">Spara som såld</button></div>',
      function (d) {
        d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) render(); });
        $('#amount', d).focus();
        $('#save-sold', d).addEventListener('click', function () {
          var amount = Number($('#amount', d).value) || null;
          update(l.id, { status: 'sold', sold_amount: amount, sold_at: new Date().toISOString() })
            .then(function () { d.remove(); render(); openReview(l); })
            .catch(function (err) { toast(err.message); });
        });
      });
  }

  function openReview(l) {
    var who = me();
    dialog('<div class="star">' + ICON.star + '</div><h2>Grattis till affären!</h2><p>Be ' + esc(l.company || l.name) + ' om en recension på Google – nu direkt eller om en vecka.</p>' +
      '<div class="field">Mejlet skickas från<div class="who">' + TEAM.map(function (t) { return '<button class="chip' + (t[1] === who ? ' is-on' : '') + '" data-who="' + t[1] + '">' + t[0] + '</button>'; }).join('') +
      '<button class="chip' + (who === 'Elevate Studio' ? ' is-on' : '') + '" data-who="Elevate Studio">Elevate Studio</button></div></div>' +
      '<div class="stack"><button class="btn" id="mail"' + (l.email ? '' : ' disabled') + '>' + ICON.mail + 'Skicka mejl för att recensera' + (l.email ? '' : ' (e-post saknas)') + '</button>' +
      '<button class="btn btn--ghost" id="remind">' + ICON.bell + 'Påminn mig om en vecka</button><button class="btn btn--ghost" data-close style="justify-content:center">Inte nu</button></div>',
      function (d) {
        d.querySelectorAll('[data-who]').forEach(function (b) {
          b.addEventListener('click', function () { who = b.dataset.who; d.querySelectorAll('[data-who]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
        });
        $('#mail', d).addEventListener('click', function (e) {
          var btn = e.currentTarget; btn.disabled = true;
          sendMail({ action: 'review', lead_id: l.id, sender: senderKey(who) }).then(function () {
            d.remove(); toast('Recensionsmejlet är skickat från ' + GMAIL);
          }, function (err) { btn.disabled = false; toast('Kunde inte skicka: ' + err.message); });
        });
        $('#remind', d).addEventListener('click', function () {
          var s = new Date(); s.setDate(s.getDate() + 7); s.setHours(9, 0, 0, 0);
          sb.from('calendar_activities').insert({
            title: 'Be ' + (l.company || l.name) + ' om en recension', category: 'reminder',
            description: ['Kontakt: ' + l.name, l.email ? 'E-post: ' + l.email : '', l.phone ? 'Telefon: ' + l.phone : ''].filter(Boolean).join('\n'),
            starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 15 * 6e4).toISOString(), link: '/admin', created_by: st.user.id
          }).then(function (r) {
            if (r.error) return toast(r.error.message);
            d.remove(); toast('Påminnelse inlagd ' + s.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }) + ' kl. 09:00');
          });
        });
      });
  }

  function openOffer(l) {
    var O = window.ElevateOffer, today = new Date(), iso = function (x) { return x.toISOString().slice(0, 10); };
    var fees = O.PACKAGE_FEES[l.selected_package] || O.PACKAGE_FEES.starter;
    var start = l.selected_package === 'elite' && l.estimated_start_cost ? l.estimated_start_cost : fees.start;
    var no = iso(today).slice(2).replace(/-/g, '') + '-' + l.id.slice(0, 4).toUpperCase();
    var f = function (id, label, val, type) { return '<label class="field">' + label + '<input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '"></label>'; };
    dialog('<h2>Skapa offert</h2><p>Samma offert som på hemsidan, ifylld för ' + esc(l.company || l.name) + '.</p>' +
      '<div class="grid3">' + f('o-no', 'Offert nr', no) + f('o-date', 'Datum', iso(today), 'date') + f('o-valid', 'Giltig till', iso(new Date(today.getTime() + 30 * 864e5)), 'date') + '</div>' +
      '<div class="grid3">' + f('o-rep', 'Vår företrädare', '') + f('o-cust', 'Beställare', l.company || l.name) + f('o-crep', 'Beställarens företrädare', l.name) + '</div>' +
      '<div class="grid2">' + f('o-start', 'Startavgift (kr, exkl. moms)', start, 'number') + f('o-year', 'Årsavgift (kr/år)', fees.yearly, 'number') + '</div>' +
      '<label class="field">I uppdraget ingår (en rad per punkt)<textarea class="input" id="o-scope" rows="6">' + esc(O.DEFAULT_SCOPE.join('\n')) + '</textarea></label>' +
      '<div class="dlg__row"><button class="btn btn--ghost" data-close>Avbryt</button><button class="btn" id="o-go">Ladda ner offert</button></div>',
      function (d) {
        $('#o-go', d).addEventListener('click', function (e) {
          var b = e.target; b.disabled = true; b.textContent = 'Skapar …';
          var v = function (id) { return $('#' + id, d).value; };
          O.buildQuotePdf({
            offerNo: v('o-no'), date: v('o-date'), validUntil: v('o-valid'), producerRep: v('o-rep'), customer: v('o-cust'), customerRep: v('o-crep'),
            startFee: Number(v('o-start')) || 0, yearlyFee: Number(v('o-year')) || 0,
            scope: v('o-scope').split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
          }).then(function (doc) { doc.save(O.quotePdfFilename(v('o-cust'))); d.remove(); })
            .catch(function (err) { toast(err.message); b.disabled = false; b.textContent = 'Ladda ner offert'; });
        });
      });
  }

  /* ---------- Shared helpers for the pages ---------- */
  var CUSTOMER = { lead: 'Lead', prospect: 'Blivande kund', active: 'Aktiv kund', paused: 'Pausad', former: 'Tidigare kund', internal: 'Intern' };
  var CATEGORY = { meeting: 'Möte', call: 'Samtal', task: 'Uppgift', deadline: 'Deadline', reminder: 'Påminnelse', personal: 'Personligt', other: 'Övrigt' };
  var SCOPE = { foretag: 'Företaget', operativt: 'Hur vi jobbar', profil: 'Personligt' };
  var main = function () { return $('#main'); };
  function head(title, sub, actions) {
    return '<div class="page-h"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="page-h__acts">' + actions + '</div>' : '') + '</div>';
  }
  function kpis(list) { return '<div class="kpis">' + list.map(function (k) { return '<div class="kpi"><small>' + k[0] + '</small><b>' + k[1] + '</b></div>'; }).join('') + '</div>'; }
  function info(title, text) { return '<div class="info"><b>' + title + '</b><p>' + text + '</p></div>'; }
  function table(cols, rows, rowAttr) {
    if (!rows.length) return '<p class="empty">Inget här än.</p>';
    return '<div class="tbl"><table><thead><tr>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr' + (rowAttr ? ' ' + rowAttr(r) : '') + '>' + cols.map(function (c) { return '<td>' + c[1](r) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function bars(title, pairs, total) {
    var max = Math.max.apply(null, pairs.map(function (p) { return p[1]; }).concat([1]));
    return '<section class="panel"><h3>' + title + '</h3>' + (pairs.length ? pairs.map(function (p) {
      return '<div class="barrow"><span>' + esc(p[0]) + '</span><i style="--w:' + Math.round(p[1] / max * 100) + '%"></i><b>' + p[1] + (total ? ' <em>' + Math.round(p[1] / total * 100) + ' %</em>' : '') + '</b></div>';
    }).join('') : '<p class="empty">Ingen data.</p>') + '</section>';
  }
  function countBy(rows, fn, limit) {
    var c = {}; rows.forEach(function (r) { var k = fn(r); if (k) c[k] = (c[k] || 0) + 1; });
    return Object.keys(c).map(function (k) { return [k, c[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, limit || 8);
  }
  function fetchRows(query, render) {
    main().insertAdjacentHTML('beforeend', '<p class="empty" id="loading">Hämtar …</p>');
    var view = st.view;
    return query.then(function (r) {
      if (st.view !== view) return;
      var l = $('#loading'); if (l) l.remove();
      if (r.error) { main().insertAdjacentHTML('beforeend', '<p class="empty">Kunde inte hämta: ' + esc(r.error.message) + '</p>'); return; }
      render(r.data || []);
    });
  }
  function form(fields) {
    return fields.map(function (f) {
      var v = f.value == null ? '' : f.value;
      if (f.type === 'textarea') return '<label class="field">' + f.label + '<textarea class="input" rows="' + (f.rows || 3) + '" name="' + f.name + '">' + esc(v) + '</textarea></label>';
      if (f.options) return '<label class="field">' + f.label + '<select class="input" name="' + f.name + '">' + Object.keys(f.options).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + f.options[k] + '</option>'; }).join('') + '</select></label>';
      return '<label class="field">' + f.label + '<input class="input" name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + esc(v) + '"' + (f.required ? ' required' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '></label>';
    }).join('');
  }
  function formDialog(title, sub, fields, save, extra) {
    dialog('<form id="fd"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + form(fields) +
      '<div class="dlg__row">' + (extra || '') + '<button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">Spara</button></div></form>', function (d) {
      $('#fd', d).addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {}; fields.forEach(function (f) { var v = e.target.elements[f.name].value.trim(); data[f.name] = v === '' ? null : v; });
        var btn = $('button[type=submit]', d); btn.disabled = true;
        Promise.resolve(save(data, d)).then(function (r) {
          if (r && r.error) throw r.error;
          d.remove(); render();
        }).catch(function (err) { btn.disabled = false; toast(err.message); });
      });
    });
  }
  var localInput = function (iso) { if (!iso) return ''; var d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  var fromLocal = function (v) { return v ? new Date(v).toISOString() : null; };
  var day = function (iso) { return iso ? new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'; };
  var since = function (days) { return new Date(Date.now() - days * 864e5).toISOString(); };

  /* ---------- Quick actions above the leads (like the old admin) ---------- */
  var QUICK = [['newlead', 'Ny lead', 'inbox', true], ['campaign', 'Nytt mejlutskick', 'send'], ['meeting', 'Boka möte', 'cal'], ['offer', 'Ny offert', 'file'],
    ['contact', 'Ny kontakt', 'users'], ['activity', 'Ny aktivitet', 'bell'], ['csv', 'Exportera CSV', 'chart']];
  function quickBar() {
    var limited = !allowed('utskick');
    return '<div class="quick">' + QUICK.filter(function (q) { return !limited || ['newlead', 'meeting', 'offer', 'activity'].indexOf(q[0]) >= 0; }).map(function (q) { return '<button class="btn btn--sm' + (q[3] ? '' : ' btn--ghost') + '" data-q="' + q[0] + '">' + ICON[q[2]] + q[1] + '</button>'; }).join('') + '</div>';
  }
  function bindQuick() {
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = b.dataset.q;
        if (q === 'newlead') newLead();
        if (q === 'campaign') newCampaign();
        if (q === 'meeting') bookMeeting();
        if (q === 'offer') openOffer({ id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), name: '', company: '' });
        if (q === 'contact') contactDialog();
        if (q === 'activity') newActivity();
        if (q === 'csv') exportCsv();
      });
    });
  }

  function newLead() {
    formDialog('Ny lead', 'Lägg in en kund som hört av sig på telefon, mejl eller i person.', [
      { name: 'name', label: 'Namn', required: true }, { name: 'company', label: 'Företag' },
      { name: 'email', label: 'E-post', type: 'email', required: true }, { name: 'phone', label: 'Telefon' },
      { name: 'service_type', label: 'Bransch' }, { name: 'status', label: 'Status', options: STATUS.reduce(function (o, s) { o[s[0]] = s[1]; return o; }, {}), value: 'new' },
      { name: 'message', label: 'Vad vill de ha?', type: 'textarea' }
    ], function (v) {
      return sb.from('quote_requests').insert(Object.assign(v, { meeting_type: 'manual', admin_notes: withOwner(myTag(), '') })).select().then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data[0]) st.leads.unshift(r.data[0]);
        toast('Leaden är tillagd');
      });
    });
  }

  function exportCsv() {
    var cols = [['Namn', 'name'], ['Företag', 'company'], ['E-post', 'email'], ['Telefon', 'phone'], ['Bransch', 'service_type'], ['Status', 'status'], ['Inkom', 'created_at'], ['Bokat möte', 'booking_at'], ['Såld för', 'sold_amount'], ['Kommentar', 'admin_notes']];
    var cell = function (v) { v = v == null ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = '﻿' + cols.map(function (c) { return c[0]; }).join(';') + '\n' + filtered().map(function (l) {
      return cols.map(function (c) { return cell(c[1] === 'status' ? sInfo(l.status || 'new')[1] : l[c[1]]); }).join(';');
    }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'leads-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
    toast('Exporterade ' + filtered().length + ' leads');
  }

  /* Mail campaign: pick a group, write the mail. Sent from info@ when the mail function is live. */
  function newCampaign() {
    var groups = { marketing: 'Kontakter som sagt ja till utskick', customers: 'Aktiva kunder', contacts: 'Alla kontakter', leads: 'Alla leads' };
    STATUS.forEach(function (s) { groups['status:' + s[0]] = 'Leads med status: ' + s[1]; });
    var contacts = null, list = [];
    dialog('<form id="cp"><h2>Nytt mejlutskick</h2><p>' + 'Skickas från ' + GMAIL + ' i den gröna designen, ett mejl per mottagare (högst 200 åt gången).' + '</p>' +
      form([{ name: 'group', label: 'Till', options: groups, value: 'marketing' }]) + '<p class="small muted" id="cp-count" style="margin:-6px 0 14px">Räknar …</p>' +
      form([{ name: 'subject', label: 'Ämne', required: true }, { name: 'headline', label: 'Rubrik i mejlet' }, { name: 'body', label: 'Text', type: 'textarea', rows: 7, required: true },
        { name: 'button_label', label: 'Knapptext (valfri)', placeholder: 'Läs mer' }, { name: 'button_url', label: 'Knapplänk (valfri)', type: 'url', placeholder: 'https://elevatestudio.nu/' }]) +
      '<div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">' + ICON.send + 'Skicka</button></div></form>', function (d) {
      var f = $('#cp', d);
      var count = function () {
        var g = f.elements.group.value, seen = {};
        var add = function (email, name) { email = (email || '').trim().toLowerCase(); if (email && !seen[email]) { seen[email] = 1; list.push({ email: email, name: name || '' }); } };
        list = [];
        if (g === 'leads' || g.indexOf('status:') === 0) {
          st.leads.forEach(function (l) { if (g === 'leads' || (l.status || 'new') === g.slice(7)) add(l.email, l.name); });
        } else {
          (contacts || []).forEach(function (c) {
            if (c.unsubscribed_at) return;
            if (g === 'marketing' && !c.allow_marketing_email) return;
            if (g === 'customers' && c.customer_status !== 'active') return;
            add(c.email, c.full_name);
          });
        }
        $('#cp-count', d).textContent = contacts === null && g.indexOf('status:') && g !== 'leads' ? 'Räknar …' : list.length + ' mottagare';
      };
      sb.from('contacts').select('email,full_name,customer_status,allow_marketing_email,unsubscribed_at').is('archived_at', null).not('email', 'is', null).limit(5000)
        .then(function (r) { contacts = r.data || []; count(); });
      f.elements.group.addEventListener('change', count); count();
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!list.length) return toast('Inga mottagare i den gruppen.');
        var v = function (n) { return f.elements[n].value.trim(); };
        var c = { subject: v('subject'), headline: v('headline') || v('subject'), body: v('body'), button_label: v('button_label') || null, button_url: v('button_url') || null };
        var log = function (sent) {
          return sb.from('email_campaigns').insert({ internal_name: c.subject, subject: c.subject, headline: c.headline, body: c.body, button_label: c.button_label, button_url: c.button_url,
            status: 'sent', recipient_count: list.length, sent_count: sent, sent_at: new Date().toISOString(), sent_by: st.user.id, created_by: st.user.id,
            from_email: GMAIL, from_name: 'Elevate Studio', audience: { group: f.elements.group.value } }).then(function () {});
        };
        if (!confirm('Skicka utskicket till ' + list.length + ' mottagare från ' + GMAIL + '?')) return;
        var btn = $('button[type=submit]', d); btn.disabled = true; btn.textContent = 'Skickar …';
        sendMail(Object.assign({ action: 'campaign', recipients: list.slice(0, 200) }, c)).then(function (r) {
          log(r.sent || 0); d.remove(); toast('Utskicket är skickat till ' + (r.sent || 0) + ' av ' + list.length + ' mottagare från ' + GMAIL);
        }, function (err) { btn.disabled = false; btn.textContent = 'Skicka'; toast('Kunde inte skicka: ' + err.message); });
      });
    });
  }

  /* Book a meeting with a lead: sets the time on the lead, puts it in the calendar and (when live) mails the invite from info@. */
  function bookMeeting(l) {
    var open = st.leads.filter(function (x) { return CLOSED.indexOf(x.status || 'new') < 0 || (l && x.id === l.id); });
    var leads = {}; open.forEach(function (x) { leads[x.id] = (x.company ? x.company + ' – ' : '') + x.name; });
    var t = new Date(Date.now() + 864e5); t.setHours(10, 0, 0, 0);
    var hosts = { '': 'Elevate Studio' }; TEAM.forEach(function (m) { hosts[m[0].toLowerCase()] = m[1]; });
    var types = { google_meet: 'Google Meet', teams: 'Microsoft Teams', phone: 'Telefonmöte', visit: 'Fysiskt möte' };
    dialog('<form id="bm"><h2>Boka möte</h2><p>Mötet hamnar på leaden och i kalendern.</p>' +
      form([{ name: 'lead', label: 'Kund', options: leads, value: l ? l.id : '' }]) + '<div class="grid2">' +
      form([{ name: 'at', label: 'Tid', type: 'datetime-local', value: localInput(t.toISOString()), required: true }, { name: 'minutes', label: 'Längd (minuter)', type: 'number', value: 30 },
        { name: 'type', label: 'Typ', options: types, value: 'google_meet' }, { name: 'host', label: 'Värd', options: hosts, value: senderKey(me()) }]) + '</div>' +
      form([{ name: 'link', label: 'Möteslänk eller adress', placeholder: 'Tomt vid Google Meet – länken skapas automatiskt' }, { name: 'message', label: 'Meddelande till kunden', type: 'textarea' }]) +
      '<label class="check"><input type="checkbox" name="send" checked> Skicka inbjudan till kunden från ' + GMAIL + '</label>' +
      '<div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">Boka</button></div></form>', function (d) {
      $('#bm', d).addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = function (n) { return f.elements[n].value.trim(); };
        var x = lead(v('lead')); if (!x) return toast('Välj en kund.');
        var at = new Date(v('at')), mins = Number(v('minutes')) || 30, host = v('host'), type = v('type');
        var hostName = hosts[host], when = at.toLocaleString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
        var btn = $('button[type=submit]', d); btn.disabled = true; btn.textContent = 'Bokar …';
        var send = f.elements.send.checked, auto = type === 'google_meet' && !v('link');
        // The server makes the Google Meet link (when none is given) and mails the invite from Gmail – no mail program opens
        var server = !send && !auto ? Promise.resolve({ how: 'booked' }) : sb.auth.getSession().then(function (r) {
          var token = r.data && r.data.session && r.data.session.access_token;
          return fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ lead_id: x.id, at: at.toISOString(), minutes: mins, type: types[type], link: v('link'), message: v('message'), sender: host, send: send, auto_meet: auto }) });
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (b) {
            if (res.ok) return { how: b.sent === false ? 'booked' : 'sent', link: b.link };
            if (b.error === 'not_configured') return { how: 'not_configured' };
            if (b.error === 'google_not_configured') return { how: 'no_google' };
            return { how: 'failed', why: b.error === 'auth' ? 'Du behöver logga in igen.' : b.error || res.status };
          });
        }).catch(function () { return { how: 'failed', why: 'Servern svarade inte.' }; });
        server.then(function (out) {
          var link = v('link') || out.link || null;
          return update(x.id, { booking_at: at.toISOString(), status: 'meeting_booked', meeting_type: type === 'visit' ? 'quote' : type }).then(function () {
            return Promise.all([
              sb.from('calendar_activities').insert({ title: 'Möte: ' + (x.company || x.name), category: 'meeting', starts_at: at.toISOString(), ends_at: new Date(at.getTime() + mins * 6e4).toISOString(),
                location: link, description: [types[type], 'Värd: ' + hostName, x.email, x.phone].filter(Boolean).join('\n'), link: '/admin', created_by: st.user.id }),
              sb.from('meeting_invites').insert({ quote_request_id: x.id, booking_at: at.toISOString(), duration_min: mins, meet_link: link, recipients: [x.email], recipient_name: x.name,
                subject: 'Möte med Elevate Studio', message: v('message') || null, created_by: st.user.id })
            ]);
          }).then(function () { return out; });
        }).then(function (out) {
          d.remove(); render();
          var meet = out.link ? ' Meet-länken är skapad och mötet ligger i Elevates Google Kalender.' : '';
          if (out.how === 'sent') return toast('Mötet är bokat och inbjudan skickad från ' + GMAIL + '.' + meet);
          if (out.how === 'not_configured') return toast('Mötet är bokat. Inbjudan skickades inte – Gmail är inte kopplat än (se Integrationer).');
          if (out.how === 'no_google') return toast('Mötet är bokat, men inget skickades: Google Kalender är inte kopplat än, så Meet-länken kunde inte skapas (se Integrationer).');
          if (out.how === 'failed') return toast('Mötet är bokat, men inbjudan kunde inte skickas: ' + out.why);
          toast('Mötet är bokat.' + meet);
        }).catch(function (err) { btn.disabled = false; btn.textContent = 'Boka'; toast(err.message); });
      });
    });
  }

  /* Write a mail in the admin; it goes out from the Elevate Gmail in the green design with the sender's card */
  function composeMail(to) {
    if (!to || !to.email) return toast('E-postadress saknas.');
    var who = me();
    dialog('<form id="cm"><h2>Nytt mejl</h2><p>Till ' + esc(to.name || '') + ' &lt;' + esc(to.email) + '&gt; · skickas från ' + GMAIL + '</p>' +
      '<div class="field">Från<div class="who">' + TEAM.map(function (t) { return '<button type="button" class="chip' + (t[1] === who ? ' is-on' : '') + '" data-who="' + t[1] + '">' + t[0] + '</button>'; }).join('') +
      '<button type="button" class="chip' + (who === 'Elevate Studio' ? ' is-on' : '') + '" data-who="Elevate Studio">Elevate Studio</button></div></div>' +
      form([{ name: 'subject', label: 'Ämne', required: true }, { name: 'body', label: 'Meddelande', type: 'textarea', rows: 8 },
        { name: 'button_label', label: 'Knapptext (valfri)', placeholder: 'Se offerten' }, { name: 'button_url', label: 'Knapplänk (valfri)', type: 'url', placeholder: 'https://' }]) +
      '<p class="small muted" style="margin:-4px 0 0">Mejlet får den gröna designen med avsändarens kontaktkort. Svar kommer till ' + GMAIL + '.</p>' +
      '<div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">' + ICON.send + 'Skicka</button></div></form>', function (d) {
      d.querySelectorAll('[data-who]').forEach(function (b) {
        b.addEventListener('click', function () { who = b.dataset.who; d.querySelectorAll('[data-who]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
      });
      var f = $('#cm', d);
      f.elements.body.required = true;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = function (n) { return f.elements[n].value.trim(); }, btn = $('button[type=submit]', d);
        btn.disabled = true; btn.textContent = 'Skickar …';
        sendMail({ action: 'message', lead_id: to.id || undefined, email: to.id ? undefined : to.email, name: to.name, sender: senderKey(who),
          subject: v('subject'), body: v('body'), button_label: v('button_label') || undefined, button_url: v('button_url') || undefined })
          .then(function () { d.remove(); toast('Mejlet är skickat från ' + GMAIL); },
            function (err) { btn.disabled = false; btn.textContent = 'Skicka'; toast('Kunde inte skicka: ' + err.message); });
      });
      f.elements.subject.focus();
    });
  }

  /* ---------- Big lead window (like the old admin) ---------- */
  function openLead(l) {
    var s = sInfo(l.status || 'new');
    var addons = Array.isArray(l.selected_addons) ? l.selected_addons : (l.selected_addons && typeof l.selected_addons === 'object' ? Object.keys(l.selected_addons).filter(function (k) { return l.selected_addons[k]; }) : []);
    var addonName = function (x) { return typeof x === 'string' ? x : (x && (x.name || x.label || x.title)) || JSON.stringify(x); };
    var row = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + v + '</dd>' : ''; };
    dialog.wide = true;
    dialog('<div class="ld"><header class="ld__head" style="--c:' + s[2] + '"><div><p class="ld__kicker">' + esc(MEETING[l.meeting_type] || 'Förfrågan') + ' · inkom ' + dt(l.created_at) + '</p>' +
      '<h2>' + esc(l.name) + (l.company ? ' <span>· ' + esc(l.company) + '</span>' : '') + '</h2></div>' +
      '<div class="ld__headacts"><select class="status" id="ld-status" style="color:' + s[2] + '">' + STATUS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === s[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<button class="iconbtn" data-close aria-label="Stäng">' + ICON.x + '</button></div></header>' +
      '<div class="ld__quick">' + (l.phone ? '<a class="btn btn--ghost btn--sm" href="tel:' + esc(l.phone) + '">' + ICON.phone + 'Ring</a>' : '') +
      (l.email ? '<button class="btn btn--ghost btn--sm" id="ld-mail">' + ICON.mail + 'Mejla</button>' : '') +
      '<button class="btn btn--ghost btn--sm" id="ld-meet">' + ICON.cal + 'Boka möte</button><button class="btn btn--ghost btn--sm" id="ld-offer">' + ICON.file + 'Skapa offert</button>' +
      (l.status === 'sold' ? '<button class="btn btn--sm" id="ld-review">' + ICON.star + 'Be om recension</button>' : '<button class="btn btn--sm" id="ld-sold">' + ICON.star + 'Markera som såld</button>') + '</div>' +
      '<div class="ld__cols"><div>' +
      '<section class="panel"><h3>Kontaktuppgifter</h3><form id="ld-form"><div class="grid2">' +
      form([{ name: 'name', label: 'Namn', value: l.name, required: true }, { name: 'company', label: 'Företag', value: l.company },
        { name: 'email', label: 'E-post', value: l.email, type: 'email', required: true }, { name: 'phone', label: 'Telefon', value: l.phone },
        { name: 'service_type', label: 'Bransch', value: l.service_type }, { name: 'company_type', label: 'Företagsform', value: l.company_type },
        { name: 'booking_at', label: 'Bokat möte', value: localInput(l.booking_at), type: 'datetime-local' }, { name: 'followup_at', label: 'Ring upp', value: localInput(l.followup_at), type: 'datetime-local' }]) +
      '</div><div class="ld__save"><button class="btn btn--sm" type="submit">Spara ändringar</button></div></form></section>' +
      ((l.message || l.project_description) ? '<section class="panel"><h3>Meddelande</h3>' + (l.message ? '<div class="box">' + esc(l.message) + '</div>' : '') +
        (l.project_description ? '<p class="panel__sub">Projektbeskrivning</p><div class="box">' + esc(l.project_description) + '</div>' : '') + '</section>' : '') +
      '<section class="panel"><h3>Valda tjänster</h3><dl class="dl">' +
      row('Paket', l.selected_package && esc(l.selected_package)) + row('Tillägg', addons.length && addons.map(function (x) { return '<span class="tag">' + esc(addonName(x)) + '</span>'; }).join(' ')) +
      row('Startkostnad', l.estimated_start_cost != null && kr(l.estimated_start_cost)) + row('Månadskostnad', l.estimated_monthly_cost != null && kr(l.estimated_monthly_cost) + '/mån') +
      row('Önskad tid', l.preferred_time && esc(l.preferred_time)) + row('Mötesutfall', l.meeting_outcome && esc(l.meeting_outcome)) +
      row('Såld för', l.sold_amount != null && '<b>' + kr(l.sold_amount) + '</b>' + (l.sold_at ? ' · ' + day(l.sold_at) : '')) +
      row('Faktura', l.stripe_invoice_status && (esc(l.stripe_invoice_status) + (l.stripe_invoice_url ? ' · <a href="' + esc(l.stripe_invoice_url) + '" target="_blank" rel="noopener">Öppna</a>' : ''))) +
      '</dl>' + (!l.selected_package && !addons.length && l.estimated_start_cost == null ? '<p class="muted">Inga tjänster valda i formuläret.</p>' : '') + '</section>' +
      '</div><div>' +
      '<section class="panel"><h3>Kommentar</h3><textarea class="input" id="ld-note" rows="3" placeholder="Snabb kommentar som syns i listan …">' + esc(noteOf(l)) + '</textarea><div class="ld__save"><button class="btn btn--ghost btn--sm" id="ld-note-save">Spara kommentar</button></div></section>' +
      (myTag() ? '' : '<section class="panel"><h3>Ansvarig</h3><p class="panel__sub">Markerar vems lead det är. Oscar ser bara sina egna.</p><select class="input" id="ld-owner">' +
        [['', 'Elevate Studio'], ['Carl', 'Carl'], ['Isak', 'Isak'], ['Oscar', 'Oscar']].map(function (o) { return '<option value="' + o[0] + '"' + (ownerOf(l) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></section>') +
      '<section class="panel"><h3>Anteckningar</h3><div id="ld-notes" class="feed"><p class="muted">Hämtar …</p></div>' +
      '<div class="ld__add"><input class="input" id="ld-newnote" placeholder="Skriv en anteckning …"><button class="btn btn--sm" id="ld-addnote">Lägg till</button></div></section>' +
      '<section class="panel"><h3>Mötesinbjudningar</h3><div id="ld-meet" class="feed"><p class="muted">Hämtar …</p></div></section>' +
      '<section class="panel"><h3>Utskick</h3><div id="ld-out" class="feed"><p class="muted">Hämtar …</p></div></section>' +
      '<section class="panel"><h3>Historik</h3><div id="ld-hist" class="feed"><p class="muted">Hämtar …</p></div></section>' +
      '</div></div><footer class="ld__foot"><button class="link link--danger" id="ld-del">Ta bort lead</button><button class="btn" data-close>Stäng</button></footer></div>',
    function (d) {
      var close = function () { d.remove(); render(); };
      d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) render(); });
      $('#ld-status', d).addEventListener('change', function (e) {
        var v = e.target.value;
        if (v === 'sold') { d.remove(); return openSold(l); }
        update(l.id, { status: v }).then(function () { toast('Status: ' + sInfo(v)[1]); d.remove(); render(); openLead(l); }).catch(function (err) { toast(err.message); });
      });
      $('#ld-form', d).addEventListener('submit', function (e) {
        e.preventDefault(); var g = function (n) { return e.target.elements[n].value.trim(); };
        var patch = { name: g('name'), company: g('company') || null, email: g('email'), phone: g('phone') || null,
          service_type: g('service_type') || null, company_type: g('company_type') || null, booking_at: fromLocal(g('booking_at')), followup_at: fromLocal(g('followup_at')) };
        update(l.id, patch).then(function () { toast('Ändringarna är sparade'); }).catch(function (err) { toast(err.message); });
      });
      var ownerSel = $('#ld-owner', d);
      if (ownerSel) ownerSel.addEventListener('change', function () {
        var cur = lead(l.id) || l;
        update(l.id, { admin_notes: withOwner(ownerSel.value, noteOf(cur)) }).then(function () { render(); toast(ownerSel.value ? 'Leaden är markerad som ' + ownerSel.value + 's' : 'Leaden är Elevate Studios'); })
          .catch(function (err) { toast(err.message); });
      });
      $('#ld-note-save', d).addEventListener('click', function () {
        update(l.id, { admin_notes: withOwner(ownerOf(lead(l.id) || l), $('#ld-note', d).value) }).then(function () { toast('Kommentaren är sparad'); }).catch(function (err) { toast(err.message); });
      });
      $('#ld-offer', d).addEventListener('click', function () { d.remove(); openOffer(l); });
      var lm = $('#ld-mail', d); if (lm) lm.addEventListener('click', function () { d.remove(); composeMail(l); });
      $('#ld-meet', d).addEventListener('click', function () { d.remove(); bookMeeting(l); });
      var rv = $('#ld-review', d); if (rv) rv.addEventListener('click', function () { d.remove(); openReview(l); });
      var sd = $('#ld-sold', d); if (sd) sd.addEventListener('click', function () { d.remove(); openSold(l); });
      $('#ld-del', d).addEventListener('click', function () {
        if (!confirm('Ta bort ' + l.name + ' för gott? Det går inte att ångra.')) return;
        sb.from('quote_requests').delete().eq('id', l.id).select().then(function (r) {
          if (r.error || !r.data || !r.data.length) return toast(r.error ? r.error.message : 'Kunde inte ta bort.');
          st.leads = st.leads.filter(function (x) { return x.id !== l.id; }); close(); toast('Leaden är borttagen');
        });
      });
      var feed = function (sel, rows, fn) { $(sel, d).innerHTML = rows.length ? rows.map(fn).join('') : '<p class="muted">Inget än.</p>'; };
      var loadNotes = function () {
        sb.from('quote_notes').select('*').eq('quote_request_id', l.id).order('created_at', { ascending: false }).then(function (r) {
          feed('#ld-notes', r.data || [], function (n) { return '<div class="feed__it"><p>' + esc(n.body) + '</p><time>' + dt(n.created_at) + (n.created_by === st.user.id ? ' · du' : '') + '</time></div>'; });
        });
      };
      loadNotes();
      var add = function () {
        var t = $('#ld-newnote', d), body = t.value.trim(); if (!body) return;
        sb.from('quote_notes').insert({ quote_request_id: l.id, body: body, created_by: st.user.id }).then(function (r) {
          if (r.error) return toast(r.error.message);
          t.value = ''; loadNotes();
        });
      };
      $('#ld-addnote', d).addEventListener('click', add);
      $('#ld-newnote', d).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      sb.from('meeting_invites').select('booking_at,meet_link,recipients,outcome,subject,created_at').eq('quote_request_id', l.id).order('booking_at', { ascending: false }).then(function (r) {
        feed('#ld-meet', r.data || [], function (m) {
          return '<div class="feed__it"><p><b>' + dt(m.booking_at) + '</b>' + (m.subject ? ' · ' + esc(m.subject) : '') + '</p><time>' +
            (Array.isArray(m.recipients) ? esc(m.recipients.join(', ')) : '') + (m.outcome ? ' · ' + esc(m.outcome) : '') + (m.meet_link ? ' · <a href="' + esc(m.meet_link) + '" target="_blank" rel="noopener">Meet-länk</a>' : '') + '</time></div>';
        });
      });
      sb.from('outbound_messages').select('channel,recipient,subject,status,created_at').eq('quote_request_id', l.id).order('created_at', { ascending: false }).then(function (r) {
        feed('#ld-out', r.data || [], function (m) {
          return '<div class="feed__it"><p><b>' + esc(m.channel === 'sms' ? 'SMS' : 'Mejl') + '</b> till ' + esc(m.recipient) + (m.subject ? ' · ' + esc(m.subject) : '') + '</p><time>' + dt(m.created_at) + ' · ' + esc(m.status || '') + '</time></div>';
        });
      });
      sb.from('quote_status_history').select('from_status,to_status,note,created_at').eq('quote_request_id', l.id).order('created_at', { ascending: false }).then(function (r) {
        var rows = (r.data || []).concat([{ to_status: 'new', created_at: l.created_at, note: 'Förfrågan kom in' }]);
        feed('#ld-hist', rows, function (h) {
          var t = sInfo(h.to_status);
          return '<div class="feed__it"><p><i class="dot" style="background:' + t[2] + '"></i> ' + (h.from_status ? esc(sInfo(h.from_status)[1]) + ' → ' : '') + '<b>' + t[1] + '</b>' + (h.note ? ' · ' + esc(h.note) : '') + '</p><time>' + dt(h.created_at) + '</time></div>';
        });
      });
    });
  }

  /* ---------- Kalender: month grid like the old admin, plus a list of what is coming up ---------- */
  var CAT_COLOR = { meeting: '#14b8a6', call: '#3b82f6', task: '#10b981', deadline: '#f43f5e', reminder: '#f59e0b', personal: '#8b5cf6', other: '#94a3b8', lead: '#1d3b2a', followup: '#06b6d4' };
  function newActivity(at) {
    var t = at ? new Date(at) : new Date(Date.now() + 864e5); if (!at) t.setHours(9, 0, 0, 0);
    formDialog('Ny aktivitet', 'Syns i kalendern här i admin.', [
      { name: 'title', label: 'Titel', required: true }, { name: 'category', label: 'Typ', options: CATEGORY, value: 'meeting' },
      { name: 'starts_at', label: 'Start', type: 'datetime-local', value: localInput(t.toISOString()), required: true },
      { name: 'minutes', label: 'Längd (minuter)', type: 'number', value: 30 }, { name: 'location', label: 'Plats' }, { name: 'description', label: 'Beskrivning', type: 'textarea' }
    ], function (v) {
      var s = new Date(v.starts_at);
      return sb.from('calendar_activities').insert({ title: v.title, category: v.category, location: v.location, description: v.description, starts_at: s.toISOString(),
        ends_at: new Date(s.getTime() + (Number(v.minutes) || 30) * 6e4).toISOString(), created_by: st.user.id });
    });
  }
  function openActivity(a) {
    dialog('<h2>' + esc(a.title) + '</h2><p>' + esc(CATEGORY[a.category] || 'Aktivitet') + ' · ' + dt(a.starts_at) + (a.location ? ' · ' + esc(a.location) : '') + '</p>' +
      (a.description ? '<div class="box">' + esc(a.description) + '</div>' : '') +
      '<div class="dlg__row"><button class="link link--danger" id="del" style="margin:0 auto 0 0">Ta bort</button><button class="btn" data-close>Stäng</button></div>', function (d) {
      $('#del', d).addEventListener('click', function () {
        if (!confirm('Ta bort aktiviteten?')) return;
        sb.from('calendar_activities').delete().eq('id', a.id).then(function (r) { if (r.error) return toast(r.error.message); d.remove(); render(); });
      });
    });
  }
  function renderCalendar() {
    var m = st.month || (st.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    var first = new Date(m), gridStart = new Date(first); gridStart.setDate(1 - ((first.getDay() + 6) % 7));
    var gridEnd = new Date(gridStart.getTime() + 42 * 864e5);
    var title = m.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    main().innerHTML = head('Kalender', 'Möten, uppringningar och påminnelser. Klicka på en dag för att lägga till.', '<button class="btn" id="add">+ Ny aktivitet</button>') +
      '<div class="calm"><div class="calm__bar"><button class="iconbtn" id="prev" aria-label="Föregående månad">&#8249;</button><h2>' + title.charAt(0).toUpperCase() + title.slice(1) + '</h2>' +
      '<button class="iconbtn" id="next" aria-label="Nästa månad">&#8250;</button><button class="btn btn--ghost btn--sm" id="today">Idag</button>' +
      '<span class="calm__legend">' + [['lead', 'Kundmöte'], ['followup', 'Ring upp'], ['meeting', 'Möte'], ['reminder', 'Påminnelse'], ['task', 'Uppgift']].map(function (x) { return '<span><i class="dot" style="background:' + CAT_COLOR[x[0]] + '"></i>' + x[1] + '</span>'; }).join('') + '</span></div>' +
      '<div class="calm__grid" id="grid"><p class="empty" style="grid-column:1/-1">Hämtar …</p></div></div><section class="panel" style="margin-top:14px"><h3>Kommande 14 dagar</h3><div class="cal" id="cal"></div></section>';
    $('#add').addEventListener('click', function () { newActivity(); });
    $('#prev').addEventListener('click', function () { st.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); render(); });
    $('#next').addEventListener('click', function () { st.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); render(); });
    $('#today').addEventListener('click', function () { st.month = null; render(); });
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var from = new Date(Math.min(gridStart.getTime(), now.getTime())), to = new Date(Math.max(gridEnd.getTime(), now.getTime() + 14 * 864e5));
    var own = myTag() ? function (q) { return q.eq('created_by', st.user.id); } : function (q) { return q; };
    own(sb.from('calendar_activities').select('id,title,starts_at,category,location,description')).gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at').then(function (r) {
      if (st.view !== 'kalender') return;
      if (r.error) toast('Kunde inte hämta aktiviteter: ' + r.error.message);
      var items = (r.data || []).map(function (a) { return { at: a.starts_at, title: a.title, color: CAT_COLOR[a.category] || CAT_COLOR.other, tag: CATEGORY[a.category] || 'Aktivitet', act: a }; });
      st.leads.forEach(function (l) {
        if (l.booking_at) items.push({ at: l.booking_at, title: (l.company || l.name), color: CAT_COLOR.lead, tag: 'Kundmöte' + (MEETING[l.meeting_type] && l.meeting_type !== 'quote' ? ' · ' + MEETING[l.meeting_type] : ''), lead: l.id });
        if (l.followup_at) items.push({ at: l.followup_at, title: 'Ring ' + (l.company || l.name), color: CAT_COLOR.followup, tag: 'Ring upp', lead: l.id });
      });
      items.sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
      var byDay = {}; items.forEach(function (i, n) { i.n = n; var k = new Date(i.at).toDateString(); (byDay[k] = byDay[k] || []).push(i); });
      var hm = function (i) { return new Date(i.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }); };
      var cells = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(function (d) { return '<div class="calm__dow">' + d + '</div>'; }).join('');
      for (var i = 0; i < 42; i++) {
        var d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i), ev = byDay[d.toDateString()] || [];
        cells += '<div class="calm__day' + (d.getMonth() !== m.getMonth() ? ' is-out' : '') + (d.getTime() === now.getTime() ? ' is-today' : '') + '" data-day="' + d.toISOString() + '"><b>' + d.getDate() + '</b>' +
          ev.slice(0, 3).map(function (e) { return '<button class="calm__ev" data-n="' + e.n + '" style="--c:' + e.color + '"><time>' + hm(e) + '</time> ' + esc(e.title) + '</button>'; }).join('') +
          (ev.length > 3 ? '<span class="calm__more">+' + (ev.length - 3) + ' till</span>' : '') + '</div>';
      }
      $('#grid').innerHTML = cells;
      var soon = items.filter(function (x) { var t = Date.parse(x.at); return t >= now.getTime() && t < now.getTime() + 14 * 864e5; });
      var days = {}; soon.forEach(function (x) { var k = new Date(x.at).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }); (days[k] = days[k] || []).push(x); });
      $('#cal').innerHTML = Object.keys(days).map(function (k) {
        return '<section class="cal__day"><h3>' + k + '</h3>' + days[k].map(function (x) {
          return '<div class="cal__ev"><time>' + hm(x) + '</time><span><button class="link" data-n="' + x.n + '">' + esc(x.title) + '</button></span><span class="tag" style="color:' + x.color + '">' + esc(x.tag) + '</span></div>';
        }).join('') + '</section>';
      }).join('') || '<p class="muted">Inget inbokat de kommande 14 dagarna.</p>';
      var open = function (e) {
        var b = e.target.closest('[data-n]');
        if (b) { var it = items[b.dataset.n]; return it.lead ? openLead(lead(it.lead)) : openActivity(it.act); }
        var day = e.target.closest('[data-day]'); if (day) { var t = new Date(day.dataset.day); t.setHours(9, 0, 0, 0); newActivity(t); }
      };
      $('#grid').addEventListener('click', open); $('#cal').addEventListener('click', open);
    });
  }

  /* ---------- Kontakter ---------- */
  function contactDialog(c) {
    c = c || {};
    formDialog(c.id ? 'Redigera kontakt' : 'Ny kontakt', null, [
      { name: 'full_name', label: 'Namn', value: c.full_name, required: true }, { name: 'company_name', label: 'Företag', value: c.company_name },
      { name: 'email', label: 'E-post', type: 'email', value: c.email }, { name: 'phone', label: 'Telefon', value: c.phone },
      { name: 'customer_status', label: 'Kundstatus', options: CUSTOMER, value: c.customer_status || 'lead' }, { name: 'notes', label: 'Anteckningar', type: 'textarea', value: c.notes }
    ], function (v) {
      return c.id ? sb.from('contacts').update(v).eq('id', c.id) : sb.from('contacts').insert(Object.assign(v, { contact_source: 'manual' }));
    }, c.id ? '<button type="button" class="link link--danger" id="arch" style="margin:0 auto 0 0">Arkivera</button>' : '');
    var a = $('#arch'); if (a) a.addEventListener('click', function () {
      sb.from('contacts').update({ archived_at: new Date().toISOString() }).eq('id', c.id).then(function (r) { if (r.error) return toast(r.error.message); $('.dlg').remove(); render(); toast('Kontakten är arkiverad'); });
    });
  }
  function renderContacts() {
    main().innerHTML = head('Kontakter', 'Kunder och kontakter, sparade i databasen.', '<button class="btn" id="add">+ Ny kontakt</button>');
    $('#add').addEventListener('click', function () { contactDialog(); });
    fetchRows(sb.from('contacts').select('id,full_name,email,phone,company_name,customer_status,notes,created_at').is('archived_at', null).order('created_at', { ascending: false }).limit(3000), function (rows) {
      var by = function (k) { return rows.filter(function (c) { return c.customer_status === k; }).length; };
      main().insertAdjacentHTML('beforeend', kpis([['Kontakter', rows.length], ['Aktiva kunder', by('active')], ['Blivande kunder', by('prospect')], ['Leads', by('lead')]]) +
        '<div class="bar"><input class="input" id="cq" placeholder="Sök namn, företag, mejl …"></div><div id="ct"></div>');
      var draw = function () {
        var q = $('#cq').value.toLowerCase();
        var list = rows.filter(function (c) { return !q || [c.full_name, c.company_name, c.email, c.phone].some(function (v) { return v && v.toLowerCase().indexOf(q) > -1; }); });
        $('#ct').innerHTML = table([['Namn', function (c) { return '<b>' + esc(c.full_name) + '</b>'; }], ['Företag', function (c) { return esc(c.company_name || '–'); }],
          ['E-post', function (c) { return c.email ? '<button type="button" class="link link--inline" data-mail="' + esc(c.id) + '">' + esc(c.email) + '</button>' : '–'; }], ['Telefon', function (c) { return esc(c.phone || '–'); }],
          ['Status', function (c) { return '<span class="tag">' + esc(CUSTOMER[c.customer_status] || c.customer_status || '–') + '</span>'; }], ['Tillagd', function (c) { return day(c.created_at); }]],
          list.slice(0, 300), function (c) { return 'data-id="' + c.id + '" class="click"'; });
      };
      draw();
      $('#cq').addEventListener('input', draw);
      $('#ct').addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        var m = e.target.closest('[data-mail]');
        if (m) { var c = rows.find(function (x) { return x.id === m.dataset.mail; }); return composeMail({ email: c.email, name: c.full_name }); }
        var tr = e.target.closest('tr[data-id]'); if (tr) contactDialog(rows.find(function (c) { return c.id === tr.dataset.id; }));
      });
    });
  }

  /* ---------- Fakturor ---------- */
  function renderInvoices() {
    var sold = st.leads.filter(function (l) { return l.status === 'sold' || l.stripe_invoice_id; }).sort(function (a, b) { return Date.parse(b.sold_at || b.created_at) - Date.parse(a.sold_at || a.created_at); });
    var sum = function (f) { return sold.filter(f).reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0); };
    main().innerHTML = head('Fakturor', 'Sålda affärer och deras fakturor.') +
      kpis([['Sålt totalt', kr(sum(function () { return true; }))], ['Affärer', sold.length], ['Fakturerat', kr(sum(function (l) { return l.stripe_invoice_id; }))], ['Betalt', kr(sum(function (l) { return l.stripe_invoice_status === 'paid'; }))]]) +
      info('Skicka fakturor', 'Att skapa och skicka fakturor via Stripe kräver en server (den gamla admin gjorde det via Lovable). Tills dess: skapa offerten här, fakturera från ert bokföringsprogram och markera affären som såld.') +
      '<div id="it">' + table([['Kund', function (l) { return '<b>' + esc(l.company || l.name) + '</b>'; }], ['Såld', function (l) { return day(l.sold_at); }],
        ['Belopp', function (l) { return l.sold_amount != null ? kr(l.sold_amount) : '–'; }],
        ['Faktura', function (l) { return l.stripe_invoice_status ? '<span class="tag">' + esc(l.stripe_invoice_status) + '</span>' : '<span class="muted">Ingen</span>'; }],
        ['', function (l) { return l.stripe_invoice_url ? '<a href="' + esc(l.stripe_invoice_url) + '" target="_blank" rel="noopener">Öppna</a>' : ''; }]], sold,
        function (l) { return 'data-lead="' + l.id + '" class="click"'; }) + '</div>';
    $('#it').addEventListener('click', function (e) { var tr = e.target.closest('[data-lead]'); if (tr && !e.target.closest('a')) openLead(lead(tr.dataset.lead)); });
  }

  /* ---------- Utskick ---------- */
  var CAMPAIGN = { draft: 'Utkast', scheduled: 'Schemalagt', sending: 'Skickas', sent: 'Skickat', failed: 'Misslyckades', cancelled: 'Avbrutet' };
  function renderCampaigns() {
    main().innerHTML = head('Utskick', 'Mejlutskick och nyhetsbrev till kontakter och leads.', '<button class="btn" data-q="campaign">' + ICON.send + 'Nytt mejlutskick</button>') +
      info('Skicka utskick', 'Snabba utskick gör ni med knappen ovan. Större nyhetsbrev skrivs och skickas i Brevo, från info@elevatestudio.nu. Den som anmäler sig i sidfoten på hemsidan hamnar direkt på listan där, och Brevo sköter avregistrering. Nedan ser ni alla utskick.');
    bindQuick();
    fetchRows(sb.from('email_campaigns').select('internal_name,subject,status,recipient_count,sent_count,sent_at,scheduled_at,created_at').order('created_at', { ascending: false }), function (rows) {
      main().insertAdjacentHTML('beforeend', kpis([['Utskick', rows.length], ['Skickade', rows.filter(function (c) { return c.status === 'sent'; }).length],
        ['Mejl skickade', rows.reduce(function (s, c) { return s + (c.sent_count || 0); }, 0)], ['Utkast', rows.filter(function (c) { return c.status === 'draft'; }).length]]) +
        table([['Namn', function (c) { return '<b>' + esc(c.internal_name || '–') + '</b>'; }], ['Ämne', function (c) { return esc(c.subject || '–'); }],
          ['Status', function (c) { return '<span class="tag">' + esc(CAMPAIGN[c.status] || c.status) + '</span>'; }], ['Mottagare', function (c) { return c.recipient_count || 0; }],
          ['Skickade', function (c) { return c.sent_count || 0; }], ['Datum', function (c) { return day(c.sent_at || c.scheduled_at || c.created_at); }]], rows));
    });
  }

  /* ---------- Segment ---------- */
  function renderSegments() {
    main().innerHTML = head('Segment', 'Grupper av kontakter för utskick.', '<button class="btn" id="add">+ Nytt segment</button>');
    $('#add').addEventListener('click', function () {
      formDialog('Nytt segment', null, [{ name: 'name', label: 'Namn', required: true }, { name: 'description', label: 'Beskrivning', type: 'textarea' }],
        function (v) { return sb.from('contact_segments').insert(Object.assign(v, { created_by: st.user.id })); });
    });
    fetchRows(sb.from('contact_segments').select('id,name,description,created_at').is('archived_at', null).order('created_at', { ascending: false }), function (rows) {
      main().insertAdjacentHTML('beforeend', '<div class="cards" id="sg">' + (rows.map(function (g) {
        return '<article class="cardx"><h3>' + esc(g.name) + '</h3><p>' + esc(g.description || 'Ingen beskrivning.') + '</p><footer><time>' + day(g.created_at) + '</time><button class="link link--danger" data-arch="' + g.id + '">Arkivera</button></footer></article>';
      }).join('') || '<p class="empty">Inga segment än.</p>') + '</div>');
      $('#sg').addEventListener('click', function (e) {
        var b = e.target.closest('[data-arch]'); if (!b) return;
        sb.from('contact_segments').update({ archived_at: new Date().toISOString() }).eq('id', b.dataset.arch).then(function (r) { if (r.error) return toast(r.error.message); render(); });
      });
    });
  }

  /* ---------- Besökare ---------- */
  function renderVisitors() {
    main().innerHTML = head('Besökare', 'Besök de senaste 30 dagarna (utan botar).') +
      info('Bra att veta', 'Siffrorna kommer från den gamla sidans besöksräknare. Nya hemsidan har inga cookies och ingen spårning, så när den går live slutar siffrorna växa.');
    fetchRows(sb.from('site_visits').select('path,device_type,source,referrer_host,is_bot,created_at,session_id').gte('created_at', since(30)).order('created_at', { ascending: false }).limit(10000), function (all) {
      var v = all.filter(function (x) { return !x.is_bot; });
      var sessions = {}; v.forEach(function (x) { if (x.session_id) sessions[x.session_id] = 1; });
      var today = new Date().toDateString(), mobile = v.filter(function (x) { return x.device_type === 'mobile'; }).length;
      var perDay = []; for (var i = 13; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5).toDateString(); perDay.push([new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), v.filter(function (x) { return new Date(x.created_at).toDateString() === d; }).length]); }
      var max = Math.max.apply(null, perDay.map(function (p) { return p[1]; }).concat([1]));
      main().insertAdjacentHTML('beforeend', kpis([['Sidvisningar', v.length], ['Unika besök', Object.keys(sessions).length], ['Idag', v.filter(function (x) { return new Date(x.created_at).toDateString() === today; }).length], ['Mobil', v.length ? Math.round(mobile / v.length * 100) + ' %' : '–']]) +
        '<section class="panel"><h3>Senaste 14 dagarna</h3><div class="cols">' + perDay.map(function (p) { return '<div title="' + p[1] + '"><i style="--h:' + Math.round(p[1] / max * 100) + '%"></i><span>' + p[0] + '</span></div>'; }).join('') + '</div></section>' +
        '<div class="split">' + bars('Mest besökta sidor', countBy(v, function (x) { return x.path; })) + bars('Källor', countBy(v, function (x) { return x.referrer_host || x.source || 'Direkt'; }), v.length) +
        bars('Enheter', countBy(v, function (x) { return { mobile: 'Mobil', desktop: 'Dator', tablet: 'Surfplatta' }[x.device_type] || x.device_type; }), v.length) + '</div>');
    });
  }

  /* ---------- Chatten ---------- */
  function renderChat() {
    main().innerHTML = head('Chatten', 'Vad besökarna frågar chatten – senaste 90 dagarna.');
    fetchRows(sb.from('chatbot_queries').select('question,matched,topic,page_path,created_at').gte('created_at', since(90)).order('created_at', { ascending: false }).limit(5000), function (q) {
      var miss = q.filter(function (x) { return !x.matched; });
      main().insertAdjacentHTML('beforeend', kpis([['Frågor', q.length], ['Besvarade', q.length ? Math.round((q.length - miss.length) / q.length * 100) + ' %' : '–'], ['Obesvarade', miss.length], ['Senaste 7 dagar', q.filter(function (x) { return Date.parse(x.created_at) > Date.now() - 7 * 864e5; }).length]]) +
        '<div class="split">' + bars('Ämnen', countBy(q, function (x) { return x.topic || 'Övrigt'; }), q.length) + bars('Sidor där chatten används', countBy(q, function (x) { return x.page_path; })) + '</div>' +
        '<section class="panel"><h3>Frågor chatten inte kunde svara på</h3><p class="panel__sub">Lägg till svaren i chattens FAQ så blir den bättre.</p>' +
        table([['Fråga', function (x) { return esc(x.question); }], ['Sida', function (x) { return esc(x.page_path || '–'); }], ['När', function (x) { return dt(x.created_at); }]], miss.slice(0, 50)) + '</section>');
    });
  }

  /* ---------- Kundportal ---------- */
  function renderPortal() {
    main().innerHTML = head('Kundportal', 'Kunder med inloggning till kundportalen.') +
      info('Nya portalkonton', 'Att skapa inloggningar åt kunder kräver en server (det görs med en admin-nyckel som aldrig får ligga på en hemsida). Här kan ni se och stänga av befintliga konton.');
    fetchRows(sb.from('portal_clients').select('id,display_name,company_name,is_active,created_at').order('created_at', { ascending: false }), function (rows) {
      main().insertAdjacentHTML('beforeend', '<div id="pt">' + table([['Kund', function (c) { return '<b>' + esc(c.display_name || '–') + '</b>'; }], ['Företag', function (c) { return esc(c.company_name || '–'); }],
        ['Skapad', function (c) { return day(c.created_at); }], ['Aktiv', function (c) { return '<label class="switch"><input type="checkbox" data-id="' + c.id + '"' + (c.is_active ? ' checked' : '') + '><i></i></label>'; }]], rows) + '</div>');
      $('#pt').addEventListener('change', function (e) {
        var id = e.target.dataset.id; if (!id) return;
        sb.from('portal_clients').update({ is_active: e.target.checked }).eq('id', id).then(function (r) { toast(r.error ? r.error.message : (e.target.checked ? 'Kontot är aktiverat' : 'Kontot är avstängt')); });
      });
    });
  }

  /* ---------- AI-assistent ---------- */
  function renderAI() {
    main().innerHTML = head('AI-assistent', 'Fråga om leads, skriv mejl och få förslag.') +
      '<section class="panel hero-note"><div class="star">' + ICON.spark + '</div><h3>Behöver en server för att svara</h3>' +
      '<p>AI-assistenten anropar en AI-modell med en hemlig nyckel. En sådan nyckel får aldrig ligga på en hemsida, där kan vem som helst läsa den. I den gamla admin låg nyckeln hos Lovable.</p>' +
      '<p>När ni har en egen server (t.ex. en Supabase Edge Function) kopplar vi in den här. Allt annat i admin fungerar redan utan.</p>' +
      '<p class="muted">Under tiden: AI-minnet nedan går att fylla på, så är det redo.</p><button class="btn btn--ghost" id="tomem">' + ICON.brain + 'Gå till AI-minne</button></section>';
    $('#tomem').addEventListener('click', function () { go('minne'); });
  }

  /* ---------- Insikter ---------- */
  function renderInsights() {
    var L = st.leads, sold = L.filter(function (l) { return l.status === 'sold'; });
    var total = sold.reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0);
    var months = []; for (var i = 5; i >= 0; i--) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d); }
    var perMonth = months.map(function (m) {
      var n = L.filter(function (l) { var c = new Date(l.created_at); return c.getFullYear() === m.getFullYear() && c.getMonth() === m.getMonth(); }).length;
      return [m.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }), n];
    });
    var max = Math.max.apply(null, perMonth.map(function (p) { return p[1]; }).concat([1]));
    var funnel = STATUS.map(function (s) { return [s[1], L.filter(function (l) { return (l.status || 'new') === s[0]; }).length]; }).filter(function (p) { return p[1]; });
    main().innerHTML = head('Insikter', 'Räknat direkt från era leads.') +
      kpis([['Leads totalt', L.length], ['Sålda', sold.length], ['Konvertering', L.length ? (sold.length / L.length * 100).toFixed(1).replace('.', ',') + ' %' : '–'], ['Snittaffär', sold.length ? kr(total / sold.length) : '–']]) +
      '<section class="panel"><h3>Nya leads per månad</h3><div class="cols">' + perMonth.map(function (p) { return '<div title="' + p[1] + '"><i style="--h:' + Math.round(p[1] / max * 100) + '%"></i><b>' + p[1] + '</b><span>' + p[0] + '</span></div>'; }).join('') + '</div></section>' +
      '<div class="split">' + bars('Status just nu', funnel, L.length) + bars('Branscher', countBy(L, function (l) { return l.service_type; }), L.length) +
      bars('Typ av förfrågan', countBy(L, function (l) { return MEETING[l.meeting_type] || l.meeting_type; }), L.length) + bars('Paket', countBy(L, function (l) { return l.selected_package; }), L.length) + '</div>';
  }

  /* ---------- Ekonomi ---------- */
  function renderEconomy() {
    var y = new Date().getFullYear(), start = new Date(y, 0, 1).toISOString();
    var income = st.leads.filter(function (l) { return l.status === 'sold' && l.sold_at && l.sold_at >= start; }).reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0);
    main().innerHTML = head('Ekonomi', 'Intäkter från sålda affärer och era kostnader ' + y + '.', '<button class="btn" id="add">+ Ny kostnad</button>');
    $('#add').addEventListener('click', function () {
      formDialog('Ny kostnad', 'Belopp exklusive moms.', [
        { name: 'vendor', label: 'Leverantör', required: true }, { name: 'category', label: 'Kategori', value: 'Programvara', required: true },
        { name: 'amount_sek', label: 'Belopp (kr)', type: 'number', required: true }, { name: 'vat_sek', label: 'Moms (kr)', type: 'number' },
        { name: 'spent_at', label: 'Datum', type: 'date', value: new Date().toISOString().slice(0, 10), required: true }, { name: 'description', label: 'Beskrivning' }
      ], function (v) {
        v.amount_sek = Number(v.amount_sek); v.vat_sek = v.vat_sek == null ? null : Number(v.vat_sek);
        return sb.from('cfo_expenses').insert(Object.assign(v, { user_id: st.user.id }));
      });
    });
    fetchRows(sb.from('cfo_expenses').select('id,amount_sek,category,spent_at,vendor,description,vat_sek').gte('spent_at', start.slice(0, 10)).order('spent_at', { ascending: false }), function (rows) {
      var cost = rows.reduce(function (s, e) { return s + Number(e.amount_sek || 0); }, 0), vat = rows.reduce(function (s, e) { return s + Number(e.vat_sek || 0); }, 0);
      var cat = {}; rows.forEach(function (e) { cat[e.category] = (cat[e.category] || 0) + Number(e.amount_sek || 0); });
      main().insertAdjacentHTML('beforeend', kpis([['Intäkter i år', kr(income)], ['Kostnader i år', kr(cost)], ['Resultat', kr(income - cost)], ['Ingående moms', kr(vat)]]) +
        '<p class="muted small">Intäkterna räknas från sålda leads (beloppet ni skrev in). Exakta siffror finns i bokföringen.</p>' +
        '<div id="ex">' + table([['Datum', function (e) { return esc(e.spent_at); }], ['Leverantör', function (e) { return '<b>' + esc(e.vendor || '–') + '</b>' + (e.description ? '<br><span class="muted">' + esc(e.description) + '</span>' : ''); }],
          ['Kategori', function (e) { return '<span class="tag">' + esc(e.category) + '</span>'; }], ['Belopp', function (e) { return kr(e.amount_sek); }],
          ['', function (e) { return '<button class="iconbtn iconbtn--sm" data-del="' + e.id + '" aria-label="Ta bort">' + ICON.x + '</button>'; }]], rows) + '</div>');
      $('#ex').addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]'); if (!b || !confirm('Ta bort kostnaden?')) return;
        sb.from('cfo_expenses').delete().eq('id', b.dataset.del).then(function (r) { if (r.error) return toast(r.error.message); render(); });
      });
    });
  }

  /* ---------- AI-minne ---------- */
  function renderMemory() {
    main().innerHTML = head('AI-minne', 'Fakta som AI:n ska komma ihåg om Elevate och hur ni jobbar.', '<button class="btn" id="add">+ Lägg till</button>');
    $('#add').addEventListener('click', function () {
      formDialog('Nytt minne', 'Skriv en sak per minne, t.ex. "Vi svarar alltid inom en arbetsdag."', [
        { name: 'content', label: 'Innehåll', type: 'textarea', required: true }, { name: 'scope', label: 'Gäller', options: SCOPE, value: 'foretag' }
      ], function (v) { return sb.from('ai_memory').insert(Object.assign(v, { approved: true, created_by: st.user.id })); });
    });
    fetchRows(sb.from('ai_memory').select('id,content,scope,source,approved,created_at').order('created_at', { ascending: false }), function (rows) {
      main().insertAdjacentHTML('beforeend', '<div id="mm">' + Object.keys(SCOPE).map(function (k) {
        var list = rows.filter(function (m) { return m.scope === k; });
        return '<section class="panel"><h3>' + SCOPE[k] + ' <em class="muted">' + list.length + '</em></h3>' + (list.map(function (m) {
          return '<div class="mem' + (m.approved ? '' : ' is-off') + '"><p>' + esc(m.content) + '</p><div><span class="muted small">' + (m.source === 'ai_proposed' ? 'Föreslaget av AI' : 'Manuellt') + ' · ' + day(m.created_at) + '</span>' +
            '<label class="switch" title="Godkänd"><input type="checkbox" data-ok="' + m.id + '"' + (m.approved ? ' checked' : '') + '><i></i></label>' +
            '<button class="iconbtn iconbtn--sm" data-del="' + m.id + '" aria-label="Ta bort">' + ICON.x + '</button></div></div>';
        }).join('') || '<p class="muted">Inget här än.</p>') + '</section>';
      }).join('') + '</div>');
      var mm = $('#mm');
      mm.addEventListener('change', function (e) {
        var id = e.target.dataset.ok; if (!id) return;
        sb.from('ai_memory').update({ approved: e.target.checked }).eq('id', id).then(function (r) { if (r.error) return toast(r.error.message); e.target.closest('.mem').classList.toggle('is-off', !e.target.checked); });
      });
      mm.addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]'); if (!b || !confirm('Ta bort minnet?')) return;
        sb.from('ai_memory').delete().eq('id', b.dataset.del).then(function (r) { if (r.error) return toast(r.error.message); render(); });
      });
    });
  }

  /* ---------- Integrationer ---------- */
  function renderIntegrations() {
    var items = [
      ['Databas (Supabase)', 'Leads, kontakter, kalender, ekonomi och AI-minne.', 'on', 'Ansluten'],
      ['Kontaktformulär', 'Förfrågningar från hemsidan hamnar som leads här.', 'on', 'Ansluten'],
      ['Offert-PDF', 'Skapas direkt i webbläsaren, samma som på hemsidan.', 'on', 'Fungerar'],
      ['Mejl från info@ (Brevo)', 'Bekräftelse till kunden, avisering till info@ och recensionsmejl, i den gröna designen.', root.dataset.mail ? 'on' : 'off', root.dataset.mail ? 'Ansluten' : 'Väntar på Brevo'],
      ['Nyhetsbrev (Brevo)', 'Anmälningar från hemsidan läggs i listan. Utskick görs i Brevo från info@.', root.dataset.mail ? 'on' : 'off', root.dataset.mail ? 'Ansluten' : 'Väntar på Brevo'],
      ['Gmail (' + GMAIL + ')', 'Mötesinbjudningar skickas härifrån, med kalenderfil.', 'gmail', 'Kollar …'],
      ['Google Kalender & Meet', 'Bokade Google Meet-möten hamnar i Elevates Google Kalender och får en Meet-länk automatiskt.', 'google', 'Kollar …'],
      ['SMS (GatewayAPI)', 'SMS-påminnelser till kund och team.', 'off', 'Kräver server'],
      ['Stripe', 'Skapa och skicka fakturor.', 'off', 'Kräver server'],
      ['AI-modell', 'AI-assistent och AI-förslag.', 'off', 'Kräver server']
    ];
    main().innerHTML = head('Integrationer', 'Vad admin är kopplad till.') +
      info('Varför vissa kräver server', 'Kopplingarna till SMS, Stripe och AI behöver hemliga nycklar. De kan inte ligga på en vanlig hemsida. I den gamla admin låg de hos Lovable. Vill ni ha tillbaka dem byggs en liten server (t.ex. Supabase Edge Functions) som admin anropar.') +
      '<div class="cards">' + items.map(function (i) {
        return '<article class="cardx"><h3>' + i[0] + '</h3><p>' + i[1] + '</p><footer><span class="pill pill--' + i[2] + '"' + (i[2] === 'gmail' || i[2] === 'google' ? ' id="' + i[2] + '-pill"' : '') + '>' + i[3] + '</span>' +
          (i[2] === 'google' ? ' <a class="btn btn--ghost btn--sm" id="google-connect" href="/api/google/connect" hidden>Koppla Google</a>' : '') + '</footer></article>';
      }).join('') + '</div>';
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (st) {
      var pill = $('#gmail-pill'); if (!pill) return;
      pill.className = 'pill pill--' + (st.gmail ? 'on' : 'off');
      pill.textContent = st.gmail ? 'Ansluten' : 'Lösenord saknas i Cloudflare';
      var g = $('#google-pill'); if (!g) return;
      g.className = 'pill pill--' + (st.google ? 'on' : 'off'); g.textContent = st.google ? 'Ansluten' : 'Inte kopplat';
      $('#google-connect').hidden = !!st.google;
    }).catch(function () { var pill = $('#gmail-pill'); if (pill) { pill.className = 'pill pill--off'; pill.textContent = 'Kan inte nås här'; } });
  }

  /* ---------- Konto ---------- */
  function renderAccount() {
    main().innerHTML = head('Konto', 'Byt e-post och lösenord för inloggningen.') +
      '<div class="split split--2"><section class="panel"><h3>E-post</h3><p class="panel__sub">Nu: <b>' + esc(st.user.email) + '</b></p><form id="em">' +
      '<label class="field">Ny e-post<input class="input" type="email" name="email" placeholder="info@elevatestudio.nu" required></label>' +
      '<button class="btn" type="submit">Byt e-post</button><p class="msg ok" id="em-msg"></p></form>' +
      '<p class="muted small">En bekräftelselänk skickas till den nya adressen. Bytet gäller först när ni klickat på den.</p></section>' +
      '<section class="panel"><h3>Lösenord</h3><form id="pw">' +
      '<label class="field">Nytt lösenord (minst 8 tecken)<input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
      '<label class="field">Upprepa lösenordet<input class="input" type="password" name="pw2" minlength="8" autocomplete="new-password" required></label>' +
      '<button class="btn" type="submit">Byt lösenord</button><p class="msg ok" id="pw-msg"></p></form>' +
      '<p class="muted small">Tips: tre vanliga ord ihop med en siffra är lätt att komma ihåg och svårt att gissa. Inga konstiga tecken behövs.</p></section></div>' +
      (!allowed('integrationer') ? '' : '<section class="panel" style="margin-top:20px"><h3>Profiler</h3><p class="panel__sub">Var och en loggar in med sin egen e-post och sitt eget lösenord. Du är inloggad som <b>' + esc(me()) + '</b>.</p>' +
      '<div class="profiles">' + PROFILES.map(function (p) {
        var mine = profile(st.user.email) === p;
        return '<article class="profile"><div><b>' + esc(p[1]) + '</b><span>' + esc(p[2]) + (p[4] ? ' (sedan ' + esc(p[4][0]) + ')' : '') + '</span></div>' +
          (mine ? '<span class="pill pill--on">Du</span>' : '<button class="btn btn--ghost btn--sm" data-profile="' + esc(p[2]) + '">Skapa inloggning</button>') + '</article>';
      }).join('') + '</div>' +
      '<p class="muted small">Har en profil redan en inloggning? Då loggar personen in med sin e-post och byter lösenord här under Konto, eller trycker på Glömt lösenord på inloggningssidan.</p></section>');
    $('#em').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('#em-msg');
      sb.auth.updateUser({ email: e.target.email.value.trim() }, { emailRedirectTo: location.href.split('#')[0] }).then(function (r) {
        m.textContent = r.error ? r.error.message : 'Klart. Öppna mejlet som skickats till den nya adressen och klicka på länken för att bekräfta.';
      });
    });
    document.querySelectorAll('[data-profile]').forEach(function (b) {
      b.addEventListener('click', function () { createLogin(profile(b.dataset.profile)); });
    });
    $('#pw').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, m = $('#pw-msg');
      if (f.pw.value !== f.pw2.value) { m.textContent = 'Lösenorden är inte likadana.'; return; }
      sb.auth.updateUser({ password: f.pw.value }).then(function (r) {
        if (r.error) { m.textContent = r.error.message; return; }
        f.reset(); m.textContent = 'Lösenordet är bytt. Använd det nya nästa gång du loggar in.';
      });
    });
  }

  /* A login for a profile: the person types their own password; they confirm through a mail from Supabase */
  function createLogin(p) {
    dialog('<form id="cl"><h2>Inloggning för ' + esc(p[1].split(' ')[0]) + '</h2><p>Låt ' + esc(p[1].split(' ')[0]) + ' själv skriva sitt lösenord. Ett mejl skickas för att bekräfta adressen.</p>' +
      form([{ name: 'email', label: 'E-post', type: 'email', value: p[2], required: true }]) +
      '<label class="field">Lösenord (minst 8 tecken)<input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
      '<label class="field">Upprepa lösenordet<input class="input" type="password" name="pw2" minlength="8" autocomplete="new-password" required></label>' +
      '<p class="msg" id="cl-msg"></p><div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">Skapa</button></div></form>', function (d) {
      $('#cl', d).addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, m = $('#cl-msg', d), btn = $('button[type=submit]', d);
        if (f.pw.value !== f.pw2.value) { m.textContent = 'Lösenorden är inte likadana.'; return; }
        btn.disabled = true;
        // A separate client, so the signed-in session in this window stays as it is
        var other = window.supabase.createClient(root.dataset.url, root.dataset.key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'elevate-new-login' } });
        other.auth.signUp({ email: f.email.value.trim(), password: f.pw.value, options: { emailRedirectTo: location.origin + '/admin/', data: { full_name: p[1] } } }).then(function (r) {
          if (r.error) throw r.error;
          var u = r.data && r.data.user;
          if (!u || !u.identities || !u.identities.length) return 'exists';
          return sb.from('user_roles').insert({ user_id: u.id, role: 'admin' }).then(function (x) { return x.error ? 'norole' : 'ok'; });
        }).then(function (how) {
          f.pw.value = f.pw2.value = '';
          if (how === 'exists') { btn.disabled = false; m.textContent = 'Den e-posten har redan en inloggning. Logga in med den, eller tryck på Glömt lösenord på inloggningssidan.'; return; }
          d.remove();
          toast(how === 'ok' ? 'Inloggningen är skapad. ' + p[1].split(' ')[0] + ' får ett mejl att bekräfta, sedan går det att logga in.'
            : 'Kontot är skapat, men databasen lät inte admin ge det behörighet. Säg till, så läggs behörigheten in.');
        }).catch(function (err) { btn.disabled = false; m.textContent = err.message; });
      });
    });
  }

  var PAGES = {
    kalender: renderCalendar, kontakter: renderContacts, fakturor: renderInvoices, utskick: renderCampaigns, segment: renderSegments,
    besokare: renderVisitors, chatten: renderChat, kundportal: renderPortal, ai: renderAI, insikter: renderInsights, ekonomi: renderEconomy,
    minne: renderMemory, integrationer: renderIntegrations, konto: renderAccount
  };

  // After clicking the reset link in the e-mail: choose a new password
  function renderNewPassword() {
    root.innerHTML = '<div class="login"><aside class="login__side"><span class="brand">' + MARK + 'Elevate Studio</span><div><h1>Nytt <span class="serif">lösenord.</span></h1></div><p>elevatestudio.nu</p><span class="login__big">' + MARK + '</span></aside>' +
      '<div class="login__form"><form class="login__card" id="newpw"><h2>Välj nytt lösenord</h2><label class="field">Nytt lösenord (minst 8 tecken)<input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
      '<button class="btn btn--block" type="submit">Spara lösenord</button><p class="msg" id="pw-msg"></p></form></div></div>';
    $('#newpw').addEventListener('submit', function (e) {
      e.preventDefault();
      sb.auth.updateUser({ password: e.target.pw.value }).then(function (r) {
        if (r.error) { $('#pw-msg').textContent = r.error.message; return; }
        history.replaceState(null, '', location.pathname);
        start(r.data.user);
      });
    });
  }
  var recovering = /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange(function (event) { if (event === 'PASSWORD_RECOVERY') { recovering = true; renderNewPassword(); } });

  /* ---------- Start ---------- */
  sb.auth.getSession().then(function (r) {
    var u = r.data && r.data.session && r.data.session.user;
    if (recovering) return renderNewPassword();
    if (u) start(u); else renderLogin();
  });
})();
