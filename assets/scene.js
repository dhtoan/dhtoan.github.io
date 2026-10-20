// Home page 3D, all procedural (no downloaded models, textures or fonts):
//  - #office-canvas:  a beige clay-style office; the chibi founder types at his desk with his back to us.
//  - #actor-canvas:   the founder himself, drawn above the office window: while the window lifts away he
//                     jumps out of it, lands on the hologram pedestal and turns into a hologram during About.
//  - #lab-canvas:     the blue hologram lab behind everything (grid floor, pedestal, light column).
//  - #contact-canvas: the founder asleep between shipping boxes in the contact section.
// Layout idea inspired by David Heckhoff's portfolio (david-hckh.com); this code is written from scratch.
// Rendering stops when a scene is off screen or the tab is hidden; reduced motion renders on scroll only.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;
const S = () => window.dhtScroll || { pIn: 0, pAbout: 0, pSec: 0, land: innerWidth >= innerHeight, active: true };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, k) => a + (b - a) * k;
// hero timeline (scroll progress pIn): the chair swivels round, then the founder jumps out and lands on the pedestal
const SWIVEL_END = .22, LAND_AT = .88;
const jumpProgress = pIn => clamp((pIn - SWIVEL_END) / (LAND_AT - SWIVEL_END));
// screen-space pose of the seated founder, written by the office each frame and read by the actor at take-off
const handoff = { ok: false, px: 0, py: 0, hx: 0, hy: 0, yaw: 0, elev: 0 };

function finishLoading(ok) {
  const pct = document.getElementById('loader-pct'), loader = document.getElementById('loader');
  if (pct) pct.textContent = '100%';
  // the page's 7 s fallback may have switched to the no-WebGL layout while three.js was still loading
  if (ok && html.classList.contains('no-webgl')) { html.classList.remove('no-webgl'); dispatchEvent(new Event('resize')); }
  html.classList.add('scene-ready');
  if (loader) setTimeout(() => loader.classList.add('done'), 150);
}

// ---------- helpers ----------
const cache = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache[key]) cache[key] = new THREE.MeshStandardMaterial({ color, roughness: .62, metalness: 0, ...opts });
  return cache[key];
}
const M = c => typeof c === 'string' ? mat(c) : c;
function mesh(geo, m, cast = true) { const o = new THREE.Mesh(geo, M(m)); o.castShadow = cast; o.receiveShadow = true; return o; }
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const rbox = (w, h, d, r, c) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), c);
const cyl = (a, b, h, c, s = 24) => mesh(new THREE.CylinderGeometry(a, b, h, s), c);
const ball = (r, c, s = 20) => mesh(new THREE.SphereGeometry(r, s, Math.round(s * .75)), c);
const caps = (r, l, c) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), c);
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
  r.toneMappingExposure = 1.08;
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
function sunLight(scene, color, intensity, pos, size) {
  const sun = new THREE.DirectionalLight(color, intensity); sun.position.set(...pos); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 40 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
  scene.add(sun); return sun;
}
const shadowCatcher = (w, h, opacity) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShadowMaterial({ color: '#6b4a26', opacity })); m.receiveShadow = true; return m; };
function blob(size, alpha) { // soft contact shadow
  const t = tex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gr.addColorStop(0, `rgba(90,60,30,${alpha})`); gr.addColorStop(1, 'rgba(90,60,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; return m;
}

// ---------- chibi founder: big head, black curtain-bang hair, black tee, rolled-up dark jeans ----------
const SKIN = '#f7d2b2', HAIR = '#2b211b';
function makeChibi() {
  const g = new THREE.Group(), P = {};
  const skin = mat(SKIN, { roughness: .58 }), shirt = mat('#2b2d34', { roughness: .88 }), pants = mat('#20232b', { roughness: .85 });
  const hair = mat(HAIR, { roughness: .62 }), dark = mat('#17110e', { roughness: .15 });
  const pelvis = new THREE.Group(); pelvis.position.y = 1; g.add(pelvis); P.pelvis = pelvis;
  const hips = mesh(new THREE.SphereGeometry(.31, 24, 16), pants); hips.scale.set(1.06, .6, .8); pelvis.add(hips);
  const spine = new THREE.Group(); pelvis.add(spine); P.spine = spine;
  const torso = at(caps(.31, .3, shirt), 0, .36, 0); torso.scale.set(1.1, 1, .8); spine.add(torso); P.torso = torso;
  spine.add(at(cyl(.14, .19, .12, shirt), 0, .72, 0));
  spine.add(at(cyl(.1, .11, .2, skin, 16), 0, .82, 0));
  const head = new THREE.Group(); head.position.y = 1.33; spine.add(head); P.head = head;
  const skull = mesh(new THREE.SphereGeometry(.56, 40, 30), skin); skull.scale.set(1.04, .97, .98); head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(.45, 32, 24), skin); jaw.scale.set(1.04, .78, .94); jaw.position.set(0, -.17, .08); head.add(jaw);
  [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(.12, 16, 12), skin); e.scale.set(.55, 1, .8); e.position.set(.57 * s, -.05, -.02); head.add(e); });
  P.eyes = []; P.lids = [];
  [-1, 1].forEach(s => {
    const eye = at(mesh(new THREE.SphereGeometry(.085, 20, 16), dark, false), .2 * s, -.04, .5); eye.scale.set(.88, 1.22, .5); head.add(eye);
    const hl = at(new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })), .2 * s + .028, 0, .54); head.add(hl);
    const brow = at(caps(.024, .1, hair), .21 * s, .13, .52); brow.rotation.z = Math.PI / 2 + .12 * s; head.add(brow);
    const cheek = at(new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff9f8c', transparent: true, opacity: .35, depthWrite: false })), .33 * s, -.17, .44); cheek.scale.set(1, .6, .3); head.add(cheek);
    P.eyes.push(eye, hl);
    const lid = at(mesh(new THREE.TorusGeometry(.055, .014, 6, 16, Math.PI), dark, false), .2 * s, -.03, .53); lid.rotation.z = Math.PI; lid.visible = false; head.add(lid); P.lids.push(lid);
  });
  head.add(at(ball(.045, '#efbb96', 12), 0, -.1, .55));
  const mouth = at(mesh(new THREE.TorusGeometry(.05, .013, 6, 16, Math.PI), '#7c3b2d', false), 0, -.23, .5); mouth.rotation.z = Math.PI; head.add(mouth);
  // hair: cap, back, curtain bangs parted in the middle, sideburns
  const cap = at(mesh(new THREE.SphereGeometry(.6, 40, 24, 0, Math.PI * 2, 0, Math.PI * .5), hair), 0, .06, -.04); cap.rotation.x = -.28; head.add(cap);
  const back = mesh(new THREE.SphereGeometry(.59, 32, 20, Math.PI, Math.PI, Math.PI * .25, Math.PI * .5), hair); back.scale.set(1.04, 1, 1.03); head.add(back);
  [-1, 1].forEach(s => {
    const bang = at(mesh(new THREE.SphereGeometry(.3, 24, 16), hair), .2 * s, .3, .36); bang.scale.set(1.05, .42, .55); bang.rotation.set(-.35, 0, -.5 * s); head.add(bang);
    const tip = at(mesh(new THREE.SphereGeometry(.16, 16, 12), hair), .43 * s, .1, .3); tip.scale.set(.55, .9, .55); tip.rotation.z = -.3 * s; head.add(tip);
    const burn = at(mesh(new THREE.SphereGeometry(.14, 16, 12), hair), .5 * s, -.02, .14); burn.scale.set(.5, 1.1, .7); head.add(burn);
  });
  function arm(s) {
    const sh = new THREE.Group(); sh.position.set(.4 * s, .62, 0); spine.add(sh);
    // upper arm and forearm share one radius and their round ends are centred on the elbow pivot,
    // so the arm stays one smooth tube however far the elbow bends
    const AR = .088, UP = .33, LOW = .27;
    sh.add(at(caps(AR, UP, skin), 0, -UP / 2, 0));
    sh.add(ball(.15, shirt, 20));
    const sleeve = at(mesh(new THREE.CylinderGeometry(.135, .125, .2, 20), shirt), 0, -.1, 0); sh.add(sleeve);
    const el = new THREE.Group(); el.position.y = -UP; sh.add(el);
    el.add(at(caps(AR, LOW, skin), 0, -LOW / 2, 0));
    const hand = at(ball(.11, skin, 16), 0, -LOW - .02, 0); hand.scale.set(.9, 1, .8); el.add(hand);
    return { sh, el, hand };
  }
  P.armL = arm(-1); P.armR = arm(1);
  function leg(s) {
    const hp = new THREE.Group(); hp.position.set(.16 * s, -.02, 0); pelvis.add(hp);
    const LR = .145, TH = .42, SH = .3; // same trick as the arms: one radius, round ends on the knee pivot
    hp.add(at(caps(LR, TH, pants), 0, -TH / 2, 0));
    const kn = new THREE.Group(); kn.position.y = -TH; hp.add(kn);
    kn.add(at(caps(LR, SH, pants), 0, -SH / 2, 0));
    kn.add(at(cyl(.155, .155, .08, '#2f343e'), 0, -.31, 0));
    kn.add(at(cyl(.1, .1, .07, '#ece9e3', 16), 0, -.37, 0));
    const shoe = new THREE.Group(); shoe.position.set(0, -.46, .07); kn.add(shoe);
    shoe.add(rbox(.27, .15, .42, .07, '#f4f3f0'));
    shoe.add(at(rbox(.29, .06, .45, .03, '#4a4f5c'), 0, -.075, 0));
    shoe.add(at(rbox(.2, .03, .2, .015, '#9aa3b5'), 0, .07, -.02));
    return { hp, kn };
  }
  P.legL = leg(-1); P.legR = leg(1);
  g.userData.parts = P;
  return g;
}
// poses: pelvis height, spine/head tilt, hip/knee bends, shoulder swing/spread, elbow bend
const POSES = {
  stand: { py: 1, sp: 0, hd: 0, hip: [0, 0], kn: [0, 0], shx: [0, 0], shz: [.13, .13], el: [-.15, -.15] },
  sit: { py: 1, sp: .06, hd: .08, hip: [-1.57, -1.57], kn: [1.57, 1.57], shx: [-.95, -.95], shz: [.12, .12], el: [-.75, -.75] },
  fall: { py: 1, sp: -.1, hd: -.2, hip: [-.75, -.2], kn: [1, .5], shx: [-.5, .3], shz: [1.25, 1.1], el: [-.9, -.5] },
  crouch: { py: .72, sp: .35, hd: -.2, hip: [-1.05, -1.05], kn: [1.75, 1.75], shx: [-.6, -.6], shz: [.5, .5], el: [-.5, -.5] },
};
function mixPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], k)) : lerp(a[key], b[key], k);
  return o;
}
function applyPose(P, p) {
  P.pelvis.position.y = p.py; P.spine.rotation.x = p.sp; P.head.rotation.x = p.hd;
  P.legL.hp.rotation.x = p.hip[0]; P.legR.hp.rotation.x = p.hip[1];
  P.legL.kn.rotation.x = p.kn[0]; P.legR.kn.rotation.x = p.kn[1];
  P.armL.sh.rotation.x = p.shx[0]; P.armR.sh.rotation.x = p.shx[1];
  P.armL.sh.rotation.z = -p.shz[0]; P.armR.sh.rotation.z = p.shz[1];
  P.armL.el.rotation.x = p.el[0]; P.armR.el.rotation.x = p.el[1];
}
function closeEyes(P, closed) { P.eyes.forEach(e => { e.visible = !closed; }); P.lids.forEach(l => { l.visible = closed; }); }

