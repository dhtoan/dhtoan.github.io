// Pre-renders the WebGL scenes to transparent WebP stills for browsers without WebGL.
// Run with the site served locally (python3 -m http.server 8000), then:
//   node tools/capture-stills.mjs http://localhost:8000/?lang=en assets/still 1440 900 1 land
//   node tools/capture-stills.mjs http://localhost:8000/?lang=en assets/still 430 932 2 port
// Renders with SwiftShader (software WebGL), so it works on machines whose browser has WebGL turned off.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
const [url, out, w, h, dpr, suf] = process.argv.slice(2);
const E = process.env.BROWSER || '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'; // any Chromium: Chrome, Edge, Brave
const p = spawn(E, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--remote-debugging-port=9334', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'edgeprof-'))}`, '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let list; for (let i = 0; i < 50; i++) { try { list = await (await fetch('http://127.0.0.1:9334/json/list')).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const js = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: +dpr, mobile: +w < 768 });
await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await send('Page.navigate', { url }); await sleep(6000);
const only = sel => js(`(() => { let st = document.getElementById('cap'); if (!st) { st = document.createElement('style'); st.id = 'cap'; document.head.appendChild(st); }
  st.textContent = 'html,body,.window,.contact,.projects,.footer{background:transparent!important;box-shadow:none!important} body *{visibility:hidden!important} ${sel}{visibility:visible!important}'; })()`);
const setS = o => js(`Object.assign(window.dhtScroll, ${JSON.stringify(o)}); document.dispatchEvent(new Event('dht:scroll'))`);
async function shot(name, sel) {
  const r = await js(`(() => { const b = document.querySelector('${sel}').getBoundingClientRect(); return [b.left, b.top + scrollY, b.width, b.height]; })()`);
  const res = await send('Page.captureScreenshot', { format: 'webp', quality: 82, clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 }, captureBeyondViewport: false });
  writeFileSync(join(out, `${name}-${suf}.webp`), Buffer.from(res.result.data, 'base64'));
  console.log(name, r.map(Math.round).join(','));
}
// 1. office, chair swivelled round so he faces the visitor
await only('#office-canvas'); await setS({ pIn: .22, pSec: 0, pAbout: 0, active: true }); await sleep(2000);
await shot('office', '#office-canvas');
// 2. lab: standing on the pedestal, then fully turned into a hologram
await js(`document.getElementById('window').style.visibility = 'hidden'`);
await only('.lab, #lab-canvas, #actor-canvas');
await setS({ pIn: 1, pSec: 0, pAbout: 0 }); await sleep(2500);
await shot('lab', '.lab');
await setS({ pIn: 1, pSec: 1, pAbout: 1 }); await sleep(2000);
await shot('holo', '.lab');
// 3. contact: awake, arms crossed
await js(`document.getElementById('window').style.visibility = ''; scrollTo({ top: document.getElementById('contact').offsetTop, behavior: 'instant' })`);
await only('#contact-canvas'); await sleep(2500);
await shot('contact', '#contact-canvas');
ws.close(); p.kill();
