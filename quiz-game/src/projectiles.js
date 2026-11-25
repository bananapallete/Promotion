// 투사체 렌더링: 서버가 알려준 위치·속도로 사이를 이어서 그리고, 던지기는 포물선과 착탄 경고, 폭발 연출을 보여준다.
import Phaser from 'phaser';
import { PROJ_ART } from '../shared/pixelProjectiles.js';
import { explosion, waveTex } from './ultFx.js';

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
    const wave = q.a === 'wave';
    const sprite = this.s.add.image(0, 0, wave ? waveTex(this.s, this.bu) : `pj-${q.a}`).setScale(wave ? 3 : SCALE);
    const shadow = this.s.add.image(0, 0, 'coin-shadow').setScale(SCALE).setAlpha(0.3).setDepth(-45).setVisible(!wave);
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
        ang = q.a === 'arrow' || q.a === 'wave' ? Math.atan2(q.vy, q.vx) : q.a === 'star' ? now / 60 : 0;
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
  _boom(e) { // 도트 폭발: 불꽃(기본) · 별똥별(보라) · 알(노랑)
    explosion(this.s, e.x * this.bu, e.y * this.bu, e.r, e.art === 'orb' ? 'orb' : e.art === 'egg' ? 'egg' : 'fire', this.bu);
  }
}
