// 서버와 클라이언트가 함께 쓰는 상수. 모든 길이 단위는 '몸 폭'(BU, 캐릭터 지름 = 1BU)이다.

export const MAP = { w: 40, h: 22 };

export const TICK_HZ = 30;
export const BROADCAST_HZ = 20;

// 조이스틱 데드존: 중심에서 패드 반지름의 이 비율 안쪽은 '움직이지 않음'. 바깥은 얼마나 밀었든 같은 속도
export const JOYSTICK_DEADZONE = 0.5;

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
