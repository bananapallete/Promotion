// 서버 없는 솔로 데모: 서버와 같은 game.js 규칙을 브라우저에서 직접 돌린다.
import { Game } from '../server/game.js';
import characters from '../server/characters.json';
import { mountPicker } from '../src/charPicker.js';
import { addBtnIcons, setBtnLabel } from '../src/btnIcons.js';
import { ultNeedsAim } from '../shared/ultAim.js';
import { renderTopRank } from '../src/topRank.js';
import { dragAim } from '../src/aimDrag.js';
import { starsOf } from '../server/balance.js';
import quizzes from '../server/quizzes.test.json';
import { BU, hooks, startWorld, WORLD_W, WORLD_H } from '../src/world.js';
import { fmtScore, JOYSTICK_DEADZONE, PHASE } from '../shared/constants.js';
const urls = import.meta.glob('../public/characters/*/*.png', { eager: true, query: '?url', import: 'default' });
hooks.spriteUrl = (s, m) => urls[`../public/characters/${s}/${m}.png`];
const ultUrls = import.meta.glob('../public/ult/*.mp4', { eager: true, query: '?url', import: 'default' }); // 선택창 궁극기 시연 영상
const fxUrls = import.meta.glob('../public/fx/*.png', { eager: true, query: '?url', import: 'default' });
hooks.fxUrl = (n) => fxUrls[`../public/fx/${n}.png`];

const $ = (s) => document.querySelector(s);
addBtnIcons();
const ME = 'me';
window.__game = null; // 테스트용 접근

// ---------- 게임 ----------
const game = new Game(characters, quizzes);
window.__game = game;
game.join({ token: ME, name: '나', charId: 'blue' });
const charIds = Object.keys(characters);
game.botsCanAttack = true; // 기본 봇은 서로 싸우고, 문제 시간에는 구역으로 이동
for (let i = 0; i < 15; i++) game.addBot('aggro', charIds[Math.floor(Math.random() * charIds.length)]);

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  game.update(Math.min(0.1, (now - last) / 1000));
  last = now;
}, 33);

// ---------- 화면 ----------
const { scene } = startWorld('game', { fill: true });
window.__world = scene; // 테스트용 접근
scene.focusId = ME; // 크리티컬 화면 흔들림은 내가 때리거나 맞았을 때만
let follow = true;
let runT = 0; // 0 평소 → 1 달리는 중 (0.4초에 걸쳐 오감)
let deadT = 0; // 쓰러지면 0→1 (0.5초에 걸쳐): 줌인 + 흑백
const deathMsg = document.getElementById('deathMsg');
// 궁극기 줌인 중 화면 가장자리에서 중앙으로 몰리는 흰 도트 프레임 (시안: window.__ultFrame = 'A' 띠 / 'B' 둥근 비네트)
const frameCv = document.createElement('canvas'); frameCv.id = 'ultframe'; document.body.append(frameCv);
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
let frameKey = '';
function drawFrame() {
  const mode = window.__ultFrame || 'A', DOTP = 4, w = Math.ceil(innerWidth / DOTP), h = Math.ceil(innerHeight / DOTP), key = `${mode}${w}x${h}`;
  if (key === frameKey) return; frameKey = key; frameCv.width = w; frameCv.height = h;
  const g = frameCv.getContext('2d'), img = g.createImageData(w, h), band = 0.14 * Math.min(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = (BAY[y & 3][x & 3] + 0.5) / 16;
    const e = mode === 'A' ? 1 - Math.min(1, Math.min(x, y, w - 1 - x, h - 1 - y) / band) : Math.max(0, (Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) - 0.72) / 0.5);
    if (t < e * 0.85) { const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = 235; }
  }
  g.putImageData(img, 0, 0);
}
let ultAt = -1e9; // 내가 궁극기를 쓴 시각 (카메라 줌인용)
const ultZoom = () => { // 0.15초에 확 들어갔다가 0.75초 유지, 0.5초에 걸쳐 돌아옴 → 0~1
  const t = (performance.now() - ultAt) / 1000, e = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
  return t < 0 ? 0 : t < 0.15 ? e(t / 0.15) : t < 0.9 ? 1 : t < 1.4 ? e(1 - (t - 0.9) / 0.5) : 0;
};
scene.onFrame = (sc, dt) => {
  const cam = sc.cameras.main;
  const v = sc.views.get(ME);
  const w = sc.scale.width, h = sc.scale.height;
  if (follow && v) {
    // 세로 화면은 폭 16.5칸, 가로 화면은 폭 24칸이 보이도록 (1칸 = 몸 폭 1개)
    runT = Math.max(0, Math.min(1, runT + (v.p.a === 'run' ? dt : -dt) / 400));
    const ease = runT < 0.5 ? 4 * runT ** 3 : 1 - (-2 * runT + 2) ** 3 / 2; // 이즈 인/아웃
    const dead = !!v.p.st; deadT = Math.max(0, Math.min(1, deadT + (dead ? dt : -dt) / 500));
    const de = deadT < 0.5 ? 4 * deadT ** 3 : 1 - (-2 * deadT + 2) ** 3 / 2;
    drawFrame(); frameCv.style.opacity = ultZoom();
    cam.setZoom((w / ((h > w ? 16.5 : 24) * BU * (1 + 0.3 * ease))) * (1 + 0.5 * ultZoom()) * (1 + (v.p.s === 'egg' ? 1.5 : 0.45) * de)); // 알이 되면 크게 줌인. 달리면 1.3배 줌 아웃, 궁극기는 1.22배, 쓰러지면 1.45배 줌인
    document.body.classList.toggle('dead', dead && v.p.s !== 'egg'); // 알이 된 동안엔 흑백 대신 컬러로(폭발 연출)
    deathMsg.hidden = !dead; if (dead) deathMsg.textContent = `${Math.ceil(v.p.rv)}초 뒤 부활합니다`;
    cam.centerOn(v.x, v.y - 30);
  } else {
    cam.setZoom(Math.min(w / WORLD_W, h / WORLD_H));
    cam.centerOn(WORLD_W / 2, WORLD_H / 2);
  }
};

