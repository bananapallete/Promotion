// 궁극기: 때리거나 맞으면 충전되고, 가득 차면 쓸 수 있다. 종류(type)는 6가지이고 캐릭터마다 수치만 다르다.
//   rush 돌진(닿는 상대 모두) · burst 내 주변 범위(화상·회전 가능) · buff 일정 시간 강화(은신 포함) · barrage 투사체 난사 · meteor 예고 후 폭발 · zone 바닥 범위 지속 피해(진흙은 느려짐+회복)
//   slam 제자리에서 원뿔 내려찍기를 연달아(오크) · channel 서서 시전(채널링: 느려지고 맞으면 끊김) · charm 매혹 · orbit 몸 주위를 도는 별 · snipe 조준 뒤 관통 빔
//   pull 혀로 끌어당김 · wave 맵을 쓸고 가는 파도 · magnet 동전 끌어당김 · chain 순간이동 연타 · wall 막는 벽
const r2 = (n) => Math.round(n * 100) / 100;
const rand = (a, b) => a + Math.random() * (b - a);

export const ULT_TYPES = ['rush', 'burst', 'buff', 'barrage', 'meteor', 'zone', 'pull', 'wave', 'magnet', 'chain', 'wall', 'channel', 'charm', 'orbit', 'snipe', 'slam', 'tether', 'phoenix'];
export const CHARGE_TAKEN = 0.5; // 맞은 피해는 때린 피해의 절반만큼 충전

export const ultReady = (p) => !!p.cfg.ult && p.ult >= p.cfg.ult.need;
export const buffOf = (g, p) => (p.buff && g.t < p.buff.until ? p.buff : null);

export function charge(p, amount) {
  const u = p.cfg?.ult;
  if (u && amount > 0) p.ult = Math.min(u.need, (p.ult || 0) + amount);
}

/** game.ult(id, aim) 에서 호출. 조건(충전·기절·돌진 중)은 호출 쪽에서 확인 */
export function useUlt(g, p, aim) {
  const u = p.cfg.ult;
  p.ult = 0;
  const { dx, dy, near, manual } = g._aimDir(p, aim, u.range ?? 6);
  p.aimM = manual ? Number(aim.m) || null : null; // 직접 조준: 드래그 길이(0~1)로 거리 조절 (center가 읽음)
  if (Math.abs(dx) > 0.15) p.face = dx > 0 ? 1 : -1;
  g.events.push({ e: 'ult', id: p.id, name: u.name, t: u.type, x: r2(p.x), y: r2(p.y), dx: r2(dx), dy: r2(dy), r: u.radius ?? 0, sec: u.sec ?? 0, dist: u.dist ?? 0 });
  RUN[u.type](g, p, u, dx, dy, near);
}

/** 궁극기로 때린 피해는 충전량이 절반 (game._applyHit이 ultDepth를 본다) */
export const hit = (g, ...a) => { g.ultDepth++; try { g._applyHit(...a); } finally { g.ultDepth--; } };
const later = (g, delay, fn) => (delay <= 0 ? fn() : g.tasks.push({ at: g.t + delay, fn }));

/** 조준 중심: 가까운 상대(사거리 안) → 없으면 앞쪽 */
function center(g, p, u, dx, dy, near) {
  if (u.center === 'self') return { x: p.x, y: p.y };
  if (near) return { x: near.x, y: near.y };
  const d = (u.range ?? 6) * (p.aimM ?? 0.7);
  return { x: Math.min(g.map.w - 0.5, Math.max(0.5, p.x + dx * d)), y: Math.min(g.map.h - 0.5, Math.max(0.5, p.y + dy * d)) };
}

function hitArea(g, owner, x, y, r, dmg, knock, fx, root, after) {
  for (const o of g._enemies(owner)) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (d > r + o.cfg.radius) continue;
    const nx = d > 1e-6 ? (o.x - x) / d : 1, ny = d > 1e-6 ? (o.y - y) / d : 0;
    hit(g, o, owner, dmg, knock, nx, ny, fx);
    if (root) o.rootUntil = Math.max(o.rootUntil, g.t + root);
    after?.(o);
  }
}

