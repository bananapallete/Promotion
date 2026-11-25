// 캐릭터 선택(시안 B): 위에 고른 캐릭터를 크게(대기 2초 → 공격 3번 → 달리기 3초 → 쓰러짐 반복) + 능력 3줄, 아래에 역할 탭과 작은 카드 모음.
import sprites from '../shared/sprites.json';
import { RUN_DRAIN, SPRITE } from '../shared/constants.js';
import { HEART_PALETTE, heartRows, SHOE_PALETTE, SHOE_ROWS, SWORD_ROWS } from '../shared/itemPixels.js';

const TABS = [['all', '전체'], ['rec', '추천'], ['melee', '근접'], ['tank', '탱커'], ['speed', '스피드'], ['ranged', '원거리']];
const ROLE_NAME = { melee: '근접', tank: '탱커', speed: '스피드', ranged: '원거리' };
const BLUE = { idle: 4, walk: 7, run: 7, combo: 8, die: 6 }; // sprites.json에 없는 기본 캐릭터
const IDLE_MS = 2000, ATK_MS = 450, RUN_MS = 3000, DIE_HOLD_MS = 800, CELL = 256;

const CSS = `
.pk{--cream:#e8d0a9;--cream-hi:#f6e6c8;--wood:#b27c53;--wood-dk:#7a4e32;--text:#5a3a24;--leaf:#b4d36a;--leaf-dk:#6e9a3a;--navy:#14122b;--rose:#b34a5c;--empty:#7f9298;color:var(--text);display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.pk .pk-hero{display:grid;grid-template-columns:138px minmax(0,1fr);gap:6px;padding:10px;background:var(--cream-hi);border:3px solid #d9a63a;border-radius:12px;box-shadow:0 4px 0 #c18a1f,inset 0 0 0 3px #fff7}
.pk .pk-stage{position:relative;height:148px;border-radius:10px;border:3px solid var(--leaf-dk);background:repeating-conic-gradient(#8fc27a 0 25%,#7db469 0 50%) 0 0/28px 28px;display:grid;place-items:end center;overflow:hidden}
.pk .pk-stage canvas{width:138px;height:138px;margin-bottom:-6px}
.pk .pk-info{min-width:0;display:grid;gap:5px;align-content:start}
.pk .pk-nm{font-size:22px;font-weight:900;line-height:1.05}
.pk .pk-pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:11px;font-weight:900;color:#fff;border:2px solid var(--navy);text-shadow:0 1px 0 #0006;margin-right:4px}
.pk .pk-pill.melee{background:#e0702a}.pk .pk-pill.tank{background:#4a86d9}.pk .pk-pill.speed{background:#4fae55}.pk .pk-pill.ranged{background:#9a62d6}.pk .pk-pill.pk-rec{background:#f0a000}
.pk .pk-bars{display:grid;gap:4px;font-size:12px;font-weight:700}
.pk .pk-stat{display:flex;align-items:center;justify-content:space-between;white-space:nowrap}
.pk .pk-stat div{display:flex;align-items:center;gap:6px}
.pk canvas.pk-ic{width:18px;height:18px;image-rendering:pixelated;flex:none}
.pk .pk-pips{display:inline-flex;gap:2px;flex:none}
.pk .pk-pips i{width:9px;height:9px;flex:none;background:var(--empty);border:1.5px solid var(--navy)}
.pk .pk-pips.hp i.on{background:var(--rose);box-shadow:inset 0 2px 0 #e9a0ab88}.pk .pk-pips.atk i.on{background:#e0902a;box-shadow:inset 0 2px 0 #ffd98a88}.pk .pk-pips.spd i.on{background:#3b82f6;box-shadow:inset 0 2px 0 #a5d0ff88}
.pk .pk-abil{grid-column:1/-1;display:grid;gap:5px;margin-top:2px}
.pk .pk-abil div{display:grid;grid-template-columns:46px 1fr;gap:8px;align-items:center;background:#fff8e4;border:2px solid #e0c98a;border-radius:6px;padding:5px 8px;font-size:12.5px;line-height:1.3}
.pk .pk-abil i{font-style:normal;font-size:12px;font-weight:900;color:#fff;text-align:center;border-radius:4px;border:2px solid var(--navy);padding:1px 0}
.pk .pk-abil .k1 i{background:#e0702a}.pk .pk-abil .k2 i{background:#4a86d9}.pk .pk-abil .k3 i{background:#9a62d6}
.pk .pk-bar{display:flex;gap:5px;align-items:center}
.pk .pk-tabs{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;min-width:0;flex:1}
.pk .pk-tabs::-webkit-scrollbar{display:none}
.pk .pk-tabs button,.pk .pk-rnd{flex:1 1 auto;white-space:nowrap;padding:6px 7px;border:2px solid #d9a63a;border-radius:6px;background:#fff8e4;color:var(--text);font:700 12px/1 inherit;box-shadow:0 2px 0 #c18a1f;cursor:pointer}
.pk .pk-tabs button.on{background:#f0a000;border-color:#c18a1f;color:#fff}
.pk .pk-rnd{flex:none;background:var(--cream-hi);border-color:var(--wood);box-shadow:0 2px 0 var(--wood-dk)}
.pk .pk-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.pk .pk-tile{position:relative;display:grid;justify-items:center;padding:4px 2px 3px;background:#fff;border:2px solid #e5d9b8;border-radius:8px;box-shadow:0 2px 0 #c9b98a;cursor:pointer}
.pk .pk-tile .pk-pic{width:100%;aspect-ratio:1;background:#ddd8cf;border-radius:5px;display:grid;place-items:center}
.pk .pk-tile canvas.pk-sp{width:92%}
.pk .pk-tile small{font-size:10.5px;font-weight:900;margin-top:2px;letter-spacing:-.02em;white-space:nowrap}
.pk .pk-tile.sel{border-color:#f0a000;box-shadow:0 0 0 3px #ffd54a,0 2px 0 #c18a1f}
.pk .pk-tile .pk-dot{position:absolute;top:3px;left:3px;width:9px;height:9px;border-radius:50%;border:2px solid var(--navy)}
.pk .pk-tile .pk-dot.melee{background:#e0702a}.pk .pk-tile .pk-dot.tank{background:#4a86d9}.pk .pk-tile .pk-dot.speed{background:#4fae55}.pk .pk-tile .pk-dot.ranged{background:#9a62d6}
.pk .pk-tile .pk-rec{position:absolute;top:2px;right:3px;color:#f0a000;font-size:12px;text-shadow:-1px 0 var(--navy),1px 0 var(--navy),0 1px var(--navy),0 -1px var(--navy)}
`;

