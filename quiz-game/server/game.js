// 게임 상태와 규칙. 네트워크(소켓)는 모르고, index.js가 입력을 넣고 snapshot()을 방송한다.
// 모든 판정(이동, 충돌, 공격, 구역, 점수)은 서버가 한다.

import { COIN, COMBO_RESET_SEC, CRIT, MAP, PHASE, READ_SEC, SPRITE, zoneAt, ZONES } from '../shared/constants.js';

const KNOCK_DECAY = 12; // 밀림 속도 감쇠(1/s). 총 밀림 거리 = 처음 속도 / 감쇠
const ATTACK_ANIM_SEC = 0.25;
const BONUS = [3, 2, 1]; // 정답자 중 1~3등 추가 점수
const BASE_POINT = 1;
const MAX_PLAYERS = 40;

const r2 = (n) => Math.round(n * 100) / 100;
const rand = (a, b) => a + Math.random() * (b - a);

// 어떤 구역도 아닌 맵 안쪽 지점 (입장·모이기 위치)
function spawnPos() {
  for (let i = 0; i < 20; i++) {
    const x = rand(2, MAP.w - 2), y = rand(2, MAP.h - 2);
    if (!zoneAt('ox', x, y) && !zoneAt('choice', x, y)) return [x, y];
  }
  return [2, 2];
}

export class Game {
  constructor(characters, quizzes) {
    this.characters = characters;
    this.questions = quizzes.map((q, i) => ({ ...q, id: i + 1 }));
    this.players = new Map();
    this.t = 0; // 게임 시간(초)
    this.phase = PHASE.LOBBY;
    this.phaseEnd = 0;
    this.question = null;
    this.reveal = null;
    this.events = [];
    this.botSeq = 0;
    this.coins = new Map(); // 맵 위의 동전 id → {id,x,y,readyAt,lockUntil}
    this.coinSeq = 0;
    this.coinClock = 0;
    this.coinsSpawned = 0; // 지금까지 생성한 동전 수 (습득된 것 포함)
    this.showRank = false; // 빔프로젝터에 순위표를 띄울지
    this.projectiles = new Map(); // 날아가는 투사체 id → {...}
    this.projSeq = 0;
    this.botsCanAttack = false; // 더미 봇은 기본적으로 공격하지 않음 (호스트 패널에서 켤 수 있음)
  }

  // ---------- 플레이어 ----------
  join({ token, name, charId }) {
    let p = token && this.players.get(token);
    if (p && !p.isBot) {
      p.connected = true; // 재접속: 외형과 점수 유지
      return p;
    }
    if (this.humans().length >= MAX_PLAYERS) return null;
    if (!this.characters[charId]) charId = Object.keys(this.characters)[0];
    return this._spawn({ id: token, name: String(name || '이름없음').slice(0, 10), charId, isBot: false });
  }

  humans() {
    return [...this.players.values()].filter((p) => !p.isBot);
  }

  setConnected(id, connected) {
    const p = this.players.get(id);
    if (p) p.connected = connected;
  }

  addBot(mode = 'idle', charId = 'blue') {
    if (charId === 'random') { const ids = Object.keys(this.characters); charId = ids[Math.floor(Math.random() * ids.length)]; }
    if (!this.characters[charId]) charId = Object.keys(this.characters)[0];
    const id = `bot-${++this.botSeq}`;
    return this._spawn({ id, name: `더미${this.botSeq}`, charId, isBot: true, botMode: mode });
  }

  clearBots() {
    for (const [id, p] of this.players) if (p.isBot) this.players.delete(id);
  }

  _spawn({ id, name, charId, isBot, botMode }) {
    const cfg = this.characters[charId];
    const spawn = spawnPos();
    const p = {
      id, name, charId, cfg, isBot, botMode: botMode || null,
      connected: true,
      x: spawn[0], y: spawn[1],
      kx: 0, ky: 0, // 밀림 속도
      face: 1,
      input: { mx: 0, my: 0, run: false },
      hp: cfg.hp, stunned: false, stunUntil: 0, invUntil: 0,
      runGauge: cfg.runGauge, exhausted: false, running: false, moving: false,
      nextAttackAt: 0, attackUntil: 0, comboStep: 0, lastAttackAt: -99,
      skillReadyAt: 0, dash: null, dashPass: false,
      ammoF: cfg.ammo?.max ?? 99, // 탄창: 정수 부분이 쏠 수 있는 발수, 소수 부분은 장전 진행도
      score: 0, coins: 0, zone: null, zoneSince: 0,
      ai: { nextThink: 0, mx: 0, my: 0 },
    };
    this.players.set(id, p);
    return p;
  }

