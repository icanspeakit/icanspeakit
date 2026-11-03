// Bruno sucht den Hochstapler, Klasse mode: the projector (/teachers/games/hochstapler).
// Messages: room.js. Secrets: crypto.js. Rules: game.js.
//
// Screens: setup → lobby (PIN + QR + who is in) → game (clues → discuss → vote → reveal →
// rescue → result, round after round) → end. Anyone can host; no login, no table: the game is
// this tab. A reload takes the same room back (sessionStorage, as the quiz's host.js does);
// „Beenden“ ends it for everyone.
//
// The projector never shows the word before the result: the Hochstapler can see it too. Only
// „Lösung zeigen“, held down, shows it to the teacher.
import QRCode from "qrcode";
import { createBrowserSupabase } from "../supabase/browser.js";
import { hostSigner, importHostKey, makeHostKey, playerChecker, playerSecret, answerMac } from "../liveQuiz/secure.js";
import { avatarSrc, animalOf, randomAnimal } from "../liveQuiz/names.js";
import { loadText } from "../liveQuiz/text.js";
import { withBase } from "../paths.js";
import { mountSoundToggles, music, preloadMusic, sfx, unlock } from "../liveQuiz/sound.js";
import { confetti } from "../liveQuiz/confetti.js";
import { reduced, wait } from "../liveQuiz/anim.js";
import { setWaiting } from "../notReady.js";
import { BEAT_MS, channelName, cleanClue, cleanName, makePin } from "./room.js";
import { loadKeys, macOk, makeKeys, pairKeys, seal, unseal } from "./crypto.js";
import {
  MAX_PLAYERS, MIN_PLAYERS, hash32, pickHochstapler, pickTheme, pickWord, redemittelFor, rescueOptions, seeded, settle, tally, turnOrder,
} from "./game.js";
import { tx } from "./strings.js";
import { avImg, esc, wordCard } from "./view.js";

const SAVE_KEY = "hst.host.game";
const SAVE_MAX_AGE = 3 * 60 * 60_000;
const FAV_KEY = "hst.host.fav";
const CLUE_DELAY_MS = 3000; // a typed clue waits this long on the teacher's side before the class sees it
const VOTE_SECONDS = 45;

