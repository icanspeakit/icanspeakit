// The lesson clock: an analogue dial whose full circle is the whole lesson (e.g. 90 min),
// one coloured sector per phase as planned, and a hand at the time spent so far. Under the
// dial the current phase and its time left; past its planned end the sector is outlined
// red, the hand turns red and it says "+3 Min.". It never moves on by itself.
//
// Floats over the page (position: fixed), can be dragged by its head, folded to a pill and,
// in Chrome, popped out into its own always-on-top window (Document Picture-in-Picture);
// the button exists only where the API does. Where it sits and whether it is folded are
// kept in localStorage; on a phone it starts folded.
//
// For a learner (mode "lernend", /lesson) it is a soft guide, not a clock to beat: the
// sector of the step, „ca. 10 Min.“ for it and the time spent on it so far (so the learner
// sees it running), no red, no overrun, no total countdown, no
// pop-out. On a phone it starts hidden (the bar shows the time as text). Its own prefs key.
import css from "./uhr.css?raw";
import { phaseColor } from "./phasen.js";
import { view } from "./steuerung.js";
import { elapsed, mmss, plannedStarts } from "./timer.js";
import { about } from "./lernen.js";

const PREF_KEY = "da:unterricht-uhr";
const LERN_PREF_KEY = "da:lernstunde-uhr";
const RED = "#dc2626";

function readPrefs(key) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? {}; } catch { return {}; }
}
function writePrefs(p, key) {
  try { localStorage.setItem(key, JSON.stringify(p)); } catch {}
}

/* -------------------------------------------------------------- the dial ---- */

const C = 100;
const R_OUT = 92;
const R_IN = 62;
const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};
function sector(a0, a1, r1 = R_IN, r2 = R_OUT) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = pt(r2, a0);
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r1, a1);
  const [x3, y3] = pt(r1, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r2} ${r2} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
    + `L${x2.toFixed(2)} ${y2.toFixed(2)}A${r1} ${r1} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

/** The dial's static part (sectors, ticks) for a Stunde's steps; the hand is drawn on top. */
function dialSvg(steps, total_label = true) {
  const total = steps.reduce((s, st) => s + st.minutes, 0);
  const starts = plannedStarts(steps);
  const deg = (m) => (m / total) * 360;
  const sectors = steps.map((st, i) => {
    const a0 = deg(starts[i]);
    const a1 = deg(starts[i] + st.minutes) - 0.0001;
    return `<path data-sector="${i}" d="${sector(a0, a1)}" fill="${phaseColor(st.id).bg}" stroke="#fff" stroke-width="1.5"><title>${st.name} · ${st.minutes} min</title></path>`;
  }).join("");
  // A tick every 5 minutes, a longer one every 15.
  let ticks = "";
  for (let m = 0; m < total; m += 5) {
    const long = m % 15 === 0;
    const [x1, y1] = pt(R_IN - 2, deg(m));
    const [x2, y2] = pt(R_IN - (long ? 10 : 5), deg(m));
    ticks += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-opacity="${long ? 0.55 : 0.3}" stroke-width="${long ? 2 : 1.2}" stroke-linecap="round"/>`;
  }
  return `<svg class="ut-uhr-face" viewBox="0 0 200 200" role="img" aria-label="Clock: ${total} minutes, ${steps.length} phases">
    ${sectors}
    <path data-current d="" fill="none" stroke-width="3.5" stroke-linejoin="round"/>
    ${ticks}
    ${total_label ? `<text x="${C}" y="${C - 22}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" fill-opacity=".55">${total} min</text>` : ""}
    <line data-hand x1="${C}" y1="${C}" x2="${C}" y2="${C - R_OUT + 2}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${C}" cy="${C}" r="6" fill="currentColor"/>
  </svg>`;
}

/* -------------------------------------------------------------- the widget ---- */

