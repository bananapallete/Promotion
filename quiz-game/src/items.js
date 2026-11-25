// 아이템 렌더링: 하트·신발 도트, 생성 팝, 위아래로 둥실, 습득(번쩍 → 머리 위로 떠올라 글자)
import Phaser from 'phaser';
import { HEART_PALETTE, ITEM_SHADOW, SHOE_PALETTE, SHOE_ROWS, heartRows } from '../shared/itemPixels.js';

const SCALE = 3;
const REST = 0.55; // 바닥에서 뜬 높이 (칸)
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const LABEL = { heart: { color: '#ff8fa0' }, shoe: { color: '#8ec5ff', text: '속도 ↑' } };

export class ItemLayer {
  constructor(scene, bu) {
    this.s = scene;
    this.bu = bu;
    this.views = new Map();
  }

  create() {
    const gen = (key, data, palette) => this.s.textures.generate(key, { data, pixelWidth: 1, pixelHeight: 1, palette }).setFilter(Phaser.Textures.FilterMode.NEAREST);
    gen('item-heart', heartRows(), HEART_PALETTE);
    gen('item-shoe', SHOE_ROWS, SHOE_PALETTE);
    gen('item-shadow', ITEM_SHADOW, { 5: '#000000' });
  }

  apply(state) {
    for (const e of state.ev || []) {
      if (e.e === 'itemSpawn') this._make(e.id, e.k, e.x, e.y, true);
      else if (e.e === 'itemGet') this._get(e);
    }
    const ids = new Set();
    for (const i of state.items || []) {
      ids.add(i.id);
      if (!this.views.has(i.id)) this._make(i.id, i.k, i.x, i.y, false);
    }
    for (const v of [...this.views.values()]) if (!ids.has(v.id)) this._destroy(v);
  }

  _make(id, k, gx, gy, pop) {
    if (this.views.has(id)) return;
    const sprite = this.s.add.image(0, 0, `item-${k}`).setScale(SCALE);
    const shadow = this.s.add.image(0, 0, 'item-shadow').setScale(SCALE).setAlpha(0.3).setDepth(-45);
    this.views.set(id, { id, k, gx, gy, sprite, shadow, t0: performance.now(), pop });
    if (pop) { // 생길 때 하얀 고리가 퍼짐
      const ring = this.s.add.circle(gx * this.bu, gy * this.bu - REST * this.bu, 10, 0xffffff, 0.9).setDepth(5300);
      this.s.tweens.add({ targets: ring, scale: 3.4, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    }
  }

  _destroy(v) {
    v.sprite.destroy();
    v.shadow.destroy();
    this.views.delete(v.id);
  }

  _get(e) {
    const v = this.views.get(e.id);
    const x = e.x * this.bu, y = e.y * this.bu - REST * this.bu;
    if (v) this._destroy(v);
    const flash = this.s.add.image(x, y, `item-${e.k}`).setScale(SCALE).setTintFill(0xffffff).setDepth(7000);
    this.s.tweens.add({ targets: flash, scale: SCALE * 1.8, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    const who = this.s.views.get(e.by);
    const tx = who ? who.x : x, ty = (who ? who.y : e.y * this.bu) - 2.3 * this.bu;
    const lab = LABEL[e.k];
    const text = this.s.add.text(tx, ty, e.k === 'heart' ? `+${e.amount}` : lab.text, { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: lab.color, stroke: '#14122b', strokeThickness: 6 }).setOrigin(0.5).setDepth(8000).setScale(1.5).setResolution(2);
    this.s.tweens.add({ targets: text, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.s.tweens.add({ targets: text, y: ty - 0.9 * this.bu, alpha: 0, delay: 350, duration: 700, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
  }

  update(now) {
    const bu = this.bu;
    for (const v of this.views.values()) {
      const u = Math.min(1, (now - v.t0) / 350);
      const k = v.pop ? easeOutBack(u) : 1;
      const bob = Math.sin(now / 260 + v.id) * 0.09; // 둥실
      v.sprite.setPosition(v.gx * bu, v.gy * bu - (REST + bob) * bu).setScale(SCALE * k).setDepth(v.gy * bu + 1);
      v.shadow.setPosition(v.gx * bu, v.gy * bu).setScale(SCALE * (1 - bob * 1.2) * k).setAlpha(0.3 - bob * 0.5);
    }
  }
}
