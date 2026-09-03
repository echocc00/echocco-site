// echocc00 motion.js — declarative scroll reveals + micro-interactions
(function() {
  'use strict';
  if (window.__echoccoMotion) return; window.__echoccoMotion = true;

  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduce) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  // ① IntersectionObserver: reveal on enter
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        revealIO.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach(el => revealIO.observe(el));

  // ② Magnetic tilt on .tilt elements
  const tiltEls = document.querySelectorAll('.tilt');
  tiltEls.forEach(el => {
    let raf = null;
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = 'perspective(800px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg) translateY(-2px)';
      });
    });
    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    });
  });

  // ③ Subtle parallax on data-parallax elements
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length) {
    let ticking = false;
    const update = () => {
      parallaxEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
          const center = rect.top + rect.height / 2;
          const delta = (window.innerHeight / 2 - center) * speed;
          el.style.transform = 'translateY(' + delta.toFixed(1) + 'px)';
        }
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  // ④ Nav subtle background change on scroll
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 8);
    }, { passive: true });
  }
})();
