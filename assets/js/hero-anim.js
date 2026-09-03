/* hero-anim.js — one-time opening animation for the page hero.
 *
 * Targets:
 *   .proj-hero h1     — project pages. Apply .hero-reveal.
 *   .hero h1          — index page (the home hero uses .hero-title).
 *   .hero-fade-in     — any opt-in element gets a delayed fade.
 *
 * Why apply via JS instead of hard-coding class="hero-reveal" in
 * the HTML: it keeps the markup stable for the no-JS case (the
 * headline is fully readable) and lets the keyframe animation run
 * from JS so the timing matches first paint more reliably across
 * browsers. The CSS `.hero-reveal` animation still ships in main.css.
 *
 * Respects prefers-reduced-motion: no class is applied, so the
 * CSS reduce-motion override keeps the title fully visible.
 */
(function () {
  'use strict';

  var prefersReducedMotion = (function () {
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  })();

  function apply() {
    if (prefersReducedMotion) return;

    // Project-page hero: <header class="proj-hero"><h1 class="proj-title">...
    var projTitle = document.querySelector('.proj-hero h1');
    if (projTitle && projTitle.classList) projTitle.classList.add('hero-reveal');

    // Home-page hero: <section class="hero"><h1 class="hero-title">...
    var homeTitle = document.querySelector('.hero h1');
    if (homeTitle && homeTitle.classList) homeTitle.classList.add('hero-reveal');

    // Opt-in soft fade for tagline / subtitle / CTA rows.
    var soft = document.querySelectorAll('.hero-fade-in');
    for (var i = 0; i < soft.length; i++) {
      // The class is already declared; nothing else needed.
      // The keyframe fires automatically. Just ensure it's present
      // (no-op if the markup already has it).
      if (soft[i].classList && !soft[i].classList.contains('hero-fade-in')) {
        soft[i].classList.add('hero-fade-in');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();