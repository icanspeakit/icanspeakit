// Settings every learner game shares: one sound switch for all of them (muting Bruno Kart
// mutes Hör-Safari too) and the system's "reduce motion". Each game passes what its old
// key said, so nobody who muted a game hears it again.
//
//   gameMuted(legacy)    true when the learner switched sound off in any game
//   setGameMuted(m)      saves it for every game and tells the open ones (GAME_MUTE_EVENT)
//   reducedMotion()      prefers-reduced-motion: no shake, no flashing, calmer transitions
// and one volume slider for all of them, see "Volume" below.

const KEY = "da.spiele.muted";
export const GAME_MUTE_EVENT = "da:spiele-muted";

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

// legacy: what the game's own old key said (its caller reads it), used until the shared
// key exists.
export function gameMuted(legacy = false) {
  const v = read(KEY);
  return v == null ? !!legacy : v === "1";
}

export function setGameMuted(m) {
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch {}
  dispatchEvent(new CustomEvent(GAME_MUTE_EVENT, { detail: { muted: !!m } }));
}

export function reducedMotion() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/* ---- Volume ----------------------------------------------------------------------------
   One volume for every learner game and the live quiz (0–1, remembered per browser as
   "da.lautstaerke"). It sits on top of the mute switches: a switch still says on/off, the
   slider says how loud "on" is.

     volume()            current level, 0–1
     setVolume(v)        saves it and turns every open game up or down at once
     volumeOut(ctx)      a GainNode in front of ctx.destination; connect there instead
     applyVolume(audio)  for <audio>/new Audio() clips (call before play())
     speechVolume()      for SpeechSynthesisUtterance.volume

   Importing this module also puts a slider next to every sound button on the page
   ([data-mute], [data-sound-toggle], [data-sound], [data-music]), including ones a game
   renders later. Only games import it, so other pages' sound buttons stay alone.
   Where there is no such button, or no room next to it (then the button gets data-vol-skip),
   the page puts <label class="da-vol-row" data-vol-slot><span>Volume</span></label>
   somewhere calm (start or pause screen); the slider goes inside that label. */

const VOLUME_KEY = "da.lautstaerke";
export const VOLUME_EVENT = "da:lautstaerke";

const clamp = (v) => Math.min(1, Math.max(0, v));
const saved = parseFloat(read(VOLUME_KEY));
let level = Number.isFinite(saved) ? clamp(saved) : 1;

// Perceived loudness is roughly logarithmic; squaring the slider makes its middle sound
// like the middle instead of almost full.
const gainOf = (v) => v * v;

export const volume = () => level;
export const speechVolume = () => level;

const outs = new Map(); // AudioContext -> GainNode
const media = new Set(); // audio elements we were handed (pruned once finished)

export function volumeOut(ctx) {
  let g = outs.get(ctx);
  if (!g) {
    g = ctx.createGain();
    g.gain.value = gainOf(level);
    g.connect(ctx.destination);
    outs.set(ctx, g);
  }
  return g;
}

export function applyVolume(el) {
  if (!el) return el;
  try { el.volume = level; } catch {}
  media.add(el);
  return el;
}

export function setVolume(v) {
  level = clamp(Number(v) || 0);
  try { localStorage.setItem(VOLUME_KEY, String(level)); } catch {}
  for (const [ctx, g] of outs) {
    if (ctx.state === "closed") { outs.delete(ctx); continue; }
    g.gain.setTargetAtTime(gainOf(level), ctx.currentTime, 0.03);
  }
  for (const el of media) {
    if (!el.isConnected && el.ended) { media.delete(el); continue; }
    try { el.volume = level; } catch {}
  }
  syncSliders();
  dispatchEvent(new CustomEvent(VOLUME_EVENT, { detail: { volume: level } }));
}

/* ---- Sliders --------------------------------------------------------------------------- */

const SLOTS = "[data-mute], [data-sound-toggle], [data-sound], [data-music], [data-vol-slot]";

function syncSliders() {
  const pct = Math.round(level * 100);
  document.querySelectorAll("input.da-vol").forEach((s) => {
    if (document.activeElement !== s) s.value = String(pct);
    s.style.setProperty("--vol", pct + "%");
    s.setAttribute("aria-valuetext", pct + " %");
  });
}

function addSlider(btn) {
  if (btn.dataset.volMounted || btn.hasAttribute("data-vol-skip")) return;
  btn.dataset.volMounted = "1";
  const s = document.createElement("input");
  s.type = "range";
  s.min = "0";
  s.max = "100";
  s.step = "5";
  s.className = "da-vol";
  s.title = "Volume";
  s.addEventListener("input", () => setVolume(s.valueAsNumber / 100));
  // Keyboard games listen on window (arrows steer, space shoots): keep the slider's keys
  // to the slider, and let go of focus after a pointer drag so the game gets them back.
  s.addEventListener("keydown", (e) => e.stopPropagation());
  s.addEventListener("pointerup", () => setTimeout(() => s.blur(), 0));
  if (btn.hasAttribute("data-vol-slot")) {
    s.dataset.i18nAttr = "title:spiel.volume"; // the <label> names it
    btn.append(s);
  } else {
    s.setAttribute("aria-label", "Volume");
    s.dataset.i18nAttr = "aria-label:spiel.volume;title:spiel.volume";
    btn.after(s);
  }
  translateLater();
}

let translating = false;
function translateLater() {
  if (translating) return;
  translating = true;
  queueMicrotask(() => {
    translating = false;
    syncSliders();
    import("./i18n.js").then((m) => m.retranslate()).catch(() => {});
  });
}

function scan(root) {
  if (root.matches?.(SLOTS)) addSlider(root);
  root.querySelectorAll?.(SLOTS).forEach(addSlider);
}

function injectCss() {
  if (document.getElementById("da-vol-css")) return;
  const st = document.createElement("style");
  st.id = "da-vol-css";
  st.textContent = `
.da-vol{--vol:100%;-webkit-appearance:none;appearance:none;flex:0 0 auto;align-self:center;
  width:4.5rem;min-width:2.75rem;flex-shrink:1;height:1.75rem;margin:0 .25rem;padding:0;background:transparent;cursor:pointer;
  color:inherit;touch-action:none;vertical-align:middle}
.da-vol::-webkit-slider-runnable-track{height:4px;border-radius:2px;
  background:linear-gradient(to right,currentColor var(--vol),color-mix(in srgb,currentColor 25%,transparent) var(--vol))}
.da-vol::-moz-range-track{height:4px;border-radius:2px;background:color-mix(in srgb,currentColor 25%,transparent)}
.da-vol::-moz-range-progress{height:4px;border-radius:2px;background:currentColor}
.da-vol::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;margin-top:-6px;
  border-radius:50%;background:currentColor;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.da-vol::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:currentColor;
  border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.da-vol:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:4px}
[hidden]+.da-vol{display:none}
.da-vol-row{display:flex;align-items:center;justify-content:center;gap:.75rem;margin:.25rem 0}
.da-vol-row .da-vol{width:10rem;flex:0 1 10rem}`;
  document.head.append(st);
}

function mount() {
  injectCss();
  scan(document.body);
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
  }).observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
}
