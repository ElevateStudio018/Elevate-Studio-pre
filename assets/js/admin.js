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
    ['oscar', 'Oscar Svanerud', 'svanerudo@gmail.com', ['todo', 'leads', 'vunna', 'arkiv', 'kalender', 'fakturor', 'statistik', 'besokare', 'konto'], ['oskar@elevatestudio.nu', 'oscar@elevatestudio.nu']],
    ['', 'Elevate Studio', 'info@elevatestudio.nu']];
  var profile = function (email) { email = String(email || '').toLowerCase(); return PROFILES.find(function (p) { return p[2] === email || (p[4] || []).indexOf(email) >= 0; }) || PROFILES[3]; };
  // A profile with a list sees only those pages (and no mail campaigns); the others see everything
  var allowed = function (view) { var only = profile(st.user && st.user.email)[3]; return !only || only.indexOf(view) >= 0; };
  // Whose lead it is: the leads table has no owner column, so the owner is a tag on the first line of
  // the comment ("[Oscar]"). It is hidden in the comment fields and shown as a badge instead.
  var OWNER_RE = /^\[(Carl|Isak|Oscar)\]\n?/, META_RE = /^(web|github): ?(.*)$/;
  var ownerOf = function (l) { var m = OWNER_RE.exec((l && l.admin_notes) || ''); return m ? m[1] : ''; };
  // The old website and the new one on GitHub are lines like "web: https://…" at the top of the comment
  var metaOf = function (l) { var m = {}; ((l && l.admin_notes) || '').replace(OWNER_RE, '').split('\n').forEach(function (line) { var x = META_RE.exec(line.trim()); if (x) m[x[1]] = x[2].trim(); }); return m; };
  var noteOf = function (l) { return ((l && l.admin_notes) || '').replace(OWNER_RE, '').split('\n').filter(function (line) { return !META_RE.test(line.trim()); }).join('\n').trim(); };
  var withOwner = function (owner, note, meta) {
    meta = meta || {}; var lines = [];
    if (owner) lines.push('[' + owner + ']');
    if (meta.web) lines.push('web: ' + meta.web.trim());
    if (meta.github) lines.push('github: ' + meta.github.trim());
    note = (note || '').trim(); if (note) lines.push(note);
    return lines.length ? lines.join('\n') : null;
  };
  // Carl, Isak and Oscar see their own leads and the ones nobody has taken yet; the Elevate account sees everyone's
  var myTag = function () { var p = profile(st.user && st.user.email); return p[0] ? p[1].split(' ')[0] : ''; };
  var canSee = function (l) { var m = myTag(); return !m || !ownerOf(l) || ownerOf(l) === m; };
  var me = function () { return profile(st.user && st.user.email)[1]; };
  var senderKey = function (who) { return (TEAM.find(function (t) { return t[1] === who || t[0] === who; }) || [''])[0].toLowerCase(); };
  var st = { user: null, leads: [], view: (location.hash.slice(1).match(/^[a-z]+$/) || ['todo'])[0], stage: 'all', q: '', sort: 'next', shown: 40, period: 90, arch: 'archived' };

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
        var m = err.message || '';
        renderLogin(/not confirmed/i.test(m) ? 'E-posten är inte bekräftad än. Klicka först på länken i bekräftelsemejlet som skickades när inloggningen skapades.'
          : /invalid/i.test(m) ? 'Fel e-post eller lösenord – eller så finns ingen inloggning för den adressen än (den skapas under Konto → Profiler).' : m);
      });
    });
  }

  function start(user) {
    return sb.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(function (r) {
      if (r.error || !r.data) { sb.auth.signOut(); renderLogin('Kontot saknar admin-behörighet.'); return; }
      st.user = user;
      if (!VIEWS[st.view] || !allowed(st.view)) st.view = 'todo';
      renderShell();
      return loadLeads();
    });
  }

  /* ---------- Shell ---------- */
  var NAV = [
    ['Försäljning', [['todo', 'Att göra', 'inbox'], ['leads', 'Alla leads', 'layers'], ['vunna', 'Vunna', 'star'], ['kalender', 'Kalender', 'cal'], ['kontakter', 'Kontakter', 'users'], ['fakturor', 'Fakturor', 'file']]],
    ['Marknadsföring', [['utskick', 'Utskick', 'send'], ['segment', 'Segment', 'layers'], ['besokare', 'Besökare', 'eye'], ['chatten', 'Chatten', 'msg']]],
    ['Mer', [['statistik', 'Statistik', 'chart'], ['arkiv', 'Arkiv', 'door'], ['konton', 'Konton', 'users'], ['import', 'Importera leads', 'inbox'], ['kundportal', 'Kundportal', 'door'], ['ai', 'AI-assistent', 'spark'], ['insikter', 'Insikter', 'chart'],
      ['ekonomi', 'Ekonomi', 'wallet'], ['minne', 'AI-minne', 'brain'], ['integrationer', 'Integrationer', 'plug'], ['konto', 'Mitt konto', 'user']], true]
  ];
  var BADGE = { todo: 1, leads: 1, vunna: 1, arkiv: 1 };
  var VIEWS = {};
  NAV.forEach(function (g) { g[1].forEach(function (v) { VIEWS[v[0]] = v[1]; }); });

  function renderShell() {
    root.innerHTML = '<div class="shell" id="shell"><aside class="side"><a class="brand" href="../index.html">' + MARK + 'Elevate Studio</a><nav class="side__nav">' +
      NAV.map(function (g) {
        var items = g[1].filter(function (v) { return allowed(v[0]); });
        if (!items.length) return '';
        var list = items.map(function (v) { return '<button class="nav" data-view="' + v[0] + '">' + ICON[v[2]] + v[1] + (BADGE[v[0]] ? '<em class="nav__n" data-n="' + v[0] + '" hidden></em>' : '') + '</button>'; }).join('');
        var inside = items.some(function (v) { return v[0] === st.view; });
        return g[2] ? '<details class="side__more"' + (inside ? ' open' : '') + '><summary>' + g[0] + '</summary>' + list + '</details>' : '<small>' + g[0] + '</small>' + list;
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
      st.leads = (r.data || []).filter(canSee);
      render();
      syncBookings();
    });
  }

  function render() {
    root.querySelectorAll('.nav[data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === st.view); });
    if (!allowed(st.view)) st.view = 'todo';
    syncBadges();
    var fn = PAGES[st.view];
    if (fn) return fn();
    renderTodo();
  }

  /* ---------- Leads: one next step per lead ---------- */
  var OWNER_COLOR = { Carl: '#1d3b2a', Isak: '#2a7f78', Oscar: '#8a6a1f' };
  var STAGE = { new: 'Ny', contacted: 'Kontakt', meeting_to_book: 'Möte', meeting_booked: 'Möte', meeting_rebook: 'Möte', meeting_held: 'Offert', quote_sent: 'Offert', waiting: 'Offert', negotiation: 'Offert', sold: 'Vunnen', done: 'Vunnen', lost: 'Förlorad', archived: 'Arkiverad' };
  var STAGES = [['all', 'Alla'], ['Ny', 'Ny'], ['Kontakt', 'Kontakt'], ['Möte', 'Möte'], ['Offert', 'Offert']];
  var WON = ['sold', 'done'], GONE = ['lost', 'archived'];
  var isOpen = function (l) { return CLOSED.indexOf(l.status || 'new') < 0; };
  var openLeads = function () { return st.leads.filter(isOpen); };
  function lead(id) { return st.leads.find(function (l) { return l.id === id; }); }
  function update(id, patch) {
    return sb.from('quote_requests').update(patch).eq('id', id).select().then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('Ändringen sparades inte – saknar kontot admin-behörighet?');
      Object.assign(lead(id), r.data[0]);
    });
  }
  var BTN = { call: 'Ring', propose: 'Låt kunden välja tid', offer: 'Skapa offert', mail: 'Mejla', remind: 'Påminn', open: 'Öppna', meet: 'Öppna mötet' };
  // The five steps of a lead's journey; a tap on a step moves the lead there
  var STEPS = ['Ny', 'Kontakt', 'Möte', 'Offert', 'Vunnen'], STEP_STATUS = ['new', 'contacted', 'meeting_to_book', 'quote_sent', 'sold'];
  function steps(l) {
    var cur = STEPS.indexOf(STAGE[l.status || 'new']); if (cur < 0) return '';
    return '<div class="steps">' + STEPS.map(function (s, i) {
      return (i ? '<i' + (i <= cur ? ' class="on"' : '') + '></i>' : '') + '<button type="button" class="step' + (i < cur ? ' done' : i === cur ? ' cur' : '') + '" data-step="' + i + '" title="' + (i === cur ? 'Här är leaden nu' : 'Flytta till ' + s) + '"><span>' + (i < cur ? '&#10003;' : i + 1) + '</span><small>' + s + '</small></button>';
    }).join('') + '</div>';
  }
  // The first thing Carl, Isak or Oscar does with an unassigned lead makes it theirs
  function claim(l) {
    var m = myTag(); if (!m || ownerOf(l)) return Promise.resolve(l);
    return update(l.id, { admin_notes: withOwner(m, noteOf(l), metaOf(l)) }).then(function (x) { toast('Leaden är nu din'); return x || l; });
  }
  function moveTo(l, i) {
    if (i === 4) return openSold(l);
    var status = i === 2 && l.booking_at && Date.parse(l.booking_at) > Date.now() ? 'meeting_booked' : STEP_STATUS[i];
    if (status === (l.status || 'new')) return openLead(l);
    claim(l).then(function () { return update(l.id, { status: status }); }).then(function () { render(); toast('Flyttad till ' + STEPS[i]); }).catch(function (err) { toast(err.message); });
  }
  // What comes next in each status, what the button does, and how many days it may wait
  var NEXT = { new: ['Ring upp', 'call', 1], contacted: ['Boka ett möte', 'propose', 2], meeting_to_book: ['Väntar på att kunden väljer tid', 'remind', 3], meeting_rebook: ['Boka om mötet', 'propose', 0],
    meeting_held: ['Skicka offert', 'offer', 1], quote_sent: ['Följ upp offerten', 'mail', 3], waiting: ['Påminn om offerten', 'mail', 5], negotiation: ['Avsluta affären', 'open', 2] };
  function nextStep(l) {
    var s = l.status || 'new', now = Date.now();
    var bk = l.booking_at ? Date.parse(l.booking_at) : 0, fu = l.followup_at ? Date.parse(l.followup_at) : 0;
    if (s === 'meeting_booked' && bk) {
      return bk > now - 36e5 ? { label: 'Möte ' + dt(l.booking_at, { weekday: 'short', hour: '2-digit', minute: '2-digit' }), due: bk, act: 'meet' } : { label: 'Mötet är över – hur gick det?', due: now, act: 'open' };
    }
    var n = NEXT[s]; if (!n) return null;
    var base = Date.parse(l.updated_at || l.created_at) || now;
    return { label: n[0], due: fu || base + n[2] * 864e5, act: n[1] };
  }
  var endOfDay = function (ms) { var d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); };
  function bucketOf(due) {
    var today = endOfDay(Date.now());
    return due <= today ? 'today' : due <= today + 864e5 ? 'tomorrow' : due <= today + 6 * 864e5 ? 'week' : 'later';
  }
  function dueText(due) {
    var today = endOfDay(Date.now());
    if (due < today - 864e5) return 'försenat · ' + day(new Date(due).toISOString());
    if (due <= today) return 'idag';
    if (due <= today + 864e5) return 'imorgon';
    return new Date(due).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  function row(l, opts) {
    opts = opts || {};
    var s = sInfo(l.status || 'new'), n = isOpen(l) ? nextStep(l) : null, o = ownerOf(l);
    var right = n ? '<b>' + esc(n.label) + '</b><small>' + esc(dueText(n.due)) + '</small>'
      : WON.indexOf(s[0]) >= 0 ? '<b>' + (l.sold_amount != null ? kr(l.sold_amount) : 'Såld') + '</b><small>' + day(l.sold_at || l.created_at) + '</small>'
      : '<b>' + esc(s[1]) + '</b><small>' + day(l.created_at) + '</small>';
    var acts = opts.actions != null ? opts.actions : (n ? primary(l, n) : '');
    return '<article class="row" data-id="' + l.id + '" style="--c:' + s[2] + '">' +
      '<span class="av"' + (o ? ' style="--c:' + OWNER_COLOR[o] + '"' : ' data-none') + ' title="' + esc(o || 'Ingen ansvarig') + '">' + (o ? o.charAt(0) : '?') + '</span>' +
      '<div class="row__who"><b>' + esc(l.name) + (o && o === myTag() ? ' <em class="mine">Min</em>' : o ? ' <em class="whose" style="--c:' + OWNER_COLOR[o] + '">' + esc(o) + 's</em>' : ' <em class="free">Ej tilldelad</em>') + '</b><span>' + esc(l.company || l.service_type || MEETING[l.meeting_type] || 'Förfrågan') + '</span></div>' +
      (isOpen(l) ? steps(l) : '<span class="stg"><i></i>' + esc(STAGE[s[0]] || s[1]) + '</span>') +
      '<div class="row__next">' + right + '</div>' +
      '<div class="row__acts">' + acts + '<button class="iconbtn iconbtn--sm" data-act="open" aria-label="Öppna">&#8250;</button></div></article>';
  }
  function primary(l, n) {
    if (n.act === 'call') return l.phone ? '<a class="btn btn--sm" href="tel:' + esc(l.phone) + '" data-act="called">' + ICON.phone + 'Ring</a>' : '<button class="btn btn--sm" data-act="open">Öppna</button>';
    return '<button class="btn btn--sm' + (n.act === 'open' || n.act === 'meet' ? ' btn--ghost' : '') + '" data-act="' + n.act + '">' + esc(BTN[n.act]) + '</button>';
  }
  function bindRows() {
    root.querySelectorAll('.row').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var l = lead(el.dataset.id); if (!l) return;
        var a = e.target.closest('[data-act]');
        if (!a && !e.target.closest('[data-step]')) { if (!e.target.closest('a, button')) openLead(l); return; }
        var step = e.target.closest('[data-step]');
        if (step) { e.preventDefault(); return moveTo(l, Number(step.dataset.step)); }
        var act = a.dataset.act;
        if (act === 'called') { markContacted(l); return; }
        e.preventDefault();
        if (act === 'open' || act === 'meet') openLead(l);
        if (act === 'propose') proposeTimes(l);
        if (act === 'offer') openOffer(l);
        if (act === 'mail' || act === 'remind') composeMail(l);
        if (act === 'review') openReview(l);
        if (act === 'delete') removeLead(l);
        if (act === 'reopen') update(l.id, { status: 'contacted' }).then(function () { render(); toast('Leaden är öppen igen och ligger under Alla leads'); }).catch(function (err) { toast(err.message); });
      });
    });
  }
  // Ring from the list: a new lead becomes "kontaktad", with a reminder to call again in two days
  function markContacted(l) {
    claim(l);
    if ((l.status || 'new') !== 'new') return;
    var fu = new Date(Date.now() + 2 * 864e5); fu.setHours(9, 0, 0, 0);
    update(l.id, { status: 'contacted', followup_at: fu.toISOString() }).then(function () { render(); toast('Markerad som kontaktad. Dyker upp igen ' + fu.toLocaleDateString('sv-SE', { weekday: 'long' }) + '.'); }).catch(function () {});
  }
  function removeLead(l, after) {
    if (!confirm('Ta bort ' + l.name + ' för gott? Det går inte att ångra.')) return;
    sb.from('quote_requests').delete().eq('id', l.id).select().then(function (r) {
      if (r.error || !r.data || !r.data.length) return toast(r.error ? r.error.message : 'Kunde inte ta bort.');
      st.leads = st.leads.filter(function (x) { return x.id !== l.id; }); if (after) after(); render(); toast('Leaden är borttagen');
    });
  }
  function section(title, rows, empty) {
    if (!rows.length && !empty) return '';
    return '<h2 class="sec">' + title + (rows.length ? ' <em>' + rows.length + '</em>' : '') + '</h2>' + (rows.length ? rows.map(function (l) { return row(l); }).join('') : '<p class="empty empty--sm">' + empty + '</p>');
  }
  function syncBadges() {
    var n = { todo: 0, leads: openLeads().length, vunna: 0, arkiv: 0 };
    openLeads().forEach(function (l) { var x = nextStep(l); if (x && bucketOf(x.due) === 'today') n.todo++; });
    st.leads.forEach(function (l) { if (WON.indexOf(l.status) >= 0) n.vunna++; if (GONE.indexOf(l.status) >= 0) n.arkiv++; });
    root.querySelectorAll('[data-n]').forEach(function (e) { e.textContent = n[e.dataset.n] || ''; e.hidden = !n[e.dataset.n]; });
  }

  /* Att göra: today's list, then tomorrow and the rest of the week */
  function renderTodo() {
    var h = new Date().getHours(), greet = h < 10 ? 'God morgon' : h < 17 ? 'Hej' : 'God kväll', first = me().split(' ')[0];
    var items = openLeads().map(function (l) { return { l: l, n: nextStep(l) }; }).filter(function (x) { return x.n; }).sort(function (a, b) { return a.n.due - b.n.due; });
    var b = { today: [], tomorrow: [], week: [], later: [] };
    items.forEach(function (x) { b[bucketOf(x.n.due)].push(x.l); });
    var eod = endOfDay(Date.now()), sod = eod - 864e5 + 1;
    var meetings = st.leads.filter(function (l) { var x = l.booking_at && Date.parse(l.booking_at); return x && x >= sod && x <= eod; }).length;
    var waiting = st.leads.filter(function (l) { return ['quote_sent', 'waiting', 'negotiation'].indexOf(l.status) >= 0; }).length;
    main().innerHTML = head(greet + ', ' + esc(first), b.today.length ? b.today.length + (b.today.length === 1 ? ' sak' : ' saker') + ' idag. Sen är du klar.' : 'Inget som brådskar idag.', '<button class="btn" id="newlead">+ Ny lead</button>') +
      '<div class="focus"><div class="f is-hot"><b>' + b.today.length + '</b><span>att göra idag</span></div><button class="f" id="f-cal"><b>' + meetings + '</b><span>möten idag</span></button><button class="f" id="f-off"><b>' + waiting + '</b><span>offerter som väntar svar</span></button></div>' +
      teamStrip() +
      section('Idag', b.today, 'Inget idag – bra jobbat.') + section('Imorgon', b.tomorrow, '') + section('Senare i veckan', b.week, '') +
      (b.later.length ? section('Längre fram', b.later.slice(0, 8)) + (b.later.length > 8 ? '<p class="muted small">… och ' + (b.later.length - 8) + ' till under Alla leads.</p>' : '') : '') +
      (!items.length ? '<p class="empty">Inga öppna leads. Lägg in en med knappen uppe till höger.</p>' : '');
    $('#newlead').addEventListener('click', newLead);
    $('#f-cal').addEventListener('click', function () { go('kalender'); });
    $('#f-off').addEventListener('click', function () { st.stage = 'Offert'; go('leads'); });
    if ($('#team')) $('#team').addEventListener('click', function () { go('statistik'); });
    bindRows();
  }

  // The team's closing rate the last 90 days, one chip per person; opens the statistics
  function teamStrip() {
    var rows = personRows(90).filter(function (r) { return r.who && (r.won || r.lost || r.open); });
    if (!rows.length) return '';
    return '<button class="team" id="team" title="Öppna statistiken">' + rows.map(function (r) {
      return '<span class="team__p"><span class="av" style="--c:' + OWNER_COLOR[r.who] + '">' + r.who.charAt(0) + '</span>' + esc(r.who) + ' <b>' + (r.rate == null ? '–' : r.rate + ' %') + '</b>' + (r.amount ? ' · ' + kr(r.amount) : '') + '</span>';
    }).join('') + '<span class="team__lbl">closing rate · 90 dagar</span></button>';
  }

  /* Alla leads: the open ones, with search and a stage filter */
  function filtered() {
    var q = st.q.toLowerCase();
    var rows = openLeads().filter(function (l) {
      if (st.stage !== 'all' && STAGE[l.status || 'new'] !== st.stage) return false;
      if (!q) return true;
      return [l.name, l.company, l.email, l.phone, l.service_type, l.admin_notes].some(function (v) { return v && String(v).toLowerCase().indexOf(q) > -1; });
    });
    if (st.sort === 'next') return rows.map(function (l) { return [l, (nextStep(l) || { due: Infinity }).due]; }).sort(function (a, b) { return a[1] - b[1]; }).map(function (x) { return x[0]; });
    var key = st.sort.indexOf('booking') === 0 ? 'booking_at' : 'created_at', asc = /asc$/.test(st.sort);
    return rows.sort(function (a, b) {
      var x = a[key] ? Date.parse(a[key]) : (asc ? Infinity : -Infinity), y = b[key] ? Date.parse(b[key]) : (asc ? Infinity : -Infinity);
      return asc ? x - y : y - x;
    });
  }
  function renderLeads() {
    var rows = filtered(), counts = {}, all = openLeads();
    all.forEach(function (l) { var k = STAGE[l.status || 'new']; counts[k] = (counts[k] || 0) + 1; });
    main().innerHTML = head('Alla leads', 'Alla öppna leads. Klicka på en rad för allt om kunden.',
      '<button class="btn btn--ghost" id="csv">' + ICON.chart + 'Exportera</button><button class="btn btn--ghost" id="meeting">' + ICON.cal + 'Boka möte</button><button class="btn" id="newlead">+ Ny lead</button>') +
      '<div class="bar"><input class="input" id="q" placeholder="Sök namn, företag, mejl, kommentar …" value="' + esc(st.q) + '">' +
      '<select class="input" id="sort"><option value="next">Nästa steg först</option><option value="created_desc">Nyast först</option><option value="created_asc">Äldst först</option><option value="booking_asc">Möte: närmast</option></select></div>' +
      '<div class="seg">' + STAGES.map(function (s) { var n = s[0] === 'all' ? all.length : counts[s[0]]; return '<button class="seg__b' + (st.stage === s[0] ? ' is-on' : '') + '" data-stage="' + s[0] + '">' + s[1] + (n ? ' <em>' + n + '</em>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="list">' + (rows.slice(0, st.shown).map(function (l) { return row(l); }).join('') || '<p class="empty">Inga leads här.</p>') + '</div>' +
      (rows.length > st.shown ? '<button class="btn btn--ghost more" id="more">Visa fler (' + (rows.length - st.shown) + ' kvar)</button>' : '');
    $('#sort').value = st.sort;
    $('#q').addEventListener('input', function (e) { st.q = e.target.value; st.shown = 40; var pos = e.target.selectionStart; renderLeads(); var n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); });
    $('#sort').addEventListener('change', function (e) { st.sort = e.target.value; renderLeads(); });
    root.querySelectorAll('[data-stage]').forEach(function (b) { b.addEventListener('click', function () { st.stage = b.dataset.stage; st.shown = 40; renderLeads(); }); });
    if ($('#more')) $('#more').addEventListener('click', function () { st.shown += 40; renderLeads(); });
    $('#newlead').addEventListener('click', newLead);
    $('#meeting').addEventListener('click', function () { bookMeeting(); });
    $('#csv').addEventListener('click', exportCsv);
    bindRows();
  }

  /* Vunna: the sold ones, with the amounts */
  function renderWon() {
    var rows = st.leads.filter(function (l) { return WON.indexOf(l.status) >= 0; }).sort(function (a, b) { return Date.parse(b.sold_at || b.created_at) - Date.parse(a.sold_at || a.created_at); });
    var sum = function (L) { return L.reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0); };
    var year = rows.filter(function (l) { return l.sold_at && Date.now() - Date.parse(l.sold_at) < 365 * 864e5; });
    main().innerHTML = head('Vunna affärer', rows.length + (rows.length === 1 ? ' affär' : ' affärer') + ' · ' + kr(sum(rows)) + ' totalt' + (year.length ? ' · ' + kr(sum(year)) + ' senaste året' : '')) +
      '<div class="list">' + (rows.map(function (l) { return row(l, { actions: l.email ? '<button class="btn btn--sm btn--ghost" data-act="review">' + ICON.star + 'Be om recension</button>' : '' }); }).join('') || '<p class="empty">Inga vunna affärer än.</p>') + '</div>';
    bindRows();
  }

  /* Arkiv: archived and lost leads, out of the way but never gone */
  function renderArchive() {
    var count = function (s) { return st.leads.filter(function (l) { return l.status === s; }).length; };
    var rows = st.leads.filter(function (l) { return l.status === st.arch; }).sort(function (a, b) { return Date.parse(b.created_at) - Date.parse(a.created_at); });
    main().innerHTML = head('Arkiv', 'Arkiverade och förlorade leads ligger här, utanför listorna. De kan öppnas igen när som helst.') +
      '<div class="seg"><button class="seg__b' + (st.arch === 'archived' ? ' is-on' : '') + '" data-arch="archived">Arkiverade <em>' + count('archived') + '</em></button><button class="seg__b' + (st.arch === 'lost' ? ' is-on' : '') + '" data-arch="lost">Förlorade <em>' + count('lost') + '</em></button></div>' +
      '<div class="list">' + (rows.map(function (l) { return row(l, { actions: '<button class="btn btn--sm btn--ghost" data-act="reopen">Öppna igen</button><button class="btn btn--sm btn--ghost" data-act="delete">Ta bort</button>' }); }).join('') || '<p class="empty">Tomt här.</p>') + '</div>';
    root.querySelectorAll('[data-arch]').forEach(function (b) { b.addEventListener('click', function () { st.arch = b.dataset.arch; renderArchive(); }); });
    bindRows();
  }

  /* Statistik: who closes most, and the funnel */
  function personRows(days) {
    var from = days ? Date.now() - days * 864e5 : 0, inP = function (iso) { return !!iso && Date.parse(iso) >= from; };
    return [['Carl', 'Carl From'], ['Isak', 'Isak Mattsson'], ['Oscar', 'Oscar Svanerud'], ['', 'Ingen ansvarig']].map(function (p) {
      var L = st.leads.filter(function (l) { return ownerOf(l) === p[0]; });
      var won = L.filter(function (l) { return WON.indexOf(l.status) >= 0 && inP(l.sold_at || l.created_at); });
      var lost = L.filter(function (l) { return l.status === 'lost' && inP(l.created_at); }).length;
      var amount = won.reduce(function (s, l) { return s + Number(l.sold_amount || 0); }, 0);
      return { who: p[0], name: p[1], leads: L.filter(function (l) { return inP(l.created_at); }).length, meetings: L.filter(function (l) { return inP(l.booking_at); }).length,
        open: L.filter(isOpen).length, won: won.length, lost: lost, amount: amount, rate: won.length + lost ? Math.round(won.length / (won.length + lost) * 100) : null };
    }).filter(function (r) { return r.leads || r.won || r.lost || r.open; });
  }
  function renderStats() {
    var rows = personRows(st.period), from = st.period ? Date.now() - st.period * 864e5 : 0, inP = function (iso) { return !!iso && Date.parse(iso) >= from; };
    var L = st.leads.filter(function (l) { return inP(l.created_at); });
    var f = [L.length, L.filter(function (l) { return (l.status || 'new') !== 'new'; }).length, L.filter(function (l) { return !!l.booking_at; }).length,
      L.filter(function (l) { return ['quote_sent', 'waiting', 'negotiation', 'sold', 'done'].indexOf(l.status) >= 0; }).length, L.filter(function (l) { return WON.indexOf(l.status) >= 0; }).length];
    var won = rows.reduce(function (s, r) { return s + r.won; }, 0), lost = rows.reduce(function (s, r) { return s + r.lost; }, 0), amount = rows.reduce(function (s, r) { return s + r.amount; }, 0);
    var cell = function (v) { return '<td>' + v + '</td>'; };
    main().innerHTML = head('Statistik', 'Vem closar mest, och hur tratten ser ut.') +
      '<div class="seg">' + [[30, '30 dagar'], [90, '90 dagar'], [365, 'Ett år'], [0, 'Allt']].map(function (p) { return '<button class="seg__b' + (st.period === p[0] ? ' is-on' : '') + '" data-period="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      '<div class="stats"><section class="st"><h3>Closing rate</h3>' + (rows.length ? rows.map(function (r) {
        return '<div class="pr"><span class="av"' + (r.who ? ' style="--c:' + OWNER_COLOR[r.who] + '"' : ' data-none') + '>' + (r.who ? r.who.charAt(0) : 'E') + '</span><span>' + esc(r.who || 'Ingen') + '</span><i style="--w:' + (r.rate || 0) + '%"></i><b>' + (r.rate == null ? '–' : r.rate + ' %') + '</b></div>';
      }).join('') : '<p class="muted">Inga leads i perioden.</p>') + '<p class="muted small" style="margin:10px 0 0">Vunna delat med vunna + förlorade.</p></section>' +
      '<section class="st"><h3>Tratten</h3><div class="fun">' + f.map(function (n, i) { return '<div style="--o:' + (0.35 + i * 0.16) + ';height:' + (f[0] ? Math.max(20, Math.round(n / f[0] * 100)) : 20) + '%">' + n + '</div>'; }).join('') + '</div><div class="lbls"><span>Leads</span><span>Kontakt</span><span>Möte</span><span>Offert</span><span>Vunna</span></div></section>' +
      '<section class="st"><h3>Sålt</h3><div class="big">' + kr(amount) + '<small>' + won + (won === 1 ? ' affär' : ' affärer') + (won ? ' · snitt ' + kr(amount / won) : '') + (won + lost ? ' · closing rate ' + Math.round(won / (won + lost) * 100) + ' %' : '') + '</small></div></section></div>' +
      '<div class="tbl"><table><thead><tr><th>Person</th><th>Leads</th><th>Möten</th><th>Öppna nu</th><th>Vunna</th><th>Förlorade</th><th>Closing rate</th><th>Sålt</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td><b>' + esc(r.name) + '</b></td>' + cell(r.leads) + cell(r.meetings) + cell(r.open) + cell(r.won) + cell(r.lost) + cell(r.rate == null ? '–' : r.rate + ' %') + cell(kr(r.amount)) + '</tr>'; }).join('') +
      '<tr class="tot"><td>Alla</td>' + cell(f[0]) + cell(rows.reduce(function (s, r) { return s + r.meetings; }, 0)) + cell(openLeads().length) + cell(won) + cell(lost) + cell(won + lost ? Math.round(won / (won + lost) * 100) + ' %' : '–') + cell(kr(amount)) + '</tr></tbody></table></div>' +
      '<p class="muted small" style="margin-top:10px">Ansvarig sätts i leadens fönster. Leads, möten och förlorade räknas på när leaden kom in; vunna på när affären stängdes.</p>';
    root.querySelectorAll('[data-period]').forEach(function (b) { b.addEventListener('click', function () { st.period = Number(b.dataset.period); renderStats(); }); });
  }

  /* Konton: the team's logins, opened from here */
  /* Importera leads: the three Google Sheets tabs, turned into admin/import.json by the build. Only the
     Elevate account imports, because it is the one that sees everyone's leads and can tell what is already in. */
  function renderImport() {
    if (myTag()) { main().innerHTML = head('Importera leads', 'Listorna från Google Sheets.') + info('Logga in som Elevate Studio', 'Importen jämför mot allas leads för att inte lägga in dubbletter, så den görs från Elevate-kontot (info@elevatestudio.nu).'); return; }
    main().innerHTML = head('Importera leads', 'Isaks, Carls och Oscars listor från Google Sheets. Det som redan finns i admin hoppas över.') + '<p class="empty">Hämtar listan …</p>';
    var digits = function (s) { return String(s || '').replace(/\D/g, '').replace(/^46/, '0'); };
    var key = function (s) { return String(s || '').toLowerCase().replace(/\b(ab|i|&|och)\b/g, ' ').replace(/[^a-z0-9åäö]+/g, ' ').trim(); };
    var existing = function (x) {
      return st.leads.find(function (l) {
        return (x.email && l.email && l.email.toLowerCase() === x.email.toLowerCase()) || (x.phone && l.phone && digits(l.phone) === digits(x.phone)) ||
          (key(x.company) && (key(l.company) === key(x.company) || key(l.name) === key(x.company)));
      });
    };
    sb.auth.getSession().then(function (s) { return fetch('/api/leads/import', { headers: { Authorization: 'Bearer ' + (s.data.session ? s.data.session.access_token : '') } }); }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); }).then(function (list) {
      var rows = list.map(function (x) { return { x: x, dup: existing(x) }; });
      var fresh = rows.filter(function (r) { return !r.dup; });
      main().innerHTML = head('Importera leads', 'Isaks, Carls och Oscars listor från Google Sheets. Det som redan finns i admin hoppas över.',
        fresh.length ? '<button class="btn" id="imp-go">Lägg in ' + fresh.length + ' nya leads</button>' : '') +
        kpis([['I listorna', list.length], ['Nya', fresh.length], ['Finns redan', rows.length - fresh.length]]) +
        '<div class="tablewrap"><table class="tbl"><thead><tr><th></th><th>Företag</th><th>Ansvarig</th><th>Status</th><th>Kontakt</th><th>Ny sajt</th><th>Kommentar</th></tr></thead><tbody>' +
        rows.map(function (r, i) {
          var x = r.x;
          return '<tr class="' + (r.dup ? 'is-dim' : '') + '"><td>' + (r.dup ? '<span class="tag">Finns: ' + esc(r.dup.company || r.dup.name) + '</span>' : '<input type="checkbox" class="imp" data-i="' + i + '" checked>') + '</td>' +
            '<td><b>' + esc(x.company) + '</b>' + (x.service_type ? '<br><span class="muted">' + esc(x.service_type) + '</span>' : '') + '</td>' +
            '<td><span class="av" style="--c:' + OWNER_COLOR[x.owner] + '">' + x.owner.charAt(0) + '</span> ' + esc(x.owner) + '</td><td>' + esc(STAGE[x.status] || x.status) + '</td>' +
            '<td>' + esc([x.email, x.phone, x.web].filter(Boolean).join(' · ')) + '</td><td>' + (x.github ? '<a href="' + esc(x.github) + '" target="_blank" rel="noopener">' + esc(x.github.split('/').pop()) + '</a>' : '') + '</td>' +
            '<td class="muted" style="max-width:360px;white-space:normal">' + esc(x.note) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      var go = $('#imp-go'); if (!go) return;
      go.addEventListener('click', function () {
        var picks = Array.prototype.map.call(document.querySelectorAll('.imp:checked'), function (c) { return rows[Number(c.dataset.i)].x; });
        if (!picks.length) return toast('Inget markerat');
        go.disabled = true; go.textContent = 'Lägger in …';
        var done = 0, failed = 0;
        var next = function (i) {
          if (i >= picks.length) { toast(done + ' leads inlagda' + (failed ? ', ' + failed + ' misslyckades' : '')); loadLeads().then(function () { renderImport(); }); return; }
          var x = picks[i];
          var note = [x.note, x.first_contact ? 'Första kontakt: ' + x.first_contact : '', x.maps ? 'Google Maps: ' + x.maps : ''].filter(Boolean).join('\n');
          sb.from('quote_requests').insert({ name: x.company, company: x.company, email: x.email || '', phone: x.phone || null, service_type: x.service_type || null, status: x.status || 'contacted',
            meeting_type: 'manual', message: 'Importerad från ' + x.owner + 's lista', admin_notes: withOwner(x.owner, note, { web: x.web, github: x.github }) }).select()
            .then(function (r) { if (r.error) { failed++; console.warn(x.company, r.error.message); } else done++; next(i + 1); })
            .catch(function () { failed++; next(i + 1); });
        };
        next(0);
      });
    }).catch(function () { main().innerHTML = head('Importera leads') + info('Kunde inte hämta listan', 'Servern svarade inte, eller så är du inte inloggad.'); });
  }

  function renderAccounts() {
    var rows = PROFILES.slice(0, 3), stats = personRows(0);
    main().innerHTML = head('Konton', 'Var och en loggar in med sin egen e-post och sitt eget lösenord. Öppna ett konto här så kan personen logga in direkt.') +
      '<div id="acc-note"></div><div class="cards">' + rows.map(function (p) {
        var mine = profile(st.user.email) === p, s = stats.find(function (r) { return r.who === p[1].split(' ')[0]; }) || { open: 0, won: 0, rate: null };
        return '<article class="cardx"><h3>' + esc(p[1]) + '</h3><p>' + esc(p[2]) + '</p><div class="mini"><span><b>' + s.open + '</b> öppna</span><span><b>' + s.won + '</b> vunna</span><span><b>' + (s.rate == null ? '–' : s.rate + ' %') + '</b> closing rate</span></div>' +
          '<footer>' + (mine ? '<span class="pill pill--on">Du</span>' : '<span></span>') + '<button class="btn btn--sm' + (mine ? ' btn--ghost' : '') + '" data-profile="' + esc(p[2]) + '">' + (mine ? 'Byt lösenord' : 'Öppna konto') + '</button></footer></article>';
      }).join('') + '</div>';
    root.querySelectorAll('[data-profile]').forEach(function (b) {
      b.addEventListener('click', function () { var p = profile(b.dataset.profile); if (p === profile(st.user.email)) go('konto'); else createLogin(p); });
    });
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
      if (!s.accounts && $('#acc-note')) $('#acc-note').innerHTML = info('Kontona öppnas med ett bekräftelsemejl just nu', 'Lägg in Supabase-projektets service_role-nyckel som Secret med namnet SUPABASE_SERVICE_KEY i Cloudflare (Workers → elevate-studio-pre → Settings → Variables and Secrets). Då öppnas kontona direkt, utan mejl. Hittas i Supabase under Project Settings → API.');
    }).catch(function () {});
  }

  /* Let the customer pick the time: a mail with free times from the Google calendar, booked on /boka/… */
  function proposeTimes(l) {
    if (!l.email) return toast('E-postadress saknas på leaden.');
    var hosts = {}; TEAM.forEach(function (m) { hosts[m[0].toLowerCase()] = m[1]; }); hosts[''] = 'Elevate Studio';
    dialog('<form id="pt"><h2>Låt kunden välja tid</h2><p>' + esc(l.name) + ' får ett mejl med lediga tider från Google-kalendern och bokar själv. Upptagna tider syns inte som lediga. Mötet hamnar i kalendern, på leaden och i din inkorg.</p>' +
      '<div class="grid3">' + form([{ name: 'host', label: 'Värd', options: hosts, value: senderKey(me()) }, { name: 'minutes', label: 'Längd', options: { 15: '15 min', 30: '30 min', 45: '45 min', 60: '60 min' }, value: '30' },
        { name: 'type', label: 'Typ', options: { google_meet: 'Google Meet', phone: 'Telefonmöte', teams: 'Microsoft Teams' }, value: 'google_meet' }]) + '</div>' +
      form([{ name: 'message', label: 'Meddelande i mejlet (valfritt)', type: 'textarea', rows: 5 }]) +
      '<div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button type="button" class="btn btn--ghost" id="pt-link">Bara skapa länk</button><button class="btn" type="submit">' + ICON.send + 'Skicka mejlet</button></div><p class="msg ok" id="pt-msg"></p></form>', function (d) {
      var f = $('#pt', d);
      tabFill(f.elements.message, function () { var we = f.elements.host.value ? 'jag' : 'vi'; return 'Tack för att du hörde av dig! På mötet går ' + we + ' igenom ert företag, vad hemsidan ska ge er och hur ett upplägg kan se ut. Det kostar ingenting. Välj den tid som passar dig bäst.'; });
      var send = function (mail) {
        var v = function (n) { return f.elements[n].value.trim(); }, btns = d.querySelectorAll('button'), m = $('#pt-msg', d);
        btns.forEach(function (b) { b.disabled = true; });
        sb.auth.getSession().then(function (r) {
          var token = r.data && r.data.session && r.data.session.access_token;
          return fetch('/api/booking/link', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ lead_id: l.id, sender: v('host'), minutes: Number(v('minutes')), type: v('type'), message: v('message'), send: mail }) });
        }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (b) { return { ok: res.ok, b: b }; }); }, function () { return { ok: false, b: { error: 'Servern svarade inte.' } }; })
          .then(function (x) {
            if (!x.ok) {
              btns.forEach(function (b) { b.disabled = false; }); m.className = 'msg';
              m.textContent = x.b.error === 'not_configured' ? 'Gmail är inte kopplat än (se Integrationer).' : x.b.error === 'auth' ? 'Du behöver logga in igen.' : 'Det gick inte: ' + (x.b.error || 'fel');
              return;
            }
            var s = l.status || 'new', bump = s === 'new' || s === 'contacted' || s === 'meeting_rebook' ? update(l.id, { status: 'meeting_to_book' }).catch(function () {}) : Promise.resolve();
            bump.then(function () {
              if (mail) { d.remove(); render(); toast('Mejlet med lediga tider är skickat till ' + l.email); return; }
              m.className = 'msg ok'; m.innerHTML = 'Länken är skapad – skicka den i ett sms eller en chatt:<br><input class="input" readonly value="' + esc(x.b.url) + '" data-select style="margin-top:8px">';
              btns.forEach(function (b) { b.disabled = false; }); render();
            });
          });
      };
      f.addEventListener('submit', function (e) { e.preventDefault(); send(true); });
      $('#pt-link', d).addEventListener('click', function () { send(false); });
    });
  }

  /* Meetings the customers booked themselves land on the leads (the calendar event carries the lead's id) */
  function syncBookings() {
    return sb.auth.getSession().then(function (r) {
      var token = r.data && r.data.session && r.data.session.access_token; if (!token) return null;
      return fetch('/api/booking/sync', { headers: { Authorization: 'Bearer ' + token } }).then(function (res) { return res.ok ? res.json() : null; });
    }).then(function (b) {
      if (!b || !b.rows || !b.rows.length) return;
      var jobs = [];
      b.rows.forEach(function (x) {
        var l = lead(x.lead_id); if (!l) return;
        if (l.booking_at && Math.abs(Date.parse(l.booking_at) - Date.parse(x.at)) < 6e4) return;
        var type = x.type === 'phone' ? 'phone' : x.type === 'teams' ? 'teams' : 'google_meet';
        var host = TEAM.find(function (m) { return m[0].toLowerCase() === x.host; });
        jobs.push(update(l.id, { booking_at: x.at, status: 'meeting_booked', meeting_type: type }).then(function () {
          return Promise.all([
            sb.from('calendar_activities').insert({ title: 'Möte: ' + (l.company || l.name), category: 'meeting', starts_at: x.at, ends_at: new Date(Date.parse(x.at) + x.minutes * 6e4).toISOString(), location: x.link,
              description: ['Kunden valde tiden själv', host ? 'Värd: ' + host[1] : '', l.email, l.phone].filter(Boolean).join('\n'), link: '/admin', created_by: st.user.id }),
            sb.from('meeting_invites').insert({ quote_request_id: l.id, booking_at: x.at, duration_min: x.minutes, meet_link: x.link, recipients: [l.email], recipient_name: l.name, subject: 'Möte med Elevate Studio – kunden valde tiden', created_by: st.user.id })
          ]);
        }).catch(function () {}));
      });
      if (jobs.length) return Promise.all(jobs).then(function () { render(); toast(jobs.length === 1 ? 'En kund har bokat en tid – leaden är uppdaterad.' : jobs.length + ' kunder har bokat tider – leadsen är uppdaterade.'); });
    }).catch(function () {});
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

  // Invoice in the same look as the offer. Our own details (org.nr, bankgiro, swish) are remembered in the browser.
  function openInvoice(l) {
    var O = window.ElevateOffer, today = new Date(), iso = function (x) { return x.toISOString().slice(0, 10); };
    var mem = {}; try { mem = JSON.parse(localStorage.getItem('elevate.invoice') || '{}'); } catch (e) { mem = {}; }
    var fees = O.PACKAGE_FEES[l.selected_package] || O.PACKAGE_FEES.starter;
    var start = l.sold_amount != null && Number(l.sold_amount) ? Number(l.sold_amount) : (l.selected_package === 'elite' && l.estimated_start_cost ? l.estimated_start_cost : fees.start);
    var no = iso(today).slice(2, 4) + String(Date.now()).slice(-5);
    var f = function (id, label, val, type) { return '<label class="field">' + label + '<input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : val) + '"></label>'; };
    var m = metaOf(l), offerNo = (m && m.offer) || '';
    dialog('<h2>Skapa faktura</h2><p>Samma stil som webbavtalet, ifylld för ' + esc(l.company || l.name) + '. Uppgifterna om oss sparas i din webbläsare.</p>' +
      '<div class="grid3">' + f('i-no', 'Fakturanr', no) + f('i-date', 'Fakturadatum', iso(today), 'date') + f('i-due', 'Förfallodatum', iso(new Date(today.getTime() + 30 * 864e5)), 'date') + '</div>' +
      '<div class="grid3">' + f('i-cust', 'Kund', l.company || l.name) + f('i-crep', 'Referens hos kunden', l.name) + f('i-corg', 'Kundens org.nr', l.org_number || '') + '</div>' +
      '<div class="grid2">' + f('i-caddr', 'Kundens adress', l.address || '') + f('i-offer', 'Offert nr (om det finns)', offerNo) + '</div>' +
      '<label class="field">Rader, en per rad: text; belopp exkl. moms<textarea class="input" id="i-rows" rows="4">Webbutveckling – fast startavgift; ' + start + '\nÅrsavgift, första året; ' + fees.yearly + '</textarea></label>' +
      '<label class="check"><input type="checkbox" id="i-vat"' + (mem.vat === false ? '' : ' checked') + '> Lägg på moms 25 %</label>' +
      '<div class="grid3">' + f('i-sorg', 'Vårt org.nr', mem.sellerOrg) + f('i-acct', 'Bankkonto (clearing + kontonummer)', mem.account) + f('i-bg', 'Bankgiro (om ni har)', mem.bankgiro) + '</div>' +
      f('i-saddr', 'Vår adress', mem.sellerAddress) +
      '<label class="field">Meddelande på fakturan (valfritt)<textarea class="input" id="i-note" rows="2"></textarea></label>' +
      '<div class="dlg__row"><button class="btn btn--ghost" data-close>Avbryt</button><button class="btn" id="i-go">Ladda ner faktura</button></div>',
      function (d) {
        $('#i-go', d).addEventListener('click', function (e) {
          var b = e.target; b.disabled = true; b.textContent = 'Skapar …';
          var v = function (id) { return $('#' + id, d).value.trim(); };
          var items = v('i-rows').split('\n').map(function (s) { var p = s.split(';'); return { label: (p[0] || '').trim(), amount: Number(String(p[1] || '').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0 }; }).filter(function (x) { return x.label; });
          var own = { sellerOrg: v('i-sorg'), bankgiro: v('i-bg'), account: v('i-acct'), sellerAddress: v('i-saddr'), vat: $('#i-vat', d).checked };
          try { localStorage.setItem('elevate.invoice', JSON.stringify(own)); } catch (err) { /* fine */ }
          O.buildInvoicePdf({ invoiceNo: v('i-no'), date: v('i-date'), dueDate: v('i-due'), offerNo: v('i-offer'), customer: v('i-cust'), customerRep: v('i-crep'), customerOrg: v('i-corg'), customerAddress: v('i-caddr'),
            items: items, vat: own.vat, sellerOrg: own.sellerOrg, bankgiro: own.bankgiro, account: own.account, sellerAddress: own.sellerAddress, note: v('i-note') })
            .then(function (doc) { doc.save(O.invoicePdfFilename(v('i-cust'), v('i-no'))); d.remove(); toast('Fakturan är nedladdad'); })
            .catch(function (err) { toast(err.message); b.disabled = false; b.textContent = 'Ladda ner faktura'; });
        });
      });
  }

  /* ---------- Shared helpers for the pages ---------- */
  var CUSTOMER = { lead: 'Lead', prospect: 'Blivande kund', active: 'Aktiv kund', paused: 'Pausad', former: 'Tidigare kund', internal: 'Intern' };
  var CATEGORY = { meeting: 'Möte', call: 'Samtal', task: 'Uppgift', deadline: 'Deadline', reminder: 'Påminnelse', personal: 'Personligt', other: 'Övrigt' };
  var SCOPE = { foretag: 'Företaget', operativt: 'Hur vi jobbar', profil: 'Personligt' };
  var main = function () { return $('#main'); };
  document.addEventListener('focusin', function (e) { if (e.target.matches && e.target.matches('input[data-select]')) e.target.select(); });
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
  /* A suggested text shown in grey in an empty field; Tab puts it in, ready to edit */
  function tabFill(el, suggest) {
    var hint = document.createElement('span'); hint.className = 'tabhint'; hint.innerHTML = '<kbd>Tab</kbd> använd förslaget';
    el.parentNode.insertBefore(hint, el);
    var refresh = function () { el.placeholder = suggest(); hint.hidden = !!el.value.trim(); };
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || e.shiftKey || el.value.trim()) return;
      e.preventDefault(); el.value = suggest(); el.setSelectionRange(el.value.length, el.value.length); refresh();
    });
    el.addEventListener('input', refresh); refresh();
    return refresh;
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
      { name: 'web', label: 'Gamla hemsidan (valfritt)', type: 'url', placeholder: 'https://' }, { name: 'github', label: 'Nya hemsidan på GitHub (valfritt)', type: 'url', placeholder: 'https://github.com/ElevateStudio018/…' },
      { name: 'message', label: 'Vad vill de ha?', type: 'textarea' }
    ], function (v) {
      var meta = { web: v.web, github: v.github }, who = me().split(' ')[0]; delete v.web; delete v.github;
      // The one who adds the lead is its owner (Elevate Studio's own login sets none)
      return sb.from('quote_requests').insert(Object.assign(v, { meeting_type: 'manual', admin_notes: withOwner(/^(Carl|Isak|Oscar)$/.test(who) ? who : myTag(), '', meta) })).select().then(function (r) {
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
      form([{ name: 'link', label: 'Möteslänk eller adress', placeholder: 'Tomt vid Google Meet – länken skapas automatiskt' }, { name: 'message', label: 'Meddelande till kunden', type: 'textarea', rows: 6 }]) +
      '<label class="check"><input type="checkbox" name="send" checked> Skicka inbjudan till kunden från ' + GMAIL + '</label>' +
      '<div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">Boka</button></div></form>', function (d) {
      // The link field follows the meeting type: hidden for Google Meet (the link is made when booking)
      var bm = $('#bm', d), linkField = bm.elements.link.closest('.field');
      var auto = document.createElement('p'); auto.className = 'small muted'; auto.style.margin = '-4px 0 14px';
      auto.textContent = 'Google Meet-länken skapas automatiskt när du bokar och kommer med i inbjudan.';
      linkField.parentNode.insertBefore(auto, linkField);
      var LINK = { teams: ['Teams-länk', 'https://teams.microsoft.com/…'], phone: ['Telefonnummer (valfritt)', 'Vi ringer upp på …'], visit: ['Adress', 'Gatuadress, ort'] };
      var syncLink = function () {
        var t = bm.elements.type.value, meet = t === 'google_meet';
        linkField.hidden = meet; auto.hidden = !meet;
        if (meet) { bm.elements.link.value = ''; return; }
        linkField.firstChild.nodeValue = LINK[t][0]; bm.elements.link.placeholder = LINK[t][1];
      };
      bm.elements.type.addEventListener('change', syncLink); syncLink();
      var JOIN = { google_meet: 'Du ansluter med knappen i mejlet. Det fungerar direkt i webbläsaren, du behöver inte installera något.',
        teams: 'Du ansluter med Teams-länken i mejlet. Det går bra direkt i webbläsaren.', phone: 'Vi ringer upp dig på utsatt tid.', visit: 'Vi ses på adressen ovan.' };
      var fillMsg = tabFill(bm.elements.message, function () {
        var we = bm.elements.host.value ? ['jag', 'mig'] : ['vi', 'oss'];
        return ['Tack för att du hörde av dig! På mötet går ' + we[0] + ' igenom ert företag, vad hemsidan ska ge er och hur ett upplägg kan se ut. Mötet kostar ingenting.',
          JOIN[bm.elements.type.value], 'Fundera gärna på två–tre hemsidor ni gillar inför mötet, så träffar ' + we[0] + ' rätt direkt. Passar inte tiden? Svara på det här mejlet så hittar vi en ny.'].join('\n\n');
      });
      bm.elements.type.addEventListener('change', fillMsg); bm.elements.host.addEventListener('change', fillMsg);
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
            if (res.ok) return { how: b.sent === false ? 'booked' : 'sent', link: b.link, provider: b.provider };
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
          var meet = !out.link ? '' : out.provider === 'jitsi' ? ' Videolänken skapades automatiskt (Jitsi). Koppla Google under Integrationer för Google Meet-länkar.'
            : ' Meet-länken är skapad och mötet ligger i Elevates Google Kalender.';
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
      var offer = ['quote_sent', 'waiting', 'negotiation'].indexOf(to.status) >= 0;
      var fillSubject = tabFill(f.elements.subject, function () { return offer ? 'Har du hunnit titta på offerten?' : 'Angående er nya hemsida'; });
      var fillBody = tabFill(f.elements.body, function () {
        var me1 = who !== 'Elevate Studio', we = me1 ? 'jag' : 'vi', us = me1 ? 'mig' : 'oss';
        return offer
          ? (me1 ? 'Jag' : 'Vi') + ' hör av ' + us + ' om offerten ' + we + ' skickade. Har du hunnit titta på den? Har du frågor eller vill ändra något går det bra att svara på det här mejlet eller ringa ' + us + '.\n\nNär du godkänner offerten sätter ' + we + ' igång direkt, och du får ett första utkast på ungefär en dag.'
          : 'Tack för att du hörde av dig till Elevate Studio. ' + (me1 ? 'Jag' : 'Vi') + ' har tittat på din förfrågan och berättar gärna hur ' + we + ' kan hjälpa er.\n\nHar du tid för ett kort samtal eller möte de närmaste dagarna? Svara gärna med en tid som passar, så hör ' + we + ' av ' + us + '.';
      });
      d.querySelectorAll('[data-who]').forEach(function (b) { b.addEventListener('click', function () { fillBody(); }); });
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
      '<button class="btn btn--ghost btn--sm" id="ld-propose">' + ICON.cal + 'Låt kunden välja tid</button><button class="btn btn--ghost btn--sm" id="ld-meet">' + ICON.cal + 'Boka möte</button><button class="btn btn--ghost btn--sm" id="ld-offer">' + ICON.file + 'Skapa offert</button><button class="btn btn--ghost btn--sm" id="ld-invoice">' + ICON.file + 'Skapa faktura</button>' +
      (l.status === 'sold' ? '<button class="btn btn--sm" id="ld-review">' + ICON.star + 'Be om recension</button>' : '<button class="btn btn--sm" id="ld-sold">' + ICON.star + 'Markera som såld</button>') + '</div>' +
      ((metaOf(l).web || metaOf(l).github) ? '<p class="ld__links">' + (metaOf(l).web ? '<a href="' + esc(metaOf(l).web) + '" target="_blank" rel="noopener">' + ICON.site + 'Gamla hemsidan</a>' : '') + (metaOf(l).github ? '<a href="' + esc(metaOf(l).github) + '" target="_blank" rel="noopener">' + ICON.site + 'Nya hemsidan på GitHub</a>' : '') + '</p>' : '') +
      '<div class="ld__cols"><div>' +
      '<section class="panel"><h3>Kontaktuppgifter</h3><form id="ld-form"><div class="grid2">' +
      form([{ name: 'name', label: 'Namn', value: l.name, required: true }, { name: 'company', label: 'Företag', value: l.company },
        { name: 'email', label: 'E-post', value: l.email, type: 'email', required: true }, { name: 'phone', label: 'Telefon', value: l.phone },
        { name: 'service_type', label: 'Bransch', value: l.service_type }, { name: 'company_type', label: 'Företagsform', value: l.company_type },
        { name: 'booking_at', label: 'Bokat möte', value: localInput(l.booking_at), type: 'datetime-local' }, { name: 'followup_at', label: 'Nästa steg senast', value: localInput(l.followup_at), type: 'datetime-local' },
        { name: 'web', label: 'Gamla hemsidan (valfritt)', value: metaOf(l).web, type: 'url', placeholder: 'https://' }, { name: 'github', label: 'Nya hemsidan på GitHub (valfritt)', value: metaOf(l).github, type: 'url', placeholder: 'https://github.com/ElevateStudio018/…' }]) +
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
        update(l.id, { status: v }).then(function () {
          d.remove(); render();
          if (v === 'archived' || v === 'lost') return toast(v === 'archived' ? 'Flyttad till Arkiv' : 'Markerad som förlorad – ligger under Arkiv');
          toast('Status: ' + sInfo(v)[1]); openLead(l);
        }).catch(function (err) { toast(err.message); });
      });
      $('#ld-form', d).addEventListener('submit', function (e) {
        e.preventDefault(); var g = function (n) { return e.target.elements[n].value.trim(); };
        var cur = lead(l.id) || l;
        var patch = { name: g('name'), company: g('company') || null, email: g('email'), phone: g('phone') || null,
          service_type: g('service_type') || null, company_type: g('company_type') || null, booking_at: fromLocal(g('booking_at')), followup_at: fromLocal(g('followup_at')),
          admin_notes: withOwner(ownerOf(cur), noteOf(cur), { web: g('web'), github: g('github') }) };
        update(l.id, patch).then(function () { toast('Ändringarna är sparade'); }).catch(function (err) { toast(err.message); });
      });
      var ownerSel = $('#ld-owner', d);
      if (ownerSel) ownerSel.addEventListener('change', function () {
        var cur = lead(l.id) || l;
        update(l.id, { admin_notes: withOwner(ownerSel.value, noteOf(cur), metaOf(cur)) }).then(function () { render(); toast(ownerSel.value ? 'Leaden är markerad som ' + ownerSel.value + 's' : 'Leaden är Elevate Studios'); })
          .catch(function (err) { toast(err.message); });
      });
      $('#ld-note-save', d).addEventListener('click', function () {
        var cur = lead(l.id) || l;
        update(l.id, { admin_notes: withOwner(ownerOf(cur), $('#ld-note', d).value, metaOf(cur)) }).then(function () { toast('Kommentaren är sparad'); }).catch(function (err) { toast(err.message); });
      });
      $('#ld-offer', d).addEventListener('click', function () { d.remove(); openOffer(l); });
      $('#ld-invoice', d).addEventListener('click', function () { d.remove(); openInvoice(l); });
      var lm = $('#ld-mail', d); if (lm) lm.addEventListener('click', function () { d.remove(); composeMail(l); });
      $('#ld-meet', d).addEventListener('click', function () { d.remove(); bookMeeting(l); });
      $('#ld-propose', d).addEventListener('click', function () { d.remove(); proposeTimes(l); });
      var rv = $('#ld-review', d); if (rv) rv.addEventListener('click', function () { d.remove(); openReview(l); });
      var sd = $('#ld-sold', d); if (sd) sd.addEventListener('click', function () { d.remove(); openSold(l); });
      $('#ld-del', d).addEventListener('click', function () { removeLead(l, function () { d.remove(); }); });
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
    main().innerHTML = head('Kalender', 'Kundmöten, uppringningar och det du lägger in själv. Klicka på en dag för att lägga till något.', '<button class="btn" id="add">+ Ny aktivitet</button>') +
      '<div class="calw"><div class="calm"><div class="calm__bar"><h2>' + title.charAt(0).toUpperCase() + title.slice(1) + '</h2>' +
      '<button class="btn btn--ghost btn--sm" id="today">Idag</button><button class="iconbtn" id="prev" aria-label="Föregående månad">&#8249;</button><button class="iconbtn" id="next" aria-label="Nästa månad">&#8250;</button></div>' +
      '<div class="calm__grid" id="grid"><p class="empty" style="grid-column:1/-1">Hämtar …</p></div></div><section class="panel calw__side"><h3>Kommande två veckor</h3><div class="cal" id="cal"></div></section></div>';
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
          ev.slice(0, 2).map(function (e) { return '<button class="calm__ev" data-n="' + e.n + '" style="--c:' + e.color + '" title="' + esc(e.tag) + '"><time>' + hm(e) + '</time> ' + esc(e.title) + '</button>'; }).join('') +
          (ev.length > 2 ? '<span class="calm__more">+' + (ev.length - 2) + ' till</span>' : '') + '</div>';
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
      info('Fakturera', 'Öppna affären och tryck på Skapa faktura, så får du en PDF i samma stil som webbavtalet. Mejla den till kunden och markera som betald när pengarna kommit.') +
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
  /* ---------- Besökare: everything the beacon collects, as a dashboard and as a list of every visit ---------- */
  function renderVisitors() {
    var days = st.visitDays || 30;
    main().innerHTML = head('Besökare', 'Vilka som kommer in, varifrån, vad de läser, hur länge och vad de gör.',
      '<span class="seg" id="vdays">' + [7, 30, 90].map(function (d) { return '<button class="seg__b' + (d === days ? ' is-on' : '') + '" data-d="' + d + '">' + d + ' dagar</button>'; }).join('') + '</span>');
    $('#vdays').addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (b) { st.visitDays = Number(b.dataset.d); renderVisitors(); } });
    fetchRows(sb.from('site_visits').select('*').gte('created_at', since(days)).order('created_at', { ascending: false }).limit(20000), function (all) {
      var rows = all.filter(function (x) { return !x.is_bot; });
      var views = rows.filter(function (x) { return !/^event:/.test(x.source || ''); });
      var events = rows.filter(function (x) { return /^event:/.test(x.source || ''); });
      var leaves = events.filter(function (x) { return x.source === 'event:leave'; });
      var conv = events.filter(function (x) { return /^event:(form|booking|booking_link|chat)$/.test(x.source); });
      // sessions: the views and events with the same id, in time order
      var S = {}; rows.slice().reverse().forEach(function (x) { (S[x.session_id] = S[x.session_id] || []).push(x); });
      var sessions = Object.keys(S).map(function (k) {
        var list = S[k].slice().sort(function (a, b) { return Date.parse(a.created_at) - Date.parse(b.created_at); }), v = list.filter(function (x) { return !/^event:/.test(x.source || ''); }), first = v[0] || list[0];
        var secs = list.filter(function (x) { return x.source === 'event:leave'; }).reduce(function (s, x) { return s + (Number(x.utm_medium) || 0); }, 0);
        return { id: k, first: first, views: v, secs: secs, events: list.filter(function (x) { return /^event:/.test(x.source || '') && x.source !== 'event:leave'; }),
          start: first.created_at, converted: list.some(function (x) { return /^event:(form|booking|booking_link|chat)$/.test(x.source || ''); }) };
      }).sort(function (a, b) { return Date.parse(b.start) - Date.parse(a.start); });
      var bounce = sessions.filter(function (s) { return s.views.length <= 1; }).length;
      var avgSecs = sessions.length ? Math.round(sessions.reduce(function (a, s) { return a + s.secs; }, 0) / sessions.length) : 0;
      var live = rows.filter(function (x) { return Date.parse(x.created_at) > Date.now() - 5 * 6e4; }).reduce(function (o, x) { o[x.session_id] = 1; return o; }, {});
      var fmtSecs = function (s) { return s >= 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s + ' s'; };
      var SRC = { direct: 'Direkt', google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo', social: 'Sociala medier', ai: 'AI-assistenter', referral: 'Andra sajter' };
      var DEV = { mobile: 'Mobil', desktop: 'Dator', tablet: 'Surfplatta', unknown: 'Okänt' };
      var EV = { form: 'Formulär skickat', booking: 'Möte bokat', booking_link: 'Bokat via länk', chat: 'Chatten öppnad', call: 'Ringde', mail: 'Mejlade', cta_boka: 'Klick: Boka möte', cta_kontakt: 'Klick: Kontakt' };
      // per day, and per hour of day
      var perDay = []; for (var i = Math.min(days, 30) - 1; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5); var key = d.toDateString(); perDay.push([d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }), sessions.filter(function (s) { return new Date(s.start).toDateString() === key; }).length]); }
      var maxDay = Math.max.apply(null, perDay.map(function (p) { return p[1]; }).concat([1]));
      var perHour = []; for (var h = 0; h < 24; h++) perHour.push([h + ':00', views.filter(function (x) { return new Date(x.created_at).getHours() === h; }).length]);
      var maxHour = Math.max.apply(null, perHour.map(function (p) { return p[1]; }).concat([1]));
      // time per page: the leave events carry seconds, keyed by path
      var timeOn = {}; leaves.forEach(function (x) { (timeOn[x.path] = timeOn[x.path] || []).push(Number(x.utm_medium) || 0); });
      var pages = countBy(views, function (x) { return x.path; }, 15).map(function (p) { var ts = timeOn[p[0]] || []; return [p[0], p[1], ts.length ? Math.round(ts.reduce(function (a, b) { return a + b; }, 0) / ts.length) : null]; });
      var entries = countBy(sessions, function (s) { return s.views[0] ? s.views[0].path : ''; }, 10);
      var exits = countBy(sessions, function (s) { return s.views.length ? s.views[s.views.length - 1].path : ''; }, 10);
      var chart = function (title, pairs, max, cls) { return '<section class="panel"><h3>' + title + '</h3><div class="cols ' + (cls || '') + '">' + pairs.map(function (p) { return '<div title="' + p[0] + ': ' + p[1] + '"><i style="--h:' + Math.round(p[1] / max * 100) + '%"></i><span>' + p[0] + '</span></div>'; }).join('') + '</div></section>'; };
      main().insertAdjacentHTML('beforeend',
        kpis([['Besök', sessions.length], ['Sidvisningar', views.length], ['Just nu', Object.keys(live).length], ['Snitt tid per besök', fmtSecs(avgSecs)], ['Sidor per besök', sessions.length ? (views.length / sessions.length).toFixed(1) : '–'],
          ['Avvisningar', sessions.length ? Math.round(bounce / sessions.length * 100) + ' %' : '–'], ['Konverteringar', conv.length], ['Konverteringsgrad', sessions.length ? (conv.length / sessions.length * 100).toFixed(1) + ' %' : '–']]) +
        (rows.length ? '' : info('Inget att visa än', 'Statistiken fylls på så fort hemsidan börjar skicka in besök. Det kräver att SUPABASE_SERVICE_KEY finns som hemlighet i Cloudflare.')) +
        chart('Besök per dag', perDay, maxDay) + chart('Sidvisningar per timme på dygnet', perHour, maxHour, 'cols--24') +
        '<div class="split">' +
        '<section class="panel"><h3>Mest lästa sidor</h3>' + (pages.length ? '<div class="tbl"><table><thead><tr><th>Sida</th><th>Visningar</th><th>Snitt tid</th></tr></thead><tbody>' + pages.map(function (p) { return '<tr><td>' + esc(p[0]) + '</td><td>' + p[1] + '</td><td>' + (p[2] == null ? '–' : fmtSecs(p[2])) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="empty">Ingen data.</p>') + '</section>' +
        bars('Varifrån besöken kommer', countBy(sessions, function (s) { return SRC[s.first.source] || s.first.source; }), sessions.length) +
        bars('Hänvisande sajter', countBy(views, function (x) { return x.referrer_host; }, 12), null) +
        bars('Kampanjer (utm)', countBy(views, function (x) { return x.utm_source ? x.utm_source + (x.utm_campaign ? ' · ' + x.utm_campaign : '') : ''; }, 12), null) +
        bars('Vad besökarna gör', countBy(events.filter(function (x) { return x.source !== 'event:leave'; }), function (x) { return EV[x.source.slice(6)] || x.source.slice(6); }), null) +
        bars('Konverteringar per källa', countBy(sessions.filter(function (s) { return s.converted; }), function (s) { return SRC[s.first.source] || s.first.source; }), conv.length) +
        bars('Ingångssidor', entries, sessions.length) + bars('Sista sidan i besöket', exits, sessions.length) +
        bars('Länder', countBy(sessions, function (s) { return s.first.country; }), sessions.length) + bars('Städer', countBy(sessions, function (s) { return s.first.city; }, 12), sessions.length) +
        bars('Enheter', countBy(sessions, function (s) { return DEV[s.first.device_type] || s.first.device_type; }), sessions.length) + bars('Webbläsare', countBy(sessions, function (s) { return s.first.browser; }), sessions.length) +
        bars('Operativsystem', countBy(sessions, function (s) { return s.first.os; }), sessions.length) + bars('Språk', countBy(sessions, function (s) { return s.first.language; }), sessions.length) +
        bars('Skärmstorlek', countBy(sessions, function (s) { return s.first.screen_w ? s.first.screen_w + '×' + s.first.screen_h : ''; }, 10), sessions.length) +
        '</div>' +
        '<section class="panel"><h3>Alla besök</h3><p class="panel__sub">Varje rad är ett besök. Klicka för att se vilka sidor som lästes, hur länge, och vad som hände.</p><div class="visits" id="visits">' +
        sessions.slice(0, 300).map(function (s, idx) {
          var f = s.first;
          return '<details class="visit' + (s.converted ? ' is-conv' : '') + '"><summary><span class="visit__when">' + dt(s.start) + '</span><span class="visit__where">' + esc([f.city, f.country].filter(Boolean).join(', ') || 'Okänd plats') + '</span>' +
            '<span class="visit__how">' + esc((DEV[f.device_type] || f.device_type) + ' · ' + (f.browser || '') + ' · ' + (f.os || '')) + '</span><span class="visit__src">' + esc(SRC[f.source] || f.source || '') + (f.referrer_host ? ' · ' + esc(f.referrer_host) : '') + '</span>' +
            '<span class="visit__n">' + s.views.length + ' sidor · ' + fmtSecs(s.secs) + (s.events.length ? ' · <b>' + s.events.map(function (e) { return EV[e.source.slice(6)] || e.source.slice(6); }).join(', ') + '</b>' : '') + '</span></summary>' +
            '<ol class="visit__pages">' + s.views.map(function (v) { var lv = leaves.find(function (l) { return l.session_id === s.id && l.path === v.path && Date.parse(l.created_at) >= Date.parse(v.created_at); }); return '<li><time>' + new Date(v.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</time><a href="' + esc(v.path) + '" target="_blank" rel="noopener">' + esc(v.path) + '</a>' + (lv ? '<small>' + fmtSecs(Number(lv.utm_medium) || 0) + ' · läste ' + (Number(lv.utm_campaign) || 0) + ' %</small>' : '') + '</li>'; }).join('') +
            s.events.map(function (e) { return '<li class="visit__ev"><time>' + new Date(e.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '</time><b>' + esc(EV[e.source.slice(6)] || e.source.slice(6)) + '</b>' + (e.utm_medium ? '<small>' + esc(e.utm_medium) + '</small>' : '') + '</li>'; }).join('') + '</ol>' +
            '<p class="visit__meta">' + esc([f.language, f.timezone, f.screen_w ? 'skärm ' + f.screen_w + '×' + f.screen_h : '', f.viewport_w ? 'fönster ' + f.viewport_w + '×' + f.viewport_h : '', f.utm_source ? 'utm: ' + [f.utm_source, f.utm_medium, f.utm_campaign].filter(Boolean).join(' / ') : ''].filter(Boolean).join(' · ')) + '</p></details>';
        }).join('') + (sessions.length > 300 ? '<p class="muted">Visar de 300 senaste besöken.</p>' : '') + '</div></section>');
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
      g.className = 'pill pill--' + (st.google ? 'on' : 'off'); g.textContent = st.google ? 'Ansluten' : 'Inte kopplat – videolänkar via Jitsi tills vidare';
      $('#google-connect').hidden = !!st.google;
    }).catch(function () { var pill = $('#gmail-pill'); if (pill) { pill.className = 'pill pill--off'; pill.textContent = 'Kan inte nås här'; } });
  }

  /* ---------- Konto ---------- */
  function renderAccount() {
    main().innerHTML = head('Mitt konto', 'Byt e-post och lösenord för din inloggning. Teamets konton finns under Konton.') +
      '<div class="split split--2"><section class="panel"><h3>E-post</h3><p class="panel__sub">Nu: <b>' + esc(st.user.email) + '</b></p><form id="em">' +
      '<label class="field">Ny e-post<input class="input" type="email" name="email" placeholder="info@elevatestudio.nu" required></label>' +
      '<button class="btn" type="submit">Byt e-post</button><p class="msg ok" id="em-msg"></p></form>' +
      '<p class="muted small">En bekräftelselänk skickas till den nya adressen. Bytet gäller först när ni klickat på den.</p></section>' +
      '<section class="panel"><h3>Lösenord</h3><form id="pw">' +
      '<label class="field">Nytt lösenord (minst 8 tecken)<input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
      '<label class="field">Upprepa lösenordet<input class="input" type="password" name="pw2" minlength="8" autocomplete="new-password" required></label>' +
      '<button class="btn" type="submit">Byt lösenord</button><p class="msg ok" id="pw-msg"></p></form>' +
      '<p class="muted small">Tips: tre vanliga ord ihop med en siffra är lätt att komma ihåg och svårt att gissa.</p></section></div>';
    $('#em').addEventListener('submit', function (e) {
      e.preventDefault(); var m = $('#em-msg');
      sb.auth.updateUser({ email: e.target.email.value.trim() }, { emailRedirectTo: location.href.split('#')[0] }).then(function (r) {
        m.textContent = r.error ? r.error.message : 'Klart. Öppna mejlet som skickats till den nya adressen och klicka på länken för att bekräfta.';
      });
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

  /* A login for a team member: the server opens it right away when the Supabase key is in Cloudflare,
     otherwise the ordinary sign-up with a confirmation mail */
  function createLogin(p) {
    var first = p[1].split(' ')[0];
    dialog('<form id="cl"><h2>Öppna konto för ' + esc(first) + '</h2><p>Skriv lösenordet ' + esc(first) + ' ska logga in med. Det går att byta sedan under Mitt konto.</p>' +
      form([{ name: 'email', label: 'E-post', type: 'email', value: p[2], required: true }]) +
      '<label class="field">Lösenord (minst 8 tecken)<input class="input" type="password" name="pw" minlength="8" autocomplete="new-password" required></label>' +
      '<label class="field">Upprepa lösenordet<input class="input" type="password" name="pw2" minlength="8" autocomplete="new-password" required></label>' +
      '<p class="msg" id="cl-msg"></p><div class="dlg__row"><button type="button" class="btn btn--ghost" data-close>Avbryt</button><button class="btn" type="submit">Öppna kontot</button></div></form>', function (d) {
      $('#cl', d).addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, m = $('#cl-msg', d), btn = $('button[type=submit]', d);
        if (f.pw.value !== f.pw2.value) { m.textContent = 'Lösenorden är inte likadana.'; return; }
        btn.disabled = true; btn.textContent = 'Öppnar …';
        var email = f.email.value.trim(), pw = f.pw.value;
        var fallback = function () {
          // A separate client, so the signed-in session in this window stays as it is
          var other = window.supabase.createClient(root.dataset.url, root.dataset.key, { auth: { persistSession: false, autoRefreshToken: false, storageKey: 'elevate-new-login' } });
          other.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: location.origin + '/admin/', data: { full_name: p[1] } } }).then(function (r) {
            if (r.error) throw r.error;
            var u = r.data && r.data.user;
            if (!u || !u.identities || !u.identities.length) return 'exists';
            return sb.from('user_roles').insert({ user_id: u.id, role: 'admin' }).then(function (x) { return x.error ? 'norole' : 'ok'; });
          }).then(function (how) {
            f.pw.value = f.pw2.value = '';
            if (how === 'exists') { btn.disabled = false; btn.textContent = 'Öppna kontot'; m.textContent = 'Den e-posten har redan en inloggning. Lägg in SUPABASE_SERVICE_KEY i Cloudflare för att sätta nytt lösenord härifrån, eller använd Glömt lösenord på inloggningssidan.'; return; }
            d.remove();
            toast(how === 'ok' ? 'Inloggningen är skapad. ' + first + ' får ett mejl att bekräfta, sedan går det att logga in.' : 'Kontot är skapat, men behörigheten kunde inte läggas in. Säg till, så läggs den in.');
          }).catch(function (err) { btn.disabled = false; btn.textContent = 'Öppna kontot'; m.textContent = err.message; });
        };
        sb.auth.getSession().then(function (r) {
          var token = r.data && r.data.session && r.data.session.access_token;
          return fetch('/api/accounts/create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ email: email, password: pw, name: p[1] }) });
        }).then(function (res) { return res.json().catch(function () { return {}; }).then(function (b) { return { ok: res.ok, b: b }; }); }, function () { return { ok: false, b: { error: 'net' } }; })
          .then(function (x) {
            if (x.ok) { f.pw.value = f.pw2.value = ''; d.remove(); return toast((x.b.how === 'updated' ? 'Kontot är öppnat med det nya lösenordet. ' : 'Kontot är öppnat. ') + first + ' kan logga in direkt.' + (x.b.role ? '' : ' Behörigheten kunde inte läggas in – säg till.')); }
            if (x.b.error === 'no_service_key' || x.b.error === 'net') return fallback();
            btn.disabled = false; btn.textContent = 'Öppna kontot'; m.textContent = x.b.error === 'exists' ? 'Kontot finns redan men kunde inte uppdateras.' : 'Det gick inte: ' + x.b.error;
          });
      });
    });
  }

  var PAGES = {
    todo: renderTodo, leads: renderLeads, vunna: renderWon, arkiv: renderArchive, statistik: renderStats, konton: renderAccounts, import: renderImport,
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
