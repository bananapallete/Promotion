// 빔프로젝터용 큰 맵을 그리는 Phaser 장면. 서버 상태를 받아서 그리기만 한다.
import Phaser from 'phaser';
import { MAP, PHASE, SPRITE, ZONES } from '../shared/constants.js';
import { CoinLayer } from './coins.js';
import { ProjectileLayer } from './projectiles.js';
import sprites from '../shared/sprites.json';
import { buildFloor, MAT_MARGIN, matTexture, TILE } from './mapArt.js';

export const BU = 48; // 몸 폭 1칸의 화면 픽셀 수
export const WORLD_W = MAP.w * BU;
export const WORLD_H = MAP.h * BU;

export const hooks = { spriteUrl: (s, m) => `characters/${s}/${m}.png` }; // 데모 페이지가 이미지 경로를 바꿔 끼울 수 있게
const SPRITES = ['blue', ...Object.keys(sprites)]; // 스프라이트 폴더 이름 (public/characters/<name>/)
const SPR_SCALE = 0.34; // 256px 셀 → 화면. 몸 폭이 약 1.1BU가 되도록
const FLASH_MS = 100; // 맞았을 때 하얗게 번쩍이는 시간


export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
    this.views = new Map();
    this.pending = null;
    this.zoneKey = '';
  }

  preload() {
    for (const s of SPRITES) {
      for (const m of [...Object.keys(SPRITE.motions), ...(sprites[s]?.die ? ['die'] : [])]) {
        this.load.spritesheet(`${s}-${m}`, hooks.spriteUrl(s, m), { frameWidth: SPRITE.cell, frameHeight: SPRITE.cell });
      }
    }
  }

  create() {
    // 바닥: 도트 1개 = 화면 2px (캐릭터와 같은 도트 크기)
    buildFloor(this);
    this.add.image(0, 0, 'floor').setOrigin(0).setScale(BU / TILE).setDepth(-100);

    this.zoneGfx = this.add.graphics().setDepth(-80);
    this.teleGfx = this.add.graphics().setDepth(-45); // 예고 범위 (타격 전 붉은 부채꼴)
    this.aimGfx = this.add.graphics().setDepth(-50); // 사거리 링 · 조준선 · 조준 대상 링 (캐릭터 아래, 바닥 위)
    this.aim = null;
    this.lockId = null;
    this.coins = new CoinLayer(this, BU);
    this.coins.create();
    this.proj = new ProjectileLayer(this, BU);
    this.proj.create();
    this.zoneImgs = [];

    for (const s of SPRITES) {
      const n = sprites[s]?.idle ? sprites[s] : null; // 없으면 blue(constants의 프레임 수)
      if (sprites[s]?.die) this.anims.create({ key: `${s}-die`, frames: this.anims.generateFrameNumbers(`${s}-die`, { start: 0, end: sprites[s].die - 1 }), frameRate: 9, repeat: 0 });
      SPRITE.attackSteps.forEach((st, i) => {
        // 새 스프라이트의 공격은 한 동작(0번은 준비 자세)이라 단계마다 1~끝을 그 시간에 맞춰 재생
        const frames = n ? Array.from({ length: n.combo - 1 }, (_, k) => k + 1) : st.frames;
        const fps = n ? (frames.length * 1000) / st.ms : st.fps;
        this.anims.create({ key: `${s}-atk${i}`, frames: this.anims.generateFrameNumbers(`${s}-combo`, { frames }), frameRate: fps, repeat: 0 });
      });
      for (const [m, c] of Object.entries(SPRITE.motions)) {
        if (!c.fps) continue; // combo는 위에서 단계별로 만들었음
        this.anims.create({
          key: `${s}-${m}`,
          frames: this.anims.generateFrameNumbers(`${s}-${m}`, { start: 0, end: (n ? n[m] : c.frames) - 1 }),
          frameRate: c.fps,
          repeat: c.loop ? -1 : 0,
          yoyo: !!c.yoyo,
        });
      }
    }
    if (this.pending) this.applyState(this.pending);
  }

  // ---------- 조준 표시 ----------
  /** info: { id, dx, dy, manual, dragging, range, kind, radius, targetId } (null이면 숨김) */
  setAim(info) { this.aim = info; }

  _glowOn(v) {
    if (v.glow || this.sys.game.renderer.type !== Phaser.WEBGL) return; // 글로우는 WebGL에서만
    v.sprite.preFX.setPadding(24);
    v.glow = v.sprite.preFX.addGlow(0xffffff, 0, 0, false, 0.12, 14);
  }

  _glowOff(v) {
    if (!v) return;
    v.pulse?.stop(); v.pulse = null;
    if (v.glow) { v.sprite.preFX.remove(v.glow); v.glow = null; }
  }

  // 조준 대상이 생기거나 바뀔 때: 이전 대상의 빛을 끄고, 새 대상에 잠금 연출(수축하는 링 + 강한 빛 → 은은한 맥박)
  _lockChange(oldId, newId) {
    this._glowOff(this.views.get(oldId));
    const v = this.views.get(newId);
    if (!v) return;
    this._glowOn(v);
    if (v.glow) {
      const glow = v.glow;
      this.tweens.add({ targets: glow, outerStrength: { from: 16, to: 4 }, duration: 260, ease: 'Cubic.easeOut',
        onComplete: () => { if (v.glow === glow) v.pulse = this.tweens.add({ targets: glow, outerStrength: { from: 2.5, to: 5 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } });
    }
    const ring = this.add.graphics().setDepth(5200);
    this.tweens.addCounter({ from: 0, to: 1, duration: 300, ease: 'Cubic.easeOut', onUpdate: (tw) => {
      const k = tw.getValue();
      ring.clear().lineStyle(5 - 2 * k, 0xffffff, 1 - 0.5 * k).strokeCircle(v.x, v.y, (2.4 - 1.6 * k) * BU);
    }, onComplete: () => ring.destroy() });
  }

  _drawTelegraph(now) {
    const g = this.teleGfx;
    g.clear();
    for (const v of this.views.values()) {
      const w = v.windup;
      if (!w) continue;
      if (now >= w.until || v.p.st) { v.windup = null; continue; }
      const u = (now - w.from) / (w.until - w.from), R = w.range * BU, ang = Math.atan2(w.dy, w.dx), half = (w.arc * Math.PI) / 180;
      g.fillStyle(0xff3b30, 0.12 + 0.3 * u).slice(v.x, v.y, R, ang - half, ang + half, false).fillPath(); // 시간이 갈수록 진해짐
      g.fillStyle(0xff3b30, 0.35).slice(v.x, v.y, R * u, ang - half, ang + half, false).fillPath(); // 안쪽부터 차오름
      g.lineStyle(3, 0xff3b30, 0.9).beginPath().moveTo(v.x, v.y).lineTo(v.x + Math.cos(ang - half) * R, v.y + Math.sin(ang - half) * R).arc(v.x, v.y, R, ang - half, ang + half, false).lineTo(v.x, v.y).strokePath();
    }
  }

  _drawAim(now) {
    const g = this.aimGfx;
    g.clear();
    const a = this.aim;
    const me = a && this.views.get(a.id);
    const tid = me && this.views.has(a.targetId) ? a.targetId : null;
    if (tid !== this.lockId) { this._lockChange(this.lockId, tid); this.lockId = tid; }
    if (!me) return;

    const cx = me.x, cy = me.y, R = a.range * BU, ang = Math.atan2(a.dy, a.dx);
    // 공격 사거리: 평소엔 옅게, 직접 조준 중엔 또렷하게
    g.lineStyle(a.dragging ? 3 : 2, 0xffffff, a.dragging ? 0.6 : 0.2).strokeCircle(cx, cy, R);
    if (a.dragging && !a.lob) { // 조준선: 근접은 부채꼴(맞는 범위), 원거리는 사거리만큼 뻗는 빔
      if (a.kind === 'melee') {
        const half = ((a.arc ?? 60) * Math.PI) / 180;
        g.fillStyle(0xffffff, 0.22).slice(cx, cy, R, ang - half, ang + half, false).fillPath();
        g.lineStyle(3, 0xffffff, 0.8).beginPath().moveTo(cx, cy).lineTo(cx + Math.cos(ang - half) * R, cy + Math.sin(ang - half) * R).arc(cx, cy, R, ang - half, ang + half, false).lineTo(cx, cy).strokePath();
      } else {
        const w = a.radius * BU, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
        const ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
        g.fillStyle(0xffffff, 0.22).fillPoints([{ x: cx + nx, y: cy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: cx - nx, y: cy - ny }], true);
        g.lineStyle(3, 0xffffff, 0.8).lineBetween(cx + nx, cy + ny, ex + nx, ey + ny).lineBetween(cx - nx, cy - ny, ex - nx, ey - ny).lineBetween(ex + nx, ey + ny, ex - nx, ey - ny);
      }
      g.lineStyle(4, 0xffffff, 0.95).lineBetween(cx, cy, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    }
    if (a.lob && (a.dragging || a.targetId)) { // 던지기: 착탄 지점과 폭발 범위
      const lx = a.lob.x * BU, ly = a.lob.y * BU;
      g.lineStyle(3, 0xffffff, 0.5).lineBetween(cx, cy, lx, ly);
      g.fillStyle(0xff7a1a, 0.18).fillCircle(lx, ly, a.lob.r * BU).lineStyle(4, 0xffd84a, 0.9).strokeCircle(lx, ly, a.lob.r * BU);
      g.lineStyle(3, 0xffffff, 0.9).lineBetween(lx - 8, ly, lx + 8, ly).lineBetween(lx, ly - 8, lx, ly + 8);
    }
    // 조준 중인 적: 발밑 링 (빛나는 테두리는 _lockChange가 스프라이트에 입힘)
    const t = tid && this.views.get(tid);
    if (t) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      g.lineStyle(4, 0xffffff, 0.55 + 0.4 * pulse).strokeCircle(t.x, t.y, (0.78 + 0.05 * pulse) * BU);
    }
  }

  // ---------- 서버 상태 반영 ----------
  applyState(s) {
    if (!this.zoneGfx) { this.pending = s; return; }
    this.drawZones(s);

    const seen = new Set();
    for (const p of s.players) {
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) v = this.makeView(p);
      v.p = p;
      v.tx = p.x * BU; v.ty = p.y * BU;
      if (v.x === undefined) { v.x = v.tx; v.y = v.ty; }
    }
    for (const [id, v] of this.views) {
      if (!seen.has(id)) { this._glowOff(v); v.root.forEach((o) => o.destroy()); this.views.delete(id); }
    }
    for (const e of s.ev || []) this.handleEvent(e);
    this.coins.apply(s);
    this.proj.apply(s);
  }

  makeView(p) {
    const sprite = this.add.sprite(0, 0, `${p.s}-idle`).setOrigin(SPRITE.anchor[0] / SPRITE.cell, SPRITE.anchor[1] / SPRITE.cell).setScale(SPR_SCALE * (p.zs || 1));
    const tint = p.tn ? parseInt(p.tn.slice(1), 16) : 0; // 임시 모습: 스프라이트가 오면 tint를 지운다
    if (tint) sprite.setTint(tint);
    sprite.play(`${p.s}-idle`);
    const name = this.add.text(0, 0, (p.b ? '🤖 ' : '') + p.n, { fontFamily: 'sans-serif', fontSize: '17px', color: '#1f2d3a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const bar = this.add.graphics();
    const status = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c0392b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const coinIcon = this.add.image(0, 0, 'coin-f0').setScale(1.5).setVisible(false);
    const coinTxt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold', color: '#ffe27a', stroke: '#14122b', strokeThickness: 4 }).setOrigin(0, 0.5).setVisible(false);
    const v = { sprite, name, bar, status, coinIcon, coinTxt, root: [sprite, name, bar, status, coinIcon, coinTxt], flashUntil: 0, punchUntil: 0, flashing: false, pending: 0, bump: 0, shown: 0, tint, hopUntil: 0, p };
    this.views.set(p.id, v);
    return v;
  }

  handleEvent(e) {
    const now = performance.now();
    const v = this.views.get(e.id);
    if (e.e === 'windup' && v) {
      v.windup = { from: now, until: now + e.sec * 1000, dx: e.dx, dy: e.dy, range: e.range, arc: e.arc };
    } else if (e.e === 'atk' && v) {
      const step = Math.min(e.step || 0, SPRITE.attackSteps.length - 1);
      v.sprite.play(`${v.p.s}-atk${step}`, false);
      v.punchUntil = now + SPRITE.attackSteps[step].ms;
      if (e.kind === 'proj') return; // 투사체 공격은 날아가는 모습이 효과
      const x0 = v.x, y0 = v.y - 0.55 * BU; // 가슴 높이에서 나가는 효과
      const len = e.len * BU;
      const line = this.add.graphics().setDepth(5000);
      if (e.kind === 'ranged') {
        const tongue = e.fx === 'tongue'; // 개구리 혀: 굵은 분홍 직선 + 끝 동그라미
        line.lineStyle(tongue ? 9 : 5, tongue ? 0xff6f91 : 0xffd54a, 1).lineBetween(x0, y0, x0 + e.dx * len, y0 + e.dy * len);
        if (tongue) line.fillStyle(0xff6f91, 1).fillCircle(x0 + e.dx * len, y0 + e.dy * len, 10);
      } else {
        const a = Math.atan2(e.dy, e.dx);
        const big = step === 2; // 3타 휘두르기는 더 크고 굵은 궤적
        const half = e.arc ? (e.arc * Math.PI) / 180 * 0.85 : big ? 1.0 : 0.7; // 귀상어는 넓게
        line.lineStyle(big ? 12 : 7, 0xffffff, 1).beginPath().arc(x0, y0, (big ? 1.3 : 0.9) * BU, a - half, a + half).strokePath();
      }
      this.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() });
    } else if (e.e === 'hit' && v) {
      v.flashUntil = now + FLASH_MS; // 0.1초 하얗게 번쩍
      const crit = !!e.crit;
      const t = this.add.text(e.x * BU, e.y * BU - 2.9 * BU, e.dmg > 0 ? `${crit ? '' : '-'}${e.dmg}${crit ? '!' : ''}` : '…', { fontFamily: 'sans-serif', fontSize: crit ? '44px' : '26px', color: crit ? '#ffb020' : '#e74c3c', fontStyle: 'bold', stroke: crit ? '#14122b' : '#ffffff', strokeThickness: crit ? 8 : 5 }).setOrigin(0.5).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: crit ? 900 : 650, onComplete: () => t.destroy() });
      // 화면 흔들림은 크리티컬이 터졌을 때만, 그리고 내가 때리거나 맞은 것만 (봇끼리의 크리티컬마다 흔들리면 정신없어서)
      if (crit && this.focusId && (e.id === this.focusId || e.by === this.focusId)) this.cameras.main.shake(130, 0.006);
      const ring = this.add.circle(e.x * BU, e.y * BU - 0.6 * BU, 8, 0xffffff, 0.9).setDepth(5500);
      this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    } else if (e.e === 'dash' && v) {
      if (e.kind === 'hop') v.hopUntil = now + 350;
      for (let i = 0; i < 5; i++) { // 먼지 연출
        const d = this.add.circle(v.x - e.dx * i * 12 + (Math.random() - 0.5) * 10, v.y - 4 - Math.random() * 8, 5, 0xffffff, 0.8).setDepth(v.y - 1);
        this.tweens.add({ targets: d, alpha: 0, scale: 2.2, duration: 280 + i * 40, onComplete: () => d.destroy() });
      }
    } else if (e.e === 'block') {
      const t = this.add.text(e.x * BU, e.y * BU - 1.9 * BU, '무적', { fontFamily: 'sans-serif', fontSize: '20px', color: '#2e86de', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 500, onComplete: () => t.destroy() });
    }
  }

  // ---------- 구역 ----------
  drawZones(s) {
    const type = s.q?.type || 'ox';
    const ans = s.reveal?.answer;
    const key = `${s.phase}|${type}|${ans ?? ''}`;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    this.zoneGfx.clear();
    this.zoneImgs.forEach((i) => i.destroy());
    this.zoneImgs = [];

    for (const z of ZONES[type]) {
      const correct = s.phase === PHASE.REVEAL && z.id === ans;
      const alpha = { [PHASE.LOBBY]: 0.35, [PHASE.READING]: 0.6, [PHASE.MOVING]: 0.85 }[s.phase] ?? (correct ? 1 : 0.2);
      this.zoneImgs.push(this.add.image((z.cx - z.r) * BU - MAT_MARGIN * (BU / TILE), (z.cy - z.r) * BU - MAT_MARGIN * (BU / TILE), matTexture(this, type, z)).setOrigin(0).setScale(BU / TILE).setDepth(-80).setAlpha(alpha));
      if (correct) this.zoneGfx.lineStyle(6, 0xffffff, 1).strokeCircle(z.cx * BU, z.cy * BU, z.r * BU - 3); // 정답 구역 강조
    }
  }

  // ---------- 매 프레임 ----------
  update(_time, delta) {
    const now = performance.now();
    this._drawTelegraph(now);
    const k = Math.min(1, (delta / 1000) * 20); // 위치 보간 (끊김 완화)
    for (const v of this.views.values()) {
      const p = v.p;
      v.x += (v.tx - v.x) * k;
      v.y += (v.ty - v.y) * k;
      const hop = v.hopUntil > now ? Math.sin(Math.PI * (1 - (v.hopUntil - now) / 350)) * 1.3 * BU : 0; // 도약: 포물선으로 뜸
      v.sprite.setPosition(v.x, v.y - hop).setDepth(v.y);
      v.sprite.setFlipX(p.f < 0);
      const tint = p.tn ? parseInt(p.tn.slice(1), 16) : 0; // 캐릭터가 바뀌면 임시 색과 크기도 따라감
      if (tint !== v.tint) { v.tint = tint; if (tint) v.sprite.setTint(tint); else v.sprite.clearTint(); }
      v.sprite.setScale(SPR_SCALE * (p.zs || 1));

      // 모션: 공격 중이면 유지, 아니면 이동 상태에 맞춰
      const dies = p.st && sprites[p.s]?.die; // 기절하면 죽음 모션을 한 번 재생하고 누운 채로 둠
      if (dies) { if (!v.dead) { v.dead = true; v.sprite.play(`${p.s}-die`); } }
      else { v.dead = false; if (now >= v.punchUntil) v.sprite.play(`${p.s}-${p.st ? 'idle' : p.a}`, true); }

      // 맞았을 때 0.1초 하얗게
      if (now < v.flashUntil) { v.sprite.setTintFill(0xffffff); v.flashing = true; }
      else if (v.flashing) { v.sprite.clearTint(); if (v.tint) v.sprite.setTint(v.tint); v.flashing = false; }

      // 기절: 쓰러진 모습 / 무적: 깜빡임
      v.sprite.setAngle(p.st && !dies ? 80 * p.f : 0);
      v.sprite.setAlpha(p.inv ? 0.45 + 0.35 * Math.sin(now / 70) : 1);

      // 체력바 + 이름
      const bx = v.x, by = v.y - 2.05 * BU * (p.zs || 1), bw = 1.9 * BU, bh = 14; // 지난번의 2배 크기 (머리 위로 올림)
      v.bar.clear().setDepth(v.y + 1);
      v.bar.fillStyle(0x14122b, 1).fillRect(bx - bw / 2 - 3, by - 3, bw + 6, bh + 6); // 남색 테두리
      v.bar.fillStyle(0x3a3f4d, 1).fillRect(bx - bw / 2, by, bw, bh);
      v.bar.fillStyle(p.hp / p.mhp > 0.3 ? 0x2ecc71 : 0xe74c3c, 1).fillRect(bx - bw / 2, by, bw * (p.hp / p.mhp), bh);
      v.bar.fillStyle(0xffffff, 0.3).fillRect(bx - bw / 2, by, bw * (p.hp / p.mhp), 4); // 윗면 하이라이트
      if (p.mam && p.id === this.focusId) { // 탄창은 내 것만 (가득 = 주황, 장전 중인 칸은 차오름). 빔프로젝터엔 내 캐릭터가 없어서 안 나옴
        const gap = 4, sw = (bw - gap * (p.mam - 1)) / p.mam, y0 = by + bh + 7, h = 10;
        for (let i = 0; i < p.mam; i++) {
          const x0 = bx - bw / 2 + i * (sw + gap), f = i < p.am ? 1 : i === p.am ? p.amf : 0;
          v.bar.fillStyle(0x14122b, 1).fillRect(x0 - 3, y0 - 3, sw + 6, h + 6).fillStyle(0x3a3f4d, 1).fillRect(x0, y0, sw, h).fillStyle(0xffb020, 1).fillRect(x0, y0, sw * f, h);
        }
      }
      v.name.setPosition(bx, by - 8).setDepth(v.y + 1);
      v.status.setText(p.st ? '기절!' : '').setPosition(bx, by - 32).setDepth(v.y + 1);
      const shown = Math.max(0, (p.cn || 0) - (v.pending || 0)); // 습득 연출이 끝나야 '기록'됨
      const bk = Math.max(0, 1 - (now - v.bump) / 250);
      v.coinIcon.setVisible(shown > 0).setPosition(bx + bw / 2 + 18, by + 7).setDepth(v.y + 1).setScale(1.5 * (1 + 0.45 * bk));
      v.coinTxt.setVisible(shown > 0).setText(`×${shown}`).setPosition(bx + bw / 2 + 30, by + 7).setDepth(v.y + 1);
    }
    this.coins.update(now);
    this.proj.update(now);
    this._drawAim(now);
    this.onFrame?.(this, delta);
  }
}

export function startWorld(parentId, opts = {}) {
  const scene = new WorldScene();
  let config;
  if (opts.fill) {
    // 부모 영역을 가득 채우는 모드(폰 세로 화면용). 고해상도 화면에서도 선명하도록 dpr배로 그린다.
    const parent = document.getElementById(parentId);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    config = { width: Math.round(parent.clientWidth * dpr), height: Math.round(parent.clientHeight * dpr), scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr } };
    scene.dpr = dpr;
  } else {
    config = { width: WORLD_W, height: WORLD_H, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } };
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: parentId, backgroundColor: '#2b4d2a', scene, render: { antialias: true }, ...config });
  if (opts.fill) {
    const parent = document.getElementById(parentId);
    addEventListener('resize', () => game.scale.resize(Math.round(parent.clientWidth * scene.dpr), Math.round(parent.clientHeight * scene.dpr)));
  }
  return { game, scene };
}
