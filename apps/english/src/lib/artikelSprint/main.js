// Bruno Kart: the page controller. Screens (start, room, count, play, pause, game over),
// the HUD and the question bar are DOM; the run itself is game.js + renderer.js on one canvas.
//
// Every run has a seed (rng.js), so it can be handed on: a challenge link (challenge.js)
// replays it for a friend with a score to beat, and a race room (room.js) starts the same
// seed on every phone at once and swaps the scores live.

import { createGame, POWERS, DIFFICULTIES } from "./game.js";
import { createRenderer } from "./renderer.js";
import { bindInput } from "./input.js";
import { createDeck, MODES, LEVELS } from "./questions.js";
import { getBest, saveBest, getBestTime, saveBestTime, getPrefs, savePrefs, getDaily, saveDaily, todayStr } from "./storage.js";
import { seeded, newSeed, deckSeed } from "./rng.js";
import { joinRoom, makePin, readPin, cleanName, MAX_PLAYERS, PROG_EVERY, POS_EVERY } from "./room.js";
import { readChallenge, challengeUrl, dropChallenge, shareLink } from "./challenge.js";
import { mountBoard } from "./board.js";
import { speak, stopSpeaking } from "./speak.js";
import { glossLang, loadGloss, meaningOf } from "./glosses.js";
import { recordAttempt } from "../progress.js";
import { celebrate } from "../mascotCelebrate.js";
import { gameMuted, setGameMuted, reducedMotion, GAME_MUTE_EVENT } from "../spieleEinstellungen.js";

/** The Tagesrunde's seed: FNV-1a of the player's date, mode and level, the same for everybody that day. */
function dailySeed(mode, level) {
  let h = 0x811c9dc5;
  for (const c of `sprint|${todayStr()}|${mode}|${level}`) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return h >>> 0;
}

/** m:ss for the run clock. */
const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// What each power-up is called when it is picked up.
const POWER_TEXT = {
  shield: ["sprint.power.shield", "Schild: {n} s unverwundbar"],
  magnet: ["sprint.power.magnet", "Magnet: zieht Münzen an"],
  jump: ["sprint.power.jump", "Supersprung: höher springen"],
  double: ["sprint.power.double", "Doppelte Punkte"],
  heart: ["sprint.power.heart", "Extra-Leben"],
  heartFull: ["sprint.power.heartFull", "Leben voll: +250 Punkte"],
  warp: ["sprint.power.warp", "Turbo! Doppeltes Tempo"],
};
import { setMuted, isMuted, unlock, sfx } from "./sound.js";
import { music } from "./music.js";
import { enhanceSwitch } from "../segSwitch.js";
import { setWaiting } from "../notReady.js";
import { track } from "../track.js";
import { t, onUiText } from "../uiText.js";
import { spielMelden } from "../spielMelden.js";
import { withBase } from "../paths.js";
import { currentPath } from "../paths.js";

