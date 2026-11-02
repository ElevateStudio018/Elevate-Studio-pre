/* Elevate Mejl (/mail): webmail for a mailbox on our platform (or any IMAP mailbox). The server does IMAP and SMTP;
   this page only shows what it gets. Mail is shown as plain text, so nothing from a sender runs in the page.
   In a static preview (githack, localhost or ?demo) a clearly marked demo mailbox is used instead. */
(function () {
  var root = document.getElementById('webmail'); if (!root) return;
  var DEMO = /[?&]demo\b/.test(location.search) || /githack|localhost/.test(location.hostname);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var name = function (f) { var m = String(f).match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>/); return m ? m[1] : String(f).replace(/[<>]/g, ''); };
  var addr = function (f) { var m = String(f).match(/<([^>]+)>/); return m ? m[1] : String(f).trim(); };
  var when = function (d) { var t = new Date(d); if (isNaN(t)) return ''; var now = new Date(); return t.toDateString() === now.toDateString() ? t.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }); };
  var LABEL = { INBOX: 'Inkorg', Sent: 'Skickat', Drafts: 'Utkast', Trash: 'Papperskorg', Junk: 'Skräppost', Spam: 'Skräppost', Archive: 'Arkiv' };
  var label = function (f) { var last = f.split(/[./]/).pop(); return f === 'INBOX' ? 'Inkorg' : LABEL[last] || LABEL[last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()] || ({ skickat: 'Skickat', papperskorg: 'Papperskorg', skräppost: 'Skräppost' })[last.toLowerCase()] || last; };
  var st = { email: '', folders: [], folder: 'INBOX', items: [], open: null, page: 0, total: 0, filter: '' };

  // ---------- server, or the demo mailbox ----------
  var demoBox = (function () {
    var t = function (h) { return new Date(Date.now() - h * 36e5).toUTCString(); };
    return { INBOX: [
      { uid: 5, seen: false, from: 'Karin Lönn <karin@kund.se>', subject: 'Offert på badrum', date: t(1), text: 'Hej!\n\nVi har sett er hemsida och vill gärna ha en offert på ett nytt badrum, ungefär 6 kvadratmeter.\n\nVänliga hälsningar\nKarin', messageId: '<d5@kund.se>' },
      { uid: 4, seen: false, from: 'Bokning <bokning@exempelbygg.se>', subject: 'Ny bokning tisdag 14:00', date: t(5), text: 'Johan Berg har bokat ett platsbesök tisdag kl 14:00.' },
      { uid: 3, seen: true, from: 'Elevate Studio <info@elevatestudio.nu>', subject: 'Välkommen till Elevate Mejl', date: t(30), text: 'Hej!\n\nHär läser och skickar du mejl med din egen domän. Mejlen fungerar också i mobilen och i Outlook eller Apple Mail.\n\nHälsningar\nElevate Studio' },
      { uid: 2, seen: true, from: 'Fortnox <noreply@fortnox.se>', subject: 'Faktura 2026-041 är betald', date: t(52), text: 'Betalningen på 199 kr har kommit in.', files: [{ name: 'kvitto.pdf', size: 24000 }] }],
      'INBOX.Sent': [{ uid: 1, seen: true, from: 'Anna Exempel <anna@exempelbygg.se>', subject: 'Re: Offert på kök', date: t(70), text: 'Hej! Här kommer offerten.' }], 'INBOX.Drafts': [], 'INBOX.Trash': [] };
  })();
  function api(op, body) {
    if (DEMO) return demoApi(op, body);
    var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'elevate' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' };
    return fetch('/api/mail/' + op, opt).then(function (r) { return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'fel'); e.status = r.status; throw e; } return d; }); });
  }
  function demoApi(op, b) {
    var q = new URLSearchParams(op.split('?')[1] || ''), o = op.split('?')[0], box = demoBox[q.get('folder') || (b && b.folder) || 'INBOX'] || [];
    var r = o === 'login' ? { ok: true, email: b.email || 'anna@exempelbygg.se', folders: Object.keys(demoBox) }
      : o === 'session' ? { email: 'anna@exempelbygg.se' } : o === 'folders' ? { folders: Object.keys(demoBox) }
      : o === 'list' ? { total: box.length, items: box.map(function (m) { return { uid: m.uid, seen: m.seen, from: m.from, subject: m.subject, date: m.date }; }) }
      : o === 'read' ? (function () { var m = box.filter(function (x) { return x.uid === Number(q.get('uid')); })[0]; m.seen = true; return { from: m.from, to: 'anna@exempelbygg.se', subject: m.subject, date: m.date, text: m.text, files: m.files || [], messageId: m.messageId || '' }; })()
      : o === 'flag' ? (box.forEach(function (m) { if (m.uid === b.uid) m.seen = b.seen; }), { ok: true })
      : o === 'delete' ? (function () { var i = box.findIndex(function (m) { return m.uid === b.uid; }); if (i >= 0) demoBox['INBOX.Trash'].unshift(box.splice(i, 1)[0]); return { ok: true }; })()
      : o === 'send' ? (demoBox['INBOX.Sent'].unshift({ uid: Date.now(), seen: true, from: 'Anna Exempel <anna@exempelbygg.se>', subject: b.subject, date: new Date().toUTCString(), text: b.text }), { ok: true })
      : { ok: true };
    return new Promise(function (ok) { setTimeout(function () { ok(r); }, 150); });
  }

  // ---------- login ----------
  function login(note) {
    root.innerHTML = '<div class="wmx-login glow-dark">' + (DEMO ? '<p class="portal-demo">Demoläge · testbrevlåda · inga riktiga mejl</p>' : '') +
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
        .then(function (d) { st.email = d.email; st.folders = d.folders; app(); })
        .catch(function (x) { err.hidden = false; err.textContent = x.message === 'Failed to fetch' ? 'Kunde inte nå servern.' : x.message; btn.disabled = false; btn.querySelector('span').textContent = 'Logga in'; });
    });
  }

  // ---------- the mailbox ----------
  function app() {
    var order = ['INBOX'].concat(st.folders.filter(function (f) { return f !== 'INBOX'; }));
    root.innerHTML = '<div class="wmx">' +
      '<div class="wmx-bar"><p class="wmx-logo">elevate<span>mejl</span></p><input id="wq" class="wmx-search" placeholder="Sök i mejl" aria-label="Sök i mejl"><span class="wmx-me">' + esc(st.email) + '</span><button type="button" class="wmx-link" id="wout">Logga ut</button></div>' +
      (DEMO ? '<p class="wmx-demo">Demoläge · testbrevlåda · inga riktiga mejl skickas</p>' : '') +
      '<div class="wmx-body"><nav class="wmx-side" aria-label="Mappar"><button type="button" class="wmx-compose" id="wnew">Skriv nytt</button>' +
      order.map(function (f) { return '<button type="button" class="wmx-folder' + (f === st.folder ? ' is-on' : '') + '" data-f="' + esc(f) + '">' + esc(label(f)) + '</button>'; }).join('') + '</nav>' +
      '<section class="wmx-list" aria-label="Mejl"><div id="wlist"><p class="wmx-empty">Hämtar …</p></div></section><section class="wmx-read" id="wread" aria-live="polite"><p class="wmx-empty">Välj ett mejl</p></section></div></div>';
    root.querySelector('#wout').addEventListener('click', function () { api('logout', {}).catch(function () {}).then(function () { login('Du är utloggad.'); }); });
    root.querySelector('#wnew').addEventListener('click', function () { compose(); });
    root.querySelector('.wmx-side').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; st.folder = b.dataset.f; st.page = 0; root.querySelectorAll('.wmx-folder').forEach(function (x) { x.classList.toggle('is-on', x === b); }); load(); root.querySelector('#wread').innerHTML = '<p class="wmx-empty">Välj ett mejl</p>'; });
    root.querySelector('#wq').addEventListener('input', function (e) { st.filter = e.target.value.toLowerCase(); list(); });
    root.querySelector('#wlist').addEventListener('click', function (e) { var r = e.target.closest('[data-uid]'); if (r) read(Number(r.dataset.uid)); if (e.target.id === 'wmore') { st.page++; load(true); } });
    load();
  }
  function load(more) {
    api('list?folder=' + encodeURIComponent(st.folder) + '&page=' + st.page).then(function (d) { st.total = d.total; st.items = more ? st.items.concat(d.items) : d.items; list(); })
      .catch(function (x) { if (x.status === 401) return login('Du har blivit utloggad. Logga in igen.'); root.querySelector('#wlist').innerHTML = '<p class="wmx-empty">' + esc(x.message) + '</p>'; });
  }
  function list() {
    var items = st.items.filter(function (m) { return !st.filter || (m.subject + ' ' + m.from).toLowerCase().indexOf(st.filter) >= 0; });
    var box = root.querySelector('#wlist'); if (!box) return;
    box.innerHTML = '<p class="wmx-h">' + esc(label(st.folder)) + ' <small>' + st.total + '</small></p>' + (items.length ? items.map(function (m) {
      return '<button type="button" class="wmx-item' + (m.seen ? '' : ' is-new') + (st.open === m.uid ? ' is-on' : '') + '" data-uid="' + m.uid + '"><b>' + esc(name(m.from)) + '</b><time>' + when(m.date) + '</time><span>' + esc(m.subject) + '</span></button>';
    }).join('') : '<p class="wmx-empty">' + (st.filter ? 'Inga träffar.' : 'Inga mejl här.') + '</p>') +
      (st.items.length < st.total && !st.filter ? '<button type="button" class="wmx-link" id="wmore">Visa äldre</button>' : '');
  }
  function read(uid) {
    st.open = uid; list();
    var pane = root.querySelector('#wread'); pane.innerHTML = '<p class="wmx-empty">Öppnar …</p>';
    api('read?folder=' + encodeURIComponent(st.folder) + '&uid=' + uid).then(function (m) {
      st.items.forEach(function (x) { if (x.uid === uid) x.seen = true; }); list();
      pane.innerHTML = '<div class="wmx-acts"><button type="button" class="btn btn--primary" id="wrep"><span>Svara</span></button><button type="button" class="btn btn--light" id="wfwd"><span>Vidarebefordra</span></button>' +
        '<button type="button" class="wmx-link" id="wunread">Markera som oläst</button><button type="button" class="wmx-link wmx-del" id="wdel">Ta bort</button></div>' +
        '<h2 class="wmx-subject">' + esc(m.subject) + '</h2><div class="wmx-from"><i>' + esc(name(m.from).charAt(0).toUpperCase()) + '</i><div><b>' + esc(name(m.from)) + '</b> <small>&lt;' + esc(addr(m.from)) + '&gt;</small><small>Till: ' + esc(m.to) + (m.cc ? ' · Kopia: ' + esc(m.cc) : '') + ' · ' + esc(new Date(m.date).toLocaleString('sv-SE')) + '</small></div></div>' +
        '<div class="wmx-text">' + esc(m.text).replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>') + '</div>' +
        (m.files && m.files.length ? '<p class="wmx-files">' + m.files.map(function (f) { return '<span>' + esc(f.name) + '</span>'; }).join('') + '<small>Bilagor öppnas i mejlappen i mobilen eller datorn.</small></p>' : '');
      pane.querySelector('#wrep').addEventListener('click', function () { compose({ to: addr(m.from), subject: /^re:/i.test(m.subject) ? m.subject : 'Re: ' + m.subject, text: '\n\n' + quote(m), inReplyTo: m.messageId }); });
      pane.querySelector('#wfwd').addEventListener('click', function () { compose({ subject: 'Fwd: ' + m.subject, text: '\n\n' + quote(m) }); });
      pane.querySelector('#wunread').addEventListener('click', function () { api('flag', { folder: st.folder, uid: uid, seen: false }).then(function () { st.items.forEach(function (x) { if (x.uid === uid) x.seen = false; }); st.open = null; list(); pane.innerHTML = '<p class="wmx-empty">Markerat som oläst</p>'; }); });
      pane.querySelector('#wdel').addEventListener('click', function () { if (!confirm('Ta bort mejlet? Det flyttas till papperskorgen.')) return; api('delete', { folder: st.folder, uid: uid }).then(function () { st.items = st.items.filter(function (x) { return x.uid !== uid; }); st.total--; st.open = null; list(); pane.innerHTML = '<p class="wmx-empty">Mejlet är borttaget</p>'; }); });
    }).catch(function (x) { if (x.status === 401) return login('Du har blivit utloggad. Logga in igen.'); pane.innerHTML = '<p class="wmx-empty">' + esc(x.message) + '</p>'; });
  }
  function quote(m) { return '— ' + name(m.from) + ' skrev ' + new Date(m.date).toLocaleString('sv-SE') + ':\n' + String(m.text || '').split('\n').map(function (l) { return '> ' + l; }).join('\n'); }
  // writing happens in the reading pane, not in a popup
  function compose(pre) {
    pre = pre || {}; st.open = null; list();
    var pane = root.querySelector('#wread');
    pane.innerHTML = '<form id="wc" class="wmx-compose-form" novalidate><h2 class="wmx-subject">' + (pre.inReplyTo ? 'Svara' : 'Nytt mejl') + '</h2>' +
      '<label>Från<input value="' + esc(st.email) + '" disabled></label><label>Till<input name="to" value="' + esc(pre.to || '') + '" placeholder="namn@foretag.se" required></label>' +
      '<label>Kopia<input name="cc" placeholder="valfritt"></label><label>Ämne<input name="subject" value="' + esc(pre.subject || '') + '"></label>' +
      '<textarea name="text" rows="12" aria-label="Meddelande">' + esc(pre.text || '') + '</textarea>' +
      '<div class="wmx-acts"><button class="btn btn--primary" type="submit"><span>Skicka</span></button><button type="button" class="wmx-link" id="wcancel">Avbryt</button></div><p class="wmx-err" role="alert" hidden></p></form>';
    var f = pane.querySelector('#wc'), err = f.querySelector('.wmx-err');
    (pre.to ? f.text : f.to).focus(); if (pre.to) f.text.setSelectionRange(0, 0);
    pane.querySelector('#wcancel').addEventListener('click', function () { if (f.text.value.trim() && f.text.value !== (pre.text || '') && !confirm('Slänga utkastet?')) return; pane.innerHTML = '<p class="wmx-empty">Välj ett mejl</p>'; });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true;
      if (!/\S+@\S+\.\S+/.test(f.to.value)) { err.hidden = false; err.textContent = 'Skriv minst en mottagare.'; f.to.focus(); return; }
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.querySelector('span').textContent = 'Skickar …';
      api('send', { to: f.to.value, cc: f.cc.value, subject: f.subject.value, text: f.text.value, inReplyTo: pre.inReplyTo || '' })
        .then(function () { pane.innerHTML = '<p class="wmx-sent">Skickat till ' + esc(f.to.value) + '.</p>'; })
        .catch(function (x) { err.hidden = false; err.textContent = x.message; btn.disabled = false; btn.querySelector('span').textContent = 'Skicka'; });
    });
  }

  if (DEMO) { login(); return; }
  api('session').then(function (d) { st.email = d.email; return api('folders'); }).then(function (d) { st.folders = d.folders; app(); }).catch(function () { login(); });
})();
