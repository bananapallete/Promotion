// 잔디 필드 맵 도트 아트. 도트 1개 = 화면 2px, 한 칸(몸 폭 1) = 24도트라서 캐릭터와 같은 도트 크기다.
// 이미지 파일 없이 코드로 그려서 Phaser 캔버스 텍스처로 만든다.
import Phaser from 'phaser';
import { MAP } from '../shared/constants.js';

export const TILE = 24;
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const GRASS = [0x5fa34c, 0x4e9140].map(rgb);
const LIGHT = rgb(0x7dbb62), DARK = rgb(0x3f7a34);
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

/** 원형 구역 매트: 체크무늬 + 흰 링 + 도트로 찍은 큰 글자. 종류·구역별로 한 번만 만든다. */
export function matTexture(scene, type, z) {
  const key = `mat-${type}-${z.id}`;
  if (scene.textures.exists(key)) return key;
  const D = Math.round(z.r * 2 * TILE), R = D / 2, base = rgb(ZONE_COLOR[z.id]);
  const shade = (k) => base.map((v) => Math.min(255, Math.round(v * k)));
  const tex = scene.textures.createCanvas(key, D, D);
  const ctx = tex.getContext();
  const out = ctx.createImageData(D, D), o = out.data;

  // 글자: 부드럽게 그린 뒤 반투명 픽셀을 없애 도트로 만든다
  const fs = Math.round(D * 0.55);
  const tmp = document.createElement('canvas'); tmp.width = D; tmp.height = D;
  const t = tmp.getContext('2d');
  t.fillStyle = '#fff'; t.font = `bold ${fs}px sans-serif`; t.textAlign = 'center'; t.textBaseline = 'middle';
  t.fillText(String(z.label), R, R + fs * 0.05);
  const src = t.getImageData(0, 0, D, D).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < D && y < D && src[(y * D + x) * 4 + 3] >= 128;

  for (let y = 0; y < D; y++) {
    for (let x = 0; x < D; x++) {
      const dist = Math.hypot(x + 0.5 - R, y + 0.5 - R);
      if (dist > R) continue; // 원 밖은 투명
      let c = shade((x >> 3) + (y >> 3) & 1 ? 0.88 : 1); // 8도트 체크무늬
      if (dist > R - 7 && dist <= R - 4) c = LINE; // 흰 링
      if (on(x, y)) c = [255, 255, 255];
      else if (on(x - 4, y - 4)) c = c.map((v) => v * 0.55); // 글자 그림자
      const i = (y * D + x) * 4;
      o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  nearest(tex);
  return key;
}
