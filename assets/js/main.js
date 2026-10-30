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
  // On desktop the menu drops down from the bottom edge of the header, whatever its current height
  function placeDrawer() {
    body.style.setProperty('--drawer-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
  }
  window.addEventListener('scroll', function () { if (burgerMenu.classList.contains('hamburgermenu--visible')) placeDrawer(); }, { passive: true });
  window.addEventListener('resize', placeDrawer);
  function setBurger(open, byMouse) {
    if (open === burgerMenu.classList.contains('hamburgermenu--visible')) return;
    burgerMenu.classList.toggle('hamburgermenu--visible', open);
    burgerMenu.setAttribute('aria-hidden', String(!open));
    headerBurger.setAttribute('aria-expanded', String(open));
    body.classList.toggle('drawer-open', open);
    if (open) {
      placeDrawer();
      backdrop.hidden = false;
      requestAnimationFrame(function () { backdrop.classList.add('is-visible'); });
      if (window.matchMedia('(min-width: 993px)').matches) { var first = burgerMenu.querySelector('.drawer__main a'); if (first && !byMouse) first.focus(); } else if (!byMouse) { drawerClose.focus(); }
    } else {
      backdrop.classList.remove('is-visible');
      setTimeout(function () { backdrop.hidden = true; }, 300);
      headerBurger.focus();
    }
  }
  burgerButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      setMegamenu(false);
      setBurger(!burgerMenu.classList.contains('hamburgermenu--visible'), e.detail > 0);
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

  // Forms. With the mail function live (data-mail), leads and newsletter sign-ups go there and
  // every mail is sent from info@elevatestudio.nu. Otherwise FormSubmit notifies info@ and the
  // lead is saved straight in the database for the admin.
  var send = function (url, body, key) {
    var h = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (key) { h.apikey = key; h.Authorization = 'Bearer ' + key; }
    return fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (res) {
      return res.text().then(function (t) {
        var b = {}; try { b = JSON.parse(t); } catch (e) { /* empty body */ }
        if (!res.ok || String(b.success) === 'false') throw new Error(b.message || b.error || 'fel');
        return b;
      });
    });
  };
  var cut = function (v, n) { v = (v || '').trim(); return v ? v.slice(0, n) : null; };
  document.querySelectorAll('.js-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var button = form.querySelector('[type="submit"]');
      var data = {};
      new FormData(form).forEach(function (value, key) { data[key] = value; });
      var isBot = !!data._honey;
      delete data._honey;
      var show = function (text, ok) {
        if (!status) return;
        status.hidden = false;
        status.textContent = text;
        status.classList.toggle('form-status--error', !ok);
      };
      button.disabled = true;
      show('Skickar …', true);
      var news = form.classList.contains('site-footer__newsletter');
      var done = news ? 'Tack! Du står nu på listan.' : 'Tack! Vi återkommer så fort vi kan.';
      if (isBot) { form.reset(); show(done, true); button.disabled = false; return; }
      var isLead = 'lead' in form.dataset && data.email;
      var lead = isLead && { name: cut(data.namn, 100) || cut(data.email, 100), email: cut(data.email, 255), phone: cut(data.telefon, 40), company: cut(data.foretag, 150), service_type: cut(data.tjanst, 100), message: cut(data.meddelande, 2000) };
      var viaFormSubmit = function () {
        // The lead still lands in the admin (best effort, never blocks the form)
        if (lead && form.dataset.db) {
          send(form.dataset.db + '/rest/v1/quote_requests', Object.assign({ meeting_type: 'quote' }, lead), form.dataset.key).catch(function () {});
        }
        data._subject = form.dataset.subject || 'Meddelande från hemsidan';
        data._template = 'table';
        data.sida = location.href;
        return send(form.action, data);
      };
      var go = form.dataset.mail && (news || lead)
        ? send(form.dataset.mail, news ? { action: 'subscribe', email: data.email } : Object.assign({ action: 'lead' }, lead), form.dataset.key).catch(viaFormSubmit)
        : viaFormSubmit();
      var timer = setTimeout(function () { show('Det tar längre tid än vanligt … mejla oss gärna på info@elevatestudio.nu om inget händer.', false); }, 12000);
      go.then(function () { form.reset(); show(done, true); })
        .catch(function () { show('Något gick fel. Mejla oss gärna direkt på info@elevatestudio.nu.', false); })
        .then(function () { clearTimeout(timer); button.disabled = false; });
    });
  });

  // Films in the laptop mockups: play while on screen, rest when scrolled away
  var films = document.querySelectorAll('.screen__video');
  if (films.length && 'IntersectionObserver' in window) {
    var filmWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else { v.pause(); }
      });
    }, { threshold: .15 });
    films.forEach(function (v) { filmWatch.observe(v); });
  }

  // Before/after: drag the handle (or use the range input with keyboard) to compare
  document.querySelectorAll('[data-compare]').forEach(function (box) {
    var range = box.querySelector('.compare__range');
    var set = function (v) { v = Math.max(0, Math.min(100, v)); box.style.setProperty('--pos', v + '%'); range.value = v; };
    var fromPointer = function (e) { var r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    var dragging = false;
    box.addEventListener('pointerdown', function (e) { dragging = true; e.preventDefault(); fromPointer(e); });
    window.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) { window.addEventListener(t, function () { dragging = false; }); });
    range.addEventListener('input', function () { set(Number(range.value)); });
    set(Number(range.value));
  });

  // Reviews: arrows step one review at a time (only rendered when there is more than one)
  document.querySelectorAll('[data-reviews]').forEach(function (box) {
    var track = box.querySelector('.reviews__track');
    var prev = box.querySelector('.js-review-prev'), next = box.querySelector('.js-review-next');
    if (!prev || !next) return;
    var counter = box.querySelector('.js-review-n');
    var sync = function () {
      prev.disabled = track.scrollLeft < 10;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 10;
      if (counter) counter.textContent = Math.round(track.scrollLeft / track.clientWidth) + 1;
    };
    prev.addEventListener('click', function () { track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: track.clientWidth, behavior: 'smooth' }); });
    track.addEventListener('scroll', sync, { passive: true });
    sync();
  });

  // Reviews animate: the card rises in on scroll, and each review slides in when you step to it
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    document.querySelectorAll('[data-reviews]').forEach(function (box) {
      var track = box.querySelector('.reviews__track');
      if (!track) return;
      box.classList.add('reviews--anim');
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { box.classList.add('is-shown'); obs.disconnect(); }
      }, { rootMargin: '0px 0px -80px 0px' }).observe(box);
      var cardObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('is-in', e.intersectionRatio > 0.55); });
      }, { root: track, threshold: [0, 0.55, 1] });
      track.querySelectorAll('.review__card').forEach(function (c) { cardObs.observe(c); });
    });
  }
})();

