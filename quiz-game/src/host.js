// 진행자(관리자) 화면: 문제 큐 · 현재 문제 컨트롤 · 실시간 응답 · 현실 퀴즈 점수 · 참가자/팀/점수 수정
import { io } from 'socket.io-client';
import { fmtScore, PHASE } from '../shared/constants.js';

const $ = (s) => document.querySelector(s);
const socket = io();
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'quiz_host_key', getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const TEAMC = ['#ccc', '#ff6b6b', '#4a86d9', '#4fd16a', '#f2c230', '#9a62d6', '#ff9a3c', '#4fc9c9', '#c0c0c0'];
const phaseName = { [PHASE.LOBBY]: '대기', [PHASE.READING]: '읽는 중', [PHASE.MOVING]: '응답 중', [PHASE.HOLD]: '시간 종료 · 공개 대기', [PHASE.REAL]: '현실 퀴즈', [PHASE.REVEAL]: '정답 공개됨' };
let info = { questions: [], teamCount: 0, log: [] }, curId = null, st = null, askId = null, doneIds = new Set(), rankOn = false;
const emit = (ev, d) => socket.emit(ev, d || {});

function auth(key) {
  socket.emit('host:auth', key, (res) => {
    if (!res?.ok) { $('#auth').hidden = false; $('#app').hidden = true; $('#aerr').textContent = key ? '키가 맞지 않아요' : ''; return; }
    try { localStorage.setItem(KEY, key); } catch { /* 저장 불가 */ }
    ['#auth'].forEach((s) => { $(s).hidden = true; }); ['#app', '#topbar', '#log'].forEach((s) => { $(s).hidden = false; });
    setInfo(res);
  });
}
socket.on('connect', () => auth(getKey()));
$('#login').addEventListener('click', () => auth($('#key').value.trim()));
socket.on('host:info', setInfo);

function setInfo(i) { info = i; renderQuestions(); $('#t-n').value = i.teamCount || $('#t-n').value; $('#log').innerHTML = (i.log || []).slice(0, 6).map((l) => `<span>${new Date(l.t).toTimeString().slice(0, 8)} ${esc(l.text)}</span>`).join('') || '<span style="opacity:.6">기록 없음</span>'; }

// ---------- 문제 큐 ----------
function renderQuestions() {
  $('#qlist').innerHTML = info.questions.map((q) => `
    <div class="q ${q.id === curId ? 'cur' : doneIds.has(q.id) ? 'done' : ''}">
      <i></i><span title="${esc(q.text)}">${q.id}. ${esc(q.text)}</span>
      <button class="chip ${q.mode === '팀' ? 'c-team' : q.mode === '현실' ? 'c-real' : 'c-ind'}" data-mode="${q.id}" style="cursor:pointer;font-size:11px">${esc(q.mode)}</button>
      <button class="btn sm go" data-pick="${q.id}">선택</button>
    </div>`).join('');
}
$('#qlist').addEventListener('click', (e) => {
  const m = e.target.closest('[data-mode]'), p = e.target.closest('[data-pick]');
  if (m) { const q = info.questions.find((x) => x.id === Number(m.dataset.mode)); if (q && q.type !== 'real') emit('host:setMode', { id: q.id, mode: q.mode === '팀' ? '개인' : '팀' }); }
  if (p) { askId = Number(p.dataset.pick); renderCurrent(); }
});
function renderCurrent() {
  const id = st?.q?.id && st.phase !== PHASE.LOBBY ? st.q.id : askId, q = info.questions.find((x) => x.id === id);
  $('#c-no').textContent = q ? `Q${q.id}` : '-'; $('#c-mode').textContent = q ? q.mode : '-'; $('#c-text').textContent = q ? q.text + (q.options ? '  ' + q.options.map((o, i) => `${i + 1}.${o}`).join(' ') : '') : '문제를 선택해 출제하세요';
  const im = $('#c-img'); im.hidden = !q?.image; if (q?.image) im.style.backgroundImage = `url("${q.image}")`;
}
$('#ask').addEventListener('click', () => { if (askId) { emit('host:ask', { id: askId }); } });
$('#gather2').addEventListener('click', () => emit('host:gather'));
$('#end').addEventListener('click', () => emit('host:end'));
$('#rank').addEventListener('click', () => emit('host:rank', { on: !rankOn }));
$('#gather').addEventListener('click', () => emit('host:gather'));
$('#coin').addEventListener('click', () => emit('host:spawnCoin'));
$('#abots').addEventListener('click', () => { emit('host:botAttack', { on: true }); emit('host:addBot', { mode: 'aggro', charId: 'random', count: 15 }); });
$('#b-clear').addEventListener('click', () => emit('host:clearBots'));
$('#reset').addEventListener('click', () => { if (confirm('점수와 동전을 모두 초기화할까요?')) emit('host:reset'); });
$('#q-add').addEventListener('click', () => {
  const text = $('#q-text').value.trim(), type = $('#q-type').value; if (!text) return;
  const raw = $('#q-ans').value.trim().toUpperCase();
  emit('host:addQuestion', { type, text, mode: $('#q-mode').value, options: $('#q-opts').value.split(',').map((x) => x.trim()).filter(Boolean), answer: type === 'ox' ? raw : Number(raw), time: Number($('#q-time').value), image: $('#q-img').value.trim() });
  $('#q-text').value = ''; $('#q-img').value = '';
});

