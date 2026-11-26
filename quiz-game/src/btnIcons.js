// 달리기·공격·궁극기 버튼 아이콘(도트): 버튼 안 글자 위에 얹는다
import { SHOE_PALETTE, SHOE_ROWS, SWORD_ROWS } from '../shared/itemPixels.js';

// 번개: 다각형을 도트 격자에 칠하고 바깥 한 칸을 윤곽선으로
const BOLT = (() => {
  const poly = [[8, 1], [2, 9], [6, 9], [4, 15], [12, 6], [8, 6], [11, 1]], W = 14, H = 17, on = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) c = !c; } return c; };
  return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (on(x, y) ? '1' : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on(x + dx, y + dy)) ? '0' : '.')).join(''));
})();
const ICONS = {
  btnRun: [SHOE_ROWS, SHOE_PALETTE],
  btnAtk: [SWORD_ROWS, { 0: '#14122b', 1: '#dfe6ee', 2: '#a8743a' }],
  btnUlt: [BOLT, { 0: '#14122b', 1: '#ffffff' }],
};
export function addBtnIcons() {
  for (const [id, [rows, pal]] of Object.entries(ICONS)) {
    const btn = document.getElementById(id);
    if (!btn || btn.querySelector('canvas')) continue;
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = Math.max(...rows.map((r) => r.length)); c.height = rows.length; c.className = 'bico';
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    btn.prepend(c);
  }
}

/** 버튼 글자만 바꾼다 (아이콘은 그대로) */
export function setBtnLabel(btn, text) { [...btn.childNodes].filter((n) => n.nodeType === 3).forEach((n) => n.remove()); btn.append(text); }
