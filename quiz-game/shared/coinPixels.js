// 동전 도트 아트 (14x14 격자). 이미지 파일 없이 코드로 정의해서 Phaser 텍스처로 만든다.
// 글자 → 색: 0 윤곽선(어두운 남색) · 1 금색 · 2 하이라이트 · 3 테두리/무늬(짙은 금색) · 4 흰색 · 5 그림자(검정) · . 투명

export const COIN_PALETTE = { 0: '#14122b', 1: '#f7c531', 2: '#fff3b0', 3: '#c98410', 4: '#ffffff', 5: '#000000' };
export const COIN_N = 14;
// 회전 6프레임: 정면 → 점점 얇아짐 → 옆면 → 다시 넓어짐 (뒷면도 같은 모양이라 이렇게 돌면 한 바퀴)
export const COIN_WIDTHS = [12, 10, 6, 4, 6, 10];

export function coinRows(w) {
  const N = COIN_N, c = N / 2, a = w / 2, b = 6;
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N && ((x + 0.5 - c) / a) ** 2 + ((y + 0.5 - c) / b) ** 2 <= 1;
  const edge = (x, y) => inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1));
  const rim = (x, y) => inside(x, y) && !edge(x, y) && (edge(x - 1, y) || edge(x + 1, y) || edge(x, y - 1) || edge(x, y + 1));
  const rows = [];
  for (let y = 0; y < N; y++) {
    let row = '';
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) row += '.';
      else if (edge(x, y)) row += '0';
      else if (rim(x, y)) row += '3';
      else if (w >= 6 && x >= c - (w >= 10 ? 1 : 0) && x < c + (w >= 10 ? 1 : 0.5) && y >= 4 && y <= 9) row += '3'; // 가운데 세로 무늬
      else if (w >= 8 && x + y <= 2 * c - 5 && x <= c - 1 && y <= c - 1) row += '2'; // 왼쪽 위 하이라이트
      else row += '1';
    }
    rows.push(row);
  }
  return rows;
}

// 습득할 때 동전이 변하는 '작고 하얀 동그라미' (8x8)
export const COIN_DOT = ['..4444..', '.444444.', '44444444', '44444444', '44444444', '44444444', '.444444.', '..4444..'];
// 바닥 그림자 (10x4)
export const COIN_SHADOW = ['..555555..', '.55555555.', '.55555555.', '..555555..'];
