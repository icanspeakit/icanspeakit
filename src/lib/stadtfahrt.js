// Stadtfahrt (/spiele/stadtfahrt): a top-down town the learner drives through with the arrow
// keys (or the four buttons on a phone). One crossing at a time carries a „?" sign; driving
// into it stops the car and asks a question from the own Führerschein bank
// (/fuehrerschein/fragen.json, type mc1, no scene pictures). ROUNDS questions per drive.
//
// The town is a regular grid: roads every PERIOD units, a block of houses or a park between
// them. Blocks are solid, so the car stays on the roads without any lane logic. Nothing here
// is a traffic rule — the rules are in the questions.
//
// Points: 10 for a right answer, up to 5 more for reaching the crossing quickly. Nothing is
// lost for reading slowly: the clock stops while a question is open.
import { recordAttempt } from "./progress.js";
import { celebrate } from "./mascotCelebrate.js";
import { t } from "./uiText.js";
import { mascotImage, ready } from "./mascotImage.js";
import { meldenLink } from "./meldung.js";
import { fingerprint } from "./meldungRef.js";
import { spielMeldenRow } from "./spielMelden.js";

const ROUNDS = 8;
const BEST_KEY = "da-stadtfahrt-best";
const NB = 6; // blocks per side
const ROAD = 96;
const BLOCK = 260;
const PERIOD = ROAD + BLOCK;
const WORLD = NB * PERIOD + ROAD;
const INSET = 14; // pavement between road and houses
const CAR_R = 11; // collision radius
const MAX_V = 240;
const MAX_REV = 80;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const center = (i) => i * PERIOD + ROAD / 2;
const store = {
  get() { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } },
  set(n) { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode */ } },
};

/** A small seeded random, so a block looks the same every frame. */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const ROOFS = ["#c2553d", "#a8473a", "#7d6a5a", "#5f7d8c", "#b07a3b", "#8a5a7a"];

/** Every block once: its solid rectangle and what is drawn on it. */
function buildTown() {
  const blocks = [];
  for (let i = 0; i < NB; i++) {
    for (let j = 0; j < NB; j++) {
      const r = rng(i * 31 + j * 7 + 3);
      const x = i * PERIOD + ROAD, y = j * PERIOD + ROAD;
      const park = r() < 0.18;
      const houses = [];
      const trees = [];
      if (park) {
        for (let k = 0; k < 9; k++) trees.push({ x: x + INSET + 20 + r() * (BLOCK - 2 * INSET - 40), y: y + INSET + 20 + r() * (BLOCK - 2 * INSET - 40), r: 12 + r() * 10 });
      } else {
        const gap = 10, inner = BLOCK - 2 * INSET, half = (inner - gap) / 2;
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
          houses.push({ x: x + INSET + a * (half + gap), y: y + INSET + b * (half + gap), w: half, h: half, roof: ROOFS[Math.floor(r() * ROOFS.length)], ridge: r() < 0.5 });
        }
      }
      blocks.push({ x, y, park, houses, trees, solid: { x: x + INSET - 2, y: y + INSET - 2, w: BLOCK - 2 * INSET + 4, h: BLOCK - 2 * INSET + 4 } });
    }
  }
  return blocks;
}

