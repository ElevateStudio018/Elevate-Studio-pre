(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Process thermometer: the tube fills as you scroll and each step pops up when reached
  var thermo = document.querySelector('[data-thermo]');
  if (thermo) {
    var steps = Array.prototype.slice.call(thermo.querySelectorAll('.thermo__step'));
    var update = function () {
      var rect = thermo.getBoundingClientRect();
      var trigger = window.innerHeight * 0.65;
      var progress = reduced ? 1 : Math.min(1, Math.max(0, (trigger - rect.top) / rect.height));
      thermo.style.setProperty('--progress', progress);
      var fillBottom = rect.top + progress * rect.height;
      steps.forEach(function (step) {
        var dot = step.querySelector('.thermo__dot').getBoundingClientRect();
        step.classList.toggle('is-on', dot.top + dot.height / 2 <= fillBottom + 1);
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
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
})();
