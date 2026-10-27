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

  // Demo forms: nothing is sent, but the flow behaves like a real one
  document.querySelectorAll('.js-demo-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.demo-form-status');
      if (status) status.hidden = false;
      form.reset();
    });
  });

  // Cookie dialog: the choice is only remembered locally
  var dialog = document.getElementById('cookie-dialog');
  var stored = null;
  try { stored = localStorage.getItem('cookie-choice'); } catch (err) {}
  if (!stored) dialog.hidden = false;
  dialog.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      try { localStorage.setItem('cookie-choice', btn.dataset.choice); } catch (err) {}
      dialog.hidden = true;
    });
  });
})();
