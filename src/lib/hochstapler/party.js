// Party mode of Bruno sucht den Hochstapler (/games/impostor): one phone, passed around.
// No server: the whole game is this tab (kept in sessionStorage, so a reload goes on).
//
// Screens: start → setup → for each player: pass (neutral cover) → secret → … → clues (one
// sentence each, in turn) → discuss (timer) → vote (secretly one by one, or once as a group)
// → reveal → rescue (if caught) → score → next round / end.
//
// The secret is in the DOM only while its player looks: the pass screen has nothing of the
// round on it, and hiding the card empties it again — so nobody sees the last word by glancing
// at the phone as it is handed over.
import { getLang } from "../i18n.js";
import { animalOf, avatarSrc, drawAnimal, randomAnimal } from "../liveQuiz/names.js";
import { cleanName, makeId } from "../liveQuiz/protocol.js";
import { loadText } from "../liveQuiz/text.js";
import { mountSoundToggles, sfx, unlock } from "../liveQuiz/sound.js";
import { confetti } from "../liveQuiz/confetti.js";
import { reduced, wait } from "../liveQuiz/anim.js";
import { setWaiting } from "../notReady.js";
import { withBase } from "../paths.js";
import {
  MAX_PLAYERS, MIN_PLAYERS, hash32, pickHochstapler, pickTheme, pickWord, redemittelFor, rescueOptions, seeded, settle, tally, turnOrder,
} from "./game.js";
import { tx } from "./strings.js";
import { avImg, esc, wordCard } from "./view.js";

