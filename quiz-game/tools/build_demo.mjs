// 솔로 데모를 단일 HTML로 만든다: node tools/build_demo.mjs [출력경로]
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
await build({ root, configFile: path.join(root, 'vite.demo.config.js'), logLevel: 'warn' });
const js = readFileSync(path.join(root, 'demo/dist/demo.js'), 'utf8').replaceAll('</script', '<\\/script');
const tpl = readFileSync(path.join(root, 'demo/template.html'), 'utf8');
const out = process.argv[2] || path.join(root, 'demo/dist/quiz-demo.html');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, tpl.replace('/*BUNDLE*/', () => js));
console.log('wrote', out, `${(readFileSync(out).length / 1e6).toFixed(2)}MB`);
