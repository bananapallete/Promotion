// 캐릭터 균형 계산: 초당 피해(DPS)와 전투력 지수. 테스트와 tools/balance.mjs가 함께 쓴다.
const HIT = { stone: 0.8, arrow: 0.9, orb: 0.65, spark: 0.8, star: 0.8, bottle: 0.65 }; // 투사체는 피할 수 있어서 명중률을 깎는다
const AREA = 1.15; // 범위·관통 공격은 평균 1.15명을 맞힌다고 본다
export const FIGHT_SEC = 10; // 한 번의 교전을 이만큼으로 보고 쏠 수 있는 발수를 센다

/** 교전 동안 쏠 수 있는 발수: 쿨타임 한계와 탄창(처음 가득 + 장전) 한계 중 작은 쪽 */
export function shotsOf(c, sec = FIGHT_SEC) {
  const a = c.attack, am = c.ammo;
  return Math.min(sec / a.interval, am ? am.max + sec / am.reload : Infinity);
}

/** 초당 피해: 기본 공격(콤보는 3타 평균) × 명중률 × 범위 + 돌진 피해를 쿨타임으로 나눈 값 */
export function dpsOf(c) {
  const a = c.attack;
  const comboMul = a.combo ? (2 + (a.combo[2].dmg ?? 1)) / 3 : 1;
  const basic = ((a.dmgMin + a.dmgMax) / 2) * comboMul * (1 + (a.critBonus ?? 0) * 0.5) * shotsOf(c) / FIGHT_SEC;
  const hit = a.projectile ? HIT[a.projectile.art] ?? 0.8 : a.fx === 'tongue' ? 0.95 : a.lineW ? 0.85 : 1; // 직선 주먹은 부채꼴보다 맞히기 어렵다
  const skill = c.skill?.hitDmg ? c.skill.hitDmg / c.skill.cooldown : 0;
  return { basic, dps: basic * hit * (a.multi ? AREA : 1) + skill };
}

/** 선택 화면의 별 1~5: 공격(DPS)·체력·걷기 속도를 21종 안에서의 순위로 환산 */
export function starsOf(chars) {
  const rows = Object.entries(chars).map(([id, c]) => ({ id, atk: dpsOf(c).dps, hp: c.hp, spd: c.walkSpeed }));
  const out = Object.fromEntries(rows.map((r) => [r.id, {}]));
  for (const k of ['atk', 'hp', 'spd']) {
    const sorted = [...rows].sort((a, b) => a[k] - b[k]);
    sorted.forEach((r, i) => { out[r.id][k] = 1 + Math.min(4, Math.floor((i / rows.length) * 5)); });
  }
  return out;
}

/** 전투력 지수: sqrt(체력 × DPS) × 사거리 보정 × 이동 속도 보정 */
export function powerIndex(c) {
  return Math.sqrt(c.hp * (1 + (c.guard ?? 0) * 0.5) * dpsOf(c).dps) * (1 + 0.1 * (c.attack.range - 1.2)) * (c.walkSpeed / 6) ** 0.3;
}
