// Findings in the browser: the glue between a scored take, the pattern rules
// (src/lib/pronunciation/patterns.ts), the learner's first language and the two pages.
//
// Used by the Aussprache-Check's result card, its live mode and the drill recorder
// (AusspracheFuerDich), so a finding reads and links the same everywhere:
//   „Jetzt üben →"          /pronunciation-check?lang=<id>&drill=<drill>
//   „Warum passiert das? →" /culture/mistakes?lang=<id>#<error id>
import { detectPatterns } from "./pronunciation/patterns.ts";
import { getLang, loadDict, translate, onLangChange } from "./i18n.js";

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* -------------------------------------------------------------- strings ---- */
// The German text is written at the call site and is also the fallback while the
// dictionary loads, so nothing ever shows a bare key.
let dict = null;
const dictListeners = new Set();
const setDict = (d) => { dict = d; for (const fn of dictListeners) fn(); };
loadDict(getLang()).then(setDict);
onLangChange(() => loadDict(getLang()).then(setDict));
/** Re-render JS-built text once the dictionary for the UI language is in. */
export const onDict = (fn) => dictListeners.add(fn);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m));
export function t(key, fallback, vars) {
  return dict && dict[key] != null ? translate(dict, key, vars) : fill(fallback, vars);
}

/* ------------------------------------------------------------- findings ---- */

/** Words the provider heard that are not in the sentence, with the index they came before. */
export function insertionsOf(assessment) {
  const out = [];
  let ref = 0;
  for (const w of assessment?.words ?? []) {
    if (w.error === "insertion") out.push({ before: ref, word: w.word });
    else ref += 1;
  }
  return out;
}

/** Top findings for one aligned take, for `lang` (null → none: nothing is guessed). */
export function findingsFor({ words, assessment, inserted, lang, info, max = 2 }) {
  if (!lang || !info?.drills?.[lang]) return [];
  return detectPatterns(
    { words, inserted: inserted ?? insertionsOf(assessment), drills: info.drills[lang], errorFor: info.errorFor[lang] ?? {} },
    { t, max },
  );
}

export const langName = (info, lang) => info?.languages?.find((l) => l.id === lang)?.name ?? lang;
export const practiceHref = (lang, drill) => `/pronunciation-check?lang=${encodeURIComponent(lang)}&drill=${encodeURIComponent(drill)}`;
export const whyHref = (lang, errorId) => `/culture/mistakes?lang=${encodeURIComponent(lang)}#${encodeURIComponent(errorId)}`;

/**
 * The findings as a list. `practice` false leaves out „Jetzt üben" (when the drill is the
 * very thing on screen), `why` false leaves out „Warum passiert das?".
 */
export function findingsHtml(findings, { lang, info, practice = true, why = true } = {}) {
  if (!findings.length) return "";
  const name = langName(info, lang);
  return `
    <div class="af-findings">
      <p class="af-findings-title">${esc(t("af.findings.title", "Typisch mit {lang} als Muttersprache", { lang: name }))}</p>
      <ul>
        ${findings
          .map(
            (f) => `
          <li class="af-finding" data-finding="${esc(f.drillId)}">
            <p>${esc(f.message)}</p>
            <p class="af-finding-links">
              ${practice ? `<a class="af-link" href="${practiceHref(lang, f.drillId)}" data-practice="${esc(f.drillId)}">${esc(t("af.practice", "Jetzt üben"))}</a>` : ""}
              ${why && f.errorId ? `<a class="af-link af-link--quiet" href="${whyHref(lang, f.errorId)}">${esc(t("af.why", "Warum passiert das?"))}</a>` : ""}
            </p>
          </li>`,
          )
          .join("")}
      </ul>
    </div>`;
}
