// 잔디 필드 맵 도트 아트. 도트 1개 = 화면 2px, 한 칸(몸 폭 1) = 24도트라서 캐릭터와 같은 도트 크기다.
// 이미지 파일 없이 코드로 그려서 Phaser 캔버스 텍스처로 만든다.
import Phaser from 'phaser';
import { MAP } from '../shared/constants.js';

export const TILE = 24;
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const GRASS = [0x5fa34c, 0x4e9140].map(rgb);
const LIGHT = rgb(0x7dbb62), DARK = rgb(0x3f7a34), DARK_GRASS = DARK;
const LINE = rgb(0xf4f4f0);
export const ZONE_COLOR = { O: 0x2e86de, X: 0xee5253, 1: 0xee5253, 2: 0x2e86de, 3: 0xf0b429, 4: 0x1dd1a1 };

const nearest = (tex) => tex.refresh() && tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

/** 잔디 바닥('floor'): 줄무늬 잔디 + 맵 테두리의 흰 라인 */
export function buildFloor(scene) {
  const W = MAP.w * TILE, H = MAP.h * TILE;
  const tex = scene.textures.createCanvas('floor', W, H);
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H), d = img.data;
  const put = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  for (let ty = 0; ty < MAP.h; ty++) {
    for (let tx = 0; tx < MAP.w; tx++) {
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const gx = tx * TILE + x, gy = ty * TILE + y;
          let c = GRASS[(tx + ty) % 2];
          const h = (x * 29 + y * 31 + tx * 7 + ty * 11) % 37; // 잔디 알갱이
          if (h === 0) c = LIGHT; else if (h === 1) c = DARK;
          if ((tx * 5 + ty * 3) % 4 === 0 && y >= 6 && y <= 8 && (x === 10 || x === 12 || (x === 11 && y === 8))) c = DARK; // 풀잎
          if (gx < 3 || gy < 3 || gx >= W - 3 || gy >= H - 3) c = LINE;
          put(gx, gy, c);
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  nearest(tex);
}

export const MAT_MARGIN = 8; // 링 바깥 장식(꽃·풀잎)이 들어갈 여백 (도트)
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]; // 4x4 디더링 표
const NAVY = rgb(0x14122b), STONE = [rgb(0xefe3c2), rgb(0xcbbd98)], STONE_LINE = rgb(0x7a6a48);
const CREAM = rgb(0xf3ecd6);

