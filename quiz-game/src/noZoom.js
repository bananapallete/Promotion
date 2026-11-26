// 연타·더블탭·핀치로 화면이 확대되는 것을 막고, 이미 확대됐으면 원래 배율로 되돌린다 (iOS는 user-scalable=no를 무시해서 직접 막아야 함)
const st = document.createElement('style');
st.textContent = 'html,body{touch-action:manipulation;-webkit-text-size-adjust:100%;overscroll-behavior:none}body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea{-webkit-user-select:text;user-select:text}';
document.head.append(st);

for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault(), { passive: false }); // iOS 핀치
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
let lastTouch = 0;
document.addEventListener('touchend', (e) => { // 0.35초 안의 두 번째 탭(더블탭 확대)은 기본 동작을 막는다. 입력칸은 제외
  const now = Date.now();
  if (now - lastTouch < 350 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.preventDefault();
  lastTouch = now;
}, { passive: false });
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false }); // 두 손가락 핀치

// 되돌리기: 어떻게든 확대됐으면 viewport 메타를 한 번 흔들어 1배로 복구
const meta = document.querySelector('meta[name="viewport"]');
const BASE = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
let fixing = false;
function reset() {
  if (!meta || fixing || !window.visualViewport || window.visualViewport.scale <= 1.02) return;
  fixing = true; meta.setAttribute('content', BASE + ', x=1'); // 값을 바꿔야 브라우저가 다시 계산함
  setTimeout(() => { meta.setAttribute('content', BASE); fixing = false; }, 120);
}
window.visualViewport?.addEventListener('resize', reset);
window.addEventListener('orientationchange', () => setTimeout(reset, 300));
setInterval(reset, 1500); // 혹시 놓친 경우
if (meta) meta.setAttribute('content', BASE);
