// The phone side of the live quiz: /spiel. See protocol.js for the messages.
//
// A student types (or scans) the PIN, picks a nickname and the language meanings should
// appear in, and plays — no account. The phone never holds the answer: it shows the four
// options it was sent, reports a tap, and learns whether it was right at the reveal.
import { createBrowserSupabase } from "../supabase/browser.js";
import { getLang } from "../i18n.js";
import { isRtl } from "../languages.js";
import { channelName, cleanName, makeId, MEANING_LANGS, modeQuestion, OPTION_STYLES, points } from "./protocol.js";
import { countUp, flipCards, reduced, wait } from "./anim.js";
import { answerMac, hostVerifier, presenceProof } from "./secure.js";
import { loadText, t } from "./text.js";
import { animalOf, avatarSrc, drawAnimal } from "./names.js";
import { confetti, confettiShow } from "./confetti.js";
import { mountKeep } from "./keep.js";
import { flushRecords, recordRound } from "./record.js";
import { mountMusicPickers, mountSoundToggles, music, sfx, unlock, victory } from "./sound.js";
import { mascotSvg } from "../mascots.js";
import { setMarked } from "../markedText.js";
import { enhanceSwitch } from "../segSwitch.js";

const SHAPES = ["▲", "◆", "●", "■"];
const HOST_WAIT_MS = 6000; // how long "is there a host?" gets before the PIN is called wrong
const HOST_GONE_MS = 8000; // grace for a host whose tab blinked (reload, flaky Wi-Fi)
const HOST_GIVE_UP_MS = 5 * 60_000; // how long a phone waits for a host that is gone before giving up
const HOST_LEFT_MS = 2 * 60_000; // the same after the host's tab said goodbye: a reload is back in seconds
const SILENT_MS = 15000; // no beat for this long in a running game: the connection is dead, open a new one
const RETRY_AFTER_MS = 20000; // "verbinde neu …" this long: offer a button to try at once
const SEAT_KEEP_MS = 3 * 60 * 60_000; // how long a seat outlives its tab (see loadSeat)

