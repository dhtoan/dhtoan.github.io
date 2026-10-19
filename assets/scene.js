// Home page 3D, all procedural (no downloaded models, textures or fonts):
//  - #office-canvas: a beige diorama office; the founder sits at his desk with his back to us.
//  - #lab-canvas:    a blue hologram lab; while the office window lifts away, the founder materialises
//                    on a glowing pedestal, turns around, and the HUD boxes are pinned next to him.
// Layout idea inspired by David Heckhoff's portfolio (david-hckh.com); this code is written from scratch.
// Rendering stops when the stage is off screen or the tab is hidden; reduced motion renders on scroll only.
import * as THREE from 'three';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;
const S = () => window.dhtScroll || { pIn: 0, pAbout: 0, pSec: 0, land: innerWidth >= innerHeight, active: true };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

function finishLoading() {
  const pct = document.getElementById('loader-pct'), loader = document.getElementById('loader');
  if (pct) pct.textContent = '100%';
  html.classList.add('scene-ready');
  if (loader) setTimeout(() => loader.classList.add('done'), 200);
}

// ---------- helpers ----------
const cache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache[key]) cache[key] = new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: .05, ...opts });
  return cache[key];
}
function mesh(geo, m, cast = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = true; return o; }
const box = (w, h, d, c, o) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c, o) : c);
const cyl = (a, b, h, c, s = 24, o) => mesh(new THREE.CylinderGeometry(a, b, h, s), typeof c === 'string' ? mat(c, o) : c);
const ball = (r, c, o, s = 20) => mesh(new THREE.SphereGeometry(r, s, Math.round(s * .75)), typeof c === 'string' ? mat(c, o) : c);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const CYAN = new THREE.Color('#5fdcff');
const glow = (color = CYAN, opacity = .3) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
function tex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function makeRenderer(canvas, shadows) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.setClearColor(0x000000, 0);
  if (shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
  return r;
}
function fit(renderer, camera, canvas) {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  return { w, h };
}

