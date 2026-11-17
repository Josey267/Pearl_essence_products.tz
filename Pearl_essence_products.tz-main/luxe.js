/* Pearl Essence - gentle scroll reveal for cards and sections.
   Elements start hidden only after this script has run, so the page stays fully
   visible without JavaScript or with reduced-motion enabled. */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var selector = [
    '.product-row',
    '.product-grid .product-card',
    '.showcase-item',
    '.process-step',
    '.shop-with-us-heading',
    '.shop-subheading',
    '.agent-process h2',
    '.agent-cta'
  ].join(',');

  var targets = document.querySelectorAll(selector);
  if (!targets.length) return;

  document.documentElement.classList.add('lux-reveal');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      observer.unobserve(el);
      // Stagger siblings that appear together, then clear so hover transitions stay instant
      var index = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = Math.min(index, 5) * 70 + 'ms';
      el.classList.add('is-revealed');
      setTimeout(function () { el.style.transitionDelay = ''; }, 1100);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  targets.forEach(function (el) {
    el.setAttribute('data-reveal', '');
    observer.observe(el);
  });
})();
