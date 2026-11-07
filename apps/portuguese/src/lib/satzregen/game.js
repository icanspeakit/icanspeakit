// Regis Satzregen (/games/sentence-rain): the page side. Builds the markup, reads keys, taps and
// swipes, runs the fixed-step loop of engine.js and draws its state into the DOM.
//
// DOM, not canvas (docs/satzregen-tier0-v1.md): the pieces are text. The board is a stack of
// absolutely placed sentence lines (one per row, notebook ruling behind them); the falling
// chunk is one element moved with a transform. Lines are redrawn only when something lands
// or a line is checked; the falling chunk every frame.
//
// All texts the learner sees are in STR, one object, so the release can move them to
// i18n keys (sr.*). The sentences are content (src/data/satzregen/).
import { mascotSvg } from "../mascots.js";
import { chunkLabel, sentenceText } from "./check.js";
import * as E from "./engine.js";
import { newSeed } from "../artikelSprint/rng.js";
import { withBase } from "../paths.js";

export const STR = {
  title: "Regi's Sentence Rain",
  eyebrow: "Game · Prototype",
  lead: "Words rain from the sky. Put them in the right order – then the line is a sentence and disappears. Wrong? Then it turns to stone.",
  modeLabel: "What do you want to practise?",
  go: "Let's go",
  how: "How to play",
  howPc: "<b>Computer:</b> ← → = move the tile, ↓ = faster, space bar = drop, C = hold, P = pause.",
  howPhone: "<b>Phone:</b> Tap a box – the tile falls there. Swipe down = drop.",
  howHold: "<b>Hold:</b> Put a tile aside and take the next one. Once per tile.",
  howStone: "A wrong line turns to <b>stone</b> and stays there. When the pile reaches the sky, the game is over.",
  points: "Points",
  pointsShort: "Pts",
  lines: "Lines",
  level: "Speed",
  combo: "Streak",
  hold: "Hold",
  holdKey: "Hold (C)",
  holdEmpty: "empty",
  holdUsed: "Take the next tile first – then you can hold again.",
  next: "Next",
  nextLast: "last tile",
  pause: "Pause",
  pauseKey: "Pause (P)",
  resume: "Continue",
  restart: "Start again",
  quit: "Quit",
  over: "The pile has reached the top!",
  overSub: "Game over.",
  again: "Play again",
  back: "Other topic",
  resLines: "Lines",
  resAcc: "right",
  resCombo: "best streak",
  resPoints: "Points",
  tricky: "These sentences were tricky",
  trickyNone: "No stone lines – great!",
  yours: "Yours:",
  right: "Right:",
  listen: "Listen",
  canvas: "Game area: word tiles fall onto a sentence line",
  slot: (i, n) => `Slot ${i} of ${n}`,
  slotEmpty: "empty",
  radier: "Rubber",
  radierHint: "Drop it – it rubs out the top stone line.",
  lupe: "Magnifying glass",
  lupeHint: "The magnifying glass shows you where this tile goes.",
  modes: {
    v2: { name: "Word order", sub: "Statements and questions", level: "A1" },
  },
  rule: {
    v2: "Usually subject, verb, object. Time and place can go at the front, and the subject can follow the verb.",
    w: "Question word first, then straight to the verb. There is no do or does, and the question opens with ¿.",
    janein: "A yes/no question is built like a statement. Only ¿ ? and your voice show the question.",
    klammer: "Me, te, lo, la, le, nos and os go right before the verb, and before haber in the perfect: me ha llamado.",
    nebensatz: "After dónde, cómo or cuándo the verb comes first, then the subject: no sé dónde está la estación.",
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The rule line for a sentence (end screen, Steinzeile). */
export function ruleFor(s) {
  if (s.rule) return s.rule;
  if (s.mode === "v2") return s.e === "?" ? STR.rule.w : STR.rule.v2;
  return STR.rule[s.mode] || "";
}

function markup() {
  const modes = Object.entries(STR.modes)
    .map(([id, m], i) => `<button type="button" class="sr-seg-btn" data-mode="${id}" aria-pressed="${i === 0}"><span>${esc(m.name)}</span><small>${esc(m.sub)} · ${m.level}</small></button>`)
    .join("");
  return `
  <div class="sr-hud" data-hud hidden>
    <span class="sr-hud-item"><span class="sr-long">${STR.points}</span><span class="sr-short">${STR.pointsShort}</span> <b data-score>0</b></span>
    <span class="sr-hud-item">${STR.lines} <b data-lines>0</b></span>
    <span class="sr-hud-item">${STR.level} <b data-level>1</b></span>
    <span class="sr-hud-item sr-combo" data-combo-wrap>${STR.combo} <b data-combo>0</b></span>
    <button type="button" class="sr-icon" data-pause aria-label="${STR.pauseKey}" title="${STR.pauseKey}">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>
    </button>
  </div>
  <div class="sr-play">
    <aside class="sr-side">
      <button type="button" class="sr-box sr-hold" data-hold title="${STR.holdKey}" aria-label="${STR.holdKey}">
        <span class="sr-box-k">${STR.hold} <kbd>C</kbd></span>
        <span class="sr-box-v" data-hold-v>${STR.holdEmpty}</span>
      </button>
      <div class="sr-box sr-next">
        <span class="sr-box-k">${STR.next}</span>
        <span class="sr-box-v" data-next-v></span>
      </div>
    </aside>
    <div class="sr-board" data-board role="application" aria-label="${STR.canvas}">
      <div class="sr-rows" data-rows></div>
      <div class="sr-fall" data-fall hidden></div>
      <div class="sr-show" data-show hidden aria-live="polite"></div>
    </div>
  </div>

  <section class="sr-card sr-card--start" data-start>
    <div class="sr-start-regi" aria-hidden="true">${mascotSvg({ name: "regi", expr: "happy", size: 120 })}</div>
    <p class="sr-eyebrow">${STR.eyebrow}</p>
    <h1>${STR.title}</h1>
    <p class="sr-lead">${STR.lead}</p>
    <p class="sr-label">${STR.modeLabel}</p>
    <div class="sr-seg" role="group" aria-label="${STR.modeLabel}">${modes}</div>
    <button type="button" class="sr-go" data-go>${STR.go}</button>
    <details class="sr-how">
      <summary>${STR.how}</summary>
      <ul><li>${STR.howPc}</li><li>${STR.howPhone}</li><li>${STR.howHold}</li><li>${STR.howStone}</li></ul>
    </details>
  </section>

  <section class="sr-card sr-card--pause" data-pause-card hidden role="dialog" aria-modal="true" aria-label="${STR.pause}">
    <h2>${STR.pause}</h2>
    <button type="button" class="sr-go" data-resume>${STR.resume}</button>
    <button type="button" class="sr-quiet" data-restart>${STR.restart}</button>
    <button type="button" class="sr-quiet" data-quit>${STR.quit}</button>
  </section>

  <section class="sr-card sr-card--end" data-end hidden>
    <h2 data-end-title>${STR.over}</h2>
    <div class="sr-result" data-result></div>
    <button type="button" class="sr-go" data-again>${STR.again}</button>
    <button type="button" class="sr-quiet" data-back>${STR.back}</button>
    <h3>${STR.tricky}</h3>
    <ol class="sr-tricky" data-tricky></ol>
  </section>`;
}

/** Sentence audio: the voiced example sentences (public/audio/saetze). */
let audioEl = null;
function playAudio(slug) {
  if (!slug) return;
  try {
    audioEl?.pause();
    audioEl = new Audio(withBase(`/audio/saetze/${slug}.mp3`));
    audioEl.play().catch(() => {});
  } catch {}
}

/** Mount the game into `root`. `data`: every sentence (saetze.json). */
export function mountSatzregen(root, data) {
  root.innerHTML = markup();
  const $ = (sel) => root.querySelector(sel);
  const board = $("[data-board]");
  const rowsEl = $("[data-rows]");
  const fallEl = $("[data-fall]");
  const showEl = $("[data-show]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode = "v2";
  let g = null;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let paused = false;
  let rowH = 56;
  let lineGeom = null; // { n, left, slotW, gap } of the active line

  const setPhase = (p) => (root.dataset.phase = p);

  root.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      root.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }),
  );

  function pool() {
    return data.filter((s) => s.mode === mode);
  }

  function start(seed = newSeed(), only = null) {
    const sentences = only ? data.filter((s) => only.includes(s.id)) : pool();
    g = E.createGame({ sentences, seed, mode, stufe: STR.modes[mode]?.level || "A1" });
    paused = false;
    $("[data-start]").hidden = true;
    $("[data-end]").hidden = true;
    $("[data-pause-card]").hidden = true;
    $("[data-hud]").hidden = false;
    setPhase("play");
    layout();
    drawLines();
    drawSide();
    drawHud();
    last = performance.now();
    acc = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    board.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- geometry ---- */
  function layout() {
    const h = board.clientHeight || 448;
    rowH = h / E.K.rows;
    root.style.setProperty("--sr-row", `${rowH}px`);
  }

  function geomFor(n) {
    const w = board.clientWidth;
    const pad = Math.max(6, Math.min(16, w * 0.025));
    const gap = Math.max(4, Math.min(10, w * 0.015));
    const end = 14; // room for the end mark
    const slotW = (w - 2 * pad - end - gap * (n - 1)) / n;
    return { n, left: pad, slotW, gap };
  }
  const laneX = (geo, i) => geo.left + i * (geo.slotW + geo.gap) + geo.slotW / 2;

  /* ------------------------------------------------------------------- drawing ---- */
  function lineHtml(s, cells, cls, row) {
    const n = cells.length;
    const geo = geomFor(n);
    const slots = cells
      .map((c, i) => {
        const x = geo.left + i * (geo.slotW + geo.gap);
        const label = c.text === null ? STR.slotEmpty : chunkLabel(c.text, i, s.e);
        return `<span class="sr-slot${c.text === null ? " is-empty" : ""}${c.cls ? ` ${c.cls}` : ""}" data-slot="${i}" style="left:${x}px;width:${geo.slotW}px" aria-label="${esc(STR.slot(i + 1, n))}: ${esc(label)}">${c.text === null ? "" : `<span class="sr-chunk" lang="es">${esc(chunkLabel(c.text, i, s.e))}</span>`}</span>`;
      })
      .join("");
    const endX = geo.left + n * (geo.slotW + geo.gap) - geo.gap + 3;
    return `<div class="sr-line ${cls}" style="top:${row * rowH}px">${slots}<span class="sr-end" style="left:${endX}px">${s.e}</span></div>`;
  }

  function drawLines() {
    if (!g) return;
    let html = "";
    for (let r = 0; r < E.K.rows; r++) html += `<div class="sr-rule" style="top:${(r + 1) * rowH}px"></div>`;
    g.stones.forEach((st, i) => {
      const row = E.K.rows - 1 - i;
      html += lineHtml(st.s, st.order.map((t, j) => ({ text: t, cls: st.wrong[j] ? "is-wrong" : "" })), "is-stone", row);
    });
    const ar = E.activeRow(g);
    if (g.line) {
      lineGeom = geomFor(g.line.slots.length);
      const lupe = g.falling?.lupe ? E.lupeSlot(g) : -1;
      html += lineHtml(g.line.s, g.line.slots.map((t, i) => ({ text: t, cls: i === lupe ? "is-lupe" : "" })), "is-active", ar);
    } else if (g.showing) {
      const sh = g.showing;
      html += lineHtml(sh.s, sh.order.map((t, j) => ({ text: t, cls: sh.ok ? "is-ok" : sh.wrong[j] ? "is-wrong" : "" })), sh.ok ? "is-cleared" : "is-stone is-new", sh.ok ? ar : ar + 1);
    }
    rowsEl.innerHTML = html;
    root.classList.toggle("is-danger", ar <= 2);
  }

  function drawFalling() {
    const f = g?.falling;
    if (!f || !g.line) {
      fallEl.hidden = true;
      return;
    }
    const text = f.kind === "radier" ? `<span aria-hidden="true">🧽</span> ${STR.radier}` : esc(g.line.s.c[f.chunk]);
    const html = `${text}${f.lupe ? ' <span class="sr-lupe-ico" aria-hidden="true">🔍</span>' : ""}`;
    if (fallEl.dataset.html !== html) {
      fallEl.innerHTML = html;
      fallEl.dataset.html = html;
      fallEl.classList.toggle("is-radier", f.kind === "radier");
      fallEl.classList.toggle("has-lupe", !!f.lupe);
      fallEl.style.maxWidth = `${Math.max(lineGeom.slotW * 1.6, 90)}px`;
      fallEl.style.minWidth = `${Math.min(lineGeom.slotW, 160)}px`;
    }
    fallEl.hidden = false;
    const x = laneX(lineGeom, f.lane) - fallEl.offsetWidth / 2;
    const maxX = board.clientWidth - fallEl.offsetWidth - 2;
    fallEl.style.transform = `translate(${Math.max(2, Math.min(maxX, x))}px, ${f.y * rowH}px)`;
  }

  function drawSide() {
    if (!g) return;
    const hv = $("[data-hold-v]");
    hv.textContent = g.hold !== null && g.line ? g.line.s.c[g.hold] : STR.holdEmpty;
    hv.classList.toggle("is-empty", g.hold === null);
    $("[data-hold]").classList.toggle("is-used", g.holdUsed);
    const nx = E.preview(g);
    const nv = $("[data-next-v]");
    nv.textContent = nx ?? (g.line ? STR.nextLast : "");
    nv.classList.toggle("is-empty", nx === null);
  }

  function drawHud() {
    $("[data-score]").textContent = g.score;
    $("[data-lines]").textContent = g.lines;
    $("[data-level]").textContent = g.level;
    $("[data-combo]").textContent = g.combo;
    $("[data-combo-wrap]").classList.toggle("is-hot", g.combo >= 2);
  }

  function drawShow() {
    const sh = g.showing;
    if (!sh) {
      showEl.hidden = true;
      return;
    }
    const ar = E.activeRow(g);
    if (sh.ok) {
      const text = sentenceText(sh.order, sh.s.e);
      showEl.className = "sr-show is-ok";
      showEl.innerHTML = `<p class="sr-show-de" lang="es">${esc(text)}${sh.s.au ? ` <button type="button" class="sr-say" data-say="${sh.s.au}" aria-label="${STR.listen}">🔈</button>` : ""}</p><p class="sr-show-en">${esc(sh.s.en)}</p><p class="sr-show-pts">+${sh.pts}${sh.combo > 1 ? ` · ${STR.combo} ×${Math.min(sh.combo, E.K.comboMax)}` : ""}</p>`;
      showEl.style.top = `${Math.max(0, (ar - 1.6) * rowH)}px`;
    } else {
      showEl.className = "sr-show is-stone";
      showEl.innerHTML = `<p class="sr-show-k">${STR.right}</p><p class="sr-show-de" lang="es">${esc(sentenceText(sh.best, sh.s.e))}</p><p class="sr-show-rule">${esc(ruleFor(sh.s))}</p>`;
      showEl.style.top = `${Math.max(0, (ar + 1) * rowH - showEl.offsetHeight - 6)}px`;
    }
    showEl.hidden = false;
  }

  /* --------------------------------------------------------------------- loop ---- */
  function handleEvents() {
    let lines = false;
    let side = false;
    for (const ev of g.events) {
      if (ev.t === "land" || ev.t === "line" || ev.t === "radier" || ev.t === "spawn") (lines = true), (side = true);
      if (ev.t === "hold" || ev.t === "holdNo") side = true;
      if (ev.t === "clear" || ev.t === "stone") {
        lines = true;
        drawLinesThenShow = true;
      }
      if (ev.t === "over") end();
    }
    g.events.length = 0;
    if (lines) drawLines();
    if (side) drawSide();
    if (drawLinesThenShow || (!g.showing && !showEl.hidden)) {
      drawShow();
      drawLinesThenShow = false;
    }
  }
  let drawLinesThenShow = false;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!g || paused) {
      last = now;
      return;
    }
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= E.STEP) {
      E.step(g);
      acc -= E.STEP;
      if (g.events.length) handleEvents();
      if (g.phase === "over") return;
    }
    drawFalling();
    drawHud();
  }

  function end() {
    cancelAnimationFrame(raf);
    setPhase("end");
    fallEl.hidden = true;
    showEl.hidden = true;
    $("[data-hud]").hidden = true;
    const r = $("[data-result]");
    r.innerHTML = `
      <div class="sr-big"><b>${g.lines}</b><span>${STR.resLines}</span></div>
      <dl class="sr-stats">
        <div><dt>${STR.resAcc}</dt><dd>${E.accuracy(g)} %</dd></div>
        <div><dt>${STR.resCombo}</dt><dd>${g.bestCombo}</dd></div>
        <div><dt>${STR.resPoints}</dt><dd>${g.score}</dd></div>
      </dl>`;
    const t = $("[data-tricky]");
    t.innerHTML = g.tricky.length
      ? g.tricky
          .map(
            (st) => `<li>
              <p class="sr-tr-right">${esc(sentenceText(st.best, st.s.e))}${st.s.au ? ` <button type="button" class="sr-say" data-say="${st.s.au}" aria-label="${STR.listen}">🔈</button>` : ""}</p>
              <p class="sr-tr-yours"><span>${STR.yours}</span> ${esc(sentenceText(st.order, st.s.e))}</p>
              <p class="sr-tr-rule">${esc(ruleFor(st.s))}</p>
            </li>`,
          )
          .join("")
      : `<li class="sr-tr-none">${STR.trickyNone}</li>`;
    $("[data-end]").hidden = false;
    $("[data-again]").focus({ preventScroll: true });
  }

  function setPaused(p) {
    if (!g || g.phase === "over" || root.dataset.phase !== "play") return;
    paused = p;
    $("[data-pause-card]").hidden = !p;
    if (p) $("[data-resume]").focus({ preventScroll: true });
    else board.focus({ preventScroll: true });
  }

  /* -------------------------------------------------------------------- input ---- */
  function act(fn) {
    if (!g || paused || root.dataset.phase !== "play") return;
    fn();
    if (g.events.length) handleEvents();
    drawFalling();
  }

  document.addEventListener("keydown", (e) => {
    if (root.dataset.phase !== "play" || e.target.closest?.("input, textarea, select")) return;
    const k = e.key;
    if (k === "p" || k === "P" || k === "Escape") {
      e.preventDefault();
      return setPaused(!paused);
    }
    if (paused) return;
    if (k === "ArrowLeft") act(() => E.move(g, -1));
    else if (k === "ArrowRight") act(() => E.move(g, 1));
    else if (k === "ArrowDown") act(() => (g.soft = true));
    else if (k === " " || k === "Spacebar") act(() => E.hardDrop(g));
    else if (k === "c" || k === "C") act(() => E.holdSwap(g));
    else return;
    e.preventDefault();
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowDown" && g) g.soft = false;
  });

  // Touch and mouse: tap the board = send the chunk to the nearest empty slot in that
  // column; swipe down = drop it where it is.
  let down = null;
  board.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  board.addEventListener("pointerup", (e) => {
    if (!down || !g) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    down = null;
    if (dy > 40 && Math.abs(dy) > Math.abs(dx) * 1.5) return act(() => E.hardDrop(g));
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30) return;
    const f = g.falling;
    if (!f || !g.line || !lineGeom) return;
    const rect = board.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = -1;
    let bestD = Infinity;
    g.line.slots.forEach((t, i) => {
      if (t !== null && f.kind === "chunk") return;
      const d = Math.abs(laneX(lineGeom, i) - x);
      if (d < bestD) (best = i), (bestD = d);
    });
    if (best >= 0) act(() => E.sendTo(g, best));
  });
  board.addEventListener("pointercancel", () => (down = null));

  root.addEventListener("click", (e) => {
    const say = e.target.closest("[data-say]");
    if (say) return playAudio(say.dataset.say);
  });
  $("[data-hold]").addEventListener("click", () => act(() => E.holdSwap(g)));
  $("[data-go]").addEventListener("click", () => start());
  $("[data-again]").addEventListener("click", () => start());
  $("[data-back]").addEventListener("click", () => {
    $("[data-end]").hidden = true;
    $("[data-start]").hidden = false;
    setPhase("start");
  });
  $("[data-pause]").addEventListener("click", () => setPaused(true));
  $("[data-resume]").addEventListener("click", () => setPaused(false));
  $("[data-restart]").addEventListener("click", () => start());
  $("[data-quit]").addEventListener("click", () => {
    paused = false;
    $("[data-pause-card]").hidden = true;
    end();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && g && g.phase !== "over") setPaused(true);
  });
  addEventListener("resize", () => {
    if (!g) return;
    layout();
    drawLines();
    drawShow();
  });

  // For the browser tests (and curious developers): the live game and the engine.
  root.__sr = { get g() { return g; }, E, start: (seed, only) => start(seed, only), setMode: (m) => (mode = m), reduced };
}
