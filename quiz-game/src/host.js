import { io } from 'socket.io-client';
import { PHASE } from '../shared/constants.js';

const $ = (s) => document.querySelector(s);
const socket = io();
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'quiz_host_key';
const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

let chars = {};

function auth(key) {
  socket.emit('host:auth', key, (res) => {
    if (!res?.ok) { $('#auth').hidden = false; $('#app').hidden = true; $('#aerr').textContent = key ? '키가 맞지 않아요' : ''; return; }
    try { localStorage.setItem(KEY, key); } catch { /* ignore */ }
    $('#auth').hidden = true; $('#app').hidden = false;
    renderQuestions(res.questions);
  });
}
socket.on('connect', () => auth(getKey()));
$('#login').addEventListener('click', () => auth($('#key').value.trim()));

fetch('/api/characters').then((r) => r.json()).then((c) => {
  chars = c;
  $('#b-char').innerHTML = Object.entries(c).map(([id, v]) => `<option value="${id}">${esc(v.name)}</option>`).join('');
});

socket.on('host:info', (i) => renderQuestions(i.questions));

function renderQuestions(list) {
  $('#qlist').innerHTML = list.map((q) => `
    <div class="qrow">
      <div class="txt">${q.id}. ${esc(q.text)}<small>${q.type === 'ox' ? 'O/X' : '객관식'} · 정답 ${esc(q.answer)} · ${q.time}초</small></div>
      <button class="go" data-ask="${q.id}">출제</button>
    </div>`).join('');
}
$('#qlist').addEventListener('click', (e) => {
  const id = e.target.dataset?.ask;
  if (id) socket.emit('host:ask', { id: Number(id) });
});

$('#end').addEventListener('click', () => socket.emit('host:end'));
$('#gather').addEventListener('click', () => socket.emit('host:gather'));
$('#reset').addEventListener('click', () => { if (confirm('모든 점수를 0으로 되돌릴까요?')) socket.emit('host:reset'); });

$('#q-add').addEventListener('click', () => {
  const text = $('#q-text').value.trim();
  if (!text) return;
  const type = $('#q-type').value;
  const raw = $('#q-ans').value.trim().toUpperCase();
  socket.emit('host:addQuestion', { type, text, answer: type === 'ox' ? raw : Number(raw), time: Number($('#q-time').value) });
  $('#q-text').value = '';
});

$('#b-add').addEventListener('click', () => socket.emit('host:addBot', { mode: $('#b-mode').value, charId: $('#b-char').value, count: Number($('#b-count').value) }));
$('#b-clear').addEventListener('click', () => socket.emit('host:clearBots'));

const phaseName = { [PHASE.LOBBY]: '대기', [PHASE.READING]: '문제 읽는 중', [PHASE.MOVING]: '이동 중', [PHASE.REVEAL]: '정답 공개' };
socket.on('state', (s) => {
  $('#s-phase').textContent = `상태: ${phaseName[s.phase]}`;
  $('#s-left').textContent = s.left > 0 ? `남은 시간 ${Math.ceil(s.left)}초` : '타이머 없음';
  const humans = s.players.filter((p) => !p.b);
  $('#s-players').textContent = `참가자 ${humans.length}명 · 봇 ${s.players.length - humans.length}`;

  const scoreOf = Object.fromEntries((s.lb || []).map((r) => [r.id, r.score]));
  $('#plist').innerHTML = [...s.players].sort((a, b) => (b.sc - a.sc)).map((p) =>
    `<tr><td>${p.b ? '🤖 ' : ''}${esc(p.n)}</td><td>${esc(chars[p.c]?.name || p.c)}</td><td>${p.st ? '기절' : `${p.hp}/${p.mhp}`}</td><td>${p.b ? '-' : (scoreOf[p.id] ?? p.sc)}</td><td>${p.inv ? '무적' : ''}</td></tr>`).join('');

  if (s.phase === PHASE.REVEAL && s.reveal) {
    const ok = s.reveal.results.filter((r) => r.correct).sort((a, b) => a.rank - b.rank);
    $('#revealbox').innerHTML = `정답 <b>${esc(s.reveal.answer)}</b> · 정답자 ${ok.length}/${s.reveal.results.length}명<br>` + ok.map((r) => `${r.rank}등 ${esc(r.name)} (+${r.gain})`).join(' · ');
  } else $('#revealbox').textContent = '';
});
