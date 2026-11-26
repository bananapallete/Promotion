// 빔프로젝터 화면 UI: 상단에 문제·시간(숫자+게이지)·이미지, 아래에 구역 안내. 시간이 끝나면 '시간 종료' 대기, 진행자가 누르면 정답+응답 분포, 등수는 진행자가 켰을 때만.
import { fmtScore, PHASE, READ_SEC } from '../shared/constants.js';

const CSS = `
#sq{position:fixed;inset:0;z-index:12;pointer-events:none;font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#5a3a24}
#sq .head{position:absolute;left:2vw;right:2vw;top:2vh;display:grid;gap:1.4vh}
#sq .top{display:flex;align-items:center;gap:1.2vw}
#sq .qn{font-weight:900;font-size:3.4vh;line-height:1;color:#fff;background:#f0a000;border:.4vh solid #14122b;border-radius:1.4vh;padding:.8vh 1.4vh;text-shadow:0 .2vh 0 #14122b}
#sq .chip{font-weight:900;font-size:2.4vh;color:#fff;border:.3vh solid #14122b;border-radius:99px;padding:.4vh 1.4vh}
#sq .chip.ind{background:#4a86d9}#sq .chip.team{background:#9a62d6}#sq .chip.real{background:#f0a000}
#sq .num{margin-left:auto;font-weight:900;font-size:8vh;line-height:1;color:#fff;-webkit-text-stroke:.5vh #14122b;paint-order:stroke fill;text-shadow:0 .5vh 0 #14122b}
#sq .num.low{color:#ff8f84}
#sq .gauge{height:2.4vh;background:#14122b55;border:.35vh solid #14122b;border-radius:99px;overflow:hidden}
#sq .gauge i{display:block;height:100%;width:0;background:linear-gradient(#ffe27a,#f2c230);transition:width .25s linear}
#sq .gauge.ok i{background:linear-gradient(#9af0a4,#4fd16a)}#sq .gauge.low i{background:linear-gradient(#ff8f84,#e5483c)}
#sq .main{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:1.4vw}
#sq .main.noimg{grid-template-columns:1fr}
#sq .card{background:#f6e6c8;border:.45vh solid #14122b;border-radius:2vh;box-shadow:0 .6vh 0 #14122b66;padding:2vh 1.8vw;font-weight:900;font-size:4vh;line-height:1.3;word-break:keep-all;display:grid;align-content:center}
#sq .img{background:#fff;border:.45vh solid #14122b;border-radius:2vh;box-shadow:0 .6vh 0 #14122b66;padding:.8vh;min-height:20vh;max-height:30vh}
#sq .img div{width:100%;height:100%;border-radius:1.2vh;background:#e9f7ff center/contain no-repeat}
#sq .legend{position:absolute;left:2vw;right:2vw;bottom:2vh;display:flex;gap:1.2vw}
#sq .zone{flex:1;display:flex;align-items:center;gap:1vw;padding:1.2vh 1.4vw;border:.4vh solid #14122b;border-radius:1.6vh;color:#fff;font-weight:900;font-size:3.4vh;box-shadow:0 .5vh 0 #14122b66;overflow:hidden}
#sq .zone small{font-size:2.4vh;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sq .z-O{background:#4a86d9}#sq .z-X{background:#e5483c}#sq .z-1{background:#4a86d9}#sq .z-2{background:#e5483c}#sq .z-3{background:#4fae55}#sq .z-4{background:#e0902a}
#sq .center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(70vw,1100px);display:grid;gap:1.6vh}
#sq .panel{background:#f6e6c8;border:.5vh solid #14122b;border-radius:2.4vh;box-shadow:0 .8vh 0 #14122b88;padding:2.4vh 2.4vw}
#sq .end{text-align:center;font-weight:900;font-size:10vh;color:#fff;-webkit-text-stroke:.7vh #14122b;paint-order:stroke fill;background:#14122bb0;border-radius:3vh;padding:3vh 0}
#sq .end small{display:block;font-size:3vh;-webkit-text-stroke:0;opacity:.9}
#sq .ans{display:grid;grid-template-columns:auto 1fr;gap:2.4vw;align-items:center}
#sq .ans .a{font-weight:900;font-size:20vh;line-height:1;color:#b4d36a;-webkit-text-stroke:.8vh #14122b;paint-order:stroke fill;text-shadow:0 1vh 0 #14122b}
#sq .bars{display:grid;gap:1.2vh}#sq .bar{display:grid;grid-template-columns:6vh 1fr 6vh;gap:1vw;align-items:center;font-weight:900;font-size:3.2vh}
#sq .bar .t{height:4vh;background:#14122b33;border:.4vh solid #14122b;border-radius:1vh;overflow:hidden}#sq .bar .t i{display:block;height:100%}
#sq .rows{display:grid;gap:1.2vh}#sq .rows div{display:grid;grid-template-columns:8vh 1fr auto auto;gap:1.4vw;align-items:baseline;padding:1.1vh 1.6vw;border:.4vh solid #14122b;border-radius:1.8vh;background:#f6e6c8;font-weight:900;font-size:3.6vh}
#sq .rows div:nth-child(1){background:#ffe27a}#sq .rows div:nth-child(2){background:#e8eef5}#sq .rows div:nth-child(3){background:#f0c9a0}
#sq .rows b{color:#d98a00}#sq .rows small{font-size:2.4vh;color:#7a4e32}
#sq .ttl{font-weight:900;font-size:3.6vh;text-align:center;margin-bottom:1.2vh}
#sq .tms{display:flex;gap:1vw;justify-content:center;margin-top:1.4vh}#sq .tms span{font-weight:900;font-size:3vh;border:.35vh solid #14122b;border-radius:99px;padding:.4vh 1.6vh;background:#fff}
#sq .notice{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);max-width:80vw;background:#14122bf0;color:#fff;border:.5vh solid #ffd54a;border-radius:3vh;padding:3vh 3vw;font-weight:900;font-size:6vh;text-align:center;word-break:keep-all;box-shadow:0 1vh 0 #0008}
#sq .title{position:absolute;inset:0;display:grid;place-items:center;background:#2b4d2add}
#sq .title b{font-weight:900;font-size:14vh;color:#fff;-webkit-text-stroke:1vh #14122b;paint-order:stroke fill;text-shadow:0 1.4vh 0 #14122b}
#sq .x2{position:absolute;right:2vw;bottom:12vh;font-weight:900;font-size:6vh;color:#fff;background:#e5483c;border:.5vh solid #14122b;border-radius:2vh;padding:.6vh 2vh;box-shadow:0 .6vh 0 #0007}
#sq .frz{position:absolute;inset:0;display:grid;place-items:center;background:#14122baa;color:#fff;font-weight:900;font-size:9vh}
#sq [hidden]{display:none!important}
`;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ZCOL = { O: '#4a86d9', X: '#e5483c', 1: '#4a86d9', 2: '#e5483c', 3: '#4fae55', 4: '#e0902a', '-': '#8b8b8b' };
const TEAMC = ['', '#ff6b6b', '#4a86d9', '#4fd16a', '#f2c230', '#9a62d6', '#ff9a3c', '#4fc9c9', '#c0c0c0'];

