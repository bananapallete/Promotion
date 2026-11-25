// 실행: npm test   (Node 내장 테스트 러너 사용)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from './game.js';
import { CRIT, PHASE } from '../shared/constants.js';

CRIT.chance = 0; // 테스트는 정확한 피해 숫자를 확인하므로 크리티컬은 꺼둔다 (크리티컬 테스트에서만 켬)

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
  const d1 = b.cfg.hp - b.hp, A1 = chars.blue.attack;
  assert.ok(d1 >= A1.dmgMin && d1 <= A1.dmgMax, `피해=${d1}`);
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
  assert.equal(b.hp, b.cfg.hp);
  // 무적 동안은 맞아도 피해 없음
  b.x = a.x + 1; b.y = a.y;
  g.attack('a', null);
  assert.equal(b.hp, b.cfg.hp);
  run(g, 3.1);
  b.x = a.x + 1; b.y = a.y; b.kx = b.ky = 0;
  g.attack('a', null);
  assert.ok(b.hp < b.cfg.hp);
});

test('기절 중에는 이동 불가', () => {
  const { g, b } = setup();
  b.stunned = true; b.stunUntil = g.t + 2;
  g.setInput('b', { mx: 1, my: 0, run: false });
  const x0 = b.x;
  run(g, 1);
  assert.ok(Math.abs(b.x - x0) < 0.01);
});

test('새총: 투사체가 날아가야 맞고(피할 수 있음), 사거리 5, 밀림 0.3, 피해 1', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue_ranged' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 10; a.y = 10; b.x = 14.5; b.y = 10; a.kx = a.ky = b.kx = b.ky = 0;
  g.attack('a', null);
  assert.equal(b.hp, 50, '쏜 순간에는 안 맞음');
  assert.equal(g.projectiles.size, 1);
  run(g, 0.2); assert.equal(b.hp, 50, '아직 날아가는 중 (4.5칸 / 초속 12)');
  run(g, 0.3); assert.equal(b.hp, 50 - chars.blue_ranged.attack.dmgMin);
  run(g, 1);
  assert.ok(Math.abs(b.x - 14.5 - 0.3) < 0.1, `x=${b.x}`);
  assert.equal(g.projectiles.size, 0, '맞으면 사라짐');
  b.x = 16; b.y = 10; run(g, 1); const hp = b.hp; // 사거리 5 + 몸/투사체 반지름 0.75 밖
  g.attack('a', null); run(g, 1);
  assert.equal(b.hp, hp);
});

test('투사체: 날아가는 동안 상대가 비키면 안 맞는다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'witch' }); // 느린 마법탄
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 10; a.y = 10; b.x = 14; b.y = 10; a.kx = a.ky = b.kx = b.ky = 0;
  g.attack('a', null);
  run(g, 0.3); b.y = 12; // 비킴
  run(g, 1);
  assert.equal(b.hp, 50);
});

test('투사체: 관통형은 한 줄의 상대를 모두, 일반형은 처음 닿은 상대만 맞힌다', () => {
  for (const [id, both] of [['girl_short', true], ['elf', false]]) {
    const g = new Game(chars, quizzes);
    const a = g.join({ token: 'a', name: 'A', charId: id });
    const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
    const c = g.join({ token: 'c', name: 'C', charId: 'blue' });
    a.x = 8; a.y = 10; b.x = 11; b.y = 10; c.x = 13; c.y = 10; [a, b, c].forEach((p) => { p.kx = p.ky = 0; });
    g.attack('a', { x: 1, y: 0 });
    run(g, 1);
    assert.ok(b.hp < 50, `${id}: 앞사람`);
    assert.equal(c.hp < 50, both, `${id}: 뒷사람`);
  }
});

