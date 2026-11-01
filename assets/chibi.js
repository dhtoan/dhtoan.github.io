// The chibi founder, shared by every scene: big head, black curtain-bang hair, black "dh." tee,
// rolled-up dark jeans and white sneakers with an orange stripe. All procedural (canvas-drawn face, no files).
// Joint layout (pelvis > spine > head/arms, pelvis > legs) and sizes are what the poses in scene.js expect.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const SKIN = '#f8d3b4', HAIR = '#251c17';
const cache = {};
function mat(color, opts = {}, Kind = THREE.MeshStandardMaterial) {
  const key = Kind.name + color + JSON.stringify(opts);
  if (!cache[key]) cache[key] = new Kind({ color, roughness: .62, metalness: 0, ...opts });
  return cache[key];
}
const M = c => typeof c === 'string' ? mat(c) : c;
function mesh(geo, m, cast = true) { const o = new THREE.Mesh(geo, M(m)); o.castShadow = cast; o.receiveShadow = true; return o; }
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const rbox = (w, h, d, r, c) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), c);
const cyl = (a, b, h, c, s = 24) => mesh(new THREE.CylinderGeometry(a, b, h, s), c);
const ball = (r, c, s = 20) => mesh(new THREE.SphereGeometry(r, s, Math.round(s * .75)), c);
const caps = (r, l, c) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), c);
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- face textures (drawn once, shared) ----------
let FACE;
function faceTextures() {
  if (FACE) return FACE;
  const INK = '#1b120e';
  // open eye: tall oval iris that warms from near-black to amber, a pupil, two catch-lights and a thick upper lash
  const eye = canvasTex(160, 200, (g, w, h) => {
    const cx = w * .5, cy = h * .56, rx = w * .3, ry = h * .34;
    const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    gr.addColorStop(0, '#120b08'); gr.addColorStop(.55, '#3a2216'); gr.addColorStop(1, '#a8652e');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(10,6,4,.85)'; g.beginPath(); g.ellipse(cx, cy - ry * .06, rx * .5, ry * .55, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,214,160,.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy + ry * .1, rx * .78, ry * .7, 0, .25 * Math.PI, .75 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + rx * .32, cy - ry * .38, rx * .36, ry * .24, -.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx - rx * .38, cy + ry * .42, rx * .15, 0, Math.PI * 2); g.fill();
    // lash line: thick across the top, flicking out at the outer corner (right side of the texture)
    g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 15;
    g.beginPath(); g.ellipse(cx, cy + 4, rx * 1.14, ry * 1.04, 0, 1.12 * Math.PI, 1.9 * Math.PI); g.stroke();
    g.lineWidth = 9; g.beginPath(); g.moveTo(cx + rx * 1.02, cy - ry * .62); g.quadraticCurveTo(cx + rx * 1.35, cy - ry * .78, cx + rx * 1.5, cy - ry * .98); g.stroke();
  });
  // closed eye: a happy downward arc with the same outer flick
  const shut = canvasTex(160, 200, (g, w, h) => {
    g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 13;
    g.beginPath(); g.ellipse(w * .5, h * .5, w * .32, h * .14, 0, .08 * Math.PI, .92 * Math.PI); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(w * .8, h * .56); g.lineTo(w * .92, h * .5); g.stroke();
  });
  const mouth = canvasTex(160, 100, (g, w, h) => {
    g.fillStyle = '#6e2f25'; g.beginPath(); g.moveTo(w * .22, h * .3); g.quadraticCurveTo(w * .5, h * .42, w * .78, h * .3); g.quadraticCurveTo(w * .5, h * 1.02, w * .22, h * .3); g.fill();
    g.fillStyle = '#f07a72'; g.beginPath(); g.ellipse(w * .5, h * .7, w * .14, h * .12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.fillRect(w * .32, h * .32, w * .36, h * .1);
  });
  const blush = canvasTex(128, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,128,118,.55)'); gr.addColorStop(1, 'rgba(255,128,118,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(232,96,90,.5)'; g.lineWidth = 3; g.lineCap = 'round';
    [-18, 0, 18].forEach(dx => { g.beginPath(); g.moveTo(w / 2 + dx - 4, h * .6); g.lineTo(w / 2 + dx + 4, h * .38); g.stroke(); });
  });
  const logo = canvasTex(256, 128, (g, w, h) => {
    g.font = '900 88px Urbanist, system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#f5efe6';
    g.fillText('dh', 34, h / 2 + 4); const tw = g.measureText('dh').width;
    g.fillStyle = '#34bfff'; g.beginPath(); g.arc(34 + tw + 16, h / 2 + 26, 11, 0, Math.PI * 2); g.fill();
  });
  return (FACE = { eye, shut, mouth, blush, logo });
}
// head: one closed surface, the smooth union of the cranium and the cheek/jaw ellipsoids (no seam across the face)
const HEAD = [{ c: [0, 0, 0], r: [.582, .543, .549] }, { c: [0, -.17, .08], r: [.468, .351, .423] }];
let headGeo;
function headGeometry() {
  if (headGeo) return headGeo;
  let geo = new THREE.SphereGeometry(1, 72, 54);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); geo = mergeVertices(geo);
  const p = geo.attributes.position, d = new THREE.Vector3();
  const hit = ({ c, r }) => { // distance from the head centre to the ellipsoid along d
    let a = 0, b = 0, k = -1;
    for (let i = 0; i < 3; i++) { const di = d.getComponent(i); a += (di / r[i]) ** 2; b -= 2 * di * c[i] / r[i] ** 2; k += (c[i] / r[i]) ** 2; }
    return (-b + Math.sqrt(b * b - 4 * a * k)) / (2 * a);
  };
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const t1 = hit(HEAD[0]), t2 = hit(HEAD[1]), K = .08, h = Math.max(K - Math.abs(t1 - t2), 0) / K;
    const t = Math.max(t1, t2) + h * h * K * .25;
    p.setXYZ(i, d.x * t, d.y * t, d.z * t);
  }
  geo.computeVertexNormals();
  return (headGeo = geo);
}
// a flat decal laid on the head surface at (x, y), facing out along the surface normal
const ray = new THREE.Raycaster(), FRONT = new THREE.Vector3(0, 0, 1);
function decal(parent, surface, map, x, y, w, h, lift = .006, mirror = false) {
  ray.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
  const hitP = ray.intersectObject(surface)[0];
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: true, roughness: .45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  const n = hitP.face.normal.clone().normalize();
  m.position.copy(hitP.point).addScaledVector(n, lift);
  m.quaternion.setFromUnitVectors(FRONT, n);
  if (mirror) m.scale.x = -1;
  m.userData.decal = true; m.renderOrder = 1;
  parent.add(m); return m;
}
// a hair lock: rounded root at the origin, swelling and then tapering to a point along -y, flattened front to back
function lockGeometry(len, r) {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.max(.002, r * Math.sin(Math.PI * Math.pow(t, .55)) * (1 - .3 * t)), -t * len)); }
  const g = new THREE.LatheGeometry(pts, 18); g.scale(1, 1, .6); return g;
}

