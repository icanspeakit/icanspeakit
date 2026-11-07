// Fonts for the scripts a Latin font does not cover — loaded only once a language that needs
// one is actually chosen (SPRACHEN-NESTED-TIERED-PROMPT.md, Tier 2).
//
// One family, "DA Script", sits right after the Latin font in every stack (global.css
// --font-body / --font-display / --font-label, and the registry's fontFamily). Until a face
// for it is declared the name matches nothing and the browser falls through to the system
// font, so a German visitor downloads nothing. Choosing Arabic, Tigrinya, Hindi … adds one
// @font-face for that script with its unicode-range: from then on the browser fetches the
// file the first time a glyph in that range is drawn, and the Latin text around it keeps
// its own font.
//
// The files are the variable Noto Sans subsets from Fontsource (@fontsource-variable/*,
// 5.2, SIL Open Font License 1.1), self-hosted in public/fonts/scripts/ — the privacy page
// promises no third-party font CDN. CJK (zh, ja, ko) has no file here on purpose: a usable
// subset is several MB, and every phone and desktop ships a CJK system font.
//
// Plain ESM, no DOM at import time: Layout.astro reads FACES at build time for the
// first-paint script, the client modules call loadScriptFont().
import { languageOf } from "./languages.js";
import { withBase } from "./paths.js";

export const SCRIPT_FAMILY = "DA Script";

/** script (ISO 15924, as in the registry) → file in /fonts/scripts/ + the range it covers. */
export const FACES = {
  Arab: { file: "noto-sans-arabic", range: "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1" },
  Ethi: { file: "noto-sans-ethiopic", range: "U+030E,U+1200-1399,U+2D80-2DDE,U+AB01-AB2E,U+1E7E0-1E7E6,U+1E7E8-1E7EB,U+1E7ED-1E7EE,U+1E7F0-1E7FE" },
  Deva: { file: "noto-sans-devanagari", range: "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09" },
  Beng: { file: "noto-sans-bengali", range: "U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1" },
  Taml: { file: "noto-sans-tamil", range: "U+0964-0965,U+0B82-0BFA,U+200C-200D,U+20B9,U+25CC" },
  Geor: { file: "noto-sans-georgian", range: "U+0589,U+10A0-10FF,U+1C90-1CBA,U+1CBD-1CBF,U+205A,U+2D00-2D2F,U+2E31" },
  Armn: { file: "noto-sans-armenian", range: "U+0308,U+0530-058F,U+2010,U+2024,U+25CC,U+FB13-FB17" },
  Thai: { file: "noto-sans-thai", range: "U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC" },
};

/** The @font-face rule for one script, or "" when it has no file. */
export function fontFaceCss(script) {
  const f = FACES[script];
  if (!f) return "";
  return `@font-face{font-family:"${SCRIPT_FAMILY}";font-style:normal;font-weight:100 900;font-display:swap;` +
    `src:url("${withBase(`/fonts/scripts/${f.file}.woff2`)}") format("woff2");unicode-range:${f.range}}`;
}

/** Declares the face for this language's script, once per page. Safe to call with any code,
 *  "de", "all" or null; a Latin, Cyrillic or Greek language needs nothing and gets nothing. */
export function loadScriptFont(code) {
  if (typeof document === "undefined" || !code) return;
  const script = languageOf(code)?.script;
  if (!script || !FACES[script]) return;
  if (document.querySelector(`style[data-script-font="${script}"]`)) return;
  const style = document.createElement("style");
  style.dataset.scriptFont = script;
  style.textContent = fontFaceCss(script);
  document.head.append(style);
}