// ---------- 1. office ----------
function buildOffice(canvas) {
  const renderer = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const room = new THREE.Group(); scene.add(room);
  const W = '#ffffff', WOOD = '#dfb88a', DARK = '#3d3f4a';
  // small baked room reflection so metal, glass and crystal read as shiny
  const shine = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const alu = new THREE.MeshStandardMaterial({ color: '#d5d8dd', metalness: .75, roughness: .32, envMap: shine, envMapIntensity: 1.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#0d0e11', metalness: .2, roughness: .12, envMap: shine, envMapIntensity: .8 });

  // floor and back wall only catch shadows, so the room melts into the page background
  const floor = shadowCatcher(40, 40, .14); floor.rotation.x = -Math.PI / 2; room.add(floor);
  const wall = shadowCatcher(40, 14, .1); wall.position.set(0, 7, -2.95); room.add(wall);

  // layered square rug
  [['#e58a2b', 4.8], ['#f3c456', 4.25], ['#ec9b36', 3.75], ['#f6dc85', 3.2]].forEach(([c, s], i) => {
    const r = rbox(s, .05, s, .04, mat(c, { roughness: .95 })); r.position.set(.1, .025 + i * .012, -.55); r.castShadow = false; room.add(r);
  });

  // shelf with books and a plant, pinboard with notes
  const shelf = at(new THREE.Group(), -1.55, 2.8, -2.72); room.add(shelf);
  shelf.add(rbox(1.6, .08, .4, .03, WOOD));
  [['#f0a64a', .5, -.55], ['#8ea4c8', .56, -.41], ['#ece7df', .46, -.28]].forEach(([c, h, x]) => shelf.add(at(rbox(.12, h, .32, .02, c), x, .04 + h / 2, 0)));
  shelf.add(at(cyl(.13, .1, .2, W, 20), .47, .14, 0));
  [[0, .36, 0, .17], [-.08, .3, .05, .12], [.09, .32, -.03, .13]].forEach(([x, y, z, r]) => { const l = at(ball(r, '#7cc35b', 14), .47 + x, y, z); l.scale.y = 1.35; shelf.add(l); });
  const board = at(new THREE.Group(), 1.35, 3.2, -2.86); room.add(board);
  board.add(rbox(1.9, 1.3, .08, .06, '#e7cfa8'));
  board.add(at(rbox(1.72, 1.12, .04, .03, '#b39377'), 0, 0, .04));
  [['#bcd3f2', -.45, .18, .1], ['#ffffff', .4, -.15, -.08], ['#fff0a8', -.1, -.25, .05]].forEach(([c, x, y, r]) => {
    const n = at(rbox(.46, .55, .012, .005, c), x, y, .075); n.rotation.z = r; n.castShadow = false; board.add(n);
    const pin = at(cyl(.085, .085, .07, '#e5636b', 20), x - .02, y + .2, .12); pin.rotation.x = Math.PI / 2; board.add(pin);
    board.add(at(ball(.07, '#ea7077', 16), x - .02, y + .2, .17));
  });

  // desk
  const desk = at(new THREE.Group(), 0, 0, -2.15); room.add(desk);
  desk.add(at(rbox(3.7, .12, 1.25, .05, W), 0, 1.42, 0));
  [[-1.68, -.48], [1.68, -.48], [-1.68, .48], [1.68, .48]].forEach(([x, z]) => desk.add(at(cyl(.055, .07, 1.38, WOOD, 14), x, .69, z)));
  function screenTex(kind) {
    return tex(512, 300, (g, w, h) => {
      g.fillStyle = '#2b2d38'; g.fillRect(0, 0, w, h);
      const cols = ['#7aa2f7', '#9ece6a', '#e0af68', '#f7768e', '#bb9af7', '#73daca'];
      if (kind === 'code') {
        for (let i = 0; i < 13; i++) { let x = 24 + (i % 4) * 16; for (let k = 0; k < 3; k++) { const len = 24 + ((i * 13 + k * 29) % 90); g.fillStyle = cols[(i + k) % 6]; g.fillRect(x, 20 + i * 20, len, 7); x += len + 10; } }
      } else { // store dashboard
        g.fillStyle = '#353846'; g.fillRect(0, 0, 70, h);
        for (let i = 0; i < 6; i++) { g.fillStyle = i === 1 ? '#5fdcff' : '#5a5e70'; g.fillRect(16, 22 + i * 30, 38, 8); }
        g.fillStyle = '#3b3f50'; [[88, 20], [228, 20], [368, 20]].forEach(([x, y]) => g.fillRect(x, y, 124, 60));
        g.fillStyle = '#9ece6a'; g.fillRect(100, 40, 56, 10); g.fillStyle = '#e0af68'; g.fillRect(240, 40, 70, 10); g.fillStyle = '#f7768e'; g.fillRect(380, 40, 44, 10);
        g.strokeStyle = '#5fdcff'; g.lineWidth = 5; g.beginPath(); g.moveTo(92, 260);
        [246, 236, 214, 222, 190, 176, 150, 128].forEach((y, i) => g.lineTo(92 + (i + 1) * 48, y)); g.stroke();
      }
    });
  }
  [[-.82, .2, 'shop'], [.82, -.2, 'code']].forEach(([x, ry, kind]) => {
    const m = new THREE.Group();
    m.add(rbox(1.56, .9, .05, .025, alu));                     // aluminium enclosure
    m.add(at(rbox(1.53, .87, .012, .02, glass), 0, 0, .027));  // black glass front, thin bezel
    m.add(at(new THREE.Mesh(new THREE.PlaneGeometry(1.45, .8), new THREE.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false })), 0, 0, .035));
    const arm = at(rbox(.3, .66, .03, .012, alu), 0, -.5, -.16); arm.rotation.x = .32; m.add(arm); // slanted stand
    m.add(at(rbox(.36, .022, .36, .01, alu), 0, -.8, -.2));                                     // foot
    m.position.set(x, 2.31, -.22); m.rotation.y = ry; desk.add(m);
  });
  desk.add(at(rbox(1.05, .05, .32, .02, '#e9e8e4'), 0, 1.505, .3));
  desk.add(at(rbox(.13, .05, .2, .04, '#e9e8e4'), .78, 1.505, .32));
  // pencil cup, JD tiger figurine, desk globe, glowing lace-ball lamp
  // two compact aluminium desktop computers, stacked at the right end where the camera can see them
  [[0, -.12], [.2, -.06]].forEach(([y, ry]) => {
    const pc = at(new THREE.Group(), 1.5, 1.48 + y, -.3); pc.rotation.y = ry; desk.add(pc);
    pc.add(at(rbox(.4, .19, .4, .05, alu), 0, .095, 0));
    pc.add(at(rbox(.36, .012, .36, .006, '#8f939a'), 0, .006, 0));          // darker base ring
    [-.1, -.04].forEach(px => pc.add(at(rbox(.035, .015, .01, .005, '#2b2d33'), px, .1, .2))); // front ports
    pc.add(at(rbox(.07, .012, .01, .005, '#2b2d33'), .08, .1, .2));                           // card slot
    pc.add(at(new THREE.Mesh(new THREE.CircleGeometry(.008, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })), -.16, .06, .201));
  });
  const cup = at(new THREE.Group(), -1.55, 1.48, .1); desk.add(cup);
  cup.add(at(cyl(.11, .1, .3, '#c6dcf3', 20), 0, .15, 0));
  [['#f4a64a', -.03, .1], ['#e2585a', .04, -.12]].forEach(([c, x, r]) => { const p = at(cyl(.022, .022, .42, c, 8), x, .38, 0); p.rotation.z = r; cup.add(p); });
  const fur = new THREE.MeshStandardMaterial({ roughness: .8, map: tex(128, 64, (g, w, h) => { g.fillStyle = '#f0913a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2d241c'; for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 3, 0, 5, 22); }) });
  const tiger = at(new THREE.Group(), -1.1, 1.48, .3); tiger.rotation.y = .6; desk.add(tiger);
  tiger.add(at(mesh(new THREE.SphereGeometry(.13, 18, 12), fur), 0, .12, 0));
  tiger.add(at(mesh(new THREE.SphereGeometry(.13, 18, 12), fur), 0, .32, .03));
  [-1, 1].forEach(s => { tiger.add(at(ball(.04, '#f0913a', 10), .08 * s, .43, .02)); tiger.add(at(ball(.018, '#1a120d', 8), .045 * s, .34, .15)); });
  tiger.add(at(ball(.05, '#fff4e6', 10), 0, .29, .14));
  const globe = at(new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 24), new THREE.MeshStandardMaterial({ roughness: .5, map: tex(256, 128, (g, w, h) => {
    g.fillStyle = '#4f8fe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#8cc878';
    [[45, 40, 30, 20], [65, 75, 18, 28], [128, 35, 22, 15], [135, 70, 20, 25], [190, 45, 40, 22]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0, 0, 7); g.fill(); });
  }) })), 1.12, 1.79, .3); globe.castShadow = true; desk.add(globe);
  desk.add(at(cyl(.07, .12, .14, WOOD, 16), 1.12, 1.55, .3));
  const speaker = at(new THREE.Group(), 1.6, 1.48, .3); speaker.rotation.y = -.35; desk.add(speaker);
  speaker.add(at(rbox(.34, .4, .3, .06, '#f2a33a'), 0, .2, 0));
  const cone = at(cyl(.12, .12, .03, '#3b3e48', 24), 0, .22, .155); cone.rotation.x = Math.PI / 2; speaker.add(cone);
  speaker.add(at(ball(.05, '#5b5f6b', 14), 0, .22, .16));

  // framed family portrait on the wall, right of the board: Baba (left) and Mama (right) kiss the baby's cheeks
  const picFrame = at(new THREE.Group(), 3.0, 2.4, -2.86); picFrame.rotation.z = -.05; room.add(picFrame);
  picFrame.add(rbox(1.25, .95, .1, .1, '#d9b48a'));
  picFrame.add(at(rbox(1.0, .72, .04, .05, '#fbf6ee'), 0, 0, .05));
  const pic = tex(512, 363, (g, w, h) => {
    const SKIN = '#f7d2b2', BLUSH = 'rgba(255,140,130,.45)', INK = '#2b201b';
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#fde9d6'); bg.addColorStop(1, '#f7cfc0');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.35)';
    [[60, 60, 26], [450, 70, 34], [420, 300, 22], [80, 280, 18], [250, 40, 14]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    const ell = (x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); };
    // bodies: Baba's black tee, Mama's pink top, the baby's yellow onesie
    ell(120, 400, 128, 112, '#2b2d34'); ell(392, 400, 128, 112, '#f2a7b6'); ell(256, 392, 78, 70, '#ffd36b');
    // Mama's long hair falls behind her head and shoulders
    ell(374, 232, 92, 112, '#3a2a22', -.28);
    function parent(cx, cy, r, rot, side, hair) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      ell(-r * .98 * side, 0, r * .16, r * .22, SKIN);            // outer ear
      ell(0, 0, r, r * .96, SKIN);
      ell(-r * .45 * side, r * .32, r * .2, r * .12, BLUSH);
      // closed, happy eyes
      g.strokeStyle = INK; g.lineWidth = r * .07; g.lineCap = 'round';
      [-.42, .18].forEach(ex => { g.beginPath(); g.arc(ex * r * side, r * .05, r * .13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); });
      // hair cap with bangs
      g.fillStyle = hair; g.beginPath();
      g.arc(0, 0, r * 1.04, Math.PI * 1.02, Math.PI * 1.98);
      g.quadraticCurveTo(r * .6, -r * .1, r * .25, -r * .35); g.quadraticCurveTo(0, -r * .15, -r * .3, -r * .38); g.quadraticCurveTo(-r * .7, -r * .15, -r * 1.02, -r * .05);
      g.fill();
      g.restore();
    }
    function lips(cx, cy, r, rot, side) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      const lx = r * .8 * side, ly = r * .3;
      ell(lx, ly, r * .13, r * .11, '#e0607a'); ell(lx + r * .01 * side, ly, r * .06, r * .05, '#a83652');
      g.restore();
    }
    parent(152, 198, 76, .28, 1, '#1d1714');    // Baba
    parent(360, 198, 76, -.28, -1, '#3a2a22');  // Mama
    // the baby, in front
    const bx = 256, by = 216, br = 64;
    ell(bx - br * .96, by + 4, br * .15, br * .2, SKIN); ell(bx + br * .96, by + 4, br * .15, br * .2, SKIN);
    ell(bx, by, br, br * .95, SKIN);
    ell(bx - br * .5, by + br * .32, br * .2, br * .13, BLUSH); ell(bx + br * .5, by + br * .32, br * .2, br * .13, BLUSH);
    [-1, 1].forEach(sd => { ell(bx + sd * br * .32, by + br * .02, br * .11, br * .14, INK); ell(bx + sd * br * .32 + br * .04, by - br * .04, br * .04, br * .04, '#ffffff'); });
    g.fillStyle = '#c94a5a'; g.beginPath(); g.ellipse(bx, by + br * .4, br * .16, br * .13, 0, 0, Math.PI); g.fill();
    g.strokeStyle = '#5a3a2a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx - 4, by - br * .9); g.quadraticCurveTo(bx + 14, by - br * 1.25, bx + 4, by - br * 1.32); g.stroke();
    // little hearts
    function heart(x, y, sz, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + sz * .35); g.bezierCurveTo(x - sz, y - sz * .3, x - sz * .45, y - sz, x, y - sz * .4); g.bezierCurveTo(x + sz * .45, y - sz, x + sz, y - sz * .3, x, y + sz * .35); g.fill(); }
    // the kisses land on the baby's cheeks
    lips(152, 198, 76, .28, 1); lips(360, 198, 76, -.28, -1);
    heart(196, 196, 11, '#ff5d7e'); heart(316, 196, 11, '#ff5d7e');
    heart(256, 96, 22, '#ff6f8b'); heart(214, 118, 14, '#ff8fa5'); heart(300, 112, 16, '#ff8fa5');
  });
  picFrame.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.96, .68), new THREE.MeshStandardMaterial({ map: pic, roughness: .8 })), 0, 0, .075));

  // play-button award plaques (silver and gold on the wall, diamond crystal on the shelf)
  function playShape(w, h, r) {
    const sh = new THREE.Shape(), x = -w / 2, y = -h / 2;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r);
    sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    const tri = new THREE.Path(); tri.moveTo(-h * .2, -h * .26); tri.lineTo(h * .32, 0); tri.lineTo(-h * .2, h * .26); tri.lineTo(-h * .2, -h * .26);
    sh.holes.push(tri); return sh;
  }
  const nameTex = tex(256, 48, (g, w, h) => {
    g.fillStyle = '#2a2b31'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9dce2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 24px Urbanist, system-ui, sans-serif';
    g.fillText('Do Huy Toan', w / 2, h / 2 + 1);
  });
  if (document.fonts) document.fonts.ready.then(() => { const c = nameTex.image, g = c.getContext('2d'); g.fillStyle = '#2a2b31'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#d9dce2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 24px Urbanist, system-ui, sans-serif'; g.fillText('Do Huy Toan', c.width / 2, c.height / 2 + 1); nameTex.needsUpdate = true; });
  [['#b9bfc7', '#ffffff', -3.95], ['#d29a22', '#ffe7a3', -3.1]].forEach(([plate, logo, x]) => {
    const aw = at(new THREE.Group(), x, 2.5, -2.86); aw.scale.setScalar(1.3); room.add(aw);
    aw.add(rbox(.62, .8, .06, .025, '#1b1c21'));
    const plateM = new THREE.MeshStandardMaterial({ color: plate, metalness: .55, roughness: .3, envMap: shine, envMapIntensity: 1.7 });
    aw.add(at(rbox(.53, .7, .02, .012, plateM), 0, 0, .035));
    const logoM = new THREE.MeshStandardMaterial({ color: logo, metalness: .7, roughness: .12, envMap: shine, envMapIntensity: 2.4 });
    const btn = at(mesh(new THREE.ExtrudeGeometry(playShape(.3, .21, .06), { depth: .02, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 2, curveSegments: 10 }), logoM, false), 0, .07, .046); aw.add(btn);
    aw.add(at(rbox(.32, .06, .012, .004, plateM), 0, -.25, .048));
    aw.add(at(new THREE.Mesh(new THREE.PlaneGeometry(.28, .045), new THREE.MeshStandardMaterial({ map: nameTex, roughness: .4 })), 0, -.25, .055));
  });
  // diamond: a faceted crystal play button standing on a dark base on the shelf
  const diamond = at(new THREE.Group(), .06, .04, .02); diamond.scale.setScalar(1.3); shelf.add(diamond);
  diamond.add(at(rbox(.42, .07, .2, .02, '#1f2026'), 0, .035, 0));
  const crystalM = new THREE.MeshStandardMaterial({ color: '#5cc2ff', metalness: .25, roughness: .08, envMap: shine, envMapIntensity: 1.1, emissive: new THREE.Color('#1d8cff'), emissiveIntensity: .22, flatShading: true });
  const crystal = at(mesh(new THREE.ExtrudeGeometry(playShape(.36, .26, .07), { depth: .06, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 1, curveSegments: 4 }), crystalM, false), 0, .07 + .13 + .03, -.03);
  diamond.add(crystal);
  const sparkle = at(new THREE.PointLight('#bfefff', .6, 1.2, 2), 0, .25, .25); diamond.add(sparkle);

  // big potted plant in the front-right corner
  const plant = at(new THREE.Group(), 2.4, 0, -2.05); plant.scale.setScalar(.82); room.add(plant);
  [['#f1eee8', 0], ['#b99a7c', 1], ['#f1eee8', 2], ['#b99a7c', 3]].forEach(([c, i]) => plant.add(at(cyl(.5 - i * .025, .5 - (i + 1) * .025, .22, c, 32), 0, .11 + i * .22, 0)));
  plant.add(at(cyl(.47, .47, .04, '#6b4a33', 32), 0, .86, 0));
  const leafM = mat('#86c93c', { roughness: .55 }), leafD = mat('#6aae2c', { roughness: .55 });
  [[0, .15, 1.15], [1.3, .35, 1.0], [2.5, .3, .95], [3.7, .4, 1.1], [5, .25, 1.0], [.7, .05, .8], [4.3, .1, .85]].forEach(([a, lean, len], i) => {
    const leaf = mesh(new THREE.SphereGeometry(.5, 20, 14), i % 2 ? leafD : leafM);
    leaf.scale.set(.32, len, .08); leaf.position.y = len * .5;
    const holder = at(new THREE.Group(), 0, .86, 0); holder.rotation.set(0, a, .25 + lean); holder.add(leaf); plant.add(holder);
  });

  // chair with a sled base; chair and founder swivel together
  const chair = at(new THREE.Group(), 0, 0, -.9); room.add(chair);
  chair.add(at(rbox(1, .14, .92, .07, W), 0, .78, 0));
  const back = at(rbox(1, .9, .12, .06, W), 0, 1.33, .47); back.rotation.x = -.1; chair.add(back);
  const chrome = mat('#c9ced6', { metalness: .7, roughness: .3 });
  [-1, 1].forEach(s => {
    const path = new THREE.CatmullRomCurve3([[.44 * s, .72, .38], [.44 * s, .05, .46], [.44 * s, .04, -.46], [.44 * s, .72, -.38]].map(p => new THREE.Vector3(...p)));
    chair.add(mesh(new THREE.TubeGeometry(path, 40, .035, 8), chrome));
  });

  const avatar = makeChibi(); applyPose(avatar.userData.parts, POSES.sit);
  avatar.position.set(0, -.08, -.08); avatar.rotation.y = Math.PI; chair.add(avatar);
  const winEl = document.getElementById('window'), pv = new THREE.Vector3(), hv = new THREE.Vector3();
  function toScreen(v) { // office world -> page pixels, including the CSS lift/tilt of the window
    v.project(camera);
    let x = (v.x + 1) / 2 * size.w, y = (1 - v.y) / 2 * size.h;
    const tr = getComputedStyle(winEl).transform;
    if (tr && tr !== 'none') { const q = new DOMMatrix(tr).transformPoint(new DOMPoint(x - size.w / 2, y - size.h)); x = q.x + size.w / 2; y = q.y + size.h; }
    return [x, y];
  }

  scene.add(new THREE.HemisphereLight('#fff7ec', '#e2c9a6', 1.35));
  sunLight(scene, '#fff1dc', 2.2, [5, 10, 8], 7);
  const fill = new THREE.DirectionalLight('#dfeaff', .45); fill.position.set(-8, 5, 3); scene.add(fill);

  const look = new THREE.Vector3(.1, 1.7, -1.1), dir = new THREE.Vector3();
  let mx = 0, my = 0, tmx = 0, tmy = 0, size = { w: 1, h: 1 };
  window.addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  function resize() { size = fit(renderer, camera, canvas); }
  function frame(t, dt) {
    const k = reduce ? 1 : 1 - Math.pow(.002, dt);
    mx += (tmx - mx) * k; my += (tmy - my) * k;
    const land = S().land, a = camera.aspect;
    camera.fov = land ? 30 : 34;
    const dist = land ? (a > 1.6 ? 10.2 : 11.6) : 17;
    dir.set(.95 + mx * .1, .62 - my * .05, 1.2).normalize();
    camera.position.copy(look).addScaledVector(dir, dist);
    camera.lookAt(look);
    // the room fills the right side on landscape, the lower part on portrait
    if (land) camera.setViewOffset(size.w, size.h, -size.w * .14, -size.h * .035, size.w, size.h);
    else camera.setViewOffset(size.w, size.h, 0, -size.h * .14, size.w, size.h);
    camera.updateProjectionMatrix();
    // swivel round to face the visitor, then he is handed over to the actor canvas
    const pIn = S().pIn, sw = smooth(pIn / SWIVEL_END), az = Math.atan2(dir.x, dir.z);
    chair.rotation.y = (Math.atan2(.95, 1.2) - Math.PI) * sw;
    avatar.visible = jumpProgress(pIn) <= 0;
    const p = avatar.userData.parts, typing = reduce ? 0 : 1 - sw;
    p.armR.el.rotation.x = -.75 - sw * .35 + Math.sin(t * 11) * .04 * typing; p.armL.el.rotation.x = -.75 - sw * .35 + Math.cos(t * 9.5) * .04 * typing;
    p.head.rotation.y = (reduce ? 0 : Math.sin(t * .5) * .2) * typing; p.head.rotation.x = .08 * (1 - sw) + (reduce ? 0 : Math.sin(t * .8) * .03);
    if (!reduce) { globe.rotation.y = t * .5; sparkle.intensity = .5 + Math.sin(t * 1.7) * .25; }
    renderer.render(scene, camera);
    p.pelvis.getWorldPosition(pv); p.head.getWorldPosition(hv);
    [handoff.px, handoff.py] = toScreen(pv); [handoff.hx, handoff.hy] = toScreen(hv);
    handoff.yaw = Math.PI + chair.rotation.y - az; handoff.elev = Math.asin(dir.y); handoff.ok = true;
  }
  return { resize, frame };
}

// ---------- 2. hologram lab + 3. the founder above the window ----------
function buildLab(canvas, actorCanvas) {
  const renderer = makeRenderer(canvas, false);
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
  ped.add(at(cyl(1.32, 1.42, .3, mat('#0a2a7c', { metalness: .5, roughness: .35 }), 64), 0, .15, 0));
  ped.add(at(cyl(1.18, 1.25, .14, mat('#174fd0', { metalness: .4, roughness: .3, emissive: new THREE.Color('#1f63ff'), emissiveIntensity: .45 }), 64), 0, .37, 0));
  const ring = at(new THREE.Mesh(new THREE.TorusGeometry(1.12, .025, 8, 128), glow(CYAN, 1)), 0, .45, 0); ring.rotation.x = Math.PI / 2; ped.add(ring);
  const ring2 = at(new THREE.Mesh(new THREE.TorusGeometry(1.36, .012, 6, 128), glow(CYAN, .7)), 0, .31, 0); ring2.rotation.x = Math.PI / 2; ped.add(ring2);
  const disc = at(new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), glow(new THREE.Color('#2a8cff'), .35)), 0, .446, 0); disc.rotation.x = -Math.PI / 2; ped.add(disc);
  scene.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.1, 3.6, 64, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: CYAN }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform vec3 uColor; uniform float uOn; void main(){ float rim = pow(1.0 - abs(dot(vN, vV)), 2.0); float a = (0.04 + rim * 0.5) * pow(1.0 - vUv.y, 1.6) * uOn; gl_FragColor = vec4(uColor, a); }',
  })), 0, 2.25, 0));
  const column = scene.children[scene.children.length - 1];
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
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: CYAN, size: .045, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  scene.add(points);
  const orbitA = at(new THREE.Mesh(new THREE.TorusGeometry(1.5, .008, 6, 160), glow(CYAN, 0)), 0, 2.0, 0);
  const orbitB = at(new THREE.Mesh(new THREE.TorusGeometry(1.75, .006, 6, 160), glow(CYAN, 0)), 0, 2.4, 0);
  orbitA.rotation.x = Math.PI / 2 + .35; orbitB.rotation.x = Math.PI / 2 - .25;
  scene.add(orbitA, orbitB);

  // ---- the founder (own transparent canvas above the office window) ----
  const actorR = makeRenderer(actorCanvas, false); actorR.localClippingEnabled = true;
  const actorScene = new THREE.Scene();
  const base = .45, SC = 1.15, HT = 2.95 * SC;
  const solidKeep = new THREE.Plane(new THREE.Vector3(0, 1, 0), -base);
  const ghostKeep = new THREE.Plane(new THREE.Vector3(0, -1, 0), base);
  const hero = new THREE.Group(); hero.rotation.order = 'ZXY'; actorScene.add(hero);
  const fwd = new THREE.Vector3(), ray = new THREE.Vector3(), start = new THREE.Vector3(), ctrl = new THREE.Vector3(), end = new THREE.Vector3(0, base, 0), takeoff = new THREE.Vector3();
  let tookOff = false;
  const solid = makeChibi(); solid.scale.setScalar(SC); hero.add(solid);
  solid.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [solidKeep]; } });
  const ghost = makeChibi(); ghost.scale.setScalar(SC); hero.add(ghost);
  const ghostMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, clippingPlanes: [ghostKeep] });
  const ghostWire = new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, clippingPlanes: [ghostKeep] });
  const ghostMeshes = []; ghost.traverse(o => { if (o.isMesh) ghostMeshes.push(o); });
  // depth pre-pass: the ghost's own surfaces hide each other, so only the outer skin glows
  // and overlapping parts (joints, sleeves) don't show as bright seams
  const ghostDepth = new THREE.MeshBasicMaterial({ colorWrite: false, clippingPlanes: [ghostKeep], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  ghostMeshes.forEach(o => {
    o.material = ghostMat; o.renderOrder = 2;
    const w = new THREE.Mesh(o.geometry, ghostWire); w.renderOrder = 3; o.add(w);
    const d = new THREE.Mesh(o.geometry, ghostDepth); d.renderOrder = 1; o.add(d);
  });
  const scan = new THREE.Mesh(new THREE.TorusGeometry(.75, .02, 6, 96), glow(CYAN, 1)); scan.rotation.x = Math.PI / 2; actorScene.add(scan);
  const scanDisc = new THREE.Mesh(new THREE.CircleGeometry(.75, 48), glow(CYAN, .16)); scanDisc.rotation.x = -Math.PI / 2; actorScene.add(scanDisc);
  actorScene.add(new THREE.HemisphereLight('#f4f8ff', '#8a7a6a', 1.2));
  const key = new THREE.DirectionalLight('#fff4e8', 2); key.position.set(3, 7, 8); actorScene.add(key);
  const rim = new THREE.DirectionalLight('#5fdcff', 0); rim.position.set(-4, 4, -5); actorScene.add(rim);
  const rim2 = new THREE.DirectionalLight('#5fdcff', 0); rim2.position.set(4, 2, -4); actorScene.add(rim2);

  scene.add(new THREE.HemisphereLight('#cfe9ff', '#0a2f9e', .9));
  const lkey = new THREE.DirectionalLight('#fff4e8', 1.7); lkey.position.set(3, 7, 7); scene.add(lkey);
  scene.add(at(new THREE.PointLight('#5fdcff', 5, 5, 2), 0, .8, .8));

  // HUD anchors (in pedestal space, avatar scale)
  const anchors = [...document.querySelectorAll('.hud-box[data-anchor]')].map(el => ({ el, v: new THREE.Vector3(...el.dataset.anchor.split(',').map(Number)), left: el.classList.contains('hud-left') }));
  const tmp = new THREE.Vector3();

  let mx = 0, tmx = 0, size = { w: 1, h: 1 }, wasLand = null, actorShown = true;
  window.addEventListener('pointermove', e => { if (reduce || e.pointerType !== 'mouse') return; tmx = e.clientX / innerWidth * 2 - 1; }, { passive: true });
  function resize() { size = fit(renderer, camera, canvas); fit(actorR, camera, actorCanvas); camera.aspect = size.w / Math.max(1, size.h); }
  function frame(t, dt) {
    const s = S(), land = s.land;
    const k = reduce ? 1 : 1 - Math.pow(.002, dt);
    mx += (tmx - mx) * k;
    camera.fov = land ? 30 : 40;
    const settle = 1 - smooth(s.pIn);
    if (land) { camera.position.set(mx * .5, 3.7 + settle * 1.6, 11.5 + settle * 1.5); camera.lookAt(0, 2.25 + settle * .5, 0); }
    else { camera.position.set(mx * .3, 3.6 + settle * 1.6, 12 + settle * 1.5); camera.lookAt(0, 1.0 + settle * .5, 0); }
    camera.updateProjectionMatrix();

    // the jump: from the chair (matched to where the office drew him), towards the camera, down onto the pedestal
    const f = jumpProgress(s.pIn);
    const showActor = f > 0;
    if (!showActor) tookOff = false;
    if (showActor !== actorShown) { actorShown = showActor; actorCanvas.style.visibility = showActor ? '' : 'hidden'; }
    // start point: the seated founder's pelvis on screen, pushed to the depth that gives the same size
    camera.updateMatrixWorld();
    const ndcX = handoff.px / size.w * 2 - 1, ndcY = 1 - handoff.py / size.h * 2;
    const dpx = Math.max(8, Math.hypot(handoff.hx - handoff.px, handoff.hy - handoff.py));
    const depth = 1.33 * SC * (size.h / 2) / Math.tan(camera.fov * Math.PI / 360) / dpx;
    camera.getWorldDirection(fwd);
    ray.set(ndcX, ndcY, .5).unproject(camera).sub(camera.position).normalize();
    start.copy(camera.position).addScaledVector(ray, depth / Math.max(.2, ray.dot(fwd))); start.y -= SC;
    const e = smooth(f), u = 1 - e;
    // the curve's control point is fixed at take-off; only the start keeps following the lifting window
    if (!tookOff || f < .02) { takeoff.copy(start); tookOff = true; }
    ctrl.set(takeoff.x * .5, Math.max(takeoff.y, base) + 1.2, takeoff.z * .5 + 2.2);
    hero.position.set(0, 0, 0).addScaledVector(start, u * u).addScaledVector(ctrl, 2 * u * e).addScaledVector(end, e * e);
    // pose: seated -> airborne -> crouch on landing -> standing
    const rise = smooth(f / .3), air = 1 - smooth((f - .78) / .1), crouch = smooth((f - .84) / .07) * (1 - smooth((f - .93) / .07));
    let pose = mixPose(POSES.stand, mixPose(POSES.sit, POSES.fall, rise), air); pose = mixPose(pose, POSES.crouch, crouch);
    const sway = reduce ? 0 : Math.sin(t * .45) * .12;
    // orientation: same yaw, camera pitch and on-screen roll as the office drew him, easing to face the visitor
    camera.getWorldDirection(fwd);
    const roll = Math.atan2(handoff.hx - handoff.px, handoff.py - handoff.hy);
    const k0 = 1 - smooth(f / .55);
    hero.rotation.set((handoff.elev - Math.asin(-fwd.y)) * k0, handoff.yaw * k0 + (sway * (1 - air) + mx * .25) * e, -roll * k0);
    if (!reduce && f >= 1) { pose.sp += Math.sin(t * 1.6) * .015; pose.hd += Math.sin(t * .7) * .04; }
    applyPose(solid.userData.parts, pose); applyPose(ghost.userData.parts, pose);
    const landed = smooth((f - .85) / .15);
    rim.intensity = landed * 2.2; rim2.intensity = landed * 1.2; key.intensity = 2 - landed * .3;
    column.material.uniforms.uOn.value = landed;
    points.material.opacity = landed * .9; orbitA.material.opacity = landed * .55; orbitB.material.opacity = landed * .35;

    // during About the founder turns into a hologram from the feet up
    const m = f < 1 ? 0 : smooth((s.pSec - .15) / .75);
    const h = base + m * (HT + .1);
    solidKeep.constant = -h; ghostKeep.constant = h;
    scan.visible = scanDisc.visible = m > 0 && m < 1;
    scan.position.y = scanDisc.position.y = h;
    drawNum(Math.floor(s.pAbout * 100));

    if (!reduce) {
      grid.material.uniforms.uTime.value = t;
      ring.scale.setScalar(1 + Math.sin(t * 2) * .02);
      orbitA.rotation.z = t * .3; orbitB.rotation.z = -t * .22;
      const a = pGeo.attributes.position;
      for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + speed[i] * dt; if (y > 4.05) y = .45; a.array[i * 3 + 1] = y; }
      a.needsUpdate = true;
    }
    renderer.render(scene, camera);
    if (showActor) actorR.render(actorScene, camera);

    // pin HUD boxes next to the founder (landscape only)
    if (land) {
      anchors.forEach(({ el, v, left }) => {
        tmp.copy(v).project(camera);
        const x = (tmp.x + 1) / 2 * size.w, y = (1 - tmp.y) / 2 * size.h;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${left ? '-100%' : '0'}, -50%)`;
      });
    } else if (wasLand !== land) anchors.forEach(({ el }) => { el.style.transform = ''; });
    wasLand = land;
  }
  function idle() { if (actorShown) { actorShown = false; actorCanvas.style.visibility = 'hidden'; } }
  return { resize, frame, idle };
}

// ---------- 4. contact: standing guard over the parcels, dozing off when nobody moves ----------
// Awake: arms crossed, head follows the mouse. After a while without the pointer moving (on touch screens
// a few seconds after the last tap) he falls asleep on his feet: head drops, eyes close, arms hang, Zs rise.
function buildContact(canvas) {
  const renderer = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
  const floor = shadowCatcher(40, 40, .15); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const card = mat('#dcbf98', { roughness: .9 }), tape = mat('#c9a679', { roughness: .65 });
  const labelTex = tex(128, 96, (g, w, h) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, w, h); g.fillStyle = '#4a463e';
    for (let i = 0; i < 4; i++) g.fillRect(12, 14 + i * 14, 60 + (i % 2) * 30, 6);
    for (let i = 0; i < 22; i++) g.fillRect(12 + i * 4.5, 74, i % 3 ? 2 : 3, 14);
  });
  function parcel(w, h, d, x, z, ry, y = 0, label = true) {
    const b = at(new THREE.Group(), x, y + h / 2, z); b.rotation.y = ry; scene.add(b);
    b.add(rbox(w, h, d, .04, card));
    b.add(at(rbox(w + .004, .1, d * .22, .01, tape), 0, h / 2 - .045, 0));
    b.add(at(rbox(w * .2, h * .3, .012, .004, tape), 0, h / 2 - h * .15, d / 2));
    if (label) b.add(at(new THREE.Mesh(new THREE.PlaneGeometry(w * .22, w * .16), new THREE.MeshStandardMaterial({ map: labelTex, roughness: .8 })), w * .3, h * .15, d / 2 + .004));
    return b;
  }
  parcel(1.6, 1.0, 1.15, 3.0, -1.7, -.08);
  parcel(1.2, .78, .95, 3.05, -1.75, .1, 1);
  parcel(1.05, .62, .82, 1.55, -1.2, .06);
  parcel(1.3, .82, 1.05, 3.7, 1.25, .28, 0, false);
  // envelopes, some white and some pale blue
  function envTex(body, flap) {
    return tex(160, 112, (g, w, h) => {
      g.fillStyle = body; g.fillRect(0, 0, w, h);
      g.strokeStyle = flap; g.lineWidth = 4; g.beginPath(); g.moveTo(2, 2); g.lineTo(w / 2, h * .58); g.lineTo(w - 2, 2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(2, h - 2); g.lineTo(w * .4, h * .5); g.moveTo(w - 2, h - 2); g.lineTo(w * .6, h * .5); g.stroke();
    });
  }
  const envs = [envTex('#fbfaf7', '#d8d3ca'), envTex('#cfdcec', '#a9bdd6')].map(map => new THREE.MeshStandardMaterial({ map, roughness: .85 }));
  [[-.95, .75, .5, 0], [-.55, 1.1, -.35, 1], [1.05, -.45, .7, 0], [1.55, -.2, -.3, 1], [2.25, .45, .4, 0], [.95, 1.5, 1.2, 0], [-2.1, -.4, 2.3, 1], [2.75, 1.0, -.6, 0]].forEach(([x, z, r, m]) => {
    const e = at(mesh(new THREE.BoxGeometry(.6, .012, .42), envs[m], false), x, .008, z); e.rotation.y = r; scene.add(e);
  });
  const onTop = at(mesh(new THREE.BoxGeometry(.6, .012, .42), envs[0], false), 2.75, 1.02, -1.15); onTop.rotation.set(0, -.5, -.06); scene.add(onTop);

  const avatar = makeChibi(); const P = avatar.userData.parts; scene.add(avatar);
  const sh = blob(2, .25); sh.position.set(0, .004, .05); scene.add(sh);
  // arm rotations for "crossed" and "hanging", built from directions (the limbs rest along -y)
  const DOWN = new THREE.Vector3(0, -1, 0);
  function armQuats(upper, fore) {
    const s = new THREE.Quaternion().setFromUnitVectors(DOWN, new THREE.Vector3(...upper).normalize());
    const local = new THREE.Vector3(...fore).normalize().applyQuaternion(s.clone().invert());
    return { s, e: new THREE.Quaternion().setFromUnitVectors(DOWN, local) };
  }
  const ARMS = [-1, 1].map(side => ({
    side,
    cross: armQuats([side * .04, -.74, .66], [-side * .94, side > 0 ? .17 : .07, side > 0 ? .36 : .22]),
    hang: armQuats([side * .13, -.99, .05], [side * .02, -.99, .14]),
  }));
  const zTex = tex(128, 128, (g, w) => {
    g.strokeStyle = '#2d2a24'; g.lineWidth = 13; g.lineJoin = 'miter'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * .2, w * .24); g.lineTo(w * .82, w * .2); g.lineTo(w * .22, w * .8); g.lineTo(w * .84, w * .76); g.stroke();
  });
  const zs = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); return sp; });

  scene.add(new THREE.HemisphereLight('#fff6ea', '#d9c3a3', 1.35));
  sunLight(scene, '#fff1dc', 2.1, [-4, 9, 7], 6);
  const fill = new THREE.DirectionalLight('#e4ecff', .35); fill.position.set(6, 3, 4); scene.add(fill);

  // pointer: mouse moves keep him awake and he looks at the cursor; a tap wakes him on touch screens
  const hover = matchMedia('(hover: hover)').matches;
  let px = -1, py = -1, lastMove = -1e9, nowS = 0, sleep = hover ? 0 : 1, yaw = 0, pitch = 0, size = { w: 1, h: 1 };
  window.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; lastMove = nowS; }, { passive: true });
  canvas.addEventListener('pointerdown', () => { lastMove = nowS; });
  const head = new THREE.Vector3();
  function resize() { size = fit(renderer, camera, canvas); }
  function frame(t, dt) {
    nowS = t;
    const land = size.w >= size.h;
    camera.fov = land ? 30 : 32;
    if (land) { camera.position.set(.15, 2.6, 8.8); camera.lookAt(.15, 1.3, 0); }
    else { camera.position.set(.3, 2.75, 7.2); camera.lookAt(.3, 1.85, 0); }
    camera.updateProjectionMatrix();

    const idle = t - lastMove, target = reduce ? (hover ? 0 : 1) : (idle > (hover ? 9 : 3.5) ? 1 : 0);
    sleep += (target - sleep) * Math.min(1, dt * (target > sleep ? 1.1 : 4));
    const k = smooth(sleep);
    // look at the cursor while awake
    let ty = 0, tp = 0;
    if (hover && px >= 0 && k < .5) {
      P.head.getWorldPosition(head); head.project(camera);
      const r = canvas.getBoundingClientRect();
      const hx = r.left + (head.x + 1) / 2 * r.width, hy = r.top + (1 - head.y) / 2 * r.height;
      ty = clamp((px - hx) / Math.max(400, r.width) * 1.6, -.6, .6); tp = clamp((py - hy) / Math.max(400, r.height) * 1.2, -.3, .35);
    }
    const ease = reduce ? 1 : Math.min(1, dt * 6); yaw += (ty - yaw) * ease; pitch += (tp - pitch) * ease;
    const b = reduce ? 0 : Math.sin(t * (1.6 - k * .6));
    applyPose(P, POSES.stand);
    P.spine.rotation.x = lerp(-.02, .12, k) + b * .012;
    P.head.rotation.set(lerp(pitch - .04, .42, k) + b * .02 * (1 + k), yaw * (1 - k), lerp(0, .14, k));
    ARMS.forEach(({ side, cross, hang }) => {
      const arm = side < 0 ? P.armL : P.armR;
      arm.sh.quaternion.slerpQuaternions(cross.s, hang.s, k);
      arm.el.quaternion.slerpQuaternions(cross.e, hang.e, k);
      // chibi forearms are too short to fold across the chest, so they stretch while crossed
      const st = lerp(1.9, 1, k); arm.el.scale.y = st; arm.hand.scale.y = 1 / st;
    });
    [P.legL, P.legR].forEach((l, i) => { l.hp.rotation.z = (i ? 1 : -1) * .05; l.kn.rotation.x = k * .06; });
    P.pelvis.position.y = 1 - k * .02;
    // blink now and then while awake; eyes shut when asleep
    const blink = !reduce && k < .5 && (t % 4.3) < .12;
    closeEyes(P, k > .5 || blink);
    zs.forEach((z, i) => {
      const q = reduce ? (i + .5) / 3 : (t * .3 + i / 3) % 1;
      z.position.set(.55 + q * .95 + Math.sin(q * 5 + i) * .06, 3.15 + q * 1.15, .3);
      const sc = .24 + q * .3; z.scale.set(sc, sc, 1);
      z.material.opacity = Math.sin(q * Math.PI) * clamp((k - .6) / .4);
    });
    renderer.render(scene, camera);
  }
  return { resize, frame };
}

// ---------- boot ----------
let office, lab, contact;
try {
  office = buildOffice(document.getElementById('office-canvas'));
  lab = buildLab(document.getElementById('lab-canvas'), document.getElementById('actor-canvas'));
  const cc = document.getElementById('contact-canvas');
  if (cc) contact = buildContact(cc);
} catch (e) {
  html.classList.add('no-webgl'); finishLoading(); throw e;
}
let running = false, last = performance.now(), contactOn = false;
function draw(now) {
  const s = S(), t = now / 1000, dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  let any = false;
  if (s.active && s.pIn < 1) { office.frame(t, dt); any = true; }
  if (s.active && s.pIn > .005) { lab.frame(t, dt); any = true; } else lab.idle();
  if (contact && contactOn) { contact.frame(t, dt); any = true; }
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
function resizeAll() { office.resize(); lab.resize(); if (contact) contact.resize(); kick(); }
let rz = 0;
window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(resizeAll); }, { passive: true });
document.addEventListener('dht:scroll', kick);
document.addEventListener('visibilitychange', kick);
if (contact && 'IntersectionObserver' in window) {
  new IntersectionObserver(es => { contactOn = es[0].isIntersecting; if (contactOn) kick(); }, { rootMargin: '100px' }).observe(document.getElementById('contact-canvas'));
}
resizeAll();
requestAnimationFrame(now => { office.frame(now / 1000, 0); lab.frame(now / 1000, 0); finishLoading(true); kick(); });
