// 동전 렌더링: 도트 동전 텍스처, 제자리 회전, 생성 팝, 튀어나감(포물선 + 스쿼시/스프링), 습득(하얀 점 → 상승 → 머리 위 → +1)
import Phaser from 'phaser';
import { COIN_DOT, COIN_N, COIN_PALETTE, COIN_SHADOW, COIN_WIDTHS, coinRows } from '../shared/coinPixels.js';

const SCALE = 3; // 도트 1칸 = 화면 3px (1칸=48px 기준 동전 지름 12*3=36px)
const REST = 0.42; // 바닥에 놓인 동전 중심의 높이 (칸)
const BODY_H = 0.9; // 튀어나올 때 몸에서 출발하는 높이 (칸)
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

export class CoinLayer {
  constructor(scene, bu) {
    this.s = scene;
    this.bu = bu;
    this.views = new Map();
  }

  create() {
    const s = this.s;
    const gen = (key, rows) => s.textures.generate(key, { data: rows, pixelWidth: 1, pixelHeight: 1, palette: COIN_PALETTE }).setFilter(Phaser.Textures.FilterMode.NEAREST);
    COIN_WIDTHS.forEach((w, i) => gen(`coin-f${i}`, coinRows(w)));
    gen('coin-dot', COIN_DOT);
    gen('coin-shadow', COIN_SHADOW);
    const frames = COIN_WIDTHS.map((_, i) => ({ key: `coin-f${i}` }));
    s.anims.create({ key: 'coin-spin', frames, frameRate: 9, repeat: -1 });
    s.anims.create({ key: 'coin-spin-fast', frames, frameRate: 22, repeat: -1 });
  }

  // 서버 상태 반영: 이벤트로 애니메이션을 시작하고, 동전 목록으로 존재 여부를 맞춘다
  apply(state) {
    for (const e of state.ev || []) {
      if (e.e === 'coinSpawn') this._spawn(e);
      else if (e.e === 'coinDrop') this._drop(e);
      else if (e.e === 'coinGet') this._get(e);
    }
    const ids = new Set();
    for (const c of state.coins || []) {
      ids.add(c.id);
      const v = this.views.get(c.id) || this._make(c.id, c.x, c.y, 'idle');
      if (v.mode === 'idle') { v.gx = c.x; v.gy = c.y; }
      // 줍기 금지 시간이 남아 있으면 깜빡임 (중간에 접속해도 맞게 서버가 남은 시간을 알려줌)
      const until = performance.now() + (c.lk || 0) * 1000;
      if (c.lk > 0 && until > (v.blinkUntil || 0) + 250) v.blinkUntil = until;
    }
    for (const v of [...this.views.values()]) {
      if (!ids.has(v.id) && v.mode !== 'get') this._destroy(v);
    }
  }

  _make(id, gx, gy, mode) {
    const sprite = this.s.add.sprite(0, 0, 'coin-f0').setScale(SCALE);
    sprite.play({ key: 'coin-spin', startFrame: Math.floor(Math.random() * COIN_WIDTHS.length) });
    const shadow = this.s.add.image(0, 0, 'coin-shadow').setScale(SCALE).setAlpha(0.3).setDepth(-45);
    const v = { id, gx, gy, mode, sprite, shadow, t0: performance.now() };
    this.views.set(id, v);
    return v;
  }

  _destroy(v) {
    v.sprite.destroy();
    v.shadow.destroy();
    this.views.delete(v.id);
  }

