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
  var aTop = 0, aEnd = 0, pTop = 0, cTop = 0, vh = 1, R = 48, queued = false;
  var projects = document.getElementById('projects'), contact = document.getElementById('contact');
  var navLinks = [].slice.call(document.querySelectorAll('.pill-nav a[data-sec]'));
  var ind = document.querySelector('.pill-ind'), activeSec = null;

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
    pTop = projects ? projects.offsetTop : 1e9;
    cTop = contact ? contact.offsetTop : 1e9;
    activeSec = null;
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
    // the window waits while the chair swivels (scene.js), then lifts with an ease-in
    var w = clamp((pIn - .12) / .88); w = w * w * (3 - 2 * w) * .5 + w * .5;
    var lift = land ? 108 : 104, tilt = land ? 4.3 : 0;
    win.style.transform = w > 0 ? 'translate3d(0,' + (-lift * w).toFixed(3) + '%,0) rotate(' + (tilt * w).toFixed(3) + 'deg)' : '';
    win.style.setProperty('--wr', Math.min(1, w * 10) * R + 'px');
    win.style.setProperty('--wp', w.toFixed(3));
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
    html.classList.toggle('at-top', y < vh * .3);
    setActive(y + vh * .5 >= cTop ? 'contact' : y + vh * .5 >= pTop ? 'projects' : pIn > .5 ? 'about' : '');
    state.active = y < aEnd + 40;
    stage.classList.toggle('off', !state.active);
    document.dispatchEvent(new CustomEvent('dht:scroll'));
  }

  // pill nav: highlight the section in view and slide the indicator under it
  function setActive(sec) {
    if (sec === activeSec) return;
    activeSec = sec;
    var on = null;
    navLinks.forEach(function (a) { var m = a.dataset.sec === sec; a.classList.toggle('on', m); if (m) { on = a; a.setAttribute('aria-current', 'true'); } else a.removeAttribute('aria-current'); });
    if (!ind) return;
    if (on) { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = 'translateX(' + on.offsetLeft + 'px)'; ind.style.opacity = '1'; }
    else ind.style.opacity = '0';
  }

  function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(measure); }, { passive: true });
  window.addEventListener('load', measure);
  measure();
})();

// Hero tag: letters scramble now and then, like a terminal re-printing them.
(function () {
  var tag = document.querySelector('[data-scramble]');
  if (!tag || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var full = tag.textContent, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';
  var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
  tag.setAttribute('aria-hidden', 'true'); tag.parentNode.insertBefore(sr, tag.nextSibling);
  function scramble() {
    var start = performance.now(), dur = 650;
    (function step(now) {
      var k = (now - start) / dur, out = '';
      for (var i = 0; i < full.length; i++) {
        var c = full.charAt(i);
        out += (c === ' ' || k * (full.length + 4) > i + 4) ? c : chars.charAt(Math.random() * chars.length | 0);
      }
      tag.textContent = k < 1 ? out : full;
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  setTimeout(scramble, 900);
  setInterval(function () { if (document.visibilityState === 'visible' && (window.scrollY || 0) < innerHeight * .8) scramble(); }, 4200);
})();

// Background music, composed in code with WebAudio (off until the visitor turns it on):
// a slow Fmaj7 - Em7 - Dm7 - Cmaj7 pad with a soft bass and a sparse plucked melody, through a little echo.
(function () {
  var btn = document.getElementById('sound');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }
  var ctx, master, timer = 0, nextT = 0, step = 0, playing = false;
  var CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  var PAT = [0, 2, 1, 3, 2, 1, 3, 2];
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function note(n, t, dur, type, gain, cutoff, attack) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = hz(n); f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
  }
  function schedule() {
    while (nextT < ctx.currentTime + .7) {
      var ch = CH[Math.floor(step / 8) % 4], beat = step % 8;
      if (beat === 0) {
        ch.forEach(function (n) { note(n, nextT, 4.3, 'triangle', .035, 850, .8); });
        note(ch[0] - 12, nextT, 3.9, 'sine', .11, 400, .05);
      }
      if (beat % 2 === 0 || Math.random() < .3) note(ch[PAT[beat]] + 12, nextT, 1, 'sine', .04, 2800, .01);
      nextT += .5; step++;
    }
  }
  function init() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var delay = ctx.createDelay(), fb = ctx.createGain(), wet = ctx.createGain();
    delay.delayTime.value = .375; fb.gain.value = .32; wet.gain.value = .35;
    master.connect(ctx.destination); master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
  }
  function set(on) {
    playing = on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? btn.dataset.off : btn.dataset.on);
    btn.classList.toggle('on', on);
    if (on) {
      if (!ctx) init();
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(.8, ctx.currentTime, .4);
      nextT = ctx.currentTime + .05; schedule(); clearInterval(timer); timer = setInterval(schedule, 200);
    } else if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, .12);
      clearInterval(timer);
      setTimeout(function () { if (!playing) ctx.suspend(); }, 600);
    }
  }
  btn.addEventListener('click', function () { set(!playing); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !playing) return;
    if (document.visibilityState === 'visible') { ctx.resume(); nextT = ctx.currentTime + .05; } else ctx.suspend();
  });
})();
