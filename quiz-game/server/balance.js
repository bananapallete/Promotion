// 캐릭터 균형 계산: 초당 피해(DPS)와 전투력 지수. 테스트와 tools/balance.mjs가 함께 쓴다.
const HIT = { stone: 0.8, arrow: 0.9, orb: 0.65, spark: 0.8, star: 0.8, bottle: 0.75 }; // 투사체는 피할 수 있어서 명중률을 깎는다
const AREA = 1.15; // 범위·관통 공격은 평균 1.15명을 맞힌다고 본다

/** 초당 피해: 기본 공격(콤보는 3타 평균) × 명중률 × 범위 + 돌진 피해를 쿨타임으로 나눈 값 */
export function dpsOf(c) {
  const a = c.attack;
  const comboMul = a.combo ? (2 + (a.combo[2].dmg ?? 1)) / 3 : 1;
  const basic = ((a.dmgMin + a.dmgMax) / 2) * comboMul / a.interval;
  const hit = a.projectile ? HIT[a.projectile.art] ?? 0.8 : a.fx === 'tongue' ? 0.95 : 1;
  const skill = c.skill?.hitDmg ? c.skill.hitDmg / c.skill.cooldown : 0;
  return { basic, dps: basic * hit * (a.multi ? AREA : 1) + skill };
}

/** 전투력 지수: sqrt(체력 × DPS) × 사거리 보정 × 이동 속도 보정 */
export function powerIndex(c) {
  return Math.sqrt(c.hp * dpsOf(c).dps) * (1 + 0.1 * (c.attack.range - 1.2)) * (c.walkSpeed / 6) ** 0.3;
}