// ---------- 참가자 · 팀 · 점수 ----------
$('#t-auto').addEventListener('click', () => emit('host:teams', { n: Number($('#t-n').value) }));
$('#plist').addEventListener('click', (e) => { const b = e.target.closest('[data-adj]'); if (b) emit('host:adjust', { id: b.dataset.id, delta: Number(b.dataset.adj) }); });
$('#plist').addEventListener('change', (e) => { const s = e.target.closest('[data-team]'); if (s) emit('host:setTeam', { id: s.dataset.team, team: Number(s.value) }); });
$('#aw-go').addEventListener('click', () => {
  const who = $('#aw-who').value, n = Number($('#aw-n').value); if (!who || !n) return;
  if (who.startsWith('t:')) { for (const p of humans) if (String(p.tm) === who.slice(2)) emit('host:adjust', { id: p.id, delta: n }); } else emit('host:adjust', { id: who, delta: n });
});

// ---------- 현실 퀴즈 ----------
$('#realok').addEventListener('click', () => emit('host:realConfirm'));
$('#realrev').addEventListener('click', () => emit('host:realReveal'));
$('#real').addEventListener('change', (e) => { const i = e.target.closest('[data-real]'); if (i) emit('host:realSet', { id: i.dataset.real, pts: Number(i.value) || 0 }); });
$('#realteams').addEventListener('click', (e) => { const b = e.target.closest('[data-rt]'); if (b) { const pts = Number(prompt(`${b.dataset.rt}팀 전원에게 줄 점수`, '1')); if (pts) emit('host:realTeam', { team: Number(b.dataset.rt), pts }); } });

