// 서버와 클라이언트가 함께 쓰는 상수. 모든 길이 단위는 '몸 폭'(BU, 캐릭터 지름 = 1BU)이다.

export const MAP = { w: 40, h: 22 };

export const TICK_HZ = 30;
export const BROADCAST_HZ = 20;

export const READ_SEC = 3; // 문제를 읽는 시간 (구역이 아직 잠겨 있음)

// 가운데 대기 공간 + 양옆 구역 (객관식은 2x2)
const ZW = 9;
export const WAIT = { x: ZW, y: 0, w: MAP.w - ZW * 2, h: MAP.h };
export const ZONES = {
  ox: [
    { id: 'O', x: 0, y: 0, w: ZW, h: MAP.h, label: 'O' },
    { id: 'X', x: MAP.w - ZW, y: 0, w: ZW, h: MAP.h, label: 'X' },
  ],
  choice: [
    { id: 1, x: 0, y: 0, w: ZW, h: MAP.h / 2, label: '1' },
    { id: 2, x: MAP.w - ZW, y: 0, w: ZW, h: MAP.h / 2, label: '2' },
    { id: 3, x: 0, y: MAP.h / 2, w: ZW, h: MAP.h / 2, label: '3' },
    { id: 4, x: MAP.w - ZW, y: MAP.h / 2, w: ZW, h: MAP.h / 2, label: '4' },
  ],
};

/** 캐릭터 중심이 들어있는 구역 id (없으면 null = 대기 공간/무응답) */
export function zoneAt(type, x, y) {
  const list = ZONES[type];
  if (!list) return null;
  for (const z of list) {
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z.id;
  }
  return null;
}

// 스프라이트 모션별 프레임 수 (tools/build_sheets.py 결과와 일치해야 함)
export const SPRITE = {
  cell: 256,
  anchor: [128, 232], // 셀 안의 발(그림자) 위치
  motions: {
    idle: { frames: 4, fps: 6, yoyo: true, loop: true },
    walk: { frames: 7, fps: 12, loop: true },
    run: { frames: 7, fps: 15, loop: true },
    punch: { frames: 7, fps: 28, loop: false },
  },
};

export const PHASE = { LOBBY: 'lobby', READING: 'reading', MOVING: 'moving', REVEAL: 'reveal' };