export function mountScreenUi() {
  if (!document.getElementById('sq-css')) { const st = document.createElement('style'); st.id = 'sq-css'; st.textContent = CSS; document.head.append(st); }
  let el = document.getElementById('sq');
  if (!el) {
    el = document.createElement('div'); el.id = 'sq';
    el.innerHTML = `<div class="head" hidden><div class="top"><span class="qn"></span><span class="chip"></span><span class="num"></span></div><div class="gauge"><i></i></div><div class="main"><div class="card"></div><div class="img"><div></div></div></div></div>
      <div class="legend" hidden></div><div class="title" hidden><b>QUIZ ARCADE</b></div><div class="x2" hidden>점수 ×2</div><div class="notice" hidden></div><div class="frz" hidden>잠시 멈춤</div><div class="center"><div class="end" hidden></div><div class="panel rev" hidden></div><div class="panel rank" hidden></div></div>`;
    document.body.append(el);
  }
  return el;
}

export function renderScreenUi(el, s) {
  const mode = s.sm || 'quiz', nt = el.querySelector('.notice');
  el.querySelector('.title').hidden = mode !== 'title'; el.querySelector('.x2').hidden = s.x2 !== 2; el.querySelector('.frz').hidden = !s.fz;
  nt.hidden = !s.nt; if (s.nt) nt.textContent = s.nt;
  if (mode === 'map') { for (const c of ['.head', '.legend', '.end', '.rev', '.rank']) el.querySelector(c).hidden = true; return; } // 맵만 보여 줌
  const q = s.q, ph = s.phase, live = !!q && ph !== PHASE.LOBBY, head = el.querySelector('.head'), legend = el.querySelector('.legend'), end = el.querySelector('.end'), rev = el.querySelector('.rev'), rank = el.querySelector('.rank');
  head.hidden = !live;
  if (live) {
    const reading = ph === PHASE.READING, moving = ph === PHASE.MOVING, total = reading ? READ_SEC : q.time || 15, f = reading || moving ? Math.max(0, Math.min(1, s.left / total)) : 0;
    el.querySelector('.qn').textContent = `Q${q.id}`;
    const chip = el.querySelector('.chip'); chip.className = `chip ${q.mode === '팀' ? 'team' : q.mode === '현실' ? 'real' : 'ind'}`; chip.textContent = q.mode === '팀' ? '팀전' : q.mode === '현실' ? '현실' : '개인전';
    const num = el.querySelector('.num'); num.hidden = !(reading || moving || ph === PHASE.HOLD); num.textContent = reading || moving ? Math.ceil(s.left) : 0; num.classList.toggle('low', ph === PHASE.HOLD || (moving && f <= 0.25));
    const gauge = el.querySelector('.gauge'); gauge.hidden = ph === PHASE.REAL || ph === PHASE.REVEAL; gauge.className = `gauge${moving && f > 0.5 ? ' ok' : ph === PHASE.HOLD || (moving && f <= 0.25) ? ' low' : ''}`; gauge.firstChild.style.width = `${f * 100}%`;
    const main = el.querySelector('.main'); main.className = `main${q.image ? '' : ' noimg'}`; el.querySelector('.card').textContent = q.text;
    const img = el.querySelector('.img'); img.hidden = !q.image; if (q.image) img.firstChild.style.backgroundImage = `url("${q.image}")`;
  }
  // 구역 안내 (시간 종료 후엔 구역별 인원)
  const showLegend = live && ph !== PHASE.REAL && !(ph === PHASE.REVEAL && s.reveal?.real) && !s.rank;
  legend.hidden = !showLegend;
  if (showLegend) {
    const keys = q.type === 'choice' ? [1, 2, 3, 4].slice(0, q.options?.length || 4) : ['O', 'X'], dist = (ph === PHASE.HOLD || ph === PHASE.MOVING) ? s.dist : null;
    legend.innerHTML = keys.map((k) => `<div class="zone z-${k}"><b>${k}</b><small>${q.type === 'choice' ? esc(q.options?.[k - 1]) : ''}</small>${ph === PHASE.HOLD && dist ? `<span style="margin-left:auto">${dist[k] || 0}명</span>` : ''}</div>`).join('');
  }
  end.hidden = ph !== PHASE.HOLD || s.rank; end.innerHTML = '시간 종료<small>정답 공개를 기다리는 중</small>';
  // 정답 공개
  const showRev = ph === PHASE.REVEAL && s.reveal && !s.rank;
  rev.hidden = !showRev;
  if (showRev) {
    const r = s.reveal;
    if (r.real) rev.innerHTML = `<div class="ttl">현실 퀴즈 결과</div><div class="rows">${r.results.slice(0, 8).map((x, i) => `<div><b>${i + 1}</b><span>${esc(x.name)}</span><small>${x.team ? `${x.team}팀` : ''}</small><span>+${fmtScore(x.gain)}</span></div>`).join('')}</div>`;
    else {
      const ans = q.type === 'choice' ? `${r.answer}번` : r.answer, d = r.dist || {}, keys = q.type === 'choice' ? [1, 2, 3, 4].slice(0, q.options?.length || 4) : ['O', 'X'], tot = Math.max(1, Object.values(d).reduce((a, b) => a + b, 0));
      const winners = r.results.filter((x) => x.correct).sort((a, b) => a.rank - b.rank).slice(0, 3);
      rev.innerHTML = `<div class="ans"><div class="a">${esc(ans)}</div><div class="bars">${[...keys, '-'].filter((k) => k !== '-' || d['-']).map((k) => `<div class="bar"><b style="color:${ZCOL[k]}">${k === '-' ? '—' : k}</b><div class="t"><i style="width:${((d[k] || 0) / tot) * 100}%;background:${ZCOL[k]}"></i></div><span>${d[k] || 0}</span></div>`).join('')}</div></div><div class="ttl" style="margin:1.6vh 0 0;font-size:2.8vh">${winners.map((x) => `${x.rank}등 ${esc(x.name)} +${x.gain}`).join(' · ') || '정답자 없음'}</div>`;
    }
  }
  // 등수 (진행자가 켰을 때만)
  rank.hidden = !s.rank;
  if (s.rank) {
    const rows = (s.lb || []).slice(0, 8);
    const teams = (s.teams || []).filter((t) => t.score || (s.teams || []).length).sort((a, b) => b.score - a.score);
    const html = `<div class="ttl">현재 등수 · 동전 포함</div><div class="rows">${rows.map((r, i) => `<div><b>${i + 1}</b><span>${esc(r.name)}</span><small>🪙 ${r.coins ?? 0}</small><span>${fmtScore(r.score)}</span></div>`).join('')}</div>${teams.length ? `<div class="tms">${teams.map((t) => `<span style="background:${TEAMC[t.t]}66">${t.t}팀 ${fmtScore(t.score)}</span>`).join('')}</div>` : ''}`;
    if (rank.innerHTML !== html) rank.innerHTML = html;
  }
}