/** 원형 구역: 돌 울타리 링 + 디더링 바닥 + 윤곽선 도트 글자 + 링 바깥 꽃·풀잎. 종류·구역별로 한 번만 만든다. */
export function matTexture(scene, type, z) {
  const key = `mat-${type}-${z.id}`;
  if (scene.textures.exists(key)) return key;
  const R = Math.round(z.r * TILE), M = MAT_MARGIN, D = 2 * (R + M), C = D / 2;
  const base = rgb(ZONE_COLOR[z.id]);
  const mul = (k) => base.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  const BASE = mul(1), DARK = mul(0.66), LIGHTER = mul(1.12);
  const tex = scene.textures.createCanvas(key, D, D);
  const ctx = tex.getContext();
  const out = ctx.createImageData(D, D), o = out.data;
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= D || y >= D) return; const i = (y * D + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255; };

  // 글자: 부드럽게 그린 뒤 반투명 픽셀을 없애 도트로 만든다
  const fs = Math.round(R * 1.1);
  const tmp = document.createElement('canvas'); tmp.width = D; tmp.height = D;
  const t = tmp.getContext('2d');
  t.fillStyle = '#fff'; t.font = `bold ${fs}px sans-serif`; t.textAlign = 'center'; t.textBaseline = 'middle';
  t.fillText(String(z.label), C, C + fs * 0.05);
  const src = t.getImageData(0, 0, D, D).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < D && y < D && src[(y * D + x) * 4 + 3] >= 128;

  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      const dist = Math.hypot(x + 0.5 - C, y + 0.5 - C);
      if (dist > R) continue; // 링 바깥은 장식만 (아래에서 따로)
      let c;
      if (dist > R - 1) c = NAVY; // 바깥 윤곽선
      else if (dist > R - 7) { // 돌 울타리: 8도트 길이의 돌, 사이에 어두운 틈
        const len = (2 * Math.PI * R) / 8, a = ((Math.atan2(y + 0.5 - C, x + 0.5 - C) + Math.PI) / (2 * Math.PI)) * len;
        const seg = Math.floor(a);
        c = a - seg < 0.14 ? STONE_LINE : STONE[seg & 1];
      } else if (dist > R - 8) c = STONE_LINE; // 돌 안쪽 선
      else { // 바닥: 단색 + 가장자리 디더링(깊이감) + 드문 점 무늬
        const edge = R - 8 - dist; // 가장자리에서 안쪽으로 몇 도트
        const th = (BAYER[y & 3][x & 3] + 0.5) / 16;
        c = BASE;
        if (edge < 7 && th > edge / 7) c = DARK;
        else if ((x * 7 + y * 13) % 23 === 0) c = LIGHTER;
        else if ((x * 5 + y * 3) % 29 === 0) c = DARK;
      }
      // 글자: 윤곽선(남색) → 그림자 → 크림색, 왼쪽 위 가장자리는 하이라이트
      if (on(x, y)) c = on(x - 1, y - 1) ? CREAM : [255, 255, 255];
      else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) c = NAVY;
      else if (on(x - 3, y - 3)) c = c.map((v) => v * 0.55);
      put(x, y, c);
    }
  }

  // 링 바깥 장식: 꽃과 풀잎 (구역마다 같은 모양이 나오게 고정 난수)
  let seed = String(z.id).charCodeAt(0) * 9301 + 49297;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const FLOWER = [rgb(0xffffff), rgb(0xffe27a), rgb(0xff9ec7)], YELLOW = rgb(0xf7c531);
  for (let n = 0, count = Math.round(R / 4); n < count; n++) {
    const ang = rnd() * Math.PI * 2, d = R + 3 + rnd() * (M - 5);
    const x = Math.round(C + Math.cos(ang) * d), y = Math.round(C + Math.sin(ang) * d);
    if (n % 3 === 2) { put(x, y, DARK_GRASS); put(x + 2, y, DARK_GRASS); put(x + 1, y + 1, DARK_GRASS); put(x + 1, y + 2, DARK_GRASS); continue; } // 풀잎
    const petal = FLOWER[n % FLOWER.length];
    put(x, y, YELLOW); put(x - 1, y, petal); put(x + 1, y, petal); put(x, y - 1, petal); put(x, y + 1, petal);
  }
  ctx.putImageData(out, 0, 0);
  nearest(tex);
  return key;
}

// ---------- 맵 장식물 (나무·덤불·바위·그루터기·꽃·버섯): 도트 + 4x4 디더링 음영, 바닥 그림자 ----------
const INK = rgb(0x1d2e2a);
const GREENS = [[0x2d6e38, 0x3f8f45, 0x5fb353, 0x8ad468], [0x2a6a4a, 0x3b8a5a, 0x57ad6c, 0x86d498], [0x4a7a2c, 0x6a9c38, 0x90bf4a, 0xbddb70]].map((l) => l.map(rgb));
const ROCKS = [0x6f7684, 0x8b93a1, 0xaab2bf, 0xd0d6df].map(rgb);
const BARK = [0x5a3a24, 0x7a5233, 0x9a6b42].map(rgb);

