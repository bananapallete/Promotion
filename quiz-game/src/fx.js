// 공격·피격 이펙트: 도트(네모)로 그려서 캐릭터와 같은 느낌. 근접은 항상 '실제 맞는 범위'(부채꼴)를 먼저 보여 준다.
import { FXD, PX } from './pixel.js';
const D = PX; // 도트 크기 (화면 px) — 모든 이펙트가 같은 크기, 큰 덩이는 이 도트를 여러 칸 모아서
const snap = (v) => Math.round(v / PX) * PX;
const dot = (g, x, y, s, c, a = 1) => { const n = Math.max(1, Math.round(s / PX)) * PX; g.fillStyle(c, a).fillRect(snap(x - n / 2), snap(y - n / 2), n, n); };
const GLYPH = { 0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111', 3: '11110 00001 00001 01110 00001 00001 11110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110', 6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100', '-': '00000 00000 00000 11111 00000 00000 00000', '!': '00100 00100 00100 00100 00100 00000 00100' };
/** 데미지 숫자: 도트 글리프. 일반·크리 같은 크기, 색만 다름 */
export function dmgText(scene, x, y, str, crit) { return pixText(scene, x, y, str, crit ? '#ffb020' : '#ff5a4d'); }
export function pixText(scene, x, y, str, col, d = 4) {
  if ([...str].some((ch) => !GLYPH[ch])) { // '…' 등 글리프 없는 글자
    return scene.add.text(x, y, str, { fontFamily: 'sans-serif', fontSize: '34px', fontStyle: '900', color: col, stroke: '#14122b', strokeThickness: 9 }).setOrigin(0.5).setDepth(6000).setResolution(2);
  }
  const key = `dmg:${str}:${col}:${d}`;
  if (!scene.textures.exists(key)) {
    const cells = [], w = str.length * 6 * d - d + 2 * d, h = 7 * d + 2 * d, cv = scene.textures.createCanvas(key, w, h), cx = cv.getContext();
    [...str].forEach((ch, i) => GLYPH[ch].split(' ').forEach((r, yy) => [...r].forEach((v, xx) => v === '1' && cells.push([d + i * 6 * d + xx * d, d + yy * d]))));
    cx.fillStyle = '#14122b'; cells.forEach(([a, b]) => { for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) cx.fillRect(a + dx * d, b + dy * d, d, d); });
    cx.fillStyle = col; cells.forEach(([a, b]) => cx.fillRect(a, b, d, d)); cv.refresh();
  }
  const im = scene.add.image(x, y, key).setDepth(6000); scene.textures.get(key).setFilter(1);
  return im;
}
const lerp = (a, b, t) => a + (b - a) * t;

/** 0→1로 흐르는 시간 동안 draw(g, u)를 매 프레임 다시 그린다 */
function play(scene, ms, draw, depth = FXD) {
  const g = scene.add.graphics().setDepth(depth);
  scene.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (tw) => { g.clear(); draw(g, tw.getValue()); }, onComplete: () => g.destroy() });
}
const lineDots = (g, x0, y0, x1, y1, size, c, a = 1, step = 6) => {
  const n = Math.max(1, Math.floor(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) dot(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), size, c, a);
};
const arcDots = (g, cx, cy, r, a0, a1, size, c, a = 1) => {
  const n = Math.max(3, Math.floor(Math.abs(a1 - a0) * r / 6));
  for (let i = 0; i <= n; i++) { const t = lerp(a0, a1, i / n); dot(g, cx + Math.cos(t) * r, cy + Math.sin(t) * r, size, c, a); }
};
/** 맞는 범위 부채꼴(바닥): 테두리 없이 면만. k = 불투명도(0~1) */
function footprint(g, cx, cy, R, ang, half, c, k, lw = 0) {
  if (lw) { // 직선: 앞으로 R, 폭 lw
    const nx = -Math.sin(ang) * lw / 2, ny = Math.cos(ang) * lw / 2, ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R, pts = [{ x: cx + nx, y: cy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: cx - nx, y: cy - ny }];
    g.fillStyle(c, 0.5 * k).fillPoints(pts, true); g.fillStyle(0xffffff, 0.16 * k).fillPoints(pts, true);
    return;
  }
  g.fillStyle(c, 0.5 * k).slice(cx, cy, R, ang - half, ang + half, false).fillPath();
  g.fillStyle(0xffffff, 0.16 * k).slice(cx, cy, R, ang - half, ang + half, false).fillPath();
}
const burst = (g, x, y, r, n, size, c, u, rot = 0) => { // 사방으로 튀는 점
  for (let i = 0; i < n; i++) { const t = rot + (i / n) * Math.PI * 2; dot(g, x + Math.cos(t) * r * u, y + Math.sin(t) * r * u, size * (1 - 0.5 * u), c, 1 - u * 0.6); }
};
const star = (g, x, y, r, c) => { // 네 갈래 반짝임
  for (let i = 1; i <= r; i += 4) { dot(g, x + i, y, 4, c); dot(g, x - i, y, 4, c); dot(g, x, y + i, 4, c); dot(g, x, y - i, 4, c); }
  dot(g, x, y, 6, 0xffffff);
};

