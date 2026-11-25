import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import { fmtScore, PHASE } from '../shared/constants.js';
import { startWorld } from './world.js';

const $ = (s) => document.querySelector(s);
const { scene } = startWorld('game');
const socket = io();

socket.on('connect', () => { socket.emit('screen:join'); $('#conn').textContent = ''; });
socket.on('disconnect', () => { $('#conn').textContent = '연결 끊김'; });

// 입장 QR: 폰이 접속할 수 있는 주소여야 한다 (localhost로 열었으면 같은 와이파이 주소로 대체)
fetch('/api/info').then((r) => r.json()).then(async (info) => {
  let origin = info.publicUrl || location.origin;
  if (!info.publicUrl && /^(localhost|127\.)/.test(location.hostname) && info.lanOrigin) origin = info.lanOrigin;
  const url = `${origin}/play`;
  $('#joinurl').textContent = url;
  $('#qr').src = await QRCode.toDataURL(url, { margin: 1, width: 400 });
});

socket.on('state', (s) => {
  scene.applyState(s);
  hud(s);
});

function hud(s) {
  const banner = $('#banner'), timer = $('#timer'), reveal = $('#reveal'), lb = $('#lb');
  $('#join').hidden = s.phase !== PHASE.LOBBY;

  if (s.q && s.phase !== PHASE.LOBBY) {
    banner.hidden = false;
    banner.querySelector('.qn').textContent = `문제 ${s.q.id}`;
    banner.querySelector('.qt').textContent = s.q.text;
    banner.querySelector('.opts').textContent = s.q.type === 'choice' ? s.q.options.map((o, i) => `${i + 1}. ${o}`).join('   ') : '';
  } else banner.hidden = true;

  const counting = s.phase === PHASE.READING || s.phase === PHASE.MOVING;
  timer.hidden = !counting;
  if (counting) { timer.textContent = Math.ceil(s.left); timer.classList.toggle('low', s.phase === PHASE.MOVING && s.left <= 3); }

  if (s.phase === PHASE.REVEAL && s.reveal) {
    reveal.hidden = false;
    const ans = s.q.type === 'choice' ? `${s.reveal.answer}번` : s.reveal.answer;
    const winners = s.reveal.results.filter((r) => r.correct).sort((a, b) => a.rank - b.rank);
    const top = winners.slice(0, 3).map((r) => `${r.rank}등 ${r.name} +${r.gain}`).join('  ');
    reveal.innerHTML = `정답 ${ans} · ${winners.length}명<small>${top}</small>`;
  } else reveal.hidden = true;

  const rows = (s.lb || []).slice(0, 5);
  lb.hidden = !rows.length;
  lb.innerHTML = rows.map((r, i) => `<span>${i + 1}. ${esc(r.name)}<b>${fmtScore(r.score)}</b></span>`).join('');
}

function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
window.__world = scene; // 디버그/테스트용
