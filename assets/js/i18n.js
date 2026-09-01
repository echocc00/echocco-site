/* Lightweight i18n switcher.
   - Each translatable text node is annotated with data-i18n-en / data-i18n-zh.
   - This script swaps textContent in place without reloading the page.
   - Language detection order:
     1. localStorage('echocc00.lang') if set
     2. ?lang= query parameter
     3. /zh/ path prefix in URL (legacy)
     4. default: 'en'
   - Toggle click swaps in place + updates URL via ?lang=zh without reload. */

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
    /* Legacy: support /zh/ in path until we phase it out. */
    var path = window.location.pathname;
    if (path.endsWith('.html')) path = path.substring(0, path.length - 5);
    var segments = path.split('/').filter(function (s) { return s; });
    if (segments[0] === 'zh') return 'zh';
    return 'en';
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

    /* Reassemble split email spans. */
    var users = document.querySelectorAll('span[data-ml="u"]');
    for (var j = 0; j < users.length; j++) {
      var u = users[j];
      var parent = u.parentNode;
      if (!parent) continue;
      var userText = u.textContent || '';
      var atEl = parent.querySelector('span[data-ml="at"]');
      var domEl = parent.querySelector('span[data-ml="d"]');
      if (!atEl || !domEl) continue;
      parent.textContent = userText + (atEl.textContent || '') + (domEl.textContent || '');
    }

    /* Search input placeholders. */
    var inputs = document.querySelectorAll('[data-i18n-en-placeholder]');
    for (var k = 0; k < inputs.length; k++) {
      var en = inputs[k].getAttribute('data-i18n-en-placeholder');
      var zh = inputs[k].getAttribute('data-i18n-zh-placeholder') || en;
      inputs[k].setAttribute('placeholder', lang === 'zh' ? zh : en);
    }

    /* Toggle UI active state. */
    var links = document.querySelectorAll('.lang-toggle a[data-lang]');
    for (var m = 0; m < links.length; m++) {
      var a = links[m];
      var isActive = a.getAttribute('data-lang') === lang;
      a.classList.toggle('active', isActive);
      if (isActive) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }

    /* Title + meta description. */
    var enTitle = document.documentElement.getAttribute('data-page-title-en');
    var zhTitle = document.documentElement.getAttribute('data-page-title-zh');
    if (enTitle && zhTitle) {
      document.title = lang === 'zh' ? zhTitle : enTitle;
    }
    var enDesc = document.documentElement.getAttribute('data-page-desc-en');
    var zhDesc = document.documentElement.getAttribute('data-page-desc-zh');
    if (enDesc && zhDesc) {
      var desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', lang === 'zh' ? zhDesc : enDesc);
    }
  }

  function wireToggle() {
    var links = document.querySelectorAll('.lang-toggle a[data-lang]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        var next = this.getAttribute('data-lang');
        setLanguage(next);
        /* Reflect in URL so refreshing the page keeps the language. We use
           the History API to swap ?lang=<value> in place without reloading. */
        try {
          var url = new URL(window.location.href);
          if (next === 'en') {
            url.searchParams.delete('lang');
          } else {
            url.searchParams.set('lang', next);
          }
          window.history.replaceState({}, '', url.toString());
        } catch (e) {
          /* URL constructor not available; do nothing. */
        }
      });
    }
  }

  var lang = detectLanguage();
  function init() {
    setLanguage(lang);
    wireToggle();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.__setLang = setLanguage;
})();
