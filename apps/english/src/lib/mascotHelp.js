// Tap the mascot, get help: what this page is for and how to use it.
//
// The hub pages carry a mascot with a one-line bubble (src/components/mascots/
// SectionMascot.astro: Bruno on Kultur, Regi on Grammatik …). This makes that figure a
// button. It opens a small card under it, in the UI language: "Wofür ist das?", then three
// steps "So geht's". The texts are the i18n keys mhelp.<page>.what / .s1–.s3.
//
// It finds the mascots on the page rather than being built into the component, so a page
// only needs a mascot and help keys; a page with no keys for its path keeps a plain,
// decorative mascot. "Maskottchen anzeigen: aus" removes the figure, and with it the help.
import { getLang, loadDict, translate, onLangChange } from "./i18n.js";
import "../styles/mascot-help.css";
import { currentPath } from "./paths.js";

/** Which help a path gets. The hubs only, not their subpages — except Wortschatz, where
 *  every deck page has the same trainer. */
const PAGES = [
  [/^\/culture\/?$/, "kultur"],
  [/^\/grammar\/?$/, "grammatik"],
  [/^\/listening\/?$/, "hoeren"],
  [/^\/reading\/?$/, "lesen"],
  [/^\/speaking\/?$/, "sprechen"],
  [/^\/exercises\/?$/, "uebungen"],
  [/^\/pronunciation\/?$/, "aussprache"],
  [/^\/vocabulary(\/|$)/, "wortschatz"],
  // Wort des Tages and every word page: the card first explains what etymology is.
  [/^\/knowledge\/word-stories(\/|$)/, "wortgeschichte"],
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function init() {
  const page = PAGES.find(([re]) => re.test(currentPath()))?.[1];
  const mascots = [...document.querySelectorAll(".section-mascot")];
  if (!page || !mascots.length) return;

  // The "?" is there to be found once. After the first tap it has done its job, so it goes
  // — on this page (the key is per help page, so /grammar still shows it after /culture
  // was opened) and on every later visit. The mascot stays a button; only the hint goes.
  const SEEN_KEY = `da-mhelp-seen-${page}`;
  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch {}
  function markSeen() {
    if (seen) return;
    seen = true;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    for (const b of document.querySelectorAll(".mhelp-badge")) {
      b.classList.add("is-gone");
      b.addEventListener("animationend", () => b.remove(), { once: true });
      // No animation to wait for under reduced motion.
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) b.remove();
    }
  }

  let dict = {};
  const t = (key) => translate(dict, key);
  let card = null;
  let owner = null;

  const label = () => {
    for (const m of mascots) m.setAttribute("aria-label", t("mhelp.aria"));
  };

  /** The "?" at the figure's top right, measured from the figure, not the wrapper. */
  function placeBadges() {
    for (const m of mascots) {
      const fig = m.querySelector("svg");
      const badge = m.querySelector(".mhelp-badge");
      if (!fig || !badge) continue;
      const f = fig.getBoundingClientRect();
      const w = m.getBoundingClientRect();
      badge.style.left = `${f.right - w.left - 12}px`;
      badge.style.top = `${f.top - w.top - 6}px`;
    }
  }

  function close() {
    if (!card) return;
    card.remove();
    card = null;
    owner?.setAttribute("aria-expanded", "false");
    owner?.focus({ preventScroll: true });
    owner = null;
  }

  function open(mascot) {
    if (owner === mascot) return close();
    close();
    markSeen();
    owner = mascot;
    mascot.setAttribute("aria-expanded", "true");
    mascot.classList.remove("is-hopping");
    void mascot.offsetWidth; // restart the hop
    mascot.classList.add("is-hopping");

    card = document.createElement("div");
    card.className = "mhelp";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-labelledby", "mhelp-title");
    card.innerHTML = `
      <p class="mhelp-kicker" id="mhelp-title">${esc(dict[`mhelp.${page}.kicker`] ?? t("mhelp.what"))}</p>
      <p class="mhelp-what">${esc(t(`mhelp.${page}.what`))}</p>
      <p class="mhelp-kicker">${esc(t("mhelp.how"))}</p>
      <ol class="mhelp-steps">
        ${["s1", "s2", "s3"].map((s) => `<li>${esc(t(`mhelp.${page}.${s}`))}</li>`).join("")}
      </ol>
      <button type="button" class="mhelp-ok">${esc(t("mhelp.ok"))}</button>`;
    card.querySelector(".mhelp-ok").addEventListener("click", close);
    document.body.append(card);
    place();
    card.querySelector(".mhelp-ok").focus({ preventScroll: true });
  }

  /** Under the mascot, kept inside the viewport with a 16px gutter; above it when there is
   *  no room below. The arrow points at the figure either way. */
  function place() {
    if (!card || !owner) return;
    const fig = (owner.querySelector("svg") ?? owner).getBoundingClientRect();
    const w = Math.min(340, innerWidth - 32);
    card.style.width = `${w}px`;
    const left = Math.max(16, Math.min(fig.left + fig.width / 2 - w / 2, innerWidth - w - 16));
    const below = fig.bottom + 12;
    const h = card.offsetHeight;
    const above = innerHeight - below < h && fig.top - 12 - h > 0;
    card.classList.toggle("is-above", above);
    card.style.left = `${left + scrollX}px`;
    card.style.top = `${(above ? fig.top - 12 - h : below) + scrollY}px`;
    card.style.setProperty("--mhelp-arrow", `${fig.left + fig.width / 2 - left}px`);
  }

  for (const m of mascots) {
    m.classList.add("is-helpful");
    m.setAttribute("role", "button");
    m.setAttribute("tabindex", "0");
    m.setAttribute("aria-haspopup", "dialog");
    m.setAttribute("aria-expanded", "false");
    if (!seen) m.insertAdjacentHTML("beforeend", '<span class="mhelp-badge" aria-hidden="true">?</span>');
    m.addEventListener("click", () => open(m));
    m.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(m); }
    });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.addEventListener("pointerdown", (e) => {
    if (card && !card.contains(e.target) && !owner?.contains(e.target)) close();
  });
  addEventListener("resize", () => { place(); placeBadges(); });
  // Fonts and the bubble's text (it changes with the language) move the figure; measure again.
  placeBadges();
  addEventListener("load", placeBadges);

  const load = async (code) => {
    try { dict = await loadDict(code); } catch { dict = {}; }
    label();
    requestAnimationFrame(placeBadges);
    if (card && owner) { const o = owner; close(); open(o); }
  };
  load(getLang());
  onLangChange(load);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
