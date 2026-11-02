/* Elevate site script: one small file that every customer website loads, whatever it is built with.
 *
 *   <script src="https://elevatestudio.nu/assets/js/elevate-site.js" data-site="lindvik" defer></script>
 *
 * - Texts:  <h1 data-es="hero.title">Default text</h1>        replaced by the published text from the admin
 * - Images: <img data-es="hero.image" src="default.jpg">       src replaced
 * - Lists:  <div data-es-list="project"><template>…{{title}}…{{image}}…</template></div>   one copy per item
 * - Info:   <span data-es-set="phone"></span>                  phone, email, address, hours
 * - Forms:  <form data-es-form>…name, email, phone, service, message…</form>   sent to the admin's inbox
 * - /admin on the customer's own domain opens the shared admin panel for that site.
 * - Inside the admin's preview (?es-edit) texts become clickable and editable, and changes go to the admin.
 * The page works without the script: the default texts in the HTML stay if the admin cannot be reached. */
(function () {
  var me = document.currentScript || document.querySelector('script[data-site]');
  if (!me) return;
  var SITE = me.getAttribute('data-site'), API = new URL(me.src).origin, ADMIN = API + '/kundadmin/?site=' + encodeURIComponent(SITE);
  // dittforetag.se/admin → the admin panel
  if (/^\/admin\/?$/.test(location.pathname)) { location.replace(ADMIN); return; }
  var EDIT = /[?&]es-edit\b/.test(location.search) && window.parent !== window;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function apply(d) {
    var c = d.content || {};
    document.querySelectorAll('[data-es]').forEach(function (el) {
      var v = c[el.getAttribute('data-es')]; if (v == null || v === '') return;
      if (el.tagName === 'IMG') el.src = typeof v === 'string' ? v : v.url; else el.textContent = typeof v === 'string' ? v : v.text || '';
    });
    document.querySelectorAll('[data-es-set]').forEach(function (el) {
      var v = (d.settings || {})[el.getAttribute('data-es-set')]; if (!v) return;
      el.textContent = v; if (el.tagName === 'A') el.href = (el.getAttribute('data-es-set') === 'phone' ? 'tel:' + v.replace(/\s/g, '') : 'mailto:' + v);
    });
    document.querySelectorAll('[data-es-list]').forEach(function (box) {
      var tpl = box.querySelector('template'), items = (d.lists || {})[box.getAttribute('data-es-list')]; if (!tpl || !items || !items.length) return;
      box.querySelectorAll('[data-es-item]').forEach(function (n) { n.remove(); });
      items.forEach(function (it) {
        var html = tpl.innerHTML.replace(/\{\{(\w+)\}\}/g, function (_, k) { return esc(it[k]); });
        var wrap = document.createElement('div'); wrap.innerHTML = html.trim();
        Array.prototype.forEach.call(wrap.children, function (n) { n.setAttribute('data-es-item', it.id || ''); box.appendChild(n); });
      });
    });
  }

  // forms → the admin's inbox
  function forms() {
    document.querySelectorAll('form[data-es-form]').forEach(function (f) {
      if (!f.querySelector('[name=website]')) { var h = document.createElement('input'); h.name = 'website'; h.tabIndex = -1; h.autocomplete = 'off'; h.setAttribute('aria-hidden', 'true'); h.style.cssText = 'position:absolute;left:-9999px'; f.appendChild(h); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = function (n) { var x = f.querySelector('[name=' + n + ']'); if (!x) return ''; if (x.type === 'radio') { var on = f.querySelector('[name=' + n + ']:checked'); return on ? on.value : ''; } return x.value; };
        var out = f.querySelector('[data-es-status]') || f.appendChild(Object.assign(document.createElement('p'), { className: 'es-status' }));
        out.setAttribute('role', 'status'); out.textContent = 'Skickar …';
        fetch(API + '/api/site/lead', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ site: SITE, name: v('name'), email: v('email'), phone: v('phone'), service: v('service'), message: v('message'), website: v('website'), page: location.pathname }) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (x) { if (x.ok) { f.reset(); out.textContent = f.getAttribute('data-es-thanks') || 'Tack! Vi hör av oss så snart vi kan.'; } else out.textContent = x.j.error || 'Något gick fel. Ring oss gärna istället.'; })
          .catch(function () { out.textContent = 'Kunde inte skicka. Kontrollera uppkopplingen eller ring oss.'; });
      });
    });
  }

  // edit mode inside the admin preview: click a text, type, the admin gets the change
  function editMode() {
    var css = document.createElement('style');
    css.textContent = '[data-es]{outline:2px dashed transparent;outline-offset:4px;border-radius:4px;cursor:text;transition:outline-color .2s}[data-es]:hover{outline-color:rgba(143,211,166,.9)}[data-es]:focus{outline-color:#2f7d4f;outline-style:solid}img[data-es]{cursor:pointer}';
    document.head.appendChild(css);
    document.querySelectorAll('[data-es]').forEach(function (el) {
      var key = el.getAttribute('data-es');
      if (el.tagName === 'IMG') { el.addEventListener('click', function (e) { e.preventDefault(); parent.postMessage({ es: 'image', key: key }, '*'); }); return; }
      el.contentEditable = 'true'; el.spellcheck = true;
      el.addEventListener('input', function () { parent.postMessage({ es: 'text', key: key, text: el.textContent }, '*'); });
      el.addEventListener('focus', function () { parent.postMessage({ es: 'focus', key: key }, '*'); });
    });
    document.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && !a.closest('[data-es]')) e.preventDefault(); }, true);
    window.addEventListener('message', function (e) {
      var m = e.data || {};
      if (m.es === 'data') { apply(m.data || {}); return; }
      if (m.es !== 'set') return;
      var el = document.querySelector('[data-es="' + String(m.key).replace(/"/g, '') + '"]'); if (!el) return;
      if (el.tagName === 'IMG') el.src = m.value; else if (document.activeElement !== el) el.textContent = m.value;
    });
    parent.postMessage({ es: 'ready', keys: Array.prototype.map.call(document.querySelectorAll('[data-es]'), function (el) { return { key: el.getAttribute('data-es'), img: el.tagName === 'IMG', text: el.tagName === 'IMG' ? el.src : el.textContent.trim() }; }) }, '*');
  }

  function start() {
    forms();
    if (EDIT) { editMode(); return; }   // the admin sends the draft texts itself
    fetch(API + '/api/site/content?site=' + encodeURIComponent(SITE)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) apply(d); }).catch(function () { /* keep the defaults */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
