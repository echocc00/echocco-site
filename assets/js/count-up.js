/* count-up.js — count-up animation for .metric-value elements.
   Triggers when element scrolls 50% into view.
   Preserves prefix (e.g. "≈", "+", "<") and suffix (e.g. "%", "/7", " days").
   Animates over 1500ms with ease-out-expo curve.
   Numbers with commas/decimals preserved.
   SELECTOR — deliberately explicit, not `[class*="metric-"]`.
   The loose attribute selector also matched wrapper elements such as
   `.console-metric-head`, and count-up overwrites `textContent` — which
   destroyed that wrapper's child elements. Only leaf value elements belong
   here. The console panel's own metric is animated by console.js and is
   excluded on purpose so the two never fight over the same node.
*/
(function () {
  'use strict';
  if (window.__echoccoCountUp) return;
  window.__echoccoCountUp = true;

  var SELECTOR = [
    '.metric-value',
    '.metric-number',
    '.impact-metric-value',
    '.impact-card-metric-value',
  ].join(', ');

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ease-out-expo: 1 - 2^(-10t)
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function parseMetric(text) {
    // Match: prefix (non-digit), number (with commas, decimals), suffix (rest)
    var m = String(text).trim().match(/^(\D*)([\d,\.]+)(.*)$/s);
    if (!m) return null;
    var prefix = m[1] || '';
    var numStr = m[2].replace(/,/g, '');
    var suffix = m[3] || '';
    var value = parseFloat(numStr);
    if (!isFinite(value)) return null;
    var decimals = (numStr.split('.')[1] || '').length;
    var hasCommas = /,/.test(m[2]);
    return { prefix: prefix, value: value, suffix: suffix,
             decimals: decimals, hasCommas: hasCommas, raw: text };
  }

  function format(parsed, current) {
    var s = current.toFixed(parsed.decimals);
    if (parsed.hasCommas) {
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = parts.join('.');
    }
    return parsed.prefix + s + parsed.suffix;
  }

  /* The numeric part of an element may live in its own trailing text node,
     with element children before it — e.g.
       <div class="impact-metric-value"><span class="arrow-down">↓</span>80%</div>
     Overwriting textContent flattens the arrow span and drops its colour.
     So find the trailing text node, read and write only that. */
  function numericTextNode(el) {
    for (var i = el.childNodes.length - 1; i >= 0; i--) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim() !== '') return n;
    }
    return null;
  }

  /* The text that holds the number: the trailing text node if there is one,
     otherwise the element's own text. Parsing must use the same source the
     write uses, so the prefix/suffix bookkeeping stays consistent. */
  function metricSource(el) {
    var node = numericTextNode(el);
    return node ? node.nodeValue : el.textContent;
  }

  function writeValue(el, parsed, current) {
    var node = numericTextNode(el);
    var text = format(parsed, current);
    if (node) node.nodeValue = text;
    else el.textContent = text;
  }

  function animate(el, parsed) {
    if (prefersReduced) return;
    var start = performance.now();
    var dur = 1500;
    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var v = parsed.value * easeOutExpo(t);
      writeValue(el, parsed, v);
      if (t < 1) requestAnimationFrame(frame);
      else writeValue(el, parsed, parsed.value);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    var nodes = document.querySelectorAll(SELECTOR);
    if (!nodes.length || !('IntersectionObserver' in window)) {
      // Fallback: still animate if in view immediately
      nodes.forEach(function (el) {
        var p = parseMetric(metricSource(el));
        if (p && (p.value > 0)) animate(el, p);
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var p = parseMetric(metricSource(el));
          if (p && p.value > 0) animate(el, p);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (el) {
      var p = parseMetric(metricSource(el));
      // Only observe if it's actually a numeric metric
      if (p && p.value > 0) io.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