export function mountUhr(ctl, { mode = "lehrkraft", onToggle = () => {} } = {}) {
  if (!document.getElementById("ut-uhr-css")) {
    document.head.append(Object.assign(document.createElement("style"), { id: "ut-uhr-css", textContent: css }));
  }
  const lern = mode === "lernend";
  const prefKey = lern ? LERN_PREF_KEY : PREF_KEY;
  const prefs = readPrefs(prefKey);
  const phone = matchMedia("(max-width: 600px)").matches;
  if (prefs.min == null) prefs.min = !lern && phone;
  // A learner's phone: hidden until asked for (the bar says „ca. 10 Min.“ anyway).
  if (lern && prefs.hidden == null) prefs.hidden = phone;

  const el = document.createElement("div");
  el.className = "ut-uhr";
  el.setAttribute("role", "timer");
  el.setAttribute("aria-label", lern ? "Lesson clock" : "Teaching clock");
  if (lern) el.classList.add("ut-uhr--lern");
  const pip = !lern && "documentPictureInPicture" in window;
  el.innerHTML = `
    <div class="ut-uhr-head" data-uhr-drag>
      <span class="ut-uhr-title" data-uhr-drag-hint>Clock</span>
      ${pip ? `<button type="button" class="ut-uhr-btn" data-uhr-pip title="Show in its own window above all other windows" aria-label="Pop out the clock">⧉</button>` : ""}
      <button type="button" class="ut-uhr-btn" data-uhr-min title="Make smaller" aria-label="Make the clock smaller">–</button>
      <button type="button" class="ut-uhr-btn" data-uhr-close title="Hide – “Clock” in the bar brings it back" aria-label="Hide the clock">×</button>
    </div>
    ${dialSvg(ctl.steps, !lern)}
    <div class="ut-uhr-text">
      <p class="ut-uhr-phase" data-uhr-phase></p>
      <p class="ut-uhr-left" data-uhr-left></p>
      <p class="ut-uhr-paused" data-uhr-paused hidden>Paused</p>
    </div>
    <button type="button" class="ut-uhr-badge" data-uhr-badge aria-label="Make the clock bigger"><i data-uhr-dot></i><span data-uhr-badge-text></span></button>`;
  document.body.append(el);
  const $ = (s) => el.querySelector(s);

  const total = ctl.steps.reduce((s, st) => s + st.minutes, 0);
  const starts = plannedStarts(ctl.steps);

  function render(state) {
    const v = view(state);
    const over = !lern && !!v.over;
    const col = phaseColor(v.step?.id);
    el.classList.toggle("ut-uhr--over", over);
    const deg = Math.min(360, (v.lessonMs / v.totalMs) * 360);
    const hand = $("[data-hand]");
    hand.setAttribute("transform", `rotate(${deg.toFixed(2)} ${C} ${C})`);
    hand.setAttribute("stroke", !lern && (over || v.lessonMs > v.totalMs) ? RED : "currentColor");
    const cur = $("[data-current]");
    const a0 = (starts[v.index] / total) * 360;
    const a1 = ((starts[v.index] + v.step.minutes) / total) * 360 - 0.0001;
    cur.setAttribute("d", sector(a0, a1, R_IN + 1.5, R_OUT - 1.5));
    cur.setAttribute("stroke", over ? RED : col.ink);
    $("[data-uhr-phase]").textContent = `${v.step.name} · ${v.index + 1}/${v.count}`;
    $("[data-uhr-phase]").style.color = col.ink;
    $("[data-uhr-left]").innerHTML = lern
      ? `${about(v.step.minutes)}<small>for this step</small><small class="ut-uhr-since">${v.running ? "running for" : "so far"} ${mmss(elapsed(state, Date.now()))}</small>`
      : over ? `${v.over}<small>over time</small>` : `${v.remaining}<small>left in this phase</small>`;
    $("[data-uhr-paused]").hidden = lern || v.running || v.completed;
    $("[data-uhr-paused]").textContent = v.interrupted ? "Paused – the tab was closed or asleep" : "Paused";
    $("[data-uhr-dot]").style.background = `conic-gradient(${over ? RED : col.ink} ${deg}deg, ${col.bg} 0)`;
    $("[data-uhr-badge-text]").textContent = lern ? about(v.step.minutes) : over ? v.over : v.remaining;
  }

  /* Position: stored left/top, kept on screen and above the session bar (which wraps to
     two rows on a phone); default bottom right. */
  const barHeight = () => document.querySelector(".ut-leiste")?.offsetHeight ?? 0;
  function place() {
    if (el.classList.contains("ut-uhr--pip")) return;
    const floor = barHeight() + 12;
    if (prefs.x == null) {
      el.style.left = el.style.top = "";
      el.style.right = "16px";
      el.style.bottom = `${floor}px`;
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    el.style.right = el.style.bottom = "";
    el.style.left = `${Math.min(Math.max(8, prefs.x), innerWidth - w - 8)}px`;
    el.style.top = `${Math.max(8, Math.min(prefs.y, innerHeight - h - floor))}px`;
  }
  function setMin(on) {
    prefs.min = on;
    el.classList.toggle("ut-uhr--min", on);
    writePrefs(prefs, prefKey);
    place();
  }
  setMin(!!prefs.min);
  el.hidden = !!prefs.hidden;
  addEventListener("resize", place);

  // Drag by the head (pointer events: mouse, pen and touch alike).
  const head = $("[data-uhr-drag]");
  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || el.classList.contains("ut-uhr--pip")) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const move = (ev) => {
      prefs.x = ev.clientX - dx;
      prefs.y = ev.clientY - dy;
      place();
    };
    const up = () => {
      head.removeEventListener("pointermove", move);
      writePrefs(prefs, prefKey);
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", up, { once: true });
    head.addEventListener("pointercancel", up, { once: true });
  });
  $("[data-uhr-min]").addEventListener("click", () => setMin(true));
  $("[data-uhr-badge]").addEventListener("click", () => setMin(false));
  // Hidden on every page until „Uhr“ in the bar brings it back (the lesson keeps running).
  $("[data-uhr-close]").addEventListener("click", () => {
    el.hidden = prefs.hidden = true;
    writePrefs(prefs, prefKey);
    onToggle();
  });

  // Pop out: the same element moves into the PiP window and back when it closes. Its own
  // timer there keeps the hand moving even while this tab is hidden and throttled.
  let pipWin = null;
  $("[data-uhr-pip]")?.addEventListener("click", async () => {
    if (pipWin) return;
    try {
      pipWin = await window.documentPictureInPicture.requestWindow({ width: 260, height: 330 });
    } catch {
      return;
    }
    const d = pipWin.document;
    d.title = "Teaching clock";
    d.head.append(Object.assign(d.createElement("style"), { textContent: `${css}\nhtml,body{margin:0;background:#fff;}` }));
    const ph = Object.assign(document.createElement("button"), { type: "button", className: "ut-uhr-placeholder", textContent: "The clock is in its own window – bring it back" });
    ph.style.right = "16px";
    ph.style.bottom = `${barHeight() + 12}px`;
    ph.addEventListener("click", () => pipWin?.close());
    document.body.append(ph);
    el.classList.remove("ut-uhr--min");
    el.classList.add("ut-uhr--pip");
    d.body.append(el);
    const t = pipWin.setInterval(() => render(ctl.state), 1000);
    pipWin.addEventListener("pagehide", () => {
      pipWin.clearInterval(t);
      pipWin = null;
      el.classList.remove("ut-uhr--pip");
      el.classList.toggle("ut-uhr--min", !!prefs.min);
      document.body.append(el);
      ph.remove();
      place();
    }, { once: true });
  });

  const off = ctl.on(render);
  // The bar is drawn right after the clock: place again once it has its height.
  requestAnimationFrame(place);
  return {
    el,
    get visible() { return !el.hidden; },
    toggle() {
      if (pipWin) return pipWin.close();
      el.hidden = !el.hidden;
      prefs.hidden = el.hidden;
      writePrefs(prefs, prefKey);
      place();
    },
    destroy() {
      off();
      pipWin?.close();
      removeEventListener("resize", place);
      el.remove();
    },
  };
}

