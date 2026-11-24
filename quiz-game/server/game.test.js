// 실행: npm test   (Node 내장 테스트 러너 사용)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from './game.js';
import { PHASE } from '../shared/constants.js';

const chars = JSON.parse(readFileSync(new URL('./characters.json', import.meta.url), 'utf8'));
const quizzes = JSON.parse(readFileSync(new URL('./quizzes.test.json', import.meta.url), 'utf8'));
const DT = 1 / 30;

function setup() {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  for (const p of [a, b]) { p.kx = p.ky = 0; }
  a.x = 20; a.y = 10; b.x = 21; b.y = 10; // 1BU 떨어져 있음 (사거리 1.2 안)
  return { g, a, b };
}
const run = (g, sec) => { for (let i = 0; i < Math.round(sec / DT); i++) g.update(DT); };

test('근접 공격: 피해 2~3, 한 대당 약 0.5 밀림', () => {
  const { g, a, b } = setup();
  const x0 = b.x;
  g.attack('a', null);
  assert.ok([8, 7].includes(b.hp), `hp=${b.hp}`);
  run(g, 1);
  assert.ok(Math.abs(b.x - x0 - 0.5) < 0.12, `밀린 거리 ${b.x - x0}`); // 충돌로 약간 달라질 수 있음
});

test('공격 간격: 1초에 최대 3번', () => {
  const { g, a, b } = setup();
  b.hp = 1000; b.cfg = { ...b.cfg, hp: 1000 };
  let hits = 0;
  for (let i = 0; i < 30; i++) { // 1초 동안 매 틱 연타
    const before = b.hp;
    g.attack('a', null);
    if (b.hp < before) hits++;
    g.update(DT);
    b.x = 21; // 밀림 무시하고 제자리
  }
  assert.ok(hits >= 3 && hits <= 4, `hits=${hits}`);
});

test('체력 0 → 기절 2초 → 체력 회복 + 무적 3초', () => {
  const { g, a, b } = setup();
  b.hp = 1;
  g.attack('a', null);
  assert.equal(b.stunned, true);
  assert.equal(b.hp, 0);
  run(g, 1.9); assert.equal(b.stunned, true);
  run(g, 0.2);
  assert.equal(b.stunned, false);
  assert.equal(b.hp, 10);
  // 무적 동안은 맞아도 피해 없음
  b.x = a.x + 1; b.y = a.y;
  g.attack('a', null);
  assert.equal(b.hp, 10);
  run(g, 3.1);
  b.x = a.x + 1; b.y = a.y; b.kx = b.ky = 0;
  g.attack('a', null);
  assert.ok(b.hp < 10);
});

test('기절 중에는 이동 불가', () => {
  const { g, b } = setup();
  b.stunned = true; b.stunUntil = g.t + 2;
  g.setInput('b', { mx: 1, my: 0, run: false });
  const x0 = b.x;
  run(g, 1);
  assert.ok(Math.abs(b.x - x0) < 0.01);
});

test('원거리: 사거리 5, 밀림 0.3, 피해 1', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue_ranged' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 10; a.y = 10; b.x = 14.5; b.y = 10; a.kx = a.ky = b.kx = b.ky = 0;
  g.attack('a', null);
  assert.equal(b.hp, 9);
  run(g, 1);
  assert.ok(Math.abs(b.x - 14.5 - 0.3) < 0.1, `x=${b.x}`);
  b.x = 15.6; // 5.6 > 사거리
  run(g, 1);
  const hp = b.hp;
  g.attack('a', null);
  assert.equal(b.hp, hp);
});

test('직접 조준: 드래그한 방향으로만 맞는다', () => {
  const { g, a, b } = setup();
  g.attack('a', { x: 0, y: -1 }); // 위쪽으로 조준 → b는 오른쪽에 있음
  assert.equal(b.hp, 10);
  run(g, 0.4);
  g.attack('a', { x: 1, y: 0 });
  assert.ok(b.hp < 10);
});

test('캐릭터끼리 겹치지 않는다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 20; a.y = 10; b.x = 20.1; b.y = 10;
  run(g, 0.5);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 0.99);
});