  setInput(id, i) {
    const p = this.players.get(id);
    if (!p || !i) return;
    const mx = Number(i.mx) || 0, my = Number(i.my) || 0;
    const len = Math.hypot(mx, my);
    // 방향만 사용: 조이스틱을 얼마나 밀었든 항상 같은 속도 (가속·감속 없음)
    p.input = len > 0.1 ? { mx: mx / len, my: my / len, run: !!i.run } : { mx: 0, my: 0, run: !!i.run };
  }

  // ---------- 진행 ----------
  ask(qid) {
    const q = this.questions.find((x) => x.id === qid);
    if (!q) return false;
    this.question = q;
    this.reveal = null;
    this.showRank = false;
    this.phase = PHASE.READING;
    this.phaseEnd = this.t + READ_SEC;
    for (const p of this.players.values()) this._refill(p); // 문제마다 체력·달리기 게이지 가득
    return true;
  }

  addQuestion(q) {
    const type = q.type === 'choice' ? 'choice' : 'ox';
    const item = {
      id: this.questions.length ? Math.max(...this.questions.map((x) => x.id)) + 1 : 1,
      type,
      text: String(q.text || '').slice(0, 120),
      options: type === 'choice' ? (q.options || ['1번', '2번', '3번', '4번']).slice(0, 4) : undefined,
      answer: type === 'ox' ? (q.answer === 'X' ? 'X' : 'O') : Math.min(4, Math.max(1, Number(q.answer) || 1)),
      time: Math.min(60, Math.max(5, Number(q.time) || 15)),
    };
    this.questions.push(item);
    return item;
  }

  endQuestion() {
    if (this.phase === PHASE.READING || this.phase === PHASE.MOVING) this._judge();
  }

  resetScores() {
    for (const p of this.players.values()) { p.score = 0; p.coins = 0; }
    this.coins.clear();
    this.coinsSpawned = 0;
    this.showRank = false;
    this.phase = PHASE.LOBBY;
    this.question = null;
    this.reveal = null;
  }

  gather() {
    for (const p of this.players.values()) {
      [p.x, p.y] = spawnPos();
      p.kx = p.ky = 0;
    }
  }

  _refill(p) {
    p.hp = p.cfg.hp;
    p.runGauge = p.cfg.runGauge;
    p.exhausted = false;
    p.skillReadyAt = 0;
    p.ammoF = p.cfg.ammo?.max ?? 99;
  }

  _startMoving() {
    this.phase = PHASE.MOVING;
    this.phaseEnd = this.t + this.question.time;
    // 문제가 시작될 때 이미 구역 안에 있던 사람도 이 시각부터 센다
    for (const p of this.players.values()) {
      p.zone = zoneAt(this.question.type, p.x, p.y);
      p.zoneSince = this.t;
    }
  }

  _judge() {
    const q = this.question;
    const ranked = [];
    for (const p of this.players.values()) {
      if (p.isBot || !p.connected) continue;
      const zone = zoneAt(q.type, p.x, p.y);
      ranked.push({ p, zone, correct: zone === q.answer, since: zone === p.zone ? p.zoneSince : this.t });
    }
    const winners = ranked.filter((r) => r.correct).sort((a, b) => a.since - b.since);
    winners.forEach((r, i) => { r.rank = i + 1; });
    const results = ranked.map((r) => {
      const bonus = r.correct && r.rank <= BONUS.length ? BONUS[r.rank - 1] : 0;
      const gain = r.correct ? BASE_POINT + bonus : 0;
      r.p.score += gain;
      const dropped = !r.correct && (r.zone != null || COIN.dropOnNoAnswer) ? this._dropCoins(r.p) : 0;
      return { id: r.p.id, name: r.p.name, zone: r.zone, correct: r.correct, rank: r.correct ? r.rank : null, gain, dropped };
    });
    for (const p of this.players.values()) { // 문제를 푸는 봇: 틀린 구역에 있으면 동전을 떨어뜨림
      if (p.isBot && p.botMode !== 'idle' && p.connected && zoneAt(q.type, p.x, p.y) !== q.answer) this._dropCoins(p);
    }
    this.reveal = { answer: q.answer, results };
    this.phase = PHASE.REVEAL;
  }

  // ---------- 공격 ----------
  attack(id, aim) {
    const p = this.players.get(id);
    if (p) this._tryAttack(p, aim);
  }

