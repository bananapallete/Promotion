// 궁극기: 때리거나 맞으면 충전되고, 가득 차면 쓸 수 있다. 종류(type)는 6가지이고 캐릭터마다 수치만 다르다.
//   rush 돌진(닿는 상대 모두) · burst 내 주변 범위 · buff 일정 시간 강화 · barrage 투사체 난사 · meteor 예고 후 폭발 · zone 바닥 범위 지속 피해
const r2 = (n) => Math.round(n * 100) / 100;
const rand = (a, b) => a + Math.random() * (b - a);

export const ULT_TYPES = ['rush', 'burst', 'buff', 'barrage', 'meteor', 'zone'];
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
  const { dx, dy, near } = g._aimDir(p, aim, u.range ?? 6);
  if (Math.abs(dx) > 0.15) p.face = dx > 0 ? 1 : -1;
  g.events.push({ e: 'ult', id: p.id, name: u.name, t: u.type, x: r2(p.x), y: r2(p.y), dx: r2(dx), dy: r2(dy), r: u.radius ?? 0, sec: u.sec ?? 0 });
  RUN[u.type](g, p, u, dx, dy, near);
}

const later = (g, delay, fn) => (delay <= 0 ? fn() : g.tasks.push({ at: g.t + delay, fn }));

/** 조준 중심: 가까운 상대(사거리 안) → 없으면 앞쪽 */
function center(g, p, u, dx, dy, near) {
  if (u.center === 'self') return { x: p.x, y: p.y };
  if (near) return { x: near.x, y: near.y };
  const d = (u.range ?? 6) * 0.7;
  return { x: Math.min(g.map.w - 0.5, Math.max(0.5, p.x + dx * d)), y: Math.min(g.map.h - 0.5, Math.max(0.5, p.y + dy * d)) };
}

function hitArea(g, owner, x, y, r, dmg, knock, fx, root) {
  for (const o of g._enemies(owner)) {
    const d = Math.hypot(o.x - x, o.y - y);
    if (d > r + o.cfg.radius) continue;
    const nx = d > 1e-6 ? (o.x - x) / d : 1, ny = d > 1e-6 ? (o.y - y) / d : 0;
    g._applyHit(o, owner, dmg, knock, nx, ny, fx);
    if (root) o.rootUntil = Math.max(o.rootUntil, g.t + root);
  }
}

const RUN = {
  rush(g, p, u, dx, dy) { // 일직선으로 달려가며 닿는 모두에게 피해
    p.dash = { dx, dy, speed: u.dist / u.dur, until: g.t + u.dur, pass: true, hitDmg: 0, hitKnock: 0, hitAll: { dmg: u.dmg, knock: u.knock, done: new Set() } };
    p.invUntil = Math.max(p.invUntil, g.t + u.dur + 0.15);
  },

  burst(g, p, u) { // 내 주변 원형 범위. hits번 gap초 간격으로 반복할 수 있음
    for (let i = 0; i < (u.hits ?? 1); i++) {
      later(g, i * (u.gap ?? 0.25), () => {
        if (p.stunned) return;
        g.events.push({ e: 'burst', id: p.id, x: r2(p.x), y: r2(p.y), r: u.radius, fx: u.fx });
        hitArea(g, p, p.x, p.y, u.radius, u.dmg, u.knock ?? 1, u.fx, u.root);
      });
    }
  },

  buff(g, p, u) { // 일정 시간 강화: 이동(spd) 공격속도(atk) 피해(dmg) 무적(inv) 크리티컬 확정(crit) 줍기 범위(pickup)
    p.buff = { until: g.t + u.sec, spd: u.spd ?? 1, atk: u.atk ?? 1, dmg: u.dmg ?? 1, crit: !!u.crit, pickup: u.pickup ?? 1 };
    if (u.inv) p.invUntil = Math.max(p.invUntil, g.t + u.sec);
  },

  barrage(g, p, u, dx, dy) { // 투사체 n발: ring 사방 / fan 부채꼴 / line 조준 방향으로 연속
    const base = Math.atan2(dy, dx), n = u.n;
    for (let i = 0; i < n; i++) {
      const a = u.pattern === 'ring' ? base + (i / n) * Math.PI * 2 + (i % 2) * 0.1
        : u.pattern === 'fan' ? base + ((i / Math.max(1, n - 1)) - 0.5) * ((u.spread ?? 60) * Math.PI / 180) : base;
      later(g, u.pattern === 'line' || !u.over ? (i * (u.over ?? 0)) / n : (u.pattern === 'ring' ? Math.floor(i / (n / 2)) * (u.over ?? 0) : 0), () => {
        if (p.stunned) return;
        const vx = Math.cos(a), vy = Math.sin(a), id = ++g.projSeq;
        g.projectiles.set(id, { id, owner: p.id, art: u.art, dmgMin: u.dmg, dmgMax: u.dmg, knock: u.knock ?? 0.4, kind: 'bolt', x: p.x, y: p.y, dx: vx, dy: vy, vx: vx * u.speed, vy: vy * u.speed, speed: u.speed, travel: 0, maxDist: u.range, radius: u.radius ?? 0.3, pierce: !!u.pierce, hit: new Set() });
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
          g.events.push({ e: 'boom', x: r2(x), y: r2(y), r: u.blast });
          hitArea(g, p, x, y, u.blast, u.dmg, u.knock ?? 0.8, u.art);
        });
      });
    }
  },

  zone(g, p, u, dx, dy, near) { // 바닥에 지속 피해 범위를 남김
    const c = center(g, p, u, dx, dy, near), id = ++g.zoneSeq;
    g.zonesU.set(id, { id, owner: p.id, x: c.x, y: c.y, r: u.radius, until: g.t + u.sec, next: g.t + (u.tick ?? 0.5), tick: u.tick ?? 0.5, dmg: u.dmg, kind: u.kind, art: u.kind === 'fire' ? 'bottle' : 'arrow' });
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
    if (owner) hitArea(g, owner, z.x, z.y, z.r, z.dmg, 0.15, z.art);
  }
}

export const zonesSnapshot = (g) => [...g.zonesU.values()].map((z) => ({ id: z.id, x: r2(z.x), y: r2(z.y), r: z.r, k: z.kind, l: r2(Math.max(0, z.until - g.t)) }));
