// The flashcards' language picker (KARTENSPRACHE-PICKER-TIERED-PROMPT.md, Tier 2): the list
// behind the trainer's one language button, „Deutsch ⇄ English ▾".
//
// Not the header's nested picker (languagePicker.js): that one lists only what a surface
// offers and says so on purpose („never greyed out"), sorts by region, and starts with a
// short list. Here every learner should find their language at once, also when this deck
// does not have it yet: top to bottom a search field, „Zuletzt benutzt" (3), every language
// the deck's cards carry (registry order), and „Bald" — greyed, not selectable — for the
// registry languages this deck does not fully cover. The recent list is the one the old tab
// row kept (recentLangs/rememberLang, surface "cards"), so nothing a learner chose is lost.
//
//   openCardLangPicker({ anchor, items, soon, current, t, onPick })            one language
//   openCardLangPicker({ anchor, items, soon, t, multi: { selected, min, max, onDone } })
//                                                                               2–4 (Klassenansicht)
//
// Combobox + listbox: focus stays in the search field and the arrow keys move the active
// option (aria-activedescendant); Enter picks, Esc closes, and focus goes back to the button.
// On a phone it is a bottom sheet with the search field on top; from 768px a popover under
// the button. `items`/`soon` are codes; names come from the registry (native name, `dir`).
import "../styles/card-lang-picker.css";
import { languageOf } from "./languages.js";
import { recentLangs, rememberLang } from "./languagePicker.js";
import { setWaiting } from "./notReady.js";

const SURFACE = "cards";
const SHEET_BELOW = 768;
const MAX_RECENT = 3;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Registry fields for a code; an item may also be { code, native } of its own (a special row). */
function info(item) {
  const code = typeof item === "string" ? item : item.code;
  const reg = languageOf(code) ?? {};
  return { code, native: reg.native ?? code, de: reg.de ?? "", en: reg.en ?? "", dir: reg.dir ?? "ltr", ...(typeof item === "string" ? {} : item) };
}
// `fa` finds „فارسی", „Persisch" and „Farsi" (the English name says „Persian (Farsi, Dari)").
const matches = (l, q) => !q || [l.native, l.de, l.en, l.code, ...(languageOf(l.code)?.aliases ?? [])].some((v) => fold(v).includes(q));

let open = null;
let seq = 0;

export function closeCardLangPicker({ focus = true } = {}) {
  if (!open) return;
  const { root, scrim, anchor, cleanup } = open;
  open = null;
  cleanup();
  root.remove();
  scrim?.remove();
  anchor.setAttribute("aria-expanded", "false");
  if (focus && anchor.isConnected) anchor.focus({ preventScroll: true });
}

export const cardLangPickerOpen = () => !!open;

/**
 * @param {{ anchor: HTMLElement, items: Array<string|object>, soon?: string[], current?: string|null,
 *           t: (key: string, vars?: object) => string, title?: string,
 *           onPick?: (code: string) => void,
 *           multi?: { selected: string[], min: number, max: number, onDone: (codes: string[]) => void,
 *                     hint?: string, done: string, top?: HTMLElement } }} opts
 */
