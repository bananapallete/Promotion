// 빔프로젝터용 큰 맵을 그리는 Phaser 장면. 서버 상태를 받아서 그리기만 한다.
import Phaser from 'phaser';
import { MAP, PHASE, SPRITE, ZONES } from '../shared/constants.js';
import { CoinLayer } from './coins.js';
import { ItemLayer } from './items.js';
import { THEME } from '../shared/theme.js';
import BOUNDS from '../shared/spriteBounds.json';
import { burstFx, dmgText, hitFx, meleeFx, muzzleFx } from './fx.js';
import { tetherLines, auraOff, auraTick, beamFx, blink, burnTick, dashFx, fireRing, heartTick, meteorFall, orbitTick, orcDust, quake, shockRing, snipeAim, speedLines, spinFx, tongues, rangeDisc, UltZoneLayer, WallLayer, warn as warnFx } from './ultFx.js';
import { ProjectileLayer } from './projectiles.js';
import sprites from '../shared/sprites.json';
import { buildFloor, MAT_MARGIN, matTexture, OBJ_PAD, objectTexture, TILE } from './mapArt.js';
import { mapObjects } from '../shared/mapObjects.js';

export const BU = 48; // 몸 폭 1칸의 화면 픽셀 수
export const WORLD_W = MAP.w * BU;
export const WORLD_H = MAP.h * BU;

export const hooks = { spriteUrl: (s, m) => `characters/${s}/${m}.png`, fxUrl: (n) => `fx/${n}.png` }; // 데모 페이지가 이미지 경로를 바꿔 끼울 수 있게
const SPRITES = ['blue', ...Object.keys(sprites)]; // 스프라이트 폴더 이름 (public/characters/<name>/)
const SPR_SCALE = 0.34; // 256px 셀 → 화면. 몸 폭이 약 1.1BU가 되도록
const FLASH_MS = 100; // 맞았을 때 하얗게 번쩍이는 시간


export class WorldScene extends Phaser.Scene {
  constructor() {
    super('world');
    this.views = new Map();
    this.pending = null;
    this.zoneKey = '';
  }

  preload() {
    this.load.spritesheet('dust', hooks.fxUrl('puff'), { frameWidth: 40, frameHeight: 28 }); // 걷거나 달릴 때 뒤로 남는 먼지
    for (const s of SPRITES) {
      for (const m of [...Object.keys(SPRITE.motions), ...(sprites[s]?.die ? ['die'] : []), ...(sprites[s]?.ult ? ['ult'] : [])]) {
        this.load.spritesheet(`${s}-${m}`, hooks.spriteUrl(s, m), { frameWidth: SPRITE.cell, frameHeight: SPRITE.cell });
      }
    }
  }