export function makeChibi() {
  const g = new THREE.Group(), P = {}, F = faceTextures();
  const skin = mat(SKIN, { roughness: .58 });
  const shirt = mat('#2a2c33', { roughness: .9 }), shirtDark = mat('#1f2127', { roughness: .9 });
  const pants = mat('#27304a', { roughness: .82 }), cuff = mat('#3a4766', { roughness: .85 });
  const hair = mat(HAIR, { roughness: .42, clearcoat: .55, clearcoatRoughness: .35 }, THREE.MeshPhysicalMaterial);

  const pelvis = new THREE.Group(); pelvis.position.y = 1; g.add(pelvis); P.pelvis = pelvis;
  const hips = mesh(new THREE.SphereGeometry(.31, 24, 16), pants); hips.scale.set(1.06, .6, .8); pelvis.add(hips);
  const spine = new THREE.Group(); pelvis.add(spine); P.spine = spine;
  const torso = at(caps(.31, .3, shirt), 0, .36, 0); torso.scale.set(1.1, 1, .8); spine.add(torso); P.torso = torso;
  const hem = at(mesh(new THREE.TorusGeometry(.31, .035, 8, 40), shirtDark), 0, .14, 0); hem.rotation.x = Math.PI / 2; hem.scale.set(1.1, .8, 1); spine.add(hem);
  spine.add(at(cyl(.14, .19, .12, shirt), 0, .72, 0));
  const collar = at(mesh(new THREE.TorusGeometry(.125, .03, 8, 28), shirtDark), 0, .77, .01); collar.rotation.x = Math.PI / 2 - .12; spine.add(collar);
  spine.add(at(cyl(.1, .11, .2, skin, 16), 0, .82, 0));
  // "dh." print on the chest
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(.26, .13), new THREE.MeshStandardMaterial({ map: F.logo, transparent: true, roughness: .8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  logo.position.set(0, .5, .262); logo.rotation.x = -.06; logo.userData.decal = true; logo.renderOrder = 1; spine.add(logo);

  const head = new THREE.Group(); head.position.y = 1.33; spine.add(head); P.head = head;
  const skull = mesh(headGeometry(), skin); // decals raycast against it before it gets a parent (identity matrix)
  [-1, 1].forEach(s => {
    const e = mesh(new THREE.SphereGeometry(.12, 16, 12), skin); e.scale.set(.55, 1, .8); e.position.set(.57 * s, -.05, -.02); head.add(e);
    const inner = mesh(new THREE.SphereGeometry(.06, 12, 10), mat('#eeb48f', { roughness: .6 })); inner.scale.set(.4, 1, .7); inner.position.set(.6 * s, -.05, .0); head.add(inner);
  });
  // face: canvas-drawn anime eyes (open + shut for blinking), smile, blush; the textures are drawn for the right eye and mirrored
  P.eyes = []; P.lids = [];
  [-1, 1].forEach(s => {
    P.eyes.push(decal(head, skull, F.eye, .2 * s, -.07, .21, .26, .006, s < 0));
    const lid = decal(head, skull, F.shut, .2 * s, -.07, .21, .26, .006, s < 0); lid.visible = false; P.lids.push(lid);
    decal(head, skull, F.blush, .34 * s, -.2, .2, .1, .004);
    const brow = at(caps(.026, .12, hair), .2 * s, .14, .52); brow.rotation.set(-.2, 0, Math.PI / 2 + .16 * s); head.add(brow);
  });
  head.add(skull);
  head.add(at(ball(.035, '#f0b994', 12), 0, -.13, .55));
  decal(head, skull, F.mouth, 0, -.255, .13, .08, .006);

  // hair: cap and back shell, curtain bangs parted in the middle, then separate locks for a sculpted fringe
  const cap = at(mesh(new THREE.SphereGeometry(.61, 48, 28, 0, Math.PI * 2, 0, Math.PI * .5), hair), 0, .06, -.04); cap.rotation.x = -.28; head.add(cap);
  const back = mesh(new THREE.SphereGeometry(.6, 36, 24, Math.PI, Math.PI, Math.PI * .22, Math.PI * .56), hair); back.scale.set(1.04, 1, 1.04); head.add(back);
  const nape = at(mesh(new THREE.SphereGeometry(.42, 24, 16), hair), 0, -.18, -.24); nape.scale.set(1.15, .7, .8); head.add(nape);
  const lock = (x, y, z, len, r, rx, rz, ry = 0) => {
    const o = mesh(lockGeometry(len, r), hair); o.position.set(x, y, z); o.rotation.set(rx, ry, rz, 'YXZ'); head.add(o); return o;
  };
  [-1, 1].forEach(s => {
    const bang = at(mesh(new THREE.SphereGeometry(.3, 28, 18), hair), .2 * s, .3, .36); bang.scale.set(1.05, .42, .55); bang.rotation.set(-.35, 0, -.5 * s); head.add(bang);
    // fringe locks sweeping outwards from the part
    lock(.08 * s, .52, .3, .42, .1, -.62, .5 * s);
    lock(.24 * s, .47, .32, .42, .11, -.5, .38 * s);
    lock(.4 * s, .38, .26, .36, .11, -.3, .28 * s);
    lock(.52 * s, .24, .14, .34, .1, -.08, .14 * s);
    // sideburns and a flick behind the ear
    const burn = at(mesh(new THREE.SphereGeometry(.14, 16, 12), hair), .5 * s, -.02, .14); burn.scale.set(.5, 1.1, .7); head.add(burn);
    lock(.52 * s, .04, .1, .26, .08, 0, .08 * s);
    lock(.5 * s, .05, -.3, .3, .11, .35, .25 * s);
  });
  // crown volume and the one strand that never stays down
  [[0, .58, -.12, .28, .14, -1.1, 0], [.22, .55, -.2, .26, .12, -1.25, -.5], [-.22, .55, -.2, .26, .12, -1.25, .5], [0, .4, -.48, .28, .14, -2.3, 0], [.28, .32, -.44, .26, .12, -2.2, -.5], [-.28, .32, -.44, .26, .12, -2.2, .5]]
    .forEach(([x, y, z, l, r, rx, rz]) => lock(x, y, z, l, r, rx, rz));
  const ahoge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .6, -.02), new THREE.Vector3(.04, .78, .02), new THREE.Vector3(.13, .84, .1), new THREE.Vector3(.18, .78, .16)]), 16, .022, 8), hair);
  ahoge.castShadow = true; head.add(ahoge); P.ahoge = ahoge;

  function arm(s) {
    const sh = new THREE.Group(); sh.position.set(.4 * s, .62, 0); spine.add(sh);
    // upper arm and forearm share one radius and their round ends are centred on the elbow pivot,
    // so the arm stays one smooth tube however far the elbow bends
    const AR = .088, UP = .33, LOW = .27;
    sh.add(at(caps(AR, UP, skin), 0, -UP / 2, 0));
    sh.add(ball(.15, shirt, 20));
    sh.add(at(mesh(new THREE.CylinderGeometry(.135, .128, .2, 20), shirt), 0, -.1, 0));
    const band = at(mesh(new THREE.TorusGeometry(.13, .022, 8, 24), shirtDark), 0, -.2, 0); band.rotation.x = Math.PI / 2; sh.add(band);
    const el = new THREE.Group(); el.position.y = -UP; sh.add(el);
    el.add(at(caps(AR, LOW, skin), 0, -LOW / 2, 0));
    const hand = new THREE.Group(); hand.position.y = -LOW - .02; el.add(hand);
    const palm = ball(.105, skin, 18); palm.scale.set(.92, 1.02, .78); hand.add(palm);
    const thumb = at(caps(.035, .05, skin), -.07 * s, .01, .05); thumb.rotation.set(.5, 0, .7 * s); hand.add(thumb);
    return { sh, el, hand };
  }
  P.armL = arm(-1); P.armR = arm(1);
  function leg(s) {
    const hp = new THREE.Group(); hp.position.set(.16 * s, -.02, 0); pelvis.add(hp);
    const LR = .145, TH = .42, SH = .3; // same trick as the arms: one radius, round ends on the knee pivot
    hp.add(at(caps(LR, TH, pants), 0, -TH / 2, 0));
    const kn = new THREE.Group(); kn.position.y = -TH; hp.add(kn);
    kn.add(at(caps(LR, SH, pants), 0, -SH / 2, 0));
    kn.add(at(cyl(.162, .158, .09, cuff), 0, -.305, 0));
    kn.add(at(cyl(.1, .1, .07, '#ece9e3', 16), 0, -.37, 0));
    const shoe = new THREE.Group(); shoe.position.set(0, -.46, .07); kn.add(shoe);
    shoe.add(rbox(.27, .15, .42, .07, '#f6f5f2'));
    shoe.add(at(rbox(.29, .06, .45, .03, '#e9e5de'), 0, -.075, 0));
    shoe.add(at(rbox(.295, .022, .455, .01, '#ff9a2e'), 0, -.04, 0));
    shoe.add(at(rbox(.2, .03, .2, .015, '#cfd5df'), 0, .07, -.02));
    [-.04, .04].forEach(z => shoe.add(at(rbox(.16, .018, .022, .008, '#ff9a2e'), 0, .088, z + .02)));
    return { hp, kn };
  }
  P.legL = leg(-1); P.legR = leg(1);
  g.userData.parts = P;
  return g;
}