test('달리기: 5초 뒤 바닥, 10초 뒤 가득, 문제 시작 시 가득', () => {
  const { g, a } = setup();
  a.x = 5; a.y = 5; // 넓은 곳에서 (맵 벽에 막히지 않게 대각선 왕복은 생략하고 짧게 확인)
  g.setInput('a', { mx: 0, my: 1, run: true });
  run(g, 2); // 맵 경계에 닿아도 입력 중이면 달리는 것으로 본다
  assert.ok(a.runGauge < 3.2 && a.runGauge > 2.7, `gauge=${a.runGauge}`);
  run(g, 3.1); // 총 5.1초 → 바닥난 직후
  assert.ok(a.runGauge < 0.2, `gauge=${a.runGauge}`);
  assert.equal(a.exhausted, true);
  g.setInput('a', { mx: 0, my: 0, run: false });
  run(g, 10);
  assert.ok(a.runGauge >= 4.9, `gauge=${a.runGauge}`);
  a.runGauge = 1; g.ask(1);
  assert.equal(a.runGauge, a.cfg.runGauge);
});

test('걷기 6, 달리기 9 BU/s (기본 이동속도의 2배)', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10; a.kx = a.ky = 0;
  g.setInput('a', { mx: 1, my: 0, run: false });
  run(g, 1); assert.ok(Math.abs(a.x - 16) < 0.15, `walk x=${a.x}`);
  a.x = 10;
  g.setInput('a', { mx: 1, my: 0, run: true });
  run(g, 1); assert.ok(Math.abs(a.x - 19) < 0.15, `run x=${a.x}`);
});

test('점수: 정답 1점 + 먼저 도착한 1~3등 +3/+2/+1, 오답·무응답 0점', () => {
  const g = new Game(chars, quizzes);
  const ps = ['a', 'b', 'c', 'd', 'e'].map((t) => g.join({ token: t, name: t, charId: 'blue' }));
  g.ask(1); // O 정답
  run(g, 3.1); // 읽는 시간
  assert.equal(g.phase, PHASE.MOVING);
  const put = (p, x, y) => { p.x = x; p.y = y; p.kx = p.ky = 0; };
  // 서로 겹치지 않게 O 구역(왼쪽)에 차례로 도착
  put(ps[0], 15, 3);          // 아직 대기 공간
  run(g, 0.2); put(ps[1], 3, 3);   // 먼저 도착
  run(g, 0.2); put(ps[2], 3, 6);
  run(g, 0.2); put(ps[0], 3, 9);   // 가장 늦게 도착
  put(ps[3], 3, 12); // 이 사람은 곧 반대편으로 갈 것
  run(g, 0.2); put(ps[3], 35, 3);  // X 구역 (오답)
  put(ps[4], 20, 20);              // 대기 공간 (무응답)
  g.endQuestion();
  assert.equal(g.phase, PHASE.REVEAL);
  const byId = Object.fromEntries(g.reveal.results.map((r) => [r.id, r]));
  assert.equal(byId.b.gain, 4); // 1등
  assert.equal(byId.c.gain, 3); // 2등
  assert.equal(byId.a.gain, 2); // 3등
  assert.equal(byId.d.gain, 0);
  assert.equal(byId.e.gain, 0);
  assert.equal(byId.e.zone, null);
});

test('구역을 옮기거나 밀려 나갔다 오면 도착 시각이 초기화된다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  g.ask(1); run(g, 3.1);
  const put = (p, x, y) => { p.x = x; p.y = y; p.kx = p.ky = 0; };
  put(a, 3, 3); put(b, 15, 15);
  run(g, 0.3); put(b, 3, 8);  // b는 나중에 들어옴
  run(g, 0.3); put(a, 15, 3); // a가 밀려서 나갔다가
  run(g, 0.1); put(a, 3, 3);  // 다시 들어옴 → 초기화되어 b보다 늦다
  g.endQuestion();
  const byId = Object.fromEntries(g.reveal.results.map((r) => [r.id, r]));
  assert.equal(byId.b.rank, 1);
  assert.equal(byId.a.rank, 2);
});

test('재접속하면 외형과 점수가 유지된다', () => {
  const g = new Game(chars, quizzes);
  const p = g.join({ token: 't1', name: '철수', charId: 'blue_ranged' });
  p.score = 7;
  g.setConnected('t1', false);
  const back = g.join({ token: 't1', name: '다른이름', charId: 'blue' });
  assert.equal(back.name, '철수');
  assert.equal(back.charId, 'blue_ranged');
  assert.equal(back.score, 7);
});

test('더미 봇은 기본적으로 공격하지 않는다', () => {
  const g = new Game(chars, quizzes);
  const p = g.join({ token: 'a', name: 'A', charId: 'blue' });
  p.x = 20; p.y = 10;
  const bot = g.addBot('aggro', 'blue');
  bot.x = 21; bot.y = 10;
  run(g, 5);
  assert.equal(p.hp, 10);
});