export function mountArtikelSprint(root, data) {
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => [...root.querySelectorAll(sel)];
  const canvas = $("[data-canvas]");
  const stage = $("[data-stage]");
  const renderer = createRenderer(canvas);

  const prefs = getPrefs();
  let mode = MODES[prefs.mode] ? prefs.mode : "artikel";
  let level = LEVELS.includes(prefs.level) ? prefs.level : "A1";
  let diff = DIFFICULTIES[prefs.diff] ? prefs.diff : "normal";
  const DIFF_TEXT = { leicht: ["sprint.diff.leicht", "Leicht"], normal: ["sprint.diff.normal", "Normal"], schwer: ["sprint.diff.schwer", "Schwer"] };
  const diffName = (d) => t(...DIFF_TEXT[d]);
  setMuted(gameMuted(prefs.muted)); // one sound switch for all games (spieleEinstellungen.js); prefs.muted is the old per-game value

  /** "start" | "room" | "count" | "play" | "pause" | "over" */
  let phase = "start";
  let game = null;
  let raf = 0;
  let last = 0;
  let toastTimer = 0;
  let countTimer = 0;

  /** The seed of the current run and what it scored, for the challenge link. */
  let runSeed = 0;
  let lastRun = null;
  /** A challenge from the page's link, until it is accepted or dismissed. */
  let duel = readChallenge();
  /** The challenge the current run is against. */
  let activeDuel = null;
  /** The Tagesrunde being played ({ seed, mode, level, diff, daily: true }), or null. */
  let activeDaily = null;
  /** What the last game over missed, for the list (meanings follow the language). */
  let lastMissed = [];
  let lastQ = null; // the last gate's word, for a report from the pause screen
  spielMelden(root, "artikel-sprint", () => ({ modus: mode, niveau: level, schwierigkeit: diff, jetzt: curQ ? { wort: curQ.prompt, loesung: curQ.full } : null, zuletzt: lastQ, verpasst: lastMissed.slice(0, 20).map((m) => m.full) }));

  /** The race room (room.js) while in one, and the round being raced. */
  let room = null;
  let round = null;
  /** id → the last progress every other racer sent this round. */
  const others = new Map();
  let lastProg = 0;
  let sentLives = 0;
  let lastBoard = 0;
  let joinTimer = 0;
  /** A race round is the five-lane road (game.js `lanes`), with the lexicon's nouns on it. */
  const ROOM_LANES = 5;
  /** id → where every other racer last said they were (room.js `pos`), for their car on our road. */
  const ghosts = new Map();
  let lastPos = 0;
  const GHOST_COLORS = ["#e11d48", "#7c3aed", "#ea580c", "#0284c7", "#65a30d", "#db2777", "#ca8a04", "#4f46e5", "#0f766e"];
  /**
   * level → words.json plus the lexicon's nouns for that level (woerter-<level>.json): the pool of
   * Artikel and Plural in every kind of run (solo, Tagesrunde, challenge, race room). Everyone loads
   * the same static file, so a seed deals the same words on every phone. Verbs stay words.json.
   * `pools` holds what has arrived, so a run can start without waiting once the level is loaded.
   */
  const roomWords = new Map();
  const pools = new Map();
  async function wordsForRoom(lvl) {
    if (!roomWords.has(lvl)) {
      roomWords.set(lvl, fetch(withBase(`/games/countable-sprint/woerter-${lvl.toLowerCase()}.json`))
        .then((r) => (r.ok ? r.json() : { nouns: [] }))
        .catch(() => ({ nouns: [] }))
        .then((lex) => {
          const have = new Set(data.nouns.map((n) => `${n.word}/${n.level}`));
          const merged = { nouns: [...data.nouns, ...lex.nouns.filter((n) => !have.has(`${n.word}/${n.level}`))], verbs: data.verbs };
          pools.set(lvl, merged);
          return merged;
        }));
    }
    return roomWords.get(lvl);
  }

  // An idle scene behind the start screen, so the page is never a blank box.
  const makeIdle = () => {
    const g = createGame({ deck: createDeck(data, mode, level), mode, difficulty: diff, events: {} });
    g.state.objects = [];
    return g;
  };
  let idle = makeIdle();
  wordsForRoom(level); // the level's lexicon nouns, ready by the time Start is pressed

  function setPhase(p) {
    // Music during the run only; back from a pause it carries on, a new run starts it over.
    if (p === "play" && phase !== "play") music.play({ restart: phase !== "pause" });
    else if (p !== "play" && phase === "play") music.stop();
    phase = p;
    root.dataset.phase = p;
    for (const el of $$("[data-screen]")) el.hidden = el.dataset.screen !== p;
    $("[data-hud]").hidden = p === "start" || p === "room";
    $("[data-prompt]").hidden = p !== "play" && p !== "pause" && p !== "count";
    // A race has no pause: the others keep riding.
    $("[data-pause]").hidden = !!room;
    renderBoard();
  }

  /** Points a button at another dictionary key, so a later language switch keeps the new text. */
  function relabel(el, key, de) {
    el.dataset.i18n = key;
    el.textContent = t(key, de);
  }

  // ---- Start screen pickers ------------------------------------------------------------
  function syncPickers() {
    for (const b of $$("[data-mode]")) b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    for (const b of $$("[data-level]")) b.setAttribute("aria-pressed", String(b.dataset.level === level));
    for (const b of $$("[data-diff]")) b.setAttribute("aria-pressed", String(b.dataset.diff === diff));
    const best = getBest(mode, level, diff);
    // „Normal" is left out of the line: it is what the record always meant.
    const vars = { mode: t(MODES[mode].key, MODES[mode].label), level: diff === "normal" ? level : `${level} · ${diffName(diff)}`, n: best };
    $("[data-best]").textContent = best
      ? t("sprint.best", "Rekord {mode} {level}: {n}", vars)
      : t("sprint.best.none", "Noch kein Rekord für {mode} {level}", vars);
    const bt = getBestTime(mode, level, diff);
    if (bt) $("[data-best]").textContent += ` · ${t("sprint.time.best", "Bestzeit {t}", { t: clock(bt) })}`;
    const hint = $("[data-mode-hint]");
    // The key moves with the mode, so a later language switch repaints the right hint.
    hint.dataset.i18n = MODES[mode].hintKey;
    hint.textContent = t(MODES[mode].hintKey, MODES[mode].hint);
    const dh = $("[data-diff-hint]");
    dh.dataset.i18n = `sprint.diff.${diff}.hint`;
    dh.textContent = t(`sprint.diff.${diff}.hint`, { leicht: "Langsamer, 5 Leben", normal: "Wie immer, 3 Leben", schwer: "Schneller, nur 1 Leben" }[diff]);
    const dl = $("[data-daily-line]");
    const today = getDaily(mode, level, diff);
    dl.textContent = today
      ? t("sprint.daily.todayBest", "Heute: Bestwert {n}", { n: today })
      : t("sprint.daily.none", "Für alle heute gleiche Strecke und gleiche Wörter");
    ranking.show({ mode, level, diff });
  }
  // The room's lobby has the same pickers for the host; both sets stay in step.
  for (const b of $$("[data-mode]")) b.addEventListener("click", () => { mode = b.dataset.mode; savePrefs({ mode }); syncPickers(); });
  for (const b of $$("[data-level]")) b.addEventListener("click", () => { level = b.dataset.level; savePrefs({ level }); wordsForRoom(level); syncPickers(); });
  for (const b of $$("[data-diff]")) b.addEventListener("click", () => { diff = b.dataset.diff; savePrefs({ diff }); idle = makeIdle(); syncPickers(); });
  // The ranking under the game (board.js): the board of the mode, level and difficulty picked now.
  const ranking = mountBoard(root.ownerDocument.querySelector("[data-lb]"), { modeName: (m) => t(MODES[m].key, MODES[m].label), diffName });
  syncPickers();
  for (const sw of $$("[data-switch]")) enhanceSwitch(sw);

  // ---- Challenge from a link -----------------------------------------------------------
  function showDuel() {
    $("[data-duel]").hidden = !duel;
    $("[data-solo]").hidden = !!duel;
    if (!duel) return;
    const vars = { name: duel.name || t("sprint.duel.someone", "Jemand"), n: duel.score, mode: t(MODES[duel.mode].key, MODES[duel.mode].label), level: duel.diff === "normal" ? duel.level : `${duel.level} · ${diffName(duel.diff)}` };
    $("[data-duel-text]").textContent = t("sprint.duel.text", "{name} fordert dich heraus: {n} Punkte", vars);
    $("[data-duel-sub]").textContent = t("sprint.duel.sub", "{mode} · {level} · gleiche Strecke, gleiche Wörter", vars);
  }
  $("[data-duel-go]").addEventListener("click", () => {
    activeDaily = null;
    activeDuel = duel;
    duel = null;
    dropChallenge();
    showDuel();
    track("artikel_sprint_duel", { action: "accept", mode: activeDuel.mode, level: activeDuel.level });
    start(activeDuel);
  });
  $("[data-duel-skip]").addEventListener("click", () => {
    duel = null;
    dropChallenge();
    showDuel();
  });
  showDuel();

  // ---- Sound -------------------------------------------------------------------------
  const muteBtns = $$("[data-mute]");
  const syncMute = () => {
    for (const b of muteBtns) {
      b.setAttribute("aria-pressed", String(isMuted()));
      b.title = isMuted() ? t("sprint.sound.on", "Ton an") : t("sprint.sound.off", "Ton aus");
      b.setAttribute("aria-label", b.title);
    }
  };
  for (const b of muteBtns) b.addEventListener("click", () => { setGameMuted(!isMuted()); unlock(); });
  // Any game (or this one, above) switching sound: follow it, music included.
  addEventListener(GAME_MUTE_EVENT, (e) => { setMuted(e.detail?.muted); if (isMuted()) stopSpeaking(); syncMute(); music.syncMute(); });
  syncMute();
  // Text the script wrote: rewrite it once the dictionary is in, and on every language switch.
  onUiText(() => { refreshGloss(); syncPickers(); syncMute(); showDuel(); if (room) renderLobby(); renderRank(); ranking.render(); for (const k in shown) delete shown[k]; if (game) renderHud(game.state); });

  // ---- HUD ---------------------------------------------------------------------------
  const hud = { score: $("[data-score]"), coins: $("[data-coins]"), streak: $("[data-streak]"), mult: $("[data-mult]"), lives: $("[data-lives]") };
  const shown = {};
  const fx = {
    timeWrap: $("[data-timer]"),
    time: $("[data-time]"),
    timeBest: $("[data-time-best]"),
    powers: Object.fromEntries($$("[data-power]").map((el) => [el.dataset.power, el])),
  };
  let bestTime = 0;
  function setText(key, el, v) {
    if (shown[key] === v) return;
    shown[key] = v;
    el.textContent = v;
  }
  function renderHud(s) {
    setText("score", hud.score, String(Math.floor(s.score)));
    setText("coins", hud.coins, String(s.coins));
    setText("streak", hud.streak, String(s.streak));
    if (shown.mult !== s.mult) { shown.mult = s.mult; hud.mult.hidden = s.mult < 2; hud.mult.textContent = `×${s.mult}`; }
    // Run clock against the time record for this mode and level
    const sec = Math.floor(s.t);
    if (shown.sec !== sec) {
      shown.sec = sec;
      fx.time.textContent = clock(s.t);
      const beat = bestTime > 0 && s.t > bestTime;
      fx.timeWrap.classList.toggle("is-record", beat);
      fx.timeBest.textContent = bestTime > 0
        ? (beat ? t("sprint.time.beat", "Neue Bestzeit!") : t("sprint.time.best", "Bestzeit {t}", { t: clock(bestTime) }))
        : "";
    }
    // Power-up chips with a bar that runs down
    for (const k in fx.powers) {
      const left = k === "warp" ? s.warp : s.power[k];
      const el = fx.powers[k];
      const on = left > 0;
      if (el.hidden === on) el.hidden = !on;
      if (on) el.style.setProperty("--left", String(left / (k === "warp" ? 3 : POWERS[k])));
    }
    if (shown.lives !== s.lives) {
      shown.lives = s.lives;
      hud.lives.innerHTML = Array.from({ length: s.maxLives }, (_, i) => `<span class="asp-heart${i < s.lives ? "" : " is-lost"}" aria-hidden="true">♥</span>`).join("");
      hud.lives.setAttribute("aria-label", t("sprint.livesOf", "{n} von {m} Leben", { n: Math.max(0, s.lives), m: s.maxLives }));
    }
    roomTick(s);
  }

  // ---- Question bar ------------------------------------------------------------------
  const prompt = { word: $("[data-word]"), tag: $("[data-tag]"), en: $("[data-en]"), lanes: $$("[data-lane]") };
  // Word help in the interface language (glosses.js): English for German and for what has no meaning yet.
  let gloss = { lang: "en", table: {} };
  let curQ = null;
  const meaning = (item) => meaningOf(item, gloss.lang, gloss.table);
  const meaningTitle = (m) => (m.lang === "en" ? t("sprint.english", "Englisch: {w}", { w: m.text }) : t("sprint.meaning", "Bedeutung: {w}", { w: m.text }));
  function paintMeaning() {
    if (!curQ) return;
    const m = meaning(curQ);
    prompt.en.textContent = m.text;
    prompt.en.lang = m.lang;
    prompt.en.dir = m.dir;
    prompt.word.title = meaningTitle(m);
  }
  async function refreshGloss() {
    const lang = glossLang();
    if (lang === gloss.lang && (lang === "en" || gloss.loaded)) return;
    const table = await loadGloss(lang);
    if (glossLang() !== lang) return; // switched again while loading
    gloss = { lang, table, loaded: true };
    paintMeaning();
    renderMissed();
  }
  refreshGloss();
  /** One chip per answer box: three, or five on the room's wide road. */
  function laneChips(n) {
    if (prompt.lanes.length === n) return;
    const box = prompt.lanes[0].parentElement;
    box.innerHTML = Array.from({ length: n }, () => '<span class="asp-lane" data-lane></span>').join("");
    box.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    box.classList.toggle("is-wide", n > 3);
    prompt.lanes = [...box.children];
  }
  function showPrompt(q) {
    laneChips(q.options.length);
    curQ = q;
    prompt.word.textContent = q.prompt;
    paintMeaning();
    prompt.en.hidden = true;
    prompt.word.setAttribute("aria-expanded", "false");
    // A word you missed comes back a few questions later (questions.js): say so.
    prompt.tag.textContent = q.again ? `${q.tag} · ${t("sprint.review", "Wiederholung")}` : q.tag;
    prompt.lanes.forEach((el, i) => {
      el.textContent = q.options[i];
      el.dataset.art = q.kind === "artikel" ? q.options[i].toLowerCase() : "";
      el.classList.remove("is-ok", "is-bad");
    });
    root.querySelector("[data-prompt]").classList.add("is-live");
  }
  // Touch has no hover tooltip: a tap on the word shows its English meaning.
  prompt.word.addEventListener("click", () => {
    const open = prompt.en.hidden;
    prompt.en.hidden = !open;
    prompt.word.setAttribute("aria-expanded", String(open));
  });
  prompt.word.addEventListener("pointerdown", (e) => e.stopPropagation());

  function markLanes(r) {
    prompt.lanes.forEach((el, i) => {
      el.classList.toggle("is-ok", i === r.q.answer);
      el.classList.toggle("is-bad", i === r.picked && !r.ok);
    });
    root.querySelector("[data-prompt]").classList.remove("is-live");
  }
  function syncLaneHighlight() {
    if (!game) return;
    const li = game.laneIndex();
    prompt.lanes.forEach((el, i) => el.classList.toggle("is-here", i === li));
  }

  const toast = $("[data-toast]");
  function showToast(html, kind) {
    toast.innerHTML = html;
    toast.className = `asp-toast is-${kind}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, kind === "bad" ? 1900 : 1300);
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---- Game lifecycle ----------------------------------------------------------------
  /**
   * A run; `cfg` ({ seed, mode, level, diff, lanes? }) replays a challenge or starts a race round.
   * `words`: the deck's word list (a race round brings the lexicon's nouns, wordsForRoom).
   */
  let loading = false;
  function start(cfg, words) {
    // Artikel and Plural draw from the lexicon's nouns: wait for the level's list the first time (a moment, once).
    if (!words && (cfg?.mode ?? mode) !== "verb") {
      const lvl = cfg?.level ?? level;
      if (!pools.has(lvl)) {
        if (loading) return;
        loading = true;
        wordsForRoom(lvl).then(() => { loading = false; start(cfg); });
        return;
      }
      words = pools.get(lvl);
    }
    words ??= data;
    unlock();
    stopSpeaking();
    if (cfg) { mode = cfg.mode; level = cfg.level; diff = DIFFICULTIES[cfg.diff] ? cfg.diff : "normal"; syncPickers(); }
    if (!cfg?.daily) activeDaily = null;
    runSeed = cfg?.seed ?? newSeed();
    for (const k in shown) delete shown[k];
    bestTime = getBestTime(mode, level, diff);
    const lanes = cfg?.lanes === ROOM_LANES ? ROOM_LANES : 3;
    game = createGame({
      seed: runSeed,
      deck: createDeck(words, mode, level, seeded(deckSeed(runSeed)), lanes),
      mode,
      lanes,
      difficulty: diff,
      events: {
        hud: renderHud,
        prompt: showPrompt,
        result(r) {
          lastQ = { wort: r.q.full, gewaehlt: r.picked, richtig: r.ok };
          markLanes(r);
          const right = `<strong>${esc(r.q.full)}</strong>`;
          if (r.ok) showToast(`${right}${r.mult > 1 ? ` <span class="asp-x2">×${r.mult}</span>` : ""}`, "ok");
          else if (r.nojump) showToast(`${esc(t("sprint.toast.nojump", "Spring in die Antwort-Box!"))}<br>${t("sprint.toast.correct", "Richtig: {w}", { w: right })}`, "bad");
          else showToast(t("sprint.toast.correct", "Richtig: {w}", { w: right }), "bad");
          // A miss: say the right form out loud ("der Tisch"), after the buzz of the wrong sound.
          if (!r.ok) setTimeout(() => { if (phase === "play") speak(r.q); }, 380);
          // Progress (/progress, "Wörter gelernt"): every answer that was given; riding under the box is no answer.
          if (!r.nojump) {
            const q = r.q;
            recordAttempt({
              skill: "grammatik",
              correct: r.ok,
              id: q.id,
              trackVocab: q.kind === "artikel" && !!q.id,
              topic: q.kind === "artikel" ? "artikel" : q.kind === "plural" ? "plural" : (!q.item?.tense || /present simple/i.test(q.item.tense)) ? "praesens" : undefined,
              item: `sprint-${q.key}`,
            });
          }
        },
        power(p) {
          const [key, de] = POWER_TEXT[p.full ? "heartFull" : p.kind];
          showToast(esc(t(key, de, { n: POWERS.shield })), "power");
        },
        over: gameOver,
      },
    });
    renderHud(game.state);
    toast.hidden = true;
    if (room) countdown();
    else setPhase("play");
    // HUD, question bar and runner all on one screen, under the sticky nav.
    root.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
    track("artikel_sprint_start", { mode, level, diff, ...(room ? { room: true } : activeDuel ? { duel: true } : activeDaily ? { daily: true } : {}) });
    stage.focus({ preventScroll: true });
  }

  /** Race rounds start on 3, 2, 1 over the first stretch, so nobody gets a head start. */
  function countdown() {
    setPhase("count");
    clearTimeout(countTimer);
    const el = $("[data-count]");
    let n = 3;
    const tick = () => {
      if (phase !== "count") return;
      if (n === 0) {
        setPhase("play");
        last = performance.now();
        stage.focus({ preventScroll: true });
        return;
      }
      el.textContent = String(n);
      el.classList.remove("is-tick");
      void el.offsetWidth; // restart the pop
      el.classList.add("is-tick");
      sfx.lane();
      n -= 1;
      countTimer = setTimeout(tick, 900);
    };
    tick();
  }

  function gameOver(sum) {
    const before = getBest(mode, level, diff);
    const record = saveBest(mode, level, diff, sum.score);
    const timeRecord = saveBestTime(mode, level, diff, sum.seconds);
    $("[data-o-time]").textContent = clock(sum.seconds);
    $("[data-o-besttime]").textContent = clock(getBestTime(mode, level, diff));
    $("[data-o-timerecord]").hidden = !timeRecord;
    $("[data-o-score]").textContent = String(sum.score);
    $("[data-o-record]").hidden = !record;
    $("[data-o-best]").textContent = String(getBest(mode, level, diff));
    $("[data-o-acc]").textContent = sum.correct + sum.wrong ? `${sum.accuracy} %` : "–";
    $("[data-o-answers]").textContent = t("sprint.answers", "{n} von {m}", { n: sum.correct, m: sum.correct + sum.wrong });
    $("[data-o-streak]").textContent = String(sum.bestStreak);
    $("[data-o-coins]").textContent = String(sum.coins);
    lastMissed = sum.missed;
    $("[data-o-missed-wrap]").hidden = !sum.missed.length;
    $("[data-o-clean]").hidden = !!sum.missed.length || !(sum.correct > 0);
    renderMissed();
    toast.hidden = true;
    // Tagesrunde: today's best, kept on this device.
    const dEl = $("[data-o-daily]");
    dEl.hidden = !activeDaily;
    if (activeDaily) {
      saveDaily(mode, level, diff, sum.score);
      dEl.textContent = t("sprint.daily.result", "Tagesrunde: heute dein Bestwert {n}", { n: getDaily(mode, level, diff) });
    }

    lastRun = { seed: runSeed, mode, level, diff, score: sum.score };
    // Into the ranking: sent now when signed in, kept for after sign-in otherwise (board.js).
    if (sum.seconds > 0) ranking.runOver({ modus: mode, stufe: level, schwierigkeit: diff, punkte: sum.score, sekunden: sum.seconds, richtig: sum.correct, falsch: sum.wrong }, $("[data-o-lb]"));
    showDuelResult(sum.score);
    syncShare();
    const again = $("[data-again]");
    const back = $("[data-back]");
    $("[data-o-room]").hidden = !room;
    $("[data-screen='over'] [data-room-leave]").hidden = !room;
    if (room) {
      relabel(back, "sprint.room.toLobby", "Zurück zum Raum");
      sendProg(true);
      room.setState("done", round.round);
    } else {
      again.hidden = false;
      relabel(again, "sprint.again", "Nochmal");
      setWaiting(again, null);
      relabel(back, "sprint.back", "Modus oder Niveau ändern");
      $("[data-o-room-msg]").hidden = true;
    }
    setPhase("over");
    renderRank();
    // A new personal best (not the very first run) gets the mascots; a race has no time for them.
    if (record && before > 0 && !room) setTimeout(() => { if (phase === "over") celebrate({ title: t("sprint.record.new", "Neuer Rekord!"), body: `${sum.score} ${t("sprint.points", "Punkte")}` }); }, 500);
    track("artikel_sprint_over", { mode, level, diff, score: sum.score, accuracy: sum.accuracy, answered: sum.correct + sum.wrong });
    (again.hidden ? back : again).focus({ preventScroll: true });
  }

  /** The miss list: the right form, its meaning in the interface language, and a button to hear it. */
  function renderMissed() {
    const list = $("[data-o-missed]");
    list.innerHTML = lastMissed.map((m, i) => {
      const g = meaning(m);
      return `<li><span class="asp-miss-de" lang="de" title="${esc(meaningTitle(g))}">${esc(m.full)}</span><span class="asp-miss-en" lang="${g.lang}" dir="${g.dir}">${esc(g.text)}</span><button type="button" class="asp-miss-hear" data-hear="${i}" aria-label="${esc(t("sprint.hear", "Anhören"))}" title="${esc(t("sprint.hear", "Anhören"))}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg></button></li>`;
    }).join("");
  }
  $("[data-o-missed]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hear]");
    if (b) speak(lastMissed[Number(b.dataset.hear)], { force: true });
  });

  function showDuelResult(score) {
    const el = $("[data-o-duel]");
    el.hidden = !activeDuel;
    if (!activeDuel) return;
    const d = score - activeDuel.score;
    const name = activeDuel.name;
    el.classList.toggle("is-win", d >= 0);
    if (d > 0) el.textContent = name ? t("sprint.duel.win", "Geschafft! {d} Punkte mehr als {name}.", { d, name }) : t("sprint.duel.winAnon", "Geschafft! {d} Punkte mehr als gefordert.", { d });
    else if (d === 0) el.textContent = t("sprint.duel.tie", "Gleichstand! Genau {n} Punkte.", { n: score });
    else el.textContent = name ? t("sprint.duel.lose", "Noch {d} Punkte bis {name}. Nochmal?", { d: -d, name }) : t("sprint.duel.loseAnon", "Noch {d} Punkte bis zum Ziel. Nochmal?", { d: -d });
  }

  function pause() {
    if (room || phase !== "play" || game?.state.over) return;
    setPhase("pause");
    $("[data-resume]").focus({ preventScroll: true });
  }
  function resume() {
    if (phase !== "pause") return;
    setPhase("play");
    last = performance.now();
    stage.focus({ preventScroll: true });
  }
  function toStart() {
    game = null;
    activeDuel = null;
    activeDaily = null;
    stopSpeaking();
    toast.hidden = true;
    idle = makeIdle();
    syncPickers();
    showDuel();
    setPhase("start");
  }

  $("[data-start]").addEventListener("click", () => { activeDuel = null; activeDaily = null; start(); });
  // Tagesrunde: the seed is the date (plus mode and level), so everyone gets today's track and words.
  // It can be driven again; the best of the day is what counts.
  $("[data-daily]").addEventListener("click", () => {
    activeDuel = null;
    activeDaily = { seed: dailySeed(mode, level), mode, level, diff, daily: true };
    start(activeDaily);
  });
  // In a challenge or a Tagesrunde, "Nochmal" is the same track again; in a room it is the host's next round.
  $("[data-again]").addEventListener("click", () => (room ? nextRound() : start(activeDuel ?? activeDaily ?? undefined)));
  $("[data-back]").addEventListener("click", () => (room ? toLobby() : toStart()));
  $("[data-quit]").addEventListener("click", toStart);
  $("[data-resume]").addEventListener("click", resume);
  $("[data-pause]").addEventListener("click", () => (phase === "play" ? pause() : resume()));

  bindInput(stage, (a) => {
    if (a === "pause") return phase === "play" ? pause() : resume();
    if (phase === "play" && game) game.act(a);
  }, () => phase === "play" || phase === "pause");

  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("blur", pause);

  // ---- Challenge link after a run ----------------------------------------------------
  const share = {
    box: $("[data-o-share]"), text: $("[data-share-text]"), name: $("[data-share-name]"),
    go: $("[data-share-go]"), link: $("[data-share-link]"), msg: $("[data-share-msg]"),
  };
  function syncShare() {
    share.box.hidden = !!room;
    share.box.open = false;
    share.link.hidden = true;
    share.msg.textContent = "";
    share.name.value = getPrefs().name;
    share.text.textContent = t("sprint.duel.pitch", "Gleiche Strecke, gleiche Wörter: Wer schafft mehr als deine {n} Punkte?", { n: lastRun?.score ?? 0 });
  }
  share.go.addEventListener("click", async () => {
    if (!lastRun) return;
    const name = cleanName(share.name.value);
    if (name) savePrefs({ name });
    const url = challengeUrl({ ...lastRun, name });
    const how = await shareLink(url, t("sprint.duel.msg", "Bruno Kart: Ich habe {n} Punkte. Schaffst du mehr?", { n: lastRun.score }));
    share.link.value = url;
    share.link.hidden = false;
    share.msg.textContent = how === "copied"
      ? t("sprint.duel.copied", "Link kopiert. Schick ihn an deine Freunde.")
      : how === "shared" ? "" : t("sprint.duel.copy", "Kopier den Link und schick ihn weiter.");
    if (!how) share.link.select();
    track("artikel_sprint_duel", { action: "share", how: how || "manual", mode: lastRun.mode, level: lastRun.level });
  });
  share.link.addEventListener("focus", () => share.link.select());

  // ---- Race room ---------------------------------------------------------------------
  const rm = {
    name: $("[data-room-name]"), code: $("[data-room-code]"), msg: $("[data-room-msg]"),
    pin: $("[data-room-pin]"), link: $("[data-room-link]"), count: $("[data-room-count]"),
    players: $("[data-room-players]"), host: $("[data-room-host]"), cfg: $("[data-room-cfg]"),
    start: $("[data-room-start]"), wait: $("[data-room-wait]"),
  };
  const board = $("[data-board]");
  const rankEl = $("[data-o-rank]");

  function roomStep(step) {
    for (const el of $$("[data-room-step]")) el.hidden = el.dataset.roomStep !== step;
  }
  function openRoom(pin = "") {
    activeDuel = null;
    activeDaily = null;
    rm.name.value = getPrefs().name;
    if (pin) rm.code.value = pin;
    rm.msg.textContent = "";
    roomStep("entry");
    setPhase("room");
    (rm.name.value ? (pin ? $("[data-room-join]") : $("[data-room-create]")) : rm.name).focus({ preventScroll: true });
  }
  function toLobby() {
    game = null;
    toast.hidden = true;
    idle = makeIdle();
    room?.setState("lobby", round?.round ?? 0);
    roomStep("lobby");
    setPhase("room");
    renderLobby();
  }
  const roomUrl = (pin) => `${location.origin}${currentPath()}?raum=${pin}`;
  function setRoomInUrl(pin) {
    const u = new URL(location.href);
    if (pin) u.searchParams.set("raum", pin);
    else u.searchParams.delete("raum");
    history.replaceState(history.state, "", u);
  }

  function enterRoom(pin) {
    const name = cleanName(rm.name.value);
    if (!name) {
      rm.msg.textContent = t("sprint.room.needName", "Wie heißt du? Der Name steht in der Rangliste.");
      rm.name.focus();
      return;
    }
    if (room) return; // already connecting
    savePrefs({ name });
    rm.msg.textContent = t("sprint.room.connecting", "Verbinde …");
    let live = false;
    const fail = (text) => {
      clearTimeout(joinTimer);
      room?.leave();
      room = null;
      rm.msg.textContent = text;
    };
    try {
      room = joinRoom({
        pin,
        name,
        onPlayers() { renderLobby(); renderRank(); renderBoard(); },
        onStart: onRoundStart,
        onProg(p) {
          others.set(p.id, p);
          if (p.over) ghosts.delete(p.id);
          renderRank();
        },
        onPos(p) {
          if (!round || p.round !== round.round || others.get(p.id)?.over) return;
          const g = ghosts.get(p.id) ?? { sx: p.x };
          ghosts.set(p.id, { ...g, ...p, at: performance.now() });
        },
        onStatus(st) {
          if (st === "live" && !live) {
            live = true;
            clearTimeout(joinTimer);
            setRoomInUrl(pin);
            rm.pin.textContent = pin.replace(/(\d{3})(\d{3})/, "$1 $2");
            rm.link.hidden = true;
            // Whoever opened the room sees the QR code straight away: friends next to them
            // scan it. Those who joined came in through it and don't need it.
            if (rm.creating) drawQr().then(() => showQr(true)).catch(() => showQr(false));
            else showQr(false);
            roomStep("lobby");
            renderLobby();
            track("artikel_sprint_room", { action: rm.creating ? "create" : "join" });
          } else if (st === "full") {
            room = null;
            if (phase !== "room") toStart();
            roomStep("entry");
            rm.msg.textContent = t("sprint.room.full", "Der Raum ist voll: höchstens {n} Leute.", { n: MAX_PLAYERS });
          } else if (st === "error" && !live) {
            fail(t("sprint.room.error", "Keine Verbindung zum Raum. Versuch es gleich nochmal."));
          }
        },
      });
    } catch {
      fail(t("sprint.room.error", "Keine Verbindung zum Raum. Versuch es gleich nochmal."));
      return;
    }
    joinTimer = setTimeout(() => { if (!live) fail(t("sprint.room.error", "Keine Verbindung zum Raum. Versuch es gleich nochmal.")); }, 10000);
  }

  function leaveRoom() {
    clearTimeout(joinTimer);
    clearTimeout(countTimer);
    room?.leave();
    room = null;
    round = null;
    others.clear();
    ghosts.clear();
    setRoomInUrl("");
    toStart();
  }

  function renderLobby() {
    if (!room) return;
    const list = room.players;
    const host = room.isHost();
    rm.count.textContent = `(${list.length}/${MAX_PLAYERS})`;
    rm.players.innerHTML = list.map((p, i) => {
      const tags = [
        i === 0 ? `<span class="asp-tag-host">${esc(t("sprint.room.host", "Host"))}</span>` : "",
        p.id === room.me.id ? `<small>(${esc(t("sprint.room.you", "du"))})</small>` : "",
        p.state === "run" ? `<small class="asp-rank-st">${esc(t("sprint.room.riding", "fährt"))}</small>` : "",
      ].join(" ");
      return `<li${p.id === room.me.id ? ' class="is-me"' : ""}><span class="asp-board-name">${esc(p.name)}</span> ${tags}</li>`;
    }).join("");
    rm.host.hidden = !host;
    rm.start.hidden = !host;
    const busy = list.some((p) => p.state === "run");
    const vars = { host: list[0]?.name ?? "", mode: t(MODES[mode].key, MODES[mode].label), level };
    rm.cfg.textContent = host ? "" : t("sprint.room.guestDiff", "{host} wählt Modus, Niveau und Schwierigkeit und startet das Rennen.", vars);
    if (host) setWaiting(rm.start, busy ? t("sprint.room.busy", "Eine Runde läuft noch. Warte, bis alle im Ziel sind.") : null);
    rm.wait.textContent = busy && room.me.state !== "run"
      ? t("sprint.room.running", "Gerade läuft eine Runde. Bei der nächsten bist du dabei.")
      : list.length < 2 ? t("sprint.room.alone", "Teil den Code oder den Link, damit andere mitfahren.") : "";
  }

  /** Host: a new round for everyone in the room, from the mode and level picked now. */
  function nextRound() {
    if (!room?.isHost()) return;
    room.start({ round: (round?.round ?? 0) + 1, seed: newSeed(), mode, level, diff, lanes: ROOM_LANES });
    track("artikel_sprint_room", { action: "round", mode, level, diff, players: room.players.length });
  }
  async function onRoundStart(cfg) {
    if (!room || !cfg || !MODES[cfg.mode] || !LEVELS.includes(cfg.level)) return;
    round = cfg;
    others.clear();
    ghosts.clear();
    lastProg = 0;
    room.setState("run", cfg.round);
    activeDuel = null;
    // Everyone loads the same static list, so the seeded deck deals the same words on every phone.
    const words = cfg.lanes === ROOM_LANES ? await wordsForRoom(cfg.level) : data;
    if (round !== cfg) return; // another round started while loading
    start(cfg, words);
  }

  function myProg(over) {
    const s = game.state;
    return { round: round.round, name: room.me.name, score: Math.floor(s.score), lives: Math.max(0, s.lives), correct: s.correct, wrong: s.wrong, over };
  }
  function sendProg(over) {
    if (!room || !round || !game) return;
    lastProg = performance.now();
    sentLives = game.state.lives;
    room.prog(myProg(over));
  }
  /** Every frame of a race run: progress out now and then, the board a few times a second. */
  function roomTick(s) {
    if (!room || !round || phase !== "play") return;
    const now = performance.now();
    if (s.lives !== sentLives || now - lastProg > PROG_EVERY) sendProg(false);
    if (!s.over && now - lastPos > POS_EVERY) {
      lastPos = now;
      room.pos({ round: round.round, d: Math.round(s.dist * 10) / 10, x: Math.round(s.x * 100) / 100, y: Math.round(s.y * 100) / 100, v: Math.round(s.speed * 10) / 10, k: s.duck > 0 ? 1 : 0 });
    }
    if (now - lastBoard > 250) { lastBoard = now; renderBoard(); }
  }

  /** Everyone racing this round, best first. Someone who left the room counts as finished. */
  function standings() {
    if (!room || !round) return [];
    const here = new Set(room.players.map((p) => p.id));
    const rows = [];
    if (game) rows.push({ id: room.me.id, me: true, name: room.me.name, score: Math.floor(game.state.score), over: game.state.over });
    for (const p of others.values()) if (p.round === round.round) rows.push({ ...p, gone: !here.has(p.id) });
    // Racers who have not sent a score yet still belong on the list.
    for (const p of room.players) {
      if (p.id !== room.me.id && p.state === "run" && p.round === round.round && !others.has(p.id)) rows.push({ id: p.id, name: p.name, score: 0, over: false });
    }
    return rows.sort((a, b) => b.score - a.score);
  }

  function renderBoard() {
    const rows = standings();
    board.hidden = !room || rows.length < 2 || !["play", "pause", "count"].includes(phase);
    if (board.hidden) return;
    const meAt = rows.findIndex((r) => r.me);
    const top = rows.slice(0, 3);
    if (meAt >= 3) top.push(rows[meAt]);
    board.innerHTML = top.map((r) => {
      const cls = [r.me && "is-me", (r.over || r.gone) && "is-out"].filter(Boolean).join(" ");
      return `<li${cls ? ` class="${cls}"` : ""}><span class="asp-board-n">${rows.indexOf(r) + 1}</span><span class="asp-board-name">${esc(r.name)}</span><b>${r.score}</b></li>`;
    }).join("");
  }

  function renderRank() {
    if (!room || phase !== "over") return;
    const rows = standings();
    const running = rows.filter((r) => !r.me && !r.over && !r.gone).length;
    rankEl.classList.toggle("is-final", running === 0 && rows.length > 1);
    rankEl.innerHTML = rows.map((r, i) => {
      const st = r.gone ? t("sprint.room.gone", "weg") : r.over ? "" : t("sprint.room.stillRiding", "fährt noch …");
      return `<li${r.me ? ' class="is-me"' : ""}><span class="asp-board-n">${i + 1}</span><span class="asp-board-name">${esc(r.name)}${r.me ? ` <small>(${esc(t("sprint.room.you", "du"))})</small>` : ""}</span>${st ? `<small class="asp-rank-st">${esc(st)}</small>` : ""}<b>${r.score}</b></li>`;
    }).join("");
    const again = $("[data-again]");
    const msg = $("[data-o-room-msg]");
    if (room.isHost()) {
      again.hidden = false;
      relabel(again, "sprint.room.next", "Neue Runde");
      setWaiting(again, running ? t("sprint.room.waitRun", "Noch {n} unterwegs. Warte, bis alle im Ziel sind.", { n: running }) : null);
      msg.hidden = true;
    } else {
      again.hidden = true;
      msg.hidden = false;
      msg.textContent = running
        ? t("sprint.room.othersRiding", "Noch {n} unterwegs …", { n: running })
        : t("sprint.room.waitHost", "{host} startet die nächste Runde.", { host: room.players[0]?.name ?? "" });
    }
  }

  $("[data-room-open]").addEventListener("click", () => openRoom());
  $("[data-room-cancel]").addEventListener("click", () => (room ? leaveRoom() : toStart()));
  $("[data-room-create]").addEventListener("click", () => { rm.creating = true; enterRoom(makePin()); });
  const joinTyped = () => {
    const pin = readPin(rm.code.value);
    if (!pin) {
      rm.msg.textContent = t("sprint.room.badCode", "Der Raum-Code hat 6 Ziffern.");
      rm.code.focus();
      return;
    }
    rm.creating = false;
    enterRoom(pin);
  };
  $("[data-room-join]").addEventListener("click", joinTyped);
  rm.code.addEventListener("keydown", (e) => { if (e.key === "Enter") joinTyped(); });
  rm.name.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (rm.code.value.trim()) joinTyped();
    else { rm.creating = true; enterRoom(makePin()); }
  });
  rm.start.addEventListener("click", nextRound);
  for (const b of $$("[data-room-leave]")) b.addEventListener("click", leaveRoom);
  $("[data-room-share]").addEventListener("click", async () => {
    if (!room) return;
    const url = roomUrl(room.pin);
    const how = await shareLink(url, t("sprint.room.invite", "Fahr mit mir Bruno Kart! Raum-Code: {pin}", { pin: room.pin }));
    rm.link.value = url;
    rm.link.hidden = false;
    rm.wait.textContent = how === "copied" ? t("sprint.duel.copied", "Link kopiert. Schick ihn an deine Freunde.") : "";
    if (!how) rm.link.select();
  });
  rm.link.addEventListener("focus", () => rm.link.select());

  // The same link as a QR code, for friends standing next to you. qrcode loads on first use.
  const qrBtn = $("[data-room-qr]");
  const qrBox = $("#asp-room-qr");
  function showQr(on) {
    qrBox.hidden = !on;
    qrBtn.setAttribute("aria-expanded", String(on));
  }
  async function drawQr() {
    const { default: QRCode } = await import("qrcode");
    $("[data-room-qr-img]").innerHTML = await QRCode.toString(roomUrl(room.pin), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  }
  qrBtn.addEventListener("click", async () => {
    if (!room) return;
    if (!qrBox.hidden) return showQr(false);
    await drawQr();
    showQr(true);
  });

  /**
   * The other racers as cars on this road: their last reported distance run on at their speed
   * (at most 1.5 s past the message), the lane change eased so a car glides between lanes.
   */
  function updateGhosts(dt, now) {
    if (!game) return;
    const s = game.state;
    if (!room || !round || !ghosts.size) { s.ghosts = null; return; }
    const ids = room.players.map((p) => p.id);
    s.ghosts = [];
    for (const [id, g] of ghosts) {
      const i = ids.indexOf(id);
      if (i < 0) continue; // left the room
      const ahead = Math.min(1.5, (now - g.at) / 1000);
      g.sx += (g.x - g.sx) * Math.min(1, dt * 10);
      s.ghosts.push({
        x: g.sx, y: g.y, duck: !!g.k,
        z: g.d + g.v * ahead - s.dist,
        name: room.players[i].name,
        color: GHOST_COLORS[i % GHOST_COLORS.length],
      });
    }
  }

  // ---- Loop --------------------------------------------------------------------------
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (game && room) updateGhosts(dt, now);
    if (phase === "play" && game) {
      game.update(dt);
      const s = game.state;
      if (s.over) music.stop();
      else music.drive((s.base - s.speedStart) / (s.speedMax - s.speedStart), s.warp > 0);
      syncLaneHighlight();
      renderer.render(game.state);
    } else if (phase === "start" || phase === "room") {
      // The idle run never loses: it just scrolls the scene behind the menu.
      idle.state.t += dt;
      idle.state.dist += 10 * dt;
      renderer.render(idle.state, { hidePlayer: false });
    } else if (game) {
      // Pause, countdown, game over: the run stands still (and slows to a halt once lost).
      if (game.state.over) game.update(dt);
      renderer.render(game.state);
    }
  }

  const ro = new ResizeObserver(() => { renderer.resize(); });
  ro.observe(canvas);
  // Canvas text needs the site fonts; redraw labels with them once they are there.
  document.fonts?.ready.then(() => renderer.resize());

  // Dev only: lets the browser test script steer the run (stripped from the build).
  if (import.meta.env.DEV) window.__artikelSprint = { get game() { return game; }, get phase() { return phase; }, get room() { return room; } };

  setPhase("start");
  // An invitation link (?raum=123456) opens the room screen with the code filled in.
  const invited = readPin(new URLSearchParams(location.search).get("raum"));
  if (invited) openRoom(invited);
  last = performance.now();
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); room?.leave(); music.stop(); };
}
