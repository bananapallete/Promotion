// 잔디 필드 맵 도트 아트. 도트 1개 = 화면 2px, 한 칸(몸 폭 1) = 24도트라서 캐릭터와 같은 도트 크기다.
// 이미지 파일 없이 코드로 그려서 Phaser 캔버스 텍스처로 만든다.
import Phaser from 'phaser';
import { MAP, WAIT } from '../shared/constants.js';

export const TILE = 24;
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const GRASS = [0x5fa34c, 0x4e9140].map(rgb);
const LIGHT = rgb(0x7dbb62), DARK = rgb(0x3f7a34);
const DIRT = [0xc9a36a, 0xb88f57].map(rgb), LINE = rgb(0xf4f4f0);
export const ZONE_COLOR = { O: 0x2e86de, X: 0xee5253, 1: 0xee5253, 2: 0x2e86de, 3: 0xf0b429, 4: 0x1dd1a1 };

const nearest = (tex) => tex.refresh() && tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

/** 잔디 바닥('floor'): 가운데 대기 공간은 줄무늬 잔디, 양옆 구역 자리는 흙 + 흰 라인 */
export function buildFloor(scene) {
  const W = MAP.w * TILE, H = MAP.h * TILE;
  const tex = scene.textures.createCanvas('floor', W, H);
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H), d = img.data;
  const put = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  for (let ty = 0; ty < MAP.h; ty++) {
    for (let tx = 0; tx < MAP.w; tx++) {
      const dirt = tx < WAIT.x || tx >= WAIT.x + WAIT.w;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          let c;
          if (dirt) {
            c = (x * 7 + y * 13 + tx * 3) % 11 ? DIRT[0] : DIRT[1];
            const edge = (tx === WAIT.x - 1 && x >= TILE - 3) || (tx === WAIT.x + WAIT.w && x < 3) || (ty === 0 && y < 3) || (ty === MAP.h - 1 && y >= TILE - 3);
            if (edge) c = LINE;
          } else {
            c = GRASS[(tx + ty) % 2];
            const h = (x * 29 + y * 31 + tx * 7 + ty * 11) % 37; // 잔디 알갱이
            if (h === 0) c = LIGHT; else if (h === 1) c = DARK;
            if ((tx * 5 + ty * 3) % 4 === 0 && y >= 6 && y <= 8 && (x === 10 || x === 12 || (x === 11 && y === 8))) c = DARK; // 풀잎
          }
          put(tx * TILE + x, ty * TILE + y, c);
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  nearest(tex);
}

/** 구역 매트: 체크무늬 + 흰 테두리 + 도트로 찍은 큰 글자. 종류·구역별로 한 번만 만든다. */
export function matTexture(scene, type, z) {
  const key = `mat-${type}-${z.id}`;
  if (scene.textures.exists(key)) return key;
  const w = z.w * TILE, h = z.h * TILE, base = rgb(ZONE_COLOR[z.id]);
  const shade = (k) => `rgb(${base.map((v) => Math.min(255, Math.round(v * k))).join(',')})`;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { ctx.fillStyle = (x / 8 + y / 8) % 2 ? shade(0.88) : shade(1); ctx.fillRect(x, y, 8, 8); }
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(4, 4, w - 8, 3); ctx.fillRect(4, h - 7, w - 8, 3); ctx.fillRect(4, 4, 3, h - 8); ctx.fillRect(w - 7, 4, 3, h - 8);

  // 글자: 부드럽게 그린 뒤 반투명 픽셀을 없애 도트로 만든다
  const fs = Math.round(Math.min(w, h) * 0.62);
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d');
  t.fillStyle = '#fff'; t.font = `bold ${fs}px sans-serif`; t.textAlign = 'center'; t.textBaseline = 'middle';
  t.fillText(String(z.label), w / 2, h / 2 + fs * 0.05);
  const src = t.getImageData(0, 0, w, h).data;
  const out = ctx.getImageData(0, 0, w, h), o = out.data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= 128;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (on(x, y)) { o[i] = o[i + 1] = o[i + 2] = 255; }
      else if (on(x - 4, y - 4)) { o[i] *= 0.55; o[i + 1] *= 0.55; o[i + 2] *= 0.55; } // 글자 그림자
    }
  }
  ctx.putImageData(out, 0, 0);
  nearest(tex);
  return key;
}