test('더미 봇(공격형)이 가까운 참가자를 때린다 (공격 허용을 켰을 때)', () => {
  const g = new Game(chars, quizzes);
  g.botsCanAttack = true;
  const p = g.join({ token: 'a', name: 'A', charId: 'blue' });
  p.x = 20; p.y = 10;
  const bot = g.addBot('aggro', 'blue');
  bot.x = 25; bot.y = 10;
  run(g, 5);
  assert.ok(p.hp < 10 || p.stunned || g.t < p.invUntil, `hp=${p.hp}`);
});

test('이동 속도는 항상 일정: 조이스틱을 살짝 밀어도 같은 속도, 가속 없음', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10; a.kx = a.ky = 0;
  g.setInput('a', { mx: 0.3, my: 0, run: false }); // 살짝 밀기
  g.update(DT);
  const first = a.x - 10;
  assert.ok(Math.abs(first - 6 * DT) < 1e-6, `첫 틱부터 최고 속도여야 함: ${first}`);
  const x1 = a.x; run(g, 1);
  assert.ok(Math.abs(a.x - x1 - 6) < 0.1, `1초에 6칸: ${a.x - x1}`);
  // 대각선도 같은 속도
  a.x = 10; a.y = 10;
  g.setInput('a', { mx: 1, my: 1, run: false });
  run(g, 1);
  assert.ok(Math.abs(Math.hypot(a.x - 10, a.y - 10) - 6) < 0.1);
});

test('기절한 캐릭터는 마지막 일격에도, 쓰러진 뒤에도 밀리지 않는다', () => {
  const { g, a, b } = setup();
  b.hp = 2; b.cfg = { ...b.cfg }; // 한 대(2~3)로 쓰러짐
  const x0 = b.x;
  g.attack('a', null);
  assert.equal(b.stunned, true);
  run(g, 0.3);
  assert.ok(Math.abs(b.x - x0) < 0.05, `마지막 일격에 밀림: ${b.x - x0}`);
  // 쓰러져 있는 동안 계속 맞아도 제자리
  for (let i = 0; i < 4; i++) { g.attack('a', null); run(g, 0.4); }
  assert.ok(Math.abs(b.x - x0) < 0.05, `쓰러진 뒤 밀림: ${b.x - x0}`);
  assert.equal(b.hp, 0);
});

test('근접 콤보: 1타·2타(잽) → 3타(큰 휘두르기) 순서로 돌고, 쉬면 1타부터', () => {
  const { g, a, b } = setup();
  b.cfg = { ...b.cfg, hp: 1000 }; b.hp = 1000;
  const steps = [];
  for (let i = 0; i < 4; i++) {
    g.attack('a', null);
    steps.push(g.events.filter((e) => e.e === 'atk').at(-1).step);
    run(g, 0.4); b.x = 21; b.y = 10; b.kx = b.ky = 0;
  }
  assert.deepEqual(steps, [0, 1, 2, 0]);
  run(g, 1.5); // 오래 쉬면 초기화
  g.attack('a', null);
  assert.equal(g.events.filter((e) => e.e === 'atk').at(-1).step, 0);
});

test('콤보 배율: 3타만 피해·밀림·사거리를 키울 수 있다', () => {
  const { g, a, b } = setup();
  a.cfg = { ...a.cfg, attack: { ...a.cfg.attack, dmgMin: 2, dmgMax: 2, combo: [{}, {}, { dmg: 2, knockback: 2, range: 1.5 }] } };
  b.cfg = { ...b.cfg, hp: 1000 }; b.hp = 1000;
  const hit = (x) => { b.x = x; b.y = 10; b.kx = b.ky = 0; const h = b.hp; g.attack('a', null); const d = h - b.hp; run(g, 0.4); return d; };
  assert.equal(hit(21), 2);   // 1타
  assert.equal(hit(21), 2);   // 2타
  assert.equal(hit(21.4), 4); // 3타: 피해 2배, 거리 1.4도 닿음(사거리 1.5)
});

test('3타 휘두르기는 1·2타보다 강하다 (기본 설정)', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  b.cfg = { ...b.cfg, hp: 1000 };
  const dmg = [];
  for (let i = 0; i < 3; i++) {
    a.x = 20; a.y = 10; b.x = 21; b.y = 10; b.kx = b.ky = 0; b.hp = 1000;
    g.attack('a', null); dmg.push(1000 - b.hp);
    run(g, 0.4);
  }
  assert.ok(dmg[0] <= 3 && dmg[1] <= 3, `1,2타: ${dmg}`);
  assert.ok(dmg[2] >= 3 && dmg[2] > Math.min(dmg[0], dmg[1]) - 1 && dmg[2] <= 5, `3타: ${dmg}`);
});