export function mountStadtfahrt(root, { fetchUrl }) {
  const canvas = root.querySelector("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const hudRound = root.querySelector("[data-round]");
  const hudScore = root.querySelector("[data-score]");
  const hudDist = root.querySelector("[data-dist]");
  const panel = root.querySelector("[data-panel]");
  const pauseBtn = root.querySelector("[data-pause]");
  const town = buildTown();

  let bank = null;
  let state = "idle"; // idle | drive | ask | pause | done
  const bruno = mascotImage("bruno");
  let car, target, queue, round, score, right, missed, legStart, legTime, keys, last, raf, par;

  // --- input -------------------------------------------------------------------------
  keys = { up: false, down: false, left: false, right: false };
  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", (e) => {
    if (state === "idle" || state === "done") return;
    const k = KEYMAP[e.code];
    if (k && state === "drive") { keys[k] = true; e.preventDefault(); return; }
    if (state === "ask") {
      const n = Number(e.key);
      if (n >= 1 && n <= 3) { panel.querySelectorAll("[data-opt]")[n - 1]?.click(); e.preventDefault(); }
      else if (e.key === "Enter") { const go = panel.querySelector("[data-go]"); if (go) { go.click(); e.preventDefault(); } }
    }
    if (e.code === "KeyP" || e.code === "Escape") { togglePause(); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "drive") togglePause(); });

  root.querySelectorAll("[data-pad]").forEach((btn) => {
    const k = btn.dataset.pad;
    const on = (e) => { e.preventDefault(); keys[k] = true; btn.classList.add("is-down"); btn.setPointerCapture?.(e.pointerId); };
    const off = () => { keys[k] = false; btn.classList.remove("is-down"); };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("lostpointercapture", off);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  pauseBtn.addEventListener("click", togglePause);

  function togglePause() {
    if (state === "drive") {
      state = "pause";
      for (const k in keys) keys[k] = false;
      showPanel(`<p class="sf-q-tag">${esc(t("sf.paused", "Pause"))}</p>
        <div class="sf-q-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(t("sf.drive", "Weiterfahren"))}</button></div>`);
      panel.querySelector("[data-go]").addEventListener("click", () => { hidePanel(); state = "drive"; last = performance.now(); loop(); });
      panel.append(spielMeldenRow("stadtfahrt", roundInfo));
    } else if (state === "pause") {
      panel.querySelector("[data-go]")?.click();
    }
  }

  // --- canvas size -------------------------------------------------------------------
  let cw = 0, ch = 0, dpr = 1, zoom = 1, lastM = -1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    zoom = Math.max(0.62, Math.min(1.25, Math.min(cw, ch * 1.4) / 560));
    if (state !== "idle") draw();
  }
  new ResizeObserver(resize).observe(canvas);

  // --- game flow ---------------------------------------------------------------------
  async function load() {
    if (bank) return bank;
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`fragen.json ${res.status}`);
    const data = await res.json();
    bank = data.questions.filter((q) => q.type === "mc1" && !q.scene && q.options?.length >= 2);
    return bank;
  }

  function pickTarget() {
    const ci = Math.round((car.x - ROAD / 2) / PERIOD), cj = Math.round((car.y - ROAD / 2) / PERIOD);
    let i, j;
    do { i = Math.floor(Math.random() * (NB + 1)); j = Math.floor(Math.random() * (NB + 1)); }
    while (Math.abs(i - ci) + Math.abs(j - cj) < 3);
    target = { x: center(i), y: center(j) };
    const d = Math.abs(target.x - car.x) + Math.abs(target.y - car.y);
    par = d / 170 + 3;
    legTime = 0;
  }

  function start() {
    queue = shuffle(bank).slice(0, ROUNDS);
    round = 0; score = 0; right = 0; missed = [];
    car = { x: center(0) + ROAD / 4, y: center(3), a: -Math.PI / 2, v: 0 };
    pickTarget();
    hidePanel();
    state = "drive";
    hud();
    resize();
    last = performance.now();
    cancelAnimationFrame(raf);
    loop();
    canvas.focus?.({ preventScroll: true });
  }

  function hud() {
    hudRound.textContent = t("sf.round", "Frage {i} von {n}", { i: Math.min(round + 1, ROUNDS), n: ROUNDS });
    hudScore.textContent = t("sf.points", "{n} Punkte", { n: score });
  }

  function loop() {
    if (state !== "drive") return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function blocked(x, y) {
    if (x < CAR_R || y < CAR_R || x > WORLD - CAR_R || y > WORLD - CAR_R) return true;
    const i = Math.floor((x - ROAD) / PERIOD), j = Math.floor((y - ROAD) / PERIOD);
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
      if (a < 0 || b < 0 || a >= NB || b >= NB) continue;
      const s = town[a * NB + b].solid;
      const nx = Math.max(s.x, Math.min(x, s.x + s.w)), ny = Math.max(s.y, Math.min(y, s.y + s.h));
      if ((nx - x) ** 2 + (ny - y) ** 2 < CAR_R * CAR_R) return true;
    }
    return false;
  }

  function step(dt) {
    legTime += dt;
    if (keys.up) car.v += (car.v < 0 ? 520 : 260) * dt;
    else if (keys.down) car.v -= (car.v > 0 ? 520 : 180) * dt;
    else car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 140 * dt);
    car.v = Math.max(-MAX_REV, Math.min(MAX_V, car.v));
    const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    car.a += steer * 2.7 * dt * Math.min(1, Math.abs(car.v) / 70) * Math.sign(car.v || 1);
    const nx = car.x + Math.cos(car.a) * car.v * dt, ny = car.y + Math.sin(car.a) * car.v * dt;
    if (!blocked(nx, ny)) { car.x = nx; car.y = ny; }
    else if (!blocked(nx, car.y)) { car.x = nx; car.v *= 0.8; }
    else if (!blocked(car.x, ny)) { car.y = ny; car.v *= 0.8; }
    else car.v *= -0.25;
    const d = Math.hypot(target.x - car.x, target.y - car.y);
    const m = Math.round(d / 8);
    if (m !== lastM) {
      lastM = m;
      hudDist.textContent = `${m} m`;
      hudDist.title = t("sf.toTarget", "Zum Fragezeichen: {n} m", { n: m });
    }
    if (d < 34) ask();
  }

  // --- the question ------------------------------------------------------------------
  const roundInfo = () => ({ runde: round + 1, verpasst: (missed ?? []).map((q) => `f:${q.id}`) });
  function showPanel(html) { panel.innerHTML = html; panel.hidden = false; }
  function hidePanel() { panel.hidden = true; panel.innerHTML = ""; }

  function ask() {
    state = "ask";
    car.v = 0;
    for (const k in keys) keys[k] = false;
    root.querySelectorAll("[data-pad]").forEach((b) => b.classList.remove("is-down"));
    draw();
    const q = queue[round];
    const over = Math.max(0, legTime - par);
    const bonus = Math.max(0, 5 - Math.floor(over / 2));
    const order = shuffle(q.options.map((o, k) => k));
    showPanel(`<p class="sf-q-tag">${esc(t("sf.round", "Frage {i} von {n}", { i: round + 1, n: ROUNDS }))}</p>
      ${q.sign ? `<img class="sf-q-sign" src="${esc(q.sign.src)}" alt="${esc(q.sign.name)}" />` : ""}
      <p class="sf-q-prompt" lang="de">${esc(q.prompt)}</p>
      <div class="sf-q-opts">${order.map((k, n) => `<button type="button" class="sf-opt" data-opt="${k}" lang="de"><span class="sf-opt-n">${n + 1}</span>${esc(q.options[k].text)}</button>`).join("")}</div>
      <div class="sf-q-after" data-after></div>`);
    panel.querySelector("[data-opt]")?.focus({ preventScroll: true });
    panel.querySelectorAll("[data-opt]").forEach((btn) => btn.addEventListener("click", () => answer(q, Number(btn.dataset.opt), bonus), { once: true }));
  }

  function answer(q, k, bonus) {
    if (panel.dataset.answered === String(round)) return;
    panel.dataset.answered = String(round);
    const ok = k === q.answer;
    panel.querySelectorAll("[data-opt]").forEach((b) => {
      const n = Number(b.dataset.opt);
      b.classList.toggle("is-right", n === q.answer);
      b.classList.toggle("is-wrong", n === k && !ok);
      b.setAttribute("aria-disabled", "true");
      b.tabIndex = -1;
    });
    if (ok) { score += 10 + bonus; right++; } else missed.push(q);
    recordAttempt({ skill: "fuehrerschein", correct: ok, topic: `fuehrerschein-${q.topic}`, item: `stadtfahrt-${q.id}` });
    hud();
    const lastRound = round + 1 >= ROUNDS;
    panel.querySelector("[data-after]").innerHTML = `
      <p class="sf-q-verdict ${ok ? "is-ok" : "is-no"}">${esc(ok ? t("sf.right", "Richtig!") : t("sf.wrong", "Leider falsch."))}${ok && bonus ? ` <span class="sf-bonus">${esc(t("sf.bonus", "+{n} Tempo-Bonus", { n: bonus }))}</span>` : ""}</p>
      <p class="quiz-explain" lang="de" data-ls="${esc(q.explain)}"${q.explainEasy ? ` data-ls-leicht="${esc(q.explainEasy)}"` : ""}>${esc(q.explain)}</p>
      <div class="sf-q-btns"><button type="button" class="quiz-btn quiz-btn--primary" data-go>${esc(lastRound ? t("sf.result", "Zum Ergebnis") : t("sf.drive", "Weiterfahren"))}</button></div>`;
    // The question is one of the Führerschein bank's: reported as f:<id>, like in fahrQuiz.js.
    const row = document.createElement("div");
    row.className = "mf-row";
    row.append(meldenLink(() => ({
      ref: `f:${q.id}`,
      fingerprint: fingerprint(q.prompt, q.options[q.answer].text),
      snapshot: () => ({ frage: q.prompt, typ: q.type, optionen: q.options.map((o) => o.text), loesung: q.options[q.answer].text, erklaerung: q.explain, antwort: q.options[k]?.text, spiel: "stadtfahrt" }),
    })));
    panel.querySelector("[data-after]").append(row);
    const go = panel.querySelector("[data-go]");
    go.focus({ preventScroll: true });
    go.addEventListener("click", () => {
      round++;
      if (round >= ROUNDS) return finish();
      pickTarget();
      hidePanel();
      hud();
      state = "drive";
      last = performance.now();
      loop();
    }, { once: true });
  }

  function finish() {
    state = "done";
    const best = store.get();
    const isBest = score > best;
    if (isBest) store.set(score);
    showPanel(`<div class="sf-result">
      <p class="sf-q-tag">${esc(t("sf.resultTitle", "Ergebnis"))}</p>
      <p class="sf-score">${esc(t("sf.score", "{r} von {n} richtig · {p} Punkte", { r: right, n: ROUNDS, p: score }))}</p>
      <p class="sf-best">${esc(isBest ? t("sf.newBest", "Neuer Bestwert!") : t("sf.best", "Bestwert: {n} Punkte", { n: best }))}</p>
      ${missed.length ? `<p class="sf-missed-h">${esc(t("sf.missed", "Diese Fragen schau dir nochmal an"))}</p>
        <ul class="sf-missed">${missed.map((q) => `<li><p lang="de">${esc(q.prompt)}</p><p class="sf-missed-a" lang="de"><b>${esc(q.options[q.answer].text)}</b></p>${q.lessonHref ? `<a href="${esc(q.lessonHref)}">${esc(t("sf.lesson", "Zur Lektion: {t}", { t: q.topicTitle }))}</a>` : ""}</li>`).join("")}</ul>`
        : `<p class="sf-best">${esc(t("sf.allRight", "Alles richtig – gute Fahrt!"))}</p>`}
      <div class="sf-q-btns">
        <button type="button" class="quiz-btn quiz-btn--primary" data-again>${esc(t("sf.again", "Nochmal fahren"))}</button>
        <a class="quiz-btn" href="/fuehrerschein">${esc(t("sf.toRules", "Alle Regeln"))}</a>
      </div></div>`);
    panel.querySelector("[data-again]").addEventListener("click", start);
    panel.querySelector(".sf-result").append(spielMeldenRow("stadtfahrt", roundInfo));
    if (right === ROUNDS) celebrate({ title: t("sf.allRight", "Alles richtig – gute Fahrt!"), body: t("sf.points", "{n} Punkte", { n: score }), lead: "quaki", crew: ["bruno", "regi", "hamsti"] });
  }

  // --- drawing -----------------------------------------------------------------------
  function draw() {
    if (!car) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#8fca7a";
    ctx.fillRect(0, 0, cw, ch);
    const vw = cw / zoom, vh = ch / zoom;
    const cx = Math.max(vw / 2, Math.min(WORLD - vw / 2, car.x)) - vw / 2;
    const cy = Math.max(vh / 2, Math.min(WORLD - vh / 2, car.y)) - vh / 2;
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -cx * dpr * zoom, -cy * dpr * zoom);
    const view = { x0: cx - 40, y0: cy - 40, x1: cx + vw + 40, y1: cy + vh + 40 };

    // Roads, one band per row and column, then the centre dashes, then the crossings on top.
    ctx.fillStyle = "#5d636e";
    for (let i = 0; i <= NB; i++) {
      ctx.fillRect(i * PERIOD, 0, ROAD, WORLD);
      ctx.fillRect(0, i * PERIOD, WORLD, ROAD);
    }
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    for (let i = 0; i <= NB; i++) {
      const c = center(i);
      ctx.moveTo(c, 0); ctx.lineTo(c, WORLD);
      ctx.moveTo(0, c); ctx.lineTo(WORLD, c);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#5d636e";
    for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) ctx.fillRect(i * PERIOD + 6, j * PERIOD + 6, ROAD - 12, ROAD - 12);

    for (const b of town) {
      if (b.x > view.x1 || b.y > view.y1 || b.x + BLOCK < view.x0 || b.y + BLOCK < view.y0) continue;
      ctx.fillStyle = "#d8d3c6";
      ctx.fillRect(b.x, b.y, BLOCK, BLOCK);
      if (b.park) {
        ctx.fillStyle = "#79b765";
        ctx.fillRect(b.x + INSET, b.y + INSET, BLOCK - 2 * INSET, BLOCK - 2 * INSET);
        for (const tr of b.trees) {
          ctx.fillStyle = "#3f8a45";
          ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.15)";
          ctx.beginPath(); ctx.arc(tr.x - tr.r / 3, tr.y - tr.r / 3, tr.r / 2.5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        for (const h of b.houses) {
          ctx.fillStyle = "rgba(0,0,0,.18)";
          ctx.fillRect(h.x + 5, h.y + 6, h.w, h.h);
          ctx.fillStyle = h.roof;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeStyle = "rgba(0,0,0,.25)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (h.ridge) { ctx.moveTo(h.x + 8, h.y + h.h / 2); ctx.lineTo(h.x + h.w - 8, h.y + h.h / 2); }
          else { ctx.moveTo(h.x + h.w / 2, h.y + 8); ctx.lineTo(h.x + h.w / 2, h.y + h.h - 8); }
          ctx.stroke();
        }
      }
    }

    // The target crossing: a pulsing ring and a blue „?" sign.
    if (target && state !== "done") {
      const p = (performance.now() % 1200) / 1200;
      ctx.strokeStyle = `rgba(250, 204, 21, ${1 - p})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(target.x, target.y, 26 + p * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#1d4ed8";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(target.x - 17, target.y - 17, 34, 34, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("?", target.x, target.y + 1);
    }

    // The kart (Bruno Kart), and Bruno in it – upright, so his face reads whatever the heading.
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.a);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.roundRect(-15, -9, 34, 22, 6); ctx.fill();
    ctx.fillStyle = "#111827";
    for (const [tx, ty] of [[-14, -12], [8, -12], [-14, 8], [8, 8]]) ctx.fillRect(tx, ty, 8, 4);
    ctx.fillStyle = "#e11d48";
    ctx.beginPath(); ctx.roundRect(-17, -9, 34, 18, 6); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.roundRect(13, -7, 5, 14, 2); ctx.fill();
    ctx.restore();
    if (ready(bruno)) ctx.drawImage(bruno, car.x - 18, car.y - 26, 36, 36);

    // The arrow to the target, around the car, when the target is off screen or far.
    if (target && state === "drive") {
      const ang = Math.atan2(target.y - car.y, target.x - car.x);
      const d = Math.hypot(target.x - car.x, target.y - car.y);
      if (d > 90) {
        ctx.save();
        ctx.translate(car.x + Math.cos(ang) * 44, car.y + Math.sin(ang) * 44);
        ctx.rotate(ang);
        ctx.fillStyle = "#facc15";
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  return { load, start };
}
