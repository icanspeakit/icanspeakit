// Die Legende von Lindenau (/games/brambleford): a small top-down town. The learner plays Regi
// (as Super-Blubb, drawHero in ./action.js), walks around (arrow keys / WASD, or tap where to
// go on a phone) and talks to the people: Bruno, Hamsti, Quaki, a doctor and a neighbour. Three of them have
// an A1 errand – Bäckerei, Bahnhof, Arztpraxis – played as a dialogue: pick the right reply or
// tap the words of a sentence into order. Bruno on the Marktplatz hands out the errands and
// closes the day. Content: ./quests.js – the town comes in areas (morning, afternoon), each
// its own map and three errands; start(areaId) plays one. Look and controls follow Stadtfahrt.
//
// No clock, no lives: a wrong reply gets "Wie bitte?" and a short why, and the learner tries
// again. What counts is "right on the first try"; the misses come back on the result screen.
import { recordAttempt } from "../progress.js";
import { celebrate } from "../mascotCelebrate.js";
import { MASCOT_NAMES, mascotSvg } from "../mascots.js";
import { setWaiting } from "../notReady.js";
import { t } from "../uiText.js";
import { createVoice } from "../spielKit.js";
import { track } from "../track.js";
import { AGAIN, AREAS, BRUNO_REVIEW, NOT_YET, areaById, clipPath, taskCount } from "./quests.js";
import { coinNote, drawBubble, drawHero, drawMonster, pauseLevel, pauseOverlay, playLevel, playPrologue } from "./action.js";
import { hold, onSoundChange, play as playMusic, setDuck, setSound, sfx, soundOn, stop as stopMusic } from "./music.js";
import { reducedMotion } from "../spieleEinstellungen.js";
import { glossP } from "./gloss.js";
import { coinTotal, nextLook, LOOKS_AT } from "./coins.js";
import { spielMeldenRow } from "../spielMelden.js";

const W = 1280, H = 960;
const P_R = 14; // player collision radius
const SPEED = 200;
const TALK_R = 78;
const NPC_R = 22;
// A spoken reply passes from here: the Aussprache-Check's line between "bad" and "ok"
// (band() in src/lib/ausspracheCheck.js).
const SAY_PASS = 60;
// Speaking is off for now (Edgar, 2026-10-22): it spends the Aussprache-Check's daily Azure
// sessions, which all learners share (src/lib/usage.ts). Off, a `say` turn is a build turn.
const SPEAKING = false;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const norm = (s) => s.replace(/\s+/g, " ").trim();

// --- the town ----------------------------------------------------------------------------
// The map of the area being played (quests.js): buildings are solid, each with a door side
// where its person stands; the fountain and the trees are solid too.
let BUILDINGS = [], FOUNTAIN = { x: -999, y: -999, r: 0 }, TREES = [];
function useMap(area) {
  BUILDINGS = area.buildings;
  FOUNTAIN = { x: area.square.x, y: area.square.y, r: area.square.fountain };
  TREES = area.trees.map(([x, y], i) => ({ x, y, r: 26 + (i % 3) * 5 }));
}

function solidHit(x, y, r, npcs) {
  if (x < r || y < r || x > W - r || y > H - r) return true;
  for (const b of BUILDINGS) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w)), ny = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
  }
  if (Math.hypot(x - FOUNTAIN.x, y - FOUNTAIN.y) < FOUNTAIN.r + r) return true;
  for (const tr of TREES) if (Math.hypot(x - tr.x, y - tr.y) < tr.r * 0.7 + r) return true;
  for (const n of npcs) if (Math.hypot(x - n.x, y - n.y) < NPC_R + r) return true;
  return false;
}

/** A mascot (or OpenMoji) as an <img> the canvas can draw, once loaded. */
function svgImage(svg) {
  const img = new Image();
  // Inline SVG needs no namespace; as an image file it does.
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  img.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  return img;
}
function moji(hex) {
  const img = new Image();
  img.src = `/img/openmoji/${hex}.svg`;
  return img;
}

// --- walking a tap: A* over a coarse grid, then straightened by line of sight -----------
const CELL = 16, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);

function buildGrid(npcs) {
  const g = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) g[j * GW + i] = solidHit(i * CELL + CELL / 2, j * CELL + CELL / 2, P_R + 1, npcs) ? 0 : 1;
  return g;
}
function nearestFree(g, i, j) {
  i = Math.max(0, Math.min(GW - 1, i)); j = Math.max(0, Math.min(GH - 1, j));
  if (g[j * GW + i]) return [i, j];
  for (let r = 1; r < 12; r++) for (let a = -r; a <= r; a++) for (const [x, y] of [[i + a, j - r], [i + a, j + r], [i - r, j + a], [i + r, j + a]]) {
    if (x >= 0 && y >= 0 && x < GW && y < GH && g[y * GW + x]) return [x, y];
  }
  return null;
}
function findPath(g, from, to) {
  const s = nearestFree(g, Math.floor(from.x / CELL), Math.floor(from.y / CELL));
  const e = nearestFree(g, Math.floor(to.x / CELL), Math.floor(to.y / CELL));
  if (!s || !e) return null;
  const S = s[1] * GW + s[0], E = e[1] * GW + e[0];
  const cost = new Float32Array(GW * GH).fill(Infinity), prev = new Int32Array(GW * GH).fill(-1);
  const h = (k) => Math.hypot((k % GW) - e[0], Math.floor(k / GW) - e[1]);
  const open = [[h(S), S]]; cost[S] = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open.splice(bi, 1)[0];
    if (cur === E) break;
    const ci = cur % GW, cj = Math.floor(cur / GW);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH || !g[nj * GW + ni]) continue;
      if (di && dj && (!g[cj * GW + ni] || !g[nj * GW + ci])) continue; // no corner cutting
      const nk = nj * GW + ni, c = cost[cur] + (di && dj ? 1.414 : 1);
      if (c < cost[nk]) { cost[nk] = c; prev[nk] = cur; open.push([c + h(nk), nk]); }
    }
  }
  if (prev[E] === -1 && E !== S) return null;
  const pts = [];
  for (let k = E; k !== -1 && k !== S; k = prev[k]) pts.push({ x: (k % GW) * CELL + CELL / 2, y: Math.floor(k / GW) * CELL + CELL / 2 });
  pts.reverse();
  return pts;
}

// --- speech: the line's own clip (Azure, scripts/generate-lindenau-audio.mjs); the browser
// voice when the clip is missing or cannot play (src/lib/spielKit.js). `npc`: a person's
// line – their head in the dialogue sheet talks along (setOnTalk).
const voice = createVoice(clipPath);
const say = voice.say;

