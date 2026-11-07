// Quaki springt: wires the page (/games/quaki-jumps) to the run. Screens, HUD, the question
// bar, the controls (hold to charge, aim left/up/right, release to jump), the fixed 120 Hz
// loop and the sounds. All UI strings are in TXT so the release tier can move them to i18n.

import turm from "../../data/quakiSpringt/turm.json";
import fragen from "../../data/quakiSpringt/fragen.json";
import { P, buildWorld } from "./physics.js";
import { createRun, fmtTime, LEVEL_IDS } from "./game.js";
import { createRenderer } from "./renderer.js";
import { qsfx } from "./sound.js";
import { unlock, setMuted, isMuted } from "../artikelSprint/sound.js";
import { newSeed } from "../artikelSprint/rng.js";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";
import { spielMelden } from "../spielMelden.js";

export const TXT = {
  title: "Quaki Jumps",
  lead: "Hold, aim, let go: Quaki jumps up the language tower, from A1 to C1. The lily pads carry answers – the wrong one sinks.",
  sanft: "Gentle mode",
  sanftHint: "A flag on each level catches you.",
  wut: "Rage mode",
  wutHint: "No flags. One fall can take you right back to the bottom.",
  how: "How to play",
  how1: "<b>Hold</b> to charge the jump (space bar, mouse or finger). The longer you hold, the higher you go – after 0.9 s Quaki jumps by himself.",
  how2: "<b>Aim:</b> hold ← / →. On a phone: tap and hold on the left, middle or right of the screen.",
  how3: "<b>Let go</b> = jump. You can't steer in the air. Walls bounce you back, slopes make you slide.",
  how4: "Before each gap there is a <b>sign</b> with a question. Jump onto the lily pad with the right answer.",
  level: "Level",
  height: "Height",
  falls: "Falls",
  record: "Longest fall",
  time: "Time",
  pause: "Pause",
  resume: "Continue",
  quit: "Give up",
  restart: "Start again",
  sound: "Sound",
  soundOff: "Sound off",
  pauseBtn: "Pause (P)",
  quaak: "QUAAACK!",
  right: "Right!",
  wrongSanft: "Sorry, that's wrong. The answer is: {a}",
  wrongWut: "Splash!",
  caught: "The flag catches you.",
  flag: "Flag {lv} – from now on you land here.",
  levelUp: "Level {lv}: {ort}",
  winTitle: "You made it!",
  overTitle: "Run over",
  overStats: { time: "Time", falls: "Falls", longest: "Longest fall", answers: "Questions right", height: "Highest point" },
  missed: "Look again",
  again: "Play again",
  toStart: "Back to start",
  touchL: "left",
  touchU: "up",
  touchR: "right",
  canvas: "Game area: the language tower, Quaki jumps from platform to platform",
  questionFor: "Question",
  ruleLabel: "Rule",
};

const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

