// The CSS that shows a translation in the interface language and hides the rest
// (SPRACHEN-NESTED-TIERED-PROMPT.md, Tier 2).
//
// A translated line ships with one span per language — UiText.astro, the help blocks
// (textHelp.js, data-gx-lang), the conjugation tables, the contents lines on /knowledge — and
// CSS picks the one whose lang matches <html lang>. CSS cannot compare two attributes, so
// that used to be a hand-written selector per language in five stylesheets, and a new
// language meant editing all five. Now the rules for the CURRENT language only are written
// into one <style id="lang-css">: by the first-paint script in Layout.astro (which inlines
// this function's source, so it must stay self-contained: no imports, no outer names) and
// by applyLang() in i18n.js on every switch.
//
// English is the base: a UI language without help texts of its own (German so far) shows the
// English block (helpLang() in textHelp.js), which is what the first three lines cover.
// `lang|=` because <html lang> can carry a region (pt-BR) while the code does not.
export function langRules(c) {
  if (!c || !/^[a-z]{2,3}$/.test(c)) return "";
  var r = ":root[lang|=\"" + c + "\"] ";
  var l = "[lang=\"" + c + "\"]";
  var g = "[data-gx-lang=\"" + c + "\"] ";
  return (
    "[data-gx-lang=\"en\"] .gx-tr-l[lang=\"en\"]{display:block}" +
    "[data-gx-lang=\"en\"] .ct-grprow .gx-tr-l[lang=\"en\"]{display:inline}" +
    "[data-gx-lang=\"en\"] .gx-tr--i18n{display:none}" +
    // UiText.astro: the German steps aside for its translation.
    r + ".uit:has(> .uit-l" + l + ") > .uit-de{display:none}" +
    r + ".uit > .uit-l" + l + "{display:revert}" +
    // Help blocks (grammar-help.css) and their twin in the conjugation table header.
    g + ".gx-tr-l" + l + "{display:block}" +
    g + ".ct-grprow .gx-tr-l" + l + "{display:inline}" +
    // A block whose German already turns into this language through i18n says it once.
    r + g + ".gx-tr--i18n{display:none}" +
    // The contents lines on /knowledge (wissen.css).
    r + ".wi-toc-tr" + l + "{display:block}"
  );
}

/** Writes the rules for `code` into <style id="lang-css">, creating it if needed. */
export function applyLangCss(code) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("lang-css");
  if (!el) {
    el = document.createElement("style");
    el.id = "lang-css";
    document.head.append(el);
  }
  el.textContent = langRules(code);
}