  _enemies(p) {
    return [...this.players.values()].filter((o) => o !== p && o.connected);
  }

  // 지금 공격을 하면 몇 타째인지, 그 타의 배율과 사거리
  _comboState(p) {
    const a = p.cfg.attack;
    const combo = a.combo;
    const step = combo && this.t - p.lastAttackAt <= COMBO_RESET_SEC ? p.comboStep : 0;
    const m = combo?.[step] || {};
    return { combo, step, m, range: a.range * (m.range ?? 1) };
  }

  // 조준 방향: 직접 조준 > 사거리 안에서 가장 가까운 상대(자동 조준) > 바라보는 방향
  _aimDir(p, aim, range) {
    const ax = Number(aim?.x) || 0, ay = Number(aim?.y) || 0;
    if (Math.hypot(ax, ay) > 0.2) {
      const l = Math.hypot(ax, ay);
      return { dx: ax / l, dy: ay / l, manual: true };
    }
    let best = null, bestD = Infinity;
    for (const o of this._enemies(p)) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d <= range && d < bestD) { best = o; bestD = d; }
    }
    if (best) return { dx: (best.x - p.x) / bestD, dy: (best.y - p.y) / bestD, manual: false, near: best };
    return { dx: p.face, dy: 0, manual: false };
  }

  // 그 방향으로 공격했을 때 맞는 대상
  // 그 방향으로 공격했을 때 맞는 대상들 (가까운 순). 근접은 부채꼴(arcDeg, 기본 ±60°), 원거리는 직선
  _pickTargets(p, range, dx, dy) {
    const a = p.cfg.attack;
    const cosMin = Math.cos(((a.arcDeg ?? 60) * Math.PI) / 180);
    const hits = [];
    for (const o of this._enemies(p)) {
      const vx = o.x - p.x, vy = o.y - p.y;
      const along = vx * dx + vy * dy; // 조준 방향으로의 거리
      if (along <= 0) continue;
      if (a.type === 'melee') {
        const d = Math.hypot(vx, vy);
        if (d <= range && along / d >= cosMin) hits.push({ o, dist: d });
      } else {
        const perp = Math.abs(vx * dy - vy * dx);
        if (along <= range && perp <= o.cfg.radius + (a.projectile?.radius || 0)) hits.push({ o, dist: along });
      }
    }
    return hits.sort((x, y) => x.dist - y.dist);
  }

  _pickTarget(p, range, dx, dy) {
    const h = this._pickTargets(p, range, dx, dy)[0];
    return { target: h ? h.o : null, tDist: h ? h.dist : Infinity };
  }

  /** 조준 표시용: 지금 조준하면 어디를 향하고 누가 맞는지 (공격은 하지 않음) */
  aimPreview(id, aim) {
    const p = this.players.get(id);
    if (!p) return null;
    const { range, step } = this._comboState(p);
    const dir = this._aimDir(p, aim, range);
    const pr = p.cfg.attack.projectile;
    let { target } = this._pickTarget(p, range, dir.dx, dir.dy);
    let lob = null;
    if (pr?.lob) { // 던지기: 착탄 지점과 폭발 범위, 그 안의 가장 가까운 상대를 조준 대상으로 표시
      const L = this._lobLanding(p, dir, range, aim);
      lob = { x: r2(L.x), y: r2(L.y), r: pr.explodeRadius };
      target = this._enemies(p).filter((o) => Math.hypot(o.x - L.x, o.y - L.y) <= pr.explodeRadius + o.cfg.radius).sort((u, v) => Math.hypot(u.x - L.x, u.y - L.y) - Math.hypot(v.x - L.x, v.y - L.y))[0] || null;
    }
    return { lob, dx: dir.dx, dy: dir.dy, manual: dir.manual, range, step, kind: p.cfg.attack.type, arc: p.cfg.attack.arcDeg ?? 60, radius: p.cfg.radius, targetId: target ? target.id : null };
  }

  _tryAttack(p, aim) {
    const a = p.cfg.attack;
    if (this.t < p.nextAttackAt || p.stunned || this._dashing(p) || p.ammoF < 1) return; // 탄창이 비면 못 쏨
    if (p.running && !a.canAttackWhileRunning) return;

    // 콤보: 잽 → 잽 → 큰 휘두르기. 일정 시간 공격하지 않으면 1타부터 다시
    const { combo, step, m, range } = this._comboState(p);
    const { dx, dy, near } = this._aimDir(p, aim, range);
    if (Math.abs(dx) > 0.15) p.face = dx > 0 ? 1 : -1;
    p.nextAttackAt = this.t + a.interval;
    p.ammoF -= 1;
    // 공격 모션이 재생되는 동안 (이동 속도 감소가 적용되는 시간)
    p.attackUntil = this.t + (SPRITE.attackSteps[step]?.ms ?? ATTACK_ANIM_SEC * 1000) / 1000;
    p.lastAttackAt = this.t;
    p.comboStep = combo ? (step + 1) % combo.length : 0;

    if (a.projectile) { // 투사체: 날아가서 닿아야 맞는다 (피할 수 있음)
      this._shoot(p, a, aim, dx, dy, range, near);
      this.events.push({ e: 'atk', id: p.id, dx: r2(dx), dy: r2(dy), kind: 'proj', step, len: range });
      return;
    }
    const hits = this._pickTargets(p, range, dx, dy);
    this.events.push({ e: 'atk', id: p.id, dx: r2(dx), dy: r2(dy), kind: a.type, fx: a.fx, arc: a.arcDeg, step, len: r2(hits[0] && !(a.multi && a.type === 'ranged') ? hits[0].dist : range) });
    for (const h of a.multi ? hits : hits.slice(0, 1)) this._hit(h.o, p, dx, dy, m.dmg ?? 1, m.knockback ?? 1); // multi: 범위 안 모두
  }

  // ---------- 투사체 ----------
  // 던지기 착탄 지점: 직접 조준이면 드래그 길이(aim.m, 0~1)만큼, 자동 조준이면 상대가 있는 곳(없으면 사거리의 70%)
  _lobLanding(p, dir, range, aim) {
    let dist;
    if (dir.manual) dist = Math.max(1.5, range * Math.min(1, Number(aim?.m) || 1));
    else dist = dir.near ? Math.min(range, Math.hypot(dir.near.x - p.x, dir.near.y - p.y)) : range * 0.7;
    return { x: Math.min(MAP.w - 0.3, Math.max(0.3, p.x + dir.dx * dist)), y: Math.min(MAP.h - 0.3, Math.max(0.3, p.y + dir.dy * dist)) };
  }

  _shoot(p, a, aim, dx, dy, range, near) {
    const pr = a.projectile;
    const base = { id: ++this.projSeq, owner: p.id, art: pr.art, dmgMin: a.dmgMin, dmgMax: a.dmgMax, knock: a.knockback };
    if (pr.lob) {
      const L = this._lobLanding(p, { dx, dy, manual: !!(Math.hypot(Number(aim?.x) || 0, Number(aim?.y) || 0) > 0.2), near }, range, aim);
      const dist = Math.hypot(L.x - p.x, L.y - p.y);
      this.projectiles.set(base.id, { ...base, kind: 'lob', sx: p.x, sy: p.y, tx: L.x, ty: L.y, x: p.x, y: p.y, t0: this.t, T: Math.max(0.15, dist / pr.speed), r: pr.explodeRadius });
    } else {
      this.projectiles.set(base.id, { ...base, kind: 'bolt', x: p.x, y: p.y, dx, dy, vx: dx * pr.speed, vy: dy * pr.speed, speed: pr.speed, travel: 0, maxDist: range, radius: pr.radius, pierce: !!pr.pierce, hit: new Set() });
    }
  }

  _projDamage(q) {
    return q.dmgMin + Math.floor(Math.random() * (q.dmgMax - q.dmgMin + 1));
  }

  _updateProjectiles(dt) {
    for (const q of [...this.projectiles.values()]) {
      const foes = [...this.players.values()].filter((o) => o.connected && o.id !== q.owner);
      if (q.kind === 'lob') {
        const u = (this.t - q.t0) / q.T;
        if (u < 1) { q.x = q.sx + (q.tx - q.sx) * u; q.y = q.sy + (q.ty - q.sy) * u; continue; }
        this.projectiles.delete(q.id); // 착탄: 범위 안 모두에게 피해, 중심에서 바깥으로 밀림 (던진 사람은 안 맞음)
        this.events.push({ e: 'boom', x: r2(q.tx), y: r2(q.ty), r: q.r });
        for (const o of foes) {
          const d = Math.hypot(o.x - q.tx, o.y - q.ty);
          if (d > q.r + o.cfg.radius) continue;
          const nx = d > 1e-6 ? (o.x - q.tx) / d : 1, ny = d > 1e-6 ? (o.y - q.ty) / d : 0;
          this._applyHit(o, { id: q.owner }, this._projDamage(q), q.knock, nx, ny);
        }
        continue;
      }
      const px = q.x, py = q.y;
      q.x += q.vx * dt; q.y += q.vy * dt; q.travel += q.speed * dt;
      let gone = q.travel >= q.maxDist || q.x < 0 || q.y < 0 || q.x > MAP.w || q.y > MAP.h;
      for (const o of foes) {
        if (q.hit.has(o.id)) continue;
        // 이번 틱에 지나온 선분과 상대 사이 거리 (빠른 투사체가 통과하지 않게)
        const sx = q.x - px, sy = q.y - py, l2 = sx * sx + sy * sy;
        const k = l2 > 0 ? Math.max(0, Math.min(1, ((o.x - px) * sx + (o.y - py) * sy) / l2)) : 0;
        if (Math.hypot(o.x - (px + sx * k), o.y - (py + sy * k)) > q.radius + o.cfg.radius) continue;
        q.hit.add(o.id);
        this._applyHit(o, { id: q.owner }, this._projDamage(q), q.knock, q.dx, q.dy);
        if (!q.pierce) { gone = true; break; }
      }
      if (gone) this.projectiles.delete(q.id);
    }
  }

  _ko(target) {
    target.hp = 0;
    target.stunned = true;
    target.stunUntil = this.t + target.cfg.stunSec;
    target.kx = target.ky = 0; // 쓰러지는 순간 미끄러지던 것도 멈춤
    this.events.push({ e: 'stun', id: target.id });
    this._dropCoins(target); // 소닉의 링처럼 가진 동전이 전부 튀어나감
  }

  /** 테스트/호스트용: 즉시 쓰러뜨리기 */
  knockOut(id) {
    const p = this.players.get(id);
    if (p && !p.stunned) this._ko(p);
  }

  // ---------- 동전 ----------
  spawnCoin(x, y) {
    if (this.coinsSpawned >= COIN.maxTotal) return null;
    this.coinsSpawned++;
    if (x == null) {
      for (let i = 0; i < 12; i++) { // 다른 동전과 너무 가깝지 않은 곳
        x = rand(1, MAP.w - 1); y = rand(1, MAP.h - 1);
        if ([...this.coins.values()].every((c) => Math.hypot(c.x - x, c.y - y) > 3)) break;
      }
    }
    const c = { id: ++this.coinSeq, x, y, readyAt: this.t + 0.35, lockUntil: 0 };
    this.coins.set(c.id, c);
    this.events.push({ e: 'coinSpawn', id: c.id, x: r2(x), y: r2(y) });
    return c;
  }

  giveCoins(id, n) {
    const p = this.players.get(id);
    if (p) p.coins += n;
  }

  /** 가진 동전을 전부 몸에서 튀어나가게 함. 반경 안 무작위 지점으로 포물선을 그리며 떨어짐. 떨어뜨린 개수 반환 */
  _dropCoins(p) {
    const n = p.coins;
    if (!n) return 0;
    p.coins = 0;
    for (let i = 0; i < n; i++) {
      const ang = rand(0, Math.PI * 2);
      const dist = Math.max(COIN.scatterMin, COIN.scatterRadius * Math.sqrt(Math.random())); // 원 안에 고르게
      const x = Math.min(MAP.w - 0.5, Math.max(0.5, p.x + Math.cos(ang) * dist));
      const y = Math.min(MAP.h - 0.5, Math.max(0.5, p.y + Math.sin(ang) * dist));
      const flight = COIN.flightSec * rand(0.85, 1.15);
      // 떨어진 동전은 누구도(떨어뜨린 본인 포함) 일정 시간 못 줍는다
      const c = { id: ++this.coinSeq, x, y, readyAt: this.t + COIN.dropLockSec, lockUntil: this.t + COIN.dropLockSec };
      this.coins.set(c.id, c);
      this.events.push({ e: 'coinDrop', id: c.id, fx: r2(p.x), fy: r2(p.y), x: r2(x), y: r2(y), flight: r2(flight), lock: COIN.dropLockSec });
    }
    return n;
  }

  _updateCoins(dt, active) {
    if (active.some((p) => !p.isBot)) { // 참가자가 있을 때만 30초 시계가 간다
      this.coinClock += dt;
      if (this.coinClock >= COIN.spawnEverySec) { this.coinClock = 0; this.spawnCoin(); }
    }
    for (const c of [...this.coins.values()]) {
      if (this.t < c.readyAt) continue; // 생성 직후이거나, 떨어진 뒤 줍기 금지 시간 중
      let best = null, bd = Infinity;
      for (const p of active) {
        if (p.stunned) continue; // 쓰러진 캐릭터는 못 줍는다 (봇은 줍는다)
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d <= (p.cfg.pickupRadius ?? COIN.pickupRadius) && d < bd) { best = p; bd = d; }
      }
      if (best) {
        this.coins.delete(c.id);
        best.coins += 1;
        this.events.push({ e: 'coinGet', id: c.id, by: best.id, x: r2(c.x), y: r2(c.y) });
      }
    }
  }

  _hit(target, attacker, dx, dy, dmgMul = 1, knockMul = 1) {
    const a = attacker.cfg.attack;
    const dmg = Math.round((a.dmgMin + Math.floor(Math.random() * (a.dmgMax - a.dmgMin + 1))) * dmgMul);
    this._applyHit(target, attacker, dmg, a.knockback * knockMul, dx, dy);
  }

  _applyHit(target, attacker, rawDmg, knock, dx, dy) {
    if (this.t < target.invUntil) { // 무적: 피해도 밀림도 없음
      this.events.push({ e: 'block', id: target.id, x: r2(target.x), y: r2(target.y) });
      return;
    }
    let dmg = target.stunned ? 0 : rawDmg;
    const crit = dmg > 0 && Math.random() < CRIT.chance;
    if (crit) dmg = Math.round(dmg * CRIT.mul);
    if (dmg > 0) {
      target.hp = Math.max(0, target.hp - dmg);
      if (target.hp === 0) this._ko(target);
    }
    // 기절(쓰러진) 상태에서는 밀리지 않음. 그 외에는 총 거리 = knock (BU, 음수면 끌어당김)
    if (!target.stunned) {
      target.kx += dx * knock * KNOCK_DECAY;
      target.ky += dy * knock * KNOCK_DECAY;
    }
    this.events.push({ e: 'hit', id: target.id, by: attacker.id, dmg, crit, x: r2(target.x), y: r2(target.y) });
  }

  // ---------- 스킬: 돌진/도약 (달리기 캐릭터는 달리기 버튼을 누르고 있는 방식) ----------
  _dashing(p) {
    return !!(p.dash && this.t < p.dash.until);
  }

  skill(id) {
    const p = this.players.get(id);
    const sk = p?.cfg.skill;
    if (!p || p.stunned || sk?.type !== 'dash' || this.t < p.skillReadyAt || this._dashing(p)) return;
    const len = Math.hypot(p.input.mx, p.input.my);
    const dx = len > 0.1 ? p.input.mx / len : p.face, dy = len > 0.1 ? p.input.my / len : 0;
    p.dash = { dx, dy, speed: sk.distance / sk.duration, until: this.t + sk.duration, pass: !!sk.pass, hitDmg: sk.hitDmg || 0, hitKnock: sk.hitKnock || 0 };
    p.skillReadyAt = this.t + sk.cooldown;
    if (Math.abs(dx) > 0.15) p.face = dx > 0 ? 1 : -1;
    this.events.push({ e: 'dash', id: p.id, dx: r2(dx), dy: r2(dy), kind: sk.pass ? 'hop' : 'charge' });
  }

  // ---------- 매 틱 ----------
  update(dt) {
    this.t += dt;

    if (this.phase === PHASE.READING && this.t >= this.phaseEnd) this._startMoving();
    else if (this.phase === PHASE.MOVING && this.t >= this.phaseEnd) this._judge();

    const active = [...this.players.values()].filter((p) => p.connected);

    for (const p of active) {
      if (p.isBot) this._botThink(p);
      this._step(p, dt);
    }
    this._collide(active);
    this._updateCoins(dt, active);
    this._updateProjectiles(dt);

    if (this.phase === PHASE.MOVING) {
      for (const p of active) {
        const z = zoneAt(this.question.type, p.x, p.y);
        if (z !== p.zone) { p.zone = z; p.zoneSince = this.t; }
      }
    }
  }

  _step(p, dt) {
    const c = p.cfg;
    if (p.stunned && this.t >= p.stunUntil) { // 기절 해제 → 체력 회복 + 무적
      p.stunned = false;
      p.hp = c.hp;
      p.invUntil = this.t + c.invincibleSec;
    }

    const am = c.ammo; // 탄창 장전: 쏜 직후에도 계속 차오름
    if (am) p.ammoF = Math.min(am.max, p.ammoF + dt / am.reload);
    if (p.stunned) p.dash = null;
    const dashing = this._dashing(p);
    if (!dashing) p.dash = null;
    p.dashPass = dashing && p.dash.pass;
    const runSkill = (c.skill?.type ?? 'run') === 'run';

    let vx = 0, vy = 0, running = false;
    const len = Math.hypot(p.input.mx, p.input.my);
    p.moving = !p.stunned && len > 0.1;
    if (dashing) { // 돌진/도약 중에는 입력과 상관없이 정해진 속도로 일직선
      vx = p.dash.dx * p.dash.speed; vy = p.dash.dy * p.dash.speed;
      p.moving = true; running = true;
    } else if (p.moving) {
      running = runSkill && p.input.run && p.runGauge > 0 && !p.exhausted;
      // 공격 모션 중에는 이동 속도 감소 (캐릭터별 attack.moveSpeedWhileAttacking, 근접 0.5)
      const slow = this.t < p.attackUntil ? (c.attack.moveSpeedWhileAttacking ?? 1) : 1;
      const speed = (running ? c.runSpeed : c.walkSpeed) * slow;
      vx = p.input.mx * speed;
      vy = p.input.my * speed;
      if (Math.abs(p.input.mx) > 0.1) p.face = p.input.mx > 0 ? 1 : -1;
    }
    p.running = running;
    if (dashing) { /* 돌진 중에는 달리기 게이지를 건드리지 않음 */ } else if (running) {
      p.runGauge = Math.max(0, p.runGauge - dt);
      if (p.runGauge === 0) p.exhausted = true;
    } else {
      p.runGauge = Math.min(c.runGauge, p.runGauge + (c.runGauge / c.runRecharge) * dt);
      if (p.exhausted && p.runGauge >= 1) p.exhausted = false;
    }

    p.x += (vx + p.kx) * dt;
    p.y += (vy + p.ky) * dt;
    const decay = Math.exp(-KNOCK_DECAY * dt);
    p.kx *= decay; p.ky *= decay;
    if (Math.abs(p.kx) < 0.01) p.kx = 0;
    if (Math.abs(p.ky) < 0.01) p.ky = 0;
    this._clamp(p);

    if (dashing && p.dash.hitDmg) { // 돌진: 처음 닿은 상대를 날리고 멈춤
      for (const o of this._enemies(p)) {
        if (o.stunned || Math.hypot(o.x - p.x, o.y - p.y) > p.cfg.radius + o.cfg.radius + 0.25) continue;
        this._applyHit(o, p, p.dash.hitDmg, p.dash.hitKnock, p.dash.dx, p.dash.dy);
        p.dash.until = this.t;
        break;
      }
    }
  }

  _clamp(p) {
    const r = p.cfg.radius;
    p.x = Math.min(MAP.w - r, Math.max(r, p.x));
    p.y = Math.min(MAP.h - r, Math.max(r, p.y));
  }

  _collide(list) {
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.dashPass || b.dashPass) continue; // 도약 중에는 다른 캐릭터를 뛰어넘음
          const min = a.cfg.radius + b.cfg.radius;
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 1e-6) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
          const push = (min - d) / 2;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
      for (const p of list) this._clamp(p);
    }
  }

  // ---------- 더미 봇 ----------
  _botThink(p) {
    if (p.stunned || p.botMode === 'idle') { p.input = { mx: 0, my: 0, run: false }; return; }
    // 문제를 푸는 중: 무작위로 구역을 하나 골라 그 안의 한 지점으로 걸어감
    if (this.phase === PHASE.MOVING && this.question) { // 정지 봇만 빼고 모두 문제를 풂 (공격형은 가는 길에 사거리 안의 상대를 때림)
      const q = this.question;
      if (p.ai.q !== q.id) {
        const z = ZONES[q.type][Math.floor(Math.random() * ZONES[q.type].length)];
        const ang = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * z.r * 0.65; // 가장자리에서 밀려도 원 안에 남도록
        p.ai.q = q.id;
        p.ai.tx = z.cx + Math.cos(ang) * d; p.ai.ty = z.cy + Math.sin(ang) * d;
        p.ai.startAt = this.t + rand(0.5, 5); // 사람처럼 제각각 출발
      }
      const dx = p.ai.tx - p.x, dy = p.ai.ty - p.y, dist = Math.hypot(dx, dy);
      p.input = this.t < p.ai.startAt || dist < 0.3 ? { mx: 0, my: 0, run: false } : { mx: dx / dist, my: dy / dist, run: false };
      if (p.botMode === 'aggro' && this.botsCanAttack) {
        const near = this._enemies(p).some((o) => Math.hypot(o.x - p.x, o.y - p.y) <= p.cfg.attack.range);
        if (near) this._tryAttack(p, null);
      }
      return;
    }
    const humans = this._enemies(p); // 공격형 봇은 봇끼리도 서로 공격
    if (p.botMode === 'aggro' && this.botsCanAttack && humans.length) {
      let best = null, bd = Infinity;
      for (const o of humans) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < bd) { best = o; bd = d; }
      }
      const a = p.cfg.attack;
      const hold = a.type === 'melee' ? a.range * 0.85 : a.range * 0.8;
      if (bd > hold) {
        p.input = { mx: (best.x - p.x) / bd, my: (best.y - p.y) / bd, run: false };
      } else {
        p.input = { mx: 0, my: 0, run: false };
      }
      if (bd <= a.range) this._tryAttack(p, null);
      return;
    }
    // 배회
    if (this.t >= p.ai.nextThink) {
      p.ai.nextThink = this.t + rand(1, 2.5);
      if (Math.random() < 0.25) { p.ai.mx = 0; p.ai.my = 0; }
      else { const ang = rand(0, Math.PI * 2); p.ai.mx = Math.cos(ang); p.ai.my = Math.sin(ang); }
    }
    p.input = { mx: p.ai.mx, my: p.ai.my, run: false };
  }

  // ---------- 방송용 ----------
  snapshot() {
    const events = this.events;
    this.events = [];
    const players = [];
    for (const p of this.players.values()) {
      if (!p.connected) continue;
      players.push({
        id: p.id, n: p.name, c: p.charId, s: p.cfg.sprite, b: p.isBot ? 1 : 0,
        x: r2(p.x), y: r2(p.y), f: p.face,
        hp: p.hp, mhp: p.cfg.hp,
        st: p.stunned ? 1 : 0, inv: this.t < p.invUntil ? 1 : 0,
        a: p.moving ? (p.running ? 'run' : 'walk') : 'idle',
        ...(p.cfg.skill?.type === 'dash'
          ? { k: 'dash', rg: r2(p.cfg.skill.cooldown - Math.max(0, p.skillReadyAt - this.t)), mrg: p.cfg.skill.cooldown } // 쿨타임 진행도
          : { k: 'run', rg: r2(p.runGauge), mrg: p.cfg.runGauge }),
        tn: p.cfg.tint || null, zs: p.cfg.scale || 1,
        am: Math.floor(p.ammoF + 1e-9), amf: r2(p.ammoF % 1), mam: p.cfg.ammo?.max ?? 0,
        sc: this.totalScore(p), cn: p.coins,
      });
    }
    const q = this.question
      ? { id: this.question.id, type: this.question.type, text: this.question.text, options: this.question.options, time: this.question.time }
      : null;
    return {
      phase: this.phase,
      left: this.phase === PHASE.READING || this.phase === PHASE.MOVING ? r2(Math.max(0, this.phaseEnd - this.t)) : 0,
      q,
      reveal: this.reveal,
      rank: this.showRank,
      pj: [...this.projectiles.values()].map((q) => q.kind === 'lob'
        ? { id: q.id, k: 'l', a: q.art, x: r2(q.x), y: r2(q.y), sx: r2(q.sx), sy: r2(q.sy), tx: r2(q.tx), ty: r2(q.ty), u: r2((this.t - q.t0) / q.T), T: r2(q.T), r: q.r }
        : { id: q.id, k: 'b', a: q.art, x: r2(q.x), y: r2(q.y), vx: r2(q.vx), vy: r2(q.vy) }),
      coins: [...this.coins.values()].map((c) => ({ id: c.id, x: r2(c.x), y: r2(c.y), lk: r2(Math.max(0, c.lockUntil - this.t)) })),
      players,
      ev: events,
    };
  }

  totalScore(p) {
    return Math.round((p.score + p.coins * COIN.value) * 10) / 10;
  }

  leaderboard() {
    return this.humans().filter((p) => p.connected).map((p) => ({ id: p.id, name: p.name, score: this.totalScore(p) })).sort((a, b) => b.score - a.score);
  }

  hostInfo() {
    return {
      questions: this.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, answer: q.answer, time: q.time })),
      zones: ZONES,
      botsCanAttack: this.botsCanAttack,
    };
  }
}
