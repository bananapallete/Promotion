// 게임 상태와 규칙. 네트워크(소켓)는 모르고, index.js가 입력을 넣고 snapshot()을 방송한다.
// 모든 판정(이동, 충돌, 공격, 구역, 점수)은 서버가 한다.

import { COMBO_RESET_SEC, MAP, PHASE, READ_SEC, WAIT, zoneAt, ZONES } from '../shared/constants.js';

const KNOCK_DECAY = 12; // 밀림 속도 감쇠(1/s). 총 밀림 거리 = 처음 속도 / 감쇠
const ATTACK_ANIM_SEC = 0.25;
const BONUS = [3, 2, 1]; // 정답자 중 1~3등 추가 점수
const BASE_POINT = 1;
const MAX_PLAYERS = 40;

const r2 = (n) => Math.round(n * 100) / 100;
const rand = (a, b) => a + Math.random() * (b - a);

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
    if (!this.characters[charId]) charId = Object.keys(this.characters)[0];
    const id = `bot-${++this.botSeq}`;
    return this._spawn({ id, name: `더미${this.botSeq}`, charId, isBot: true, botMode: mode });
  }

  clearBots() {
    for (const [id, p] of this.players) if (p.isBot) this.players.delete(id);
  }

  _spawn({ id, name, charId, isBot, botMode }) {
    const cfg = this.characters[charId];
    const p = {
      id, name, charId, cfg, isBot, botMode: botMode || null,
      connected: true,
      x: WAIT.x + rand(2, WAIT.w - 2), y: rand(2, MAP.h - 2),
      kx: 0, ky: 0, // 밀림 속도
      face: 1,
      input: { mx: 0, my: 0, run: false },
      hp: cfg.hp, stunned: false, stunUntil: 0, invUntil: 0,
      runGauge: cfg.runGauge, exhausted: false, running: false, moving: false,
      nextAttackAt: 0, attackUntil: 0, comboStep: 0, lastAttackAt: -99,
      score: 0, zone: null, zoneSince: 0,
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
    for (const p of this.players.values()) p.score = 0;
    this.phase = PHASE.LOBBY;
    this.question = null;
    this.reveal = null;
  }

  gather() {
    for (const p of this.players.values()) {
      p.x = WAIT.x + rand(2, WAIT.w - 2);
      p.y = rand(2, MAP.h - 2);
      p.kx = p.ky = 0;
    }
  }

  _refill(p) {
    p.hp = p.cfg.hp;
    p.runGauge = p.cfg.runGauge;
    p.exhausted = false;
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
      return { id: r.p.id, name: r.p.name, zone: r.zone, correct: r.correct, rank: r.correct ? r.rank : null, gain };
    });
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

  _tryAttack(p, aim) {
    const a = p.cfg.attack;
    if (this.t < p.nextAttackAt || p.stunned) return;
    if (p.running && !a.canAttackWhileRunning) return;

    // 콤보: 잽 → 잽 → 큰 휘두르기. 일정 시간 공격하지 않으면 1타부터 다시
    const combo = a.combo;
    const step = combo && this.t - p.lastAttackAt <= COMBO_RESET_SEC ? p.comboStep : 0;
    const m = combo?.[step] || {};
    const range = a.range * (m.range ?? 1);

    let dx, dy;
    const ax = Number(aim?.x) || 0, ay = Number(aim?.y) || 0;
    if (Math.hypot(ax, ay) > 0.2) {
      const l = Math.hypot(ax, ay); dx = ax / l; dy = ay / l; // 직접 조준
    } else {
      let best = null, bestD = Infinity; // 자동 조준: 사거리 안에서 가장 가까운 상대
      for (const o of this._enemies(p)) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d <= range && d < bestD) { best = o; bestD = d; }
      }
      if (best) { dx = (best.x - p.x) / bestD; dy = (best.y - p.y) / bestD; }
      else { dx = p.face; dy = 0; } // 대상이 없으면 바라보는 방향으로 헛손질
    }
    if (Math.abs(dx) > 0.15) p.face = dx > 0 ? 1 : -1;
    p.nextAttackAt = this.t + a.interval;
    p.attackUntil = this.t + ATTACK_ANIM_SEC;
    p.lastAttackAt = this.t;
    p.comboStep = combo ? (step + 1) % combo.length : 0;

    // 맞는 대상 찾기
    let target = null, tDist = Infinity;
    for (const o of this._enemies(p)) {
      const vx = o.x - p.x, vy = o.y - p.y;
      const along = vx * dx + vy * dy; // 조준 방향으로의 거리
      if (along <= 0) continue;
      if (a.type === 'melee') {
        const d = Math.hypot(vx, vy);
        if (d <= range && along / d >= 0.5 && d < tDist) { target = o; tDist = d; } // 전방 ±60도
      } else {
        const perp = Math.abs(vx * dy - vy * dx);
        if (along <= range && perp <= o.cfg.radius && along < tDist) { target = o; tDist = along; }
      }
    }
    this.events.push({ e: 'atk', id: p.id, dx: r2(dx), dy: r2(dy), kind: a.type, step, len: r2(target ? tDist : range) });
    if (target) this._hit(target, p, dx, dy, m.dmg ?? 1, m.knockback ?? 1);
  }

  _hit(target, attacker, dx, dy, dmgMul = 1, knockMul = 1) {
    const a = attacker.cfg.attack;
    if (this.t < target.invUntil) { // 무적: 피해도 밀림도 없음
      this.events.push({ e: 'block', id: target.id, x: r2(target.x), y: r2(target.y) });
      return;
    }
    const dmg = target.stunned ? 0 : Math.round((a.dmgMin + Math.floor(Math.random() * (a.dmgMax - a.dmgMin + 1))) * dmgMul);
    if (dmg > 0) {
      target.hp = Math.max(0, target.hp - dmg);
      if (target.hp === 0) {
        target.stunned = true;
        target.stunUntil = this.t + target.cfg.stunSec;
        target.kx = target.ky = 0; // 쓰러지는 순간 미끄러지던 것도 멈춤
        this.events.push({ e: 'stun', id: target.id });
      }
    }
    // 기절(쓰러진) 상태에서는 밀리지 않음. 그 외에는 총 거리 = knockback (BU)
    if (!target.stunned) {
      target.kx += dx * a.knockback * knockMul * KNOCK_DECAY;
      target.ky += dy * a.knockback * knockMul * KNOCK_DECAY;
    }
    this.events.push({ e: 'hit', id: target.id, by: attacker.id, dmg, x: r2(target.x), y: r2(target.y) });
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

    let vx = 0, vy = 0, running = false;
    const len = Math.hypot(p.input.mx, p.input.my);
    p.moving = !p.stunned && len > 0.1;
    if (p.moving) {
      running = p.input.run && p.runGauge > 0 && !p.exhausted;
      const speed = running ? c.runSpeed : c.walkSpeed;
      vx = p.input.mx * speed;
      vy = p.input.my * speed;
      if (Math.abs(p.input.mx) > 0.1) p.face = p.input.mx > 0 ? 1 : -1;
    }
    p.running = running;
    if (running) {
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
    const humans = [...this.players.values()].filter((o) => !o.isBot && o.connected);
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
        rg: r2(p.runGauge), mrg: p.cfg.runGauge,
        sc: p.score,
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
      players,
      ev: events,
    };
  }

  leaderboard() {
    return this.humans().filter((p) => p.connected).sort((a, b) => b.score - a.score).map((p) => ({ id: p.id, name: p.name, score: p.score }));
  }

  hostInfo() {
    return {
      questions: this.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, answer: q.answer, time: q.time })),
      zones: ZONES,
      botsCanAttack: this.botsCanAttack,
    };
  }
}
