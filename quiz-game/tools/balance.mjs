// 캐릭터별 DPS와 전투력 지수 표: node tools/balance.mjs
import { readFileSync } from 'node:fs';
import { dpsOf, powerIndex } from '../server/balance.js';

const chars = JSON.parse(readFileSync(new URL('../server/characters.json', import.meta.url), 'utf8'));
const rows = Object.entries(chars).map(([id, c]) => ({ id, name: c.name, hp: c.hp, walk: c.walkSpeed, range: c.attack.range, ...dpsOf(c), noAmmo: dpsOf({ ...c, ammo: undefined }).basic, idx: powerIndex(c) }));
console.log('캐릭터'.padEnd(10), '체력', '걷기', '사거리', '탄창전', '기본DPS', '최종DPS', '지수');
for (const r of rows.sort((a, b) => b.idx - a.idx)) console.log(r.name.padEnd(10), String(r.hp).padStart(4), String(r.walk).padStart(4), String(r.range).padStart(5), r.noAmmo.toFixed(1).padStart(6), r.basic.toFixed(1).padStart(7), r.dps.toFixed(1).padStart(7), r.idx.toFixed(1).padStart(5));
const v = rows.map((r) => r.idx);
console.log(`\n평균 ${(v.reduce((a, b) => a + b) / v.length).toFixed(1)} · 최소 ${Math.min(...v).toFixed(1)} · 최대 ${Math.max(...v).toFixed(1)}`);
