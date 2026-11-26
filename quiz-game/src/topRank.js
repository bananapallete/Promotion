// 화면 좌측 상단: 현재 1~3등 (동전 점수 포함). rows = [{ id, name, score }] 점수 높은 순. 순위가 바뀌면 줄이 위아래로 스와이프한다
import { fmtScore } from '../shared/constants.js';
const last = new WeakMap();
export function renderTopRank(el, rows, meId) {
  const top = rows.slice(0, 3), html = top.map((r, i) => `<div data-id="${r.id}" class="${r.id === meId ? 'me' : ''}"><b>${i + 1}</b><span>${r.name.replace(/[<>&]/g, '')}</span><i>${fmtScore(r.score)}</i></div>`).join('');
  const prev = last.get(el);
  if (prev?.html === html) return;
  const oldTop = new Map([...el.children].map((c) => [c.dataset.id, c.getBoundingClientRect().top]));
  el.innerHTML = html; last.set(el, { html });
  if (!prev || ![...oldTop.keys()].length) return;
  const orderChanged = prev.ids?.join() !== top.map((r) => r.id).join();
  last.set(el, { html, ids: top.map((r) => r.id) });
  if (!orderChanged && prev.ids) return;
  for (const c of el.children) { // FLIP: 이전 자리에서 새 자리로 미끄러짐 (새로 들어온 사람은 옆에서 슬라이드 인)
    const o = oldTop.get(c.dataset.id), dy = o == null ? 0 : o - c.getBoundingClientRect().top;
    c.style.transition = 'none'; c.style.transform = o == null ? 'translateX(-40px)' : `translateY(${dy}px)`; if (o == null) c.style.opacity = '0';
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = 'transform .38s cubic-bezier(.2,.8,.2,1), opacity .3s'; c.style.transform = ''; c.style.opacity = ''; }));
  }
}