export function mountQuakiSpringt(root) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const stage = $("[data-stage]");
  const canvas = $("[data-canvas]");
  const world = buildWorld(turm);
  const renderer = createRenderer(canvas, { reduced: reducedMotion });
  const params = new URLSearchParams(location.search);
  const showGrid = import.meta.env.DEV && params.has("raster");

  let phase = "start";
  let run = null;
  let mode = "sanft";
  let acc = 0;
  let last = performance.now();
  let toastTimer = 0;
  let fallBanner = null; // { from } while a long fall is shown
  const keys = { space: false, left: false, right: false };
  let pointer = null; // { id, dir }

  // Idle run behind the start card.
  run = createRun({ world, fragen, seed: 1, mode: "sanft" });

  spielMelden(root, "quaki-springt", () => {
    const q = run?.question();
    return {
      modus: mode,
      stufe: LEVEL_IDS[run?.level() ?? 0],
      hoehe_m: run ? Math.round(run.height()) : 0,
      frage: q ? { text: q.q.q, antworten: q.slots, richtig: q.q.a[0], id: q.q.id } : null,
      verpasst: run?.missed.slice(0, 10) ?? null,
    };
  });

  function setPhase(p) {
    phase = p;
    root.dataset.phase = p;
    for (const el of $$("[data-screen]")) el.hidden = el.dataset.screen !== p;
    $("[data-hud]").hidden = p === "start";
    $("[data-touch]").hidden = p !== "play";
    if (p !== "play") qsfx.chargeStop();
  }

  function start(m) {
    unlock();
    mode = m;
    run = createRun({ world, fragen, seed: newSeed(), mode });
    renderer.reset();
    acc = 0;
    last = performance.now();
    fallBanner = null;
    $("[data-fall]").hidden = true;
    paintHud(true);
    setPhase("play");
    stage.scrollIntoView?.({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    stage.focus({ preventScroll: true });
  }

  function pause() {
    if (phase === "play") setPhase("pause");
  }
  function resume() {
    if (phase !== "pause") return;
    last = performance.now();
    acc = 0;
    setPhase("play");
    stage.focus({ preventScroll: true });
  }

  // ---- input -----------------------------------------------------------------------
  function bits() {
    const held = keys.space || !!pointer;
    const dir = pointer ? pointer.dir : keys.left && !keys.right ? -1 : keys.right && !keys.left ? 1 : 0;
    return (held ? 1 : 0) | (dir < 0 ? 2 : dir > 0 ? 4 : 0);
  }
  const syncInput = () => { if (phase === "play") run.input(bits()); };

  window.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (phase !== "play" && phase !== "pause") return;
    if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
      e.preventDefault();
      return phase === "play" ? pause() : resume();
    }
    if (phase !== "play") return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a, input, textarea, select") && e.code === "Space") return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keys.space = true;
    else if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    else return;
    e.preventDefault();
    syncInput();
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keys.space = false;
    else if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
    else if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    else return;
    syncInput();
  });
  // Pointer (mouse and touch): the stage in thirds – left, up, right. Held = charging.
  const thirdOf = (clientX) => {
    const r = stage.getBoundingClientRect();
    const f = (clientX - r.left) / r.width;
    return f < 1 / 3 ? -1 : f > 2 / 3 ? 1 : 0;
  };
  stage.addEventListener("pointerdown", (e) => {
    if (phase !== "play" || pointer) return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a")) return;
    unlock();
    pointer = { id: e.pointerId, dir: thirdOf(e.clientX) };
    try { stage.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
    syncInput();
    paintTouch();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const d = thirdOf(e.clientX);
    if (d !== pointer.dir) { pointer.dir = d; syncInput(); paintTouch(); }
  });
  const up = (e) => {
    if (!pointer || e.pointerId !== pointer.id) return;
    pointer = null;
    syncInput();
    paintTouch();
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", () => { keys.space = keys.left = keys.right = false; pointer = null; syncInput(); });

  function paintTouch() {
    for (const z of $$("[data-zone]")) z.classList.toggle("is-on", !!pointer && Number(z.dataset.zone) === pointer.dir);
  }

  // ---- HUD, question bar, toasts -------------------------------------------------
  let hudAt = 0;
  let lastQ = null;
  function paintHud(force = false) {
    const now = performance.now();
    if (!force && now - hudAt < 90) return;
    hudAt = now;
    const s = run.s;
    $("[data-lv]").textContent = LEVEL_IDS[run.level()];
    $("[data-h]").textContent = `${Math.max(0, run.height()).toFixed(0)} m`;
    $("[data-falls]").textContent = s.sturze;
    $("[data-rec]").textContent = `${Math.round(s.rekord / P.METER)} m`;
    $("[data-time]").textContent = fmtTime(run.seconds());
    $("[data-time-wrap]").hidden = mode === "sanft";
  }

  function paintQuestion() {
    const q = run.question();
    const key = q ? `${q.room}:${q.state?.revealed ? 1 : 0}` : "";
    if (key === lastQ) return;
    lastQ = key;
    const bar = $("[data-q]");
    if (!q || phase === "start") { bar.hidden = true; return; }
    bar.hidden = false;
    const reveal = q.state?.revealed;
    $("[data-q-text]").innerHTML = esc(q.q.q).replace("___", reveal ? `<b class="qs-fill">${esc(q.q.a[0])}</b>` : '<span class="qs-gap">___</span>');
    const rule = $("[data-q-rule]");
    rule.hidden = !reveal;
    rule.textContent = reveal ? q.q.r : "";
  }

  function toast(text, kind = "info", ms = 1800) {
    const el = $("[data-toast]");
    el.textContent = text;
    el.className = `qs-toast is-${kind}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), ms);
  }

  // ---- events from the run ------------------------------------------------------------
  function onEvents(evs) {
    for (const e of evs) {
      switch (e.type) {
        case "charge": qsfx.chargeStart(); break;
        case "jump": qsfx.chargeStop(); qsfx.jump(e.c); break;
        case "bonk": qsfx.bonk(); break;
        case "land":
          qsfx.land(e.drop);
          if (fallBanner) endFall(e.drop);
          break;
        case "sturz":
          if (e.drop >= P.QUAAK_AT) run.splatUntil = run.s.tick + 50;
          break;
        case "quaak":
          qsfx.quaak();
          fallBanner = { from: run.s.apexY };
          $("[data-fall]").hidden = false;
          $("[data-fall]").classList.remove("is-done");
          break;
        case "pad":
          if (!e.answer) break;
          if (e.ok && run.answers.get(e.room)?.first && run.answers.get(e.room).wrong === 0 && !run.answers.get(e.room).cheered) {
            run.answers.get(e.room).cheered = true;
            qsfx.right();
            toast(TXT.right, "ok");
          } else if (!e.ok) {
            qsfx.wrong();
            toast(mode === "sanft" ? fill(TXT.wrongSanft, { a: e.answer.right }) : TXT.wrongWut, "bad", 2600);
          }
          break;
        case "sink": qsfx.blubb(); break;
        case "flag":
          if (mode === "sanft" && e.level > 0) { qsfx.flag(); toast(fill(TXT.flag, { lv: LEVEL_IDS[e.level] }), "ok"); }
          break;
        case "catch": toast(TXT.caught, "info"); break;
        case "win": finish(true); break;
      }
    }
  }

  function endFall(drop) {
    const el = $("[data-fall]");
    $("[data-fall-m]").textContent = `${Math.round(drop / P.METER)} m`;
    el.classList.add("is-done");
    fallBanner = null;
    setTimeout(() => { if (!fallBanner) el.hidden = true; }, 1400);
  }

  function finish(won) {
    qsfx.chargeStop();
    if (won) qsfx.win();
    const s = run.s;
    $("[data-o-title]").textContent = won ? TXT.winTitle : TXT.overTitle;
    $("[data-o-time]").textContent = fmtTime(run.seconds());
    $("[data-o-falls]").textContent = s.sturze;
    $("[data-o-longest]").textContent = `${Math.round(s.rekord / P.METER)} m`;
    $("[data-o-answers]").textContent = `${run.richtig} / ${run.richtig + run.falsch}`;
    $("[data-o-height]").textContent = `${Math.round(s.maxHeight / P.METER)} m · ${LEVEL_IDS[run.levelReached]}`;
    const list = $("[data-o-missed]");
    list.innerHTML = run.missed.map((m) => `<li><span lang="en">${esc(m.q).replace("___", `<b>${esc(m.right)}</b>`)}</span><br><small>${esc(TXT.ruleLabel)}: ${esc(m.rule)} · <s>${esc(m.picked)}</s></small></li>`).join("");
    $("[data-o-missed-wrap]").hidden = !run.missed.length;
    setTimeout(() => setPhase("over"), won ? 900 : 0);
  }

  // ---- buttons --------------------------------------------------------------------
  $("[data-start-sanft]").addEventListener("click", () => start("sanft"));
  $("[data-start-wut]").addEventListener("click", () => start("wut"));
  $("[data-pause]").addEventListener("click", pause);
  $("[data-resume]").addEventListener("click", resume);
  $("[data-restart]").addEventListener("click", () => start(mode));
  $("[data-quit]").addEventListener("click", () => finish(false));
  $("[data-again]").addEventListener("click", () => start(mode));
  $("[data-tostart]").addEventListener("click", () => setPhase("start"));

  const syncMute = () => {
    for (const b of $$("[data-mute]")) {
      b.setAttribute("aria-pressed", String(isMuted()));
      b.classList.toggle("is-muted", isMuted());
    }
  };
  setMuted(gameMuted(false));
  syncMute();
  for (const b of $$("[data-mute]")) b.addEventListener("click", () => { setGameMuted(!isMuted()); unlock(); });
  addEventListener(GAME_MUTE_EVENT, (e) => { setMuted(e.detail.muted); syncMute(); if (e.detail.muted) qsfx.chargeStop(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // Checks in dev (tests/quaki-springt/browser.mjs): window.__qs.
  if (import.meta.env.DEV) window.__qs = { get run() { return run; }, world, P, fragen, createRun, start, get phase() { return phase; } };

  // ---- loop -------------------------------------------------------------------------
  const ro = new ResizeObserver(() => renderer.resize());
  ro.observe(canvas);
  renderer.resize();

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (phase === "play") {
      acc += dt;
      let n = 0;
      while (acc >= P.DT && n < 40) {
        onEvents(run.step());
        acc -= P.DT;
        n++;
        if (phase !== "play") break;
      }
      if (fallBanner) $("[data-fall-m]").textContent = `${Math.round((run.s.y - fallBanner.from) / P.METER)} m`;
      paintHud();
      paintQuestion();
    }
    renderer.render(world, run, { time: now / 1000, dt, grid: showGrid });
    requestAnimationFrame(frame);
  }
  setPhase("start");
  requestAnimationFrame(frame);
}