const RUN = {
  rush(g, p, u, dx, dy) { // 일직선으로 달려가며 닿는 모두에게 피해
    p.dash = { dx, dy, speed: u.dist / u.dur, until: g.t + u.dur, pass: true, hitDmg: 0, hitKnock: 0, hitAll: { dmg: u.dmg, knock: u.knock, done: new Set() } };
    p.invUntil = Math.max(p.invUntil, g.t + u.dur + 0.15);
  },

  burst(g, p, u) { // 내 주변 원형 범위. hits번 gap초 간격으로 반복할 수 있음 (inv: 도는 동안 무적, burn: 맞으면 화상)
    const n = u.hits ?? 1, gap = u.gap ?? 0.25;
    if (u.inv) p.invUntil = Math.max(p.invUntil, g.t + n * gap + 0.1);
    for (let i = 0; i < n; i++) {
      later(g, i * gap, () => {
        if (p.stunned) return;
        g.events.push({ e: 'burst', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius, fx: u.fx });
        hitArea(g, p, p.x, p.y, u.radius, u.dmg, u.knock ?? 0, u.fx, u.root, u.burn ? (o) => { o.burnUntil = g.t + u.burn.sec; o.burnBy = p.id; o.burnNext = g.t + u.burn.tick; o.burnDmg = u.burn.dmg; } : undefined);
      });
    }
  },

  buff(g, p, u) { // 일정 시간 강화: 이동(spd) 공격속도(atk) 피해(dmg) 무적(inv) 크리티컬 확정(crit) 줍기 범위(pickup)
    p.buff = { until: g.t + u.sec, spd: u.spd ?? 1, atk: u.atk ?? 1, dmg: u.dmg ?? 1, crit: !!u.crit, pickup: u.pickup ?? 1, stealth: !!u.stealth, assassin: u.assassin ?? 0 };
    if (u.inv) p.invUntil = Math.max(p.invUntil, g.t + u.sec);
    if (u.morph) p.buff.morph = u.morph; // 다른 캐릭터 그림으로 변신 (도트 크기는 그대로)
    if (u.scale > 1) { p.buff.scale = u.scale; if (!p.baseCfg) { p.baseCfg = p.cfg; p.cfg = { ...p.cfg, radius: p.cfg.radius * u.scale }; } } // 커진 만큼 몸집(충돌)도 커짐
    if (u.heal) { const h = Math.min(p.cfg.hp - p.hp, Math.ceil(p.cfg.hp * u.heal)); if (h > 0) { p.hp += h; g.events.push({ e: 'itemGet', id: 0, k: 'heart', by: p.id, amount: h, x: r2(p.x), y: r2(p.y) }); } }
  },

  phoenix(g, p, u) { // 불새 변신: 받는 피해 감소 → sec초 뒤 주변에 큰 피해를 주고 자폭 → 알이 되어 stunSec 뒤 부활 (동전은 안 잃음)
    const b = p.buff = { until: g.t + u.sec, spd: u.spd ?? 1, atk: 1, dmg: 1, crit: false, pickup: 1, stealth: false, assassin: 0, morph: 'phoenix' };
    p.shield = { until: g.t + u.sec, mul: u.shield };
    later(g, u.sec, () => {
      if (p.buff !== b || p.stunned) return; // 그 전에 쓰러졌으면 터지지 않음
      g.events.push({ e: 'burst', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius, fx: u.fx });
      hitArea(g, p, p.x, p.y, u.radius, u.dmg, u.knock ?? 0, u.fx);
      p.buff = null; p.shield = null; p.egg = true; p.hp = 0; p.stunned = true; p.stunUntil = g.t + p.cfg.stunSec; p.kx = p.ky = 0; // _ko와 달리 동전을 떨구지 않음
      g.events.push({ e: 'stun', id: p.id });
    });
  },

  channel(g, p, u) { // 서서 시전하는 동안 tick마다 주변을 때림. 느려지고, 기절하면 끊김
    const ch = p.channel = { until: g.t + u.sec, move: u.move ?? 0.4 };
    if (u.inv) p.invUntil = Math.max(p.invUntil, g.t + u.sec);
    for (let i = 0; i * u.tick < u.sec - 1e-6; i++) {
      later(g, i * u.tick, () => {
        if (p.channel !== ch || p.stunned) return;
        g.events.push({ e: 'burst', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius, fx: u.fx });
        hitArea(g, p, p.x, p.y, u.radius, u.dmg, 0, u.fx, 0, u.burn ? (o) => { o.burnUntil = g.t + u.burn.sec; o.burnBy = p.id; o.burnNext = g.t + u.burn.tick; o.burnDmg = u.burn.dmg; } : undefined);
      });
    }
  },

  tether(g, p, u) { // 가까운 적 n명을 혀로 묶음: 개구리에게서 멀어지려 하면 저항을 받는다
    const ts = g._enemies(p).filter((o) => !g._stealthed(o) && Math.hypot(o.x - p.x, o.y - p.y) <= u.radius).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, u.n);
    for (const o of ts) o.tether = { by: p.id, until: g.t + u.sec, len: u.len, resist: u.resist, pull: u.pull };
    g.events.push({ e: 'tetherStart', id: p.id, x: r2(p.x), y: r2(p.y), r: 2 });
  },

  slam(g, p, u, dx, dy) { // 제자리(못 움직임)에서 원뿔 내려찍기를 hits 목록대로 연달아. 기절하면 끊김
    const ch = p.channel = { until: g.t + u.sec, move: 0 }, cos = Math.cos((u.arc * Math.PI) / 180);
    for (const h of u.hits) {
      later(g, h.at, () => {
        if (p.channel !== ch || p.stunned) return;
        let ax = dx, ay = dy; // 가까운 상대가 있으면 그쪽으로, 없으면 처음 방향
        const t = g._enemies(p).filter((o) => !g._stealthed(o) && Math.hypot(o.x - p.x, o.y - p.y) <= h.range).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (t) { const d = Math.hypot(t.x - p.x, t.y - p.y) || 1; ax = (t.x - p.x) / d; ay = (t.y - p.y) / d; }
        if (Math.abs(ax) > 0.15) p.face = ax > 0 ? 1 : -1;
        g.events.push({ e: 'atk', id: p.id, dx: r2(ax), dy: r2(ay), kind: 'melee', fx: 'smash', arc: u.arc, step: 2, range: h.range, len: h.range });
        for (const o of g._enemies(p)) {
          const vx = o.x - p.x, vy = o.y - p.y, d = Math.hypot(vx, vy);
          if (d <= h.range && d > 0 && (vx * ax + vy * ay) / d >= cos) hit(g, o, p, h.dmg, 0, ax, ay, 'smash');
        }
      });
    }
  },

  charm(g, p, u) { // 범위 안 상대가 나에게 걸어오고, 그동안 공격·스킬을 못 씀
    for (const o of g._enemies(p)) if (Math.hypot(o.x - p.x, o.y - p.y) <= u.radius) { o.charmUntil = g.t + u.sec; o.charmBy = p.id; }
    g.events.push({ e: 'charm', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius });
  },

  orbit(g, p, u) { // 몸 주위를 도는 별: 닿는 상대를 gap초마다 한 번씩 때림
    p.orbit = { until: g.t + u.sec, n: u.n, r: u.r, w: u.speed, a0: 0, t0: g.t, dmg: u.dmg, gap: u.hitGap ?? 0.6, hit: new Map() };
  },

  snipe(g, p, u, dx, dy, near) { // 제자리에서 aim초 조준(못 움직임) 뒤 굵은 관통 빔
    p.rootUntil = Math.max(p.rootUntil, g.t + u.aim + 0.25);
    g.events.push({ e: 'snipeAim', id: p.id, x: r2(p.x), y: r2(p.y), dx: r2(dx), dy: r2(dy), sec: u.aim, range: u.range, width: u.width });
    later(g, u.aim, () => {
      if (p.stunned) return;
      let ax = dx, ay = dy;
      if (near && !near.stunned) { const d = Math.hypot(near.x - p.x, near.y - p.y) || 1; ax = (near.x - p.x) / d; ay = (near.y - p.y) / d; }
      g.events.push({ e: 'beam', id: p.id, x: r2(p.x), y: r2(p.y), dx: r2(ax), dy: r2(ay), range: u.range, width: u.width });
      for (const o of g._enemies(p)) {
        const vx = o.x - p.x, vy = o.y - p.y, along = vx * ax + vy * ay, perp = Math.abs(vx * ay - vy * ax);
        if (along > 0 && along <= u.range && perp <= u.width / 2 + o.cfg.radius) hit(g, o, p, u.dmg, 0, ax, ay, 'arrow');
      }
    });
  },

  barrage(g, p, u, dx, dy) { // 투사체 n발: ring 사방 / fan 부채꼴 / line 조준 방향으로 연속
    const base = Math.atan2(dy, dx), n = u.n;
    for (let i = 0; i < n; i++) {
      const a = u.pattern === 'ring' ? base + (i / n) * Math.PI * 2 + (i % 2) * 0.1
        : u.pattern === 'fan' ? base + ((i / Math.max(1, n - 1)) - 0.5) * ((u.spread ?? 60) * Math.PI / 180) : base;
      later(g, u.pattern === 'line' || !u.over ? (i * (u.over ?? 0)) / n : (u.pattern === 'ring' ? Math.floor(i / (n / 2)) * (u.over ?? 0) : 0), () => {
        if (p.stunned) return;
        const vx = Math.cos(a), vy = Math.sin(a), id = ++g.projSeq;
        g.projectiles.set(id, { id, ult: true, owner: p.id, art: u.art, dmgMin: u.dmg, dmgMax: u.dmg, knock: u.knock ?? 0.4, kind: 'bolt', x: p.x, y: p.y, dx: vx, dy: vy, vx: vx * u.speed, vy: vy * u.speed, speed: u.speed, travel: 0, maxDist: u.range, radius: u.radius ?? 0.3, pierce: !!u.pierce, hit: new Set() });
      });
    }
  },

  meteor(g, p, u, dx, dy, near) { // 정해진 중심 둘레 무작위 지점에 예고 원 → warn초 뒤 폭발
    const c = center(g, p, u, dx, dy, near);
    for (let i = 0; i < u.n; i++) {
      const ang = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * (u.spread ?? 3);
      const x = Math.min(g.map.w - 0.5, Math.max(0.5, c.x + Math.cos(ang) * d)), y = Math.min(g.map.h - 0.5, Math.max(0.5, c.y + Math.sin(ang) * d));
      later(g, (i * (u.over ?? 1)) / u.n, () => {
        g.events.push({ e: 'warn', x: r2(x), y: r2(y), r: u.blast, sec: u.warn ?? 0.7, art: u.art });
        later(g, u.warn ?? 0.7, () => {
          g.events.push({ e: 'boom', x: r2(x), y: r2(y), r: u.blast, art: u.art });
          hitArea(g, p, x, y, u.blast, u.dmg, u.knock ?? 0.8, u.art);
        });
      });
    }
  },

  pull(g, p, u) { // 범위 안 모든 상대를 내 쪽으로 끌어당기고 잠깐 묶음
    const ts = [];
    for (const o of g._enemies(p)) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d > u.radius || d < 1e-6) continue;
      ts.push({ x: r2(o.x), y: r2(o.y) });
      hit(g, o, p, u.dmg, Math.max(0, d - 1.3), (p.x - o.x) / d, (p.y - o.y) / d, 'tongue');
      o.rootUntil = Math.max(o.rootUntil, g.t + u.root);
    }
    g.events.push({ e: 'pull', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius, ts });
  },

  wave(g, p, u, dx, dy) { // 맵을 쓸고 가는 거대한 파도: 폭이 넓은 관통 투사체, 맞으면 묶인 채 파도에 휩쓸려 함께 밀려감
    const id = ++g.projSeq;
    g.projectiles.set(id, { id, ult: true, owner: p.id, art: 'wave', dmgMin: u.dmg, dmgMax: u.dmg, knock: 0, root: u.root, carry: u.carry, kind: 'bolt', x: p.x, y: p.y, dx, dy, vx: dx * u.speed, vy: dy * u.speed, speed: u.speed, travel: 0, maxDist: u.range, radius: u.width / 2, pierce: true, hit: new Set(), carried: new Map() });
  },

  magnet(g, p, u) { // 반경 안의 맵 동전은 전부, 다른 사람이 든 동전은 한 명당 최대 steal개를 흡수하고 잠깐 빨라짐
    let n = 0;
    const R = u.radius ?? 8, near = (o) => Math.hypot(o.x - p.x, o.y - p.y) <= R;
    for (const o of g._enemies(p)) { // 든 동전 흡수: 동전을 주울 때와 같은 모션(상대 자리에서 떠올라 내 머리 위로)
      const k = Math.min(u.steal ?? 4, o.coins);
      if (k <= 0 || !near(o)) continue;
      o.coins -= k; p.coins += k; n += k;
      for (let i = 0; i < k; i++) g.events.push({ e: 'coinGet', id: ++g.coinSeq, by: p.id, x: r2(o.x + (Math.random() - 0.5) * 0.6), y: r2(o.y + (Math.random() - 0.5) * 0.6) });
    }
    for (const c of [...g.coins.values()]) {
      if (g.t < c.readyAt || !near(c)) continue;
      g.coins.delete(c.id); p.coins += 1; n++;
      g.events.push({ e: 'coinGet', id: c.id, by: p.id, x: r2(c.x), y: r2(c.y) });
    }
    RUN.buff(g, p, { sec: u.sec, spd: u.spd });
    g.events.push({ e: 'magnet', id: p.id, x: r2(p.x), y: r2(p.y), r: R, n });
  },

  chain(g, p, u, dx, dy, near) { // 가까운 상대 뒤로 순간이동해서 hits연타, 마지막은 큰 일격
    let t = near;
    if (!t) t = g._enemies(p).filter((o) => !g._stealthed(o) && Math.hypot(o.x - p.x, o.y - p.y) <= u.range).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    let ax = dx, ay = dy;
    if (t) {
      const d = Math.hypot(t.x - p.x, t.y - p.y) || 1;
      ax = (t.x - p.x) / d; ay = (t.y - p.y) / d;
      g.events.push({ e: 'blink', id: p.id, fx: r2(p.x), fy: r2(p.y), tx: r2(t.x - ax * 0.9), ty: r2(t.y - ay * 0.9) });
      p.x = t.x - ax * 0.9; p.y = t.y - ay * 0.9; g._clamp(p);
      if (Math.abs(ax) > 0.15) p.face = ax > 0 ? 1 : -1;
    }
    p.invUntil = Math.max(p.invUntil, g.t + u.hits * u.gap + 0.3);
    for (let i = 0; i < u.hits; i++) {
      later(g, 0.12 + i * u.gap, () => {
        if (p.stunned) return;
        const last = i === u.hits - 1;
        g.events.push({ e: 'atk', id: p.id, dx: r2(ax), dy: r2(ay), kind: 'melee', fx: 'punch', arc: 60, step: last ? 2 : i % 2, range: 1.3, len: 1.3 });
        const hits = g._enemies(p).filter((o) => Math.hypot(o.x - p.x, o.y - p.y) <= 1.6 && !o.stunned);
        for (const o of hits) hit(g, o, p, last ? u.finish : u.dmg, 0, ax, ay, 'punch');
      });
    }
  },

  wall(g, p, u, dx, dy) { // 앞에 막는 벽 (축 방향으로 맞춤)
    const horiz = Math.abs(dx) >= Math.abs(dy), sx = horiz ? Math.sign(dx || p.face) : 0, sy = horiz ? 0 : Math.sign(dy);
    const hx = horiz ? u.thick / 2 : u.len / 2, hy = horiz ? u.len / 2 : u.thick / 2;
    const x = Math.min(g.map.w - hx, Math.max(hx, p.x + sx * u.dist)), y = Math.min(g.map.h - hy, Math.max(hy, p.y + sy * u.dist));
    const id = ++g.wallSeq;
    g.walls.set(id, { id, owner: p.id, x, y, hx, hy, until: g.t + u.sec });
    g.events.push({ e: 'wall', id: p.id, x: r2(x), y: r2(y), hx: r2(hx), hy: r2(hy) });
  },

  zone(g, p, u, dx, dy, near) { // 바닥에 지속 피해 범위를 남김
    const c = center(g, p, u, dx, dy, near), id = ++g.zoneSeq;
    g.zonesU.set(id, { id, owner: p.id, x: c.x, y: c.y, r: u.radius, until: g.t + u.sec, next: g.t + (u.tick ?? 0.5), tick: u.tick ?? 0.5, dmg: u.dmg ?? 0, kind: u.kind, art: u.kind === 'fire' ? 'bottle' : 'arrow', slow: u.slow, heal: u.heal, shield: u.shield });
  },
};