test('화염병: 포물선으로 날아가 착탄 지점에서 범위 폭발, 안쪽만 맞고 던진 사람은 안 맞는다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'bomber' });
  const near = g.join({ token: 'n', name: 'N', charId: 'blue' });
  const edge = g.join({ token: 'e', name: 'E', charId: 'blue' });
  const out = g.join({ token: 'o', name: 'O', charId: 'blue' });
  a.x = 10; a.y = 10; near.x = 15; near.y = 10; edge.x = 15; edge.y = 11.9; out.x = 15; out.y = 14;
  [a, near, edge, out].forEach((p) => { p.kx = p.ky = 0; });
  g.attack('a', { x: 1, y: 0, m: 5 / 6.5 }); // 직접 조준: 5칸 앞에 착탄
  assert.equal(near.hp, 50, '던진 순간에는 안 맞음');
  const flight = g.projectiles.get(1).T;
  assert.ok(Math.abs(flight - 5 / 7) < 0.05, `비행 시간 ${flight} (속도 7)`);
  run(g, 0.3); assert.equal(near.hp, 50, '날아가는 중');
  g.events = [];
  run(g, flight - 0.3 + 0.1);
  const boom = g.events.find((e) => e.e === 'boom');
  assert.ok(boom && Math.abs(boom.x - 15) < 0.01 && boom.r === 1.8);
  const bd = chars.bomber.attack.dmgMin;
  assert.equal(near.hp, 50 - bd); assert.equal(edge.hp, 50 - bd, '폭발 가장자리도 맞음');
  assert.equal(out.hp, 50); assert.equal(a.hp, 40, '던진 사람은 안 맞음');
  assert.ok(g.projectiles.size === 0);
  run(g, 0.6); assert.ok(edge.y > 11.9 + 0.3 && near.x > 15.1, '중심에서 바깥으로 밀림');
});

test('화염병: 자동 조준은 가장 가까운 상대의 위치에 던지고, 미리보기가 착탄 지점을 알려준다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'bomber' });
  const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
  a.x = 10; a.y = 10; b.x = 14; b.y = 10;
  const pv = g.aimPreview('a', null);
  assert.ok(pv.lob && Math.abs(pv.lob.x - 14) < 0.01 && pv.lob.r === 1.8);
  assert.equal(pv.targetId, 'b');
  g.attack('a', null);
  assert.ok(Math.abs(g.projectiles.get(1).tx - 14) < 0.01);
});

test('직접 조준: 드래그한 방향으로만 맞는다', () => {
  const { g, a, b } = setup();
  g.attack('a', { x: 0, y: -1 }); // 위쪽으로 조준 → b는 오른쪽에 있음
  assert.equal(b.hp, b.cfg.hp);
  run(g, 0.4);
  g.attack('a', { x: 1, y: 0 });
  assert.ok(b.hp < b.cfg.hp);
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
  put(ps[0], 20, 3);          // 아직 구역 밖
  run(g, 0.2); put(ps[1], 11, 9);   // 먼저 도착
  run(g, 0.2); put(ps[2], 13, 13);
  run(g, 0.2); put(ps[0], 15, 9);   // 가장 늦게 도착
  put(ps[3], 12, 11); // 이 사람은 곧 반대편으로 갈 것
  run(g, 0.2); put(ps[3], 28, 9);  // X 구역 (오답)
  put(ps[4], 20, 20);              // 구역 밖 (무응답)
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
  put(a, 12, 9); put(b, 20, 3);
  run(g, 0.3); put(b, 13, 13);  // b는 나중에 들어옴
  run(g, 0.3); put(a, 20, 3); // a가 밀려서 나갔다가
  run(g, 0.1); put(a, 12, 9);  // 다시 들어옴 → 초기화되어 b보다 늦다
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
  assert.equal(p.hp, p.cfg.hp);
});

