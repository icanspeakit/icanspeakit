// The projector side of the live quiz: /teachers/quiz. See protocol.js for the
// messages and why the host holds all the state.
//
// Screens, in order: setup → lobby (PIN + QR + who is in) → question → reveal →
// leaderboard → (next question …) → podium. Anyone can host; there is no login and no
// database — the game is this tab. A reload resumes it (save/resume below: same PIN, same
// scores); closing the tab leaves the phones waiting, and „Beenden“ ends it for everyone.
//
// The one exception is "Eigenes Quiz": a signed-in teacher's own quiz for a chapter
// (custom.js), loaded from their account and then played exactly like the vocabulary
// quiz. Its questions carry their own mode and "kind" (the line above the prompt).
import QRCode from "qrcode";
import { createBrowserSupabase } from "../supabase/browser.js";
import { channelName, makePin, modeQuestion, points, OPTION_STYLES } from "./protocol.js";
import { hostSigner, importHostKey, makeHostKey, playerChecker } from "./secure.js";
import { loadText, t } from "./text.js";
import { isRtl } from "../languages.js";
import { countUp, flipCards, reduced, slideRanks, wait } from "./anim.js";
import { createRuleIntro } from "../ruleIntro.js";
import { enhanceSwitch } from "../segSwitch.js";
import { mountMusicPickers, mountSoundToggles, music, preloadMusic, sfx, stopVictory, unlock, victory } from "./sound.js";
import { animalOf, avatarSrc, randomAnimal } from "./names.js";
import { confetti, confettiShow } from "./confetti.js";
import { mountKeep } from "./keep.js";
import { intent } from "../intent.js";
import { mascotSvg } from "../mascots.js";
import { setMarked } from "../markedText.js";