// ---------- avatar: stylised founder, curtain-bang hair, black turtleneck ----------
const SKIN = '#f1c9a5', HAIR = '#1b1511';
function makeAvatar(pose) {
  const sit = pose === 'sit', drop = sit ? .6 : 0;
  const g = new THREE.Group(), parts = {};
  const skin = mat(SKIN, { roughness: .65, metalness: 0 });
  const cloth = mat('#17191f', { roughness: .85, metalness: 0 });
  const pants = mat('#30384a', { roughness: .85, metalness: 0 });
  const hairM = mat(HAIR, { roughness: .45, metalness: .05 });
  const head = new THREE.Group(); head.position.y = 3.05 - drop; g.add(head); parts.head = head;
  const skull = mesh(new THREE.SphereGeometry(.34, 32, 24), skin); skull.scale.set(.95, 1.05, .98); head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(.25, 24, 16), skin); jaw.scale.set(1.05, .8, 1); jaw.position.set(0, -.16, .04); head.add(jaw);
  [-.33, .33].forEach(x => { const e = mesh(new THREE.SphereGeometry(.065, 12, 10), skin); e.scale.set(.5, 1, .8); e.position.set(x, -.02, 0); head.add(e); });
  [-.115, .115].forEach(x => {
    head.add(at(ball(.034, '#14100d', { metalness: 0, roughness: .2 }), x, .02, .31));
    const brow = at(box(.13, .025, .03, HAIR, { metalness: 0 }), x, .12, .31); brow.rotation.z = x < 0 ? .08 : -.08; head.add(brow);
  });
  const nose = at(mesh(new THREE.ConeGeometry(.04, .11, 10), skin), 0, -.04, .34); nose.rotation.x = Math.PI / 2.3; head.add(nose);
  head.add(at(box(.1, .014, .01, '#b8735f', { metalness: 0 }), 0, -.18, .3));
  const crown = at(mesh(new THREE.SphereGeometry(.355, 32, 20, 0, Math.PI * 2, 0, Math.PI * .36), hairM), 0, .08, -.02); crown.rotation.x = -.22; head.add(crown);
  head.add(mesh(new THREE.SphereGeometry(.352, 24, 16, Math.PI, Math.PI, Math.PI * .1, Math.PI * .55), hairM));
  [1, -1].forEach(side => { // curtain bangs parted in the middle
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(.09, .02, .23, -.07, .3, -.27); s.bezierCurveTo(.23, -.18, .11, -.11, .02, -.09); s.lineTo(0, 0);
    const m = mesh(new THREE.ExtrudeGeometry(s, { depth: .09, bevelEnabled: true, bevelSize: .022, bevelThickness: .022, bevelSegments: 2, curveSegments: 12 }), hairM);
    m.scale.x = side; m.position.set(0, .29, .22); m.rotation.x = -.35; head.add(m);
  });
  g.add(at(mesh(new THREE.CylinderGeometry(.1, .11, .25, 16), skin), 0, head.position.y - .36, 0));
  const torsoY = 2.15 - drop;
  const torso = at(mesh(new THREE.CapsuleGeometry(.36, .7, 8, 16), cloth), 0, torsoY, 0); torso.scale.set(1.05, 1, .72); g.add(torso); parts.torso = torso;
  g.add(at(mesh(new THREE.CylinderGeometry(.17, .2, .2, 20), cloth), 0, torsoY + .6, 0));
  function arm(side) {
    const a = new THREE.Group(); a.position.set(.46 * side, torsoY + .4, 0); g.add(a);
    a.add(at(mesh(new THREE.CapsuleGeometry(.11, .5, 6, 10), cloth), 0, -.32, 0));
    const el = new THREE.Group(); el.position.y = -.62; a.add(el);
    el.add(at(mesh(new THREE.CapsuleGeometry(.1, .45, 6, 10), cloth), 0, -.28, 0));
    el.add(at(mesh(new THREE.SphereGeometry(.1, 16, 12), skin), 0, -.58, 0));
    return { a, el };
  }
  parts.armL = arm(-1); parts.armR = arm(1);
  function leg(side) {
    const l = new THREE.Group(); l.position.set(.18 * side, 1.55 - drop, 0); g.add(l);
    l.add(at(mesh(new THREE.CapsuleGeometry(.14, .55, 6, 12), pants), 0, -.38, 0));
    const kn = new THREE.Group(); kn.position.y = -.75; l.add(kn);
    kn.add(at(mesh(new THREE.CapsuleGeometry(.13, .55, 6, 12), pants), 0, -.38, 0));
    kn.add(at(box(.27, .14, .44, '#0d0e11', { roughness: .4 }), 0, -.78, .08));
    return { l, kn };
  }
  parts.legL = leg(-1); parts.legR = leg(1);
  if (sit) {
    [parts.legL, parts.legR].forEach(p => { p.l.rotation.x = -Math.PI / 2; p.kn.rotation.x = Math.PI / 2; });
    [parts.armL, parts.armR].forEach(p => { p.a.rotation.x = -.75; p.el.rotation.x = -.85; });
  } else {
    parts.armL.a.rotation.z = .1; parts.armR.a.rotation.z = -.1;
  }
  g.userData.parts = parts;
  return g;
}

