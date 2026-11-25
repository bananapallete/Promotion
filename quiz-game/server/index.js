import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { Game } from './game.js';
import { starsOf } from './balance.js';
import { BROADCAST_HZ, TICK_HZ } from '../shared/constants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const HOST_KEY = process.env.HOST_KEY || ''; // 비워두면 누구나 /host 사용 가능 (배포 시 꼭 설정)
const isProd = process.env.NODE_ENV === 'production';

const characters = JSON.parse(readFileSync(path.join(root, 'server/characters.json'), 'utf8'));
const quizzes = JSON.parse(readFileSync(path.join(root, 'server/quizzes.test.json'), 'utf8'));
const game = new Game(characters, quizzes);

const app = express();
const http = createServer(app);
const io = new Server(http);

function lanOrigin() {
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return `http://${i.address}:${PORT}`;
  }
  return null;
}

const stars = starsOf(characters);
app.get('/api/characters', (_req, res) => {
  res.json(Object.fromEntries(Object.entries(characters).map(([id, c]) => [id, { name: c.name, sprite: c.sprite, type: c.attack.type, skill: c.skill?.type || 'run', role: c.role, atkInfo: c.atkInfo, ultName: c.ult?.name, rec: c.rec, stars: stars[id], sk: c.skill, runGauge: c.runGauge, tint: c.tint || null, scale: c.scale || 1 }])));
});
app.get('/api/info', (_req, res) => res.json({ lanOrigin: lanOrigin(), publicUrl: process.env.PUBLIC_URL || null, hostKeyRequired: !!HOST_KEY }));

// /play → play.html 처럼 확장자 없는 주소 지원
const pages = new Set(['play', 'host', 'screen']);
app.use((req, _res, next) => {
  const name = req.path.replace(/^\/|\/$/g, '');
  if (pages.has(name)) req.url = `/${name}.html${req.url.slice(req.path.length)}`;
  next();
});

if (isProd) {
  if (!existsSync(path.join(root, 'dist'))) console.warn('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.');
  app.use(express.static(path.join(root, 'dist')));
} else {
  const { createServer: createVite } = await import('vite');
  const vite = await createVite({ root, server: { middlewareMode: true }, appType: 'mpa' });
  app.use(vite.middlewares);
}

// ---------- 소켓 ----------
io.on('connection', (socket) => {
  socket.on('join', (data, ack) => {
    const token = data?.token && game.players.has(data.token) ? data.token : randomUUID();
    const p = game.join({ token, name: data?.name, charId: data?.charId });
    if (!p) return ack?.({ ok: false, error: '인원이 가득 찼어요' });
    socket.data.pid = p.id;
    ack?.({ ok: true, token: p.id, name: p.name, charId: p.charId, cfg: p.cfg });
  });

  socket.on('input', (i) => { if (socket.data.pid) game.setInput(socket.data.pid, i); });
  socket.on('attack', (aim) => { if (socket.data.pid) game.attack(socket.data.pid, aim); });
  socket.on('ult', (aim) => { if (socket.data.pid) game.ult(socket.data.pid, aim); });
  socket.on('skill', () => { if (socket.data.pid) game.skill(socket.data.pid); });

  socket.on('screen:join', () => socket.join('screens'));

  socket.on('host:auth', (key, ack) => {
    if (HOST_KEY && key !== HOST_KEY) return ack?.({ ok: false });
    socket.data.isHost = true;
    socket.join('hosts');
    ack?.({ ok: true, ...game.hostInfo() });
  });
  const host = (name, fn) => socket.on(name, (data, ack) => {
    if (!socket.data.isHost) return;
    const res = fn(data);
    io.to('hosts').emit('host:info', game.hostInfo());
    ack?.(res ?? { ok: true });
  });
  host('host:ask', (d) => ({ ok: game.ask(Number(d?.id)) }));
  host('host:end', () => game.endQuestion());
  host('host:reset', () => game.resetScores());
  host('host:gather', () => game.gather());
  host('host:addQuestion', (d) => game.addQuestion(d || {}));
  host('host:addBot', (d) => {
    const n = Math.min(30, Math.max(1, Number(d?.count) || 1));
    for (let i = 0; i < n; i++) game.addBot(d?.mode, d?.charId);
  });
  host('host:clearBots', () => game.clearBots());
  host('host:rank', (d) => { game.showRank = !!d?.on; });
  host('host:spawnCoin', () => { game.spawnCoin(); });
  host('host:spawnItem', (d) => { game.spawnItem(d?.k); });
  host('host:botAttack', (d) => { game.botsCanAttack = !!d?.on; });

  socket.on('disconnect', () => { if (socket.data.pid) game.setConnected(socket.data.pid, false); });
});

// 기본 봇: 서로 공격하는 15마리 (호스트 화면에서 제거 가능)
const charIds = Object.keys(characters);
game.botsCanAttack = true; // 기본 봇은 서로 싸우고, 문제 시간에는 구역으로 이동
for (let i = 0; i < 15; i++) game.addBot('aggro', charIds[Math.floor(Math.random() * charIds.length)]);

// ---------- 루프 ----------
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(dt);
}, 1000 / TICK_HZ);

setInterval(() => {
  io.emit('state', { ...game.snapshot(), lb: game.leaderboard() });
}, 1000 / BROADCAST_HZ);

http.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  퀴즈 게임 서버: http://localhost:${PORT}`);
  const lan = lanOrigin();
  if (lan) console.log(`  같은 와이파이의 폰: ${lan}/play`);
  console.log(`  화면(빔프로젝터): /screen   호스트: /host${HOST_KEY ? ' (키 필요)' : ''}\n`);
});
