import { io } from 'socket.io-client';
import { fmtScore, JOYSTICK_DEADZONE, PHASE } from '../shared/constants.js';

const $ = (s) => document.querySelector(s);
const socket = io();
const LS = 'quiz_player';
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch { return null; } };
const save = (v) => { try { localStorage.setItem(LS, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } };

let me = null; // { token, name, charId }

// ---------- 입장 ----------
// 선택 카드의 미리보기: 대기 모션 첫 프레임에 임시 색(tint)을 곱해서 그린다
function drawPreview(canvas, c, img) {
  const g = canvas.getContext('2d'), n = canvas.width, size = Math.round(n * 0.9 * (c.scale || 1));
  const t = document.createElement('canvas'); t.width = t.height = n;
  const x = t.getContext('2d');
  const ox = Math.round((n - size) / 2 + size * 0.1), oy = n - size + Math.round(size * 0.06); // 발(그림자)이 아래쪽에 오게
  x.drawImage(img, 0, 0, 256, 256, ox, oy, size, size);
  if (c.tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = c.tint; x.fillRect(0, 0, n, n); x.globalCompositeOperation = 'destination-in'; x.drawImage(img, 0, 0, 256, 256, ox, oy, size, size); }
  g.clearRect(0, 0, n, n); g.drawImage(t, 0, 0);
}
async function buildJoin() {
  const chars = await (await fetch('/api/characters')).json();
  const entries = Object.entries(chars);
  $('#chars').innerHTML = entries.map(([id, c], i) =>
    `<label><input type="radio" name="char" value="${id}" ${i === 0 ? 'checked' : ''}/><canvas width="104" height="104" data-id="${id}"></canvas><b>${c.name}</b><small>${c.type === 'melee' ? '근접' : '원거리'} · ${c.skill === 'dash' ? '대쉬' : '달리기'}</small></label>`).join('');
  $('#join-ui').hidden = false;
  const bySprite = {};
  for (const e of entries) (bySprite[e[1].sprite] ||= []).push(e);
  for (const [sprite, ids] of Object.entries(bySprite)) {
    const img = new Image();
    img.onload = () => ids.forEach(([id, c]) => drawPreview(document.querySelector(`canvas[data-id="${id}"]`), c, img));
    img.src = `/characters/${sprite}/idle.png`;
  }
}
function join(data) {
  socket.emit('join', data, (res) => {
    if (!res?.ok) { $('#err').textContent = res?.error || '입장 실패'; showJoin(); return; }
    me = { token: res.token, name: res.name, charId: res.charId, skill: res.cfg?.skill?.type || 'run' };
    runBtn.textContent = me.skill === 'dash' ? '대쉬' : '달리기';
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

// 조이스틱: 화면 왼쪽 절반 어디든 터치하면 그 지점이 중심이 된다 (플로팅 조이스틱)
const zone = $('#lzone'), pad = $('#pad'), stick = $('#stick'), hint = $('#padHint');
let padId = null, padC = { x: 0, y: 0 }, padR = 66;
function moveStick(e) {
  let dx = e.clientX - padC.x, dy = e.clientY - padC.y;
  const d = Math.hypot(dx, dy), k = d > padR ? padR / d : 1;
  dx *= k; dy *= k;
  stick.style.transform = `translate(${dx}px, ${dy}px)`;
  // 데드존 안쪽은 정지, 바깥은 거리와 상관없이 방향만 전달 (속도는 항상 일정)
  const dist = Math.hypot(dx, dy);
  if (dist < padR * JOYSTICK_DEADZONE) { input.mx = 0; input.my = 0; }
  else { input.mx = dx / dist; input.my = dy / dist; }
  mark();
}
zone.addEventListener('pointerdown', (e) => {
  if (padId !== null) return; // 손가락 하나만 조이스틱으로
  zone.setPointerCapture(e.pointerId); padId = e.pointerId;
  padC = { x: e.clientX, y: e.clientY }; padR = pad.offsetWidth / 2;
  pad.style.left = `${padC.x}px`; pad.style.top = `${padC.y}px`;
  pad.classList.add('on'); hint.classList.add('off');
  moveStick(e);
});
zone.addEventListener('pointermove', (e) => { if (e.pointerId === padId) moveStick(e); });
const padEnd = (e) => {
  if (e.pointerId !== padId) return;
  padId = null; stick.style.transform = ''; pad.classList.remove('on'); hint.classList.remove('off');
  input.mx = 0; input.my = 0; mark();
};
zone.addEventListener('pointerup', padEnd);
zone.addEventListener('pointercancel', padEnd);

// 달리기 (누르고 있는 동안)
const runBtn = $('#btnRun');
const setRun = (v) => { input.run = v; runBtn.classList.toggle('on', v); mark(); };
// 스킬 버튼: 달리기는 누르고 있는 동안, 대쉬는 탭하면 한 번
runBtn.addEventListener('pointerdown', (e) => {
  runBtn.setPointerCapture(e.pointerId);
  if (me?.skill === 'dash') { socket.emit('skill'); runBtn.classList.add('on'); } else setRun(true);
});
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
  socket.emit('attack', d > 16 ? { x: atkVec.x / d, y: atkVec.y / d, m: Math.min(1, d / 70) } : null);
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
  if (k === 'shift' && !e.repeat && me?.skill === 'dash') socket.emit('skill');
  if ((k === ' ' || k === 'j') && !e.repeat) { socket.emit('attack', null); e.preventDefault(); return; }
  if (!keys.has(k)) { keys.add(k); keyMove(); }
});
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); keyMove(); });

// ---------- 상태 표시 ----------
const phaseText = { [PHASE.LOBBY]: '', [PHASE.READING]: '읽기', [PHASE.MOVING]: '이동', [PHASE.REVEAL]: '정답' };
socket.on('state', (s) => {
  if (!me) return;
  const p = s.players.find((x) => x.id === me.token);
  if (!p) return;
  $('#hp').style.width = `${(p.hp / p.mhp) * 100}%`;
  $('#rg').style.width = `${(p.rg / p.mrg) * 100}%`;
  $('#score').textContent = `🪙${p.cn} ${fmtScore(p.sc)}`;
  const left = s.left > 0 ? ` ${Math.ceil(s.left)}` : '';
  $('#phase').textContent = ((phaseText[s.phase] || '') + left).trim();
  $('#flag').textContent = p.st ? '기절' : p.inv ? '무적' : '';

  const r = s.phase === PHASE.REVEAL && s.reveal?.results.find((x) => x.id === me.token);
  $('#result').textContent = r ? (r.correct ? `+${r.gain}` : (r.zone == null ? '무응답' : '오답') + (r.dropped ? ` 🪙-${r.dropped}` : '')) : '';
  $('#result').style.color = r?.correct ? '#7ee0a1' : '#ff9b9b';

  if (s.ev?.some((e) => e.e === 'hit' && e.id === me.token)) navigator.vibrate?.(40);
});