export function mountPlayer(root) {
  const $ = (s) => root.querySelector(s);
  const screens = [...root.querySelectorAll("[data-screen]")];
  let screen = null;
  const show = (name) => {
    screen = name;
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    // Solo: a way back to the settings until the game starts; after that "Andere Wörter wählen".
    $("[data-solo-back]").hidden = !(solo && (name === "join" || name === "name"));
  };
  const form = $("[data-join]");
  const err = $("[data-join-error]");
  const banner = $("[data-banner]");

  // The meaning language: the one chosen last time, else the site's own language where
  // it is one of the five, else English. Asked only where the game has translations: in
  // solo on the join form, in a class room on the waiting screen once the roster says the
  // teacher chose a translation mode. A synonym game never asks.
  const ui = getLang();
  let lang = MEANING_LANGS.includes(ui) ? ui : "en";
  try { if (MEANING_LANGS.includes(localStorage.getItem("lq.lang"))) lang = localStorage.getItem("lq.lang"); } catch {}
  for (const name of ["lang", "waitLang"]) {
    const input = root.querySelector(`[name=${name}][value="${lang}"]`);
    if (input) input.checked = true;
  }
  const keepLang = (l) => {
    lang = l;
    if (me) me.lang = l;
    try { localStorage.setItem("lq.lang", l); } catch {}
  };
  form.addEventListener("change", (e) => { if (e.target.name === "lang") keepLang(e.target.value); });
  $("[data-wait-langs]").addEventListener("change", (e) => {
    keepLang(e.target.value);
    // The host keeps each player's language; tell it, as a join would.
    if (me?.name) ch?.track(presence());
  });

  const params = new URLSearchParams(location.search);
  if (params.get("pin")) form.pin.value = params.get("pin").replace(/\D/g, "").slice(0, 6);
  // ?test=1 is the host's test-mode preview (an iframe on /lehrkraefte/quiz): it joins
  // on its own, and its name must not overwrite the one this browser remembers.
  const testMode = params.get("test") === "1";

  /* A seat outlives the tab. It used to sit in sessionStorage, so a phone whose browser
     threw the tab away (cheap Androids do, mid-game) or a student who scanned the QR again
     started over: new seat, name step again, score 0. Now the seat (id + secret + the
     room's key) and the name are kept per PIN for a few hours, and coming back with that
     PIN goes straight into the game. The test preview keeps its own in its tab: it shares
     the teacher's browser. */
  const seatStore = () => (testMode ? sessionStorage : localStorage);
  function loadSeat(pin) {
    try {
      const s = JSON.parse(seatStore().getItem(`lq.seat.${pin}`) || sessionStorage.getItem(`lq.seat.${pin}`) || "null");
      return s?.id && Date.now() - (s.at ?? Date.now()) < SEAT_KEEP_MS ? s : null;
    } catch {
      return null;
    }
  }
  function keepSeat(pin, patch) {
    try { seatStore().setItem(`lq.seat.${pin}`, JSON.stringify({ ...loadSeat(pin), ...patch, at: Date.now() })); } catch {}
  }
  // Old games' seats go, so the store does not fill up over a school year.
  try {
    const store = seatStore();
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (!k?.startsWith("lq.seat.")) continue;
      const at = JSON.parse(store.getItem(k) || "null")?.at;
      if (at && Date.now() - at > SEAT_KEEP_MS) store.removeItem(k);
    }
  } catch {}
  // ?solo=1 is "Solo spielen" from /lehrkraefte/quiz: one person, no room. This tab builds
  // the questions itself and plays the host's part (playSolo below); the settings come in
  // the address. Only the meaning language is asked, and not for synonyms.
  const solo = params.get("solo") === "1"
    ? {
        level: params.get("level") || "A1",
        unit: params.get("set")?.startsWith("unit:") ? params.get("set").slice(5) : null,
        mode: ["synonym", "de-meaning", "meaning-de"].includes(params.get("mode")) ? params.get("mode") : "synonym",
        count: Math.min(Math.max(Number(params.get("count")) || 10, 1), 50),
        seconds: Math.min(Math.max(Number(params.get("seconds")) || 20, 5), 300),
        grammar: /^g-[a-z0-9-]+(,g-[a-z0-9-]+)*$/.test(params.get("grammar") ?? "") ? params.get("grammar") : "",
        // „Nur Grammatik“: the chapter's questions alone, no words.
        grammarOnly: params.get("only") === "grammar",
      }
    : null;
  let soloAnswer = null; // resolves the question on screen with the tapped option
  if (solo) {
    $("[data-pin-field]").hidden = true;
    $("[data-solo-langs]").hidden = solo.mode === "synonym" || solo.grammarOnly;
    const go = $("[data-join-go]");
    go.dataset.i18n = "lq.join.go";
    go.textContent = t("lq.join.go", "Los geht's");
    const title = $('[data-i18n="lq.join.title"]');
    title.dataset.i18n = "lq.solo.button";
    title.textContent = t("lq.solo.button", "Solo spielen");
    $("[data-wait-next]").hidden = true;
    $("[data-solo-next]").hidden = false;
    $("[data-solo-setup]").hidden = false;
    // Back to the setup with this game's words picked. Straight from there, Back keeps
    // everything else the teacher set too.
    const back = $("[data-solo-back]");
    const keep = new URLSearchParams();
    for (const k of ["set", "mode", "level", "grammar"]) if (params.get(k)) keep.set(k, params.get(k));
    back.href = `/lehrkraefte/quiz${keep.size ? `?${keep}` : ""}`;
    back.addEventListener("click", (e) => {
      let from = null;
      try { from = new URL(document.referrer); } catch {}
      if (from?.origin === location.origin && from.pathname.replace(/\/$/, "") === "/lehrkraefte/quiz" && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
    // Solo gets the class game's show too: the name step with its animal, music, a
    // countdown, a drumroll and the mascots at the end. No PIN, so no "Andere PIN".
    $("[data-other-pin]").hidden = true;
  }
  // The name is a step of its own, after the PIN has found a room: the field starts with
  // the name this tab used last, else an animal name ("Mutiger Fuchs"); the dice draws
  // another, typing replaces it, and an empty field falls back to the drawn animal. The
  // animal is the player's picture too: an own name keeps the last animal shown.
  const nameForm = $("[data-name-form]");
  const nameInput = nameForm.elements.name;
  let drawn = drawAnimal();
  let remembered = null;
  try { remembered = JSON.parse(sessionStorage.getItem("lq.me") ?? "null"); } catch {}
  nameInput.value = params.get("name") ? cleanName(params.get("name")) : remembered?.name || drawn.name;
  let avatar = animalOf(nameInput.value) ?? remembered?.avatar ?? drawn.animal;
  nameInput.placeholder = drawn.name;
  const showAvatar = () => {
    const src = avatarSrc(avatar);
    root.querySelectorAll("[data-name-avatar]").forEach((img) => { if (src) img.src = src; });
  };
  showAvatar();
  // One tap selects it all, so typing an own name needs no deleting first.
  nameInput.addEventListener("focus", () => nameInput.select());
  nameInput.addEventListener("input", () => {
    const a = animalOf(nameInput.value);
    if (a && a !== avatar) { avatar = a; showAvatar(); }
  });
  $("[data-reroll]").addEventListener("click", () => {
    drawn = drawAnimal(nameInput.value);
    nameInput.value = drawn.name;
    nameInput.placeholder = drawn.name;
    avatar = drawn.animal;
    showAvatar();
    sfx("click");
    const pic = $(".lq-name-pic");
    pic?.classList.remove("is-new");
    void pic?.offsetWidth;
    pic?.classList.add("is-new");
  });
  $("[data-other-pin]").addEventListener("click", () => {
    cleanup();
    show("join");
  });

  let supabase = null;
  let ch = null;
  let me = null; // { id, name, avatar, lang, pin, secret?, proof? } — name and avatar once confirmed
  const presence = () => ({ role: "player", id: me.id, name: me.name, lang: me.lang, avatar: me.avatar, ...(me.proof ? { proof: me.proof } : {}) });
  // A registered room (secure.js): only host events signed with the room's key count.
  // null for an unsigned room (an older host, or the registry not set up yet).
  let hostKey = null;
  let inbox = Promise.resolve();

  /** Asks the server for a seat. null: no registered room — play unsigned, as before.
   *  "offline": the server could not be reached at all.
   *  A failed request used to mean "unsigned" too: on a shaky connection a phone coming
   *  back took a random unsigned seat, which a registered room's host ignores. Now it
   *  tries again, and a seat it already has is good without the server (the host checks
   *  it, not the server). */
  async function requestSeat(pin) {
    const saved = loadSeat(pin);
    let reached = false;
    for (let i = 0; i < 3; i++) {
      if (i) await wait(i * 1200);
      try {
        const res = await fetch("/api/live-quiz/beitreten", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pin, ...(saved?.secret ? { id: saved.id, secret: saved.secret } : {}) }),
        });
        reached = true;
        if (res.status === 404 || res.status === 503) return null;
        if (!res.ok) continue; // busy, or the registry blinked: again
        const seat = await res.json();
        keepSeat(pin, { id: seat.id, secret: seat.secret, hostPub: seat.hostPub });
        return seat;
      } catch {}
    }
    if (saved?.secret && saved.hostPub) return { id: saved.id, secret: saved.secret, hostPub: saved.hostPub };
    return reached ? null : "offline";
  }
  let q = null; // the question on screen: { n, seconds, answered, tick }
  let hostSeen = false;
  let hostGoneTimer = null;
  let hostAway = null; // { screen, giveUp } while the host is gone: the screen to return to
  let lastHeard = 0; // Date.now() of the last host event
  let stuckJoins = 0; // reconnects in a row that never got to SUBSCRIBED
  let subscribed = false; // the current channel got through
  let gameOn = false; // a beat has come: the game runs, and silence means a dead connection
  let finished = false;
  let roomSize = 0; // players in the room, from the last roster
  // Each question as this phone saw it, with its answer and the right one: "Deine Antworten"
  // after the game (renderMine). The phone learns the right answer only at each reveal.
  let mine = [];

  const meaning = (o) => o[me.lang] ?? o.en;
  const text = (o) => (o.de != null ? o.de : meaning(o));
  const dirOf = (o) => (o.de == null && isRtl(me.lang) ? "rtl" : "ltr");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlock();
    err.textContent = "";
    if (solo) return soloName();
    const pin = form.pin.value.replace(/\D/g, "");
    if (pin.length !== 6) { err.textContent = t("lq.join.pinInvalid", "Die PIN hat 6 Ziffern."); return; }
    form.querySelector("[type=submit]").disabled = true;
    // A registered room gives the seat (id + secret) from the server. Same tab, same PIN →
    // the same seat again, so a reload keeps the score instead of starting at 0.
    const seat = await requestSeat(pin);
    if (seat === "offline") {
      err.textContent = t("lq.err.connect", "Keine Verbindung. Prüfe das Internet und versuch es noch einmal.");
      form.querySelector("[type=submit]").disabled = false;
      return;
    }
    // The same PIN again (Wieder beitreten, a reload, the QR scanned again after a drop):
    // same seat, same name — straight back into the game, no name step.
    const saved = loadSeat(pin);
    const prev = me?.pin === pin && me.name ? { name: me.name, avatar: me.avatar }
      : !testMode && saved?.name ? { name: saved.name, avatar: saved.avatar ?? null }
      : null;
    let id = seat?.id ?? null;
    if (!seat) {
      try { id = sessionStorage.getItem(`lq.id.${pin}`); } catch {}
      id ??= saved?.id ?? makeId();
      keepSeat(pin, { id });
    }
    me = { id, name: null, avatar: null, lang, pin, secret: seat?.secret ?? null, proof: seat ? await presenceProof(seat.secret) : null };
    hostKey = seat ? await hostVerifier(seat.hostPub).catch(() => null) : null;
    const ok = await connect();
    form.querySelector("[type=submit]").disabled = false;
    if (!ok) return;
    if (prev) {
      Object.assign(me, prev);
      // After a reload the page has not shown this name yet.
      root.querySelectorAll("[data-me-name]").forEach((el) => (el.textContent = me.name));
      await ch.track(presence());
      setWaiting(t("lq.wait.back", "Du bist wieder dabei!"));
      show("wait");
      requestSync();
      return;
    }
    // The room is there: now the name. The test preview takes the one in its address.
    show("name");
    if (testMode) nameForm.requestSubmit();
  });

  nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlock();
    if (solo) {
      const own = cleanName(nameInput.value);
      if (!own) { avatar = drawn.animal; showAvatar(); }
      me = { id: "solo", name: own || drawn.name, avatar, lang };
      try { sessionStorage.setItem("lq.me", JSON.stringify({ name: me.name, avatar })); } catch {}
      sfx("join");
      root.querySelectorAll("[data-me-name]").forEach((el) => (el.textContent = me.name));
      return playSolo();
    }
    if (!me || !ch) return show("join");
    const own = cleanName(nameInput.value);
    if (!own) { avatar = drawn.animal; showAvatar(); }
    me.name = own || drawn.name;
    me.avatar = avatar;
    try { if (!testMode) sessionStorage.setItem("lq.me", JSON.stringify({ name: me.name, avatar })); } catch {}
    if (!testMode) keepSeat(me.pin, { name: me.name, avatar });
    await ch.track(presence());
    sfx("join");
    root.querySelectorAll("[data-me-name]").forEach((el) => (el.textContent = me.name));
    setWaiting(t("lq.wait.lobby", "Du bist dabei! Gleich geht es los."));
    show("wait");
  });

  /** Joins the room; resolves false (with the reason on screen) when there is no host. */
  function connect() {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      openChannel({
        found: () => done(true),
        failed: () => {
          if (settled) return false;
          err.textContent = t("lq.err.connect", "Keine Verbindung. Prüfe das Internet und versuch es noch einmal.");
          cleanup();
          done(false);
          return true;
        },
      });
      setTimeout(() => {
        if (settled) return;
        err.textContent = t("lq.err.noRoom", "Zu dieser PIN läuft gerade kein Spiel. Prüfe die Zahl auf dem Beamer.");
        cleanup();
        done(false);
      }, HOST_WAIT_MS);
    });
  }

  /** The room's channel with every listener. Also for a reconnect: callbacks of a channel that
   *  has since been replaced are ignored. */
  function openChannel({ found = () => {}, failed = () => false } = {}) {
    supabase ??= createBrowserSupabase();
    const c = (ch = supabase.channel(channelName(me.pin), { config: { presence: { key: me.id } } }));
    lastHeard = Date.now();
    subscribed = false;

    c.on("presence", { event: "sync" }, () => {
      if (c !== ch) return;
      const hosted = (c.presenceState().host ?? []).length > 0;
      if (hosted) {
        hostSeen = true;
        clearTimeout(hostGoneTimer);
        hostGoneTimer = null;
        hostBack();
        found();
      } else if (hostSeen && !finished && !hostGoneTimer && !hostAway) {
        hostGoneTimer = setTimeout(hostGone, HOST_GONE_MS);
      }
    });
    // Host events: in a registered room only the ones the room's key signed, one after
    // the other in arrival order (the checks are async; the chain keeps the order).
    const fromHost = (event, handler) => c.on("broadcast", { event }, ({ payload }) => {
      if (c !== ch) return;
      const run = (p) => { lastHeard = Date.now(); hostBack(); handler(p); };
      if (!hostKey) return run(payload);
      const key = hostKey;
      inbox = inbox.then(() => key.open(event, payload)).then((p) => { if (p && key === hostKey && c === ch) run(p); }).catch(() => {});
    });
    fromHost("roster", onRoster);
    fromHost("question", onQuestion);
    fromHost("time", onTime);
    fromHost("reveal", onReveal);
    fromHost("end", onEnd);
    fromHost("beat", onBeat);
    fromHost("state", onState);
    fromHost("closed", () => stop(t("lq.err.closed", "Die Lehrkraft hat das Spiel beendet."), { ended: true }));
    // The host's tab is going away (a reload, or closed): wait for it rather than end.
    fromHost("leaving", () => { clearTimeout(hostGoneTimer); hostGone(HOST_LEFT_MS); });

    c.subscribe(async (status) => {
      if (c !== ch) return;
      if (status === "SUBSCRIBED") {
        stuckJoins = 0;
        subscribed = true;
        hideBanner();
        // Tracked again after every reconnect: presence is what keeps a seat. Not before
        // the name is confirmed: until then the phone only looks for the room.
        if (me.name) { await c.track(presence()); requestSync(); resendAnswer(); }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        subscribed = false;
        if (failed()) return;
        // The client rejoins on its own; say so meanwhile.
        showBanner(lostText());
      }
    });
  }

  /* Staying in the game. A phone used to drop out for good in two ways: the host vanished
     from presence for 8 s (the teacher's laptop slept, the Wi-Fi blinked) and the phone
     closed the room; or the phone's socket died without an error and it sat on "warte auf
     die anderen" while the class played on. Now the first waits for the host to come back,
     and the second notices the missing beat and opens a new connection — the seat (id +
     secret) is the same, so the host gives back the score. */
  function hostGone(giveUpMs = HOST_GIVE_UP_MS) {
    hostGoneTimer = null;
    if (finished || hostAway || !ch) return;
    hostAway = {
      screen,
      giveUp: setTimeout(() => stop(t("lq.err.hostLeft", "Die Lehrkraft hat das Spiel verlassen.")), giveUpMs),
    };
    show("away");
  }

  function hostBack() {
    if (!hostAway) return;
    clearTimeout(hostAway.giveUp);
    const back = hostAway.screen;
    hostAway = null;
    if (back && back !== "away") show(back);
    requestSync();
    resendAnswer();
  }

  // A new channel rides on the client's one WebSocket. After a locked screen or a network
  // switch that socket can be dead without an error, and every new channel then hangs on it:
  // a player sat 4 minutes on „verbinde neu …“ (replay 2026-10-22). From the second reconnect
  // in a row that never got through (or when the socket is already down), the socket itself
  // is replaced first.
  let resetting = false;
  async function reconnect() {
    if (solo || !me?.pin || finished || resetting) return;
    if (ch) supabase.removeChannel(ch);
    ch = null;
    showBanner(lostText());
    if (++stuckJoins >= 2 || !supabase.realtime.isConnected()) {
      resetting = true;
      await supabase.realtime.disconnect().catch(() => {});
      supabase.realtime.connect();
      resetting = false;
      if (finished) return;
    }
    openChannel();
  }

  function checkAlive() {
    if (solo || !ch || !me?.name || finished) return;
    // Before the first beat (the lobby) silence is normal: there only a channel that
    // never got through counts as dead.
    if (!gameOn && subscribed) return;
    if (Date.now() - lastHeard > SILENT_MS) reconnect();
  }
  setInterval(checkAlive, 5000);

  /* The banner. Waiting on „verbinde neu …“ with nothing to do felt like a dead end (replay
     2026-10-22: the player left). After RETRY_AFTER_MS it offers „Neu verbinden“, which
     replaces the socket at once and keeps the seat. Without network it says so. */
  const bannerMsg = $("[data-banner-msg]");
  const bannerRetry = $("[data-banner-retry]");
  let bannerTimer = null;
  const lostText = () => (navigator.onLine === false
    ? t("lq.err.offline", "Kein Internet – prüfe WLAN oder mobile Daten. Dein Platz bleibt frei.")
    : t("lq.err.reconnecting", "Verbindung verloren – verbinde neu …"));
  function offerRetry() {
    clearTimeout(bannerTimer);
    bannerRetry.hidden = true;
    bannerTimer = setTimeout(() => { if (!banner.hidden) bannerRetry.hidden = false; }, RETRY_AFTER_MS);
  }
  function showBanner(msg) {
    bannerMsg.textContent = msg;
    if (banner.hidden) { banner.hidden = false; offerRetry(); }
  }
  function hideBanner() {
    banner.hidden = true;
    clearTimeout(bannerTimer);
  }
  bannerRetry.addEventListener("click", () => {
    // A fresh socket, not one more channel on the old one (see reconnect).
    stuckJoins = Math.max(stuckJoins, 1);
    reconnect();
    bannerMsg.textContent = lostText();
    offerRetry();
  });
  // The phone knows before the socket does: Wi-Fi gone, or back (also Wi-Fi → mobile data).
  addEventListener("offline", () => {
    if (!solo && me?.pin && ch && !finished) showBanner(lostText());
  });
  addEventListener("online", () => {
    if (solo || !me?.name || finished) return;
    stuckJoins = Math.max(stuckJoins, 1);
    reconnect();
  });

  function cleanup() {
    if (ch) supabase.removeChannel(ch);
    ch = null;
    subscribed = false;
    hideBanner();
    hostSeen = false;
    gameOn = false;
    clearTimeout(hostGoneTimer);
    hostGoneTimer = null;
    if (hostAway) clearTimeout(hostAway.giveUp);
    hostAway = null;
  }

  function stop(message, { ended = false } = {}) {
    // After the podium the host closing the room is expected: keep the result on screen.
    if (finished) { cleanup(); return; }
    clearInterval(q?.tick);
    clearTimeout(hostGoneTimer);
    cleanup();
    $("[data-stop-msg]").textContent = message;
    // Rejoining makes sense only while the game may still run, not after the teacher ended it.
    $("[data-screen=stopped] [data-rejoin-same]").hidden = ended || !me?.pin;
    show("stopped");
  }

  function onRoster({ players = [], phase, translate } = {}) {
    roomSize = players.length;
    // A host from before the flag sends none: ask, as every phone used to.
    $("[data-wait-langs]").hidden = translate === false;
    const mine = players.find((p) => p.id === me.id);
    if (mine && mine.name !== me.name) {
      me.name = mine.name;
      if (!testMode) keepSeat(me.pin, { name: me.name });
      root.querySelectorAll("[data-me-name]").forEach((el) => (el.textContent = me.name));
    }
    // Joined while a question is running: it is not ours, the next one is.
    if (!q && (phase === "question" || phase === "reveal" || phase === "board")) {
      setWaiting(t("lq.wait.late", "Du bist ab der nächsten Frage dabei."));
    }
  }

  /* Catching up (host.js, "resync"): every few seconds the host says where the game stands.
     A phone that is behind — it missed a question or a reveal while its screen was off or
     its connection blinked — asks, and the host sends that event again to it alone. */
  let syncAsked = 0;
  function requestSync() {
    if (solo || !ch || !me?.name || finished) return;
    const now = Date.now();
    if (now - syncAsked < 3000) return;
    syncAsked = now;
    ch.send({ type: "broadcast", event: "sync", payload: { id: me.id } });
  }

  function onBeat({ phase, n } = {}) {
    if (finished || !me?.name) return;
    gameOn = true;
    const behind = phase === "question" ? q?.n !== n
      : phase === "reveal" || phase === "board" ? q?.n === n && !q.revealed
      : phase === "podium";
    if (behind) requestSync();
  }

  function onState({ to, event, payload } = {}) {
    if (to !== me?.id || !payload) return;
    if (event === "question") {
      if (q?.n === payload.n) return;
      onQuestion(payload);
      onTime({ n: payload.n, left: payload.left, total: payload.totalMs, paused: payload.paused });
    } else if (event === "reveal") onReveal(payload);
    else if (event === "end" && !finished) onEnd(payload);
  }

  // Back from a locked screen or another app: the game may have moved on meanwhile.
  // A connection that died meanwhile is replaced at once rather than after the next check.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    checkAlive();
    requestSync();
  });

  function setWaiting(msg) {
    $("[data-wait-msg]").textContent = msg;
  }

  function setImg(el, src) {
    el.hidden = !src;
    if (src) el.src = src;
    else el.removeAttribute("src");
  }

  function onQuestion({ n, total, mode, kind, prompt, options, seconds, img }) {
    setImg($("[data-q-img]"), img);
    clearInterval(q?.tick);
    // The prompt and options are kept for the recap after the reveal.
    // A teacher's own question brings its task ("Ergänzen Sie werden."); else the mode's.
    q = { n, seconds, answered: false, choice: null, prompt, options, kind: kind || modeQuestion(mode, t), img };
    // Question 1 again (or an earlier one): a new game, so a new list of answers.
    if (mine.length && n <= mine[mine.length - 1].n) mine = [];
    $("[data-q-n]").textContent = t("lq.q.of", "Frage {n} von {total}", { n, total });
    $("[data-q-kind]").textContent = q.kind;
    const p = $("[data-q-prompt]");
    setMarked(p, text(prompt));
    p.dir = dirOf(prompt);
    p.lang = prompt.de != null ? "de" : me.lang;
    const box = $("[data-q-options]");
    box.innerHTML = options
      .map((o, i) => `<button type="button" class="lq-opt lq-opt--${OPTION_STYLES[i]}" data-choice="${i}" lang="${o.de != null ? "de" : me.lang}"><span class="lq-shape" aria-hidden="true">${SHAPES[i]}</span><span dir="${dirOf(o)}">${escapeHtml(text(o))}</span></button>`)
      .join("");
    $("[data-q-sent]").hidden = true;
    show("question");

    // The phone's own countdown, started when the question arrived: close enough to the
    // host's for a progress bar, and the host's clock is the one that scores. The teacher
    // can stretch, shorten or pause it (onTime).
    q.total = seconds * 1000;
    q.end = performance.now() + q.total;
    q.pausedLeft = null;
    const bar = $("[data-q-bar]");
    q.tick = setInterval(() => {
      const ms = q.pausedLeft ?? Math.max(0, q.end - performance.now());
      bar.style.width = `${(ms / q.total) * 100}%`;
      if (ms <= 0) {
        clearInterval(q.tick);
        if (!q.answered) lockOptions(null);
      }
    }, 100);
  }

  /** The teacher changed the clock of the question on screen. */
  function onTime({ n, left, total, paused }) {
    if (!q || q.n !== n) return;
    q.total = total;
    q.pausedLeft = paused ? left : null;
    q.end = performance.now() + left;
    root.classList.toggle("lq-paused", !!paused);
  }

  $("[data-q-options]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-choice]");
    if (!b || !q || q.answered) return;
    const choice = Number(b.dataset.choice);
    q.answered = true;
    q.choice = choice;
    sfx("click");
    lockOptions(choice);
    if (soloAnswer) return soloAnswer(choice);
    sendAnswer(q.n, choice);
  });

  function sendAnswer(n, choice) {
    // In a registered room the answer carries a MAC from the seat's secret (secure.js).
    if (!me.secret) ch?.send({ type: "broadcast", event: "answer", payload: { id: me.id, n, choice } });
    else answerMac(me.secret, n, choice).then((mac) => ch?.send({ type: "broadcast", event: "answer", payload: { id: me.id, n, choice, mac } }));
  }
  /** Back from a gap (new connection, the host's tab reloaded): the answer may not have
   *  arrived, so it goes again. The host counts only the first per question. */
  function resendAnswer() {
    if (!solo && q?.answered && q.choice != null && !q.revealed) sendAnswer(q.n, q.choice);
  }

  function lockOptions(choice) {
    root.querySelectorAll("[data-choice]").forEach((b) => {
      b.disabled = true;
      b.classList.toggle("is-picked", Number(b.dataset.choice) === choice);
      b.classList.toggle("is-dim", choice != null && Number(b.dataset.choice) !== choice);
    });
    const sent = $("[data-q-sent]");
    // Solo: the answer is checked at once, so there is nothing to wait for.
    if (solo && choice != null) return;
    // Alone in the room there is nobody to wait for, and saying so was a small lie.
    sent.textContent = choice == null ? t("lq.q.timeUp", "Zeit ist um!")
      : testMode ? t("lq.q.sentTest", "Antwort gesendet – die Test-Bots antworten gleich.")
      : roomSize > 1 ? t("lq.q.sent", "Antwort gesendet – warte auf die anderen …")
      : t("lq.q.sentAlone", "Antwort gesendet – gleich kommt die Auflösung.");
    sent.hidden = false;
  }

  async function onReveal({ n, correct, img, results }) {
    if (!q || q.n !== n || q.revealed) return;
    q.revealed = true;
    clearInterval(q.tick);
    root.classList.remove("lq-paused");
    // The cards turn over first, as on the projector: the right one with a tick, the
    // one this player picked (if another) with a cross, the rest grey.
    $("[data-q-sent]").hidden = true;
    await flipCards([...root.querySelectorAll("[data-choice]")], correct, (card, i, right) => {
      if (!right) sfx("flip");
      card.classList.remove("is-dim");
      card.classList.add(right ? "is-right" : "is-wrong");
      if (right || i === q.choice) card.insertAdjacentHTML("beforeend", `<b class="lq-opt-count">${right ? "✓" : "✗"}</b>`);
    });
    await wait(reduced() ? 0 : 700);
    // A new question may have arrived while the cards were turning.
    if (!q || q.n !== n) return;
    renderRecap(correct);
    setImg($("[data-recap-img]"), img);
    const r = results?.[me.id];
    if (!mine.some((m) => m.n === n)) {
      mine.push({ n, kind: q.kind, prompt: q.prompt, options: q.options, img: img ?? q.img ?? null, choice: q.choice, correct, ok: !!r?.ok, points: r?.points ?? 0 });
    }
    const card = $("[data-result]");
    if (!r) {
      card.dataset.kind = "missed";
      $("[data-res-title]").textContent = t("lq.res.missed", "Diese Frage hast du verpasst.");
      $("[data-res-points]").textContent = "";
    } else {
      card.dataset.kind = r.ok ? "ok" : "wrong";
      $("[data-res-title]").textContent = r.ok ? t("lq.res.ok", "Richtig!") : r.missed ? t("lq.res.none", "Keine Antwort") : t("lq.res.wrong", "Leider falsch");
      $("[data-res-points]").textContent = "+0";
      if (r.ok) countUp($("[data-res-points]"), 0, r.points, 800, (v) => `+${v}`);
    }
    $("[data-res-score]").textContent = !r ? ""
      : solo ? t("lq.solo.score", "{score} Punkte · {right} von {n} richtig", { score: r.score, right: r.right, n: r.n })
      : t("lq.res.score", "{score} Punkte · Platz {rank}", { score: r.score, rank: r.rank });
    show("result");
    sfx(r?.ok ? "correct" : "wrong");
    if (r?.ok) confetti();
  }

  /** The question once more, with the right answer — and the player's own, if it was another. */
  function renderRecap(correct) {
    const opt = (i) => `<span class="lq-recap-opt lq-opt--${OPTION_STYLES[i]}"><span class="lq-shape" aria-hidden="true">${SHAPES[i]}</span><span dir="${dirOf(q.options[i])}" lang="${q.options[i].de != null ? "de" : me.lang}">${escapeHtml(text(q.options[i]))}</span></span>`;
    const p = $("[data-recap-q]");
    setMarked(p, text(q.prompt));
    p.dir = dirOf(q.prompt);
    p.lang = q.prompt.de != null ? "de" : me.lang;
    $("[data-recap-a]").innerHTML = Number.isInteger(correct) ? opt(correct) : "";
    const mine = $("[data-recap-mine]");
    const wrong = q.choice != null && q.choice !== correct;
    mine.hidden = !wrong;
    if (wrong) $("[data-recap-mine-opt]").innerHTML = opt(q.choice);
  }

  async function onEnd({ results, total, reveal = 0 }) {
    finished = true;
    clearInterval(q?.tick);
    // The projector is crowning the winners: this phone keeps its place to itself until then.
    if (reveal > 0 && !solo) {
      setWaiting(t("lq.end.lookUp", "Trommelwirbel … schau nach vorn! 🥁"));
      show("wait");
      await wait(reveal);
    }
    const r = results?.[me.id];
    renderMine();
    keepRecord(r, total);
    endTab("result");
    const endScreen = $("[data-screen=end]");
    endScreen.classList.toggle("is-done", !solo);
    $(".lq-end-pic").hidden = !!solo;
    $("[data-end-podium-title]").hidden = !solo;
    $("[data-end-stage]").hidden = !solo;
    $("[data-end-rank]").textContent = r ? t("lq.end.rank", "Platz {rank} von {total}", { rank: r.rank, total }) : "";
    $("[data-end-score]").textContent = r ? t("lq.end.score", "{score} Punkte", { score: r.score }) : "";
    $("[data-end-title]").textContent = r?.rank === 1 && !solo ? t("lq.end.win", "Gewonnen! 🏆") : t("lq.end.title", "Geschafft!");
    if (solo && r) $("[data-end-rank]").textContent = t("lq.solo.right", "{right} von {n} richtig", { right: r.right, n: r.n });
    // A medal for the podium places, a bounce for everyone.
    $("[data-end-medal]").textContent = !solo && r?.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : "";
    endScreen.dataset.place = solo || !r ? "" : String(Math.min(r.rank, 4));
    show("end");
    if (solo) return;
    enhanceSwitch(endTabs);
    if (r?.rank === 1) { sfx("fanfare"); confetti({ count: 180, duration: 3000 }); }
    else if (r?.rank <= 3) { sfx("correct"); confetti({ count: 70 }); }
  }

  /* The round into the learner's record on /fortschritt (record.js): solo rounds and this
     phone's place in a class game, signed in only. The end screen says where it went — or,
     signed out after a solo round, that signing in would keep it. */
  function keepRecord(r, total) {
    const note = $("[data-record-note]");
    if (!r || !mine.length || testMode) return;
    const plain = (s) => String(s ?? "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
    const round = {
      art: solo ? "solo" : "klasse",
      titel: solo ? (params.get("titel") || "") : t("lq.record.class", "Live-Quiz in der Klasse"),
      set_ref: solo ? [params.get("set"), solo.grammar].filter(Boolean).join("+") : "",
      modus: solo ? (solo.grammarOnly ? "grammatik" : solo.mode) : "",
      stufe: solo ? solo.level : "",
      richtig: mine.filter((m) => m.ok).length,
      gesamt: mine.length,
      punkte: r.score ?? 0,
      platz: solo ? undefined : r.rank,
      mitspielende: solo ? undefined : total,
      fragen: mine.map((m) => ({
        aufgabe: plain(text(m.prompt)),
        antwort: m.choice == null ? "" : plain(text(m.options[m.choice])),
        richtig: Number.isInteger(m.correct) ? plain(text(m.options[m.correct])) : "",
        ok: !!m.ok,
      })),
    };
    recordRound(round).then((saved) => {
      if (!note) return;
      if (saved) {
        note.innerHTML = `<a href="/fortschritt?ansicht=quiz">${escapeHtml(t("lq.record.saved", "In „Mein Fortschritt“ gespeichert"))} →</a>`;
        note.hidden = false;
      } else if (solo && !/(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie)) {
        note.innerHTML = `<a href="/konto">${escapeHtml(t("lq.record.signIn", "Anmelden, dann wird jede Runde in deinem Fortschritt gespeichert"))} →</a>`;
        note.hidden = false;
      }
    });
  }
  flushRecords();

  /* Ergebnis | Deine Antworten — after a solo round and after a class game alike. */
  const endTabs = $("[data-end-tabs]");
  function endTab(name) {
    endTabs.querySelectorAll("[data-end-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.endTab === name)));
    root.querySelectorAll("[data-end-panel]").forEach((p) => (p.hidden = p.dataset.endPanel !== name));
  }
  endTabs.querySelectorAll("[data-end-tab]").forEach((b) => b.addEventListener("click", () => endTab(b.dataset.endTab)));
  mountKeep($("[data-screen=end]"), { name: "quiz-ergebnis" });

  /** Every question this phone played: the task, the player's answer and, where that was
   *  wrong or missing, the right one — so the list reads as a correction sheet. */
  function renderMine() {
    endTabs.hidden = mine.length === 0;
    const right = mine.filter((m) => m.ok).length;
    $("[data-end-tab=answers]").textContent = t("lq.mine.tab", "Deine Antworten ({n})", { n: mine.length });
    $("[data-mine-stats]").innerHTML = [
      [`${right}/${mine.length}`, t("lq.mine.right", "richtig")],
      [mine.length - right, t("lq.mine.wrong", "falsch oder leer")],
      [mine.reduce((a, m) => a + m.points, 0), t("lq.mine.points", "Punkte")],
    ].map(([v, l]) => `<div><b>${escapeHtml(v)}</b><span>${escapeHtml(l)}</span></div>`).join("");
    const chip = (o, cls, mark) =>
      `<span class="lq-mine-chip ${cls}"><span aria-hidden="true">${mark}</span> <span dir="${dirOf(o)}" lang="${o.de != null ? "de" : me.lang}">${escapeHtml(text(o))}</span></span>`;
    const list = $("[data-mine-list]");
    list.innerHTML = mine.map((m, k) => {
      const yours = m.choice == null
        ? `<span class="lq-mine-chip is-none">${escapeHtml(t("lq.res.none", "Keine Antwort"))}</span>`
        : chip(m.options[m.choice], m.ok ? "is-ok" : "is-bad", m.ok ? "✓" : "✗");
      const fix = !m.ok && Number.isInteger(m.correct)
        ? `<p class="lq-mine-row"><span>${escapeHtml(t("lq.recap.correct", "Richtige Antwort"))}</span> ${chip(m.options[m.correct], "is-ok", "✓")}</p>`
        : "";
      return `
        <li class="lq-sum-item ${m.ok ? "is-good" : "is-hard"}">
          <span class="lq-sum-n">${m.n}</span>
          <div class="lq-sum-body">
            <p class="lq-sum-kind">${escapeHtml(m.kind)}</p>
            ${m.img ? `<img class="lq-sum-img" src="${escapeHtml(m.img)}" alt="" loading="lazy" />` : ""}
            <p class="lq-sum-q" data-mine-q="${k}"></p>
            <p class="lq-mine-row"><span>${escapeHtml(t("lq.recap.mine", "Deine Antwort"))}</span> ${yours}</p>
            ${fix}
          </div>
          <b class="lq-mine-pts">${m.ok ? `+${m.points}` : "0"}</b>
        </li>`;
    }).join("");
    list.querySelectorAll("[data-mine-q]").forEach((el) => {
      const m = mine[Number(el.dataset.mineQ)];
      setMarked(el, text(m.prompt));
      el.dir = dirOf(m.prompt);
      el.lang = m.prompt.de != null ? "de" : me.lang;
    });
  }

  /* Solo: this tab is the host. Same questions (questions.js), same clock and points as a
     class game; the learner taps „Weiter" instead of waiting for the projector. */
  /** Solo, step 2: the name, as in a class game — with the lobby music under it. */
  function soloName() {
    show("name");
    music("lobby");
    // Opened straight on the name (synonyms): the audio may still be locked until a tap.
    root.addEventListener("pointerdown", () => unlock(), { once: true });
    nameInput.focus({ preventScroll: true });
  }

  async function playSolo() {
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true;
    me ??= { id: "solo", name: drawn.name, avatar: drawn.animal, lang };
    let qs = [];
    try {
      if (solo.grammarOnly && solo.grammar) {
        const { grammarQuestions } = await import("./mix.js");
        qs = await grammarQuestions(solo.grammar, solo.count);
      } else if (solo.grammar) {
        const { buildQuestions } = await import("./questions.js");
        const { mixedQuestions } = await import("./mix.js");
        qs = await mixedQuestions(solo.count, solo.grammar, (n) => buildQuestions({ ...solo, count: n }));
      } else {
        const { buildQuestions } = await import("./questions.js");
        qs = buildQuestions(solo);
      }
    } catch (e) { console.error(e); }
    btn.disabled = false;
    if (!qs.length) {
      music(null);
      show("join");
      err.textContent = t("lq.solo.empty", "Für diese Auswahl gibt es keine Fragen. Wähl andere Wörter.");
      return;
    }
    finished = false;
    mine = [];
    // The countdown, as the projector does it for a class: 3 · 2 · 1, then the gong.
    show("wait");
    const waitScreen = $("[data-screen=wait]");
    waitScreen.classList.add("is-count");
    for (const c of ["3", "2", "1"]) {
      setWaiting(c);
      sfx(c === "1" ? "tickLast" : "tick");
      await wait(reduced() ? 250 : 800);
    }
    waitScreen.classList.remove("is-count");
    sfx("gong");
    let score = 0;
    let right = 0;
    for (let i = 0; i < qs.length; i++) {
      const Q = qs[i];
      const n = i + 1;
      music("question");
      // A mixed-in grammar question carries its own mode ("custom") and task line.
      const mode = Q.mode ?? solo.mode;
      onQuestion({ n, total: qs.length, mode, kind: Q.kind ?? null, prompt: Q.prompt, options: Q.options, seconds: solo.seconds, img: mode === "de-meaning" ? null : Q.img ?? null });
      const sentAt = performance.now();
      const choice = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), solo.seconds * 1000);
        soloAnswer = (c) => { clearTimeout(timer); resolve(c); };
      });
      soloAnswer = null;
      music(null);
      const ok = choice === Q.correct;
      const pts = ok ? points(performance.now() - sentAt, solo.seconds) : 0;
      score += pts;
      if (ok) right++;
      await onReveal({ n, correct: Q.correct, img: Q.img ?? null, results: { solo: { ok, points: pts, score, rank: 1, missed: choice == null, right, n } } });
      const next = $("[data-solo-next]");
      next.textContent = n === qs.length ? t("lq.solo.finish", "Ergebnis ansehen") : t("lq.solo.next", "Weiter");
      next.focus({ preventScroll: true });
      // Calm music while the result is read, as under the projector's leaderboard.
      music("board");
      await new Promise((resolve) => next.addEventListener("click", resolve, { once: true }));
    }
    music(null);
    // The drumroll before the result, then the mascots come out to cheer.
    setWaiting(t("lq.solo.drum", "Trommelwirbel … 🥁"));
    show("wait");
    sfx("drumroll");
    await wait(reduced() ? 300 : 1900);
    onEnd({ results: { solo: { score, rank: 1, right, n: qs.length } }, total: 1 });
    soloCeremony({ score, right, n: qs.length });
  }

  /* Solo's award ceremony. Alone there is nobody to beat but yourself, so the podium holds
     the player's own best rounds with these settings (same words, mode, count and time —
     otherwise the points would not compare). This round rises among them, third place
     first and the winner last, as on the projector. A first round stands alone on gold. */
  const BEST_KEY = "lq.solo.best";
  const BEST_KEEP = 10;
  let soloTimers = [];
  function soloCeremony({ score, right, n }) {
    const key = ["set", "mode", "count", "seconds", "grammar", "only"].map((k) => params.get(k) ?? "").join("|");
    let all = {};
    try { all = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") || {}; } catch {}
    const now = Date.now();
    const rounds = [...(Array.isArray(all[key]) ? all[key] : []), { score, right, n, at: now, avatar: me.avatar }]
      .sort((a, b) => b.score - a.score || a.at - b.at);
    const rank = rounds.findIndex((r) => r.at === now) + 1;
    all[key] = rounds.slice(0, BEST_KEEP);
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch {}

    const when = (at) => {
      if (at === now) return t("lq.solo.thisRound", "Diese Runde");
      const d = new Date(at);
      return new Date().toDateString() === d.toDateString()
        ? t("lq.solo.today", "Heute, {time}", { time: d.toLocaleTimeString(getLang(), { hour: "2-digit", minute: "2-digit" }) })
        : d.toLocaleDateString(getLang(), { day: "numeric", month: "short" });
    };
    const top = rounds.slice(0, 3);
    const still = reduced();
    const stage = $("[data-end-podium]");
    stage.innerHTML = [1, 0, 2]
      .filter((i) => top[i])
      .map((i) => {
        const r = top[i];
        const src = avatarSrc(r.avatar);
        return `
        <li class="lq-step lq-step--${i + 1}${r.at === now ? " is-me" : ""}${still ? "" : " is-waiting"}" data-place="${i}">
          <span class="lq-step-who">
            ${i === 0 ? '<span class="lq-crown" aria-hidden="true">👑</span>' : ""}
            ${src ? `<img class="lq-step-av" src="${src}" alt="" width="64" height="64" />` : ""}
            <span class="lq-name">${escapeHtml(when(r.at))}</span>
            <b>${escapeHtml(t("lq.end.score", "{score} Punkte", { score: r.score }))}</b>
            <small>${escapeHtml(t("lq.solo.rightShort", "{right}/{n} richtig", { right: r.right, n: r.n }))}</small>
          </span>
          <span class="lq-block">${i + 1}</span>
        </li>`;
      })
      .join("");

    $("[data-end-title]").textContent = rank === 1 && rounds.length > 1
      ? t("lq.solo.record", "Neuer Rekord! 🏆")
      : rank === 1 ? t("lq.end.title", "Geschafft!")
      : t("lq.solo.place", "Platz {rank} von {total} deiner Runden", { rank, total: rounds.length });
    // The words under the podium wait for it, so the place is not given away early.
    const screen = $("[data-screen=end]");
    screen.classList.add("is-rising");
    const finale = () => {
      screen.classList.remove("is-rising");
      screen.classList.add("is-done");
      enhanceSwitch(endTabs);
      soloCelebrate(right, n, rank === 1);
    };
    if (still) { finale(); return; }
    [2, 1, 0].filter((i) => top[i]).forEach((place, k) => {
      soloTimers.push(setTimeout(() => {
        stage.querySelector(`[data-place="${place}"]`)?.classList.remove("is-waiting");
        if (place === 0) soloTimers.push(setTimeout(finale, 700));
        else sfx("step");
      }, 300 + k * 900));
    });
  }

  /** After the ceremony: the mascots, cheering or kind, and confetti for a best round. */
  function soloCelebrate(right, n, best) {
    const share = n ? right / n : 0;
    // A new best or a perfect round gets the projector's show: fanfare, the winner's tune, confetti.
    if (best || share === 1) { sfx("fanfare"); confettiShow({ duration: 9000 }); setTimeout(victory, 1400); }
    else if (share >= 0.6) { sfx("correct"); confetti({ count: 70 }); }
    const cheer = share >= 0.6;
    const crew = $("[data-end-crew]");
    if (!crew) return;
    crew.innerHTML = mascotSvg({ name: "bruno", expr: cheer ? "celebrate" : "happy", size: 92, className: "lq-end-mascot", label: "" })
      + mascotSvg({ name: "hamsti", expr: cheer ? "celebrate" : "happy", size: 80, className: "lq-end-mascot", label: "" });
    crew.hidden = false;
    $("[data-end-cheer]").textContent = share === 1
      ? t("lq.solo.cheer.all", "Alles richtig – Bruno und Hamsti sind begeistert!")
      : cheer
        ? t("lq.solo.cheer.good", "Stark! Noch eine Runde, dann klappt alles.")
        : t("lq.solo.cheer.try", "Gut geübt! Mit jeder Runde wird es leichter.");
  }

  root.querySelectorAll("[data-rejoin]").forEach((b) => b.addEventListener("click", () => {
    finished = false;
    q = null;
    cleanup();
    if (solo) {
      const crew = $("[data-end-crew]");
      if (crew) crew.hidden = true;
      $("[data-end-cheer]").textContent = "";
      soloTimers.forEach(clearTimeout);
      soloTimers = [];
      $("[data-screen=end]").classList.remove("is-done", "is-rising");
      return playSolo();
    }
    show("join");
  }));

  // Same PIN, same seat: back into the running game with name and score.
  root.querySelectorAll("[data-rejoin-same]").forEach((b) => b.addEventListener("click", () => {
    if (!me?.pin) return show("join");
    const pin = me.pin;
    cleanup();
    show("join");
    form.pin.value = pin;
    form.requestSubmit();
  }));

  mountSoundToggles(root);
  // Music plays on a phone only in a solo game, so only there is it the player's to choose.
  if (solo) {
    root.querySelectorAll("[data-music-cycle]").forEach((b) => (b.hidden = false));
    mountMusicPickers(root);
  }
  loadText();
  show("join");
  // Solo with synonyms has nothing to ask on the first form (no language): straight to the name.
  if (solo && solo.mode === "synonym") soloName();
  // A PIN in the address (the QR code, the test preview) looks for the room at once: the
  // first screen a scanning student sees is the name, as on a game show.
  if (!solo && form.pin.value.length === 6) form.requestSubmit();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
