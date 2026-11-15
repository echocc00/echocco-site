/* echocc00 — console panel
   Live state for the hero panel: a running clock in Asia/Shanghai and a
   coverage bar that fills once, on load. No dependencies.

   The scanline and the dot-matrix drift live in CSS (console.css) so they keep
   running without JS and are removed under prefers-reduced-motion.
*/
(function () {
  'use strict';

  if (window.__echoccoConsoleStarted) return;
  window.__echoccoConsoleStarted = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Live clock (Asia/Shanghai, UTC+8) ---------- */

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function shanghaiNow() {
    // UTC+8 has no DST, so a fixed offset is exact.
    var now = new Date();
    var sh = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
    return {
      date: sh.getFullYear() + '-' + pad(sh.getMonth() + 1) + '-' + pad(sh.getDate()),
      time: pad(sh.getHours()) + ':' + pad(sh.getMinutes()) + ':' + pad(sh.getSeconds())
    };
  }

  var clockEl = document.querySelector('[data-console-clock]');
  if (clockEl) {
    var tick = function () {
      var t = shanghaiNow();
      clockEl.textContent = t.date + ' ' + t.time + ' CST';
    };
    tick();
    // Align to the next second boundary so the clock does not visibly stutter.
    setTimeout(function () {
      tick();
      setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));
  }

  /* ---------- Coverage bar: fills once on load ---------- */

  var bar = document.querySelector('[data-console-bar]');
  if (bar) {
    var pct = parseFloat(bar.getAttribute('data-console-bar')) || 0;
    var apply = function () {
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    };
    if (reduce) {
      apply();
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(apply);
      });
    }
  }

  /* ---------- Console row entrance: staggered, transform + opacity only ---------- */

  var rows = document.querySelectorAll('[data-console-row]');
  if (rows.length && !reduce) {
    rows.forEach(function (row, i) {
      row.style.opacity = '0';
      row.style.transform = 'translate3d(0, 10px, 0)';
      row.style.transition = 'opacity 600ms cubic-bezier(0.05, 0.7, 0.1, 1), transform 600ms cubic-bezier(0.05, 0.7, 0.1, 1)';
      row.style.transitionDelay = (420 + i * 90) + 'ms';
      requestAnimationFrame(function () {
        row.style.opacity = '1';
        row.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  }

  /* ---------- Count-up for the console metric ---------- */

  var metric = document.querySelector('[data-console-metric]');
  if (metric && !reduce) {
    var target = parseFloat(metric.getAttribute('data-console-metric'));
    var suffix = metric.getAttribute('data-console-suffix') || '';
    if (!isNaN(target)) {
      var dur = 1400;
      var start = null;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        // ease-out-expo
        var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        metric.textContent = (target * eased).toFixed(1) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else metric.textContent = target.toFixed(1) + suffix;
      };
      setTimeout(function () { requestAnimationFrame(step); }, 700);
    }
  }
})();