// ---------- 1. office diorama ----------
function buildOffice(canvas) {
  const renderer = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const room = new THREE.Group(); scene.add(room);
  const C = { wall: '#fbf7f1', wall2: '#f4ece1', trim: '#e3d3bd', white: '#ffffff', metal: '#c9ced6', dark: '#262a33' };

  // soft shadow under the diorama
  const shadowTex = tex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(90,60,30,.32)'); gr.addColorStop(.6, 'rgba(90,60,30,.12)'); gr.addColorStop(1, 'rgba(90,60,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(.4, -.33, .4); room.add(sh);

  // floor slab with planks
  const planks = tex(512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = ['#e7cda8', '#e2c59d', '#ead3b0', '#dfc196'][i % 4]; g.fillRect(0, i * 64, w, 64);
      g.fillStyle = 'rgba(120,80,40,.22)'; g.fillRect(0, i * 64, w, 2);
      for (let k = 0; k < 2; k++) g.fillRect((i * 173 + k * 251) % 512, i * 64, 2, 64);
    }
  });
  const trim = mat(C.trim, { roughness: .8 });
  const floor = mesh(new THREE.BoxGeometry(6, .3, 6), [trim, trim, new THREE.MeshStandardMaterial({ map: planks, roughness: .75 }), trim, trim, trim]);
  floor.position.y = -.15; room.add(floor);
  const rug = at(cyl(1.5, 1.5, .03, '#f0b24c', 48, { roughness: .95 }), 0, .015, -.7); rug.castShadow = false; room.add(rug);
  const rug2 = at(cyl(1.1, 1.1, .034, '#f6cf7c', 48, { roughness: .95 }), 0, .018, -.7); rug2.castShadow = false; room.add(rug2);

  // walls (back + left), open towards the camera like a diorama
  room.add(at(box(6, 4, .24, C.wall, { roughness: .9 }), 0, 1.85, -2.88));
  room.add(at(box(.24, 4, 6, C.wall2, { roughness: .9 }), -2.88, 1.85, 0));
  room.add(at(box(6, .16, .05, C.trim), 0, .08, -2.74));
  room.add(at(box(.05, .16, 6, C.trim), -2.74, .08, 0));

  // window on the left wall
  const sky = tex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fd0ff'); gr.addColorStop(1, '#e8f6ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.85)'; [[60, 80, 40], [150, 120, 30], [200, 60, 22]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.arc(x + r, y + 6, r * .8, 0, 7); g.fill(); });
  });
  const win = new THREE.Group(); win.position.set(-2.75, 2.3, .4); win.rotation.y = Math.PI / 2; room.add(win);
  win.add(new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.5), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false })));
  [[0, .78, 1.96, .08], [0, -.78, 1.96, .08], [-.94, 0, .08, 1.6], [.94, 0, .08, 1.6], [0, 0, .05, 1.5], [0, 0, 1.8, .05]].forEach(([x, y, w, h]) => win.add(at(box(w, h, .08, C.white), x, y, .02)));
  win.add(at(box(2.1, .08, .3, C.white), 0, -.82, .12));

  // shelf with books, tiger figurine and a small plant
  room.add(at(box(1.5, .07, .4, C.white), -1.85, 2.45, -2.56));
  ['#e8a33d', '#5a7bd8', '#d9584c', '#3f8f6b'].forEach((c, i) => { const b = at(box(.13, .5 + (i % 2) * .08, .32, c), -2.45 + i * .15, 2.74 + (i % 2) * .04, -2.56); if (i === 3) b.rotation.z = -.25; room.add(b); });
  const fur = new THREE.MeshStandardMaterial({ roughness: .85, map: tex(128, 64, (g, w, h) => { g.fillStyle = '#f0913a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2d241c'; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 3, 0, 5, 24); }) });
  const tiger = new THREE.Group();
  tiger.add(mesh(new THREE.SphereGeometry(.13, 18, 12), fur));
  tiger.add(at(mesh(new THREE.SphereGeometry(.12, 18, 12), fur), 0, .17, .04));
  [-.07, .07].forEach(x => tiger.add(at(ball(.035, '#f0913a', { metalness: 0 }), x, .28, .02)));
  tiger.position.set(-1.55, 2.6, -2.5); tiger.rotation.y = .5; room.add(tiger);
  room.add(at(cyl(.11, .08, .18, C.white, 16), -1.2, 2.58, -2.56));
  room.add(at(ball(.15, '#6fb556', { metalness: 0 }), -1.2, 2.76, -2.56));

  // framed map poster and a pinboard
  const mapTex = tex(256, 180, (g, w, h) => {
    g.fillStyle = '#3d7fd1'; g.fillRect(0, 0, w, h); g.fillStyle = '#86c172';
    [[50, 60, 34, 26], [75, 120, 18, 32], [140, 55, 24, 18], [148, 110, 22, 30], [205, 70, 40, 24], [215, 140, 16, 12]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, .3, 0, 7); g.fill(); });
    g.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 45); g.lineTo(w, i * 45); g.stroke(); }
  });
  const poster = at(new THREE.Group(), -1.85, 3.35, -2.74); room.add(poster);
  poster.add(box(1.12, .82, .05, C.dark));
  poster.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1, .7), new THREE.MeshStandardMaterial({ map: mapTex, roughness: .6 })), 0, 0, .03));
  const board = at(new THREE.Group(), 2.05, 2.8, -2.74); room.add(board);
  board.add(box(1.25, .9, .04, '#c99d66', { roughness: 1 }));
  [['#ffe36e', -.38, .2, .1], ['#ff9fb1', -.05, .22, -.08], ['#8fe0ff', .33, .18, .06], ['#ffffff', -.25, -.18, -.05], ['#ffe36e', .2, -.2, .12]].forEach(([c, x, y, r]) => {
    const n = at(box(.26, .26, .01, c, { roughness: .9 }), x, y, .03); n.rotation.z = r; n.castShadow = false; board.add(n);
    board.add(at(ball(.025, '#d9584c'), x, y + .1, .05));
  });

  // desk, monitors and props
  const desk = at(new THREE.Group(), 0, 0, -2.2); room.add(desk);
  desk.add(at(box(3.4, .08, 1.2, C.white, { roughness: .35 }), 0, 1.45, 0));
  [-1.62, 1.62].forEach(x => desk.add(at(box(.06, 1.41, 1.1, C.white), x, .705, 0)));
  desk.add(at(new THREE.Mesh(new THREE.BoxGeometry(3.3, .015, .015), glow(CYAN, .9)), 0, 1.4, .6));
  function screen(kind) {
    return tex(512, 300, (g, w, h) => {
      g.fillStyle = '#111827'; g.fillRect(0, 0, w, h);
      if (kind === 'code') {
        const cols = ['#7aa2f7', '#9ece6a', '#e0af68', '#f7768e', '#bb9af7', '#73daca'];
        for (let i = 0; i < 13; i++) { let x = 28 + (i % 4) * 16; for (let k = 0; k < 3; k++) { const len = 26 + ((i * 13 + k * 29) % 90); g.fillStyle = cols[(i + k) % 6]; g.fillRect(x, 22 + i * 20, len, 8); x += len + 12; } }
      } else {
        g.fillStyle = 'rgba(95,220,255,.16)'; g.fillRect(18, 18, w - 36, 150);
        g.strokeStyle = '#5fdcff'; g.lineWidth = 5; g.beginPath(); g.moveTo(28, 150);
        [140, 132, 112, 120, 90, 78, 56, 40].forEach((y, i) => g.lineTo(28 + (i + 1) * 55, y)); g.stroke();
        ['#f7768e', '#7aa2f7', '#9ece6a'].forEach((c, r) => { let x = 22; for (let i = 0; i < 5; i++) { const len = 40 + ((r * 37 + i * 53) % 60); g.fillStyle = c; g.fillRect(x, 190 + r * 32, len, 18); x += len + 8; } });
      }
    });
  }
  [[-.7, .18, 'chart'], [.7, -.18, 'code']].forEach(([x, ry, kind]) => {
    const m = new THREE.Group();
    m.add(box(1.32, .8, .06, C.dark, { metalness: .4, roughness: .35 }));
    m.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.24, .72), new THREE.MeshBasicMaterial({ map: screen(kind), toneMapped: false })), 0, 0, .035));
    m.add(at(box(.07, .36, .07, C.metal, { metalness: .8, roughness: .3 }), 0, -.55, -.05));
    m.add(at(box(.42, .03, .26, C.metal, { metalness: .8, roughness: .3 }), 0, -.72, -.02));
    m.position.set(x, 2.23, -.25); m.rotation.y = ry; desk.add(m);
  });
  desk.add(at(box(1.1, .04, .34, '#ecebe7'), 0, 1.51, .32));
  desk.add(at(box(.13, .04, .2, '#ecebe7'), .78, 1.51, .32));
  // holo globe (Map a Day) and glowing jar (DIY)
  const globe = at(new THREE.Mesh(new THREE.SphereGeometry(.2, 32, 24), new THREE.MeshStandardMaterial({ roughness: .5, map: tex(256, 128, (g, w, h) => {
    g.fillStyle = '#3d7fd1'; g.fillRect(0, 0, w, h); g.fillStyle = '#86c172';
    [[45, 40, 30, 20], [65, 75, 18, 28], [128, 35, 22, 15], [135, 70, 20, 25], [190, 45, 40, 22]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill(); });
  }) })), -1.3, 1.82, .05); globe.castShadow = true; desk.add(globe);
  desk.add(at(cyl(.1, .13, .08, C.metal, 16, { metalness: .8, roughness: .3 }), -1.3, 1.53, .05));
  const gRing = at(new THREE.Mesh(new THREE.TorusGeometry(.27, .006, 6, 64), glow(CYAN, .8)), -1.3, 1.82, .05); gRing.rotation.x = 1.2; desk.add(gRing);
  const jar = at(cyl(.13, .13, .32, '#fff2cf', 28, { transparent: true, opacity: .7, roughness: .1, metalness: 0, emissive: new THREE.Color('#ffcf73'), emissiveIntensity: 1 }), 1.35, 1.65, .1); desk.add(jar);
  desk.add(at(cyl(.135, .135, .05, '#c8a15a', 28, { metalness: .6, roughness: .3 }), 1.35, 1.83, .1));
  desk.add(at(new THREE.PointLight('#ffc061', 1.6, 2.6, 2), 1.35, 1.75, .3));
  // floating hologram chart above the desk
  const holoTex = tex(512, 256, (g, w, h) => {
    g.strokeStyle = 'rgba(95,220,255,.95)'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = 'rgba(95,220,255,.10)'; g.fillRect(4, 4, w - 8, h - 8);
    g.beginPath(); g.arc(110, 128, 70, 0, 7); g.stroke(); g.beginPath(); g.arc(110, 128, 46, -1.2, 2.6); g.lineWidth = 10; g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(220, 190); [170, 182, 140, 150, 110, 96, 70].forEach((y, i) => g.lineTo(220 + (i + 1) * 38, y)); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 30px monospace'; g.fillText('LIVE', 228, 56);
  });
  const holo = at(new THREE.Mesh(new THREE.PlaneGeometry(1.5, .75), new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })), 0, 3.25, -.1);
  desk.add(holo);

  // standing plant in the back-right corner
  const plant = at(new THREE.Group(), 2.4, 0, -2.3); room.add(plant);
  plant.add(at(cyl(.3, .24, .5, C.white, 24), 0, .25, 0));
  for (let i = 0; i < 7; i++) {
    const lf = mesh(new THREE.SphereGeometry(.26, 12, 8), mat(i % 2 ? '#5aa548' : '#73bb58', { metalness: 0 }));
    lf.scale.set(.32, 1.2, .1); lf.position.set(Math.sin(i * .9) * .2, .95 + (i % 3) * .12, Math.cos(i * .9) * .2); lf.rotation.set(Math.cos(i) * .5, i * .9, Math.sin(i) * .5); plant.add(lf);
  }

  // chair and the seated founder, back to the camera
  const chair = at(new THREE.Group(), 0, 0, -.9); room.add(chair);
  chair.add(at(box(.95, .12, .9, C.white), 0, .74, 0));
  chair.add(at(box(.95, .78, .1, C.white), 0, 1.25, .45));
  chair.add(at(cyl(.05, .05, .6, C.metal, 12, { metalness: .8, roughness: .3 }), 0, .4, 0));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const l = at(box(.06, .05, .55, C.metal, { metalness: .8, roughness: .3 }), Math.sin(a) * .25, .08, Math.cos(a) * .25); l.rotation.y = a; chair.add(l); }
  const avatar = makeAvatar('sit'); avatar.position.set(0, 0, -.95); avatar.rotation.y = Math.PI; room.add(avatar);

  // lights
  scene.add(new THREE.HemisphereLight('#fff6ea', '#d9c3a5', 1.25));
  const sun = new THREE.DirectionalLight('#fff0da', 2.3); sun.position.set(6, 10, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
  scene.add(sun);
  const windowLight = new THREE.DirectionalLight('#cfe6ff', .7); windowLight.position.set(-8, 4, 2); scene.add(windowLight);

  room.position.set(.2, 0, .3);
  const look = new THREE.Vector3(-.2, 1.55, -.6);
  const dir = new THREE.Vector3();
  let mx = 0, my = 0, tmx = 0, tmy = 0, size = { w: 1, h: 1 };
  window.addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  function resize() { size = fit(renderer, camera, canvas); }
  function frame(t, dt) {
    const k = reduce ? 1 : 1 - Math.pow(.002, dt);
    mx += (tmx - mx) * k; my += (tmy - my) * k;
    const land = S().land, a = camera.aspect;
    camera.fov = land ? 30 : 38;
    const dist = land ? (a > 1.6 ? 17.5 : 20.5) : 19.5;
    dir.set(1.05 + mx * .12, .78 - my * .06, 1.15).normalize();
    camera.position.copy(look).addScaledVector(dir, dist);
    camera.lookAt(look);
    // place the diorama: right half on landscape, lower half on portrait
    if (land) camera.setViewOffset(size.w, size.h, -size.w * (a > 1.6 ? .21 : .2), size.h * .03, size.w, size.h);
    else camera.setViewOffset(size.w, size.h, 0, -size.h * .17, size.w, size.h);
    camera.updateProjectionMatrix();
    if (!reduce) {
      holo.position.y = 3.25 + Math.sin(t * 1.3) * .04;
      globe.rotation.y = t * .5; gRing.rotation.z = t * .4;
      jar.material.emissiveIntensity = .9 + Math.sin(t * 2.2) * .2;
      const p = avatar.userData.parts;
      p.armR.el.rotation.x = -.85 + Math.sin(t * 11) * .035; p.armL.el.rotation.x = -.85 + Math.cos(t * 9.5) * .035;
      p.head.rotation.y = Math.sin(t * .5) * .18; p.head.rotation.x = Math.sin(t * .8) * .03;
    }
    renderer.render(scene, camera);
  }
  return { resize, frame };
}

