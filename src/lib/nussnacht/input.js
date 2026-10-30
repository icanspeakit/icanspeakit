// Hamstis Nussnacht: keyboard, touch and gamepad, read once per tick as
// { mx, my, art, skill, pick } – exactly what the simulation takes and the replay records.
//
//   Desktop  WASD / arrows move · 1 2 3 or J K L = a an some · Space = skill · Esc / P = pause
//   Touch    a floating joystick on the left half · three article buttons on the right
//            (thumb zone) · the skill button above them
//   Gamepad  left stick / d-pad · X a, A an, B some (LB/RB step through) · Y skill · Start pause
//
// Movement is rounded to 1/64 so a recorded run stays small and replays bit for bit.

const KEYS_ART = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2, KeyJ: 0, KeyK: 1, KeyL: 2 };
const KEYS_MOVE = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const q = (v) => Math.round(Math.max(-1, Math.min(1, v)) * 64) / 64;

export function createInput({ stage, stick, knob, artButtons, skillButton, onPause, onArt, choosing }) {
  const held = new Set();
  let art = 0;
  let skillPress = false;
  let pick = -1;
  let joy = null; // { id, x0, y0, x, y }
  const JOY_R = 52;

  function setArt(a) {
    if (a === art) return;
    art = a;
    onArt?.(a);
  }

  function keydown(e) {
    if (e.target?.closest?.("input, textarea, select")) return;
    if (e.code === "Escape" || e.code === "KeyP") { onPause?.(); e.preventDefault(); return; }
    if (choosing?.()) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (n != null) { pick = n; e.preventDefault(); }
      return;
    }
    if (e.code in KEYS_ART) { setArt(KEYS_ART[e.code]); e.preventDefault(); return; }
    if (e.code === "Space") { skillPress = true; e.preventDefault(); return; }
    if (e.code in KEYS_MOVE) { held.add(e.code); e.preventDefault(); }
  }
  function keyup(e) { held.delete(e.code); }
  function blur() { held.clear(); joy = null; showStick(); }

  // ---- touch joystick: anywhere on the left half of the stage ----------------------------
  function pdown(e) {
    if (e.pointerType === "mouse" || joy) return;
    if (e.target.closest("button, a, [data-nn-card]")) return;
    const r = stage.getBoundingClientRect();
    if (e.clientX - r.left > r.width * 0.6) return;
    joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    try { stage.setPointerCapture(e.pointerId); } catch {}
    showStick();
    e.preventDefault();
  }
  function pmove(e) {
    if (!joy || e.pointerId !== joy.id) return;
    joy.x = e.clientX; joy.y = e.clientY;
    // the base follows a thumb that slides past the rim, so the stick never "sticks"
    const dx = joy.x - joy.x0, dy = joy.y - joy.y0;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R * 1.4) { joy.x0 = joy.x - (dx / d) * JOY_R * 1.4; joy.y0 = joy.y - (dy / d) * JOY_R * 1.4; }
    showStick();
  }
  function pup(e) {
    if (!joy || e.pointerId !== joy.id) return;
    joy = null;
    showStick();
  }
  function showStick() {
    if (!stick) return;
    if (!joy) { stick.hidden = true; return; }
    const r = stage.getBoundingClientRect();
    stick.hidden = false;
    stick.style.transform = `translate(${joy.x0 - r.left}px, ${joy.y0 - r.top}px)`;
    let dx = joy.x - joy.x0, dy = joy.y - joy.y0;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx = (dx / d) * JOY_R; dy = (dy / d) * JOY_R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  // ---- article and skill buttons (touch and mouse) -------------------------------------------
  artButtons.forEach((b, i) => {
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); setArt(i); });
    b.addEventListener("click", (e) => { e.preventDefault(); if (e.detail === 0) setArt(i); });
  });
  skillButton?.addEventListener("pointerdown", (e) => { e.preventDefault(); skillPress = true; });
  skillButton?.addEventListener("click", (e) => { if (e.detail === 0) skillPress = true; });

  // ---- gamepad ---------------------------------------------------------------------------------
  let padPrev = [];
  function pad() {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) {
      if (!p) continue;
      const btn = (i) => !!p.buttons[i]?.pressed;
      const edge = (i) => btn(i) && !padPrev[i];
      if (choosing?.()) {
        if (edge(2)) pick = 0; else if (edge(0)) pick = 1; else if (edge(1)) pick = 2;
      } else {
        if (edge(2)) setArt(0);
        if (edge(0)) setArt(1);
        if (edge(1)) setArt(2);
        if (edge(4)) setArt((art + 2) % 3);
        if (edge(5)) setArt((art + 1) % 3);
        if (edge(3)) skillPress = true;
      }
      if (edge(9)) onPause?.();
      padPrev = p.buttons.map((b) => b.pressed);
      let x = p.axes[0] ?? 0, y = p.axes[1] ?? 0;
      if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
      if (Math.hypot(x, y) < 0.18) { x = 0; y = 0; }
      return [x, y];
    }
    return null;
  }

  addEventListener("keydown", keydown);
  addEventListener("keyup", keyup);
  addEventListener("blur", blur);
  stage.addEventListener("pointerdown", pdown);
  stage.addEventListener("pointermove", pmove);
  stage.addEventListener("pointerup", pup);
  stage.addEventListener("pointercancel", pup);

  /** One tick's input. The skill press and a card pick are used up by the read. */
  function sample() {
    let mx = 0, my = 0;
    for (const c of held) { mx += KEYS_MOVE[c][0]; my += KEYS_MOVE[c][1]; }
    if (joy) {
      const dx = joy.x - joy.x0, dy = joy.y - joy.y0;
      const d = Math.hypot(dx, dy);
      if (d > 6) { const f = Math.min(1, d / JOY_R); mx = (dx / d) * f; my = (dy / d) * f; }
    }
    const g = pad();
    if (g && (g[0] || g[1])) { mx = g[0]; my = g[1]; }
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    const out = { mx: q(mx), my: q(my), art, skill: skillPress, pick };
    skillPress = false;
    pick = -1;
    return out;
  }

  return {
    sample,
    setArt,
    pick: (n) => { pick = n; },
    get art() { return art; },
    reset() { held.clear(); joy = null; art = 0; skillPress = false; pick = -1; showStick(); },
    release() { held.clear(); joy = null; showStick(); },
  };
}
