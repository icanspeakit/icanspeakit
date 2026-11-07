// The nested language picker (SPRACHEN-NESTED-TIERED-PROMPT.md, „The nested UX"): one menu
// for the header's interface language and the flashcards' card language.
//
// The top level never has more than seven rows: the current language, a suggestion from the
// browser's languages, up to two recently used, the core languages to fill, and last
// „Alle Sprachen (N) ›". That row opens every language this surface offers, with a search
// field and grouped by region — a bottom sheet on a phone, a popover from 768px.
//
//   openLanguagePicker({ anchor, surface, items, current, onPick, startAll? })
//
// `items` are what the surface can offer right now (the header: the interface languages;
// the cards: what every card of the deck carries). A language that is not in `items` is not
// listed at all — never greyed out, never „bald verfügbar". An item is a registry entry
// ({ code, native, de, en, dir, region, surfaces }) or a `special` row that is not a language
// (the cards' „Auf Deutsch" and „Alle auf einer Karte"): those stay on the top level.
//
// The element lives on <body> with position: fixed, so neither the header nor the nav
// drawer's overflow can clip it; its place is measured from the button on every open.
import "../styles/language-picker.css";
import { t } from "./uiText.js";
import { track } from "./track.js";
import { languageOf } from "./languages.js";

const RECENT_KEY = "da_lang_recent";
const CORE = ["de", "en", "ar", "tr", "uk", "ru"];
const MAX_ROWS = 7;
const REGIONS = [
  ["europa", "Europa"],
  ["nahost", "Naher Osten & Nordafrika"],
  ["afrika", "Afrika"],
  ["asien", "Asien"],
  ["amerika", "Amerika"],
];
const SHEET_BELOW = 768;

/* ---------------------------------------------------------------- memory -- */

function readRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** The surface's recently chosen codes, newest first. */
export function recentLangs(surface) {
  const list = readRecent()[surface];
  return Array.isArray(list) ? list.filter((c) => typeof c === "string") : [];
}

/** Remembers a choice on a surface (keeps the last four). */
export function rememberLang(surface, code) {
  try {
    const all = readRecent();
    all[surface] = [code, ...recentLangs(surface).filter((c) => c !== code)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(all));
  } catch {}
}

/** The first of the browser's languages that `codes` contains: "uk-UA" counts as "uk". */
export function suggestedLang(codes) {
  const set = new Set(codes);
  const asked = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of asked) {
    let code = String(tag || "").toLowerCase().split("-")[0];
    if (code === "fil") code = "tl"; // browsers say fil-PH for Filipino; the registry's code is tl
    if (set.has(code)) return code;
  }
  return null;
}

/* ------------------------------------------------------------------ rows -- */

/** The top level: [{ item, via, tag? }], at most MAX_ROWS - 1 so „Alle Sprachen" fits. */
function topRows(items, current, surface) {
  const byCode = new Map(items.map((i) => [i.code, i]));
  const rows = [];
  const add = (code, via, tag) => {
    const item = byCode.get(code);
    if (!item || rows.some((r) => r.item.code === code) || rows.length >= MAX_ROWS - 1) return;
    rows.push({ item, via, tag });
  };
  add(current, "top");
  for (const i of items) if (i.special) add(i.code, "top");
  const languages = items.filter((i) => !i.special).map((i) => i.code);
  const suggested = suggestedLang(languages);
  if (suggested && suggested !== current) add(suggested, "suggested", t("langpicker.suggested", "Vorschlag"));
  for (const code of recentLangs(surface).filter((c) => c !== current).slice(0, 2)) add(code, "top");
  for (const code of CORE) add(code, "top");
  return rows;
}

const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const matches = (item, q) => [item.native, item.de, item.en, item.code, ...(item.aliases ?? languageOf(item.code)?.aliases ?? [])].some((v) => fold(v).includes(q));

/* ------------------------------------------------------------------- DOM -- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* dir on the label only, never on the row: on the row it flips the flex line and pushes
   العربية to the far side, out of line with the other names (the old LanguageSwitcher note). */
