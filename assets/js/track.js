/* Anonymous visitor statistics for the admin: which pages are read, for how long, where visitors come
   from and what they do (form, booking, chat). No cookies: the visit id lives in sessionStorage and dies
   with the tab. The server stores country and city from the request, never the IP address. */
(function () {
  if (/bot|crawl|spider|headless|lighthouse|slurp|preview/i.test(navigator.userAgent) || location.pathname.indexOf('/admin') === 0) return;
  var sid;
  try { sid = sessionStorage.getItem('es.sid'); if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('es.sid', sid); } } catch (e) { sid = 'x' + Date.now().toString(36); }
  var started = Date.now(), maxScroll = 0, sent = false;
  var page = location.pathname + (location.search && /utm_|lang=/.test(location.search) ? '' : '');
  var q = new URLSearchParams(location.search);
  var base = { sid: sid, path: location.pathname, title: document.title, ref: document.referrer || '', utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_campaign: q.get('utm_campaign') || '',
    sw: screen.width, sh: screen.height, vw: innerWidth, vh: innerHeight, lang: navigator.language, tz: (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '' };
  function send(extra) {
    var body = JSON.stringify(Object.assign({}, base, extra || {}));
    try { if (navigator.sendBeacon) { navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' })); return; } } catch (e) { /* fall through */ }
    try { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }); } catch (e) { /* nothing to do */ }
  }
  send();
  var ticking = false;
  addEventListener('scroll', function () { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; var h = document.documentElement.scrollHeight - innerHeight; if (h > 0) maxScroll = Math.max(maxScroll, Math.min(100, Math.round((scrollY / h) * 100))); }); }, { passive: true });
  function leave() { if (sent) return; sent = true; send({ ev: 'leave', secs: Math.round((Date.now() - started) / 1000), scroll: maxScroll }); }
  addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });
  // What visitors do: forms sent, a time booked, the chat opened, a call or mail link tapped
  document.addEventListener('elevate:event', function (e) { send({ ev: e.detail && e.detail.name || 'event', label: e.detail && e.detail.label || '' }); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"], a[href$="/boka"], a[href="boka"], a[href$="/kontakt"], a[href="kontakt"]');
    if (!a) return;
    var h = a.getAttribute('href');
    send({ ev: /^tel:/.test(h) ? 'call' : /^mailto:/.test(h) ? 'mail' : /boka/.test(h) ? 'cta_boka' : 'cta_kontakt', label: (a.textContent || '').trim().slice(0, 60) });
  }, true);
  var ev = function (name, label) { document.dispatchEvent(new CustomEvent('elevate:event', { detail: { name: name, label: label || '' } })); };
  window.elevateTrack = ev;
})();
