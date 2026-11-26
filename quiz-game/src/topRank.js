// 화면 좌측 상단: 현재 1~3등 (동전 점수 포함). rows = [{ id, name, score }] 점수 높은 순
import { fmtScore } from '../shared/constants.js';
export function renderTopRank(el, rows, meId) {
  el.innerHTML = rows.slice(0, 3).map((r, i) => `<div class="${r.id === meId ? 'me' : ''}"><b>${i + 1}</b><span>${r.name.replace(/[<>&]/g, '')}</span><i>${fmtScore(r.score)}</i></div>`).join('');
}