function rowHtml({ item, via, tag }, current, withDe) {
  const sub = tag || (withDe && item.de && item.de !== item.native ? item.de : "");
  const draft = !item.special && item.status === "draft";
  return `<button type="button" class="langpk-row" role="menuitemradio" aria-checked="${item.code === current}" data-lp-code="${esc(item.code)}" data-lp-via="${via}"${item.special ? "" : ` lang="${esc(item.code)}"`}>
    <span class="langpk-check" aria-hidden="true">${item.code === current ? "✓" : ""}</span>
    <span class="langpk-names"><span class="langpk-native"${item.dir ? ` dir="${item.dir}"` : ""}>${esc(item.native)}</span>${sub ? `<span class="langpk-sub" lang="en">${esc(sub)}</span>` : ""}${draft ? `<span class="langpk-draft">${esc(t("langpicker.machine", "maschinell übersetzt"))}</span>` : ""}</span>
  </button>`;
}

let open = null; // { root, anchor, close }

export function closeLanguagePicker({ focus = true } = {}) {
  if (!open) return;
  const { root, anchor, cleanup } = open;
  open = null;
  cleanup();
  root.remove();
  anchor.setAttribute("aria-expanded", "false");
  if (focus) anchor.focus({ preventScroll: true });
}

/**
 * @param {{ anchor: HTMLElement, surface: string, items: object[], current: string|null,
 *           onPick: (code: string, via: string) => void, label?: string }} opts
 */
