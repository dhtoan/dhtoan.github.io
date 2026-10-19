/* Pick English or Vietnamese automatically, once.
 * - A choice the visitor made with the language switch (data-lang links) always wins and is remembered.
 * - Otherwise: Vietnamese when the browser's first language is Vietnamese, or the device clock is set to
 *   Vietnam's time zone (Asia/Ho_Chi_Minh / Asia/Saigon). Everyone else gets English.
 * - Crawlers are never redirected, so Google indexes both pages (they are linked with hreflang).
 * Runs in <head> before rendering, so there is no flash of the wrong language. */
(function () {
  var KEY = 'dhtoan-lang';
  var root = document.documentElement;
  var isVi = root.lang === 'vi';
  var base = isVi ? '../' : './';
  var targets = { en: base, vi: base + 'vi/' };

  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lang]');
    if (a) store(a.getAttribute('data-lang'));
  });

  if (/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent)) return;
  if (/[?&]lang=/.test(location.search)) return;   // explicit link: stay put

  var want = read();
  if (!want) {
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'])
      .map(function (l) { return String(l).toLowerCase(); });
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var vnZone = tz === 'Asia/Ho_Chi_Minh' || tz === 'Asia/Saigon';
    want = (langs[0].indexOf('vi') === 0 || vnZone) ? 'vi' : 'en';
  }
  if ((want === 'vi') !== isVi) location.replace(targets[want] + location.hash);
})();
