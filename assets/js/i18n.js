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
    /* CF Pages _redirects serves the same physical file under /zh/<file>
       via 200 rewrite to /<file>, so the user always lands on a path that
       ends in .html. Strip the .html suffix and check for the /zh prefix
       in the parent directory. */
    if (path.endsWith('.html')) path = path.substring(0, path.length - 5);
    /* Detect /zh prefix at any depth — we route all zh content via
       the .html suffix (e.g. /zh/projects/secsight.html), and the
       trailing slash on /zh/ → /zh/index.html → /. */
    var segments = path.split('/').filter(function (s) { return s; });
    if (segments[0] === 'zh') return 'zh';
    return 'en';
  }

  /* Translate the pathname between / and /zh prefixes.
     /foo/bar.html          → /zh/foo/bar.html
     /zh/foo/bar.html        → /foo/bar.html
     /                       → /zh/index.html
     /index.html             → /zh/index.html                                  */
  function swapPath(path, target) {
    var clean = path;
    var hasHtml = false;
    if (clean.endsWith('.html')) { clean = clean.substring(0, clean.length - 5); hasHtml = true; }
    if (clean.length > 1 && clean.endsWith('/')) { clean = clean.substring(0, clean.length - 1); }
    var segments = clean.split('/').filter(function (s) { return s; });
    var hasZh = segments[0] === 'zh';
    var out;
    if (target === 'zh') {
      if (hasZh) {
        out = '/' + segments.join('/');
      } else {
        out = '/zh' + (segments.length ? '/' + segments.join('/') : '/index');
      }
    } else {
      if (!hasZh) {
        out = '/' + segments.join('/');
      } else {
        segments.shift();
        if (segments.length === 0) {
          out = '/index';
        } else {
          out = '/' + segments.join('/');
        }
      }
    }
    /* Always re-attach .html so the request hits the actual file on disk
       without going through a trailing-slash redirect. */
    out = out + '.html';
    /* Special-case the homepage: serve /index.html without changing the
       user-facing URL to /index.html. CF Pages serves /index.html at the
       root transparently — but we want the URL to stay clean. */
    return out;
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
           in the target language directory (/zh/<rest>.html), so the page
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
