// Buttons that are not ready yet — "Prüfen" before every gap is filled, "Test starten" before
// a word is chosen — stay tappable and say why. A grey `disabled` button swallowed the tap
// without a word, and the session replays showed what learners do then: tap it again and
// again (rage clicks), then give up.
//
// The rule, site-wide: a not-ready button is never `disabled`. It carries
//
//   aria-disabled="true"      looks and reads as not available (CSS below, screen readers)
//   data-why="…"              what is missing, in the learner's language ("Noch 3 Lücken offen …")
//   data-why-mark="selector"  optional: what to light up — the open gaps, the tiles left —
//                             looked for in the button's nearest ancestor that has any
//
// and this module, loaded on every page by Layout.astro, catches the tap before the button's
// own handler: a bubble at the button says the reason, the marked parts pulse, and the button
// fires `da:notready` (bubbling) for an exercise that wants to keep its own marks. Engines
// that build HTML use waitAttrs(); live elements use setWaiting(). Busy states (sending,
// loading) are not this: those stay `disabled`.
import "../styles/not-ready.css";
import { currentPath } from "./paths.js";

/** The attributes for a button's markup: `why` set = not ready, null/"" = ready (empty string). */
export function waitAttrs(why, mark) {
  if (!why) return "";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return ` aria-disabled="true" data-why="${esc(why)}"${mark ? ` data-why-mark="${esc(mark)}"` : ""}`;
}

/** The same on a live button. */
export function setWaiting(btn, why, mark) {
  if (!btn) return;
  btn.disabled = false;
  if (why) {
    btn.setAttribute("aria-disabled", "true");
    btn.dataset.why = why;
    if (mark) btn.dataset.whyMark = mark;
    else delete btn.dataset.whyMark;
  } else {
    btn.removeAttribute("aria-disabled");
    delete btn.dataset.why;
    delete btn.dataset.whyMark;
  }
}

/* ------------------------------------------------------------------ the tap ---- */
let bubble = null;
let hideTimer = null;
const lastTrack = new WeakMap();

function placeBubble(btn, text) {
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.className = "nr-bubble";
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    document.body.append(bubble);
  }
  bubble.textContent = text;
  bubble.hidden = false;
  bubble.classList.remove("is-in");
  // Below where there is room, else above; never off the screen's edges. Below, because what
  // is missing sits above a check button (and above a gap is the sentence it belongs to).
  const r = btn.getBoundingClientRect();
  const b = bubble.getBoundingClientRect();
  const gap = 10;
  const above = r.bottom + gap + b.height > innerHeight - 8 && r.top - b.height - gap > 8;
  const top = above ? r.top - b.height - gap : r.bottom + gap;
  const left = Math.min(Math.max(r.left + r.width / 2 - b.width / 2, 12), innerWidth - b.width - 12);
  bubble.style.top = `${Math.round(top)}px`;
  bubble.style.left = `${Math.round(left)}px`;
  bubble.style.setProperty("--nr-arrow", `${Math.round(r.left + r.width / 2 - left)}px`);
  bubble.classList.toggle("is-below", !above);
  void bubble.offsetWidth;
  bubble.classList.add("is-in");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, 4500);
}

function hide() {
  clearTimeout(hideTimer);
  if (bubble) bubble.hidden = true;
}

/** Lights up what is missing; returns the first of it when it had to be scrolled into view. */
function mark(btn) {
  const sel = btn.dataset.whyMark;
  if (!sel) return null;
  let found = [];
  for (let p = btn.parentElement; p && !found.length; p = p.parentElement) {
    try { found = [...p.querySelectorAll(sel)]; } catch { return null; }
    if (p === document.body) break;
  }
  for (const el of found) {
    el.classList.remove("nr-missing");
    void el.offsetWidth;
    el.classList.add("nr-missing");
    el.addEventListener("animationend", () => el.classList.remove("nr-missing"), { once: true });
  }
  const first = found[0];
  if (!first) return null;
  const r = first.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= innerHeight) return null;
  first.scrollIntoView({ block: "center", behavior: "smooth" });
  return first;
}

// Our own scrolling (to the missing part) must not close the bubble it is about to show.
let ownScrollUntil = 0;

function onTap(e) {
  const btn = e.target instanceof Element && e.target.closest('[aria-disabled="true"][data-why]');
  if (!btn) return;
  // Before the button's own handler, and before a form submits.
  e.preventDefault();
  e.stopImmediatePropagation();
  const why = btn.dataset.why;
  const away = mark(btn);
  if (away) {
    // The missing part was out of sight: the page goes there, and the bubble with it.
    ownScrollUntil = Date.now() + 900;
    hide();
    setTimeout(() => placeBubble(away, why), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450);
  } else {
    placeBubble(btn, why);
  }
  btn.classList.remove("nr-nudge");
  void btn.offsetWidth;
  btn.classList.add("nr-nudge");
  btn.dispatchEvent(new CustomEvent("da:notready", { bubbles: true, detail: { why: btn.dataset.why } }));
  // How often learners hit a not-ready button, and where: once per button per few seconds.
  const now = Date.now();
  if (now - (lastTrack.get(btn) ?? 0) > 5000) {
    lastTrack.set(btn, now);
    import("./track.js").then(({ track }) => track("not_ready_tap", { path: currentPath(), why: btn.dataset.why.slice(0, 80) })).catch(() => {});
  }
}

if (typeof document !== "undefined" && !window.__daNotReady) {
  window.__daNotReady = true;
  document.addEventListener("click", onTap, true);
  // Moving on hides the bubble: a scroll, or a tap anywhere else.
  addEventListener("scroll", () => { if (bubble && !bubble.hidden && Date.now() > ownScrollUntil) hide(); }, { passive: true, capture: true });
  document.addEventListener("pointerdown", (e) => {
    if (bubble && !bubble.hidden && !(e.target instanceof Element && e.target.closest('[aria-disabled="true"][data-why]'))) hide();
  }, true);
}