test('더미 봇(공격형)이 가까운 참가자를 때린다 (공격 허용을 켰을 때)', () => {
  const g = new Game(chars, quizzes);
  g.botsCanAttack = true;
  const p = g.join({ token: 'a', name: 'A', charId: 'blue' });
  p.x = 20; p.y = 10;
  const bot = g.addBot('aggro', 'blue');
  bot.x = 25; bot.y = 10;
  run(g, 5);
  assert.ok(p.hp < p.cfg.hp || p.stunned || g.t < p.invUntil, `hp=${p.hp}`);
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
  assert.ok(dmg[2] > Math.max(dmg[0], dmg[1]), `3타가 1·2타보다 세다: ${dmg}`);
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
  assert.ok(up.hp < up.cfg.hp && right.hp === right.cfg.hp, '미리보기가 가리킨 대상만 맞음');
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
import { COIN, MAP, zoneAt } from '../shared/constants.js';

test('동전: 참가자가 있으면 3초마다 1개 생성, 없으면 생성 안 됨', () => {
  const g = new Game(chars, quizzes);
  run(g, 10);
  assert.equal(g.coins.size, 0, '참가자가 없으면 안 생김');
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.stunned = true; a.stunUntil = 1e9; // 우연히 동전을 줍지 않게
  run(g, 2.8); assert.equal(g.coins.size, 0);
  run(g, 0.4); assert.equal(g.coins.size, 1);
  assert.ok(g.events.some((e) => e.e === 'coinSpawn'));
  run(g, 3); assert.equal(g.coins.size, 2);
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

test('동전: 쓰러진 캐릭터는 못 줍고, 봇은 줍는다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 10; a.y = 10; a.stunned = true; a.stunUntil = g.t + 5;
  const bot = g.addBot('idle', 'blue'); bot.x = 15; bot.y = 10;
  g.spawnCoin(10.5, 10); g.spawnCoin(15.5, 10);
  run(g, 1);
  assert.equal(a.coins, 0);
  assert.equal(bot.coins, 1);
  assert.equal(g.coins.size, 1);
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
  g.coinsSpawned = COIN.maxTotal; // 타이머 동전이 섞이지 않게
  const ok = g.join({ token: 'o', name: 'OK', charId: 'blue' });
  const wrong = g.join({ token: 'w', name: 'WRONG', charId: 'blue' });
  const none = g.join({ token: 'n', name: 'NONE', charId: 'blue' });
  [ok, wrong, none].forEach((p) => g.giveCoins(p.id, 3));
  g.ask(1); run(g, 3.1); // 정답 O (왼쪽)
  const put = (p, x, y) => { p.x = x; p.y = y; p.kx = p.ky = 0; };
  put(ok, 12, 9); put(wrong, 28, 9); put(none, 20, 20);
  g.endQuestion();
  const by = Object.fromEntries(g.reveal.results.map((r) => [r.id, r]));
  assert.equal(by.o.dropped, 0); assert.equal(ok.coins, 3);
  assert.equal(by.w.dropped, 3); assert.equal(wrong.coins, 0);
  assert.equal(by.n.dropped, 3); assert.equal(none.coins, 0);
  assert.equal(g.coins.size, 6);
});

test('동전: 습득된 것까지 합쳐 최대 100개만 생성, 점수 초기화하면 다시 센다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.x = 1; a.y = 1; g.coinClock = -1e9; // 타이머는 잠시 끔
  for (let i = 0; i < 100; i++) { g.spawnCoin(a.x, a.y); run(g, 0.5); } // 생기자마자 주워도 센다
  assert.equal(a.coins, 100);
  assert.equal(g.spawnCoin(5, 5), null);
  g.coinClock = 0; run(g, 10); assert.equal(g.coins.size, 0, '타이머로도 더는 안 생김');
  g.resetScores();
  assert.equal(a.coins, 0);
  assert.ok(g.spawnCoin(5, 5));
});

test('순위표: 호스트가 켜면 스냅샷에 담기고, 다음 문제를 내면 꺼진다', () => {
  const g = new Game(chars, quizzes);
  g.join({ token: 'a', name: 'A', charId: 'blue' });
  assert.equal(g.snapshot().rank, false);
  g.showRank = true;
  assert.equal(g.snapshot().rank, true);
  g.ask(1);
  assert.equal(g.snapshot().rank, false);
});

test('봇: 문제가 나오면 무작위 구역으로 걸어가고, 틀린 구역의 봇만 동전을 떨어뜨린다', () => {
  const g = new Game(chars, quizzes);
  g.coinsSpawned = COIN.maxTotal;
  g.join({ token: 'h', name: 'H', charId: 'blue' }); // 사람 한 명 (참가자 없으면 의미가 없어서)
  const bots = Array.from({ length: 6 }, () => g.addBot('wander', 'blue'));
  bots.forEach((b) => { g.giveCoins(b.id, 2); });
  g.ask(1); run(g, 3.1); run(g, 12);
  assert.ok(bots.every((b) => zoneAt('ox', b.x, b.y) !== null), '모든 봇이 어느 구역엔가 도착');
  g.endQuestion();
  const right = bots.filter((b) => zoneAt('ox', b.x, b.y) === 'O');
  assert.ok(right.every((b) => b.coins === 2), '맞힌 봇은 동전 유지');
  assert.ok(bots.filter((b) => !right.includes(b)).every((b) => b.coins === 0), '틀린 봇은 동전을 떨어뜨림');
  assert.equal(g.coins.size, (bots.length - right.length) * 2);
  assert.ok(g.reveal.results.every((r) => !r.id.startsWith('bot')), '봇은 결과 점수에 안 들어감');
});

test('봇: 정지·공격형 테스트 봇은 문제를 풀지 않는다', () => {
  const g = new Game(chars, quizzes);
  g.join({ token: 'h', name: 'H', charId: 'blue' });
  const idle = g.addBot('idle', 'blue'); idle.x = 20; idle.y = 20;
  g.ask(1); run(g, 3.1); run(g, 10);
  assert.ok(Math.abs(idle.x - 20) < 0.01 && Math.abs(idle.y - 20) < 0.01);
});

// ---------- 캐릭터별 규칙 ----------
const duo = (a, b) => {
  const g = new Game(chars, quizzes);
  g.coinsSpawned = COIN.maxTotal; // 타이머 동전이 섞이지 않게
  const A = g.join({ token: 'a', name: 'A', charId: a });
  const B = g.join({ token: 'b', name: 'B', charId: b });
  A.x = 10; A.y = 10; B.x = 12; B.y = 10; A.kx = A.ky = B.kx = B.ky = 0;
  return { g, A, B };
};

test('체력 기준은 50 (파란티), 모든 캐릭터는 30~90', () => {
  assert.equal(chars.blue.hp, 50);
  for (const c of Object.values(chars)) assert.ok(c.hp >= 30 && c.hp <= 90, c.name);
});

test('귀상어 돌진: 3칸 달려가 처음 닿은 상대를 날리고 멈춘다. 쿨타임 6초', () => {
  const { g, A, B } = duo('hammerhead', 'blue');
  g.setInput('a', { mx: 1, my: 0, run: false });
  g.skill('a');
  g.setInput('a', { mx: 0, my: 0, run: false }); // 돌진 중에는 입력과 상관없이 나아감
  run(g, 0.4);
  assert.equal(B.hp, B.cfg.hp - 3, '돌진 피해 3');
  assert.ok(B.x > 12.8, `크게 날아감: ${B.x}`);
  assert.ok(A.x < 11.5, `부딪히면 멈춤: ${A.x}`);
  const x = A.x; g.skill('a'); run(g, 0.3);
  assert.ok(Math.abs(A.x - x) < 0.01 || A.x - x < 0.01, '쿨타임 중에는 안 나감');
  assert.ok(g.snapshot().players.find((p) => p.id === 'a').rg < 6);
  run(g, 6); g.setInput('a', { mx: 0, my: 0, run: false }); g.skill('a');
  assert.ok(g._dashing(A), '쿨타임이 지나면 다시 나감 (입력 없으면 바라보는 방향)');
});

test('귀상어 박치기: 부채꼴 ±90° 안의 상대를 모두 때린다', () => {
  const { g, A, B } = duo('hammerhead', 'blue');
  const C = g.join({ token: 'c', name: 'C', charId: 'blue' });
  B.x = 11.0; B.y = 10; C.x = 10.9; C.y = 9.1; // 앞쪽과 위쪽 가까이
  g.attack('a', { x: 1, y: 0 });
  const hd = chars.hammerhead.attack.dmgMin;
  assert.equal(B.hp, B.cfg.hp - hd);
  assert.equal(C.hp, C.cfg.hp - hd);
});

test('개구리: 도약은 없고 달리기(부스트) 스킬, 자동차라 기본 속도가 빠르다', () => {
  const { g, A } = duo('frog', 'blue');
  assert.equal(chars.frog.skill.type, 'run');
  assert.ok(chars.frog.walkSpeed > chars.blue.walkSpeed);
  g.setInput('a', { mx: 1, my: 0, run: false });
  g.skill('a'); // 대쉬 입력은 아무 일도 안 함
  assert.equal(g._dashing(A), false);
  g.setInput('a', { mx: 1, my: 0, run: true });
  const x0 = A.x; g.update(DT);
  assert.ok(Math.abs(A.x - x0 - chars.frog.runSpeed * DT) < 1e-6, '달리면 runSpeed');
});

test('개구리 혀: 사거리 3.5의 직선, 맞으면 밀리지 않고 끌려온다', () => {
  const { g, A, B } = duo('frog', 'blue');
  B.x = 13; B.y = 10; // 3칸 앞
  g.attack('a', null);
  const td = B.cfg.hp - B.hp, ta = chars.frog.attack;
  assert.ok(td >= ta.dmgMin && td <= ta.dmgMax, `혀 피해 ${td}`);
  run(g, 0.6);
  assert.ok(B.x < 13 - 0.2, `끌려옴: ${B.x}`);
  B.x = 14; B.y = 10; B.kx = B.ky = 0; const hp = B.hp; run(g, 0.6);
  g.attack('a', null); assert.equal(B.hp, hp, '3.5 밖은 안 맞음');
});

test('래브라도: 동전 줍는 반경이 넓다 (1.6 vs 기본 1.0)', () => {
  const { g, A, B } = duo('labrador', 'blue');
  A.x = 5; A.y = 5; B.x = 25; B.y = 15;
  g.coinsSpawned = 0; g.coinClock = -1e9; // 수동 생성만
  g.spawnCoin(6.5, 5); g.spawnCoin(26.5, 15);
  run(g, 0.5);
  assert.equal(A.coins, 1);
  assert.equal(B.coins, 0);
});

test('달리기 캐릭터는 스킬 입력이 아무 일도 하지 않는다', () => {
  const { g, A } = duo('blue', 'blue');
  g.setInput('a', { mx: 1, my: 0, run: false });
  g.skill('a');
  assert.equal(g._dashing(A), false);
});

test('대시 캐릭터는 달리기 입력을 무시하고, 기절하면 돌진이 끊긴다', () => {
  const { g, A } = duo('hammerhead', 'blue');
  g.setInput('a', { mx: 1, my: 0, run: true });
  g.update(DT);
  assert.equal(A.running, false);
  g.skill('a'); g.knockOut('a'); g.update(DT);
  assert.equal(g._dashing(A), false);
});

import { dpsOf, FIGHT_SEC, powerIndex, shotsOf } from './balance.js';

test('밸런스: 전투력 지수가 17~21.5 안 (개구리는 끌어당기는 혀가 있어 15 이상)', () => {
  for (const [id, c] of Object.entries(chars)) {
    const v = powerIndex(c);
    assert.ok(v >= (id === 'frog' ? 15 : 17) && v <= 21.5, `${c.name}: ${v.toFixed(1)}`);
    assert.ok(c.hp >= 30 && c.hp <= 90, `${c.name} 체력`);
  }
});

test('DPS 계산: 콤보 평균, 명중률, 범위, 돌진 피해를 반영한다', () => {
  const blue = dpsOf(chars.blue); // 평균 피해 × 콤보 평균 × 교전 중 발수 ÷ 교전 시간
  const a = chars.blue.attack;
  assert.ok(Math.abs(blue.basic - ((a.dmgMin + a.dmgMax) / 2) * ((2 + a.combo[2].dmg) / 3) * shotsOf(chars.blue) / FIGHT_SEC) < 1e-9);
  assert.ok(dpsOf(chars.brawler).dps > dpsOf(chars.brawler).basic, '돌진 피해가 더해짐');
  assert.ok(dpsOf(chars.witch).dps < dpsOf(chars.witch).basic, '느린 투사체는 명중률로 깎임');
  assert.ok(dpsOf(chars.bomber).dps > dpsOf(chars.bomber).basic * 0.65, '범위 공격은 보정이 붙음');
  assert.ok(dpsOf(chars.blue).dps < dpsOf({ ...chars.blue, ammo: undefined }).dps, '탄창이 있으면 교전 DPS가 낮아짐');
});

test('모든 캐릭터가 서버 규칙으로 문제없이 싸운다 (공격 → 스킬 → 이동)', () => {
  for (const id of Object.keys(chars)) {
    const g = new Game(chars, quizzes);
    const a = g.join({ token: 'a', name: 'A', charId: id });
    const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
    a.x = 10; a.y = 10; b.x = 11; b.y = 10;
    g.setInput('a', { mx: 1, my: 0, run: true });
    g.attack('a', null); g.skill('a');
    run(g, 1);
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.runGauge), id);
    const s = g.snapshot().players.find((p) => p.id === 'a');
    assert.ok(['run', 'dash'].includes(s.k) && s.mrg > 0, id);
  }
});

