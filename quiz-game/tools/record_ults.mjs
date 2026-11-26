// 캐릭터 선택창용 궁극기 시연 영상: 데모를 띄워 캐릭터마다 더미 앞에서 궁극기를 쓰는 장면을 녹화한다.
// 사용: node tools/build_demo.mjs /tmp/demo.html && node tools/record_ults.mjs /tmp/demo.html [캐릭터id ...]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..'), out = path.join(root, 'public/ult'), tmp = path.join(root, '.ult-tmp');
const demo = path.resolve(process.argv[2]), only = process.argv.slice(3);
const ids = Object.keys(JSON.parse(readFileSync(path.join(root, 'server/characters.json'), 'utf8')));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const id of ids.filter((i) => !only.length || only.includes(i))) {
  rmSync(tmp, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, recordVideo: { dir: tmp, size: { width: 800, height: 450 } } });
  const t0 = Date.now(), page = await ctx.newPage();
  await page.goto('file://' + demo); await page.waitForTimeout(600); await page.click('#pickgo'); await page.waitForTimeout(500);
  await page.addStyleTag({ content: 'body > *:not(#stage):not(script){display:none!important}' });
  await page.evaluate((id) => {
    const g = window.__game, w = window.__world;
    g.botsCanAttack = false;
    for (const k of [...g.players.keys()]) if (k !== 'me') g.players.delete(k);
    const m = g.players.get('me'); m.charId = id; m.cfg = g.characters[id]; m.dash = null; g._refill(m); m.hp = m.cfg.hp; m.face = 1; m.x = g.map.w * 0.3; m.y = g.map.h * 0.5; // 맵 가장자리가 안 보이게 가운데 근처에서
    [[2.6, 0], [4.4, -1.7], [4.4, 1.7], [6.6, 0.2], [-2.6, 0.8]].forEach(([dx, dy]) => {
      const b = g.addBot('idle', 'blue'), o = b.id ? b : g.players.get(b);
      o.x = m.x + dx; o.y = m.y + dy; o.name = ''; o.isBot = false; o.cfg = { ...o.cfg, hp: 9999 }; o.hp = 9999;
    });
    const cam = w.cameras.main; cam.setZoom = function () { return this; }; cam.zoom = 1.25;
  }, id);
  const setup = (Date.now() - t0) / 1000;
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = window.__game, m = g.players.get('me'); m.ult = m.cfg.ult.need; g.ult('me', null); });
  await page.waitForTimeout(id === 'chick' ? 5200 : 4200);
  await ctx.close();
  const src = path.join(tmp, readdirSync(tmp)[0]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(setup + 0.25), '-i', src, '-t', id === 'chick' ? '5' : '4', '-vf', 'scale=480:-2,fps=24', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(out, `${id}.mp4`)]);
  console.log(id, 'ok', readFileSync(path.join(out, `${id}.mp4`)).length >> 10, 'KB');
}
rmSync(tmp, { recursive: true, force: true });
await browser.close();
