// 궁극기·폭발 도트 이펙트. 이미지 파일 없이 코드로 도트를 찍어 Phaser 텍스처로 만든다 (도트 1개 = 화면 3px, 4x4 디더링).
import Phaser from 'phaser';

import { FXD, PX } from './pixel.js';
export const DOT = PX;
const NAVY = [20, 18, 43];
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bay = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;
const PAL = { // 어두운 색 → 밝은 색
  fire: [0x7a2a1a, 0xe0502a, 0xff9a3c, 0xffe27a, 0xffffff].map(rgb),
  orb: [0x3a2370, 0x6a3fb0, 0xb072ff, 0xe3c9ff, 0xffffff].map(rgb),
  egg: [0x7a4a10, 0xc27a10, 0xf2a31b, 0xffd54a, 0xfff7c2].map(rgb),
  quake: [0x4a3524, 0x7a5a3c, 0xa8845a, 0xd9c08f, 0xf3ecd6].map(rgb),
  pink: [0x7a2a4a, 0xd94a8a, 0xff8fb8, 0xffc2d8, 0xffffff].map(rgb),
  water: [0x1d4a9a, 0x3a7ae0, 0x7ab8ff, 0xcfe8ff, 0xffffff].map(rgb),
};
const palOf = (kind) => PAL[kind] || PAL.fire;
const easeOut = (t) => 1 - (1 - t) ** 3;

/** 도트 텍스처를 한 번만 만든다. paint(put, w, h) */
function tex(scene, key, w, h, paint) {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, w, h), ctx = t.getContext(), img = ctx.createImageData(w, h), d = img.data;
  const put = (x, y, c, a = 255) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };
  paint(put, w, h);
  ctx.putImageData(img, 0, 0); t.refresh(); t.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}
const disc = (put, cx, cy, r, c, a = 255) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(x, y, c, a); };
const ink = (put, w, h, get) => { // 윤곽선: 투명 이웃이 있는 점에 남색
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && get(x, y);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) put(x, y, NAVY);
};

// ---------- 폭발: 불꽃이 퍼졌다 사그라듦 (6프레임) ----------
const EXP_N = 6;
function explosionTex(scene, kind, Rd, f) {
  const key = `ux-${kind}-${Rd}-${f}`, S = 2 * Rd + 4, c = S / 2, pal = palOf(kind), t = f / (EXP_N - 1);
  return tex(scene, key, S, S, (put, w, h) => {
    const fr = 0.3 + 0.7 * easeOut(Math.min(1, t * 1.3)), life = 1 - Math.pow(t, 1.3) * 0.85;
    const lit = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy) / Rd, a = Math.atan2(dy, dx);
      const front = fr * (0.84 + 0.12 * Math.sin(3 * a + f * 0.9) + 0.06 * Math.sin(7 * a - f * 1.3)); // 울퉁불퉁한 불꽃 구름
      if (d > front) continue;
      const core = 1 - d / front, v = (0.18 + core * 0.8) * life;
      const idx = Math.floor(v * 5.2 + (bay(x, y) - 0.5) * 0.55) - (t > 0.6 ? 1 : 0); // 띠로 나뉜 색, 경계에만 디더링
      if (idx < 0) continue;
      lit[y * w + x] = 1;
      put(x, y, pal[Math.min(4, idx)]);
    }
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}
export function explosion(scene, x, y, R, kind, BU) {
  const Rd = Math.max(8, Math.round((R * BU) / DOT)), imgs = [];
  for (let f = 0; f < EXP_N; f++) explosionTex(scene, kind, Rd, f);
  const sp = scene.add.image(x, y, `ux-${kind}-${Rd}-0`).setScale(DOT).setDepth(FXD);
  let f = 0;
  const timer = scene.time.addEvent({ delay: 62, repeat: EXP_N - 1, callback: () => { sp.setTexture(`ux-${kind}-${Rd}-${f}`); f++; if (f >= EXP_N) { timer.remove(); scene.tweens.add({ targets: sp, alpha: 0, duration: 120, onComplete: () => sp.destroy() }); } } });
  // 불똥: 작은 네모가 튀어 오름
  const pal = palOf(kind);
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * 6.283, d = R * BU * (0.5 + Math.random() * 0.8), col = pal[2 + (i % 3)];
    const e = scene.add.rectangle(x, y, DOT * 2, DOT * 2, Phaser.Display.Color.GetColor(col[0], col[1], col[2])).setDepth(FXD);
    scene.tweens.add({ targets: e, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d * 0.7 - 24, alpha: 0, duration: 420 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => e.destroy() });
  }
  // 그을음 자국 (디더링 원)
  const sk = tex(scene, `ux-scorch-${Rd}`, 2 * Rd, 2 * Rd, (put) => { for (let yy = 0; yy < 2 * Rd; yy++) for (let xx = 0; xx < 2 * Rd; xx++) { const d = Math.hypot(xx + 0.5 - Rd, yy + 0.5 - Rd) / Rd; if (d < 0.85 && bay(xx, yy) > d * 0.9) put(xx, yy, [27, 20, 16], 110); } });
  const sc = scene.add.image(x, y, sk).setScale(DOT).setDepth(-46);
  scene.tweens.add({ targets: sc, alpha: 0, delay: 700, duration: 1200, onComplete: () => sc.destroy() });
}

// ---------- 예고(디더링 원이 차오름) ----------
const WARN_LV = [0.3, 0.55, 0.8, 1];
/** 궁극기 유효 범위: 테두리 없는 연한 원형 도트 면. 이펙트와 별개로 '여기까지 맞는다'만 보여 준다 */
function rangeTex(scene, Rd) {
  return tex(scene, `ux-range-${Rd}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => disc(put, w / 2, w / 2, Rd, [255, 255, 255], 255));
}
export function rangeDisc(scene, x, y, R, BU, ms = 600) {
  const Rd = Math.max(6, Math.round((R * BU) / DOT));
  const sp = scene.add.image(x * BU, y * BU, rangeTex(scene, Rd)).setScale(DOT).setDepth(-43).setAlpha(0.2);
  scene.tweens.add({ targets: sp, alpha: 0, delay: ms * 0.4, duration: ms * 0.6, onComplete: () => sp.destroy() });
}
function warnTex(scene, Rd, lv) {
  return tex(scene, `ux-warn-${Rd}-${lv}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => {
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2) / Rd;
      if (d > 1) continue;
      if (d <= lv * 0.98) put(x, y, [224, 60, 48], 150);
      else if ((x + y) % 2 === 0) put(x, y, [224, 60, 48], 120);
      if (d > 0.92 && (x + y) % 2 === 0) put(x, y, [255, 150, 120], 170);
    }
  });
}
export function warn(scene, e, BU) {
  const Rd = Math.max(8, Math.round((e.r * BU) / DOT));
  WARN_LV.forEach((_, i) => warnTex(scene, Rd, i));
  const sp = scene.add.image(e.x * BU, e.y * BU, `ux-warn-${Rd}-0`).setScale(DOT).setDepth(-44);
  const t0 = performance.now(), total = e.sec * 1000;
  const tm = scene.time.addEvent({ delay: 40, loop: true, callback: () => { const u = (performance.now() - t0) / total; if (u >= 1) { tm.remove(); sp.destroy(); return; } sp.setTexture(`ux-warn-${Rd}-${Math.min(3, Math.floor(u * 4))}`); } });
}