export function openLanguagePicker({ anchor, surface, items, current, onPick, label, startAll = false }) {
  const wasOwn = open?.anchor === anchor;
  closeLanguagePicker({ focus: false });
  if (wasOwn) return; // a second click on the same button closes it

  const root = document.createElement("div");
  root.className = "langpk";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", label || t("langpicker.label", "Sprache wählen"));
  document.body.appendChild(root);
  anchor.setAttribute("aria-expanded", "true");

  const languages = items.filter((i) => !i.special);
  let view = "top";

  const rows = () => [...root.querySelectorAll(".langpk-row")];

  function pick(code, via) {
    rememberLang(surface, code);
    track("language_selected", { lang: code, surface, via });
    closeLanguagePicker();
    onPick(code, via);
  }

  function renderTop() {
    view = "top";
    root.className = "langpk langpk--menu";
    const top = topRows(items, current, surface);
    root.innerHTML = `<div class="langpk-list" role="menu">
      ${top.map((r) => rowHtml(r, current, false)).join("")}
      <button type="button" class="langpk-row langpk-more" role="menuitem" data-lp-all aria-haspopup="true">
        <span class="langpk-check" aria-hidden="true"></span>
        <span class="langpk-names"><span class="langpk-native">${esc(t("langpicker.all", "Alle Sprachen ({n})", { n: languages.length }))}</span></span>
        <span class="langpk-chev" aria-hidden="true">›</span>
      </button>
    </div>`;
    place();
    rows()[0]?.focus({ preventScroll: true });
  }

  function listHtml(q) {
    const hits = languages.filter((i) => !q || matches(i, q));
    if (!hits.length) return `<p class="langpk-none">${esc(t("langpicker.none", "Keine Sprache gefunden."))}</p>`;
    const via = q ? "search" : "all";
    return REGIONS.map(([id, de]) => {
      const group = hits.filter((i) => (i.region || "europa") === id).sort((a, b) => (a.de || a.native).localeCompare(b.de || b.native, "de"));
      if (!group.length) return "";
      return `<div class="langpk-group" role="group" aria-label="${esc(t(`langpicker.region.${id}`, de))}">
        <p class="langpk-group-h">${esc(t(`langpicker.region.${id}`, de))}</p>
        ${group.map((item) => rowHtml({ item, via }, current, true)).join("")}
      </div>`;
    }).join("");
  }

  function renderAll() {
    view = "all";
    const sheet = innerWidth < SHEET_BELOW;
    root.className = `langpk langpk--all ${sheet ? "langpk--sheet" : "langpk--pop"}`;
    root.innerHTML = `<div class="langpk-head">
        ${startAll ? "" : `<button type="button" class="langpk-back" data-lp-back aria-label="${esc(t("langpicker.back", "Zurück"))}">‹</button>`}
        <p class="langpk-title">${esc(startAll && label ? label : t("langpicker.all", "Alle Sprachen ({n})", { n: languages.length }))}</p>
        <button type="button" class="langpk-x" data-lp-close aria-label="${esc(t("langpicker.close", "Schließen"))}">✕</button>
      </div>
      <input type="search" class="langpk-search" data-lp-search autocomplete="off" spellcheck="false" enterkeyhint="search"
        placeholder="${esc(t("langpicker.search", "Sprache suchen"))}" aria-label="${esc(t("langpicker.search", "Sprache suchen"))}">
      <div class="langpk-list langpk-scroll" role="menu" data-lp-results>${listHtml("")}</div>`;
    const input = root.querySelector("[data-lp-search]");
    input.addEventListener("input", () => {
      root.querySelector("[data-lp-results]").innerHTML = listHtml(fold(input.value.trim()));
    });
    place();
    // The keyboard only on a desktop: on a phone it would cover half the list on open.
    if (!sheet) input.focus({ preventScroll: true });
    else (root.querySelector("[data-lp-back]") ?? root.querySelector("[data-lp-close]")).focus({ preventScroll: true });
  }

  /* Popover placement, measured: below the button if it fits, else above (the drawer
     footer sits at the bottom of a phone screen), then nudged inside the side edges.
     Inline pixels on purpose — postcss-rtlcss rewrites stylesheet offsets, and these are
     already viewport coordinates that must not be flipped again for Arabic. */
  function place() {
    if (root.classList.contains("langpk--sheet")) {
      root.style.cssText = "";
      return;
    }
    root.style.cssText = "visibility:hidden;left:0;top:0";
    const b = anchor.getBoundingClientRect();
    const pad = 8;
    const w = root.offsetWidth;
    const below = innerHeight - b.bottom - pad - 6;
    const above = b.top - pad - 6;
    const h = Math.min(root.scrollHeight, Math.max(below, above));
    const up = root.scrollHeight > below && above > below;
    const top = up ? b.top - 6 - h : b.bottom + 6;
    const rtl = document.documentElement.dir === "rtl";
    let left = rtl ? b.left : b.right - w;
    left = Math.max(pad, Math.min(left, innerWidth - pad - w));
    root.style.cssText = `left:${Math.round(left)}px;top:${Math.round(top)}px;max-height:${Math.round(h)}px`;
  }

  root.addEventListener("click", (e) => {
    const row = e.target.closest("[data-lp-code]");
    if (row) return pick(row.dataset.lpCode, row.dataset.lpVia);
    if (e.target.closest("[data-lp-all]")) return renderAll();
    if (e.target.closest("[data-lp-back]")) return renderTop();
    if (e.target.closest("[data-lp-close]")) return closeLanguagePicker();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeLanguagePicker();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const list = view === "all" ? [root.querySelector("[data-lp-search]"), ...rows()] : rows();
    const at = list.indexOf(document.activeElement);
    let next = at;
    if (e.key === "ArrowDown") next = Math.min(list.length - 1, at + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, at - 1);
    else if (e.key === "Home") next = 0;
    else next = list.length - 1;
    if (next !== at && list[next]) {
      e.preventDefault();
      list[next].focus();
    }
  });

  // Tab past the last row closes the menu, like a native select would lose it.
  root.addEventListener("focusout", (e) => {
    if (open?.root === root && e.relatedTarget && !root.contains(e.relatedTarget) && e.relatedTarget !== anchor) closeLanguagePicker({ focus: false });
  });

  // composedPath, not contains(): „Alle Sprachen ›" re-renders the panel, and by the time
  // this runs the clicked row is no longer in it.
  const onDoc = (e) => {
    const path = e.composedPath();
    if (!path.includes(root) && !path.includes(anchor)) closeLanguagePicker({ focus: false });
  };
  // The phone's keyboard opening resizes the window; the sheet stays, a popover re-measures.
  const onResize = () => (view === "all" && root.classList.contains("langpk--sheet") ? null : place());
  // A page scroll (the browser bringing the button into view, a phone's toolbar sliding
  // away) moves the button: the popover follows it rather than closing under the finger.
  const onScroll = (e) => {
    if (!root.contains(e.target)) place();
  };
  setTimeout(() => document.addEventListener("click", onDoc), 0);
  addEventListener("resize", onResize);
  addEventListener("scroll", onScroll, true);

  open = {
    root,
    anchor,
    cleanup: () => {
      document.removeEventListener("click", onDoc);
      removeEventListener("resize", onResize);
      removeEventListener("scroll", onScroll, true);
    },
  };

  // `startAll`: straight to „Alle Sprachen" (the first-visit offer's own „Alle Sprachen" pill,
  // the flashcards' „＋"), without a way back to the short list; `label` then titles it.
  if (startAll) renderAll();
  else renderTop();
}
