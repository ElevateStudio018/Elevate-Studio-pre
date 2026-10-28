// Language switch (Svenska / English in the menu). The site is written in Swedish; when a visitor
// picks English, the English texts from i18n-en.js replace the Swedish ones in the page, including
// text that scripts add later (chat, forms, the site test). The choice is remembered between pages.
(function () {
  var html = document.documentElement;
  var me = document.currentScript;
  var KEY = 'elevate-lang';
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { if (v === 'en') localStorage.setItem(KEY, 'en'); else localStorage.removeItem(KEY); } catch (e) { /* private mode */ } }
  };
  var param = new URLSearchParams(location.search).get('lang');
  if (param === 'en' || param === 'sv') store.set(param);
  var lang = (param || store.get()) === 'en' ? 'en' : 'sv';
  var dict = null, patterns = [];

  function t(s) {
    if (!dict || s == null) return s;
    var key = String(s).replace(/\s+/g, ' ').trim();
    if (!key) return s;
    var hit = dict[key];
    if (hit === undefined) {
      for (var i = 0; i < patterns.length; i++) {
        if (patterns[i][0].test(key)) { hit = key.replace(patterns[i][0], patterns[i][1]); break; }
      }
    }
    if (hit === undefined && / →$/.test(key) && dict[key.slice(0, -2)] !== undefined) hit = dict[key.slice(0, -2)] + ' →';
    if (hit === undefined) return s;
    var m = /^(\s*)[\s\S]*?(\s*)$/.exec(String(s));
    return m[1] + hit + m[2];
  }
  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  function translateTree(node) {
    if (node.nodeType === 3) {
      var p = node.parentNode;
      if (p && /^(SCRIPT|STYLE)$/.test(p.nodeName)) return;
      var v = t(node.nodeValue); if (v !== node.nodeValue) node.nodeValue = v;
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|svg)$/i.test(node.nodeName) || node.hasAttribute('data-noi18n')) return;
    ATTRS.forEach(function (a) { var v = node.getAttribute(a); if (v) { var n = t(v); if (n !== v) node.setAttribute(a, n); } });
    for (var c = node.firstChild; c; c = c.nextSibling) translateTree(c);
  }
  function markMenu() {
    var tmpl = document.querySelector('.drawer__lang svg');
    document.querySelectorAll('.drawer__lang [data-lang]').forEach(function (a) {
      var on = a.dataset.lang === lang;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      var check = a.querySelector('svg');
      if (on && !check) {
        if (tmpl) a.insertBefore(tmpl.cloneNode(true), a.firstChild);
      } else if (!on && check) check.remove();
    });
  }
  function apply() {
    html.lang = 'en';
    document.title = t(document.title);
    var md = document.querySelector('meta[name="description"]'); if (md) md.content = t(md.content);
    translateTree(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'characterData') translateTree(m.target);
        else m.addedNodes.forEach(translateTree);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    html.classList.remove('i18n-pending');
  }

  window.ElevateLang = {
    lang: lang,
    t: t,
    set: function (l) { store.set(l); var u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString()); }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lang]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.lang !== lang) window.ElevateLang.set(a.dataset.lang);
  });
  document.addEventListener('DOMContentLoaded', markMenu);
  if (lang !== 'en') return;

  // Hide the Swedish text until the English is in place (at most a moment).
  html.classList.add('i18n-pending');
  var style = document.createElement('style');
  style.textContent = 'html.i18n-pending body{visibility:hidden}';
  document.head.appendChild(style);
  setTimeout(function () { html.classList.remove('i18n-pending'); }, 2500);
  var ready = false, loaded = false;
  var go = function () { if (ready && loaded) apply(); };
  var s = document.createElement('script');
  s.src = (me && me.dataset.prefix || '') + 'assets/js/i18n-en.js?v=' + (me && me.dataset.v || '');
  s.onload = function () {
    var data = window.ELEVATE_EN || {};
    dict = data.t || {};
    patterns = (data.p || []).map(function (p) { return [new RegExp(p[0]), p[1]]; });
    loaded = true; go();
  };
  s.onerror = function () { html.classList.remove('i18n-pending'); };
  document.head.appendChild(s);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { ready = true; go(); });
  else { ready = true; go(); }
})();