// ---------- 탄창 ----------
test('탄창: 3발로 시작해 쏠 때마다 줄고, 비면 못 쏘고, 시간이 지나면 한 발씩 장전된다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'elf' }); // 장전 2.2초
  g.join({ token: 'b', name: 'B', charId: 'blue' }).x = 30;
  a.x = 10; a.y = 10;
  const atks = () => g.events.filter((e) => e.e === 'atk').length;
  assert.equal(g.snapshot().players.find((p) => p.id === 'a').am, 3);
  for (let i = 0; i < 3; i++) { a.nextAttackAt = 0; g.attack('a', null); } // 쿨타임은 건너뛰고 탄창만 본다
  assert.equal(atks(), 3);
  assert.ok(a.ammoF < 0.01, '3발 모두 소모');
  a.nextAttackAt = 0; g.attack('a', null);
  assert.equal(atks(), 3, '탄창이 비면 안 나감');
  run(g, 2.3);
  assert.ok(a.ammoF >= 1 && a.ammoF < 2, '2.2초에 한 발 장전');
  g.attack('a', null);
  assert.equal(atks(), 4);
});

test('탄창: 연타해도 교전 중 발수는 탄창+장전 한계를 넘지 못한다', () => {
  for (const id of ['blue', 'puppy', 'elf', 'bomber']) {
    const g = new Game(chars, quizzes);
    const a = g.join({ token: 'a', name: 'A', charId: id });
    const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
    a.x = 10; a.y = 10; b.x = 10.9; b.y = 10;
    let n = 0;
    for (let i = 0; i < 300; i++) { // 10초 동안 매 틱 연타
      const before = a.ammoF; g.attack('a', null); if (a.ammoF < before) n++;
      b.x = 10.9; b.y = 10; b.kx = b.ky = 0; b.hp = 9999; g.update(DT);
    }
    const max = chars[id].ammo.max + 10 / chars[id].ammo.reload;
    assert.ok(n <= Math.ceil(max) + 1, `${id}: ${n}발 (한계 ${max.toFixed(1)})`);
    assert.ok(n >= Math.floor(max) - 2, `${id}: 탄창을 거의 다 씀 ${n}`);
  }
});