// 이펙트 이름 → 색
export const FX_COLOR = {
  punch: 0xffffff, flurry: 0xff8fb0, shock: 0xffa43a, thrust: 0xcfe3f5, smash: 0x8fd16a, bite: 0xffffff, claw: 0xff9a3c, paw: 0xf6e7b4,
  crescent: 0xff8a2a, stomp: 0xc9b79a, bump: 0xff8fb8, sweep: 0x5aa7ff, tongue: 0xff6f91,
  stone: 0xb8bcc8, arrow: 0xc89b62, orb: 0xb072ff, spark: 0xffe066, star: 0xff7ab8, bottle: 0xff7a3c, egg: 0xffd54a, note: 0xff7ad9,
};

/** 근접 공격: e = { dx, dy, arc(도, 반각), range(칸), fx, step } */
export function meleeFx(scene, e, v, BU) {
  const c = FX_COLOR[e.fx] ?? 0xffffff, big = (e.step || 0) === 2;
  const cx = v.x, cy = v.y - 0.1 * BU, R = (e.range || 1.2) * BU, ang = Math.atan2(e.dy, e.dx), half = (e.arc ?? 60) * Math.PI / 180, lw = e.lineW ? e.lineW * BU : 0;
  const px = cx + Math.cos(ang) * R * 0.8, py = cy - 0.45 * BU + Math.sin(ang) * R * 0.8; // 타격 지점 (가슴 높이)
  const T = { thrust: 220, smash: 380, stomp: 420, bite: 240, claw: 260, paw: 320, crescent: 260, shock: big ? 380 : 260, bump: 240, sweep: 300, flurry: big ? 340 : 240 }[e.fx] ?? (big ? 320 : 220);
  const LINGER = 150; // 공격이 끝난 뒤에도 범위 잔상이 남는 시간 (ms)
  play(scene, T + LINGER, (g, u) => { const t = u * (T + LINGER); footprint(g, cx, cy, R, ang, half, c, t < T ? 1 : 0.6 - 0.25 * ((t - T) / LINGER), lw); }, FXD); // 맞는 범위: 공격 내내 + 끝난 뒤 0.15초
  const slash = (g, u, w, a0, a1, col = c) => arcDots(g, cx, cy - 0.45 * BU, R * (0.55 + 0.4 * u), lerp(a0, a1, u) - 0.5, lerp(a0, a1, u) + 0.5, w, col, 1 - u * 0.7);
  switch (e.fx) {
    case 'thrust': // 일직선 찌르기
      play(scene, 220, (g, u) => {
        lineDots(g, cx, cy - 0.45 * BU, cx + Math.cos(ang) * R * Math.min(1, u * 3), cy - 0.45 * BU + Math.sin(ang) * R * Math.min(1, u * 3), 6, 0xffffff, 1 - u * 0.5);
        if (u > 0.25) star(g, cx + Math.cos(ang) * R, cy - 0.45 * BU + Math.sin(ang) * R, 10 * (1 - u) + 4, c);
      });
      break;
    case 'smash': break; // 땅 내려찍기: 맞는 범위 면만 (먼지 파도·균열은 ultFx.orcDust)
    case 'stomp': // 주변 전체 쿵: 충격 고리
      play(scene, 420, (g, u) => {
        arcDots(g, cx, cy, R * (0.4 + 0.6 * u), 0, Math.PI * 2, 6, 0xffffff, 1 - u);
        arcDots(g, cx, cy, R * (0.3 + 0.55 * u), 0, Math.PI * 2, 4, c, 1 - u);
        burst(g, cx, cy, R * 0.9, 12, 8, 0xe8dcc0, u);
      });
      break;
    case 'bite': // 이빨 두 줄이 닫힘
      play(scene, 240, (g, u) => {
        const o = (1 - Math.min(1, u * 2)) * 0.45 * BU, nx = -Math.sin(ang), ny = Math.cos(ang);
        for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) {
          const t = (i - 1.5) * 0.18 * BU, bx = px + Math.cos(ang) * t + nx * (o + 0.12 * BU) * sgn, by = py + Math.sin(ang) * t + ny * (o + 0.12 * BU) * sgn;
          dot(g, bx, by, 6, 0xffffff, 1 - u * 0.4); dot(g, bx - nx * 4 * sgn, by - ny * 4 * sgn, 4, 0xdfe6ee, 1 - u * 0.4);
        }
      });
      break;
    case 'claw': // 세 줄 할퀴기
      play(scene, 260, (g, u) => {
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        for (let i = -1; i <= 1; i++) {
          const o = i * 0.22 * BU, ax = px + nx * o - Math.cos(ang) * 0.3 * BU + nx * -0.25 * BU, ay = py + ny * o - Math.sin(ang) * 0.3 * BU + ny * -0.25 * BU;
          const t = Math.min(1, u * 2.4);
          lineDots(g, ax, ay, lerp(ax, ax + nx * 0.7 * BU + Math.cos(ang) * 0.35 * BU, t), lerp(ay, ay + ny * 0.7 * BU + Math.sin(ang) * 0.35 * BU, t), 6, i === 0 ? 0xffffff : c, 1 - u * 0.6, 5);
        }
      });
      break;
    case 'paw': // 발바닥 도장
      play(scene, 320, (g, u) => {
        const s = 1 + 0.25 * Math.sin(u * Math.PI), a = 1 - Math.max(0, u - 0.6) / 0.4;
        dot(g, px, py + 5, 18 * s, 0xf6e7b4, a); dot(g, px, py + 5, 10 * s, 0xe9c88a, a);
        for (const [ox, oy] of [[-13, -9], [-5, -16], [5, -16], [13, -9]]) dot(g, px + ox * s, py + oy * s, 8 * s, 0xf6e7b4, a);
      });
      break;
    case 'crescent': // 주황 반달 휘두르기
      play(scene, 260, (g, u) => {
        slash(g, u, 10, ang - half, ang + half);
        slash(g, u, 5, ang - half, ang + half, 0xffffff);
        if (u > 0.3) burst(g, px, py, R * 0.4, 6, 6, 0xffd9a0, u);
      });
      break;
    case 'shock': // 주먹 충격파
      play(scene, big ? 380 : 260, (g, u) => {
        arcDots(g, px, py, R * (big ? 0.7 : 0.4) * (0.3 + u), 0, Math.PI * 2, 6, 0xffffff, 1 - u);
        arcDots(g, px, py, R * (big ? 0.55 : 0.3) * (0.3 + u), 0, Math.PI * 2, 4, c, 1 - u);
        if (u < 0.6) star(g, px, py, big ? 16 : 10, c);
      });
      break;
    case 'bump': // 박치기: 방사 선
      play(scene, 240, (g, u) => {
        for (let i = 0; i < 9; i++) { const t = ang + (i - 4) * 0.28; lineDots(g, px + Math.cos(t) * 0.25 * BU, py + Math.sin(t) * 0.25 * BU, px + Math.cos(t) * (0.35 + 0.5 * u) * BU, py + Math.sin(t) * (0.35 + 0.5 * u) * BU, 4, i % 2 ? 0xffffff : c, 1 - u, 6); }
      });
      break;
    case 'sweep': // 물보라 휘두르기
      play(scene, 300, (g, u) => {
        slash(g, u, 12, ang - half, ang + half, 0x2f7de0);
        slash(g, u, 6, ang - half, ang + half, 0xcfe8ff);
        burst(g, cx + Math.cos(ang) * R * 0.8, cy + Math.sin(ang) * R * 0.8 - 0.4 * BU, R * 0.45, 8, 6, 0xcfe8ff, u);
      });
      break;
    case 'flurry': // 연타 선 / 3타는 회전 베기
      play(scene, big ? 340 : 240, (g, u) => {
        if (big) { arcDots(g, cx, cy - 0.45 * BU, R * 0.85, ang + u * 6.3, ang + u * 6.3 + 2.6, 8, 0xffffff, 1 - u * 0.6); arcDots(g, cx, cy - 0.45 * BU, R * 0.85, ang + u * 6.3 + Math.PI, ang + u * 6.3 + Math.PI + 2.6, 6, c, 1 - u * 0.6); }
        else for (let i = 0; i < 3; i++) lineDots(g, px - 14 + i * 10, py - 18, px + 6 + i * 10, py + 14, 4, i === 1 ? 0xffffff : c, 1 - u * 0.6, 5);
      });
      break;
    default: // punch 및 기본: 타격 지점 반짝임
      play(scene, big ? 320 : 220, (g, u) => {
        slash(g, u, big ? 10 : 6, ang - half, ang + half, 0xffffff);
        if (u < 0.7) star(g, px, py, big ? 18 : 10, 0xffe27a);
      });
  }
}

