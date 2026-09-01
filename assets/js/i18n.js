/* Lightweight i18n switcher.
   - Each translatable text node is annotated with data-i18n-en / data-i18n-zh.
   - This script finds them and swaps textContent + selected form values
     based on the current language.
   - The current language is the last segment of the URL pathname:
       /         → English (default)
       /zh/      → Chinese
     Plain language toggle:
       ?lang=zh  → overrides the path detection
   - Persists choice in localStorage so the choice survives reload. */

(function () {
  'use strict';
  var SUPPORTED = { en: 'English', zh: '中文' };
  var STORAGE_KEY = 'echocc00.lang';

  function detectLanguage() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved && SUPPORTED[saved]) return saved;
    var params = new URLSearchParams(window.location.search);
    var q = params.get('lang');
    if (q && SUPPORTED[q]) return q;
    var path = window.location.pathname;
    if (path === '/zh' || path.indexOf('/zh/') === 0 || path === '/zh.html') return 'zh';
    return 'en';
  }

  function setLanguage(lang) {
    if (!SUPPORTED[lang]) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);
    // Translate every node carrying data-i18n-<lang>
    var nodes = document.querySelectorAll('[data-i18n-en]');
    for (var i = 0; i < nodes.length; i++) {
      var en = nodes[i].getAttribute('data-i18n-en');
      var zh = nodes[i].getAttribute('data-i18n-zh') || en;
      nodes[i].textContent = lang === 'zh' ? zh : en;
    }
    // Update toggle UI
    var links = document.querySelectorAll('.lang-toggle a[data-lang]');
    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      var isActive = a.getAttribute('data-lang') === lang;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    // Update <title> if both provided
    var enTitle = document.documentElement.getAttribute('data-page-title-en');
    var zhTitle = document.documentElement.getAttribute('data-page-title-zh');
    if (enTitle && zhTitle) {
      document.title = lang === 'zh' ? zhTitle : enTitle;
    }
    // Update <meta name="description"> if both provided
    var enDesc = document.documentElement.getAttribute('data-page-desc-en');
    var zhDesc = document.documentElement.getAttribute('data-page-desc-zh');
    if (enDesc && zhDesc) {
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', lang === 'zh' ? zhDesc : enDesc);
    }
  }

  // Wire up language toggle buttons (work in any element with data-lang)
  function wireToggle() {
    var links = document.querySelectorAll('a[data-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        var next = this.getAttribute('data-lang');
        // If the link has a real href that targets /zh/, use it instead
        var href = this.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          window.location.href = href;
          return;
        }
        setLanguage(next);
      });
    }
  }

  var lang = detectLanguage();
  // Apply on DOMContentLoaded so all nodes exist; or run synchronously
  // if DOM is already parsed.
  function init() {
    setLanguage(lang);
    wireToggle();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Expose for manual override
  window.__setLang = setLanguage;
})();
