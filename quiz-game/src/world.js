// 빔프로젝터용 큰 맵을 그리는 Phaser 장면. 서버 상태를 받아서 그리기만 한다.
import Phaser from 'phaser';
import { MAP, PHASE, SPRITE, WAIT, ZONES } from '../shared/constants.js';

export const BU = 48; // 몸 폭 1칸의 화면 픽셀 수
export const WORLD_W = MAP.w * BU;
export const WORLD_H = MAP.h * BU;

export const hooks = { spriteUrl: (s, m) => `characters/${s}/${m}.png` }; // 데모 페이지가 이미지 경로를 바꿔 끼울 수 있게
const SPRITES = ['blue']; // 스프라이트 폴더 이름 (public/characters/<name>/)
const SPR_SCALE = 0.34; // 256px 셀 → 화면. 몸 폭이 약 1.1BU가 되도록
const FLASH_MS = 100; // 맞았을 때 하얗게 번쩍이는 시간

const ZONE_COLOR = { O: 0x2e86de, X: 0xee5253, 1: 0xee5253, 2: 0x2e86de, 3: 0xf0b429, 4: 0x1dd1a1 };

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
    // 바닥
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(0x6f8296).fillRect(0, 0, WORLD_W, WORLD_H);
    g.fillStyle(0x7a8da1).fillRect(WAIT.x * BU, 0, WAIT.w * BU, WORLD_H);
    g.lineStyle(1, 0x8497ab, 1);
    for (let x = 0; x <= MAP.w; x += 2) g.lineBetween(x * BU, 0, x * BU, WORLD_H);
    for (let y = 0; y <= MAP.h; y += 2) g.lineBetween(0, y * BU, WORLD_W, y * BU);
    this.add.text((WAIT.x + WAIT.w / 2) * BU, WORLD_H - 26, '대기 공간', { fontFamily: 'sans-serif', fontSize: '22px', color: '#c9d4df' }).setOrigin(0.5).setDepth(-90);

    this.zoneGfx = this.add.graphics().setDepth(-80);
    this.zoneTexts = [];

    for (const s of SPRITES) {
      for (const [m, c] of Object.entries(SPRITE.motions)) {
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
      if (!seen.has(id)) { v.root.forEach((o) => o.destroy()); this.views.delete(id); }
    }
    for (const e of s.ev || []) this.handleEvent(e);
  }

  makeView(p) {
    const sprite = this.add.sprite(0, 0, `${p.s}-idle`).setOrigin(SPRITE.anchor[0] / SPRITE.cell, SPRITE.anchor[1] / SPRITE.cell).setScale(SPR_SCALE);
    sprite.play(`${p.s}-idle`);
    const name = this.add.text(0, 0, (p.b ? '🤖 ' : '') + p.n, { fontFamily: 'sans-serif', fontSize: '17px', color: '#1f2d3a', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const bar = this.add.graphics();
    const status = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c0392b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const v = { sprite, name, bar, status, root: [sprite, name, bar, status], flashUntil: 0, punchUntil: 0, flashing: false, p };
    this.views.set(p.id, v);
    return v;
  }

  handleEvent(e) {
    const now = performance.now();
    const v = this.views.get(e.id);
    if (e.e === 'atk' && v) {
      v.sprite.play(`${v.p.s}-punch`, false);
      v.punchUntil = now + 260;
      const x0 = v.x, y0 = v.y - 0.55 * BU; // 가슴 높이에서 나가는 효과
      const len = e.len * BU;
      const line = this.add.graphics().setDepth(5000);
      if (e.kind === 'ranged') {
        line.lineStyle(5, 0xffd54a, 1).lineBetween(x0, y0, x0 + e.dx * len, y0 + e.dy * len);
      } else {
        const a = Math.atan2(e.dy, e.dx);
        line.lineStyle(7, 0xffffff, 1).beginPath().arc(x0, y0, 0.9 * BU, a - 0.7, a + 0.7).strokePath();
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
    this.zoneTexts.forEach((t) => t.destroy());
    this.zoneTexts = [];

    for (const z of ZONES[type]) {
      const col = ZONE_COLOR[z.id];
      let alpha = 0.34, border = 0.9, label = 0.55;
      if (s.phase === PHASE.LOBBY) { alpha = 0.12; border = 0.3; label = 0.25; }
      if (s.phase === PHASE.READING) { alpha = 0.22; border = 0.6; label = 0.5; }
      let fill = col;
      if (s.phase === PHASE.REVEAL) {
        if (z.id === ans) { fill = 0x2ecc71; alpha = 0.6; border = 1; label = 0.95; }
        else { alpha = 0.08; border = 0.25; label = 0.25; }
      }
      this.zoneGfx.fillStyle(fill, alpha).fillRect(z.x * BU, z.y * BU, z.w * BU, z.h * BU);
      this.zoneGfx.lineStyle(4, fill, border).strokeRect(z.x * BU + 2, z.y * BU + 2, z.w * BU - 4, z.h * BU - 4);
      const t = this.add.text((z.x + z.w / 2) * BU, (z.y + z.h / 2) * BU, String(z.label), { fontFamily: 'sans-serif', fontSize: type === 'ox' ? '200px' : '130px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(label).setDepth(-70);
      this.zoneTexts.push(t);
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
    }
    this.onFrame?.(this, delta);
  }
}

export function startWorld(parentId) {
  const scene = new WorldScene();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: '#6f8296',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
    render: { antialias: true },
  });
  return { game, scene };
}
