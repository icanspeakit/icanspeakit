// Topic names in the learner's CARD language, next to the interface language.
//
// The site has two languages (see the note at the top of wortschatz-app.js): the one it
// talks in, and the one the flashcards quiz against. A learner on a German interface who
// picked العربية on the cards read every set name — "Familie & Beziehungen", "Wohnen" —
// in German only, so choosing the next topic meant reading German before the learning
// started. Every element with data-gloss-key now carries that name in the card language
// as a quiet second line, wherever the interface dictionary has it (en, ar, tr, uk).
//
// Nothing shows when the card language is German, "Alle Sprachen", a language with no
// interface dictionary (ru), or the same as the interface — the main text already says it.
import { getLang, loadDict, onLangChange, translate, LANGUAGES } from "./i18n.js";

export const CARD_LANG_KEY = "da-vt-lang";
export const CARD_LANG_EVENT = "da:cardlang";

const RTL = new Set(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code));
const HAS_DICT = new Set(LANGUAGES.map((l) => l.code).filter((c) => c !== "de"));

export function storedCardLang() {
  try { return localStorage.getItem(CARD_LANG_KEY); } catch { return null; }
}

let current = null;

async function paint(code = current) {
  current = code;
  const els = document.querySelectorAll("[data-gloss-key]");
  if (!els.length) return;
  const show = code && HAS_DICT.has(code) && code !== getLang();
  const dict = show ? await loadDict(code) : null;
  if (code !== current) return; // a newer choice arrived while the file loaded
  els.forEach((el) => {
    const key = el.getAttribute("data-gloss-key");
    let text = "";
    if (dict && key && dict[key] != null) {
      const vars = el.dataset.glossVars ? JSON.parse(el.dataset.glossVars) : undefined;
      text = translate(dict, key, vars);
    }
    el.textContent = text;
    el.hidden = !text;
    if (text) {
      el.setAttribute("lang", code);
      el.setAttribute("dir", RTL.has(code) ? "rtl" : "ltr");
    }
  });
}

/** Paint once, then follow the card tabs and the interface switch. Pages without a
 *  trainer (the picker on its own) still follow the stored choice. */
export function initCardLangGloss() {
  paint(storedCardLang());
  addEventListener(CARD_LANG_EVENT, (e) => paint(e.detail?.lang ?? storedCardLang()));
  onLangChange(() => paint());
  // Another tab changed the card language.
  addEventListener("storage", (e) => { if (e.key === CARD_LANG_KEY) paint(e.newValue); });
}
