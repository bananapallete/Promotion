// 플레이어 화면 상단 UI: 좌상단 1~3등 · 문제(+이미지 썸네일, 탭하면 크게) · 제한시간 링 · 맨 위 시간 게이지. 폰 크기에 맞춰 vw/vh로 늘고 줄어든다.
import { PHASE, READ_SEC } from '../shared/constants.js';
import { renderTopRank } from './topRank.js';

const CSS = `
#qtop{position:fixed;left:0;right:0;top:0;z-index:15;pointer-events:none;color:#5a3a24;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif}
#qtop .tg{position:absolute;left:1.4vw;right:1.4vw;top:0;height:1.6vh;background:#14122b66;border-radius:0 0 99px 99px;overflow:hidden}
#qtop .tg i{display:block;height:100%;width:0;background:linear-gradient(#ffe27a,#f2c230);transition:width .25s linear}
#qtop .tg.low i{background:linear-gradient(#ff8f84,#e5483c)}#qtop .tg.ok i{background:linear-gradient(#9af0a4,#4fd16a)}
#qtop .row{display:grid;grid-template-columns:minmax(0,.22fr) minmax(0,1fr) auto;gap:1.2vw;align-items:start;padding:2.5vh 1.4vw 0 max(1.4vw,env(safe-area-inset-left,0px))}
#qtop #toprank{position:static;pointer-events:none}
#qtop .q{background:#f6e6c8;border:3px solid #14122b;border-radius:14px;box-shadow:0 3px 0 #14122b66;padding:2vh 1.4vw;display:grid;grid-template-columns:auto 1fr auto;gap:1vw;align-items:center;pointer-events:auto}
#qtop .q[hidden],#qtop .tm[hidden]{display:none}
#qtop .no{font-weight:900;color:#fff;background:#f0a000;border:2px solid #14122b;border-radius:8px;padding:1px 7px;font-size:calc(1.4vw + 5px);white-space:nowrap}
#qtop .no.end{background:#e5483c}#qtop .no.ans{background:#6e9a3a}#qtop .no.real{background:#9a62d6}
#qtop .q p{margin:0;font-weight:900;line-height:1.25;font-size:calc(1.65vw + 5px);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all}
#qtop .th{width:16vh;height:12vh;border-radius:8px;border:2px solid #14122b;background:#e9f7ff center/cover;position:relative}
#qtop .th::after{content:"⤢";position:absolute;right:2px;bottom:-1px;font-size:3.5vh;color:#14122b;text-shadow:0 0 3px #fff}
#qtop .tm .ring{width:13vh;height:13vh;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c,#f2c230) calc(var(--p,0)*1%),#14122b44 0);border:3px solid #14122b;position:relative}
#qtop .tm .ring::before{content:"";position:absolute;inset:18%;background:#f6e6c8;border-radius:50%}
#qtop .tm b{position:relative;font-size:5.5vh;font-weight:900;color:#14122b}
#qbig{position:fixed;inset:0;z-index:70;background:#14122bcc;display:grid;place-items:center}#qbig[hidden]{display:none}
#qbig img{max-width:80vw;max-height:80vh;border:4px solid #14122b;border-radius:16px;background:#fff}
`;

export function mountQuizTop() {
  if (!document.getElementById('qtop-css')) { const st = document.createElement('style'); st.id = 'qtop-css'; st.textContent = CSS; document.head.append(st); }
  let el = document.getElementById('qtop');
  if (!el) {
    el = document.createElement('div'); el.id = 'qtop';
    el.innerHTML = '<div class="tg"><i></i></div><div class="row"><div id="toprank"></div><div class="q"><span class="no"></span><p></p><div class="th" hidden></div></div><div class="tm"><div class="ring"><b></b></div></div></div>';
    document.body.append(el);
    const big = document.createElement('div'); big.id = 'qbig'; big.hidden = true; big.innerHTML = '<img alt="">'; document.body.append(big);
    big.addEventListener('click', () => { big.hidden = true; });
    el.querySelector('.th').addEventListener('click', () => { const u = el.querySelector('.th').dataset.url; if (u) { big.querySelector('img').src = u; big.hidden = false; } });
  }
  return el;
}

/** s: 서버 상태, rows: [{id,name,score}] 점수순, meId: 내 id */
export function renderQuizTop(el, s, rows, meId) {
  renderTopRank(el.querySelector('#toprank'), rows, meId);
  const q = s.q, show = !!q && s.phase !== PHASE.LOBBY, qb = el.querySelector('.q'), tm = el.querySelector('.tm'), tg = el.querySelector('.tg');
  qb.hidden = !show; tm.hidden = !show; tg.style.visibility = show ? 'visible' : 'hidden';
  if (!show) return;
  const no = qb.querySelector('.no'), p = qb.querySelector('p'), th = qb.querySelector('.th');
  const ans = s.reveal && s.reveal.answer != null ? (q.type === 'choice' ? `${s.reveal.answer}번` : s.reveal.answer) : '';
  no.className = `no${s.phase === PHASE.HOLD ? ' end' : s.phase === PHASE.REVEAL ? ' ans' : s.phase === PHASE.REAL ? ' real' : ''}`;
  no.textContent = s.phase === PHASE.HOLD ? '종료' : s.phase === PHASE.REVEAL ? (s.reveal?.real ? '공개' : `정답 ${ans}`) : s.phase === PHASE.REAL ? '현실' : `Q${q.id}`;
  p.textContent = q.text + (q.type === 'choice' && q.options ? '  ' + q.options.map((o, i) => `${i + 1}.${o}`).join(' ') : '');
  th.hidden = !q.image; if (q.image) { th.style.backgroundImage = `url("${q.image}")`; th.dataset.url = q.image; }
  const reading = s.phase === PHASE.READING, moving = s.phase === PHASE.MOVING, total = reading ? READ_SEC : q.time || 15, f = (moving || reading) ? Math.max(0, Math.min(1, s.left / total)) : 0;
  tm.hidden = !(reading || moving || s.phase === PHASE.HOLD);
  const col = s.phase === PHASE.HOLD ? '#e5483c' : reading ? '#4a86d9' : f > 0.5 ? '#4fd16a' : f > 0.25 ? '#f2c230' : '#e5483c';
  const ring = tm.querySelector('.ring'); ring.style.setProperty('--p', Math.round(f * 100)); ring.style.setProperty('--c', col); tm.querySelector('b').textContent = (reading || moving) ? Math.ceil(s.left) : 0;
  tg.className = `tg${s.phase === PHASE.HOLD || (moving && f <= 0.25) ? ' low' : moving && f > 0.5 ? ' ok' : ''}`; tg.firstChild.style.width = `${f * 100}%`;
}
