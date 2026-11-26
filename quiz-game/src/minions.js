// 궁극기 병아리 부하: 알이 날아와 떨어지고 → 부화 → 닭 곁을 돌며 쪼거나 동전을 줍는다. 이름·체력바 없음
import { SPRITE } from '../shared/constants.js';
import { FXD } from './pixel.js';

export class MinionLayer {
  constructor(scene, bu, scale) { this.s = scene; this.bu = bu; this.k = scale; this.views = new Map(); }

  _make(id, x, y) {
    const sp = this.s.add.sprite(x, y, 'egg-idle', 0).setOrigin(SPRITE.anchor[0] / SPRITE.cell, SPRITE.anchor[1] / SPRITE.cell).setScale(this.k);
    const v = { id, sp, x, y, hatched: false, fly: null, m: null };
    this.views.set(id, v);
    return v;
  }

  /** 알이 닭에게서 포물선으로 떨어짐 */
  drop(e) {
    const bu = this.bu, v = this.views.get(e.id) || this._make(e.id, e.fx * bu, e.fy * bu);
    v.fly = { t0: performance.now(), T: e.flight * 1000, sx: e.fx * bu, sy: e.fy * bu - 0.5 * bu, tx: e.x * bu, ty: e.y * bu };
    v.x = v.fly.sx; v.y = v.fly.sy;
  }

  hatch(e) { // 껍질 조각이 튐
    const bu = this.bu, x = e.x * bu, y = e.y * bu - 0.3 * bu;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283, r = this.s.add.rectangle(x, y, 6, 6, i % 2 ? 0xfff3d0 : 0xe8d0a0).setDepth(FXD);
      this.s.tweens.add({ targets: r, x: x + Math.cos(a) * 30, y: y + Math.sin(a) * 22 - 8, alpha: 0, duration: 380, onComplete: () => r.destroy() });
    }
  }

  apply(state) {
    const bu = this.bu, ids = new Set();
    for (const m of state.mn || []) {
      ids.add(m.id);
      const v = this.views.get(m.id) || this._make(m.id, m.x * bu, m.y * bu);
      v.m = m;
    }
    for (const v of [...this.views.values()]) if (!ids.has(v.id)) { v.sp.destroy(); this.views.delete(v.id); }
  }

  update(now, delta) {
    const bu = this.bu, k = Math.min(1, (delta / 1000) * 18);
    for (const v of this.views.values()) {
      const m = v.m; if (!m) continue;
      if (v.fly) {
        const u = (now - v.fly.t0) / v.fly.T;
        if (u < 1) { v.x = v.fly.sx + (v.fly.tx - v.fly.sx) * u; v.y = v.fly.sy + (v.fly.ty - v.fly.sy) * u - Math.sin(Math.PI * u) * 1.6 * bu; v.sp.setPosition(v.x, v.y).setDepth(v.fly.ty + 1); continue; }
        v.fly = null; v.x = v.fly?.tx ?? m.x * bu; v.y = m.y * bu;
      }
      v.x += (m.x * bu - v.x) * k; v.y += (m.y * bu - v.y) * k;
      v.sp.setPosition(v.x, v.y).setDepth(v.y).setFlipX(m.f < 0);
      if (m.e) { if (v.hatched) { v.hatched = false; } v.sp.setTexture('egg-idle', 0); continue; }
      v.hatched = true;
      v.sp.play(`chick-${m.a === 2 ? 'atk0' : m.a === 1 ? 'walk' : 'idle'}`, true);
    }
  }
}
