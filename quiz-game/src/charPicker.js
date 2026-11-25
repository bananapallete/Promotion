// 캐릭터 선택: 탭 필터 + 카드 그리드. 카드 안 캐릭터는 대기 2초 → 공격 3번 → 달리기 3초 → 죽음을 반복한다.
import sprites from '../shared/sprites.json';
import { SPRITE } from '../shared/constants.js';

const ROLES = [['all', '전체'], ['melee', '근접'], ['tank', '탱커'], ['speed', '스피드'], ['ranged', '원거리']];
const ROLE_NAME = Object.fromEntries(ROLES);
const BLUE = { idle: 4, walk: 7, run: 7, combo: 8, die: 6 }; // sprites.json에 없는 기본 캐릭터
const IDLE_MS = 2000, ATK_MS = 450, RUN_MS = 3000, DIE_HOLD_MS = 800, CELL = 256;

const CSS = `
.pk{--cream:#e8d0a9;--cream-hi:#f6e6c8;--wood:#b27c53;--wood-dk:#7a4e32;--text:#5a3a24;--leaf:#b4d36a;--leaf-dk:#6e9a3a;--navy:#14122b;color:var(--text)}
.pk-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:none}
.pk-tabs::-webkit-scrollbar{display:none}
.pk-tabs button{flex:1 0 auto;padding:6px 8px;border:2px solid var(--wood);border-radius:6px;background:var(--cream-hi);color:var(--text);font:700 12px/1 inherit;box-shadow:0 2px 0 var(--wood-dk);cursor:pointer}
.pk-tabs button.on{background:var(--leaf);border-color:var(--leaf-dk);box-shadow:0 3px 0 #4d7226}
.pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:6px;margin:4px 0 12px}
.pc{position:relative;display:grid;justify-items:center;gap:1px;padding:5px 4px 6px;background:var(--cream);border:2px solid var(--wood-dk);border-radius:6px;box-shadow:0 3px 0 var(--wood-dk),inset 0 0 0 1px var(--cream-hi);cursor:pointer;text-align:center}
.pc.sel{background:var(--leaf);border-color:var(--leaf-dk);box-shadow:0 3px 0 #4d7226,inset 0 0 0 1px var(--cream-hi)}
.pc canvas{width:52px;height:52px;background:linear-gradient(#0000 62%,#5fa34c55 62%);border-radius:4px}
.pc b{font-size:12px}
.pc em{font-style:normal;font-size:10px;font-weight:700;padding:0 6px;border-radius:99px;background:var(--cream-hi);border:1px solid var(--wood)}
.pc button.more{margin-top:2px;padding:3px 8px;border:1px solid var(--wood);border-radius:4px;background:var(--cream-hi);color:var(--text);font:700 10px/1 inherit;box-shadow:0 2px 0 var(--wood-dk);cursor:pointer}
.pc .detail{width:100%;display:grid;gap:3px;margin-top:4px;padding:4px 6px;background:var(--cream-hi);border:1px solid var(--wood);border-radius:4px;text-align:left;font-size:10px;line-height:1.3}
.pc .detail i{font-style:normal;font-weight:800;color:var(--leaf-dk);margin-right:4px}
.pc .detail[hidden]{display:none}
`;

const num = (n) => (Number.isInteger(n) ? n : +n.toFixed(2));
export function skillText(c) {
  const s = c.sk || {};
  if (s.type === 'dash') return `${num(s.distance)}칸 돌진 · 쿨 ${num(s.cooldown)}초${s.hitDmg ? ` · 피해 ${s.hitDmg}` : ''}`;
  return `달리기 ${num(c.runGauge)}초`;
}

/** 한 바퀴의 구간표: [끝 시각, 그리는 함수(경과ms) → {m: 모션, f: 프레임}] */
function timeline(sprite) {
  const n = sprites[sprite]?.idle ? sprites[sprite] : BLUE;
  const idle = Array.from({ length: n.idle }, (_, i) => i).concat(Array.from({ length: Math.max(0, n.idle - 2) }, (_, i) => n.idle - 2 - i)); // 앞뒤로 왕복
  const atk = sprites[sprite]?.idle
    ? [0, 1, 2].map(() => ({ frames: Array.from({ length: n.combo - 1 }, (_, k) => k + 1), ms: ATK_MS }))
    : SPRITE.attackSteps.map((s) => ({ frames: s.frames, ms: s.ms }));
  const dieMs = (n.die / 9) * 1000;
  const parts = [{ ms: IDLE_MS, at: (t) => ({ m: 'idle', f: idle[Math.floor((t * 6) / 1000) % idle.length] }) }];
  for (const a of atk) parts.push({ ms: a.ms, at: (t) => ({ m: 'combo', f: a.frames[Math.min(a.frames.length - 1, Math.floor((t / a.ms) * a.frames.length))] }) });
  parts.push({ ms: RUN_MS, at: (t) => ({ m: 'run', f: Math.floor((t * 15) / 1000) % n.run }) });
  parts.push({ ms: dieMs + DIE_HOLD_MS, at: (t) => ({ m: 'die', f: Math.min(n.die - 1, Math.floor((t * 9) / 1000)) }) });
  return parts;
}