  create() {
    // 바닥: 도트 1개 = 화면 2px (캐릭터와 같은 도트 크기)
    buildFloor(this);
    this.add.image(0, 0, 'floor').setOrigin(0).setScale(BU / TILE).setDepth(-100);

    for (const o of mapObjects()) { // 맵 장식물: 아래쪽 기준으로 캐릭터와 앞뒤가 맞게 겹침 (꽃·버섯은 바닥에 깔림)
      const low = o.kind === 'flower';
      this.add.image(o.x * BU, o.y * BU + OBJ_PAD * (BU / TILE), objectTexture(this, o.kind, o.v)).setOrigin(0.5, 1).setScale(BU / TILE).setDepth(low ? -90 : o.y * BU);
    }
    this.zoneGfx = this.add.graphics().setDepth(-80);
    this.teleGfx = this.add.graphics().setDepth(-45); // 예고 범위 (타격 전 붉은 부채꼴)
    this.aimGfx = this.add.graphics().setDepth(-50); // 사거리 링 · 조준선 · 조준 대상 링 (캐릭터 아래, 바닥 위)
    this.aim = null;
    this.lockId = null;
    this.anims.create({ key: 'dust', frames: this.anims.generateFrameNumbers('dust', { start: 0, end: 4 }), frameRate: 12, repeat: 0 });
    this.coins = new CoinLayer(this, BU);
    this.coins.create();
    this.wallLayer = new WallLayer(this, BU);
    this.uzl = new UltZoneLayer(this, BU); // 궁극기 바닥 범위(불바다·화살비) 도트
    this.items = new ItemLayer(this, BU);
    this.items.create();
    this.proj = new ProjectileLayer(this, BU);
    this.proj.create();
    this.zoneImgs = [];

    for (const s of SPRITES) {
      const n = sprites[s]?.idle ? sprites[s] : null; // 없으면 blue(constants의 프레임 수)
      if (sprites[s]?.ult) this.anims.create({ key: `${s}-ult`, frames: this.anims.generateFrameNumbers(`${s}-ult`, { start: 0, end: sprites[s].ult - 1 }), frameRate: s === 'shiba' ? 9 : 16, repeat: -1 }); // 채널링 궁극기 모션
      if (sprites[s]?.die) this.anims.create({ key: `${s}-die`, frames: this.anims.generateFrameNumbers(`${s}-die`, { start: 0, end: sprites[s].die - 1 }), frameRate: 9, repeat: 0 });
      SPRITE.attackSteps.forEach((st, i) => {
        // 새 스프라이트의 공격은 한 동작(0번은 준비 자세)이라 단계마다 1~끝을 그 시간에 맞춰 재생
        const frames = n ? Array.from({ length: n.combo - 1 }, (_, k) => k + 1) : st.frames;
        const fps = n ? (frames.length * 1000) / st.ms : st.fps;
        this.anims.create({ key: `${s}-atk${i}`, frames: this.anims.generateFrameNumbers(`${s}-combo`, { frames }), frameRate: fps, repeat: 0 });
      });
      for (const [m, c] of Object.entries(SPRITE.motions)) {
        if (!c.fps) continue; // combo는 위에서 단계별로 만들었음
        this.anims.create({
          key: `${s}-${m}`,
          frames: this.anims.generateFrameNumbers(`${s}-${m}`, { start: 0, end: (n ? n[m] : c.frames) - 1 }),
          frameRate: c.fps,
          repeat: c.loop ? -1 : 0,
          yoyo: !!c.yoyo,
        });
      }
    }
    if (this.pending) this.applyState(this.pending);
  }

  // ---------- 조준 표시 ----------
  /** info: { id, dx, dy, manual, dragging, range, kind, radius, targetId } (null이면 숨김) */
  setAim(info) { this.aim = info; }

  _glowOn(v) {
    if (v.glow || this.sys.game.renderer.type !== Phaser.WEBGL) return; // 글로우는 WebGL에서만
    v.sprite.preFX.setPadding(24);
    v.glow = v.sprite.preFX.addGlow(0xffffff, 0, 0, false, 0.12, 14);
  }

  _glowOff(v) {
    if (!v) return;
    v.pulse?.stop(); v.pulse = null;
    if (v.glow) { v.sprite.preFX.remove(v.glow); v.glow = null; }
  }

