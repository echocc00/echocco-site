/* reveal.js — scroll-triggered fade-up + stagger for echocco-site.
 *
 * Watches every [data-reveal] and [data-reveal-stagger] element.
 * Adds .reveal-in when the element crosses ~12% into the viewport
 * (rootMargin pulls the trigger up 10% so reveals feel intentional,
 * not lazy). Unobserves after firing so motion stays one-shot.
 *
 * Respects prefers-reduced-motion: if the user opted out, every
 * observed element is immediately marked as revealed with no work
 * scheduled. Keeps main.css's data-reveal rules happy because the
 * reduce-motion media query overrides them to final state anyway.
 *
 * Loaded with `defer`, so DOM is parsed by the time we run.
 */
(function () {
  'use strict';

  var prefersReducedMotion = (function () {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  })();

  var REVEAL_SEL = '[data-reveal]';
  var STAGGER_SEL = '[data-reveal-stagger]';

  function markRevealed(el) {
    if (!el || el.classList.contains('reveal-in')) return;
    el.classList.add('reveal-in');
  }

  function revealAll() {
    var nodes = document.querySelectorAll(REVEAL_SEL + ', ' + STAGGER_SEL);
    for (var i = 0; i < nodes.length; i++) markRevealed(nodes[i]);
  }

  function init() {
    if (prefersReducedMotion) {
      // Snap everything to its end state and skip the observer entirely.
      revealAll();
      return;
    }

    // IntersectionObserver — wide browser support, no polyfill needed.
    if (typeof window.IntersectionObserver !== 'function') {
      // Old browser fallback: just reveal everything immediately.
      revealAll();
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j];
        if (entry.isIntersecting) {
          markRevealed(entry.target);
          io.unobserve(entry.target);
        }
      }
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -10% 0px'
    });

    var targets = document.querySelectorAll(REVEAL_SEL + ', ' + STAGGER_SEL);
    for (var k = 0; k < targets.length; k++) io.observe(targets[k]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();