import { languagesFor, htmlLang, BASE } from "./languages.js";
import { loadScriptFont } from "./scriptFonts.js";
import { applyLangCss } from "./langCss.js";
import { withBase, rebaseHtml } from "./paths.js";

/** The interface languages, from the registry (src/lib/languages.js), in menu order. */
// `htmlLang` is what <html lang> says: the code, or its hreflang where the registry has one
// (pt → pt-BR, so screen readers and hyphenation pick Brazilian Portuguese).
export const LANGUAGES = languagesFor("ui").map((l) => ({ code: l.code, label: l.native, dir: l.dir, htmlLang: htmlLang(l.code) }));

const STORAGE_KEY = "da_lang";
// The base file (public/i18n/en.json) is the source of truth: every key exists there, and
// the built HTML is English (scripts/prerender-i18n.mjs). Other languages are layered over
// it. See mergedDict().
const BASE_LANG = BASE;
const dictCache = {};
const mergedCache = {};
const listeners = new Set();

export function getLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {}
  return BASE_LANG;
}

async function loadDict(code) {
  if (dictCache[code]) return dictCache[code];
  try {
    const res = await fetch(withBase(`/i18n/${code}.json`));
    dictCache[code] = await res.json();
  } catch {
    dictCache[code] = {};
  }
  return dictCache[code];
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

export function translate(dict, key, vars) {
  const str = dict[key];
  if (str == null) return key;
  return interpolate(str, vars);
}

// Numbers the site derives from its data (src/lib/inventory.js), set on <html> by Layout:
// any string may say {grammarTopics} without each element carrying the value. Named, not
// {n}: {n} is every counter's own per-element var, and a global one would mask a missing one.
function globalVars() {
  try {
    return JSON.parse(document.documentElement.dataset.i18nGlobals || "{}");
  } catch {
    return {};
  }
}

function varsOf(el, globals) {
  return el.dataset.i18nVars ? { ...globals, ...JSON.parse(el.dataset.i18nVars) } : globals;
}

function applyToDom(dict) {
  const globals = globalVars();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const vars = varsOf(el, globals);
    const val = translate(dict, key, vars);
    if (dict[key] == null) return;
    // Markup in the server text (an underlined article) stays while the words are the same:
    // German repaints the German it already has, and comes back after a switch away.
    if (el.__i18nHtml === undefined) el.__i18nHtml = el.firstElementChild ? [el.textContent, el.innerHTML] : null;
    if (el.__i18nHtml && val === el.__i18nHtml[0]) { if (el.innerHTML !== el.__i18nHtml[1]) el.innerHTML = el.__i18nHtml[1]; }
    else el.textContent = val;
  });
  // Same as [data-i18n], but sets innerHTML instead of textContent — for the rare string that
  // must keep an embedded tag (e.g. a link) in place across languages. Dict values here are
  // authored by us, never user input, so trusting them as HTML is safe.
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    const vars = varsOf(el, globals);
    // rebaseHtml: a link in the string (href="/grammar") goes under the base path (paths.js).
    if (dict[key] != null) el.innerHTML = rebaseHtml(translate(dict, key, vars));
  });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (!attr || !key || dict[key] == null) return;
      el.setAttribute(attr, translate(dict, key, globals));
    });
  });
}

// A translation file that is missing a key used to mean "leave the element alone", which
// only looks right on a first paint, when the element still holds its German server text.
// After one switch it is stale: de -> en -> ar left every ar-untranslated string sitting in
// English. Layering the target language over the German base makes the fallback German
// wherever it is, no matter what was painted before.
async function mergedDict(code) {
  if (mergedCache[code]) return mergedCache[code];
  if (code === BASE_LANG) {
    mergedCache[code] = await loadDict(BASE_LANG);
    return mergedCache[code];
  }
  const [base, own] = await Promise.all([loadDict(BASE_LANG), loadDict(code)]);
  mergedCache[code] = { ...base, ...own };
  return mergedCache[code];
}

export async function applyLang(code) {
  const lang = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  document.documentElement.lang = lang.htmlLang ?? lang.code;
  document.documentElement.dir = lang.dir;
  // Arabic, Tigrinya, Hindi …: the Noto face for that script, declared only now.
  loadScriptFont(lang.code);
  // Which translation spans show for this language (langCss.js).
  applyLangCss(lang.code);
  const dict = await mergedDict(lang.code);
  applyToDom(dict);
  listeners.forEach((fn) => fn(lang.code, dict));
  return dict;
}

export function setLang(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  // An entry page with its own URL per language (/es/, /pt-br/preise …, see
  // src/integrations/entry-pages.mjs) lists its siblings as <link rel="alternate" hreflang>:
  // choosing a language there goes to that language's page instead of repainting this one.
  const lang = LANGUAGES.find((l) => l.code === code);
  const sibling = lang && document.querySelector(`link[rel="alternate"][hreflang="${lang.htmlLang ?? code}"]`);
  if (sibling) {
    const target = new URL(sibling.getAttribute("href"), location.href);
    if (target.pathname.replace(/\/$/, "") !== location.pathname.replace(/\/$/, "")) {
      location.assign(target.pathname + location.search + location.hash);
      return Promise.resolve(null);
    }
  }
  return applyLang(code);
}

export { mergedDict as loadDict };

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate markup that arrived after the language was applied (a deck swapped in place). */
export function retranslate() {
  return mergedDict(getLang()).then(applyToDom);
}

export function initI18n() {
  return applyLang(getLang());
}
