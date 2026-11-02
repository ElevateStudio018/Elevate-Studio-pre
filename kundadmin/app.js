/* Kundadmin – one admin panel for every customer website.
 * Design: 1 (long side menu in the site's own colour) + 5 (ask the assistant at the top) + 6 (edit on the site).
 * Data lives in Supabase (sites, site_content, site_items, site_leads, site_bookings, storage "site-media").
 * The database rules decide who may do what; this file only shows what the signed-in user is allowed to see.
 * ?demo (or githack/localhost) runs on clearly marked test data and saves nothing. */
(function () {
  var root = document.getElementById('app');
  var DEMO = /[?&]demo\b/.test(location.search) || /githack|localhost|127\.0\.0\.1/.test(location.hostname);
  var API = DEMO ? '' : 'https://elevatestudio.nu';
  var sb = DEMO ? demoClient() : window.supabase.createClient(root.dataset.url, root.dataset.key);
  var st = { user: null, sites: [], site: null, role: null, view: 'oversikt', data: {}, drafts: {}, lead: null };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var day = function (d) { return d ? new Date(d).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) : ''; };
  var when = function (d) { return d ? new Date(d).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; };
  var toast = function (t) { var e = document.getElementById('toast'); e.textContent = t; e.classList.add('toast--on'); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('toast--on'); }, 2600); };
  var editor = function () { return /owner|admin|tech|staff/.test(st.role || ''); };
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var on = function (sel, ev, fn) { var el = typeof sel === 'string' ? $(sel) : sel; if (el) el.addEventListener(ev, fn); };

  var MODULES = [
    ['oversikt', 'Översikt', 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z'],
    ['sidor', 'Sidor och texter', 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'],
    ['forfragningar', 'Förfrågningar', 'M4 5h16v14H4zM4 7l8 6 8-6'],
    ['projekt', 'Projekt', 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6'],
    ['bilder', 'Bilder', 'M4 4h16v16H4zM8 10a2 2 0 100-4 2 2 0 000 4zm12 6l-5-5L5 20'],
    ['tjanster', 'Tjänster och priser', 'M4 6h16M4 12h16M4 18h10'],
    ['nyheter', 'Nyheter', 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5'],
    ['bokningar', 'Bokningar', 'M4 6h16v14H4zM4 10h16M9 3v5M15 3v5'],
    ['recensioner', 'Recensioner', 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
    ['installningar', 'Inställningar', 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.3l2-1.6-2-3.4-2.4 1a7 7 0 00-2.2-1.3L14.4 2h-4l-.4 2.4a7 7 0 00-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.6l-2 1.6 2 3.4 2.4-1a7 7 0 002.2 1.3l.4 2.4h4l.4-2.4a7 7 0 002.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z']
  ];
  var KIND = { projekt: 'project', tjanster: 'service', nyheter: 'news', recensioner: 'review' };
  var FIELDS = {
    project: [['title', 'Namn på projektet'], ['place', 'Ort'], ['text', 'Kort beskrivning', 1], ['image', 'Bild', 'img']],
    service: [['title', 'Tjänst'], ['price', 'Pris (valfritt)'], ['text', 'Beskrivning', 1], ['image', 'Bild', 'img']],
    news: [['title', 'Rubrik'], ['date', 'Datum'], ['text', 'Text', 1], ['image', 'Bild', 'img']],
    review: [['name', 'Namn'], ['stars', 'Betyg (1–5)'], ['text', 'Omdöme', 1]]
  };
  var LST = { new: 'Ny', answered: 'Besvarad', quoted: 'Offert skickad', won: 'Vunnen', lost: 'Förlorad', done: 'Klar' };
  var LABEL = { 'services.title': 'Tjänster – rubrik', 'projects.title': 'Projekt – rubrik', 'hero.title': 'Stor rubrik', 'hero.text': 'Text under rubriken', 'hero.button': 'Knapp', 'hero.image': 'Stora bilden', 'about.title': 'Om oss – rubrik', 'about.text': 'Om oss – text', 'contact.title': 'Kontakt – rubrik', 'contact.text': 'Kontakt – text', 'footer.text': 'Sidfot' };

  // ---------- colours from the customer's website ----------
  function theme(t) {
    t = t || {}; var s = document.documentElement.style;
    s.setProperty('--p', t.primary || '#1d3b2a'); s.setProperty('--a', t.accent || '#8fd3a6');
    var m = document.querySelector('meta[name=theme-color]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' })); m.content = t.primary || '#1d3b2a';
  }

  // ---------- sign in ----------
  function login(note) {
    theme(); document.title = 'Logga in – Adminpanel';
    root.innerHTML = '<div class="login"><div class="login__brand"><small>ADMINPANEL</small><h1>Er hemsida, enkelt.</h1><p>Ändra texter och bilder, läs förfrågningar och lägg till projekt. Eller skriv vad du vill göra, så hjälper assistenten dig.</p></div>' +
      '<form id="lf" novalidate><h2>Logga in</h2>' + (note ? '<p class="msg msg--ok">' + esc(note) + '</p>' : '') +
      '<label for="le">E-post</label><input id="le" type="email" autocomplete="username" required><label for="lp">Lösenord</label><input id="lp" type="password" autocomplete="current-password" required>' +
      '<button class="btn w100">Logga in</button><p class="msg msg--bad" id="lm" hidden></p>' +
      '<p class="mut" style="font-size:13px;margin-top:18px">Samma konto som i Elevate Studios kundportal. <button type="button" id="lr" style="border:0;background:none;padding:0;text-decoration:underline;cursor:pointer;color:inherit">Glömt lösenord?</button></p></form></div>';
    var m = $('#lm'), bad = function (t) { m.hidden = false; m.textContent = t; };
    on('#lf', 'submit', function (e) { e.preventDefault(); bad('Loggar in …'); m.className = 'msg';
      sb.auth.signInWithPassword({ email: $('#le').value.trim(), password: $('#lp').value }).then(function (r) { if (r.error) { m.className = 'msg msg--bad'; return bad('Fel e-post eller lösenord.'); } start(); }); });
    on('#lr', 'click', function () { var em = $('#le').value.trim(); if (!em) return bad('Skriv din e-post först.');
      sb.auth.resetPasswordForEmail(em, { redirectTo: 'https://elevatestudio.nu/portal.html' }).then(function () { m.className = 'msg msg--ok'; bad('Om adressen finns får du ett mejl med en länk.'); }); });
  }

  function start() {
    sb.auth.getUser().then(function (r) {
      st.user = r.data && r.data.user; if (!st.user) return login();
      sb.from('sites').select('id,slug,name,domain,theme,modules,settings,company_id').order('name').then(function (s) {
        st.sites = s.data || [];
        if (!st.sites.length) { root.innerHTML = '<div class="login"><div class="login__brand"><h1>Ingen hemsida än</h1><p>Ditt konto är inte kopplat till någon hemsida. Kontakta Elevate Studio så kopplar vi den.</p></div><div style="align-self:center;justify-self:center"><button class="btn" id="lo">Logga ut</button></div></div>'; on('#lo', 'click', logout); return; }
        var want = new URLSearchParams(location.search).get('site'), saved = ''; try { saved = localStorage.getItem('es.kundadmin.site') || ''; } catch (e) { /* fine */ }
        choose(st.sites.filter(function (x) { return x.slug === want || x.id === want; })[0] || st.sites.filter(function (x) { return x.id === saved; })[0] || st.sites[0]);
      });
    });
  }
  function logout() { sb.auth.signOut().then(function () { login('Du är utloggad.'); }); }

  function choose(site) {
    st.site = site; st.drafts = {}; st.lead = null; theme(site.theme); document.title = 'Admin – ' + site.name;
    try { localStorage.setItem('es.kundadmin.site', site.id); } catch (e) { /* fine */ }
    Promise.all([
      sb.from('company_members').select('role').eq('company_id', site.company_id).eq('user_id', st.user.id),
      sb.from('site_content').select('key,draft,published').eq('site_id', site.id),
      sb.from('site_items').select('*').eq('site_id', site.id).order('sort'),
      sb.from('site_leads').select('*').eq('site_id', site.id).order('created_at', { ascending: false }).limit(300),
      sb.from('site_bookings').select('*').eq('site_id', site.id).order('starts_at'),
      sb.from('user_roles').select('role').eq('user_id', st.user.id)
    ]).then(function (r) {
      st.role = ((r[0].data || [])[0] || {}).role || (((r[5] && r[5].data) || []).length ? 'staff' : 'user');
      st.data = { content: r[1].data || [], items: r[2].data || [], leads: r[3].data || [], bookings: r[4].data || [] };
      shell();
    });
  }
  var enabled = function () { var m = st.site.modules || []; return MODULES.filter(function (x) { return x[0] === 'oversikt' || m.indexOf(x[0]) >= 0; }); };

  // ---------- layout ----------
  function shell() {
    var nNew = st.data.leads.filter(function (l) { return l.status === 'new'; }).length;
    var nDraft = st.data.content.filter(function (c) { return JSON.stringify(c.draft) !== JSON.stringify(c.published) && c.draft != null; }).length;
    root.innerHTML = '<div class="app"><nav class="side" aria-label="Meny"><div class="side__site"><b>' + esc(st.site.name) + '</b><small>' + esc(st.site.domain || '') + '</small>' +
      (st.sites.length > 1 ? '<select id="sp" aria-label="Byt hemsida">' + st.sites.map(function (s) { return '<option value="' + s.id + '"' + (s.id === st.site.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' : '') + '</div>' +
      enabled().map(function (m) { var n = m[0] === 'forfragningar' ? nNew : m[0] === 'sidor' ? nDraft : 0;
        return '<button class="nav" data-v="' + m[0] + '"' + (st.view === m[0] ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + m[2] + '"/></svg>' + m[1] + (n ? '<em>' + n + '</em>' : '') + '</button>'; }).join('') +
      '<div class="side__foot">' + esc(st.user.email || '') + (st.site.domain ? '<a href="https://' + esc(st.site.domain) + '" target="_blank" rel="noopener">Visa hemsidan ↗</a>' : '') + '<a href="https://elevatestudio.nu/portal.html">Kundportalen ↗</a><button type="button" id="lo">Logga ut</button></div></nav>' +
      '<main class="main"><div class="ask"><form id="af" autocomplete="off"><div class="ask__in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8zM19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/></svg><label class="sr" for="aq">Fråga assistenten</label>' +
      '<input id="aq" placeholder="Skriv vad du vill göra, t.ex. &quot;ändra öppettider till mån–fre 7–17&quot;"></div><button class="btn">Fråga</button></form>' +
      '<p class="ask__hint" id="ah">Prova: <button type="button">Ändra rubriken på startsidan</button><button type="button">Lägg till projekt Villa i Tyresö</button><button type="button">Byt en bild</button></p><div id="ao"></div></div>' +
      (DEMO ? '<p class="demo">Demoläge · testdata · inget sparas</p>' : '') + '<div id="v"></div></main></div>';
    root.querySelectorAll('.nav').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.v); }); });
    on('#lo', 'click', logout); on('#sp', 'change', function (e) { choose(st.sites.filter(function (s) { return s.id === e.target.value; })[0]); });
    on('#af', 'submit', function (e) { e.preventDefault(); ask($('#aq').value); });
    root.querySelectorAll('#ah button').forEach(function (b) { b.addEventListener('click', function () { $('#aq').value = b.textContent; $('#aq').focus(); }); });
    ({ oversikt: overview, sidor: pages, forfragningar: leads, bilder: images, bokningar: bookings, installningar: settings })[st.view] ? ({ oversikt: overview, sidor: pages, forfragningar: leads, bilder: images, bokningar: bookings, installningar: settings })[st.view]() : list(st.view);
  }
  function go(v) { st.view = v; shell(); window.scrollTo(0, 0); }
  var view = function () { return $('#v'); };

  // ---------- design 5: the assistant ----------
  function ask(q) {
    q = (q || '').trim(); if (!q) return; var out = $('#ao'); out.innerHTML = '<div class="ask__out"><p class="mut">Tänker …</p></div>';
    var texts = {}; st.data.content.forEach(function (c) { texts[c.key] = c.draft != null ? c.draft : c.published; });
    var call = DEMO ? Promise.resolve(simple(q)) : sb.auth.getSession().then(function (r) {
      return fetch(API + '/api/kundadmin/agent', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + (r.data.session || {}).access_token }, body: JSON.stringify({ site_id: st.site.id, prompt: q, texts: texts }) }).then(function (x) { return x.json(); });
    });
    call.then(function (d) {
      var acts = d.actions || [];
      out.innerHTML = '<div class="ask__out"><p>' + esc(d.reply || d.error || '') + '</p>' + acts.map(function (a, i) { return '<div class="act" data-i="' + i + '"><div><b>' + esc(describe(a)[0]) + '</b><span>' + esc(describe(a)[1]) + '</span></div><button class="btn btn--small">' + (a.type === 'open' ? 'Öppna' : 'Gör det') + '</button></div>'; }).join('') +
        (d.note ? '<p class="mut" style="font-size:13px;margin-top:8px">' + esc(d.note) + '</p>' : '') + '<p style="margin:10px 0 0"><button type="button" class="btn btn--ghost btn--small" id="ax">Stäng</button></p></div>';
      on('#ax', 'click', function () { out.innerHTML = ''; });
      out.querySelectorAll('.act').forEach(function (row) { row.querySelector('.btn').addEventListener('click', function () {
        var a = acts[+row.dataset.i]; if (a.type !== 'open' && !editor()) return toast('Bara ägare och administratörer kan ändra hemsidan.');
        run(a).then(function () { row.classList.add('act--done'); }); }); });
    }).catch(function () { out.innerHTML = '<div class="ask__out"><p>Assistenten svarade inte. Försök igen eller använd menyn.</p></div>'; });
  }
  function describe(a) {
    var F = { phone: 'Telefon', email: 'E-post', address: 'Adress', hours: 'Öppettider', lead_email: 'Förfrågningar mejlas till' }, K = { project: 'projekt', service: 'tjänst', news: 'nyhet', review: 'recension' };
    if (a.type === 'set_text') return ['Ändra ' + (LABEL[a.key] || a.key).toLowerCase(), '"' + a.text + '"'];
    if (a.type === 'set_setting') return [F[a.field] || a.field, a.value];
    if (a.type === 'add_item') return ['Lägg till ' + (K[a.kind] || a.kind), a.title + (a.place ? ', ' + a.place : '')];
    if (a.type === 'open') return ['Öppna ' + ((MODULES.filter(function (m) { return m[0] === a.module; })[0] || [])[1] || a.module), a.why || ''];
    return [a.type, ''];
  }
  function run(a) {
    if (a.type === 'open') { go(a.module); return Promise.resolve(); }
    if (a.type === 'set_text') return saveDraft(a.key, a.text).then(function () { toast('Sparat som utkast. Publicera under Sidor och texter.'); if (st.view === 'sidor') pages(); });
    if (a.type === 'set_setting') { var s = Object.assign({}, st.site.settings || {}); s[a.field] = a.value; return sb.from('sites').update({ settings: s }).eq('id', st.site.id).then(function () { st.site.settings = s; toast('Sparat'); if (st.view === 'installningar') settings(); }); }
    if (a.type === 'add_item') { var data = { title: a.title || a.name || '', text: a.text || '', place: a.place || '', price: a.price || '' };
      return sb.from('site_items').insert({ site_id: st.site.id, kind: a.kind, data: data, sort: 0, published: false }).select().then(function (r) { (r.data || []).forEach(function (x) { st.data.items.unshift(x); }); toast('Tillagt som dolt – lägg till bild och visa det.'); go(Object.keys(KIND).filter(function (k) { return KIND[k] === a.kind; })[0]); }); }
    return Promise.resolve();
  }
  // a tiny version of the server's parser, for the demo
  function simple(p) {
    var acts = [], m;
    if ((m = p.match(/öppettider\w*\s*(?:till|:)?\s*(.+)$/i))) acts.push({ type: 'set_setting', field: 'hours', value: m[1] });
    if ((m = p.match(/rubrik\w*\s*(?:på startsidan)?\s*(?:till|:)\s*["”]?(.+?)["”]?$/i))) acts.push({ type: 'set_text', key: 'hero.title', text: m[1] });
    else if (/rubrik/i.test(p)) acts.push({ type: 'set_text', key: 'hero.title', text: 'Vi bygger ditt drömhem – i tid och till fast pris' });
    if ((m = p.match(/(?:lägg till|nytt)\s+projekt\s+(.+?)(?:\s+i\s+([A-ZÅÄÖ][\wåäö-]+))?$/i))) acts.push({ type: 'add_item', kind: 'project', title: m[1], text: '', place: m[2] || '' });
    if (!acts.length && /bild|foto/i.test(p)) acts.push({ type: 'open', module: 'bilder', why: 'Ladda upp bilden här och välj den sedan på sidan.' });
    return { reply: acts.length ? 'Här är mitt förslag. Kontrollera och klicka Gör det.' : 'Skriv till exempel "ändra öppettider till mån–fre 7–17".', actions: acts };
  }

  // ---------- overview ----------
  function overview() {
    var d = st.data, nNew = d.leads.filter(function (l) { return l.status === 'new'; }).length, month = d.leads.filter(function (l) { return Date.now() - new Date(l.created_at) < 30 * 864e5; }).length;
    var drafts = d.content.filter(function (c) { return c.draft != null && JSON.stringify(c.draft) !== JSON.stringify(c.published); }).length;
    var first = ((st.user.user_metadata || {}).full_name || '').split(' ')[0];
    view().innerHTML = '<div class="head"><h1>Hej' + (first ? ' ' + esc(first) : '') + '!</h1>' + (st.site.domain ? '<a class="btn btn--ghost" href="https://' + esc(st.site.domain) + '" target="_blank" rel="noopener">Visa hemsidan ↗</a>' : '') + '</div>' +
      '<div class="kpis"><div><small>Nya förfrågningar</small><b>' + nNew + '</b></div><div><small>Förfrågningar 30 dagar</small><b>' + month + '</b></div><div><small>Projekt på sajten</small><b>' + d.items.filter(function (i) { return i.kind === 'project' && i.published; }).length + '</b></div><div><small>Ändringar att publicera</small><b>' + drafts + '</b></div></div>' +
      '<div class="tiles">' + [['forfragningar', 'Läsa förfrågningar', nNew ? nNew + (nNew === 1 ? ' ny' : ' nya') : 'Inga nya'], ['sidor', 'Ändra en text', 'Klicka direkt på hemsidan'], ['bilder', 'Byta en bild', 'Ladda upp och välj'], ['projekt', 'Lägga till projekt', 'Visa ert senaste jobb'], ['bokningar', 'Se bokningar', ''], ['installningar', 'Öppettider och kontakt', '']].filter(function (t) { return enabled().some(function (m) { return m[0] === t[0]; }); })
        .map(function (t) { return '<button class="tile" data-go="' + t[0] + '"><b>' + t[1] + '</b><small>' + t[2] + '</small></button>'; }).join('') + '</div>' +
      '<div class="card" style="margin-top:14px"><h2>Senaste förfrågningarna</h2>' + (d.leads.slice(0, 5).map(function (l) { return '<p style="margin:0 0 10px"><b>' + esc(l.name || 'Okänd') + '</b> · ' + esc(l.service || '') + ' <span class="mut">' + day(l.created_at) + '</span><br><span class="mut">' + esc((l.message || '').slice(0, 120)) + '</span></p>'; }).join('') || '<p class="mut">Inga förfrågningar än.</p>') + '</div>';
    view().querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });
  }

  // ---------- design 6: pages and texts, edited on the site ----------
  function cval(k) { var c = st.data.content.filter(function (x) { return x.key === k; })[0]; return c ? (c.draft != null ? c.draft : c.published) : null; }
  function saveDraft(key, val) {
    var row = st.data.content.filter(function (x) { return x.key === key; })[0];
    if (row) row.draft = val; else st.data.content.push(row = { key: key, draft: val, published: null });
    return sb.from('site_content').upsert({ site_id: st.site.id, key: key, draft: val, updated_by: st.user.id, updated_at: new Date().toISOString() }, { onConflict: 'site_id,key' });
  }
  var timers = {};
  function pages() {
    var url = (st.site.settings || {}).preview_url || (st.site.domain ? 'https://' + st.site.domain + '/' : '');
    if (DEMO) url = 'demo-sajt.html';
    var dirty = st.data.content.filter(function (c) { return c.draft != null && JSON.stringify(c.draft) !== JSON.stringify(c.published); });
    view().innerHTML = '<div class="head"><h1>Sidor och texter</h1><span class="mut">' + (dirty.length ? dirty.length + ' ändringar som inte är publicerade' : 'Allt är publicerat') + '</span>' +
      '<button class="btn" id="pub"' + (dirty.length && editor() ? '' : ' disabled') + '>Publicera</button></div>' +
      (url ? '<div class="edit"><div class="frame"><div class="frame__bar"><i></i><i></i><i></i><span>' + esc(st.site.domain || 'förhandsvisning') + '</span></div><iframe id="pf" title="Er hemsida" src="' + esc(url) + (url.indexOf('?') >= 0 ? '&' : '?') + 'es-edit"></iframe></div>' +
        '<div class="card fields" id="pfl"><h2>Klicka på en text på sidan – eller ändra här</h2><p class="mut" id="pwait">Laddar sidan …</p></div></div>' : '<div class="card empty">Lägg in hemsidans adress under Inställningar så visas sidan här.</div>');
    on('#pub', 'click', publish);
    var frame = $('#pf'); if (!frame) return;
    window.onmessage = function (e) {
      if (!frame.contentWindow || e.source !== frame.contentWindow) return; var m = e.data || {};
      if (m.es === 'ready') {
        var lists = {}; st.data.items.filter(function (i) { return i.published && i.kind !== 'image'; }).forEach(function (i) { (lists[i.kind] = lists[i.kind] || []).push(Object.assign({ id: i.id }, i.data)); });
        frame.contentWindow.postMessage({ es: 'data', data: { lists: lists, settings: st.site.settings || {} } }, '*');
        m.keys.forEach(function (k) { var v = cval(k.key); if (v != null) frame.contentWindow.postMessage({ es: 'set', key: k.key, value: typeof v === 'string' ? v : v.url || v.text }, '*'); });
        $('#pfl').innerHTML = '<h2>Texter och bilder på sidan</h2>' + m.keys.map(function (k) { var v = cval(k.key), cur = v != null ? (typeof v === 'string' ? v : v.url || '') : k.text, row = st.data.content.filter(function (x) { return x.key === k.key; })[0];
          var isDirty = row && row.draft != null && JSON.stringify(row.draft) !== JSON.stringify(row.published);
          return '<div class="field" data-k="' + esc(k.key) + '"><label>' + esc(LABEL[k.key] || k.key) + (isDirty ? '<span class="dirty">Ej publicerad</span>' : '') + '</label>' +
            (k.img ? '<img src="' + esc(cur) + '" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:10px"><button type="button" class="btn btn--ghost btn--small" data-img="' + esc(k.key) + '" style="margin-top:6px">Byt bild</button>' : '<textarea' + (editor() ? '' : ' readonly') + '>' + esc(cur) + '</textarea>') + '</div>'; }).join('');
        $('#pfl').querySelectorAll('textarea').forEach(function (ta) { ta.addEventListener('input', function () { var k = ta.closest('.field').dataset.k; frame.contentWindow.postMessage({ es: 'set', key: k, value: ta.value }, '*'); queue(k, ta.value); }); });
        $('#pfl').querySelectorAll('[data-img]').forEach(function (b) { b.addEventListener('click', function () { pickImage(b.dataset.img, frame); }); });
      }
      if (m.es === 'text' && editor()) { var ta = $('.field[data-k="' + m.key + '"] textarea'); if (ta) ta.value = m.text; queue(m.key, m.text); }
      if (m.es === 'focus') { root.querySelectorAll('.field').forEach(function (f) { f.classList.toggle('field--on', f.dataset.k === m.key); }); var f = $('.field[data-k="' + m.key + '"]'); if (f) f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      if (m.es === 'image' && editor()) pickImage(m.key, frame);
    };
  }
  function queue(k, v) { clearTimeout(timers[k]); timers[k] = setTimeout(function () { saveDraft(k, v).then(function () { var b = $('#pub'); if (b) b.disabled = !editor(); }); }, 600); }
  function publish() {
    var rows = st.data.content.filter(function (c) { return c.draft != null && JSON.stringify(c.draft) !== JSON.stringify(c.published); });
    Promise.all(rows.map(function (c) { return sb.from('site_content').update({ published: c.draft, updated_at: new Date().toISOString() }).eq('site_id', st.site.id).eq('key', c.key).then(function () { c.published = c.draft; }); }))
      .then(function () { toast('Publicerat på ' + (st.site.domain || 'hemsidan')); pages(); });
  }
  function pickImage(key, frame) {
    var imgs = st.data.items.filter(function (i) { return i.kind === 'image'; });
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div><div class="head"><h1 style="font-size:22px">Välj bild</h1><button class="btn btn--ghost btn--small" data-x>Stäng</button></div><div class="gallery">' +
      '<label class="drop">+ Ladda upp ny bild<input type="file" accept="image/*" hidden></label>' + imgs.map(function (i) { return '<div class="pic pic--pick" data-u="' + esc(i.data.url) + '"><img src="' + esc(i.data.url) + '" alt=""></div>'; }).join('') + '</div></div>';
    document.body.appendChild(m);
    var close = function () { m.remove(); }, use = function (u) { saveDraft(key, { url: u }).then(function () { if (frame) frame.contentWindow.postMessage({ es: 'set', key: key, value: u }, '*'); close(); toast('Bilden är bytt – publicera när du är klar.'); if (st.view === 'sidor') pages(); }); };
    m.querySelector('[data-x]').addEventListener('click', close); m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelectorAll('[data-u]').forEach(function (p) { p.addEventListener('click', function () { use(p.dataset.u); }); });
    m.querySelector('input[type=file]').addEventListener('change', function (e) { upload(e.target.files[0]).then(function (u) { if (u) use(u); }); });
  }

  // ---------- images ----------
  function upload(file) {
    if (!file) return Promise.resolve(null); if (!/^image\//.test(file.type)) { toast('Välj en bildfil.'); return Promise.resolve(null); }
    if (file.size > 8 * 1024 * 1024) { toast('Bilden är för stor (max 8 MB).'); return Promise.resolve(null); }
    return shrink(file).then(function (blob) {
      var path = st.site.id + '/' + Date.now() + '-' + file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/\.[a-z]+$/, '') + '.webp';
      return sb.storage.from('site-media').upload(path, blob, { contentType: 'image/webp', upsert: false }).then(function (r) {
        if (r.error) { toast('Kunde inte ladda upp: ' + r.error.message); return null; }
        var url = sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;
        return sb.from('site_items').insert({ site_id: st.site.id, kind: 'image', data: { url: url, name: file.name }, published: true }).select().then(function (x) { (x.data || []).forEach(function (i) { st.data.items.unshift(i); }); toast('Bilden är uppladdad'); return url; });
      });
    });
  }
  // images are scaled to at most 2000 px and saved as WebP so the site stays fast
  function shrink(file) {
    return new Promise(function (ok) { var img = new Image(); img.onload = function () { var s = Math.min(1, 2000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { ok(b || file); }, 'image/webp', 0.82); }; img.onerror = function () { ok(file); }; img.src = URL.createObjectURL(file); });
  }
  function images() {
    var imgs = st.data.items.filter(function (i) { return i.kind === 'image'; });
    view().innerHTML = '<div class="head"><h1>Bilder</h1><span class="mut">Bilder görs automatiskt mindre så att hemsidan går snabbt.</span></div><div class="gallery">' +
      (editor() ? '<label class="drop">+ Ladda upp bilder<br><small>eller dra hit</small><input type="file" accept="image/*" multiple hidden></label>' : '') +
      imgs.map(function (i) { return '<div class="pic"><img src="' + esc(i.data.url) + '" alt="' + esc(i.data.name || '') + '">' + (editor() ? '<button data-del="' + i.id + '">Ta bort</button>' : '') + '</div>'; }).join('') + '</div>' + (imgs.length ? '' : '<p class="empty">Inga bilder än.</p>');
    var input = $('.drop input'), drop = $('.drop');
    if (input) input.addEventListener('change', function () { Array.prototype.reduce.call(input.files, function (p, f) { return p.then(function () { return upload(f); }); }, Promise.resolve()).then(images); });
    if (drop) { drop.addEventListener('dragover', function (e) { e.preventDefault(); }); drop.addEventListener('drop', function (e) { e.preventDefault(); Array.prototype.reduce.call(e.dataTransfer.files, function (p, f) { return p.then(function () { return upload(f); }); }, Promise.resolve()).then(images); }); }
    view().querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Ta bort bilden?')) return; sb.from('site_items').delete().eq('id', b.dataset.del).then(function () { st.data.items = st.data.items.filter(function (x) { return x.id !== b.dataset.del; }); images(); }); }); });
  }

  // ---------- leads: inbox ----------
  function leads() {
    var L = st.data.leads, cur = L.filter(function (l) { return l.id === st.lead; })[0] || L[0];
    view().innerHTML = '<div class="head"><h1>Förfrågningar</h1><span class="mut">Allt som skickas via formulären på hemsidan.</span><button class="btn btn--ghost btn--small" id="csv"' + (L.length ? '' : ' disabled') + '>Ladda ner som Excel (CSV)</button></div>' +
      (L.length ? '<div class="inbox"><div class="inbox__list">' + L.map(function (l) { return '<button class="lead' + (l.status === 'new' ? ' lead--new' : '') + '" data-id="' + l.id + '"' + (cur && cur.id === l.id ? ' aria-current="true"' : '') + '><b>' + esc(l.name || 'Okänd') + '</b><span>' + esc(l.service ? l.service + ' – ' : '') + esc(l.message || '') + '</span><small>' + when(l.created_at) + '</small></button>'; }).join('') + '</div><div class="inbox__read" id="lr"></div></div>' : '<div class="card empty">Inga förfrågningar än. De dyker upp här så fort någon fyller i formuläret på hemsidan.</div>');
    view().querySelectorAll('.lead').forEach(function (b) { b.addEventListener('click', function () { st.lead = b.dataset.id; leads(); }); });
    on('#csv', 'click', function () { var rows = [['Datum', 'Namn', 'E-post', 'Telefon', 'Tjänst', 'Meddelande', 'Status']].concat(L.map(function (l) { return [when(l.created_at), l.name, l.email, l.phone, l.service, l.message, LST[l.status]]; }));
      var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'forfragningar.csv'; a.click(); });
    if (!cur) return;
    if (cur.status === 'new' && !DEMO) { /* opening does not change the status; the customer decides */ }
    var subject = 'Ang. din förfrågan' + (cur.service ? ' om ' + cur.service.toLowerCase() : '');
    $('#lr').innerHTML = '<div class="head" style="margin:0 0 6px"><h1 style="font-size:22px">' + esc(cur.name || 'Okänd') + '</h1><span class="st">' + LST[cur.status] + '</span></div>' +
      '<p class="mut" style="margin:0 0 14px">' + when(cur.created_at) + (cur.page ? ' · från ' + (cur.page === '/' ? 'startsidan' : esc(cur.page)) : '') + '</p>' + (cur.service ? '<p><b>Gäller:</b> ' + esc(cur.service) + '</p>' : '') +
      '<p style="white-space:pre-wrap">' + esc(cur.message || '') + '</p><p>' + (cur.email ? '<a href="mailto:' + esc(cur.email) + '">' + esc(cur.email) + '</a>' : '') + (cur.phone ? ' · <a href="tel:' + esc(cur.phone.replace(/\s/g, '')) + '">' + esc(cur.phone) + '</a>' : '') + '</p>' +
      '<div class="g2" style="margin-top:16px"><div><label for="ls">Status</label><select id="ls">' + Object.keys(LST).map(function (k) { return '<option value="' + k + '"' + (k === cur.status ? ' selected' : '') + '>' + LST[k] + '</option>'; }).join('') + '</select></div><div><label>&nbsp;</label>' +
      (cur.email ? '<a class="btn" style="width:100%" id="lreply" href="mailto:' + esc(cur.email) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent('Hej ' + (cur.name || '').split(' ')[0] + '!\n\nTack för din förfrågan.\n\n') + '">Svara via mejl</a>' : (cur.phone ? '<a class="btn" style="width:100%" href="tel:' + esc(cur.phone.replace(/\s/g, '')) + '">Ring</a>' : '')) + '</div></div>' +
      '<label for="ln">Anteckning (syns bara här)</label><textarea id="ln">' + esc(cur.note || '') + '</textarea><button class="btn btn--ghost btn--small" id="lsave" style="margin-top:8px">Spara</button>';
    var save = function (patch, msg) { return sb.from('site_leads').update(patch).eq('id', cur.id).then(function () { Object.assign(cur, patch); toast(msg); }); };
    on('#ls', 'change', function (e) { save({ status: e.target.value }, 'Status ändrad').then(leads); });
    on('#lsave', 'click', function () { save({ note: $('#ln').value }, 'Anteckningen sparad'); });
    on('#lreply', 'click', function () { if (cur.status === 'new') save({ status: 'answered' }, 'Markerad som besvarad').then(leads); });
  }

  // ---------- lists: projects, services, news, reviews ----------
  function list(v, editId) {
    var kind = KIND[v], items = st.data.items.filter(function (i) { return i.kind === kind; }), title = (MODULES.filter(function (m) { return m[0] === v; })[0] || [])[1];
    var editing = editId === 'new' ? { data: {}, published: true } : items.filter(function (i) { return i.id === editId; })[0];
    view().innerHTML = '<div class="head"><h1>' + title + '</h1>' + (editor() ? '<button class="btn" id="add">+ Lägg till</button>' : '') + '</div>' +
      (editing ? form(kind, editing) : '') +
      (items.length ? '<div class="items">' + items.map(function (i, n) { var d = i.data || {};
        return '<div class="item' + (i.published ? '' : ' item--hidden') + '">' + (d.image ? '<img src="' + esc(d.image) + '" alt="">' : '<span class="ph"></span>') +
          '<div><b>' + esc(d.title || d.name || '(utan namn)') + (i.published ? '' : ' <span class="st">Dold</span>') + '</b><span>' + esc([d.place, d.price, d.stars ? '★'.repeat(+d.stars || 0) : '', (d.text || '').slice(0, 80)].filter(Boolean).join(' · ')) + '</span></div>' +
          (editor() ? '<div class="item__acts"><button title="Flytta upp" data-up="' + n + '"' + (n ? '' : ' disabled') + '>↑</button><button title="Ändra" data-ed="' + i.id + '">✎</button><button title="' + (i.published ? 'Dölj' : 'Visa') + '" data-pub="' + i.id + '">' + (i.published ? '◉' : '○') + '</button><button title="Ta bort" data-del="' + i.id + '">✕</button></div>' : '') + '</div>'; }).join('') + '</div>'
        : (editing ? '' : '<div class="card empty">Inget här än. Klicka "Lägg till".</div>'));
    on('#add', 'click', function () { list(v, 'new'); });
    view().querySelectorAll('[data-ed]').forEach(function (b) { b.addEventListener('click', function () { list(v, b.dataset.ed); }); });
    view().querySelectorAll('[data-pub]').forEach(function (b) { b.addEventListener('click', function () { var it = items.filter(function (i) { return i.id === b.dataset.pub; })[0]; sb.from('site_items').update({ published: !it.published }).eq('id', it.id).then(function () { it.published = !it.published; toast(it.published ? 'Visas på hemsidan' : 'Dold på hemsidan'); list(v); }); }); });
    view().querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (!confirm('Ta bort?')) return; sb.from('site_items').delete().eq('id', b.dataset.del).then(function () { st.data.items = st.data.items.filter(function (x) { return x.id !== b.dataset.del; }); list(v); }); }); });
    view().querySelectorAll('[data-up]').forEach(function (b) { b.addEventListener('click', function () { var n = +b.dataset.up, a = items[n - 1], c = items[n]; if (!a) return;
      items.forEach(function (it, i) { it.sort = i; }); a.sort = n; c.sort = n - 1;
      Promise.all([sb.from('site_items').update({ sort: a.sort }).eq('id', a.id), sb.from('site_items').update({ sort: c.sort }).eq('id', c.id)]).then(function () { st.data.items.sort(function (x, y) { return x.sort - y.sort; }); list(v); }); }); });
    var f = $('#if'); if (!f) return;
    f.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { pickFor(b, f); }); });
    on('#ic', 'click', function () { list(v); });
    f.addEventListener('submit', function (e) { e.preventDefault(); var data = Object.assign({}, editing.data);
      FIELDS[kind].forEach(function (x) { var el = f.querySelector('[name="' + x[0] + '"]'); if (el) data[x[0]] = el.value.trim(); });
      if (!(data.title || data.name)) return toast('Fyll i ' + FIELDS[kind][0][1].toLowerCase() + '.');
      var p = editing.id ? sb.from('site_items').update({ data: data }).eq('id', editing.id).then(function () { editing.data = data; })
        : sb.from('site_items').insert({ site_id: st.site.id, kind: kind, data: data, sort: -1, published: true }).select().then(function (r) { (r.data || []).forEach(function (x) { st.data.items.unshift(x); }); });
      p.then(function () { toast('Sparat – syns på hemsidan'); list(v); }); });
  }
  function form(kind, it) {
    var d = it.data || {};
    return '<form class="card" id="if" style="margin-bottom:14px"><h2>' + (it.id ? 'Ändra' : 'Lägg till') + '</h2><div class="form">' + FIELDS[kind].map(function (x) {
      if (x[2] === 'img') return '<div class="full"><label>' + x[1] + '</label><input type="hidden" name="' + x[0] + '" value="' + esc(d[x[0]] || '') + '"><div style="display:flex;gap:10px;align-items:center">' + (d[x[0]] ? '<img src="' + esc(d[x[0]]) + '" alt="" style="width:90px;height:60px;object-fit:cover;border-radius:8px">' : '') + '<button type="button" class="btn btn--ghost btn--small" data-pick="' + x[0] + '">Välj bild</button></div></div>';
      return '<div' + (x[2] ? ' class="full"' : '') + '><label>' + x[1] + '</label>' + (x[2] ? '<textarea name="' + x[0] + '">' + esc(d[x[0]] || '') + '</textarea>' : '<input name="' + x[0] + '" value="' + esc(d[x[0]] || '') + '">') + '</div>'; }).join('') +
      '</div><p style="display:flex;gap:8px;margin:16px 0 0"><button class="btn">Spara</button><button type="button" class="btn btn--ghost" id="ic">Avbryt</button></p></form>';
  }
  function pickFor(btn, f) {
    var imgs = st.data.items.filter(function (i) { return i.kind === 'image'; }), m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div><div class="head"><h1 style="font-size:22px">Välj bild</h1><button class="btn btn--ghost btn--small" data-x>Stäng</button></div><div class="gallery"><label class="drop">+ Ladda upp<input type="file" accept="image/*" hidden></label>' + imgs.map(function (i) { return '<div class="pic pic--pick" data-u="' + esc(i.data.url) + '"><img src="' + esc(i.data.url) + '" alt=""></div>'; }).join('') + '</div></div>';
    document.body.appendChild(m);
    var set = function (u) { f.querySelector('[name="' + btn.dataset.pick + '"]').value = u; var prev = btn.previousElementSibling; if (prev && prev.tagName === 'IMG') prev.src = u; else btn.insertAdjacentHTML('beforebegin', '<img src="' + esc(u) + '" alt="" style="width:90px;height:60px;object-fit:cover;border-radius:8px">'); m.remove(); };
    m.querySelector('[data-x]').addEventListener('click', function () { m.remove(); });
    m.querySelectorAll('[data-u]').forEach(function (p) { p.addEventListener('click', function () { set(p.dataset.u); }); });
    m.querySelector('input').addEventListener('change', function (e) { upload(e.target.files[0]).then(function (u) { if (u) set(u); }); });
  }

  // ---------- bookings ----------
  function bookings() {
    var B = st.data.bookings, up = B.filter(function (b) { return b.status !== 'cancelled' && new Date(b.starts_at) >= new Date(Date.now() - 864e5); });
    view().innerHTML = '<div class="head"><h1>Bokningar</h1>' + (editor() ? '<button class="btn" id="badd">+ Ny bokning</button>' : '') + '</div><div id="bf"></div>' +
      (up.length ? '<div class="items">' + up.map(function (b) { return '<div class="item"><span class="ph" style="display:grid;place-items:center;font-weight:800">' + new Date(b.starts_at).getDate() + '</span><div><b>' + when(b.starts_at) + ' · ' + esc(b.name || '') + '</b><span>' + esc([b.phone, b.email, b.note].filter(Boolean).join(' · ')) + '</span></div>' +
        (editor() ? '<div class="item__acts"><button title="Klar" data-done="' + b.id + '">✓</button><button title="Avboka" data-cancel="' + b.id + '">✕</button></div>' : '') + '</div>'; }).join('') + '</div>' : '<div class="card empty">Inga kommande bokningar.</div>');
    on('#badd', 'click', function () { $('#bf').innerHTML = '<form class="card" id="bform" style="margin-bottom:14px"><div class="form"><div><label>Datum och tid</label><input type="datetime-local" name="at" required></div><div><label>Namn</label><input name="name"></div><div><label>Telefon</label><input name="phone"></div><div><label>E-post</label><input name="email"></div><div class="full"><label>Anteckning</label><input name="note"></div></div><p style="margin:14px 0 0"><button class="btn">Spara</button></p></form>';
      on('#bform', 'submit', function (e) { e.preventDefault(); var f = e.target; if (!f.at.value) return;
        sb.from('site_bookings').insert({ site_id: st.site.id, starts_at: new Date(f.at.value).toISOString(), name: f.name.value, phone: f.phone.value, email: f.email.value, note: f.note.value }).select().then(function (r) { (r.data || []).forEach(function (x) { B.push(x); }); B.sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); }); toast('Bokningen är sparad'); bookings(); }); }); });
    view().querySelectorAll('[data-done],[data-cancel]').forEach(function (b) { b.addEventListener('click', function () { var id = b.dataset.done || b.dataset.cancel, s = b.dataset.done ? 'done' : 'cancelled';
      sb.from('site_bookings').update({ status: s }).eq('id', id).then(function () { B.forEach(function (x) { if (x.id === id) x.status = s; }); bookings(); }); }); });
  }

  // ---------- settings ----------
  function settings() {
    var s = st.site.settings || {}, t = st.site.theme || {}, ro = editor() ? '' : ' readonly';
    view().innerHTML = '<div class="head"><h1>Inställningar</h1></div><form id="sf"><div class="g2"><div class="card"><h2>Kontaktuppgifter på hemsidan</h2>' +
      '<label>Telefon</label><input name="phone" value="' + esc(s.phone || '') + '"' + ro + '><label>E-post</label><input name="email" value="' + esc(s.email || '') + '"' + ro + '><label>Adress</label><input name="address" value="' + esc(s.address || '') + '"' + ro + '><label>Öppettider</label><input name="hours" value="' + esc(s.hours || '') + '"' + ro + '>' +
      '<label>Förfrågningar mejlas till</label><input name="lead_email" type="email" value="' + esc(s.lead_email || '') + '"' + ro + '></div>' +
      '<div class="card"><h2>Färger i adminpanelen</h2><p class="mut" style="margin-top:0">Hämtas från er hemsida så att panelen känns som er egen.</p><div class="g2"><div><label>Huvudfärg</label><input type="color" name="primary" value="' + esc(t.primary || '#1d3b2a') + '"' + ro + '></div><div><label>Accentfärg</label><input type="color" name="accent" value="' + esc(t.accent || '#8fd3a6') + '"' + ro + '></div></div>' +
      (editor() ? '<button type="button" class="btn btn--ghost btn--small" id="tget" style="margin-top:12px">Hämta färger från ' + esc(st.site.domain || 'hemsidan') + '</button>' : '') +
      '<h2 style="margin-top:22px">Förhandsvisning</h2><label>Adress till sidan som visas under Sidor och texter</label><input name="preview_url" placeholder="https://' + esc(st.site.domain || 'dittforetag.se') + '/" value="' + esc(s.preview_url || '') + '"' + ro + '></div></div>' +
      (editor() ? '<p style="margin:16px 0 0"><button class="btn">Spara</button></p>' : '') + '</form>' +
      '<div class="card" style="margin-top:14px"><h2>Koppla till kundportalen och /admin</h2><p class="mut" style="margin-top:0">Er hemsida visar adminpanelen på <b>' + esc(st.site.domain || 'dittforetag.se') + '/admin</b>. I Elevate Studios kundportal når ni samma panel under Hemsidans admin – samma inloggning.</p></div>';
    var f = $('#sf');
    f.querySelectorAll('input[type=color]').forEach(function (c) { c.addEventListener('input', function () { theme({ primary: f.primary.value, accent: f.accent.value }); }); });
    on('#tget', 'click', function () {
      if (!st.site.domain) return toast('Lägg in hemsidans adress först.');
      if (DEMO) { f.primary.value = '#1f4d36'; f.accent.value = '#e9b949'; theme({ primary: '#1f4d36', accent: '#e9b949' }); return toast('Färger hämtade (demo)'); }
      sb.auth.getSession().then(function (r) { return fetch(API + '/api/site/theme?url=' + encodeURIComponent('https://' + st.site.domain + '/'), { headers: { Authorization: 'Bearer ' + (r.data.session || {}).access_token } }); })
        .then(function (r) { return r.json(); }).then(function (t2) { if (t2.error) return toast(t2.error); f.primary.value = t2.primary; f.accent.value = t2.accent; theme(t2); toast('Färger hämtade – klicka Spara'); });
    });
    f.addEventListener('submit', function (e) { e.preventDefault(); if (!editor()) return;
      var ns = Object.assign({}, s, { phone: f.phone.value.trim(), email: f.email.value.trim(), address: f.address.value.trim(), hours: f.hours.value.trim(), lead_email: f.lead_email.value.trim(), preview_url: f.preview_url.value.trim() }), nt = Object.assign({}, t, { primary: f.primary.value, accent: f.accent.value });
      sb.from('sites').update({ settings: ns, theme: nt }).eq('id', st.site.id).then(function (r) { if (r.error) return toast('Kunde inte spara: ' + r.error.message); st.site.settings = ns; st.site.theme = nt; theme(nt); toast('Sparat'); }); });
  }

  // ---------- demo data (clearly marked, nothing is saved) ----------
  function demoClient() {
    var ago = function (h) { return new Date(Date.now() - h * 36e5).toISOString(); }, img = function (n) { return 'img/' + n; };
    var db = {
      sites: [{ id: 's1', slug: 'demo', name: 'Lindvik Bygg', domain: 'lindvikbygg.se', company_id: 'c1', theme: { primary: '#1f4d36', accent: '#e9b949' }, modules: ['sidor', 'forfragningar', 'projekt', 'bilder', 'tjanster', 'nyheter', 'bokningar', 'recensioner', 'installningar'],
        settings: { phone: '0300-12 34 56', email: 'info@lindvikbygg.se', address: 'Storgatan 1, Kungsbacka', hours: 'Mån–fre 7–16', lead_email: 'info@lindvikbygg.se' } }],
      company_members: [{ company_id: 'c1', user_id: 'u1', role: 'owner' }], user_roles: [],
      site_content: [{ site_id: 's1', key: 'hero.title', draft: 'Vi bygger det Västsverige växer i', published: 'Vi bygger det Västsverige växer i' }],
      site_items: [
        { id: 'i1', site_id: 's1', kind: 'project', sort: 0, published: true, data: { title: 'Villa Särö', place: 'Kungsbacka', text: 'Nybyggd villa i trä, 180 kvm.', image: img('p5505119.jpg') } },
        { id: 'i2', site_id: 's1', kind: 'project', sort: 1, published: true, data: { title: 'Skola Onsala', place: 'Onsala', text: 'Tillbyggnad med fyra klassrum.', image: img('p8961064.jpg') } },
        { id: 'i3', site_id: 's1', kind: 'service', sort: 0, published: true, data: { title: 'Nybygge', price: 'Offert', text: 'Hus och fritidshus från grund till nyckel.' } },
        { id: 'i4', site_id: 's1', kind: 'service', sort: 1, published: true, data: { title: 'Renovering', price: 'Från 450 kr/tim', text: 'Badrum, kök och fasad.' } },
        { id: 'i5', site_id: 's1', kind: 'review', sort: 0, published: true, data: { name: 'Johan B.', stars: '5', text: 'Höll tiden och priset. Rekommenderas!' } },
        { id: 'm1', site_id: 's1', kind: 'image', sort: 0, published: true, data: { url: img('hero.jpg'), name: 'hero.jpg' } },
        { id: 'm2', site_id: 's1', kind: 'image', sort: 0, published: true, data: { url: img('p773843.jpg'), name: 'bro.jpg' } },
        { id: 'm3', site_id: 's1', kind: 'image', sort: 0, published: true, data: { url: img('p5505119.jpg'), name: 'bygge.jpg' } }],
      site_leads: [
        { id: 'l1', site_id: 's1', created_at: ago(2), name: 'Karin Lund', email: 'karin@example.se', phone: '070-111 22 33', service: 'Renovering', message: 'Vi vill renovera badrum och tvättstuga, ca 8 kvm. Kan ni komma och titta?', page: '/', status: 'new' },
        { id: 'l2', site_id: 's1', created_at: ago(26), name: 'Erik Sandberg', email: 'erik@example.se', service: 'Tillbyggnad', message: 'Tillbyggnad 25 kvm på villa.', page: '/tjanster', status: 'new' },
        { id: 'l3', site_id: 's1', created_at: ago(80), name: 'Sara Ek', phone: '073-555 00 11', service: 'Nybygge', message: 'Nytt fritidshus i Bohuslän.', page: '/', status: 'quoted', note: 'Offert skickad 2/11' }],
      site_bookings: [{ id: 'b1', site_id: 's1', starts_at: new Date(Date.now() + 26 * 36e5).toISOString(), name: 'Karin Lund', phone: '070-111 22 33', note: 'Platsbesök badrum', status: 'booked' }]
    };
    var n = 0;
    var q = function (table) {
      var rows = (db[table] || []).slice(), mode = 'select', patch = null, api;
      var match = []; var apply = function () { return (db[table] || []).filter(function (r) { return match.every(function (m) { return r[m[0]] === undefined || r[m[0]] === m[1]; }); }); };
      api = {
        select: function () { return api; }, order: function () { return api; }, limit: function () { return api; },
        eq: function (k, v) { match.push([k, v]); rows = rows.filter(function (r) { return r[k] === undefined || r[k] === v; }); return api; },
        insert: function (row) { mode = 'insert'; rows = [].concat(row).map(function (r) { return Object.assign({ id: 'n' + (++n), created_at: new Date().toISOString() }, r); }); rows.forEach(function (r) { (db[table] = db[table] || []).unshift(r); }); return api; },
        upsert: function (row) { mode = 'upsert'; var hit = (db[table] || []).filter(function (r) { return r.site_id === row.site_id && r.key === row.key; })[0]; if (hit) Object.assign(hit, row); else (db[table] = db[table] || []).push(Object.assign({}, row)); return api; },
        update: function (p) { mode = 'update'; patch = p; return api; },
        delete: function () { mode = 'delete'; return api; },
        then: function (ok) {
          if (mode === 'update') apply().forEach(function (r) { Object.assign(r, patch); });
          if (mode === 'delete') { var del = apply(); db[table] = (db[table] || []).filter(function (r) { return del.indexOf(r) < 0; }); }
          return Promise.resolve({ data: rows, error: null }).then(ok);
        }
      };
      return api;
    };
    var user = { id: 'u1', email: 'anna@lindvikbygg.se', user_metadata: { full_name: 'Anna Lindvik' } }, signed = true;
    return { from: q,
      storage: { from: function () { return { upload: function (path) { return Promise.resolve({ data: { path: path }, error: null }); }, getPublicUrl: function () { return { data: { publicUrl: 'img/p773843.jpg' } }; } }; } },
      auth: { getUser: function () { return Promise.resolve({ data: { user: signed ? user : null } }); }, getSession: function () { return Promise.resolve({ data: { session: { access_token: 'demo' } } }); },
        signInWithPassword: function () { signed = true; return Promise.resolve({}); }, signOut: function () { signed = false; return Promise.resolve({}); }, resetPasswordForEmail: function () { return Promise.resolve({}); } } };
  }

  start();
})();
