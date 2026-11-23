import { io } from 'socket.io-client';
import { PHASE } from '../shared/constants.js';

const $ = (s) => document.querySelector(s);
const socket = io();
const LS = 'quiz_player';
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } };
const save = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } };

let me = null; // { token, name, charId }

// ---------- 입장 ----------
async function buildJoin() {
  const chars = await (await fetch('/api/characters')).json();
  $('#chars').innerHTML = Object.entries(chars).map(([id, c], i) =>
    `<label><input type="radio" name="char" value="${id}" ${i === 0 ? 'checked' : ''}/> ${c.name}</label>`).join('');
  $('#join-ui').hidden = false;
}
function join(data) {
  socket.emit('join', data, (res) => {
    if (!res?.ok) { $('#err').textContent = res?.error || '입장 실패'; showJoin(); return; }
    me = { token: res.token, name: res.name, charId: res.charId };
    save(me);
    $('#join-ui').hidden = true;
    $('#game-ui').hidden = false;
    $('#me').textContent = res.name;
  });
}
function showJoin() { $('#game-ui').hidden = true; buildJoin(); }

$('#go').addEventListener('click', () => {
  const name = $('#name').value.trim();
  if (!name) { $('#err').textContent = '닉네임을 입력하세요'; return; }
  const charId = document.querySelector('input[name=char]:checked')?.value;
  join({ name, charId });
});
$('#menu').addEventListener('click', () => { save(null); location.reload(); });

// 연결(재연결 포함)될 때마다 저장된 정보로 자동 입장 → 외형과 점수 복원
socket.on('connect', () => {
  const saved = me || load();
  if (saved) join({ token: saved.token, name: saved.name, charId: saved.charId });
  else buildJoin();
});

// ---------- 입력 ----------
const input = { mx: 0, my: 0, run: false };
let dirty = false;
const mark = () => { dirty = true; };
setInterval(() => { if (dirty) { dirty = false; socket.emit('input', { ...input }); } }, 50);

// 조이스틱
const pad = $('#pad'), stick = $('#stick');
let padId = null, padC = { x: 0, y: 0 }, padR = 75;
function moveStick(e) {
  let dx = e.clientX - padC.x, dy = e.clientY - padC.y;
  const d = Math.hypot(dx, dy), k = d > padR ? padR / d : 1;
  dx *= k; dy *= k;
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
  const mx = dx / padR, my = dy / padR;
  input.mx = Math.hypot(mx, my) < 0.12 ? 0 : mx;
  input.my = Math.hypot(mx, my) < 0.12 ? 0 : my;
  mark();
}
pad.addEventListener('pointerdown', (e) => {
  pad.setPointerCapture(e.pointerId); padId = e.pointerId;
  const r = pad.getBoundingClientRect();
  padC = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; padR = r.width / 2;
  moveStick(e);
});
pad.addEventListener('pointermove', (e) => { if (e.pointerId === padId) moveStick(e); });
const padEnd = (e) => {
  if (e.pointerId !== padId) return;
  padId = null; stick.style.transform = ''; input.mx = 0; input.my = 0; mark();
};
pad.addEventListener('pointerup', padEnd);
pad.addEventListener('pointercancel', padEnd);

// 달리기 (누르고 있는 동안)
const runBtn = $('#btnRun');
const setRun = (v) => { input.run = v; runBtn.classList.toggle('on', v); mark(); };
runBtn.addEventListener('pointerdown', (e) => { runBtn.setPointerCapture(e.pointerId); setRun(true); });
runBtn.addEventListener('pointerup', () => setRun(false));
runBtn.addEventListener('pointercancel', () => setRun(false));

// 공격: 탭 = 자동 조준, 드래그 후 놓기 = 그 방향으로 직접 조준
const atk = $('#btnAtk'), aim = $('#aim');
let atkId = null, atkStart = null, atkVec = { x: 0, y: 0 };
atk.addEventListener('pointerdown', (e) => {
  atk.setPointerCapture(e.pointerId); atkId = e.pointerId; atkStart = { x: e.clientX, y: e.clientY }; atkVec = { x: 0, y: 0 };
});
atk.addEventListener('pointermove', (e) => {
  if (e.pointerId !== atkId) return;
  atkVec = { x: e.clientX - atkStart.x, y: e.clientY - atkStart.y };
  const d = Math.hypot(atkVec.x, atkVec.y);
  aim.style.opacity = d > 16 ? 1 : 0;
  aim.style.width = `${Math.min(70, d)}px`;
  aim.style.transform = `rotate(${Math.atan2(atkVec.y, atkVec.x)}rad)`;
});
const atkEnd = (e, cancel) => {
  if (e.pointerId !== atkId) return;
  atkId = null; aim.style.opacity = 0;
  if (cancel) return;
  const d = Math.hypot(atkVec.x, atkVec.y);
  socket.emit('attack', d > 16 ? { x: atkVec.x / d, y: atkVec.y / d } : null);
};
atk.addEventListener('pointerup', (e) => atkEnd(e, false));
atk.addEventListener('pointercancel', (e) => atkEnd(e, true));

// 키보드 (PC에서 테스트용): WASD/방향키 이동, Shift 달리기, Space/J 공격
const keys = new Set();
function keyMove() {
  const mx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const my = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const l = Math.hypot(mx, my) || 1;
  input.mx = mx / l; input.my = my / l; input.run = keys.has('shift'); mark();
}
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if ((k === ' ' || k === 'j') && !e.repeat) { socket.emit('attack', null); e.preventDefault(); return; }
  if (!keys.has(k)) { keys.add(k); keyMove(); }
});
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); keyMove(); });

// ---------- 상태 표시 ----------
const phaseText = { [PHASE.LOBBY]: '대기 중 · 화면을 보세요', [PHASE.READING]: '문제를 읽는 중…', [PHASE.MOVING]: '답 구역으로 이동!', [PHASE.REVEAL]: '정답 공개' };
socket.on('state', (s) => {
  if (!me) return;
  const p = s.players.find((x) => x.id === me.token);
  if (!p) return;
  $('#hp').style.width = `${(p.hp / p.mhp) * 100}%`;
  $('#rg').style.width = `${(p.rg / p.mrg) * 100}%`;
  $('#score').textContent = `${p.sc}점`;
  const left = s.left > 0 ? ` · ${Math.ceil(s.left)}초` : '';
  $('#phase').textContent = (phaseText[s.phase] || '') + left;
  $('#flag').textContent = p.st ? '기절! 잠시 움직일 수 없어요' : p.inv ? '무적' : '';

  const r = s.phase === PHASE.REVEAL && s.reveal?.results.find((x) => x.id === me.token);
  $('#result').textContent = r ? (r.correct ? `정답! +${r.gain}점` : r.zone == null ? '무응답' : '오답') : '';
  $('#result').style.color = r?.correct ? '#7ee0a1' : '#ff9b9b';

  if (s.ev?.some((e) => e.e === 'hit' && e.id === me.token)) navigator.vibrate?.(40);
});