test('탄창: 문제가 시작되면 가득 찬다, 스냅샷에 남은 발수가 담긴다', () => {
  const g = new Game(chars, quizzes);
  const a = g.join({ token: 'a', name: 'A', charId: 'blue' });
  a.ammoF = 0.4; g.ask(1);
  assert.equal(a.ammoF, 3);
  const s = g.snapshot().players[0];
  assert.deepEqual([s.am, s.mam], [3, 3]);
});

test('공격봇: 봇끼리도 서로 공격한다. random으로 무작위 캐릭터 봇을 만든다', () => {
  const g = new Game(chars, quizzes);
  g.botsCanAttack = true;
  const ids = new Set();
  for (let i = 0; i < 8; i++) ids.add(g.addBot('aggro', 'random').charId);
  assert.ok(ids.size >= 2, '캐릭터가 섞임');
  g.humans().forEach((h) => g.players.delete(h.id));
  run(g, 15);
  const hurt = [...g.players.values()].filter((p) => p.hp < p.cfg.hp || p.stunned || g.t < p.invUntil);
  assert.ok(hurt.length >= 3, `서로 싸운 봇 ${hurt.length}`);
});

test('공격형 봇도 문제를 풀고(구역으로 이동), 정지 봇은 풀지 않는다', () => {
  const g = new Game(chars, quizzes);
  g.coinsSpawned = COIN.maxTotal;
  g.botsCanAttack = true;
  g.join({ token: 'h', name: 'H', charId: 'blue' });
  const fighters = Array.from({ length: 5 }, () => g.addBot('aggro', 'blue'));
  g.ask(1); run(g, 3.1); run(g, 12);
  assert.ok(fighters.every((b) => zoneAt('ox', b.x, b.y) !== null), '공격형도 어느 구역엔가 도착');
});

