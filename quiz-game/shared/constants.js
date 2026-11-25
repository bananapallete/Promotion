// 서버와 클라이언트가 함께 쓰는 상수. 모든 길이 단위는 '몸 폭'(BU, 캐릭터 지름 = 1BU)이다.

export const MAP = { w: 40, h: 22 };

export const TICK_HZ = 30;
export const BROADCAST_HZ = 20;

// 조이스틱 데드존: 중심에서 패드 반지름의 이 비율 안쪽은 '움직이지 않음'. 바깥은 얼마나 밀었든 같은 속도
export const JOYSTICK_DEADZONE = 0.5;

// 동전: 30초마다 맵에 1개 생성, 다가가면 자동 습득(개당 0.5점). 문제를 못 맞히거나 쓰러지면 가진 동전이 전부 튀어나감
export const COIN = {
  spawnEverySec: 30,
  maxOnMap: 30,
  value: 0.5, // 동전 1개의 점수
  pickupRadius: 1.0, // 캐릭터 중심과 동전 중심 사이 거리 (칸)
  scatterRadius: 2.5, // 튀어나온 동전이 떨어지는 반경 (칸, 48px/칸 기준 120px)
  scatterMin: 0.8, // 몸 바로 밑에는 떨어지지 않도록
  flightSec: 0.55, // 튀어나와 바닥에 닿기까지
  dropLockSec: 3.5, // 떨어진 동전은 이 시간 동안 아무도 못 줍는다 (그동안 깜빡임)
  dropOnNoAnswer: true, // 무응답도 틀린 것으로 보고 떨어뜨림
};
export const fmtScore = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const READ_SEC = 3; // 문제를 읽는 시간 (구역이 아직 잠겨 있음)

// 맵 한가운데 원형 구역. 원 안에 중심이 들어가 있으면 그 구역을 고른 것 (cx, cy, r 단위는 칸)
export const ZONES = {
  ox: [
    { id: 'O', cx: 14, cy: 11, r: 5, label: 'O' },
    { id: 'X', cx: 26, cy: 11, r: 5, label: 'X' },
  ],
  choice: [
    { id: 1, cx: 14, cy: 7.5, r: 4.25, label: '1' },
    { id: 2, cx: 26, cy: 7.5, r: 4.25, label: '2' },
    { id: 3, cx: 14, cy: 16.5, r: 4.25, label: '3' },
    { id: 4, cx: 26, cy: 16.5, r: 4.25, label: '4' },
  ],
};

/** 캐릭터 중심이 들어있는 구역 id (없으면 null = 무응답) */
export function zoneAt(type, x, y) {
  for (const z of ZONES[type] || []) if ((x - z.cx) ** 2 + (y - z.cy) ** 2 <= z.r * z.r) return z.id;
  return null;
}

// 스프라이트 모션별 프레임 수 (tools/build_sheets.py 결과와 일치해야 함)
export const SPRITE = {
  cell: 256,
  anchor: [104, 232], // 셀 안의 발(그림자) 위치 (오른쪽에 주먹이 뻗을 공간을 남기려고 왼쪽으로 치우침)
  motions: {
    idle: { frames: 4, fps: 6, yoyo: true, loop: true },
    walk: { frames: 7, fps: 12, loop: true },
    run: { frames: 7, fps: 15, loop: true },
    combo: { frames: 8 }, // 공격 시트: 아래 attackSteps로 나눠서 재생
  },
  // 근접 3타 콤보: 잽 → 잽 → 반대 주먹으로 크게 휘두르기 (combo 시트의 프레임 번호)
  attackSteps: [
    { frames: [0, 1], fps: 12, ms: 260 },
    { frames: [2, 3], fps: 12, ms: 260 },
    { frames: [4, 5, 6, 7], fps: 14, ms: 340 },
  ],
};
export const COMBO_RESET_SEC = 1.0; // 이 시간 동안 공격하지 않으면 다시 1타부터

export const PHASE = { LOBBY: 'lobby', READING: 'reading', MOVING: 'moving', REVEAL: 'reveal' };
