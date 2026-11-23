// 서버 없는 솔로 데모: 서버와 같은 game.js 규칙을 브라우저에서 직접 돌린다.
import { Game } from '../server/game.js';
import characters from '../server/characters.json';
import quizzes from '../server/quizzes.test.json';
import { BU, hooks, startWorld, WORLD_W, WORLD_H } from '../src/world.js';
import { JOYSTICK_DEADZONE, PHASE } from '../shared/constants.js';
import idle from '../public/characters/blue/idle.png';
import walk from '../public/characters/blue/walk.png';
import run from '../public/characters/blue/run.png';
import combo from '../public/characters/blue/combo.png';

hooks.spriteUrl = (_s, m) => ({ idle, walk, run, combo })[m];

const $ = (s) => document.querySelector(s);
const ME = 'me';
window.__game = null; // 테스트용 접근

// ---------- 게임 ----------
const game = new Game(characters, quizzes);
window.__game = game;
game.join({ token: ME, name: '나', charId: 'blue' });
game.addBot('idle', 'blue');
game.addBot('idle', 'blue');
game.addBot('wander', 'blue_ranged');

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  game.update(Math.min(0.1, (now - last) / 1000));
  last = now;
}, 33);

// ---------- 화면 ----------
const { scene } = startWorld('game', { fill: true });
let follow = true;
scene.onFrame = (sc) => {
  const cam = sc.cameras.main;
  const v = sc.views.get(ME);
  const w = sc.scale.width, h = sc.scale.height;
  if (follow && v) {
    // 세로 화면은 폭 16.5칸, 가로 화면은 폭 24칸이 보이도록 (1칸 = 몸 폭 1개)
    cam.setZoom(w / ((h > w ? 16.5 : 24) * BU));
    cam.centerOn(v.x, v.y - 30);
  } else {
    cam.setZoom(Math.min(w / WORLD_W, h / WORLD_H));
    cam.centerOn(WORLD_W / 2, WORLD_H / 2);
  }
};

const phaseText = { [PHASE.LOBBY]: '아래 ⚙ 패널에서 문제를 출제해보세요', [PHASE.READING]: '문제를 읽는 중…', [PHASE.MOVING]: '답 구역으로 이동!', [PHASE.REVEAL]: '정답 공개' };
setInterval(() => {
  const s = { ...game.snapshot(), lb: game.leaderboard() };
  scene.applyState(s);
  hud(s);
  // 조준 표시: 공격 버튼을 드래그 중이면 그 방향(직접 조준), 아니면 자동 조준 대상
  const dragLen = Math.hypot(atkVec.x, atkVec.y);
  const dragging = atkId !== null && dragLen > 16;
  const info = game.aimPreview(ME, dragging ? { x: atkVec.x / dragLen, y: atkVec.y / dragLen } : null);
  scene.setAim(info && { id: ME, ...info, dragging });
}, 50);

function hud(s) {
  const p = s.players.find((x) => x.id === ME);
  if (p) {
    $('#hp').style.width = `${(p.hp / p.mhp) * 100}%`;
    $('#rg').style.width = `${(p.rg / p.mrg) * 100}%`;
    $('#score').textContent = `${p.sc}점`;
    $('#flag').textContent = p.st ? '기절! 잠시 움직일 수 없어요' : p.inv ? '무적' : '';
  }
  const counting = s.phase === PHASE.READING || s.phase === PHASE.MOVING;
  $('#phase').textContent = (phaseText[s.phase] || '') + (counting ? ` · ${Math.ceil(s.left)}초` : '');

  const banner = $('#banner');
  if (s.q && s.phase !== PHASE.LOBBY) {
    banner.hidden = false;
    $('#qn').textContent = `문제 ${s.q.id}`;
    $('#qt').textContent = s.q.text;
  } else banner.hidden = true;

  const rv = $('#reveal');
  if (s.phase === PHASE.REVEAL && s.reveal) {
    const mine = s.reveal.results.find((r) => r.id === ME);
    const ans = s.q.type === 'choice' ? `${s.reveal.answer}번` : s.reveal.answer;
    rv.hidden = false;
    rv.textContent = `정답 ${ans} · ` + (mine ? (mine.correct ? `정답! +${mine.gain}점${mine.rank ? ` (${mine.rank}등)` : ''}` : mine.zone == null ? '무응답' : '오답') : '');
    rv.className = mine?.correct ? 'ok' : 'bad';
  } else rv.hidden = true;
}

// ---------- 조작 ----------
const input = { mx: 0, my: 0, run: false };
const sendInput = () => game.setInput(ME, input);

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
  sendInput();
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
  input.mx = 0; input.my = 0; sendInput();
};
zone.addEventListener('pointerup', padEnd);
zone.addEventListener('pointercancel', padEnd);

const runBtn = $('#btnRun');
const setRun = (v) => { input.run = v; runBtn.classList.toggle('on', v); sendInput(); };
runBtn.addEventListener('pointerdown', (e) => { runBtn.setPointerCapture(e.pointerId); setRun(true); });
runBtn.addEventListener('pointerup', () => setRun(false));
runBtn.addEventListener('pointercancel', () => setRun(false));

// 공격: 탭 = 자동 조준, 드래그 후 놓기 = 그 방향으로 직접 조준
const atk = $('#btnAtk'), aim = $('#aim');
let atkId = null, atkStart = null, atkVec = { x: 0, y: 0 };
atk.addEventListener('pointerdown', (e) => { atk.setPointerCapture(e.pointerId); atkId = e.pointerId; atkStart = { x: e.clientX, y: e.clientY }; atkVec = { x: 0, y: 0 }; });
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
  game.attack(ME, d > 16 ? { x: atkVec.x / d, y: atkVec.y / d } : null);
};
atk.addEventListener('pointerup', (e) => atkEnd(e, false));
atk.addEventListener('pointercancel', (e) => atkEnd(e, true));

// 키보드 (PC): WASD/방향키, Shift, Space/J
const keys = new Set();
function keyMove() {
  const mx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const my = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const l = Math.hypot(mx, my) || 1;
  input.mx = mx / l; input.my = my / l; input.run = keys.has('shift'); sendInput();
}
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ((k === ' ' || k === 'j') && !e.repeat) { game.attack(ME, null); e.preventDefault(); return; }
  if (!keys.has(k)) { keys.add(k); keyMove(); }
});
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); keyMove(); });

// ---------- 테스트 패널 ----------
$('#b-attack').addEventListener('change', (e) => { game.botsCanAttack = e.target.checked; });
$('#gear').addEventListener('click', () => { $('#panel').hidden = !$('#panel').hidden; });
$('#panel').addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]')?.dataset;
  if (!a) return;
  switch (a.act) {
    case 'ask': game.ask(Number(a.id)); break;
    case 'end': game.endQuestion(); break;
    case 'gather': game.gather(); break;
    case 'reset': game.resetScores(); break;
    case 'clear': game.clearBots(); break;
    case 'bot': game.addBot($('#b-mode').value, $('#b-char').value); break;
    case 'view': follow = a.v === 'follow'; document.querySelectorAll('[data-act=view]').forEach((b) => b.classList.toggle('sel', b === e.target)); break;
    case 'char': {
      const p = game.players.get(ME);
      p.charId = a.id; p.cfg = characters[a.id]; game._refill(p);
      document.querySelectorAll('[data-act=char]').forEach((b) => b.classList.toggle('sel', b === e.target));
      break;
    }
  }
});