export function mountHost(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const screens = $$("[data-screen]");
  const redemittel = JSON.parse(document.getElementById("hst-redemittel")?.textContent || "{}");

  let supabase = null;
  let ch = null;
  let pin = null;
  let signer = null;
  let checker = null;
  let room = null; // { roomKey, jwk } for a reload
  let keys = null; // the host's ECDH keys
  const FAREWELL = { farewell: ["leaving", {}] };

  let settings = { level: "A1", theme: "", rounds: 1, discuss: 90, typed: false };
  try { settings = { ...settings, ...JSON.parse(localStorage.getItem(FAV_KEY) || "{}") }; } catch {}
  /** id → { name, avatar, lang, pub, score, times, online } */
  const players = new Map();
  const kicked = new Set();
  const pairs = new Map(); // id → { pubKey, keys: Promise<{aes, mac}> }
  let game = { r: 0, usedWords: [], themesPlayed: {}, lastImp: [], history: [], seed: (Math.random() * 0xffffffff) >>> 0 };
  let round = null;
  let phase = "setup";
  let v = 0; // version of the public state: phones compare it with the beat
  let seatsMsg = null; // the last `round` message, for a phone that missed it
  const words = {};

  function show(name) {
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    root.dataset.screenNow = name;
  }

  async function loadLevel(level) {
    if (words[level]) return words[level];
    const res = await fetch(withBase(`/games/impostor/woerter-${level.toLowerCase()}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    words[level] = (await res.json()).themes;
    return words[level];
  }

  /* ----------------------------------------------------------- setup ---- */
  function segValue(name, val) {
    $(`[data-seg="${name}"]`)?.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(val))));
  }
  for (const key of ["level", "rounds", "discuss"]) {
    segValue(key, settings[key]);
    $(`[data-seg="${key}"]`).addEventListener("click", (e) => {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      settings[key] = typeof settings[key] === "number" ? Number(b.dataset.v) : b.dataset.v;
      segValue(key, settings[key]);
      if (key === "level") { settings.theme = ""; fillThemes(); }
    });
  }
  const typedBox = $("[data-typed]");
  typedBox.checked = settings.typed;
  typedBox.addEventListener("change", () => (settings.typed = typedBox.checked));
  const themeSel = $("[data-theme]");
  themeSel.addEventListener("change", () => (settings.theme = themeSel.value));
  async function fillThemes() {
    try {
      const themes = await loadLevel(settings.level);
      themeSel.innerHTML = `<option value="">${esc(tx("themeRandom"))}</option>` +
        themes.map((t) => `<option value="${t.id}"${t.id === settings.theme ? " selected" : ""}>${esc(t.name)}</option>`).join("");
      $("[data-load-error]").hidden = true;
    } catch (err) {
      console.error("[hochstapler] words:", err);
      $("[data-load-error]").hidden = false;
    }
  }
  $("[data-fav]").addEventListener("click", (e) => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(settings)); } catch {}
    e.currentTarget.textContent = tx("favSaved");
    sfx("click");
  });
  $("[data-open]").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    unlock();
    btn.disabled = true;
    try {
      await loadLevel(settings.level);
      await openRoom();
      phase = "lobby";
      show("lobby");
      renderLobby();
      music("lobby");
      save();
    } catch (err) {
      console.error("[hochstapler] open:", err);
      $("[data-open-error]").textContent = tx("openError");
    } finally {
      btn.disabled = false;
    }
  });

  /* ------------------------------------------------------------ room ---- */
  async function openRoom(resumed = null) {
    supabase ??= createBrowserSupabase();
    signer = checker = null;
    keys = resumed?.keys ? await loadKeys(resumed.keys) : await makeKeys();
    let registered = null;
    if (resumed?.room?.roomKey) {
      room = resumed.room;
      registered = { pin: resumed.pin, roomKey: room.roomKey };
      signer = hostSigner(await importHostKey(room.jwk), FAREWELL);
      checker = playerChecker(room.roomKey);
    } else if (!resumed) {
      try {
        const hk = await makeHostKey();
        const res = await fetch(withBase("/api/live-quiz/raum"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hostPub: hk.pub }) });
        if (res.ok) {
          registered = await res.json();
          room = { roomKey: registered.roomKey, jwk: hk.jwk };
          signer = hostSigner(hk.key, FAREWELL);
          checker = playerChecker(registered.roomKey);
        }
      } catch (err) {
        console.warn("[hochstapler] unsigned room:", err?.message || err);
      }
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      pin = resumed?.pin ?? registered?.pin ?? makePin();
      ch = supabase.channel(channelName(pin), { config: { broadcast: { self: false }, presence: { key: "host" } } });
      ch.on("broadcast", { event: "sync" }, ({ payload }) => onSync(payload));
      ch.on("broadcast", { event: "done" }, ({ payload }) => onDone(payload));
      ch.on("broadcast", { event: "clue" }, ({ payload }) => onClue(payload));
      ch.on("broadcast", { event: "vote" }, ({ payload }) => onVote(payload));
      ch.on("broadcast", { event: "guess" }, ({ payload }) => onGuess(payload));
      const taken = await new Promise((resolve, reject) => {
        let settled = false;
        ch.on("presence", { event: "sync" }, () => {
          const hosts = ch.presenceState().host ?? [];
          if (!settled && hosts.length > 1) { settled = true; resolve(true); return; }
          onPresence();
        });
        ch.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({ role: "host" });
            setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, 900);
          } else if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !settled) {
            settled = true;
            reject(new Error(status));
          }
        });
      });
      if (!taken || registered || resumed) break;
      await supabase.removeChannel(ch);
    }
    const url = `${location.origin}${withBase("/game/hochstapler")}?pin=${pin}`;
    $$("[data-pin]").forEach((el) => (el.textContent = `${pin.slice(0, 3)} ${pin.slice(3)}`));
    $$("[data-join-url]").forEach((el) => (el.textContent = `${location.host}${withBase("/game/hochstapler")}`));
    $$("[data-qr]").forEach(async (el) => (el.innerHTML = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })));
    $("[data-join-link]")?.setAttribute("href", url);
    clearInterval(beatTimer);
    beatTimer = setInterval(beat, BEAT_MS);
    onPresence();
  }

  function send(event, payload) {
    const channel = ch;
    if (!channel) return Promise.resolve();
    if (!signer) return channel.send({ type: "broadcast", event, payload });
    return signer.sign(event, payload)
      .then((wire) => channel.send({ type: "broadcast", event, payload: wire }))
      .catch((e) => console.error("[hochstapler] send failed:", e));
  }

  /* --------------------------------------------------------- players ---- */
  // A seat counts in a registered room only with the proof that binds its key to its id.
  const seatChecks = new Map();
  function trusted(m) {
    if (!m || typeof m.id !== "string" || m.id.length > 40 || !m.pub?.x || !m.pub?.y) return false;
    if (!checker) return true;
    const k = `${m.id}|${m.pub.x}|${m.proof}`;
    const st = seatChecks.get(k);
    if (st === true || st === false) return st;
    if (!st) {
      seatChecks.set(k, "pending");
      const key = room.roomKey;
      playerSecret(key, m.id)
        .then((secret) => answerMac(secret, "pub", `${m.pub.x}|${m.pub.y}`))
        .then((want) => { seatChecks.set(k, want === m.proof); if (want === m.proof) onPresence(); });
    }
    return false;
  }
  function keysFor(id) {
    const p = players.get(id);
    if (!p?.pub) return null;
    const pk = `${p.pub.x}|${p.pub.y}`;
    let e = pairs.get(id);
    if (!e || e.pubKey !== pk) {
      e = { pubKey: pk, keys: pairKeys(keys.priv, p.pub, pin, id) };
      pairs.set(id, e);
    }
    return e.keys;
  }
  function uniqueName(name, id) {
    let n = cleanName(name) || "Gast";
    const taken = (x) => [...players].some(([pid, p]) => pid !== id && p.name.toLowerCase() === x.toLowerCase());
    for (let i = 2; taken(n); i++) n = `${cleanName(name).slice(0, 13)} ${i}`;
    return n;
  }
  let rosterTimer = null;
  function onPresence() {
    if (!ch) return;
    const here = new Set();
    for (const [key, metas] of Object.entries(ch.presenceState())) {
      if (key === "host") continue;
      const m = metas.find((x) => x?.role === "player" && trusted(x));
      if (!m || kicked.has(m.id)) continue;
      here.add(m.id);
      const known = players.get(m.id);
      if (known) {
        known.online = true;
        known.lang = m.lang;
        known.pub = m.pub; // a phone that lost its key makes a new one; its next seat uses it
      } else if (players.size < MAX_PLAYERS * 3) {
        const avatar = avatarSrc(m.avatar) ? m.avatar : animalOf(m.name) ?? randomAnimal();
        players.set(m.id, { name: uniqueName(m.name, m.id), avatar, lang: m.lang, pub: m.pub, score: 0, times: 0, online: true });
        if (phase === "lobby") sfx("join");
      }
    }
    for (const [id, p] of players) if (!here.has(id)) p.online = false;
    if (phase === "lobby") renderLobby(); else if (phase !== "setup") renderGame();
    clearTimeout(rosterTimer);
    rosterTimer = setTimeout(sendRoster, 250);
  }
  function sendRoster() {
    if (!keys) return;
    send("roster", {
      players: [...players].map(([id, p]) => ({ id, name: p.name, avatar: p.avatar, score: p.score })),
      hostPub: keys.pub,
      mode: settings.typed ? "typed" : "spoken",
      level: settings.level,
    });
    save();
  }

  /* ----------------------------------------------------------- lobby ---- */
  function renderLobby() {
    const list = [...players].filter(([, p]) => p.online);
    $("[data-count]").textContent = String(list.length);
    $("[data-lobby-players]").innerHTML = list.map(([id, p]) => `
      <li data-id="${id}">${avImg(p)}
        <span class="hst-lname" data-name-of="${id}">${esc(p.name)}</span>
        <button type="button" class="hst-icon hst-mini" data-rename="${id}" aria-label="${esc(tx("rename", { name: p.name }))}" title="${esc(tx("rename", { name: p.name }))}">✎</button>
        <button type="button" class="hst-icon hst-mini" data-kick="${id}" aria-label="${esc(tx("kick", { name: p.name }))}" title="${esc(tx("kick", { name: p.name }))}">×</button>
      </li>`).join("") || `<li class="hst-empty">${esc(tx("lobbyEmpty"))}</li>`;
    const missing = MIN_PLAYERS - list.length;
    setWaiting($("[data-begin]"), missing > 0 ? tx("needPlayers", { n: missing }) : list.length > MAX_PLAYERS ? tx("full") : null, "[data-lobby-players]");
  }
  // Rename and kick work in the lobby and in the game's player list.
  root.addEventListener("click", (e) => {
    const kick = e.target.closest("[data-kick]")?.dataset.kick;
    if (kick) {
      kicked.add(kick);
      players.delete(kick);
      send("kick", { id: kick });
      sfx("click");
      if (round) round.order = round.order.filter((id) => id !== kick);
      onPresence();
      if (round && phase !== "lobby") publish();
      return;
    }
    const ren = e.target.closest("[data-rename]")?.dataset.rename;
    if (ren) {
      const span = root.querySelector(`[data-name-of="${ren}"]`);
      if (!span || span.querySelector("input")) return;
      const p = players.get(ren);
      span.innerHTML = `<input class="hst-rename" maxlength="16" value="${esc(p.name)}" aria-label="${esc(tx("rename", { name: p.name }))}" />`;
      const input = span.querySelector("input");
      input.focus();
      input.select();
      const done = () => {
        if (!players.has(ren)) return;
        p.name = uniqueName(input.value || p.name, ren);
        sendRoster();
        phase === "lobby" ? renderLobby() : renderGame();
      };
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") input.blur(); if (ev.key === "Escape") { input.value = p.name; input.blur(); } });
      input.addEventListener("blur", done, { once: true });
    }
  });
  $("[data-begin]").addEventListener("click", (e) => {
    if (e.currentTarget.getAttribute("aria-disabled") === "true") return;
    startRound();
  });

  /* ----------------------------------------------------------- round ---- */
  const inGame = () => (round?.ids ?? []).filter((id) => players.has(id));

  async function startRound() {
    const themes = await loadLevel(settings.level);
    const ids = [...players].filter(([, p]) => p.online && p.pub).map(([id]) => id).slice(0, MAX_PLAYERS);
    if (ids.length < MIN_PLAYERS) { phase = "lobby"; show("lobby"); renderLobby(); return; }
    game.r += 1;
    const rnd = seeded(hash32(`${game.seed}|${game.r}`));
    const counts = Object.fromEntries(ids.map((id) => [id, players.get(id).times]));
    const impostors = pickHochstapler(ids, counts, game.lastImp, rnd, 1);
    const theme = pickTheme(themes, settings.theme, game.themesPlayed, rnd);
    const word = pickWord(theme, game.usedWords, rnd);
    game.usedWords.push(word.id);
    game.themesPlayed[theme.id] = (game.themesPlayed[theme.id] ?? 0) + 1;
    impostors.forEach((id) => players.get(id).times++);
    game.lastImp = impostors;
    round = {
      r: game.r, ids, theme: theme.name, word, impostors,
      order: turnOrder(ids, impostors, rnd),
      rescue: rescueOptions(word, theme, themes, rnd).map((w) => ({ id: w.id, de: w.de, img: w.img })),
      turn: 0, clueRound: 1, votes: {}, clues: [], caught: [], top: [], guess: null, result: null,
      endsAt: null, total: null, pausedLeft: null,
    };
    await sendSeats();
    setPhase("clues");
    sfx("gong");
  }

  /** Each player's role, sealed for their phone alone, all the same length. */
  async function sendSeats() {
    const r = round;
    const seats = {};
    await Promise.all(r.ids.map(async (id) => {
      const k = await keysFor(id);
      if (!k) return;
      const p = players.get(id);
      const imp = r.impostors.includes(id);
      const lang = ["en", "ar", "uk", "ru", "tr", "de"].includes(p.lang) ? p.lang : "en";
      const body = imp
        ? { role: "hochstapler", theme: r.theme }
        : { role: "wort", theme: r.theme, word: { de: r.word.de, img: r.word.img, m: lang === "de" ? "" : r.word[lang] ?? r.word.en ?? "", lang } };
      seats[id] = await seal(k.aes, body, `seat|${r.r}|${id}`);
    }));
    seatsMsg = { r: r.r, seats };
    await send("round", seatsMsg);
  }

  function leftMs() {
    if (!round?.endsAt) return null;
    if (round.pausedLeft != null) return round.pausedLeft;
    return Math.max(0, round.endsAt - Date.now());
  }
  let phaseTimer = null;
  function setPhase(name, { seconds } = {}) {
    phase = name;
    clearInterval(phaseTimer);
    if (seconds) {
      round.total = seconds * 1000;
      round.endsAt = Date.now() + round.total;
      round.pausedLeft = null;
      phaseTimer = setInterval(tickPhase, 250);
    } else {
      round.endsAt = round.total = null;
    }
    music(name === "discuss" || name === "vote" ? "question" : name === "clues" ? "lobby" : null);
    show("game");
    publish();
  }
  let lastSec = null;
  function tickPhase() {
    const left = leftMs();
    const sec = Math.ceil(left / 1000);
    const el = $("[data-left]");
    if (el) el.textContent = String(sec);
    const fg = $("[data-ring-fg]");
    if (fg && round.total) fg.style.strokeDashoffset = String(2 * Math.PI * 52 * (1 - left / round.total));
    $("[data-ring]")?.classList.toggle("is-low", sec <= 10);
    if (sec !== lastSec) {
      lastSec = sec;
      if (sec <= 5 && sec > 0 && round.pausedLeft == null) sfx(sec === 1 ? "tickLast" : "tick");
    }
    if (left <= 0 && round.pausedLeft == null) {
      clearInterval(phaseTimer);
      sfx("gong");
      if (phase === "discuss") toVote();
      else if (phase === "vote") toReveal();
    }
  }

  /** The public state, as the phones get it and the projector draws it. */
  function snapshot() {
    const r = round;
    if (!r) return { phase, v };
    const voted = Object.keys(r.votes);
    const out = {
      v, r: r.r, phase, theme: r.theme, level: settings.level, order: r.order.filter((id) => players.has(id)), turn: r.turn,
      clueRound: r.clueRound, rounds: settings.rounds, typed: settings.typed,
      left: leftMs(), total: r.total, paused: r.pausedLeft != null,
      voted, clues: r.clues.filter((c) => c.shown && !c.hidden).map((c) => ({ id: c.id, text: c.text })),
      scores: Object.fromEntries([...players].map(([id, p]) => [id, p.score])),
    };
    if (phase === "vote" || phase === "reveal" || phase === "rescue" || phase === "result") {
      out.count = tally(Object.fromEntries(Object.entries(r.votes).map(([id, x]) => [id, x.target])), r.impostors).count;
    }
    if (phase === "reveal" || phase === "rescue" || phase === "result") out.reveal = { ids: r.impostors, caught: r.caught, top: r.top };
    if (phase === "rescue") out.rescue = r.rescue;
    if (phase === "result") out.result = { ...r.result, word: { de: r.word.de, img: r.word.img }, guess: r.guess };
    return out;
  }
  function publish() {
    v++;
    renderGame();
    send("phase", snapshot());
    save();
  }
  let beatTimer = null;
  function beat() {
    if (!ch || phase === "setup") return;
    send("beat", { r: round?.r ?? 0, phase, v });
  }
  const syncedAt = new Map();
  function onSync({ id } = {}) {
    if (typeof id !== "string" || !players.has(id)) return;
    const now = Date.now();
    if (now - (syncedAt.get(id) ?? 0) < 1500) return;
    syncedAt.set(id, now);
    send("state", { to: id, round: seatsMsg && round && seatsMsg.r === round.r ? seatsMsg : null, phase: snapshot() });
  }

  /* ---------------------------------------------------------- clues ---- */
  async function onDone({ id, r, turn, mac } = {}) {
    if (phase !== "clues" || !round || r !== round.r || turn !== round.turn || round.order[round.turn] !== id) return;
    const k = await keysFor(id);
    if (!k || !(await macOk(k.mac, `done|${r}|${turn}`, mac))) return;
    nextTurn();
  }
  async function onClue({ id, r, box } = {}) {
    if (phase !== "clues" || !round || r !== round.r || !settings.typed || round.order[round.turn] !== id) return;
    const k = await keysFor(id);
    if (!k) return;
    const body = await unseal(k.aes, box, `clue|${r}|${id}`);
    const text = cleanClue(body?.text);
    if (!text || round.clues.some((c) => c.id === id && c.cr === round.clueRound)) return;
    // A clue that names the word itself is held back on its own.
    const lemma = round.word.de.replace(/^(a|an) /, "").toLowerCase();
    const named = text.toLowerCase().includes(lemma.slice(0, Math.max(4, lemma.length - 2)));
    const clue = { id, cr: round.clueRound, text, shown: false, hidden: named, named, at: Date.now() };
    round.clues.push(clue);
    sfx("join");
    renderGame();
    if (!named) setTimeout(() => { if (!clue.hidden && round?.clues.includes(clue)) { clue.shown = true; publish(); } }, CLUE_DELAY_MS);
    nextTurn();
  }
  function nextTurn() {
    const r = round;
    const n = r.order.filter((id) => players.has(id)).length;
    if (r.turn < n - 1) r.turn++;
    else if (r.clueRound < settings.rounds) { r.clueRound++; r.turn = 0; }
    else return setPhase("discuss", { seconds: settings.discuss });
    sfx("click");
    publish();
  }
  function toVote() {
    setPhase("vote", { seconds: VOTE_SECONDS });
  }

  /* ----------------------------------------------------------- vote ---- */
  async function onVote({ id, r, k: n, target, mac } = {}) {
    if (phase !== "vote" || !round || r !== round.r || !round.ids.includes(id) || !players.has(target) || target === id || !Number.isSafeInteger(n)) return;
    const k = await keysFor(id);
    if (!k || !(await macOk(k.mac, `vote|${r}|${n}|${target}`, mac))) return;
    const prev = round.votes[id];
    if (prev && prev.k >= n) return;
    round.votes[id] = { k: n, target };
    sfx("click");
    publish();
    if (inGame().filter((x) => players.get(x)?.online).every((x) => round.votes[x])) setTimeout(() => phase === "vote" && toReveal(), 900);
  }
  async function toReveal() {
    clearInterval(phaseTimer);
    const r = round;
    const votes = Object.fromEntries(Object.entries(r.votes).map(([id, x]) => [id, x.target]));
    const t = tally(votes, r.impostors);
    r.caught = t.caught;
    r.top = t.top;
    phase = "reveal";
    // The phones get the drumroll at the same moment; the truth comes with the reveal phase.
    show("game");
    renderGame({ drum: true });
    send("phase", { ...snapshot(), reveal: null, drum: true });
    sfx("drumroll");
    await wait(reduced() ? 600 : 2000);
    setPhase("reveal");
    sfx(r.caught.length ? "correct" : "wrong");
  }

  /* --------------------------------------------------------- rescue ---- */
  async function onGuess({ id, r, choice, mac } = {}) {
    if (phase !== "rescue" || !round || r !== round.r || !round.caught.includes(id) || round.guess) return;
    const k = await keysFor(id);
    if (!k || !(await macOk(k.mac, `guess|${r}|${choice}`, mac))) return;
    if (!round.rescue.some((w) => w.id === choice)) return;
    finish(choice);
  }
  function finish(choice) {
    const r = round;
    r.guess = choice ?? null;
    const guessedRight = choice === r.word.id;
    const votes = Object.fromEntries(Object.entries(r.votes).map(([id, x]) => [id, x.target]));
    const res = settle({ ids: inGame(), impostors: r.impostors, votes, caught: r.caught, guessedRight });
    for (const [id, pts] of Object.entries(res.points)) if (players.has(id)) players.get(id).score += pts;
    r.result = { ...res, guessedRight };
    game.history.push({ theme: r.theme, word: r.word.de, impostors: r.impostors.map((id) => players.get(id)?.name), caught: r.caught.length > 0, guessedRight, winner: res.winner });
    setPhase("result");
    if (res.winner === "gruppe") { sfx("fanfare"); if (!reduced()) confetti({ count: 120 }); } else sfx("wrong");
    sendRoster();
  }

  /* -------------------------------------------------------- controls ---- */
  $("[data-controls]").addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    sfx("click");
    if (act === "next-turn") nextTurn();
    else if (act === "to-discuss") setPhase("discuss", { seconds: settings.discuss });
    else if (act === "more") { if (round.pausedLeft != null) round.pausedLeft += 30_000; else round.endsAt += 30_000; round.total += 30_000; publish(); }
    else if (act === "pause") {
      if (round.pausedLeft == null) round.pausedLeft = leftMs();
      else { round.endsAt = Date.now() + round.pausedLeft; round.pausedLeft = null; }
      publish();
    }
    else if (act === "to-vote") toVote();
    else if (act === "reveal") toReveal();
    else if (act === "rescue") setPhase("rescue");
    else if (act === "no-rescue") finish(null);
    else if (act === "next-round") startRound();
    else if (act === "end") endGame();
  });
  // The teacher can pick for a Hochstapler whose phone is gone.
  $("[data-main]").addEventListener("click", (e) => {
    const g = e.target.closest("[data-host-guess]")?.dataset.hostGuess;
    if (g && phase === "rescue" && !round.guess) finish(g);
    const hide = e.target.closest("[data-hide-clue]")?.dataset.hideClue;
    if (hide != null) {
      const c = round.clues[Number(hide)];
      if (c) { c.hidden = !c.hidden; if (!c.hidden) c.shown = true; publish(); }
    }
  });
  // „Lösung zeigen“: only while held, for the teacher's eyes.
  const peek = $("[data-peek]");
  const peekBox = $("[data-peek-box]");
  const peekOn = (e) => { e.preventDefault(); if (round) { peekBox.innerHTML = `${esc(round.word.de)} · 🕵️ ${esc(round.impostors.map((id) => players.get(id)?.name).join(", "))}`; peekBox.hidden = false; } };
  const peekOff = () => { peekBox.hidden = true; peekBox.textContent = ""; };
  peek.addEventListener("pointerdown", peekOn);
  ["pointerup", "pointerleave", "pointercancel", "blur"].forEach((ev) => peek.addEventListener(ev, peekOff));
  peek.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") peekOn(e); });
  peek.addEventListener("keyup", peekOff);

  /* ---------------------------------------------------------- render ---- */
  const pname = (id) => esc(players.get(id)?.name ?? "?");
  function renderGame({ drum = false } = {}) {
    if (!round || phase === "lobby" || phase === "setup") return;
    const r = round;
    $("[data-g-phase]").textContent = tx({ clues: "cluesTitle", discuss: "discussTitle", vote: "voteTitle", reveal: "revealTitle", rescue: "rescueTitle", result: "revealTitle", end: "gameOver" }[phase] ?? "cluesTitle");
    $("[data-g-round]").textContent = tx("roundN", { n: r.r });
    $("[data-g-theme]").textContent = tx("themeIs", { theme: r.theme });
    const main = $("[data-main]");
    const controls = $("[data-controls]");
    const order = r.order.filter((id) => players.has(id));
    let html = "";
    let ctl = "";
    if (phase === "clues") {
      const now = order[r.turn];
      html = `<ol class="hst-order hst-order--big">${order.map((id, i) => `<li class="${i < r.turn ? "is-done" : i === r.turn ? "is-now" : ""}">${avImg(players.get(id), "hst-av hst-av--l")}</li>`).join("")}</ol>
        <div class="hst-turn is-new">${avImg(players.get(now), "hst-av hst-turn-av")}<h2 class="hst-turn-name">${esc(tx("turnOf", { name: players.get(now)?.name ?? "" }))}</h2>
        <p class="hst-turn-say">${esc(tx(settings.typed ? "cluesType" : "cluesSay"))}</p></div>
        <ul class="hst-chips hst-chips--big">${redemittelFor(redemittel, "clue", settings.level).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        ${clueList(true)}`;
      ctl = `<button type="button" class="hst-btn hst-btn--ghost" data-act="next-turn">${esc(tx("skipTurn"))}</button>
        <button type="button" class="hst-btn hst-btn--primary" data-act="${r.turn === order.length - 1 && r.clueRound === settings.rounds ? "to-discuss" : "next-turn"}">${esc(tx(r.turn === order.length - 1 && r.clueRound === settings.rounds ? "toDiscuss" : "nextPlayer"))}</button>`;
    } else if (phase === "discuss" || phase === "vote") {
      const voting = phase === "vote";
      const count = snapshot().count ?? {};
      const max = Math.max(1, ...Object.values(count));
      html = `<div class="hst-split">
        <div class="hst-ring hst-ring--big${r.pausedLeft != null ? " is-paused" : ""}" data-ring><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="hst-ring-bg" cx="60" cy="60" r="52"/><circle class="hst-ring-fg" cx="60" cy="60" r="52" data-ring-fg style="stroke-dasharray:${2 * Math.PI * 52}"/></svg><b data-left>${Math.ceil((leftMs() ?? 0) / 1000)}</b></div>
        <div>${voting
          ? `<p class="hst-turn-say">${esc(tx("voteOnPhones"))}</p><ul class="hst-bars hst-bars--big">${order.map((id) => `<li>${avImg(players.get(id), "hst-av")}<span class="hst-bar-name">${pname(id)}${r.votes[id] ? " ✓" : ""}</span><span class="hst-bar"><span style="--w:${((count[id] ?? 0) / max) * 100}%"></span></span><b>${count[id] ?? 0}</b></li>`).join("")}</ul>`
          : `<p class="hst-turn-say">${esc(tx("discussSay"))}</p><ul class="hst-chips hst-chips--big">${redemittelFor(redemittel, "discuss", settings.level).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>${clueList(false)}`}</div></div>`;
      ctl = voting
        ? `<span class="hst-voted">${esc(tx("votedN", { n: Object.keys(r.votes).length, of: order.length }))}</span><button type="button" class="hst-btn hst-btn--primary" data-act="reveal">${esc(tx("revealNow"))}</button>`
        : `<button type="button" class="hst-btn hst-btn--ghost" data-act="pause">${esc(tx(r.pausedLeft != null ? "resume" : "pause"))}</button><button type="button" class="hst-btn hst-btn--ghost" data-act="more">${esc(tx("more30"))}</button><button type="button" class="hst-btn hst-btn--primary" data-act="to-vote">${esc(tx("toVote"))}</button>`;
    } else if (phase === "reveal") {
      const count = snapshot().count ?? {};
      const max = Math.max(1, ...Object.values(count));
      const bars = `<ul class="hst-bars hst-bars--big">${[...order].sort((a, b) => (count[b] ?? 0) - (count[a] ?? 0)).map((id) => `<li>${avImg(players.get(id), "hst-av")}<span class="hst-bar-name">${pname(id)}</span><span class="hst-bar"><span style="--w:${((count[id] ?? 0) / max) * 100}%"></span></span><b>${count[id] ?? 0}</b></li>`).join("")}</ul>`;
      if (drum) {
        html = `${bars}<div class="hst-stage hst-stage--big"><div class="hst-curtain"><span>${esc(tx("drum"))}</span></div></div>`;
      } else {
        const imp = r.impostors[0];
        const accused = r.top.length === 1 ? r.top[0] : null;
        let truth = `<p class="hst-accused">${esc(accused ? tx("mostVotes", { name: players.get(accused)?.name }) : r.top.length ? tx("tie") : tx("noVotes"))}</p>`;
        if (r.caught.length) truth += `<div class="hst-reveal-who is-caught">${avImg(players.get(imp), "hst-av hst-av--xl")}<b>${esc(tx("wasImpostor", { name: players.get(imp)?.name }))}</b></div>`;
        else {
          if (accused) truth += `<div class="hst-reveal-who is-innocent">${avImg(players.get(accused), "hst-av hst-av--l")}<b>${esc(tx("wasInnocent", { name: players.get(accused)?.name }))}</b></div>`;
          truth += `<div class="hst-reveal-who is-imp">${avImg(players.get(imp), "hst-av hst-av--xl")}<b>${esc(tx("realImpostor", { name: players.get(imp)?.name }))}</b></div>`;
        }
        html = `${bars}<div class="hst-stage hst-stage--big"><div class="hst-curtain is-open"><span>${esc(tx("drum"))}</span></div><div class="hst-truth">${truth}</div></div>`;
        ctl = r.caught.length
          ? `<button type="button" class="hst-btn hst-btn--primary" data-act="rescue">${esc(tx("rescueTitle"))}</button>`
          : `<button type="button" class="hst-btn hst-btn--primary" data-act="no-rescue">${esc(tx("toResult"))}</button>`;
      }
    } else if (phase === "rescue") {
      const imp = r.caught[0];
      html = `<h2 class="hst-h2">${esc(tx("rescueWho", { name: players.get(imp)?.name }))}</h2><p class="hst-turn-say">${esc(tx("rescueOnPhone"))}</p>
        <div class="hst-grid hst-grid--words hst-grid--big">${r.rescue.map((w) => `<button type="button" class="hst-pick hst-pick--word" data-host-guess="${w.id}">${w.img ? `<img src="${withBase(w.img)}" alt="" width="96" height="96" />` : ""}<span>${esc(w.de)}</span></button>`).join("")}</div>`;
      ctl = `<span class="hst-voted">${esc(tx("rescueHostHint"))}</span>`;
    } else if (phase === "result") {
      const { winner, points, guessedRight } = r.result;
      const imp = r.impostors[0];
      html = `<div class="hst-win hst-win--${winner}"><b class="hst-win-title">${esc(tx(winner === "gruppe" ? "groupWins" : "impostorWins"))}</b>
          ${r.caught.length ? `<p>${esc(guessedRight ? tx("rescueRight", { name: players.get(imp)?.name }) : tx("rescueWrong", { word: r.word.de }))}</p>` : ""}</div>
        <div class="hst-split"><div class="hst-word-out"><p class="hst-secret-label">${esc(tx("wordWas"))}</p>${wordCard(r.word, "de")}</div>
        <ol class="hst-ranks">${[...players].sort((a, b) => b[1].score - a[1].score).map(([id, p]) => `<li>${avImg(p, "hst-av hst-av--s")}<span>${esc(p.name)}${r.impostors.includes(id) ? " 🕵️" : ""}</span>${points[id] ? `<small class="hst-plus">+${points[id]}</small>` : "<small></small>"}<b>${esc(tx("points", { n: p.score }))}</b></li>`).join("")}</ol></div>`;
      ctl = `<button type="button" class="hst-btn hst-btn--ghost" data-act="end">${esc(tx("endGame"))}</button><button type="button" class="hst-btn hst-btn--primary" data-act="next-round">${esc(tx("nextRound"))}</button>`;
    }
    main.innerHTML = html;
    controls.innerHTML = ctl;
    if (phase === "discuss" || phase === "vote") tickPhase();
    renderSide();
  }
  function clueList(withHide) {
    const list = round.clues;
    if (!settings.typed || !list.length) return "";
    return `<ul class="hst-clues-list">${list.map((c, i) => {
      if (!withHide && (c.hidden || !c.shown)) return "";
      const state = c.hidden ? (c.named ? tx("clueNamed") : tx("clueHidden")) : c.shown ? "" : tx("clueWaiting");
      return `<li class="${c.hidden ? "is-hidden" : ""}">${avImg(players.get(c.id), "hst-av hst-av--s")}<span><b>${pname(c.id)}:</b> ${c.hidden ? `<i>${esc(state)}</i>` : esc(c.text)}${!c.hidden && state ? ` <small>${esc(state)}</small>` : ""}</span>
        ${withHide ? `<button type="button" class="hst-btn hst-btn--ghost hst-btn--sm" data-hide-clue="${i}">${esc(tx(c.hidden ? "clueShow" : "clueHide"))}</button>` : ""}</li>`;
    }).join("")}</ul>`;
  }
  function renderSide() {
    $("[data-side]").innerHTML = [...players].map(([id, p]) => `
      <li class="${p.online ? "" : "is-off"}">${avImg(p, "hst-av hst-av--s")}<span class="hst-lname" data-name-of="${id}">${esc(p.name)}</span><b>${p.score}</b>
        <button type="button" class="hst-icon hst-mini" data-rename="${id}" aria-label="${esc(tx("rename", { name: p.name }))}">✎</button>
        <button type="button" class="hst-icon hst-mini" data-kick="${id}" aria-label="${esc(tx("kick", { name: p.name }))}">×</button></li>`).join("");
  }

  /* -------------------------------------------------------------- end ---- */
  let ending = false;
  $("[data-quit]").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (!ending) { ending = true; b.textContent = tx("quitSure"); setTimeout(() => { ending = false; b.textContent = tx("quit"); }, 4000); return; }
    endGame(true);
  });
  function endGame(closeRoom = false) {
    clearInterval(phaseTimer);
    phase = "end";
    $("[data-final]").innerHTML = [...players].sort((a, b) => b[1].score - a[1].score)
      .map(([, p], i) => `<li>${i === 0 ? "🏆 " : ""}${avImg(p, "hst-av hst-av--s")}<span>${esc(p.name)}</span><b>${esc(tx("points", { n: p.score }))}</b></li>`).join("");
    $("[data-history]").innerHTML = game.history.map((h, i) => `<li>${esc(tx("roundN", { n: i + 1 }))}: ${esc(h.theme)} · <b>${esc(h.word)}</b> · 🕵️ ${esc(h.impostors.join(", "))} · ${esc(tx(h.winner === "gruppe" ? "groupWins" : "impostorWins"))}</li>`).join("");
    $("[data-summary]").innerHTML = redemittelSummary();
    show("end");
    music(null);
    if (closeRoom) close();
    else { send("phase", { v: ++v, phase: "end", r: round?.r ?? 0, scores: Object.fromEntries([...players].map(([id, p]) => [id, p.score])) }); save(); }
  }
  function redemittelSummary() {
    const lists = [["summaryClue", redemittelFor(redemittel, "clue", settings.level)], ["summaryDiscuss", redemittelFor(redemittel, "discuss", settings.level)]];
    return lists.map(([k, l]) => `<div><h4>${esc(tx(k))}</h4><ul>${l.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`).join("");
  }
  function close() {
    send("closed", {});
    forget();
    setTimeout(() => { if (ch) supabase.removeChannel(ch); ch = null; }, 600);
  }
  $("[data-end-close]").addEventListener("click", () => { close(); location.href = location.pathname; });
  $("[data-end-again]").addEventListener("click", () => {
    for (const p of players.values()) { p.score = 0; p.times = 0; }
    game = { r: 0, usedWords: [], themesPlayed: {}, lastImp: [], history: [], seed: (Math.random() * 0xffffffff) >>> 0 };
    round = null;
    phase = "lobby";
    show("lobby");
    renderLobby();
    send("phase", { v: ++v, phase: "lobby", r: 0 });
    sendRoster();
  });

  /* ---------------------------------------------------- save / resume ---- */
  function save() {
    if (!pin || phase === "setup") return;
    const data = {
      at: Date.now(), pin, room, keys: keys?.jwk, settings, game, round, phase, v, seatsMsg,
      players: [...players].map(([id, p]) => [id, { name: p.name, avatar: p.avatar, lang: p.lang, pub: p.pub, score: p.score, times: p.times }]),
      kicked: [...kicked],
      left: leftMs(),
    };
    try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
  }
  function forget() { try { sessionStorage.removeItem(SAVE_KEY); } catch {} }
  async function resume() {
    let s = null;
    try { s = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null"); } catch {}
    if (!s?.pin || Date.now() - s.at > SAVE_MAX_AGE) { forget(); return false; }
    settings = { ...settings, ...s.settings };
    game = s.game;
    round = s.round;
    v = s.v ?? 0;
    seatsMsg = s.seatsMsg;
    for (const [id, p] of s.players ?? []) players.set(id, { ...p, online: false });
    for (const id of s.kicked ?? []) kicked.add(id);
    await loadLevel(settings.level).catch(() => {});
    await openRoom({ pin: s.pin, room: s.room, keys: s.keys });
    phase = s.phase;
    if (phase === "lobby") { show("lobby"); renderLobby(); return true; }
    if (phase === "end") { endGame(); return true; }
    if (round && (phase === "discuss" || phase === "vote") && s.left != null) {
      // The clock goes on where it stood (minus nothing: a reload takes seconds).
      round.endsAt = Date.now() + s.left;
      clearInterval(phaseTimer);
      phaseTimer = setInterval(tickPhase, 250);
    }
    show("game");
    publish();
    if (seatsMsg) send("round", seatsMsg);
    return true;
  }
  addEventListener("pagehide", () => {
    if (!ch) return;
    save();
    ch.send({ type: "broadcast", event: "leaving", payload: signer ? signer.farewell ?? {} : {} });
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });

  mountSoundToggles(root);
  preloadMusic();
  loadText(() => {});
  show("setup");
  fillThemes();
  resume().then((ok) => { if (!ok) show("setup"); }).catch((err) => { console.error("[hochstapler] resume:", err); forget(); show("setup"); });
  // For the scripted tests.
  root.hst = { get pin() { return pin; }, get round() { return round; }, get phase() { return phase; }, get players() { return players; } };
}
