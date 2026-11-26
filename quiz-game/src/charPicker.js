// 캐릭터 선택: 위에 고른 캐릭터의 궁극기 시연 영상 + 능력 3줄, 아래에 역할 탭과 카드 모음(카드마다 대기 → 걷기 → 공격 → 쓰러짐 반복).
import sprites from '../shared/sprites.json';
import { RUN_DRAIN, SPRITE } from '../shared/constants.js';
import { HEART_PALETTE, heartRows, SHOE_PALETTE, SHOE_ROWS, SWORD_ROWS } from '../shared/itemPixels.js';

const TABS = [['all', '전체'], ['melee', '근접'], ['tank', '탱커'], ['speed', '스피드'], ['ranged', '원거리'], ['support', '서포터']];
const ROLE_NAME = { melee: '근접', tank: '탱커', speed: '스피드', ranged: '원거리', support: '서포터' };
const BLUE = { idle: 4, walk: 7, run: 7, combo: 8, die: 6 }; // sprites.json에 없는 기본 캐릭터
const CELL = 256;

const CSS = `
.pk{--cream:#e8d0a9;--cream-hi:#f6e6c8;--wood:#b27c53;--wood-dk:#7a4e32;--text:#5a3a24;--leaf:#b4d36a;--leaf-dk:#6e9a3a;--navy:#14122b;--rose:#b34a5c;--empty:#7f9298;color:var(--text);display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
.pk .pk-hero{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);grid-template-areas:"s i" "a a";gap:6px 8px;padding:7px;background:var(--cream-hi);border:3px solid #d9a63a;border-radius:12px;box-shadow:0 4px 0 #c18a1f,inset 0 0 0 3px #fff7}
.pk .pk-stage{grid-area:s;position:relative;aspect-ratio:4/3;border-radius:10px;border:2px solid var(--leaf-dk);background:#2b4d2a;overflow:hidden}
.pk .pk-stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.pk .pk-info{grid-area:i;min-width:0;display:grid;gap:3px;align-content:center}
.pk .pk-nm{font-size:18px;font-weight:900;line-height:1.05}
.pk .pk-pill{display:inline-block;padding:1px 9px;border-radius:99px;font-size:10px;font-weight:900;color:#fff;border:2px solid var(--navy);text-shadow:0 1px 0 #0006;margin-right:3px}
.pk .pk-pill.melee{background:#e0702a}.pk .pk-pill.tank{background:#4a86d9}.pk .pk-pill.speed{background:#4fae55}.pk .pk-pill.support{background:#3fb9a0}.pk .pk-tile .pk-dot.support{background:#3fb9a0}.pk .pk-pill.ranged{background:#9a62d6}.pk .pk-pill.pk-rec{background:#f0a000}
.pk .pk-bars{display:grid;gap:3px;font-size:11px;font-weight:700}
.pk .pk-stat{display:flex;align-items:center;justify-content:flex-start;gap:4px;white-space:nowrap}
.pk .pk-stat div{display:flex;align-items:center;gap:3px}
.pk canvas.pk-ic{width:14px;height:14px;image-rendering:pixelated;flex:none}
.pk .pk-pips{display:inline-flex;gap:2px;flex:none}
.pk .pk-pips i{width:8px;height:8px;flex:none;background:var(--empty);border:1.5px solid var(--navy)}
.pk .pk-pips.hp i.on{background:var(--rose);box-shadow:inset 0 2px 0 #e9a0ab88}.pk .pk-pips.atk i.on{background:#e0902a;box-shadow:inset 0 2px 0 #ffd98a88}.pk .pk-pips.spd i.on{background:#3b82f6;box-shadow:inset 0 2px 0 #a5d0ff88}
.pk .pk-abil{grid-area:a;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.pk .pk-abil div{display:grid;grid-template-columns:1fr;gap:2px;justify-items:center;text-align:center;background:#fff8e4;border:2px solid #e0c98a;border-radius:6px;padding:3px;font-size:10.5px;line-height:1.2}
.pk .pk-abil i{font-style:normal;font-size:10px;font-weight:900;color:#fff;text-align:center;border-radius:4px;border:2px solid var(--navy);padding:0 6px}
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

/** 카드 한 바퀴: 대기 → 걷기 → 공격 → 쓰러짐. 반환: t(ms)에 그릴 { m, f } */
const CYC = { idle: 1200, walk: 1100, atk: 500, die: 1300 };
const CYC_TOTAL = CYC.idle + CYC.walk + CYC.atk + CYC.die;
function cycleAt(sprite, t) {
  const n = sprites[sprite]?.idle ? sprites[sprite] : BLUE, own = !!sprites[sprite]?.idle;
  if (t < CYC.idle) return { m: 'idle', f: Math.floor((t * 6) / 1000) % n.idle };
  t -= CYC.idle;
  if (t < CYC.walk) return { m: 'walk', f: Math.floor((t * 12) / 1000) % n.walk };
  t -= CYC.walk;
  if (t < CYC.atk) { const fr = own ? Array.from({ length: n.combo - 1 }, (_, k) => k + 1) : [...SPRITE.attackSteps[0].frames, ...SPRITE.attackSteps[1].frames]; return { m: 'combo', f: fr[Math.min(fr.length - 1, Math.floor((t / CYC.atk) * fr.length))] }; }
  t -= CYC.atk;
  return { m: 'die', f: Math.min(n.die - 1, Math.floor((t * 9) / 1000)) };
}

/** root 안에 미리보기 + 탭 + 카드 모음을 만든다. opts: { spriteUrl(sprite, motion), ultUrl(id), selected, onChange(id) } */
export function mountPicker(root, chars, opts) {
  if (!document.getElementById('pk-css')) { const st = document.createElement('style'); st.id = 'pk-css'; st.textContent = CSS; document.head.append(st); }
  const ids = Object.keys(chars);
  let value = opts.selected && chars[opts.selected] ? opts.selected : ids[0], filter = 'all';
  root.classList.add('pk');
  root.innerHTML = `<div class="pk-hero"><div class="pk-stage"><video muted loop playsinline autoplay preload="auto"></video></div><div class="pk-info"></div><div class="pk-abil"></div></div>
    <div class="pk-bar"><div class="pk-tabs">${TABS.map(([k, n]) => `<button type="button" data-t="${k}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="pk-tiles"></div>`;
  const stage = root.querySelector('.pk-stage'), vid = stage.querySelector('video'), info = root.querySelector('.pk-info'), abil = root.querySelector('.pk-abil'), tiles = root.querySelector('.pk-tiles');

  const imgs = new Map();
  const sheet = (sprite, m) => {
    const k = `${sprite}/${m}`;
    if (!imgs.has(k)) { const im = new Image(); im.src = opts.spriteUrl(sprite, m); imgs.set(k, im); }
    return imgs.get(k);
  };
  const fillIcons = (el) => el.querySelectorAll('[data-icon]').forEach((s) => { if (!s.firstChild) s.append(icon(s.dataset.icon)); });
  const shown = () => ids.filter((id) => filter === 'all' || chars[id].role === filter);

  const anims = []; // 카드 애니메이션 { canvas, g, sprite, off, last }
  function renderHero() {
    const c = chars[value], s = c.stars || { atk: 3, hp: 3, spd: 3 };
    const u = opts.ultUrl?.(value); stage.hidden = !u;
    if (u && vid.getAttribute('src') !== u) { vid.src = u; vid.play?.().catch(() => {}); }
    info.innerHTML = `<div class="pk-nm">${c.name}</div><div><span class="pk-pill ${c.role}">${ROLE_NAME[c.role] || ''}</span>${c.rec ? '<span class="pk-pill pk-rec">처음이라면</span>' : ''}</div><div class="pk-bars">${statRow('atk', '공격', s.atk)}${statRow('hp', '체력', s.hp)}${statRow('spd', '속도', s.spd)}</div>`;
    abil.innerHTML = `<div class="k1"><i>공격</i><span>${c.atkInfo || ''}</span></div><div class="k2"><i>${c.sk?.type === 'dash' ? '대시' : '달리기'}</i><span>${skillText(c)}</span></div><div class="k3"><i>궁극기</i><span>${c.ultName || c.ult?.name || ''}</span></div>`;
    fillIcons(info);
  }
  function renderTiles() {
    tiles.innerHTML = ''; anims.length = 0;
    for (const id of shown()) {
      const c = chars[id], d = document.createElement('div');
      d.className = 'pk-tile' + (id === value ? ' sel' : ''); d.dataset.id = id;
      d.innerHTML = `<span class="pk-dot ${c.role}"></span>${c.rec ? '<span class="pk-rec">★</span>' : ''}<div class="pk-pic"></div><small>${c.name}</small>`;
      const k = document.createElement('canvas'); k.className = 'pk-sp'; k.width = k.height = 96; d.querySelector('.pk-pic').append(k); tiles.append(d);
      anims.push({ canvas: k, g: k.getContext('2d'), sprite: c.sprite, off: Math.random() * CYC_TOTAL, last: '' }); // 카드마다 시작 시점을 달리해 한꺼번에 같은 동작을 하지 않게
    }
  }
  renderHero(); renderTiles();

  let raf = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (root.offsetParent === null) return;
    for (const a of anims) {
      const { m, f } = cycleAt(a.sprite, (now + a.off) % CYC_TOTAL), key = `${m}${f}`;
      if (key === a.last) continue;
      const im = sheet(a.sprite, m);
      if (!im.complete || !im.naturalWidth) continue;
      a.last = key; a.g.clearRect(0, 0, 96, 96); a.g.drawImage(im, f * CELL, 0, CELL, CELL, 0, 0, 96, 96);
    }
  };
  raf = requestAnimationFrame(tick);

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-t]');
    if (tab) { filter = tab.dataset.t; root.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b === tab)); renderTiles(); return; }
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