/** 궁극기 이름 띄우기 */
export function ultBanner(scene, v, name, BU) {
  const t = scene.add.text(v.x, v.y - 3.1 * BU, name, { fontFamily: 'sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffe27a', stroke: '#14122b', strokeThickness: 8 }).setOrigin(0.5).setDepth(8000).setScale(0.6).setResolution(2);
  scene.tweens.add({ targets: t, scale: 1.15, duration: 160, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, y: t.y - 0.8 * BU, alpha: 0, delay: 650, duration: 600, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

/** 내 주변 범위 폭발: 테두리 없이 퍼지는 면 + 파편 */
export function burstFx(scene, e, BU) {
  const c = FX_COLOR[e.fx] ?? 0xffffff, x = e.x * BU, y = e.y * BU, R = e.r * BU;
  play(scene, 520, (g, u) => {
    const k = 1 - (1 - u) ** 3;
    g.fillStyle(c, 0.5 * (1 - u)).fillCircle(x, y, R * (0.3 + 0.7 * k));
    g.fillStyle(0xffffff, 0.35 * (1 - u)).fillCircle(x, y, R * (0.15 + 0.5 * k));
    burst(g, x, y - 0.3 * BU, R * 0.95, 14, 10, c, u);
  }, FXD);
}

/** 폭발 예고: 시간이 갈수록 차오르는 붉은 면 */
export function warnFx(scene, e, BU) {
  const x = e.x * BU, y = e.y * BU, R = e.r * BU;
  play(scene, e.sec * 1000, (g, u) => {
    g.fillStyle(0xff3b30, 0.12 + 0.28 * u).fillCircle(x, y, R);
    g.fillStyle(0xff3b30, 0.3).fillCircle(x, y, R * u);
  }, -44);
}

/** 돌진 궁극기: 달리는 방향 뒤로 먼지 줄 */
export function rushFx(scene, e, v, BU) {
  play(scene, 450, (g, u) => {
    for (let i = 0; i < 8; i++) dot(g, e.x * BU - e.dx * i * 0.5 * BU, e.y * BU - e.dy * i * 0.5 * BU - 6 - 8 * u * (i % 3), 10 * (1 - u), 0xffffff, 0.8 * (1 - u));
  }, FXD);
}

/** 원거리 발사 순간 번쩍임 */
export function muzzleFx(scene, e, v, BU) {
  const c = FX_COLOR[e.fx] ?? 0xffffff, ang = Math.atan2(e.dy, e.dx);
  const x = v.x + Math.cos(ang) * 0.7 * BU, y = v.y - 0.6 * BU + Math.sin(ang) * 0.7 * BU;
  play(scene, 160, (g, u) => { burst(g, x, y, 0.5 * BU, 6, 8, c, u, ang); dot(g, x, y, 10 * (1 - u), 0xffffff, 1 - u); });
}

const HIT = { // 피격 파편 색 목록 (없으면 흰색)
  punch: [0xffffff, 0xffe27a], flurry: [0xffffff, 0xff8fb0], shock: [0xffa43a, 0xffffff], thrust: [0xcfe3f5, 0xffffff], smash: [0x8fd16a, 0x5a3a22], bite: [0xffffff, 0xdfe6ee],
  claw: [0xff9a3c, 0xffffff], paw: [0xf6e7b4, 0xe9c88a], crescent: [0xff8a2a, 0xffd9a0], stomp: [0xe8dcc0, 0xc9b79a], bump: [0xff8fb8, 0xffffff], sweep: [0xcfe8ff, 0x5aa7ff],
  tongue: [0xff6f91, 0xffffff], stone: [0xb8bcc8, 0x7a7f8c], arrow: [0xc89b62, 0x8a5a2a], orb: [0xb072ff, 0xe3c9ff], spark: [0xffe066, 0xffffff], star: [0xff7ab8, 0xffe0ee],
  bottle: [0xff7a3c, 0xffd54a], egg: [0xffd54a, 0xfff3b0],
};
/** 맞은 자리 파편 */
export function hitFx(scene, e, BU) {
  const cols = HIT[e.fx] || [0xffffff], x = e.x * BU, y = e.y * BU - 0.6 * BU, n = e.crit ? 14 : 8, rot = Math.random() * 6.28;
  play(scene, e.crit ? 420 : 300, (g, u) => {
    for (let i = 0; i < n; i++) { const t = rot + (i / n) * 6.283, r = (0.35 + 0.35 * ((i * 7) % 3) / 2) * BU * u; dot(g, x + Math.cos(t) * r, y + Math.sin(t) * r + 14 * u * u, e.crit ? 8 : 6, cols[i % cols.length], 1 - u); }
    if (e.guard) arcDots(g, x, y, 0.5 * BU, -2.2, 2.2, 6, 0x8ec5ff, 1 - u); // 방패로 막음
  }, FXD);
}