/** root 안에 탭 + 카드 그리드를 만든다. opts: { spriteUrl(sprite, motion), selected, onChange(id) } */
export function mountPicker(root, chars, opts) {
  if (!document.getElementById('pk-css')) { const st = document.createElement('style'); st.id = 'pk-css'; st.textContent = CSS; document.head.append(st); }
  const entries = Object.entries(chars);
  let value = opts.selected || entries[0][0], filter = 'all';
  root.classList.add('pk');
  root.innerHTML = `<div class="pk-tabs">${ROLES.map(([k, n]) => `<button type="button" data-r="${k}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="pk-grid">${entries.map(([id, c]) => `<div class="pc ${id === value ? 'sel' : ''}" data-id="${id}" data-role="${c.role}" role="button" tabindex="0">
    <canvas width="104" height="104"></canvas><b>${c.name}</b><em>${ROLE_NAME[c.role] || ''}</em>
    <button type="button" class="more">더보기</button>
    <div class="detail" hidden><div><i>공격</i>${c.atkInfo || ''}</div><div><i>${c.sk?.type === 'dash' ? '대시' : '달리기'}</i>${skillText(c)}</div></div></div>`).join('')}</div>`;

  const imgs = new Map(); // 'sprite/motion' → Image
  const sheet = (sprite, m) => {
    const k = `${sprite}/${m}`;
    if (!imgs.has(k)) { const im = new Image(); im.src = opts.spriteUrl(sprite, m); imgs.set(k, im); }
    return imgs.get(k);
  };
  const cards = [...root.querySelectorAll('.pc')].map((el) => {
    const c = chars[el.dataset.id], tl = timeline(c.sprite);
    return { el, g: el.querySelector('canvas').getContext('2d'), c, tl, total: tl.reduce((a, p) => a + p.ms, 0), off: Math.random() * 3000, seen: false };
  });
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { cards.find((k) => k.el === e.target).seen = e.isIntersecting; })) : null;
  cards.forEach((k) => { if (io) io.observe(k.el); else k.seen = true; });

  let raf = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    for (const k of cards) {
      if (!k.seen || k.el.offsetParent === null) continue;
      let t = (now + k.off) % k.total, part = k.tl[0];
      for (const p of k.tl) { part = p; if (t < p.ms) break; t -= p.ms; }
      const { m, f } = part.at(t), im = sheet(k.c.sprite, m);
      if (!im.complete || !im.naturalWidth) continue;
      k.g.imageSmoothingEnabled = true; k.g.imageSmoothingQuality = 'high'; // 작게 줄여 그리므로 부드럽게
      k.g.clearRect(0, 0, 104, 104);
      k.g.drawImage(im, f * CELL, 0, CELL, CELL, 0, 0, 104, 104);
    }
  };
  raf = requestAnimationFrame(tick);

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('.pk-tabs button');
    if (tab) {
      filter = tab.dataset.r;
      root.querySelectorAll('.pk-tabs button').forEach((b) => b.classList.toggle('on', b === tab));
      cards.forEach((k) => { k.el.hidden = filter !== 'all' && k.c.role !== filter; k.el.style.display = k.el.hidden ? 'none' : ''; });
      return;
    }
    const card = e.target.closest('.pc');
    if (!card) return;
    if (e.target.closest('.more')) {
      const d = card.querySelector('.detail'); d.hidden = !d.hidden;
      e.target.textContent = d.hidden ? '더보기' : '접기';
      return;
    }
    api.setValue(card.dataset.id);
  });

  const api = {
    value: () => value,
    setValue(id) {
      value = id;
      cards.forEach((k) => k.el.classList.toggle('sel', k.el.dataset.id === id));
      opts.onChange?.(id);
    },
    destroy() { cancelAnimationFrame(raf); io?.disconnect(); },
  };
  return api;
}