// ---------- 떨어지는 별똥별 / 알 ----------
function meteorTex(scene, art, f) {
  const key = `ux-met-${art}-${f}`;
  if (art === 'egg') return tex(scene, key, 14, 22, (put, w, h) => {
    const pal = PAL.egg, get = (x, y) => ((x + 0.5 - 7) / 4.6) ** 2 + ((y + 0.5 - 14) / 6.2) ** 2 <= 1;
    for (let y = 0; y < 7; y++) if ((y + f) % 2 === 0) put(7 + (f ? 1 : -1), y, pal[3], 200); // 위로 늘어진 꼬리 점
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (get(x, y)) put(x, y, x + y < 14 ? [255, 247, 214] : x + y < 22 ? [255, 235, 160] : [232, 190, 90]);
    put(5, 11, [255, 255, 255]); put(5, 12, [255, 255, 255]);
    ink(put, w, h, get);
  });
  const star = art === 'orb', pal = palOf(star ? 'orb' : 'fire');
  return tex(scene, key, 26, 26, (put, w, h) => {
    const lit = new Uint8Array(w * h), mark = (x, y, c) => { put(x, y, c); lit[Math.round(y) * w + Math.round(x)] = 1; };
    for (let t = 1; t <= 12; t++) { // 왼쪽 위로 꼬리 (점점 가늘어지고 어두워짐)
      const r = Math.max(1, 5 - t * 0.38), cx = 17 - t * 0.95 + (f ? 0.6 : -0.6), cy = 17 - t * 0.95;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r && bay(x, y) < 1.1 - t / 14) mark(x, y, pal[Math.max(0, 3 - Math.floor(t / 3.5))]);
    }
    if (star) { // 별: 가운데 흰색 + 네 방향 뾰족
      for (let i = -6; i <= 6; i++) { mark(17 + i, 17, i * i < 9 ? pal[4] : pal[2]); mark(17, 17 + i, i * i < 9 ? pal[4] : pal[2]); }
      for (let i = -3; i <= 3; i++) { mark(17 + i, 17 + i, pal[3]); mark(17 + i, 17 - i, pal[3]); }
      disc((x, y, c) => mark(x, y, c), 17, 17, 3, pal[4]);
    } else { // 불타는 바위
      disc((x, y, c) => mark(x, y, c), 17, 17, 6, [92, 64, 48]);
      disc((x, y, c) => mark(x, y, c), 15.5, 15.5, 3.5, [150, 108, 80]);
      put(14, 14, [210, 170, 130]); put(15, 14, [210, 170, 130]);
      mark(19, 19, [60, 40, 30]); mark(20, 18, [60, 40, 30]);
    }
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}
export function meteorFall(scene, e, BU) {
  const art = e.art === 'egg' ? 'egg' : e.art === 'orb' ? 'orb' : 'fire';
  meteorTex(scene, art, 0); meteorTex(scene, art, 1);
  const x = e.x * BU, y = e.y * BU, egg = art === 'egg';
  const sp = scene.add.image(x - (egg ? 0 : 5 * BU), y - 8 * BU, `ux-met-${art}-0`).setScale(DOT).setDepth(FXD);
  if (!egg) sp.setOrigin(17 / 26, 17 / 26); else sp.setOrigin(0.5, 14 / 22);
  const flick = scene.time.addEvent({ delay: 70, loop: true, callback: () => sp.setTexture(`ux-met-${art}-${sp.texture.key.endsWith('0') ? 1 : 0}`) });
  scene.tweens.add({ targets: sp, x, y, duration: e.sec * 1000, ease: 'Quad.easeIn', onComplete: () => { flick.remove(); sp.destroy(); } });
}

// ---------- 지진: 갈라지는 땅 + 튀는 돌 + 먼지 고리 ----------
function crackTex(scene, Rd, seed) {
  return tex(scene, `ux-crack-${Rd}-${seed}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => {
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const c = w / 2, lit = new Uint8Array(w * w);
    const mark = (x, y, col) => { put(x, y, col); lit[Math.max(0, Math.min(w - 1, Math.round(y))) * w + Math.max(0, Math.min(w - 1, Math.round(x)))] = 1; };
    const branch = (x, y, ang, len, thick) => {
      for (let i = 0; i < len; i++) {
        ang += (rnd() - 0.5) * 0.7;
        x += Math.cos(ang); y += Math.sin(ang);
        for (let k = 0; k < thick; k++) mark(x + Math.sin(ang) * k, y - Math.cos(ang) * k, [58, 40, 28]);
        if (i > len * 0.3 && rnd() < 0.07 && thick > 1) branch(x, y, ang + (rnd() < 0.5 ? 0.9 : -0.9), (len - i) * 0.6, 1);
      }
    };
    const n = 7;
    for (let i = 0; i < n; i++) branch(c, c, (i / n) * 6.283 + rnd() * 0.5, Rd * (0.75 + rnd() * 0.25), 2);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) if (lit[y * w + x] && !lit[Math.max(0, y - 1) * w + x]) put(x, y - 1, [168, 132, 90]); // 윗면 하이라이트
  });
}
function ringTex(scene, Rd, f, kind, n) {
  const key = `ux-ring-${kind}-${Rd}-${f}`, S = 2 * Rd + 4, pal = palOf(kind);
  return tex(scene, key, S, S, (put, w) => {
    const t = f / (n - 1), r = (0.25 + 0.75 * easeOut(t)) * Rd, th = Math.max(2, 5 - t * 4);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2);
      if (d > r || d < r - th) continue;
      const k = (d - (r - th)) / th; // 바깥쪽이 밝음
      if (bay(x, y) < (1 - t * 0.9) * (0.6 + 0.4 * k)) put(x, y, pal[Math.min(4, 1 + Math.floor(k * 4))]);
    }
  });
}
const RING_N = 5;
function ringAnim(scene, x, y, R, kind, BU, depth = FXD) {
  const Rd = Math.max(8, Math.round((R * BU) / DOT));
  for (let f = 0; f < RING_N; f++) ringTex(scene, Rd, f, kind, RING_N);
  const sp = scene.add.image(x, y, `ux-ring-${kind}-${Rd}-0`).setScale(DOT).setDepth(depth);
  let f = 0;
  const tm = scene.time.addEvent({ delay: 70, repeat: RING_N - 1, callback: () => { sp.setTexture(`ux-ring-${kind}-${Rd}-${f}`); f++; if (f >= RING_N) { tm.remove(); sp.destroy(); } } });
}
const DEBRIS = [[0, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 0]];
function debrisTex(scene, v) {
  return tex(scene, `ux-debris-${v}`, 6, 6, (put, w, h) => {
    const get = (x, y) => x >= 1 && y >= 1 && x <= 4 && y <= 4 && DEBRIS[y - 1][x - 1];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (get(x, y)) put(x, y, v ? [122, 90, 60] : [168, 132, 90]);
    put(2, 2, [217, 192, 143]);
    ink(put, w, h, get);
  });
}
export function quake(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, Rd = Math.max(8, Math.round((e.r * BU) / DOT));
  const sp = scene.add.image(x, y, crackTex(scene, Rd, (Math.floor(Math.random() * 3) + 1))).setScale(DOT).setDepth(-47);
  scene.tweens.add({ targets: sp, alpha: 0, delay: 900, duration: 700, onComplete: () => sp.destroy() });
  ringAnim(scene, x, y, e.r, 'quake', BU);
  ringAnim(scene, x, y, e.r * 0.65, 'quake', BU, FXD);
  for (let i = 0; i < 12; i++) { // 땅에서 튀어 오르는 돌
    const ang = Math.random() * 6.283, d = e.r * BU * (0.15 + Math.random() * 0.8), px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.8;
    const r = scene.add.image(px, py, debrisTex(scene, i % 2)).setScale(DOT).setDepth(FXD);
    scene.tweens.add({ targets: r, y: py - 26 - Math.random() * 40, duration: 260 + Math.random() * 120, ease: 'Quad.easeOut', yoyo: true, onComplete: () => scene.tweens.add({ targets: r, alpha: 0, duration: 220, onComplete: () => r.destroy() }) });
  }
  if (scene.focusId) scene.cameras.main.shake(260, 0.006);
}
export function shockRing(scene, e, BU, kind = 'fire') { ringAnim(scene, e.x * BU, e.y * BU, e.r, kind, BU); ringAnim(scene, e.x * BU, e.y * BU, e.r * 0.6, kind === 'fire' ? 'quake' : kind, BU, 4997); }

// ---------- 지속 범위: 불꽃·화살비 ----------
function flameTex(scene, f) {
  return tex(scene, `ux-flame-${f}`, 12, 18, (put, w, h) => {
    const lit = new Uint8Array(w * h), pal = PAL.fire;
    for (let y = 0; y < h - 1; y++) {
      const k = 1 - y / (h - 1), hw = Math.sin(Math.PI * Math.pow(k, 0.75)) * 4.6 * (1 + 0.15 * Math.sin(f * 1.9 + y * 0.6)), off = Math.sin(f * 1.3 + y * 0.35) * 1.2;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - 6 - off * (1 - k);
        if (Math.abs(dx) > hw) continue;
        const core = 1 - Math.abs(dx) / Math.max(0.1, hw), v = core * 0.6 + (1 - k) * 0.55 - 0.1;
        lit[y * w + x] = 1;
        put(x, y, pal[Math.max(0, Math.min(4, Math.floor(v * 5.2)))]);
      }
    }
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}
function rainTex(scene, f) {
  return tex(scene, `ux-rain-${f}`, 7, 20, (put, w, h) => {
    const lit = new Uint8Array(w * h), m = (x, y, c) => { put(x, y, c); lit[y * w + x] = 1; };
    for (let y = 4; y < 16; y++) m(3, y, [139, 98, 56]);
    m(2, 2, [220, 230, 240]); m(3, 2, [220, 230, 240]); m(4, 2, [220, 230, 240]); m(3, 1, [255, 255, 255]); m(3, 3, [200, 210, 225]); // 화살촉
    m(2, 15, [240, 240, 240]); m(4, 15, [240, 240, 240]); m(2, 16, [240, 240, 240]); m(4, 16, [240, 240, 240]); // 깃
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}
function baseTex(scene, kind, Rd) {
  const fire = kind === 'fire', c1 = fire ? [255, 106, 26] : kind === 'mud' ? [112, 78, 48] : [90, 167, 255];
  return tex(scene, `ux-base-${kind}-${Rd}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => {
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2) / Rd; if (d <= 1 && bay(x, y) > d * 0.95 - 0.1) put(x, y, d > 0.9 ? NAVY : c1, d > 0.9 ? 90 : 95); }
  });
}
export class UltZoneLayer {
  constructor(scene, bu) { this.s = scene; this.bu = bu; this.views = new Map(); }
  apply(zones) {
    const ids = new Set();
    for (const z of zones || []) {
      ids.add(z.id);
      let v = this.views.get(z.id);
      if (!v) v = this._make(z);
      v.z = z;
    }
    for (const v of [...this.views.values()]) if (!ids.has(v.id)) { v.parts.forEach((p) => p.destroy()); this.views.delete(v.id); }
  }
  _make(z) {
    const s = this.s, bu = this.bu, fire = z.k === 'fire', mud = z.k === 'mud', Rd = Math.max(8, Math.round((z.r * bu) / DOT));
    [0, 1, 2, 3].forEach((f) => { flameTex(s, f); rainTex(s, f); mudBubbleTex(s, f); });
    const base = s.add.image(z.x * bu, z.y * bu, baseTex(s, z.k, Rd)).setScale(DOT).setDepth(-44);
    const parts = [base], n = Math.round(z.r * z.r * 2.2), items = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * z.r * bu * 0.92;
      const x = z.x * bu + Math.cos(a) * r, y = z.y * bu + Math.sin(a) * r * 0.9;
      const sp = s.add.image(x, y, mud ? 'ux-mud-0' : fire ? 'ux-flame-0' : 'ux-rain-0').setScale(DOT).setOrigin(0.5, 1).setDepth(FXD);
      items.push({ sp, x, y, ph: Math.random() }); parts.push(sp);
    }
    const v = { id: z.id, z, base, items, parts, fire, mud };
    this.views.set(z.id, v);
    return v;
  }
  update(now) {
    for (const v of this.views.values()) {
      const fade = Math.min(1, v.z.l / 0.5);
      v.base.setAlpha(fade * (0.8 + 0.2 * Math.sin(now / 160)));
      for (const it of v.items) {
        if (v.mud) it.sp.setTexture(`ux-mud-${Math.floor((now / 260 + it.ph * 4) % 4)}`).setPosition(it.x, it.y).setAlpha(fade * 0.95);
        else if (v.fire) it.sp.setTexture(`ux-flame-${Math.floor(now / 110 + it.ph * 4) % 4}`).setPosition(it.x, it.y).setAlpha(fade);
        else { // 화살: 대각선 위에서 빠르게 내려꽂힘(0.18초) → 꽂힌 채 0.5초 동안 투명해지며 사라짐 → 쉬었다가 다른 자리에 다시
          if (it.t0 === undefined) { it.t0 = now + it.ph * 900; it.gap = 100 + Math.random() * 500; }
          let T = now - it.t0;
          if (T >= 680 + it.gap) { // 다음 화살: 범위 안 새 자리
            const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * v.z.r * this.bu * 0.92;
            it.x = v.z.x * this.bu + Math.cos(a) * r; it.y = v.z.y * this.bu + Math.sin(a) * r * 0.9; it.t0 = now; it.gap = 100 + Math.random() * 500; T = 0;
          }
          if (T < 0 || T >= 680) { it.sp.setAlpha(0); continue; }
          const f = Math.min(1, T / 180), k = (1 - f * f);
          it.sp.setTexture(`ux-rain-${Math.floor(now / 120) % 4}`).setFlipY(true).setAngle(31).setPosition(it.x + 85 * k, it.y - 150 * k).setDepth(FXD).setAlpha((T < 180 ? 1 : 1 - (T - 180) / 500) * fade);
        }
      }
    }
  }
}

