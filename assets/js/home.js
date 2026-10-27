(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Process: the tube fills as you scroll, each step lights up when reached and the photo follows the latest one
  var flow = document.querySelector('[data-flow]');
  if (flow) {
    var list = flow.querySelector('.flow__list');
    var steps = Array.prototype.slice.call(flow.querySelectorAll('.flow__step'));
    var photos = flow.querySelectorAll('.flow__media img');
    var update = function () {
      var rect = list.getBoundingClientRect();
      var trigger = window.innerHeight * 0.6;
      var progress = reduced ? 1 : Math.min(1, Math.max(0, (trigger - rect.top) / rect.height));
      flow.style.setProperty('--progress', progress);
      var current = 0;
      steps.forEach(function (step, i) {
        var on = reduced || step.getBoundingClientRect().top + 40 <= trigger;
        step.classList.toggle('is-on', on);
        if (on) current = i;
      });
      Array.prototype.forEach.call(photos, function (img, i) { img.classList.toggle('is-current', i === current); });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // FAQ: opening one question closes the others (fallback for browsers without exclusive <details name>)
  var faqItems = document.querySelectorAll('.faq__item');
  Array.prototype.forEach.call(faqItems, function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      Array.prototype.forEach.call(faqItems, function (other) { if (other !== item) other.open = false; });
    });
  });

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
})();
