(function () {
  var body = document.body;
  var header = document.getElementById('site-header');
  var megaLink = document.querySelector('.js-show-megamenu');
  var megamenu = document.getElementById('megamenu');
  var headerBurger = header.querySelector('.js-show-hamburger');
  var burgerButtons = document.querySelectorAll('.js-show-hamburger');
  var burgerMenu = document.getElementById('hamburgermenu');

  // Megamenu
  function setMegamenu(open) {
    megamenu.classList.toggle('megamenu--visible', open);
    megaLink.parentElement.classList.toggle('is-active', open);
    megaLink.setAttribute('aria-expanded', String(open));
    body.classList.toggle('main-overlay', open);
  }
  megaLink.addEventListener('click', function (e) {
    e.preventDefault();
    if (burgerMenu.classList.contains('hamburgermenu--visible')) setBurger(false);
    setMegamenu(!megamenu.classList.contains('megamenu--visible'));
  });
  document.addEventListener('click', function (e) {
    if (megamenu.classList.contains('megamenu--visible') && !header.contains(e.target)) setMegamenu(false);
  });

  // Menu drawer: slides in from the right over a dimmed page
  var backdrop = document.querySelector('.drawer-backdrop');
  var drawerClose = burgerMenu.querySelector('.drawer__close');
  function setBurger(open) {
    if (open === burgerMenu.classList.contains('hamburgermenu--visible')) return;
    burgerMenu.classList.toggle('hamburgermenu--visible', open);
    burgerMenu.setAttribute('aria-hidden', String(!open));
    headerBurger.setAttribute('aria-expanded', String(open));
    body.classList.toggle('drawer-open', open);
    if (open) {
      backdrop.hidden = false;
      requestAnimationFrame(function () { backdrop.classList.add('is-visible'); });
      if (window.matchMedia('(min-width: 993px)').matches) { var first = burgerMenu.querySelector('.drawer__main a'); if (first) first.focus(); } else { drawerClose.focus(); }
    } else {
      backdrop.classList.remove('is-visible');
      setTimeout(function () { backdrop.hidden = true; }, 300);
      headerBurger.focus();
    }
  }
  burgerButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setMegamenu(false);
      setBurger(!burgerMenu.classList.contains('hamburgermenu--visible'));
    });
  });
  document.querySelectorAll('.js-close-drawer').forEach(function (el) {
    el.addEventListener('click', function () { setBurger(false); });
  });
  document.querySelectorAll('.js-toggle-sub').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var open = link.parentElement.classList.toggle('is-open');
      link.setAttribute('aria-expanded', String(open));
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setMegamenu(false);
    setBurger(false);
  });

  // Shrink header on scroll
  function onScroll() { header.classList.toggle('site-header--scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Forms: sent to info@elevatestudio.nu through FormSubmit, with the result shown inline
  document.querySelectorAll('.js-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var button = form.querySelector('[type="submit"]');
      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      if (data._honey) return;
      delete data._honey;
      data._subject = form.dataset.subject || 'Meddelande från hemsidan';
      data._template = 'table';
      data.sida = location.href;
      var show = function (text, ok) {
        if (!status) return;
        status.hidden = false;
        status.textContent = text;
        status.classList.toggle('form-status--error', !ok);
      };
      button.disabled = true;
      show('Skickar …', true);
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
        .then(function (r) {
          if (!r.ok || String(r.body.success) === 'false') throw new Error(r.body.message || 'fel');
          form.reset();
          show(form.classList.contains('site-footer__newsletter') ? 'Tack! Du står nu på listan.' : 'Tack! Vi återkommer så fort vi kan.', true);
        })
        .catch(function () {
          show('Något gick fel. Mejla oss gärna direkt på info@elevatestudio.nu.', false);
        })
        .then(function () { button.disabled = false; });
    });
  });

  // Statistics: Google Analytics loads only after the visitor accepts, and only if an ID is configured
  var gaId = body.dataset.ga;
  var dialog = document.getElementById('cookie-dialog');
  function loadAnalytics() {
    if (!gaId || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { anonymize_ip: true });
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
    document.head.appendChild(tag);
  }
  var stored = null;
  try { stored = localStorage.getItem('cookie-choice'); } catch (err) {}
  if (gaId && stored === 'accept') loadAnalytics();
  if (gaId && !stored) dialog.hidden = false;
  dialog.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      try { localStorage.setItem('cookie-choice', btn.dataset.choice); } catch (err) {}
      dialog.hidden = true;
      if (btn.dataset.choice === 'accept') loadAnalytics();
    });
  });
  document.querySelectorAll('.js-cookie-settings').forEach(function (btn) {
    btn.addEventListener('click', function () { dialog.hidden = false; });
  });
})();
