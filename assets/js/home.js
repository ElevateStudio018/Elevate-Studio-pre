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
