// Artikel-Flitzer: keys and swipes become four actions (left, right, jump, duck) plus pause.
// Swipes are read on the stage element, which has touch-action: none so the page does not
// scroll under the thumb.

const KEYS = {
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowUp: "jump", KeyW: "jump", Space: "jump",
  ArrowDown: "duck", KeyS: "duck",
  KeyP: "pause", Escape: "pause",
};

/**
 * @param {HTMLElement} stage the element swipes are read on
 * @param {(action: string) => void} onAction
 * @param {() => boolean} active whether the game wants keys right now (else the page keeps them)
 */
export function bindInput(stage, onAction, active) {
  const onKey = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const a = KEYS[e.code];
    if (!a || !active()) return;
    // Space and Enter on a focused button belong to the button.
    if (e.code === "Space" && e.target instanceof HTMLElement && e.target.closest("button, a, input, select")) return;
    // Held keys repeat: swallow the repeats too, or the arrows scroll the page.
    e.preventDefault();
    if (e.repeat) return;
    onAction(a);
  };
  window.addEventListener("keydown", onKey);

  let start = null;
  const MIN = 24;
  const down = (e) => {
    if (!active()) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false };
  };
  const move = (e) => {
    if (!start || start.done || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN) return;
    // Fire as soon as the thumb has moved far enough: waiting for the lift feels laggy.
    start.done = true;
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx < 0 ? "left" : "right");
    else onAction(dy < 0 ? "jump" : "duck");
  };
  const up = () => { start = null; };
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);

  return () => {
    window.removeEventListener("keydown", onKey);
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerup", up);
    stage.removeEventListener("pointercancel", up);
  };
}