// ---------- 2. hologram lab ----------
function buildLab(canvas) {
  const renderer = makeRenderer(canvas, false);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);

  // grid floor: dots at intersections, faint lines, scrolling slowly, faded at the edges
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uLine: { value: new THREE.Color('#6cc8ff') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uLine;
      void main(){
        vec2 c = vUv * 36.0; c.y += uTime * 0.3;
        vec2 f = abs(fract(c) - 0.5);
        float edge = min(0.5 - f.x, 0.5 - f.y);
        float line = 1.0 - smoothstep(0.0, 0.025, edge);
        float dotm = 1.0 - smoothstep(0.05, 0.085, length(0.5 - f));
        float pattern = max(dotm, line * 0.22);
        float fade = 1.0 - smoothstep(0.08, 0.42, distance(vUv, vec2(0.5)));
        gl_FragColor = vec4(uLine, pattern * fade * 0.85);
      }`,
  }));
  grid.rotation.x = -Math.PI / 2; scene.add(grid);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, map: tex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,8,40,.55)'); gr.addColorStop(1, 'rgba(0,8,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }) }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = .005; scene.add(pool);

  // pedestal
  const ped = new THREE.Group(); scene.add(ped);
  ped.add(at(cyl(1.32, 1.42, .3, '#0a2a7c', 64, { metalness: .5, roughness: .35 }), 0, .15, 0));
  ped.add(at(cyl(1.18, 1.25, .14, '#174fd0', 64, { metalness: .4, roughness: .3, emissive: new THREE.Color('#1f63ff'), emissiveIntensity: .45 }), 0, .37, 0));
  const ring = at(new THREE.Mesh(new THREE.TorusGeometry(1.12, .025, 8, 128), glow(CYAN, 1)), 0, .45, 0); ring.rotation.x = Math.PI / 2; ped.add(ring);
  const ring2 = at(new THREE.Mesh(new THREE.TorusGeometry(1.36, .012, 6, 128), glow(CYAN, .7)), 0, .31, 0); ring2.rotation.x = Math.PI / 2; ped.add(ring2);
  const disc = at(new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), glow(new THREE.Color('#2a8cff'), .35)), 0, .446, 0); disc.rotation.x = -Math.PI / 2; ped.add(disc);
  // light column: brighter at the tube edges and the bottom, fading upwards
  scene.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.1, 3.6, 64, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: CYAN } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform vec3 uColor; void main(){ float rim = pow(1.0 - abs(dot(vN, vV)), 2.0); float a = (0.04 + rim * 0.5) * pow(1.0 - vUv.y, 1.6); gl_FragColor = vec4(uColor, a); }',
  })), 0, 2.25, 0));
  // digital % readout on the pedestal front
  const numCanvas = document.createElement('canvas'); numCanvas.width = 256; numCanvas.height = 96;
  const numTex = new THREE.CanvasTexture(numCanvas); numTex.colorSpace = THREE.SRGBColorSpace;
  let shown = -1;
  function drawNum(v) {
    if (v === shown) return; shown = v;
    const g = numCanvas.getContext('2d'); g.clearRect(0, 0, 256, 96);
    g.font = '80px "VT323", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(186,233,255,.16)'; g.fillText('888', 128, 50);
    g.shadowColor = '#5fdcff'; g.shadowBlur = 14; g.fillStyle = '#bae9ff';
    g.fillText(String(v).padStart(3, '0'), 128, 50);
    numTex.needsUpdate = true;
  }
  drawNum(0);
  if (document.fonts) document.fonts.ready.then(() => { const v = shown; shown = -1; drawNum(v); });
  scene.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.66, .25), new THREE.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false, toneMapped: false })), 0, .16, 1.43));
  // rising particles
  const N = 140, pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.05; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = .45 + Math.random() * 3.6; pos[i * 3 + 2] = Math.sin(a) * r; speed[i] = .25 + Math.random() * .5; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: CYAN, size: .045, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
  // tilted orbit rings
  const orbitA = at(new THREE.Mesh(new THREE.TorusGeometry(1.5, .008, 6, 160), glow(CYAN, .55)), 0, 2.0, 0);
  const orbitB = at(new THREE.Mesh(new THREE.TorusGeometry(1.75, .006, 6, 160), glow(CYAN, .35)), 0, 2.4, 0);
  orbitA.rotation.x = Math.PI / 2 + .35; orbitB.rotation.x = Math.PI / 2 - .25;
  scene.add(orbitA, orbitB);

  // founder: solid body below the scan line, hologram ghost above it
  const base = .45;
  const keep = new THREE.Plane(new THREE.Vector3(0, -1, 0), base);
  const ghostKeep = new THREE.Plane(new THREE.Vector3(0, 1, 0), -base);
  const avatar = makeAvatar('stand'); avatar.position.y = base; scene.add(avatar);
  avatar.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [keep]; } });
  const ghost = makeAvatar('stand'); ghost.position.y = base; scene.add(ghost);
  const ghostMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, clippingPlanes: [ghostKeep] });
  const ghostWire = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, clippingPlanes: [ghostKeep] });
  const ghostMeshes = []; ghost.traverse(o => { if (o.isMesh) ghostMeshes.push(o); });
  ghostMeshes.forEach(o => { o.material = ghostMat; o.add(new THREE.Mesh(o.geometry, ghostWire)); });
  const scan = new THREE.Mesh(new THREE.TorusGeometry(.62, .018, 6, 96), glow(CYAN, 1)); scan.rotation.x = Math.PI / 2; scene.add(scan);
  const scanDisc = new THREE.Mesh(new THREE.CircleGeometry(.62, 48), glow(CYAN, .18)); scanDisc.rotation.x = -Math.PI / 2; scene.add(scanDisc);

  scene.add(new THREE.HemisphereLight('#cfe9ff', '#0a2f9e', .9));
  const key = new THREE.DirectionalLight('#fff4e8', 1.7); key.position.set(3, 7, 7); scene.add(key);
  const rim = new THREE.DirectionalLight('#5fdcff', 2.2); rim.position.set(-4, 4, -5); scene.add(rim);
  scene.add(at(new THREE.PointLight('#5fdcff', 5, 5, 2), 0, .8, .8));

  // HUD anchors
  const anchors = [...document.querySelectorAll('.hud-box[data-anchor]')].map(el => ({ el, v: new THREE.Vector3(...el.dataset.anchor.split(',').map(Number)), left: el.classList.contains('hud-left') }));
  const tmp = new THREE.Vector3();

  let mx = 0, tmx = 0, size = { w: 1, h: 1 }, wasLand = null;
  window.addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; tmx = e.clientX / innerWidth * 2 - 1; }, { passive: true });
  function resize() { size = fit(renderer, camera, canvas); }
  function frame(t, dt) {
    const s = S(), land = s.land;
    const k = reduce ? 1 : 1 - Math.pow(.002, dt);
    mx += (tmx - mx) * k;
    camera.fov = land ? 30 : 40;
    // while the window lifts, the camera settles down onto the stage
    const settle = 1 - smooth(s.pIn);
    if (land) { camera.position.set(mx * .5, 3.7 + settle * 2.2, 11.5 + settle * 2); camera.lookAt(0, 2.3 + settle * .6, 0); }
    else { camera.position.set(mx * .3, 3.6 + settle * 2.2, 12 + settle * 2); camera.lookAt(0, 1.0 + settle * .6, 0); }
    camera.updateProjectionMatrix();

    // materialise from the feet up as the office lifts away
    const m = smooth((s.pIn - .3) / .62);
    const h = base + m * 3.6;
    keep.constant = h; ghostKeep.constant = -h;
    scan.visible = scanDisc.visible = m > 0 && m < 1;
    scan.position.y = scanDisc.position.y = h;
    // turn around to face the visitor during About
    const turn = smooth(s.pSec / .3);
    const sway = reduce ? 0 : Math.sin(t * .45) * .12;
    avatar.rotation.y = ghost.rotation.y = Math.PI * (1 - turn) + sway * turn + mx * .25;
    drawNum(Math.floor(s.pAbout * 100));

    if (!reduce) {
      grid.material.uniforms.uTime.value = t;
      const p = avatar.userData.parts, gp = ghost.userData.parts;
      p.torso.scale.y = gp.torso.scale.y = 1 + Math.sin(t * 1.6) * .012;
      p.head.rotation.x = gp.head.rotation.x = Math.sin(t * .7) * .04;
      ring.scale.setScalar(1 + Math.sin(t * 2) * .02);
      orbitA.rotation.z = t * .3; orbitB.rotation.z = -t * .22;
      const a = pGeo.attributes.position;
      for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + speed[i] * dt; if (y > 4.05) y = .45; a.array[i * 3 + 1] = y; }
      a.needsUpdate = true;
    }
    renderer.render(scene, camera);

    // pin HUD boxes next to the avatar (landscape only)
    if (land) {
      anchors.forEach(({ el, v, left }) => {
        tmp.copy(v).project(camera);
        const x = (tmp.x + 1) / 2 * size.w, y = (1 - tmp.y) / 2 * size.h;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${left ? '-100%' : '0'}, -50%)`;
      });
    } else if (wasLand !== land) anchors.forEach(({ el }) => { el.style.transform = ''; });
    wasLand = land;
  }
  return { resize, frame };
}

// ---------- boot ----------
let office, lab;
try {
  office = buildOffice(document.getElementById('office-canvas'));
  lab = buildLab(document.getElementById('lab-canvas'));
} catch (e) {
  html.classList.add('no-webgl'); finishLoading(); throw e;
}
let running = false, last = performance.now();
function draw(now) {
  const s = S(), t = now / 1000, dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  let any = false;
  if (s.active && s.pIn < 1) { office.frame(t, dt); any = true; }
  if (s.active && s.pIn > .005) { lab.frame(t, dt); any = true; }
  return any;
}
function loop(now) {
  const any = draw(now);
  if (any && !reduce && document.visibilityState === 'visible') requestAnimationFrame(loop); else running = false;
}
function kick() {
  if (document.visibilityState !== 'visible' || running) return;
  running = true; last = performance.now(); requestAnimationFrame(loop);
}
function resizeAll() { office.resize(); lab.resize(); kick(); }
let rz = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resizeAll); }, { passive: true });
document.addEventListener('dht:scroll', kick);
document.addEventListener('visibilitychange', kick);
resizeAll();
requestAnimationFrame(now => { office.frame(now / 1000, 0); lab.frame(now / 1000, 0); finishLoading(); kick(); });
