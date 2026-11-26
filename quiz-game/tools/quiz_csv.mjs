// 퀴즈 시트(CSV) → 서버가 읽는 JSON. 구글 시트에서 [파일 → 다운로드 → CSV]로 받은 파일을 쓴다.
// 사용: node tools/quiz_csv.mjs design/quiz-template.csv server/quizzes.json   (서버 실행 때 QUIZ_FILE=server/quizzes.json)
// 열: 번호,유형(ox|choice|real),문제,보기1~4,정답,제한시간(초),방식(개인|팀|현실),이미지(URL, 선택)
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
function parse(text) { // 따옴표·쉼표·줄바꿈을 아는 작은 CSV 파서
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; } else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
const [head, ...rows] = parse(readFileSync(src, 'utf8').replace(/^﻿/, ''));
const col = (r, name) => (r[head.indexOf(name)] ?? '').trim();
const quizzes = rows.map((r, i) => {
  const type = col(r, '유형') || 'ox', q = { type, text: col(r, '문제'), time: Number(col(r, '제한시간')) || 15, mode: col(r, '방식') || '개인' };
  if (type === 'choice') { q.options = ['보기1', '보기2', '보기3', '보기4'].map((n) => col(r, n)).filter(Boolean); q.answer = Number(col(r, '정답')); if (!q.options.length || !(q.answer >= 1 && q.answer <= q.options.length)) throw new Error(`${i + 2}행: 객관식은 보기와 정답(1~보기 수)이 필요해요`); }
  else if (type === 'ox') { q.answer = col(r, '정답').toUpperCase(); if (!['O', 'X'].includes(q.answer)) throw new Error(`${i + 2}행: OX 정답은 O 또는 X`); }
  else q.answer = null; // real: 현실 퀴즈는 관리자가 점수를 직접 부여
  if (col(r, '이미지')) q.image = col(r, '이미지');
  if (!q.text) throw new Error(`${i + 2}행: 문제가 비었어요`);
  return q;
});
writeFileSync(out, JSON.stringify(quizzes, null, 2) + '\n'); console.log(`${quizzes.length}문제 → ${out}`);