  _spawn(e) {
    if (this.views.has(e.id)) return;
    const v = this._make(e.id, e.x, e.y, 'spawn');
    v.sprite.setScale(0);
    // 생길 때 하얀 점이 퍼지며 사라지는 효과
    const ring = this.s.add.image(e.x * this.bu, e.y * this.bu - REST * this.bu, 'coin-dot').setScale(SCALE).setDepth(5300);
    this.s.tweens.add({ targets: ring, scale: SCALE * 3.2, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  _drop(e) {
    let v = this.views.get(e.id);
    if (!v) v = this._make(e.id, e.x, e.y, 'drop');
    v.mode = 'drop';
    v.d = e;
    v.t0 = performance.now();
    v.blinkUntil = v.t0 + (e.lock || 0) * 1000; // 줍기 금지 시간 동안 깜빡임
    v.sprite.play('coin-spin-fast');
    v.fast = true;
  }

  _get(e) {
    let v = this.views.get(e.id);
    if (!v) v = this._make(e.id, e.x, e.y, 'idle');
    v.mode = 'get';
    v.sprite.setAlpha(1);
    v.by = e.by;
    v.t0 = performance.now();
    v.sx0 = v.sprite.x;
    v.sy0 = v.sprite.y;
    v.dot = false;
    v.shadow.setVisible(false);
    const col = this.s.views.get(e.by);
    if (col) col.pending = (col.pending || 0) + 1; // 애니메이션이 끝나야 개수에 '기록'된다
    v.sprite.anims.stop();
  }

  // ---------- 매 프레임 ----------
  update(now) {
    for (const v of [...this.views.values()]) {
      switch (v.mode) {
        case 'idle': this._place(v, v.gx, v.gy, 0, 1, 1); break;
        case 'spawn': {
          const u = Math.min(1, (now - v.t0) / 350);
          const k = easeOutBack(u);
          this._place(v, v.gx, v.gy, 0, k, k);
          if (u >= 1) v.mode = 'idle';
          break;
        }
        case 'drop': this._updateDrop(v, now); break;
        case 'get': this._updateGet(v, now); break;
      }
      if (v.mode !== 'get') { // 줍기 금지 중이면 깜빡임 (끝나기 직전엔 더 빠르게)
        const left = (v.blinkUntil || 0) - now;
        const on = left <= 0 || Math.floor(now / (left < 700 ? 70 : 130)) % 2 === 0;
        v.sprite.setAlpha(on ? 1 : 0.18);
        v.shadow.setAlpha(on ? v.shadow.alpha : 0.05);
      }
    }
  }

  _place(v, gx, gy, z, sx, sy) {
    const bu = this.bu;
    v.sprite.setPosition(gx * bu, gy * bu - (REST + z) * bu).setScale(SCALE * sx, SCALE * sy).setDepth(gy * bu + 1);
    v.shadow.setPosition(gx * bu, gy * bu).setScale(SCALE * (1 - Math.min(0.5, z * 0.25)), SCALE * (1 - Math.min(0.5, z * 0.25))).setAlpha(0.3 * (1 - Math.min(0.6, z * 0.3)));
  }

  // 튀어나옴: 포물선 비행 → 착지 스쿼시 → 큰 튕김 → 작은 튕김 → 스프링으로 흔들리다 정지
  _updateDrop(v, now) {
    const d = v.d;
    const t = (now - v.t0) / 1000;
    const T = d.flight;
    let gx = d.x, gy = d.y, z = 0, sx = 1, sy = 1;
    if (t < T) {
      const u = t / T;
      gx = d.fx + (d.x - d.fx) * u;
      gy = d.fy + (d.y - d.fy) * u;
      z = BODY_H * (1 - u) + 4 * 1.8 * u * (1 - u); // 몸 높이에서 출발해 포물선으로 바닥까지
      sy = 1 + 0.12 * Math.cos(Math.PI * u); sx = 1 / sy;
    } else {
      const a = t - T; // 착지 이후 경과 시간
      const B1 = 0.10, UP1 = 0.30, S2 = 0.07, UP2 = 0.20, S3 = 0.05;
      if (a < B1) { const k = a / B1; sy = 0.55 + 0.45 * k; sx = 1.5 - 0.5 * k; } // 착지: 납작하게 눌렸다가 펴짐
      else if (a < B1 + UP1) { const u = (a - B1) / UP1; z = 4 * 0.6 * u * (1 - u); sy = 1 + 0.12 * Math.cos(Math.PI * u); sx = 1 / sy; }
      else if (a < B1 + UP1 + S2) { const k = (a - B1 - UP1) / S2; sy = 0.78 + 0.22 * k; sx = 1.25 - 0.25 * k; }
      else if (a < B1 + UP1 + S2 + UP2) { const u = (a - B1 - UP1 - S2) / UP2; z = 4 * 0.22 * u * (1 - u); sy = 1 + 0.08 * Math.cos(Math.PI * u); sx = 1 / sy; }
      else if (a < B1 + UP1 + S2 + UP2 + S3) { const k = (a - B1 - UP1 - S2 - UP2) / S3; sy = 0.9 + 0.1 * k; sx = 1.1 - 0.1 * k; }
      else {
        const w = a - (B1 + UP1 + S2 + UP2 + S3); // 마지막 스프링 흔들림
        if (w < 0.35) { sy = 1 + 0.1 * Math.exp(-w * 11) * Math.cos(w * 46); sx = 1 / sy; }
        else { v.mode = 'idle'; v.gx = d.x; v.gy = d.y; v.sprite.play('coin-spin'); return; }
      }
      if (v.fast && a > B1 + UP1) { v.fast = false; v.sprite.play('coin-spin'); }
    }
    this._place(v, gx, gy, z, sx, sy);
  }

  // 습득: 하얀 점으로 변함 → 위로 상승 → 습득한 캐릭터 머리 위로 이동 → +1 텍스트 → 기록
  _updateGet(v, now) {
    const bu = this.bu;
    const t = (now - v.t0) / 1000;
    const col = this.s.views.get(v.by);
    const tx = col ? col.x : v.sx0, ty = col ? col.y - 2.0 * bu : v.sy0 - 2 * bu;
    const riseY = v.sy0 - 1.1 * bu;
    if (t < 0.10) { // 하얗게 반짝이며 작아짐
      v.sprite.setTintFill(0xffffff).setScale(SCALE * (1 - 0.3 * (t / 0.10)));
      v.sprite.setPosition(v.sx0, v.sy0).setDepth(7000);
      return;
    }
    if (!v.dot) { v.dot = true; v.sprite.clearTint().setTexture('coin-dot'); }
    let x, y, sc;
    if (t < 0.40) { // 상승
      const k = easeOut((t - 0.10) / 0.30);
      x = v.sx0; y = v.sy0 + (riseY - v.sy0) * k; sc = SCALE * (0.7 + 0.1 * k);
    } else if (t < 0.85) { // 머리 위로
      const k = easeInOut((t - 0.40) / 0.45);
      x = v.sx0 + (tx - v.sx0) * k; y = riseY + (ty - riseY) * k; sc = SCALE * (0.8 - 0.25 * k);
    } else { // 도착: +1 텍스트가 뜨고 기록
      const text = this.s.add.text(tx, ty, '+1', { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#ffe27a', stroke: '#14122b', strokeThickness: 6 }).setOrigin(0.5).setDepth(8000).setScale(1.5);
      text.setResolution(2);
      this.s.tweens.add({ targets: text, scale: 1, duration: 120, ease: 'Back.easeOut' });
      this.s.tweens.add({ targets: text, y: ty - 0.9 * bu, alpha: 0, delay: 250, duration: 650, ease: 'Cubic.easeOut', onComplete: () => text.destroy() });
      if (col) { col.pending = Math.max(0, (col.pending || 1) - 1); col.bump = now; }
      this._destroy(v);
      return;
    }
    v.sprite.setPosition(x, y).setScale(sc).setDepth(7000);
  }
}
