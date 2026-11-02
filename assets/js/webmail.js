/* Elevate Mejl (/mail), design 1: dark top bar, folders, list and reading pane. Everything a mailbox needs:
   folders with unread counts, starred, archive, junk, trash, drafts, search, select several, move, attachments
   in and out, reply/reply all/forward, cc/bcc, signature, contacts and settings. The server does IMAP and SMTP.
   Mail is shown as plain text, so nothing from a sender runs in the page. In a static preview (githack,
   localhost or ?demo) a clearly marked demo mailbox is used. */
(function () {
  var root = document.getElementById('webmail'); if (!root) return;
  var DEMO = /[?&]demo\b/.test(location.search) || /githack|localhost/.test(location.hostname);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var name = function (f) { var m = String(f).match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>/); return m ? m[1] : String(f).replace(/[<>]/g, ''); };
  var addr = function (f) { var m = String(f).match(/<([^>]+)>/); return m ? m[1] : String(f).trim(); };
  var when = function (d) { var t = new Date(d); if (isNaN(t)) return ''; var now = new Date(); return t.toDateString() === now.toDateString() ? t.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }); };
  var kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB'; };
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem('es.mail.' + k)); return v == null ? d : v; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem('es.mail.' + k, JSON.stringify(v)); } catch (e) { /* private window */ } } };
  var ICON = {
    inbox: 'M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v6H4z', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z', draft: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    sent: 'M3 11l18-8-8 18-2-8z', archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', junk: 'M12 3l9 16H3zM12 9v5M12 17v.5', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    folder: 'M3 6h6l2 2h10v11H3z', people: 'M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 100-6M16 15c3 0 6 2 6 5', gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 7.5 4 7 3 10l2 1v2l-2 1 1 3 2-.5 1.5 1.5-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
    refresh: 'M20 11a8 8 0 10-2 6M20 4v7h-7', clip: 'M16 7l-7 7a2 2 0 003 3l8-8a4 4 0 00-6-6l-8 8a6 6 0 008 8l6-6', print: 'M6 9V3h12v6M6 17H4v-6h16v6h-2M7 14h10v7H7z'
  };
  var ico = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[n] + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  var ROLE_LABEL = { inbox: 'Inkorg', starred: 'Stjärnmärkt', drafts: 'Utkast', sent: 'Skickat', archive: 'Arkiv', junk: 'Skräppost', trash: 'Papperskorg' };
  var st = { email: '', folders: [], roles: {}, counts: {}, servers: {}, view: 'mail', folder: 'INBOX', starred: false, items: [], total: 0, page: 0, open: null, sel: {}, filter: '', settings: store.get('settings', { name: '', signature: '', perPage: 30 }), contacts: store.get('contacts', []) };

  // ---------- demo mailbox (only in previews) ----------
  var demo = (function () {
    var t = function (h) { return new Date(Date.now() - h * 36e5).toUTCString(); }, uid = 100;
    var box = {
      INBOX: [
        { uid: 9, seen: false, flagged: true, from: 'Karin Lönn <karin@kund.se>', to: 'anna@exempelbygg.se', subject: 'Offert på badrum', date: t(1), text: 'Hej!\n\nVi har sett er hemsida och vill gärna ha en offert på ett nytt badrum, ungefär 6 kvadratmeter. Bifogar en ritning.\n\nVänliga hälsningar\nKarin Lönn\n070-123 45 67', messageId: '<d9@kund.se>', files: [{ name: 'ritning-badrum.pdf', size: 248000 }] },
        { uid: 8, seen: false, from: 'Bokning <bokning@exempelbygg.se>', to: 'anna@exempelbygg.se', subject: 'Ny bokning tisdag 14:00', date: t(5), text: 'Johan Berg har bokat ett platsbesök tisdag kl 14:00 på Storgatan 4.' },
        { uid: 7, seen: true, from: 'Johan Berg <johan@berg.se>', to: 'anna@exempelbygg.se', cc: 'info@exempelbygg.se', subject: 'Re: Platsbesök', date: t(26), text: 'Tack! Vi ses på tisdag. Portkoden är 1234.\n\n> Hej Johan, passar tisdag?' },
        { uid: 6, seen: true, from: 'Elevate Studio <info@elevatestudio.nu>', to: 'anna@exempelbygg.se', subject: 'Välkommen till Elevate Mejl', date: t(30), text: 'Hej!\n\nHär läser och skickar du mejl med din egen domän. Mejlen fungerar också i mobilen och i Outlook eller Apple Mail – serveruppgifterna finns under Inställningar.\n\nHälsningar\nElevate Studio' },
        { uid: 5, seen: true, from: 'Fortnox <noreply@fortnox.se>', to: 'anna@exempelbygg.se', subject: 'Faktura 2026-041 är betald', date: t(52), text: 'Betalningen på 199 kr har kommit in.', files: [{ name: 'kvitto.pdf', size: 24000 }] }],
      'INBOX.Drafts': [{ uid: 4, seen: true, from: 'anna@exempelbygg.se', to: 'karin@kund.se', subject: 'Offert badrum', date: t(2), text: 'Hej Karin! Här kommer offerten …' }],
      'INBOX.Sent': [{ uid: 3, seen: true, from: 'Anna Exempel <anna@exempelbygg.se>', to: 'johan@berg.se', subject: 'Platsbesök', date: t(27), text: 'Hej Johan, passar tisdag?' }],
      'INBOX.Archive': [{ uid: 2, seen: true, from: 'Leverantör <order@bygg.se>', to: 'anna@exempelbygg.se', subject: 'Orderbekräftelse 5531', date: t(200), text: 'Tack för din order.' }],
      'INBOX.Junk': [{ uid: 1, seen: false, from: 'Vinst <win@lotteri.example>', to: 'anna@exempelbygg.se', subject: 'Du har vunnit!!!', date: t(10), text: 'Klicka här …' }],
      'INBOX.Trash': []
    };
    var roles = { drafts: 'INBOX.Drafts', sent: 'INBOX.Sent', archive: 'INBOX.Archive', junk: 'INBOX.Junk', trash: 'INBOX.Trash' };
    var find = function (f, u) { return (box[f] || []).filter(function (m) { return m.uid === Number(u); })[0]; };
    var take = function (f, us) { var out = []; box[f] = box[f].filter(function (m) { if (us.indexOf(m.uid) >= 0) { out.push(m); return false; } return true; }); return out; };
    return function (op, b) {
      var q = new URLSearchParams(op.split('?')[1] || ''), o = op.split('?')[0], f = q.get('folder') || (b && b.folder) || 'INBOX', us = b && (b.uids || [b.uid]).map(Number);
      var counts = {}; Object.keys(box).forEach(function (k) { counts[k] = { total: box[k].length, unseen: box[k].filter(function (m) { return !m.seen; }).length }; });
      var r = o === 'login' || o === 'session' ? { ok: true, email: 'anna@exempelbygg.se' }
        : o === 'folders' ? { folders: Object.keys(box), roles: roles, counts: counts, servers: { imap: 'mail.exempelbygg.se', smtp: 'mail.exempelbygg.se' } }
        : o === 'list' ? { total: box[f].length, items: box[f].map(function (m) { return { uid: m.uid, seen: m.seen, flagged: !!m.flagged, files: !!(m.files && m.files.length), from: m.from, to: m.to, subject: m.subject, date: m.date }; }) }
        : o === 'read' ? (function () { var m = find(f, q.get('uid')); m.seen = true; return Object.assign({ files: [], cc: '' }, m); })()
        : o === 'flags' ? (us.forEach(function (u) { var m = find(f, u); if (m) m[b.flag === 'flagged' ? 'flagged' : 'seen'] = !!b.on; }), { ok: true })
        : o === 'move' ? (function () { var to = roles[b.to] || b.to; box[to] = take(f, us).concat(box[to] || []); return { ok: true }; })()
        : o === 'draft' ? (function () { if (b.replaces) take('INBOX.Drafts', [Number(b.replaces)]); box['INBOX.Drafts'].unshift({ uid: ++uid, seen: true, from: 'anna@exempelbygg.se', to: b.to, subject: b.subject || '(inget ämne)', date: new Date().toUTCString(), text: b.text }); return { ok: true }; })()
        : o === 'send' ? (box['INBOX.Sent'].unshift({ uid: ++uid, seen: true, from: (b.name ? b.name + ' <anna@exempelbygg.se>' : 'anna@exempelbygg.se'), to: b.to, cc: b.cc, subject: b.subject || '(inget ämne)', date: new Date().toUTCString(), text: b.text, files: (b.files || []).map(function (x) { return { name: x.name, size: x.data.length * 0.75 }; }) }), { ok: true })
        : { ok: true };
      return new Promise(function (ok) { setTimeout(function () { ok(JSON.parse(JSON.stringify(r))); }, 120); });
    };
  })();
  function api(op, body) {
    if (DEMO) return demo(op, body);
    var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'elevate' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' };
    return fetch('/api/mail/' + op, opt).then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'Något gick fel'); e.status = r.status; throw e; } return d; }); });
  }
  var fail = function (x) { if (x && x.status === 401) return login('Du har blivit utloggad. Logga in igen.'); toast(x && x.message || 'Något gick fel'); };
  function toast(t) { var el = document.createElement('p'); el.className = 'wmx-toast'; el.setAttribute('role', 'status'); el.textContent = t; root.appendChild(el); setTimeout(function () { el.remove(); }, 3200); }

  // ---------- login ----------
  function login(note) {
    root.innerHTML = '<div class="wmx-login glow-dark">' + (DEMO ? '<p class="wmx-badge">Demoläge · testbrevlåda · inga riktiga mejl</p>' : '') +
      '<p class="wmx-logo">elevate<span>mejl</span></p><h1>Logga in på din e-post</h1>' + (note ? '<p class="wmx-note">' + esc(note) + '</p>' : '') +
      '<form id="wl" class="wmx-form" novalidate><input name="email" type="email" autocomplete="username" placeholder="din@foretag.se" aria-label="E-post" required>' +
      '<input name="password" type="password" autocomplete="current-password" placeholder="Lösenord" aria-label="Lösenord" required>' +
      '<details class="wmx-adv"><summary>Egen mejlserver</summary><input name="imap" placeholder="IMAP-server, t.ex. imap.foretag.se" aria-label="IMAP-server"><input name="smtp" placeholder="SMTP-server, t.ex. smtp.foretag.se" aria-label="SMTP-server"></details>' +
      '<button class="btn btn--primary" type="submit"><span>Logga in</span></button><p class="wmx-err" role="alert" hidden></p></form>' +
      '<p class="wmx-small">Lösenordet sparas inte. Det skickas krypterat till mejlservern och du loggas ut efter 8 timmar. <a href="foretagsmejl.html">Har du inte företagsmejl än?</a></p></div>';
    var f = root.querySelector('#wl'), err = f.querySelector('.wmx-err');
    if (DEMO) { f.email.value = 'anna@exempelbygg.se'; f.password.value = 'demo'; }
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true;
      if (!/\S+@\S+\.\S+/.test(f.email.value) || !f.password.value) { err.hidden = false; err.textContent = 'Skriv e-postadress och lösenord.'; return; }
      var btn = f.querySelector('button'); btn.disabled = true; btn.querySelector('span').textContent = 'Loggar in …';
      api('login', { email: f.email.value.trim(), password: f.password.value, imap: f.imap.value.trim() || undefined, smtp: f.smtp.value.trim() || undefined })
        .then(function (d) { st.email = d.email; start(); })
        .catch(function (x) { err.hidden = false; err.textContent = x.message === 'Failed to fetch' ? 'Kunde inte nå servern.' : x.message; btn.disabled = false; btn.querySelector('span').textContent = 'Logga in'; });
    });
  }
  function start() { api('folders').then(function (d) { st.folders = d.folders; st.roles = d.roles || {}; st.counts = d.counts || {}; st.servers = d.servers || {}; shell(); }).catch(fail); }

  // ---------- layout ----------
  var roleOf = function (f) { if (f === 'INBOX') return 'inbox'; for (var k in st.roles) if (st.roles[k] === f) return k; return null; };
  var label = function (f) { var r = roleOf(f); return r ? ROLE_LABEL[r] : f.split(/[./]/).pop(); };
  function shell() {
    var main = ['INBOX', 'starred', st.roles.drafts, st.roles.sent, st.roles.archive, st.roles.junk, st.roles.trash].filter(Boolean);
    var other = st.folders.filter(function (f) { return main.indexOf(f) < 0 && f !== 'INBOX'; });
    var item = function (f) {
      var r = f === 'starred' ? 'starred' : roleOf(f) || 'folder', n = f === 'starred' ? '' : (st.counts[f] || {}).unseen;
      var on = st.view === 'mail' && (f === 'starred' ? st.starred : !st.starred && f === st.folder);
      return '<button type="button" class="wmx-folder' + (on ? ' is-on' : '') + '" data-f="' + esc(f) + '">' + ico({ inbox: 'inbox', starred: 'star', drafts: 'draft', sent: 'sent', archive: 'archive', junk: 'junk', trash: 'trash' }[r] || 'folder') + '<span>' + esc(f === 'starred' ? 'Stjärnmärkt' : label(f)) + '</span>' + (n && r !== 'sent' && r !== 'trash' ? '<em>' + n + '</em>' : '') + '</button>';
    };
    root.innerHTML = '<div class="wmx">' +
      '<div class="wmx-bar"><p class="wmx-logo">elevate<span>mejl</span></p><label class="wmx-search">' + '<span class="sr-only">Sök i mejl</span><input id="wq" placeholder="Sök i mejl  ( / )" value="' + esc(st.filter) + '"></label>' +
      '<button type="button" class="wmx-icon" id="wrefresh" title="Uppdatera" aria-label="Uppdatera">' + ico('refresh') + '</button><span class="wmx-me">' + (st.settings.name ? esc(st.settings.name) + '<small>' + esc(st.email) + '</small>' : esc(st.email)) + '</span><button type="button" class="wmx-link" id="wout">Logga ut</button></div>' +
      (DEMO ? '<p class="wmx-demo">Demoläge · testbrevlåda · inga riktiga mejl skickas</p>' : '') +
      '<div class="wmx-body"><nav class="wmx-side" aria-label="Mappar"><button type="button" class="wmx-compose" id="wnew">Skriv nytt</button>' + main.map(item).join('') +
      (other.length ? '<p class="wmx-sep">Mappar</p>' + other.map(item).join('') : '') +
      '<p class="wmx-sep"></p><button type="button" class="wmx-folder' + (st.view === 'contacts' ? ' is-on' : '') + '" data-v="contacts">' + ico('people') + '<span>Kontakter</span></button>' +
      '<button type="button" class="wmx-folder' + (st.view === 'settings' ? ' is-on' : '') + '" data-v="settings">' + ico('gear') + '<span>Inställningar</span></button></nav>' +
      '<section class="wmx-list" aria-label="Mejl"><div id="wtools"></div><div id="wlist"></div></section><section class="wmx-read" id="wread" aria-live="polite"><p class="wmx-empty">Välj ett mejl</p></section></div></div>';
    root.querySelector('#wout').addEventListener('click', function () { api('logout', {}).catch(function () {}).then(function () { login('Du är utloggad.'); }); });
    root.querySelector('#wnew').addEventListener('click', function () { compose(); });
    root.querySelector('#wrefresh').addEventListener('click', function () { refresh(true); });
    root.querySelector('.wmx-side').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.id === 'wnew') return;
      if (b.dataset.v) { st.view = b.dataset.v; shell(); return; }
      st.view = 'mail'; st.starred = b.dataset.f === 'starred'; st.folder = st.starred ? 'INBOX' : b.dataset.f; st.page = 0; st.sel = {}; st.open = null; shell();
    });
    root.querySelector('#wq').addEventListener('input', function (e) { st.filter = e.target.value.toLowerCase(); if (st.view === 'mail') list(); });
    root.querySelector('#wlist').addEventListener('click', onListClick);
    if (st.view === 'contacts') return contacts();
    if (st.view === 'settings') return settings();
    load();
  }
  function refresh(all) {
    api('folders').then(function (d) {
      st.counts = d.counts || {}; if (all) return shell();
      // update the unread numbers in the menu without redrawing anything else
      root.querySelectorAll('.wmx-folder[data-f]').forEach(function (b) {
        var f = b.dataset.f, r = roleOf(f), n = f === 'starred' ? 0 : (st.counts[f] || {}).unseen, em = b.querySelector('em');
        if (n && r !== 'sent' && r !== 'trash') { if (!em) { em = document.createElement('em'); b.appendChild(em); } em.textContent = n; } else if (em) em.remove();
      });
    }).catch(function () {});
  }
  function load(more) {
    if (!more) root.querySelector('#wlist').innerHTML = '<p class="wmx-empty">Hämtar …</p>';
    api('list?folder=' + encodeURIComponent(st.folder) + '&page=' + st.page).then(function (d) { st.total = d.total; st.items = more ? st.items.concat(d.items) : d.items; list(); }).catch(fail);
  }
  var visible = function () { return st.items.filter(function (m) { return (!st.starred || m.flagged) && (!st.filter || (m.subject + ' ' + m.from + ' ' + m.to).toLowerCase().indexOf(st.filter) >= 0); }); };
  function list() {
    var items = visible(), box = root.querySelector('#wlist'); if (!box) return;
    var nsel = Object.keys(st.sel).length, role = roleOf(st.folder);
    root.querySelector('#wtools').innerHTML = '<div class="wmx-tools"><label class="wmx-check"><input type="checkbox" id="wall"' + (nsel && nsel === items.length ? ' checked' : '') + ' aria-label="Markera alla"></label>' +
      (nsel ? '<span class="wmx-n">' + nsel + ' valda</span><button type="button" data-bulk="read">Läst</button><button type="button" data-bulk="unread">Oläst</button>' +
        (role !== 'archive' && st.roles.archive ? '<button type="button" data-bulk="archive">Arkivera</button>' : '') + (role !== 'junk' && st.roles.junk ? '<button type="button" data-bulk="junk">Skräppost</button>' : role === 'junk' ? '<button type="button" data-bulk="notjunk">Inte skräp</button>' : '') +
        moveSelect('wbmove') + '<button type="button" data-bulk="delete" class="wmx-del">' + (role === 'trash' ? 'Radera för alltid' : 'Ta bort') + '</button>'
        : '<p class="wmx-h">' + esc(st.starred ? 'Stjärnmärkt' : label(st.folder)) + ' <small>' + (st.starred ? items.length : st.total) + '</small></p>') + '</div>';
    box.innerHTML = items.length ? items.map(function (m) {
      var other = roleOf(st.folder) === 'sent' || roleOf(st.folder) === 'drafts' ? 'Till: ' + name(m.to) : name(m.from);
      return '<div class="wmx-item' + (m.seen ? '' : ' is-new') + (st.open === m.uid ? ' is-on' : '') + (st.sel[m.uid] ? ' is-sel' : '') + '" data-uid="' + m.uid + '" tabindex="0">' +
        '<input type="checkbox" class="wmx-pick" data-pick="' + m.uid + '"' + (st.sel[m.uid] ? ' checked' : '') + ' aria-label="Välj"><button type="button" class="wmx-star' + (m.flagged ? ' is-on' : '') + '" data-star="' + m.uid + '" aria-label="Stjärnmärk">' + ico('star') + '</button>' +
        '<b>' + esc(other) + '</b><time>' + when(m.date) + '</time><span>' + (m.files ? ico('clip') : '') + esc(m.subject) + '</span></div>';
    }).join('') + (st.items.length < st.total && !st.filter ? '<button type="button" class="wmx-more" id="wmore">Visa äldre</button>' : '')
      : '<p class="wmx-empty">' + (st.filter ? 'Inga träffar för "' + esc(st.filter) + '".' : st.starred ? 'Inga stjärnmärkta mejl.' : 'Inga mejl här.') + '</p>';
    var all = root.querySelector('#wall'); if (all) all.addEventListener('change', function () { st.sel = {}; if (all.checked) items.forEach(function (m) { st.sel[m.uid] = 1; }); list(); });
    root.querySelectorAll('[data-bulk]').forEach(function (b) { b.addEventListener('click', function () { bulk(b.dataset.bulk, Object.keys(st.sel).map(Number)); }); });
    var mv = root.querySelector('#wbmove'); if (mv) mv.addEventListener('change', function () { if (mv.value) act('move', Object.keys(st.sel).map(Number), mv.value); });
  }
  function moveSelect(id) { var opts = st.folders.filter(function (f) { return f !== st.folder; }); return '<select id="' + id + '" aria-label="Flytta till"><option value="">Flytta till …</option>' + opts.map(function (f) { return '<option value="' + esc(f) + '">' + esc(label(f)) + '</option>'; }).join('') + '</select>'; }
  function onListClick(e) {
    if (e.target.id === 'wmore') { st.page++; load(true); return; }
    var p = e.target.closest('[data-pick]'); if (p) { if (p.checked) st.sel[p.dataset.pick] = 1; else delete st.sel[p.dataset.pick]; list(); return; }
    var s = e.target.closest('[data-star]'); if (s) { var u = Number(s.dataset.star), m = st.items.filter(function (x) { return x.uid === u; })[0]; star(u, !m.flagged); return; }
    var r = e.target.closest('[data-uid]'); if (r) { if (roleOf(st.folder) === 'drafts') { var d = st.items.filter(function (x) { return x.uid === Number(r.dataset.uid); })[0]; api('read?folder=' + encodeURIComponent(st.folder) + '&uid=' + d.uid).then(function (m) { compose({ to: m.to, subject: m.subject, text: m.text, draftUid: d.uid }); }).catch(fail); return; } read(Number(r.dataset.uid)); }
  }
  function star(uid, on) { api('flags', { folder: st.folder, uids: [uid], flag: 'flagged', on: on }).then(function () { st.items.forEach(function (x) { if (x.uid === uid) x.flagged = on; }); list(); if (st.open === uid) { var b = root.querySelector('#rstar'); if (b) b.classList.toggle('is-on', on); } }).catch(fail); }
  function bulk(kind, uids) {
    if (!uids.length) return;
    if (kind === 'read' || kind === 'unread') return api('flags', { folder: st.folder, uids: uids, flag: 'seen', on: kind === 'read' }).then(function () { st.items.forEach(function (m) { if (uids.indexOf(m.uid) >= 0) m.seen = kind === 'read'; }); st.sel = {}; list(); refresh(); }).catch(fail);
    if (kind === 'delete') { if (roleOf(st.folder) === 'trash') { if (!confirm('Radera ' + uids.length + ' mejl för alltid? Det går inte att ångra.')) return; return act('delete', uids); } return act('move', uids, 'trash'); }
    if (kind === 'notjunk') return act('move', uids, 'INBOX');
    act('move', uids, kind);
  }
  function act(op, uids, to) {
    var target = to === 'INBOX' ? 'INBOX' : to;
    (op === 'delete' ? api('delete', { folder: st.folder, uids: uids, uid: uids[0] }) : api('move', { folder: st.folder, uids: uids, to: target })).then(function () {
      st.items = st.items.filter(function (m) { return uids.indexOf(m.uid) < 0; }); st.total -= uids.length; st.sel = {};
      if (uids.indexOf(st.open) >= 0) { st.open = null; root.querySelector('#wread').innerHTML = '<p class="wmx-empty">Välj ett mejl</p>'; }
      list(); refresh(); toast(op === 'delete' ? 'Raderat' : to === 'trash' ? 'Flyttat till papperskorgen' : to === 'archive' ? 'Arkiverat' : to === 'junk' ? 'Flyttat till skräppost' : 'Flyttat');
    }).catch(fail);
  }

  // ---------- reading ----------
  function read(uid) {
    st.open = uid; list();
    var pane = root.querySelector('#wread'); pane.innerHTML = '<p class="wmx-empty">Öppnar …</p>';
    api('read?folder=' + encodeURIComponent(st.folder) + '&uid=' + uid).then(function (m) {
      var was = st.items.filter(function (x) { return x.uid === uid; })[0]; if (was && !was.seen) { was.seen = true; refresh(); } list();
      learn([m.from, m.to, m.cc].join(','));
      var role = roleOf(st.folder), many = [m.to, m.cc].join(',').split(',').filter(function (a) { return a.trim() && addr(a) !== st.email && addr(a) !== addr(m.from); }).length > 0;
      pane.innerHTML = '<div class="wmx-acts"><button type="button" class="btn btn--primary" id="rrep"><span>Svara</span></button>' + (many ? '<button type="button" class="btn btn--light" id="rall"><span>Svara alla</span></button>' : '') +
        '<button type="button" class="btn btn--light" id="rfwd"><span>Vidarebefordra</span></button><span class="wmx-grow"></span>' +
        '<button type="button" class="wmx-icon wmx-star' + (m.flagged ? ' is-on' : '') + '" id="rstar" title="Stjärnmärk" aria-label="Stjärnmärk">' + ico('star') + '</button>' +
        (role !== 'archive' && st.roles.archive ? '<button type="button" class="wmx-icon" id="rarch" title="Arkivera" aria-label="Arkivera">' + ico('archive') + '</button>' : '') +
        (role !== 'junk' && st.roles.junk ? '<button type="button" class="wmx-icon" id="rjunk" title="Skräppost" aria-label="Skräppost">' + ico('junk') + '</button>' : '') +
        '<button type="button" class="wmx-icon" id="rprint" title="Skriv ut" aria-label="Skriv ut">' + ico('print') + '</button>' +
        '<button type="button" class="wmx-icon wmx-del" id="rdel" title="Ta bort" aria-label="Ta bort">' + ico('trash') + '</button></div>' +
        '<div class="wmx-more-acts"><button type="button" class="wmx-link" id="runread">Markera som oläst</button>' + moveSelect('rmove') + '</div>' +
        '<h2 class="wmx-subject">' + esc(m.subject) + '</h2><div class="wmx-from"><i>' + esc(name(m.from).charAt(0).toUpperCase()) + '</i><div><b>' + esc(name(m.from)) + '</b> <small>&lt;' + esc(addr(m.from)) + '&gt;</small>' +
        '<small>Till: ' + esc(m.to) + (m.cc ? ' · Kopia: ' + esc(m.cc) : '') + '</small><small>' + esc(new Date(m.date).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' })) + '</small></div></div>' +
        (m.files && m.files.length ? '<div class="wmx-files">' + m.files.map(function (f, i) { return DEMO ? '<span>' + ico('clip') + esc(f.name) + ' <small>' + kb(f.size) + '</small></span>' : '<a href="/api/mail/attachment?folder=' + encodeURIComponent(st.folder) + '&uid=' + uid + '&i=' + i + '" download="' + esc(f.name) + '">' + ico('clip') + esc(f.name) + ' <small>' + kb(f.size) + '</small></a>'; }).join('') + '</div>' : '') +
        '<div class="wmx-text">' + esc(m.text).replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>') + '</div>';
      var q = function (id, fn) { var b = pane.querySelector(id); if (b) b.addEventListener('click', fn); };
      q('#rrep', function () { compose({ to: m.replyTo || m.from, subject: re(m.subject), text: quote(m), inReplyTo: m.messageId }); });
      q('#rall', function () { compose({ to: m.replyTo || m.from, cc: [m.to, m.cc].join(',').split(',').filter(function (a) { return a.trim() && addr(a) !== st.email; }).join(', '), subject: re(m.subject), text: quote(m), inReplyTo: m.messageId }); });
      q('#rfwd', function () { compose({ subject: 'Fwd: ' + m.subject.replace(/^fwd:\s*/i, ''), text: '\n\n---------- Vidarebefordrat meddelande ----------\nFrån: ' + m.from + '\nDatum: ' + m.date + '\nÄmne: ' + m.subject + '\nTill: ' + m.to + '\n\n' + m.text }); });
      q('#rstar', function () { star(uid, !pane.querySelector('#rstar').classList.contains('is-on')); });
      q('#rarch', function () { act('move', [uid], 'archive'); });
      q('#rjunk', function () { act('move', [uid], 'junk'); });
      q('#rprint', function () { var w = window.open('', '_blank'); if (!w) return; w.document.write('<pre style="font:14px/1.6 sans-serif;white-space:pre-wrap">' + esc('Från: ' + m.from + '\nTill: ' + m.to + '\nDatum: ' + m.date + '\nÄmne: ' + m.subject + '\n\n' + m.text) + '</pre>'); w.document.close(); w.print(); });
      q('#rdel', function () { bulk('delete', [uid]); });
      q('#runread', function () { bulk('unread', [uid]); st.open = null; pane.innerHTML = '<p class="wmx-empty">Markerat som oläst</p>'; });
      var mv = pane.querySelector('#rmove'); mv.addEventListener('change', function () { if (mv.value) act('move', [uid], mv.value); });
    }).catch(fail);
  }
  var re = function (s) { return /^re:/i.test(s) ? s : 'Re: ' + s; };
  function quote(m) { return '\n\n' + sig() + '\n\n— ' + name(m.from) + ' skrev ' + new Date(m.date).toLocaleString('sv-SE') + ':\n' + String(m.text || '').split('\n').map(function (l) { return '> ' + l; }).join('\n'); }
  var sig = function () { return st.settings.signature ? '-- \n' + st.settings.signature : ''; };

  // ---------- writing (in the reading pane, not a popup) ----------
  function compose(pre) {
    pre = pre || {}; st.open = null; if (st.view !== 'mail') { st.view = 'mail'; shell(); }
    list();
    var pane = root.querySelector('#wread'), files = [];
    pane.innerHTML = '<form id="wc" class="wmx-compose-form" novalidate><h2 class="wmx-subject">' + (pre.inReplyTo ? 'Svara' : pre.draftUid ? 'Utkast' : 'Nytt mejl') + '</h2>' +
      '<label>Från<input value="' + esc((st.settings.name ? st.settings.name + ' <' + st.email + '>' : st.email)) + '" disabled></label>' +
      '<label>Till<input name="to" list="wcontacts" value="' + esc(pre.to || '') + '" placeholder="namn@foretag.se" autocomplete="off"></label>' +
      '<label>Kopia<input name="cc" list="wcontacts" value="' + esc(pre.cc || '') + '" autocomplete="off"></label>' +
      '<label' + (pre.bcc ? '' : ' hidden') + ' id="wbccrow">Dold kopia<input name="bcc" list="wcontacts" autocomplete="off"></label>' +
      '<label>Ämne<input name="subject" value="' + esc(pre.subject || '') + '"></label>' +
      '<datalist id="wcontacts">' + st.contacts.map(function (c) { return '<option value="' + esc(c.name ? c.name + ' <' + c.email + '>' : c.email) + '">'; }).join('') + '</datalist>' +
      '<textarea name="text" rows="14" aria-label="Meddelande">' + esc(pre.text != null ? pre.text : (sig() ? '\n\n' + sig() : '')) + '</textarea>' +
      '<div class="wmx-attach" id="wfiles"></div>' +
      '<div class="wmx-acts"><button class="btn btn--primary" type="submit"><span>Skicka</span></button>' +
      '<label class="btn btn--light wmx-file">' + ico('clip') + '<span>Bifoga</span><input type="file" multiple hidden></label>' +
      '<button type="button" class="wmx-link" id="wbcc">Dold kopia</button><button type="button" class="wmx-link" id="wdraft">Spara utkast</button><button type="button" class="wmx-link" id="wcancel">Avbryt</button></div><p class="wmx-err" role="alert" hidden></p></form>';
    var f = pane.querySelector('#wc'), err = f.querySelector('.wmx-err'), start0 = f.text.value;
    (pre.to ? f.text : f.to).focus(); if (pre.to) f.text.setSelectionRange(0, 0);
    var showFiles = function () { pane.querySelector('#wfiles').innerHTML = files.map(function (x, i) { return '<span>' + ico('clip') + esc(x.name) + ' <small>' + kb(x.size) + '</small><button type="button" data-rm="' + i + '" aria-label="Ta bort bilaga">×</button></span>'; }).join(''); };
    f.querySelector('input[type=file]').addEventListener('change', function (e) {
      Array.prototype.forEach.call(e.target.files, function (file) {
        if (files.reduce(function (n, x) { return n + x.size; }, 0) + file.size > 15 * 1048576) { toast('Bilagorna får vara högst 15 MB tillsammans.'); return; }
        var r = new FileReader(); r.onload = function () { files.push({ name: file.name, type: file.type || 'application/octet-stream', size: file.size, data: String(r.result).split(',')[1] }); showFiles(); }; r.readAsDataURL(file);
      }); e.target.value = '';
    });
    pane.querySelector('#wfiles').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { files.splice(Number(b.dataset.rm), 1); showFiles(); } });
    pane.querySelector('#wbcc').addEventListener('click', function () { pane.querySelector('#wbccrow').hidden = false; f.bcc.focus(); });
    pane.querySelector('#wdraft').addEventListener('click', function () {
      api('draft', { to: f.to.value, subject: f.subject.value, text: f.text.value, replaces: pre.draftUid || 0 }).then(function () { toast('Utkastet är sparat'); refresh(); if (roleOf(st.folder) === 'drafts') load(); }).catch(fail);
    });
    pane.querySelector('#wcancel').addEventListener('click', function () { if ((f.text.value !== start0 || files.length) && !confirm('Slänga det du har skrivit?')) return; pane.innerHTML = '<p class="wmx-empty">Välj ett mejl</p>'; });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true;
      if (!/\S+@\S+\.\S+/.test(f.to.value)) { err.hidden = false; err.textContent = 'Skriv minst en mottagare.'; f.to.focus(); return; }
      if (!f.subject.value.trim() && !confirm('Skicka utan ämne?')) return;
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.querySelector('span').textContent = 'Skickar …';
      api('send', { to: f.to.value, cc: f.cc.value, bcc: f.bcc.value, subject: f.subject.value, text: f.text.value, inReplyTo: pre.inReplyTo || '', name: st.settings.name || '', files: files.map(function (x) { return { name: x.name, type: x.type, data: x.data }; }) })
        .then(function () {
          learn([f.to.value, f.cc.value, f.bcc.value].join(','));
          if (pre.draftUid && st.roles.drafts) api('move', { folder: st.roles.drafts, uids: [pre.draftUid], to: 'trash' }).catch(function () {});
          pane.innerHTML = '<p class="wmx-sent">Skickat till ' + esc(f.to.value) + '.</p>'; refresh(); if (roleOf(st.folder) === 'sent') load();
        })
        .catch(function (x) { err.hidden = false; err.textContent = x.message; btn.disabled = false; btn.querySelector('span').textContent = 'Skicka'; });
    });
  }

  // ---------- contacts (kept in this browser, learned from mail) ----------
  function learn(list) {
    String(list || '').split(',').forEach(function (a) { var e = addr(a).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(e) || e === st.email) return; var n = name(a).trim(); n = n.indexOf('@') >= 0 ? '' : n;
      var c = st.contacts.filter(function (x) { return x.email === e; })[0]; if (c) { if (n && !c.name) c.name = n; } else st.contacts.push({ email: e, name: n }); });
    st.contacts.sort(function (a, b) { return (a.name || a.email).localeCompare(b.name || b.email, 'sv'); }); store.set('contacts', st.contacts);
  }
  function contacts() {
    root.querySelector('#wtools').innerHTML = '<p class="wmx-h">Kontakter <small>' + st.contacts.length + '</small></p>';
    root.querySelector('#wlist').innerHTML = '<form id="wcadd" class="wmx-cadd"><input name="name" placeholder="Namn" aria-label="Namn"><input name="email" type="email" placeholder="E-post" aria-label="E-post"><button class="btn btn--primary"><span>Lägg till</span></button></form>' +
      (st.contacts.length ? st.contacts.filter(function (c) { return !st.filter || (c.name + c.email).toLowerCase().indexOf(st.filter) >= 0; }).map(function (c) { return '<div class="wmx-item wmx-contact"><b>' + esc(c.name || c.email) + '</b><span>' + esc(c.email) + '</span><button type="button" class="wmx-link" data-mail="' + esc(c.email) + '">Skriv</button><button type="button" class="wmx-link wmx-del" data-rmc="' + esc(c.email) + '">Ta bort</button></div>'; }).join('')
        : '<p class="wmx-empty">Kontakter sparas automatiskt när du läser och skickar mejl.</p>');
    root.querySelector('#wread').innerHTML = '<p class="wmx-empty">Kontakterna sparas i den här webbläsaren och används för att fylla i adresser när du skriver.</p>';
    root.querySelector('#wcadd').addEventListener('submit', function (e) { e.preventDefault(); if (!/\S+@\S+\.\S+/.test(e.target.email.value)) return toast('Skriv en e-postadress'); learn((e.target.name.value ? e.target.name.value + ' <' : '<') + e.target.email.value + '>'); contacts(); });
    root.querySelector('#wlist').onclick = function (e) { var m = e.target.closest('[data-mail]'), r = e.target.closest('[data-rmc]');
      if (m) compose({ to: m.dataset.mail }); if (r && confirm('Ta bort kontakten?')) { st.contacts = st.contacts.filter(function (c) { return c.email !== r.dataset.rmc; }); store.set('contacts', st.contacts); contacts(); } };
  }

  // ---------- settings ----------
  function settings() {
    root.querySelector('#wtools').innerHTML = '<p class="wmx-h">Inställningar</p>';
    root.querySelector('#wlist').innerHTML = '<form id="wset" class="wmx-set"><label>Ditt namn som avsändare<input name="name" value="' + esc(st.settings.name) + '" placeholder="Anna Exempel"></label>' +
      '<label>Signatur<textarea name="signature" rows="5" placeholder="Anna Exempel&#10;Exempelbygg AB · 070-000 00 00">' + esc(st.settings.signature) + '</textarea></label>' +
      '<label>Mejl per sida<select name="perPage">' + [30].map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn btn--primary"><span>Spara</span></button></form>';
    root.querySelector('#wread').innerHTML = '<div class="wmx-info"><h3>Mejlen i mobilen och datorn</h3><p>Lägg till kontot i iPhone, Android, Outlook eller Apple Mail med de här uppgifterna:</p>' +
      '<dl><dt>E-post</dt><dd>' + esc(st.email) + '</dd><dt>Inkommande (IMAP)</dt><dd>' + esc(st.servers.imap || '–') + ', port 993, SSL</dd><dt>Utgående (SMTP)</dt><dd>' + esc(st.servers.smtp || '–') + ', port 465, SSL</dd><dt>Lösenord</dt><dd>Samma som här</dd></dl>' +
      '<h3>Frånvaromeddelande och vidarebefordran</h3><p>Ställs in hos mejlleverantören. Skapa ett ärende i <a href="portal.html">kundportalen</a> så ordnar vi det.</p>' +
      '<h3>Kortkommandon</h3><p><b>c</b> skriv nytt · <b>r</b> svara · <b>/</b> sök · <b>Delete</b> ta bort öppet mejl</p></div>';
    root.querySelector('#wset').addEventListener('submit', function (e) { e.preventDefault(); st.settings = { name: e.target.name.value.trim(), signature: e.target.signature.value.trim(), perPage: 30 }; store.set('settings', st.settings); toast('Inställningarna är sparade'); shell(); });
  }

  // keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (!root.querySelector('.wmx') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'c') { e.preventDefault(); compose(); } else if (e.key === '/') { e.preventDefault(); root.querySelector('#wq').focus(); }
    else if (e.key === 'r' && st.open) { var b = root.querySelector('#rrep'); if (b) b.click(); } else if (e.key === 'Delete' && st.open) bulk('delete', [st.open]);
    else if (e.key === 'Enter' && document.activeElement.dataset.uid) read(Number(document.activeElement.dataset.uid));
  });

  if (DEMO) { login(); return; }
  api('session').then(function (d) { st.email = d.email; start(); }).catch(function () { login(); });
})();