const phaseText = { [PHASE.LOBBY]: '', [PHASE.READING]: '읽기', [PHASE.MOVING]: '이동', [PHASE.REVEAL]: '정답' };
setInterval(() => {
  const s = { ...game.snapshot(), lb: game.leaderboard() };
  scene.applyState(s);
  if (s.ev.some((e) => e.e === 'ult' && e.id === ME)) ultAt = performance.now();
  hud(s);
  // 조준 표시: 공격 버튼을 드래그 중이면 그 방향(직접 조준), 아니면 자동 조준 대상
  const dragLen = Math.hypot(atkVec.x, atkVec.y);
  const dragging = atkId !== null && dragLen > 16;
  const info = game.aimPreview(ME, dragging ? { x: atkVec.x / dragLen, y: atkVec.y / dragLen, m: Math.min(1, dragLen / 70) } : null);
  scene.setAim(info && { id: ME, ...info, dragging });
  const ul = Math.hypot(ultDrag.vec.x, ultDrag.vec.y), cu = game.players.get(ME)?.cfg.ult; // 궁극기를 끌어 조준 중이면 방향·거리 표시
  scene.setUltAim(ultDrag.active && ul > 16 && cu ? { id: ME, dx: ultDrag.vec.x / ul, dy: ultDrag.vec.y / ul, len: (cu.range ?? cu.dist ?? 6) * Math.min(1, ul / 70) } : null);
}, 50);

function hud(s) {
  const p = s.players.find((x) => x.id === ME);
  if (p) {
    showAmmo(p);
    $('#hp').style.width = `${(p.hp / p.mhp) * 100}%`;
    $('#rg').style.width = `${(p.rg / p.mrg) * 100}%`;
    $('#score').textContent = `🪙${p.cn} ${fmtScore(p.sc)}`;
    renderTopRank($('#toprank'), s.players.map((x) => ({ id: x.id, name: x.n, score: x.sc })).sort((a, b) => b.score - a.score), ME);
    $('#flag').textContent = p.st ? '기절' : p.inv ? '무적' : '';
  }
  const counting = s.phase === PHASE.READING || s.phase === PHASE.MOVING;
  $('#phase').textContent = ((phaseText[s.phase] || '') + (counting ? ` ${Math.ceil(s.left)}` : '')).trim();

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
    rv.textContent = `정답 ${ans}` + (mine ? ` ${mine.correct ? `+${mine.gain}${mine.rank ? ` ${mine.rank}등` : ''}` : (mine.zone == null ? '무응답' : '오답') + (mine.dropped ? ` 🪙-${mine.dropped}` : '')}` : '');
    rv.className = mine?.correct ? 'ok' : 'bad';
  } else rv.hidden = true;
}


// 공격 버튼은 탄이 없으면 흐리게 (탄창 게이지는 머리 위 내 바에만)
function showAmmo(p) {
  const ub = document.getElementById('btnUlt'); ub.style.setProperty('--f', p.ul); ub.classList.toggle('ready', !!p.ur);
  document.getElementById('btnAtk').style.opacity = p.am >= 1 ? 0.7 : 0.3;
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
const skillType = () => game.players.get(ME)?.cfg.skill?.type || 'run';
const syncSkill = () => { setBtnLabel(runBtn, skillType() === 'dash' ? '대쉬' : '달리기'); };
const setRun = (v) => { input.run = v; runBtn.classList.toggle('on', v); sendInput(); };
// 스킬 버튼: 달리기는 누르고 있는 동안, 대쉬는 탭하면 한 번
runBtn.addEventListener('pointerdown', (e) => {
  runBtn.setPointerCapture(e.pointerId);
  if (skillType() === 'dash') { game.skill(ME); runBtn.classList.add('on'); } else setRun(true);
});
runBtn.addEventListener('pointerup', () => setRun(false));
runBtn.addEventListener('pointercancel', () => setRun(false));

// 궁극기: 충전되면 탭 (키보드 K)
const ultBtn = $('#btnUlt');
const ultDrag = dragAim(ultBtn, $('#aimU'), (a) => game.ult(ME, a), () => ultNeedsAim(game.players.get(ME)?.cfg.ult)); // 탭 = 자동, 드래그 후 놓기 = 직접 조준

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
  game.attack(ME, d > 16 ? { x: atkVec.x / d, y: atkVec.y / d, m: Math.min(1, d / 70) } : null);
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
  if (k === 'shift' && !e.repeat && skillType() === 'dash') game.skill(ME);
  if ((k === ' ' || k === 'j') && !e.repeat) { game.attack(ME, null); e.preventDefault(); return; }
  if (k === 'k' && !e.repeat) { game.ult(ME, null); return; }
  if (!keys.has(k)) { keys.add(k); keyMove(); }
});
addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); keyMove(); });

