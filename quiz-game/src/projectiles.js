// 투사체 렌더링: 서버가 알려준 위치·속도로 사이를 이어서 그리고, 던지기는 포물선과 착탄 경고, 폭발 연출을 보여준다.
import Phaser from 'phaser';
import { PROJ_ART } from '../shared/pixelProjectiles.js';

const SCALE = 3;

export class ProjectileLayer {
  constructor(scene, bu) {
    this.s = scene;
    this.bu = bu;
    this.views = new Map();
  }

  create() {
    for (const [key, art] of Object.entries(PROJ_ART)) {
      this.s.textures.generate(`pj-${key}`, { data: art.rows, pixelWidth: 1, pixelHeight: 1, palette: art.palette }).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  apply(state) {
    for (const e of state.ev || []) if (e.e === 'boom') this._boom(e);
    const now = performance.now(), ids = new Set();
    for (const q of state.pj || []) {
      ids.add(q.id);
      const v = this.views.get(q.id) || this._make(q);
      v.q = q; v.t = now;
    }
    for (const v of [...this.views.values()]) if (!ids.has(v.q.id)) this._destroy(v);
  }

  _make(q) {
    const sprite = this.s.add.image(0, 0, `pj-${q.a}`).setScale(SCALE);
    const shadow = this.s.add.image(0, 0, 'coin-shadow').setScale(SCALE).setAlpha(0.3).setDepth(-45);
    const mark = q.k === 'l' ? this.s.add.graphics().setDepth(-40) : null; // 착탄 경고
    const v = { q, t: performance.now(), sprite, shadow, mark, born: performance.now() };
    this.views.set(q.id, v);
    return v;
  }

  _destroy(v) {
    v.sprite.destroy(); v.shadow.destroy(); v.mark?.destroy();
    this.views.delete(v.q.id);
  }

  update(now) {
    const bu = this.bu;
    for (const v of this.views.values()) {
      const q = v.q, dt = (now - v.t) / 1000;
      let x, y, z, ang = 0;
      if (q.k === 'b') {
        x = q.x + q.vx * dt; y = q.y + q.vy * dt; z = 0.7;
        ang = q.a === 'arrow' ? Math.atan2(q.vy, q.vx) : q.a === 'star' ? now / 60 : 0;
        if (q.a === 'orb') v.sprite.setScale(SCALE * (1 + 0.12 * Math.sin(now / 70)));
      } else { // 던지기: 출발점에서 착탄점으로 직선 이동 + 포물선 높이
        const u = Math.min(1, q.u + dt / q.T);
        x = q.sx + (q.tx - q.sx) * u; y = q.sy + (q.ty - q.sy) * u;
        z = 0.5 + 4 * 1.6 * u * (1 - u);
        ang = now / 90; // 빙글빙글
        const pulse = 0.5 + 0.5 * Math.sin(now / 90);
        v.mark.clear()
          .fillStyle(0xff5a1f, 0.1 + 0.08 * pulse).fillCircle(q.tx * bu, q.ty * bu, q.r * bu)
          .lineStyle(3, 0xff7a1a, 0.55 + 0.35 * pulse).strokeCircle(q.tx * bu, q.ty * bu, q.r * bu);
      }
      v.sprite.setPosition(x * bu, y * bu - z * bu).setRotation(ang).setDepth(y * bu + 3);
      v.shadow.setPosition(x * bu, y * bu).setAlpha(0.3 * (1 - Math.min(0.6, (z - 0.5) * 0.3)));
    }
  }

  // 폭발: 불덩이가 퍼지는 링 + 튀는 불씨(도트 네모) + 바닥에 그을음
  _boom(e) {
    const s = this.s, bu = this.bu, x = e.x * bu, y = e.y * bu, R = e.r * bu;
    const fill = s.add.circle(x, y, R * 0.25, 0xff7a1a, 0.75).setDepth(5400);
    s.tweens.add({ targets: fill, scale: 4, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => fill.destroy() });
    const ring = s.add.circle(x, y, R * 0.3).setStrokeStyle(6, 0xffd84a, 1).setDepth(5401);
    s.tweens.add({ targets: ring, scale: 3.3, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2, d = R * (0.5 + Math.random() * 0.9);
      const ember = s.add.rectangle(x, y, 6, 6, [0xff7a1a, 0xffd84a, 0xffffff][i % 3]).setDepth(5402);
      s.tweens.add({ targets: ember, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d * 0.8 - 20, alpha: 0, scale: 0.3, duration: 450 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => ember.destroy() });
    }
    const scorch = s.add.circle(x, y, R * 0.8, 0x1b1410, 0.3).setDepth(-46);
    s.tweens.add({ targets: scorch, alpha: 0, delay: 600, duration: 1200, onComplete: () => scorch.destroy() });
  }
}