const num = (n) => (Number.isInteger(n) ? n : +n.toFixed(2));
export function skillText(c) {
  const s = c.sk || {};
  if (s.type === 'dash') return `${num(s.distance)}칸 돌진 · 쿨 ${num(s.cooldown)}초${s.hitDmg ? ` · 피해 ${s.hitDmg}` : ''}`;
  return `${num(c.runGauge / RUN_DRAIN)}초 달리기`;
}

/** 도트 아이콘 캔버스 */
const ICONS = {
  hp: [heartRows(), HEART_PALETTE],
  spd: [SHOE_ROWS, SHOE_PALETTE],
  atk: [SWORD_ROWS, { 0: '#14122b', 1: '#dfe6ee', 2: '#a8743a' }],
};
function icon(kind) {
  const [rows, pal] = ICONS[kind], c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = c.height = rows.length; c.className = 'pk-ic';
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const pips = (n, kind) => `<span class="pk-pips ${kind}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const statRow = (kind, label, n) => `<div class="pk-stat"><div><span data-icon="${kind}"></span><span>${label}</span></div>${pips(n, kind)}</div>`;

/** 한 바퀴의 구간표 */
function timeline(sprite) {
  const n = sprites[sprite]?.idle ? sprites[sprite] : BLUE;
  const idle = Array.from({ length: n.idle }, (_, i) => i).concat(Array.from({ length: Math.max(0, n.idle - 2) }, (_, i) => n.idle - 2 - i)); // 앞뒤로 왕복
  const atk = sprites[sprite]?.idle
    ? [0, 1, 2].map(() => ({ frames: Array.from({ length: n.combo - 1 }, (_, k) => k + 1), ms: ATK_MS }))
    : SPRITE.attackSteps.map((s) => ({ frames: s.frames, ms: s.ms }));
  const parts = [{ ms: IDLE_MS, at: (t) => ({ m: 'idle', f: idle[Math.floor((t * 6) / 1000) % idle.length] }) }];
  for (const a of atk) parts.push({ ms: a.ms, at: (t) => ({ m: 'combo', f: a.frames[Math.min(a.frames.length - 1, Math.floor((t / a.ms) * a.frames.length))] }) });
  parts.push({ ms: RUN_MS, at: (t) => ({ m: 'run', f: Math.floor((t * 15) / 1000) % n.run }) });
  parts.push({ ms: (n.die / 9) * 1000 + DIE_HOLD_MS, at: (t) => ({ m: 'die', f: Math.min(n.die - 1, Math.floor((t * 9) / 1000)) }) });
  return parts;
}

/** root 안에 미리보기 + 탭 + 카드 모음을 만든다. opts: { spriteUrl(sprite, motion), selected, onChange(id) } */
export function mountPicker(root, chars, opts) {
  if (!document.getElementById('pk-css')) { const st = document.createElement('style'); st.id = 'pk-css'; st.textContent = CSS; document.head.append(st); }
  const ids = Object.keys(chars);
  let value = opts.selected && chars[opts.selected] ? opts.selected : ids[0], filter = 'all';
  root.classList.add('pk');
  root.innerHTML = `<div class="pk-hero"><div class="pk-stage"></div><div class="pk-info"></div><div class="pk-abil"></div></div>
    <div class="pk-bar"><div class="pk-tabs">${TABS.map(([k, n]) => `<button type="button" data-t="${k}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('')}</div><button type="button" class="pk-rnd" data-r>랜덤</button></div>
    <div class="pk-tiles"></div>`;
  const stage = root.querySelector('.pk-stage'), info = root.querySelector('.pk-info'), abil = root.querySelector('.pk-abil'), tiles = root.querySelector('.pk-tiles');

  const imgs = new Map();
  const sheet = (sprite, m) => {
    const k = `${sprite}/${m}`;
    if (!imgs.has(k)) { const im = new Image(); im.src = opts.spriteUrl(sprite, m); imgs.set(k, im); }
    return imgs.get(k);
  };
  const fillIcons = (el) => el.querySelectorAll('[data-icon]').forEach((s) => { if (!s.firstChild) s.append(icon(s.dataset.icon)); });
  const shown = () => ids.filter((id) => filter === 'all' || (filter === 'rec' ? chars[id].rec : chars[id].role === filter));

  // 큰 캐릭터 + 타일 정지 그림
  const big = { canvas: null, g: null, tl: null, total: 0, off: 0, sprite: '' };
  function drawStill(canvas, c) {
    const g = canvas.getContext('2d'), im = sheet(c.sprite, 'idle');
    const paint = () => { g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, CELL, CELL, 0, 0, canvas.width, canvas.height); };
    if (im.complete && im.naturalWidth) paint(); else im.addEventListener('load', paint, { once: true });
  }
  function renderHero() {
    const c = chars[value], s = c.stars || { atk: 3, hp: 3, spd: 3 };
    stage.innerHTML = ''; const k = document.createElement('canvas'); k.width = k.height = 276; stage.append(k);
    big.canvas = k; big.g = k.getContext('2d'); big.tl = timeline(c.sprite); big.total = big.tl.reduce((a, p) => a + p.ms, 0); big.sprite = c.sprite; big.start = performance.now();
    info.innerHTML = `<div class="pk-nm">${c.name}</div><div><span class="pk-pill ${c.role}">${ROLE_NAME[c.role] || ''}</span>${c.rec ? '<span class="pk-pill pk-rec">처음이라면</span>' : ''}</div><div class="pk-bars">${statRow('atk', '공격', s.atk)}${statRow('hp', '체력', s.hp)}${statRow('spd', '속도', s.spd)}</div>`;
    abil.innerHTML = `<div class="k1"><i>공격</i><span>${c.atkInfo || ''}</span></div><div class="k2"><i>${c.sk?.type === 'dash' ? '대시' : '달리기'}</i><span>${skillText(c)}</span></div><div class="k3"><i>궁극기</i><span>${c.ultName || c.ult?.name || ''}</span></div>`;
    fillIcons(info);
  }
  function renderTiles() {
    tiles.innerHTML = '';
    for (const id of shown()) {
      const c = chars[id], d = document.createElement('div');
      d.className = 'pk-tile' + (id === value ? ' sel' : ''); d.dataset.id = id;
      d.innerHTML = `<span class="pk-dot ${c.role}"></span>${c.rec ? '<span class="pk-rec">★</span>' : ''}<div class="pk-pic"></div><small>${c.name}</small>`;
      const k = document.createElement('canvas'); k.className = 'pk-sp'; k.width = k.height = 96; drawStill(k, c); d.querySelector('.pk-pic').append(k); tiles.append(d);
    }
  }
  renderHero(); renderTiles();

  let raf = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (!big.canvas || big.canvas.offsetParent === null) return;
    let t = (now - big.start) % big.total, part = big.tl[0];
    for (const p of big.tl) { part = p; if (t < p.ms) break; t -= p.ms; }
    const { m, f } = part.at(t), im = sheet(big.sprite, m);
    if (!im.complete || !im.naturalWidth) return;
    big.g.imageSmoothingQuality = 'high'; big.g.clearRect(0, 0, 276, 276); big.g.drawImage(im, f * CELL, 0, CELL, CELL, 0, 0, 276, 276);
  };
  raf = requestAnimationFrame(tick);

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-t]');
    if (tab) { filter = tab.dataset.t; root.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b === tab)); renderTiles(); return; }
    if (e.target.closest('[data-r]')) { const v = shown(); api.setValue(v[Math.floor(Math.random() * v.length)]); return; }
    const t = e.target.closest('.pk-tile');
    if (t) api.setValue(t.dataset.id);
  });

  const api = {
    value: () => value,
    setValue(id) {
      value = id; renderHero();
      tiles.querySelectorAll('.pk-tile').forEach((d) => d.classList.toggle('sel', d.dataset.id === id));
      root.querySelector('.pk-hero').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      opts.onChange?.(id);
    },
    destroy() { cancelAnimationFrame(raf); },
  };
  return api;
}