  // 조준 대상이 생기거나 바뀔 때: 이전 대상의 빛을 끄고, 새 대상에 잠금 연출(수축하는 링 + 강한 빛 → 은은한 맥박)
  _lockChange(oldId, newId) {
    this._glowOff(this.views.get(oldId));
    const v = this.views.get(newId);
    if (!v) return;
    this._glowOn(v);
    if (v.glow) {
      const glow = v.glow;
      this.tweens.add({ targets: glow, outerStrength: { from: 16, to: 4 }, duration: 260, ease: 'Cubic.easeOut',
        onComplete: () => { if (v.glow === glow) v.pulse = this.tweens.add({ targets: glow, outerStrength: { from: 2.5, to: 5 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); } });
    }
    const ring = this.add.graphics().setDepth(5200);
    this.tweens.addCounter({ from: 0, to: 1, duration: 300, ease: 'Cubic.easeOut', onUpdate: (tw) => {
      const k = tw.getValue();
      ring.clear().lineStyle(5 - 2 * k, 0xffffff, 1 - 0.5 * k).strokeCircle(v.x, v.y, (2.4 - 1.6 * k) * BU);
    }, onComplete: () => ring.destroy() });
  }

  // 걷거나 달리는 동안 발 뒤로 먼지가 남음 (달리면 더 크고 자주)
  _dust(v, p, now) {
    const dx = v.x - (v.lx ?? v.x); v.lx = v.x;
    const moving = !p.st && (p.a === 'walk' || p.a === 'run') && v.hopUntil <= now;
    if (!moving || now < (v.dustAt || 0)) return;
    const run = p.a === 'run';
    v.dustAt = now + (run ? 110 : 240);
    const back = Math.abs(dx) > 0.3 ? -Math.sign(dx) : -p.f; // 가는 방향의 반대쪽
    const d = this.add.sprite(v.x + back * 0.42 * BU, v.y - 2, 'dust').setOrigin(0.5, 1).setScale((run ? 1.5 : 1) * (p.zs || 1) * 1.1).setFlipX(back < 0).setAlpha(0.9).setDepth(v.y - 1);
    d.play('dust');
    d.once('animationcomplete', () => d.destroy());
  }

  _drawTelegraph(now) {
    const g = this.teleGfx;
    g.clear();
    for (const v of this.views.values()) {
      const w = v.windup;
      if (!w) continue;
      if (now >= w.until || v.p.st) { v.windup = null; continue; }
      const u = (now - w.from) / (w.until - w.from), R = w.range * BU, ang = Math.atan2(w.dy, w.dx), half = (w.arc * Math.PI) / 180;
      g.fillStyle(0xff3b30, 0.12 + 0.3 * u).slice(v.x, v.y, R, ang - half, ang + half, false).fillPath(); // 시간이 갈수록 진해짐
      g.fillStyle(0xff3b30, 0.35).slice(v.x, v.y, R * u, ang - half, ang + half, false).fillPath(); // 안쪽부터 차오름
    }
  }

  _drawAim(now) {
    const g = this.aimGfx;
    g.clear();
    const a = this.aim;
    const me = a && this.views.get(a.id);
    const tid = me && this.views.has(a.targetId) ? a.targetId : null;
    if (tid !== this.lockId) { this._lockChange(this.lockId, tid); this.lockId = tid; }
    if (!me) return;

    const cx = me.x, cy = me.y, R = a.range * BU, ang = Math.atan2(a.dy, a.dx);
    // 공격 범위는 항상 또렷하게 (직접 조준 중엔 더 진하게)
    const k = a.dragging ? 1 : 0.7;
    if (!a.lob) { // 근접은 부채꼴(맞는 범위), 원거리는 사거리만큼 뻗는 빔
      if (a.kind === 'melee' && a.line) { // 직선 주먹
        const w = (a.line * BU) / 2, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w, ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
        g.fillStyle(0xffffff, 0.34 * k).fillPoints([{ x: cx + nx, y: cy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: cx - nx, y: cy - ny }], true);
      } else if (a.kind === 'melee') {
        const half = ((a.arc ?? 60) * Math.PI) / 180;
        g.fillStyle(0xffffff, 0.34 * k).slice(cx, cy, R, ang - half, ang + half, false).fillPath();
      } else {
        const w = a.radius * BU, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
        const ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
        g.fillStyle(0xffffff, 0.34 * k).fillPoints([{ x: cx + nx, y: cy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: cx - nx, y: cy - ny }], true);
      }
    }
    if (a.lob) { // 던지기: 착탄 지점과 폭발 범위
      const lx = a.lob.x * BU, ly = a.lob.y * BU;
      g.lineStyle(3, 0xffffff, 0.5 * k).lineBetween(cx, cy, lx, ly);
      g.fillStyle(0xff7a1a, 0.4 * k).fillCircle(lx, ly, a.lob.r * BU);
      g.lineStyle(3, 0xffffff, 0.9).lineBetween(lx - 8, ly, lx + 8, ly).lineBetween(lx, ly - 8, lx, ly + 8);
    }
    // 조준 중인 적: 발밑 링 (빛나는 테두리는 _lockChange가 스프라이트에 입힘)
    const t = tid && this.views.get(tid);
    if (t) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      g.lineStyle(4, 0xffffff, 0.55 + 0.4 * pulse).strokeCircle(t.x, t.y, (0.78 + 0.05 * pulse) * BU);
    }
  }

  // ---------- 서버 상태 반영 ----------
  applyState(s) {
    if (!this.zoneGfx) { this.pending = s; return; }
    this.drawZones(s);
    this.uzl.apply(s.uz);
    this.wallLayer.apply(s.wl);

    const seen = new Set();
    for (const p of s.players) {
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) v = this.makeView(p);
      v.p = p;
      v.tx = p.x * BU; v.ty = p.y * BU;
      if (v.x === undefined) { v.x = v.tx; v.y = v.ty; }
    }
    for (const [id, v] of this.views) {
      if (!seen.has(id)) { this._glowOff(v); v.root.forEach((o) => o.destroy()); this.views.delete(id); }
    }
    for (const e of s.ev || []) this.handleEvent(e);
    this.coins.apply(s);
    this.items.apply(s);
    this.proj.apply(s);
  }