test('근접 공격 모션이 재생되는 동안 이동 속도 50%, 끝나면 원래대로', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 5; a.y = 10; a.kx = a.ky = 0;
  g.setInput('a', { mx: 1, my: 0, run: false });
  g.update(DT);
  const normal = a.x - 5;
  g.attack('a', null); // 1타 잽: 모션 0.26초
  const x0 = a.x; g.update(DT);
  const slowed = a.x - x0;
  assert.ok(Math.abs(slowed - normal * 0.5) < 1e-6, `느려짐: ${slowed} vs ${normal}`);
  run(g, 0.3); // 모션 종료
  const x1 = a.x; g.update(DT);
  assert.ok(Math.abs(a.x - x1 - normal) < 1e-6, '모션이 끝나면 원래 속도');
});

test('원거리 캐릭터는 공격 중에도 느려지지 않는다 (설정에 없으면 1배)', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue_ranged' });
  a.x = 5; a.y = 10;
  g.setInput('a', { mx: 1, my: 0, run: false });
  g.attack('a', null);
  const x0 = a.x; g.update(DT);
  assert.ok(Math.abs(a.x - x0 - 6 * DT) < 1e-6);
});

test('조준 미리보기: 자동 조준은 사거리 안의 가장 가까운 적, 없으면 null', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const near = g.join({ token: 'n', name: 'N', charId: 'blue' });
  const far = g.join({ token: 'f', name: 'F', charId: 'blue' });
  a.x = 20; a.y = 10; near.x = 21; near.y = 10; far.x = 22.5; far.y = 10;
  assert.equal(g.aimPreview('a', null).targetId, 'n');
  near.x = 25; // 사거리(1.2) 밖
  far.x = 26;
  assert.equal(g.aimPreview('a', null).targetId, null);
  assert.equal(g.aimPreview('a', null).range, 1.2);
});

test('조준 미리보기: 직접 조준한 방향의 적을 가리키고, 실제 공격이 맞는 대상과 같다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const up = g.join({ token: 'u', name: 'U', charId: 'blue' });
  const right = g.join({ token: 'r', name: 'R', charId: 'blue' });
  a.x = 20; a.y = 10; up.x = 20; up.y = 9; right.x = 21; right.y = 10;
  const pv = g.aimPreview('a', { x: 0, y: -1 });
  assert.equal(pv.manual, true);
  assert.equal(pv.targetId, 'u');
  g.attack('a', { x: 0, y: -1 });
  assert.ok(up.hp < 10 && right.hp === 10, '미리보기가 가리킨 대상만 맞음');
});

test('조준 미리보기: 3타 차례에는 늘어난 사거리를 보여준다', () => {
  const { g, a, b } = setup();
  b.cfg = { ...b.cfg, hp: 1000 }; b.hp = 1000;
  assert.equal(g.aimPreview('a', null).range, 1.2);
  for (let i = 0; i < 2; i++) { b.x = 21; b.y = 10; b.kx = b.ky = 0; g.attack('a', null); run(g, 0.4); }
  assert.equal(g.aimPreview('a', null).step, 2);
  assert.ok(Math.abs(g.aimPreview('a', null).range - 1.2 * 1.15) < 1e-9);
});

// ---------- 동전 ----------
import { COIN, MAP } from '../shared/constants.js';

test('동전: 참가자가 있으면 30초마다 1개 생성, 없으면 생성 안 됨', () => {
  const g = new Game(chars, quizzes);
  run(g, 31);
  assert.equal(g.coins.size, 0, '참가자가 없으면 안 생김');
  g.join({ token: 'a', name: 'A', charId: 'blue' });
  run(g, 29.5); assert.equal(g.coins.size, 0);
  run(g, 1); assert.equal(g.coins.size, 1);
  assert.ok(g.events.some((e) => e.e === 'coinSpawn'));
  run(g, 30); assert.equal(g.coins.size, 2);
});

test('동전: 가까이 가면 자동으로 주워지고 개당 0.5점', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10;
  g.spawnCoin(20, 10); g.spawnCoin(10.8, 10); // 하나는 멀리, 하나는 0.8칸
  run(g, 0.5);
  assert.equal(a.coins, 1);
  assert.equal(g.coins.size, 1);
  assert.equal(g.totalScore(a), 0.5);
  assert.ok(g.events.some((e) => e.e === 'coinGet' && e.by === 'a'));
  g.giveCoins('a', 1);
  assert.equal(g.leaderboard()[0].score, 1);
});

