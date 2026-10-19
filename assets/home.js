// Scroll choreography for the home page (works with or without WebGL):
//  - pIn:    0→1 while scrolling the hero away; the beige office "window" lifts off and reveals the lab.
//  - pAbout: 0→1 through the About section; drives the % counter.
//  - pSec:   0→1 slightly later; reveals the HUD boxes one by one (typed text).
// scene.js reads the same numbers from dhtScroll and listens for the "dht:scroll" event.
(function () {
  var html = document.documentElement;
  var win = document.getElementById('window');
  var about = document.getElementById('about');
  var stage = document.getElementById('stage');
  if (!win || !about || !stage) return;
  var bar = document.getElementById('hud-bar');
  var pct = document.getElementById('hud-pct');
  var boxes = [].slice.call(document.querySelectorAll('.hud-box'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = window.dhtScroll = { pIn: 0, pAbout: 0, pSec: 0, land: true, active: true };
  var aTop = 0, aEnd = 0, vh = 1, R = 48, queued = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // typed text: each [data-type] element replays its text when its box switches on
  boxes.forEach(function (b) {
    b._typed = [].slice.call(b.querySelectorAll('[data-type]')).map(function (el) {
      return { el: el, full: el.textContent };
    });
  });
  function typeBox(b) {
    if (b._raf) cancelAnimationFrame(b._raf);
    if (reduce) { b._typed.forEach(function (t) { t.el.textContent = t.full; }); return; }
    var start = performance.now();
    (function step(now) {
      var done = true;
      b._typed.forEach(function (t, i) {
        var dur = Math.min(700, 120 + t.full.length * 9), delay = i * 90;
        var k = clamp((now - start - delay) / dur);
        if (k < 1) done = false;
        var n = Math.round(t.full.length * k);
        t.el.textContent = t.full.slice(0, n) + (k < 1 && k > 0 ? '_' : '');
      });
      b._raf = done ? 0 : requestAnimationFrame(step);
    })(start);
  }
  function setOn(b, on) {
    if (b._on === on) return;
    b._on = on;
    b.classList.toggle('on', on);
    if (on) typeBox(b);
  }

  function measure() {
    vh = window.innerHeight || 1;
    aTop = about.offsetTop;
    aEnd = aTop + about.offsetHeight;
    state.land = window.innerWidth >= window.innerHeight && window.innerWidth >= 720;
    html.classList.toggle('land', state.land);
    R = window.innerWidth >= 840 ? 48 : 24;
    update();
  }

  function update() {
    queued = false;
    var y = window.scrollY || window.pageYOffset || 0;
    var land = state.land;
    var pIn = clamp(y / Math.max(1, aTop));
    var aStart = land ? aTop - vh : aTop - vh * .75;
    var pAbout = clamp((y - aStart) / Math.max(1, aEnd - vh - aStart));
    var sStart = land ? aTop - vh * .35 : aTop - vh * .25;
    var pSec = clamp((y - sStart) / Math.max(1, aEnd - vh - sStart));
    state.pIn = pIn; state.pAbout = pAbout; state.pSec = pSec;

    // office window lifts away with rounded bottom corners
    var lift = land ? 108 : 104, tilt = land ? 4.3 : 0;
    win.style.transform = pIn > 0 ? 'translate3d(0,' + (-lift * pIn).toFixed(3) + '%,0) rotate(' + (tilt * pIn).toFixed(3) + 'deg)' : '';
    win.style.setProperty('--wr', Math.min(1, pIn * 10) * R + 'px');
    win.style.setProperty('--wp', pIn.toFixed(3));
    win.style.visibility = pIn >= 1 ? 'hidden' : '';

    // HUD boxes and progress
    boxes.forEach(function (b) {
      var from = parseFloat(land ? b.dataset.step : (b.dataset.stepPortrait || b.dataset.step));
      var until = land ? 2 : parseFloat(b.dataset.untilPortrait || 2);
      setOn(b, pIn > .98 && pSec > 0 && pSec >= from && pSec < until);
    });
    if (bar) bar.style.transform = 'scaleX(' + pAbout.toFixed(4) + ')';
    if (pct) pct.textContent = Math.round(pAbout * 100) + '%';

    html.classList.toggle('lab-mode', pIn > .55 && y < aEnd - vh * .1);
    state.active = y < aEnd + 40;
    stage.classList.toggle('off', !state.active);
    document.dispatchEvent(new CustomEvent('dht:scroll'));
  }

  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(measure); }, { passive: true });
  window.addEventListener('load', measure);
  measure();
})();