// ---------- 테스트 패널 ----------
// 캐릭터 선택 그리드와 봇 종류
// 상단 UI 숨기기/보이기
$('#uiToggle').addEventListener('click', () => document.body.classList.toggle('hideui'));

// 캐릭터 변경: 상단 버튼 하나 → 선택 창
function pickChar(id) {
  const p = game.players.get(ME);
  p.charId = id; p.cfg = characters[id]; p.dash = null; game._refill(p); syncSkill();
  if (p.cfg.ult) p.ult = p.cfg.ult.need; // 궁극기 체험: 시작·캐릭터 변경 때마다 게이지를 가득 채움
}
$('#charbtn').addEventListener('click', () => { picker.setValue(game.players.get(ME).charId); $('#pick').hidden = false; });
// 첫 화면: 캐릭터 선택 (탭 필터 + 카드)
const picker = mountPicker($('#pickroot'), (() => { const st = starsOf(characters); return Object.fromEntries(charIds.map((id) => [id, { ...characters[id], sk: characters[id].skill, stars: st[id] }])); })(), { spriteUrl: hooks.spriteUrl, ultUrl: (id) => ultUrls[`../public/ult/${id}.mp4`], selected: charIds[0] });
// 첫 화면: 닉네임 모달 → 캐릭터 선택. 저장된 닉네임이 있으면 모달은 건너뜀
const NAME_KEY = 'quiz_demo_name', nickIn = $('#nickin');
const saved = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; } })();
if (saved) game.players.get(ME).name = saved; else { $('#pick').hidden = true; $('#nick').hidden = false; setTimeout(() => nickIn.focus(), 50); }
function nickDone() {
  const nm = nickIn.value.trim();
  if (!nm) { nickIn.classList.remove('bad'); void nickIn.offsetWidth; nickIn.classList.add('bad'); return; }
  game.players.get(ME).name = nm; try { localStorage.setItem(NAME_KEY, nm); } catch { /* 저장 불가 */ }
  nickIn.blur(); $('#nick').hidden = true; $('#pick').hidden = false; // blur: 모바일 키보드·확대 해제
}
$('#nickgo').addEventListener('click', nickDone);
nickIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') nickDone(); });
$('#pickgo').addEventListener('click', () => {
  pickChar(picker.value()); $('#pick').hidden = true; $('#pickgo').textContent = '선택'; });
$('#b-char').innerHTML = charIds.map((id) => `<option value="${id}">${characters[id].name}</option>`).join('');
$('#b-attack').checked = true;
$('#b-attack').addEventListener('change', (e) => { game.botsCanAttack = e.target.checked; });
$('#gear').addEventListener('click', () => { $('#panel').hidden = !$('#panel').hidden; });
$('#panel').addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]')?.dataset;
  if (!a) return;
  switch (a.act) {
    case 'ask': game.ask(Number(a.id)); break;
    case 'end': game.endQuestion(); break;
    case 'gather': game.gather(); break;
    case 'coin': game.spawnCoin(); break;
    case 'coin5': game.giveCoins(ME, 5); break;
    case 'ko': game.knockOut(ME); break;
    case 'ultfull': { const m = game.players.get(ME); if (m.cfg.ult) m.ult = m.cfg.ult.need; break; }
    case 'coinnear': { const m = game.players.get(ME); game.spawnCoin(m.x + 2.2, m.y); break; }
    case 'reset': game.resetScores(); break;
    case 'clear': game.clearBots(); break;
    case 'abots': // 공격하는 봇 15마리 (캐릭터는 무작위, 봇끼리도 서로 공격)
      game.botsCanAttack = true; $('#b-attack').checked = true;
      for (let i = 0; i < 15; i++) game.addBot('aggro', 'random');
      break;
    case 'bot': game.addBot($('#b-mode').value, $('#b-char').value); break;
    case 'view': follow = a.v === 'follow'; document.querySelectorAll('[data-act=view]').forEach((b) => b.classList.toggle('sel', b === e.target)); break;
    case 'char': pickChar(a.id); break;
  }
});