const SHAPES = ["▲", "◆", "●", "■"];
/** Shows `src` in an <img>, or hides it. */
function setImg(el, src) {
  el.hidden = !src;
  if (src) el.src = src;
  else el.removeAttribute("src");
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** A player's animal as an <img>, or nothing for an animal this page does not know. */
const avatarImg = (animal, cls = "lq-av") => {
  const src = avatarSrc(animal);
  return src ? `<img class="${cls}" src="${src}" alt="" width="48" height="48" />` : "";
};

export function mountHost(root) {
  const $ = (s) => root.querySelector(s);
  const screens = [...root.querySelectorAll("[data-screen]")];
  const show = (name) => {
    screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
    save();
    syncTempo?.(name);
    followPhase?.();
    music(SCREEN_MUSIC[name] ?? null);
  };
  // The projector's music follows the screen: calm while people join and read the
  // ranking, driving while a question runs, quiet for the reveal and the podium.
  const SCREEN_MUSIC = { lobby: "lobby", question: "question", board: "board" };
  let syncTempo = null;
  let followPhase = null;

  const form = $("[data-setup]");
  const setSel = $("[data-set]");
  const shownLang = () => $("[data-show-lang]").value;

  let supabase = null;
  let ch = null;
  let pin = null;
  // A registered room (secure.js): host events are signed, answers and seats are checked.
  // All three stay null for an unsigned room (registry not set up yet, or offline).
  let signer = null;
  let checker = null;
  // What a reload needs to take the room back: { roomKey, jwk } (the signing key's private half).
  let room = null;
  // Sent on pagehide instead of "closed": the phones wait for the tab to come back.
  const FAREWELL = { farewell: ["leaving", {}] };
  let questions = [];
  let settings = null;
  let qi = -1;
  /** Each question as it was played, for the look back after the podium (renderRecap). */
  let played = [];
  // The clock of the question on screen. `total` and `end` move when the teacher changes
  // the tempo mid-question; `pausedLeft` holds the time left while paused.
  let current = null; // { n, total, end, pausedLeft, answers: Map, eligible: Set, tick, done }
  let phase = "setup";
  /** id → { name, avatar, lang, score, online, bot? } */
  const players = new Map();
  // Test mode: one person runs a whole game alone. The phone preview is a real /game
  // page in an iframe (its own Realtime client, so the wire is tested too); the bots
  // live only here and answer through the same onAnswer() a phone's broadcast reaches.
  const BOT_COUNT = 3;
  let botTimers = [];
  let questionsModule = null;

  // The lexicon is 2 MB; start fetching it while the teacher is still choosing.
  const loadQuestions = () => (questionsModule ??= import("./questions.js"));
  setTimeout(loadQuestions, 300);

  /* ------------------------------------------------------------ source ---- */
  // Vocabulary drawn by the settings, or the teacher's own saved quiz.
  const own = () => form.source.value === "own";
  // Zufallsmix: a level only; words and grammar of that whole level.
  const random = () => form.source.value === "random";
  const randomPick = () => form.querySelector("[name=randomLevel]:checked");
  // Nur Grammatik: one chapter's questions, no words (from a grammar topic page).
  const grammarOnly = () => form.source.value === "grammar";
  // Wortschatz + Grammatik: half the questions from a chapter, taking turns with the words.
  const mixed = () => form.source.value === "mix";
  // Nur Wortschatz: a chapter picked earlier is kept for switching back, but not asked.
  const vocabOnly = () => form.source.value === "vocab";
  const wantGrammar = new URLSearchParams(location.search).get("grammar");
  let customModule = null;
  const loadCustom = () => (customModule ??= import("./custom.js"));
  let ownQuizzes = null; // null until loaded
  const ownSel = $("[data-own-select]");
  const ownNote = $("[data-own-note]");
  const ownQuiz = () => ownQuizzes?.find((q) => q.id === ownSel.value) ?? null;
  const wantQuiz = new URLSearchParams(location.search).get("quiz");
  // The form offers Wortschatz and Zufallsmix; a saved quiz only comes in from the builder.
  if (wantQuiz) {
    $("[data-own-choice]").hidden = false;
    form.source.value = "own";
  }

  async function loadOwn() {
    if (ownQuizzes) return;
    const { currentUser, listQuizzes } = await loadCustom();
    const user = await currentUser();
    const next = encodeURIComponent(location.pathname + location.search);
    if (!user) {
      ownSel.innerHTML = "";
      ownNote.innerHTML = t("lq.src.signin", "Eigene Quizze sind in deinem Konto gespeichert. <a href=\"{href}\">Anmelden</a>, um sie hier zu starten.", { href: `/anmelden?next=${next}` });
      return;
    }
    try {
      ownQuizzes = await listQuizzes();
    } catch (err) {
      console.error(err);
      ownNote.textContent = t("lq.src.loadError", "Deine Quizze konnten nicht geladen werden.");
      return;
    }
    ownSel.innerHTML = ownQuizzes.map((q) => `<option value="${q.id}">${esc(q.title)} · ${esc(t("qb.mine.count", "{n} Fragen", { n: q.questions?.length ?? 0 }))}</option>`).join("");
    ownSel.disabled = ownQuizzes.length === 0;
    if (wantQuiz && ownQuizzes.some((q) => q.id === wantQuiz)) ownSel.value = wantQuiz;
    if (!ownQuizzes.length) ownNote.textContent = t("lq.src.none", "Du hast noch kein eigenes Quiz. Stell eins für ein Kapitel zusammen — das dauert ein paar Minuten.");
    syncHint();
  }
  ownSel.addEventListener("change", () => syncHint());

  // Synonyms: a whole level asks the level's synonym list, a Lernset its own words.
  // They are German on both sides, so there is no translation language to choose.
  const syncHint = () => {
    const isOwn = own();
    root.querySelectorAll("[data-vocab-only]").forEach((el) => (el.hidden = isOwn));
    root.querySelectorAll("[data-own-only]").forEach((el) => (el.hidden = !isOwn));
    root.querySelectorAll("[data-random-only]").forEach((el) => (el.hidden = !random()));
    if (!isOwn) root.querySelectorAll("[data-pick-only]").forEach((el) => (el.hidden = random()));
    // After the two lines above, which would show the words again.
    if (grammarOnly()) root.querySelectorAll("[data-words-only]").forEach((el) => (el.hidden = true));
    $("[data-grammar-hint]").hidden = !$("[data-grammar]").value || !mixed();
    // Both lines stay in view, the one the round does not ask greyed out: Grammatik on
    // „Nur Wortschatz“, Wortschatz on „Nur Grammatik“. A click on it makes the round the mix.
    $("[data-grammar-row]").classList.toggle("is-off", vocabOnly());
    $("[data-vocab-row]").classList.toggle("is-off", grammarOnly());
    // The list marks „Kein Wortschatz“ on „Nur Grammatik“, the kept set otherwise.
    root.querySelectorAll("[data-vocab-side] [data-pick]:not(.ls-search-row)").forEach((r) =>
      r.classList.toggle("active", grammarOnly() ? r.dataset.pick === "none" : r.dataset.pick === setSel.value));
    if (isOwn) {
      loadOwn();
      const q = ownQuiz();
      $("[data-own-edit]").hidden = !q;
      if (q) $("[data-own-edit]").href = `/teachers/quiz/create?id=${q.id}`;
      // Only a quiz with Lernset words shows translations on this screen.
      $("[data-show-lang-field]").hidden = !(q && q.questions?.some((x) => x?.t === "word"));
      $("[data-set-hint]").hidden = true;
      return;
    }
    const synonym = form.mode.value === "synonym";
    // A Lernset is asked from its own words now (questions.js), so the old "synonyms are
    // per level" note no longer applies.
    $("[data-set-hint]").hidden = true;
    $("[data-show-lang-field]").hidden = synonym || grammarOnly();
  };
  form.addEventListener("change", syncHint);
  syncHint();

  /* ------------------------------------------------------------- vocab ---- */
  // The Wortschatz side nav beside the form, a bottom sheet on a phone. The Wortschatz
  // line opens it; a pick writes the hidden input and puts the list away again.
  const vocabBtn = $("[data-vocab-toggle]");
  const vocabPick = $("[data-vocab-side]");
  const vocabScrim = $("[data-vocab-scrim]");
  const picker = vocabPick.querySelector(".ls-nvb");
  const wide = matchMedia("(min-width: 1001px)");
  const setVocabOpen = (open) => {
    if (wide.matches) { picker.lernsetFold?.set(!open); return; }
    vocabPick.classList.toggle("is-open", open);
    vocabScrim.hidden = !open;
    document.documentElement.classList.toggle("lq-sheet-open", open);
  };
  // On a desktop the line toggles: a second click folds the column back to its rail.
  // A greyed-out line switches the round to „Wortschatz + Grammatik“ instead of opening.
  const switchOn = (btn) => {
    form.source.value = "mix";
    syncHint();
    btn.classList.remove("is-picked");
    void btn.offsetWidth;
    btn.classList.add("is-picked");
  };
  vocabBtn.addEventListener("click", (e) => {
    if (!grammarOnly()) return;
    e.stopImmediatePropagation();
    switchOn(vocabBtn);
  });
  vocabBtn.addEventListener("click", () => setVocabOpen(wide.matches ? picker.lernsetFold?.folded ?? true : true));
  vocabScrim.addEventListener("click", () => setVocabOpen(false));
  $("[data-vocab-close]").addEventListener("click", () => setVocabOpen(false));
  wide.addEventListener("change", () => { if (wide.matches) setVocabOpen(false); });
  vocabPick.addEventListener("lernset-pick", (e) => {
    const { value, level, name } = e.detail;
    // „Kein Wortschatz“: the round is grammar only; the set stays kept for switching back.
    if (value === "none") {
      form.source.value = "grammar";
      setVocabOpen(false);
      syncHint();
      if (!$("[data-grammar]").value) setGrammarOpen(true);
      return;
    }
    // A set picked on „Nur Grammatik“ is asking for the mix.
    if (grammarOnly()) form.source.value = "mix";
    setSel.value = value;
    setSel.dataset.level = level;
    $("[data-vocab-level]").textContent = level;
    const nameEl = $("[data-vocab-name]");
    // The row's own words, already in the page language; the key would put the
    // whole-level text back on the next language switch.
    nameEl.removeAttribute("data-i18n");
    nameEl.textContent = name;
    setVocabOpen(false);
    syncHint();
    // Confirm the choice where the form is: a short flash and a tick on the line.
    vocabBtn.classList.remove("is-picked");
    void vocabBtn.offsetWidth;
    vocabBtn.classList.add("is-picked");
    vocabBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Back where the sheet was opened from; on a desktop the list simply folds.
    if (!wide.matches) vocabBtn.focus();
  });

  // ?set=unit:a2-26 (&mode=synonym): arriving from a Lernset page ("Als Live-Quiz
  // spielen"), the set is already chosen — the same as a click on its row.
  {
    const params = new URLSearchParams(location.search);
    const want = params.get("set");
    const find = () => (want && !wantQuiz ? vocabPick.querySelector(`[data-pick="${CSS.escape(want)}"]:not(.ls-search-row)`) : null);
    const pickRow = (row) => {
      vocabPick.querySelectorAll("[data-pick].active").forEach((r) => r.classList.remove("active"));
      row.classList.add("active");
      vocabPick.dispatchEvent(new CustomEvent("lernset-pick", { detail: { value: want, level: row.dataset.level, name: row.dataset.name ?? row.querySelector("[data-i18n]")?.textContent.trim() ?? "" } }));
    };
    const row = find();
    if (row) pickRow(row);
    // ?set=kartenset:<id> (from the teacher's card sets): Meine Kartensets is filled in the
    // browser after the session is read (LernsetPicker), so its row comes a moment later.
    else if (want?.startsWith("kartenset:") && !wantQuiz) {
      const watch = new MutationObserver(() => {
        const late = find();
        if (late) { watch.disconnect(); pickRow(late); }
      });
      watch.observe(vocabPick, { childList: true, subtree: true });
      setTimeout(() => watch.disconnect(), 15000);
    }
    // A frequency round ("Nach Häufigkeit") has no row in the picker, which lists topics
    // only: its page sends the name and a level along (&name=, &level=, DeckActions.astro).
    else if (want?.startsWith("unit:haeufigkeit-") && !wantQuiz && params.get("name")) {
      vocabPick.dispatchEvent(new CustomEvent("lernset-pick", { detail: { value: want, level: params.get("level") || "A1", name: params.get("name") } }));
    }
    const mode = params.get("mode");
    if (mode && form.querySelector(`[name=mode][value="${CSS.escape(mode)}"]`)) { form.mode.value = mode; syncHint(); }
  }

  /* ----------------------------------------------------------- grammar ---- */
  // The mirror on the right: the same column and sheet, picking one grammar chapter (or
  // none) whose questions take turns with the words (mix.js).
  const grammarIn = $("[data-grammar]");
  const grammarBtn = $("[data-grammar-toggle]");
  const grammarSide = $("[data-grammar-side]");
  const grammarScrim = $("[data-grammar-scrim]");
  const grammarNav = grammarSide.querySelector("[data-gp]");
  const setGrammarOpen = (open) => {
    if (wide.matches) { grammarNav.grammarFold?.set(!open); return; }
    grammarSide.classList.toggle("is-open", open);
    grammarScrim.hidden = !open;
    document.documentElement.classList.toggle("lq-sheet-open", open);
  };
  grammarBtn.addEventListener("click", (e) => {
    if (!vocabOnly()) return;
    e.stopImmediatePropagation();
    switchOn(grammarBtn);
    // No chapter kept from before: the mix needs one, so the list opens right away.
    if (!grammarIn.value) setGrammarOpen(true);
  });
  grammarBtn.addEventListener("click", () => setGrammarOpen(wide.matches ? grammarNav.grammarFold?.folded ?? true : true));
  grammarScrim.addEventListener("click", () => setGrammarOpen(false));
  $("[data-grammar-close]").addEventListener("click", () => setGrammarOpen(false));
  wide.addEventListener("change", () => { if (wide.matches) setGrammarOpen(false); });
  grammarSide.addEventListener("grammar-pick", (e) => {
    const { slug, level, name } = e.detail;
    grammarIn.value = slug;
    const badge = $("[data-grammar-level]");
    badge.textContent = level;
    badge.hidden = !slug;
    const nameEl = $("[data-grammar-name]");
    const change = $("[data-grammar-change]");
    if (slug) {
      nameEl.removeAttribute("data-i18n");
      nameEl.textContent = name;
      change.dataset.i18n = "lq.host.change";
      change.textContent = t("lq.host.change", "Ändern");
    } else {
      nameEl.dataset.i18n = "lq.host.grammarNoneRow";
      nameEl.textContent = t("lq.host.grammarNoneRow", "Keine – nur Wortschatz");
      change.dataset.i18n = "lq.host.grammarAdd";
      change.textContent = t("lq.host.grammarAdd", "Dazunehmen");
    }
    grammarBtn.classList.toggle("has-pick", !!slug);
    // Picking a chapter while on „Nur Wortschatz“ is asking for the mix.
    if (slug && vocabOnly()) form.source.value = "mix";
    // And „Keine Grammatik“ while on the mix is asking for words only.
    if (!slug && (mixed() || grammarOnly())) form.source.value = "vocab";
    $("[data-grammar-hint]").hidden = !slug || !mixed();
    syncHint();
    setGrammarOpen(false);
    grammarBtn.classList.remove("is-picked");
    void grammarBtn.offsetWidth;
    grammarBtn.classList.add("is-picked");
    if (!wide.matches) grammarBtn.focus();
  });

  // ?grammar=g-aduso: arriving from a grammar topic page, the round is that chapter only —
  // the same as choosing „Nur Grammatik“ and clicking its row. With ?mix (back from the
  // Arbeitsmappe with a Lernset too) the chapter joins the words instead.
  {
    const row = wantGrammar && !wantQuiz ? grammarNav.querySelector(`[data-gp-pick="${CSS.escape(wantGrammar)}"]`) : null;
    if (row) {
      form.source.value = new URLSearchParams(location.search).has("mix") ? "mix" : "grammar";
      grammarNav.querySelectorAll("[data-gp-pick]").forEach((r) => r.classList.toggle("active", r === row));
      grammarSide.dispatchEvent(new CustomEvent("grammar-pick", { detail: { slug: wantGrammar, level: row.dataset.level ?? "", name: row.querySelector("[data-gp-name]")?.textContent.trim() ?? "" } }));
      syncHint();
    }
  }

  // The mix needs a chapter. Without one (the browser restored the radio on reload) the
  // round is words only, so say so: back to „Nur Wortschatz“.
  if (mixed() && !grammarIn.value) {
    form.source.value = "vocab";
    syncHint();
  }
  // Choosing „Wortschatz + Grammatik“ with no chapter yet opens the chapter list.
  form.querySelectorAll("[name=source]").forEach((r) =>
    r.addEventListener("change", () => {
      if (mixed() && !grammarIn.value && (!wide.matches || (grammarNav.grammarFold?.folded ?? true))) grammarBtn.click();
    }),
  );

  // The Wortschatz tour, once per browser (?intro replays it without spending that).
  // The column starts folded here, so it is the grammar-page telling: the cursor opens
  // the list from the Wortschatz line, names it, then folds it back and lights the line.
  // On a phone the list is a sheet, so the tour just lights the line (one beat).
  const TOUR_SEEN = "da-lq-lernsets-seen";
  const tourForced = new URLSearchParams(location.search).has("intro");
  let tourSeen = false;
  try { tourSeen = localStorage.getItem(TOUR_SEEN) === "1"; } catch {}
  // Not when the page opens on a teacher's own quiz: the Wortschatz list is hidden there.
  const ownFirst = new URLSearchParams(location.search).has("quiz") || grammarOnly();
  if ((tourForced || !tourSeen) && !ownFirst && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (!tourForced) { try { localStorage.setItem(TOUR_SEEN, "1"); } catch {} }
    const compact = !wide.matches;
    const intro = createRuleIntro({
      mascot: "bruno",
      ruleEl: compact ? vocabBtn : vocabPick,
      ruleBtn: vocabBtn,
      ruleCard: compact ? null : vocabPick,
      setRule: (hidden) => setVocabOpen(!hidden),
      compact,
      coach: compact
        ? [["intro.lqSetsCompact.title", "intro.lqSetsCompact.text"]]
        : [["intro.lqSets.title", "intro.lqSets.text"], ["intro.lqSetsAway.title", "intro.lqSetsAway.text"]],
    });
    requestAnimationFrame(() => intro.play());
  }

  /* ------------------------------------------------------- custom values ---- */
  // The "Eigene" pill holds a number box: typing in it chooses it, and a pill chosen
  // with an empty box puts the cursor there.
  form.querySelectorAll(".lq-custom").forEach((pill) => {
    const radio = pill.querySelector("[type=radio]");
    const box = pill.querySelector("[type=number]");
    box.addEventListener("input", () => { radio.checked = true; });
    box.addEventListener("focus", () => { radio.checked = true; });
    radio.addEventListener("change", () => { if (!box.value) box.focus(); });
  });
  /** A pill's value, or its box's number held to the box's own min and max. */
  const pick = (fd, name, fallback) => {
    if (fd.get(name) !== "custom") return Number(fd.get(name));
    const box = form.elements[`${name}Custom`];
    const n = Math.round(Number(box.value));
    return Number.isFinite(n) && n > 0 ? Math.min(Math.max(n, Number(box.min)), Number(box.max)) : fallback;
  };

  /* ---------------------------------------------------------------- room ---- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    unlock();
    const fd = new FormData(form);
    if (own()) return startOwn(fd);
    if (vocabOnly()) fd.set("grammar", "");
    if ((grammarOnly() || mixed()) && !fd.get("grammar")) {
      $("[data-setup-error]").textContent = t("lq.src.pickGrammar", "Wähl zuerst ein Grammatik-Kapitel.");
      return;
    }
    const rnd = random() ? randomPick() : null;
    const set = rnd ? `level:${rnd.value}` : String(fd.get("set"));
    // „Nur Grammatik“ asks no words, so the set doesn't matter there.
    if (set.startsWith("kartenset:") && !grammarOnly()) return startCardSet(fd, set.slice(10), e.submitter, String(fd.get("grammar") || ""));
    settings = {
      level: rnd ? rnd.value : setSel.dataset.level,
      unit: set.startsWith("unit:") ? set.slice(5) : null,
      mode: fd.get("mode"),
      count: pick(fd, "count", 10),
      seconds: pick(fd, "seconds", 20),
      auto: fd.get("advance") === "auto",
      grammar: rnd ? rnd.dataset.chapters || "" : String(fd.get("grammar") || ""),
      grammarOnly: grammarOnly(),
    };
    if (settings.grammarOnly) settings.level = $("[data-grammar-level]").textContent || settings.level;
    // Solo: no room at all. The phone page plays these settings on its own.
    if (e.submitter?.hasAttribute("data-solo-submit")) {
      const q = new URLSearchParams({ solo: "1", set, level: settings.level, mode: settings.mode, count: String(settings.count), seconds: String(settings.seconds) });
      if (settings.grammar) q.set("grammar", settings.grammar);
      if (settings.grammarOnly) q.set("only", "grammar");
      // The name of what is played, for the learner's record (record.js).
      const vocabName = $("[data-vocab-name]")?.textContent.trim();
      const grammarName = $("[data-grammar-name]")?.textContent.trim();
      q.set("titel", (settings.grammarOnly ? grammarName : settings.grammar ? `${vocabName} + ${grammarName}` : vocabName) || "");
      location.href = `/game?${q}`;
      return;
    }
    const btns = form.querySelectorAll("[type=submit]");
    btns.forEach((b) => (b.disabled = true));
    try {
      const { buildQuestions } = await loadQuestions();
      if (settings.grammarOnly) {
        const { grammarQuestions } = await import("./mix.js");
        questions = await grammarQuestions(settings.grammar, settings.count);
      } else if (settings.grammar) {
        const { mixedQuestions } = await import("./mix.js");
        questions = await mixedQuestions(settings.count, settings.grammar, (n) => buildQuestions({ ...settings, count: n }));
      } else {
        questions = buildQuestions(settings);
      }
      if (questions.length === 0) throw new Error("empty");
      await openRoom();
      phase = "lobby";
      show("lobby");
      // The game gets its own history entry, so Back (or the phone's back swipe) returns
      // to this setup with the choices still filled in instead of leaving the page.
      history.pushState({ lq: "game" }, "");
    } catch (err) {
      console.error(err);
      $("[data-setup-error]").textContent = t("lq.host.error.create", "Der Raum konnte nicht geöffnet werden. Prüfe die Internetverbindung und versuch es noch einmal.");
    } finally {
      btns.forEach((b) => (b.disabled = false));
    }
  });

  /** Opens a room for the teacher's own quiz chosen in the select. */
  async function startOwn(fd) {
    const err = $("[data-setup-error]");
    err.textContent = "";
    const quiz = ownQuiz();
    if (!quiz) {
      err.textContent = t("lq.src.pickFirst", "Wähl zuerst eines deiner Quizze — oder stell ein neues zusammen.");
      return;
    }
    settings = { level: null, unit: null, mode: "custom", count: quiz.questions.length, seconds: pick(fd, "seconds", 20), auto: fd.get("advance") === "auto" };
    const btns = form.querySelectorAll("[type=submit]");
    btns.forEach((b) => (b.disabled = true));
    try {
      const { resolveQuestions, hasWords } = await loadCustom();
      questions = resolveQuestions(quiz.questions, hasWords(quiz.questions) ? await loadQuestions() : null);
      if (questions.length === 0) throw new Error("empty");
      await openRoom();
      phase = "lobby";
      show("lobby");
      history.pushState({ lq: "game" }, "");
    } catch (e) {
      console.error(e);
      err.textContent = t("lq.host.error.create", "Der Raum konnte nicht geöffnet werden. Prüfe die Internetverbindung und versuch es noch einmal.");
    } finally {
      btns.forEach((b) => (b.disabled = false));
    }
  }

  /**
   * Opens a room for one of the teacher's own card sets (Meine Kartensets in the Wortschatz
   * list): its words as questions, the same ones „Live-Quiz“ on /teachers/cards builds
   * (play.js quizQuestionsFor). With a grammar chapter („Wortschatz + Grammatik“) the
   * chapter's questions take turns with the set's words, as with any Lernset (mix.js).
   */
  async function startCardSet(fd, id, submitter, grammar = "") {
    const err = $("[data-setup-error]");
    err.textContent = "";
    if (submitter?.hasAttribute("data-solo-submit")) {
      err.textContent = "Your own card sets only run with a room. To practise alone: “Learn” in the card set.";
      return;
    }
    const btns = form.querySelectorAll("[type=submit]");
    btns.forEach((b) => (b.disabled = true));
    try {
      const [{ getSet }, { quizQuestionsFor }, { MEANING_LANGS }, { resolveQuestions, hasWords }] = await Promise.all([
        import("../vokabelFoto/sets.js"), import("../vokabelFoto/play.js"), import("./protocol.js"), loadCustom(),
      ]);
      const set = await getSet(id);
      if (!set) throw new Error("set");
      const count = pick(fd, "count", 10);
      const words = async (n) => {
        const own = (await quizQuestionsFor(set, MEANING_LANGS, 50)).sort(() => Math.random() - 0.5).slice(0, n);
        return resolveQuestions(own, hasWords(own) ? await loadQuestions() : null);
      };
      if (grammar) {
        const { mixedQuestions } = await import("./mix.js");
        questions = await mixedQuestions(count, grammar, words);
      } else {
        questions = await words(count);
      }
      settings = { level: null, unit: null, mode: "custom", count: questions.length, seconds: pick(fd, "seconds", 20), auto: fd.get("advance") === "auto" };
      if (questions.length === 0) throw new Error("empty");
      await openRoom();
      phase = "lobby";
      show("lobby");
      history.pushState({ lq: "game" }, "");
    } catch (e) {
      console.error(e);
      err.textContent = e?.message === "empty"
        ? "No questions can be built from this card set: the words need a translation or a/an/some."
        : t("lq.host.error.create", "Der Raum konnte nicht geöffnet werden. Prüfe die Internetverbindung und versuch es noch einmal.");
    } finally {
      btns.forEach((b) => (b.disabled = false));
    }
  }

  /** Joins a fresh channel as host; a PIN another host already holds is swapped for a new one. */
  /** Opens a room, or with `resumed` ({ pin, roomKey?, jwk? }) takes back this tab's room after a reload. */
  async function openRoom(resumed = null) {
    supabase ??= createBrowserSupabase();
    // The server hands out the PIN and the room key for this tab's public key (secure.js).
    // Not set up yet (503) or unreachable: the old unsigned room, so a lesson never breaks.
    signer = checker = room = null;
    let registered = null;
    if (resumed?.roomKey) {
      registered = { pin: resumed.pin, roomKey: resumed.roomKey };
      signer = hostSigner(await importHostKey(resumed.jwk), FAREWELL);
      checker = playerChecker(resumed.roomKey);
      room = { roomKey: resumed.roomKey, jwk: resumed.jwk };
    } else if (!resumed) try {
      const hk = await makeHostKey();
      const res = await fetch("/api/live-quiz/raum", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostPub: hk.pub }),
      });
      if (res.ok) {
        registered = await res.json();
        signer = hostSigner(hk.key, FAREWELL);
        checker = playerChecker(registered.roomKey);
        room = { roomKey: registered.roomKey, jwk: hk.jwk };
      }
    } catch (e) {
      console.warn("[live-quiz] unsigned room:", e?.message || e);
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      pin = resumed?.pin ?? registered?.pin ?? makePin();
      ch = supabase.channel(channelName(pin), { config: { broadcast: { self: false }, presence: { key: "host" } } });
      // Every listener goes on before subscribe(): the Realtime client refuses them after.
      ch.on("broadcast", { event: "answer" }, ({ payload }) => onWireAnswer(payload));
      ch.on("broadcast", { event: "sync" }, ({ payload }) => onSync(payload));
      const taken = await new Promise((resolve, reject) => {
        let settled = false;
        ch.on("presence", { event: "sync" }, () => {
          // Another tab tracking "host" before us means the PIN is in use.
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
    onPresence();

    const url = `${location.origin}/spiel?pin=${pin}`;
    root.querySelectorAll("[data-pin]").forEach((el) => (el.textContent = `${pin.slice(0, 3)} ${pin.slice(3)}`));
    root.querySelectorAll("[data-join-url]").forEach((el) => (el.textContent = `${location.host}/spiel`));
    $("[data-qr]").innerHTML = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    renderLobby();
  }

  /* ------------------------------------------------------------- wire ---- */
  /** Every host event goes out through here: signed when the room is registered. */
  function send(event, payload) {
    const channel = ch;
    if (!channel) return Promise.resolve();
    if (!signer) return channel.send({ type: "broadcast", event, payload });
    return signer.sign(event, payload)
      .then((wire) => channel.send({ type: "broadcast", event, payload: wire }))
      .catch((e) => console.error("[live-quiz] send failed:", e));
  }

  /** An answer from the channel: in a registered room only with the player's own MAC. */
  function onWireAnswer(payload) {
    const check = checker;
    if (!check) return onAnswer(payload);
    check.answer(payload).then((ok) => { if (ok && check === checker) onAnswer(payload); });
  }

  // Seats in a registered room: a presence entry counts only with the proof from the
  // server-issued secret. Keyed by id and proof, so a forged entry cannot block the real one.
  const seatChecks = new Map();
  function trustedSeat(m) {
    if (!checker) return true;
    if (!m || typeof m.id !== "string") return false;
    const k = `${m.id}|${m.proof}`;
    const v = seatChecks.get(k);
    if (v === true || v === false) return v;
    if (!v) {
      const check = checker;
      seatChecks.set(k, "pending");
      check.presence(m).then((ok) => {
        if (check !== checker) return;
        seatChecks.set(k, ok);
        if (ok) onPresence();
      });
    }
    return false;
  }

  /* -------------------------------------------------------------- resync ---- */
  // A broadcast is sent once. A phone that missed one (screen locked, Wi-Fi blinked,
  // joined mid-question) used to wait for the next forever: "Gleich kommt die nächste
  // Frage" with the class already two questions on. So the host keeps the last game event
  // (`shown`), says every few seconds where the game stands (`beat`, a few bytes), and a
  // phone that finds itself behind asks (`sync`) and gets that event again, addressed to it
  // alone (`state`). A question comes with its clock as it stands now.
  const BEAT_MS = 5000;
  let shown = null; // { event, payload } — the last question, reveal or end
  let beatTimer = null;
  function remember(event, payload) {
    shown = { event, payload };
    clearInterval(beatTimer);
    beatTimer = setInterval(beat, BEAT_MS);
    save();
  }
  function beat() {
    if (!ch || !shown) return;
    send("beat", { phase, n: shown.payload.n ?? null });
  }
  const syncedAt = new Map(); // id → last answered request, so one phone cannot flood the room
  function onSync({ id } = {}) {
    if (!shown || typeof id !== "string" || !players.has(id)) return;
    const now = Date.now();
    if (now - (syncedAt.get(id) ?? 0) < 2000) return;
    syncedAt.set(id, now);
    const { event, payload } = shown;
    if (event === "question") {
      if (!current || current.done || current.n !== payload.n) return;
      send("state", { to: id, event, payload: { ...payload, left: leftMs(), totalMs: current.total, paused: current.pausedLeft != null } });
    } else {
      // The podium's drumroll is over for a phone that comes back late.
      send("state", { to: id, event, payload: event === "end" ? { ...payload, reveal: 0 } : payload });
    }
  }

  /* ------------------------------------------------------------- players ---- */
  let rosterTimer = null;
  function onPresence() {
    if (!ch) return;
    const state = ch.presenceState();
    const here = new Set();
    for (const [key, metas] of Object.entries(state)) {
      if (key === "host") continue;
      const m = metas.find((x) => x?.role === "player" && trustedSeat(x));
      if (!m) continue;
      here.add(m.id);
      const known = players.get(m.id);
      if (known) {
        known.online = true;
        known.lang = m.lang;
        if (m.avatar) known.avatar = m.avatar;
      } else {
        // A phone from before the name step sends no animal: one from its name, or any.
        const avatar = avatarSrc(m.avatar) ? m.avatar : animalOf(m.name) ?? randomAnimal();
        players.set(m.id, { name: uniqueName(m.name), avatar, lang: m.lang, score: 0, online: true });
        if (phase === "lobby") { sfx("join"); greet(players.get(m.id).name); }
      }
    }
    for (const [id, p] of players) if (!here.has(id) && !p.bot) p.online = false;
    // Someone who left mid-question no longer holds up the "everyone answered" early end.
    if (current && !current.done) maybeFinishEarly();
    if (phase === "lobby") renderLobby();
    if (phase === "question") renderCount();
    // One roster broadcast per burst of joins, not one per presence event.
    clearTimeout(rosterTimer);
    rosterTimer = setTimeout(sendRoster, 250);
    save();
  }

  /** Two "Ali"s become "Ali" and "Ali 2" — each phone learns its name from the roster. */
  function uniqueName(name) {
    const base = name || "Gast";
    const taken = new Set([...players.values()].map((p) => p.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; ; i++) {
      const next = `${base.slice(0, 13)} ${i}`;
      if (!taken.has(next.toLowerCase())) return next;
    }
  }

  /** Whether any question shows a meaning: only then do the phones ask for a language. */
  const translates = () => questions.some((q) => q.prompt.de == null || q.options.some((o) => o.de == null));

  function sendRoster() {
    send("roster", { phase, translate: translates(), players: [...players].map(([id, p]) => ({ id, name: p.name })) });
  }

  // Bruno hosts the lobby: he asks the class to join and says hello to each newcomer.
  const lobbyCrew = $("[data-lobby-crew]");
  lobbyCrew.insertAdjacentHTML("afterbegin", mascotSvg({ name: "bruno", expr: "happy", size: 84, label: "", extra: "klemmbrett" }));
  const bubble = $("[data-lobby-bubble]");
  let greetTimer = null;
  function greet(name) {
    bubble.textContent = t("lq.host.hello", "Hallo, {name}!", { name });
    lobbyCrew.classList.remove("is-greeting");
    void lobbyCrew.offsetWidth;
    lobbyCrew.classList.add("is-greeting");
    clearTimeout(greetTimer);
    greetTimer = setTimeout(() => {
      bubble.textContent = t("lq.host.joinCall", "Scannt den Code und macht mit!");
      lobbyCrew.classList.remove("is-greeting");
    }, 2600);
  }

  // Who is already on screen: only a newcomer pops in, the others stay still.
  const inLobby = new Set();
  function renderLobby() {
    const online = [...players].filter(([, p]) => p.online);
    $("[data-lobby-count]").textContent = t("lq.host.players", "{n} Mitspieler", { n: online.length });
    $("[data-lobby-list]").innerHTML = online.length
      ? online.map(([id, p]) => `<li${inLobby.has(id) ? "" : ' class="is-new"'}>${avatarImg(p.avatar)}${esc(p.name)}</li>`).join("")
      : `<li class="lq-empty">${esc(t("lq.host.waiting", "Warte auf die ersten Mitspieler …"))}</li>`;
    online.forEach(([id]) => inLobby.add(id));
    $("[data-test]").hidden = testing();
    // In test mode the bots are in at once and the phone preview a moment later. Starting
    // in between asked a question the preview never received, so wait for a person too.
    $("[data-start]").disabled = !online.some(([, p]) => !p.bot);
    syncTestStart();
  }

  /* ------------------------------------------------------------ question ---- */
  // See protocol.js: the picture goes with the question only where it cannot give the
  // answer away — not beside a German word whose meaning is to be picked.
  const modeOf = (q) => q.mode ?? settings.mode;
  const askImg = (q) => (modeOf(q) === "meaning-de" || modeOf(q) === "synonym" ? q.img ?? null : null);
  /** The line above the prompt: an own question's task, or the mode's question. */
  const kindOf = (q) => q.kind || modeQuestion(modeOf(q), t);
  const optionText = (o) => o.de ?? o[shownLang()] ?? o.en;
  // The language of what optionText shows: long German words hyphenate by syllable (see
  // hyphens in live-quiz.css), and the page's own lang follows the UI, not the word.
  const optionLang = (o) => (o.de != null ? "de" : o[shownLang()] != null ? shownLang() : "en");

  /** Each player's place and score before this question: where the ranking animates from. */
  let before = new Map();

  /** Asks question `qi`; `resumed` is the same question as saved before a reload, clock and answers. */
  function ask(resumed = null) {
    before = new Map(ranking().map(([id, p], i) => [id, { i, score: p.score }]));
    const q = questions[qi];
    if (resumed) {
      const left = resumed.paused ? resumed.left : Math.max(0, resumed.left - resumed.elapsed);
      current = { n: resumed.n, total: resumed.total, end: performance.now() + left, pausedLeft: resumed.paused ? left : null, answers: new Map(resumed.answers), eligible: new Set(resumed.eligible), done: false };
    } else {
      const eligible = new Set([...players].filter(([, p]) => p.online).map(([id]) => id));
      const total = settings.seconds * 1000;
      current = { n: qi + 1, total, end: performance.now() + total, pausedLeft: null, answers: new Map(), eligible, done: false };
    }
    phase = "question";
    const asked = { n: qi + 1, total: questions.length, mode: modeOf(q), kind: q.kind || null, prompt: q.prompt, options: q.options, seconds: settings.seconds, img: askImg(q) };
    // The phones still have the question after a reload; they only need the clock again.
    if (resumed) sendTime();
    else send("question", asked);
    remember("question", asked);
    sendRoster();

    $("[data-q-n]").textContent = t("lq.q.of", "Frage {n} von {total}", { n: qi + 1, total: questions.length });
    $("[data-q-kind]").textContent = kindOf(q);
    setImg($("[data-q-img]"), askImg(q));
    const prompt = $("[data-q-prompt]");
    setMarked(prompt, q.prompt.de ?? q.prompt[shownLang()]);
    prompt.dir = !q.prompt.de && isRtl(shownLang()) ? "rtl" : "auto";
    prompt.lang = optionLang(q.prompt);
    $("[data-q-options]").classList.remove("is-revealing");
    $("[data-q-options]").innerHTML = q.options
      .map((o, i) => `<div class="lq-opt lq-opt--${OPTION_STYLES[i]}"><span class="lq-shape" aria-hidden="true">${SHAPES[i]}</span><span dir="auto" lang="${optionLang(o)}">${esc(optionText(o))}</span></div>`)
      .join("");
    renderCount();
    show("question");
    if (!resumed) botsAnswer(q);

    const bar = $("[data-q-bar]");
    const left = $("[data-q-left]");
    let lastSec = null;
    current.tick = setInterval(() => {
      const ms = leftMs();
      const sec = Math.ceil(ms / 1000);
      // The last five seconds tick, the last three louder.
      if (sec !== lastSec && sec > 0 && sec <= 5 && lastSec != null) sfx(sec <= 3 ? "tickLast" : "tick");
      lastSec = sec;
      left.textContent = sec;
      bar.style.width = `${(ms / current.total) * 100}%`;
      if (ms <= 0) finish();
    }, 100);
  }

  const leftMs = () => (current.pausedLeft ?? Math.max(0, current.end - performance.now()));

  /** Tells the phones where the clock of the question on screen now stands. */
  function sendTime() {
    if (!current || current.done) return;
    send("time", { n: current.n, left: leftMs(), total: current.total, paused: current.pausedLeft != null });
    save();
  }

  function renderCount() {
    if (!current) return;
    // Whoever has answered counts, online or not: "4 von 1" was the answers of players who
    // had since dropped out, set against only the ones still here.
    const waiting = [...current.eligible].filter((id) => players.get(id)?.online || current.answers.has(id)).length;
    $("[data-q-count]").textContent = t("lq.host.answered", "{a} von {n} haben geantwortet", { a: current.answers.size, n: waiting });
    // Phones that dropped out and have not answered: named, so nobody waits for them in
    // silence. Their seat is kept; they are back as soon as the phone reconnects.
    const away = [...current.eligible]
      .filter((id) => { const p = players.get(id); return p && !p.online && !p.bot && !current.answers.has(id); })
      .map((id) => players.get(id).name);
    const el = $("[data-q-away]");
    el.hidden = !away.length;
    el.textContent = away.length
      ? t("lq.host.away", "Verbindet sich neu: {names}", { names: away.slice(0, 4).join(", ") + (away.length > 4 ? ` +${away.length - 4}` : "") })
      : "";
  }

  function onAnswer({ id, n, choice } = {}) {
    if (!current || current.done || n !== current.n) return;
    if (!players.has(id) || current.answers.has(id)) return;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
    // Time used, against the clock as it stands: a question the teacher gave more time
    // scores against its longer clock, and a pause is not counted.
    current.answers.set(id, { choice, ms: current.total - leftMs(), total: current.total });
    // A late joiner who answers anyway is counted: they saw the question, so it is theirs.
    current.eligible.add(id);
    // Test mode: once the person has answered, the bots do not keep them waiting.
    if (!players.get(id).bot) { hurryBots(); save(); }
    renderCount();
    maybeFinishEarly();
  }

  function maybeFinishEarly() {
    // A bot sitting this question out (botsAnswer) is not waited for.
    const open = [...current.eligible].filter((id) => players.get(id)?.online && !current.answers.has(id) && !current.skipped?.has(id));
    if (open.length === 0 && current.answers.size > 0) finish();
  }

  function ranking() {
    return [...players].sort((a, b) => b[1].score - a[1].score);
  }

  async function finish() {
    if (!current || current.done) return;
    current.done = true;
    clearInterval(current.tick);
    clearBots();
    const q = questions[qi];
    const dist = [0, 0, 0, 0];
    const gained = new Map();
    for (const [id, a] of current.answers) {
      // A bot removed by closing the test dock mid-question: its answer goes with it.
      if (!players.has(id)) continue;
      dist[a.choice]++;
      const ok = a.choice === q.correct;
      const pts = ok ? points(a.ms, a.total / 1000) : 0;
      players.get(id).score += pts;
      gained.set(id, { ok, points: pts });
    }
    const results = {};
    ranking().forEach(([id, p], i) => {
      if (!current.eligible.has(id)) return;
      const g = gained.get(id) ?? { ok: false, points: 0, missed: true };
      results[id] = { ...g, score: p.score, rank: i + 1 };
    });
    played.push({
      q,
      dist: [...dist],
      seen: [...current.eligible].filter((id) => players.has(id)).length,
    });
    const revealed = { n: current.n, correct: q.correct, img: q.img ?? null, dist, results };
    send("reveal", revealed);
    remember("reveal", revealed);
    phase = "reveal";
    music(null);
    sfx("gong");

    // The cards turn over on the question screen first, in step with the phones: the
    // wrong ones grey with their count, the right one last, with a tick and a pulse.
    const n = current.n;
    const cards = [...$("[data-q-options]").children];
    $("[data-q-options]").classList.add("is-revealing");
    await flipCards(cards, q.correct, (card, i, right) => {
      sfx(right ? "correct" : "flip");
      card.classList.add(right ? "is-right" : "is-wrong");
      card.insertAdjacentHTML("beforeend", `<b class="lq-opt-count">${dist[i]}${right ? " ✓" : ""}</b>`);
    });
    await wait(reduced() ? 0 : 900);
    // Ended or moved on while the cards were turning: nothing left to show.
    if (phase !== "reveal" || current?.n !== n) return;

    setImg($("[data-r-img]"), q.img);

    const max = Math.max(1, ...dist);
    const shownPrompt = q.prompt.de ?? q.prompt[shownLang()];
    // A gap sentence comes back whole, the answer in the gap and marked: "Woher kommst
    // du? — Aus Passau." reads as German; "___ kommst du?" over "woher" is a puzzle.
    // "Aus Passau. → Fragewort?" becomes "Aus Passau. → woher".
    const answerText = optionText(q.options[q.correct]);
    const GAP = /_{2,}|…/;
    const ASK = / → [^→]*\?$/;
    const filled = GAP.test(shownPrompt) ? shownPrompt.replace(GAP, `<u>${answerText}</u>`)
      : ASK.test(shownPrompt) ? shownPrompt.replace(ASK, ` → <u>${answerText}</u>`)
      : shownPrompt;
    $("[data-r-kind]").textContent = kindOf(q);
    setMarked($("[data-r-prompt]"), filled);
    $("[data-r-prompt]").lang = optionLang(q.prompt);
    $("[data-r-answer]").textContent = optionText(q.options[q.correct]);
    $("[data-r-answer]").lang = optionLang(q.options[q.correct]);
    $("[data-r-dist]").innerHTML = q.options
      .map((o, i) => `
        <div class="lq-dist lq-opt--${OPTION_STYLES[i]}${i === q.correct ? " is-correct" : ""}">
          <span class="lq-dist-bar"><span style="height:${(dist[i] / max) * 100}%; --i:${i}"></span></span>
          <b data-dist-n="${dist[i]}">0</b>
          <span class="lq-dist-label"><span class="lq-shape" aria-hidden="true">${SHAPES[i]}</span><span dir="auto" lang="${optionLang(o)}">${esc(optionText(o))}</span>${i === q.correct ? " ✓" : ""}</span>
        </div>`)
      .join("");
    $("[data-r-next]").textContent = t("lq.host.toBoard", "Rangliste");
    show("reveal");
    $("[data-r-dist]").querySelectorAll("[data-dist-n]").forEach((b) => countUp(b, 0, Number(b.dataset.distN), 800));
    autoNext($("[data-r-next]"), renderBoard, autoSeconds().reveal);
  }

  /* With "automatisch weiter" the reveal and the leaderboard each stand for a few seconds
     and move on by themselves — the button counts down and still skips the wait. Without
     it the host clicks, as before. The reveal gets longer than the ranking: the class reads
     the right answer and each phone its own result, while the ranking is five names read
     at a glance. */
  const AUTO_SECONDS = { reveal: 6, board: 4 };
  // Alone with the bots („Allein testen"), the point is the phone's own moment: right or
  // wrong, confetti, the points counting up. That gets the long stand, and the ranking of
  // three bots and one person only a glance. It always moves on by itself, because on a
  // phone the preview covers the host's buttons.
  const TEST_SECONDS = { reveal: 9, board: 3 };
  const autoSeconds = () => (testing() ? TEST_SECONDS : AUTO_SECONDS);
  let autoTimer = null;
  /** The screen that would move on by itself: kept so the tempo bar can switch it. */
  let pending = null; // { btn, label, go, seconds }
  function autoNext(btn, go, seconds) {
    stopAuto();
    pending = { btn, label: btn.textContent, go, seconds };
    if (!settings?.auto && !testing()) return;
    const { label } = pending;
    let left = seconds;
    btn.textContent = `${label} (${left})`;
    autoTimer = setInterval(() => {
      left--;
      if (left > 0) { btn.textContent = `${label} (${left})`; return; }
      stopAuto();
      go();
    }, 1000);
  }
  function stopAuto() {
    clearInterval(autoTimer);
    if (pending) pending.btn.textContent = pending.label;
  }

  function renderBoard() {
    phase = "board";
    const top = ranking().slice(0, 5);
    // Each row starts where it stood before this question, with the score it had, then
    // moves to its new place while the points count up.
    const board = $("[data-board]");
    board.innerHTML = top
      .map(([id, p], i) => `<li data-from="${before.get(id)?.i ?? top.length}"${p.online || p.bot ? "" : ` class="is-away" title="${esc(t("lq.host.awayOne", "verbindet sich neu …"))}"`}><span class="lq-rank">${i + 1}</span>${avatarImg(p.avatar)}<span class="lq-name">${esc(p.name)}</span><b data-score="${p.score}" data-was="${before.get(id)?.score ?? 0}">${before.get(id)?.score ?? 0}</b></li>`)
      .join("");
    const last = qi === questions.length - 1;
    $("[data-b-next]").textContent = last ? t("lq.host.toPodium", "Siegerehrung") : t("lq.host.next", "Nächste Frage");
    show("board");
    slideRanks(board);
    board.querySelectorAll("[data-score]").forEach((b) => setTimeout(() => countUp(b, Number(b.dataset.was), Number(b.dataset.score), 900), reduced() ? 0 : 350));
    autoNext($("[data-b-next]"), nextFromBoard, autoSeconds().board);
  }

  /* The award ceremony, as on a game show: a drumroll, then third place rises, then
     second, another drumroll, and the winner — with a fanfare, confetti and the mascots
     cheering. The phones hold their own result back until then (`reveal` in the end
     message), so nobody's screen gives the winner away. Under reduced motion it all
     stands there at once. */
  const PODIUM_BEAT = 2600; // ms per place: a drumroll and the step rising
  let podiumTimers = [];
  let stopShow = () => {};
  const clearPodium = () => { podiumTimers.forEach(clearTimeout); podiumTimers = []; stopShow(); stopShow = () => {}; stopVictory(); };

  /** `again`: the podium once more after a reload — no new "end" for the phones, no show. */
  function podium({ again = false } = {}) {
    stopAuto();
    clearPodium();
    phase = "podium";
    const ranked = ranking();
    const results = Object.fromEntries(ranked.map(([id, p], i) => [id, { score: p.score, rank: i + 1 }]));
    const top = ranked.slice(0, 3).map(([, p]) => ({ name: p.name, score: p.score, avatar: p.avatar }));
    const still = reduced() || again;
    // Third (if any) first, the winner last.
    const order = [2, 1, 0].filter((i) => top[i]);
    const revealIn = still ? 0 : order.length * PODIUM_BEAT;
    const ended = { podium: top, results, total: ranked.length, reveal: revealIn };
    if (!again) send("end", ended);
    remember("end", ended);

    const stage = $("[data-podium]");
    stage.innerHTML = [1, 0, 2]
      .filter((i) => top[i])
      .map((i) => `
        <li class="lq-step lq-step--${i + 1}${still ? "" : " is-waiting"}" data-place="${i}">
          <span class="lq-step-who">
            ${i === 0 ? '<span class="lq-crown" aria-hidden="true">👑</span>' : ""}
            ${avatarImg(top[i].avatar, "lq-step-av")}
            <span class="lq-name">${esc(top[i].name)}</span>
            <b>${t("lq.end.score", "{score} Punkte", { score: top[i].score })}</b>
          </span>
          <span class="lq-block">${i + 1}</span>
        </li>`)
      .join("");
    $("[data-podium-rest]").innerHTML = ranked.slice(3, 10)
      .map(([, p], i) => `<li><span class="lq-rank">${i + 4}</span>${avatarImg(p.avatar)}<span class="lq-name">${esc(p.name)}</span><b>${p.score}</b></li>`)
      .join("");
    renderRecap(ranked.length);
    podTab("ceremony");
    const crew = $("[data-podium-crew]");
    crew.innerHTML = mascotSvg({ name: "bruno", expr: "celebrate", size: 150, className: "lq-crew-l", label: "" })
      + mascotSvg({ name: "hamsti", expr: "celebrate", size: 130, className: "lq-crew-r", label: "" });
    const screen = $("[data-screen=podium]");
    screen.classList.toggle("is-done", still);
    show("podium");

    const finale = () => {
      screen.classList.add("is-done");
      sfx("fanfare");
      // Then the show: the winner's tune and ten seconds of confetti.
      stopShow = confettiShow({ duration: 10000 });
      podiumTimers.push(setTimeout(victory, 1400));
    };
    if (still) { finale(); return; }
    order.forEach((place, k) => {
      const at = k * PODIUM_BEAT;
      podiumTimers.push(setTimeout(() => sfx("drumroll"), at));
      podiumTimers.push(setTimeout(() => {
        stage.querySelector(`[data-place="${place}"]`)?.classList.remove("is-waiting");
        if (place === 0) finale();
        else sfx("step");
      }, at + 1800));
    });
  }

  /* The look back after the podium: every question played, how many got it right, and the
     wrong answer most chosen — what the teacher goes over with the class next. Below half
     right is marked, so the questions worth repeating stand out at a glance. */
  const recapBtn = $("[data-pod-recap]");
  let recapN = 0;
  function podTab(name) {
    root.querySelectorAll("[data-pod-panel]").forEach((p) => (p.hidden = p.dataset.podPanel !== name));
    const open = name === "recap";
    recapBtn.setAttribute("aria-pressed", String(open));
    recapBtn.textContent = open ? t("lq.sum.back", "Zur Siegerehrung") : t("lq.sum.tab", "Rückblick ({n})", { n: recapN });
  }
  recapBtn.addEventListener("click", () => podTab(recapBtn.getAttribute("aria-pressed") === "true" ? "ceremony" : "recap"));
  mountKeep($("[data-screen=podium]"), { name: "live-quiz" });

  function renderRecap(playerCount) {
    const rows = played.map(({ q, dist, seen }, i) => {
      const ok = dist[q.correct] ?? 0;
      const pct = seen ? Math.round((ok / seen) * 100) : null;
      // The wrong answer most chosen, when anyone chose one.
      let miss = -1;
      dist.forEach((d, k) => { if (k !== q.correct && d > 0 && (miss < 0 || d > dist[miss])) miss = k; });
      return { q, i, ok, seen, pct, miss, missN: miss >= 0 ? dist[miss] : 0 };
    });
    const rated = rows.filter((r) => r.pct != null);
    const avg = rated.length ? Math.round(rated.reduce((a, r) => a + r.pct, 0) / rated.length) : null;
    const hard = rated.filter((r) => r.pct < 50).length;
    recapN = rows.length;
    recapBtn.hidden = rows.length === 0;

    $("[data-sum-stats]").innerHTML = [
      [rows.length, t("lq.sum.questions", "Fragen")],
      [avg == null ? "–" : `${avg} %`, t("lq.sum.avg", "richtig im Schnitt")],
      [playerCount, t("lq.sum.players", "Mitspielende")],
    ].map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("");
    const hint = $("[data-sum-hint]");
    hint.hidden = hard === 0;
    hint.textContent = hard === 1
      ? t("lq.sum.hardOne", "Eine Frage hatte weniger als die Hälfte richtig – gut zum Wiederholen.")
      : t("lq.sum.hard", "{n} Fragen hatten weniger als die Hälfte richtig – gut zum Wiederholen.", { n: hard });

    const list = $("[data-sum-list]");
    list.innerHTML = rows.map((r) => {
      const level = r.pct == null ? "none" : r.pct < 50 ? "hard" : r.pct < 80 ? "mid" : "good";
      const answer = r.q.options[r.q.correct];
      const wrong = r.miss >= 0 ? r.q.options[r.miss] : null;
      return `
        <li class="lq-sum-item is-${level}">
          <span class="lq-sum-n">${r.i + 1}</span>
          <div class="lq-sum-body">
            <p class="lq-sum-kind">${esc(kindOf(r.q))}</p>
            ${r.q.img ? `<img class="lq-sum-img" src="${esc(r.q.img)}" alt="" loading="lazy" />` : ""}
            <p class="lq-sum-q" data-sum-q="${r.i}" dir="auto" lang="${optionLang(r.q.prompt)}"></p>
            <p class="lq-sum-a"><span class="lq-sum-chip lq-opt--${OPTION_STYLES[r.q.correct]}"><span aria-hidden="true">✓</span> <span dir="auto" lang="${optionLang(answer)}">${esc(optionText(answer))}</span></span></p>
            ${wrong ? `<p class="lq-sum-miss">${esc(t("lq.sum.miss", "Häufigste falsche Antwort:"))} <b dir="auto" lang="${optionLang(wrong)}">${esc(optionText(wrong))}</b> <span>(${r.missN}×)</span></p>` : ""}
          </div>
          <div class="lq-sum-score">
            <b>${r.pct == null ? "–" : `${r.pct} %`}</b>
            <span>${esc(t("lq.sum.ofN", "{ok} von {n} richtig", { ok: r.ok, n: r.seen }))}</span>
            <span class="lq-sum-bar" aria-hidden="true"><span style="width:${r.pct ?? 0}%"></span></span>
            ${level === "hard" ? `<em class="lq-sum-flag">${esc(t("lq.sum.repeat", "Wiederholen"))}</em>` : ""}
          </div>
        </li>`;
    }).join("");
    list.querySelectorAll("[data-sum-q]").forEach((el) => {
      const q = rows[Number(el.dataset.sumQ)].q;
      setMarked(el, q.prompt.de ?? q.prompt[shownLang()]);
    });
  }

  /* ----------------------------------------------------------- test mode ---- */
  const dock = $("[data-test-dock]");
  const testing = () => !dock.hidden;

  // Where the screen has no room beside the host view (a phone), the dock covers it. So it
  // folds to its head bar and follows the game: the phone while a question runs and while
  // its answer is revealed (that is where the confetti and the points are), the host view
  // (start, leaderboard, podium) the rest of the time. The bar's button swaps by hand.
  const narrow = matchMedia("(max-width: 1099px)");
  const foldBtn = $("[data-test-fold]");
  function fold(folded) {
    dock.classList.toggle("is-folded", folded);
    foldBtn.setAttribute("aria-expanded", String(!folded));
    foldBtn.dataset.i18n = folded ? "lq.test.showPhone" : "lq.test.showHost";
    foldBtn.textContent = folded ? t("lq.test.showPhone", "Handy zeigen") : t("lq.test.showHost", "Beamer zeigen");
  }
  // In the lobby the open dock covers „Spiel starten", so the bar carries its own copy.
  const testStart = $("[data-test-start]");
  function syncTestStart() {
    const lobby = testing() && phase === "lobby";
    testStart.hidden = !lobby;
    testStart.disabled = $("[data-start]").disabled;
    foldBtn.hidden = lobby;
  }
  testStart.addEventListener("click", () => $("[data-start]").click());
  followPhase = () => {
    if (testing()) fold(narrow.matches && !["question", "reveal", "lobby"].includes(phase));
    syncTestStart();
  };
  foldBtn.addEventListener("click", () => fold(!dock.classList.contains("is-folded")));
  narrow.addEventListener("change", () => followPhase());

  // The bots should feel like a class, not like a test harness: names from every
  // continent, north and south, and each with its own pace and its own share of mistakes.
  const BOT_NAMES = [
    "Amara", "Mateo", "Aroha", "Kenji", "Priya", "Olena", "Tariq", "Lucía", "Sipho", "Leilani",
    "Minh", "Ingrid", "Kwame", "Valentina", "Farida", "Joaquín", "Mei", "Tomás", "Nomvula", "Arjun",
    "Yusuf", "Chloé", "Rangi", "Sofía", "Emeka", "Anh", "Dilnoza", "Rafael", "Hana", "Kofi",
  ];
  const pickNames = (k) => {
    const pool = [...BOT_NAMES];
    return Array.from({ length: k }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  };

  function startTest() {
    if (!pin || testing()) return;
    pickNames(BOT_COUNT).forEach((name, i) => {
      players.set(`bot-${i + 1}`, {
        name, avatar: randomAnimal(), lang: "en", score: 0, online: true, bot: true,
        // Right 50–85 % of the time, answering at its own speed, now and then not at all.
        skill: 0.5 + Math.random() * 0.35,
        pace: 0.3 + Math.random() * 0.5,
      });
    });
    const src = `/game?pin=${pin}&name=${encodeURIComponent(t("lq.test.me", "Ich (Test)"))}&test=1`;
    // replace(), not src =: a src change is a history entry, and Back would then step
    // the phone preview instead of returning to the setup.
    dock.querySelector("iframe").contentWindow.location.replace(src);
    $("[data-test-open]").href = `/game?pin=${pin}`;
    dock.hidden = false;
    fold(false);
    renderLobby();
    sendRoster();
  }

  function stopTest() {
    clearBots();
    for (const [id, p] of players) {
      if (!p.bot) continue;
      players.delete(id);
      current?.answers.delete(id);
      current?.eligible.delete(id);
    }
    dock.querySelector("iframe").contentWindow?.location.replace("about:blank");
    dock.hidden = true;
    if (phase === "lobby") renderLobby();
    // Closed mid-question: the ones left may be everyone who has answered.
    if (phase === "question" && current && !current.done) { renderCount(); maybeFinishEarly(); }
  }

  /** A bot's pick: right as often as its skill says, otherwise one of the wrong options. */
  const botChoice = (p, q) =>
    Math.random() < p.skill ? q.correct : (q.correct + 1 + Math.floor(Math.random() * (q.options.length - 1))) % q.options.length;

  /** Each bot answers once at its own pace, and one time in twelve not at all. */
  function botsAnswer(q) {
    const n = current.n;
    current.skipped = new Set();
    for (const [id, p] of players) {
      if (!p.bot) continue;
      if (Math.random() < 1 / 12) { current.skipped.add(id); continue; }
      const ms = Math.min(0.9, p.pace * (0.6 + Math.random() * 0.8)) * settings.seconds * 1000;
      botTimers.push(setTimeout(() => onAnswer({ id, n, choice: botChoice(p, q) }), ms));
    }
  }

  /** The bots still thinking answer within the next second. */
  function hurryBots() {
    if (!botTimers.length || !current) return;
    const q = questions[qi];
    const n = current.n;
    clearBots();
    for (const [id, p] of players) {
      if (!p.bot || current.answers.has(id) || current.skipped?.has(id)) continue;
      botTimers.push(setTimeout(() => onAnswer({ id, n, choice: botChoice(p, q) }), 300 + Math.random() * 700));
    }
  }

  function clearBots() {
    botTimers.forEach(clearTimeout);
    botTimers = [];
  }

  $("[data-test]").addEventListener("click", startTest);
  $("[data-test-close]").addEventListener("click", stopTest);

  /* ------------------------------------------------------------- buttons ---- */
  $("[data-start]").addEventListener("click", () => {
    unlock();
    qi = 0;
    played = [];
    // traffic-baseline: teacher_tool_use — not for a test run with bots only.
    if (!testing()) intent("teacher_tool_use", { tool: "live_quiz" });
    ask();
  });
  $("[data-q-skip]").addEventListener("click", () => finish());

  /* -------------------------------------------------------------- tempo ---- */
  // The teacher changes the pace while the game runs: the seconds per question (the
  // question on screen too, keeping the time already used), +10 s and a pause for this
  // question, and whether the reveal and the ranking move on by themselves.
  const STEPS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];
  const tempo = $("[data-tempo]");
  const secsEl = $("[data-tempo-secs]");
  const pauseBtn = $("[data-tempo-pause]");
  const modeBtns = [...tempo.querySelectorAll("[data-tempo-auto]")];
  syncTempo = (screen) => {
    tempo.hidden = !["question", "reveal", "board"].includes(screen);
    if (tempo.hidden || !settings) return;
    tempo.dataset.screen = screen;
    secsEl.textContent = t("lq.tempo.secs", "{n} s", { n: settings.seconds });
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.tempoAuto === "1") === settings.auto)));
    syncPause();
    enhanceSwitch(tempo.querySelector(".lq-tempo-seg"));
  };
  function syncPause() {
    const paused = current?.pausedLeft != null && phase === "question";
    pauseBtn.textContent = paused ? t("lq.tempo.resume", "Weiter") : t("lq.tempo.pause", "Pause");
    pauseBtn.setAttribute("aria-pressed", String(paused));
    root.classList.toggle("lq-paused", paused);
    if (phase === "question") music(paused ? null : "question");
  }
  /** New seconds per question. The running question keeps what it has used, and 3 s at least. */
  function setSeconds(seconds) {
    settings.seconds = seconds;
    secsEl.textContent = t("lq.tempo.secs", "{n} s", { n: seconds });
    if (phase !== "question" || !current || current.done) return;
    const used = current.total - leftMs();
    const left = Math.max(3000, seconds * 1000 - used);
    current.total = used + left;
    if (current.pausedLeft != null) current.pausedLeft = left;
    else current.end = performance.now() + left;
    sendTime();
  }
  tempo.querySelectorAll("[data-tempo-step]").forEach((b) => b.addEventListener("click", () => {
    const now = settings.seconds;
    setSeconds(Number(b.dataset.tempoStep) > 0
      ? STEPS.find((x) => x > now) ?? STEPS.at(-1)
      : STEPS.findLast((x) => x < now) ?? STEPS[0]);
  }));
  $("[data-tempo-more]").addEventListener("click", () => {
    if (phase !== "question" || !current || current.done) return;
    current.total += 10000;
    if (current.pausedLeft != null) current.pausedLeft += 10000;
    else current.end += 10000;
    sendTime();
  });
  pauseBtn.addEventListener("click", () => {
    if (phase !== "question" || !current || current.done) return;
    if (current.pausedLeft == null) current.pausedLeft = leftMs();
    else { current.end = performance.now() + current.pausedLeft; current.pausedLeft = null; }
    syncPause();
    sendTime();
  });
  modeBtns.forEach((b) => b.addEventListener("click", () => {
    settings.auto = b.dataset.tempoAuto === "1";
    modeBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    // The screen on show follows at once: it starts counting down, or stops.
    if (!pending || !["reveal", "board"].includes(phase)) return;
    if (settings.auto) autoNext(pending.btn, pending.go, pending.seconds);
    else stopAuto();
  }));
  function nextFromBoard() {
    stopAuto();
    if (qi < questions.length - 1) { qi++; ask(); } else podium();
  }
  $("[data-r-next]").addEventListener("click", () => { stopAuto(); renderBoard(); });
  $("[data-b-next]").addEventListener("click", nextFromBoard);
  // Ending by button pops the game's history entry too, so the next Back still leaves the
  // page as before; popstate then closes the room, whichever way Back was reached.
  const leave = () => (history.state?.lq === "game" ? history.back() : closeRoom());
  root.querySelectorAll("[data-end]").forEach((b) => b.addEventListener("click", leave));
  $("[data-again]").addEventListener("click", leave);
  addEventListener("popstate", () => { if (phase !== "setup") closeRoom(); });

  async function closeRoom() {
    stopAuto();
    clearPodium();
    clearInterval(current?.tick);
    stopTest();
    current = null;
    clearInterval(beatTimer);
    shown = null;
    syncedAt.clear();
    if (ch) {
      await send("closed", {});
      await supabase.removeChannel(ch);
    }
    ch = null;
    signer = checker = room = null;
    forget();
    seatChecks.clear();
    players.clear();
    inLobby.clear();
    qi = -1;
    phase = "setup";
    show("setup");
  }

  /* ------------------------------------------------------- save / resume ---- */
  // A reload (or the browser dropping the tab in the background) used to end the game: the
  // new tab had no room, and the phones were told "closed". Now the game is kept in this
  // tab's sessionStorage — the room (PIN, room key, signing key), the questions, the scores,
  // the clock — and the reloaded page takes the same room back. The phones keep their seats,
  // and the beat and the sync bring them back in step. Closing the tab leaves them waiting
  // (player.js gives up after a while); only „Beenden“ sends "closed".
  const SAVE_KEY = "lq.host.game";
  const SAVE_MAX_AGE = 3 * 60 * 60_000;
  function save() {
    if (!ch || !pin || phase === "setup") return;
    const human = (id) => !players.get(id)?.bot;
    const live = current && !current.done
      ? {
          n: current.n, total: current.total, left: leftMs(), paused: current.pausedLeft != null,
          answers: [...current.answers].filter(([id]) => human(id)),
          eligible: [...current.eligible].filter(human),
        }
      : null;
    const data = {
      at: Date.now(), pin, room, settings, questions, qi, played, phase, shown, shownLang: shownLang(),
      players: [...players].filter(([id]) => human(id)).map(([id, p]) => [id, { name: p.name, avatar: p.avatar, lang: p.lang, score: p.score }]),
      current: live,
    };
    try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
  }
  function forget() {
    try { sessionStorage.removeItem(SAVE_KEY); } catch {}
  }

  async function resume() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null"); } catch {}
    if (!saved?.pin || saved.phase === "setup" || !saved.questions?.length || Date.now() - saved.at > SAVE_MAX_AGE) { forget(); return; }
    const elapsed = Date.now() - saved.at;
    try {
      settings = saved.settings;
      questions = saved.questions;
      qi = saved.qi;
      played = saved.played ?? [];
      if (saved.shownLang) $("[data-show-lang]").value = saved.shownLang;
      for (const [id, p] of saved.players ?? []) players.set(id, { ...p, online: false });
      await openRoom({ pin: saved.pin, ...(saved.room ?? {}) });
    } catch (err) {
      console.error("[live-quiz] resume failed:", err);
      players.clear();
      forget();
      return;
    }
    // The browser keeps the history entry across a reload; Back still returns to the setup.
    if (history.state?.lq !== "game") history.pushState({ lq: "game" }, "");
    if (saved.shown) shown = saved.shown;
    phase = saved.phase;
    if (phase === "lobby") { show("lobby"); renderLobby(); return; }
    if (shown) remember(shown.event, shown.payload);
    if (phase === "question" && saved.current) ask({ ...saved.current, elapsed });
    else if (phase === "podium") podium({ again: true });
    else { before = new Map(ranking().map(([id, p], i) => [id, { i, score: p.score }])); renderBoard(); }
  }

  addEventListener("pagehide", () => {
    if (!ch) return;
    save();
    // Signed ahead of time (secure.js): there is no waiting for a signature on pagehide.
    ch.send({ type: "broadcast", event: "leaving", payload: signer ? signer.farewell ?? {} : {} });
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });

  mountSoundToggles(root);
  mountMusicPickers(root);
  preloadMusic();
  loadText(() => { if (phase === "lobby") renderLobby(); });
  show("setup");
  resume();
  return { get pin() { return pin; }, get players() { return players; } };
}

