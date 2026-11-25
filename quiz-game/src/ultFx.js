// 궁극기·폭발 도트 이펙트. 이미지 파일 없이 코드로 도트를 찍어 Phaser 텍스처로 만든다 (도트 1개 = 화면 3px, 4x4 디더링).
import Phaser from 'phaser';

export const DOT = 3;
const NAVY = [20, 18, 43];
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bay = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;
const PAL = { // 어두운 색 → 밝은 색
  fire: [0x7a2a1a, 0xe0502a, 0xff9a3c, 0xffe27a, 0xffffff].map(rgb),
  orb: [0x3a2370, 0x6a3fb0, 0xb072ff, 0xe3c9ff, 0xffffff].map(rgb),
  egg: [0x7a4a10, 0xc27a10, 0xf2a31b, 0xffd54a, 0xfff7c2].map(rgb),
  quake: [0x4a3524, 0x7a5a3c, 0xa8845a, 0xd9c08f, 0xf3ecd6].map(rgb),
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
  const sp = scene.add.image(x, y, `ux-${kind}-${Rd}-0`).setScale(DOT).setDepth(5400);
  let f = 0;
  const timer = scene.time.addEvent({ delay: 62, repeat: EXP_N - 1, callback: () => { sp.setTexture(`ux-${kind}-${Rd}-${f}`); f++; if (f >= EXP_N) { timer.remove(); scene.tweens.add({ targets: sp, alpha: 0, duration: 120, onComplete: () => sp.destroy() }); } } });
  // 불똥: 작은 네모가 튀어 오름
  const pal = palOf(kind);
  for (let i = 0; i < 14; i++) {
    const ang = Math.random() * 6.283, d = R * BU * (0.5 + Math.random() * 0.8), col = pal[2 + (i % 3)];
    const e = scene.add.rectangle(x, y, DOT * 2, DOT * 2, Phaser.Display.Color.GetColor(col[0], col[1], col[2])).setDepth(5402);
    scene.tweens.add({ targets: e, x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d * 0.7 - 24, alpha: 0, duration: 420 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => e.destroy() });
  }
  // 그을음 자국 (디더링 원)
  const sk = tex(scene, `ux-scorch-${Rd}`, 2 * Rd, 2 * Rd, (put) => { for (let yy = 0; yy < 2 * Rd; yy++) for (let xx = 0; xx < 2 * Rd; xx++) { const d = Math.hypot(xx + 0.5 - Rd, yy + 0.5 - Rd) / Rd; if (d < 0.85 && bay(xx, yy) > d * 0.9) put(xx, yy, [27, 20, 16], 110); } });
  const sc = scene.add.image(x, y, sk).setScale(DOT).setDepth(-46);
  scene.tweens.add({ targets: sc, alpha: 0, delay: 700, duration: 1200, onComplete: () => sc.destroy() });
}

// ---------- 예고(디더링 원이 차오름) ----------
const WARN_LV = [0.3, 0.55, 0.8, 1];
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
  const sp = scene.add.image(x - (egg ? 0 : 5 * BU), y - 8 * BU, `ux-met-${art}-0`).setScale(DOT).setDepth(6000);
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
function ringAnim(scene, x, y, R, kind, BU, depth = 4996) {
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
  ringAnim(scene, x, y, e.r * 0.65, 'quake', BU, 4997);
  for (let i = 0; i < 12; i++) { // 땅에서 튀어 오르는 돌
    const ang = Math.random() * 6.283, d = e.r * BU * (0.15 + Math.random() * 0.8), px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * 0.8;
    const r = scene.add.image(px, py, debrisTex(scene, i % 2)).setScale(DOT).setDepth(py + 2000);
    scene.tweens.add({ targets: r, y: py - 26 - Math.random() * 40, duration: 260 + Math.random() * 120, ease: 'Quad.easeOut', yoyo: true, onComplete: () => scene.tweens.add({ targets: r, alpha: 0, duration: 220, onComplete: () => r.destroy() }) });
  }
  if (scene.focusId) scene.cameras.main.shake(260, 0.006);
}
export function shockRing(scene, e, BU) { ringAnim(scene, e.x * BU, e.y * BU, e.r, 'fire', BU); ringAnim(scene, e.x * BU, e.y * BU, e.r * 0.6, 'quake', BU, 4997); }

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
  const fire = kind === 'fire', c1 = fire ? [255, 106, 26] : [90, 167, 255];
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
    const s = this.s, bu = this.bu, fire = z.k === 'fire', Rd = Math.max(8, Math.round((z.r * bu) / DOT));
    [0, 1, 2, 3].forEach((f) => { flameTex(s, f); rainTex(s, f); });
    const base = s.add.image(z.x * bu, z.y * bu, baseTex(s, z.k, Rd)).setScale(DOT).setDepth(-44);
    const parts = [base], n = Math.round(z.r * z.r * 2.2), items = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * z.r * bu * 0.92;
      const x = z.x * bu + Math.cos(a) * r, y = z.y * bu + Math.sin(a) * r * 0.9;
      const sp = s.add.image(x, y, fire ? 'ux-flame-0' : 'ux-rain-0').setScale(DOT * (fire ? 0.9 : 1)).setOrigin(0.5, 1).setDepth(y);
      items.push({ sp, x, y, ph: Math.random() }); parts.push(sp);
    }
    const v = { id: z.id, z, base, items, parts, fire };
    this.views.set(z.id, v);
    return v;
  }
  update(now) {
    for (const v of this.views.values()) {
      const fade = Math.min(1, v.z.l / 0.5);
      v.base.setAlpha(fade * (0.8 + 0.2 * Math.sin(now / 160)));
      for (const it of v.items) {
        if (v.fire) it.sp.setTexture(`ux-flame-${Math.floor(now / 110 + it.ph * 4) % 4}`).setPosition(it.x, it.y).setAlpha(fade);
        else { // 화살이 위에서 떨어져 꽂히면 사라짐
          const u = (now / 520 + it.ph) % 1;
          it.sp.setTexture(`ux-rain-${Math.floor(now / 120) % 4}`).setPosition(it.x, it.y - (1 - u) * 150).setAlpha(Math.min(1, u * 5) * (u > 0.9 ? 0.3 : 1) * fade);
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
    const s = scene.add.image(v.x + (Math.random() - 0.5) * 0.9 * BU, v.y - Math.random() * 0.5 * BU, sparkTex(scene)).setScale(DOT * 0.9).setDepth(v.y + 3);
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
    const s = scene.add.image(px, py, key).setScale(DOT).setDepth(py + 1).setAlpha(0).setFlipX(e.dx < 0 && !vertical);
    scene.tweens.add({ targets: s, alpha: 0.95, duration: 90, delay: t * 260, yoyo: true, hold: 60, onComplete: () => s.destroy() });
  }
}
