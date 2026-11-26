/** 버튼을 누른 채 끌면 그 방향으로 직접 조준, 탭만 하면 자동 조준(null). 놓을 때 fire(aim) 호출. 반환값 vec로 드래그 중인 방향을 읽을 수 있다 */
export function dragAim(btn, arrow, fire, canAim = () => true) { // canAim()이 거짓이면 누르는 즉시 fire(null)
  let id = null, s = null;
  const st = { vec: { x: 0, y: 0 }, active: false };
  btn.addEventListener('pointerdown', (e) => { if (!canAim()) { fire(null); return; } btn.setPointerCapture(e.pointerId); id = e.pointerId; s = { x: e.clientX, y: e.clientY }; st.vec = { x: 0, y: 0 }; st.active = true; });
  btn.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    st.vec = { x: e.clientX - s.x, y: e.clientY - s.y };
    const d = Math.hypot(st.vec.x, st.vec.y);
    arrow.style.opacity = d > 16 ? 1 : 0; arrow.style.width = `${Math.min(70, d)}px`; arrow.style.transform = `rotate(${Math.atan2(st.vec.y, st.vec.x)}rad)`;
  });
  const end = (e, cancel) => {
    if (e.pointerId !== id) return;
    id = null; st.active = false; arrow.style.opacity = 0;
    if (cancel) return;
    const d = Math.hypot(st.vec.x, st.vec.y);
    fire(d > 16 ? { x: st.vec.x / d, y: st.vec.y / d, m: Math.min(1, d / 70) } : null);
  };
  btn.addEventListener('pointerup', (e) => end(e, false)); btn.addEventListener('pointercancel', (e) => end(e, true));
  return st;
}