test('크리티컬: 확률로 피해가 1.5배가 되고, hit 이벤트에 crit가 담긴다', () => {
  const hit = () => {
    const g = new Game(chars, quizzes);
    const a = g.join({ token: 'a', name: 'A', charId: 'blue_ranged' }); // 피해 고정(4)이라 비교가 쉬움
    const b = g.join({ token: 'b', name: 'B', charId: 'blue' });
    a.x = 10; a.y = 10; b.x = 12; b.y = 10; a.kx = a.ky = b.kx = b.ky = 0;
    g.attack('a', null); run(g, 0.5);
    return { dmg: b.cfg.hp - b.hp, ev: g.events.find((e) => e.e === 'hit') };
  };
  const base = hit(); // 이 파일에서는 CRIT.chance가 0
  assert.equal(base.ev.crit, false);
  CRIT.chance = 1;
  try {
    const c = hit();
    assert.equal(c.ev.crit, true);
    assert.equal(c.dmg, Math.round(base.dmg * CRIT.mul));
    assert.ok(c.dmg > base.dmg);
  } finally { CRIT.chance = 0; }
});

test('오크: 예고 0.4초 뒤에 부채꼴로 타격, 그 전에 쓰러지면 취소, 예고 중 벗어나면 안 맞음', () => {
  const { g, A, B } = duo('orc', 'blue');
  const w = chars.orc.attack.windup;
  assert.ok(w > 0);
  B.x = A.x + 1.2; B.y = A.y; const hp = B.hp;
  g.attack('a', null);
  assert.equal(B.hp, hp, '예고 중엔 피해 없음');
  assert.ok(g.events.some((e) => e.e === 'windup' && e.sec === w));
  run(g, w + 0.05);
  assert.ok(B.hp < hp, '예고 후 타격');
  // 피하기
  run(g, 1); B.x = A.x + 1.2; B.hp = B.cfg.hp; B.invUntil = 0;
  g.attack('a', null); B.x = A.x + 4; run(g, w + 0.05);
  assert.equal(B.hp, B.cfg.hp, '벗어나면 안 맞음');
  // 취소
  run(g, 1); B.x = A.x + 1.2;
  g.attack('a', null); g.knockOut('a'); run(g, w + 0.05);
  assert.equal(B.hp, B.cfg.hp, '쓰러지면 취소');
});