/** 매 틱: 예약된 일 실행 + 바닥 범위 피해 */
export function updateUlts(g) {
  if (g.tasks.length) {
    const due = g.tasks.filter((k) => g.t >= k.at);
    if (due.length) { g.tasks = g.tasks.filter((k) => g.t < k.at); due.forEach((k) => k.fn()); }
  }
  for (const z of [...g.zonesU.values()]) {
    if (g.t >= z.until) { g.zonesU.delete(z.id); continue; }
    if (g.t < z.next) continue;
    z.next += z.tick;
    const owner = g.players.get(z.owner);
    if (!owner) continue;
    if (z.dmg) hitArea(g, owner, z.x, z.y, z.r, z.dmg, 0, z.art);
    if (z.kind === 'mud') { // 진흙: 안의 상대는 느려지고, 안의 주인은 회복하며 피해가 줄어듦
      for (const o of g._enemies(owner)) if (Math.hypot(o.x - z.x, o.y - z.y) <= z.r + o.cfg.radius) { o.slowUntil = g.t + z.tick + 0.3; o.slowMul = z.slow ?? 0.5; }
      if (!owner.stunned && Math.hypot(owner.x - z.x, owner.y - z.y) <= z.r) {
        const heal = Math.min(owner.cfg.hp - owner.hp, z.heal ?? 3);
        if (heal > 0) { owner.hp += heal; g.events.push({ e: 'itemGet', id: 0, k: 'heart', by: owner.id, amount: heal, x: r2(owner.x), y: r2(owner.y) }); }
        owner.shield = { until: g.t + z.tick + 0.3, mul: z.shield ?? 0.5 };
      }
    }
  }
  for (const p of g.players.values()) { // 화상: 일정 간격으로 지속 피해
    if (g.t < p.burnUntil && g.t >= p.burnNext && !p.stunned) {
      p.burnNext += 0.5;
      const by = g.players.get(p.burnBy);
      if (by) hit(g, p, by, p.burnDmg ?? 2, 0, 0, 0, 'crescent');
    }
  }
  for (const w of [...g.walls.values()]) if (g.t >= w.until) g.walls.delete(w.id);
  for (const p of g.players.values()) {
    if (p.baseCfg && (!p.buff || g.t >= p.buff.until)) { p.cfg = p.baseCfg; p.baseCfg = null; } // 진화 끝: 원래 크기
    const o = p.orbit;
    if (!o) continue;
    if (g.t >= o.until || p.stunned) { p.orbit = null; continue; }
    for (let i = 0; i < o.n; i++) {
      const a = o.a0 + o.w * (g.t - o.t0) + (i / o.n) * Math.PI * 2, sx = p.x + Math.cos(a) * o.r, sy = p.y + Math.sin(a) * o.r;
      for (const e of g._enemies(p)) {
        if (e.stunned || (o.hit.get(e.id) ?? 0) > g.t || Math.hypot(e.x - sx, e.y - sy) > 0.7 + e.cfg.radius) continue;
        o.hit.set(e.id, g.t + o.gap);
        hit(g, e, p, o.dmg, 0, (e.x - sx) || 1, e.y - sy, 'star');
      }
    }
  }
}

/** 성벽: 주인 말고는 지나갈 수 없다 (안에 있으면 가까운 쪽 면으로 밀어냄) */
export function blockWalls(g, list) {
  for (const w of g.walls.values()) {
    for (const p of list) {
      if (p.id === w.owner || p.dashPass) continue;
      const dx = p.x - w.x, dy = p.y - w.y, ox = w.hx + p.cfg.radius - Math.abs(dx), oy = w.hy + p.cfg.radius - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) p.x += Math.sign(dx || 1) * ox; else p.y += Math.sign(dy || 1) * oy;
      g._clamp(p);
    }
  }
}

export const wallsSnapshot = (g) => [...g.walls.values()].map((w) => ({ id: w.id, x: r2(w.x), y: r2(w.y), hx: r2(w.hx), hy: r2(w.hy), l: r2(Math.max(0, w.until - g.t)) }));
export const zonesSnapshot = (g) => [...g.zonesU.values()].map((z) => ({ id: z.id, x: r2(z.x), y: r2(z.y), r: z.r, k: z.kind, l: r2(Math.max(0, z.until - g.t)) }));
