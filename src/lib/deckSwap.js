// Switching word sets without a page load. Every flashcard deck keeps its own URL
// (/vocabulary/a1-04, /english-for-work/gastronomie/kueche-geraete, /fuehrerschein/wortschatz/auto …)
// so Google, shared links and Back still work, but picking another set in the side list
// no longer reloads the page: the target page is fetched, and only what belongs to the
// deck is replaced — the hero (title, print, live quiz, group chips), the trainer column
// and its cards. The side list stays where it is, scrolled and folded as the learner left
// it, with the new set marked.
//
// Anything that is not a trainer page (a print sheet, /english-for-work, a 404) falls back to a
// normal navigation, so a wrong guess costs one fetch and nothing else.
//
//   initDeckSwap({ onSwap })   onSwap() runs after the new markup is in: remount the engine.

import { retranslate } from "./i18n.js";
import { CARD_LANG_EVENT, storedCardLang } from "./cardLangGloss.js";

// The trainer routes. A link elsewhere is left alone without a fetch.
const TRAINER = /^\/(vocabulary(\/(?!print\/|glosses\/)[^/]+(\/[^/]+)?)?|english-for-work\/[^/]+\/[^/]+|fuehrerschein\/wortschatz(\/[^/]+)?)\/?$/;
// Head tags that describe the page, replaced with the new page's.
const HEAD = ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property^="og:"]', 'meta[name^="twitter:"]', 'script[type="application/ld+json"]', 'link[rel="alternate"][hreflang]'];

const cache = new Map();
const MAX_CACHED = 24;

function load(path) {
  if (!cache.has(path)) {
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
    const doc = fetch(path, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))))
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    doc.catch(() => cache.delete(path));
    cache.set(path, doc);
  }
  return cache.get(path);
}

const pathOf = (a) => {
  if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin) return null;
  return TRAINER.test(a.pathname) ? a.pathname.replace(/\/+$/, "") || "/" : null;
};
const here = () => location.pathname.replace(/\/+$/, "") || "/";

export function initDeckSwap({ onSwap }) {
  const page = document.getElementById("vp-page");
  if (!page) return;
  let shown = here();
  let busy = 0;

  function markPicker(path) {
    const nvb = page.querySelector("[data-nvb]");
    if (!nvb) return;
    let row = null;
    nvb.querySelectorAll("a.nvb-item").forEach((a) => {
      const on = (a.pathname.replace(/\/+$/, "") || "/") === path;
      a.classList.toggle("active", on);
      if (on) { a.setAttribute("aria-current", "page"); row ??= a; } else a.removeAttribute("aria-current");
    });
    if (!row) return;
    // The pane it sits in becomes the rail's active tab, without the reveal a click does.
    const pane = row.closest(".nvb-section")?.dataset.pane;
    if (pane) {
      nvb.querySelectorAll("[data-rail]").forEach((t) => {
        const on = t.dataset.rail === pane;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
      });
      nvb.querySelectorAll(".nvb-section").forEach((p) => { p.hidden = p.dataset.pane !== pane; });
    }
  }

  function replace(sel, doc) {
    const old = page.querySelector(sel);
    const neu = doc.querySelector(`#vp-page ${sel}`);
    if (old && neu) old.replaceWith(document.importNode(neu, true));
    return page.querySelector(sel);
  }

  function apply(doc, path) {
    document.title = doc.title;
    for (const sel of HEAD) {
      document.head.querySelectorAll(sel).forEach((n) => n.remove());
      doc.head.querySelectorAll(sel).forEach((n) => document.head.append(document.importNode(n, true)));
    }
    // The new deck's styles that this page did not load: a Redemittel set has no print /
    // live-quiz row, so swapping from it to a Lernset brought those buttons unstyled.
    // Stylesheets by href (build), dev's <style> tags by their Vite id; added, never removed.
    for (const n of doc.head.querySelectorAll('link[rel="stylesheet"][href], style[data-vite-dev-id]')) {
      const have = n.tagName === "LINK"
        ? document.head.querySelector(`link[rel="stylesheet"][href="${CSS.escape(n.getAttribute("href"))}"]`)
        : document.head.querySelector(`style[data-vite-dev-id="${CSS.escape(n.dataset.viteDevId)}"]`);
      if (!have) document.head.append(document.importNode(n, true));
    }
    const np = doc.getElementById("vp-page");
    if (np?.dataset.printHref) page.dataset.printHref = np.dataset.printHref; else delete page.dataset.printHref;
    for (const id of ["fc-data", "fc-langs"]) {
      const el = document.getElementById(id);
      const src = doc.getElementById(id);
      if (el && src) el.textContent = src.textContent;
    }
    const hero = replace(".vt-hero", doc);
    const work = replace(".vp-col--ex", doc);
    for (const el of [hero, work]) {
      el?.classList.add("vt-swap-in");
      el?.addEventListener("animationend", () => el.classList.remove("vt-swap-in"), { once: true });
    }
    page.querySelector("[data-nvb]")?.setAttribute("data-current", np?.querySelector("[data-nvb]")?.dataset.current ?? "");
    markPicker(path);
    shown = path;
    onSwap();
    retranslate().catch(() => {});
    dispatchEvent(new CustomEvent(CARD_LANG_EVENT, { detail: { lang: storedCardLang() } }));
    dispatchEvent(new CustomEvent("da:deck-swap", { detail: { path } }));
    // The new deck from its top, if the learner had scrolled past it.
    const top = (hero ?? work)?.getBoundingClientRect().top ?? 0;
    if (top < 0) (hero ?? work).scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  async function go(path, { push }) {
    const ticket = ++busy;
    const work = page.querySelector(".vp-col--ex");
    const slow = setTimeout(() => work?.setAttribute("aria-busy", "true"), 150);
    try {
      const doc = await load(path);
      if (ticket !== busy) return; // a later click won
      if (!doc.getElementById("vp-page")?.classList.contains("vt-shell")) throw new Error("not a trainer");
      if (push) history.pushState({ deck: path }, "", path);
      apply(doc, path);
      // On a phone the list is a sheet over the cards: picking from it closes it.
      if (page.dataset.rule !== "hidden" && !matchMedia("(min-width: 1001px)").matches) page.querySelector(".vp-sheet-x")?.click();
    } catch {
      if (push) location.assign(path); else location.reload();
    } finally {
      clearTimeout(slow);
      page.querySelector(".vp-col--ex")?.removeAttribute("aria-busy");
    }
  }

  // Links into another deck: in the side list, in the hero (group chips) and in the trainer
  // (a Lernset named on a card). Modifier clicks keep their meaning (new tab, …).
  page.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    const path = pathOf(a);
    if (!path || a.closest("[data-select]")) return;
    e.preventDefault();
    if (path === shown && !a.search) return;
    go(path, { push: true });
  });
  // Warm the cache on intent, so most switches are instant.
  const warm = (e) => { const p = pathOf(e.target.closest?.("a[href]")); if (p && p !== shown) load(p).catch(() => {}); };
  page.addEventListener("pointerover", warm, { passive: true });
  page.addEventListener("touchstart", warm, { passive: true });
  page.addEventListener("focusin", warm);

  addEventListener("popstate", () => {
    const path = here();
    if (path !== shown && TRAINER.test(path)) go(path, { push: false });
  });
}
