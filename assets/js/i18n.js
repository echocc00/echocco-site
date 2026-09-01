/* Lightweight i18n switcher.
   - Each translatable text node is annotated with data-i18n-en / data-i18n-zh.
   - This script swaps textContent in place without reloading the page.
   - URL detection:
       /       → English (default)
       /zh/    → Chinese
   - Toggle UI: clicking the language link swaps in place AND updates
     the URL pathname in place (so /projects/secsight/ → /zh/projects/secsight/).
   - Choice persists in localStorage. */

(function () {
  'use strict';
  var SUPPORTED = { en: 'English', zh: '中文' };
  var STORAGE_KEY = 'echocc00.lang';
  var ZH_PREFIX = '/zh';

  function detectLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED[saved]) return saved;
    } catch (e) {}
    var params = new URLSearchParams(window.location.search);
    var q = params.get('lang');
    if (q && SUPPORTED[q]) return q;
    var path = window.location.pathname;
    if (path === ZH_PREFIX || path === ZH_PREFIX + '/' || path.indexOf(ZH_PREFIX + '/') === 0) return 'zh';
    return 'en';
  }

  /* Translate the pathname between / and /zh prefixes.
     /projects/secsight/         → /zh/projects/secsight/
     /zh/projects/secsight/       → /projects/secsight/
     /                           → /zh/
     /zh/                        → /                                          */
  function swapPath(path, target) {
    var hasZh = path === ZH_PREFIX || path.indexOf(ZH_PREFIX + '/') === 0;
    if (target === 'zh') {
      if (hasZh) return path;
      if (path === '/' || path === '') return '/zh/';
      return ZH_PREFIX + path;  // /projects/secsight/ → /zh/projects/secsight/
    } else {
      if (!hasZh) return path;
      if (path === ZH_PREFIX || path === ZH_PREFIX + '/') return '/';
      return path.substring(ZH_PREFIX.length) || '/';  // /zh/projects/secsight/ → /projects/secsight/
    }
  }

  function setLanguage(lang, opts) {
    opts = opts || {};
    if (!SUPPORTED[lang]) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);

    var nodes = document.querySelectorAll('[data-i18n-en]');
    for (var i = 0; i < nodes.length; i++) {
      var en = nodes[i].getAttribute('data-i18n-en');
      var zh = nodes[i].getAttribute('data-i18n-zh') || en;
      nodes[i].textContent = lang === 'zh' ? zh : en;
    }

    /* Reassemble split email spans (the data-ml="..." placeholders). */
    var splitUsers = document.querySelectorAll('span[data-ml="u"]');
    for (var j = 0; j < splitUsers.length; j++) {
      var u = splitUsers[j];
      var at = u.parentNode.querySelector('span[data-ml="at"]');
      var d = u.parentNode.querySelector('span[data-ml="d"]');
      if (!at || !d) continue;
      u.parentNode.textContent =
        (u.textContent || '') + (at.textContent || '') + (d.textContent || '');
    }

    /* Search input placeholders. */
    var inputs = document.querySelectorAll('[data-i18n-en-placeholder]');
    for (var k = 0; k < inputs.length; k++) {
      var en = inputs[k].getAttribute('data-i18n-en-placeholder');
      var zh = inputs[k].getAttribute('data-i18n-zh-placeholder') || en;
      inputs[k].setAttribute('placeholder', lang === 'zh' ? zh : en);
    }

    /* Toggle UI: mark active link. */
    var links = document.querySelectorAll('.lang-toggle a[data-lang]');
    for (var m = 0; m < links.length; m++) {
      var a = links[m];
      var isActive = a.getAttribute('data-lang') === lang;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }

    /* Update <title>. */
    var enTitle = document.documentElement.getAttribute('data-page-title-en');
    var zhTitle = document.documentElement.getAttribute('data-page-title-zh');
    if (enTitle && zhTitle) {
      document.title = lang === 'zh' ? zhTitle : enTitle;
    }

    /* Update meta description. */
    var enDesc = document.documentElement.getAttribute('data-page-desc-en');
    var zhDesc = document.documentElement.getAttribute('data-page-desc-zh');
    if (enDesc && zhDesc) {
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', lang === 'zh' ? zhDesc : enDesc);
    }

    /* Update <title> tag with i18n attribute for accessibility tools. */
    document.documentElement.setAttribute('lang', lang);

    /* If we updated the URL, push it via History API without reload. */
    if (opts.newPath) {
      try { window.history.replaceState({}, '', opts.newPath); } catch (e) {}
    }
  }

  function wireToggle() {
    var links = document.querySelectorAll('.lang-toggle a[data-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        var next = this.getAttribute('data-lang');
        var currentPath = window.location.pathname;
        var targetPath = swapPath(currentPath, next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {}
        /* Force a full navigation. CF Pages serves the equivalent file
           in the target language directory (/zh/<rest>), so the page
           loads with the right data-i18n-* context and the script
           re-runs cleanly. This is the simplest reliable behaviour. */
        window.location.href = targetPath;
      });
    }
  }

  var lang = detectLanguage();
  function init() {
    // Initial swap in case the page was opened at /zh/ already
    setLanguage(lang);
    wireToggle();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /* Expose for manual override. */
  window.__setLang = setLanguage;
})();
