// /teachers/cards/learn?set=<id>: a saved card set → the Wortschatz trainer's cards.
//
// A word from our lexicon (lexId) gets the public card from /teachers/cards/lexikon/<level>.json:
// audio, picture, every language, example, and the same SRS key (its id) as on /vocabulary.
// Any other word becomes a plain card from what the teacher saved: article, plural, and the
// book's translation under English (the language most course books gloss in). Their SRS key
// is vs:<set>:<word>, so they never mix with a lexicon word's progress.
//
// Language tabs: a language is offered when every lexicon card has it (the deck rule,
// langsOf()); a word of the teacher's own shows its book translation or nothing there.
import { getSet, getSharedSet, machineText, saveSet, stripArticle, translateWords } from "./sets.js";
import { slugify } from "../audioSlug.js";
import { withBase } from "../paths.js";
// The trainer's card-language setting (CARD_LANG_KEY in src/lib/cardLangGloss.js).
const CARD_LANG_KEY = "da-vt-lang";

const BASE = "/teachers/cards/lexikon";
const cache = new Map();
const json = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(withBase(url)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`)))));
  return cache.get(url);
};

/**
 * The lexicon card for a typed word, or null: the review table re-links a word the teacher
 * corrected („Tish“ → „Tisch“). An article that disagrees with the lexicon's means another word.
 */
export async function lexiconCard(lemma, article) {
  const id = slugify(String(lemma ?? "").trim());
  if (!id) return null;
  const level = (await json(`${BASE}/index.json`))[id];
  const card = level ? (await json(`${BASE}/${level}.json`))[id] : null;
  if (!card || (article && card.gender && card.gender !== article)) return null;
  return card;
}

/** Our translation of lexicon words into `lang`: { lexId: text }. Card languages from the level
 *  files, the others from the trainer's gloss files (/vocabulary/glosses/<code>.json). */
export async function lexiconTranslations(lexIds, lang) {
  if (!lexIds.length) return {};
  const index = await json(`${BASE}/index.json`);
  const levels = [...new Set(lexIds.map((id) => index[id]).filter(Boolean))];
  const tables = Object.assign({}, ...(await Promise.all(levels.map((l) => json(`${BASE}/${l}.json`)))));
  const out = {};
  for (const id of lexIds) {
    const c = tables[id];
    // German: our synonym; without one, the explanation from the card's German side (not a
    // gap hint like „… man das Licht an“, which needs its word).
    const text = lang === "de" ? c?.syn?.[0] ?? (c?.translations?.de?.includes("…") ? undefined : c?.translations?.de) : c?.translations?.[lang];
    if (text) out[id] = text;
  }
  const missing = lexIds.filter((id) => !out[id]);
  if (missing.length && lang !== "de") {
    const gloss = await json(`/vocabulary/glosses/${lang}.json`).catch(() => ({}));
    for (const id of missing) if (gloss[id]) out[id] = gloss[id];
  }
  return out;
}

/** Saved words → trainer cards (fc-data shape, src/lib/lexicon.js toCard). */
export async function cardsFor(set) {
  const words = set.words ?? [];
  const lexIds = words.map((w) => w.lexId).filter(Boolean);
  const index = lexIds.length ? await json(`${BASE}/index.json`) : {};
  const levels = [...new Set(lexIds.map((id) => index[id]).filter(Boolean))];
  const tables = Object.assign({}, ...(await Promise.all(levels.map((l) => json(`${BASE}/${l}.json`)))));
  return words.map((w) => {
    const lex = w.lexId && tables[w.lexId];
    // A language the teacher added to the set (+ Sprache) fills what our card lacks.
    if (lex) return w.translations ? { ...lex, translations: { ...w.translations, ...lex.translations } } : lex;
    const key = `${w.article ?? ""}-${w.lemma}`.toLowerCase().replace(/\s+/g, "-");
    return {
      id: `vs:${set.id}:${key}`,
      front: w.reflexive ? `sich ${w.lemma}` : w.lemma,
      note: "",
      // The book's translation counts as English unless an English one was added.
      translations: { ...(w.translation ? { en: w.translation } : {}), ...(w.translations ?? {}) },
      ...(w.pos ? { pos: w.pos } : {}),
      ...(w.separable ? { separable: true } : {}),
      ...(w.pos === "noun" || w.article ? { gender: w.article ?? null, plural: w.plural ?? null, pluralOnly: false } : {}),
    };
  });
}

/** The trainer's language list (#fc-langs, built for every language) cut to what these cards carry. */
export function languagesFor(all, cards) {
  // A tab shows a language only where no card is blank (fill them in the review table,
  // „Sprachen Ihrer Klasse“, or with „+ Sprache“ on the trainer). A language every card carries
  // itself is an ordinary tab, also in „Alle Sprachen“.
  const has = (code) => cards.length > 0 && cards.every((c) => c.translations?.[code]);
  // A language the trainer fetches (fa, pl, …) comes for lexicon words from its gloss file, so it
  // only needs the teacher's own words to have it.
  const ownCards = cards.filter((c) => String(c.id).startsWith("vs:"));
  const ownHave = (code) => ownCards.length > 0 && ownCards.every((c) => c.translations?.[code]);
  const kept = all
    .filter((l) => l.code !== "all" && (has(l.code) || (l.fetch && ownHave(l.code))))
    .map(({ soon, ...l }) => (l.fetch && has(l.code) ? { ...l, fetch: undefined } : l));
  // The rest are the picker's „Bald" rows (src/lib/cardLangPicker.js).
  const notKept = all.filter((l) => l.code !== "all" && l.code !== "de" && !kept.some((k) => k.code === l.code)).map((l) => ({ ...l, soon: true }));
  // Nothing in common (only own words without translations): still a German side to play.
  if (!kept.length) kept.push(all.find((l) => l.code === "de") ?? all[0]);
  const inlined = kept.filter((l) => l.code !== "de" && !l.fetch);
  const allTab = all.find((l) => l.code === "all");
  return [...kept, ...(inlined.length >= 2 && allTab ? [{ ...allTab, codes: inlined.map((l) => l.code) }] : []), ...notKept];
}

// Languages Azure Translator doesn't have (Tajik), as on the review page.
const NO_MACHINE = new Set(["tg"]);

/**
 * „+ Sprache“ beside the language tabs (the set's owner): one more language for every word,
 * from our data where we have it, the rest from Azure Translator. Saved into the set, then the
 * page reloads so the trainer builds its tabs anew.
 */
function mountAddLanguage(set, all, shown) {
  const tabs = document.getElementById("vt-lang-tabs");
  if (!tabs) return;
  const open = all.filter((l) => l.code !== "all" && l.code !== "de" && !NO_MACHINE.has(l.code) && !shown.some((s) => s.code === l.code && !s.soon));
  if (!open.length) return;
  const box = document.createElement("label");
  box.className = "vs-addlang";
  box.innerHTML = `<span class="vs-addlang-plus" aria-hidden="true">+</span><span class="vs-addlang-txt">Sprache</span>
    <select aria-label="Übersetzung in eine weitere Sprache hinzufügen"><option value="">Übersetzung hinzufügen …</option>${open
      .map((l) => `<option value="${l.code}">${l.label} · ${l.deName}</option>`).join("")}</select>`;
  tabs.after(box);
  const sel = box.querySelector("select");
  sel.addEventListener("change", async () => {
    const lang = sel.value;
    if (!lang) return;
    const txt = box.querySelector(".vs-addlang-txt");
    sel.disabled = true;
    box.classList.add("is-busy");
    txt.textContent = "Wird übersetzt …";
    try {
      const words = set.words.map((w) => ({ ...w, translations: { ...(w.translations ?? {}) } }));
      const lexOpen = words.filter((w) => w.lexId && !w.translations[lang]);
      const ours = await lexiconTranslations(lexOpen.map((w) => w.lexId), lang);
      for (const w of lexOpen) if (ours[w.lexId]) w.translations[lang] = ours[w.lexId];
      const rest = words.filter((w) => !w.translations[lang]);
      if (rest.length) {
        const out = await translateWords(rest.map(machineText), [lang]);
        rest.forEach((w, i) => {
          const text = stripArticle(out[lang]?.[i] ?? "", lang);
          if (text) w.translations[lang] = text;
        });
      }
      await saveSet({ id: set.id, name: set.name, level: set.level, words });
      // Opens on the new language after the reload: the trainer's card-language setting.
      try { localStorage.setItem(CARD_LANG_KEY, lang); } catch {}
      location.reload();
    } catch (err) {
      console.error(err);
      txt.textContent = err?.message && err.message.length < 140 ? err.message : "Das hat nicht geklappt. Bitte noch einmal versuchen.";
      sel.disabled = false;
      sel.value = "";
      box.classList.remove("is-busy");
    }
  });
}

function fail(text) {
  const msg = document.querySelector("[data-vs-msg]");
  document.querySelector(".vt-shell")?.setAttribute("hidden", "");
  msg.innerHTML = text;
  msg.hidden = false;
}

/**
 * Fills the trainer on /teachers/cards/learn?set=<id> (the teacher, own rows) or on
 * /card-set?t=<token> (`shared`: a student, no account, via /api/wortschatz/set).
 */
export async function loadPlayableSet({ shared = false } = {}) {
  const params = new URLSearchParams(location.search);
  const id = shared ? params.get("t") : params.get("set");
  if (!id) return fail(shared ? "Dieser Link ist unvollständig. Bitte fragen Sie Ihre Lehrkraft nach dem Link." : `Kein Set gewählt. <a href="${withBase("/teachers/cards")}">Zu Ihren Kartensets</a>`);
  let set;
  try {
    set = shared ? await getSharedSet(id) : await getSet(id);
  } catch (err) {
    console.error(err);
    return fail("Das Kartenset konnte nicht geladen werden. Bitte prüfen Sie die Internetverbindung.");
  }
  if (!set) {
    return fail(shared
      ? "Dieses Kartenset ist nicht (mehr) geteilt. Bitte fragen Sie Ihre Lehrkraft nach einem neuen Link."
      : `Dieses Kartenset gibt es nicht, oder Sie sind nicht angemeldet. <a href="${withBase("/account")}?next=${encodeURIComponent(location.pathname + location.search)}">Anmelden</a> · <a href="${withBase("/teachers/cards")}">Meine Kartensets</a>`);
  }
  // Own words' SRS key: the set's id for the teacher, the link's token for students.
  set = { ...set, id: shared ? `t-${id}` : set.id };
  if (!set.words?.length) return fail(shared ? "Dieses Kartenset ist noch leer." : `Das Set „${set.name.replace(/</g, "&lt;")}“ hat noch keine Wörter. <a href="${withBase("/teachers/cards/photo")}?set=${id}">Wörter hinzufügen</a>`);

  let cards;
  try {
    cards = await cardsFor(set);
  } catch (err) {
    console.error(err);
    return fail("Die Karten konnten nicht geladen werden. Bitte prüfen Sie die Internetverbindung.");
  }
  const langsEl = document.getElementById("fc-langs");
  const lexCount = set.words.filter((w) => w.lexId).length;
  const allLangs = JSON.parse(langsEl.textContent);
  const shownLangs = languagesFor(allLangs, cards);
  langsEl.textContent = JSON.stringify(shownLangs);
  document.getElementById("fc-data").textContent = JSON.stringify(cards);

  // Heading and the line under it: the set's own name, words, level.
  const h1 = document.querySelector(".vt-hero h1");
  if (h1) { h1.textContent = set.name; h1.removeAttribute("data-i18n"); }
  const sub = document.querySelector(".vt-hero-sub");
  if (sub) sub.textContent = [set.level, `${cards.length} Wörter`, shared ? null : `${lexCount} aus unserem Wortschatz`].filter(Boolean).join(" · ");
  document.title = `${set.name} – icanspeak Spanish`;
  const edit = document.querySelector("[data-vs-edit]");
  if (edit) edit.href = `${withBase("/teachers/cards/photo")}?set=${id}`;
  const print = document.querySelector("[data-vs-print]");
  if (print) print.href = `${withBase("/account")}?set=${id}`;
  // Straight into the live quiz with this set as the words (host.js, value kartenset:<id>).
  const quiz = document.querySelector("[data-vs-quiz]");
  if (quiz) { quiz.href = `${withBase("/teachers/quiz")}?set=kartenset:${id}`; quiz.hidden = shared; }

  window.__vtCardsReady = true;
  dispatchEvent(new Event("vt:cards"));
  if (!shared) mountAddLanguage(set, allLangs, shownLangs);
}

/**
 * A card set → live-quiz questions for Eigenes Quiz (/teachers/quiz/create?set=<id>),
 * in the saved shape of src/lib/liveQuiz/custom.js:
 *   lexicon word with every meaning language → { t: "word", id, dir }   (each phone its language)
 *   own word with the book's translation      → { t: "mc", prompt: translation, options: German words of the set }
 *   own noun with an article only              → { t: "mc", der / die / das }
 * Words that fit none (no translation, no article) are left out.
 */
export async function quizQuestionsFor(set, meaningLangs, max = 50) {
  const cards = await cardsFor(set);
  const shown = (c) => (c.gender ? `${c.gender} ${c.front}` : c.front);
  const others = (c) => cards.filter((o) => o !== c && shown(o).toLowerCase() !== shown(c).toLowerCase());
  const pick = (list, n) => [...list].sort(() => Math.random() - 0.5).slice(0, n);
  const out = [];
  for (const c of cards) {
    const own = String(c.id).startsWith("vs:");
    if (!own && meaningLangs.every((l) => c.translations?.[l])) {
      out.push({ t: "word", id: c.id, dir: "de-meaning", label: shown(c) });
    } else if (c.translations?.en && others(c).length >= 1) {
      const options = [shown(c), ...pick(others(c), 3).map(shown)];
      out.push({ t: "mc", prompt: c.translations.en, options, correct: 0, kind: "Wie heißt das auf Deutsch?" });
    } else if (["der", "die", "das"].includes(c.gender)) {
      out.push({ t: "mc", prompt: c.front, options: ["der", "die", "das"], correct: ["der", "die", "das"].indexOf(c.gender), kind: "der, die oder das?" });
    }
    if (out.length >= max) break;
  }
  return out;
}
