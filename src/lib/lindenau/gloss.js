// The 💡 Hilfe line under a German line in Lindenau, in the learner's own language. The
// header's language menu is the only control (src/lib/textHelp.js): UI en / ar / uk / tr →
// that language; German UI → English, like the word lists. English sits next to the German
// in quests.js / action.js (`en:`); ar / uk / tr come from the sidecar
// src/data/uebersetzungen/lindenau.json, keyed by the German line. A language with no entry
// (the other help languages, or a line added later) falls back to English.
import sidecar from "../../data/uebersetzungen/lindenau.json";
import { onLangChange } from "../i18n.js";
import { HELP_LANGS, helpLang } from "../textHelp.js";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** { text, lang, dir } for one German line; `en` is its English gloss from the source. */
export function glossOf(de, en, code = helpLang()) {
  const lang = code ?? "en";
  const own = lang === "en" ? en : sidecar.lines[de]?.[lang];
  if (!own) return { text: en, lang: "en", dir: "ltr" };
  return { text: own, lang, dir: HELP_LANGS.find((l) => l.code === lang)?.dir ?? "ltr" };
}

/** The hidden gloss paragraph. `attrs` is the caller's own marker (data-gloss, data-gloss="2"). */
export function glossP(de, en, attrs) {
  const g = glossOf(de, en);
  return `<p class="ld-gloss" lang="${g.lang}" dir="${g.dir}" ${attrs} data-gde="${esc(de)}" data-gen="${esc(en)}" hidden>${esc(g.text)}</p>`;
}

// A language switch while a gloss is on the screen repaints it.
if (typeof document !== "undefined") {
  onLangChange(() => {
    document.querySelectorAll(".ld-gloss[data-gde]").forEach((p) => {
      const g = glossOf(p.dataset.gde, p.dataset.gen);
      p.textContent = g.text; p.lang = g.lang; p.dir = g.dir;
    });
  });
}