/** kind·v(변형 번호)별 텍스처를 한 번만 만든다. 기준점은 아래쪽 가운데. */
export function objectTexture(scene, kind, v = 0) {
  const key = `obj-${kind}-${v}`;
  if (scene.textures.exists(key)) return key;
  const [W, H] = { tree: [36, 46], bush: [28, 20], rock: [24, 18], stump: [18, 16], flower: [16, 10], mushroom: [14, 12] }[kind];
  const tex = scene.textures.createCanvas(key, W, H);
  const ctx = tex.getContext();
  const out = ctx.createImageData(W, H), o = out.data;
  const put = (x, y, c, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = a; };
  const bayer = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;
  const shadow = (cx, cy, rx, ry) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && bayer(x, y) < 0.7) put(x, y, rgb(0x14352c), 120); };
  /** 형태(안쪽 판정)를 받아 윤곽선 + 4단계 디더 음영으로 칠한다. 빛은 왼쪽 위 */
  const blob = (inside, pal, x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { put(x, y, INK); continue; }
      const t = ((x - x0) / (x1 - x0 + 1)) * 0.45 + ((y - y0) / (y1 - y0 + 1)) * 0.65 + (bayer(x, y) - 0.5) * 0.32; // 0(밝음) → 1(어두움)
      put(x, y, pal[t < 0.28 ? 3 : t < 0.5 ? 2 : t < 0.72 ? 1 : 0]);
    }
  };
  const circ = (cx, cy, r) => (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
  const any = (...f) => (x, y) => f.some((g) => g(x, y));
  const pal = GREENS[v % 3];

  if (kind === 'tree') {
    shadow(18, H - 3, 12, 3);
    for (let y = 30; y < H - 2; y++) for (let x = 15; x <= 21; x++) put(x, y, x === 15 || x === 21 ? INK : x < 17 ? BARK[2] : x < 19 ? BARK[1] : BARK[0]); // 줄기
    for (let x = 13; x <= 23; x++) put(x, H - 3, INK);
    blob(any(circ(18, 15, 12), circ(9, 20, 8), circ(27, 20, 8), circ(18, 8, 8)), pal, 0, 0, W - 1, 31);
  } else if (kind === 'bush') {
    shadow(14, H - 3, 11, 3);
    blob(any(circ(14, 11, 8), circ(7, 13, 6), circ(21, 13, 6)), pal, 0, 2, W - 1, H - 4);
  } else if (kind === 'rock') {
    shadow(12, H - 3, 10, 2.5);
    blob(any(circ(12, 10, 8), circ(7, 12, 5.5), circ(17, 12, 5.5)), ROCKS, 0, 1, W - 1, H - 4);
  } else if (kind === 'stump') {
    shadow(9, H - 3, 8, 2.5);
    blob((x, y) => y >= 7 && y <= 12 && ((x + 0.5 - 9) / 7) ** 2 + ((y + 0.5 - 9.5) / 3) ** 2 <= 1 || (x >= 3 && x <= 14 && y >= 9 && y <= 13), BARK.slice().reverse().concat([rgb(0xc08a58)]), 0, 6, W - 1, 13);
    for (let x = 5; x <= 12; x++) put(x, 8, rgb(0xd9a873)); // 윗면 나이테 밝은 면
    put(8, 8, BARK[0]); put(9, 8, BARK[0]);
  } else if (kind === 'flower') {
    const cols = [[0xffffff, 0xffe27a], [0xff9ec7, 0xffe27a], [0xb48cff, 0xffffff]][v % 3].map(rgb);
    for (const [fx, fy] of [[4, 4], [10, 3], [7, 7]]) { put(fx, fy + 2, rgb(0x3f7a34)); put(fx, fy + 3, rgb(0x3f7a34)); put(fx, fy, rgb(0xf7c531)); put(fx - 1, fy, cols[0]); put(fx + 1, fy, cols[0]); put(fx, fy - 1, cols[0]); put(fx, fy + 1, cols[0]); }
  } else { // mushroom
    shadow(7, H - 2, 6, 2);
    for (let y = 7; y < 11; y++) for (let x = 6; x <= 8; x++) put(x, y, x === 6 ? INK : rgb(0xf0e6d0));
    blob(circ(7, 6, 5), [rgb(0xb02a3a), rgb(0xd94652), rgb(0xf0707a), rgb(0xffa0a6)], 1, 1, 12, 7);
    put(5, 4, rgb(0xffffff)); put(9, 3, rgb(0xffffff)); put(8, 5, rgb(0xffffff));
  }
  ctx.putImageData(out, 0, 0);
  nearest(tex);
  return key;
}
