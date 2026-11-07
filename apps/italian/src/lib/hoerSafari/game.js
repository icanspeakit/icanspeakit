// Hör-Safari (/games/listening-safari): a listening game in the spirit of the classic shooting
// galleries. A voice says a noun with el or la ("la cuchara"); birds — our own "Pieper",
// not anybody's chicken — fly over a wide landscape carrying picture or word cards, and the
// player hits the matching one with the Gummi-Blaster, a toy that fires harmless rubber
// pellets. A hit bird goes "Bonk!", sees stars and flies off; nothing falls.
//
// - Pellets fly a ballistic curve: up out of the muzzle, over to the aim point, then a little
//   drop with distance. They are hit-tested where they cross each depth plane (scene.js
//   DEPTHS[].plane), so moving birds need leading and far ones a bit of holdover.
// - Two ways to play: Levels (levels.js — eight steps per board, each with a goal, its own
//   difficulty, a start card and an end card; progress kept on this device) and Highscore
//   (the free 90-second round with the ranking).
// - 3 hearts. Now and then a bird dives at the player (Sturzflieger); hit it before it
//   arrives, or lose a heart.
// - Every hit bird peeps and its word is said, so a wrong hit tells you what you hit; the next
//   word waits until the voice is done.
// - Extras fly by as balloons: +5 s, +1 heart, Streuschuss, Zeitlupe.
// - Reloading is a quiz: a multiple-choice question in the middle, answered by shooting the
//   right bubble.
// - Records on this device (records.js) and a weekly / all-time board (board.js).
//
// Words: nouns from the lexicon with a picture (wort-bilder.json → OpenMoji), passed in by the
// page (woerter.js). The browser's Spanish voice says them (see say()). Plan and decisions:
// HOER-SAFARI-TIERED-PROMPT.md, docs/hoer-safari-tier*-v1.md.

import { makeSfx } from "./sound.js";
import { makeMusic } from "./music.js";
import { mascotImage, ready } from "../mascotImage.js";
import {
  VIEW_H, DEPTHS, DIVE_PLANE, HILLS, hillY, roundRect, pill, cardSize, drawLandscape, drawBird,
  drawGun, drawPellet, drawBalloon, drawHidden, drawSmudge, ITEM_LOOK,
} from "./scene.js";
import { migrate, boardRecords, saveRound } from "./records.js";
import { mountBoard } from "./board.js";
import { LEVELS, levelProgress, saveLevel, starsFor } from "./levels.js";
import { t, onUiText } from "../uiText.js";
import { getLang } from "../i18n.js";
import { isRtl } from "../languages.js";
import { recordAttempt } from "../progress.js";
import { celebrate } from "../mascotCelebrate.js";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";
import { spielMelden } from "../spielMelden.js";
import { withBase } from "../paths.js";

// ---- tuning (docs/hoer-safari-tier4-v1.md has the reasoning) ---------------------------------
export const TUNING = {
  ROUND: 90, // seconds
  MAG: 8, // pellets per magazine
  HEARTS: 3,
  HINT_AFTER: 8, // seconds until the written word shows (half points from then)
  WRONG_PENALTY: 10,
  BALLOON_PENALTY: 30, // the hot-air balloon has people in it: hitting it costs
  BALLOON_BACK: 12, // s until a shot-down balloon floats in again
  PELLET_T: 0.42, // seconds for a pellet to reach the far plane
  ARC_MAX: 90, // how high the pellet's curve rises (logical px)
  DROP: 28, // how far it falls below the aim point at the far plane
  SURVIVE_BONUS: 20, // per heart left when the time runs out …
  BONUS_MIN_HITS: 3, // … after at least this many hits
  FIRST_DIVE: 12, // seconds
  DIVE_GAP: [9, 4], // seconds between dives at the start / the end of the round
  DIVE_TIME: { A1: 2.2, A2: 1.8, B1: 1.5 },
  WARN_T: 0.7,
  FIRST_ITEM: 9,
  ITEM_GAP: [12, 16],
  STREU_S: 8,
  ZEITLUPE_S: 6,
  ZEIT_PLUS: 5,
  HERZ_FULL_PTS: 30,
  GOLDEN_PTS: 50,
};
const T = TUNING;
const HIT_ORDER = ["near", "mid", "far"];
const PLANES = [
  { u: DIVE_PLANE, kind: "dive" },
  { u: DEPTHS.near.plane, kind: "near" },
  { u: DEPTHS.mid.plane, kind: "mid" },
  { u: DEPTHS.far.plane, kind: "far" },
];
const COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const ITEM_KINDS = ["zeit", "herz", "streu", "zeitlupe"];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const label = (w) => `${w.g} ${w.w}`;

// The Tagesrunde: one round a day, the same words and birds for everyone. A small seeded
// generator (mulberry32) drives only what makes the sequence — the word bag and the birds'
// spawns — so the rest (sound pitch, shake, extras) stays random. Other modes use Math.random.
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function storage(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, String(val));
  } catch {
    /* blocked storage: the game runs without it */
  }
  return null;
}