// ---------- 강화 오라 / 돌진 속도선 ----------
function sparkTex(scene) {
  return tex(scene, 'ux-spark', 7, 7, (put) => { put(3, 0, [255, 213, 74]); put(3, 6, [255, 213, 74]); put(0, 3, [255, 213, 74]); put(6, 3, [255, 213, 74]); for (let i = 1; i <= 5; i++) { put(3, i, i === 3 ? [255, 255, 255] : [255, 226, 122]); put(i, 3, i === 3 ? [255, 255, 255] : [255, 226, 122]); } });
}
function auraTex(scene, Rd) {
  return tex(scene, `ux-aura-${Rd}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => {
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - w / 2, (y + 0.5 - w / 2) * 1.6) / Rd; if (d <= 1 && d > 0.55 && bay(x, y) > d * 0.9 - 0.15) put(x, y, d > 0.9 ? [255, 213, 74] : [255, 232, 140], 150); }
  });
}
export function auraTick(scene, v, now, BU) { // 강화 중인 캐릭터: 발밑 디더링 고리 + 위로 오르는 반짝임
  const Rd = Math.round((0.9 * BU) / DOT);
  if (!v.aura) v.aura = scene.add.image(0, 0, auraTex(scene, Rd)).setScale(DOT).setDepth(-43);
  v.aura.setPosition(v.x, v.y - 2).setAlpha(0.65 + 0.3 * Math.sin(now / 150)).setVisible(true);
  if (now > (v.sparkAt || 0)) {
    v.sparkAt = now + 90;
    const s = scene.add.image(v.x + (Math.random() - 0.5) * 0.9 * BU, v.y - Math.random() * 0.5 * BU, sparkTex(scene)).setScale(DOT).setDepth(FXD);
    scene.tweens.add({ targets: s, y: s.y - 1.1 * BU, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
  }
}
export function auraOff(v) { if (v.aura) v.aura.setVisible(false); }

function lineTex(scene, vertical) {
  return tex(scene, `ux-speed-${vertical ? 'v' : 'h'}`, vertical ? 5 : 20, vertical ? 20 : 5, (put, w, h) => {
    for (let i = 0; i < (vertical ? h : w); i++) { const a = 255 - Math.abs(i - (vertical ? h : w) / 2) * 8; if (vertical) { put(2, i, [255, 255, 255], a); if (i > 3 && i < h - 3) { put(1, i, [220, 235, 255], a * 0.6); put(3, i, [220, 235, 255], a * 0.6); } } else { put(i, 2, [255, 255, 255], a); if (i > 3 && i < w - 3) { put(i, 1, [220, 235, 255], a * 0.6); put(i, 3, [220, 235, 255], a * 0.6); } } }
  });
}
export function speedLines(scene, e, BU) {
  const vertical = Math.abs(e.dy) > Math.abs(e.dx);
  const key = lineTex(scene, vertical), dist = e.dist ?? 5;
  for (let i = 0; i < 9; i++) {
    const t = i / 8, px = e.x * BU + e.dx * t * dist * BU * 0.9 + (vertical ? (Math.random() - 0.5) * 1.1 * BU : 0), py = e.y * BU + e.dy * t * dist * BU * 0.9 + (vertical ? 0 : (Math.random() - 0.5) * 0.9 * BU) - 0.4 * BU;
    const s = scene.add.image(px, py, key).setScale(DOT).setDepth(FXD).setAlpha(0).setFlipX(e.dx < 0 && !vertical);
    scene.tweens.add({ targets: s, alpha: 0.95, duration: 90, delay: t * 260, yoyo: true, hold: 60, onComplete: () => s.destroy() });
  }
}

// ---------- 혀 올가미 · 번개 순간이동 ----------
function drawLoop(scene, ms, draw, depth = FXD) {
  const g = scene.add.graphics().setDepth(depth);
  scene.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (tw) => { g.clear(); draw(g, tw.getValue()); }, onComplete: () => g.destroy() });
}
const sq = (g, x, y, s, c, a = 1) => { const n = Math.max(1, Math.round(s / PX)) * PX; g.fillStyle(c, a).fillRect(Math.round((x - n / 2) / PX) * PX, Math.round((y - n / 2) / PX) * PX, n, n); }; // 이펙트 도트는 모두 PX 격자, 큰 덩이는 PX 여러 칸
const dotLine = (g, x0, y0, x1, y1, s, c, a = 1, step = 6) => { const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step)); for (let i = 0; i <= n; i++) sq(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, s, c, a); };
export function tongues(scene, e, BU) { // 개구리 혀가 뻗어 나가 붙잡고 끌고 옴
  const ox = e.x * BU, oy = e.y * BU - 0.5 * BU;
  drawLoop(scene, 520, (g, u) => {
    const out = u < 0.35 ? u / 0.35 : 1, back = u < 0.35 ? 0 : (u - 0.35) / 0.65;
    for (const t of e.ts) {
      const tx = t.x * BU, ty = t.y * BU - 0.5 * BU, ex = ox + (tx - ox) * out * (1 - back * 0.85), ey = oy + (ty - oy) * out * (1 - back * 0.85);
      dotLine(g, ox, oy, ex, ey, 8, 0x14122b, 1, 6); dotLine(g, ox, oy, ex, ey, 6, 0xff6f91, 1, 6); dotLine(g, ox, oy - 2, ex, ey - 2, 2, 0xffc2d4, 0.9, 6);
      sq(g, ex, ey, 14, 0x14122b); sq(g, ex, ey, 10, 0xff6f91);
    }
  });
  shockRing(scene, { x: e.x, y: e.y, r: e.r * 0.5 }, BU);
}
export function blink(scene, e, BU) { // 번개: 출발 → 도착 지그재그 + 번쩍
  const x0 = e.fx * BU, y0 = e.fy * BU - 0.5 * BU, x1 = e.tx * BU, y1 = e.ty * BU - 0.5 * BU, pts = [];
  for (let i = 0; i <= 8; i++) pts.push([x0 + ((x1 - x0) * i) / 8 + (i && i < 8 ? (Math.random() - 0.5) * 30 : 0), y0 + ((y1 - y0) * i) / 8 + (i && i < 8 ? (Math.random() - 0.5) * 30 : 0)]);
  drawLoop(scene, 320, (g, u) => {
    for (let i = 0; i < 8; i++) { dotLine(g, ...pts[i], ...pts[i + 1], 10, 0x14122b, 1 - u, 6); dotLine(g, ...pts[i], ...pts[i + 1], 6, 0xffe27a, 1 - u, 6); dotLine(g, ...pts[i], ...pts[i + 1], 2, 0xffffff, 1 - u, 6); }
    for (let i = 0; i < 6; i++) sq(g, x1 + Math.cos(i * 1.05 + u * 3) * 40 * u, y1 + Math.sin(i * 1.05 + u * 3) * 40 * u, 8 * (1 - u), 0xffe27a, 1 - u);
  });
}

// ---------- 파도 (투사체 art 'wave'): 맵을 쓸고 가는 도트 물결 ----------
export function waveTex(scene, BU) {
  const H = 2 * Math.round((1.8 * BU) / DOT), W = 16;
  return tex(scene, `ux-wave-${H}`, W, H, (put, w, h) => {
    const lit = new Uint8Array(w * h), mark = (x, y, c) => { put(x, y, c); lit[y * w + x] = 1; };
    for (let y = 0; y < h; y++) {
      const k = (y - h / 2) / (h / 2), front = Math.round(w - 3 - k * k * 7), back = Math.max(0, front - 11 + Math.round(k * k * 3)); // 가운데가 앞으로 볼록
      for (let x = back; x <= front; x++) {
        const f = (x - back) / Math.max(1, front - back), curl = x > front - 3 && bay(x, y) > 0.35;
        mark(x, y, curl ? [255, 255, 255] : f > 0.7 ? [150, 210, 255] : f > 0.4 ? [70, 150, 235] : [30, 90, 200]);
      }
      if (y % 6 === 2) for (let x = back + 1; x < Math.min(front - 2, back + 7); x += 2) put(x, y, [190, 225, 255]);
    }
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}

// ---------- 방패 성벽 ----------
function blockTex(scene) {
  return tex(scene, 'ux-wallblock', 12, 14, (put, w, h) => {
    const lit = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { lit[y * w + x] = 1; put(x, y, y < 4 ? [214, 220, 230] : y < 9 ? [160, 170, 188] : [112, 122, 142]); }
    for (let x = 1; x < w - 1; x++) put(x, 4, [96, 106, 126]);
    for (let y = 4; y < h - 1; y++) put(6, y, [96, 106, 126]);
    put(2, 6, [214, 220, 230]); put(8, 10, [214, 220, 230]);
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}
export class WallLayer {
  constructor(scene, bu) { this.s = scene; this.bu = bu; this.views = new Map(); }
  apply(walls) {
    const ids = new Set();
    for (const w of walls || []) {
      ids.add(w.id);
      let v = this.views.get(w.id);
      if (!v) v = this._make(w);
      v.w = w;
    }
    for (const v of [...this.views.values()]) if (!ids.has(v.id)) { v.parts.forEach((p) => p.destroy()); this.views.delete(v.id); }
  }
  _make(w) {
    const s = this.s, bu = this.bu, key = blockTex(s), horizLong = w.hy > w.hx; // 긴 쪽 방향으로 벽돌을 늘어놓음
    const len = (horizLong ? w.hy : w.hx) * 2 * bu, n = Math.max(2, Math.round(len / (12 * DOT))), parts = [], rows = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5, x = w.x * bu + (horizLong ? 0 : t * len), y = w.y * bu + (horizLong ? t * len : 0) + 7 * DOT;
      const sp = s.add.image(x, y - 30, key).setScale(DOT).setOrigin(0.5, 1).setDepth(FXD).setAlpha(0);
      s.tweens.add({ targets: sp, y, alpha: 1, duration: 220, delay: i * 40, ease: 'Back.easeOut' }); // 땅에서 솟아남
      parts.push(sp); rows.push(sp);
    }
    shockRing(s, { x: w.x, y: w.y, r: 1.6 }, bu);
    const v = { id: w.id, w, parts };
    this.views.set(w.id, v);
    return v;
  }
  update() {
    for (const v of this.views.values()) if (v.w.l < 0.5) v.parts.forEach((p) => p.setAlpha(Math.max(0, v.w.l / 0.5) * (Math.floor(performance.now() / 70) % 2 ? 1 : 0.5)));
  }
}

// ---------- 불타는 캐릭터 · 진흙 방울 ----------
export function burnTick(scene, v, now, BU) {
  if (now < (v.burnAt || 0)) return;
  v.burnAt = now + 110;
  [0, 1, 2, 3].forEach((f) => flameTex(scene, f));
  const f = scene.add.image(v.x + (Math.random() - 0.5) * 0.7 * BU, v.y - Math.random() * 0.9 * BU, `ux-flame-${Math.floor(Math.random() * 4)}`).setScale(DOT).setOrigin(0.5, 1).setDepth(FXD);
  scene.tweens.add({ targets: f, y: f.y - 0.5 * BU, alpha: 0, duration: 380, onComplete: () => f.destroy() });
}
export function mudBubbleTex(scene, f) {
  return tex(scene, `ux-mud-${f}`, 10, 10, (put, w, h) => {
    const r = 1.5 + f * 1.1, lit = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + 0.5 - 5) ** 2 + (y + 0.5 - 5) ** 2 <= r * r) { lit[y * w + x] = 1; put(x, y, f > 2 ? [150, 110, 70] : [110, 78, 48]); }
    if (f > 1) put(4, 4, [196, 158, 112]);
    ink(put, w, h, (x, y) => lit[y * w + x]);
  });
}

// ---------- 오크 평타: 먼지 파도 (시안 A) + 가운데 균열 ----------
export function orcDust(scene, e, v, BU, mine) {
  const ang = Math.atan2(e.dy, e.dx), R = (e.range || 4) * BU, half = ((e.arc ?? 28) * Math.PI) / 180, per = mine ? 2 : 1;
  for (let band = 0; band < 4; band++) for (let k = 0; k < per; k++) {
    const d = R * (0.2 + band * 0.25), lat = (Math.random() - 0.5) * 2 * d * Math.tan(half) * 0.8;
    const x = v.x + Math.cos(ang) * d - Math.sin(ang) * lat, y = v.y + Math.sin(ang) * d + Math.cos(ang) * lat;
    scene.time.delayedCall(band * 60 + k * 25, () => {
      const s = scene.add.sprite(x, y - 2, 'dust').setOrigin(0.5, 1).setScale(1.8 + band * 0.5).setDepth(FXD).setFlipX(e.dx < 0).setAlpha(0.92);
      s.play('dust'); s.once('animationcomplete', () => s.destroy());
      scene.tweens.add({ targets: s, y: y - 18, duration: 420 });
    });
  }
  const pts = []; for (let i = 0; i <= 18; i++) { const t = (i / 18) * R * 0.95 + 20, j = (Math.random() - 0.5) * 14 * Math.min(1, i / 6); pts.push([v.x + Math.cos(ang) * t - Math.sin(ang) * j, v.y + Math.sin(ang) * t + Math.cos(ang) * j - 4]); }
  drawLoop(scene, 900, (g, u) => { // 균열: 앞으로 달려 나가고 천천히 사라짐
    const upto = Math.floor(Math.min(1, u * 4) * 18), fade = u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1;
    for (let i = 1; i <= upto; i++) { dotLine(g, ...pts[i - 1], ...pts[i], 9, 0x14122b, fade); dotLine(g, ...pts[i - 1], ...pts[i], 6, 0x4a3524, fade); }
  }, -47);
}

// ---------- 대쉬 이펙트: 캐릭터마다 다르게 (잔상 + 시작/끝 먼지 + 고유 연출) ----------
const DASH = {
  girl_long: { tint: 0xff8fb0, cols: [0xff8fb0, 0xffffff] }, brawler: { tint: 0xffa43a, cols: [0xffa43a, 0xffffff] }, knight: { tint: 0xcfe3f5, cols: [0xcfe3f5, 0xffffff, 0x8e97a3] },
  hammerhead: { tint: 0x5aa7ff, cols: [0xcfe8ff, 0x5aa7ff, 0xffffff] }, shiba: { tint: 0xff9a3c, cols: [0xffd84a, 0xff7a1a] }, pig: { tint: 0xc9a070, cols: [0xc9a070, 0x8a6a42] },
};
export function dashFx(scene, e, v, BU) {
  const id = v.p.s, c = DASH[id] || { tint: 0xffffff, cols: [0xffffff] }, dist = (e.dist ?? 3) * BU, sp = v.sprite;
  const at = (t) => [v.x + e.dx * dist * t, v.y + e.dy * dist * t];
  for (let i = 0; i < 4; i++) { // 잔상: 지나간 자리에 색을 입힌 캐릭터가 남았다 사라짐
    scene.time.delayedCall(i * 55, () => {
      const [gx, gy] = at(i * 0.22);
      const gh = scene.add.image(gx, gy, sp.texture.key, sp.frame.name).setOrigin(sp.originX, sp.originY).setScale(sp.scaleX, sp.scaleY).setFlipX(sp.flipX).setTint(c.tint).setAlpha(0.55).setDepth(FXD);
      scene.tweens.add({ targets: gh, alpha: 0, duration: 260, onComplete: () => gh.destroy() });
    });
  }
  const puffAt = (x, y, s, tint) => { const p = scene.add.sprite(x, y - 2, 'dust').setOrigin(0.5, 1).setScale(s).setDepth(FXD).setAlpha(0.9); if (tint) p.setTint(tint); p.play('dust'); p.once('animationcomplete', () => p.destroy()); };
  puffAt(v.x, v.y, 1.3, id === 'pig' ? 0xa88860 : 0);
  const [ex, ey] = at(1); scene.time.delayedCall(260, () => puffAt(ex, ey, 1.6, id === 'pig' ? 0xa88860 : 0));
  const sparks = (n, size, up) => { for (let i = 0; i < n; i++) { const [px, py] = at(Math.random()), col = c.cols[i % c.cols.length]; const r = scene.add.rectangle(px + (Math.random() - 0.5) * 20, py - 6 - Math.random() * 20, size, size, col).setDepth(FXD); scene.tweens.add({ targets: r, y: r.y + (up ? -26 : 10 + Math.random() * 12), alpha: 0, duration: 300 + Math.random() * 200, delay: Math.random() * 200, onComplete: () => r.destroy() }); } };
  if (id === 'girl_long' || id === 'brawler') speedLines(scene, { x: v.x / BU, y: v.y / BU, dx: e.dx, dy: e.dy, dist: e.dist }, BU);
  if (id === 'brawler') { shockRing(scene, { x: v.x / BU, y: v.y / BU, r: 1.1 }, BU); sparks(8, 6, false); }
  if (id === 'knight') sparks(14, 4, false);                                       // 갑옷이 긁히며 튀는 불꽃
  if (id === 'hammerhead') { sparks(16, 6, true); shockRing(scene, { x: v.x / BU, y: v.y / BU, r: 1.2 }, BU, 'water'); } // 물방울 + 물보라 고리
  if (id === 'girl_long') sparks(8, 5, true);
  if (id === 'shiba') for (let i = 0; i < 6; i++) { // 꼬리 불꽃이 길게 남음
    [0, 1, 2, 3].forEach((f) => flameTex(scene, f)); const [fx, fy] = at(i / 6);
    scene.time.delayedCall(i * 40, () => { const f = scene.add.image(fx, fy - 8, `ux-flame-${i % 4}`).setScale(DOT).setOrigin(0.5, 1).setDepth(FXD); scene.tweens.add({ targets: f, y: f.y - 14, alpha: 0, duration: 380, onComplete: () => f.destroy() }); });
  }
  if (id === 'pig') for (let i = 0; i < 6; i++) { const [px, py] = at(i / 6); scene.time.delayedCall(i * 40, () => puffAt(px, py, 1.2 + Math.random() * 0.5, 0xa88860)); sparks(1, 7, true); }
}

// ---------- 채널링: 도는 칼날 · 불꽃 고리 ----------
export function spinFx(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU - 0.45 * BU, R = e.r * BU * 0.85;
  drawLoop(scene, 300, (g, u) => {
    for (let k = 0; k < 3; k++) { const a0 = u * 5 + (k * Math.PI * 2) / 3; for (let i = 0; i < 12; i++) { const a = a0 + i * 0.09, age = 1 - i / 12; sq(g, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.45, 8 * age + 3, 0xffffff, (1 - u) * age); } }
  });
  shockRing(scene, { x: e.x, y: e.y, r: e.r * 0.7 }, BU, 'water');
}
export function fireRing(scene, e, BU) {
  shockRing(scene, e, BU);
  [0, 1, 2, 3].forEach((f) => flameTex(scene, f));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, x = e.x * BU + Math.cos(a) * e.r * BU * 0.85, y = e.y * BU + Math.sin(a) * e.r * BU * 0.85;
    const f = scene.add.image(x, y, `ux-flame-${i % 4}`).setScale(DOT).setOrigin(0.5, 1).setDepth(FXD);
    scene.tweens.add({ targets: f, y: y - 18, alpha: 0, duration: 420, delay: i * 12, onComplete: () => f.destroy() });
  }
}

// ---------- 매혹: 하트가 머리 위로 떠오름 ----------
export function heartTick(scene, v, now, BU) {
  if (now < (v.heartAt || 0)) return;
  v.heartAt = now + 260;
  const h = scene.add.image(v.x + (Math.random() - 0.5) * 0.8 * BU, v.y - 1.6 * BU, 'item-heart').setScale(DOT).setDepth(FXD);
  scene.tweens.add({ targets: h, y: h.y - 0.9 * BU, alpha: 0, duration: 700, onComplete: () => h.destroy() });
}

// ---------- 별 궤도: 몸 주위를 도는 별 ----------
export function orbitTick(scene, v, now, BU) {
  const ob = v.p.ob;
  if (!ob) { v.orbit?.forEach((s) => s.destroy()); v.orbit = null; return; }
  if (!v.orbit || v.orbit.length !== ob.n) { v.orbit?.forEach((s) => s.destroy()); v.orbit = Array.from({ length: ob.n }, () => scene.add.image(0, 0, 'pj-star').setScale(DOT)); }
  if (ob.a !== v.obLast) { v.obLast = ob.a; v.obAt = now; }
  const a0 = ob.a + (ob.w * (now - v.obAt)) / 1000;
  v.orbit.forEach((s, i) => { const a = a0 + (i / ob.n) * Math.PI * 2, y = v.y + Math.sin(a) * ob.r * BU; s.setPosition(v.x + Math.cos(a) * ob.r * BU, y - 0.5 * BU).setRotation(now / 80).setDepth(FXD); });
}

// ---------- 저격: 조준선 → 굵은 빔 ----------
export function snipeAim(scene, e, BU) {
  const x0 = e.x * BU, y0 = e.y * BU - 0.5 * BU, x1 = x0 + e.dx * e.range * BU, y1 = y0 + e.dy * e.range * BU;
  drawLoop(scene, e.sec * 1000, (g, u) => {
    const a = 0.3 + 0.5 * Math.abs(Math.sin(u * 14)); dotLine(g, x0, y0, x1, y1, 4, 0xff3b30, a, 10);
    sq(g, x0 + e.dx * 26, y0 + e.dy * 26, 10 + u * 22, 0x5ad8ff, 0.9); sq(g, x0 + e.dx * 26, y0 + e.dy * 26, 6 + u * 14, 0xffffff, 0.9); // 총구에 모이는 빛
  }, -44);
}
export function beamFx(scene, e, BU) {
  const x0 = e.x * BU + e.dx * 26, y0 = e.y * BU - 0.5 * BU + e.dy * 26, x1 = e.x * BU + e.dx * e.range * BU, y1 = e.y * BU - 0.5 * BU + e.dy * e.range * BU, w = e.width * BU;
  drawLoop(scene, 380, (g, u) => {
    const k = 1 - u;
    dotLine(g, x0, y0, x1, y1, w * 0.7 * k + 8, 0x14122b, 1, 8); dotLine(g, x0, y0, x1, y1, w * 0.5 * k + 4, 0x5ad8ff, 1, 8); dotLine(g, x0, y0, x1, y1, w * 0.22 * k + 2, 0xffffff, 1, 8);
    for (let i = 0; i < 8; i++) { const t = (i + u) / 8; sq(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(i * 3 + u * 9) * 18 * k, 6, 0xffffff, k); }
  }, FXD);
  if (scene.focusId === e.id) scene.cameras.main.shake(120, 0.004);
}

// ---------- 혀 올가미: 개구리와 묶인 적을 잇는 혀 (매 프레임 다시 그림) ----------
export function tetherLines(scene, now) {
  const g = scene.tetherGfx || (scene.tetherGfx = scene.add.graphics().setDepth(FXD));
  g.clear();
  for (const v of scene.views.values()) {
    const f = v.p.tt ? scene.views.get(v.p.tt) : null;
    if (!f) continue;
    const x0 = f.x, y0 = f.y - 0.5 * 48, x1 = v.x, y1 = v.y - 0.5 * 48, n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 8));
    for (let i = 0; i <= n; i++) { // 도트 혀가 살짝 출렁임
      const t = i / n, w = Math.sin(t * 9 + now / 90) * 3 * Math.sin(t * Math.PI), px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t + w;
      g.fillStyle(0x14122b, 1).fillRect(Math.round((px - 4.5) / PX) * PX, Math.round((py - 4.5) / PX) * PX, 9, 9);
      g.fillStyle(0xff6f91, 1).fillRect(Math.round((px - 3) / PX) * PX, Math.round((py - 3) / PX) * PX, 6, 6);
    }
    g.fillStyle(0x14122b, 1).fillRect(x1 - 7.5, y1 - 7.5, 15, 15).fillStyle(0xff6f91, 1).fillRect(x1 - 4.5, y1 - 4.5, 9, 9); // 붙잡힌 쪽 끝
  }
}

// ---------- 피닉스: 자폭 불꽃 / 머리 위 카운트다운 / 폭발 범위 표시 ----------
const BLAST = [0xfff3b0, 0xffd54a, 0xff9a3c, 0xe0502a, 0x7a2a1a]; // 밝은 불씨 → 어두운 재
/** 폭발: 안쪽부터 번지는 디더링 불덩이 + 바깥으로 퍼지는 불꽃 덩이 고리 + 튀는 불똥 */
export function phoenixBlast(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU - 0.3 * BU, R = e.r * BU, parts = [];
  for (let i = 0; i < 46; i++) parts.push({ a: (i / 46) * 6.283 + Math.random() * 0.2, sp: 0.55 + Math.random() * 0.45, s: 10 + Math.random() * 14, ph: Math.random() * 0.2 }); // 불꽃 덩이
  for (let i = 0; i < 26; i++) parts.push({ a: Math.random() * 6.283, sp: 0.2 + Math.random() * 0.8, s: 4 + Math.random() * 4, ph: Math.random() * 0.3, ember: true }); // 불똥
  drawLoop(scene, 900, (g, u) => {
    const grow = easeOut(Math.min(1, u / 0.5)), fade = Math.max(0, 1 - Math.max(0, u - 0.45) / 0.55), core = R * 0.9 * grow;
    for (let gy = -core; gy <= core; gy += 8) for (let gx = -core; gx <= core; gx += 8) { // 불덩이 면
      const d = Math.hypot(gx, gy) / Math.max(1, core); if (d > 1) continue;
      if (bay(Math.round(gx / 8) + 20, Math.round(gy / 8) + 20) > (1 - d * 0.8) * fade + 0.05) continue;
      sq(g, x + gx, y + gy, 8, BLAST[Math.min(4, Math.floor(d * 3 + u * 2))], 0.95);
    }
    for (const p of parts) {
      const t = Math.max(0, Math.min(1, (u - p.ph) / (1 - p.ph))), r = R * p.sp * easeOut(t) * (p.ember ? 1.1 : 0.95);
      const px = x + Math.cos(p.a) * r, py = y + Math.sin(p.a) * r - (p.ember ? 36 * t * t : 0), sz = p.s * (1 - t * 0.6);
      sq(g, px, py, Math.max(4, sz), BLAST[Math.min(4, Math.floor(t * 4.5))], 1 - t * 0.7);
    }
  }, FXD);
}

/** 변신 중 표시: 발밑 폭발 범위(연한 면) + 같은 크기로 3초 동안 차오르는 붉은 면 + 머리 위 카운트다운. p.pr 반경(칸), p.pu 진행(0~1), p.ub 남은 초 */
const FILL_STEPS = 16;
export function phoenixTick(scene, v, p, BU, pixText) {
  const on = !!p.pr && !p.st;
  if (!on) { if (v.phx) { v.phx.base.setVisible(false); v.phx.fill.setVisible(false); v.phx.cd?.setVisible(false); } return; }
  const Rd = Math.max(6, Math.round((p.pr * BU) / DOT));
  if (!v.phx) v.phx = { base: scene.add.image(0, 0, rangeTex(scene, Rd)).setScale(DOT).setDepth(-43), fill: scene.add.image(0, 0, rangeTex(scene, Rd)).setScale(DOT).setDepth(-42), cd: null, n: '' };
  const f = v.phx, step = Math.max(1, Math.min(FILL_STEPS, Math.ceil(p.pu * FILL_STEPS)));
  f.base.setTexture(rangeTex(scene, Rd)).setTint(0xff6a4a).setAlpha(0.2).setPosition(v.x, v.y).setVisible(true);
  f.fill.setTexture(rangeTex(scene, Math.max(2, Math.round((Rd * step) / FILL_STEPS)))).setTint(0xe0301e).setAlpha(0.38).setPosition(v.x, v.y).setVisible(true);
  const n = String(Math.max(1, Math.ceil(p.ub)));
  if (f.n !== n) { f.n = n; f.cd?.destroy(); f.cd = pixText(scene, 0, 0, n, '#ffd54a', PX * 2).setDepth(7000); }
  f.cd.setPosition(v.x, v.y - 2.8 * BU).setVisible(true);
}

// ---------- 블랙홀: 던지는 검은 공 → 소용돌이(끌어당김) → 붕괴 폭발 ----------
const VOID = [0x0e0620, 0x2a1250, 0x5a2a9a, 0x9a5ae0, 0xd8b0ff]; // 어두운 → 밝은 보라
function orbTex(scene) {
  return tex(scene, 'ux-bh-orb', 22, 22, (put, w, h) => {
    const get = (x, y) => (x + 0.5 - 11) ** 2 + (y + 0.5 - 11) ** 2 <= 8.6 ** 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (get(x, y)) { const d = Math.hypot(x + 0.5 - 11, y + 0.5 - 11) / 8.6; put(x, y, d > 0.8 ? [154, 90, 224] : d > 0.55 ? [90, 42, 154] : [14, 6, 32]); }
    put(7, 6, [216, 176, 255]); put(8, 6, [216, 176, 255]); put(7, 7, [216, 176, 255]);
    ink(put, w, h, get);
  });
}
function bottleTex(scene) { // 화염병: 갈색 유리병 + 주황 불꽃 심지
  return tex(scene, 'ux-bottle', 14, 24, (put, w, h) => {
    const glass = (x, y) => (y >= 8 && y < 22 && ((x + 0.5 - 7) / 5) ** 2 + ((y + 0.5 - 15) / 7) ** 2 <= 1) || (y >= 3 && y < 9 && x >= 5 && x < 9);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (glass(x, y)) put(x, y, y > 14 && y < 21 ? [226, 120, 40] : x < 6 ? [150, 100, 60] : [110, 70, 40]);
    put(5, 11, [255, 230, 170]); put(5, 12, [255, 230, 170]); put(6, 3, [236, 220, 190]);
    ink(put, w, h, glass);
    for (const [x, y, c] of [[7, 0, [255, 226, 122]], [6, 1, [255, 154, 60]], [7, 1, [255, 226, 122]], [8, 1, [255, 154, 60]], [7, 2, [224, 80, 42]]]) put(x, y, c);
  });
}
function arrowThrowTex(scene) { // 엘프의 화살: 가로 화살 (진행 방향으로 돌려서 쓴다)
  return tex(scene, 'ux-athrow', 20, 7, (put) => {
    for (let x = 2; x < 17; x++) put(x, 3, [180, 130, 70]);
    for (const [x, y] of [[17, 3], [16, 2], [16, 4], [15, 1], [15, 5], [18, 3]]) put(x, y, [220, 230, 240]);
    for (const [x, y] of [[0, 1], [1, 2], [0, 5], [1, 4]]) put(x, y, [120, 200, 120]);
    for (const [x, y] of [[0, 2], [0, 4], [1, 1], [1, 5]]) put(x, y, [90, 170, 100]);
  });
}
export function bhThrow(scene, e, BU) {
  const sp = scene.add.image(e.x0 * BU, e.y0 * BU - 0.6 * BU, e.art === 'bottle' ? bottleTex(scene) : e.art === 'arrow' ? arrowThrowTex(scene) : orbTex(scene)).setScale(DOT).setDepth(FXD);
  const toX = e.x * BU - e.x0 * BU;
  scene.tweens.addCounter({ from: 0, to: 1, duration: e.sec * 1000, onUpdate: (tw) => { const u = tw.getValue(); sp.setPosition(lerp2(e.x0 * BU, e.x * BU, u), lerp2(e.y0 * BU - 0.6 * BU, e.y * BU, u) - Math.sin(Math.PI * u) * 2.2 * BU); if (e.art === 'arrow') sp.setAngle(Math.atan2(-2.2 * BU * Math.PI * Math.cos(Math.PI * u) + (e.y - e.y0) * BU, toX) * 57.3); else sp.setAngle(u * 360); }, onComplete: () => sp.destroy() });
}
const lerp2 = (a, b, t) => a + (b - a) * t;
export function bhHole(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, R = e.r * BU, Rd = Math.max(6, Math.round(R / DOT));
  const base = scene.add.image(x, y, rangeTex(scene, Rd)).setScale(DOT).setDepth(-43).setTint(0x6a3aa0).setAlpha(0.16);
  const bits = Array.from({ length: 30 }, () => ({ a: Math.random() * 6.283, r: Math.random(), s: 4 + Math.random() * 4 })); // 빨려 드는 조각
  drawLoop(scene, e.sec * 1000, (g, u) => {
    const t = u * e.sec, grow = Math.min(1, u / 0.12);
    for (let arm = 0; arm < 3; arm++) for (let k = 1; k <= 16; k++) { // 나선 팔
      const f = k / 16, a = arm * 2.094 + t * 5 - f * 3.4, r = R * f * grow;
      sq(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.82, 6 + (1 - f) * 8, VOID[Math.min(3, Math.floor((1 - f) * 3.2))], 0.35 + 0.5 * (1 - f));
    }
    for (const b of bits) { const f = ((b.r - t * 0.7) % 1 + 1) % 1, r = R * f * grow; sq(g, x + Math.cos(b.a + t * 4 * (1 - f)) * r, y + Math.sin(b.a + t * 4 * (1 - f)) * r * 0.82, b.s, VOID[4 - Math.min(2, Math.floor(f * 3))], 0.9 * grow); }
    const core = (0.55 + 0.25 * grow + 0.1 * Math.sin(t * 22)) * BU; // 검은 중심
    for (let gy = -core; gy <= core; gy += 6) for (let gx = -core; gx <= core; gx += 6) { const d = Math.hypot(gx, gy) / core; if (d <= 1) sq(g, x + gx, y + gy * 0.82, 6, d > 0.8 ? VOID[2] : VOID[0], 1); }
  }, FXD);
  scene.time.delayedCall(e.sec * 1000, () => base.destroy());
}
export function bhBlast(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, R = e.r * BU, parts = Array.from({ length: 40 }, () => ({ a: Math.random() * 6.283, sp: 0.4 + Math.random() * 0.6, s: 6 + Math.random() * 10 }));
  drawLoop(scene, 700, (g, u) => {
    if (u < 0.2) { const k = 1 - u / 0.2; for (let gy = -1; gy <= 1; gy += 0.5) for (let gx = -1; gx <= 1; gx += 0.5) if (Math.hypot(gx, gy) <= 1) sq(g, x + gx * R * 0.6 * k, y + gy * R * 0.6 * k * 0.82, 8, VOID[Math.hypot(gx, gy) < 0.5 ? 0 : 2], 1); return; } // 붕괴
    const t = (u - 0.2) / 0.8, e3 = easeOut(t);
    for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.283, r = R * e3; sq(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.82, 14 * (1 - t) + 4, VOID[Math.min(4, 4 - Math.floor(t * 4))], 1 - t); } // 퍼지는 고리
    for (const p of parts) { const r = R * p.sp * e3 * 1.1; sq(g, x + Math.cos(p.a) * r, y + Math.sin(p.a) * r * 0.82, p.s * (1 - t * 0.7), VOID[Math.min(4, 4 - Math.floor(t * 4))], 1 - t * 0.8); }
  }, FXD);
}

// ---------- 무대 펼치기: 체크무늬 무대 + 도는 조명 + 반짝임 ----------
function stageTex(scene, Rd) {
  return tex(scene, `ux-stage-${Rd}`, 2 * Rd + 2, 2 * Rd + 2, (put, w) => {
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - w / 2) / Rd; if (d > 1) continue;
      put(x, y, d > 0.9 ? [255, 190, 190] : ((x >> 2) + (y >> 2)) % 2 ? [90, 14, 34] : [158, 30, 56], d > 0.9 ? 235 : 170);
    }
  });
}
export function stageFx(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, R = e.r * BU, Rd = Math.max(6, Math.round(R / DOT)), floor = scene.add.image(x, y, stageTex(scene, Rd)).setScale(DOT).setDepth(-43);
  scene.tweens.add({ targets: floor, alpha: 0, delay: e.sec * 1000 - 400, duration: 400, onComplete: () => floor.destroy() });
  // 무대 장비(받은 도트): 뒤쪽에 무대 배경이 솟아오르고, 양옆 앰프와 위쪽 조명이 움직임 (도트 크기 = PX)
  const back = scene.add.image(x, y - R * 0.78, 'diva-stage').setOrigin(0.5, 1).setScale(DOT, 0).setDepth(FXD - 1);
  scene.tweens.add({ targets: back, scaleY: DOT, duration: 350, ease: 'Back.easeOut' });
  const parts = [back, floor];
  for (const sx of [-1, 1]) {
    const amp = scene.add.sprite(x + sx * R * 0.88, y - R * 0.2, 'diva-amp').setOrigin(0.5, 1).setScale(DOT * sx, DOT).setDepth(FXD - 1).play('diva-amp'); parts.push(amp);
    const spot = scene.add.sprite(x + sx * R * 0.5, y - R * 1.05, 'diva-spot').setOrigin(0.5, 0).setScale(DOT, DOT).setDepth(FXD + 1).setAlpha(0.9).play('diva-spot'); parts.push(spot);
  }
  scene.tweens.add({ targets: parts.filter((o) => o !== floor), alpha: 0, delay: e.sec * 1000 - 400, duration: 400, onComplete: () => parts.forEach((o) => o.destroy()) });
  const BEAM = [0xff7ad9, 0x7ad9ff, 0xffe27a];
  drawLoop(scene, e.sec * 1000, (g, u) => {
    const t = u * e.sec, fade = Math.min(1, (1 - u) * e.sec / 0.4), open = Math.min(1, u * e.sec / 0.25);
    for (let k = 0; k < 3; k++) { // 도는 조명
      const a = t * 2.2 + k * 2.094;
      for (let r = 12; r < R * open; r += 9) sq(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.82, 6 + r / 40, BEAM[k], 0.55 * fade);
    }
    for (let i = 0; i < 16; i++) { // 반짝임·떠오르는 음표 점
      const ph = (i * 0.37 + t * 0.9) % 1, a = i * 2.4 + 0.5, r = R * (0.25 + 0.7 * ((i * 53) % 10) / 10);
      sq(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.82 - ph * 50, 6, BEAM[i % 3], (1 - ph) * fade);
    }
  }, FXD);
}

// ---------- Aura Pulse: 민트 오라가 46px → 반경까지 순식간에 부풀고, 맞은 적은 깜빡이다 팡 ----------
const MINT = [0xd6fff0, 0x9ff5d0, 0x5fdcb0, 0x2fa98a];
export function auraPulse(scene, e, BU, tint) {
  const x = e.x * BU, y = e.y * BU, R1 = Math.max(e.r || 0, 2.25) * BU, R0 = 46, pal = tint || MINT;
  drawLoop(scene, 420, (g, u) => {
    const grow = easeOut(Math.min(1, u / 0.12)), R = R0 + (R1 - R0) * grow, fade = Math.max(0, 1 - Math.max(0, u - 0.25) / 0.75);
    for (let gy = -R; gy <= R; gy += 6) for (let gx = -R; gx <= R; gx += 6) {
      const d = Math.hypot(gx, gy * 1.2) / R; if (d > 1) continue;
      if (bay(Math.round(gx / 6) + 20, Math.round(gy / 6) + 20) > (d > 0.85 ? 0.9 : 0.35 * (1 - d) + 0.1) * fade * 1.6) continue;
      sq(g, x + gx, y + gy * 0.82, 6, pal[Math.min(3, Math.floor(d * 4))], 0.85 * fade);
    }
  }, FXD);
  for (const v of scene.views.values()) { // 범위 안 다른 캐릭터: 깜빡임 → 팡
    if (v.p.id === e.id || Math.hypot(v.x - x, v.y - y) > R1) continue;
    const now = performance.now(); v.blinkUntil = now + 320; v.popAt = now + 320;
  }
}

// ---------- Ground Slam: 30px 뛰었다 내려찍고, 8갈래 균열이 뻗고, 화면이 4px 흔들림 ----------
export function groundSlam(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, R = e.r * BU, seeds = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * 6.283 + (Math.random() - 0.5) * 0.3, j: Math.random() * 100 }));
  drawLoop(scene, 1100, (g, u) => {
    const grow = easeOut(Math.min(1, u / 0.2)), fade = Math.min(1, (1 - u) / 0.35);
    for (const s of seeds) {
      let px = x, py = y;
      for (let k = 1; k <= 12; k++) {
        const f = k / 12; if (f > grow) break;
        const wob = Math.sin(s.j + k * 2.3) * 9, nx = x + Math.cos(s.a) * R * 0.95 * f + -Math.sin(s.a) * wob, ny = y + (Math.sin(s.a) * R * 0.95 * f + Math.cos(s.a) * wob) * 0.82;
        dotLine(g, px, py, nx, ny, 9, 0x2a1a12, fade, 6); dotLine(g, px, py, nx, ny, 3, 0xb08a60, fade, 6); px = nx; py = ny;
      }
    }
  }, -46);
  if (scene.focusId) scene.cameras.main.shake(160, 0.005);
}
