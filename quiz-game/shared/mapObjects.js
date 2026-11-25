// 맵 장식물 배치: 고정 난수라서 모든 화면(/screen, 데모)에서 같은 자리에 나온다. 장식일 뿐 부딪히지 않는다.
import { MAP, ZONES } from './constants.js';

const ALL_ZONES = [...ZONES.ox, ...ZONES.choice];
const free = (x, y, pad) => ALL_ZONES.every((z) => Math.hypot(x - z.cx, y - z.cy) > z.r + pad);

// 종류별 개수와 구역에서 떨어져야 하는 거리(칸). 큰 것은 멀리, 작은 꽃은 구역 가까이까지
const KINDS = [['tree', 12, 1.8], ['bush', 10, 1.4], ['rock', 8, 1.3], ['stump', 4, 1.4], ['flower', 22, 0.9], ['mushroom', 6, 1.0]];

export function mapObjects() {
  let seed = 20240607;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const out = [];
  for (const [kind, count, pad] of KINDS) {
    for (let n = 0, tries = 0; n < count && tries < 600; tries++) {
      const x = 1.6 + rnd() * (MAP.w - 3.2), y = 1.8 + rnd() * (MAP.h - 2.6);
      if (!free(x, y, pad) || out.some((o) => Math.hypot(o.x - x, o.y - y) < (kind === 'flower' ? 1.2 : 2.2))) continue;
      out.push({ kind, x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4, v: Math.floor(rnd() * 3) });
      n++;
    }
  }
  return out;
}