const SAVE_KEY = "hst.party";
const SETUP_KEY = "hst.party.setup";
export function mountParty(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const screens = $$("[data-screen]");
  const redemittel = JSON.parse(document.getElementById("hst-redemittel")?.textContent || "{}");
  const ui = getLang();
  const lang = ["en", "ar", "uk", "ru", "tr"].includes(ui) ? ui : ui === "de" ? "de" : "en";

  /* ---------------------------------------------------------- state ---- */
  // The setup survives games (names, options); the game itself only this tab.
  let setup = { players: [], level: "A1", theme: "", rounds: 1, discuss: 90, vote: "secret" };
  try { setup = { ...setup, ...JSON.parse(localStorage.getItem(SETUP_KEY) || "{}") }; } catch {}
  let g = null; // the game: see newGame()
  const words = {}; // level → themes
  let timer = null;

  const saveSetup = () => { try { localStorage.setItem(SETUP_KEY, JSON.stringify(setup)); } catch {} };
  const save = () => { try { g ? sessionStorage.setItem(SAVE_KEY, JSON.stringify(g)) : sessionStorage.removeItem(SAVE_KEY); } catch {} };

  function show(name) {
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    root.dataset.screenNow = name;
    if (g) { g.screen = name; save(); }
    // A new screen starts at its top on a phone.
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: "start" });
  }

  async function loadLevel(level) {
    if (words[level]) return words[level];
    const res = await fetch(withBase(`/games/impostor/woerter-${level.toLowerCase()}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    words[level] = (await res.json()).themes;
    return words[level];
  }

  /* ---------------------------------------------------------- setup ---- */
  const addForm = $("[data-add]");
  const addErr = $("[data-add-error]");
  const playerOf = (id) => g?.players.find((p) => p.id === id);

  function renderPlayers() {
    $("[data-players]").innerHTML = setup.players.map((p) => `
      <li>${avImg(p)}<span>${esc(p.name)}</span>
        <button type="button" class="hst-icon hst-remove" data-remove="${p.id}" aria-label="${esc(tx("remove", { name: p.name }))}">×</button></li>`).join("");
    const missing = MIN_PLAYERS - setup.players.length;
    setWaiting($("[data-start]"), missing > 0 ? tx("needPlayers", { n: missing }) : null, "[data-add] input");
  }
  function addPlayer(raw) {
    const name = cleanName(raw);
    addErr.textContent = "";
    if (!name) return false;
    if (setup.players.length >= MAX_PLAYERS) { addErr.textContent = tx("full"); return false; }
    if (setup.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) { addErr.textContent = tx("nameTaken"); return false; }
    const used = new Set(setup.players.map((p) => p.avatar));
    let avatar = animalOf(name);
    for (let i = 0; !avatar || (used.has(avatar) && i < 30); i++) avatar = randomAnimal();
    setup.players.push({ id: makeId(), name, avatar });
    saveSetup();
    renderPlayers();
    sfx("join");
    return true;
  }
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (addPlayer(addForm.elements.name.value)) addForm.elements.name.value = "";
    addForm.elements.name.focus();
  });
  $("[data-dice]").addEventListener("click", () => {
    let pick;
    for (let i = 0; i < 40; i++) {
      pick = drawAnimal();
      if (!setup.players.some((p) => p.avatar === pick.animal || p.name === pick.name)) break;
    }
    addPlayer(pick.name);
  });
  $("[data-players]").addEventListener("click", (e) => {
    const id = e.target.closest("[data-remove]")?.dataset.remove;
    if (!id) return;
    setup.players = setup.players.filter((p) => p.id !== id);
    saveSetup();
    renderPlayers();
  });

  // The option rows: one pressed button each.
  function segValue(name, v) {
    const seg = $(`[data-seg="${name}"]`);
    seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));
  }
  const SEG_KEYS = { level: "level", rounds: "rounds", discuss: "discuss", vote: "vote" };
  for (const [seg, key] of Object.entries(SEG_KEYS)) {
    segValue(seg, setup[key]);
    $(`[data-seg="${seg}"]`).addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      setup[key] = typeof setup[key] === "number" ? Number(b.dataset.v) : b.dataset.v;
      segValue(seg, setup[key]);
      saveSetup();
      if (key === "level") { setup.theme = ""; fillThemes(); }
    });
  }
  const themeSel = $("[data-theme]");
  async function fillThemes() {
    const loadErr = $("[data-load-error]");
    try {
      const themes = await loadLevel(setup.level);
      loadErr.hidden = true;
      themeSel.innerHTML = `<option value="">${esc(tx("themeRandom"))}</option>` +
        themes.map((t) => `<option value="${t.id}"${t.id === setup.theme ? " selected" : ""}>${esc(t.name)}</option>`).join("");
    } catch (err) {
      console.error("[hochstapler] words:", err);
      loadErr.hidden = false;
    }
  }
  themeSel.addEventListener("change", () => { setup.theme = themeSel.value; saveSetup(); });

  $("[data-go-setup]").addEventListener("click", () => {
    unlock();
    sfx("click");
    show("setup");
    fillThemes();
    renderPlayers();
  });

  /* ----------------------------------------------------------- game ---- */
  function newGame() {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    g = {
      seed,
      level: setup.level,
      theme: setup.theme,
      rounds: setup.rounds,
      discuss: setup.discuss,
      vote: setup.vote,
      players: setup.players.map((p) => ({ ...p, score: 0, times: 0 })),
      r: 0,
      usedWords: [],
      themesPlayed: {},
      lastImp: [],
      history: [], // per round: { theme, word, impostors, caught, guessedRight, winner }
      round: null,
    };
  }

  async function startRound() {
    const themes = await loadLevel(g.level);
    g.r += 1;
    // Each round its own stream from the game's seed: a replay of the same game picks the same.
    const rnd = seeded(hash32(`${g.seed}|${g.r}`));
    const ids = g.players.map((p) => p.id);
    const counts = Object.fromEntries(g.players.map((p) => [p.id, p.times]));
    const impostors = pickHochstapler(ids, counts, g.lastImp, rnd, 1);
    const theme = pickTheme(themes, g.theme, g.themesPlayed, rnd);
    const word = pickWord(theme, g.usedWords, rnd);
    g.usedWords.push(word.id);
    g.themesPlayed[theme.id] = (g.themesPlayed[theme.id] ?? 0) + 1;
    impostors.forEach((id) => playerOf(id).times++);
    g.lastImp = impostors;
    g.round = {
      themeId: theme.id, themeName: theme.name, word, impostors,
      order: turnOrder(ids, impostors, rnd),
      rescue: rescueOptions(word, theme, themes, rnd).map((w) => ({ id: w.id, de: w.de, img: w.img })),
      seen: 0, turn: 0, clueRound: 1, votes: {}, voter: 0, left: g.discuss * 1000,
      tally: null, guess: null, result: null,
    };
    passTo(0);
  }

  // Pass and reveal: the seat order of the setup, so nobody has to think who is next.
  function passTo(i) {
    const p = g.players[i];
    g.round.seen = i;
    $("[data-pass-av]").src = withBase(avatarSrc(p.avatar) ?? "");
    $("[data-pass-to]").textContent = tx("passTo", { name: p.name });
    $("[data-pass-only]").textContent = tx("passOnly", { name: p.name });
    const go = $("[data-pass-go]");
    go.textContent = tx("passBtn", { name: p.name });
    go.dataset.for = "secret";
    $("[data-secret-card]").innerHTML = "";
    show("pass");
  }
  function revealSecret() {
    const p = g.players[g.round.seen];
    const imp = g.round.impostors.includes(p.id);
    $("[data-secret-card]").innerHTML = imp
      ? `<div class="hst-imp"><span class="hst-imp-mask" aria-hidden="true">🕵️</span><b>${esc(tx("youAre"))}</b>
           <span class="hst-theme-chip">${esc(tx("themeIs", { theme: g.round.themeName }))}</span><p>${esc(tx("impostorTip"))}</p></div>`
      : `<p class="hst-secret-label">${esc(tx("yourWord"))}</p>${wordCard(g.round.word, lang)}
         <span class="hst-theme-chip">${esc(tx("themeIs", { theme: g.round.themeName }))}</span><p class="hst-secret-tip">${esc(tx("wordTip"))}</p>`;
    const last = g.round.seen === g.players.length - 1;
    $("[data-hide]").textContent = tx(last ? "hideLast" : "hideBtn");
    sfx("flip");
    show("secret");
  }
  $("[data-hide]").addEventListener("click", () => {
    $("[data-secret-card]").innerHTML = "";
    sfx("click");
    if (g.round.seen < g.players.length - 1) passTo(g.round.seen + 1);
    else startClues();
  });

  /* ---------------------------------------------------------- clues ---- */
  function themeChips() {
    $$("[data-theme-chip]").forEach((el) => (el.textContent = tx("themeIs", { theme: g.round.themeName })));
  }
  function chips(list) {
    return list.map((s) => `<li>${esc(s)}</li>`).join("");
  }
  function startClues() {
    g.round.turn = 0;
    g.round.clueRound = 1;
    themeChips();
    $("[data-clue-helpers]").innerHTML = chips(redemittelFor(redemittel, "clue", g.level));
    renderTurn();
    show("clues");
  }
  function renderTurn() {
    const { order, turn, clueRound } = g.round;
    const p = playerOf(order[turn]);
    $("[data-clue-round]").textContent = g.rounds > 1 ? tx("cluesRound", { r: clueRound, n: g.rounds }) : "";
    $("[data-order]").innerHTML = order.map((id, i) => {
      const q = playerOf(id);
      return `<li class="${i < turn ? "is-done" : i === turn ? "is-now" : ""}" title="${esc(q.name)}">${avImg(q, "hst-av hst-av--s")}</li>`;
    }).join("");
    $("[data-turn-av]").src = withBase(avatarSrc(p.avatar) ?? "");
    $("[data-turn-name]").textContent = tx("turnOf", { name: p.name });
    const last = turn === order.length - 1 && clueRound === g.rounds;
    $("[data-next-turn]").textContent = tx(last ? "toDiscuss" : "nextPlayer");
    const box = $(".hst-turn");
    box.classList.remove("is-new");
    void box.offsetWidth;
    box.classList.add("is-new");
  }
  $("[data-next-turn]").addEventListener("click", () => {
    sfx("click");
    const r = g.round;
    if (r.turn < r.order.length - 1) r.turn++;
    else if (r.clueRound < g.rounds) { r.clueRound++; r.turn = 0; }
    else return startDiscuss();
    renderTurn();
    save();
  });

  /* -------------------------------------------------------- discuss ---- */
  function startDiscuss(left = g.discuss * 1000) {
    g.round.left = left;
    themeChips();
    $("[data-discuss-helpers]").innerHTML = chips(redemittelFor(redemittel, "discuss", g.level));
    show("discuss");
    runTimer();
  }
  function runTimer() {
    clearInterval(timer);
    let total = Math.max(g.round.left, g.discuss * 1000);
    let end = Date.now() + g.round.left;
    let lastSec = null;
    const fg = $("[data-ring-fg]");
    const C = 2 * Math.PI * 52;
    fg.style.strokeDasharray = String(C);
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      g.round.left = left;
      const sec = Math.ceil(left / 1000);
      $("[data-ring-left]").textContent = String(sec);
      fg.style.strokeDashoffset = String(C * (1 - left / total));
      $("[data-ring]").classList.toggle("is-low", sec <= 10);
      if (sec !== lastSec) {
        if (sec <= 5 && sec > 0) sfx(sec === 1 ? "tickLast" : "tick");
        lastSec = sec;
        if (sec % 5 === 0) save();
      }
      if (left <= 0) {
        clearInterval(timer);
        sfx("gong");
        $("[data-ring-left]").textContent = tx("timeUp");
      }
    };
    tick();
    timer = setInterval(tick, 200);
    runTimer.add = (ms) => { end += ms; total = Math.max(total, end - Date.now()); tick(); if (!timer) timer = setInterval(tick, 200); };
  }
  $("[data-more]").addEventListener("click", () => {
    sfx("click");
    if (g.round.left <= 0) { g.round.left = 30_000; runTimer(); } else runTimer.add?.(30_000);
  });
  $("[data-to-vote]").addEventListener("click", () => {
    clearInterval(timer);
    sfx("click");
    g.round.votes = {};
    g.round.voter = 0;
    if (g.vote === "group") voteScreen(null);
    else votePass(0);
  });

  /* ----------------------------------------------------------- vote ---- */
  let picked = null;
  function votePass(i) {
    const p = g.players[i];
    g.round.voter = i;
    $("[data-pass-av]").src = withBase(avatarSrc(p.avatar) ?? "");
    $("[data-pass-to]").textContent = tx("passTo", { name: p.name });
    $("[data-pass-only]").textContent = tx("passOnly", { name: p.name });
    const go = $("[data-pass-go]");
    go.textContent = tx("passBtn", { name: p.name });
    go.dataset.for = "vote";
    show("pass");
  }
  /** voter: a player, or null when the group votes once together. */
  function voteScreen(voter) {
    picked = null;
    $("[data-vote-who]").textContent = voter ? tx("voteWho", { name: voter.name }) : tx("voteGroupWho");
    $("[data-vote-grid]").innerHTML = g.players
      .filter((p) => p.id !== voter?.id)
      .map((p) => `<button type="button" class="hst-pick" data-pick="${p.id}" aria-pressed="false">${avImg(p, "hst-av hst-av--l")}<span>${esc(p.name)}</span></button>`)
      .join("");
    updateVoteBtn();
    show("vote");
  }
  function updateVoteBtn() {
    const btn = $("[data-vote-ok]");
    btn.textContent = picked ? tx("voteFor", { name: playerOf(picked).name }) : tx("voteTitle");
    setWaiting(btn, picked ? null : tx("votePick"), "[data-vote-grid]");
  }
  $("[data-vote-grid]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    picked = b.dataset.pick;
    $$("[data-pick]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    sfx("click");
    updateVoteBtn();
  });
  $("[data-vote-ok]").addEventListener("click", (e) => {
    if (e.currentTarget.getAttribute("aria-disabled") === "true" || !picked) return;
    sfx("join");
    if (g.vote === "group") {
      // One vote by the group counts as everyone's but the suspect's own.
      for (const p of g.players) if (p.id !== picked) g.round.votes[p.id] = picked;
      return reveal();
    }
    g.round.votes[g.players[g.round.voter].id] = picked;
    if (g.round.voter < g.players.length - 1) votePass(g.round.voter + 1);
    else reveal();
  });

  $("[data-pass-go]").addEventListener("click", (e) => {
    unlock();
    if (e.currentTarget.dataset.for === "vote") voteScreen(g.players[g.round.voter]);
    else revealSecret();
  });

  /* --------------------------------------------------------- reveal ---- */
  async function reveal() {
    const r = g.round;
    r.tally = tally(r.votes, r.impostors);
    const { count, top, caught } = r.tally;
    r.caught = caught;
    const max = Math.max(1, ...Object.values(count));
    $("[data-bars]").innerHTML = [...g.players]
      .sort((a, b) => (count[b.id] ?? 0) - (count[a.id] ?? 0))
      .map((p) => `<li>${avImg(p, "hst-av hst-av--s")}<span class="hst-bar-name">${esc(p.name)}</span>
        <span class="hst-bar"><span style="--w:${((count[p.id] ?? 0) / max) * 100}%"></span></span><b>${count[p.id] ?? 0}</b></li>`)
      .join("");
    const curtain = $("[data-curtain]");
    const truth = $("[data-truth]");
    const next = $("[data-reveal-next]");
    curtain.classList.remove("is-open");
    truth.innerHTML = "";
    next.hidden = true;
    show("reveal");
    sfx("drumroll");
    await wait(reduced() ? 600 : 1900);
    const accused = top.length === 1 ? playerOf(top[0]) : null;
    const imp = playerOf(r.impostors[0]);
    let html = `<p class="hst-accused">${esc(accused ? tx("mostVotes", { name: accused.name }) : top.length ? tx("tie") : tx("noVotes"))}</p>`;
    if (caught.length) {
      html += `<div class="hst-reveal-who is-caught">${avImg(imp, "hst-av hst-av--xl")}<b>${esc(tx("wasImpostor", { name: imp.name }))}</b></div>`;
    } else {
      if (accused) html += `<div class="hst-reveal-who is-innocent">${avImg(accused, "hst-av hst-av--l")}<b>${esc(tx("wasInnocent", { name: accused.name }))}</b></div>`;
      html += `<div class="hst-reveal-who is-imp">${avImg(imp, "hst-av hst-av--xl")}<b>${esc(tx("realImpostor", { name: imp.name }))}</b></div>`;
    }
    truth.innerHTML = html;
    curtain.classList.add("is-open");
    sfx(caught.length ? "correct" : "wrong");
    next.textContent = caught.length ? tx("rescueTitle") : tx("nextPlayer");
    next.hidden = false;
    save();
  }
  $("[data-reveal-next]").addEventListener("click", () => {
    sfx("click");
    if (g.round.caught.length) rescue();
    else finish(false);
  });

  /* --------------------------------------------------------- rescue ---- */
  function rescue() {
    const imp = playerOf(g.round.caught[0]);
    $("[data-rescue-who]").textContent = tx("rescueWho", { name: imp.name });
    $("[data-rescue-grid]").innerHTML = g.round.rescue
      .map((w) => `<button type="button" class="hst-pick hst-pick--word" data-guess="${w.id}">
        ${w.img ? `<img src="${withBase(w.img)}" alt="" width="72" height="72" />` : ""}<span>${esc(w.de)}</span></button>`)
      .join("");
    show("rescue");
  }
  $("[data-rescue-grid]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-guess]");
    if (!b || g.round.guess) return;
    g.round.guess = b.dataset.guess;
    finish(g.round.guess === g.round.word.id);
  });

  /* ---------------------------------------------------------- score ---- */
  function finish(guessedRight) {
    const r = g.round;
    const ids = g.players.map((p) => p.id);
    const res = settle({ ids, impostors: r.impostors, votes: r.votes, caught: r.caught ?? [], guessedRight });
    for (const p of g.players) p.score += res.points[p.id] ?? 0;
    r.result = { ...res, guessedRight };
    g.history.push({ theme: r.themeName, word: r.word.de, impostors: r.impostors, caught: (r.caught ?? []).length > 0, guessedRight, winner: res.winner });
    renderScore();
    show("score");
    if (res.winner === "gruppe") { sfx("fanfare"); if (!reduced()) confetti({ count: 90 }); } else sfx("wrong");
  }
  function renderScore() {
    const r = g.round;
    const imp = playerOf(r.impostors[0]);
    const { winner, points, guessedRight } = r.result;
    let head = `<b class="hst-win-title">${esc(tx(winner === "gruppe" ? "groupWins" : "impostorWins"))}</b>`;
    if (r.caught?.length) head += `<p>${esc(guessedRight ? tx("rescueRight", { name: imp.name }) : tx("rescueWrong", { word: r.word.de }))}</p>`;
    $("[data-win]").innerHTML = head;
    $("[data-win]").className = `hst-win hst-win--${winner}`;
    $("[data-word-out]").innerHTML = `<p class="hst-secret-label">${esc(tx("wordWas"))}</p>${wordCard(r.word, lang)}`;
    $("[data-ranks]").innerHTML = ranks(points);
  }
  function ranks(points) {
    return [...g.players].sort((a, b) => b.score - a.score)
      .map((p) => `<li>${avImg(p, "hst-av hst-av--s")}<span>${esc(p.name)}${g.round?.impostors.includes(p.id) ? ' <span aria-hidden="true">🕵️</span>' : ""}</span>
        ${points?.[p.id] ? `<small class="hst-plus">+${points[p.id]}</small>` : ""}<b>${esc(tx("points", { n: p.score }))}</b></li>`)
      .join("");
  }
  $("[data-next-round]").addEventListener("click", () => { sfx("click"); startRound(); });
  $("[data-end]").addEventListener("click", () => {
    sfx("click");
    $("[data-final]").innerHTML = ranks(null);
    show("end");
  });
  $("[data-again]").addEventListener("click", () => { newGame(); startRound(); });
  $("[data-to-start]").addEventListener("click", () => { g = null; save(); show("start"); });

  /* --------------------------------------------------------- resume ---- */
  function resume() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null"); } catch {}
    if (!saved?.round || !saved.screen) return false;
    g = saved;
    const s = g.screen;
    // A secret is never brought back on screen by a reload: back to its pass screen.
    if (s === "pass" || s === "secret") { passTo(g.round.seen); return true; }
    if (s === "clues") { themeChips(); $("[data-clue-helpers]").innerHTML = chips(redemittelFor(redemittel, "clue", g.level)); renderTurn(); show("clues"); return true; }
    if (s === "discuss") { startDiscuss(g.round.left); return true; }
    if (s === "vote") { g.vote === "group" ? voteScreen(null) : votePass(g.round.voter); return true; }
    if (s === "reveal") { reveal(); return true; }
    if (s === "rescue") { g.round.guess = null; rescue(); return true; }
    if (s === "score") { renderScore(); show("score"); return true; }
    if (s === "end") { $("[data-final]").innerHTML = ranks(null); show("end"); return true; }
    return false;
  }

  $("[data-start]").addEventListener("click", async (e) => {
    if (e.currentTarget.getAttribute("aria-disabled") === "true") return;
    unlock();
    try { await loadLevel(setup.level); } catch { $("[data-load-error]").hidden = false; return; }
    newGame();
    startRound();
  });

  mountSoundToggles(root);
  loadText(() => {});
  if (!resume()) show("start");
  // For the scripted tests: the round as the game sees it (no secrets a player could not
  // already get by looking at this phone).
  root.hst = { get game() { return g; } };
}