// poses: pelvis height, spine/head tilt, hip/knee bends, shoulder swing/spread, elbow bend
export const POSES = {
  stand: { py: 1, sp: 0, hd: 0, hip: [0, 0], kn: [0, 0], shx: [0, 0], shz: [.13, .13], el: [-.15, -.15] },
  sit: { py: 1, sp: .06, hd: .08, hip: [-1.57, -1.57], kn: [1.57, 1.57], shx: [-.95, -.95], shz: [.12, .12], el: [-.75, -.75] },
  fall: { py: 1, sp: -.1, hd: -.2, hip: [-.75, -.2], kn: [1, .5], shx: [-.5, .3], shz: [1.25, 1.1], el: [-.9, -.5] },
  crouch: { py: .72, sp: .35, hd: -.2, hip: [-1.05, -1.05], kn: [1.75, 1.75], shx: [-.6, -.6], shz: [.5, .5], el: [-.5, -.5] },
};
const lerp = (a, b, k) => a + (b - a) * k;
export function mixPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], k)) : lerp(a[key], b[key], k);
  return o;
}
export function applyPose(P, p) {
  P.pelvis.position.y = p.py; P.spine.rotation.x = p.sp; P.head.rotation.x = p.hd;
  P.legL.hp.rotation.x = p.hip[0]; P.legR.hp.rotation.x = p.hip[1];
  P.legL.kn.rotation.x = p.kn[0]; P.legR.kn.rotation.x = p.kn[1];
  P.armL.sh.rotation.x = p.shx[0]; P.armR.sh.rotation.x = p.shx[1];
  P.armL.sh.rotation.z = -p.shz[0]; P.armR.sh.rotation.z = p.shz[1];
  P.armL.el.rotation.x = p.el[0]; P.armR.el.rotation.x = p.el[1];
}
export function closeEyes(P, closed) { P.eyes.forEach(e => { e.visible = !closed; }); P.lids.forEach(l => { l.visible = closed; }); }