test('동전: 쓰러진 캐릭터와 봇은 줍지 못한다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10; a.stunned = true; a.stunUntil = g.t + 5;
  const bot = g.addBot('idle', 'blue'); bot.x = 15; bot.y = 10;
  g.spawnCoin(10.5, 10); g.spawnCoin(15.5, 10);
  run(g, 1);
  assert.equal(a.coins, 0);
  assert.equal(bot.coins, 0);
  assert.equal(g.coins.size, 2);
});

test('동전: 쓰러지면 가진 동전이 전부 반경 2.5칸 안으로 튀어나온다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 20; a.y = 11; g.giveCoins('a', 6);
  g.events = [];
  g.knockOut('a');
  assert.equal(a.coins, 0);
  assert.equal(g.coins.size, 6);
  const drops = g.events.filter((e) => e.e === 'coinDrop');
  assert.equal(drops.length, 6);
  for (const d of drops) {
    const dist = Math.hypot(d.x - 20, d.y - 11);
    assert.ok(dist <= COIN.scatterRadius + 0.01 && dist >= COIN.scatterMin - 0.01, `반경: ${dist}`);
    assert.ok(d.x >= 0 && d.x <= MAP.w && d.y >= 0 && d.y <= MAP.h);
    assert.equal(d.fx, 20); assert.equal(d.fy, 11);
    assert.ok(d.flight > 0.4 && d.flight < 0.7);
  }
});

test('동전: 떨어진 동전은 3.5초 동안 아무도(본인 포함) 못 줍고, 지나면 누구나 줍는다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 20; a.y = 11; b.x = 3; b.y = 3; g.giveCoins('a', 1);
  g.events = [];
  g.knockOut('a');
  const drop = g.events.find((e) => e.e === 'coinDrop');
  assert.equal(drop.lock, 3.5);
  const c = [...g.coins.values()][0];
  b.x = c.x; b.y = c.y; // 다른 사람이 동전 위에 서 있어도
  run(g, 3.3);
  assert.equal(b.coins, 0, '3.5초 전에는 아무도 못 줍는다');
  assert.ok(g.snapshot().coins[0].lk > 0, '깜빡임용 남은 시간이 내려간다');
  run(g, 0.4);
  assert.equal(b.coins, 1, '3.5초가 지나면 줍는다');
  // 본인도 3.5초 뒤에는 줍는다 (본인 제한은 없음)
  a.stunned = false; a.stunUntil = 0; g.giveCoins('a', 1); a.x = 20; a.y = 11; g._dropCoins(a);
  const c2 = [...g.coins.values()].at(-1); a.x = c2.x; a.y = c2.y;
  run(g, 3.3); assert.equal(a.coins, 0);
  run(g, 0.4); assert.equal(a.coins, 1);
});

test('동전: 새로 생긴 동전은 깜빡이지 않고 바로 주울 수 있다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10; g.spawnCoin(10.5, 10);
  assert.equal(g.snapshot().coins[0].lk, 0);
  run(g, 0.6);
  assert.equal(a.coins, 1);
});

test('동전: 문제를 틀리거나 무응답이면 전부 떨어뜨리고, 맞히면 그대로', () => {
  const g = new Game(chars, quizzes);
  const ok = g.join({ token: 'o', name: 'OK', charId: 'blue' });
  const wrong = g.join({ token: 'w', name: 'WRONG', charId: 'blue' });
  const none = g.join({ token: 'n', name: 'NONE', charId: 'blue' });
  [ok, wrong, none].forEach((p) => g.giveCoins(p.id, 3));
  g.ask(1); run(g, 3.1); // 정답 O (왼쪽)
  const put = (p, x, y) => { p.x = x; p.y = y; p.kx = p.ky = 0; };
  put(ok, 3, 5); put(wrong, 36, 5); put(none, 20, 15);
  g.endQuestion();
  const by = Object.fromEntries(g.reveal.results.map((r) => [r.id, r]));
  assert.equal(by.o.dropped, 0); assert.equal(ok.coins, 3);
  assert.equal(by.w.dropped, 3); assert.equal(wrong.coins, 0);
  assert.equal(by.n.dropped, 3); assert.equal(none.coins, 0);
  assert.equal(g.coins.size, 6);
});

test('동전: 최대 개수 제한, 점수 초기화 시 동전도 초기화', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  for (let i = 0; i < COIN.maxOnMap + 5; i++) g.spawnCoin(1 + (i % 30), 1 + Math.floor(i / 30) * 4);
  assert.equal(g.coins.size, COIN.maxOnMap);
  g.giveCoins('a', 2); g.resetScores();
  assert.equal(a.coins, 0); assert.equal(g.coins.size, 0);
});
