// Hamstis Nussnacht: the page. Start card, the run loop (fixed 60 Hz simulation, rendered with
// interpolation), HUD, level-up choice, pause, end card. The simulation (sim.js) knows nothing
// of the DOM; this file turns its events into sparks, sounds and cards.
//
// All UI strings live in TXT below, one object, so the release tier can move them to i18n keys
// (nn.*) in one go.
import { createSim, DT, EV } from "./sim.js";
import { createRenderer } from "./render.js";
import { createInput } from "./input.js";
import { upgradeById, upgradeText } from "./upgrades.js";
import { newSeed } from "../artikelSprint/rng.js";
import { reducedMotion } from "../spieleEinstellungen.js";

export const TXT = {
  arts: ["el", "la", "los", "las"],
  levelWords: "{n} words",
  go: "Let’s go",
  levelUp: "Level {n}!",
  levelUpSub: "Pick one (1, 2 or 3).",
  upLv: "Level {n}",
  upNew: "New",
  pause: "Pause",
  resume: "Continue",
  restart: "Restart",
  quit: "Quit",
  overTitle: "Caught!",
  wonTitle: "You made it! The night is over.",
  survived: "Survived",
  defeated: "Words defeated",
  bestStreak: "Best streak",
  accuracy: "Right article",
  again: "Another night",
  back: "Change level",
  skillReady: "Whirl ready! (Space bar)",
  skillReadyTouch: "Whirl ready!",
  skillTitle: "Cheek whirl: clears everything around Hamsti (recharges in 30 s)",
  bossCame: "Boss: {art} {w}?",
  split: "{art} {first} | {rest}",
  pop: "Pop",
  timeTitle: "Time",
  killsTitle: "Words defeated",
  levelTitle: "Level",
  fps: "{fps} fps · {cre} words · {shots} shots",
};
const fmt = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const store = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
};