export function openCardLangPicker({ anchor, items, soon = [], current = null, t, title, onPick, multi = null }) {
  const wasOwn = open?.anchor === anchor;
  closeCardLangPicker({ focus: false });
  if (wasOwn) return; // a second click on the button closes it

  const id = `clp${++seq}`;
  const langs = items.map(info);
  const soonLangs = soon.filter((c) => !langs.some((l) => l.code === c)).map(info);
  const byCode = new Map(langs.map((l) => [l.code, l]));
  const chosen = new Set(multi ? multi.selected.filter((c) => byCode.has(c)) : []);
  const sheet = innerWidth < SHEET_BELOW;
  // Inside an open modal <dialog> (the app's deck sheet) the picker has to live in the same
  // top layer, or it sits behind the dialog, unclickable.
  const host = anchor.closest("dialog[open]") ?? document.body;

  const root = document.createElement("div");
  root.className = `clp ${sheet ? "clp--sheet" : "clp--pop"}${multi ? " clp--multi" : ""}`;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-labelledby", `${id}-title`);
  root.tabIndex = -1;
  const heading = title || t("vt.cl.choose");
  root.innerHTML = `<div class="clp-head">
      <p class="clp-title" id="${id}-title">${esc(heading)}</p>
      <button type="button" class="clp-x" data-clp-close aria-label="${esc(t("vt.cl.close"))}">✕</button>
    </div>
    ${multi?.hint ? `<p class="clp-hint">${esc(multi.hint)}</p>` : ""}
    ${multi?.top ? '<div class="clp-top" data-clp-top></div>' : ""}
    <input type="search" class="clp-search" data-clp-search role="combobox" aria-expanded="true" aria-autocomplete="list"
      aria-controls="${id}-list" autocomplete="off" spellcheck="false" enterkeyhint="search"
      placeholder="${esc(t("vt.cl.search"))}" aria-label="${esc(t("vt.cl.search"))}">
    <div class="clp-list" id="${id}-list" role="listbox" aria-labelledby="${id}-title"${multi ? ' aria-multiselectable="true"' : ""} data-clp-list></div>
    ${multi ? `<div class="clp-foot"><span class="clp-count" data-clp-count aria-live="polite"></span><button type="button" class="clp-go" data-clp-go>${esc(multi.done)}</button></div>` : ""}`;

  let scrim = null;
  if (sheet) {
    scrim = document.createElement("div");
    scrim.className = "clp-scrim";
    scrim.addEventListener("click", () => closeCardLangPicker());
    host.append(scrim);
  }
  host.append(root);
  anchor.setAttribute("aria-expanded", "true");

  if (multi?.top) root.querySelector("[data-clp-top]").append(multi.top);
  const input = root.querySelector("[data-clp-search]");
  const list = root.querySelector("[data-clp-list]");
  let active = -1;

  const isOn = (code) => (multi ? chosen.has(code) : code === current);

  function optionHtml(l, group, n, disabled) {
    const on = !disabled && isOn(l.code);
    const sub = l.special ? l.sub ?? "" : l.de && l.de !== l.native ? l.de : "";
    return `<div role="option" class="clp-opt${disabled ? " is-soon" : ""}" id="${id}-${group}-${n}" data-clp-code="${esc(l.code)}"
        aria-selected="${on}"${disabled ? ' aria-disabled="true"' : ""}>
      <span class="clp-check" aria-hidden="true">${on ? "✓" : ""}</span>
      <span class="clp-names"><span class="clp-native"${l.special ? "" : ` lang="${esc(l.code)}"`} dir="${l.dir === "rtl" ? "rtl" : "auto"}">${esc(l.native)}</span>${sub ? `<span class="clp-sub" lang="de">${esc(sub)}</span>` : ""}</span>
      ${disabled ? `<span class="clp-tag">${esc(t("vt.cl.soonTag"))}</span>` : ""}
    </div>`;
  }

  function group(key, label, rows, disabled = false) {
    if (!rows.length) return "";
    if (!label) return `<div role="group" class="clp-group">${rows.map((l, n) => optionHtml(l, key, n, disabled)).join("")}</div>`;
    return `<div role="group" class="clp-group" aria-labelledby="${id}-h-${key}">
      <p class="clp-group-h" id="${id}-h-${key}">${esc(label)}</p>
      ${rows.map((l, n) => optionHtml(l, key, n, disabled)).join("")}
    </div>`;
  }

  const enabled = () => [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];

  function setActive(i, { scroll = true } = {}) {
    const opts = enabled();
    opts.forEach((o) => o.classList.remove("is-active"));
    active = opts.length ? Math.max(0, Math.min(i, opts.length - 1)) : -1;
    const el = opts[active];
    if (!el) return input.removeAttribute("aria-activedescendant");
    el.classList.add("is-active");
    input.setAttribute("aria-activedescendant", el.id);
    if (scroll) el.scrollIntoView({ block: "nearest" });
  }

  function render() {
    const q = fold(input.value.trim());
    const hits = langs.filter((l) => matches(l, q));
    const recent = q ? [] : recentLangs(SURFACE).filter((c) => byCode.has(c) && !byCode.get(c).special).slice(0, MAX_RECENT).map((c) => byCode.get(c));
    const special = hits.filter((l) => l.special);
    const html = group("x", "", special)
      + group("r", t("vt.cl.recent"), recent)
      + group("d", t("vt.cl.deck"), hits.filter((l) => !l.special))
      + group("s", t("vt.cl.soon"), soonLangs.filter((l) => matches(l, q)), true);
    list.innerHTML = html || `<p class="clp-none">${esc(t("vt.cl.none"))}</p>`;
    // Start on the current language (its row in the full list), else the first.
    const opts = enabled();
    const at = q ? 0 : Math.max(0, opts.findIndex((o) => o.dataset.clpCode === (multi ? [...chosen][0] : current) && !o.id.includes("-r-")));
    setActive(at, { scroll: !sheet });
    if (multi) foot();
  }

  function foot() {
    const n = chosen.size;
    root.querySelector("[data-clp-count]").textContent = t("vt.kl.count", { n, max: multi.max });
    setWaiting(root.querySelector("[data-clp-go]"), n < multi.min ? t("vt.kl.needMin", { n: multi.min }) : null);
  }

  function choose(code) {
    if (!byCode.has(code)) return;
    if (!multi) {
      if (!byCode.get(code).special) rememberLang(SURFACE, code);
      closeCardLangPicker();
      onPick?.(code);
      return;
    }
    if (chosen.has(code)) chosen.delete(code);
    else if (chosen.size >= multi.max) {
      const count = root.querySelector("[data-clp-count]");
      count.textContent = t("vt.kl.max", { n: multi.max });
      count.classList.remove("is-warn");
      void count.offsetWidth;
      count.classList.add("is-warn");
      return;
    } else chosen.add(code);
    // Repaint the marks in place: re-rendering would jump the list back to the top.
    list.querySelectorAll(`[data-clp-code="${CSS.escape(code)}"]`).forEach((o) => {
      o.setAttribute("aria-selected", String(chosen.has(code)));
      o.querySelector(".clp-check").textContent = chosen.has(code) ? "✓" : "";
    });
    foot();
  }

  function finish() {
    if (chosen.size < multi.min) return; // notReady.js already said why
    const codes = langs.map((l) => l.code).filter((c) => chosen.has(c));
    closeCardLangPicker();
    multi.onDone(codes);
  }

  /* Popover placement, measured from the button: below if it fits, else above; nudged inside
     the side edges. Inline pixels, as in languagePicker.js (postcss-rtlcss must not flip them). */
  function place() {
    if (sheet) return;
    root.style.cssText = "visibility:hidden;left:0;top:0";
    const b = anchor.getBoundingClientRect();
    const pad = 8;
    const w = root.offsetWidth;
    const below = innerHeight - b.bottom - pad - 6;
    const above = b.top - pad - 6;
    const want = Math.min(root.scrollHeight, 520);
    const up = want > below && above > below;
    const h = Math.min(want, up ? above : below);
    const top = up ? b.top - 6 - h : b.bottom + 6;
    const rtl = document.documentElement.dir === "rtl";
    let left = rtl ? b.right - w : b.left;
    left = Math.max(pad, Math.min(left, innerWidth - pad - w));
    root.style.cssText = `left:${Math.round(left)}px;top:${Math.round(top)}px;max-height:${Math.round(h)}px`;
  }

  input.addEventListener("input", render);
  root.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-clp-code]");
    if (opt) {
      if (opt.getAttribute("aria-disabled") === "true") return;
      return choose(opt.dataset.clpCode);
    }
    if (e.target.closest("[data-clp-close]")) return closeCardLangPicker();
    if (e.target.closest("[data-clp-go]")) return finish();
  });
  root.addEventListener("keydown", (e) => {
    // A select in the top slot (Klassenansicht: „Für") keeps its own arrow keys.
    if (e.target.tagName === "SELECT" && e.key !== "Escape") return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      return closeCardLangPicker();
    }
    const opts = enabled();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (document.activeElement !== input) input.focus({ preventScroll: true });
      setActive(active + (e.key === "ArrowDown" ? 1 : -1));
    } else if ((e.key === "Home" || e.key === "End") && document.activeElement !== input) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : opts.length - 1);
    } else if (e.key === "Enter" && document.activeElement === input) {
      e.preventDefault();
      if (opts[active]) choose(opts[active].dataset.clpCode);
      else if (multi) finish();
    } else if (e.key === " " && multi && document.activeElement === input && !input.value && opts[active]) {
      // Space toggles while nothing is typed; with text it is part of the search.
      e.preventDefault();
      choose(opts[active].dataset.clpCode);
    }
  });
  // Focus leaving the picker (Tab past the last control) closes it, like a native select.
  root.addEventListener("focusout", (e) => {
    if (open?.root === root && e.relatedTarget && !root.contains(e.relatedTarget) && e.relatedTarget !== anchor) closeCardLangPicker({ focus: false });
  });
  const onDoc = (e) => {
    const path = e.composedPath();
    if (!path.includes(root) && !path.includes(anchor)) closeCardLangPicker({ focus: false });
  };
  const onMove = (e) => { if (!root.contains(e.target)) place(); };
  setTimeout(() => document.addEventListener("click", onDoc), 0);
  addEventListener("resize", place);
  addEventListener("scroll", onMove, true);
  open = {
    root,
    scrim,
    anchor,
    cleanup: () => {
      document.removeEventListener("click", onDoc);
      removeEventListener("resize", place);
      removeEventListener("scroll", onMove, true);
    },
  };

  render();
  place();
  // The keyboard only on a desktop: on a phone it would cover half the list on open.
  (sheet ? root : input).focus({ preventScroll: true });
  return {
    /** Multi: replace the ticks (the Klassenansicht's class select). */
    setSelected(codes) {
      chosen.clear();
      for (const c of codes) if (byCode.has(c) && chosen.size < (multi?.max ?? 1)) chosen.add(c);
      render();
    },
  };
}
