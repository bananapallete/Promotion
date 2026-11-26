// 맵 장식물 배치: 규칙으로 정한다 (난수 없음). 모두 구역 밖, 부딪히지 않는 장식.
//
// 규칙
//  1. 나무: 맵 둘레에 줄지어 선다. 위쪽은 3.5칸 간격으로 지그재그, 양옆은 두 줄 기둥, 아래쪽은 구역과 겹쳐서 비워 둔다.
//     모양(0 둥근·1 키 큰·2 넓은)은 순서대로 돌려 쓴다.
//  2. 덤불: 나무 뿌리 옆에 하나씩(좌우 번갈아). 아래쪽 가장자리에는 3.4칸마다 덤불과 바위를 번갈아 놓는다.
//  3. 그루터기·버섯: 나무 3그루마다 버섯 하나를 뿌리에, 네 모서리 안쪽에 그루터기.
//  4. 바위: 양옆 가운데와 아래 모서리에 두 개씩 모아서.
//  5. 꽃: 가운데 대기 통로(x=20)를 따라 꽃길, 나무 옆에 꽃무더기.
//  6. 구역(원) 둘레에 종류별 여유 거리를 두고, 중앙 통로 x 18.6~21.4 에는 꽃 말고 놓지 않는다.
import { MAP, ZONES } from './constants.js';

const ALL_ZONES = [...ZONES.ox, ...ZONES.choice];
const PAD = { tree: 1.9, bush: 1.3, rock: 1.3, stump: 1.4, flower: 0.9, mushroom: 1.0 };
const free = (kind, x, y) => ALL_ZONES.every((z) => Math.hypot(x - z.cx, y - z.cy) > z.r + PAD[kind]);
export const CORRIDOR = [18.6, 21.4]; // 중앙 대기 통로 (꽃만 허용)

export function mapObjects() {
  const out = [];
  const add = (kind, x, y, v = 0) => {
    if (x < 0.8 || x > MAP.w - 0.8 || y < 0.8 || y > MAP.h - 0.5) return;
    if (!free(kind, x, y)) return;
    if (kind !== 'flower' && x > CORRIDOR[0] && x < CORRIDOR[1]) return;
    out.push({ kind, x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4, v });
  };
  const trees = [];
  const tree = (x, y) => { const v = trees.length % 3; trees.push({ x, y }); add('tree', x, y, v); };

  // 1) 나무: 위쪽 줄 (지그재그) + 양옆 두 줄 기둥
  for (let i = 0, x = 2.4; x <= MAP.w - 2.4; i++, x += 3.5) tree(x, 1.7 + (i % 2) * 0.55);
  for (let j = 0, y = 4.9; y <= 19.6; j++, y += 3.6) { tree(2.2 + (j % 2) * 2.6, y); tree(MAP.w - 2.2 - (j % 2) * 2.6, y); }

  // 2) 덤불: 나무 뿌리 옆 + 아래 가장자리
  trees.forEach((t, i) => add('bush', t.x + (i % 2 ? 1.5 : -1.5), t.y + 0.5, i % 3));
  for (let i = 0, x = 3; x <= MAP.w - 3; i++, x += 3.4) add(i % 2 ? 'rock' : 'bush', x, MAP.h - 0.7, i % 3);

  // 3) 버섯 · 그루터기
  trees.forEach((t, i) => { if (i % 3 === 1) add('mushroom', t.x - 1.0, t.y + 0.6, 0); });
  for (const [x, y] of [[6.4, 3.4], [MAP.w - 6.4, 3.4], [6.2, 19.4], [MAP.w - 6.2, 19.4]]) add('stump', x, y, 0);

  // 4) 바위: 양옆 가운데, 아래 모서리
  for (const dir of [1, -1]) {
    const bx = dir > 0 ? 1.6 : MAP.w - 1.6;
    add('rock', bx, 10.6, 0); add('rock', bx + dir * 1.3, 11.4, 1);
    add('rock', bx + dir * 0.4, 20.4, 2); add('rock', bx + dir * 1.7, 20.9, 0);
  }

  // 5) 꽃: 중앙 통로 꽃길 + 나무 옆 꽃무더기
  for (let i = 0, y = 2.2; y <= MAP.h - 1.6; i++, y += 1.9) add('flower', 20 + (i % 2 ? 0.7 : -0.7), y, i % 3);
  trees.forEach((t, i) => { if (i % 2 === 0) add('flower', t.x + (i % 4 ? 1.1 : -1.1), t.y + 1.1, i % 3); });
  return out;
}
