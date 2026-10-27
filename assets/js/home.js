(function () {
  // Process tabs
  var tabs = document.querySelectorAll('.process__nav button');
  var panels = document.querySelectorAll('.process__panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var i = Number(tab.dataset.step);
      tabs.forEach(function (t, n) {
        t.parentElement.classList.toggle('is-active', n === i);
        t.setAttribute('aria-selected', String(n === i));
      });
      panels.forEach(function (p, n) { p.classList.toggle('is-active', n === i); });
    });
  });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window)) return;

  // Count-up numbers when they scroll into view
  var counters = document.querySelectorAll('[data-count]');
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      if (reduced) return;
      var el = entry.target;
      var target = Number(el.dataset.count);
      var start = performance.now();
      var duration = 1600;
      (function tick(now) {
        var t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    });
  }, { threshold: 0.6 });
  counters.forEach(function (el) { countObserver.observe(el); });

  // Fade-up reveal for cards
  if (reduced) return;
  var revealTargets = document.querySelectorAll('.case, .post-card, .platform-card, .numbers__block, .pair');
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
