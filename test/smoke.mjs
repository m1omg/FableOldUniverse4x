// Evensong — browser smoke test: boots the real page in the real Chromium,
// starts a vigil, plays turns, opens every overlay, and fails on any page
// error. Screenshots land in test/shots/.
//
//   npm i --no-save --no-package-lock playwright-core   # once
//   node test/smoke.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import('playwright-core');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let p = path.join(root, url === '/' ? 'index.html' : url);
  if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

const shots = path.join(root, 'test', 'shots');
fs.mkdirSync(shots, { recursive: true });

const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
const page = await browser.newPage({ viewport: { width: 1380, height: 860 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function shot(name) { await page.screenshot({ path: path.join(shots, name + '.png') }); }

try {
  await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load' });
  await page.waitForSelector('#title:not([hidden])');
  await shot('01-title');

  await page.click('#t-new');
  await page.waitForSelector('#setup:not([hidden])');
  // choose a fixed seed so the run is reproducible
  await page.fill('#setup-grid input[type="text"]', 'smoke-vigil');
  await shot('02-setup');
  await page.click('#s-begin');
  await page.waitForSelector('#game:not([hidden])');
  await shot('03-opening');

  // play: shorten the stride for the opening, then ride the floor
  for (let t = 1; t <= 40; t++) {
    // close any modal threshold by choosing the first option
    const thr = await page.$('#overlay:not([hidden]) .choice-list button');
    if (thr) { await thr.click(); }
    const guide = await page.$('#guide:not([hidden]) button:last-child');
    if (guide) { await guide.click().catch(() => {}); }
    await page.click('#wheel');
    await page.waitForTimeout(30);
    if (t === 6) await shot('04-early');
  }
  await shot('05-turn40');

  // overlays, each opened and closed
  for (const key of ['l', 'i', 'd', 'v', 't', 'u', 'a', '?']) {
    await page.keyboard.press(key === '?' ? 'Shift+?' : key);
    await page.waitForTimeout(60);
    const openCard = await page.$('#overlay:not([hidden])');
    if (!openCard) errors.push('overlay did not open for key ' + key);
    if (key === 'i') await shot('06-inquiries');
    if (key === 'u') await shot('07-undertakings');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
  }

  // click the map and the panel
  await page.click('#sounding', { position: { x: 180, y: 60 } });
  await page.waitForTimeout(50);
  await shot('08-panel');

  // keep playing a while; thresholds auto-answered
  for (let t = 0; t < 45; t++) {
    const thr = await page.$('#overlay:not([hidden]) .choice-list button');
    if (thr) { await thr.click(); await page.waitForTimeout(30); }
    const endCard = await page.$('#overlay:not([hidden]) .ending-title');
    if (endCard) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(25);
  }
  await shot('09-late');

  // save round-trip through the browser store
  const turn = await page.evaluate(() => window.EV.ui.state ? window.EV.ui.state.turn : -1);
  const saved = await page.evaluate(() => {
    if (!window.EV.ui.state) return false;
    return window.EV.save.store('evensong.slot.smoke', window.EV.save.serialize(window.EV.ui.state));
  });
  if (turn > 0 && !saved) errors.push('save to localStorage failed');

  // the double-click path: the page must boot from file:// too
  const filePage = await browser.newPage({ viewport: { width: 900, height: 700 } });
  filePage.on('pageerror', (e) => errors.push('file:// pageerror: ' + e.message));
  await filePage.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });
  await filePage.waitForSelector('#title:not([hidden])');
  await filePage.click('#t-new');
  await filePage.click('#s-begin');
  await filePage.waitForSelector('#game:not([hidden])');
  await filePage.click('#wheel');
  await filePage.waitForTimeout(60);
  const fileTurn = await filePage.evaluate(() => window.EV.ui.state.turn);
  if (fileTurn !== 1) errors.push('file:// boot did not play a turn');
  await filePage.close();

  const filtered = errors.filter((e) => !/favicon/i.test(e));
  if (filtered.length) {
    console.error('SMOKE FAILURES:\n' + filtered.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('smoke: ok — reached turn ' + turn + '; screenshots in test/shots/');
  }
} finally {
  await browser.close();
  server.close();
}
