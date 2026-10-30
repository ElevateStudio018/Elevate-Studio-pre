(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Process: the step indicator fills as you scroll and the matching polaroid lifts
  var stepsBox = document.querySelector('[data-steps]');
  if (stepsBox) {
    var dots = stepsBox.querySelectorAll('.steps__bar li');
    var cards = stepsBox.querySelectorAll('.polaroid');
    var updateSteps = function () {
      var rect = stepsBox.getBoundingClientRect();
      var start = window.innerHeight * 0.85, span = rect.height + window.innerHeight * 0.3;
      var p = reduced ? 1 : Math.min(1, Math.max(0, (start - rect.top) / span));
      var cur = Math.min(dots.length - 1, Math.floor(p * dots.length));
      stepsBox.style.setProperty('--progress', cur / (dots.length - 1));
      Array.prototype.forEach.call(dots, function (d, i) {
        d.classList.toggle('is-done', i < cur);
        d.classList.toggle('is-cur', i === cur);
      });
      Array.prototype.forEach.call(cards, function (c, i) {
        c.classList.toggle('is-on', reduced || i <= cur);
        c.classList.toggle('is-cur', !reduced && i === cur);
      });
    };
    window.addEventListener('scroll', updateSteps, { passive: true });
    window.addEventListener('resize', updateSteps);
    updateSteps();
  }

  // FAQ: opening one question closes the others (fallback for browsers without exclusive <details name>)
  var faqItems = document.querySelectorAll('.faq__item');
  Array.prototype.forEach.call(faqItems, function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      Array.prototype.forEach.call(faqItems, function (other) { if (other !== item) other.open = false; });
    });
  });

  // Process: on desktop the five steps become a timeline that follows the scroll – the section
  // stays in place, the next step lights up and its picture and text fade in. Same on mobile, scaled down.
  var flow = document.querySelector('.process .flow');
  if (flow) {
    var steps = Array.prototype.slice.call(flow.querySelectorAll('.flow__step'));
    var wrap = document.createElement('div');
    wrap.className = 'pscroll';
    wrap.style.setProperty('--n', steps.length);
    wrap.innerHTML = '<div class="pscroll__sticky"><div class="pscroll__nav"><span class="pscroll__line"><i></i></span><ol></ol></div><div class="pscroll__stage"></div></div>';
    var navList = wrap.querySelector('ol'), stage = wrap.querySelector('.pscroll__stage'), fill = wrap.querySelector('.pscroll__line i');
    steps.forEach(function (step, i) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button"><span class="pscroll__label"></span><span class="pscroll__dot"></span></button>';
      li.querySelector('.pscroll__label').textContent = step.querySelector('.flow__when').textContent;
      li.querySelector('button').addEventListener('click', function () { go(i); });
      navList.appendChild(li);
      var panel = document.createElement('div');
      panel.className = 'pscroll__panel';
      panel.appendChild(step.querySelector('.flow__img'));
      var no = document.createElement('p'); no.className = 'pscroll__no'; no.textContent = step.querySelector('.flow__no').textContent + ' / 0' + steps.length;
      panel.appendChild(no);
      panel.appendChild(step.querySelector('.flow__title'));
      panel.appendChild(step.querySelector('.flow__text'));
      stage.appendChild(panel);
    });
    flow.replaceWith(wrap);
    var navItems = navList.children, panels = stage.children, current = -1;
    var range = function () { var r = wrap.getBoundingClientRect(); return { top: r.top + window.scrollY, len: wrap.offsetHeight - window.innerHeight }; };
    var go = function (i) {
      var g = range();
      window.scrollTo({ top: g.top + g.len * (i + 0.5) / steps.length, behavior: reduced ? 'auto' : 'smooth' });
    };
    var update = function () {
      var g = range(), p = Math.min(1, Math.max(0, (window.scrollY - g.top) / Math.max(1, g.len)));
      var i = Math.min(steps.length - 1, Math.floor(p * steps.length));
      // The line fills smoothly with the scroll and reaches each dot as its step starts
      fill.style.height = (steps.length > 1 ? Math.min(1, p * steps.length / (steps.length - 1)) * 100 : 100) + '%';
      if (i === current) return;
      current = i;
      for (var k = 0; k < steps.length; k++) {
        navItems[k].classList.toggle('is-on', k === i);
        navItems[k].classList.toggle('is-done', k < i);
        panels[k].classList.toggle('is-on', k === i);
        panels[k].setAttribute('aria-hidden', String(k !== i));
      }
    };
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', update);
    // Start state without measuring anything (step 1 lit); the first scroll takes over from there
    navItems[0].classList.add('is-on'); panels[0].classList.add('is-on'); current = 0;
    for (var k0 = 1; k0 < steps.length; k0++) panels[k0].setAttribute('aria-hidden', 'true');
  }

  // Fade-up reveal for cards
  if (reduced || !('IntersectionObserver' in window)) return;
  var revealTargets = document.querySelectorAll('.case, .post-card, .platform-card, .pair');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -60px 0px' });
  revealTargets.forEach(function (el) {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Card rows slide up as they come into view, one after another (headings stay put)
  var rvObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      rvObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -40px 0px' });
  ['.bento__tile', '.svc-card', '.hp-proj__card', '.faq__item'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, i) {
      el.classList.add('rv');
      el.style.setProperty('--i', String(i % 6));
      rvObserver.observe(el);
    });
  });
  document.querySelectorAll('.hp-proj__devs').forEach(function (el) {
    el.classList.add('rv-devs');
    rvObserver.observe(el);
  });
})();
