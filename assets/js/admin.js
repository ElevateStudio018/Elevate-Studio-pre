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
  var MEETING = { quote: 'Offertförfrågan', teams: 'Microsoft Teams', google_meet: 'Google Meet', phone: 'Telefonmöte' };
  var TEAM = [['Carl', 'Carl From'], ['Isak', 'Isak Mattsson'], ['Oscar', 'Oscar Svanerud']];
  var CLOSED = ['sold', 'lost', 'archived', 'done'];
  var st = { user: null, leads: [], view: 'leads', status: 'all', q: '', sort: 'created_desc', shown: 40, editing: null };

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
      renderShell();
      return loadLeads();
    });
  }

  /* ---------- Shell ---------- */
  function renderShell() {
    root.innerHTML = '<div class="shell" id="shell"><aside class="side"><a class="brand" href="../index.html">' + MARK + 'Elevate Studio</a>' +
      '<small>Försäljning</small><button class="nav" data-view="leads">' + ICON.inbox + 'Leads</button><button class="nav" data-view="kalender">' + ICON.cal + 'Kalender</button>' +
      '<small>Webb</small><a class="nav" href="../index.html">' + ICON.site + 'Till hemsidan</a>' +
      '<div class="side__foot"><div class="side__me">' + esc(st.user.email) + '</div><button class="nav" id="logout">' + ICON.out + 'Logga ut</button></div></aside>' +
      '<div><div class="top"><button id="menu" aria-label="Meny">' + ICON.menu + '</button><span class="brand">' + MARK + 'Admin</span></div><main id="main"></main></div></div>';
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { st.view = b.dataset.view; $('#shell').classList.remove('is-menu'); render(); });
    });
    $('#logout').addEventListener('click', function () { sb.auth.signOut().then(function () { st.user = null; renderLogin(); }); });
    $('#menu').addEventListener('click', function () { $('#shell').classList.toggle('is-menu'); });
  }

  function loadLeads() {
    $('#main').innerHTML = '<p class="empty">Hämtar leads …</p>';
    return sb.from('quote_requests').select('*').order('created_at', { ascending: false }).limit(2000).then(function (r) {
      if (r.error) { $('#main').innerHTML = '<p class="empty">Kunde inte hämta leads: ' + esc(r.error.message) + '</p>'; return; }
      st.leads = r.data || [];
      render();
    });
  }

  function render() {
    root.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === st.view); });
    if (st.view === 'kalender') return renderCalendar();
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
      '<div class="page-h"><div><h1>Leads <span class="serif">&amp; förfrågningar</span></h1><p>Alla som hört av sig. Byt status och skriv kommentarer direkt i listan.</p></div></div>' +
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
  }

  function card(l) {
    var s = sInfo(l.status || 'new');
    var when = l.booking_at ? dt(l.booking_at) : (l.preferred_time || '–');
    var editing = st.editing === l.id;
    return '<article class="lead" data-id="' + l.id + '" style="--c:' + s[2] + '">' +
      '<div class="lead__top"><div><h3 class="lead__name">' + esc(l.name) + (l.company ? ' <span>· ' + esc(l.company) + '</span>' : '') + '</h3>' +
      '<p class="lead__meta">' + esc(MEETING[l.meeting_type] || l.meeting_type || 'Förfrågan') + ' · ' + dt(l.created_at) + '</p></div>' +
      '<div class="lead__acts"><button class="btn btn--ghost btn--sm" data-a="detail">Detaljer</button><button class="btn btn--ghost btn--sm" data-a="offer">Skapa offert</button>' +
      '<select class="status" data-a="status" style="color:' + s[2] + '">' + STATUS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === s[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="lead__grid"><div><span>E-post:</span> ' + (l.email ? '<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>' : '–') + '</div>' +
      '<div><span>Telefon:</span> ' + (l.phone ? '<a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a>' : '–') + '</div>' +
      '<div><span>Bransch:</span> ' + esc(l.service_type || '–') + '</div><div><span>Tid:</span> ' + esc(when) + '</div>' +
      (l.followup_at ? '<div><span>Ring upp:</span> ' + dt(l.followup_at) + '</div>' : '') +
      (l.sold_amount != null ? '<div><span>Såld för:</span> <b>' + kr(l.sold_amount) + '</b></div>' : '') + '</div>' +
      (editing
        ? '<div class="note-edit"><textarea class="input" rows="3" data-a="note-text" placeholder="Skriv en kommentar …">' + esc(l.admin_notes || '') + '</textarea>' +
          '<div class="note-edit__row"><button class="btn btn--ghost btn--sm" data-a="note-cancel">Avbryt</button><button class="btn btn--sm" data-a="note-save">Spara kommentar</button></div></div>'
        : '<button class="note' + (l.admin_notes ? '' : ' is-empty') + '" data-a="note">' + ICON.msg + '<span>' + (l.admin_notes ? esc(l.admin_notes) : 'Lägg till kommentar …') + '</span></button>') +
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
      var a = e.target.closest('[data-a]'); if (!a) return;
      var act = a.dataset.a;
      if (act === 'detail') openDetail(l);
      if (act === 'offer') openOffer(l);
      if (act === 'note') { st.editing = id; renderLeads(); var t = $('.lead[data-id="' + id + '"] textarea'); if (t) t.focus(); }
      if (act === 'note-cancel') { st.editing = null; renderLeads(); }
      if (act === 'note-save') {
        var text = $('textarea', el).value;
        update(id, { admin_notes: text || null }).then(function () { st.editing = null; renderLeads(); toast('Kommentaren är sparad'); })
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
    d.innerHTML = '<div class="dlg__box" role="dialog" aria-modal="true">' + html + '</div>';
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.remove(); });
    document.body.appendChild(d);
    if (onMount) onMount(d);
    return d;
  }

  function openDetail(l) {
    var s = sInfo(l.status || 'new');
    dialog('<div class="detail"><h2>' + esc(l.name) + '</h2><p style="color:' + s[2] + ';font-weight:600;margin:0 0 16px">' + s[1] + '</p><dl>' +
      [['Företag', l.company], ['E-post', l.email], ['Telefon', l.phone], ['Bransch', l.service_type], ['Mötestyp', MEETING[l.meeting_type] || l.meeting_type],
       ['Önskad tid', l.preferred_time], ['Bokad tid', l.booking_at && dt(l.booking_at)], ['Paket', l.selected_package],
       ['Uppskattat start', l.estimated_start_cost != null && kr(l.estimated_start_cost)], ['Inkom', dt(l.created_at)], ['Såld', l.sold_at && dt(l.sold_at)]]
        .filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      (l.message ? '<div class="box">' + esc(l.message) + '</div>' : '') + (l.project_description ? '<div class="box">' + esc(l.project_description) + '</div>' : '') +
      '<div class="dlg__row">' + (l.status === 'sold' ? '<button class="btn btn--ghost" data-review>Be om recension</button>' : '') + '<button class="btn" data-close>Stäng</button></div></div>',
      function (d) { var r = $('[data-review]', d); if (r) r.addEventListener('click', function () { d.remove(); openReview(l); }); });
  }

  function openSold(l) {
    dialog('<h2>Markera som såld</h2><p>' + esc(l.name) + (l.company ? ' · ' + esc(l.company) : '') + '</p>' +
      '<label class="field">Belopp (kr)<input class="input" type="number" min="0" step="1" id="amount" placeholder="t.ex. 6000"></label>' +
      '<div class="dlg__row"><button class="btn btn--ghost" data-close>Avbryt</button><button class="btn" id="save-sold">Spara som såld</button></div>',
      function (d) {
        d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) renderLeads(); });
        $('#amount', d).focus();
        $('#save-sold', d).addEventListener('click', function () {
          var amount = Number($('#amount', d).value) || null;
          update(l.id, { status: 'sold', sold_amount: amount, sold_at: new Date().toISOString() })
            .then(function () { d.remove(); renderLeads(); openReview(l); })
            .catch(function (err) { toast(err.message); });
        });
      });
  }

  function openReview(l) {
    var who = 'Elevate Studio';
    dialog('<div class="star">' + ICON.star + '</div><h2>Grattis till affären!</h2><p>Be ' + esc(l.company || l.name) + ' om en recension på Google – nu direkt eller om en vecka.</p>' +
      '<div class="field">Mejlet skickas från<div class="who">' + TEAM.map(function (t) { return '<button class="chip" data-who="' + t[1] + '">' + t[0] + '</button>'; }).join('') +
      '<button class="chip is-on" data-who="Elevate Studio">Elevate Studio</button></div></div>' +
      '<div class="stack"><button class="btn" id="mail"' + (l.email ? '' : ' disabled') + '>' + ICON.mail + 'Skicka mejl för att recensera' + (l.email ? '' : ' (e-post saknas)') + '</button>' +
      '<button class="btn btn--ghost" id="remind">' + ICON.bell + 'Påminn mig om en vecka</button><button class="btn btn--ghost" data-close style="justify-content:center">Inte nu</button></div>',
      function (d) {
        d.querySelectorAll('[data-who]').forEach(function (b) {
          b.addEventListener('click', function () { who = b.dataset.who; d.querySelectorAll('[data-who]').forEach(function (x) { x.classList.toggle('is-on', x === b); }); });
        });
        $('#mail', d).addEventListener('click', function () {
          var first = (l.name || '').trim().split(/\s+/)[0] || '';
          var me = who === 'Elevate Studio' ? 'Vi' : 'Jag';
          var body = 'Hej' + (first ? ' ' + first : '') + '!\n\nTack för förtroendet. ' + me + ' hoppas att du är nöjd med hemsidan. Vill du berätta hur samarbetet var? En kort recension på Google hjälper oss mycket – det tar ungefär en minut:\n\n' +
            REVIEW_URL + '\n\nTack!\n' + who + (who === 'Elevate Studio' ? '' : '\nElevate Studio') + '\ninfo@elevatestudio.nu';
          location.href = 'mailto:' + encodeURIComponent(l.email) + '?subject=' + encodeURIComponent('Tack för att du valde Elevate Studio') + '&body=' + encodeURIComponent(body);
          d.remove();
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

  /* ---------- Calendar ---------- */
  function renderCalendar() {
    $('#main').innerHTML = '<div class="page-h"><div><h1>Kalender</h1><p>Möten och påminnelser de kommande 30 dagarna.</p></div></div><div class="cal" id="cal"><p class="empty">Hämtar …</p></div>';
    var from = new Date(); from.setHours(0, 0, 0, 0);
    var to = new Date(from.getTime() + 30 * 864e5);
    sb.from('calendar_activities').select('id,title,starts_at,category,location').gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at').then(function (r) {
      var items = (r.data || []).map(function (a) { return { at: a.starts_at, title: a.title }; });
      st.leads.forEach(function (l) {
        var t = l.booking_at && Date.parse(l.booking_at);
        if (t && t >= from.getTime() && t <= to.getTime()) items.push({ at: l.booking_at, title: 'Möte: ' + (l.company || l.name) + (MEETING[l.meeting_type] ? ' (' + MEETING[l.meeting_type] + ')' : '') });
      });
      items.sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
      var days = {};
      items.forEach(function (i) { var k = new Date(i.at).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }); (days[k] = days[k] || []).push(i); });
      $('#cal').innerHTML = Object.keys(days).map(function (k) {
        return '<section class="cal__day"><h3>' + k + '</h3>' + days[k].map(function (i) {
          return '<div class="cal__ev"><time>' + new Date(i.at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) + '</time><span>' + esc(i.title) + '</span></div>';
        }).join('') + '</section>';
      }).join('') || '<p class="empty">Inget inbokat de kommande 30 dagarna.</p>';
    });
  }

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