// --- review: sentences missed on the first try come back next time ------------------------
// localStorage "da-lindenau-review": [{ id: "<quest>:<turn>", right: 0|1, run }]. A miss puts
// a task in (or back to right: 0); right on the first try in two different runs takes it out.
// `run` is the run that last counted, so one run counts once. Storage may fail (private
// mode, blocked): then there is simply no review.
const REVIEW_KEY = "da-lindenau-review";
function loadReview() {
  try {
    const v = JSON.parse(localStorage.getItem(REVIEW_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string") : [];
  } catch {
    return [];
  }
}
function saveReview(list) {
  try {
    if (list.length) localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
    else localStorage.removeItem(REVIEW_KEY);
  } catch {}
}
/** A review id back to its quest and turn; null when the content has changed since. */
function taskOf(id) {
  const [qid, n] = id.split(":");
  const q = AREAS.flatMap((a) => a.quests).find((x) => x.id === qid);
  const i = Number(n);
  return q?.turns[i]?.task ? { q, i } : null;
}
function noteReview(id, ok, run) {
  const list = loadReview();
  const k = list.findIndex((x) => x.id === id);
  if (!ok) {
    if (k === -1) list.push({ id, right: 0, run });
    else list[k] = { id, right: 0, run };
  } else if (k !== -1 && list[k].run !== run) {
    if (list[k].right >= 1) list.splice(k, 1);
    else list[k] = { id, right: 1, run };
  }
  saveReview(list);
}

// --- areas: the next one opens when the one before is done -------------------------------
// localStorage "da-lindenau-done": the ids of finished areas. If storage fails, every area is
// open – better a door too many than a locked one nobody can open.
const DONE_KEY = "da-lindenau-done";
function doneAreas() {
  const v = JSON.parse(localStorage.getItem(DONE_KEY) || "[]");
  return Array.isArray(v) ? v : [];
}
/** Can this area be played yet? */
export function areaOpen(id) {
  const k = AREAS.findIndex((a) => a.id === id);
  if (k <= 0) return true;
  try {
    return doneAreas().includes(AREAS[k - 1].id);
  } catch {
    return true;
  }
}
function markAreaDone(id) {
  try {
    const list = doneAreas();
    if (!list.includes(id)) localStorage.setItem(DONE_KEY, JSON.stringify([...list, id]));
  } catch {}
}

// --- the action parts: Super-Blubb's story and a jump-and-bubble level after each errand
// (./action.js). On by default; the start screen can switch them off – localStorage
// "da-lindenau-action" ("off"). Storage may fail: then they are simply on.
const ACTION_KEY = "da-lindenau-action";
export function actionOn() {
  try { return localStorage.getItem(ACTION_KEY) !== "off"; } catch { return true; }
}
export function setAction(v) {
  try { localStorage.setItem(ACTION_KEY, v ? "on" : "off"); } catch {}
}
/** The monsters' words: the errands' items and the nouns of their sentences (capitalised,
    not the first word of a sentence). */
function wordsOf(quests) {
  const out = [];
  for (const q of quests) {
    if (!out.includes(q.item.label)) out.push(q.item.label);
    // English nouns are not capitalised, so a quest lists its useful words itself (`words`).
    for (const w of q.words ?? []) if (!out.includes(w)) out.push(w);
    for (const turn of q.turns) {
      const task = turn.task;
      if (!task) continue;
      const toks = (task.type === "choose" ? task.options.find((o) => o.ok).de : task.words.join(" ")).split(/\s+/);
      toks.forEach((w, k) => {
        const c = w.replace(/[.,!?;:“”"()–]/g, "");
        if (k === 0 || /[.!?]$/.test(toks[k - 1])) return;
        if (/^[A-Z][a-z]+$/.test(c) && !["Please"].includes(c) && !out.includes(c)) out.push(c);
      });
    }
  }
  return out.slice(0, 12);
}

export function mountLindenau(root) {
  const canvas = root.querySelector("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const panel = root.querySelector("[data-panel]");
  const talkBtn = root.querySelector("[data-talk]");
  const hudItems = root.querySelector("[data-items]");
  const stage = root.querySelector(".ld-stage");
  const soundBtn = root.querySelector("[data-sound]");
  const paintSound = () => {
    if (!soundBtn) return;
    soundBtn.textContent = soundOn() ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-pressed", String(soundOn()));
  };
  paintSound();
  onSoundChange(paintSound); // also when another game / tab switches it
  soundBtn?.addEventListener("click", () => {
    setSound(!soundOn());
    if (soundOn() && state === "walk") playMusic("town");
  });
  const calmTown = reducedMotion(); // system "reduce motion": no bobbing, no bouncing marks
  const coinsEl = root.querySelector("[data-coins]");
  const paintCoins = () => {
    if (!coinsEl) return;
    const n = coinTotal(), nx = nextLook(n);
    coinsEl.querySelector("[data-coins-n]").textContent = String(n);
    const tip = nx ? t("ld.lookNext", "{n} more for: {look}", { n: nx.left, look: t(LOOKS_AT[nx.i].key, LOOKS_AT[nx.i].de) }) : t("ld.lookAll", "Everything unlocked");
    coinsEl.title = tip;
    coinsEl.setAttribute("aria-label", `${t("ld.coinsTotal", "🪙 {n} coins in total", { n })} · ${tip}`);
  };
  paintCoins();
  const seenPrologue = new Set();
  // The person whose line is playing moves their head (CSS .ld-who.is-talking).
  voice.setOnTalk((on) => panel.querySelector(".ld-who")?.classList.toggle("is-talking", on));

  // --- action in town: Space hops, X blows a bubble; Matschlinge wander the streets and a
  // bubble washes them away (a bonus – the errands don't need it). ---------------------------
  const cleanEl = root.querySelector("[data-clean]");
  let mud = [], tBubbles = [], tParts = [], tTexts = [], fx = 1, fy = 0, shootHeld = false, shootCool = 0, bumpCool = 0, tt = 0;
  function spawnMud() {
    mud = [];
    let tries = 0;
    while (mud.length < 5 && tries++ < 400) {
      const x = 60 + Math.random() * (W - 120), y = 60 + Math.random() * (H - 120);
      if (solidHit(x, y, 18, npcs) || Math.hypot(x - area.start.x, y - area.start.y) < 200) continue;
      if (npcs.some((n) => Math.hypot(n.x - x, n.y - y) < 110) || mud.some((m) => Math.hypot(m.x - x, m.y - y) < 160)) continue;
      mud.push({ type: "walker", x, y, r: 13, ph: Math.random() * 6, a: Math.random() * 6.3, turn: 1 + Math.random() * 2, state: "alive", clean: 0 });
    }
    paintClean();
  }
  function paintClean() {
    if (!cleanEl) return;
    const n = mud.filter((m) => m.state === "gone").length;
    cleanEl.textContent = `🫧 ${n} / ${mud.length}`;
    cleanEl.hidden = !actionOn() || !mud.length;
  }
  function hop() {
    if (state !== "walk" || me.z > 0) return;
    me.vz = 330;
    sfx("jump");
  }
  const townPad = root.querySelector("[data-town-pad]");
  townPad?.querySelectorAll("[data-tk]").forEach((b) => {
    const k = b.dataset.tk;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      b.classList.add("is-down");
      if (k === "jump") hop(); else shootHeld = true;
    });
    const up = () => { b.classList.remove("is-down"); if (k === "shoot") shootHeld = false; };
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("lostpointercapture", up);
  });

  // The area being played and its people; images made once per mascot / icon.
  let area = AREAS[0], BRUNO = area.bruno, QUESTS = area.quests, TASK_COUNT = taskCount(area);
  let npcs = [], icons = {};
  const mascotImg = {}, iconImg = {};
  function setArea(id) {
    area = areaById(id);
    BRUNO = area.bruno; QUESTS = area.quests; TASK_COUNT = taskCount(area);
    useMap(area);
    grid = null;
    npcs = [BRUNO, ...QUESTS].map((n) => ({
      ...n,
      // The doctor and the neighbour are people (OpenMoji), not mascots: Regi plays.
      img: n.moji ? (iconImg[n.moji] ||= moji(n.moji))
        : (mascotImg[n.mascot] ||= svgImage(mascotSvg({ name: n.mascot, expr: "happy", view: "front", size: 200, label: "" }))),
    }));
    icons = Object.fromEntries(BUILDINGS.filter((b) => b.icon).map((b) => [b.id, (iconImg[b.icon] ||= moji(b.icon))]));
  }

  let state = "idle"; // idle | walk | talk | action | done
  let me, dest, route, grid, pendingTalk, done, introDone, firstTry, missed, keys, last, raf, near, face;
  let run = 0; // this run's id for the review list
  let reviewing = false; // the tasks count for the review list only, not for the score
  let reviewedNow = false; // this run's misses were reviewed from the result screen
  let questRight = 0; // first-try right answers in the errand under way (analytics)
  keys = { up: false, down: false, left: false, right: false };

  // --- input ---------------------------------------------------------------------------
  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  const SHOOT_KEYS = ["KeyX", "KeyF", "KeyJ", "ShiftLeft", "ShiftRight"]; // X is the one the screen shows
  window.addEventListener("keydown", (e) => {
    // P or Esc: pause / go on. In a dialogue Esc still closes it (only P pauses there); a
    // level pauses itself (action.js).
    if ((e.code === "KeyP" || e.key === "Escape") && !e.repeat) {
      if (paused) { e.preventDefault(); unpause(); return; }
      if (state === "walk" || (e.code === "KeyP" && state === "talk")) { e.preventDefault(); pauseGame(); return; }
    }
    if (state === "walk") {
      const k = KEYMAP[e.code];
      if (k) { keys[k] = true; dest = null; route = null; pendingTalk = null; e.preventDefault(); return; }
      // Space talks when someone is close enough, otherwise it hops; X is the bubble key.
      if ((e.code === "Enter" || e.code === "KeyE" || e.code === "Space") && near) { e.preventDefault(); talkTo(near); return; }
      if (e.code === "Space" && actionOn()) { e.preventDefault(); hop(); return; }
      if (SHOOT_KEYS.includes(e.code) && actionOn()) { e.preventDefault(); shootHeld = true; }
      return;
    }
    if (state === "talk" || state === "done") {
      if (e.key === "Escape") { e.preventDefault(); back(); return; }
    }
    if (state === "talk") {
      if (e.target instanceof HTMLElement && e.target.closest("[data-panel]") && (e.key === "Enter" || e.key === " ") && e.target.tagName === "BUTTON") return; // the focused button handles it
      const n = Number(e.key);
      if (n >= 1 && n <= 3) { panel.querySelectorAll("[data-opt]")[n - 1]?.click(); e.preventDefault(); }
      else if (e.key === "Enter") { const go = panel.querySelector("[data-go], [data-check]"); if (go) { go.click(); e.preventDefault(); } }
    }
  });
  window.addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; if (SHOOT_KEYS.includes(e.code)) shootHeld = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; shootHeld = false; });

  // Tap / click: walk there. On a person: walk up and talk.
  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "walk") return;
    e.preventDefault();
    const p = toWorld(e.clientX, e.clientY);
    const hit = npcs.find((n) => Math.hypot(n.x - p.x, n.y - p.y) < 44);
    if (hit) {
      if (Math.hypot(hit.x - me.x, hit.y - me.y) < TALK_R) { talkTo(hit); return; }
      pendingTalk = hit;
      goTo(approachPoint(hit));
    } else {
      pendingTalk = null;
      goTo(p);
    }
  });
  talkBtn.addEventListener("click", () => { if (near && state === "walk") talkTo(near); });
  // --- pause: P / Esc, the button in the header row, a hidden tab. Walking stops, the music
  // holds, the voice waits; Weiter / Neu starten / Beenden. A level pauses itself (action.js).
  let paused = false, pausedFrom = "";
  const pz = pauseOverlay(stage, {
    onResume: () => unpause(),
    onRestart: () => { leavePause(); start(area.id); },
    onQuit: () => { leavePause(); quit(); },
  });
  // "Problem melden" on the pause card and the result: the area and the sentences missed so far.
  const roundInfo = () => ({ gebiet: area.id, verpasst: (missed ?? []).slice(0, 15).map((m) => ({ wo: m.quest.role, loesung: m.solution })) });
  pz.el.querySelector(".ld-pause-card").append(spielMeldenRow("lindenau", roundInfo));
  function pauseGame() {
    if (state === "action") return pauseLevel();
    if (paused || (state !== "walk" && state !== "talk")) return false;
    paused = true; pausedFrom = state; state = "paused";
    cancelAnimationFrame(raf);
    for (const k in keys) keys[k] = false;
    shootHeld = false;
    voice.pause();
    hold(true);
    pz.show();
    return true;
  }
  function leavePause() { paused = false; pz.hide(); hold(false); }
  function unpause() {
    if (!paused) return;
    leavePause();
    state = pausedFrom;
    voice.resume();
    if (state === "walk") { last = performance.now(); loop(); canvas.focus?.({ preventScroll: true }); }
    else panel.querySelector("[data-go], [data-opt], [data-check]")?.focus({ preventScroll: true });
  }
  /** Beenden: back to the start screen. */
  function quit() {
    hidePanel();
    stopMusic();
    state = "idle";
    cancelAnimationFrame(raf);
    talkBtn.hidden = true;
    root.dispatchEvent(new CustomEvent("ld:exit"));
  }
  root.querySelector("[data-pause]")?.addEventListener("click", () => (paused ? unpause() : pauseGame()));
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });

  // Back (Android back button via src/lib/appShell.js, or Escape): a dialogue closes and the
  // walk goes on – an errand left halfway starts again at its first line. On the result
  // screen, back goes to the start screen (the page listens for "ld:exit").
  panel.dataset.backCloses = "";
  panel.addEventListener("da:back", back);
  function back() {
    if (paused) unpause();
    else if (state === "talk") {
      reviewing = false;
      resume();
    } else if (state === "done") quit();
  }

  function goTo(p) {
    grid ||= buildGrid(npcs);
    route = findPath(grid, me, p);
    dest = route?.length ? route[route.length - 1] : null;
    if (!dest) route = null;
  }

  /** Straight to the farthest waypoint still in clear sight – no zigzag along the grid. */
  function clearLine(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 6);
    for (let k = 1; k <= n; k++) { const t = k / n; if (solidHit(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, P_R, npcs)) return false; }
    return true;
  }

  function approachPoint(n) {
    // The free side of the person closest to the learner.
    const a = Math.atan2(me.y - n.y, me.x - n.x);
    for (const off of [0, 0.6, -0.6, 1.3, -1.3, Math.PI]) {
      const x = n.x + Math.cos(a + off) * (NPC_R + P_R + 18), y = n.y + Math.sin(a + off) * (NPC_R + P_R + 18);
      if (!solidHit(x, y, P_R, [])) return { x, y };
    }
    return { x: n.x, y: n.y + 50 };
  }

  // --- canvas size / camera ------------------------------------------------------------
  let cw = 0, ch = 0, dpr = 1, zoom = 1, cam = { x: 0, y: 0 };
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    zoom = Math.max(0.72, Math.min(1.3, Math.min(cw, ch * 1.4) / 720));
    if (state !== "idle") draw();
  }
  new ResizeObserver(resize).observe(canvas);
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: cam.x + (clientX - r.left) / zoom, y: cam.y + (clientY - r.top) / zoom };
  }

  // --- flow ----------------------------------------------------------------------------
  function start(areaId = area.id) {
    setArea(areaId);
    me = { ...area.start, z: 0, vz: 0 };
    face = 1; fx = 1; fy = 0;
    tBubbles = []; tParts = []; tTexts = [];
    spawnMud();
    if (townPad) townPad.hidden = !actionOn();
    dest = null; route = null; pendingTalk = null; near = null;
    done = new Set(); introDone = false; firstTry = 0; missed = [];
    run = Date.now(); reviewing = false; reviewedNow = false; questRight = 0;
    track("lindenau_start", { area: area.id });
    hud();
    hidePanel();
    state = "walk";
    resize();
    last = performance.now();
    cancelAnimationFrame(raf);
    loop();
    playMusic("town");
    // Bruno opens the day – with a short review first when last time left some sentences.
    // Before that, once per visit and area: Super-Blubb's story (the action parts).
    setTimeout(() => {
      if (state !== "walk" || introDone) return;
      // With the action parts on, the day starts with action: the story (once per visit),
      // then straight into the first level – the way into town – and only then Bruno.
      if (actionOn()) {
        state = "action";
        talkBtn.hidden = true;
        const story = seenPrologue.has(area.id) ? Promise.resolve() : playPrologue(stage, { area: area.id, say: (text) => say(null, text) });
        seenPrologue.add(area.id);
        story
          .then(() => playLevel(stage, { area: area.id, stage: 0, words: wordsOf(QUESTS), direct: true, say: (text) => say(null, text) }))
          .then((r) => {
            if (r.quit) return quit();
            track("lindenau_action", { area: area.id, level: 0, cleaned: r.cleaned, of: r.of, skipped: r.skipped });
            playMusic("town");
            setDuck(1);
            state = "walk";
            last = performance.now();
            hud();
            newLook(r);
            loop();
            opening();
          });
        return;
      }
      opening();
    }, 450);
  }
  function opening() {
    const list = loadReview();
    const valid = list.filter((x) => taskOf(x.id));
    if (valid.length !== list.length) saveReview(valid); // tasks that no longer exist
    const due = valid.map((x) => taskOf(x.id));
    if (due.length) offerReview(due);
    else talkTo(npcs[0]);
  }

  // --- review --------------------------------------------------------------------------
  function offerReview(due) {
    state = "talk";
    talkBtn.hidden = true;
    draw();
    const bruno = npcs[0];
    const line = { ...BRUNO_REVIEW.offer, clip: "bruno-review-offer-npc" };
    showPanel(`${head(bruno)}${lineHtml(line)}
      <p class="ld-you">${esc(due.length === 1 ? t("ld.reviewOne", "1 sentence to review") : t("ld.reviewN", "{n} sentences to review", { n: due.length }))}</p>
      <div class="ld-btns">
        <button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(t("ld.reviewYes", "Yes, please"))}</button>
        <button type="button" class="quiz-btn" data-skip-review>${esc(t("ld.reviewLater", "Later"))}</button>
      </div>`);
    wireLine(line);
    const yes = panel.querySelector("[data-go]");
    yes.focus({ preventScroll: true });
    yes.addEventListener("click", () => runReview(due, 0, () => playLines(bruno, [{ ...BRUNO_REVIEW.done, clip: "bruno-review-done-npc", go: t("ld.next", "Next") }], () => talkTo(bruno))), { once: true });
    panel.querySelector("[data-skip-review]").addEventListener("click", () => talkTo(bruno), { once: true });
  }

  /** The tasks one after another in the dialogue sheet, no walking. */
  function runReview(due, k, then) {
    if (k >= due.length) { reviewing = false; return then(); }
    reviewing = true;
    state = "talk";
    talkBtn.hidden = true;
    const { q, i } = due[k];
    const n = q; // may be from the other area: the head only needs mascot, name, role
    const turn = { ...q.turns[i], clip: `${q.id}-${i}-npc`, replyClip: `${q.id}-${i}-du` };
    const tag = t("ld.reviewStep", "Review {i} of {n}", { i: k + 1, n: due.length });
    showPanel(`${head(n)}<p class="ld-step">${esc(tag)}</p>${lineHtml(turn)}<div class="ld-task" data-task></div><div class="ld-fb" data-fb aria-live="polite"></div><div class="ld-btns" data-btns></div>`);
    wireLine(turn);
    const next = () => runReview(due, k + 1, then);
    runTask(q, i, turn, next);
  }

  function hud() {
    paintCoins();
    hudItems.innerHTML = QUESTS.map((q) => {
      const ok = done.has(q.id);
      return `<li class="ld-item${ok ? " is-done" : ""}" title="${esc(q.item.label)}"><img src="/img/openmoji/${q.item.icon}.svg" alt="" width="26" height="26" /><span lang="en">${esc(q.item.label)}</span><b aria-hidden="true">${ok ? "✓" : ""}</b><span class="sr-only">${esc(ok ? t("ld.itemDone", "done") : t("ld.itemOpen", "to do"))}</span></li>`;
    }).join("");
  }

  function loop() {
    if (state !== "walk") return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function step(dt) {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (!dx && !dy && route?.length) {
      while (route.length > 1 && clearLine(me, route[1])) route.shift();
      const wp = route[0];
      const ddx = wp.x - me.x, ddy = wp.y - me.y, d = Math.hypot(ddx, ddy);
      if (d < 4) { route.shift(); if (!route.length) { route = null; dest = null; } }
      else { dx = ddx / d; dy = ddy / d; }
    }
    const len = Math.hypot(dx, dy);
    if (len) {
      dx /= len; dy /= len;
      if (dx) face = dx > 0 ? 1 : -1;
      const nx = me.x + dx * SPEED * dt, ny = me.y + dy * SPEED * dt;
      const others = npcs;
      if (!solidHit(nx, ny, P_R, others)) { me.x = nx; me.y = ny; }
      else if (dx && !solidHit(nx, me.y, P_R, others)) me.x = nx;
      else if (dy && !solidHit(me.x, ny, P_R, others)) me.y = ny;
      else if (route) { route = null; dest = null; } // stuck: stop instead of grinding
    }
    stepAction(dt);
    // Who is within talking range?
    let best = null, bd = TALK_R;
    for (const n of npcs) { const d = Math.hypot(n.x - me.x, n.y - me.y); if (d < bd) { bd = d; best = n; } }
    if (best !== near) {
      near = best;
      talkBtn.hidden = !near;
      if (near) talkBtn.querySelector("[data-talk-name]").textContent = t("ld.talkTo", "Talk to {n}", { n: near.name });
    }
    if (pendingTalk && near === pendingTalk) { const n = pendingTalk; pendingTalk = null; dest = null; route = null; talkTo(n); }
  }

  function stepAction(dt) {
    tt += dt;
    const kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0), len = Math.hypot(kx, ky);
    if (len) { fx = kx / len; fy = ky / len; }
    else if (route?.length) { const wp = route[0], d = Math.hypot(wp.x - me.x, wp.y - me.y); if (d > 1) { fx = (wp.x - me.x) / d; fy = (wp.y - me.y) / d; } }
    if (me.z > 0 || me.vz) { me.vz -= 1100 * dt; me.z = Math.max(0, me.z + me.vz * dt); if (!me.z) me.vz = 0; }
    if (!actionOn()) return;
    shootCool -= dt; bumpCool -= dt;
    if (shootHeld && shootCool <= 0) {
      tBubbles.push({ x: me.x + fx * 20, y: me.y - 16 - me.z + fy * 10, vx: fx * 300, vy: fy * 300, life: 0.85, r: 7, ph: Math.random() * 6 });
      shootCool = 0.25;
      sfx("shoot");
    }
    for (const b of tBubbles) { b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1 - 1.2 * dt; b.vy *= 1 - 1.2 * dt; b.life -= dt; b.r = Math.min(11, b.r + dt * 5); }
    for (const m of mud) {
      if (m.state === "alive") {
        m.turn -= dt;
        if (m.turn <= 0) { m.a = Math.random() * Math.PI * 2; m.turn = 1 + Math.random() * 2; }
        const nx = m.x + Math.cos(m.a) * 34 * dt, ny = m.y + Math.sin(m.a) * 34 * dt;
        if (solidHit(nx, ny, 14, npcs)) m.a += Math.PI * (0.5 + Math.random());
        else { m.x = nx; m.y = ny; }
        for (const b of tBubbles) if (b.life > 0 && Math.hypot(b.x - m.x, b.y - (m.y - m.r)) < m.r + b.r + 6) { b.life = 0; m.state = "bubbled"; m.bt = 1; sfx("trap"); }
        if (m.state === "alive" && me.z < 12 && bumpCool <= 0 && Math.hypot(me.x - m.x, me.y - m.y) < 30) {
          bumpCool = 1;
          const d = Math.hypot(me.x - m.x, me.y - m.y) || 1, px = me.x + ((me.x - m.x) / d) * 26, py = me.y + ((me.y - m.y) / d) * 26;
          if (!solidHit(px, py, P_R, npcs)) { me.x = px; me.y = py; }
          route = null; dest = null;
          sfx("hit");
          tTexts.push({ x: me.x, y: me.y - 60, text: t("ld.actIgitt", "Yuck!"), life: 1 });
        }
      } else if (m.state === "bubbled") {
        m.bt -= dt; m.clean = Math.min(1, m.clean + dt * 1.3); m.lift = (m.lift ?? 0) + 40 * dt;
        if (m.bt <= 0) {
          m.state = "gone"; sfx("pop");
          for (let i = 0; i < 12; i++) { const a = Math.random() * 6.3, sp = 40 + Math.random() * 90; tParts.push({ x: m.x, y: m.y - m.r - m.lift, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, hue: 180 + Math.random() * 80 }); }
          const left = mud.filter((x) => x.state !== "gone").length;
          tTexts.push({ x: m.x, y: m.y - 40 - m.lift, text: left ? t("ld.actClean", "Clean!") : t("ld.townClean", "Brambleford is clean!"), life: left ? 1 : 2 });
          if (!left) { sfx("coin"); track("lindenau_town_clean", { area: area.id }); }
          paintClean();
        }
      }
    }
    tBubbles = tBubbles.filter((b) => b.life > 0);
    for (const p of tParts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    tParts = tParts.filter((p) => p.life > 0);
    for (const x of tTexts) { x.y -= 30 * dt; x.life -= dt; }
    tTexts = tTexts.filter((x) => x.life > 0);
  }

  // --- talking -------------------------------------------------------------------------
  // Under a dialogue the music steps back, so the voices stay clear.
  function showPanel(html) { panel.innerHTML = html; panel.hidden = false; setDuck(0.3); }
  function hidePanel() { panel.hidden = true; panel.innerHTML = ""; setDuck(1); }

  function talkTo(n) {
    state = "talk";
    for (const k in keys) keys[k] = false;
    talkBtn.hidden = true;
    dest = null; route = null;
    draw();
    if (n.id === "bruno") {
      const open = QUESTS.length - done.size;
      const lines = !introDone
        ? BRUNO.intro.map((l, i) => ({ ...l, clip: `${BRUNO.clip}-intro-${i}-npc` }))
        : open
          ? BRUNO.waiting(open).map((l) => ({ ...l, clip: `bruno-waiting-${Math.min(open, 3)}-npc` }))
          : BRUNO.done.map((l, i) => ({ ...l, clip: `${BRUNO.clip}-done-${i}-npc` }));
      return playLines(n, lines, () => {
        introDone = true;
        if (!open) return finish();
        resume();
      });
    }
    const q = QUESTS.find((x) => x.id === n.id);
    if (!introDone) return playLines(n, [{ ...NOT_YET, clip: `${q.id}-notyet-npc` }], resume);
    if (done.has(q.id)) return playLines(n, [{ ...AGAIN, clip: `${q.id}-again-npc` }], resume);
    runQuest(n, q, 0);
  }

  function resume() {
    hidePanel();
    state = "walk";
    near = null;
    last = performance.now();
    loop();
    canvas.focus?.({ preventScroll: true });
  }

  function head(n) {
    const svg = n.moji
      ? `<img src="/img/openmoji/${n.moji}.svg" alt="" width="60" height="60" />`
      : mascotSvg({ name: n.mascot, expr: "happy", view: "front", size: 60, label: "" });
    return `<div class="ld-who">${svg}<div><b>${esc(n.name)}</b><span>${esc(n.role)}</span></div></div>`;
  }

  function lineHtml(line) {
    return `<p class="ld-line" lang="en">${esc(line.npc)}</p>
      <div class="ld-tools">
        <button type="button" class="ld-tool" data-say>🔊 <span>${esc(t("ld.listen", "Listen"))}</span></button>
        ${line.en ? `<button type="button" class="ld-tool" data-gloss-btn aria-expanded="false">💡 <span>${esc(t("ld.help", "Help"))}</span></button>` : ""}
      </div>
      ${line.en ? glossP(line.npc, line.en, "data-gloss") : ""}`;
  }

  function wireLine(line) {
    const btn = panel.querySelector("[data-say]");
    btn?.addEventListener("click", () => say(line.clip, line.npc, true));
    // The person speaks as the line comes up (always after a tap, so autoplay is allowed).
    setTimeout(() => { if (btn?.isConnected) say(line.clip, line.npc, true); }, 150);
    const gb = panel.querySelector("[data-gloss-btn]");
    gb?.addEventListener("click", () => {
      const g = panel.querySelector("[data-gloss]");
      g.hidden = !g.hidden;
      gb.setAttribute("aria-expanded", String(!g.hidden));
    });
  }

  /** Lines with no task, one "Weiter" each. */
  function playLines(n, lines, then, i = 0) {
    const line = lines[i];
    const lastOne = i + 1 >= lines.length;
    showPanel(`${head(n)}${lineHtml(line)}
      <div class="ld-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(lastOne ? (line.go ?? t("ld.bye", "Bye!")) : t("ld.next", "Next"))}</button></div>`);
    wireLine(line);
    const go = panel.querySelector("[data-go]");
    go.focus({ preventScroll: true });
    go.addEventListener("click", () => (lastOne ? then() : playLines(n, lines, then, i + 1)), { once: true });
  }

  function runQuest(n, q, i) {
    if (i === 0) questRight = 0;
    if (i >= q.turns.length) {
      track("lindenau_quest_done", { area: area.id, quest: q.id, first_try: questRight, of: q.turns.filter((x) => x.task).length });
      questRight = 0;
      return playLines(n, [{ ...q.outro, clip: `${q.id}-outro-npc` }], () => {
        done.add(q.id);
        hud();
        flashItem(q);
        if (actionOn()) actionLevel(q);
        else resume();
      });
    }
    const turn = { ...q.turns[i], clip: `${q.id}-${i}-npc`, replyClip: `${q.id}-${i}-du` };
    const tag = t("ld.step", "{i} of {n}", { i: i + 1, n: q.turns.length });
    showPanel(`${head(n)}<p class="ld-step">${esc(tag)}</p>${lineHtml(turn)}<div class="ld-task" data-task></div><div class="ld-fb" data-fb aria-live="polite"></div><div class="ld-btns" data-btns></div>`);
    wireLine(turn);
    const next = () => runQuest(n, q, i + 1);
    runTask(q, i, turn, next);
  }

  /** After an errand: a level – the third one of the area is the boss. */
  function actionLevel(q) {
    hidePanel();
    state = "action";
    talkBtn.hidden = true;
    const lvl = Math.min(3, done.size); // 0 is the way into town; the third errand → the boss
    const words = wordsOf(lvl === 3 ? QUESTS : [q]);
    playLevel(stage, { area: area.id, stage: lvl, words, say: (text) => say(null, text) }).then((r) => {
      if (r.quit) return quit();
      track("lindenau_action", { area: area.id, level: lvl, cleaned: r.cleaned, of: r.of, skipped: r.skipped });
      playMusic("town");
      hud();
      newLook(r);
      resume();
    });
  }
  /** Back in town with a new look (hat, cape): say so above the hero. */
  function newLook(r) {
    if (!r.unlocked?.length) return;
    const i = r.unlocked[r.unlocked.length - 1];
    tTexts.push({ x: me.x, y: me.y - 70, text: t("ld.lookNew", "New: {look}!", { look: t(LOOKS_AT[i].key, LOOKS_AT[i].de) }), life: 2.6 });
  }

  function runTask(q, i, turn, next) {
    if (turn.task.type === "choose") taskChoose(q, i, turn, next);
    else if (turn.task.type === "say" && SPEAKING) taskSay(q, i, turn, next);
    else taskBuild(q, i, turn, next);
  }

  function grade(q, i, ok, wasFirst, solution, why) {
    if (wasFirst) {
      noteReview(`${q.id}:${i}`, ok, run);
      // A review counts for the review list only; the day's score is the walk through town.
      if (!reviewing) {
        if (ok) { firstTry++; questRight++; }
        else missed.push({ quest: q, i, solution, why });
      }
      recordAttempt({ skill: "sprechen", correct: ok, topic: "spiel-lindenau", item: `lindenau-${q.id}-${i}` });
    }
  }

  function continueBtn(next) {
    const btns = panel.querySelector("[data-btns]");
    btns.innerHTML = `<button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(t("ld.next", "Next"))}</button>`;
    const go = btns.querySelector("[data-go]");
    go.focus({ preventScroll: true });
    go.addEventListener("click", next, { once: true });
  }

  function taskChoose(q, i, turn, next) {
    const box = panel.querySelector("[data-task]");
    const fb = panel.querySelector("[data-fb]");
    const opts = shuffle(turn.task.options);
    const solution = turn.task.options.find((o) => o.ok).de;
    box.innerHTML = `<p class="ld-you">${esc(t("ld.youSay", "You say:"))}</p><div class="ld-opts">${opts.map((o, k) => `<button type="button" class="sf-opt" data-opt="${k}" lang="en"><span class="sf-opt-n">${k + 1}</span>${esc(o.de)}</button>`).join("")}</div>`;
    let first = true, finished = false;
    box.querySelector("[data-opt]")?.focus({ preventScroll: true });
    box.querySelectorAll("[data-opt]").forEach((btn) => btn.addEventListener("click", () => {
      if (finished || btn.getAttribute("aria-disabled") === "true") return;
      const o = opts[Number(btn.dataset.opt)];
      if (o.ok) {
        finished = true;
        grade(q, i, true, first, solution);
        btn.classList.add("is-right");
        box.querySelectorAll("[data-opt]").forEach((b) => { b.setAttribute("aria-disabled", "true"); b.tabIndex = -1; });
        fb.innerHTML = `<p class="sf-q-verdict is-ok">${esc(first ? t("ld.right", "Exactly!") : t("ld.rightNow", "Now it's right!"))}</p>`;
        say(turn.replyClip, o.de);
        continueBtn(next);
      } else {
        grade(q, i, false, first, solution, o.why);
        first = false;
        btn.classList.add("is-wrong");
        btn.setAttribute("aria-disabled", "true");
        fb.innerHTML = `<p class="sf-q-verdict is-no">${esc(t("ld.what", "Sorry? 🤔"))}</p><p class="quiz-explain" lang="en">${esc(o.why || "")}</p>`;
      }
    }));
  }

  function taskBuild(q, i, turn, next) {
    const box = panel.querySelector("[data-task]");
    const fb = panel.querySelector("[data-fb]");
    const btns = panel.querySelector("[data-btns]");
    const { words, extra = [], alts = [], why } = turn.task;
    const solution = words.join(" ");
    const accepted = [solution, ...alts].map(norm);
    const tiles = shuffle([...words, ...extra].map((w, k) => ({ w, k })));
    let placed = [];
    let first = true, tries = 0, finished = false;

    box.innerHTML = `<p class="ld-you">${esc(t("ld.build", "You say – tap the words into the right order:"))}</p>
      <div class="ld-answer" data-answer aria-label="${esc(t("ld.answer", "Your sentence"))}"></div>
      <div class="ld-bank" data-bank></div>`;
    btns.innerHTML = `<button type="button" class="quiz-btn quiz-btn--primary" data-check>${esc(t("ld.check", "Check"))}</button>`;
    const answerEl = box.querySelector("[data-answer]");
    const bankEl = box.querySelector("[data-bank]");
    const check = btns.querySelector("[data-check]");

    function render() {
      answerEl.innerHTML = placed.length
        ? placed.map((p) => `<button type="button" class="ld-tile is-placed" data-k="${p.k}" lang="en">${esc(p.w)}</button>`).join("")
        : `<span class="ld-answer-ph">${esc(t("ld.answerPh", "Tap the words below …"))}</span>`;
      bankEl.innerHTML = tiles.filter((x) => !placed.includes(x)).map((x) => `<button type="button" class="ld-tile" data-k="${x.k}" lang="en">${esc(x.w)}</button>`).join("");
      const open = words.length - placed.length;
      setWaiting(check, open > 0 ? (open === 1 ? t("ld.needOne", "1 word still missing.") : t("ld.needN", "{n} words still missing.", { n: open })) : null, open > 0 ? "[data-bank] .ld-tile" : null);
    }
    box.addEventListener("click", (e) => {
      const b = e.target.closest(".ld-tile");
      if (!b || finished) return;
      const tile = tiles.find((x) => String(x.k) === b.dataset.k);
      if (b.classList.contains("is-placed")) placed = placed.filter((p) => p !== tile);
      else placed.push(tile);
      fb.innerHTML = "";
      render();
    });
    check.addEventListener("click", () => {
      if (finished || check.getAttribute("aria-disabled") === "true") return;
      const said = norm(placed.map((p) => p.w).join(" "));
      if (accepted.includes(said)) {
        finished = true;
        grade(q, i, true, first, solution);
        answerEl.classList.add("is-right");
        box.querySelectorAll(".ld-tile").forEach((b) => { b.setAttribute("aria-disabled", "true"); b.tabIndex = -1; });
        bankEl.hidden = true;
        fb.innerHTML = `<p class="sf-q-verdict is-ok">${esc(first ? t("ld.right", "Exactly!") : t("ld.rightNow", "Now it's right!"))}</p>`;
        say(turn.replyClip, solution);
        continueBtn(next);
        return;
      }
      grade(q, i, false, first, solution, why);
      first = false;
      tries++;
      answerEl.classList.remove("is-shake"); void answerEl.offsetWidth; answerEl.classList.add("is-shake");
      if (tries >= 2) {
        finished = true;
        fb.innerHTML = `<p class="sf-q-verdict is-no">${esc(t("ld.solution", "Here's how:"))}</p><p class="ld-solution" lang="en">${esc(solution)}</p><p class="quiz-explain" lang="en">${esc(why || "")}</p>`;
        bankEl.hidden = true;
        say(turn.replyClip, solution);
        continueBtn(next);
      } else {
        fb.innerHTML = `<p class="sf-q-verdict is-no">${esc(t("ld.what", "Sorry? 🤔"))}</p><p class="quiz-explain" lang="en">${esc(why || "")}</p>`;
      }
    });
    render();
  }

  // --- say: the reply spoken into the microphone, scored by the Aussprache-Check's service.
  // Opt-in on every such turn: „🎤 Sprechen“ or „Lieber tippen“ (the same sentence as a build
  // task). The microphone is asked for on that tap, never before. Speaking needs an account
  // (the service is metered per day, src/lib/usage.ts); signed out, the button says so.
  // A take that misses the mark costs nothing: what counts is the first try that is graded –
  // a passing take, or the first check of the typed sentence.
  let speakOff = null; // why speaking is out for the rest of this visit (limit, quota …)

  async function signedIn() {
    if (import.meta.env.DEV && globalThis.__fakeAssessment) return true; // see pronunciation/index.ts
    try {
      const { createBrowserSupabase } = await import("../supabase/browser.js");
      const { data } = await createBrowserSupabase().auth.getSession();
      return !!data?.session;
    } catch {
      return false;
    }
  }

  function taskSay(q, i, turn, next) {
    const box = panel.querySelector("[data-task]");
    const fb = panel.querySelector("[data-fb]");
    const btns = panel.querySelector("[data-btns]");
    const solution = turn.task.words.join(" ");
    box.innerHTML = `<p class="ld-you">${esc(t("ld.sayIt", "You say – say the sentence out loud:"))}</p>
      <p class="ld-say-line" lang="en">${esc(solution)}</p>
      <div class="ld-tools"><button type="button" class="ld-tool" data-say-model>🔊 <span>${esc(t("ld.listenModel", "How it sounds"))}</span></button></div>
      <p class="ld-say-status" data-say-status aria-live="polite"></p>`;
    btns.innerHTML = `<button type="button" class="quiz-btn quiz-btn--primary" data-rec>🎤 ${esc(t("ld.speak", "Speak"))}</button>
      <button type="button" class="quiz-btn" data-type>${esc(t("ld.typeInstead", "Type instead"))}</button>`;
    const rec = btns.querySelector("[data-rec]");
    const status = box.querySelector("[data-say-status]");
    box.querySelector("[data-say-model]").addEventListener("click", () => say(turn.replyClip, solution));
    let busy = false, finished = false;
    if (speakOff) setWaiting(rec, speakOff);
    else signedIn().then((yes) => { if (!yes && !finished) setWaiting(rec, t("ld.speakLogin", "Speaking works with an account (free, signed in). You can also tap the sentence.")); });

    btns.querySelector("[data-type]").addEventListener("click", () => {
      if (busy) return;
      finished = true;
      taskBuild(q, i, { ...turn, task: { ...turn.task, type: "build" } }, next);
    });
    rec.addEventListener("click", async () => {
      if (busy || finished || rec.getAttribute("aria-disabled") === "true") return;
      busy = true;
      rec.disabled = true; // recording: busy, not "not ready"
      fb.innerHTML = "";
      status.textContent = t("ld.micPrep", "Getting the microphone ready …");
      try {
        const [{ checkMicrophone, MSG }, { pronunciationProvider, PronunciationError }] = await Promise.all([
          import("../ausspracheCheck.js"),
          import("../pronunciation/index.ts"),
        ]);
        try {
          const stream = await checkMicrophone();
          stream?.getTracks().forEach((tr) => tr.stop()); // only the permission; the provider records itself
          const a = await pronunciationProvider.assess({
            referenceText: solution,
            language: "en-GB",
            onListening: () => { status.textContent = t("ld.listening", "I'm listening … say the sentence now."); },
          });
          const ok = a.overall >= SAY_PASS && (a.completeness == null || a.completeness >= SAY_PASS);
          status.textContent = "";
          if (ok) {
            finished = true;
            grade(q, i, true, true, solution);
            fb.innerHTML = `<p class="sf-q-verdict is-ok">${esc(t("ld.saidRight", "Well said! {s} out of 100", { s: a.overall }))}</p>`;
            btns.innerHTML = "";
            continueBtn(next);
          } else {
            fb.innerHTML = `<p class="sf-q-verdict is-no">${esc(t("ld.saidAlmost", "Not quite yet – {s} out of 100.", { s: a.overall }))}</p><p class="quiz-explain">${esc(t("ld.saidTry", "Listen to the sentence and say it once more – or tap it."))}</p>`;
          }
        } catch (err) {
          const code = err instanceof PronunciationError ? err.code : "failed";
          status.textContent = MSG[code] ?? MSG.failed;
          // Nothing more to get from the service today, or no microphone: stop offering it.
          if (["auth", "limit", "full", "quota", "config", "micDenied", "micMissing", "micUnsupported", "insecure"].includes(code)) {
            speakOff = MSG[code] ?? MSG.failed;
          }
        }
      } catch {
        status.textContent = t("ld.speakFailed", "Speaking isn't working right now. Tap the sentence.");
        speakOff = status.textContent;
      } finally {
        busy = false;
        if (!finished) {
          rec.disabled = false;
          if (speakOff) setWaiting(rec, speakOff);
        }
      }
    });
  }

  function flashItem(q) {
    const el = hudItems.querySelector(`.ld-item:nth-child(${QUESTS.indexOf(q) + 1})`);
    el?.classList.add("is-new");
    setTimeout(() => el?.classList.remove("is-new"), 1400);
  }

  function finish() {
    state = "done";
    playMusic("win");
    markAreaDone(area.id);
    if (!reviewedNow) track("lindenau_finish", { area: area.id, first_try: firstTry, of: TASK_COUNT });
    const nextArea = AREAS[AREAS.indexOf(area) + 1];
    const canReview = missed.length > 0 && !reviewedNow;
    draw();
    showPanel(`<div class="sf-result">
      <p class="sf-q-tag">${esc(area.title)}</p>
      <p class="sf-score">${esc(t("ld.score", "{r} of {n} answers right first time", { r: firstTry, n: TASK_COUNT }))}</p>
      <p class="ld-coin-line">${esc(coinNote([]))}</p>
      ${missed.length ? `<p class="sf-missed-h">${esc(t("ld.missed", "Practise these sentences again"))}</p>
        <ul class="sf-missed">${dedupe(missed).map((m) => `<li><p class="ld-missed-where">${esc(m.quest.role)}</p><p class="sf-missed-a" lang="en"><b>${esc(m.solution)}</b></p>${m.why ? `<p lang="en">${esc(m.why)}</p>` : ""}</li>`).join("")}</ul>`
        : `<p class="sf-best">${esc(t("ld.perfect", "All right first time – Brambleford is proud of you!"))}</p>`}
      <div class="sf-q-btns">
        ${canReview ? `<button type="button" class="quiz-btn quiz-btn--primary" data-review>${esc(t("ld.review", "Review"))}</button>` : ""}
        ${nextArea && !canReview ? `<button type="button" class="quiz-btn quiz-btn--primary" data-next-area>${esc(t("ld.nextArea", "Next: {a}", { a: nextArea.title }))}</button>` : ""}
        <button type="button" class="quiz-btn${canReview || nextArea ? "" : " quiz-btn--primary"}" data-again>${esc(t("ld.again", "Play again"))}</button>
        <a class="quiz-btn" href="/games/countable-sprint">${esc(t("ld.more", "Another game"))}</a>
      </div></div>`);
    panel.querySelector("[data-again]").addEventListener("click", () => start(area.id));
    panel.querySelector(".sf-result").append(spielMeldenRow("lindenau", roundInfo));
    panel.querySelector("[data-next-area]")?.addEventListener("click", () => {
      root.dispatchEvent(new CustomEvent("ld:area", { detail: nextArea.id }));
      start(nextArea.id);
    });
    panel.querySelector("[data-review]")?.addEventListener("click", () => {
      // A run of its own for the review list: right here and once more next time = learnt.
      run = Date.now();
      reviewedNow = true;
      const due = dedupe(missed).map((m) => ({ q: m.quest, i: m.i }));
      runReview(due, 0, finish);
    });
    panel.scrollTop = 0;
    if (firstTry === TASK_COUNT) celebrate({ title: t("ld.perfectShort", "All correct!"), body: t("ld.perfect", "All right first time – Brambleford is proud of you!"), lead: "bruno", crew: ["regi", ...QUESTS.map((q) => q.mascot).filter((m) => MASCOT_NAMES.includes(m))] });
  }
  function dedupe(list) {
    const seen = new Set();
    return list.filter((m) => (seen.has(m.solution) ? false : seen.add(m.solution)));
  }

  // --- drawing -------------------------------------------------------------------------
  function nextGoal() {
    if (!introDone) return npcs[0];
    const open = npcs.filter((n) => n.id !== "bruno" && !done.has(n.id));
    if (!open.length) return npcs[0];
    return open.reduce((a, b) => (Math.hypot(a.x - me.x, a.y - me.y) < Math.hypot(b.x - me.x, b.y - me.y) ? a : b));
  }

  function draw() {
    if (!me) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#9fd18b";
    ctx.fillRect(0, 0, cw, ch);
    const vw = cw / zoom, vh = ch / zoom;
    cam.x = vw >= W ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, me.x - vw / 2));
    cam.y = vh >= H ? (H - vh) / 2 : Math.max(0, Math.min(H - vh, me.y - vh / 2));
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -cam.x * dpr * zoom, -cam.y * dpr * zoom);

    // Grass with a little texture.
    ctx.fillStyle = "#9fd18b";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let i = 0; i < 90; i++) { const x = (i * 137) % W, y = (i * 263) % H; ctx.fillRect(x, y, 6, 2); }

    // Paths: the streets, the square, and a walk from every door to the street before it.
    const sq = area.square;
    ctx.fillStyle = "#e6dfd0";
    for (const st of area.streets) ctx.fillRect(st.x, st.y, st.w, st.h);
    ctx.beginPath(); ctx.arc(sq.x, sq.y, sq.r, 0, Math.PI * 2); ctx.fill();
    const across = area.streets.filter((st) => st.w > st.h);
    for (const b of BUILDINGS) {
      const cx = b.x + b.w / 2;
      if (b.door === "s") {
        const st = across.filter((x) => x.y >= b.y + b.h).sort((a, c) => a.y - c.y)[0];
        if (st) ctx.fillRect(cx - 34, b.y + b.h, 68, st.y - b.y - b.h + 4);
      } else {
        const st = across.filter((x) => x.y + x.h <= b.y).sort((a, c) => c.y - a.y)[0];
        if (st) ctx.fillRect(cx - 34, st.y + st.h - 4, 68, b.y - st.y - st.h + 8);
      }
    }
    // Cobbles: across the street's width.
    ctx.strokeStyle = "rgba(120,100,70,.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const st of area.streets) {
      if (st.w > st.h) for (let x = st.x; x < st.x + st.w; x += 24) { ctx.moveTo(x, st.y); ctx.lineTo(x, st.y + st.h); }
      else for (let y = st.y; y < st.y + st.h; y += 24) { ctx.moveTo(st.x, y); ctx.lineTo(st.x + st.w, y); }
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,100,70,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sq.x, sq.y, sq.r, 0, Math.PI * 2); ctx.stroke();

    // Rails (above the station).
    const rl = area.rails;
    if (rl) {
      ctx.fillStyle = "#b9b2a5";
      ctx.fillRect(rl.x, rl.y, rl.w, rl.h);
      ctx.strokeStyle = "#6b6257"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(rl.x, rl.y + 22); ctx.lineTo(rl.x + rl.w, rl.y + 22); ctx.moveTo(rl.x, rl.y + 48); ctx.lineTo(rl.x + rl.w, rl.y + 48); ctx.stroke();
      ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = 5;
      ctx.beginPath(); for (let x = rl.x + 10; x < rl.x + rl.w; x += 22) { ctx.moveTo(x, rl.y + 14); ctx.lineTo(x, rl.y + 56); } ctx.stroke();
    }

    // Fountain.
    ctx.fillStyle = "#a9a399";
    ctx.beginPath(); ctx.arc(FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6fb6e0";
    ctx.beginPath(); ctx.arc(FOUNTAIN.x, FOUNTAIN.y, FOUNTAIN.r - 9, 0, Math.PI * 2); ctx.fill();
    const ph = (performance.now() % 1600) / 1600;
    ctx.strokeStyle = `rgba(255,255,255,${0.7 - ph * 0.6})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(FOUNTAIN.x, FOUNTAIN.y, 6 + ph * 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#dbeefa";
    ctx.beginPath(); ctx.arc(FOUNTAIN.x, FOUNTAIN.y, 7, 0, Math.PI * 2); ctx.fill();

    // Buildings: shadow, wall (the front facing the path), roof, sign.
    for (const b of BUILDINGS) {
      ctx.fillStyle = "rgba(0,0,0,.16)";
      ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
      const front = 56;
      const fy = b.door === "s" ? b.y + b.h - front : b.y;
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 1; k < 6; k++) { const y = b.y + (b.h * k) / 6; ctx.moveTo(b.x + 6, y); ctx.lineTo(b.x + b.w - 6, y); }
      ctx.stroke();
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, fy, b.w, front);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      // Door and windows on the front.
      const cx = b.x + b.w / 2;
      ctx.fillStyle = "#7a5233";
      if (b.door === "s") ctx.fillRect(cx - 16, fy + front - 34, 32, 34);
      else ctx.fillRect(cx - 16, fy, 32, 34);
      ctx.fillStyle = "#bfe0f2";
      for (const wx of [b.x + 22, b.x + b.w - 52]) ctx.fillRect(wx, fy + 14, 30, 24);
      if (b.sign) {
        const sy = b.door === "s" ? fy - 30 : fy + front + 4;
        ctx.font = "700 20px system-ui, sans-serif";
        const tw = ctx.measureText(b.sign).width + (icons[b.id] ? 34 : 0) + 24;
        ctx.fillStyle = "#fffbef"; ctx.strokeStyle = "#5b4630"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(cx - tw / 2, sy, tw, 28, 7); ctx.fill(); ctx.stroke();
        const ic = icons[b.id];
        let tx = cx - tw / 2 + 12;
        if (ic?.complete && ic.naturalWidth) { ctx.drawImage(ic, tx, sy + 1, 26, 26); tx += 32; }
        ctx.fillStyle = "#3b2a1a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(b.sign, tx, sy + 15);
      }
    }

    // Trees.
    for (const tr of TREES) {
      ctx.fillStyle = "rgba(0,0,0,.15)";
      ctx.beginPath(); ctx.ellipse(tr.x + 6, tr.y + 10, tr.r, tr.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3f8a45";
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.14)";
      ctx.beginPath(); ctx.arc(tr.x - tr.r / 3, tr.y - tr.r / 3, tr.r / 2.4, 0, Math.PI * 2); ctx.fill();
    }

    // People, back to front, the learner among them.
    const goal = state === "walk" ? nextGoal() : null;
    const figures = [...npcs.map((n) => ({ n, y: n.y })), { me: true, y: me.y }, ...mud.filter((m) => m.state !== "gone").map((m) => ({ m, y: m.y }))].sort((a, b) => a.y - b.y);
    for (const f of figures) {
      if (f.me) drawMe();
      else if (f.m) drawMud(f.m);
      else drawNpc(f.n, f.n === goal);
    }
    for (const b of tBubbles) drawBubble(ctx, b.x, b.y, b.r, tt + b.ph);
    for (const p of tParts) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = `hsl(${p.hue},90%,70%)`; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.font = "700 15px Fredoka, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const x of tTexts) {
      ctx.globalAlpha = Math.min(1, x.life * 1.5);
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(26,34,48,.85)"; ctx.strokeText(x.text, x.x, x.y);
      ctx.fillStyle = "#fff"; ctx.fillText(x.text, x.x, x.y);
      ctx.globalAlpha = 1;
    }
    if (dest && state === "walk") {
      ctx.strokeStyle = "rgba(13,148,136,.7)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(dest.x, dest.y, 10, 0, Math.PI * 2); ctx.stroke();
    }

    // Arrow to the next goal when it is far.
    if (goal) {
      const d = Math.hypot(goal.x - me.x, goal.y - me.y);
      if (d > 170) {
        const ang = Math.atan2(goal.y - me.y, goal.x - me.x);
        ctx.save();
        ctx.translate(me.x + Math.cos(ang) * 46, me.y - 10 + Math.sin(ang) * 46);
        ctx.rotate(ang);
        ctx.fillStyle = "#facc15"; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawNpc(n, isGoal) {
    const s = 64;
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 18, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    const bob = calmTown ? 0 : Math.sin(performance.now() / 380 + n.x) * 1.5;
    if (n.img.complete && n.img.naturalWidth) ctx.drawImage(n.img, n.x - s / 2, n.y - s + 22 + bob, s, s);
    else { ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(n.x, n.y, 18, 0, Math.PI * 2); ctx.fill(); }
    // Badge: ! open errand (or Bruno before the intro / at the end), ✓ done.
    let mark = null;
    if (n.id === "bruno") { if (!introDone || done.size === QUESTS.length) mark = "!"; }
    else if (done.has(n.id)) mark = "✓";
    else if (introDone) mark = "!";
    if (mark) {
      const y = n.y - s + 10 + bob - (isGoal && !calmTown ? Math.abs(Math.sin(performance.now() / 300)) * 5 : 0);
      ctx.fillStyle = mark === "✓" ? "#16a34a" : "#facc15";
      ctx.strokeStyle = "#1a2230"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(n.x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = mark === "✓" ? "#fff" : "#1a2230";
      ctx.font = "800 16px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(mark, n.x, y + 1);
    }
    ctx.font = "700 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,.85)";
    const tw = ctx.measureText(n.name).width + 10;
    ctx.beginPath(); ctx.roundRect(n.x - tw / 2, n.y + 26, tw, 17, 6); ctx.fill();
    ctx.fillStyle = "#1a2230";
    ctx.fillText(n.name, n.x, n.y + 28);
  }

  function drawMe() {
    const moving = state === "walk" && (dest || keys.up || keys.down || keys.left || keys.right);
    const z = me.z || 0;
    ctx.fillStyle = "rgba(0,0,0,.2)";
    ctx.beginPath(); ctx.ellipse(me.x, me.y + 14, 15 - z / 8, 6 - z / 20, 0, 0, Math.PI * 2); ctx.fill();
    // the head turns with the last walking direction: side, towards the camera, away from it
    const view = Math.abs(fy) > Math.abs(fx) ? (fy > 0 ? "front" : "back") : "side";
    drawHero(ctx, me.x, me.y + 14 - z, { face, view, t: performance.now() / 1000, run: moving && !z, air: z > 0, scale: 1.25 });
  }

  function drawMud(m) {
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(m.x, m.y + 2, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    const lift = m.lift ?? 0;
    ctx.save();
    ctx.translate(m.x, m.y - lift); ctx.scale(1.3, 1.3); ctx.translate(-m.x, -m.y);
    drawMonster(ctx, m, tt, Math.sign(me.x - m.x));
    if (m.state === "bubbled") drawBubble(ctx, m.x, m.y - m.r, m.r + 9, tt);
    ctx.restore();
  }

  // Dev only: lets a playthrough script find the people on screen (removed from the build).
  if (import.meta.env?.DEV) {
    window.__lindenau = {
      get state() { return state; },
      screenOf(id) {
        const n = npcs.find((x) => x.id === id), r = canvas.getBoundingClientRect();
        return { x: r.left + (n.x - cam.x) * zoom, y: r.top + (n.y - cam.y) * zoom };
      },
    };
  }

  return { start };
}