/* Hemsidor vi byggt: a card opens the site in a frame on top of the page */
(function () {
  var box = document.getElementById('site-preview');
  if (!box) return;
  var frame = document.getElementById('sp-frame'), ifr = document.getElementById('sp-iframe'), fb = document.getElementById('sp-fallback'), timer;
  function open(url, name) {
    document.getElementById('sp-name').textContent = name;
    var u = document.getElementById('sp-url'); u.textContent = url.replace(/^https?:\/\//, '').replace(/\/$/, ''); u.href = url;
    document.getElementById('sp-open').href = url;
    fb.hidden = true; ifr.src = url; box.hidden = false; document.body.classList.add('has-preview');
    clearTimeout(timer); timer = setTimeout(function () { try { if (!ifr.contentWindow || ifr.contentWindow.length === undefined) return; } catch (e) { /* cross-origin: fine, it loaded */ } }, 4000);
    ifr.onerror = function () { fb.hidden = false; };
  }
  function close() { box.hidden = true; ifr.src = 'about:blank'; document.body.classList.remove('has-preview'); }
  document.querySelectorAll('[data-site]').forEach(function (a) {
    a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); open(a.dataset.site, a.dataset.name); });
  });
  document.getElementById('sp-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  box.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      box.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      frame.classList.toggle('is-mob', b.dataset.view === 'mob');
    });
  });
})();

/* Start page: the booking calendar as in the mail, five days with every time; a free time books on /boka */
(function () {
  var box = document.getElementById('book-home-cols');
  if (!box) return;
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  fetch(document.getElementById('book-home-times').dataset.info).then(function (r) { return r.json(); }).then(function (d) {
    var days = (d.days || []).slice(0, 5);
    if (!days.length) { box.innerHTML = '<p class="book-home__empty">Inga tider just nu – <a href="kontakt">hör av dig</a> så hittar vi en.</p>'; return; }
    box.innerHTML = days.map(function (day) {
      return '<div class="book-home__col' + (day.free ? '' : ' is-full') + '"><h3>' + cap(day.wd) + '<b>' + day.d + ' ' + day.mon.toLowerCase() + '</b><em>' + (day.free ? day.free + ' lediga' : 'fullt') + '</em></h3><div class="book-home__stack">' +
        day.slots.map(function (s) {
          var time = new Date(s.t).toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' });
          return s.free ? '<a class="book-home__slot" href="boka?v=' + s.t + '">' + time + '</a>' : '<span class="book-home__slot is-busy" aria-label="' + time + ' är upptaget">' + time + '</span>';
        }).join('') + '</div></div>';
    }).join('');
  }).catch(function () { box.innerHTML = '<p class="book-home__empty"><a href="boka">Se lediga tider</a></p>'; });
})();