export function mountNussnacht(root, data) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const stress = params.get("stress") === "1";

  const ui = {
    stage: $("[data-stage]"),
    canvas: $("[data-canvas]"),
    hud: $("[data-hud]"),
    time: $("[data-time]"),
    lv: $("[data-lv]"),
    xp: $("[data-xp]"),
    kills: $("[data-kills]"),
    skill: $("[data-skill]"),
    skillFill: $("[data-skill-fill]"),
    pauseBtn: $("[data-pause]"),
    touch: $("[data-touch]"),
    arts: $$("[data-art]"),
    stick: $("[data-stick]"),
    knob: $("[data-knob]"),
    start: $("[data-start]"),
    play: $("[data-play]"),
    levels: $$("[data-level]"),
    up: $("[data-up]"),
    upTitle: $("[data-up-title]"),
    upList: $("[data-up-list]"),
    pauseCard: $("[data-pause-card]"),
    pauseGo: $("[data-pause-go]"),
    pauseRestart: $("[data-pause-restart]"),
    pauseQuit: $("[data-pause-quit]"),
    end: $("[data-end]"),
    endTitle: $("[data-end-title]"),
    result: $("[data-result]"),
    again: $("[data-again]"),
    back: $("[data-back]"),
    toast: $("[data-toast]"),
    fps: $("[data-fps]"),
  };

  const settings = { level: store("nussnacht.level") || "A1" };
  if (!["A1", "A2", "B1"].includes(settings.level)) settings.level = "A1";
  function syncLevels() {
    for (const b of ui.levels) b.setAttribute("aria-pressed", String(b.dataset.level === settings.level));
  }
  for (const b of ui.levels) b.addEventListener("click", () => { settings.level = b.dataset.level; store("nussnacht.level", settings.level); syncLevels(); });
  syncLevels();

  const renderer = createRenderer(ui.canvas, { reduced: reducedMotion });
  const input = createInput({
    stage: ui.stage,
    stick: ui.stick,
    knob: ui.knob,
    artButtons: ui.arts,
    skillButton: ui.skill,
    onPause: () => (phase === "play" ? pause() : phase === "pause" ? resume() : null),
    onArt: (a) => syncArt(a),
    choosing: () => phase === "choice",
    artCount: () => (S?.up.plural > 0 ? 4 : 2),
  });
  // los and las appear with the Plural popper: A1 and A2 never need them, and two buttons that
  // can only miss would just be in the way.
  function syncPluralButtons() {
    const on = S?.up.plural > 0;
    ui.arts.forEach((b, i) => { if (i > 1) b.hidden = !on; });
  }
  function syncArt(a) {
    ui.arts.forEach((b, i) => b.setAttribute("aria-pressed", String(i === a)));
    ui.stage.dataset.curArt = TXT.arts[a];
  }
  syncArt(0);

  let sim = null;
  let S = null;
  let phase = "start";
  let raf = 0;
  let last = 0;
  let acc = 0;
  let rec = [];
  let seed = 0;

  function setPhase(p) {
    phase = p;
    root.dataset.phase = p;
    ui.start.hidden = p !== "start";
    ui.up.hidden = p !== "choice";
    ui.pauseCard.hidden = p !== "pause";
    ui.end.hidden = p !== "end";
    ui.hud.hidden = p === "start";
    ui.touch.hidden = !(p === "play" || p === "choice" || p === "pause");
  }

  function poolFor(level) {
    const order = ["A1", "A2", "B1"];
    const i = order.indexOf(level);
    return {
      words: data.words[level] ?? [],
      low: i > 0 ? data.words[order[i - 1]] ?? [] : [],
      bosse: data.bosse[level] ?? [],
    };
  }

  function start(opts = {}) {
    seed = opts.seed ?? newSeed();
    const { words, low, bosse } = poolFor(settings.level);
    sim = createSim({ seed, words, low, bosse, level: settings.level, stress });
    S = sim.S;
    rec = [];
    input.reset();
    syncArt(0);
    syncPluralButtons();
    renderer.resize();
    setPhase("play");
    ui.stage.scrollIntoView({ block: "nearest", behavior: "auto" });
    acc = 0;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    fpsReset();
  }

  // ---- the loop ----------------------------------------------------------------------------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    if (phase === "play") {
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 5) {
        const inp = input.sample();
        rec.push(inp);
        sim.step(inp);
        handleEvents();
        acc -= DT;
        n++;
        if (S.state !== "play") break;
      }
      if (n === 5) acc = 0;
      if (S.state === "choice" && phase === "play") openChoice();
      else if (S.state === "over" || S.state === "won") return end();
    } else if (phase === "choice") {
      const inp = input.sample();
      if (inp.pick >= 0) choose(inp.pick, inp);
    }
    renderer.draw(S, phase === "play" ? acc / DT : 1, phase === "play" ? dt : 0);
    hud();
    fpsTick(now);
  }

  function handleEvents() {
    const cols = renderer.colours();
    for (let i = 0; i < S.evN; i++) {
      const e = S.ev[i];
      switch (e.type) {
        case EV.HIT_OK:
          renderer.sparks(e.x, e.y, cols[e.a].light, 5);
          break;
        case EV.HIT_WRONG:
          renderer.sparks(e.x, e.y, "#ffffff", 3);
          renderer.ring(e.x, e.y, cols[e.b].light, 30, 0.35);
          break;
        case EV.KILL:
          renderer.sparks(e.x, e.y, cols[e.a].light, 9);
          renderer.popup(e.x, e.y - 8, TXT.pop, "#fff", 0.6);
          break;
        case EV.HURT:
          renderer.shake(0.6);
          break;
        case EV.HEAL:
          renderer.popup(e.x, e.y - 50, `+${e.a}`, "#4ade80", 0.9);
          break;
        case EV.BOSS: {
          const b = S.bosse[e.a];
          toast(fmt(TXT.bossCame, { art: "___", w: b.w }));
          break;
        }
        case EV.BOSS_DOWN: {
          const b = S.bosse[e.a];
          renderer.ring(e.x, e.y, "#f2a900", 90, 0.8);
          toast(`<b>${TXT.arts[b.g]} ${b.w}</b> – ${b.regel}`, 5000);
          break;
        }
        case EV.SKILL:
          renderer.ring(e.x, e.y, "#ffe08a", e.a, 0.6);
          renderer.shake(0.8);
          break;
        case EV.BURST:
          renderer.ring(e.x, e.y, cols[2].light, e.a, 0.45);
          break;
        case EV.SPLIT: {
          const w = S.words[e.a];
          // a compound cracks at its seam: the verb and the noun it is made of
          if (w?.h) renderer.popup(e.x, e.y - 30, fmt(TXT.split, { art: TXT.arts[w.g], first: w.w.slice(0, w.h), rest: w.w.slice(w.h) }), "#fff", 1.6);
          break;
        }
        default:
      }
    }
  }

  let toastT = 0;
  function toast(html, ms = 2600) {
    ui.toast.innerHTML = html;
    ui.toast.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { ui.toast.hidden = true; }, ms);
  }

  // ---- HUD (DOM, updated only when a value changes) -------------------------------------------
  const shown = {};
  function set(key, el, val, prop = "textContent") {
    if (shown[key] === val) return;
    shown[key] = val;
    if (prop === "width") el.style.width = val;
    else el[prop] = val;
  }
  function hud() {
    if (!S) return;
    set("time", ui.time, mmss(S.t));
    set("lv", ui.lv, String(S.plv));
    set("xp", ui.xp, `${Math.round((S.xp / S.need) * 100)}%`, "width");
    set("kills", ui.kills, String(S.kills));
    const f = S.skill / sim.T.SKILL_CHARGE;
    set("skill", ui.skillFill, `${Math.round(f * 100)}%`, "width");
    const ready = f >= 1;
    if (shown.skillReady !== ready) {
      shown.skillReady = ready;
      ui.skill.classList.toggle("is-ready", ready);
    }
  }

  // ---- level-up --------------------------------------------------------------------------------
  function openChoice() {
    setPhase("choice");
    ui.upTitle.textContent = fmt(TXT.levelUp, { n: S.plv });
    ui.upList.innerHTML = "";
    S.offers.forEach((id, k) => {
      const u = upgradeById(id);
      const lv = S.up[id] ?? 0;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nn-up-btn";
      b.innerHTML = `<span class="nn-up-key">${k + 1}</span><span class="nn-up-icon" aria-hidden="true">${u.icon}</span>`
        + `<span class="nn-up-body"><b>${u.name}</b> <small>${id === "snack" ? "" : lv ? fmt(TXT.upLv, { n: lv + 1 }) : TXT.upNew}</small>`
        + `<span class="nn-up-text">${upgradeText(u, lv)}</span></span>`;
      b.addEventListener("click", () => input.pick(k));
      ui.upList.append(b);
    });
    input.release();
    ui.upList.querySelector("button")?.focus({ preventScroll: true });
  }
  function choose(k, inp) {
    // the pick is a tick of its own in the record, so a replay chooses the same card
    rec.push(inp);
    sim.step(inp);
    handleEvents();
    syncPluralButtons();
    if (S.state === "choice") openChoice();
    else {
      setPhase("play");
      last = performance.now();
      acc = 0;
    }
  }

  // ---- pause -----------------------------------------------------------------------------------
  function pause() {
    if (phase !== "play") return;
    setPhase("pause");
    input.release();
    ui.pauseGo.focus({ preventScroll: true });
  }
  function resume() {
    if (phase !== "pause") return;
    setPhase(S.state === "choice" ? "choice" : "play");
    last = performance.now();
    acc = 0;
  }
  ui.pauseBtn.addEventListener("click", () => (phase === "pause" ? resume() : pause()));
  ui.pauseGo.addEventListener("click", resume);
  ui.pauseRestart.addEventListener("click", () => start());
  ui.pauseQuit.addEventListener("click", () => { cancelAnimationFrame(raf); setPhase("start"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // ---- end ---------------------------------------------------------------------------------------
  function end() {
    cancelAnimationFrame(raf);
    renderer.draw(S, 1, 0);
    const won = S.state === "won";
    setPhase("end");
    ui.endTitle.textContent = won ? TXT.wonTitle : TXT.overTitle;
    const acc = S.right + S.wrong ? Math.round((S.right / (S.right + S.wrong)) * 100) : 100;
    ui.result.innerHTML = `<dl class="nn-stats">
      <div><dt>${TXT.survived}</dt><dd>${mmss(S.t)}</dd></div>
      <div><dt>${TXT.defeated}</dt><dd>${S.kills}</dd></div>
      <div><dt>${TXT.bestStreak}</dt><dd>${S.bestStreak}</dd></div>
      <div><dt>${TXT.accuracy}</dt><dd>${acc} %</dd></div>
    </dl>`;
    ui.again.focus({ preventScroll: true });
  }
  ui.again.addEventListener("click", () => start());
  ui.back.addEventListener("click", () => setPhase("start"));
  ui.play.addEventListener("click", () => start());

  // ---- fps (stress mode shows it; the test reads window.__nussnacht.fps) ----------------------
  let fpsFrames = 0, fpsT0 = 0;
  const fpsLog = [];
  function fpsReset() { fpsFrames = 0; fpsT0 = performance.now(); fpsLog.length = 0; }
  function fpsTick(now) {
    fpsFrames++;
    if (now - fpsT0 >= 1000) {
      const fps = (fpsFrames * 1000) / (now - fpsT0);
      fpsLog.push(fps);
      fpsFrames = 0;
      fpsT0 = now;
      if (stress && ui.fps) {
        ui.fps.hidden = false;
        ui.fps.textContent = fmt(TXT.fps, { fps: fps.toFixed(0), cre: S?.creN ?? 0, shots: S?.shotN ?? 0 });
      }
    }
  }

  // fonts: labels are drawn once, so draw them again when the game font has arrived
  document.fonts?.ready?.then(() => renderer.clearLabels?.());
  addEventListener("resize", () => { if (phase !== "start") renderer.resize(); });

  setPhase("start");
  if (stress) start();

  // For the browser tests (scripts/nussnacht-browser-test.mjs) and for debugging.
  window.__nussnacht = {
    get S() { return S; },
    get phase() { return phase; },
    get rec() { return rec; },
    get seed() { return seed; },
    fps: fpsLog,
    start,
    input,
  };
}
