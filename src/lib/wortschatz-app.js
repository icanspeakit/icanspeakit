// Unified engine for the Wortschatz page (Karteikarten / Lernen / Wortliste), matching
// the "Wortschatz Prototyp" design: one shared deck position, one results map keyed
// `${mode}:${cardIndex}`, and a selection-based custom round ("Auswahl testen") that flows
// from Wortliste into the cards.
//
// Testing is the card deck itself: flip, then say whether you knew it (Richtig / Falsch).
// There used to be a separate Testen tab where the answer was typed. Typing tested
// spelling and umlauts on a phone keyboard more than it tested the word, and it split one
// habit — see a word, recall it, check — across two tabs. Kept page-local (not the shared quiz.js/flashcards.js engines)
// because those are reused by other practice pages with a different, simpler visual language.

import { judgeSound } from "./uiSound.js";
import { withBase, currentPath } from "./paths.js";
import { getLang, loadDict, translate, onLangChange } from "./i18n.js";
import { mascotSvg } from "./mascots.js";
import { setWaiting, waitAttrs } from "./notReady.js";
import wortarten from "../data/wortarten.json";

const PUNCT_RE = new RegExp("[.!?,;:„“”\"']", "g");

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(PUNCT_RE, "")
    .replace(/\s+/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// One card language for every deck on the site — see the comment where it is read.
import { CARD_LANG_KEY, CARD_LANG_EVENT } from "./cardLangGloss.js";
import { loadScriptFont } from "./scriptFonts.js";
import { languageOf } from "./languages.js";
import { suggestedLang } from "./languagePicker.js";
import { openCardLangPicker, closeCardLangPicker } from "./cardLangPicker.js";
import { KLASS_MAX, KLASS_MIN, klassLangs, klassOn, lastKlasse, mayUseKlass, saveKlassLangs, setKlassOn, teacherClasses } from "./klassenansicht.js";
import { track } from "./track.js";
import { sameMeaning } from "./sameMeaning.js";
import { gapTokens } from "./exampleGap.js";
import { meldenLinkHtml, onMeldenClick } from "./meldung.js";
import { cleanRef, fingerprint } from "./meldungRef.js";

export function mountWortschatzApp(els, cards, langList, { onAnswer, onSessionStart, canContinue } = {}) {
  const { tabsEl, langTabsEl, deckChip, counterEl, contentEl, eyebrowEl } = els;
  /* #fc-langs also names the registry languages this deck does not fully cover (`soon`,
     VokabelTrainer.astro): never selectable, shown greyed under „Bald" in the picker so a
     learner sees their language is coming instead of finding it missing. */
  const soonCodes = langList.filter((l) => l.soon).map((l) => l.code);
  const languages = langList.filter((l) => !l.soon);
  // What destroy() undoes: listeners on document/window, which outlive the trainer's own
  // elements when a deck is swapped in place (src/lib/deckSwap.js).
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  // A Lernset's printable sheet (VokabelTrainer printHref), linked from the Wortliste tab.
  const printHref = document.getElementById("vp-page")?.dataset.printHref || "";

  /* Two different "languages" meet on this page and must not be confused. `state.lang` is
     the language of the VOCABULARY — which column of card.translations the deck quizzes
     against — and the learner picks it from the toolbar tabs. `uiDict` is the language of
     the INTERFACE, the site-wide choice in the header. A Turkish speaker studying the
     Arabic column is a legitimate combination, so the two are kept apart.

     Everything this engine paints goes through render(), so keeping the dict in a
     variable and re-rendering on a UI language change is the whole integration. The dict
     starts as the German base rather than empty: mountWortschatzApp() paints immediately
     and the fetch has not landed yet, so without a seed the first frame would show raw
     key names. loadDict() layers the chosen language over German (see mergedDict in
     i18n.js), so an untranslated key falls back to German rather than to a key. */
  let uiDict = {};
  const t = (key, vars) => translate(uiDict, key, vars);

  /* "Problem melden" under the card (docs/problem-melden-tier0-v1.md): w:<card id>, the
     lexicon id for the level decks and Lernsets. Not on a teacher's own runtime set: those
     words are theirs, not ours to fix. The snapshot carries the language column the learner
     sees, since a wrong translation is the likeliest report. */
  const meldenOn = !document.getElementById("fc-data")?.hasAttribute("data-runtime");
  const cardTarget = (card) => {
    const ref = card && cleanRef(`w:${card.id ?? card.front}`);
    if (!ref) return null;
    return {
      ref,
      fingerprint: fingerprint(card.front, card.translations?.en ?? ""),
      snapshot: () => ({ wort: card.front, sprache: state.lang, uebersetzung: card.translations?.[state.lang] ?? null, englisch: card.translations?.en ?? null, beispiel: card.example ?? null, wortart: card.pos ?? null }),
    };
  };
  if (meldenOn) onMeldenClick(contentEl, () => cardTarget(cards[state.idx]));

  /* The eyebrow names the tab you are on, so it reuses the tab buttons' own keys
     (wortschatz.tab.*) rather than a parallel set that could drift out of step with them. */
  const eyebrowKeys = { cards: "wortschatz.tab.cards", learn: "wortschatz.tab.learn", list: "wortschatz.tab.list" };

  const state = {
    mode: "cards",
    lastMode: "cards",
    idx: 0,
    lang: languages[0]?.code ?? null,
    dir: "toDe",
    flipped: false,
    pick: null,
    results: {},
    // Latest verdict per card index, whichever mode produced it. `results` stays keyed by
    // mode because the cards keep their own score; the Wortliste wants "how does this word
    // stand right now", and a word answered in Lernen and then on a card has one standing.
    lastResult: {},
    selected: {},
    filter: null,
    part: 0,
    tick: 0,
    // Wortliste-local view state. Survives reset() — switching tabs or languages should
    // not silently drop the search someone is in the middle of.
    listQuery: "",
    listSort: "deck",
    // Wortliste scope on a deck cut into Runden: the Runde on screen, or the whole level.
    listAll: false,
    // The Lernen round — see startRound(). Survives reset(); only a new round clears it.
    learnSeq: null,
    learnPos: 0,
    learnFirst: {},
    learnRetry: {},
    // Karteikarten: cards marked Falsch that come back in this round (see judge()).
    cardBack: [],
    retryFrom: null,
  };

  /* Where the learner is in this deck, kept for the tab's lifetime. A link off the card
     (Regi's "Alle Wortarten", a grammar topic) and the browser's Back used to come home to
     card 1 of Runde 1 with the score gone, whenever the browser rebuilt the page instead of
     restoring it. sessionStorage, keyed by the page: this tab only, gone when it closes,
     so a fresh visit tomorrow still starts clean. Checked against the deck size, so a deck
     that changed in a deploy is not resumed at the wrong card. */
  const SAVE_KEY = `da-vt-session:${currentPath().replace(/\/+$/, "")}`;
  const SAVED = ["mode", "lastMode", "idx", "lang", "dir", "results", "lastResult", "selected", "filter", "part", "done", "listQuery", "listSort", "listAll", "learnSeq", "learnPos", "learnFirst", "learnRetry", "cardBack", "retryFrom"];
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || "null");
    if (saved && saved.n === cards.length && saved.idx >= 0 && saved.idx < cards.length) {
      for (const k of SAVED) if (k in saved) state[k] = saved[k];
      if (!languages.some((l) => l.code === state.lang)) state.lang = languages[0]?.code ?? null;
      // A round that does not fit this deck any more is dropped, not resumed half-way.
      const seq = state.learnSeq;
      const fits = Array.isArray(seq) && seq.every((i) => Number.isInteger(i) && i >= 0 && i < cards.length)
        && state.learnPos >= 0 && state.learnPos < seq.length;
      if (seq != null && !fits) Object.assign(state, { learnSeq: null, learnPos: 0, learnFirst: {}, learnRetry: {} });
    }
  } catch {}
  /* ?wort=<lexicon id>: the site search links a word to its card, not to card 1 of its
     set. It wins over the tab's saved place, and leaves the URL once read, so Back or a
     reload resumes where the learner went on from there. */
  const params = new URLSearchParams(location.search);
  const wanted = params.get("wort");
  if (wanted) {
    const i = cards.findIndex((c) => c.id === wanted);
    if (i >= 0) {
      Object.assign(state, {
        mode: "cards", lastMode: "cards", idx: i, filter: null, flipped: false,
        part: Math.floor(i / 25),
      });
    }
    params.delete("wort");
    const qs = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }
  /* The card language is the learner's, not the deck's. It used to live only in the
     per-page session above, so choosing العربية on "Familie" and opening "Wohnen" next
     came back to the German tab — every set, every time. Now the choice is one setting for
     every deck (localStorage), and it wins over a deck's own session: a learner who
     switched to Türkçe on set B and goes back to set A wants Türkçe there too. With no
     choice yet, a site switched to one of the card languages starts the cards in it.
     A deck that lacks the language falls back to the default below and leaves the stored
     choice alone for the next deck that has it.

     KARTENSPRACHE Tier 3: with no choice yet the cards no longer start on „Auf Deutsch" but
     in a language the learner probably reads – the interface language when it is not German,
     else the first of the browser's languages this deck has, else English. Nothing is asked:
     the button already says what was chosen. „Auf Deutsch" is no longer a language but the
     toggle „Erklärung auf Deutsch", kept in its own key (ERKL_KEY), so switching it off comes
     back to the language it was switched on over. An old stored "de" becomes that toggle. */
  const has = (code) => !!code && languages.some((l) => l.code === code);
  const ERKL_KEY = "da-vt-erklaerung";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  let storedLang = lsGet(CARD_LANG_KEY);
  let erkl = lsGet(ERKL_KEY) === "1";
  if (storedLang === "de") {
    erkl = true;
    storedLang = null;
    lsSet(ERKL_KEY, "1");
    lsSet(CARD_LANG_KEY, null);
  }
  /* KARTENSPRACHE Tier 4: „Alle Sprachen" left the learners' choice and became the teachers'
     Klassenansicht. A stored "all" is cleared here; on a teacher's browser the Klassenansicht
     takes its place once the account is known (end of mount). */
  const migrateAll = storedLang === "all";
  if (migrateAll) {
    storedLang = null;
    lsSet(CARD_LANG_KEY, null);
  }
  const translatable = () => languages.map((l) => l.code).filter((c) => c !== "de" && c !== "all");
  function defaultLang() {
    const codes = translatable();
    const ui = getLang();
    if (ui !== "de" && codes.includes(ui)) return ui;
    return suggestedLang(codes) ?? (codes.includes("en") ? "en" : codes[0] ?? languages[0]?.code ?? null);
  }
  // The language under the toggle: what „Erklärung auf Deutsch" switched off returns to.
  let foreign = storedLang && has(storedLang) ? storedLang : defaultLang();
  /* The Klassenansicht (src/lib/klassenansicht.js): 2–4 languages on one card, state.lang "all".
     On for this browser until „Klassenansicht beenden"; a deck that has fewer than two of its
     languages shows the ordinary card and leaves it on for the next deck. */
  const fitKlass = (codes) => codes.filter((c) => translatable().includes(c));
  let klass = (() => {
    const on = klassOn();
    return on && fitKlass(on.codes).length >= KLASS_MIN ? { ...on, codes: fitKlass(on.codes) } : null;
  })();
  const cardLang = () => (klass ? "all" : erkl && has("de") ? "de" : foreign);
  state.lang = cardLang();

  /* Card languages beyond the ones inlined in the page (SPRACHEN Tier 3, src/lib/glossen.js):
     their glosses are one static file per language, fetched the first time the language is
     chosen and written into card.translations, so everything below reads them like any other
     column. One request per language and page; a failed one is retried on the next choice. */
  const glossLoads = {};
  function ensureGlosses(code) {
    if (!languages.find((l) => l.code === code)?.fetch) return Promise.resolve();
    glossLoads[code] ??= fetch(withBase(`/vocabulary/glosses/${code}.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((map) => {
        for (const c of cards) if (c.id && map[c.id]) (c.translations ??= {})[code] = map[c.id];
      })
      .catch(() => { delete glossLoads[code]; });
    return glossLoads[code];
  }

  /* The languages pinned to the old „Alle Sprachen" (version G of /testnavbarlanguages,
     `da-card-pins`) are the Klassenansicht's first suggestion, after the card language. */
  const oldPins = (() => {
    try {
      const v = JSON.parse(localStorage.getItem("da-card-pins") || "[]");
      return Array.isArray(v) ? v.filter((c) => typeof c === "string") : [];
    } catch { return []; }
  })();
  /** The Klassenansicht's languages, in the order the teacher's list has them. */
  const allCodes = () => klass?.codes ?? [];
  /** A first choice for a class: the card language, old pins, then the languages that ship in
   *  the page (en, ar, uk, ru, tr) – the old „Alle Sprachen", up to KLASS_MAX. */
  const defaultKlass = () => {
    const inlined = languages.filter((l) => !l.fetch).map((l) => l.code);
    return fitKlass([...new Set([foreign, ...oldPins, ...inlined])]).slice(0, KLASS_MAX);
  };

  function saveSession() {
    try {
      const out = { n: cards.length };
      for (const k of SAVED) out[k] = state[k];
      sessionStorage.setItem(SAVE_KEY, JSON.stringify(out));
    } catch {}
  }

  let sessionStarted = false;
  // Set by a finished swipe, cleared by the click it swallows — see attachSwipe(). The
  // timer is the safety net: a browser only emits that click sometimes, and a flag left
  // standing would eat a deliberate tap on the next card.
  let suppressClick = false;
  function swallowNextClick() {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 400);
  }

  /* Lernen: after an answer the next card comes by itself. A wrong answer used to be a
     dead stop until "Nächste Karte", and a learner who has just missed two words in a row
     is the one most likely to leave there. The pause is long enough to see the right
     answer (wrong) or the tick (right); any tap or Enter/Space in the card ends it early.
     A card with a usage note waits for the tap — there is something to read. Someone
     working by keyboard gets 3 s, so a screen reader can finish the announcement.
     One timer, cleared by reset() (every navigation, tab, language and direction change)
     and when the tab is hidden; advanceNow() checks state.pick, so a tap landing together
     with the timer cannot skip a card. */
  const ADVANCE_MS = { ok: 600, no: 1200, keyboard: 3000 };
  let advanceTimer = null;
  // A quick double tap must not carry into the card that just came up — skipping it, or
  // answering it blind on whatever option sits under the finger. See the click guard below.
  const ADVANCE_GUARD_MS = 400;
  let advancedAt = 0;
  let lastInput = "pointer";
  // Where focus goes after the next renderLearn() — only for keyboard use, see go()/pickOption().
  let focusAfter = null;
  function clearAdvance() { clearTimeout(advanceTimer); advanceTimer = null; }
  function advanceNow() {
    if (state.mode !== "learn" || !state.pick || state.done) return;
    advancedAt = Date.now();
    go(1);
  }
  listen(document, "keydown", () => { lastInput = "key"; }, true);
  listen(document, "pointerdown", () => { lastInput = "pointer"; }, true);
  listen(document, "visibilitychange", () => { if (document.hidden) clearAdvance(); });
  // The verdict for screen readers. It lives outside contentEl, which is replaced on every
  // render — a live region that is itself new is often not announced.
  const liveEl = document.createElement("p");
  liveEl.className = "vt-sr";
  liveEl.setAttribute("aria-live", "polite");
  contentEl.after(liveEl);

  /* A level deck is 650 cards, and a counter reading "01 / 650" is a wall, not a target:
     the learner has done one card and the number tells them about the 649 waiting. So a
     deck bigger than one sitting runs in parts of PART_SIZE — the counter says "01 / 25",
     the chip says which Runde — and the parts join end to end, so going past the last card
     of a part opens the next one rather than looping. "Runde", not "Teil": a Teil is a
     Portion route (a1-teil-03), a different 20-word cut of the same level, and Runde is
     what the Artikel-Trainer already calls a sitting. It is the same 650 words; it is just
     handed over in pieces someone can finish. PART_SIZE matches the Lernset (25 words) and
     the Artikel-Runde, so "one sitting" means the same thing everywhere on the site.

     A selection made in the Wortliste tab is already a hand-picked deck, so it is never
     cut further. */
  const PART_SIZE = 25;
  const partCount = Math.max(1, Math.ceil(cards.length / PART_SIZE));
  const chunked = partCount > 1;

  function filtered() {
    return !!(state.filter && state.filter.length);
  }

  function deck() {
    if (filtered()) return state.filter;
    if (!chunked) return cards.map((_, i) => i);
    const from = state.part * PART_SIZE;
    return cards.slice(from, from + PART_SIZE).map((_, i) => from + i);
  }

  /** Jump to a part, landing on its first card — or its last, when we arrived backwards. */
  function setPart(n, edge) {
    const part = (n + partCount) % partCount;
    const from = part * PART_SIZE;
    const size = Math.min(PART_SIZE, cards.length - from);
    reset({ part, idx: edge === "last" ? from + size - 1 : from });
    noteActivity();
    render();
  }

  /* Coaching hint ("Umdrehen für Englisch", "Tippen zum Umdrehen · wischen zum Blättern").
     It teaches the card in the first two seconds and then repeats itself once per word,
     25 times a set. So it shows once on arrival, fades out the moment the learner touches
     anything, and stays gone for every card after that — a flashcard only needs explaining
     once. The idle timer is the rescue for the learner it did not reach: a card left
     untouched on its front face for COACH_IDLE_MS means the gesture never landed, so the
     line fades back in until the next interaction. Armed only on the unflipped front —
     sitting on an answer for eight seconds is reading, not confusion. */
  const COACH_IDLE_MS = 8000;
  let coachOn = true;
  let idleTimer = null;

  function setCoach(on) {
    coachOn = on;
    contentEl.classList.toggle("vt-coach-on", on);
  }
  function armIdleCoach() {
    clearTimeout(idleTimer);
    if (state.mode !== "cards" || state.flipped) return;
    idleTimer = setTimeout(() => setCoach(true), COACH_IDLE_MS);
  }
  function noteActivity() {
    if (coachOn) setCoach(false);
    armIdleCoach();
  }


  function langMeta() {
    // The Klassenansicht is not one of the deck's languages: its side is named by its languages.
    if (state.lang === "all") return { code: "all", deName: allCodes().map((c) => languageOf(c)?.native ?? c).join(" · ") };
    return languages.find((l) => l.code === state.lang) || languages[0] || {};
  }

  /* The vocabulary language named in the INTERFACE language: "Englisch" on a German page,
     "English" on an English one. meta.deName is the German name and stays the fallback. */
  function langName(meta = langMeta()) {
    if (meta.code === "all") return meta.deName;
    const key = `vt.lang.${meta.code}`;
    return uiDict[key] != null ? t(key) : meta.deName ?? meta.label ?? "";
  }

  function foreignText(card) {
    // "Alle Sprachen" as plain text (Lernen, Wortliste): every translation, one after the other.
    if (state.lang === "all") {
      const all = allCodes().map((c) => card.translations?.[c]).filter((v) => v && v.trim());
      return all.length ? all.join(" · ") : t("vt.translationPending");
    }
    const tr = state.lang ? card.translations?.[state.lang] : null;
    return tr && tr.trim() ? tr : t("vt.translationPending");
  }

  /* The picture of a concrete word (lexicon.js → card.img, OpenMoji). It sits on the side
     that has to work without a shared language: "Auf Deutsch" and "Alle Sprachen". On a
     single translation it would only repeat what the word already says — except where the
     picture adds something (`imgAlways`: a Redemittel position diagram, „Im Vordergrund …“). */
  const cueImg = (card) =>
    card.img && (card.imgAlways || state.lang === "de" || state.lang === "all")
      ? `<img class="vt-cue-img${/\/(bildposition|praeposition)\//.test(card.img) ? " vt-cue-img--pos" : ""}" src="${escapeHtml(withBase(card.img))}" alt="" width="88" height="88" loading="lazy">`
      : "";

  /** Every translation on one side, one per line, each in its own direction. No language
   *  codes: the scripts tell the languages apart, and "RU" in front of a word read as a
   *  label the learner had to decode. Pinned languages follow below a thin „Dazu" line,
   *  each with its name: Persian next to Arabic is the same script. */
  function allHtml(card) {
    // Klassenansicht (Tier 4): one row per language, no names – the line above the card
    // already lists them. The rows line up on the left; only RTL text runs right to left.
    const rows = allCodes().map((code) => {
      const v = card.translations?.[code];
      if (!v || !v.trim()) return "";
      const reg = languageOf(code);
      return `<span class="vt-all-row"><span lang="${code}"${reg?.dir === "rtl" ? ' dir="rtl"' : ""}>${escapeHtml(v)}</span></span>`;
    }).join("");
    return `<span class="vt-all">${rows || escapeHtml(t("vt.translationPending"))}</span>`;
  }

  // front()/back() follow the toolbar direction switch: "toDe" quizzes the foreign phrase
  // and expects German back; "fromDe" is the reverse.
  function front(card) { return state.dir === "toDe" ? foreignText(card) : card.front; }
  function back(card) { return state.dir === "toDe" ? card.front : foreignText(card); }

  /* ---- Der, die, das ------------------------------------------------------
     A noun is shown with its article, because that is what has to be learnt: nobody
     needs "Name", everybody needs "der Name". The article keeps its own element and its
     own colour (the palette the Aussprache page already uses: der blue, die amber, das
     grey), so the gender can be seen rather than read — and so sorting and grading go on
     working off the bare lemma underneath it.

     Only nouns have one; verbs, adjectives and phrases render exactly as before. */
  const isDeSide = (which) => (which === "front" ? state.dir !== "toDe" : state.dir === "toDe");

  /** The colour class for an article: gender, except that a Pluraletantum's "die" is a
   *  plural article wearing the feminine's clothes and gets the plural colour. */
  const artClass = (card) => (card.pluralOnly ? "plural" : card.gender);

  /** The German side of a card, with the article and (on request) the plural. */
  function deHtml(card, { plural = false } = {}) {
    const word = escapeHtml(card.front);
    if (!card.gender) return word;
    const art = `<span class="vt-art vt-art--${escapeHtml(artClass(card))}">${escapeHtml(card.gender)}</span> `;
    const pl = plural && card.plural && !card.pluralOnly
      ? `<span class="vt-plural"><span class="vt-art vt-art--plural">${card.pluralArt ?? "die"}</span> ${escapeHtml(card.plural)}</span>`
      : "";
    // Both articles in use („das Pfand“, colloquially „der Pfand“): the second one small.
    const alt = card.genderAlt
      ? ` <span class="vt-art-alt">(auch: ${escapeHtml(card.genderAlt)})</span>`
      : "";
    return art + word + alt + pl;
  }

  /** „oder auch: der Müll“ — real synonyms (lexicon de-syn.json), on the German side only. */
  function synHtml(card) {
    if (!card.syn?.length) return "";
    // German whatever the interface language: it sits on the German face, as German.
    return `<span class="vt-syn" lang="de"><span class="vt-syn-label">oder auch:</span> ${card.syn.map(escapeHtml).join(", ")}</span>`;
  }

  /** Whichever side was asked for, ready to drop into innerHTML. */
  function sideHtml(card, which, opts) {
    if (isDeSide(which)) return deHtml(card, opts) + (opts?.syn ? synHtml(card) : "");
    if (card.imgOnly && card.img) return `<img class="vt-cue-img vt-cue-img--only" src="${escapeHtml(withBase(card.img))}" alt="" width="240" height="180">`;
    if (state.lang === "all") return cueImg(card) + allHtml(card);
    const raw = which === "front" ? front(card) : back(card);
    const speak = erklAudioHtml(card);
    if (!speak) return cueImg(card) + escapeHtml(raw);
    // The last word and the speaker do not break apart, so the button stays beside the
    // sentence instead of dropping onto a line of its own.
    const cut = raw.lastIndexOf(" ") + 1;
    return cueImg(card) + `<span class="vt-erkl">${escapeHtml(raw.slice(0, cut))}<span class="vt-erkl-end">${escapeHtml(raw.slice(cut))}${speak}</span></span>`;
  }

  /** The speaker beside the German explanation („Auf Deutsch“), styled like the one beside
   *  the example sentence. Only where the file exists: the page sets `deAudio` from disk. */
  function erklAudioHtml(card) {
    if (state.lang !== "de" || !card.deAudio) return "";
    const label = escapeHtml(t("vt.audio.playExplanation"));
    return `<button type="button" class="vt-audio vt-audio--ex vt-audio--erkl" data-audio="${escapeHtml(card.deAudio)}" aria-label="${label}" title="${label}">${SPEAKER_SVG}</button>`;
  }

  /** The article a label belongs to, for the multiple-choice options — they are compared
   *  as plain strings, so the gender is looked up rather than carried. */
  const genderOf = new Map(cards.filter((c) => c.gender).map((c) => [c.front, [c.gender, artClass(c)]]));
  function labelHtml(label) {
    const g = isDeSide("back") ? genderOf.get(label) : null;
    return g
      ? `<span class="vt-art vt-art--${escapeHtml(g[1])}">${escapeHtml(g[0])}</span> ${escapeHtml(label)}`
      : escapeHtml(label);
  }

  /** The full form to name in feedback: "der Name", not "Name". */
  const fullDe = (card) => (card.gender ? `${card.gender} ${card.front}` : card.front);

  /* A typed answer is right when the WORD is right. The article may be left off or got
     wrong without costing the point — it was never asked for, and a learner who is
     punished for a rule the exercise did not announce stops trusting the score. The
     feedback names the full form either way, so the gender is still taught. */
  function record(ok) {
    state.results[`${state.mode}:${state.idx}`] = ok;
    state.lastResult[state.idx] = ok;
    if (onAnswer) onAnswer(ok, cards[state.idx], state.idx);
  }

  function reset(extra) {
    clearAdvance();
    liveEl.textContent = "";
    state.tick++;
    state._learnOptions = null;
    Object.assign(state, { flipped: false, pick: null, done: false, cardAgain: false }, extra);
  }

  /* ---- Lernen round ------------------------------------------------------------------
     A round is the deck in order, with every card missed on its first answer put back in
     once, RETRY_GAP cards later (or as the last card when fewer remain). The order lives in
     learnSeq and the place in learnPos, because a card that comes back sits in two places
     and deck().indexOf(idx) can no longer say where we are. learnFirst / learnRetry hold
     each turn's answer ({ ok, pick, options }; a queued retry is null), so going back to
     an answered card shows it answered instead of asking — and recording — it again.
     Only the first answer is the word's verdict (results "learn:", lastResult, onAnswer).
     The retry goes to "learn-retry:" and nowhere else: a word does not count as known,
     or as one more done in the side nav, because it was right three cards after being
     shown the answer. */
  const RETRY_GAP = 3;

  function startRound(dk = deck()) {
    const p = dk.indexOf(state.idx);
    Object.assign(state, { learnSeq: dk.slice(), learnPos: p < 0 ? 0 : p, learnFirst: {}, learnRetry: {} });
    state.idx = state.learnSeq[state.learnPos];
  }

  /** Keeps the round in step with deck() and state.idx, which other tabs move. */
  function ensureRound() {
    const dk = deck();
    const seq = state.learnSeq;
    const inDeck = new Set(dk);
    const same = Array.isArray(seq) && new Set(seq).size === inDeck.size && seq.every((i) => inDeck.has(i));
    if (!same) { startRound(dk); return; }
    if (seq[state.learnPos] !== state.idx) {
      const p = seq.indexOf(state.idx);
      if (p < 0) startRound(dk);
      else state.learnPos = p;
    }
  }

  const isRetryTurn = () => state.learnSeq.indexOf(state.idx) !== state.learnPos;
  const turnAnswer = () => (isRetryTurn() ? state.learnRetry : state.learnFirst)[state.idx];

  function goLearn(d) {
    ensureRound();
    const at = state.learnPos + d;
    if (at < 0) {
      if (chunked && !filtered()) setPart(state.part - 1, "last");
      return;
    }
    if (at >= state.learnSeq.length) {
      // Past the last turn the round ends on its result, with the missed words listed.
      // The round itself stays in state until a button on that screen starts the next one.
      reset({ done: true });
      noteActivity();
      render();
      dispatchEvent(new CustomEvent("da:round", { detail: { kind: "karten", total: deck().length } }));
      return;
    } else {
      if (lastInput === "key") focusAfter = "option";
      reset({ idx: state.learnSeq[at], learnPos: at });
    }
    noteActivity();
    render();
  }

  function go(d) {
    const dk = deck();
    // On the round's end screen: back returns to the last card, forward has nowhere to go.
    if (state.done) {
      if (d < 0) { reset({ idx: state.idx }); render(); }
      return;
    }
    if (state.mode === "learn") { goLearn(d); return; }
    // Forward, a card marked Falsch comes back once its gap has passed; back from a card
    // that came back returns to where the deck was.
    if (state.mode === "cards" && d > 0 && cardComesBack(dk)) return;
    if (state.retryFrom != null) {
      const from = state.retryFrom;
      state.retryFrom = null;
      if (d < 0) { reset({ idx: from }); render(); return; }
      state.idx = from;
    }
    const p = dk.indexOf(state.idx);
    const at = (p < 0 ? 0 : p) + d;
    /* Past the last card a round ends — whether or not every card was marked. It used to
       wrap to card 1 (a single-part deck or a selection) or slide into the next part, so
       "Weiter" never reached an end, and a learner who never pressed "Richtig" had no way
       to finish at all. Now the last "Weiter" opens the round's result. */
    if (d > 0 && at >= dk.length && state.mode === "cards") {
      // The ones still waiting come first, however short their gap.
      if (cardComesBack(dk, true)) return;
      reset({ done: true, cardBack: [] });
      noteActivity();
      render();
      // A finished Karteikarten round (src/lib/touchpoints.js listens).
      dispatchEvent(new CustomEvent("da:round", { detail: { kind: "karten", total: dk.length } }));
      return;
    }
    if (chunked && !filtered() && (at < 0 || at >= dk.length)) {
      setPart(state.part + (d > 0 ? 1 : -1), d > 0 ? "first" : "last");
      return;
    }
    reset({ idx: dk[(at + dk.length) % dk.length] });
    noteActivity();
    render();
  }

  function flip() {
    if (state.done) return;
    state.flipped = !state.flipped;
    noteActivity();
    // Toggle the class on the existing element rather than re-rendering: a fresh
    // .vt-flip-inner created via innerHTML already starts in its target rotation, so the
    // CSS transition never has a "from" state to animate — the flip just snaps instantly.
    const inner = state.mode === "cards" ? contentEl.querySelector(".vt-flip-inner") : null;
    if (inner) {
      inner.classList.toggle("is-flipped", state.flipped);
      // The card lights up as it turns: a tap that answers at once, not only a rotation
      // (vokabeltrainer.css .is-lit). Removed and re-added so a second tap replays it.
      inner.classList.remove("is-lit");
      void inner.offsetWidth;
      inner.classList.add("is-lit");
      // The Richtig/Falsch pair only makes sense once the answer is showing.
      contentEl.querySelector("#vt-nav-row")?.classList.toggle("is-flipped", state.flipped);
      contentEl.querySelector("#vt-info")?.classList.toggle("is-shown", exampleShown());
      const exEl = contentEl.querySelector("#vt-info-ex-text");
      if (exEl) exEl.innerHTML = exampleHtml(cards[state.idx]);
    } else render();
  }

  function setMode(mode) {
    reset({ mode });
    if (mode !== "cards") clearTimeout(idleTimer);
    if (mode !== "list") state.lastMode = mode;
    render();
  }

  // The free daily meter (VokabelTrainer.astro): once it says stop, the round ends on its
  // result screen instead of serving another card.
  const stopNow = () => canContinue && !canContinue();

  function pickOption(label) {
    if (state.pick) return;
    const card = cards[state.idx];
    const ok = label === back(card);
    const idx = state.idx;
    state.pick = label;
    const entry = { ok, pick: label, options: state._learnOptions };
    if (isRetryTurn()) {
      if (!state.learnRetry[idx]) {
        state.learnRetry[idx] = entry;
        state.results[`learn-retry:${idx}`] = ok;
      }
    } else if (!state.learnFirst[idx]) {
      state.learnFirst[idx] = entry;
      record(ok);
      // Missed: back once, RETRY_GAP cards on. A second miss is not queued again.
      if (!ok && !(idx in state.learnRetry)) {
        state.learnSeq.splice(Math.min(state.learnPos + RETRY_GAP + 1, state.learnSeq.length), 0, idx);
        state.learnRetry[idx] = null;
      }
    }
    if (stopNow()) { reset({ done: true }); render(); return; }
    const keyboard = lastInput === "key";
    if (keyboard) focusAfter = "next";
    render();
    const note = learnNote(card);
    liveEl.textContent = [
      t(ok ? "vt.learn.right" : "vt.learn.wrong"),
      ok ? "" : t("vt.feedback.expected", { answer: isDeSide("back") ? fullDe(card) : back(card) }),
      note,
    ].filter(Boolean).join(" ");
    if (!hasUsageNote(card)) advanceTimer = setTimeout(advanceNow, keyboard ? ADVANCE_MS.keyboard : ok ? ADVANCE_MS.ok : ADVANCE_MS.no);
  }

  // A note that explains usage may carry a key for the UI language (see wortschatz.astro).
  function learnNote(card) {
    return card.noteKey && uiDict[card.noteKey] != null ? t(card.noteKey) : card.note || "";
  }

  /* Only a real usage note holds the card. A lexicon card's `note` is its example sentence
     (toCard in lexicon.js), which every A1 word has — holding on those would mean the
     flow never runs. The sentence still shows in the feedback while the pause lasts. */
  function hasUsageNote(card) {
    return !!card.noteKey || (!!card.note && card.note !== card.example);
  }

  /* Karteikarten: a card marked Falsch comes back once, CARD_BACK_GAP cards later — the
     paper Karteikarte put back a few cards down the pile. Its long-term memory is the
     spaced repetition (onAnswer → srs.js grade: box 0, due today). The card that comes back
     is a second look, not a second verdict: as in Lernen, only the first answer counts. */
  const CARD_BACK_GAP = 3;

  /** Shows a waiting card if one is due (or any, at the deck's end); true if it did. */
  function cardComesBack(dk, any = false) {
    const queue = (state.cardBack ?? []).filter((b) => dk.includes(b.idx));
    queue.forEach((b) => b.wait--);
    const at = queue.findIndex((b) => any || b.wait <= 0);
    if (at < 0) { state.cardBack = queue; return false; }
    const [back] = queue.splice(at, 1);
    state.cardBack = queue;
    const from = state.retryFrom ?? state.idx;
    reset({ idx: back.idx, retryFrom: from, cardAgain: true });
    noteActivity();
    render();
    return true;
  }

  /* The self-check on a flipped card: the verdict is recorded, and the next card comes
     up — the same step a learner would take with a paper Karteikarte. */
  function judge(ok) {
    if (!state.flipped) return;
    judgeSound(ok);
    if (state.cardAgain) { go(1); return; }
    if (!ok && !(state.cardBack ?? []).some((b) => b.idx === state.idx)) {
      // +1: the step to the next card counts down too.
      state.cardBack = [...(state.cardBack ?? []), { idx: state.idx, wait: CARD_BACK_GAP + 1 }];
    }
    record(ok);
    if (stopNow()) {
      reset({ done: true });
      render();
      return;
    }
    go(1);
  }

  function toggleDir() {
    reset({ dir: state.dir === "toDe" ? "fromDe" : "toDe" });
    render();
  }

  // Patch the affected row's classes in place instead of calling render(): renderList()
  // rebuilds the whole .vt-content node, which replays the tab-swap fade/slide animation
  // across the entire list. Picking a word should only animate that word's checkmark dot.
  function updateListRow(i) {
    const row = contentEl.querySelector(`.vt-list-row[data-i="${i}"]`);
    if (!row) return;
    const selected = !!state.selected[i];
    row.classList.toggle("is-selected", selected);
    const pick = row.querySelector(".vt-list-pick");
    if (pick) pick.setAttribute("aria-checked", selected ? "true" : "false");
    const box = row.querySelector(".vt-list-box");
    if (!box) return;
    box.classList.toggle("is-selected", selected);
    if (selected) {
      // Restart the pop: the class may already be there from a previous selection.
      box.classList.remove("vt-pop");
      void box.offsetWidth;
      box.classList.add("vt-pop");
    }
  }

  function updateSelBar() {
    const selIds = selectedIds();
    const label = contentEl.querySelector(".vt-sel-label");
    if (label) {
      label.textContent = selIds.length
        ? t("vt.sel.count", { n: selIds.length, total: cards.length })
        : t("vt.sel.empty");
    }
    const bar = contentEl.querySelector(".vt-sel-bar");
    if (bar) bar.classList.toggle("has-selection", !!selIds.length);
    const startBtn = contentEl.querySelector("#vt-sel-start");
    if (startBtn) {
      startBtn.classList.toggle("is-active", !!selIds.length);
      setWaiting(startBtn, selIds.length ? null : t("vt.sel.pickFirst"));
      startBtn.textContent = !selIds.length ? t("vt.sel.test")
        : selIds.length === 1 ? t("vt.sel.testOne")
        : t("vt.sel.testMany", { n: selIds.length });
    }
    const allBtn = contentEl.querySelector("#vt-sel-all");
    if (allBtn) {
      const on = allVisibleSelected();
      allBtn.textContent = on ? t("vt.sel.none") : t("vt.sel.all");
      allBtn.setAttribute("aria-label", on ? t("vt.sel.allAriaOff") : t("vt.sel.allAriaOn"));
    }
  }

  function toggleSelect(i) {
    if (state.selected[i]) delete state.selected[i];
    else state.selected[i] = true;
    updateListRow(i);
    updateSelBar();
  }

  function jumpTo(i) {
    // From "Alle" the word can sit in another Runde; the cards open that Runde around it.
    const part = chunked && !filtered() ? Math.floor(i / PART_SIZE) : state.part;
    reset({ idx: i, part, mode: state.lastMode });
    render();
  }

  // The chip is the deck's label and its one control: it drops a selection when there is
  // one, and otherwise steps to the next part — the same thing running off the end of a
  // part does, for a learner who would rather skip ahead than page through.
  function deckChipClick() {
    if (filtered()) { reset({ filter: null, part: 0, idx: 0 }); render(); return; }
    if (chunked) setPart(state.part + 1);
  }

  function startSelection() {
    const ids = selectedIds();
    if (!ids.length) return;
    reset({ filter: ids, idx: ids[0], mode: "cards" });
    state.lastMode = "cards";
    render();
  }

  function clearSelection() {
    const prev = selectedIds();
    state.selected = {};
    prev.forEach(updateListRow);
    updateSelBar();
  }

  /* "Alle auswählen" means the rows you can currently see. With a search active,
     selecting the 2,900 words scrolled out of view would be a trap, not a shortcut. */
  function allVisibleSelected() {
    const rows = listRows();
    return rows.length > 0 && rows.every((i) => state.selected[i]);
  }

  function selectAll() {
    const rows = listRows();
    const on = !allVisibleSelected();
    rows.forEach((i) => {
      if (on) state.selected[i] = true;
      else delete state.selected[i];
    });
    rows.forEach(updateListRow);
    updateSelBar();
  }

  function selectedIds() {
    return Object.keys(state.selected).map(Number).sort((a, b) => a - b);
  }

  function optionLabels() {
    const idx = state.idx;
    const correct = back(cards[idx]);
    // Never a word that means the same (Abfall asked, Müll offered): it would be right too.
    const codes = state.lang === "all" ? allCodes() : [state.lang];
    const shape = (c) => ({ de: c.front, syn: c.syn, glosses: codes.map((l) => c.translations?.[l]) });
    const asked = shape(cards[idx]);
    const pool = cards
      .map((c, i) => ({ i, v: back(c) }))
      .filter((o) => o.i !== idx && o.v !== correct && !sameMeaning(asked, shape(cards[o.i])));
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const distractors = [];
    for (const o of shuffled) {
      if (distractors.length >= 3) break;
      if (!distractors.includes(o.v)) distractors.push(o.v);
    }
    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  /* ---- Pronunciation ------------------------------------------------------
     A word carries `audioSrc` only when a file for it exists (see toCard in
     lexicon.js), so coverage is partial by design while the lexicon is being voiced and
     every renderer keys off the field's presence rather than assuming a URL.

     One <Audio> for the page, not one per row: a 650-word list would otherwise hold 650
     media elements, and on a phone that is the kind of thing that gets a tab killed. */
  const SPEAKER_SVG =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  let player = null;
  function playAudio(src, btn, then = null) {
    if (!src) return;
    if (!player) player = new Audio();
    contentEl.querySelectorAll(".vt-audio.is-playing").forEach((b) => b.classList.remove("is-playing"));
    player.pause();
    player.src = withBase(src);
    if (btn) {
      btn.classList.add("is-playing");
      const done = () => btn.classList.remove("is-playing");
      // A second file to read after the first (the word, then its solved sentence): the
      // button keeps pulsing across both, with a breath between them.
      player.onended = then
        ? () => setTimeout(() => { if (btn.isConnected && btn.classList.contains("is-playing")) playAudio(then, btn); }, 350)
        : done;
      player.onerror = done;
    }
    // A play() the browser rejects (no gesture yet, decode failure) must not leave the
    // button stuck mid-pulse, so the spinner is cleared on rejection too.
    player.play().catch(() => btn && btn.classList.remove("is-playing"));
  }

  /** The button, or a spacer that keeps the column aligned for words with no file yet. */
  function audioBtnHtml(card, cls, { solved = false } = {}) {
    if (!card.audioSrc) return `<span class="vt-audio-gap ${cls}"></span>`;
    const label = escapeHtml(t("vt.audio.play", { word: card.spoken || card.front }));
    // On the face that shows the solved gap sentence, the speaker reads it after the word.
    const then = solved && card.solvedAudio ? ` data-audio-then="${escapeHtml(card.solvedAudio)}"` : "";
    return `<button type="button" class="vt-audio ${cls}" data-audio="${escapeHtml(card.audioSrc)}"${then} aria-label="${label}" title="${label}">${SPEAKER_SVG}</button>`;
  }

  /** Shared by every renderer: play and swallow, or say it was not ours. */
  function handleAudioClick(e) {
    const btn = e.target.closest("[data-audio]");
    if (!btn) return false;
    e.stopPropagation();
    playAudio(btn.dataset.audio, btn, btn.dataset.audioThen || null);
    return true;
  }

  const deckHasAudio = cards.some((c) => c.audioSrc);
  /* The face without the button holds an empty slot of the same size, so both faces stack
     the same heights and the word and its reveal land on one line as the card turns. */
  const faceAudioGap = deckHasAudio ? `<span class="vt-audio-gap vt-audio--face" aria-hidden="true"></span>` : "";

  /* "Continue here" is drawn as an arrow, and an arrow is the one glyph that carries a
     direction in its shape rather than in its position. postcss-rtlcss moves the button to
     the mirrored edge but cannot rewrite the character inside it, so in Arabic a
     right-pointing arrow would sit on the left and point back out of the row. Read the
     live direction instead of the language: dir is what the layout actually flipped on,
     and Layout.astro has already set it before the first paint. */
  const forward = () => (document.documentElement.dir === "rtl" ? "←" : "→");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function swapClass() { return state.tick % 2 ? "vt-swap-a" : "vt-swap-b"; }


  /* Only a choice away from the site's language is a decision of its own. Picking the tab
     that matches it (Español on a Spanish site, „Auf Deutsch" on a German one) keeps the
     cards following the site, so switching the site later takes them along. */
  const siteCardLang = () => (getLang() === "de" ? "de" : getLang());
  function storeCardLang(code) {
    try {
      if (code === siteCardLang()) localStorage.removeItem(CARD_LANG_KEY);
      else localStorage.setItem(CARD_LANG_KEY, code);
    } catch {}
  }

  /* A fetched language's glosses are on their way: the button shows a spinner meanwhile,
     and the card stays on the old language instead of going blank. */
  let pendingLang = null;
  function chooseCardLang(code, via) {
    track("language_selected", { lang: code, surface: "cards", via });
    storeCardLang(code);
    storedLang = code;
    foreign = code;
    if (erkl) { erkl = false; lsSet(ERKL_KEY, null); }
    dispatchEvent(new CustomEvent(CARD_LANG_EVENT, { detail: { lang: code } }));
    pendingLang = code;
    renderToolbar();
    ensureGlosses(code).then(() => {
      if (pendingLang !== code) return; // a later choice won
      pendingLang = null;
      reset({ lang: code });
      render();
    });
  }

  /** „Erklärung auf Deutsch" on or off: the card's other side becomes the German synonym or
   *  explanation (lexicon deHint), or goes back to the language it was switched on over. */
  function setErkl(on) {
    erkl = on;
    lsSet(ERKL_KEY, on ? "1" : null);
    track("card_erklaerung", { on });
    const code = cardLang();
    dispatchEvent(new CustomEvent(CARD_LANG_EVENT, { detail: { lang: code } }));
    ensureGlosses(code).then(() => {
      reset({ lang: code });
      render();
    });
  }

  /** A card language's name on the button and in the picker: its own name, in its own script. */
  function nativeLabel(code) {
    if (code === "de") return t("vt.lang.de");
    if (code === "all") return allCodes().map((c) => languageOf(c)?.native ?? c).join(" · ");
    return languageOf(code)?.native ?? languages.find((l) => l.code === code)?.label ?? code;
  }

  /** What the picker lists: the deck's languages in registry order. „Auf Deutsch" is the toggle
   *  beside the button, „Alle auf einer Karte" the teachers' Klassenansicht (Tier 4). */
  const pickerItems = () => translatable();

  /* ---- Klassenansicht -------------------------------------------------------------------
     The dialog is the picker with 2–4 ticks; a teacher with classes chooses which class the
     languages are for, and each class keeps its own (klassenansicht.js). */
  async function openKlassDialog(anchor) {
    const classes = await teacherClasses();
    // In a lesson its group comes first (only lessons offer the select, klassenansicht.js).
    let klasse = classes.find((k) => k.lesson)?.id ?? klass?.klasse ?? lastKlasse();
    if (!classes.some((k) => k.id === klasse)) klasse = null;
    const preset = (k) => {
      const saved = fitKlass(klassLangs(k));
      return saved.length ? saved : defaultKlass();
    };
    let top = null;
    let picker = null;
    if (classes.length) {
      top = document.createElement("label");
      top.className = "clp-for";
      top.innerHTML = `<span>${escapeHtml(t("vt.kl.for"))}</span><select data-kl-class>
          <option value="">${escapeHtml(t("vt.kl.thisBrowser"))}</option>
          ${classes.map((k) => `<option value="${escapeHtml(k.id)}"${k.id === klasse ? " selected" : ""}>${escapeHtml(k.name)}</option>`).join("")}
        </select>`;
      top.querySelector("select").addEventListener("change", (e) => {
        klasse = e.target.value || null;
        picker?.setSelected(preset(klasse));
      });
    }
    picker = openCardLangPicker({
      anchor,
      items: translatable(),
      soon: soonCodes,
      t,
      title: t("vt.kl.title"),
      multi: { selected: preset(klasse), min: KLASS_MIN, max: KLASS_MAX, hint: t("vt.kl.hint"), done: t("vt.kl.start"), top, onDone: (codes) => startKlass(codes, klasse) },
    });
  }

  function startKlass(codes, klasse = null) {
    setKlassOn(codes, klasse);
    saveKlassLangs(codes, klasse);
    track("klassenansicht", { n: codes.length, klasse: !!klasse });
    klass = { codes, klasse };
    contentEl.setAttribute("aria-busy", "true");
    Promise.all(codes.map(ensureGlosses)).then(() => {
      contentEl.removeAttribute("aria-busy");
      if (!klass) return;
      reset({ lang: "all" });
      render();
      langTabsEl.querySelector("[data-kl-end]")?.focus({ preventScroll: true });
    });
  }

  function endKlass() {
    setKlassOn(null);
    klass = null;
    const code = cardLang();
    ensureGlosses(code).then(() => {
      reset({ lang: code });
      render();
      langTabsEl.querySelector("[data-cl-open]")?.focus({ preventScroll: true });
    });
  }

  // The Klassenansicht buttons (DeckActions, the teacher set page) are outside the trainer.
  listen(document, "click", (e) => {
    const btn = e.target.closest?.("[data-klassenansicht]");
    if (!btn) return;
    e.preventDefault();
    if (klass) return langTabsEl.querySelector("[data-kl-edit]")?.click();
    openKlassDialog(btn);
  });
  // Its button sits at the end of the language row (renderLangControl), for a teacher account
  // or in teaching mode, and only where two languages exist.
  let klassOk = false;
  mayUseKlass().then((ok) => {
    klassOk = ok && translatable().length >= KLASS_MIN;
    if (klassOk) renderToolbar();
  });

  function openPicker(anchor) {
    openCardLangPicker({
      anchor,
      items: pickerItems(),
      soon: soonCodes,
      current: pendingLang ?? (state.lang === "de" ? null : state.lang),
      t,
      onPick: (code) => { if (code !== state.lang) chooseCardLang(code, "picker"); },
    });
  }

  /* One control instead of the tab row (KARTENSPRACHE Tier 2): [English ⇄ Deutsch ▾]. The two
     sides stand in the order the card asks them, so ⇄ visibly turns them round; the language
     side opens the picker. It replaces both the tabs and the direction switch, whose state
     (state.dir, kept in the tab's session like before) it shows. */
  function renderLangControl() {
    const focused = langTabsEl.contains(document.activeElement) ? document.activeElement.dataset.clFocus : null;
    document.getElementById("vp-page")?.classList.toggle("vt-klasse", state.lang === "all");
    // Five or six languages: a size smaller, so three rows of two still fit the card.
    document.getElementById("vp-page")?.classList.toggle("vt-klasse--viele", state.lang === "all" && allCodes().length > 4);
    if (state.lang === "all") return renderKlassBar(focused);
    const code = pendingLang ?? state.lang;
    const meta = langMeta();
    const dirText = t(state.dir === "toDe" ? "vt.dir.toDe" : "vt.dir.fromDe", { lang: langName(meta) });
    const reg = languageOf(code);
    const name = escapeHtml(nativeLabel(code));
    const langBtn = `<button type="button" class="vt-cl-lang${pendingLang ? " is-loading" : ""}" data-cl-open data-cl-focus="open"
        aria-haspopup="dialog" aria-expanded="false" aria-label="${escapeHtml(t("vt.cl.button", { lang: nativeLabel(code) }))}"${pendingLang ? ' aria-busy="true"' : ""}>
        <span class="vt-cl-name"${reg ? ` lang="${escapeHtml(code)}" dir="${reg.dir === "rtl" ? "rtl" : "ltr"}"` : ""}>${name}</span>
        ${pendingLang ? '<span class="vt-cl-spin" aria-hidden="true"></span>' : '<svg class="vt-cl-chev" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>'}
      </button>`;
    const deSide = `<span class="vt-cl-de" lang="de">Deutsch</span>`;
    const swap = `<button type="button" class="vt-cl-swap" data-cl-swap data-cl-focus="swap" aria-label="${escapeHtml(`${t("vt.cl.swap")} · ${dirText}`)}" title="${escapeHtml(t("vt.cl.swap"))}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>
      </button>`;
    // „Erklärung auf Deutsch": only where this deck has the German hints (A1 and some A2).
    const erklBtn = has("de")
      ? `<button type="button" class="vt-cl-erkl" data-cl-erkl data-cl-focus="erkl" aria-pressed="${state.lang === "de"}">
          <span class="vt-cl-erkl-track" aria-hidden="true"></span><span>${escapeHtml(t("vt.cl.erkl"))}</span>
        </button>`
      : "";
    const klassBtn = klassOk
      ? `<button type="button" class="vt-kl-open" data-klassenansicht data-cl-focus="klopen" aria-haspopup="dialog" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg><span>${escapeHtml(t("vt.kl.name"))}</span>
        </button>`
      : "";
    langTabsEl.innerHTML = `<div class="vt-cl" role="group" aria-label="${escapeHtml(dirText)}">${state.dir === "toDe" ? langBtn + swap + deSide : deSide + swap + langBtn}</div>${erklBtn}${klassBtn}`;
    langTabsEl.querySelector("[data-cl-erkl]")?.addEventListener("click", () => setErkl(state.lang !== "de"));
    langTabsEl.querySelector("[data-cl-open]").addEventListener("click", (e) => {
      e.stopPropagation();
      openPicker(e.currentTarget);
    });
    langTabsEl.querySelector("[data-cl-swap]").addEventListener("click", () => {
      closeCardLangPicker({ focus: false });
      toggleDir();
    });
    if (focused) langTabsEl.querySelector(`[data-cl-focus="${focused}"]`)?.focus({ preventScroll: true });
  }

  /** In the Klassenansicht the language control becomes its bar: which languages, ⇄,
   *  „Sprachen ändern" and a clear way out. */
  function renderKlassBar(focused) {
    const names = allCodes().map((c) => {
      const reg = languageOf(c);
      return `<span lang="${escapeHtml(c)}"${reg?.dir === "rtl" ? ' dir="rtl"' : ""}>${escapeHtml(reg?.native ?? c)}</span>`;
    }).join('<span aria-hidden="true"> · </span>');
    langTabsEl.innerHTML = `<div class="vt-kl-bar" role="group" aria-label="${escapeHtml(t("vt.kl.name"))}">
        <span class="vt-kl-badge">${escapeHtml(t("vt.kl.name"))}</span>
        <span class="vt-kl-langs">${names}</span>
        <button type="button" class="vt-cl-swap" data-cl-swap data-cl-focus="swap" aria-label="${escapeHtml(t("vt.cl.swap"))}" title="${escapeHtml(t("vt.cl.swap"))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg>
        </button>
        <button type="button" class="vt-kl-edit" data-kl-edit data-cl-focus="kledit" aria-haspopup="dialog" aria-expanded="false">${escapeHtml(t("vt.kl.edit"))}</button>
        <button type="button" class="vt-kl-end" data-kl-end data-cl-focus="klend">${escapeHtml(t("vt.kl.end"))}</button>
      </div>`;
    langTabsEl.querySelector("[data-cl-swap]").addEventListener("click", toggleDir);
    langTabsEl.querySelector("[data-kl-edit]").addEventListener("click", (e) => {
      e.stopPropagation();
      openKlassDialog(e.currentTarget);
    });
    langTabsEl.querySelector("[data-kl-end]").addEventListener("click", endKlass);
    if (focused) langTabsEl.querySelector(`[data-cl-focus="${focused}"]`)?.focus({ preventScroll: true });
  }

  function renderToolbar() {
    // The Noto face for the card language's script (Arabic, Tigrinya …), declared on first
    // use; "Alle auf einer Karte" needs every script on the card.
    (state.lang === "all" ? allCodes() : [state.lang]).forEach(loadScriptFont);
    renderLangControl();

    const isFiltered = filtered();
    // The chip is a control, so it is only here when there is something to control: drop a
    // selection, or step to the next part. On a single-part deck with nothing selected it
    // said "Alle 25 Wörter" and did nothing — a button that swallowed the click, took a tab
    // stop, and only repeated the count the head ("· 25 Wörter") and the counter ("01 / 25")
    // already carry. So that state renders no chip at all.
    const hasAction = isFiltered || chunked;
    deckChip.hidden = !hasAction;
    if (hasAction) {
      deckChip.textContent = isFiltered ? t("vt.deck.filtered", { n: state.filter.length })
        : t("vt.deck.part", { n: state.part + 1, total: partCount });
      deckChip.classList.toggle("is-filtered", isFiltered);
    }

    const dk = deck();
    // In Lernen the round can be longer than the deck: a missed card comes back once.
    const learning = state.mode === "learn" && state.learnSeq;
    const pos = learning ? state.learnPos : Math.max(0, dk.indexOf(state.idx));
    const len = learning ? state.learnSeq.length : dk.length;
    counterEl.textContent = `${String(pos + 1).padStart(2, "0")} / ${String(len).padStart(2, "0")}`;

    eyebrowEl.textContent = t(eyebrowKeys[state.mode]);
    [...tabsEl.children].forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === state.mode));
  }

  /** Right and wrong in the deck on screen, from the card self-checks. */
  function cardScore() {
    const dk = deck();
    const vals = dk.map((i) => state.results[`cards:${i}`]).filter((v) => v !== undefined);
    const right = vals.filter(Boolean).length;
    return { right, wrong: vals.length - right };
  }

  /* The card has a fixed height and both faces sit on top of each other inside it. „Alle
     Sprachen" (a picture and five lines) can be taller than that, and then the list ran up
     over the face's label. So the card grows to its taller face; a single word never needs
     to, and the card keeps its usual size. */
  function fitCardHeight() {
    const inner = contentEl.querySelector(".vt-flip-inner");
    if (!inner) return;
    inner.style.minHeight = "";
    // scrollHeight leaves out a flex column's bottom padding once the content overflows,
    // so the hint sat on the card's edge; the last child's end plus that padding does not.
    // offsetTop, not getBoundingClientRect: the back face is rotated.
    const need = Math.max(...[...inner.querySelectorAll(".vt-face")].map((f) => {
      const last = f.lastElementChild;
      const end = last ? last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(f).paddingBottom) : 0;
      return Math.max(f.scrollHeight, end);
    }));
    if (need > inner.clientHeight) inner.style.minHeight = `${Math.ceil(need)}px`;
  }
  listen(window, "resize", () => { if (state.mode === "cards") fitCardHeight(); }, { passive: true });
  // The first card is measured before the web font and the late stylesheets are in, when
  // its text is shorter; measured again once they are, or the hint hangs out under it.
  const refit = () => { if (state.mode === "cards") fitCardHeight(); };
  document.fonts?.ready.then(refit);
  if (document.readyState !== "complete") listen(window, "load", refit, { once: true });

  /* ---- The strip under the card -------------------------------------------------
     Word class and one example sentence. The class is always there: on an English front
     it is what tells "help" the noun from "help" the verb. The sentence is German, so it
     only shows while the German side is up — on the English front it would be the answer.
     Its slot keeps its height either way, so flipping never moves the nav row.

     The class names are in English, the language of the explanations: they are the words
     the learner meets again on every grammar page. */
  const POS_DE = {
    noun: "Noun", verb: "Verb", adj: "Adjective", adv: "Adverb", num: "Numeral",
    prep: "Preposition", conj: "Conjunction", pron: "Pronoun", phrase: "Phrase",
  };
  const deckHasInfo = cards.some((c) => c.pos || c.example);
  /* Regi under the class: one line on what the class is, and the way to all of them
     (/grammar/parts-of-speech). The figure is a mascot part, so "Maskottchen aus" leaves the
     line and drops only Regi. German on purpose, like the class name above it. */
  const WA_SAY = Object.fromEntries(wortarten.classes.map((c) => [c.id, c.say]));
  const REGI = mascotSvg({ name: "regi", view: "three", size: 34, label: "", className: "vt-wa-fig" });
  /* A separable verb is a verb with one thing more to know: in the sentence its prefix
     leaves it for the end ("Zieh bitte die Jacke an."). So the chip names the subclass and
     Regi's line says that one thing, linking to the topic instead of the class list. */
  const SEPARABLE = { label: "trennbares Verb", say: "Der Anfang steht im Satz am Ende.", href: "/phrasal-verbs", more: "Trennbare Verben" };
  // The chip and Regi's link lead to the same place: the class on /grammar/parts-of-speech.
  const posHref = (card) => withBase(card.pos === "verb" && card.separable ? SEPARABLE.href : `/grammar/parts-of-speech#${card.pos}`);
  function waHtml(card) {
    const sep = card.pos === "verb" && card.separable;
    const say = sep ? SEPARABLE.say : WA_SAY[card.pos];
    if (!say) return "";
    const href = posHref(card);
    const more = sep ? SEPARABLE.more : t("vt.wa.more");
    return `<p class="vt-wa">
        <span class="vt-wa-fig-wrap" data-mascot-part aria-hidden="true">${REGI}</span>
        <span class="vt-wa-say" lang="de">${escapeHtml(say)}</span>
        <a class="vt-wa-more" href="${escapeHtml(href)}">${escapeHtml(more)}</a>
      </p>`;
  }

  /* The sentence under the card used to wait for the flip on a foreign front, because it
     holds the word: „Der Restmüll wird alle zwei Wochen geholt.“ under „residual waste“ is
     the answer. Now it shows from the start with the word as a gap — „Der ________ wird alle
     zwei Wochen geholt.“, a clue rather than the answer — and fills in on the flip. A sentence
     in which the word cannot be found still waits for the flip; the matching is in
     exampleGap.js, and scripts/check-karten.mjs lists the sentences it misses. */
  function exampleGap(card) {
    const { hit, tokens } = gapTokens(card);
    if (!hit) return null;
    return tokens.map(({ text, gap }) => {
      if (!gap) return escapeHtml(text);
      const m = text.match(/^([„"(]*)(.*?)([.,!?;:“")]*)$/);
      return `${escapeHtml(m[1])}<span class="vt-gap" aria-label="…">________</span>${escapeHtml(m[3])}`;
    }).join("");
  }
  function exampleShown() {
    if (state.dir !== "toDe" || state.flipped) return true;
    return exampleGap(cards[state.idx] ?? {}) != null;
  }
  /** The sentence as the card's state wants it: gapped on an unflipped foreign front. */
  function exampleHtml(card) {
    if (state.dir === "toDe" && !state.flipped) return exampleGap(card) ?? escapeHtml(card.example);
    return escapeHtml(card.example);
  }

  function cardInfoHtml(card) {
    if (!deckHasInfo) return "";
    const pos = card.pos === "verb" && card.separable ? SEPARABLE.label : POS_DE[card.pos];
    const ex = card.example
      ? `<span class="vt-info-ex">
          <span class="vt-info-ex-text" lang="de" id="vt-info-ex-text">${exampleHtml(card)}</span>
          ${card.exampleAudio
            ? `<button type="button" class="vt-audio vt-audio--ex" data-audio="${escapeHtml(card.exampleAudio)}" aria-label="${escapeHtml(t("vt.audio.playSentence"))}" title="${escapeHtml(t("vt.audio.playSentence"))}">${SPEAKER_SVG}</button>`
            : ""}
        </span>`
      : "";
    return `
      <div class="vt-info ${exampleShown() ? "is-shown" : ""}" id="vt-info">
        ${pos ? `<a class="vt-info-pos vt-info-pos--${escapeHtml(card.pos)}" href="${escapeHtml(posHref(card))}">${escapeHtml(pos)}</a>` : ""}
        ${ex}
      </div>
      ${pos ? waHtml(card) : ""}`;
  }

  /* The "Auf Deutsch" front is often a gap sentence ("Es ist kalt. … dir bitte die Jacke
     an!"), and the bare lemma on the back does not answer it: "anziehen" is not what goes
     in the gap. So the German answer face shows the sentence solved too, the gap word
     marked ("Zieh"). Only there — on the front it would give the answer away. */
  function solvedHtml(card) {
    if (state.lang !== "de" || state.dir !== "toDe" || !card.deFill) return "";
    const clue = card.translations?.de ?? "";
    const at = clue.indexOf("…");
    if (at < 0) return "";
    const before = clue.slice(0, at);
    let after = escapeHtml(clue.slice(at + 1).replace(/^ (?=[.!?])/, ""));
    // A separable verb's prefix waits at the end of the sentence; mark it as well, so the
    // two halves read as one verb: "Zieh … an". The prefix is what precedes the gap word
    // in the lemma (an|ziehen).
    const cut = card.separable ? card.front.toLowerCase().indexOf(card.deFill.toLowerCase()) : -1;
    if (cut > 0) {
      const prefix = card.front.slice(0, cut);
      after = after.replace(new RegExp(` ${prefix}([.!?]*)$`), ` <mark>${prefix}</mark>$1`);
    }
    return `<span class="vt-solved" lang="de">${escapeHtml(before)}<mark>${escapeHtml(card.deFill)}</mark>${after}</span>`;
  }

  function renderCards() {
    const card = cards[state.idx];
    const meta = langMeta();
    const isRtl = !!meta.rtl;
    const toDe = state.dir === "toDe";
    const deLabel = card.cat ? t("vt.card.deCat", { cat: card.cat }) : t("vt.card.de");
    const frontLabel = toDe ? langName(meta) : deLabel;
    const backLabel = toDe ? deLabel : langName(meta);
    const frontRtl = toDe && isRtl;
    const backRtl = !toDe && isRtl;
    /* Each face reads in its word's direction: the Arabic side sits on the right, the
       German side on the left, whatever direction the page itself is in. Only for an RTL
       language — for tr/ru/uk both faces are LTR and follow the page as before. */
    const faceDirClass = (rtl) => (isRtl ? (rtl ? "vt-face--rtl" : "vt-face--ltr") : "");
    const flipHint = state.flipped
      ? t("vt.card.flipBack")
      : t("vt.card.flipTo", { lang: toDe ? t("vt.card.de") : langName(meta) });

    // The nav row (Falsch / Richtig once flipped) sits right under the card: it is the tap
    // made on every card, so it goes where the eye already is. Word class and example follow.
    // ph-no-rageclick: flip, flip back, Weiter, Weiter is how the deck is meant to be
    // used — PostHog would otherwise count every quick round as a rage click.
    contentEl.innerHTML = `
      <div class="vt-content ph-no-rageclick ${swapClass()}">
        <div class="vt-flip" id="vt-flip">
          <div class="vt-flip-inner ${state.flipped ? "is-flipped" : ""}">
            <div class="vt-face ${faceDirClass(frontRtl)}">
              <span class="vt-face-eyebrow">${escapeHtml(frontLabel)}</span>
              <span class="vt-prompt ${frontRtl ? "vt-rtl" : ""}"><span class="vt-face-word">${sideHtml(card, "front", { plural: true, syn: true })}</span></span>
              <span class="vt-face-foot">
                ${toDe ? faceAudioGap : audioBtnHtml(card, "vt-audio--face")}
                <span class="vt-hint">${escapeHtml(flipHint)}</span>
              </span>
            </div>
            <div class="vt-face vt-face--back ${faceDirClass(backRtl)}">
              <span class="vt-face-eyebrow">${escapeHtml(backLabel)}</span>
              <span class="vt-answer ${backRtl ? "vt-rtl" : ""}"><span class="vt-face-word">${sideHtml(card, "back", { plural: true, syn: true })}</span></span>
              ${solvedHtml(card)}
              <span class="vt-face-foot">
                ${toDe ? audioBtnHtml(card, "vt-audio--face", { solved: !!solvedHtml(card) }) : faceAudioGap}
                <span class="vt-hint">${escapeHtml(t("vt.card.flipBack"))}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="vt-nav-row ${state.flipped ? "is-flipped" : ""}" id="vt-nav-row">
          <button type="button" class="vt-nav-link" id="vt-prev">${escapeHtml(t("vt.card.prev"))}</button>
          <button type="button" class="vt-nav-flip" id="vt-flip-btn">${escapeHtml(t("vt.card.flip"))}</button>
          <span class="vt-judge">
            <button type="button" class="vt-judge-btn vt-judge-btn--no" id="vt-judge-no">${escapeHtml(t("vt.mark.wrong"))}</button>
            <button type="button" class="vt-judge-btn vt-judge-btn--ok" id="vt-judge-ok">${escapeHtml(t("vt.mark.right"))}</button>
          </span>
          <button type="button" class="vt-nav-next" id="vt-next">${escapeHtml(t("vt.card.next"))}</button>
        </div>
        <p class="vt-card-score">${escapeHtml(t("vt.test.score", cardScore()))}</p>
        ${cardInfoHtml(card)}
        ${meldenOn ? meldenLinkHtml() : ""}
        <p class="vt-kbd-hint">
          <span class="vt-hint-touch">${escapeHtml(t("vt.card.hintTouch"))}</span>
          <span class="vt-hint-keys">${escapeHtml(t("vt.card.hintKeys"))}</span>
        </p>
      </div>`;
    fitCardHeight();

    // The class carries the hint's opacity (see vokabeltrainer.css). Re-adding it a frame
    // after the fresh nodes land lets it fade in rather than snap on the first card.
    contentEl.classList.remove("vt-coach-on");
    if (coachOn) requestAnimationFrame(() => contentEl.classList.add("vt-coach-on"));
    armIdleCoach();

    const flipEl = contentEl.querySelector("#vt-flip");
    // Guarded rather than calling flip() straight: the click a finished swipe generates
    // would otherwise flip the card the swipe just moved away from.
    flipEl.addEventListener("click", (e) => {
      if (handleAudioClick(e)) return;
      if (suppressClick) { suppressClick = false; return; }
      flip();
    });
    attachSwipe(flipEl);
    contentEl.querySelector("#vt-flip-btn").addEventListener("click", flip);
    contentEl.querySelector("#vt-info")?.addEventListener("click", handleAudioClick);
    contentEl.querySelector("#vt-judge-ok").addEventListener("click", () => judge(true));
    contentEl.querySelector("#vt-judge-no").addEventListener("click", () => judge(false));
    contentEl.querySelector("#vt-prev").addEventListener("click", () => go(-1));
    contentEl.querySelector("#vt-next").addEventListener("click", () => go(1));
  }

  /* Swipe the card left/right to move through the deck.
     On a phone the nav row is three small text links under a card that fills the screen —
     reaching them means aiming, once per word, 25 times per set. A swipe is the gesture
     every other flashcard app on that phone already uses, so it needs no hint.
     The card follows the finger while dragging (a gesture with no feedback feels broken),
     and the thumbnail rules are: past a third of the card's width, or fast enough to read
     as a flick, counts as a turn; anything shorter springs back. Vertical intent wins
     early — touch-action: pan-y means the page still scrolls normally. */
  const SWIPE_DISTANCE = 0.33; // of the card's width
  const SWIPE_VELOCITY = 0.5; // px per ms
  const SWIPE_MIN = 24; // px — below this it is a twitch, however fast
  function attachSwipe(el) {
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, axis = null, active = false;

    const setDrag = (px) => {
      el.style.transform = px ? `translateX(${px}px)` : "";
      el.style.opacity = px ? String(Math.max(0.45, 1 - Math.abs(px) / (el.offsetWidth || 1))) : "";
    };
    const release = () => {
      el.style.transition = "transform .22s ease, opacity .22s ease";
      setDrag(0);
      setTimeout(() => { el.style.transition = ""; }, 240);
    };

    el.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      active = true; axis = null; dx = 0;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
      el.style.transition = "";
    }, { passive: true });

    el.addEventListener("touchmove", (e) => {
      if (!active) return;
      const mx = e.touches[0].clientX - x0;
      const my = e.touches[0].clientY - y0;
      // Decide once, on the first meaningful movement, and stick with it: a gesture that
      // changes its mind halfway feels like the card is fighting the finger.
      if (axis === null && Math.abs(mx) + Math.abs(my) > 8) axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (axis !== "x") return;
      dx = mx;
      setDrag(dx);
    }, { passive: true });

    el.addEventListener("touchend", () => {
      if (!active) return;
      active = false;
      const width = el.offsetWidth || 1;
      const velocity = Math.abs(dx) / Math.max(1, Date.now() - t0);
      // Read once, here: the reset at the bottom of this handler runs before the deferred
      // go() below, so anything that callback reads off `dx` is already zero by then.
      const dir = dx > 0 ? -1 : 1;
      const far = Math.abs(dx) > width * SWIPE_DISTANCE;
      // A flick counts even when it is short, but only if it actually travelled: without
      // the floor, a 5px twitch over 2ms reads as 2.5px/ms and turns the card.
      const flick = Math.abs(dx) > SWIPE_MIN && velocity > SWIPE_VELOCITY;
      const turn = axis === "x" && (far || flick);
      if (turn) {
        swallowNextClick();
        el.style.transition = "transform .16s ease, opacity .16s ease";
        setDrag(dir < 0 ? width : -width);
        // render() replaces this node, so the reset below lands on a fresh, untransformed
        // element — the slide-out is the whole animation, the new card fades in on its own.
        setTimeout(() => go(dir), 140);
      } else if (axis === "x" && dx) {
        // Sprang back rather than turned — but a drag this long was still not a tap.
        if (Math.abs(dx) > 10) swallowNextClick();
        release();
      }
      dx = 0; axis = null;
    });

    el.addEventListener("touchcancel", () => { active = false; axis = null; dx = 0; release(); });
  }

  function renderLearn() {
    const card = cards[state.idx];
    const tr = back(card);
    const retry = isRetryTurn();
    // An answered turn shows its answer — unless the language or direction changed since,
    // and the saved options no longer hold this card's answer: then it is simply asked
    // again (pickOption will not record a second verdict).
    const prior = turnAnswer();
    if (!state.pick && prior && prior.options?.includes(tr) && prior.options.includes(prior.pick)) {
      state.pick = prior.pick;
      state._learnOptions = prior.options;
    }
    const toDe = state.dir === "toDe";
    const meta = langMeta();
    const answered = !!state.pick;
    const ok = state.pick === tr;
    const options = state._learnOptions || (state._learnOptions = optionLabels());

    let feedbackHtml = "";
    if (answered) {
      const title = ok ? t("vt.learn.right") : t("vt.learn.wrong");
      // The German answer with its article in colour, as on the cards. <bdi> keeps
      // "die Dividende" in its own direction inside an Arabic sentence.
      const expected = isDeSide("back") ? `<bdi lang="de">${deHtml(card)}</bdi>` : `<bdi>${escapeHtml(tr)}</bdi>`;
      // A keyed note is in the UI language; any other is the German example sentence.
      const note = card.noteKey && uiDict[card.noteKey] != null ? escapeHtml(learnNote(card))
        : card.note ? `<bdi lang="de">${escapeHtml(card.note)}</bdi>` : "";
      const text = ok ? note : `${escapeHtml(t("vt.feedback.expected", { answer: "\u0000" })).replace("\u0000", expected)} ${note}`.trim();
      feedbackHtml = `
        <div class="vt-feedback ${ok ? "is-ok" : "is-no"}">
          <div class="vt-feedback-title">${escapeHtml(title)}</div>
          ${text ? `<div class="vt-feedback-text">${text}</div>` : ""}
        </div>`;
    }

    // The answer repaints the same card: no swap-in, or the verdict would spend half the
    // short pause fading in.
    contentEl.innerHTML = `
      <div class="vt-content ${answered ? "" : swapClass()}">
        <div class="vt-learn-hint">${retry ? `<span class="vt-retry-chip">${escapeHtml(t("vt.learn.retryChip"))}</span> ` : ""}${escapeHtml(t(toDe ? "vt.learn.hintToDe" : "vt.learn.hintFromDe"))}</div>
        <div class="vt-learn-prompt">${sideHtml(card, "front")}</div>
        <div class="vt-options">
          ${options
            .map((label, i) => {
              const chosen = state.pick === label;
              const correct = label === tr;
              let cls = "vt-option";
              let mark = "";
              if (answered) {
                if (correct) { cls += " is-correct"; mark = `<span aria-hidden="true">✓ </span>${escapeHtml(t("vt.mark.right"))}`; }
                else if (chosen) { cls += " is-wrong"; mark = `<span aria-hidden="true">✗ </span>${escapeHtml(t("vt.mark.wrong"))}`; }
                else cls += " is-dim";
              }
              return `<button type="button" class="${cls}" data-i="${i}" ${answered ? "disabled" : ""}><span>${labelHtml(label)}</span><span class="vt-option-mark">${mark}</span></button>`;
            })
            .join("")}
        </div>
        ${feedbackHtml}
        <div class="vt-primary-row">
          <button type="button" class="vt-primary-btn" id="vt-next-card">${escapeHtml(t("vt.learn.nextCard"))}</button>
        </div>
      </div>`;

    contentEl.querySelectorAll(".vt-option").forEach((btn) => {
      btn.addEventListener("click", () => pickOption(options[+btn.dataset.i]));
    });
    contentEl.querySelector("#vt-next-card").addEventListener("click", () => go(1));
    contentEl.querySelector(".vt-learn-prompt")?.addEventListener("click", handleAudioClick);
    const focusEl = focusAfter === "next" ? contentEl.querySelector("#vt-next-card")
      : focusAfter === "option" ? contentEl.querySelector(".vt-option") : null;
    focusAfter = null;
    focusEl?.focus({ preventScroll: true });
  }

  /* ---- Wortliste ----------------------------------------------------------
     The list is the only place the whole deck is visible at once, so it carries the two
     things a long deck needs and a card cannot give: find one word, and see where you
     stand on all of them. Search and sort are view state only — they never change the
     deck the other tabs run, which is what "Auswahl testen" is for.

     On a level deck (650 words in Runden of 25) the list opens on the Runde the cards are
     on, not on all 650: the cards say "Runde 1 von 26", and a list of 650 under that is a
     wall on a phone. "Alle" shows the level; a search always looks through all of it,
     because "where is that word" does not care which Runde it is in. */

  const LIST_SORTS = [
    ["deck", "vt.sort.deck"],
    ["az", "vt.sort.az"],
    ["wrong", "vt.sort.wrong"],
    ["open", "vt.sort.open"],
  ];

  /** Latest verdict for a card, from whichever mode answered it last. */
  function verdict(i) { return state.lastResult[i]; }

  /** wrong 0 · open 1 · right 2 — the order "Fehler zuerst" wants, read straight. */
  function standing(i) {
    const res = verdict(i);
    return res === undefined ? 1 : res ? 2 : 0;
  }

  function searchHit(card, q) {
    if (!q) return true;
    // "der name" has to find it as surely as "name" does.
    const de = card.gender ? card.gender + " " + card.front : card.front;
    return norm(de).includes(q) || norm(card.front).includes(q) || norm(foreignText(card)).includes(q) || (card.syn ?? []).some((x) => norm(x).includes(q));
  }

  const listScoped = () => chunked && !filtered() && !state.listAll;

  /** The words the list is about before any search: the Runde, or the whole deck. */
  function listBase() {
    return listScoped() && !norm(state.listQuery) ? deck() : cards.map((_, i) => i);
  }

  /** Card indices the list currently shows, in display order. */
  function listRows() {
    const q = norm(state.listQuery);
    const rows = listBase().filter((i) => searchHit(cards[i], q));
    const sort = state.listSort;
    if (sort === "az") {
      rows.sort((a, b) => cards[a].front.localeCompare(cards[b].front, "de") || a - b);
    } else if (sort === "wrong") {
      rows.sort((a, b) => standing(a) - standing(b) || a - b);
    } else if (sort === "open") {
      // open first, then wrong, then right: 1,0,2 → rank it explicitly.
      const rank = (i) => [1, 0, 2].indexOf(standing(i));
      rows.sort((a, b) => rank(a) - rank(b) || a - b);
    }
    return rows;
  }

  function listRowHtml(i) {
    const card = cards[i];
    const isRtl = !!langMeta().rtl;
    const res = verdict(i);
    const seen = res !== undefined;
    const selected = !!state.selected[i];
    const active = i === state.idx;
    const dotLabel = escapeHtml(t(seen ? (res ? "vt.list.dotRight" : "vt.list.dotWrong") : "vt.list.dotOpen"));
    return `
      <div class="vt-list-row ${selected ? "is-selected" : ""} ${active && !selected ? "is-active" : ""}" data-i="${i}">
        <button type="button" class="vt-list-pick" role="checkbox" aria-checked="${selected ? "true" : "false"}" data-i="${i}">
          <span class="vt-list-box ${selected ? "is-selected" : ""}"></span>
          <span class="vt-list-word">
            <span class="vt-list-de">${deHtml(card)}${card.syn?.length ? `<small class="vt-list-syn" lang="de">= ${card.syn.map(escapeHtml).join(", ")}</small>` : ""}</span>
            <span class="vt-list-tr ${isRtl ? "vt-rtl" : ""}">${escapeHtml(foreignText(card))}</span>
          </span>
          <span class="vt-list-dot ${seen ? (res ? "is-right" : "is-wrong") : ""}" title="${dotLabel}"></span>
        </button>
        ${audioBtnHtml(card, "vt-audio--row")}
        <button type="button" class="vt-list-jump ${active ? "is-active" : ""}" data-jump="${i}"
                aria-label="${escapeHtml(t("vt.list.jumpAria", { word: card.front }))}">${forward()}</button>
      </div>`;
  }

  /** Repaint only the rows — the search field keeps its focus and caret. */
  function renderListRows() {
    const grid = contentEl.querySelector(".vt-list-grid");
    if (!grid) return;
    const rows = listRows();
    grid.classList.toggle("is-empty", !rows.length);
    grid.classList.toggle("has-audio", deckHasAudio);
    grid.innerHTML = rows.length
      ? rows.map(listRowHtml).join("")
      : `<p class="vt-list-empty">${escapeHtml(t("vt.list.empty", { q: state.listQuery }))}</p>`;
    const count = contentEl.querySelector(".vt-list-count");
    if (count) {
      const base = listBase().length;
      count.textContent = rows.length === base
        ? t("vt.list.count", { n: base })
        : t("vt.list.countFiltered", { n: rows.length, total: base });
    }
    updateSelBar();
  }

  function renderList() {
    const selIds = selectedIds();

    contentEl.innerHTML = `
      <div class="vt-content ${swapClass()}">
        <div class="vt-list-head">
          <div class="vt-list-hint">${t("vt.list.hint", { arrow: `<span class="vt-list-hint-arrow">${forward()}</span>` })}</div>
          <div class="vt-list-legend">
            <span class="vt-legend-item"><span class="vt-legend-dot vt-legend-dot--richtig"></span>${escapeHtml(t("vt.list.legendRight"))}</span>
            <span class="vt-legend-item"><span class="vt-legend-dot vt-legend-dot--falsch"></span>${escapeHtml(t("vt.list.legendWrong"))}</span>
            <span class="vt-legend-item"><span class="vt-legend-dot vt-legend-dot--offen"></span>${escapeHtml(t("vt.list.legendOpen"))}</span>
            <span class="vt-list-count">${escapeHtml(t("vt.list.count", { n: cards.length }))}</span>
          </div>
        </div>
        ${chunked && !filtered() ? `
        <div class="vt-list-scope" role="radiogroup" aria-label="${escapeHtml(t("vt.list.scopeAria"))}">
          <button type="button" role="radio" data-scope="part" aria-checked="${state.listAll ? "false" : "true"}">${escapeHtml(t("vt.list.scopePart", { n: state.part + 1 }))}</button>
          <button type="button" role="radio" data-scope="all" aria-checked="${state.listAll ? "true" : "false"}">${escapeHtml(t("vt.list.scopeAll", { n: cards.length }))}</button>
        </div>` : ""}
        <div class="vt-list-tools">
          <div class="vt-list-search">
            <input type="search" id="vt-list-q" class="vt-list-input" placeholder="${escapeHtml(t("vt.list.search"))}"
                   aria-label="${escapeHtml(t("vt.list.search"))}" value="${escapeHtml(state.listQuery)}" autocomplete="off" />
            <button type="button" class="vt-list-qclear ${state.listQuery ? "is-on" : ""}" id="vt-list-qclear" aria-label="${escapeHtml(t("vt.list.clearSearch"))}">✕</button>
          </div>
          <label class="vt-list-sortwrap">
            <span class="vt-list-sortlabel">${escapeHtml(t("vt.list.sort"))}</span>
            <select class="vt-list-sort" id="vt-list-sort" aria-label="${escapeHtml(t("vt.list.sortAria"))}">
              ${LIST_SORTS.map(([v, k]) => `<option value="${v}" ${state.listSort === v ? "selected" : ""}>${escapeHtml(t(k))}</option>`).join("")}
            </select>
          </label>
        </div>
        ${printHref ? `<a class="vt-list-print" href="${escapeHtml(withBase(printHref) + (state.lang && state.lang !== "all" ? `?lang=${encodeURIComponent(state.lang)}` : ""))}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            ${escapeHtml(t("pr.listPrint"))}</a>` : ""}
        <div class="vt-list-grid"></div>
        <div class="vt-sel-bar ${selIds.length ? "has-selection" : ""}">
          <span class="vt-sel-label">${escapeHtml(selIds.length ? t("vt.sel.count", { n: selIds.length, total: cards.length }) : t("vt.sel.empty"))}</span>
          <div class="vt-sel-actions">
            <button type="button" class="vt-sel-clear" id="vt-sel-clear" aria-label="${escapeHtml(t("vt.sel.clearAria"))}">${escapeHtml(t("vt.sel.clear"))}</button>
            <button type="button" class="vt-sel-all" id="vt-sel-all">${escapeHtml(t("vt.sel.all"))}</button>
            <button type="button" class="vt-sel-start ${selIds.length ? "is-active" : ""}" id="vt-sel-start"${waitAttrs(selIds.length ? null : t("vt.sel.pickFirst"))}>${escapeHtml(t("vt.sel.test"))}</button>
          </div>
        </div>
      </div>`;

    renderListRows();

    // One listener on the grid rather than one per row: a level deck is 650 rows, and
    // every search keystroke rebuilds them.
    contentEl.querySelector(".vt-list-grid").addEventListener("click", (e) => {
      if (handleAudioClick(e)) return;
      const jump = e.target.closest("[data-jump]");
      if (jump) { jumpTo(+jump.dataset.jump); return; }
      const pick = e.target.closest(".vt-list-pick");
      if (pick) toggleSelect(+pick.dataset.i);
    });

    const scopeEl = contentEl.querySelector(".vt-list-scope");
    scopeEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-scope]");
      if (!btn) return;
      state.listAll = btn.dataset.scope === "all";
      scopeEl.querySelectorAll("[data-scope]").forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
      renderListRows();
    });

    const q = contentEl.querySelector("#vt-list-q");
    q.addEventListener("input", () => {
      state.listQuery = q.value;
      contentEl.querySelector("#vt-list-qclear").classList.toggle("is-on", !!q.value);
      renderListRows();
    });
    contentEl.querySelector("#vt-list-qclear").addEventListener("click", () => {
      state.listQuery = "";
      q.value = "";
      contentEl.querySelector("#vt-list-qclear").classList.remove("is-on");
      renderListRows();
      q.focus();
    });
    const sortEl = contentEl.querySelector("#vt-list-sort");
    sortEl.addEventListener("change", () => {
      state.listSort = sortEl.value;
      renderListRows();
    });

    contentEl.querySelector("#vt-sel-start").addEventListener("click", startSelection);
    contentEl.querySelector("#vt-sel-clear").addEventListener("click", clearSelection);
    contentEl.querySelector("#vt-sel-all").addEventListener("click", selectAll);
  }

  /* ---- End of a round --------------------------------------------------------------
     What the round came to. Karten: the cards' own self-checks — right, wrong, and the
     ones never marked; a learner who only flipped and paged through still gets an end, and
     the unmarked words count as "not sure yet", not as wrong. Lernen: the first answer of
     each word in this round (learnFirst), never the retry, plus the list of the words that
     were missed — with the article in its colour and the gloss — so the mistakes are
     collected in one place instead of gone with the card. The next step is the obvious
     one: the words that did not sit yet, the next Runde, or the same round again. */
  function renderDone() {
    const learn = state.mode === "learn";
    const dk = deck();
    const res = dk.map((i) => (learn ? state.learnFirst[i]?.ok : state.results[`cards:${i}`]));
    const right = res.filter((v) => v === true).length;
    const wrong = res.filter((v) => v === false).length;
    const open = dk.length - right - wrong;
    // Lernen: the misses (a skipped card was not missed). Karten: everything not marked right.
    const again = dk.filter((_, k) => (learn ? res[k] === false : res[k] !== true));
    const perfect = right === dk.length;
    const hasNext = chunked && !filtered();
    const fig = mascotSvg({ name: perfect ? "bruno" : "hamsti", expr: "celebrate", view: "front", size: 96, label: "" });
    const title = perfect ? t("vt.done.perfect", { n: dk.length }) : t("vt.done.title");
    const parts = [
      t("vt.done.right", { n: right }),
      t("vt.done.wrong", { n: wrong }),
      ...(open ? [t(learn ? "vt.done.skipped" : "vt.done.open", { n: open })] : []),
    ];
    const pct = (n) => (dk.length ? (n / dk.length) * 100 : 0);
    const glossLang = state.lang && state.lang !== "all" ? ` lang="${escapeHtml(state.lang)}"` : "";
    const missedHtml = learn && again.length ? `
        <section class="vt-done-missed" aria-labelledby="vt-done-missed-title">
          <h3 class="vt-done-missed-title" id="vt-done-missed-title">${escapeHtml(t("vt.done.missedTitle"))}</h3>
          <ul class="vt-done-missed-list">
            ${again.map((i) => {
              const card = cards[i];
              const second = state.learnRetry[i]?.ok === true;
              return `<li class="vt-done-missed-row">
                <span class="vt-done-missed-de"><bdi lang="de">${deHtml(card)}</bdi></span>
                <span class="vt-done-missed-gloss"><bdi${glossLang}>${escapeHtml(foreignText(card))}</bdi></span>
                ${second ? `<span class="vt-done-second">${escapeHtml(t("vt.done.secondTry"))}</span>` : ""}
              </li>`;
            }).join("")}
          </ul>
        </section>` : "";
    const againLabel = learn ? t("vt.done.onlyThese", { n: again.length }) : t("vt.done.again", { n: again.length });

    contentEl.innerHTML = `
      <div class="vt-content vt-done ${swapClass()}">
        <span class="vt-done-fig" data-mascot-part aria-hidden="true">${fig}</span>
        <h2 class="vt-done-title">${escapeHtml(title)}</h2>
        <p class="vt-done-sub">${escapeHtml(t("vt.done.sub", { n: dk.length }))}</p>
        <div class="vt-done-bar" aria-hidden="true">
          <span class="vt-done-bar-ok" style="width:${pct(right)}%"></span>
          <span class="vt-done-bar-no" style="width:${pct(wrong)}%"></span>
        </div>
        <p class="vt-done-stats">${parts.map((p) => escapeHtml(p)).join(" · ")}</p>
        ${missedHtml}
        <div class="vt-done-actions">
          ${again.length && !perfect
            ? `<button type="button" class="vt-primary-btn" id="vt-done-again">${escapeHtml(againLabel)}</button>`
            : ""}
          ${hasNext
            ? `<button type="button" class="${again.length && !perfect ? "vt-done-btn" : "vt-primary-btn"}" id="vt-done-next">${escapeHtml(t("vt.done.next"))}</button>`
            : ""}
          <button type="button" class="${(again.length && !perfect) || hasNext ? "vt-done-btn" : "vt-primary-btn"}" id="vt-done-restart">${escapeHtml(t("vt.done.restart"))}</button>
          <button type="button" class="vt-done-btn" id="vt-done-share">${escapeHtml(t("vt.done.share"))}</button>
        </div>
        <button type="button" class="vt-nav-link vt-done-back" id="vt-done-back">${escapeHtml(t("vt.done.back"))}</button>
      </div>`;

    // Lernen also drops the retry verdicts and the finished round, so the next one starts
    // fresh (ensureRound). lastResult is kept: the Wortliste dot stays honest.
    const clearResults = (ids) => {
      ids.forEach((i) => {
        delete state.results[`${state.mode}:${i}`];
        if (learn) delete state.results[`learn-retry:${i}`];
      });
      if (learn) state.learnSeq = null;
    };
    contentEl.querySelector("#vt-done-again")?.addEventListener("click", () => {
      clearResults(again);
      reset({ filter: again, idx: again[0] });
      render();
    });
    contentEl.querySelector("#vt-done-next")?.addEventListener("click", () => setPart(state.part + 1));
    contentEl.querySelector("#vt-done-restart").addEventListener("click", () => {
      clearResults(dk);
      reset({ idx: dk[0] });
      render();
    });
    // The page's own share control (the "Teilen" in the tab row) does the work: the system
    // sheet on a phone, the small menu on a desktop.
    contentEl.querySelector("#vt-done-share").addEventListener("click", () => {
      document.querySelector(".vt-share [data-share]")?.click();
    });
    contentEl.querySelector("#vt-done-back").addEventListener("click", () => go(-1));
  }

  function render() {
    if (state.mode === "learn") ensureRound();
    renderToolbar();
    if (!sessionStarted) { sessionStarted = true; if (onSessionStart) onSessionStart(); }
    if (state.done && state.mode !== "list") renderDone();
    else if (state.mode === "cards") renderCards();
    else if (state.mode === "learn") renderLearn();
    else renderList();
    saveSession();
    // The side nav marks where a level deck is (LernsetPicker.astro): the Runde, and the
    // Lernset the card on screen comes from — a level page has no row of its own to light.
    dispatchEvent(new CustomEvent("da:deck-here", {
      detail: { part: chunked && !filtered() ? state.part : null, lemma: cards[state.idx]?.front ?? null },
    }));
  }

  [...tabsEl.children].forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.tab));
  });
  deckChip.addEventListener("click", deckChipClick);

  contentEl.addEventListener("pointerdown", noteActivity);
  // During the Lernen pause, a tap anywhere on the card goes on — captured here so it
  // cannot also land on whatever button the new card puts under the finger.
  contentEl.addEventListener("click", (e) => {
    const justAdvanced = Date.now() - advancedAt < ADVANCE_GUARD_MS;
    if (!advanceTimer && !justAdvanced) return;
    e.preventDefault();
    e.stopPropagation();
    if (!justAdvanced) advanceNow();
  }, true);

  listen(document, "keydown", (e) => {
    const tag = document.activeElement?.tagName;
    // SELECT too: the Wortliste's sort control opens on Space and steps on the arrows.
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    // The language control and its picker keep their keys: Space presses „Erklärung auf
    // Deutsch", the arrows move in the list.
    if (e.target.closest?.(".vt-lang-tabs, .clp")) return;
    noteActivity();
    if (state.mode === "learn" && (e.key === "Enter" || e.code === "Space")
        && (advanceTimer || Date.now() - advancedAt < ADVANCE_GUARD_MS)) {
      e.preventDefault();
      if (advanceTimer) advanceNow();
      return;
    }
    // Space is the flip only on a card. In the Wortliste it belongs to the focused
    // row button, and swallowing it there would break keyboard selection.
    if (e.code === "Space") { if (state.mode === "cards") { e.preventDefault(); flip(); } }
    else if (state.mode === "cards" && state.flipped && (e.key === "1" || e.key === "2")) judge(e.key === "2");
    else if (state.mode === "list") return;
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  });

  render();
  // A stored card language whose glosses are fetched: paint again once they are here.
  ensureGlosses(state.lang).then(() => render());
  // The Klassenansicht's languages may be fetched ones: all of them before the card is right.
  if (klass) Promise.all(klass.codes.map(ensureGlosses)).then(() => render());
  // A stored "all" (the old „Alle Sprachen"): a teacher's browser gets the Klassenansicht with
  // those languages (up to KLASS_MAX); everyone else stays on the default language set above.
  if (migrateAll) mayUseKlass().then((ok) => {
    const codes = defaultKlass();
    if (ok && !klass && codes.length >= KLASS_MIN) startKlass(codes);
  });

  /* The first paint above runs with an empty dict, so every t() falls through to its key.
     That is invisible in practice — the fetch resolves in the same tick for a cached file
     — but the repaint is what makes it correct rather than lucky, so it is unconditional.
     onLangChange then re-renders on every later switch: this engine paints with innerHTML
     after i18n's applyToDom() pass has run, so nothing here can be reached by data-i18n. */
  loadDict(getLang()).then((d) => { uiDict = d; render(); });
  cleanups.push(onLangChange((code, d) => {
    uiDict = d;
    // Until the learner picks a card language of their own (storeCardLang), the cards follow
    // the site: to Arabic, to Portuguese, and back to the default (Tier 3) with German.
    // The „Erklärung auf Deutsch" toggle stays as it is; only the language under it moves.
    if (!lsGet(CARD_LANG_KEY)) {
      storedLang = null;
      foreign = defaultLang();
      const target = cardLang();
      // A fetched language (Spanish …) needs its glosses first.
      if (target && state.lang !== target) return ensureGlosses(target).then(() => { reset({ lang: target }); render(); });
    }
    render();
  }));

  return {
    setLang(code) { ensureGlosses(code).then(() => { reset({ lang: code }); render(); }); },
    /** Stop this deck before another is mounted in its place. */
    destroy() {
      closeCardLangPicker({ focus: false });
      clearAdvance();
      clearTimeout(idleTimer);
      player?.pause();
      liveEl.remove();
      cleanups.splice(0).forEach((fn) => fn());
    },
  };
}