let humans = [], lastKey = '', realKey = '';
socket.on('state', (s) => {
  st = s; rankOn = !!s.rank;
  humans = s.players.filter((p) => !p.b);
  $('#s-players').textContent = `${humans.length}명 접속`; $('#s-phase').textContent = phaseName[s.phase] || '-'; $('#s-left').textContent = s.left > 0 ? `⏱ ${Math.ceil(s.left)}초` : '-';
  $('#rank').classList.toggle('on', rankOn); $('#rank').textContent = rankOn ? '🏆 등수 숨기기' : '🏆 등수 공개';
  if (s.q && s.phase !== PHASE.LOBBY) curId = s.q.id; else if (s.phase === PHASE.LOBBY) curId = null;
  if (s.phase === PHASE.REVEAL && s.q) doneIds.add(s.q.id);
  $('#end').disabled = !(s.phase === PHASE.READING || s.phase === PHASE.MOVING || s.phase === PHASE.HOLD);
  $('#ask').disabled = s.phase === PHASE.READING || s.phase === PHASE.MOVING || s.phase === PHASE.HOLD;
  const total = s.q?.time || 15; $('#c-bar').style.width = s.phase === PHASE.MOVING ? `${(s.left / total) * 100}%` : '0%';
  renderCurrent();
  // 실시간 응답
  const dist = s.dist || (s.reveal && s.reveal.dist) || null, keys = s.q?.type === 'choice' ? [1, 2, 3, 4].slice(0, s.q.options?.length || 4) : ['O', 'X'], tot = Math.max(1, humans.length);
  $('#distbox').hidden = !s.q || s.q.type === 'real' || s.phase === PHASE.LOBBY;
  if (dist) { const sum = Object.values(dist).reduce((a, b) => a + b, 0), na = humans.length - (sum - (dist['-'] || 0)); $('#d-n').textContent = `${humans.length - na + (dist['-'] ? 0 : 0)} / ${humans.length}명 구역에 있음`;
    $('#dist').innerHTML = [...keys, '-'].map((k) => `<div class="dist"><b style="color:${k === 'O' || k === 1 ? '#4a86d9' : k === 'X' || k === 2 ? '#e5483c' : '#666'}">${k === '-' ? '—' : k}</b><div class="t"><i style="width:${((dist[k] || 0) / tot) * 100}%;background:${k === 'O' || k === 1 ? '#4a86d9' : k === 'X' || k === 2 ? '#e5483c' : k === 3 ? '#4fae55' : k === 4 ? '#e0902a' : '#8b8b8b'}"></i></div><span>${dist[k] || 0}</span></div>`).join(''); }
  // 현실 퀴즈 패널
  const real = s.phase === PHASE.REAL; $('#realbox').hidden = !real;
  if (real) {
    const k = humans.map((p) => p.id).join(), pend = Object.fromEntries((s.real?.pending || []).map((x) => [x.id, x.pts]));
    if (k !== realKey) { realKey = k; $('#real').innerHTML = humans.map((p) => `<div><span>${esc(p.n)}</span><input class="inp" type="number" step="0.5" data-real="${p.id}" value="${pend[p.id] ?? ''}" style="padding:3px 6px"></div>`).join(''); }
    $('#realteams').innerHTML = Array.from({ length: s.teams?.length || 0 }, (_, i) => `<button class="btn sm" data-rt="${i + 1}">${i + 1}팀 전원 +</button>`).join('');
    $('#realok').disabled = false; $('#realrev').disabled = !s.real?.confirmed; $('#realok').textContent = s.real?.confirmed ? '확인됨 ✓' : '확인';
  }
  // 참가자 표
  const lb = [...humans].sort((a, b) => b.sc - a.sc), key = JSON.stringify([lb.map((p) => [p.id, p.n, p.tm, p.sc, p.cn]), s.teams]);
  if (key !== lastKey) {
    lastKey = key; const tc = s.teams?.length || 0;
    $('#plist').innerHTML = lb.map((p, i) => `<div class="pl"><span>${i + 1}</span><span>${esc(p.n)} <small style="opacity:.6">🪙${p.cn}</small></span><select data-team="${p.id}">${['—', ...Array.from({ length: Math.max(tc, 3) }, (_, k) => `${k + 1}`)].map((t, k) => `<option value="${k}" ${p.tm === k ? 'selected' : ''}>${t}</option>`).join('')}</select><span>${fmtScore(p.sc)}</span><div class="stp"><b class="m" data-id="${p.id}" data-adj="-1">−</b><b class="p" data-id="${p.id}" data-adj="1">＋</b></div></div>`).join('') || '<div style="opacity:.6">접속한 참가자가 없어요</div>';
    $('#tt').innerHTML = (s.teams || []).map((t) => `<span class="pill" style="background:${TEAMC[t.t]}99">${t.t}팀 ${fmtScore(t.score)}</span>`).join('');
    $('#p-teams').textContent = tc ? `${tc}팀` : '팀 없음';
    $('#aw-who').innerHTML = `${(s.teams || []).map((t) => `<option value="t:${t.t}">${t.t}팀 전원</option>`).join('')}${lb.map((p) => `<option value="${p.id}">${esc(p.n)}</option>`).join('')}`;
  }
});
