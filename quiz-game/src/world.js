// 빔프로젝터용 큰 맵을 그리는 Phaser 장면. 서버 상태를 받아서 그리기만 한다.
import Phaser from 'phaser';
import { MAP, PHASE, SPRITE, ZONES } from '../shared/constants.js';
import { CoinLayer } from './coins.js';
import { buildFloor, matTexture, TILE } from './mapArt.js';

export const BU = 48; // 몸 폭 1칸의 화면 픽셀 수
export const WORLD_W = MAP.w * BU;
export const WORLD_H = MAP.h * BU;

export const hooks = { spriteUrl: (s, m) => `characters/${s}/${m}.png` }; // 데모 페이지가 이미지 경로를 바꿔 끼울 수 있게
const SPRITES = ['blue']; // 스프라이트 폴더 이름 (public/characters/<name>/)
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
      for (const m of Object.keys(SPRITE.motions)) {
        this.load.spritesheet(`${s}-${m}`, hooks.spriteUrl(s, m), { frameWidth: SPRITE.cell, frameHeight: SPRITE.cell });
      }
    }
  }

  create() {
    // 바닥: 도트 1개 = 화면 2px (캐릭터와 같은 도트 크기)
    buildFloor(this);
    this.add.image(0, 0, 'floor').setOrigin(0).setScale(BU / TILE).setDepth(-100);

    this.zoneGfx = this.add.graphics().setDepth(-80);
    this.aimGfx = this.add.graphics().setDepth(-50); // 사거리 링 · 조준선 · 조준 대상 링 (캐릭터 아래, 바닥 위)
    this.aim = null;
    this.lockId = null;
    this.coins = new CoinLayer(this, BU);
    this.coins.create();
    this.zoneImgs = [];

    for (const s of SPRITES) {
      SPRITE.attackSteps.forEach((st, i) => {
        this.anims.create({ key: `${s}-atk${i}`, frames: this.anims.generateFrameNumbers(`${s}-combo`, { frames: st.frames }), frameRate: st.fps, repeat: 0 });
      });
      for (const [m, c] of Object.entries(SPRITE.motions)) {
        if (!c.fps) continue; // combo는 위에서 단계별로 만들었음
        this.anims.create({
          key: `${s}-${m}`,
          frames: this.anims.generateFrameNumbers(`${s}-${m}`, { start: 0, end: c.frames - 1 }),
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
    if (a.dragging) { // 조준선: 근접은 부채꼴(맞는 범위), 원거리는 사거리만큼 뻗는 빔
      if (a.kind === 'melee') {
        const half = Math.PI / 3;
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
  }

  makeView(p) {
    const sprite = this.add.sprite(0, 0, `${p.s}-idle`).setOrigin(SPRITE.anchor[0] / SPRITE.cell, SPRITE.anchor[1] / SPRITE.cell).setScale(SPR_SCALE);
    sprite.play(`${p.s}-idle`);
    const name = this.add.text(0, 0, (p.b ? '🤖 ' : '') + p.n, { fontFamily: 'sans-serif', fontSize: '17px', color: '#1f2d3a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const bar = this.add.graphics();
    const status = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c0392b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const coinIcon = this.add.image(0, 0, 'coin-f0').setScale(1.5).setVisible(false);
    const coinTxt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold', color: '#ffe27a', stroke: '#14122b', strokeThickness: 4 }).setOrigin(0, 0.5).setVisible(false);
    const v = { sprite, name, bar, status, coinIcon, coinTxt, root: [sprite, name, bar, status, coinIcon, coinTxt], flashUntil: 0, punchUntil: 0, flashing: false, pending: 0, bump: 0, shown: 0, p };
    this.views.set(p.id, v);
    return v;
  }

  handleEvent(e) {
    const now = performance.now();
    const v = this.views.get(e.id);
    if (e.e === 'atk' && v) {
      const step = Math.min(e.step || 0, SPRITE.attackSteps.length - 1);
      v.sprite.play(`${v.p.s}-atk${step}`, false);
      v.punchUntil = now + SPRITE.attackSteps[step].ms;
      const x0 = v.x, y0 = v.y - 0.55 * BU; // 가슴 높이에서 나가는 효과
      const len = e.len * BU;
      const line = this.add.graphics().setDepth(5000);
      if (e.kind === 'ranged') {
        line.lineStyle(5, 0xffd54a, 1).lineBetween(x0, y0, x0 + e.dx * len, y0 + e.dy * len);
      } else {
        const a = Math.atan2(e.dy, e.dx);
        const big = step === 2; // 3타 휘두르기는 더 크고 굵은 궤적
        line.lineStyle(big ? 12 : 7, 0xffffff, 1).beginPath().arc(x0, y0, (big ? 1.3 : 0.9) * BU, a - (big ? 1.0 : 0.7), a + (big ? 1.0 : 0.7)).strokePath();
      }
      this.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() });
    } else if (e.e === 'hit' && v) {
      v.flashUntil = now + FLASH_MS; // 0.1초 하얗게 번쩍
      const t = this.add.text(e.x * BU, e.y * BU - 1.9 * BU, e.dmg > 0 ? `-${e.dmg}` : '…', { fontFamily: 'sans-serif', fontSize: '26px', color: '#e74c3c', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 650, onComplete: () => t.destroy() });
      const ring = this.add.circle(e.x * BU, e.y * BU - 0.6 * BU, 8, 0xffffff, 0.9).setDepth(5500);
      this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
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
      this.zoneImgs.push(this.add.image(z.x * BU, z.y * BU, matTexture(this, type, z)).setOrigin(0).setScale(BU / TILE).setDepth(-80).setAlpha(alpha));
      if (correct) this.zoneGfx.lineStyle(6, 0xffffff, 1).strokeRect(z.x * BU + 3, z.y * BU + 3, z.w * BU - 6, z.h * BU - 6); // 정답 구역 강조
    }
  }

  // ---------- 매 프레임 ----------
  update(_time, delta) {
    const now = performance.now();
    const k = Math.min(1, (delta / 1000) * 20); // 위치 보간 (끊김 완화)
    for (const v of this.views.values()) {
      const p = v.p;
      v.x += (v.tx - v.x) * k;
      v.y += (v.ty - v.y) * k;
      v.sprite.setPosition(v.x, v.y).setDepth(v.y);
      v.sprite.setFlipX(p.f < 0);

      // 모션: 공격 중이면 유지, 아니면 이동 상태에 맞춰
      if (now >= v.punchUntil) v.sprite.play(`${p.s}-${p.st ? 'idle' : p.a}`, true);

      // 맞았을 때 0.1초 하얗게
      if (now < v.flashUntil) { v.sprite.setTintFill(0xffffff); v.flashing = true; }
      else if (v.flashing) { v.sprite.clearTint(); v.flashing = false; }

      // 기절: 쓰러진 모습 / 무적: 깜빡임
      v.sprite.setAngle(p.st ? 80 * p.f : 0);
      v.sprite.setAlpha(p.inv ? 0.45 + 0.35 * Math.sin(now / 70) : 1);

      // 체력바 + 이름
      const bx = v.x, by = v.y - 1.7 * BU, bw = 0.95 * BU, bh = 7;
      v.bar.clear().setDepth(v.y + 1);
      v.bar.fillStyle(0x000000, 0.35).fillRect(bx - bw / 2 - 1, by - 1, bw + 2, bh + 2);
      v.bar.fillStyle(p.hp / p.mhp > 0.3 ? 0x2ecc71 : 0xe74c3c, 1).fillRect(bx - bw / 2, by, bw * (p.hp / p.mhp), bh);
      v.name.setPosition(bx, by - 3).setDepth(v.y + 1);
      v.status.setText(p.st ? '기절!' : '').setPosition(bx, by - 24).setDepth(v.y + 1);
      const shown = Math.max(0, (p.cn || 0) - (v.pending || 0)); // 습득 연출이 끝나야 '기록'됨
      const bk = Math.max(0, 1 - (now - v.bump) / 250);
      v.coinIcon.setVisible(shown > 0).setPosition(bx + bw / 2 + 12, by + 4).setDepth(v.y + 1).setScale(1.5 * (1 + 0.45 * bk));
      v.coinTxt.setVisible(shown > 0).setText(`×${shown}`).setPosition(bx + bw / 2 + 24, by + 4).setDepth(v.y + 1);
    }
    this.coins.update(now);
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
