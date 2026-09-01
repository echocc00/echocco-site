/* Contact link rewriter.
   CF Email Obfuscation rewrites literal `mailto:` anchors at the edge,
   turning them into /cdn-cgi/l/email-protection#hex links that rely on
   CF's JS shim to decode. That breaks email clients, curl, and any
   preview / OG scraper that doesn't run JS.

   This file finds every anchor that should be a mailto (tagged with
   `data-mailto-user`, `data-mailto-domain`, optional `data-mailto-subject`)
   and rewrites `href` to `mailto:` on DOMContentLoaded. CF has nothing
   to rewrite because the strings aren't in the static HTML. */

(function () {
  'use strict';
  function assemble(parts) {
    var user = parts.getAttribute('data-mailto-user') || '';
    var domain = parts.getAttribute('data-mailto-domain') || '';
    var subject = parts.getAttribute('data-mailto-subject');
    var href = 'mailto:' + user + '@' + domain;
    if (subject) {
      href += '?subject=' + encodeURIComponent(subject);
    }
    return href;
  }
  function rewrite() {
    var nodes = document.querySelectorAll('[data-mailto-user]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.getAttribute('href')) {
        el.setAttribute('href', assemble(el));
      }
      // Replace the textContent only if it was a placeholder email string
      // (matches "user@domain.tld" pattern). Avoid clobbering copy like "Email me".
      var txt = (el.textContent || '').trim();
      if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(txt)) {
        var user = el.getAttribute('data-mailto-user');
        var domain = el.getAttribute('data-mailto-domain');
        el.textContent = user + '@' + domain;
      }
      // Accessibility hint
      el.removeAttribute('data-mailto-user');
      el.removeAttribute('data-mailto-domain');
      el.removeAttribute('data-mailto-subject');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewrite, { once: true });
  } else {
    rewrite();
  }

// Reassemble split email spans if the source split it for CF obfuscation.
var splitUsers = document.querySelectorAll('span[data-ml="u"]');
for (var j = 0; j < splitUsers.length; j++) {
  var u = splitUsers[j];
  var at = u.parentNode.querySelector('span[data-ml="at"]');
  var d = u.parentNode.querySelector('span[data-ml="d"]');
  if (!at || !d) continue;
  var a = u.parentNode;
  a.textContent = (u.textContent || '') + (at.textContent || '') + (d.textContent || '');
}
})();