  makeView(p) {
    const sprite = this.add.sprite(0, 0, `${p.s}-idle`).setOrigin(SPRITE.anchor[0] / SPRITE.cell, SPRITE.anchor[1] / SPRITE.cell).setScale(SPR_SCALE * (p.zs || 1));
    const tint = p.tn ? parseInt(p.tn.slice(1), 16) : 0; // 임시 모습: 스프라이트가 오면 tint를 지운다
    if (tint) sprite.setTint(tint);
    sprite.play(`${p.s}-idle`);
    const name = this.add.text(0, 0, (p.b ? '🤖 ' : '') + p.n, { fontFamily: 'sans-serif', fontSize: '22px', color: '#1f2d3a', fontStyle: '900', stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5, 1); // 이름: 굵게 22px
    const bar = this.add.graphics();
    const shoe = this.add.image(0, 0, 'item-shoe').setScale(1.5).setVisible(false);
    const status = this.add.text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c0392b', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5, 1);
    const coinIcon = this.add.image(0, 0, 'coin-f0').setScale(1.5).setVisible(false);
    const coinTxt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '17px', fontStyle: 'bold', color: '#ffe27a', stroke: '#14122b', strokeThickness: 4 }).setOrigin(0, 0.5).setVisible(false);
    const v = { sprite, name, bar, shoe, status, coinIcon, coinTxt, root: [sprite, name, bar, shoe, status, coinIcon, coinTxt], flashUntil: 0, punchUntil: 0, flashing: false, pending: 0, bump: 0, shown: 0, tint, hopUntil: 0, p };
    this.views.set(p.id, v);
    return v;
  }

  handleEvent(e) {
    const now = performance.now();
    const v = this.views.get(e.id);
    if (e.e === 'ult' && v) {
      if (e.t === 'rush') speedLines(this, e, BU);
      else if (e.t === 'buff' || e.t === 'barrage') shockRing(this, { x: e.x, y: e.y, r: e.t === 'buff' ? 1.6 : 1.2 }, BU);
    } else if (e.e === 'tetherStart') {
      shockRing(this, { x: e.x, y: e.y, r: 2 }, BU, 'pink');
    } else if (e.e === 'charm') {
      shockRing(this, { x: e.x, y: e.y, r: e.r }, BU, 'pink');
    } else if (e.e === 'snipeAim') {
      snipeAim(this, e, BU);
    } else if (e.e === 'beam') {
      beamFx(this, e, BU);
    } else if (e.e === 'pull') {
      tongues(this, e, BU);
    } else if (e.e === 'blink') {
      blink(this, e, BU);
    } else if (e.e === 'magnet') {
      shockRing(this, { x: e.x, y: e.y, r: e.r || 3 }, BU);
    } else if (e.e === 'wallHit') {
      hitFx(this, { x: e.x, y: e.y, fx: 'stone' }, BU);
    } else if (e.e === 'burst') {
      if (e.r) rangeDisc(this, e.x, e.y, e.r, BU);
      if (e.fx === 'stomp') quake(this, e, BU); else if (e.fx === 'shock') shockRing(this, e, BU); else if (e.fx === 'flurry') spinFx(this, e, BU); else if (e.fx === 'crescent') fireRing(this, e, BU); else burstFx(this, e, BU);
    } else if (e.e === 'warn') {
      warnFx(this, e, BU);
      meteorFall(this, e, BU);
    } else if (e.e === 'windup' && v) {
      v.windup = { from: now, until: now + e.sec * 1000, dx: e.dx, dy: e.dy, range: e.range, arc: e.arc };
    } else if (e.e === 'atk' && v) {
      const step = Math.min(e.step || 0, SPRITE.attackSteps.length - 1);
      v.sprite.play(`${v.p.s}-atk${step}`, false);
      v.punchUntil = now + SPRITE.attackSteps[step].ms;
      if (e.kind === 'proj') { muzzleFx(this, e, v, BU); return; } // 투사체 공격은 날아가는 모습이 효과
      if (e.kind === 'ranged') { // 개구리 혀: 굵은 분홍 직선 + 끝 동그라미
        const x0 = v.x, y0 = v.y - 0.55 * BU, len = e.len * BU;
        const line = this.add.graphics().setDepth(5000);
        line.lineStyle(9, 0xff6f91, 1).lineBetween(x0, y0, x0 + e.dx * len, y0 + e.dy * len);
        line.fillStyle(0xff6f91, 1).fillCircle(x0 + e.dx * len, y0 + e.dy * len, 10);
        this.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() });
      } else { meleeFx(this, e, v, BU); if (e.fx === 'smash') orcDust(this, e, v, BU, v.p.id === this.focusId); }
    } else if (e.e === 'hit' && v) {
      v.flashUntil = now + FLASH_MS; // 0.1초 하얗게 번쩍
      const crit = !!e.crit;
      const t = dmgText(this, e.x * BU, e.y * BU - 2.9 * BU, e.dmg > 0 ? `${crit ? '' : '-'}${e.dmg}${crit ? '!' : ''}` : '…', crit);
      this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 300, onComplete: () => t.destroy() });
      // 화면 흔들림은 크리티컬이 터졌을 때만, 그리고 내가 때리거나 맞은 것만 (봇끼리의 크리티컬마다 흔들리면 정신없어서)
      if (crit && this.focusId && (e.id === this.focusId || e.by === this.focusId)) this.cameras.main.shake(130, 0.006);
      hitFx(this, e, BU);
      const ring = this.add.circle(e.x * BU, e.y * BU - 0.6 * BU, 8, 0xffffff, 0.9).setDepth(5500);
      this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 220, onComplete: () => ring.destroy() });
    } else if (e.e === 'dash' && v) {
      if (e.kind === 'hop') v.hopUntil = now + 350;
      dashFx(this, e, v, BU); // 캐릭터마다 다른 대쉬 이펙트
    } else if (e.e === 'block') {
      const t = this.add.text(e.x * BU, e.y * BU - 1.9 * BU, '무적', { fontFamily: 'sans-serif', fontSize: '20px', color: '#2e86de', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 500, onComplete: () => t.destroy() });
    }
  }

  // ---------- 구역 ----------
  drawZones(s) {
    const type = s.q?.type || 'ox';
    const ans = s.reveal?.answer;
    const key = `${s.phase}|${type}|${ans ?? ''}`;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    this.zoneGfx.clear();
    this.zoneImgs.forEach((i) => i.destroy());
    this.zoneImgs = [];

    for (const z of ZONES[type]) {
      const correct = s.phase === PHASE.REVEAL && z.id === ans;
      const alpha = { [PHASE.LOBBY]: 0.35, [PHASE.READING]: 0.6, [PHASE.MOVING]: 0.85 }[s.phase] ?? (correct ? 1 : 0.2);
      this.zoneImgs.push(this.add.image((z.cx - z.r) * BU - MAT_MARGIN * (BU / TILE), (z.cy - z.r) * BU - MAT_MARGIN * (BU / TILE), matTexture(this, type, z)).setOrigin(0).setScale(BU / TILE).setDepth(-80).setAlpha(alpha));
      if (correct) this.zoneGfx.lineStyle(6, 0xffffff, 1).strokeCircle(z.cx * BU, z.cy * BU, z.r * BU - 3); // 정답 구역 강조
    }
  }

  // ---------- 매 프레임 ----------
  update(_time, delta) {
    const now = performance.now();
    this._drawTelegraph(now);
    this.uzl.update(now);
    tetherLines(this, now);
    this.wallLayer.update(now);
    const k = Math.min(1, (delta / 1000) * 20); // 위치 보간 (끊김 완화)
    for (const v of this.views.values()) {
      const p = v.p;
      v.x += (v.tx - v.x) * k;
      v.y += (v.ty - v.y) * k;
      const hop = v.hopUntil > now ? Math.sin(Math.PI * (1 - (v.hopUntil - now) / 350)) * 1.3 * BU : 0; // 도약: 포물선으로 뜸
      v.sprite.setPosition(v.x, v.y - hop).setDepth(v.y);
      this._dust(v, p, now);
      if (p.ub > 0 && !p.sl) auraTick(this, v, now, BU); else auraOff(v);
      if (p.bn) burnTick(this, v, now, BU);
      if (p.cm) heartTick(this, v, now, BU);
      orbitTick(this, v, now, BU);
      v.sprite.setFlipX(p.f < 0);
      const tint = p.tn ? parseInt(p.tn.slice(1), 16) : 0; // 캐릭터가 바뀌면 임시 색과 크기도 따라감
      if (tint !== v.tint) { v.tint = tint; if (tint) v.sprite.setTint(tint); else v.sprite.clearTint(); }
      v.zsCur = (v.zsCur ?? (p.zs || 1)) + ((p.zs || 1) - (v.zsCur ?? (p.zs || 1))) * Math.min(1, (delta / 1000) * 8); // 진화 등 크기 변화는 부드럽게
      v.sprite.setScale(SPR_SCALE * v.zsCur);

      // 모션: 공격 중이면 유지, 아니면 이동 상태에 맞춰
      const dies = p.st && sprites[p.s]?.die; // 기절하면 죽음 모션을 한 번 재생하고 누운 채로 둠
      const chan = p.ch && sprites[p.s]?.ult; // 채널링 궁극기 중엔 전용 모션을 계속 재생
      if (dies) { if (!v.dead) { v.dead = true; v.sprite.play(`${p.s}-die`); } }
      else if (chan) { v.dead = false; v.sprite.play(`${p.s}-ult`, true); }
      else { v.dead = false; if (now >= v.punchUntil) v.sprite.play(`${p.s}-${p.st ? 'idle' : p.a}`, true); }

      // 맞았을 때 0.1초 하얗게
      if (now < v.flashUntil) { v.sprite.setTintFill(0xffffff); v.flashing = true; }
      else if (v.flashing) { v.sprite.clearTint(); if (v.tint) v.sprite.setTint(v.tint); v.flashing = false; }

      // 기절: 쓰러진 모습 / 무적: 깜빡임
      v.sprite.setAngle(p.st && !dies ? 80 * p.f : 0);
      v.sprite.setAlpha(p.sl ? (p.id === this.focusId ? 0.35 : 0.12) : p.inv ? 0.45 + 0.35 * Math.sin(now / 70) : 1); // 은신 / 무적 깜빡임

      // 체력바 + 이름: 하트 + 칸 나뉜 바 (내 것은 크게, 남의 것은 작게)
      const me = p.id === this.focusId, sz = me ? 1 : 0.72;
      const bw = 1.9 * BU * sz * (me ? 0.8 : 1), bh = Math.round(14 * sz * (me ? 0.7 : 1)), bd = 2; // 내 바: 가로 20%·세로 30% 줄임
      // 머리 위 UI는 캐릭터의 실제 머리 꼭대기 위에 쌓는다 (내 게이지가 아래로 늘어나도 캐릭터를 가리지 않게 전체를 위로 올림)
      const headPx = (SPRITE.anchor[1] - (BOUNDS[p.s] ?? 20)) * SPR_SCALE * (v.zsCur ?? (p.zs || 1));
      const GH = 3.5, GG = 5, gauges = me ? (p.mam ? 1 : 0) + (p.mrg ? 1 : 0) : 0, below = gauges ? GG + gauges * GH + (gauges - 1) * GG + 2 : 0;
      const by = v.y - headPx - 10 - below - bh - bd;
      const bx0 = v.x - bw / 2; // 바 왼쪽 끝
      const bx = v.x;
      const f = Math.max(0, p.hp / p.mhp), low = f <= 0.3;
      v.bar.clear().setDepth(v.y + 1);
      v.bar.fillStyle(THEME.ink, 1).fillRect(bx0 - bd, by - bd, bw + bd * 2, bh + bd * 2); // 남색 테두리
      v.bar.fillStyle(THEME.hpEmpty, 1).fillRect(bx0, by, bw, bh);
      v.bar.fillStyle(low ? THEME.hpLow : THEME.hpFill, 1).fillRect(bx0, by, bw * f, bh);
      v.bar.fillStyle(THEME.hpShine, 0.55).fillRect(bx0, by, bw * f, Math.max(2, bh * 0.28)); // 윗면 하이라이트
      for (let i = 1; i < 5; i++) v.bar.fillStyle(THEME.ink, 0.8).fillRect(bx0 + (bw * i) / 5 - 1, by, 2, bh); // 5칸 눈금
      v.shoe.setVisible(p.sp > 0).setPosition(bx0 + bw + 14, by + bh / 2).setDepth(v.y + 2).setAlpha(p.sp < 1 ? 0.5 + 0.5 * Math.sin(now / 60) : 1); // 신발 효과 중
      if (me) { // 탄창 · 대쉬 게이지는 내 것만 (빔프로젝터엔 내 캐릭터가 없어서 안 나옴)
        const h = GH, bar2 = (x0, y0, w, f, col) => v.bar.fillStyle(THEME.ink, 1).fillRect(x0 - 1.5, y0 - 1.5, w + 3, h + 3).fillStyle(THEME.hpEmpty, 1).fillRect(x0, y0, w, h).fillStyle(col, 1).fillRect(x0, y0, w * f, h);
        let y0 = by + bh + GG;
        if (p.mam) { // 탄창: 가득 = 주황, 장전 중인 칸은 차오름
          const gap = 4, sw = (bw - gap * (p.mam - 1)) / p.mam;
          for (let i = 0; i < p.mam; i++) bar2(bx0 + i * (sw + gap), y0, sw, i < p.am ? 1 : i === p.am ? p.amf : 0, THEME.ammo);
          y0 += h + GG;
        }
        if (p.mrg) { bar2(bx0, y0, bw, Math.min(1, p.rg / p.mrg), p.rg >= p.mrg ? THEME.dashReady : THEME.dash); y0 += h + GG; } // 대쉬 쿨타임 / 달리기 게이지
      }
      v.name.setPosition(bx, by - 8).setDepth(v.y + 1);
      v.status.setText('').setPosition(bx, by - 32).setDepth(v.y + 1); // 상태이상 글자는 쓰지 않음
      const shown = Math.max(0, (p.cn || 0) - (v.pending || 0)); // 습득 연출이 끝나야 '기록'됨
      const bk = Math.max(0, 1 - (now - v.bump) / 250);
      v.coinIcon.setVisible(shown > 0).setPosition(bx0 + bw + (p.sp > 0 ? 40 : 18), by + 7).setDepth(v.y + 1).setScale(1.5 * (1 + 0.45 * bk));
      v.coinTxt.setVisible(shown > 0).setText(`×${shown}`).setPosition(bx0 + bw + (p.sp > 0 ? 52 : 30), by + 7).setDepth(v.y + 1);
    }
    this.coins.update(now);
    this.items.update(now);
    this.proj.update(now);
    this._drawAim(now);
    this.onFrame?.(this, delta);
  }
}

export function startWorld(parentId, opts = {}) {
  const scene = new WorldScene();
  let config;
  if (opts.fill) {
    // 부모 영역을 가득 채우는 모드(폰 세로 화면용). 고해상도 화면에서도 선명하도록 dpr배로 그린다.
    const parent = document.getElementById(parentId);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    config = { width: Math.round(parent.clientWidth * dpr), height: Math.round(parent.clientHeight * dpr), scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr } };
    scene.dpr = dpr;
  } else {
    config = { width: WORLD_W, height: WORLD_H, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } };
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: parentId, backgroundColor: '#2b4d2a', scene, render: { antialias: true }, ...config });
  if (opts.fill) {
    const parent = document.getElementById(parentId);
    addEventListener('resize', () => game.scale.resize(Math.round(parent.clientWidth * scene.dpr), Math.round(parent.clientHeight * scene.dpr)));
  }
  return { game, scene };
}