function shuffle(a, r = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function mountHoerSafari(root, allWords) {
  const $ = (s) => root.querySelector(s);
  const canvas = $("[data-canvas]");
  const ctx = canvas.getContext("2d");
  const ui = {
    hud: $("[data-hud]"),
    time: $("[data-time]"),
    score: $("[data-score]"),
    streak: $("[data-streak]"),
    hearts: $("[data-hearts]"),
    ammo: $("[data-ammo]"),
    hint: $("[data-hint]"),
    hintText: $("[data-hint-text]"),
    replay: $("[data-replay]"),
    reload: $("[data-reload]"),
    mute: $("[data-mute]"),
    pause: $("[data-pause]"),
    pauseCard: $("[data-pause-card]"),
    pauseGo: $("[data-pause-go]"),
    pauseRestart: $("[data-pause-restart]"),
    pauseQuit: $("[data-pause-quit]"),
    start: $("[data-start]"),
    end: $("[data-end]"),
    endTitle: $("[data-end-title]"),
    play: $("[data-play]"),
    again: $("[data-again]"),
    back: $("[data-back]"),
    best: $("[data-best]"),
    noVoice: $("[data-novoice]"),
    result: $("[data-result]"),
    album: $("[data-album]"),
    practice: $("[data-practice]"),
    practiceWrap: $("[data-practice-wrap]"),
    lbOver: $("[data-lb-over]"),
    levels: $("[data-levels]"),
    goalWrap: $("[data-goal-wrap]"),
    goal: $("[data-goal]"),
    intro: $("[data-intro]"),
    introNum: $("[data-intro-num]"),
    introName: $("[data-intro-name]"),
    introGoal: $("[data-intro-goal]"),
    introNews: $("[data-intro-news]"),
    introNewsHead: $("[data-intro-news-head]"),
    introStars: $("[data-intro-stars]"),
    introGo: $("[data-intro-go]"),
    introBack: $("[data-intro-back]"),
    next: $("[data-next]"),
  };
  const board = mountBoard(document.querySelector("[data-lb]"));

  migrate();
  const sfx = makeSfx();
  const music = makeMusic();
  // one sound switch for all the games (spieleEinstellungen.js); the old key still counts until then
  let muted = gameMuted(storage("hoerSafari.muted") === "1");
  sfx.setMuted(muted);
  music.setMuted(muted);
  syncMute();
  addEventListener(GAME_MUTE_EVENT, (e) => {
    muted = !!e.detail?.muted;
    sfx.setMuted(muted);
    music.setMuted(muted);
    syncMute();
  });

  // ---- settings on the start screen --------------------------------------------------
  const settings = {
    level: storage("hoerSafari.level") || "A1",
    mode: storage("hoerSafari.mode") || "bild",
    play: storage("hoerSafari.play") || "stufen",
  };
  if (!["A1", "A2", "B1"].includes(settings.level)) settings.level = "A1";
  if (!["bild", "wort"].includes(settings.mode)) settings.mode = "bild";
  // On the pause card and the end screen: the word being hunted and the round's trouble words.
  spielMelden(root, "hoer-safari", () => ({
    niveau: settings.level, modus: settings.mode, ablauf: settings.play,
    wort: S?.target ? label(S.target) : null,
    schwierig: S ? [...S.trouble.values()].slice(0, 20).map(label) : [],
  }));
  if (!["stufen", "frei", "tag"].includes(settings.play)) settings.play = "stufen";
  const boardId = () => `${settings.level}:${settings.mode}`;
  let stage = 1; // the level being played (1-based), in "stufen" mode
  function bindSeg(attr, key) {
    root.querySelectorAll(`[data-${attr}]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset[attr] === settings[key]));
      b.addEventListener("click", () => {
        settings[key] = b.dataset[attr];
        storage(`hoerSafari.${key}`, settings[key]);
        root.querySelectorAll(`[data-${attr}]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        showBest();
      });
    });
  }
  bindSeg("level", "level");
  bindSeg("mode", "mode");
  bindSeg("spielart", "play");
  const cardsName = () => (settings.mode === "bild" ? t("hs.cards.bild", "Bilder") : t("hs.cards.wort", "Wörter"));
  function showBest() {
    ui.levels.hidden = settings.play !== "stufen";
    if (settings.play === "frei") {
      const r = boardRecords(settings.level, settings.mode);
      ui.best.textContent = r.best
        ? t("hs.best.records", "Deine Rekorde hier: {best} Punkte · beste Serie {streak} · meiste Treffer {hits}", { best: r.best, streak: r.bestStreak, hits: r.mostHits })
        : "";
      ui.play.textContent = t("hs.go", "Los geht's");
    } else if (settings.play === "tag") {
      const b = tagBest(settings.level);
      ui.best.textContent = b
        ? t("hs.tag.best", "Heute: Bestwert {n} Punkte · morgen gibt es eine neue Runde", { n: b })
        : t("hs.tag.none", "Heute noch nicht gespielt – für alle die gleichen Vögel");
      ui.play.textContent = t("hs.tag.go", "Tagesrunde starten");
    } else {
      const prog = levelProgress(boardId());
      renderLevels(prog);
      const earned = Object.values(prog.stars).reduce((a, b) => a + b, 0);
      ui.best.textContent = earned ? t("hs.best.stars", "{n} von {m} Sternen auf {level} · {cards}", { n: earned, m: LEVELS.length * 3, level: settings.level, cards: cardsName() }) : "";
      ui.play.textContent = earned || prog.open > 1 ? t("hs.btn.next", "Weiter: Level {n}", { n: prog.open }) : t("hs.btn.first", "Los: Level 1");
    }
    board.show({ stufe: settings.level, karten: settings.mode });
  }

  // The Tagesrunde's best of today, per Niveau, on this device.
  function tagBest(level) {
    try {
      const d = JSON.parse(storage("hoerSafari.tag") || "null");
      return d && d.d === today() ? d.best?.[level] || 0 : 0;
    } catch {
      return 0;
    }
  }
  function saveTag(level, score) {
    const before = tagBest(level);
    let d = null;
    try { d = JSON.parse(storage("hoerSafari.tag") || "null"); } catch { /* start over */ }
    if (!d || d.d !== today()) d = { d: today(), best: {} };
    if (score > before) d.best[level] = score;
    storage("hoerSafari.tag", JSON.stringify(d));
    return { before, best: Math.max(before, score), beat: score > before && score > 0 };
  }

  // ---- levels: the choice on the start screen, the start card ----------------------------
  const starRow = (n) => `<span class="hs-stars" aria-label="${t("hs.stars.aria", "{n} von 3 Sternen", { n })}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "is-on" : ""}">★</i>`).join("")}</span>`;
  const lvName = (n) => t(`hs.lv${n}.name`, LEVELS[n - 1].name);
  function renderLevels(prog) {
    ui.levels.innerHTML = LEVELS.map((L, i) => {
      const n = i + 1;
      const locked = n > prog.open;
      const why = locked ? ` aria-disabled="true" data-why="${t("hs.locked", "Erst Level {n} schaffen", { n: n - 1 })}"` : "";
      return `<button type="button" class="hs-lv${locked ? " is-locked" : ""}${n === prog.open ? " is-next" : ""}" data-stage="${n}"${why}>
        <b>${locked ? "🔒" : n}</b><span>${lvName(n)}</span>${locked ? "" : starRow(prog.stars[n] || 0)}</button>`;
    }).join("");
  }
  ui.levels.addEventListener("click", (e) => {
    const b = e.target.closest("[data-stage]");
    if (b && b.getAttribute("aria-disabled") !== "true") intro(Number(b.dataset.stage));
  });

  function intro(n) {
    stage = clamp(n, 1, LEVELS.length);
    const L = LEVELS[stage - 1];
    const prog = levelProgress(boardId());
    ui.introNum.textContent = t("hs.levelOf", "Level {n} von {m}", { n: stage, m: LEVELS.length });
    ui.introName.textContent = lvName(stage);
    ui.introGoal.innerHTML = t("hs.introGoal", "Triff <b>{goal} richtige Vögel</b> in {time} Sekunden. Drei Herzen hast du.", { goal: L.goal, time: L.time });
    ui.introNews.innerHTML = L.news.map((x, k) => `<li>${t(`hs.lv${stage}.n${k + 1}`, x)}</li>`).join("");
    ui.introNewsHead.textContent = stage === 1 ? t("hs.news.first", "So ist es hier") : t("hs.news", "Neu in diesem Level");
    ui.introStars.innerHTML = prog.stars[stage] ? `${t("hs.before", "Bisher:")} ${starRow(prog.stars[stage])}` : "";
    setPhase("intro");
    ui.introGo.focus({ preventScroll: true });
  }
  showBest();

  // ---- images and voices ---------------------------------------------------------------
  const hamsti = mascotImage("hamsti", { extra: "blaster" });
  const images = new Map();
  function img(w) {
    let im = images.get(w.id);
    if (!im) {
      im = new Image();
      im.src = withBase(w.i);
      images.set(w.id, im);
    }
    return im;
  }
  // The voice: no Spanish clips are recorded yet, so the browser's voice says the word with its
  // article ("la cuchara"), as in Bruno Kart: one from Spain first, else any Spanish one. Recorded
  // clips (/audio/wortschatz/<audio>.mp3, w.a) would go here, and they would have to say the
  // article too. An English voice reading Spanish would teach the wrong sounds, so a browser
  // with no Spanish voice stays silent and shows the word at once (nextTarget): the round can
  // still be played by reading, and the start card says why. An empty voice list proves nothing,
  // since it may still be loading, and some Android browsers never list their voices but speak
  // anyway: there it tries, and a voice that fails counts as none.
  const synth = typeof speechSynthesis !== "undefined" ? speechSynthesis : null;
  let esVoice = null;
  let voiceFailed = false;
  const canSpeak = () => !!synth && !voiceFailed && (!!esVoice || !(synth.getVoices?.().length));
  const pickVoice = () => {
    const vs = synth?.getVoices?.() ?? [];
    esVoice = vs.find((v) => /^es[-_]ES/i.test(v.lang)) ?? vs.find((v) => /^es([-_]|$)/i.test(v.lang)) ?? null;
    ui.noVoice.hidden = canSpeak();
  };
  if (synth) synth.addEventListener?.("voiceschanged", pickVoice);
  pickVoice();
  const spoken = (w) => (typeof w === "string" ? w : label(w));
  function hush() {
    try { synth?.cancel(); } catch { /* nothing to stop */ }
  }
  // One voice at a time. While one speaks, no new target is called (`speaking`), so a word
  // said after a hit never runs into the next one. `after` runs when this word is done, unless
  // another word came in between.
  let voiceTok = 0;
  let speaking = false;
  function say(w, after, delay = 0) {
    const tok = ++voiceTok;
    speaking = true;
    hush();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (tok !== voiceTok) return;
      speaking = false;
      if (after) after();
    };
    setTimeout(finish, delay + 3000); // no voice, or it never ends: go on anyway
    setTimeout(() => {
      if (tok !== voiceTok) return;
      if (!canSpeak()) return finish();
      try {
        const u = new SpeechSynthesisUtterance(spoken(w));
        u.lang = "es-ES";
        u.rate = 0.9;
        if (esVoice) u.voice = esVoice;
        u.onend = finish;
        u.onerror = (e) => {
          // hush() cancels on purpose; anything else means this browser cannot say Spanish
          if (e?.error !== "canceled" && e?.error !== "interrupted") {
            voiceFailed = true;
            ui.noVoice.hidden = false;
            if (phase === "play" && S?.target) showWord("hint", S.target);
          }
          finish();
        };
        synth.speak(u);
      } catch {
        finish(); /* no voice: the written hint still comes after a few seconds */
      }
    }, delay);
  }

  // ---- what a word means, in the interface language ---------------------------------------
  // The page inlines English (w.m); the other interface languages come from the trainer's gloss
  // files, loaded once. A word with no entry falls back to English.
  const INLINE = ["en"];
  const fetched = {};
  const glossLang = getLang;
  function glossOf(w) {
    const l = glossLang();
    const text = INLINE.includes(l) ? w.m?.[l] : fetched[l]?.[w.id];
    if (text) return { text, lang: l };
    return w.m?.en ? { text: w.m.en, lang: "en" } : null;
  }
  async function loadGloss() {
    const l = glossLang();
    if (INLINE.includes(l) || fetched[l]) return;
    try {
      fetched[l] = await (await fetch(withBase(`/vocabulary/glosses/${l}.json`))).json();
    } catch {
      fetched[l] = {};
    }
    if (phase === "end") renderAlbum();
  }
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---- view ------------------------------------------------------------------------------
  const view = { w: 800, scale: 1, dpr: 1, worldW: 1800 };
  const layerW = (par) => view.w + (view.worldW - view.w) * par;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * view.dpr);
    canvas.height = Math.round(r.height * view.dpr);
    view.scale = r.height / VIEW_H;
    view.w = r.width / view.scale;
    view.worldW = Math.max(view.w * 2.3, 1700);
    if (S) S.camX = clamp(S.camX, 0, view.worldW - view.w);
    placeHidden();
  }
  new ResizeObserver(resize).observe(canvas);

  // ---- round state -------------------------------------------------------------------------
  let S = null;
  let phase = "start";
  const defaultAim = () => ({ x: view.w / 2, y: VIEW_H * 0.4, on: false, mouse: false });

  function poolFor(level) {
    const lv = level === "B1" ? ["B1", "B2"] : [level];
    return allWords.filter((w) => lv.includes(w.lv));
  }

  /** The round's difficulty: a level's numbers, or the free round's ramp (TUNING). */
  function roundCfg() {
    if (settings.play !== "stufen") {
      return {
        round: T.ROUND, goal: 0, speed: 1, birds: 5, ramp: true, dives: true, firstDive: T.FIRST_DIVE,
        diveGap: T.DIVE_GAP, divers: null, dive: 1, hint: T.HINT_AFTER,
      };
    }
    const L = LEVELS[stage - 1];
    return {
      round: L.time, goal: L.goal, speed: L.speed, birds: L.birds, ramp: false, dives: L.dives > 0,
      firstDive: Math.min(T.FIRST_DIVE, L.dives + 2), diveGap: [L.dives, L.dives], divers: L.divers, dive: L.dive, hint: L.hint,
    };
  }

  function newRound() {
    const pool = poolFor(settings.level);
    pool.forEach(img);
    const cfg = roundCfg();
    const rng = settings.play === "tag" ? seeded(`${today()}:${settings.level}`) : null;
    S = {
      cfg,
      rng,
      retry: [], // words that went wrong, due again a few targets later: { w, at }
      retried: new Set(),
      nTargets: 0,
      targetRecorded: false,
      targetSeen: false,
      lastTarget: null,
      won: false,
      wonAt: 0,
      quietAt: -1,
      pool,
      bag: shuffle([...pool], rng || Math.random),
      t: 0,
      extra: 0,
      camX: (view.worldW - view.w) / 2,
      aim: defaultAim(),
      ammo: T.MAG,
      hearts: T.HEARTS,
      score: 0,
      streak: 0,
      bestStreak: 0,
      shots: 0,
      hits: 0,
      wrongs: 0,
      mutschuss: 0,
      scared: 0,
      impacts: 0,
      birds: [],
      pellets: [],
      fx: [],
      items: [],
      target: null,
      targetT: 0,
      hinted: false,
      nextTargetAt: 0.6,
      nextSpawn: 0,
      unseen: 0,
      goldenDone: false,
      nextDive: cfg.firstDive,
      nextItem: T.FIRST_ITEM,
      streuUntil: 0,
      slowUntil: 0,
      quiz: null,
      quizClosedAt: -10,
      quizRight: 0,
      quizWrong: 0,
      album: [],
      trouble: new Map(),
      bonusFound: 0,
      keys: new Set(),
      recoil: 0,
      muzzle: 0,
      splat: 0,
      splatSeed: 0,
      shake: 0,
      paused: false,
      lastTick: 99,
      endReason: null,
    };
    placeHidden();
    for (let i = 0; i < 4; i++) spawnBird(null, true);
  }
  const roundLen = () => S.cfg.round + S.extra;
  const slowF = () => (S.t < S.slowUntil ? 0.5 : 1);

  // ---- hidden things -------------------------------------------------------------------
  let hidden = [];
  function placeHidden() {
    // The hot-air balloon is not a find: it comes back every round (see shootBalloon).
    const keep = new Map(hidden.filter((b) => b.id !== "ballon").map((b) => [b.id, b.found]));
    hidden = [
      { id: "muehle", depth: "mid", x: layerW(DEPTHS.mid.par) * 0.8, y: 0, word: "a windmill", pts: 25 },
      { id: "wegweiser", depth: "near", x: layerW(1) * 0.07 + 40, y: 0, word: "a signpost", pts: 15 },
      { id: "ballon", depth: "far", x: layerW(DEPTHS.far.par) * 0.12, y: 120, word: "a hot-air balloon", pts: 25 },
    ].map((b) => ({ ...b, found: keep.get(b.id) || false, spin: 0 }));
  }
  function hiddenScreen(h) {
    const x = h.x - (S ? S.camX : 0) * DEPTHS[h.depth].par;
    let y = h.y;
    if (h.id === "muehle") y = hillY(h.x, HILLS.mid) + 4;
    if (h.id === "wegweiser") y = hillY(h.x, HILLS.near) + 14;
    return { x, y };
  }
  // Dev only: where the hidden things are, for a test script (removed from the build).
  if (import.meta.env?.DEV) {
    window.__hoerSafari = {
      hidden: () => hidden.map((h) => ({ id: h.id, ...hiddenScreen(h), scale: view.scale, fall: h.fall ?? null })),
      score: () => S?.score,
      hit: (id) => { const h = hidden.find((x) => x.id === id); return h && planeHitHidden(h); },
    };
  }
  const planeHitHidden = (h) => (h.id === "ballon" ? shootBalloon(h, hiddenScreen(h)) : false);
  function hitHidden(h, p) {
    const { x, y } = hiddenScreen(h);
    if (h.id === "muehle") return p.x > x - 40 && p.x < x + 40 && p.y > y - 120 && p.y < y;
    if (h.id === "wegweiser") return p.x > x - 36 && p.x < x + 36 && p.y > y - 80 && p.y < y;
    return Math.hypot(p.x - x, p.y - y) < 26;
  }

  // ---- birds ---------------------------------------------------------------------------
  function onScreen() {
    const ids = new Set();
    const imgs = new Set();
    for (const b of S.birds) if (b.state === "fly" || b.state === "warn" || b.state === "dive") { ids.add(b.word.id); imgs.add(b.word.i); }
    return { ids, imgs };
  }

  function distractor() {
    const { ids, imgs } = onScreen();
    const t = S.target;
    const ok = S.pool.filter((w) => !ids.has(w.id) && !imgs.has(w.i) && (!t || (w.id !== t.id && w.i !== t.i && w.w !== t.w)));
    const r = S.rng || Math.random;
    const list = ok.length ? ok : S.pool;
    return list[Math.floor(r() * list.length)];
  }

  function spawnBird(word, scatter = false, golden = false) {
    // the Tagesrunde draws its birds from the day's seed
    const R = S.rng || Math.random;
    const rand = (a, b) => a + R() * (b - a);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const r = R();
    const depth = golden ? "mid" : r < 0.3 ? "far" : r < 0.68 ? "mid" : "near";
    const d = DEPTHS[depth];
    const dir = R() < 0.5 ? 1 : -1;
    const left = S.camX * d.par;
    const x = scatter ? left + rand(60, view.w - 60) : dir === 1 ? left - 90 : left + view.w + 90;
    S.birds.push({
      word: word || distractor(),
      depth,
      x,
      baseY: rand(d.y[0], d.y[1]),
      y: 0,
      vx: dir * rand(d.speed[0], d.speed[1]) * S.cfg.speed * (S.cfg.ramp ? 1 + S.t / 150 : 1) * (golden ? 2.3 : 1),
      amp: rand(8, 26),
      freq: rand(1.2, 2.6),
      ph: rand(0, Math.PI * 2),
      color: golden ? "#facc15" : pick(COLORS),
      golden,
      state: "fly",
      reveal: 0,
      look: {},
    });
  }

  /** Where a bird is on screen. Divers and birds flying off after a hit live in screen space. */
  function birdScreen(b) {
    if (b.free) return b.free;
    if (b.state === "dive") {
      const z = b.z;
      const e = z * z;
      return {
        x: b.p0.x + (b.pt.x - b.p0.x) * e + Math.sin(z * 14 + b.ph) * 14 * z,
        y: b.p0.y + (b.pt.y - b.p0.y) * e,
        s: b.s0 + ((reducedMotion() ? 1.8 : 3.2) - b.s0) * e,
      };
    }
    const d = DEPTHS[b.depth];
    return { x: b.x - S.camX * d.par, y: b.y, s: d.scale };
  }

  function hitBird(b, p) {
    const { x, y, s } = birdScreen(b);
    if (Math.hypot(p.x - x, p.y - y) < 36 * s) return true;
    const c = cardSize(ctx, settings.mode, b.word, s);
    const top = y + 44 * s;
    return p.x > x - c.w / 2 - 4 && p.x < x + c.w / 2 + 4 && p.y > top - 4 && p.y < top + c.h + 4;
  }

  /** Off it goes, in screen space: dizzy after a hit, angry after a wrong one. */
  function sendAway(b, look, reveal = 0) {
    const { x, y, s } = birdScreen(b);
    b.free = { x, y, s };
    b.fvx = (Math.sign(b.vx) || 1) * rand(160, 240);
    b.fvy = -rand(150, 220);
    b.state = "flee";
    b.look = look;
    b.reveal = reveal;
  }

  // ---- targets -----------------------------------------------------------------------
  // A word that went wrong (wrong bird, the hint, flown off, a wrong quiz answer) comes back a
  // few targets later, once per round. Not in the Tagesrunde: its words are the same for everyone.
  function missed(w) {
    if (S.rng || S.retried.has(w.id) || S.won) return;
    S.retried.add(w.id);
    S.retry.push({ w, at: S.nTargets + 3 + Math.floor(Math.random() * 2) });
  }
  function record(w, ok) {
    recordAttempt({ skill: "wortschatz", correct: ok, id: w.id, trackVocab: true, topic: "spiel-hoer-safari", item: `hoersafari-${w.id}` });
  }
  /** The current target went wrong for the first time: counts once, and it comes back later. */
  function targetFailed() {
    const w = S.target;
    if (!w) return;
    S.trouble.set(w.id, w);
    if (!S.targetRecorded) { S.targetRecorded = true; record(w, false); }
    missed(w);
  }

  function nextTarget() {
    S.nTargets++;
    const due = S.retry.findIndex((r) => r.at <= S.nTargets && r.w.id !== S.lastTarget?.id);
    let w;
    if (due >= 0) {
      w = S.retry.splice(due, 1)[0].w;
    } else {
      if (!S.bag.length) S.bag = shuffle([...S.pool], S.rng || Math.random);
      w = S.bag.pop();
      const { imgs } = onScreen();
      for (let i = 0; i < 6 && imgs.has(w.i) && S.bag.length; i++) {
        S.bag.unshift(w);
        w = S.bag.pop();
      }
    }
    S.target = w;
    S.lastTarget = w;
    S.targetT = S.t;
    S.hinted = false;
    S.unseen = 0;
    S.targetRecorded = false;
    S.targetSeen = false;
    say(w);
    ui.hint.dataset.state = "listen";
    ui.hintText.textContent = t("hs.listen", "Listen …");
    if (!canSpeak()) showWord("hint", w);
  }

  // ---- the blaster -------------------------------------------------------------------
  function gunPose() {
    const aim = S ? S.aim : defaultAim();
    // right of centre on wide screens; left of it on phones, where the reload button sits bottom right
    const x = view.w / 2 + (aim.x - view.w / 2) * 0.3 + (view.w < 600 ? -50 : Math.min(80, view.w * 0.1));
    const y = VIEW_H + 6;
    const tilt = clamp(Math.atan2(aim.x - x, y - aim.y) * 0.8, -0.7, 0.7);
    return { x, y, tilt };
  }
  const hamstiSize = () => (view.w < 600 ? 84 : 116);
  const hamstiX = (g, hs) => g.x - 52 - hs * 0.84;
  // Hamsti holds the blaster: an arm from each shoulder to a paw on the gun's left side. The
  // paws sit in the gun's frame, so they tilt and kick with it.
  function paintPaws(g) {
    const hs = hamstiSize();
    const k = hs / 200;
    const x0 = hamstiX(g, hs);
    const y0 = VIEW_H - hs * 0.92;
    const gy = g.y + (S ? S.recoil : 0) * 16;
    const cos = Math.cos(g.tilt);
    const sin = Math.sin(g.tilt);
    const r = 20 * k;
    // [shoulder in Hamsti's 200×200 frame, paw in the gun's frame]
    for (const [[sx, sy], [px, py]] of [[[140, 128], [-50, -46]], [[136, 150], [-62, -14]]]) {
      const ax = x0 + sx * k;
      const ay = y0 + sy * k;
      const bx = g.x + cos * px - sin * py;
      const by = gy + sin * px + cos * py;
      ctx.lineCap = "round";
      for (const [w, c] of [[r * 1.6 + 6, "#1a2230"], [r * 1.6, "#f2a900"]]) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.fillStyle = "#f2a900";
      ctx.strokeStyle = "#1a2230";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(bx, by, r * 1.25, r, g.tilt - 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  function muzzleAt() {
    const g = gunPose();
    return { x: g.x + Math.sin(g.tilt) * 170, y: g.y - Math.cos(g.tilt) * 170 };
  }

  /** A pellet's screen position and radius at flight progress u (0 … 1). */
  function pelletAt(p, u) {
    const near = DEPTHS.near.plane;
    const k = Math.min(1, u / near);
    const e = 1 - (1 - k) * (1 - k);
    const dist = Math.hypot(p.a.x - p.m.x, p.a.y - p.m.y);
    const arc = Math.min(T.ARC_MAX, dist * 0.3);
    const drop = u > near ? T.DROP * ((u - near) / (1 - near)) ** 2 : 0;
    return {
      x: p.m.x + (p.a.x - p.m.x) * e,
      y: p.m.y + (p.a.y - p.m.y) * e - arc * Math.sin(Math.PI * k) + drop,
      r: 9 * (1 - u * 0.72),
    };
  }

  function fire(p) {
    if (phase !== "play" || S.paused) return;
    const m = muzzleAt();
    if (S.quiz) {
      S.pellets.push({ m, a: { ...p }, t: 0, u: 0, trail: [], quiz: true });
      S.recoil = 1;
      S.muzzle = 1;
      sfx.pop();
      return;
    }
    if (S.ammo <= 0) {
      sfx.empty();
      openQuiz();
      return;
    }
    S.ammo--;
    S.shots++;
    S.recoil = 1;
    S.muzzle = 1;
    sfx.pop();
    const spread = S.t < S.streuUntil ? [-36, 0, 36] : [0];
    for (const dx of spread) S.pellets.push({ m, a: { x: p.x + dx, y: p.y }, t: 0, u: 0, trail: [] });
    renderAmmo();
  }

  function updatePellets(dt) {
    for (const p of S.pellets) {
      if (p.done) continue;
      const prev = p.u;
      p.t += dt;
      p.u = Math.min(1, p.t / T.PELLET_T);
      const pos = pelletAt(p, p.u);
      p.trail.push({ x: pos.x, y: pos.y });
      if (p.trail.length > 6) p.trail.shift();
      for (const pl of PLANES) {
        if (prev < pl.u && p.u >= pl.u) {
          if (planeHit(p, pl, pelletAt(p, pl.u))) { p.done = true; break; }
        }
      }
      if (!p.done && p.u >= 1) {
        p.done = true;
        S.fx.push({ kind: "puff", x: pos.x, y: pos.y, t: 0, life: 0.35 });
      }
    }
    S.pellets = S.pellets.filter((p) => !p.done);
  }

  function planeHit(p, pl, pos) {
    if (p.quiz) {
      if (pl.kind === "near" && S.quiz) return quizHit(pos);
      return false;
    }
    if (pl.kind === "dive") {
      const divers = S.birds.filter((b) => b.state === "dive").sort((a, b) => b.z - a.z);
      for (const b of divers) if (hitBird(b, pos)) { diverHit(b, pos); return true; }
      return false;
    }
    if (pl.kind === "mid") {
      for (const it of S.items) if (Math.hypot(pos.x - itemScreen(it).x, pos.y - itemScreen(it).y) < 34) { collect(it, pos); return true; }
    }
    const list = S.birds.filter((b) => b.depth === pl.kind && (b.state === "fly" || b.state === "warn"));
    for (let i = list.length - 1; i >= 0; i--) if (hitBird(list[i], pos)) { birdHit(list[i], pos); return true; }
    for (const h of hidden) {
      if (h.depth === pl.kind && !h.found && hitHidden(h, pos)) {
        if (h.id === "ballon") return shootBalloon(h, pos);
        h.found = true;
        S.bonusFound++;
        S.score += h.pts;
        sfx.item();
        popup(pos.x, pos.y - 20, `+${h.pts}  ${h.word}!`, "#fde047", 1.6);
        renderHud();
        return true;
      }
    }
    return false;
  }

  // The hot-air balloon: hit, it loses its air and goes down in a spin, trailing puffs, and
  // costs points (people ride in it). It floats in again BALLOON_BACK s later.
  function shootBalloon(h, pos) {
    h.found = true;
    h.fall = 0;
    h.vy = 0;
    S.score = Math.max(0, S.score - T.BALLOON_PENALTY);
    S.streak = 0;
    popup(pos.x, pos.y - 24, t("hs.pop.balloon", "−{n}  Nicht den Ballon!", { n: T.BALLOON_PENALTY }), "#fecaca", 1.6, true);
    sfx.bonk();
    sfx.whoosh();
    sfx.wrong();
    renderHud();
    return true;
  }

  function correct(b, pos, double) {
    const { x, y, s } = birdScreen(b);
    const mult = 1 + Math.min(4, Math.floor(S.streak / 3)) * 0.5;
    let pts = DEPTHS[b.depth].pts * mult * (S.hinted ? 0.5 : 1);
    if (b.golden) pts += T.GOLDEN_PTS;
    if (double) pts *= 2;
    pts = Math.round(pts);
    S.score += pts;
    S.streak++;
    S.bestStreak = Math.max(S.bestStreak, S.streak);
    S.hits++;
    if (S.hinted) targetFailed();
    if (!S.targetRecorded) { S.targetRecorded = true; record(S.target, true); }
    S.album.push(S.target);
    S.fx.push({ kind: "card", word: b.word, x, y: y + 80 * s, s: Math.min(s, 1.4), t: 0 });
    popup(pos.x, pos.y - 30, double ? t("hs.pop.mut", "Mutschuss! +{n}", { n: pts }) : t("hs.pop.bonk", "Bonk! +{n}", { n: pts }), "#fff", 1.2, true);
    popup(x, y - 46 * Math.min(s, 1.5), label(S.target), "#fff", 1.4);
    sfx.bonk();
    sfx.peep(true, rand(0.9, 1.15));
    sfx.right();
    showWord("done", b.word);
    S.target = null;
    // the word once more; the next one comes after it (update: a short quiet first)
    S.nextTargetAt = S.t + 0.75;
    say(b.word, null, 300);
    sendAway(b, { dizzy: true, fast: true });
    b.cardless = true;
    if (S.cfg.goal && S.hits >= S.cfg.goal) {
      S.won = true;
      S.wonAt = S.t;
      sfx.levelUp();
      popup(view.w / 2, VIEW_H * 0.3, t("hs.pop.levelDone", "Level geschafft!"), "#fde047", 2, true);
    }
    renderHud();
  }

  /** A wrong or spare bird: it peeps, and its word is said, so you know what you hit. */
  function sayHit(b, happy) {
    sfx.peep(happy, rand(0.9, 1.15));
    const s = S;
    const t = S.target;
    // after a wrong one, the word you are looking for once more
    say(b.word, t ? () => { if (S === s && S.target === t && phase === "play") say(t); } : null, 260);
  }

  function birdHit(b, pos) {
    if (!S.target) {
      // between two words: a free bonk
      sfx.bonk();
      sayHit(b, true);
      sendAway(b, { dizzy: true, fast: true });
      return;
    }
    if (b.word.id === S.target.id) return correct(b, pos, false);
    S.score = Math.max(0, S.score - T.WRONG_PENALTY);
    S.streak = 0;
    S.wrongs++;
    targetFailed();
    popup(pos.x, pos.y - 30, `−${T.WRONG_PENALTY}`, "#fecaca", 1.1, true);
    sfx.bonk();
    sfx.wrong();
    sayHit(b, false);
    sendAway(b, { angry: true, fast: true }, 1.8);
    renderHud();
  }

  function diverHit(b, pos) {
    S.scared++;
    if (S.target && b.word.id === S.target.id) {
      S.mutschuss++;
      return correct(b, pos, true);
    }
    popup(pos.x, pos.y - 30, t("hs.pop.away", "Weg da!"), "#fff", 1, true);
    sfx.bonk();
    sayHit(b, true);
    sendAway(b, { dizzy: true, fast: true });
    renderHud();
  }

  function popup(x, y, text, color, life = 1, big = false) {
    S.fx.push({ kind: "text", x, y, text, color, life, t: 0, big });
  }

  // ---- Sturzflieger ------------------------------------------------------------------
  function updateDivers(dt) {
    const divers = S.birds.filter((b) => b.state === "warn" || b.state === "dive");
    const max = S.cfg.divers ?? (S.t < 45 ? 1 : 2);
    const calm = S.quiz || S.t < S.quizClosedAt + 1 || S.won;
    if (S.cfg.dives && !calm && S.t >= S.nextDive && divers.length < max) {
      const cands = S.birds.filter((b) => b.state === "fly" && !b.golden);
      const inView = cands.filter((b) => { const p = birdScreen(b); return p.x > 40 && p.x < view.w - 40; });
      const b = pick(inView.length && Math.random() < 0.75 ? inView : cands);
      if (b) {
        b.state = "warn";
        b.warnT = T.WARN_T;
        b.look = { warn: true };
        sfx.squawk();
        const k = clamp(S.t / S.cfg.round, 0, 1);
        const gap = S.cfg.diveGap;
        S.nextDive = S.t + gap[0] + (gap[1] - gap[0]) * k + rand(-1.5, 1.5);
      }
    }
    for (const b of divers) {
      if (b.state === "warn") {
        if (!S.quiz) b.warnT -= dt;
        if (b.warnT <= 0) {
          const p = birdScreen(b);
          b.p0 = { x: p.x, y: p.y };
          b.s0 = p.s;
          b.pt = { x: view.w * rand(0.3, 0.7), y: VIEW_H * rand(0.32, 0.48) };
          b.z = 0;
          b.diveT = (T.DIVE_TIME[settings.level] || 2) * S.cfg.dive;
          b.state = "dive";
          b.look = { warn: true, fast: true };
          sfx.whoosh();
        }
      } else if (!S.quiz) {
        b.z += (dt * slowF()) / b.diveT;
        if (b.z >= 1) impact(b);
      }
    }
  }

  function impact(b) {
    b.state = "gone";
    S.hearts--;
    S.impacts++;
    S.splat = reducedMotion() ? 0 : 1; // no full-screen smudge flash
    S.splatSeed = Math.floor(Math.random() * 1000);
    if (!reducedMotion()) S.shake = 0.35;
    sfx.klatsch();
    popup(view.w / 2, VIEW_H * 0.3, t("hs.pop.splat", "Klatsch!"), "#fff", 1.2, true);
    renderHud();
    if (S.hearts <= 0) end("herzen");
  }

  // ---- extras ---------------------------------------------------------------------------
  function spawnItem() {
    let kinds = ITEM_KINDS;
    if (S.hearts >= T.HEARTS) kinds = ["zeit", "streu", "zeitlupe", "herz"]; // a full-heart ❤ still gives points
    const kind = S.hearts < T.HEARTS && Math.random() < 0.4 ? "herz" : pick(kinds);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const left = S.camX * DEPTHS.mid.par;
    S.items.push({
      kind,
      x: dir === 1 ? left - 60 : left + view.w + 60,
      baseY: rand(90, 230),
      vx: dir * rand(45, 65),
      ph: rand(0, 6),
    });
  }
  function itemScreen(it) {
    return { x: it.x - S.camX * DEPTHS.mid.par, y: it.baseY + Math.sin(S.t * 1.6 + it.ph) * 14 };
  }
  function collect(it, pos) {
    S.items = S.items.filter((x) => x !== it);
    S.nextItem = S.t + rand(T.ITEM_GAP[0], T.ITEM_GAP[1]);
    let text = t(`hs.item.${it.kind}`, ITEM_LOOK[it.kind].label);
    if (it.kind === "zeit") S.extra += T.ZEIT_PLUS;
    else if (it.kind === "herz") {
      if (S.hearts < T.HEARTS) S.hearts++;
      else { S.score += T.HERZ_FULL_PTS; text = t("hs.pop.plusPts", "+{n} Punkte", { n: T.HERZ_FULL_PTS }); }
    } else if (it.kind === "streu") S.streuUntil = S.t + T.STREU_S;
    else if (it.kind === "zeitlupe") S.slowUntil = S.t + T.ZEITLUPE_S;
    sfx.item();
    popup(pos.x, pos.y - 30, text, "#fde047", 1.4, true);
    renderHud();
  }

  // ---- the reload quiz -----------------------------------------------------------------
  function makeQuestion() {
    const cur = S.target;
    const pool = S.pool.filter((w) => !cur || w.id !== cur.id);
    const w = pick(pool.length ? pool : S.pool);
    if (Math.random() < 0.5) {
      return {
        word: w,
        prompt: t("hs.q.article", "el or la?"),
        big: `___ ${w.w}`,
        options: ["el", "la"].map((g) => ({ text: g, ok: g === w.g, popped: false, shake: 0 })),
        wrong: false,
      };
    }
    const others = shuffle(S.pool.filter((x) => x.id !== w.id && x.i !== w.i && x.w !== w.w)).slice(0, 2);
    return {
      word: w,
      prompt: t("hs.q.what", "What is it?"),
      big: "",
      options: shuffle([w, ...others]).map((x) => ({ text: label(x), ok: x.id === w.id, popped: false, shake: 0 })),
      wrong: false,
    };
  }

  function openQuiz() {
    if (phase !== "play" || S.paused || S.quiz) return;
    S.quiz = makeQuestion();
    img(S.quiz.word);
    sfx.quiz();
    ui.reload.classList.remove("is-nudge");
    ui.reload.setAttribute("aria-pressed", "true");
  }

  function closeQuiz() {
    S.quiz = null;
    S.quizClosedAt = S.t;
    S.pellets = S.pellets.filter((p) => !p.quiz);
    ui.reload.setAttribute("aria-pressed", "false");
  }

  function reloadKey() {
    if (phase !== "play" || S.paused) return;
    if (S.quiz) {
      // a second press puts the question away again, as long as there are pellets left
      if (S.ammo > 0) closeQuiz();
      return;
    }
    if (S.ammo < T.MAG) openQuiz();
  }

  // The answers side by side when they fit (at 390px "das Foto · das Dorf · das Pferd" overlapped
  // and the wrong bubble got hit), else stacked in a column.
  function bubbleLayout() {
    const n = S.quiz.options.length;
    ctx.font = "800 22px system-ui, sans-serif";
    const ws = S.quiz.options.map((o) => Math.max(84, ctx.measureText(o.text).width + 40));
    const sum = ws.reduce((a, b) => a + b, 0);
    const row = sum + (n - 1) * 14 <= view.w - 24;
    const gapPx = n > 1 ? Math.min(60, (view.w - 24 - sum) / (n - 1)) : 0;
    let left = view.w / 2 - (sum + (n - 1) * gapPx) / 2;
    return S.quiz.options.map((o, i) => {
      const w = ws[i];
      let x = view.w / 2;
      let y = VIEW_H * 0.42 + i * 76 + Math.sin(S.t * 2 + i * 1.7) * 5;
      if (row) {
        x = left + w / 2;
        left += w + gapPx;
        y = VIEW_H * 0.6 + Math.sin(S.t * 2 + i * 1.7) * 8;
      }
      return { o, x, y, w, h: 64 };
    });
  }

  function quizHit(pos) {
    const q = S.quiz;
    for (const b of bubbleLayout()) {
      if (b.o.popped) continue;
      if (Math.abs(pos.x - b.x) < b.w / 2 + 6 && Math.abs(pos.y - b.y) < b.h / 2 + 6) {
        if (b.o.ok) {
          S.ammo = q.wrong ? Math.ceil(T.MAG / 2) : T.MAG;
          if (!q.wrong) S.quizRight++;
          if (!q.wrong) record(q.word, true);
          popup(b.x, b.y - 50, q.wrong ? t("hs.pop.rightHalf", "Richtig: {text} · halbes Magazin", { text: b.o.text }) : t("hs.pop.reloaded", "Richtig! Nachgeladen"), "#bbf7d0", 1.4, true);
          sfx.reload();
          closeQuiz();
          renderAmmo();
        } else {
          b.o.popped = true;
          q.wrong = true;
          S.quizWrong++;
          S.trouble.set(q.word.id, q.word);
          if (!q.firstMiss) { q.firstMiss = true; record(q.word, false); missed(q.word); }
          popup(b.x, b.y - 40, t("hs.pop.wrong", "Falsch!"), "#fecaca", 1, true);
          sfx.wrong();
        }
        return true;
      }
    }
    return false;
  }

  // ---- input -------------------------------------------------------------------------
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / view.scale, y: (e.clientY - r.top) / view.scale };
  };
  let drag = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (phase !== "play") return;
    if (S.paused) return;
    const p = toLogical(e);
    S.aim = { ...p, on: true, mouse: e.pointerType === "mouse" };
    if (e.pointerType === "mouse") {
      if (e.button === 2) reloadKey();
      else if (e.button === 0) fire(p);
      return;
    }
    drag = { x: e.clientX, cam: S.camX, moved: false, id: e.pointerId };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (phase !== "play") return;
    const p = toLogical(e);
    if (e.pointerType === "mouse") { S.aim = { ...p, on: true, mouse: true }; return; }
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 12) drag.moved = true;
      if (drag.moved && !S.quiz) S.camX = clamp(drag.cam - dx / view.scale, 0, view.worldW - view.w);
      S.aim = { ...p, on: true, mouse: false };
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    if (phase !== "play" || !drag || drag.id !== e.pointerId) return;
    if (!drag.moved) fire(toLogical(e));
    drag = null;
  });
  canvas.addEventListener("pointercancel", () => { drag = null; });
  canvas.addEventListener("pointerleave", (e) => { if (S && e.pointerType === "mouse") S.aim.on = false; });

  window.addEventListener("keydown", (e) => {
    if (phase !== "play") return;
    const k = e.key.toLowerCase();
    if (S.paused) {
      if (["p", "escape", "enter", " "].includes(k)) { e.preventDefault(); resume(); }
      return;
    }
    if (k === "p" || k === "escape") { e.preventDefault(); pause(); }
    else if (k === " " || k === "r") { e.preventDefault(); reloadKey(); }
    else if (k === "h" || k === "enter") { e.preventDefault(); replay(); }
    else if (["arrowleft", "arrowright", "a", "d"].includes(k)) { e.preventDefault(); S.keys.add(k); }
  });
  window.addEventListener("keyup", (e) => S && S.keys.delete(e.key.toLowerCase()));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  // Pause: the clock stops, the voice stops, and a card offers Weiter / Neu starten / Beenden.
  function pause() {
    if (phase !== "play" || !S || S.paused) return;
    S.paused = true;
    voiceTok++;
    speaking = false;
    hush();
    ui.pauseCard.hidden = false;
    music.setPlaying(false);
    ui.pauseGo.focus({ preventScroll: true });
  }
  function resume() {
    if (!S || !S.paused) return;
    S.paused = false;
    last = performance.now();
    ui.pauseCard.hidden = true;
    music.setPlaying(true);
    if (S.target) say(S.target);
  }
  ui.pause.addEventListener("click", pause);
  ui.pauseGo.addEventListener("click", resume);
  ui.pauseRestart.addEventListener("click", () => { S.paused = false; start(); });
  ui.pauseQuit.addEventListener("click", () => { S.paused = false; setPhase("start"); });

  function replay() {
    if (phase !== "play" || !S.target) return;
    say(S.target);
  }
  ui.reload.addEventListener("click", reloadKey);
  ui.replay.addEventListener("click", replay);
  ui.mute.addEventListener("click", () => {
    setGameMuted(!muted); // tells every open game, this one included (GAME_MUTE_EVENT)
  });
  function syncMute() {
    ui.mute.setAttribute("aria-pressed", String(muted));
    ui.mute.textContent = muted ? "🔇" : "🔊";
    ui.mute.title = muted ? t("hs.mute.on", "Geräusche an") : t("hs.mute.off", "Geräusche aus (die Stimme bleibt)");
    ui.mute.setAttribute("aria-label", ui.mute.title);
  }
  const levels = () => settings.play === "stufen";
  // a language switch repaints what script wrote: the start card, the tiles, the open board
  onUiText(() => {
    syncMute();
    showBest();
    loadGloss();
    if (phase === "end") renderAlbum();
  });
  ui.play.addEventListener("click", () => (levels() ? intro(levelProgress(boardId()).open) : start()));
  ui.again.addEventListener("click", () => (levels() ? intro(stage) : start()));
  ui.next.addEventListener("click", () => intro(stage + 1));
  ui.back.addEventListener("click", () => setPhase("start"));
  ui.introGo.addEventListener("click", start);
  ui.introBack.addEventListener("click", () => setPhase("start"));

  function setPhase(p) {
    phase = p;
    root.dataset.phase = p;
    ui.start.hidden = p !== "start";
    ui.intro.hidden = p !== "intro";
    ui.end.hidden = p !== "end";
    ui.hud.hidden = p !== "play";
    ui.pauseCard.hidden = true;
    music.setPlaying(p === "play");
    if (p === "start") showBest();
    // cards sit in the flow on phones and can be taller than the screen: bring them into view
    if (p === "intro" || p === "end") root.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function start() {
    sfx.unlock();
    // the play phase first: the stage shrinks to the game's size (cards are in the flow on
    // phones), and only then is the canvas measured
    setPhase("play");
    resize();
    newRound();
    renderAmmo();
    renderHud();
    ui.hint.dataset.state = "listen";
    ui.hintText.textContent = t("hs.getReady", "Gleich geht's los …");
    ui.goalWrap.hidden = !S.cfg.goal;
    if (S.cfg.goal) popup(view.w / 2, VIEW_H * 0.3, t("hs.pop.levelGo", "Level {n} – los!", { n: stage }), "#fff", 1.6, true);
    ui.reload.setAttribute("aria-pressed", "false");
    // the whole game (HUD + field) into view; sideways on a phone it is taller than the screen, so top-align
    root.scrollIntoView({ block: innerHeight < root.offsetHeight + 80 ? "start" : "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    last = performance.now();
  }

  // ---- HUD ---------------------------------------------------------------------------
  let ammoDots = null;
  function renderAmmo() {
    if (!ammoDots) {
      ui.ammo.innerHTML = "";
      ammoDots = Array.from({ length: T.MAG }, () => {
        const s = document.createElement("span");
        s.className = "hs-pellet";
        ui.ammo.append(s);
        return s;
      });
    }
    ammoDots.forEach((el, i) => el.classList.toggle("is-used", i >= S.ammo));
    ui.ammo.setAttribute("aria-label", t("hs.ammo", "{n} von {m} Kugeln übrig", { n: S.ammo, m: T.MAG }));
    ui.reload.classList.toggle("is-empty", S.ammo === 0);
  }
  let shown = { time: -1, hearts: -1 };
  function renderHud() {
    ui.score.textContent = S.score;
    if (S.cfg.goal) ui.goal.textContent = `${Math.min(S.hits, S.cfg.goal)}/${S.cfg.goal}`;
    ui.streak.textContent = S.streak;
    const left = Math.max(0, Math.ceil(roundLen() - S.t));
    if (left !== shown.time) {
      shown.time = left;
      ui.time.textContent = left;
      ui.time.parentElement.classList.toggle("is-low", left <= 10);
    }
    if (S.hearts !== shown.hearts) {
      shown.hearts = S.hearts;
      ui.hearts.innerHTML = Array.from({ length: T.HEARTS }, (_, i) => `<span class="hs-heart${i >= S.hearts ? " is-lost" : ""}">♥</span>`).join("");
      ui.hearts.setAttribute("aria-label", t("hs.hearts", "{n} von {m} Herzen", { n: S.hearts, m: T.HEARTS }));
    }
  }

  // ---- loop ----------------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    // Not below 0: start()/resume() set `last` from performance.now(), and the next frame's
    // timestamp can be earlier than that. A negative step ran every decay backwards (the
    // muzzle flash grew past 1, its arc radius went negative, arc() threw and the loop died
    // on "Gleich geht's los …").
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    music.duck(speaking);
    if (phase === "play" && !S.paused) update(dt);
    draw(now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function update(dt) {
    S.t += dt;
    if (speaking) S.quietAt = S.t;
    const left = roundLen() - S.t;
    if (left <= 0) return end("zeit");
    const sec = Math.ceil(left);
    if (sec <= 10 && sec !== S.lastTick) { S.lastTick = sec; sfx.tick(); }

    // panning: mouse near an edge, or keys (not while a question is up)
    let pan = 0;
    if (!S.quiz) {
      if (S.aim.on && S.aim.mouse) {
        const edge = view.w * 0.05;
        if (S.aim.x < edge) pan = -(1 - S.aim.x / edge);
        else if (S.aim.x > view.w - edge) pan = 1 - (view.w - S.aim.x) / edge;
      }
      if (S.keys.has("arrowleft") || S.keys.has("a")) pan = -1;
      if (S.keys.has("arrowright") || S.keys.has("d")) pan = 1;
    }
    if (pan) S.camX = clamp(S.camX + pan * 720 * dt, 0, view.worldW - view.w);

    S.recoil = Math.max(0, S.recoil - dt * 7);
    S.muzzle = Math.max(0, S.muzzle - dt * 8);
    S.splat = Math.max(0, S.splat - dt / 1.5);
    S.shake = Math.max(0, S.shake - dt);

    if (S.won) {
      // the goal is reached: the last word is said, then the level's end card
      if (!speaking && S.t >= S.wonAt + 1.2) return end("ziel");
    } else if (!S.target && S.t >= S.nextTargetAt && !speaking && S.t - S.quietAt >= 0.3) nextTarget();
    if (S.target && !S.hinted && S.t - S.targetT > S.cfg.hint) {
      S.hinted = true;
      showWord("hint", S.target);
      targetFailed();
    }

    const sf = slowF();
    for (const b of S.birds) {
      if (b.free) {
        b.free.x += b.fvx * dt;
        b.free.y += b.fvy * dt;
        b.fvy -= 60 * dt;
        b.reveal -= dt;
      } else if (b.state === "fly" || b.state === "warn") {
        b.x += b.vx * dt * sf;
        b.y = b.baseY + Math.sin(S.t * b.freq + b.ph) * b.amp;
      }
    }
    updateDivers(dt);
    S.birds = S.birds.filter((b) => {
      if (b.state === "gone") return false;
      if (b.state === "dive" || b.state === "warn") return true;
      const { x, y } = birdScreen(b);
      return x > -500 && x < view.w + 500 && y > -260;
    });

    const flying = S.birds.filter((b) => b.state === "fly");
    const want = S.cfg.birds + (S.cfg.ramp ? Math.floor(S.t / 25) : 0);
    if (flying.length < want && S.t >= S.nextSpawn) {
      spawnBird();
      S.nextSpawn = S.t + rand(0.35, 0.9);
    }
    if (S.target) {
      const tb = S.birds.filter((b) => (b.state === "fly" || b.state === "warn" || b.state === "dive") && b.word.id === S.target.id);
      const inView = tb.some((b) => { const p = birdScreen(b); return p.x > 0 && p.x < view.w; });
      if (tb.length) S.targetSeen = true;
      else if (S.targetSeen) { S.targetSeen = false; targetFailed(); } // its bird flew away
      S.unseen = inView ? 0 : S.unseen + dt;
      if (!tb.length || S.unseen > 3.5) {
        spawnBird(S.target);
        S.unseen = 0;
      }
      if (!S.goldenDone && S.t > 40 && Math.random() < dt * 0.3) {
        S.goldenDone = true;
        spawnBird(S.target, false, true);
      }
    }

    // extras
    for (const it of S.items) it.x += it.vx * dt * sf;
    const before = S.items.length;
    S.items = S.items.filter((it) => { const x = itemScreen(it).x; return x > -300 && x < view.w + 300; });
    if (before && !S.items.length) S.nextItem = S.t + rand(T.ITEM_GAP[0], T.ITEM_GAP[1]);
    if (!S.items.length && S.t >= S.nextItem) { spawnItem(); S.nextItem = Infinity; }

    updatePellets(dt);

    for (const h of hidden) {
      if (h.id === "ballon" && h.fall != null) {
        h.fall += dt;
        if (h.y < VIEW_H + 80) {
          h.vy += 150 * dt;
          h.y += h.vy * dt;
          h.x += Math.sin(h.fall * 7) * 40 * dt;
          if (Math.random() < dt * 14) { const p = hiddenScreen(h); S.fx.push({ kind: "puff", x: p.x, y: p.y + 10, t: 0, life: 0.5 }); }
        } else if (h.fall > T.BALLOON_BACK) {
          Object.assign(h, { found: false, fall: null, vy: 0, y: 120, x: S.camX * DEPTHS.far.par - 60 });
        }
      } else if (h.id === "ballon") h.x += 6 * dt;
      h.spin += dt * (h.found ? 4 : 1.2);
    }
    for (const f of S.fx) f.t += dt;
    S.fx = S.fx.filter((f) => (f.kind === "card" ? f.t < 0.8 : f.t < f.life));
    renderHud();
  }

  function end(reason) {
    if (phase !== "play") return;
    S.endReason = reason;
    // no bonus for standing still: it needs a few hits (else idling would beat playing)
    const survived = reason === "zeit" && S.hits >= T.BONUS_MIN_HITS ? S.hearts : 0;
    const bonus = survived * T.SURVIVE_BONUS;
    S.score += bonus;
    S.quiz = null;
    renderHud();
    setPhase("end");
    renderAlbum();
    if (S.cfg.goal) return endLevel(reason);
    ui.next.hidden = true;
    ui.again.textContent = t("hs.again", "Noch eine Runde");
    ui.again.classList.add("hs-go");
    ui.again.classList.remove("hs-quiet");
    ui.back.textContent = t("hs.back", "Niveau wechseln");
    sfx.end();
    const tag = settings.play === "tag";
    // the Tagesrunde keeps its own best of the day and stays off the ranking
    const rec = tag ? null : saveRound(settings.level, settings.mode, { score: S.score, streak: S.bestStreak, hits: S.hits });
    const day = tag ? saveTag(settings.level, S.score) : null;
    const quote = S.shots ? Math.round((S.hits / S.shots) * 100) : 0;
    const base = reason === "zeit" ? t("hs.timeUp", "Zeit um!") : t("hs.noHearts", "Keine Herzen mehr!");
    ui.endTitle.textContent = tag ? `${t("hs.tag.title", "Tagesrunde")}: ${base}` : base;
    const recLines = [];
    if (rec?.beat.best) recLines.push(t("hs.rec.points", "Neuer Rekord: Punkte!"));
    if (rec?.beat.bestStreak) recLines.push(t("hs.rec.streak", "Neue beste Serie: {n}", { n: S.bestStreak }));
    if (rec?.beat.mostHits) recLines.push(t("hs.rec.hits", "Neuer Rekord: {n} Treffer", { n: S.hits }));
    if (day?.beat && day.before) recLines.push(t("hs.tag.new", "Neuer Bestwert heute!"));
    const prevBest = tag ? day.before : rec.before.best;
    const nowBest = tag ? day.best : rec.now.best;
    const stat = (n, one, many) => `<li><b>${n}</b> ${n === 1 ? one : many}</li>`;
    ui.result.innerHTML = `
      <p class="hs-big">${S.score} <span>${t("hs.points", "Punkte")}</span></p>
      ${bonus ? `<p class="hs-muted">${t("hs.survive", "davon Überlebensbonus: {n} × {b} = {t}", { n: survived, b: T.SURVIVE_BONUS, t: bonus })}</p>` : ""}
      ${recLines.length ? `<p class="hs-record">${recLines.join(" · ")}</p>` : prevBest ? `<p class="hs-muted">${tag ? t("hs.tag.sofar", "Heute bisher: {n}", { n: nowBest }) : t("hs.rec.yours", "Dein Rekord hier: {n}", { n: nowBest })}</p>` : ""}
      ${tag ? `<p class="hs-muted">${t("hs.tag.note", "Die Tagesrunde kommt nicht in die Bestenliste. Morgen gibt es neue Vögel.")}</p>` : ""}
      <ul class="hs-stats">
        <li><b>${S.hits}</b> ${t("hs.stat.hits", "Treffer")}</li>
        ${stat(S.wrongs, t("hs.stat.wrong1", "falscher Vogel"), t("hs.stat.wrongN", "falsche Vögel"))}
        <li><b>${quote}&nbsp;%</b> ${t("hs.stat.quote", "Treffer pro Kugel")}</li>
        <li><b>${S.bestStreak}</b> ${t("hs.stat.streak", "beste Serie")}</li>
        <li><b>${S.hearts}</b> ${S.hearts === 1 ? t("hs.stat.heart1", "Herz übrig") : t("hs.stat.heartN", "Herzen übrig")}</li>
        <li><b>${S.scared}</b> ${t("hs.stat.scared", "Sturzflieger verjagt")}</li>
        <li><b>${S.quizRight}/${S.quizRight + S.quizWrong}</b> ${t("hs.stat.quiz", "Nachlade-Fragen")}</li>
        <li><b>${S.bonusFound}/2</b> ${t("hs.stat.hidden", "Verstecke")}</li>
      </ul>`;
    if (tag) ui.lbOver.hidden = true;
    else
      board.runOver(
        {
          stufe: settings.level,
          karten: settings.mode,
          punkte: S.score,
          sekunden: Math.round(Math.min(S.t, roundLen()) * 10) / 10,
          richtig: S.hits,
          falsch: S.wrongs,
          herzen: S.hearts,
        },
        ui.lbOver,
      );
    if ((rec?.beat.best && rec.before.best) || (day?.beat && day.before)) {
      celebrate({ title: t("hs.cel.record", "Neuer Rekord!"), body: t("hs.cel.points", "{n} Punkte", { n: S.score }), lead: "hamsti" });
    }
  }

  /** A level's end: won (stars, the next level opens) or not yet (try again). */
  function endLevel(reason) {
    const won = reason === "ziel";
    const L = LEVELS[stage - 1];
    const last = stage === LEVELS.length;
    ui.lbOver.hidden = true;
    let line = "";
    if (won) {
      const mistakes = S.wrongs + S.impacts;
      const res = saveLevel(boardId(), stage, { stars: starsFor(mistakes), score: S.score });
      ui.endTitle.textContent = last ? t("hs.end.allDone", "Alle Level geschafft!") : t("hs.end.levelDone", "Level {n} geschafft!", { n: stage });
      line = `<p class="hs-big">${starRow(res.stars)}</p>
        <p class="hs-muted">${mistakes === 0 ? t("hs.end.noMistakes", "Ohne einen Fehler!") : t("hs.end.mistakes", "{n} Fehler – ohne Fehler gibt es 3 Sterne.", { n: mistakes })}${res.better && !res.opened ? " " + t("hs.end.better", "Neuer Bestwert!") : ""}</p>
        ${res.opened ? `<p class="hs-record">${t("hs.end.opened", "Level {n} ist offen: {name}", { n: stage + 1, name: lvName(stage + 1) })}</p>` : ""}`;
      if (res.stars === 3 || last) {
        celebrate({
          title: last ? t("hs.end.allDone", "Alle Level geschafft!") : t("hs.cel.stars", "Drei Sterne!"),
          body: t("hs.cel.level", "Level {n} ohne Fehler", { n: stage }),
          lead: "hamsti",
        });
      }
    } else {
      sfx.end();
      ui.endTitle.textContent = reason === "zeit" ? t("hs.end.levelTimeUp", "Level {n}: Zeit um!", { n: stage }) : t("hs.end.levelNoHearts", "Level {n}: Keine Herzen mehr!", { n: stage });
      line = `<p class="hs-big">${S.hits} <span>${t("hs.end.ofGoal", "von {n} Treffern", { n: L.goal })}</span></p>
        <p class="hs-muted">${t("hs.end.remaining", "Noch {n} – versuch es gleich noch einmal.", { n: L.goal - S.hits })}</p>`;
    }
    ui.result.innerHTML = `${line}
      <ul class="hs-stats">
        <li><b>${S.score}</b> ${t("hs.points", "Punkte")}</li>
        <li><b>${S.wrongs}</b> ${S.wrongs === 1 ? t("hs.stat.wrong1", "falscher Vogel") : t("hs.stat.wrongN", "falsche Vögel")}</li>
        <li><b>${S.hearts}</b> ${S.hearts === 1 ? t("hs.stat.heart1", "Herz übrig") : t("hs.stat.heartN", "Herzen übrig")}</li>
        <li><b>${S.bestStreak}</b> ${t("hs.stat.streak", "beste Serie")}</li>
      </ul>`;
    ui.next.hidden = !won || last;
    if (won && !last) ui.next.textContent = t("hs.btn.next", "Weiter: Level {n}", { n: stage + 1 });
    ui.again.textContent = won ? t("hs.end.levelAgain", "Level noch einmal") : t("hs.end.tryAgain", "Noch einmal versuchen");
    ui.back.textContent = t("hs.allLevels", "Alle Level");
    // the main button is the way on: next level when won, else trying again
    ui.again.classList.toggle("hs-go", !won || last);
    ui.again.classList.toggle("hs-quiet", won && !last);
  }

  function renderAlbum() {
    ui.album.innerHTML = "";
    const seen = new Set();
    for (const w of S.album) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      ui.album.append(wordTile(w));
    }
    if (!S.album.length) ui.album.innerHTML = `<p class="hs-muted">${t("hs.noHits", "Noch keine Treffer – nächstes Mal!")}</p>`;
    ui.practice.innerHTML = "";
    const trouble = [...S.trouble.values()];
    ui.practiceWrap.hidden = !trouble.length;
    trouble.forEach((w) => ui.practice.append(wordTile(w)));
  }

  /** The word in the hint button: with its meaning once it is written out. */
  function showWord(state, w) {
    ui.hint.dataset.state = state;
    const g = glossOf(w);
    ui.hintText.textContent = g ? `${label(w)} · ${g.text}` : label(w);
  }

  function wordTile(w) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hs-tile";
    b.title = t("hs.listenTile", "Anhören");
    // what the word means, in the interface language, as a quiet second line
    const g = glossOf(w);
    const gloss = g ? `<em class="hs-gloss" lang="${g.lang}" dir="${isRtl(g.lang) ? "rtl" : "ltr"}">${esc(g.text)}</em>` : "";
    b.innerHTML = `<img src="${withBase(w.i)}" alt="" width="48" height="48"><span><small>${w.g}</small> ${w.w}${gloss}</span>`;
    b.addEventListener("click", () => say(w));
    return b;
  }

  // ---- drawing ---------------------------------------------------------------------------
  function draw(time) {
    ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, 0);
    if (S && S.shake > 0) ctx.translate(rand(-8, 8) * S.shake * 3, rand(-6, 6) * S.shake * 3);
    const camX = S ? S.camX : (view.worldW - view.w) / 2;
    const birds = (depth) => () => {
      if (!S) return;
      for (const b of S.birds) if (b.depth === depth && !b.free && (b.state === "fly" || b.state === "warn")) paintBird(b, time);
    };
    drawLandscape(ctx, {
      w: view.w,
      camX,
      time,
      layerW,
      after: {
        far: () => { paintHidden("far"); birds("far")(); },
        mid: () => { paintHidden("mid"); if (S) for (const it of S.items) { const p = itemScreen(it); drawBalloon(ctx, p.x, p.y, 1, it.kind, time); } birds("mid")(); },
        near: () => { paintHidden("near"); birds("near")(); },
      },
    });

    if (S) {
      for (const b of S.birds) if (b.free) paintBird(b, time);
      paintFx();
      for (const b of S.birds) if (b.state === "dive") paintBird(b, time);
      paintEdgeMarkers();
      if (!S.quiz) for (const p of S.pellets) paintPellet(p);
      if (S.splat > 0) drawSmudge(ctx, view.w, S.splat, S.splatSeed);
      if (S.quiz) paintQuiz(time);
    }

    const g = gunPose();
    // Hamsti mans the blaster (Bird Safari): beside it, drawn first so it overlaps.
    if (ready(hamsti)) {
      const hs = hamstiSize();
      ctx.drawImage(hamsti, hamstiX(g, hs), VIEW_H - hs * 0.92, hs, hs);
    }
    drawGun(ctx, { ...g, recoil: S ? S.recoil : 0, ammo: S ? S.ammo : T.MAG, mag: T.MAG, time, flash: S && !reducedMotion() ? S.muzzle : 0 });
    if (ready(hamsti)) paintPaws(g);

    if (S && phase === "play") {
      paintTimer(time);
      paintStatus();
      if (S.aim.on) paintSight(S.aim.x, S.aim.y);
    }
  }

  function paintBird(b, time) {
    const { x, y, s } = birdScreen(b);
    if (x < -260 || x > view.w + 260) return;
    drawBird(ctx, {
      x, y, s,
      dir: Math.sign(b.free ? b.fvx : b.vx) || 1,
      color: b.color,
      word: b.word,
      mode: settings.mode,
      image: img(b.word),
      time,
      ph: b.ph,
      look: { ...b.look, golden: b.golden, calm: reducedMotion() },
      card: !b.cardless && (b.state === "fly" || b.state === "warn" || b.state === "dive" || (b.free && b.look.dizzy)),
    });
    if (b.free && b.look.angry && b.reveal > 0) {
      ctx.globalAlpha = Math.min(1, b.reveal);
      pill(ctx, label(b.word), x, y - 64 * s, { size: 18, bg: "rgba(127, 29, 29, .9)" });
      ctx.globalAlpha = 1;
    }
  }

  function paintHidden(depth) {
    for (const h of hidden) {
      if (h.depth !== depth) continue;
      const { x, y } = hiddenScreen(h);
      if (x < -120 || x > view.w + 120) continue;
      if (h.id === "ballon" && h.fall != null) {
        // going down: tipping over and the envelope losing its air
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(h.fall * 7) * 0.5 + Math.min(1, h.fall) * 0.4);
        ctx.scale(1 - Math.min(0.35, h.fall * 0.3), 1 - Math.min(0.45, h.fall * 0.4));
        drawHidden(ctx, h.id, 0, 0, false, h.spin);
        ctx.restore();
        continue;
      }
      drawHidden(ctx, h.id, x, y, h.found, h.spin);
    }
  }

  function paintPellet(p) {
    const pos = pelletAt(p, p.u);
    drawPellet(ctx, pos.x, pos.y, pos.r, p.trail);
  }

  function paintEdgeMarkers() {
    for (const b of S.birds) {
      if (b.state !== "dive" && b.state !== "warn") continue;
      const p = birdScreen(b);
      if (p.x >= 0 && p.x <= view.w) continue;
      const left = p.x < 0;
      const x = left ? 22 : view.w - 22;
      const y = clamp(p.y, 60, VIEW_H - 140);
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(left ? 4 : view.w - 4, y);
      ctx.lineTo(x + (left ? 18 : -18), y - 22);
      ctx.lineTo(x + (left ? 18 : -18), y + 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", x + (left ? 8 : -8), y + 1);
    }
  }

  function paintTimer() {
    const k = clamp((roundLen() - S.t) / S.cfg.round, 0, 1);
    const low = roundLen() - S.t <= 10;
    ctx.fillStyle = "rgba(15,23,42,.25)";
    ctx.fillRect(0, 0, view.w, 8);
    if (low) {
      const p = reducedMotion() ? 0.5 : (Math.sin(S.t * 12) + 1) / 2; // no flashing
      ctx.fillStyle = `rgba(220, 38, 38, ${0.7 + p * 0.3})`;
    } else {
      ctx.fillStyle = k > 0.5 ? "#22c55e" : "#f59e0b";
    }
    ctx.fillRect(0, 0, view.w * k, low ? 10 : 8);
  }

  /** Active extras as small pills at the top left. */
  function paintStatus() {
    let y = 30;
    if (S.t < S.streuUntil) { pill(ctx, `✳ ${t("hs.status.streu", "Streuschuss")} ${Math.ceil(S.streuUntil - S.t)}`, 92, y, { size: 15, bg: "rgba(126, 34, 206, .85)" }); y += 30; }
    if (S.t < S.slowUntil) pill(ctx, `🐌 ${t("hs.status.slow", "Zeitlupe")} ${Math.ceil(S.slowUntil - S.t)}`, 84, y, { size: 15, bg: "rgba(15, 118, 110, .85)" });
    if (S.ammo === 0 && !S.quiz) pill(ctx, t("hs.empty", "Leer! Tippe auf „Nachladen“"), view.w / 2, VIEW_H - 220, { size: 17 });
  }

  function paintSight(x, y) {
    ctx.save();
    const empty = !S.quiz && S.ammo === 0;
    ctx.strokeStyle = empty ? "rgba(255,255,255,.4)" : "#fff";
    ctx.shadowColor = "rgba(0,0,0,.7)";
    ctx.shadowBlur = 3;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(x + dx * 10, y + dy * 10);
      ctx.lineTo(x + dx * 25, y + dy * 25);
    }
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintQuiz(time) {
    const q = S.quiz;
    ctx.fillStyle = "rgba(15,23,42,.5)";
    ctx.fillRect(-20, -20, view.w + 40, VIEW_H + 40);
    const pw = Math.min(440, view.w - 32);
    const px = view.w / 2 - pw / 2;
    const py = 40;
    const ph = 170;
    ctx.fillStyle = "#fff";
    roundRect(ctx, px, py, pw, ph, 18);
    ctx.fill();
    ctx.fillStyle = "#c2410c";
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t("hs.q.head", "NACHLADEN · TRIFF DIE RICHTIGE ANTWORT"), view.w / 2, py + 20);
    const im = img(q.word);
    const hasImg = settings.mode === "bild" || q.big === "";
    if (hasImg && im.complete && im.naturalWidth) ctx.drawImage(im, view.w / 2 - 36, py + 36, 72, 72);
    ctx.fillStyle = "#0f172a";
    ctx.font = "800 24px system-ui, sans-serif";
    ctx.fillText(q.big || q.prompt, view.w / 2, py + (hasImg ? 130 : 80));
    if (q.big) {
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillStyle = "#475569";
      ctx.fillText(q.prompt, view.w / 2, py + (hasImg ? 156 : 112));
    }
    for (const b of bubbleLayout()) {
      if (b.o.popped) {
        ctx.globalAlpha = 0.35;
      }
      ctx.fillStyle = b.o.popped ? "#94a3b8" : "#fde68a";
      ctx.strokeStyle = b.o.popped ? "#64748b" : "#b45309";
      ctx.lineWidth = 3;
      roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.beginPath();
      ctx.ellipse(b.x - b.w / 4, b.y - b.h / 4, b.w / 6, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 22px system-ui, sans-serif";
      ctx.fillText(b.o.text, b.x, b.y + 1);
      ctx.globalAlpha = 1;
    }
    for (const p of S.pellets) if (p.quiz) paintPellet(p);
    if (S.ammo > 0) pill(ctx, t("hs.q.back", "Nachladen-Knopf oder Leertaste: zurück"), view.w / 2, Math.max(...bubbleLayout().map((b) => b.y)) + 54, { size: 13, bg: "rgba(15,23,42,.6)" });
  }

  function paintFx() {
    for (const f of S.fx) {
      if (f.kind === "text") {
        const k = f.t / f.life;
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `800 ${f.big ? 28 : 20}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(15,23,42,.75)";
        const y = Math.max(28, f.y - k * 40);
        const half = ctx.measureText(f.text).width / 2 + 8;
        const x = clamp(f.x, half, view.w - half);
        ctx.strokeText(f.text, x, y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, x, y);
        ctx.globalAlpha = 1;
      } else if (f.kind === "puff") {
        const k = f.t / f.life;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4 + k * 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.kind === "card") {
        // the card the bird dropped flies into the album (bottom left)
        const k = Math.min(1, f.t / 0.8);
        const e = k * k * (3 - 2 * k);
        const x = f.x + (40 - f.x) * e;
        const y = f.y + (VIEW_H - 50 - f.y) * e;
        const size = 84 * Math.max(f.s, 0.8) * (1 - e * 0.6);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.15 + e * 0.3);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(0,0,0,.35)";
        ctx.shadowBlur = 8;
        roundRect(ctx, -size / 2, -size / 2, size, size, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        const im = img(f.word);
        if (settings.mode === "wort") {
          ctx.fillStyle = "#0f172a";
          ctx.font = `700 ${Math.max(10, size / 5)}px system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(f.word.w, 0, 0);
        } else if (im.complete && im.naturalWidth) ctx.drawImage(im, -size / 2 + 6, -size / 2 + 6, size - 12, size - 12);
        ctx.restore();
      }
    }
  }

  // test hook (Playwright): a view of the round, plus a direct hit and a clock step for tests
  root.__hs = {
    state: () => S, view, birdScreen, pelletAt, bubbleLayout: () => (S && S.quiz ? bubbleLayout() : []), itemScreen, T,
    hit: (b) => birdHit(b, birdScreen(b)),
    tick: (dt) => { if (phase === "play") update(dt); },
  };

  resize();
  setPhase("start");
}
