// Vorfahrt-Flitzer: wires the page (/games/vorfahrt) to the game. Screens, HUD, the two
// driving buttons, keys and swipes, the „Warum?“ card (German explanation, the learner's UI
// language underneath), the result with the list of misses, the Tagesfahrt and the progress
// hooks (recordAttempt per decision, the mascots on a new best). Sounds come from Artikel-
// Flitzer's beeps (no files); the horn is made here, the music in music.js.

import { createGame, SPEED_START, SPEED_MAX, LIVES, HEART_EVERY, DAILY_LENGTH } from "./game.js";
import { createRenderer } from "./renderer.js";
import { CONTROLS, TURNS, lessonOf, blinkFor } from "./rules.js";
import { sfx, unlock, audio, setMuted, isMuted } from "../artikelSprint/sound.js";
import { music } from "./music.js";
import { t, onUiText } from "../uiText.js";
import { getLang } from "../i18n.js";
import { isRtl } from "../languages.js";
import { recordAttempt } from "../progress.js";
import { celebrate } from "../mascotCelebrate.js";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";
import { spielMelden } from "../spielMelden.js";

const BEST_KEY = "da:vorfahrt:best";
const DAILY_KEY = "da:vorfahrt:daily";
/** What the sound switch said before all games shared one (spieleEinstellungen.js). */
const LEGACY_MUTE_KEY = "da:sprint:muted";
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

function horn() {
  const c = audio();
  if (!c || isMuted()) return;
  for (const [f, start] of [[392, 0], [392, 0.22]]) {
    const o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + start;
    o.type = "square";
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.2);
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const ARROW = { straight: "⬆", left: "⬅", right: "➡", kreisel: "⟲" };
const today = () => new Date().toLocaleDateString("sv");

/** Today's best on the Tagesfahrt: stored with its day, so tomorrow starts at 0. */
function dailyBest() {
  try {
    const d = JSON.parse(store.get(DAILY_KEY) || "null");
    return d && d.day === today() ? Number(d.best) || 0 : 0;
  } catch { return 0; }
}

/** The explanation in the learner's UI language ("" for German or while it is missing). */
const trText = (key) => (getLang() === "de" ? "" : t(key, ""));
const trAttrs = () => `lang="${getLang()}" dir="${isRtl(getLang()) ? "rtl" : "ltr"}"`;

export function mountVorfahrt(root) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const stage = $("[data-stage]");
  const canvas = $("[data-canvas]");
  const renderer = createRenderer(canvas);
  let phase = "start";
  let toastTimer = 0;
  let card = null; // the wrong crossing the card is about: { x, back }
  let overCtx = null; // what the result screen shows
  let mode = "free"; // "free" or "daily"
  let heartsSeen = 0; // s.heartBack already cheered
  /** What the navi shows: the turn, or the Kreisverkehr. */
  const navTurn = (x) => (x?.c.control === "kreisel" ? "kreisel" : x?.c.turn ?? "straight");
  const turnText = (turn) => (turn === "kreisel" ? t("vf.turn.kreisel", "Kreisverkehr") : t(`vf.turn.${turn}`, TURNS[turn]));
  // On the pause, "why" and result screens. The crossing the card explains, if one is up:
  // a wrong rule there is the report that matters most.
  const crossing = (x) => x && { schild: CONTROLS[x.c.control]?.name, richtung: x.c.turn, gewaehlt: x.choice, richtig: x.verdict?.go ? "go" : "wait", regel: x.verdict?.why };
  spielMelden(root, "vorfahrt", () => ({
    modus: mode,
    kreuzung: phase === "card" ? crossing(card?.x) : null,
    verpasst: phase === "over" ? overCtx?.sum.missed.slice(0, 10).map((m) => ({ schild: CONTROLS[m.c.control]?.name, richtung: m.c.turn, regel: m.why })) : null,
  }));

  const setPhase = (p) => {
    // Music while driving only; back from a pause or the card it carries on, a new run
    // starts it over.
    if (p === "play" && phase !== "play") music.play({ restart: phase === "start" || phase === "over" });
    else if (p !== "play" && phase === "play") music.stop();
    phase = p;
    root.dataset.phase = p;
    for (const el of $$("[data-screen]")) el.hidden = el.dataset.screen !== p;
    $("[data-hud]").hidden = p === "start";
    if (p === "start") paintStart();
  };

  const game = createGame({
    events: {
      hud(s) {
        // Hearts: full ones left, the lost ones grey; the last one pulses.
        const left = Math.max(0, s.lives);
        const box = $("[data-hearts]");
        box.innerHTML = Array.from({ length: LIVES }, (_, i) => `<i class="${i < left ? "is-on" : ""}${i === left - 1 && left === 1 ? " is-last" : ""}">♥</i>`).join("");
        box.setAttribute("aria-label", t("vf.heartsAria", "{n} von {m} Herzen", { n: left, m: LIVES }));
        $("[data-score]").textContent = s.score;
        $("[data-streak]").textContent = s.streak;
        $("[data-n]").textContent = s.n;
        $("[data-n-of]").textContent = s.limit ? `/${s.limit}` : "";
      },
      choice(s) {
        const x = game.cur();
        const turn = navTurn(x);
        $("[data-arrow]").textContent = ARROW[turn];
        $("[data-turn]").textContent = turnText(turn);
        for (const b of $$("[data-blink]")) b.setAttribute("aria-pressed", String(s.blink === b.dataset.blink));
        $("[data-retry]").hidden = !x?.retryOf;
        for (const b of $$("[data-act]")) b.setAttribute("aria-pressed", String(x?.choice === b.dataset.act));
        $("[data-ask]").classList.toggle("is-set", !!x?.choice);
      },
      result({ x, correct, back }) {
        // Every decision counts as an answer in the Führerschein practice.
        try { recordAttempt({ skill: "fuehrerschein", correct, topic: `fuehrerschein-${lessonOf(x.c)}`, item: `vorfahrt-${x.verdict.key}` }); } catch {}
        if (correct) {
          sfx.correct();
          const s = game.s;
          const head = x.retryOf ? t("vf.fixed", "Diesmal richtig – das sitzt!") : t("vf.right", "Richtig!");
          // A heart back (every HEART_EVERY in a row) outranks the streak line.
          const extra = s.heartBack > heartsSeen
            ? `<span class="vf-toast-extra is-heart">${esc(t("vf.heartBack", "+1 ♥ – {n} richtig in Folge!", { n: s.streak }))}</span>`
            : s.streak >= 3 ? `<span class="vf-toast-extra">🔥 ${esc(t("vf.streakLine", "{n} richtig in Folge", { n: s.streak }))}</span>` : "";
          heartsSeen = s.heartBack;
          toast(`<b>${esc(head)}</b>${extra} <span class="vf-toast-why" lang="de">${esc(x.verdict.why)}</span>`, "ok");
          return;
        }
        if (x.choice === "go") sfx.hit(); else horn();
        sfx.wrong();
        card = { x, back };
        // A beat to see the near miss, then the card.
        setTimeout(showCard, reducedMotion() ? 250 : 650);
      },
      over(sum) {
        sfx.over();
        const daily = !!sum.daily;
        const prev = daily ? dailyBest() : Number(store.get(BEST_KEY)) || 0;
        const best = Math.max(prev, sum.score);
        const record = sum.score > 0 && sum.score > prev;
        if (daily) store.set(DAILY_KEY, JSON.stringify({ day: today(), best }));
        else store.set(BEST_KEY, String(best));
        overCtx = { sum, best, record, daily };
        card = null;
        paintOver();
        setTimeout(() => setPhase("over"), 500);
        // The very first score is not much of a record: cheer a new best only when there was
        // something to beat or the drive was a decent one; a finished Tagesfahrt always.
        if ((record && (prev > 0 || sum.right >= 5)) || sum.done) {
          const title = record
            ? (daily ? t("vf.over.dayRecord", "Neuer Bestwert heute!") : t("vf.over.record", "Neuer Rekord!"))
            : t("vf.over.titleDone", "Tagesfahrt geschafft!");
          setTimeout(() => celebrate({ title, body: `${sum.score} ${t("vf.over.points", "Punkte")}`, lead: "quaki", crew: ["bruno", "regi", "hamsti"] }), 700);
        }
      },
    },
  });

  /** The start screen's record lines. */
  function paintStart() {
    const best = Number(store.get(BEST_KEY)) || 0;
    $("[data-best]").textContent = best ? t("vf.best", "Dein Rekord: {n} Punkte", { n: best }) : "";
    const d = dailyBest();
    $("[data-daily-info]").textContent = d
      ? t("vf.dailyBest", "Heute bisher: {n} Punkte", { n: d })
      : t("vf.dailyHint", "Heute für alle gleich: {n} Kreuzungen. Dein bester Wert von heute wird gemerkt.", { n: DAILY_LENGTH });
  }

  /** The result screen: the score, and every miss with its explanation and what came of it. */
  function paintOver() {
    if (!overCtx) return;
    const { sum, best, record, daily } = overCtx;
    $("[data-o-title]").textContent = sum.done ? t("vf.over.titleDone", "Tagesfahrt geschafft!") : t("vf.over.title", "Fahrt vorbei");
    $("[data-o-score]").textContent = sum.score;
    const rec = $("[data-o-record]");
    rec.hidden = !record;
    rec.textContent = daily ? t("vf.over.dayRecord", "Neuer Bestwert heute!") : t("vf.over.record", "Neuer Rekord!");
    $("[data-o-n]").textContent = sum.n;
    $("[data-o-right]").textContent = sum.right;
    $("[data-o-streak]").textContent = sum.bestStreak;
    $("[data-o-best]").textContent = best;
    $("[data-o-best-k]").textContent = daily ? t("vf.over.dayBest", "Bestwert heute") : t("vf.over.best", "Rekord");
    const other = $("[data-other]");
    other.dataset.other = daily ? "free" : "daily";
    other.textContent = daily ? t("vf.start", "Losfahren") : t("vf.daily", "Tagesfahrt");
    const read = esc(t("vf.over.readRule", "Regel lesen"));
    $("[data-o-missed]").innerHTML = sum.missed.map((m) => {
      const trWhy = trText(`vf.why.${m.key}`);
      const trName = trText(`vf.ctl.${m.c.control}`);
      const status = m.again === "ok" ? `<span class="vf-fixed">✓ ${esc(t("vf.over.fixed", "Beim zweiten Mal richtig"))}</span>`
        : m.again === "no" ? `<span class="vf-notfixed">${esc(t("vf.over.stillWrong", "Wieder falsch – bitte nochmal lesen"))}</span>` : "";
      return `<li><b lang="de" dir="ltr">${esc(CONTROLS[m.c.control].name)}</b>${m.c.turn !== "straight" ? ` · <span lang="de">${esc(TURNS[m.c.turn])}</span>` : ""}${trName ? ` <span class="vf-tr-inline" ${trAttrs()}>(${esc(trName)})</span>` : ""}<br><span lang="de" dir="ltr">${esc(m.why)}</span>${trWhy ? `<span class="vf-tr-line" ${trAttrs()}>${esc(trWhy)}</span>` : ""} <a href="/fuehrerschein/regeln/${lessonOf(m.c)}" target="_blank" rel="noopener">${read}</a>${status ? `<br>${status}` : ""}</li>`;
    }).join("");
    $("[data-o-missed-wrap]").hidden = !sum.missed.length;
  }

  function toast(html, kind) {
    const el = $("[data-toast]");
    el.innerHTML = html;
    el.className = `asp-toast vf-toast is-${kind}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /** The „Warum?“ card: the German explanation, the same in the UI language underneath. */
  function showCard() {
    if (!card) return;
    const { x, back } = card;
    const want = blinkFor(x.c);
    const should = x.blinkMiss
      ? (want === "left" ? t("vf.card.blinkL", "links blinken") : want === "right" ? t("vf.card.blinkR", "rechts blinken") : t("vf.card.blinkNone", "nicht blinken"))
      : x.verdict.go ? t("vf.go", "Fahren") : t("vf.wait", "Warten");
    $("[data-c-title]").textContent = x.blinkMiss ? t("vf.card.blink", "Blinker!")
      : x.choice === "go" ? t("vf.card.close", "Das war knapp!") : t("vf.card.couldGo", "Du hättest fahren dürfen");
    $("[data-c-should]").textContent = t("vf.card.should", "Richtig wäre: {a}", { a: should });
    $("[data-c-why]").textContent = x.verdict.why;
    $("[data-c-sign]").textContent = CONTROLS[x.c.control].name + (x.c.turn !== "straight" ? ` · du willst ${TURNS[x.c.turn]}` : "");
    $("[data-c-sign]").hidden = !!x.blinkMiss && x.c.control !== "kreisel";
    // The learner's language: the rule, then what the sign and the turn are called.
    const tr = $("[data-c-tr]");
    const why = trText(`vf.why.${x.verdict.key}`);
    const trSign = trText(`vf.ctl.${x.c.control}`);
    tr.hidden = !why;
    tr.lang = getLang();
    tr.dir = isRtl(getLang()) ? "rtl" : "ltr";
    const turn = x.c.turn !== "straight" ? t("vf.card.signTurn", "{sign} · du willst {turn}", { sign: trSign, turn: t(`vf.turn.${x.c.turn}`, TURNS[x.c.turn]) }) : trSign;
    tr.innerHTML = `${esc(why)}${trSign ? `<small class="vf-tr-sign">${esc(turn)}</small>` : ""}`;
    $("[data-c-link]").href = `/fuehrerschein/regeln/${lessonOf(x.c)}`;
    const left = game.s.lives;
    const leftEl = $("[data-c-left]");
    leftEl.textContent = left <= 0 ? t("vf.card.heartsOver", "Kein Herz mehr – die Fahrt ist vorbei.")
      : left === 1 ? t("vf.card.heartLast", "Achtung: nur noch ein Herz! {n} richtig in Folge bringen eins zurück.", { n: HEART_EVERY })
      : t("vf.card.hearts", "Noch {n} Herzen. {m} richtig in Folge bringen eins zurück.", { n: left, m: HEART_EVERY });
    leftEl.classList.toggle("is-critical", left <= 1);
    const backEl = $("[data-c-back]");
    backEl.hidden = !(back && left > 0);
    backEl.textContent = t("vf.card.back", "Diese Kreuzung kommt gleich noch einmal.");
    $("[data-c-go]").textContent = left > 0 ? t("vf.resume", "Weiter") : t("vf.card.result", "Zum Ergebnis");
    $("[data-toast]").hidden = true;
    if (phase !== "card") {
      setPhase("card");
      $("[data-c-go]").focus({ preventScroll: true });
    }
  }

  function start(m = "free") {
    unlock();
    card = null;
    heartsSeen = 0;
    mode = m;
    game.start(m === "daily" ? { daily: today() } : {});
    setPhase("play");
    stage.scrollIntoView?.({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    stage.focus({ preventScroll: true });
  }

  function pause() {
    if (phase !== "play") return;
    setPhase("pause");
  }

  function act(a) {
    if (a === "pause") return phase === "play" ? pause() : phase === "pause" ? setPhase("play") : null;
    if (phase !== "play") return;
    unlock();
    game.choose(a);
    sfx.lane();
  }

  // Keys: ↓ / S / Leertaste = warten, ↑ / W = fahren, ← / A und → / D = blinken, P = Pause.
  const KEYS = { ArrowDown: "wait", KeyS: "wait", Space: "wait", ArrowUp: "go", KeyW: "go", ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right", KeyP: "pause", Escape: "pause" };
  window.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const a = KEYS[e.code];
    if (!a || (phase !== "play" && phase !== "pause")) return;
    if (e.code === "Space" && e.target instanceof HTMLElement && e.target.closest("button, a, input")) return;
    e.preventDefault();
    if (!e.repeat) act(a);
  });
  // Swipes on the stage: down = warten, up = fahren, sideways = blinken.
  let sw = null;
  stage.addEventListener("pointerdown", (e) => {
    if (phase === "play" && !(e.target instanceof HTMLElement && e.target.closest("button"))) sw = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dy = e.clientY - sw.y, dx = e.clientX - (sw.x ?? e.clientX);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "wait" : "go");
    sw = null;
  });
  const swEnd = () => (sw = null);
  stage.addEventListener("pointerup", swEnd);
  stage.addEventListener("pointercancel", swEnd);
  for (const b of $$("[data-act], [data-blink]")) {
    const a = b.dataset.act ?? b.dataset.blink;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); act(a); });
    // Keyboard users press Enter on the button.
    b.addEventListener("click", (e) => { if (e.detail === 0) act(a); });
  }

  $("[data-start]").addEventListener("click", () => start("free"));
  $("[data-daily]").addEventListener("click", () => start("daily"));
  $("[data-again]").addEventListener("click", () => start(mode));
  $("[data-other]").addEventListener("click", (e) => start(e.currentTarget.dataset.other || "daily"));
  $("[data-pause]").addEventListener("click", pause);
  $("[data-resume]").addEventListener("click", () => { setPhase("play"); stage.focus({ preventScroll: true }); });
  $("[data-quit]").addEventListener("click", () => { game.end(); });
  $("[data-c-go]").addEventListener("click", () => {
    card = null;
    setPhase("play");
    game.resume();
    stage.focus({ preventScroll: true });
  });
  const syncMute = () => {
    for (const b of $$("[data-mute]")) {
      b.setAttribute("aria-pressed", String(isMuted()));
      b.classList.toggle("is-muted", isMuted());
    }
  };
  // One sound switch for all games (spieleEinstellungen.js); the old key only counts until it exists.
  setMuted(gameMuted(store.get(LEGACY_MUTE_KEY) === "1"));
  syncMute();
  for (const b of $$("[data-mute]")) b.addEventListener("click", () => {
    setGameMuted(!isMuted());
    unlock();
  });
  addEventListener(GAME_MUTE_EVENT, (e) => {
    setMuted(e.detail.muted);
    syncMute();
    music.syncMute();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // Screenshots and checks in dev: window.__vf is the game.
  if (import.meta.env.DEV) window.__vf = game;

  // An idle scene behind the start card: the road with a crossing ahead.
  game.start();
  game.s.lives = LIVES;
  paintStart();
  // The page's language changed (or the texts arrived): repaint what script wrote.
  onUiText(() => {
    paintStart();
    const s = game.s;
    $("[data-turn]").textContent = turnText(navTurn(game.cur()));
    $("[data-hearts]").setAttribute("aria-label", t("vf.heartsAria", "{n} von {m} Herzen", { n: Math.max(0, s.lives), m: LIVES }));
    if (phase === "card") showCard();
    paintOver();
  });
  const ro = new ResizeObserver(() => renderer.resize());
  ro.observe(canvas);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (phase === "play") {
      game.step(dt);
      const s = game.s;
      if (s.over) music.stop();
      else music.drive((s.cruise - SPEED_START) / (SPEED_MAX - SPEED_START), false, s.speed < 1);
    }
    else if (phase === "start") {
      // Roll slowly under the menu and never reach the crossing.
      game.s.dist += 3 * dt;
      game.s.t += dt;
      if (game.s.dist > 40) game.s.dist = 0;
    } else if (phase === "card") {
      game.step(dt); // shake and flash fade out; the world is held
    }
    renderer.render(game.s);
    requestAnimationFrame(frame);
  }
  setPhase("start");
  requestAnimationFrame(frame);
}
